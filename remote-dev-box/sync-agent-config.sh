#!/usr/bin/env bash
# Copy your laptop's Claude Code and OpenCode config to the dev box over SSH.
# Run on the laptop; safe to repeat. Guide: docs/remote-dev-box.md.
#
# Copies instructions, skills and commands, the config files that hold keys
# (supermemory.json/.jsonc, opencode.json with its MCP headers), and OpenCode's
# stored credentials via `opencode auth export | opencode auth import` (OpenCode
# v2 no longer reads auth.json). Everything lands owner-only (go-rwx) and no
# secret is printed.
# Claude Code's settings.json and credentials are NOT copied: its hooks use macOS
# paths, and its sign-in lives in the macOS keychain. Install plugins and run
# /login in Claude on the box instead (see the guide).
#
# Env: HOST=dev-box
set -euo pipefail

HOST="${HOST:-dev-box}"

# copy <local path> <remote dir relative to ~>. Uses tar, not macOS rsync,
# which aborts on broken symlinks even when they are excluded.
copy() {
  local src="$1" dest="$2" parent name link
  [[ -e "$src" ]] || { echo "  skip (missing): ${src/#$HOME/~}"; return 0; }
  parent="$(dirname "$src")"
  name="$(basename "$src")"
  local args=(--exclude=.git --exclude=node_modules --exclude='*.bak*' --exclude='*backup*')
  if [[ -d "$src" ]]; then
    while IFS= read -r link; do
      args+=("--exclude=${link#"$parent"/}")
      echo "  skip (broken link): ${link/#$HOME/~}"
    done < <(find "$src" -type l ! -exec test -e {} \; -print)
  fi
  # shellcheck disable=SC2029  # dest and name are expanded locally on purpose
  COPYFILE_DISABLE=1 tar -C "$parent" --no-xattrs -chf - "${args[@]}" "$name" \
    | ssh "$HOST" "mkdir -p ~/$dest && tar -C ~/$dest -xf - && chmod -R go-rwx ~/$dest/$name"
  echo "  copied: ${src/#$HOME/~}"
}

ssh "$HOST" 'mkdir -p ~/.config/opencode ~/.local/share/opencode ~/.claude && chmod 700 ~/.config/opencode ~/.local/share/opencode ~/.claude'

echo "OpenCode config"
for item in AGENTS.md opencode.json opencode.jsonc tui.jsonc cli.json \
    supermemory.json supermemory.jsonc skills command commands; do
  copy "$HOME/.config/opencode/$item" .config/opencode
done
echo "OpenCode credentials"
if ! command -v opencode >/dev/null; then
  echo "  skip: opencode is not installed on this laptop"
elif ! ssh "$HOST" 'test -x ~/.opencode/bin/opencode || command -v opencode >/dev/null'; then
  echo "  skip: opencode is not installed on $HOST"
else
  opencode auth export 2>/dev/null \
    | ssh "$HOST" 'export PATH=$HOME/.opencode/bin:$PATH; opencode auth import >/dev/null && opencode auth list | wc -l | sed "s/^/  credentials on box: /"'
fi

echo "Claude Code instructions and skills"
copy "$HOME/.claude/CLAUDE.md" .claude
copy "$HOME/.claude/skills" .claude

echo "Supermemory plugin credentials (Claude Code, OpenCode, shared config)"
for item in credentials.json settings.json; do copy "$HOME/.supermemory-claude/$item" .supermemory-claude; done
copy "$HOME/.supermemory-opencode/credentials.json" .supermemory-opencode
for item in config.json credentials.json agent-instructions.md; do copy "$HOME/.supermemory/$item" .supermemory; done

# Flag laptop-only paths that came along, so they can be fixed on the box.
ssh "$HOST" 'grep -lI "/Users/" ~/.config/opencode/*.json* ~/.config/opencode/AGENTS.md ~/.claude/CLAUDE.md \
  ~/.config/opencode/skills/*/SKILL.md ~/.claude/skills/*/SKILL.md 2>/dev/null | sed "s|^|  macOS path inside: |" || true'
echo "Done. Restart OpenCode on the box to load it: systemctl --user restart opencode"
