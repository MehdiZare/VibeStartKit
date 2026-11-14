# Architecture: VibeStartKit as an agent-driven project starter

> Sections 8 to 10 keep the research and build plan that shaped the first release. They
> are historical design notes, not open decisions; the code is the source of truth.

VibeStartKit is a TypeScript/Node CLI with the web-saas and ai-worker presets. The Node implementation generates the applications and selected setup; the Python helper remains an optional exercise.

VibeStartKit creates a working project from a conversation with the user's existing coding agent. The first implementation uses the four packages below, a setup skill, versioned specifications, recipe composition, selected installations and resumable local verification. Additional transports and existing-project adoption remain future work.

## 1. The coding agent is the primary interface

A user should be able to ask their coding agent to start a project, describe the product and name any stack preferences. A VibeStartKit setup skill teaches the agent to discover supported choices, ask the unresolved questions, create a specification and call the setup engine.

The engine validates the configuration and executes a reproducible plan. The user's existing coding agent supplies the conversation and reasoning; the starter needs no separate LLM account or model call.

A terminal wizard can serve someone starting outside an agent. Both interfaces must produce the same specification and use the same validation and execution path.

A sample journey:

1. The user asks for an AI SaaS with Next.js, Supabase and background jobs.
2. The agent asks about deployment, background-job needs, coding clients, preferred model access and which optional tools to install.
3. The engine validates the explicit choices and reports missing decisions or unsupported combinations.
4. The agent presents the project structure, exact dependency versions, selected installers, hook behavior and remaining account setup.
5. The engine generates the monorepo and performs the selected setup actions.
6. The engine runs the acceptance checks and returns an honest completion report.
7. The agent explains how to start the app and proposes the first useful GitHub issue.

The result should be a running, checked starter project with an actionable next task.

## 2. A small specification, modular recipes and one execution engine

Keep three responsibilities distinct:

- **Specification:** what the user chose, including explicit none/skip choices.
- **Recipes:** maintained files, dependencies, configuration, compatibility rules and checks for a component.
- **Execution engine:** inspection, planning, file writes, selected installations, progress and verification.

A recipe is more than a folder of copied files. For example, a Supabase authentication recipe needs compatible application files, environment-variable names, client/server boundaries, setup instructions and checks of the generated behavior.

Each recipe should declare:

| Field | Purpose |
| --- | --- |
| ID and revision | Identify the exact recipe being used |
| Supported inputs | Publish choices through a schema |
| Requires/conflicts | Validate composition before generation |
| Files and transformations | Explain which component owns each output |
| Package/runtime constraints | Resolve compatible current releases |
| Install actions | Declare executable, arguments, scope and supported OS |
| Environment requirements | Declare variable names and setup checks without storing secret values |
| Agent instructions/skills | Supply the guidance appropriate to this component |
| Verification | Define what proves the component was prepared correctly |
| External actions | Identify login, account selection or provisioning still needed |

Resolve shared files such as package.json, workspace configuration and AGENTS.md centrally. Do not let independent templates overwrite one another's copy of those files.

## 3. Make the protocol useful to an agent

The CLI (`vsk`, or `node packages/cli/dist/index.mjs` from a clone) implements these commands:

```text
vsk capabilities --json
vsk schema --json
vsk inspect --json
vsk plan --spec project.json --json
vsk apply --plan plan.json --json
vsk verify --json
vsk status --json
```

Agent mode must never wait for a terminal menu. If information is missing, return a structured needs_input result with field names, allowed values, relevant dependencies and concise questions. The agent can ask those questions in its normal conversation and submit the completed specification.

Use versioned JSON input/output, stable error identifiers and distinct completion states. Keep progress separate from the final machine-readable result. Include actual completed actions, failed checks, pending authentication and the next useful action.

Plan from a validated specification. Record a plan digest, resolved dependency/recipe versions and relevant target-file fingerprints so apply can detect changes since planning. Resolve current stable versions for a new project, then lock the actual versions used. Replaying a plan must not silently resolve a different set of packages.

The engine should support resuming a partially completed setup. A successfully installed tool should not be installed again because a later login step was deferred. Keep external installation receipts separate from filesystem rollback; an operating-system installation cannot be promised away by deleting generated files.

For the first release, create new projects in empty destinations. Existing-project adoption and managed-file upgrades can follow once ownership and conflict handling have a tested contract.

