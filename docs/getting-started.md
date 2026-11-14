# Get started with the agent-driven CLI

The primary setup uses your existing coding agent and the TypeScript/Node CLI. The Python helper remains an optional [offline exercise](legacy-python-helper.md).

The CLI runs from a checkout of this repository; it is not published to npm yet.

## 1. Build the checkout

Use Node 24.11 or newer and the pnpm version recorded in package.json:

```sh
pnpm install
pnpm build
node packages/cli/dist/index.mjs capabilities --json
```

If pnpm is absent, use its official setup flow, or invoke the exact version through npm exec. The [pnpm installation documentation](https://pnpm.io/installation) explains the supported choices.

## 2. Let your agent collect the project choices

Give the agent [project-setup](../skills/project-setup/SKILL.md). It can run init --agent and schema --json to discover the contract.

Ask for the desired product and specify any choices you already know. The agent should ask for what remains:

- Project name and new destination.
- web-saas or ai-worker preset.
- Coding clients that should receive the skills and configuration.
- Vercel/Render configuration, or explicit none.
- OpenRouter, Kody, Supermemory and Blacksmith choices.
- Optional CLI tools and MCP servers.
- Whether dependency installation and hook activation should run.

A new project does not need every optional tool. Blacksmith requires a GitHub organization. Supabase MCP requires an explicitly selected project. The engine rejects incompatible selections.

## 3. Save the explicit specification

Start from presets/web-saas.json or presets/ai-worker.json. These examples place a sibling project beside the kit checkout; the CLI resolves directory relative to the specification file.

The specification stores choices and environment-variable requirements, never credentials. Review every installation selection rather than treating a saved example as the user's authorization.

## 4. Generate the plan

```sh
node packages/cli/dist/index.mjs plan --spec presets/web-saas.json --out web.plan.json
```

Plan lists the actual destination, files, resolved package versions, install actions and pending account steps. Save the plan outside the new target directory.

By default, the planner queries current stable npm releases. The current recipes support their tested framework majors and report a new incompatible major explicitly. --offline uses the recorded package snapshot and labels that source.

The saved plan has a digest. Apply also regenerates the recipe result to detect a modified plan or a changed recipe.

## 5. Apply and resume

```sh
node packages/cli/dist/index.mjs apply --plan web.plan.json
```

The selected setup creates the monorepo, initializes Git without making a commit, installs project dependencies, formats the generated source and activates selected hooks.

Node-based CLI tools selected by the user are local development dependencies. Use pnpm exec with their binary name. Native CLI selections use Homebrew when available; a missing installation path is reported as needs_action instead of hidden behind a success message.

A failed or deferred action remains recorded. Complete the actual prerequisite and repeat apply with the same plan to resume. Successful actions are retained and generated files are not overwritten on resume.

## 6. Verify the local result

```sh
node packages/cli/dist/index.mjs verify --project ../my-web-project
node packages/cli/dist/index.mjs status --project ../my-web-project
```

Verification runs the project's formatter, linter, type checks, tests and build, and checks that the selected Git hook exists. Read the result as local evidence.

Read AGENTS.md, SETUP.md and .vibe-kit/first-issue.md in the generated project. pnpm dev starts the web app; its homepage and health endpoint work before provider setup.

## 7. Finish the selected account steps

Configure Supabase locally or in the intended hosted development project, add its publishable URL/key through the application's local environment file, and verify sign-in, protected-page behavior and sign-out.

For ai-worker, run or connect the intended Temporal service. Configure the worker environment, run pnpm dev:worker, then execute the sample with pnpm workflow. The sample does not call a model.

Authorize the chosen client/MCP connections and verify the actual scope. The current OpenCode adapter targets V2; use the matching CLI/configuration. Codex project configuration also requires a trusted project.

Review deployment files, select the intended provider account/project and authorize the actual release separately. A generated Render or Vercel configuration does not establish a deployment.

## 8. Use a regular terminal when useful

init --interactive offers a terminal fallback with the same specification and validation path. It needs a real terminal; agent mode returns structured questions instead.

The engine has no separate model API, subscription or LLM session. Your existing agent handles the conversation.

## 9. Give actionable feedback

Use the repository's setup/workflow feedback forms. Include the OS, runtime/client version, recipe, exact command, expected result, actual result and stopping point. Remove private code and credentials.

Report a written configuration, an installed dependency, an authenticated connection and a working user flow as separate observations.

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../DISCLOSURES.md).*
