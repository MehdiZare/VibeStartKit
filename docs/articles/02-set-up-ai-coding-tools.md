# Set up a vibe coding toolchain you can actually verify

I want the setup for an AI coding workflow to produce evidence I can check. A binary is installed. The intended account is authenticated. The client can find the project instructions. A small task reaches its acceptance check.

Those are separate observations. Treating them separately makes the first session easier to debug and the resulting setup easier to explain to someone else.

Here is the path I am packaging in VibeStartKit. It starts locally and adds services only when they have a defined role.

This guide adds the workflow skills to a project you already have, using the kit's Python helper. To create a new project instead, follow the [getting-started guide](../getting-started.md): your agent drives the Node CLI, which plans, generates and checks the project and includes the same skills. The verification habits below apply to both paths.

## 1. Pick the first thing you will complete

Choose either the offline exercise or one small issue in a repository you control. The first result should fit a sentence: a repeated job is counted once, a known defect is reproduced, or a narrow page behavior works.

That choice determines which tools are necessary. The exercise itself needs Python. A real GitHub issue workflow also needs Git, an authenticated GitHub interface and a coding client if you want an agent to execute the task.

You can learn the workflow before adding memory, several model providers or cloud access. That keeps a setup problem from being confused with an application problem.

## 2. Verify the Python interpreter

The helper uses Python 3.12 or newer and the standard library. Check the interpreter selected in the directory where you will run it:

```sh
python3 --version
python3 starter.py --help
```

The directory matters. While preparing the kit, I found that leaving an existing project selected an older system Python on this Mac. The starter now checks the version before loading its implementation and gives a clear next step.

Select an installed supported interpreter with your runtime manager. If you use uv, its documented Python selection is another route:

```sh
uv run --python 3.12 starter.py --help
```

That command may download a runtime the first time. It is an optional convenience, not a hidden dependency of the kit.

## 3. Discover the local tools

Run the checker for the coding client you chose:

```sh
python3 starter.py doctor --client codex
```

Substitute claude-code, opencode or cursor where appropriate. The report distinguishes a found binary, an absent binary and an account/service that does not have a local executable in the catalog.

Git, GitHub CLI, rg and jq provide version control, tracker/API access, local search and structured-output selection. Optional tools such as uv, Bun, Task, fnm and pyenv solve specific runtime or command-management needs.

The checker does not read credential files or call providers. It does not establish a package version, an authenticated account or a working MCP connection. Use the official installation links in the catalog and each tool's documented checks to establish those facts.

## 4. Confirm the account and repository

For the GitHub CLI path, inspect the current authentication:

```sh
gh auth status
```

Verify the intended account and access to the repository. If authentication is needed, use the normal gh login flow yourself. Avoid copying credentials into an issue, a shared prompt or a screenshot.

Then inspect the repository's own instructions and required checks. The commands that matter are the ones maintained by that project. A starter can offer structure, but it should not guess a package manager or invent a test command from the filenames.

The same principle applies to the coding client. Complete its supported sign-in flow and confirm what account or provider the session uses before starting a paid or sensitive task.

## 5. Install the skills into one project

The helper previews the files it will create:

```sh
python3 starter.py init --project ../your-project --client codex
```

Read the plan. When the destination and client are correct, repeat with --apply. A different existing file stops the install. Identical files are retained, allowing the same version to be applied again without replacing local content.

The project gets the portable issue-closure and pr-ownership skills, supporting references, templates and a start prompt. The helper does not replace the project's AGENTS.md or activate cloud/MCP configurations.

The documented shared location works for Codex, Cursor and OpenCode; Claude Code has its own project skill directory. The all option provides both locations. Consult the current client documentation if you use a cloud session or an unusual workspace layout.

## 6. Give the LLM the setup contract

Open the generated .vibe-kit/START_HERE.md. It tells the model to inspect existing instructions, identify missing setup and explain proposed changes before making them.

That prompt also establishes the first issue workflow: investigate, propose a scope, obtain the needed owner decisions, implement within the agreed boundary and hand off a ready PR with exact evidence.

Refresh the client as its documentation requires and confirm the skills appear. Read the skill the client actually discovers. A same-named personal skill or a different workspace can affect which instructions are available.

This first discovery check is useful even when the files were copied correctly. File installation and client discovery are different parts of the setup.

## 7. Add a model/provider only when needed

If you choose OpenCode with OpenRouter, use the client's /connect flow, select OpenRouter and enter the credential there. Then use /models to choose an available model.

Record the chosen model and relevant settings when you evaluate a task. Confirm tool support and the provider route appropriate to your requirements. Inference can incur usage charges; VibeStartKit does not run it during setup.

You can also use another supported client and its existing plan. The kit's workflow does not require every reader to adopt the same provider arrangement as mine.

## 8. Try the local exercise

Create the duplicate-job example in a scratch directory, read ISSUE.md and run its tests. The baseline intentionally fails on repeated deliveries.

Ask an agent to explain the failure and propose a scoped change before editing. Use the existing behavioral checks, then inspect the actual code. Record the result and remaining limitations in the handoff template.

The kit has a separate reference solution and an offline verifier for baseline/reference behavior. Those checks demonstrate the teaching example. They are not evidence for a production queue or a live cloud integration.

Before moving to another tool, ask the first session to read back the project, selected client, discovered skill locations and required acceptance command. It should identify the exercise as intentionally broken and name the next owner decision. If it cannot find the instructions, solve discovery first. If it can find them but proposes a cloud service for the small local exercise, inspect the scope it received. This readback is a cheap integration check that exposes a mismatch before an implementation starts.

## 9. Keep a small setup record

Write down the OS, selected runtime/client versions, installed skill revision, repository, required commands and any optional service scope. Keep secrets out of that record.

When a later session behaves differently, you have a starting point for comparison. When another person tries the kit, they can report the same fields.

The useful finish line is a completed, inspected first task with a setup you can explain. Add the next tool when you can name the problem it solves and the check that will show it is working.

Sources: [Codex skills](https://learn.chatgpt.com/docs/build-skills), [Claude Code skills](https://code.claude.com/docs/en/skills), [OpenCode skills](https://opencode.ai/docs/skills/), [Cursor skills](https://cursor.com/docs/skills), [OpenCode providers](https://opencode.ai/docs/providers), [uv Python versions](https://docs.astral.sh/uv/concepts/python-versions/), [GitHub CLI authentication](https://cli.github.com/manual/gh_auth_login).

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../../DISCLOSURES.md).*
