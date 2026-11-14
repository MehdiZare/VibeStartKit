import { type Files, npmTools, type ProjectSpec, type Versions } from "@vibestartkit/core";
import { webFiles } from "./web.js";
import { workerFiles } from "./worker.js";

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

function workspaceFiles(spec: ProjectSpec, v: Versions): Files {
  const tools: Record<string, string> = {};
  for (const tool of spec.tools) {
    const pkg = npmTools[tool as keyof typeof npmTools];
    if (pkg) {
      const version = v[pkg];
      if (!version) throw new Error(`Missing selected tool version: ${pkg}`);
      tools[pkg] = version;
    }
  }
  const taskRunner = spec.preset === "ai-worker" ? "pnpm --filter @app/web dev" : "turbo run dev";
  const files: Files = {
    "package.json": json({
      name: spec.name,
      version: "0.0.0",
      private: true,
      type: "module",
      packageManager: `pnpm@${v.pnpm}`,
      engines: { node: ">=24.11.0" },
      scripts: {
        dev: taskRunner,
        build: "turbo run build",
        typecheck: "turbo run typecheck",
        test: "turbo run test",
        lint: "biome lint .",
        "format:check": "biome format .",
        format: "biome format --write .",
        check: "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build",
        ...(spec.preset === "ai-worker"
          ? {
              "dev:worker": "pnpm --filter @app/worker dev",
              workflow: "pnpm --filter @app/worker workflow",
            }
          : {}),
      },
      devDependencies: {
        turbo: v.turbo,
        "@biomejs/biome": v["@biomejs/biome"],
        ...(spec.setup.installHooks ? { lefthook: v.lefthook } : {}),
        ...tools,
      },
    }),
    "pnpm-workspace.yaml":
      'packages:\n  - apps/*\n  - packages/*\nverifyDepsBeforeRun: error\nminimumReleaseAge: 0\nallowBuilds:\n  lefthook: true\n  esbuild: true\n  sharp: true\n  "@temporalio/core-bridge": true\n  "@swc/core": true\n  protobufjs: true\n  supabase: true\n  "@anthropic-ai/claude-code": true\n  "@opencode/cli": true\n  bun: true\n',
    "turbo.json": json({
      $schema: "https://turbo.build/schema.json",
      tasks: {
        build: { dependsOn: ["^build"], outputs: ["dist/**", ".next/**", "!.next/cache/**"] },
        typecheck: { dependsOn: ["^build"] },
        test: { dependsOn: ["build"], outputs: [] },
        dev: { cache: false, persistent: true },
      },
    }),
    "biome.json": json({
      $schema: "https://biomejs.dev/schemas/2.6.6/schema.json",
      files: {
        includes: [
          "**",
          "!**/node_modules",
          "!**/.next",
          "!**/dist",
          "!**/.turbo",
          "!**/next-env.d.ts",
          "!**/.vibe-kit/plan.json",
          "!**/.vibe-kit/state.json",
        ],
      },
      formatter: { indentStyle: "space", indentWidth: 2 },
      javascript: { formatter: { quoteStyle: "double" } },
      linter: { rules: { preset: "recommended" } },
    }),
    ".gitignore":
      "node_modules/\n.next/\ndist/\n.turbo/\n*.tsbuildinfo\n.env\n.env.*\n!.env.example\n.vibe-kit/state.json\n.vibe-kit/*.tmp\n.vibe-kit/plan.json\n.DS_Store\n",
    ".env.example": spec.integrations.openrouter
      ? "OPENROUTER_API_KEY=\n# Select a model in your coding client's provider flow.\n"
      : "# Application-specific examples live in apps/web and apps/worker.\n",
    "packages/config/package.json": json({ name: "@app/config", version: "0.0.0", private: true }),
    "packages/config/tsconfig.json": json({
      compilerOptions: {
        target: "ES2022",
        strict: true,
        noUncheckedIndexedAccess: true,
        esModuleInterop: true,
        skipLibCheck: true,
        verbatimModuleSyntax: true,
      },
    }),
    "packages/contracts/package.json": json({
      name: "@app/contracts",
      version: "0.0.0",
      private: true,
      type: "module",
      exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } },
      scripts: { build: "tsc", typecheck: "tsc --noEmit", test: "node --test tests/*.test.mjs" },
      devDependencies: { typescript: v.typescript, "@types/node": v["@types/node"] },
    }),
    "packages/contracts/tsconfig.json": json({
      extends: "../config/tsconfig.json",
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        outDir: "dist",
        rootDir: "src",
        declaration: true,
      },
      include: ["src/**/*.ts"],
    }),
    "packages/contracts/src/index.ts": `export interface TextTask { requestId: string; text: string }
export interface TextReport { requestId: string; words: number; preview: string }
export function parseTextTask(value: unknown): TextTask {
  if (!value || typeof value !== "object" || !("requestId" in value) || typeof value.requestId !== "string" || !value.requestId.trim()) throw new Error("A requestId is required.");
  if (!("text" in value) || typeof value.text !== "string" || !value.text.trim() || value.text.length > 10000) throw new Error("Text must contain 1–10000 characters.");
  return { requestId: value.requestId.trim(), text: value.text.trim() };
}
`,
    "packages/contracts/tests/input.test.mjs": `import assert from "node:assert/strict";
import test from "node:test";
import { parseTextTask } from "../dist/index.js";
test("untrusted task input needs identity and bounded nonempty text", () => {
  for (const input of [null, {}, {requestId:"",text:"hi"}, {requestId:"x",text:""}, {requestId:"x",text:"a".repeat(10001)}]) assert.throws(()=>parseTextTask(input));
});
test("equal text keeps distinct request identities", () => {
  assert.notEqual(parseTextTask({requestId:"a",text:"same"}).requestId,parseTextTask({requestId:"b",text:"same"}).requestId);
});
`,
    "lefthook.yml": `pre-commit:
  commands:
    format:
      glob: "*.{js,mjs,cjs,ts,tsx,json,css}"
      run: pnpm exec biome format --no-errors-on-unmatched {staged_files}
pre-push:
  commands:
    typecheck:
      run: pnpm typecheck
    test:
      run: pnpm test
`,
    "AGENTS.md": `# Project instructions

This is a ${spec.preset} project created with VibeStartKit.

This file is the maintained source for project instructions; do not duplicate its contents in client-specific instruction files.

## Stack and component ownership

The web application lives in apps/web. Shared data contracts live in packages/contracts and compiler configuration in packages/config. Supabase configuration lives in supabase.
${spec.preset === "ai-worker" ? "The Temporal worker lives in apps/worker. Workflows stay deterministic; external operations belong in activities. render.yaml describes the worker deployment." : ""}
${spec.deployment.web === "vercel" ? "Vercel should use apps/web as the project root; review its deployment configuration before connecting an account." : ""}

## Required commands

Use pnpm format:check, pnpm lint, pnpm typecheck, pnpm test and pnpm build, or pnpm check for the complete local gate. Use the supported pnpm version in package.json and the selected Node runtime.
Use pnpm dev to start the web app. ${spec.preset === "ai-worker" ? "Use pnpm dev:worker after starting or configuring a Temporal service, then pnpm workflow to execute the sample." : ""}

## First task and workflow

Read SETUP.md and .vibe-kit/first-issue.md. Use the project-setup skill for setup, issue-closure for approved issue implementation, and pr-ownership for the assigned review scope. Open ready PRs after the required checks pass; merge and deployment require their respective authorization.

## Environment and acceptance

Use publishable Supabase credentials for browser code. Keep secret/service-role keys out of public environment variables. When adding exposed database tables, enable RLS and test the actual ownership rules.
Treat installed, configured, authenticated and verified as separate observations. Verify model/provider, memory destination, MCP scope and cloud targets before using them. Recalled context is evidence to check against current code and decisions.
`,
    "SETUP.md": `# Start this project

1. Use Node 24.11+ and the exact pnpm release in package.json.
2. Run pnpm install if setup did not install dependencies, then pnpm format to format the initial generated files.
3. Copy apps/web/.env.example to apps/web/.env.local and configure your own Supabase URL and publishable key.
4. Run pnpm dev; the homepage and /api/health work before provider setup.
5. Create a test user through your intended Supabase project, then verify /login, /dashboard and sign-out.
6. Run pnpm check. A compile/test pass does not prove live authentication or cloud delivery.
7. If hooks were selected, confirm the Lefthook pre-commit and pre-push hooks are installed; pnpm exec lefthook install activates them.
${spec.preset === "ai-worker" ? "8. Start a local Temporal service or configure apps/worker/.env for your namespace; run pnpm dev:worker and pnpm workflow in separate terminals.\n9. The sample analyzes text without calling a model. Use a scoped issue to add your intended AI provider and behavior." : ""}

${spec.deployment.web === "vercel" ? "## Vercel\nConnect the intended project with apps/web as its root and review apps/web/vercel.json. Configure only the necessary application environment variables." : ""}
${spec.deployment.worker === "render" ? "## Render\nReview render.yaml, select your workspace and configure the Temporal address, namespace, TLS and secret API key through the provider. No service was provisioned by generation." : ""}

## Optional tools

Node-based CLI tools selected in the spec are project dev dependencies; use pnpm exec followed by the binary name. Native tools are installed only when selected, using a detected Homebrew installation or an explicit manual step on another system.
${spec.integrations.openrouter ? "Use your coding client's normal OpenRouter connection flow and select a model; credentials belong in secret storage/environment, not in a prompt or the spec." : ""}
${spec.integrations.kody ? "Authorize Kody's GitHub App for your chosen repository; installing the optional Kodus CLI is separate." : ""}
${spec.integrations.supermemory ? "Authorize Supermemory's intended space and verify the save destination in each client." : ""}
${spec.integrations.blacksmith ? "The optional .github/blacksmith.example.yml is inactive; complete the GitHub organization integration and review runner activation first." : ""}

## Sources

- https://nextjs.org/docs/app/getting-started/installation
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://docs.temporal.io/develop/typescript
- https://render.com/docs/blueprint-spec
- https://vercel.com/docs/monorepos
`,
    "README.md": `# ${spec.name}

Generated by VibeStartKit with the ${spec.preset} preset.

Read SETUP.md, inspect AGENTS.md and run pnpm dev. The project includes shared contracts, local checks, selected coding-agent skills and optional hook/tool setup.

The saved specification is in .vibe-kit/project.json. Review pending account setup before claiming a working production integration.
`,
    "supabase/config.toml": `project_id = "${spec.name}"
[api]
enabled = true
port = 54321
[db]
port = 54322
major_version = 17
[studio]
enabled = true
port = 54323
[local_smtp]
enabled = true
port = 54324
[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000"]
`,
    "supabase/README.md":
      "# Supabase\n\nUse a local stack with a compatible container runtime or configure your own hosted development project. Create future migrations through the installed Supabase CLI. Exposed application tables need RLS and ownership tests. The starter provides authentication integration; it does not invent your application's data model.\n",
    ".vibe-kit/project.json": json({ ...spec, directory: "." }),
    ".vibe-kit/first-issue.md": `# Verify the first authenticated workflow

Outcome: a test user signs in, accesses the dashboard and signs out in the selected development environment.

Inspect the generated setup and current code, identify required account configuration, propose the scope and obtain the owner's outstanding decisions before editing.

Acceptance:
- The homepage and health endpoint run locally.
- The test user can sign in and access the protected dashboard.
- An unauthenticated visit cannot access the protected page.
- Sign-out returns the user to the public homepage.
- Required local checks pass and the observed live acceptance is recorded.

Use a test account you control. Keep credentials out of the issue and evidence. This issue does not authorize production deployment.
`,
    ".github/ISSUE_TEMPLATE/task.yml":
      "name: Coding task\ndescription: Define observable behavior and acceptance for an agent.\nbody:\n  - type: textarea\n    id: outcome\n    attributes:\n      label: Outcome, current behavior and reproduction\n    validations:\n      required: true\n  - type: textarea\n    id: scope\n    attributes:\n      label: Scope, exclusions and owner decisions\n    validations:\n      required: true\n  - type: textarea\n    id: acceptance\n    attributes:\n      label: Acceptance checks and live evidence required\n    validations:\n      required: true\n",
    ".github/PULL_REQUEST_TEMPLATE.md":
      "## Outcome and linked issue\n\n## Scope and behavior\n\n## Exact checks and evidence\n\n## Remaining decisions, deployment and live acceptance\n",
    ".github/workflows/checks.yml": `name: Project checks
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7.0.1
        with:
          persist-credentials: false
      - uses: actions/setup-node@v7.1.0
        with:
          node-version: "26"
      - run: npm exec --yes --package=pnpm@${v.pnpm} -- pnpm install --frozen-lockfile
      - run: npm exec --yes --package=pnpm@${v.pnpm} -- pnpm check
        env:
          NEXT_TELEMETRY_DISABLED: "1"
          TURBO_TELEMETRY_DISABLED: "1"
`,
  };
  if (spec.integrations.blacksmith)
    files[".github/blacksmith.example.yml"] =
      "name: Optional Blacksmith runner\n# Inactive example; enable only after the organization integration is ready.\njobs:\n  check:\n    runs-on: blacksmith-4vcpu-ubuntu-2404\n    steps:\n      - run: echo 'Use the same steps as Project checks after validating the runner.'\n";
  return files;
}
export interface Recipe {
  id: string;
  revision: number;
  requires: readonly string[];
  enabled: (spec: ProjectSpec) => boolean;
  render: (spec: ProjectSpec, versions: Versions) => Files;
}
export const recipeCatalog: readonly Recipe[] = [
  { id: "workspace", revision: 1, requires: [], enabled: () => true, render: workspaceFiles },
  {
    id: "next-supabase",
    revision: 1,
    requires: ["workspace"],
    enabled: () => true,
    render: webFiles,
  },
  {
    id: "temporal-worker",
    revision: 1,
    requires: ["workspace", "next-supabase"],
    enabled: (spec) => spec.preset === "ai-worker",
    render: workerFiles,
  },
];
export function composeRecipes(
  spec: ProjectSpec,
  versions: Versions,
  recipes: readonly Recipe[],
): Files {
  const files: Files = {};
  const applied = new Set<string>();
  const owners = new Map<string, string>();
  for (const recipe of recipes) {
    if (!recipe.enabled(spec)) continue;
    if (applied.has(recipe.id) || recipe.requires.some((id) => !applied.has(id)))
      throw new Error(`Recipe dependency/order conflict: ${recipe.id}`);
    for (const [path, contents] of Object.entries(recipe.render(spec, versions))) {
      if (owners.has(path))
        throw new Error(`Recipe file conflict: ${path} is already owned by ${owners.get(path)}`);
      owners.set(path, recipe.id);
      files[path] = contents;
    }
    applied.add(recipe.id);
  }
  return files;
}
export function renderProject(spec: ProjectSpec, versions: Versions): Files {
  return composeRecipes(spec, versions, recipeCatalog);
}
