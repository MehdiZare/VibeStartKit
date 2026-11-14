# VibeStartKit — Vibe Coding Starter Kit

Create a working monorepo with your coding agent: choose a stack, review the setup plan, install selected tools and hooks, then check the result.

The primary interface is your existing conversation in Claude Code, Codex, Cursor or OpenCode. VibeStartKit supplies the specification, recipes and setup engine; it makes no LLM calls of its own.

**Run it from a checkout:** the Node CLI is built from this repository. It is not published to npm yet.

## Start with your agent

Read [the setup skill](skills/project-setup/SKILL.md) in your coding agent, then ask it to create a project. For example:

> Set up a SaaS project with VibeStartKit using Next.js and Supabase, with Codex skills and pre-commit/pre-push hooks; ask me about the remaining stack and tool choices before generating it.

The agent collects the choices, validates them through the CLI, presents the plan and carries the setup through its checks. It does not need to operate a terminal menu.

From a clone of this repository, use Node 24.11+ and the pnpm version in package.json (without pnpm installed, prefix pnpm commands with `npm exec --yes --package=pnpm@12.18.0 --`). The CLI is not on npm yet, so run it as `node packages/cli/dist/index.mjs`:

```sh
pnpm install
pnpm build
node packages/cli/dist/index.mjs init --agent
node packages/cli/dist/index.mjs schema --json
```

The first command above that invokes init returns a structured needs_input response with exit code 3. That is the expected request for the agent to collect a specification.

## Two maintained presets

| Preset | Generated project |
| --- | --- |
| web-saas | Next.js/React web app, Supabase authentication integration, shared contracts/configuration, pnpm/Turborepo, checks and optional Vercel configuration |
| ai-worker | The web preset plus a Temporal worker and sample text-analysis workflow, with optional Render worker configuration |

The sample worker performs local text analysis without making a model call. OpenRouter setup is a separate optional choice for the reader's intended AI feature.

The web homepage and health route run before connecting an account. Supabase sign-in, Temporal service execution, provider authentication and deployment each need their own observed acceptance.

## Plan, apply and verify

The [getting-started guide](docs/getting-started.md) explains the full path. Two explicit [preset specifications](presets/) provide starting examples.

```sh
node packages/cli/dist/index.mjs plan --spec presets/web-saas.json --out web.plan.json
node packages/cli/dist/index.mjs apply --plan web.plan.json
node packages/cli/dist/index.mjs verify --project ../my-web-project
```

Review the target directory, files, exact resolved versions, installation commands and pending account steps before apply. Planning is read-only unless you explicitly save its output. Apply creates a new project, refuses a conflicting destination and records progress so the same plan can resume.

New plans check current npm releases by default. --offline deliberately selects the recorded recipe snapshot. A saved plan locks the versions it actually resolved; a new unsupported major release is reported instead of silently replacing the requested stack.

## Tools, hooks and connections

Choose the tools needed for the project. Node-based CLIs are installed as project development dependencies and run through pnpm exec. Selected native tools use an existing Homebrew installation or produce an explicit manual setup step on another system.

Optional tools and integrations cover Claude Code, Codex, OpenCode, Kody/Kodus, OpenRouter, Supermemory, GitHub CLI, rg, jq, Blacksmith, Render, Vercel, Supabase and Temporal. These products have different setup paths: a GitHub App, a provider login and a local binary are separate things.

Lefthook provides fast staged formatting checks before commit and type/test checks before push. CI runs the complete project gate. The setup verifies hook activation as well as writing configuration.

Client adapters generate the appropriate project skill/MCP files. They keep AGENTS.md as the project instruction source. The current OpenCode adapter targets V2; its package and configuration differ from the older opencode-ai client. Account authorization and actual skill/MCP discovery remain visible setup steps.

See [the stack guide](docs/stack-and-mcp.md) and [the architecture](docs/architecture.md).

## The workflow that comes with the project

The generated project includes:

- [project-setup](skills/project-setup/SKILL.md) for the agent-led setup conversation.
- Portable [issue-closure](skills/issue-closure/SKILL.md) and [pr-ownership](skills/pr-ownership/SKILL.md).
- GitHub issue/PR templates and Markdown plans, handoffs and review ledgers.
- A first issue that asks the reader to verify the authenticated user flow.
- Exact maintained commands, component ownership and remaining acceptance in AGENTS.md and SETUP.md.

The two portable workflow skills preserve the author's core rules. [Portability notes](docs/skill-portability.md) identify the intentional adaptations. A skill is guidance; the actual client permissions and assignment still govern actions.

## Run your agents on a remote dev box

When several agent sessions and a heavy pre-push hook slow your laptop down, move them to a Linux server. [remote-dev-box/](remote-dev-box/) holds scripts and a Taskfile for Hetzner Cloud and Ubuntu 24.04:

```sh
brew install hcloud jq                              # on the laptop
hcloud context create dev-box                       # paste a Read & Write API token
remote-dev-box/provision.sh                         # SSH-only firewall + server
# add the Host block it prints to ~/.ssh/config, then:
ssh dev-box 'cloud-init status --wait'
scp remote-dev-box/bootstrap.sh dev-box:
ssh -t dev-box ./bootstrap.sh OWNER/REPO        # agents, GitHub sign-in, clone, install
scp remote-dev-box/update.sh dev-box: && ssh dev-box ./update.sh   # later: upgrade to latest stable
```

Copy `remote-dev-box/` into your project (or point the include at your clone of this kit) and include [remote-dev-box/Taskfile.yml](remote-dev-box/Taskfile.yml) in your Taskfile for `task remote:opencode`, `task remote:claude`, and `task remote:park` / `task remote:unpark` to stop paying while you are away.

The [remote dev box guide](docs/remote-dev-box.md) covers sizing, a price comparison, the security model, the rules learned from the first real boots, teardown, and exactly what was tested.

## Learn and improve

The [twelve-part learning series](docs/articles/README.md) covers issues, delegation, worktrees, model choice, memory, review, CLI/CI and cloud delivery. To create a new project, start with the [getting-started guide](docs/getting-started.md) (the Node CLI). The Python helper in some articles is the older path for adding the skills to an existing project.

An optional [Python offline exercise](docs/legacy-python-helper.md) is still available for learning the issue-to-review loop without accounts or model calls.

Try a generated project in a scratch directory and [report the first concrete failure](https://github.com/MehdiZare/VibeStartKit/issues/new/choose): OS, runtime/client versions, command, expected result and actual result. Keep credentials and private code out of the report.

More build notes and consulting information: [mehdi-zare.com](https://mehdi-zare.com).

## Disclosure

I'm not affiliated with, sponsored by or paid by any tool or company named in this repository, and there are no affiliate links. The tools here are my personal preferences. Some are paid services: prices change, and you are responsible for any accounts and charges you create. VibeStartKit is provided as is under the MIT License. See [Disclosures](DISCLOSURES.md) for the full terms and official links.

[Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Disclosures](DISCLOSURES.md) · [MIT License](LICENSE)