## 4. Organize the VibeStartKit repository around that boundary

The repository is a workspace with a small set of packages:

```text
VibeStartKit/
  packages/
    cli/                 # terminal entry points and JSON output
    core/                # specification, planner, apply, status and verification
    recipes/             # component manifests, generation and checks
    agent-adapters/      # per-client discovery/configuration
  presets/               # complete tested combinations of recipes
  templates/             # reusable application fragments/assets
  skills/                # project setup plus the existing issue/PR skills
  examples/              # generated-project fixtures and the offline exercise
  tests/                 # composition and real generated-project checks
  docs/                  # user journeys, recipes and learning series
```

Use a thin optional MCP interface over the same core when it helps supported clients. It should not contain a second planner or generator. Long-running installs should expose progress and resumable status rather than depend on one long MCP request.

Start with the setup skill and structured CLI; both work for agents that already have shell access. Add the MCP transport when it improves the actual setup experience.

If Python remains the selected runtime, preserve the same boundaries as Python modules. The architecture does not depend on migrating languages.

## 5. Give users complete presets with optional components

Recommended initial presets:

| Preset | Included project |
| --- | --- |
| Web SaaS | Next.js web app, Supabase database/authentication integration, shared configuration, hooks, CI and Vercel deployment configuration |
| AI application | The web preset plus a Temporal worker, shared workflow/contracts package and Render worker deployment configuration |

Choosing an AI preset should trigger questions about the real job/workflow and Temporal environment, rather than assume every application needs durable orchestration.

Recommended generated layout, with only selected components present:

```text
my-project/
  apps/
    web/
    api/                 # only when a separate API is selected
    worker/              # only when background workflows are selected
  packages/
    ui/                  # when shared UI is actually useful
    contracts/
    config/
  supabase/
  infra/                 # selected provider configuration
  .github/
  .agents/skills/        # appropriate selected-client location(s)
  .vibe-kit/             # specification, managed-file metadata and setup status
  AGENTS.md
  lefthook.yml
  package.json
  pnpm-workspace.yaml
  turbo.json
```

Use pnpm and Turborepo for the initial TypeScript presets if accepted. A Python backend can bring its own runtime, dependencies and checks without pretending they are JavaScript packages. Broad JavaScript/Python combinations expand the first-release test matrix and need a separate scope decision.

Keep AGENTS.md as the maintained project instruction source. Generate instructions from the chosen components and exact scripts. Add only the discovery files a selected agent needs, with references instead of copied policy.

## 6. Install tools according to what they actually are

The requested tools do not all have the same installation path:

| Component | Setup the kit can prepare | Completion that needs observation |
| --- | --- | --- |
| Git, gh, rg, jq | Detect existing binaries and install selected missing tools through an OS-specific recipe | Correct binary, supported version and intended GitHub account |
| Coding clients | Prepare the chosen client and install project-local skills | Authentication and actual skill discovery |
| OpenCode / OpenRouter | Configure the selected client with credential references and model-selection guidance | Provider connection and selected model; any inference is a separate task |
| Kody | Explain the GitHub App/repository integration and optionally install the separate Kodus CLI | App authorization and an actual review invocation |
| Supermemory | Prepare the chosen plugin/MCP setup and explicit destination mapping | Account authorization, scope and verified destination |
| Blacksmith | Generate an eligible organization's runner configuration | Organization integration and a successful actual CI run |
| Render / Vercel | Install selected CLIs and generate relevant configuration | Login, target account/project and any separately requested deployment |
| Supabase | Install a supported CLI and prepare local project/application configuration | Local runtime or selected hosted project and appropriate credentials |
| MCP services | Generate the selected client's supported configuration through an adapter | Authentication, scope and visible tools in that client |

Offer these choices as bundles the agent can explain, such as core development, coding/review, memory and cloud delivery. Install the chosen components rather than every product named in the learning series.

Generation can include selected dependency/tool installation and hook activation in the same approved plan. Authentication, cloud provisioning and production deployment have different prerequisites and completion evidence; a login requirement should produce an actionable pending state.

Use environment-variable references and provider sign-in flows. Do not ask a user to paste keys into the chat or persist key values in the project specification.

## 7. Install hooks that help the coding loop

Recommend Lefthook as the hook runner, with recipe-defined commands that match the selected languages.

