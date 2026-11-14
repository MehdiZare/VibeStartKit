# Remote dev box

Run Claude Code and OpenCode on a Linux server instead of your laptop, so several agent
sessions and heavy pre-push hooks stop slowing it down. The scripts target
[Hetzner Cloud](https://www.hetzner.com/cloud) and Ubuntu 24.04.

**Full guide:** [docs/remote-dev-box.md](../docs/remote-dev-box.md) covers sizing, a price
comparison, the security model, daily use, parking, and exactly what was tested. Read its
Security section before you run anything: agents on the box can act as root, and the box
holds whatever credentials you give it.

## Quick start

```sh
brew install hcloud jq                              # on the laptop
hcloud context create dev-box                       # paste a Read & Write API token
remote-dev-box/provision.sh                         # SSH-only firewall + server (this bills)
# add the Host block it prints to ~/.ssh/config, then:
ssh dev-box 'cloud-init status --wait'
scp remote-dev-box/bootstrap.sh dev-box:
ssh -t dev-box ./bootstrap.sh OWNER/REPO            # agents, GitHub sign-in, clone, install
```

Then copy this folder into your project and include its Taskfile:

```yaml
# Taskfile.yml
version: "3"
includes:
  remote: ./remote-dev-box/Taskfile.yml
```

```sh
task remote:claude      # Claude Code on the box, in tmux
task remote:opencode    # OpenCode on the box, in tmux
task remote:park        # snapshot, then delete the server to stop billing
task remote:unpark      # bring it back from the snapshot
```

`task --list` shows the rest (`ssh`, `shell`, `web`, `claude-ssh`, `sync`, `update`,
`status`, `create`, `destroy`).

## Files

| File | Runs on | Does |
| --- | --- | --- |
| [provision.sh](provision.sh) | Laptop | Registers your SSH key, creates an SSH-only firewall and the server |
| [cloud-init.yaml](cloud-init.yaml) | Server, first boot | User `dev`, key-only SSH, Docker, Node 24, GitHub CLI, tmux |
| [bootstrap.sh](bootstrap.sh) | Server | Agents, GitHub sign-in, clone, dependencies, OpenCode service |
| [update.sh](update.sh) | Server | Upgrades packages, agents and tools to the latest stable releases |
| [oc-remote](oc-remote) | Laptop | Attaches to the agents in tmux; OpenCode web UI over an SSH tunnel |
| [sync-agent-config.sh](sync-agent-config.sh) | Laptop | Copies agent instructions, skills and OpenCode credentials |
| [dev-box.sh](dev-box.sh) | Laptop | Park, unpark, create, destroy, status |
| [Taskfile.yml](Taskfile.yml) | Laptop | All of the above as `task remote:<name>` |

Cloud servers bill while they exist, even when powered off. You are responsible for the
resources these scripts create; see [DISCLOSURES.md](../DISCLOSURES.md). I am not affiliated
with Hetzner or any other tool named here.
