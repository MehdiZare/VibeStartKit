#!/usr/bin/env bash
# Stop paying for the dev box while you don't use it, and bring it back.
# Run on the laptop with the hcloud CLI signed in. Guide: docs/remote-dev-box.md.
#
# A powered-off Hetzner server still bills in full. `park` snapshots the whole
# disk (repo, worktrees, sign-ins, tmux-less state), then deletes the server, so
# only the snapshot is billed (per GB). `unpark` recreates the server from the
# newest snapshot and points ~/.ssh/config at its new IP.
#
# Usage: dev-box.sh status
#        dev-box.sh park   [--yes]   snapshot, then delete the server
#        dev-box.sh unpark           recreate from the newest snapshot
#        dev-box.sh create           fresh server from the base image (provision.sh)
#        dev-box.sh destroy [--yes]  delete the server WITHOUT a snapshot
# Env:   NAME=dev-box (server name and ~/.ssh/config alias)  KEEP_SNAPSHOTS=2
#        TUNNEL_HOST=<NAME>-tunnel  LOCATIONS / TYPE as in provision.sh
set -euo pipefail

NAME="${NAME:-dev-box}"
TUNNEL_HOST="${TUNNEL_HOST:-$NAME-tunnel}"
KEEP_SNAPSHOTS="${KEEP_SNAPSHOTS:-2}"
LABEL="dev-box=$NAME"
HERE="$(cd "$(dirname "$0")" && pwd)"
SSH_CONFIG="$HOME/.ssh/config"

