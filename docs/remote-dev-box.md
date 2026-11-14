# Run your coding agents on a remote dev box

Several agent sessions plus a heavy pre-push hook can saturate a laptop. This guide moves
that work to a Linux server you reach over SSH. Claude Code and OpenCode run in tmux on
the server, and the laptop only holds a terminal.

The scripts are in [remote-dev-box/](../remote-dev-box/):

| Script | Runs on | Does |
| --- | --- | --- |
| [provision.sh](../remote-dev-box/provision.sh) | Laptop | Registers your SSH key, creates an SSH-only firewall and the server |
| [cloud-init.yaml](../remote-dev-box/cloud-init.yaml) | Server, first boot | Creates user `dev` with key-only SSH; installs Docker, Node 24, GitHub CLI, tmux; reboots once |
| [bootstrap.sh](../remote-dev-box/bootstrap.sh) | Server, as `dev` | Installs Claude Code and OpenCode, signs in to GitHub, clones your repo, installs its dependencies |
| [update.sh](../remote-dev-box/update.sh) | Server, as `dev` | Upgrades OS packages and the agents and tools to their latest stable releases |
| [oc-remote](../remote-dev-box/oc-remote) | Laptop | Attaches to OpenCode, Claude Code or a shell in one tmux session on the server; opens the OpenCode web UI through an SSH tunnel |
| [sync-agent-config.sh](../remote-dev-box/sync-agent-config.sh) | Laptop | Copies your Claude Code and OpenCode instructions and skills, plus OpenCode and Supermemory credentials, to the server (Claude Code still needs `/login` there) |
| [dev-box.sh](../remote-dev-box/dev-box.sh) | Laptop | Parks the server (snapshot, then delete) to stop billing, and brings it back |
| [Taskfile.yml](../remote-dev-box/Taskfile.yml) | Laptop | Wraps all of the above as `task remote:<name>` commands |

