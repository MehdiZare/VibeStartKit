#!/usr/bin/env bash
# Upgrade everything installed on the dev box to its latest stable release.
# Run as `dev` on the box whenever you like; safe to repeat. Guide: docs/remote-dev-box.md.
#
# Covers the OS packages (including Docker, gh and Node within the NodeSource
# major pinned in cloud-init.yaml) and the user-level tools: Claude Code,
# OpenCode, uv and Task. It never touches a project's own dependencies: those
# change through a pull request in that project, not on the box.
set -euo pipefail

BIN="$HOME/.local/bin"
export PATH="$BIN:$HOME/.opencode/bin:$PATH"

echo "== OS packages"
sudo env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get update -qq
sudo env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get full-upgrade -y -qq
sudo env DEBIAN_FRONTEND=noninteractive apt-get autoremove -y -qq

echo "== Agents and tools"
if command -v claude >/dev/null; then claude update; fi
if command -v opencode >/dev/null; then opencode upgrade; fi
if command -v uv >/dev/null; then uv self update; fi
if command -v task >/dev/null; then
  # The installer always fetches the latest release. Download separately so a
  # failed curl cannot turn into a successful `sh -c ""`.
  task_installer="$(mktemp)"
  trap 'rm -f "$task_installer"' EXIT
  curl -fsSL https://taskfile.dev/install.sh -o "$task_installer"
  sh "$task_installer" -b "$BIN" >/dev/null
  rm -f "$task_installer"
  trap - EXIT
fi

echo "== Versions"
printf '%-9s %s\n' node "$(node -v)" gh "$(gh --version | head -1 | cut -d' ' -f3)" \
  docker "$(docker --version | cut -d' ' -f3 | tr -d ,)"
for tool in claude opencode uv task; do
  if command -v "$tool" >/dev/null; then printf '%-9s %s\n' "$tool" "$("$tool" --version 2>&1 | head -1)"; fi
done

if [[ -f /var/run/reboot-required ]]; then
  echo "A reboot is required (new kernel or libraries). Detach tmux, then: sudo reboot"
fi
