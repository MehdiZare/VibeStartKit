import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { agentFiles } from "../packages/agent-adapters/src/index.js";
import {
  type Action,
  type ActionResult,
  applyPlan,
  exampleSpec,
  makePlan,
  parseSpec,
  type Runner,
  readPlan,
  resolveVersions,
  SetupError,
  testedVersions,
  validateTarget,
  verifyProject,
} from "../packages/core/src/index.js";
import { composeRecipes, renderProject } from "../packages/recipes/src/index.js";

const root = resolve(import.meta.dirname, "..");
const success: Runner = async (action) => ({ id: action.id, status: "success" });

async function scratch(run: (directory: string) => Promise<void>) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "vsk-test-")));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
async function planFor(directory: string, preset: "web-saas" | "ai-worker" = "web-saas") {
  const spec = exampleSpec(preset);
  const versions = await resolveVersions(spec, true);
  return makePlan(
    spec,
    versions,
    { ...renderProject(spec, versions), ...(await agentFiles(spec, root)) },
    join(directory, "project"),
    true,
  );
}

test("missing choices return actionable fields instead of selecting an unknown stack", () => {
  assert.throws(
    () => parseSpec({}),
    (error) =>
      error instanceof SetupError &&
      error.code === "needs_input" &&
      Array.isArray(error.details) &&
      error.details.some((item: { field: string }) => item.field === "preset"),
  );
});
test("the recipe rejects incompatible hosting and CI choices", () => {
  const spec = exampleSpec();
  spec.deployment.worker = "render";
  assert.throws(() => parseSpec(spec), /stack choices/);
  spec.deployment.worker = "none";
  spec.integrations.blacksmith = true;
  assert.throws(() => parseSpec(spec), /stack choices/);
  spec.githubOwner = "organization";
  assert.equal(parseSpec(spec).integrations.blacksmith, true);
});
test("hooks cannot be activated without their dependency installation", () => {
  const spec = exampleSpec();
  spec.setup.installDependencies = false;
  assert.throws(() => parseSpec(spec), /stack choices/);
});
test("project-scoped Supabase MCP needs a selected project", () => {
  const spec = exampleSpec();
  spec.mcp.servers = ["supabase"];
  assert.throws(() => parseSpec(spec), /stack choices/);
  spec.mcp.supabaseProjectRef = "abcdefghijklmnopqrst";
  assert.equal(parseSpec(spec).mcp.servers[0], "supabase");
});
test("the two presets contain their actual application boundaries", () => {
  const web = renderProject(exampleSpec(), testedVersions);
  const worker = renderProject(exampleSpec("ai-worker"), testedVersions);
  assert.ok("apps/web/src/proxy.ts" in web);
  assert.ok(!("apps/worker/src/worker.ts" in web));
  assert.ok("apps/worker/src/workflows.ts" in worker);
  assert.ok("render.yaml" in worker);
  assert.equal(
    JSON.parse(worker["apps/worker/package.json"] ?? "").dependencies["@temporalio/worker"],
    testedVersions["@temporalio/worker"],
  );
  assert.ok(!web["supabase/config.toml"]?.includes("inbucket"));
});
test("each selected agent receives the supported scope without duplicated project policy", async () => {
  const spec = exampleSpec();
  spec.agents = ["claude-code", "codex", "cursor", "opencode"];
  spec.mcp = { servers: ["supabase", "render"], supabaseProjectRef: "abcdefghijklmnopqrst" };
  const files = await agentFiles(spec, root);
  assert.equal(files["CLAUDE.md"], "@AGENTS.md\n");
  assert.ok(files[".agents/skills/issue-closure/references/project-memory.md"]);
  assert.ok(files[".claude/skills/pr-ownership/SKILL.md"]);
  assert.ok(files[".codex/config.toml"]?.includes("read_only=true"));
  const opencode = JSON.parse(files["opencode.json"] ?? "");
  assert.equal(opencode.mcp.servers.render.type, "remote");
  assert.equal("enabled" in opencode.mcp.servers.render, false);
  assert.equal(Object.keys(JSON.parse(files[".mcp.json"] ?? "").mcpServers).length, 2);
});
test("planning is read-only and records exact versions and tool actions", async () =>
  scratch(async (directory) => {
    const plan = await planFor(directory);
    await assert.rejects(readFile(join(plan.target, "package.json")));
    assert.equal(plan.versions.next, testedVersions.next);
    assert.equal(
      plan.actions.find((action) => action.id === "dependencies")?.args[2],
      `--package=pnpm@${testedVersions.pnpm}`,
    );
    assert.deepEqual(plan.actions.find((action) => action.id === "git-hooks-scope")?.args, [
      "config",
      "--local",
      "core.hooksPath",
      ".git/hooks",
    ]);
    assert.equal(readPlan(JSON.parse(JSON.stringify(plan))).planId, plan.planId);
  }));