The scripts target [Hetzner Cloud](https://www.hetzner.com/cloud) and Ubuntu 24.04. The
cloud-init file is plain cloud-init, so other providers that accept user data can reuse it
with their own CLI in place of `provision.sh`.

## Before you buy: size for your real workload

Have your agent read your git hooks and any wrapper around them first. Two questions decide
the size:

- **Does the hook need Docker?** If a local database or container runs in your checks, rule
  out hosts that can't run Docker.
- **Can several hooks run at once?** Some setups serialise checks with a lock. Then extra
  cores make each run faster but never run several in parallel, so pay for headroom for
  agents and Docker, not for parallel hooks.

### Prices compared (8 vCPU, monthly, before VAT, checked 2026-11-13)

| Option | vCPU / RAM | Monthly |
| --- | --- | --- |
| Hetzner CPX42 (shared) | 8 / 16 GB | €59.49 |
| Hetzner CCX33 (dedicated) | 8 / 32 GB | €117.49 (Helsinki) to €140.99 (US) |
| DigitalOcean Basic (shared) | 8 / 16 GiB | $96 |
| DigitalOcean General Purpose | 8 / 32 GiB | $252 |
| GitHub Codespaces, 8-core | 8 cores | $0.72 per hour while running |
| Render background worker | 8 / 16 GB | $300 plus disk |

Prices change. Hetzner's pricing page shows the cheapest location; get the real price for
each location from the API before choosing:

```bash
hcloud server-type describe ccx33
```

A platform host such as Render is built for production services. As a development machine
it is a poor fit: a deploy or restart ends your tmux sessions, and you pay platform prices
for what is really a VM.

## 1. Provision (laptop)

```bash
brew install hcloud jq
hcloud context create dev-box
remote-dev-box/provision.sh
```

`hcloud context create` asks for an API token. Create one in the Hetzner Console under your
project's Security → API tokens, with Read & Write access, and paste it only into that
prompt.

`provision.sh` reads these environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `NAME` | `dev-box` | Server name, also used for the firewall and key names |
| `TYPE` | `ccx33` | Server type |
| `LOCATIONS` | `hel1 fsn1 nbg1` | Locations tried in order; dedicated types are sometimes out of stock |
| `IMAGE` | `ubuntu-24.04` | Image, or a snapshot ID |
| `SSH_PUBLIC_KEY` | `~/.ssh/id_ed25519.pub` | Key installed for `dev` and registered with Hetzner |

It prints a `Host` block. Add it to `~/.ssh/config`. If an interrupted run left the
firewall empty, the next run adds its SSH rule. An existing firewall with any other
inbound layout is rejected before server creation; an existing single TCP 22 rule is
preserved.

## 2. Bootstrap (server)

```bash
ssh dev-box 'cloud-init status --wait'
scp remote-dev-box/bootstrap.sh dev-box:
ssh -t dev-box ./bootstrap.sh OWNER/REPO
```

The server has no browser. When `gh` prints a one-time code, open
https://github.com/login/device on your laptop and enter it.

`bootstrap.sh` detects the project's toolchain from files already in the repository:

| File | Action |
| --- | --- |
| `pnpm-lock.yaml` | `corepack install`, `pnpm install --frozen-lockfile` |
| `yarn.lock` | `corepack install`, `yarn install --immutable` |
| `package-lock.json` | `npm ci` |
| `pyproject.toml` or `uv.lock` | installs uv; `uv sync --frozen` when `uv.lock` exists |
| `Taskfile.yml` or `Taskfile.yaml` | installs Task |

Set `INSTALL_CLAUDE=0` or `INSTALL_OPENCODE=0` to skip an agent.

Then finish the printed steps on the server: set your git email, sign in with `claude`, and
run `/connect` in `opencode` for each model provider. Copy git-ignored files the project
needs, such as `.env.local`, with `scp` and `chmod 600` them.

## 3. Prove your checks on the new machine

Run your pre-push hook once. A hook that passes on a clean branch may have skipped its real
work. If it only checks changed files, also run the full lint, type-check and tests once,
and time them. The first run is slower than later ones because caches and builds start
empty.

## 4. Daily use

Copy `remote-dev-box/` into your project (or point the include below at your clone of this
kit), then add the commands to your project's `Taskfile.yml` ([Task](https://taskfile.dev)):

```yaml
includes:
  remote: ./remote-dev-box/Taskfile.yml
```

Then, from the repo on the laptop:

```bash
task remote:opencode     # OpenCode TUI on the server (tmux window "opencode")
task remote:claude       # Claude Code on the server (tmux window "claude")
task remote:shell        # a shell in the same tmux session
task remote:ssh          # plain SSH login, outside tmux
task remote:web          # OpenCode web UI in the laptop browser, through an SSH tunnel
task remote:claude-ssh   # the host, user, key and folder for the Claude desktop app
task remote:sync         # copy agent config, skills and credentials to the server again
task remote:update       # upgrade OS packages, agents and tools on the server
```

Everything runs in one tmux session (`work`) on the server, so closing the laptop or losing
the connection never stops an agent; rerun the same command to reattach. Without Task, run
`remote-dev-box/oc-remote [tui|claude|shell|ssh|web|claude-ssh]` directly.

To target another server, pass `REMOTE_HOST=<name>` to the tasks (on the command line or in the
environment). Run directly, the scripts take `HOST=<name>` (`oc-remote`,
`sync-agent-config.sh`) or `NAME=<name>` (`dev-box.sh`, `provision.sh`). `oc-remote` attaches
in `~/src/<folder name of the repo you run it from>` on the server, the folder `bootstrap.sh`
clones into; set `REPO_DIR=src/<name>` if the two differ.

- **OpenCode server:** `bootstrap.sh` installs it as a systemd user service with lingering, so
  it runs without a login and after reboots, listening on `127.0.0.1:49374` only.
  `task remote:web` opens the tunnel host `<name>-tunnel` (laptop port 49375) and a one-time
  pairing link. Add the tunnel to `~/.ssh/config`:

  ```
  Host dev-box-tunnel
    HostName <server IP>
    User dev
    LocalForward 127.0.0.1:49375 127.0.0.1:49374
    ExitOnForwardFailure yes
  ```

  A laptop-side `opencode --server` cannot drive the server: it sends the laptop's working
  directory, which does not exist there. Use the TUI on the server or the web UI.
- **Claude desktop app:** `task remote:claude-ssh` prints what to enter when you add an SSH
  connection in the Code tab's new-session picker.
- **Your config:** `sync-agent-config.sh` copies OpenCode's `AGENTS.md`, config, skills and
  commands, its stored credentials (`opencode auth export | opencode auth import` over SSH,
  never printed), Claude Code's `CLAUDE.md` and skills, and Supermemory plugin credentials
  when present. All of it lands owner-only. It does not copy Claude's `settings.json`, whose
  hooks may use macOS paths; install Claude plugins on the server with
  `claude plugin marketplace add` and `claude plugin install`.
- One git worktree per task keeps agents from editing the same checkout.

## 5. Keep it current

```bash
scp remote-dev-box/update.sh dev-box:
ssh dev-box ./update.sh
```

`update.sh` upgrades everything the box installed to its latest stable release: OS packages
(including Docker and gh), Node within the major version pinned in `cloud-init.yaml`, and
Claude Code, OpenCode, uv and Task. It prints the resulting versions and says when a reboot
is needed. Run it weekly, or before a long agent session. `unattended-upgrades` already
applies security updates daily.

It does not touch your project's dependencies. Upgrade those in the project, through a pull
request that runs your checks.

To move to a new Node major, change `node_24.x` in `cloud-init.yaml` and recreate the box.
For a new Ubuntu release, change `IMAGE` and recreate it rather than running
`do-release-upgrade` on a box you rely on.

## Security

- **Firewall:** the Hetzner Cloud Firewall admits only TCP 22. Docker-published ports can
  bypass a host firewall such as ufw, but not the provider's firewall. Reach a local service
  with `ssh -L 5432:localhost:5432 dev-box` instead of opening a port.
- **No secrets in cloud-init:** user data stays readable on the server. Keys go into each
  tool's own sign-in or into environment variables.
- **Key-only SSH:** root login and passwords are off. Registering the key with Hetzner also
  stops it from emailing a root password.
- **Agent forwarding off:** the printed `Host` block sets `ForwardAgent no`.
- **Blast radius:** agents run as `dev`, which has passwordless sudo and is in the `docker`
  group, so anything an agent runs can act as root. The same box holds your GitHub CLI
  token (default scopes) and any credentials you copy to it, and snapshots taken by
  `park` contain all of them. Treat the box, and its snapshots, like your laptop: use a
  dedicated or fine-grained GitHub token if that matters to you, and delete snapshots you
  no longer need.
- **SSH is open to the internet:** the firewall admits TCP 22 from any address, protected
  by key-only login. To narrow it, replace the two `--source-ips` values in
  `provision.sh` with your own address (for example `--source-ips 203.0.113.7/32`) before
  the first run; a static IP or VPN makes that practical.

## Rules for changing the setup

These came from the first real boots. The first two broke a real server; the rest were
caught before they did.

- **Never pipe a vendor setup script in `runcmd`.** A `curl … | bash -` for NodeSource
  failed without output, apt installed Ubuntu's Node 18, and the ready marker was still
  written. Add vendor apt repos explicitly in one `set -euo pipefail` step, assert the
  version, and write the marker last.
- **Keep apt non-interactive.** The first upgrade pulls a new kernel, and `needrestart` opens
  a dialog cloud-init can't answer. Set `NEEDRESTART_MODE=a` and let `power_state` reboot
  once.
- **Distro packages lag.** Ubuntu 24.04 ships Node 18 and an old GitHub CLI. Check a tool's
  packaged version against upstream before adding it under `packages`.
- **Take install commands from vendor docs.** OpenCode's installer moved to `/v2/install`.
- **Test in a container, then on a real boot.** Run
  [tools/test-remote-dev-box.sh](../tools/test-remote-dev-box.sh) for shellcheck, mocked
  provisioning/update failure paths, and the vendor-repository install step in
  `ubuntu:24.04`. Only a real boot tests cloud-init itself.
- **Replace a fresh server rather than patching it.** Billing is hourly, so recreating from
  the fixed file costs cents and proves it works from scratch.

## Park it when you are not using it

A powered-off Hetzner server still bills in full. Park it instead: snapshot the disk, then
delete the server, so only the snapshot is billed (per GB).

```bash
task remote:status    # does the server exist (billing)? which snapshots?
task remote:park      # asks first; shuts down, snapshots, deletes the server
task remote:unpark    # recreates it from the newest snapshot
task remote:create    # a fresh server from the base image (then bootstrap and sync)
task remote:destroy   # delete the server with no snapshot; asks first
```

- The snapshot holds the whole disk: repo, worktrees, uncommitted work, sign-ins and the
  OpenCode service. Running agents and tmux sessions stop when you park.
- `park` waits until the server is really off before snapshotting, and deletes the server only
  once the snapshot is available. It keeps the newest two snapshots (`KEEP_SNAPSHOTS`).
- `unpark` and `create` point `~/.ssh/config` at the server's IP (adding the `Host` entry if it
  is missing), drop the stale host key, and wait until cloud-init and its reboot are done.
