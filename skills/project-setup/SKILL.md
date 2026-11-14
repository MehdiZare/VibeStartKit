---
name: project-setup
description: Set up a VibeStartKit monorepo with the user's coding agent by collecting stack choices, planning files and tools, applying the reviewed plan and verifying the generated project.
---

# Project setup

Use the user's existing coding conversation as the interface. Do not launch a terminal wizard from a noninteractive agent call. The CLI does not need its own LLM or model API key.

1. Read existing project instructions and identify whether this is a new project or an existing one. The first scaffolder release creates new, empty destinations; do not replace an existing application.
2. Inspect the CLI's capabilities and schema. Use the installed executable, or the explicitly provided local build; never assume an unpublished package is available from npm.
3. Ask the user for unresolved choices: project/name, preset, coding clients, deployment configuration, optional integrations, selected CLI tools, MCP scope and dependency/hook installation. Offer the two maintained presets and explain the relevant tradeoffs. Check the chosen clients against the CLI's published requirements; the current OpenCode MCP adapter requires V2, so resolve an older-client upgrade with the owner before generating that configuration.
4. Save an explicit specification and run plan. A needs_input or incompatible_choices result is a request to resolve choices, not permission to invent an answer or bypass validation.
5. Show the user the resulting layout, dependency versions, selected installation actions, hook behavior and pending account setup. Existing authorization can cover those actions; ask only for genuinely missing decisions or authorization.
6. Apply the reviewed plan. Resume the same plan after a recoverable interruption; keep completed and pending actions visible. Do not manually overwrite a conflict or claim a partial setup finished.
7. Run verify and inspect the actual results. Record local checks separately from authentication, skill discovery, live workflows and deployment.
8. Help the user complete the selected provider sign-in flows and scope checks. Do not paste credentials into chat, the specification, issue text or logs.
9. Read AGENTS.md, SETUP.md and .vibe-kit/first-issue.md in the generated project. Carry the first bounded task into the GitHub workflow using issue-closure and pr-ownership within the actual assignment.

Typical command sequence (the names apply to the built Node CLI):

```sh
vsk init --agent
vsk schema --json
vsk plan --spec project.json --out plan.json --json
vsk apply --plan plan.json --json
vsk verify --project ./my-project --json
vsk status --project ./my-project --json
```

Use --offline on plan only when deliberately using the kit's recorded tested versions rather than checking current registry releases. The saved plan records the version source.

The helper configures selected client/MCP files locally. A written configuration is not proof that a connection is authorized or that the client discovered the skill. A generated deployment file is not an observed deployment.
