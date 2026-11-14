#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { agentFiles } from "@vibestartkit/agent-adapters";
import {
  agentIds,
  applyPlan,
  canonicalTarget,
  exampleSpec,
  inspectEnvironment,
  jsonSchema,
  makePlan,
  mcpIds,
  type Plan,
  type ProjectSpec,
  parseSpec,
  readPlan,
  readState,
  resolveVersions,
  SetupError,
  toolIds,
  validateTarget,
  verifyProject,
} from "@vibestartkit/core";
import { recipeCatalog, renderProject } from "@vibestartkit/recipes";

const version = "0.2.0";
const assets = fileURLToPath(new URL("./assets/", import.meta.url));
const emit = (value: unknown) =>
  process.stdout.write(
    JSON.stringify({ protocolVersion: 1, kitVersion: version, ...(value as object) }, null, 2) +
      "\n",
  );
const commands = ["init", "capabilities", "schema", "inspect", "plan", "apply", "verify", "status"];
const questions = [
  { field: "name", question: "What is the project called?" },
  { field: "directory", question: "Where should the new monorepo be created?" },
  {
    field: "preset",
    question: "Web SaaS or the AI/worker preset?",
    choices: ["web-saas", "ai-worker"],
  },
  {
    field: "agents",
    question: "Which coding agents should receive skills and project setup?",
    choices: agentIds,
  },
  {
    field: "deployment",
    question: "Should the project include Vercel and, for a worker, Render configuration?",
  },
  {
    field: "integrations",
    question: "Which optional model, review, memory and CI integrations do you want?",
    choices: ["openrouter", "kody", "supermemory", "blacksmith"],
  },
  {
    field: "tools",
    question: "Which additional local CLI tools should be installed?",
    choices: toolIds,
  },
  {
    field: "mcp",
    question: "Which MCP servers should be configured, and for which Supabase project?",
    choices: mcpIds,
  },
  { field: "setup", question: "Install project dependencies and activate the Git hooks?" },
];

async function writeExclusive(file: string, value: unknown) {
  await mkdir(dirname(file), { recursive: true });
  const text = `${JSON.stringify(value, null, 2)}\n`;
  try {
    await writeFile(file, text, { flag: "wx" });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "EEXIST" &&
      (await readFile(file, "utf8")) === text
    )
      return;
    throw error;
  }
}

async function compose(spec: ProjectSpec, versions: Plan["versions"]) {
  const files = renderProject(spec, versions);
  const extra = await agentFiles(spec, assets);
  for (const [path, contents] of Object.entries(extra)) {
    if (path in files)
      throw new SetupError("recipe_conflict", "Multiple recipes own the same output.", { path });
    files[path] = contents;
  }
  return files;
}