- **Pre-commit:** fast checks of the staged change, such as formatting and relevant lint rules.
- **Pre-push:** type checking and the meaningful tests for the affected components.
- **CI:** the maintained complete gate, including build and generated-project acceptance.

Define canonical root scripts so the agent, hooks and CI invoke the same checks. Keep any optional paid model review out of the ordinary commit hook.

Verify hook activation and execute a representative check. Writing lefthook.yml is only the configuration step.

Lefthook's documented staged/push file selectors support this approach. The final hook configuration still needs tests for partial staging, filenames and the selected tool versions. Source: [Lefthook command configuration](https://lefthook.dev/configuration/run/).

## 8. Reuse an existing generator where it actually fits

Better-T-Stack already has JSON creation, runtime schema introspection, dry runs, a silent programmatic API and MCP tooling. These are useful existing patterns and a possible adapter, not a novel feature claim for VibeStartKit. Sources: [agent workflows](https://www.better-t-stack.dev/docs/cli/agent-workflows), [programmatic API](https://www.better-t-stack.dev/docs/cli/programmatic-api).

Current public options document Supabase database setup; the indexed implementation examined for this proposal lists Better Auth, Clerk and none as authentication choices, with no Temporal or Render recipe. Supabase database hosting does not establish support for the desired Supabase Auth application. The source inspection was at commit 13e12e4ff43d269809ecd1552ec86b12cdb908e2, so it does not establish later default-branch behavior. Sources: [current options](https://www.better-t-stack.dev/docs/cli/options), [inspected schema](https://github.com/AmanVarshney01/create-better-t-stack/blob/13e12e4ff43d269809ecd1552ec86b12cdb908e2/packages/types/src/schemas.ts).

Recommendation: keep the specification and recipe interfaces under VibeStartKit's control, and run a small compatibility experiment before committing to Better-T-Stack as the base renderer. It may save substantial general scaffold work; our Supabase Auth, Temporal, Render, workflow and tool-setup recipes still need their own implementation and checks.

The experiment should generate the chosen base into a temporary directory, apply one representative custom recipe and run the resulting project. If incompatible behavior needs extensive rewriting, ship the focused maintained presets first and retain the adapter boundary for future expansion.

## 9. Version-aware setup is a product feature

Check the latest release and compatibility when adding a recipe or preparing a new plan, then record exact resolved versions. Do not silently downgrade a requested stack to fit an old template.

A current concrete example: Supabase CLI v3 changed database target defaults, hosted-action confirmation and removed older configuration/commands. New setup and CI recipes need to account for those changes. Source: [Supabase CLI v3 changelog](https://supabase.com/changelog/supabase-cli-v3).

Package metadata inspected for this proposal reported create-better-t-stack 3.49.0, pnpm 12.18.0, turbo 2.11.10, lefthook 2.2.2 and zod 4.6.7. These were research observations; implementation checked the official npm registry and current provider docs again. The actual resolved versions are recorded in each plan and lockfile. OpenCode's current package was identified as @opencode/cli 2.2.7, replacing the older opencode-ai package in this implementation.

## 10. Build and prove it in useful increments

1. Agree runtime, two initial presets, supported operating systems and the first-run outcome.
2. Define the specification, recipe contract and agent question flow; test missing choices and incompatible combinations.
3. Complete one vertical slice: conversation/specification to generated web project, selected dependency installation, hooks and passing checks.
4. Add the AI/worker slice and verify its local workflow behavior and delivery configuration separately.
5. Add tool/account adapters with explicit installed, configured, authenticated and verified states.
6. Test a fresh machine, a partially configured machine and a resumed interrupted setup.
7. Validate selected coding clients against actual discovery and first-task behavior.

Acceptance is a generated project that installs, starts and passes its declared checks, with active hooks, discoverable selected skills and visible remaining account steps. Template snapshots alone cannot establish that result.

The implementation has passed type/lint/build checks and seventeen behavioral tests. Both generated presets passed fresh dependency installation, active-hook checks, a hook rejection/acceptance probe, type/test/production-build checks and local HTTP behavior; the Temporal workflow also bundled successfully. Provider authentication, real Temporal service execution, live Supabase sign-in, cloud deployments and actual selected-client discovery remain separate acceptance steps. The npm package is unpublished.

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../DISCLOSURES.md).*
