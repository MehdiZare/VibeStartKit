#!/usr/bin/env bash
# Checks remote-dev-box/ without a cloud account: shellcheck on the scripts,
# mocked provisioning/update failure paths, a cloud-init YAML parse, and the
# vendor-repo install step from cloud-init inside ubuntu:24.04. A real boot is
# still the only full test.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/remote-dev-box"
IMAGE="${IMAGE:-ubuntu:24.04}"

shellcheck "$DIR"/*.sh "$DIR/oc-remote" "$0"

step="$(mktemp)"
mock_root="$(mktemp -d)"
trap 'rm -f "$step"; rm -rf "$mock_root"' EXIT

# A failed Task download must not be hidden by a successful empty `sh -c`.
update_mock="$mock_root/update"
mkdir -p "$update_mock/bin" "$update_mock/home"
cat > "$update_mock/bin/mock-tool" <<'MOCK'
#!/usr/bin/env bash
case "${0##*/}" in
  sudo) exit 0 ;;
  task)
    [[ "${1:-}" != "--version" ]] || echo "Task version: v3.0.0"
    ;;
  curl)
    echo "simulated Task installer download failure" >&2
    exit 22
    ;;
  node) echo "v24.22.3" ;;
  gh) echo "gh version 2.104.0 (2026-11-12)" ;;
  docker) echo "Docker version 29.1.3, build mock" ;;
  *) echo "unexpected update mock invocation: ${0##*/} $*" >&2; exit 99 ;;
esac
MOCK
chmod +x "$update_mock/bin/mock-tool"
for tool in sudo task curl node gh docker; do
  ln -s mock-tool "$update_mock/bin/$tool"
done
if HOME="$update_mock/home" PATH="$update_mock/bin:/usr/bin:/bin" \
    "$DIR/update.sh" > "$update_mock/output" 2>&1; then
  cat "$update_mock/output" >&2
  echo "update.sh ignored a failed Task installer download" >&2
  exit 1
fi
if ! grep -q "simulated Task installer download failure" "$update_mock/output"; then
  cat "$update_mock/output" >&2
  echo "update.sh did not reach the simulated Task download" >&2
  exit 1
fi

# hcloud is mocked throughout: these tests cannot touch a cloud account.
provision_mock="$mock_root/provision"
mkdir -p "$provision_mock/bin"
cat > "$provision_mock/bin/hcloud" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$MOCK_LOG"
case "${1:-} ${2:-}" in
  "context active") ;;
  "server describe") [[ -f "$MOCK_STATE/server" ]] ;;
  "server ip") echo "mock-ip" ;;
  "firewall describe")
    [[ -f "$MOCK_STATE/firewall" ]] || exit 1
    if [[ " $* " == *" -o json "* ]]; then
      if [[ -f "$MOCK_STATE/unsafe" ]]; then
        cat <<'JSON'
{"rules":[{"direction":"in","protocol":"tcp","port":"22","source_ips":["0.0.0.0/0","::/0"]},{"direction":"in","protocol":"tcp","port":"80","source_ips":["0.0.0.0/0","::/0"]}]}
JSON
      elif [[ -f "$MOCK_STATE/rule" ]]; then
        cat <<'JSON'
{"rules":[{"direction":"in","protocol":"tcp","port":"22","source_ips":["0.0.0.0/0","::/0"],"description":"ssh"}]}
JSON
      else
        echo '{"rules":[]}'
      fi
    fi
    ;;
  "firewall create") touch "$MOCK_STATE/firewall" ;;
  "firewall add-rule") touch "$MOCK_STATE/rule" ;;
  "ssh-key list")
    # A key registered earlier (for example by another box) shows up by fingerprint.
    if [[ -f "$MOCK_STATE/existing-key-fp" ]]; then
      printf '[{"name":"other-box-key","fingerprint":"%s"}]\n' "$(cat "$MOCK_STATE/existing-key-fp")"
    else
      echo '[]'
    fi
    ;;
  "ssh-key create") touch "$MOCK_STATE/ssh-key" ;;
  "server create")
    touch "$MOCK_STATE/server"
    [[ "${MOCK_CREATE_THEN_FAIL:-0}" != 1 ]] || exit 1
    ;;
  *) echo "unexpected hcloud mock invocation: $*" >&2; exit 99 ;;
esac
MOCK
chmod +x "$provision_mock/bin/hcloud"