- Revoke the server's GitHub token (GitHub Settings → Applications) when you retire it for
  good, and delete its snapshots (`hcloud image delete <id>`).

## What was tested

On 2026-11-13, on Hetzner CCX33 servers running Ubuntu 24.04:

- `cloud-init.yaml` booted clean in `hel1`: Node v24.22.3, gh 2.104.0, Docker 29.1.3, and a
  reboot into the upgraded kernel.
- `provision.sh` created servers in `ash`, `fsn1` and `hel1`.
- A previous version of `bootstrap.sh` installed Claude Code 2.1.323 and OpenCode 2.3.0 from
  the same installers and signed in to GitHub with the device flow.
- `update.sh` ran on that server with exit 0 and reported every tool already on its latest
  release.
- This `bootstrap.sh`, re-run on that already-bootstrapped server, cloned a pnpm repository
  and installed it from its lockfile, and that repository's checks passed there. That run
  predates the OpenCode service step, which was run on the same server in its earlier,
  project-specific form (service active, listening on `127.0.0.1:49374`).
- The `remote:*` tasks from [Taskfile.yml](../remote-dev-box/Taskfile.yml) ran against a
  throwaway CCX33 in `hel1`: `create` (251 s, reused the already-registered SSH key and added
  the `~/.ssh/config` entry), `claude-ssh`, `ssh`, `status`, `park` (90 s, 1.4 GB snapshot),
  `unpark` (85 s, ready after the cloud-init reboot) and `destroy` (refuses on "no", deletes
  on "yes").
- The attach commands (`opencode`, `claude`, `shell`, `web`), `sync` and `update` were run on a
  bootstrapped server with a previous version of these scripts.

Not tested: this exact `bootstrap.sh` (including its OpenCode service step) end to end on a
fresh server, its yarn, npm, uv and Task-install branches, other providers, and other Ubuntu releases. The container test covers
the Node.js and GitHub CLI vendor-repository installation step, not the other installers.

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../DISCLOSURES.md).*
