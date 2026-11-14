#!/usr/bin/env bash
# Create a Hetzner Cloud server for running coding agents. Run on your laptop,
# with the hcloud CLI signed in (`hcloud context create dev-box`, which asks for
# an API token). Guide: docs/remote-dev-box.md.
#
# Env overrides:
#   NAME=dev-box  TYPE=ccx33  LOCATIONS="hel1 fsn1 nbg1"  IMAGE=ubuntu-24.04
#   SSH_PUBLIC_KEY=~/.ssh/id_ed25519.pub
set -euo pipefail

NAME="${NAME:-dev-box}"
TYPE="${TYPE:-ccx33}"
LOCATIONS="${LOCATIONS:-hel1 fsn1 nbg1}"
IMAGE="${IMAGE:-ubuntu-24.04}"
SSH_PUBLIC_KEY="${SSH_PUBLIC_KEY:-$HOME/.ssh/id_ed25519.pub}"
FIREWALL="${NAME}-ssh-only"
HERE="$(cd "$(dirname "$0")" && pwd)"

command -v hcloud >/dev/null || { echo "hcloud CLI missing: brew install hcloud" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq missing: brew install jq" >&2; exit 1; }
[[ -r "$SSH_PUBLIC_KEY" ]] || { echo "SSH public key not found: $SSH_PUBLIC_KEY" >&2; exit 1; }
hcloud context active >/dev/null 2>&1 || { echo "No active hcloud context: hcloud context create dev-box" >&2; exit 1; }

if hcloud server describe "$NAME" >/dev/null 2>&1; then
  echo "Server $NAME already exists:"; hcloud server ip "$NAME"; exit 0
fi

# Cloud Firewall, not ufw: Docker-published ports (e.g. `supabase start`'s
# Postgres with the default password) bypass ufw but not this firewall.
# An existing empty firewall may be left by an interrupted first run. Complete
# that run, preserve an existing SSH-only rule, and refuse anything broader.
if ! hcloud firewall describe "$FIREWALL" >/dev/null 2>&1; then
  hcloud firewall create --name "$FIREWALL"
fi
firewall_json="$(hcloud firewall describe "$FIREWALL" -o json)"
inbound_count="$(jq -r '[(.rules // [])[] | select(.direction == "in")] | length' <<< "$firewall_json")"
if [[ "$inbound_count" == 0 ]]; then
  hcloud firewall add-rule "$FIREWALL" --direction in --protocol tcp --port 22 \
    --source-ips 0.0.0.0/0 --source-ips ::/0 --description ssh
elif [[ "$inbound_count" != 1 ]] || ! jq -e '
  [(.rules // [])[] | select(.direction == "in")] as $inbound
  | (($inbound[0].protocol == "tcp")
    and ($inbound[0].port == "22")
    and (($inbound[0].source_ips // []) | length > 0))
' >/dev/null <<< "$firewall_json"; then
  echo "Firewall $FIREWALL has non-SSH or multiple inbound rules; refusing to attach it." >&2
  echo "Use another NAME or make its only inbound rule TCP 22, then retry." >&2
  exit 1
fi

# Register the key so Hetzner does not generate and email a root password.
# Hetzner refuses a second key with the same fingerprint, so reuse the one
# already registered for this public key (e.g. by another box) if there is one.
fingerprint="$(ssh-keygen -E md5 -lf "$SSH_PUBLIC_KEY" | awk '{print $2}' | sed 's/^MD5://')"
KEY_NAME="$(hcloud ssh-key list -o json | jq -r --arg fp "$fingerprint" '.[] | select(.fingerprint == $fp) | .name' | head -1)"
if [[ -z "$KEY_NAME" ]]; then
  KEY_NAME="${NAME}-key"
  hcloud ssh-key create --name "$KEY_NAME" --public-key-from-file "$SSH_PUBLIC_KEY"
fi

user_data="$(mktemp)"
trap 'rm -f "$user_data"' EXIT
key="$(tr -d '\n' < "$SSH_PUBLIC_KEY")"
awk -v key="$key" '{ gsub(/__SSH_PUBLIC_KEY__/, key); print }' "$HERE/cloud-init.yaml" > "$user_data"

created=""
for location in $LOCATIONS; do
  echo "Trying $TYPE in $location..."
  if hcloud server create --name "$NAME" --type "$TYPE" --image "$IMAGE" \
      --location "$location" --firewall "$FIREWALL" --ssh-key "$KEY_NAME" \
      --user-data-from-file "$user_data"; then
    created="$location"; break
  fi
  if hcloud server describe "$NAME" >/dev/null 2>&1; then
    echo "hcloud returned an error but server $NAME exists; refusing to try another location." >&2
    echo "Inspect the server before retrying so a second one is not created." >&2
    exit 1
  fi
done
[[ -n "$created" ]] || { echo "No capacity for $TYPE in: $LOCATIONS. Try LOCATIONS=\"ash hil\" or TYPE=cpx42." >&2; exit 1; }

ip="$(hcloud server ip "$NAME")"
cat <<EOF

Created $NAME ($TYPE) in $created at $ip.
cloud-init needs ~3-5 minutes. Add this to ~/.ssh/config:

Host $NAME
  HostName $ip
  User dev
  IdentityFile ${SSH_PUBLIC_KEY%.pub}
  ServerAliveInterval 30
  ForwardAgent no

Then: ssh $NAME 'cloud-init status --wait' && scp "$HERE/bootstrap.sh" $NAME: && ssh -t $NAME ./bootstrap.sh OWNER/REPO
EOF