command -v hcloud >/dev/null || { echo "hcloud CLI missing: brew install hcloud" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq missing: brew install jq" >&2; exit 1; }

confirm() {  # confirm <message>: require "yes" unless --yes was passed
  [[ "${YES:-0}" == 1 ]] && return 0
  read -r -p "$1 Type yes to continue: " answer
  [[ "$answer" == yes ]] || { echo "Aborted." >&2; exit 1; }
}

server_exists() { hcloud server describe "$NAME" >/dev/null 2>&1; }

snapshots_json() {  # newest first
  hcloud image list --type snapshot --selector "$LABEL" -o json | jq 'sort_by(.created) | reverse'
}

set_ssh_ip() {  # point the box's Host blocks at a new IP, adding the main one if missing
  local ip="$1" host key="${SSH_PUBLIC_KEY:-$HOME/.ssh/id_ed25519.pub}"
  mkdir -p "$(dirname "$SSH_CONFIG")"
  touch "$SSH_CONFIG"
  if ! grep -q "^Host $NAME\$" "$SSH_CONFIG"; then
    printf '\nHost %s\n  HostName %s\n  User dev\n  IdentityFile %s\n  ServerAliveInterval 30\n  ForwardAgent no\n' \
      "$NAME" "$ip" "${key%.pub}" >> "$SSH_CONFIG"
    echo "ssh config: added Host $NAME -> $ip"
  fi
  for host in "$NAME" "$TUNNEL_HOST"; do
    if grep -q "^Host $host\$" "$SSH_CONFIG"; then
      sed -i.bak "/^Host $host\$/,/^Host /s/^\([[:space:]]*HostName[[:space:]]\).*/\1$ip/" "$SSH_CONFIG"
      echo "ssh config: Host $host -> $ip"
    fi
  done
  rm -f "$SSH_CONFIG.bak"
}

wait_ready() {
  local ip="$1"
  echo "Waiting for cloud-init and its reboot on $ip (about 2-5 minutes)..."
  # Ready = cloud-init done, the ready marker written, and the current boot started
  # after cloud-init's power_state module triggered its one reboot. cloud-init
  # restarts sshd and reboots the box, so every probe tolerates a dropped
  # connection instead of failing the script.
  # shellcheck disable=SC2016  # evaluated on the box, not here
  local probe='test -f /var/lib/cloud/instance/dev-box-ready &&
    cloud-init status 2>/dev/null | grep -q "status: done" &&
    s=/var/lib/cloud/instance/sem/config_power_state_change && test -f "$s" &&
    test "$(stat -c %Y "$s")" -lt "$(awk "/^btime/{print \$2}" /proc/stat)"'
  local ready=0
  for _ in $(seq 1 60); do
    if ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=8 -o BatchMode=yes "$NAME" "$probe" 2>/dev/null; then
      ready=1; break
    fi
    sleep 10
  done
  [[ "$ready" == 1 ]] || { echo "Box did not become ready within 10 minutes; check: ssh $NAME cloud-init status --long" >&2; exit 1; }
  ssh -o BatchMode=yes "$NAME" 'echo "ready: $(hostname), node $(node -v), opencode $(XDG_RUNTIME_DIR=/run/user/$(id -u) systemctl --user is-active opencode)"'
}

cmd="${1:-status}"
[[ "${2:-}" == --yes ]] && YES=1

case "$cmd" in
  status)
    if server_exists; then
      hcloud server describe "$NAME" -o json \
        | jq -r '"server: \(.name) \(.status) \(.server_type.name) in \((.location.name // .datacenter.location.name // "?")) at \(.public_net.ipv4.ip)"'
    else
      echo "server: $NAME does not exist (parked or never created)"
    fi
    snapshots_json | jq -r 'if length == 0 then "snapshots: none" else (.[] | "snapshot: \(.id) \(.created) \(.image_size // 0 | . * 10 | round / 10) GB \(.description)") end'
    ;;

  park)
    server_exists || { echo "Server $NAME does not exist; nothing to park." >&2; exit 1; }
    confirm "Park $NAME: shut it down, snapshot its disk, then DELETE the server. Running agents and tmux sessions stop; files on disk are kept in the snapshot."
    # `shutdown` only sends the ACPI signal; wait until the server is really off so
    # the snapshot is a cleanly unmounted disk. Force power-off after 2 minutes.
    # Must not abort under `set -e`: a failed shutdown still has to reach the wait
    # loop and the forced power-off fallback below, or the box keeps billing.
    hcloud server shutdown "$NAME" || true
    for _ in $(seq 1 24); do
      [[ "$(hcloud server describe "$NAME" -o json | jq -r .status)" == off ]] && break
      sleep 5
    done
    [[ "$(hcloud server describe "$NAME" -o json | jq -r .status)" == off ]] || hcloud server poweroff "$NAME"
    description="$NAME $(date -u +%Y-%m-%dT%H:%MZ)"
    hcloud server create-image --type snapshot --label "$LABEL" --description "$description" "$NAME"
    newest="$(snapshots_json | jq -r '.[0] | select(.status == "available") | .id')"
    [[ -n "$newest" ]] || { echo "Snapshot is not available yet; server NOT deleted. Re-run park later." >&2; exit 1; }
    echo "Snapshot $newest is available."
    hcloud server delete "$NAME"
    # Keep the newest KEEP_SNAPSHOTS snapshots of this box, delete older ones.
    snapshots_json | jq -r ".[$KEEP_SNAPSHOTS:][] | .id" | while read -r old; do
      hcloud image delete "$old" && echo "deleted old snapshot $old"
    done
    echo "Parked. Only the snapshot is billed now. Bring it back with: task remote:unpark"
    ;;

  unpark)
    server_exists && { echo "Server $NAME already exists." >&2; exit 1; }
    newest="$(snapshots_json | jq -r '.[0].id // empty')"
    [[ -n "$newest" ]] || { echo "No snapshot labelled $LABEL. Use create for a fresh box." >&2; exit 1; }
    echo "Restoring $NAME from snapshot $newest..."
    NAME="$NAME" IMAGE="$newest" "$HERE/provision.sh" >/dev/null
    ip="$(hcloud server ip "$NAME")"
    set_ssh_ip "$ip"
    # cloud-init regenerates host keys on a new server; drop the stale entry.
    ssh-keygen -R "$ip" >/dev/null 2>&1 || true
    wait_ready "$ip"
    ;;

  create)
    server_exists && { echo "Server $NAME already exists." >&2; exit 1; }
    NAME="$NAME" "$HERE/provision.sh" >/dev/null
    ip="$(hcloud server ip "$NAME")"
    set_ssh_ip "$ip"
    ssh-keygen -R "$ip" >/dev/null 2>&1 || true
    wait_ready "$ip"
    echo "Fresh box: run bootstrap.sh and task remote:sync next (see the guide)."
    ;;

  destroy)
    server_exists || { echo "Server $NAME does not exist." >&2; exit 1; }
    confirm "DESTROY $NAME with NO snapshot. Everything on its disk that is not pushed is lost."
    hcloud server delete "$NAME"
    echo "Destroyed. Existing snapshots (if any) are kept: dev-box.sh status"
    ;;

  *) sed -n '10,16p' "$0" >&2; exit 2 ;;
esac