test("changing a saved plan invalidates its digest", async () =>
  scratch(async (directory) => {
    const plan = await planFor(directory);
    plan.files["arbitrary.txt"] = "unexpected";
    assert.throws(() => readPlan(plan), /plan changed/);
  }));
test("apply refuses a plan that does not match the current recipes", async () =>
  scratch(async (directory) => {
    const plan = await planFor(directory);
    const expected = { ...plan, planId: "different" };
    await assert.rejects(applyPlan(plan, expected, success), /current recipe/);
  }));
test("destination conflicts preserve every existing file", async () =>
  scratch(async (directory) => {
    const plan = await planFor(directory);
    await mkdir(plan.target);
    await writeFile(join(plan.target, "keep.txt"), "mine");
    await assert.rejects(applyPlan(plan, plan, success), /not empty/);
    assert.equal(await readFile(join(plan.target, "keep.txt"), "utf8"), "mine");
    await assert.rejects(readFile(join(plan.target, "package.json")));
  }));
test("a destination symlink cannot redirect project creation", async () =>
  scratch(async (directory) => {
    const plan = await planFor(directory);
    const outside = join(directory, "outside");
    await mkdir(outside);
    await symlink(outside, plan.target);
    await assert.rejects(validateTarget(plan.target), /symlink/);
  }));
test("recipe output cannot escape its target", () => {
  const spec = exampleSpec();
  assert.throws(
    () => makePlan(spec, testedVersions, { "../outside": "bad" }, "/tmp/new-project", true),
    /relative project path/,
  );
});
test("an empty existing destination is supported and gets a resumable manifest", async () =>
  scratch(async (directory) => {
    const plan = await planFor(directory);
    await mkdir(plan.target);
    const state = await applyPlan(plan, plan, success);
    assert.equal(state.planId, plan.planId);
    assert.equal(
      JSON.parse(await readFile(join(plan.target, "package.json"), "utf8")).name,
      "my-project",
    );
    assert.equal(
      readPlan(JSON.parse(await readFile(join(plan.target, ".vibe-kit/plan.json"), "utf8"))).planId,
      plan.planId,
    );
  }));
test("resume skips successful actions, retries the failed action and preserves user edits", async () =>
  scratch(async (directory) => {
    const plan = await planFor(directory);
    const calls: string[] = [];
    let fail = true;
    const runner: Runner = async (action: Action): Promise<ActionResult> => {
      calls.push(action.id);
      return { id: action.id, status: action.id === "dependencies" && fail ? "failed" : "success" };
    };
    const first = await applyPlan(plan, plan, runner);
    assert.equal(first.actions.at(-1)?.status, "failed");
    await writeFile(join(plan.target, "README.md"), "my revision");
    fail = false;
    const second = await applyPlan(plan, plan, runner);
    assert.ok(second.actions.every((item) => item.status === "success"));
    assert.equal(calls.filter((id) => id === "git").length, 1);
    assert.equal(calls.filter((id) => id === "dependencies").length, 2);
    assert.equal(await readFile(join(plan.target, "README.md"), "utf8"), "my revision");
  }));
test("verification does not infer active hooks from a passing command", async () =>
  scratch(async (directory) => {
    const plan = await planFor(directory);
    await applyPlan(plan, plan, success);
    const result = await verifyProject(plan.target, success);
    assert.equal(result.passed, false);
    assert.equal(result.checks.at(-1)?.id, "hooks-active");
  }));
test("tool selection installs Node CLIs locally and leaves remote accounts pending", () => {
  const spec = exampleSpec();
  spec.tools = ["codex", "supabase"];
  spec.integrations.kody = true;
  const files = renderProject(spec, testedVersions);
  const dependencies = JSON.parse(files["package.json"] ?? "").devDependencies;
  assert.equal(dependencies["@openai/codex"], testedVersions["@openai/codex"]);
  assert.equal(dependencies.supabase, testedVersions.supabase);
  const plan = makePlan(spec, testedVersions, files, "/tmp/my-project", true);
  assert.ok(plan.pending.some((item) => item.id === "kody"));
  assert.ok(!plan.actions.some((item) => item.args.includes("--global")));
});
test("a new recipe cannot silently replace another recipe's file", () => {
  const first = {
    id: "base",
    revision: 1,
    requires: [],
    enabled: () => true,
    render: () => ({ "package.json": "base" }),
  };
  const second = {
    ...first,
    id: "extra",
    requires: ["base"],
    render: () => ({ "package.json": "replacement" }),
  };
  assert.throws(
    () => composeRecipes(exampleSpec(), testedVersions, [first, second]),
    /already owned/,
  );
  assert.throws(() => composeRecipes(exampleSpec(), testedVersions, [second]), /dependency/);
});