run_provision() {
  local case_name="$1"
  local create_then_fail="$2"
  local case_dir="$provision_mock/$case_name"
  mkdir -p "$case_dir/home" "$case_dir/state"
  # A real throwaway key: provision.sh fingerprints it with ssh-keygen.
  [[ -f "$case_dir/key.pub" ]] || ssh-keygen -q -t ed25519 -N "" -C mock -f "$case_dir/key" >/dev/null
  : > "$case_dir/log"
  if HOME="$case_dir/home" MOCK_STATE="$case_dir/state" MOCK_LOG="$case_dir/log" \
      MOCK_CREATE_THEN_FAIL="$create_then_fail" SSH_PUBLIC_KEY="$case_dir/key.pub" \
      NAME=dev-box-test PATH="$provision_mock/bin:$PATH" \
      "$DIR/provision.sh" > "$case_dir/output" 2>&1; then
    PROVISION_RC=0
  else
    PROVISION_RC=$?
  fi
}

run_provision fresh 0
if [[ "$PROVISION_RC" != 0 || ! -f "$provision_mock/fresh/state/rule" || \
      ! -f "$provision_mock/fresh/state/server" ]]; then
  cat "$provision_mock/fresh/output" >&2
  echo "fresh provisioning mock did not create the SSH rule and server" >&2
  exit 1
fi

mkdir -p "$provision_mock/partial/state"
touch "$provision_mock/partial/state/firewall"
run_provision partial 0
if [[ "$PROVISION_RC" != 0 || ! -f "$provision_mock/partial/state/rule" || \
      ! -f "$provision_mock/partial/state/server" ]]; then
  cat "$provision_mock/partial/output" >&2
  echo "provisioning did not repair an empty firewall left by an interrupted run" >&2
  exit 1
fi

mkdir -p "$provision_mock/unsafe/state"
touch "$provision_mock/unsafe/state/firewall" "$provision_mock/unsafe/state/unsafe"
run_provision unsafe 0
if [[ "$PROVISION_RC" == 0 || -f "$provision_mock/unsafe/state/server" ]] || \
    ! grep -q "non-SSH" "$provision_mock/unsafe/output"; then
  cat "$provision_mock/unsafe/output" >&2
  echo "provisioning attached a firewall with non-SSH inbound rules" >&2
  exit 1
fi

run_provision ambiguous 1
if [[ "$PROVISION_RC" == 0 ]] || ! grep -q "refusing to try another location" \
    "$provision_mock/ambiguous/output"; then
  cat "$provision_mock/ambiguous/output" >&2
  echo "provisioning ignored a server left by an ambiguous create failure" >&2
  exit 1
fi
if [[ "$(grep -c '^server create ' "$provision_mock/ambiguous/log")" != 1 ]]; then
  cat "$provision_mock/ambiguous/log" >&2
  echo "provisioning retried after an ambiguous create failure" >&2
  exit 1
fi

# Hetzner rejects a second key with the same fingerprint: a key already
# registered for another box must be reused, not created again.
mkdir -p "$provision_mock/reuse/state"
ssh-keygen -q -t ed25519 -N "" -C mock -f "$provision_mock/reuse/key" >/dev/null
ssh-keygen -E md5 -lf "$provision_mock/reuse/key.pub" | awk '{print $2}' | sed 's/^MD5://' \
  > "$provision_mock/reuse/state/existing-key-fp"
run_provision reuse 0
if [[ "$PROVISION_RC" != 0 ]] || grep -q '^ssh-key create ' "$provision_mock/reuse/log" || \
    ! grep -q -- '--ssh-key other-box-key' "$provision_mock/reuse/log"; then
  cat "$provision_mock/reuse/output" "$provision_mock/reuse/log" >&2
  echo "provisioning did not reuse the SSH key already registered for this public key" >&2
  exit 1
fi

echo "mocked provisioning/update failure-path checks passed"

if python3 -c "import yaml" 2>/dev/null; then
  python=(python3)
else
  python=(uv run --quiet --no-project --with pyyaml python3)
fi
"${python[@]}" - "$DIR/cloud-init.yaml" > "$step" <<'PY'
import sys
import yaml

config = yaml.safe_load(open(sys.argv[1]))
assert open(sys.argv[1]).readline().strip() == "#cloud-config", "missing #cloud-config header"
steps = [c for c in config["runcmd"] if isinstance(c, list) and c[:2] == ["bash", "-c"]]
assert len(steps) == 1, "expected one fail-closed bash step in runcmd"
print(steps[0][2].replace("/var/lib/cloud/instance/dev-box-ready", "/tmp/dev-box-ready"))
PY

docker run --rm -v "$step:/step.sh:ro" "$IMAGE" bash -c '
  set -euo pipefail
  apt-get update -qq >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl ca-certificates gnupg >/dev/null
  bash /step.sh >/dev/null
  test -f /tmp/dev-box-ready
  echo "node $(node -v), $(gh --version | head -1)"
'
echo "remote-dev-box checks passed"