async function interactive(): Promise<ProjectSpec> {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new SetupError(
      "needs_input",
      "Interactive setup needs a terminal; let your agent use the schema/specification flow.",
      questions,
    );
  const input = createInterface({ input: process.stdin, output: process.stderr });
  const ask = async (question: string, fallback: string) =>
    (await input.question(`${question} [${fallback}]: `)).trim() || fallback;
  try {
    const preset = await ask("Preset: web-saas or ai-worker", "web-saas");
    if (preset !== "web-saas" && preset !== "ai-worker")
      throw new SetupError("needs_input", "Choose a supported preset.");
    const spec = exampleSpec(preset);
    spec.name = await ask("Project name", "my-project");
    spec.directory = await ask("Destination", `./${spec.name}`);
    spec.agents = (await ask("Coding clients, separated by commas", "codex"))
      .split(",")
      .map((item) => item.trim()) as ProjectSpec["agents"];
    spec.deployment.web = (await ask(
      "Web deployment: vercel or none",
      "vercel",
    )) as ProjectSpec["deployment"]["web"];
    spec.deployment.worker =
      preset === "ai-worker"
        ? ((await ask(
            "Worker deployment: render or none",
            "render",
          )) as ProjectSpec["deployment"]["worker"])
        : "none";
    spec.githubOwner = (await ask(
      "GitHub owner: personal, organization or none",
      "personal",
    )) as ProjectSpec["githubOwner"];
    const yes = async (question: string) => {
      const answer = await ask(`${question} (yes/no)`, "no");
      if (!["yes", "no"].includes(answer)) throw new SetupError("needs_input", "Answer yes or no.");
      return answer === "yes";
    };
    for (const integration of ["openrouter", "kody", "supermemory", "blacksmith"] as const)
      spec.integrations[integration] = await yes(`Configure ${integration}?`);
    const tools = await ask("Additional CLI tools, comma-separated; use none to skip", "none");
    spec.tools =
      tools === "none" ? [] : (tools.split(",").map((item) => item.trim()) as ProjectSpec["tools"]);
    const mcp = await ask("MCP servers, comma-separated; use none to skip", "none");
    spec.mcp.servers =
      mcp === "none"
        ? []
        : (mcp.split(",").map((item) => item.trim()) as ProjectSpec["mcp"]["servers"]);
    if (spec.mcp.servers.includes("supabase"))
      spec.mcp.supabaseProjectRef = await ask("Supabase project reference", "");
    spec.setup.installDependencies = await yes("Install project dependencies?");
    spec.setup.installHooks = spec.setup.installDependencies
      ? await yes("Activate pre-commit and pre-push hooks?")
      : false;
    return parseSpec(spec);
  } finally {
    input.close();
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      spec: { type: "string" },
      out: { type: "string" },
      plan: { type: "string" },
      project: { type: "string" },
      offline: { type: "boolean" },
      interactive: { type: "boolean" },
      agent: { type: "boolean" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean" },
      preset: { type: "string" },
    },
  });
  const command = positionals[0] ?? "init";
  if (values.help)
    return emit({
      status: "help",
      commands,
      usage:
        "Use init --agent, then plan --spec project.json --out plan.json, apply --plan plan.json, and verify --project ./my-project. The CLI runs from a repository checkout; it is not published to npm yet.",
    });
  if (values.version) return emit({ status: "ok", version });
  switch (command) {
    case "capabilities":
      return emit({
        status: "ok",
        presets: [
          { id: "web-saas", stack: ["next", "supabase-auth", "pnpm", "turbo"] },
          {
            id: "ai-worker",
            stack: ["next", "supabase-auth", "temporal", "render", "vercel", "pnpm", "turbo"],
          },
        ],
        recipes: recipeCatalog.map(({ id, revision, requires }) => ({ id, revision, requires })),
        clientRequirements: {
          opencode: "V2 (@opencode/cli); legacy V1 uses a different MCP format",
        },
        agents: agentIds,
        tools: toolIds,
        mcp: mcpIds,
        commands,
        platforms: {
          generation: ["macOS", "Linux"],
          nativeToolInstallation: "Homebrew when present; otherwise a reported manual step.",
        },
        questions,
      });
    case "schema":
      return emit({ status: "ok", schema: jsonSchema() });
    case "inspect":
      return emit({ status: "ok", environment: await inspectEnvironment() });
    case "init": {
      if (!values.interactive) {
        emit({
          status: "needs_input",
          message:
            "Use your current coding agent to collect these choices; no terminal prompts or file changes were made.",
          questions,
          example: exampleSpec(values.preset === "ai-worker" ? "ai-worker" : "web-saas"),
          next: "Save an explicit specification, then run plan --spec project.json --out plan.json.",
        });
        process.exitCode = 3;
        return;
      }
      const spec = await interactive();
      if (values.out) await writeExclusive(resolve(values.out), spec);
      return emit({
        status: "specified",
        spec,
        saved: values.out ?? null,
        next: "Review the specification, then run plan --spec <file> --out plan.json.",
      });
    }
    case "plan": {
      if (!values.spec)
        throw new SetupError(
          "needs_input",
          "Supply --spec with the project specification file.",
          questions,
        );
      const path = resolve(values.spec);
      const spec = parseSpec(JSON.parse(await readFile(path, "utf8")));
      const target = await canonicalTarget(resolve(dirname(path), spec.directory));
      await validateTarget(target);
      const versions = await resolveVersions(spec, Boolean(values.offline));
      const plan = makePlan(
        spec,
        versions,
        await compose(spec, versions),
        target,
        Boolean(values.offline),
      );
      if (values.out) {
        const output = resolve(values.out);
        const rel = relative(target, output);
        if (rel === "" || (!rel.startsWith("..") && !rel.startsWith("/")))
          throw new SetupError(
            "plan_destination",
            "Save the plan outside the new project directory.",
          );
        await writeExclusive(output, plan);
      }
      return emit({
        status: "planned",
        planId: plan.planId,
        target,
        fileCount: Object.keys(plan.files).length,
        files: Object.keys(plan.files),
        actions: plan.actions,
        pending: plan.pending,
        versions,
        versionSource: plan.versionSource,
        ...(values.out ? { saved: resolve(values.out) } : { plan }),
      });
    }
    case "apply": {
      if (!values.plan)
        throw new SetupError("needs_input", "Supply --plan with the reviewed plan file.");
      const plan = readPlan(JSON.parse(await readFile(resolve(values.plan), "utf8")));
      const spec = parseSpec(plan.spec);
      const expected = makePlan(
        spec,
        plan.versions,
        await compose(spec, plan.versions),
        plan.target,
        plan.versionSource === "tested-snapshot",
      );
      const state = await applyPlan(plan, expected);
      const failed = state.actions.some((action) => action.status === "failed");
      const pending = state.actions.some((action) => action.status === "needs_action");
      emit({
        status: failed ? "failed" : pending ? "needs_action" : "generated",
        target: plan.target,
        planId: plan.planId,
        actions: state.actions,
        pending: plan.pending,
        next:
          failed || pending
            ? "Resolve the reported action, then repeat apply with the same plan to resume."
            : "Run verify --project " +
              plan.target +
              "; complete the account and client discovery checks separately.",
      });
      if (failed) process.exitCode = 1;
      else if (pending) process.exitCode = 3;
      return;
    }
    case "verify": {
      const target = await canonicalTarget(resolve(values.project ?? "."));
      const result = await verifyProject(target);
      emit({
        status: result.passed ? "local_checks_passed" : "verification_failed",
        target,
        ...result,
      });
      if (!result.passed) process.exitCode = 1;
      return;
    }
    case "status": {
      const target = await canonicalTarget(resolve(values.project ?? "."));
      const state = await readState(target);
      if (!state) throw new SetupError("missing_state", "No VibeStartKit setup state found.");
      const plan = readPlan(
        JSON.parse(await readFile(resolve(target, ".vibe-kit/plan.json"), "utf8")),
      );
      return emit({
        status: "observed",
        target,
        state,
        pending: plan.pending,
        scope:
          "Recorded setup/local-check evidence; provider authentication and live acceptance are not inferred.",
      });
    }
    default:
      throw new SetupError("unknown_command", "Choose a supported command.", { commands });
  }
}

main().catch((error) => {
  emit({
    status: "error",
    code: error instanceof SetupError ? error.code : "execution_error",
    message: error instanceof Error ? error.message : String(error),
    ...(error instanceof SetupError && error.details !== undefined
      ? { details: error.details }
      : {}),
  });
  process.exitCode =
    error instanceof SetupError && ["needs_input", "incompatible_choices"].includes(error.code)
      ? 3
      : 1;
});
