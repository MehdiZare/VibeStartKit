#!/usr/bin/env bash
# User-level setup on the dev box, run as `dev` after cloud-init finishes.
# Installs the coding agents, signs in to GitHub, clones your repository and
# installs its dependencies. Idempotent. Guide: docs/remote-dev-box.md.
#
# Usage: ./bootstrap.sh <owner/repo | clone URL> [directory]
# Env:   INSTALL_CLAUDE=1  INSTALL_OPENCODE=1   (set to 0 to skip either agent)
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <owner/repo | clone URL> [directory]" >&2
  exit 2
fi
REPO="$1"
NAME="$(basename "${REPO%.git}")"
REPO_DIR="${2:-$HOME/src/$NAME}"
BIN="$HOME/.local/bin"
mkdir -p "$BIN" "$(dirname "$REPO_DIR")"
export PATH="$BIN:$HOME/.opencode/bin:$PATH"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

[[ -f /var/lib/cloud/instance/dev-box-ready ]] || { echo "cloud-init has not finished: cloud-init status --wait" >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "docker is not usable by $USER yet; log out and back in" >&2; exit 1; }

# shellcheck disable=SC2016  # literal $HOME/$PATH written to .bashrc on purpose
grep -q 'HOME/.local/bin' "$HOME/.bashrc" || echo 'export PATH="$HOME/.local/bin:$HOME/.opencode/bin:$PATH"' >> "$HOME/.bashrc"

# Coding agents, from their official installers.
if [[ "${INSTALL_CLAUDE:-1}" == 1 ]] && ! command -v claude >/dev/null; then
  curl -fsSL https://claude.ai/install.sh | bash
fi
if [[ "${INSTALL_OPENCODE:-1}" == 1 ]] && ! command -v opencode >/dev/null; then
  curl -fsSL https://opencode.ai/v2/install | bash
fi

# GitHub: the box has no browser, so gh prints a one-time code to enter at
# https://github.com/login/device on your laptop. setup-git lets HTTPS clones use it.
gh auth status >/dev/null 2>&1 || gh auth login --hostname github.com --git-protocol https --web
gh auth setup-git

[[ -d "$REPO_DIR/.git" ]] || gh repo clone "$REPO" "$REPO_DIR"
cd "$REPO_DIR"
git config user.name >/dev/null || git config --global user.name "$(gh api user --jq .login)"

# Project toolchain, detected from the files the repository already has.
if [[ -f uv.lock || -f pyproject.toml ]] && ! command -v uv >/dev/null; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi
if [[ -f Taskfile.yml || -f Taskfile.yaml ]] && ! command -v task >/dev/null; then
  task_installer="$(mktemp)"
  trap 'rm -f "$task_installer"' EXIT
  curl -fsSL https://taskfile.dev/install.sh -o "$task_installer"
  sh "$task_installer" -d -b "$BIN"
  rm -f "$task_installer"
  trap - EXIT
fi
if [[ -f pnpm-lock.yaml ]]; then
  corepack install
  pnpm install --frozen-lockfile
elif [[ -f yarn.lock ]]; then
  corepack install
  yarn install --immutable
elif [[ -f package-lock.json ]]; then
  npm ci
fi
if [[ -f uv.lock ]]; then
  uv sync --frozen
fi

# OpenCode server as a systemd user service that survives logout and reboot
# (lingering), started in the cloned repo. It listens on 127.0.0.1:49374 only;
# the laptop reaches it through the SSH tunnel (oc-remote web). The address is
# pinned so an OpenCode upgrade cannot move the port out from under the tunnel.
if [[ "${INSTALL_OPENCODE:-1}" == 1 ]]; then
  sudo loginctl enable-linger "$USER"
  XDG_RUNTIME_DIR="/run/user/$(id -u)"
  export XDG_RUNTIME_DIR
  mkdir -p "$HOME/.config/systemd/user"
  cat > "$HOME/.config/systemd/user/opencode.service" <<UNIT
[Unit]
Description=OpenCode server (127.0.0.1 only; reach it over SSH)
After=network-online.target

[Service]
WorkingDirectory=$REPO_DIR
Environment=PATH=%h/.local/bin:%h/.opencode/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=%h/.opencode/bin/opencode serve --service --port 49374 --hostname 127.0.0.1
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
UNIT
  systemctl --user daemon-reload
  systemctl --user enable --now opencode
fi

cat <<EOF

Bootstrap done: $REPO_DIR
Remaining one-time steps:
  1. On the box: git config --global user.email "<the address you commit with>"
  2. Sign in to Claude Code here: claude, then /login. On the laptop,
     remote-dev-box/sync-agent-config.sh copies agent instructions, skills and
     OpenCode credentials; or sign in to OpenCode here with /connect.
  3. Copy git-ignored files the project needs (for example .env.local) with scp,
     then chmod 600 them. Never put keys in cloud-init.yaml.
  4. Run your project's full checks once and time them.
EOF
