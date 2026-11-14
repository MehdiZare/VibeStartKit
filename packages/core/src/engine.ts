import { execFile, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  access,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import { homedir, platform } from "node:os";
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import * as z from "zod";
import {
  type Files,
  type ProjectSpec,
  parseSpec,
  projectSpec,
  SetupError,
  type Versions,
} from "./spec.js";
import { checkVersions } from "./versions.js";

const actionSchema = z.strictObject({
  id: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  scope: z.enum(["project", "system"]),
  skipIfBinary: z.string().optional(),
});
export type Action = z.infer<typeof actionSchema>;
const planSchema = z.strictObject({
  schemaVersion: z.literal(1),
  kitVersion: z.literal("0.2.0"),
  planId: z.string(),
  target: z.string(),
  spec: projectSpec,
  versions: z.record(z.string(), z.string()),
  versionSource: z.enum(["registry", "tested-snapshot"]),
  files: z.record(z.string(), z.string()),
  actions: z.array(actionSchema),
  pending: z.array(
    z.strictObject({ id: z.string(), instruction: z.string(), url: z.string().optional() }),
  ),
});
export type Plan = z.infer<typeof planSchema>;
const execFileAsync = promisify(execFile);
export type ActionResult = {
  id: string;
  status: "success" | "failed" | "needs_action";
  exitCode?: number;
  message?: string;
};
export type RunState = {
  schemaVersion: 1;
  planId: string;
  actions: ActionResult[];
  verification?: { passed: boolean; at: string };
};
export type Runner = (action: Action, cwd: string) => Promise<ActionResult>;

export function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function canonicalTarget(value: string): Promise<string> {
  const absolute = resolve(value);
  try {
    if ((await lstat(absolute)).isSymbolicLink())
      throw new SetupError(
        "symlink_target",
        "The project destination itself must not be a symlink.",
      );
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  const tail = [basename(absolute)];
  let ancestor = dirname(absolute);
  while (true) {
    try {
      return join(await realpath(ancestor), ...tail.reverse());
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT"))
        throw error;
      tail.push(basename(ancestor));
      ancestor = dirname(ancestor);
    }
  }
}

export async function assertNoSymlinks(target: string): Promise<void> {
  let current = resolve(target);
  while (true) {
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new SetupError("symlink_target", "Choose a destination without symlink components.", {
          path: current,
        });
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT"))
        throw error;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

export async function validateTarget(target: string, ownedPlanId?: string): Promise<void> {
  if (!isAbsolute(target) || resolve(target) === resolve(homedir()) || dirname(target) === target)
    throw new SetupError(
      "invalid_target",
      "Choose a new project directory, not your home or filesystem root.",
    );
  await assertNoSymlinks(target);
  try {
    if (!(await lstat(target)).isDirectory())
      throw new SetupError("invalid_target", "Destination is not a directory.");
    const entries = await readdir(target);
    if (entries.length) {
      const state = ownedPlanId ? await readState(target) : undefined;
      if (!state || state.planId !== ownedPlanId)
        throw new SetupError(
          "directory_conflict",
          "Destination is not empty; choose a new directory.",
          { target },
        );
    }
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT"))
      throw error;
  }
}

function pathInProject(target: string, file: string): string {
  if (
    !file ||
    isAbsolute(file) ||
    file.split(/[\\/]/).includes("..") ||
    file.includes("\\") ||
    file.includes("\0")
  )
    throw new SetupError("invalid_file", "Recipe output must be a relative project path.", {
      file,
    });
  const path = resolve(target, file);
  const rel = relative(target, path);
  if (!rel || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    throw new SetupError("invalid_file", "Recipe output escapes the project.");
  return path;
}

export function setupActions(spec: ProjectSpec): Action[] {
  const actions: Action[] = [
    ...(spec.tools.includes("git")
      ? [
          {
            id: "tool-git",
            command: "brew",
            args: ["install", "git"],
            scope: "system" as const,
            skipIfBinary: "git",
          },
        ]
      : []),
    { id: "git", command: "git", args: ["init", "--initial-branch=main"], scope: "project" },
  ];
  if (spec.setup.installHooks)
    actions.push({
      id: "git-hooks-scope",
      command: "git",
      args: ["config", "--local", "core.hooksPath", ".git/hooks"],
      scope: "project",
    });
  if (spec.setup.installDependencies) {
    actions.push({
      id: "dependencies",
      command: "npm",
      args: [
        "exec",
        "--yes",
        "--package=pnpm@VERSION",
        "--",
        "pnpm",
        "install",
        "--prod=false",
        "--reporter=append-only",
      ],
      scope: "project",
    });
    actions.push({
      id: "format",
      command: "pnpm",
      args: ["exec", "biome", "format", "--write", "."],
      scope: "project",
    });
  }
  if (spec.setup.installHooks)
    actions.push({
      id: "hooks",
      command: "pnpm",
      args: ["exec", "lefthook", "install", "--force"],
      scope: "project",
    });
  const native = {
    gh: "gh",
    rg: "ripgrep",
    jq: "jq",
    render: "render",
    temporal: "temporal",
    uv: "uv",
    task: "go-task",
    fnm: "fnm",
    pyenv: "pyenv",
  } as const;
  for (const tool of spec.tools) {
    const formula = native[tool as keyof typeof native];
    if (formula)
      actions.push({
        id: `tool-${tool}`,
        command: "brew",
        args: ["install", formula],
        scope: "system",
        skipIfBinary: tool,
      });
  }
  return actions;
}

export function pendingSteps(spec: ProjectSpec): Plan["pending"] {
  const pending: Plan["pending"] = [
    {
      id: "supabase",
      instruction:
        "Configure a local Supabase stack or the chosen hosted project's publishable URL/key, then verify sign-in and the ownership policy.",
      url: "https://supabase.com/docs/guides/auth/server-side/nextjs",
    },
  ];
  if (spec.preset === "ai-worker")
    pending.push({
      id: "temporal",
      instruction:
        "Run a local Temporal service or configure the intended Temporal Cloud namespace, then execute the sample workflow.",
      url: "https://docs.temporal.io/cli",
    });
  if (spec.deployment.web === "vercel")
    pending.push({
      id: "vercel",
      instruction:
        "Connect the intended Vercel project with apps/web as its root and review the deployment configuration.",
      url: "https://vercel.com/docs/monorepos",
    });
  if (spec.deployment.worker === "render")
    pending.push({
      id: "render",
      instruction:
        "Review render.yaml and connect the intended Render workspace; configure Temporal credentials before deploying.",
      url: "https://render.com/docs/blueprint-spec",
    });
  if (spec.integrations.openrouter)
    pending.push({
      id: "openrouter",
      instruction:
        "Use the selected client's provider flow to configure OpenRouter and choose a model; no inference was performed.",
      url: "https://openrouter.ai/docs/quickstart",
    });
  if (spec.integrations.kody)
    pending.push({
      id: "kody",
      instruction:
        "Authorize Kody for the intended GitHub repository and verify a review; the optional Kodus CLI is a separate selection.",
      url: "https://github.com/kodustech/kodus-ai",
    });
  if (spec.integrations.supermemory)
    pending.push({
      id: "supermemory",
      instruction:
        "Authorize the selected Supermemory space and verify the save destination; do not assume all client defaults match.",
      url: "https://supermemory.ai/docs/supermemory-mcp/setup",
    });
  if (spec.integrations.blacksmith)
    pending.push({
      id: "blacksmith",
      instruction:
        "Complete the GitHub organization integration before enabling the optional Blacksmith workflow.",
      url: "https://docs.blacksmith.sh/introduction/quickstart",
    });
  for (const client of spec.agents)
    pending.push({
      id: `agent-${client}`,
      instruction:
        "Open the project in " +
        client +
        ", reload as needed, and verify the discovered skills and required commands.",
    });
  if (spec.mcp.servers.length)
    pending.push({
      id: "mcp",
      instruction:
        "Authorize the generated MCP connections in the chosen client and verify scope/tools with a read-only operation.",
    });
  return pending;
}

export function makePlan(
  spec: ProjectSpec,
  versions: Versions,
  files: Files,
  target: string,
  offline: boolean,
): Plan {
  checkVersions(spec, versions);
  for (const file of Object.keys(files)) pathInProject(target, file);
  const actions = setupActions(spec).map((action) => ({
    ...action,
    args: action.args.map((arg) => arg.replace("pnpm@VERSION", `pnpm@${versions.pnpm}`)),
  }));
  const base = {
    schemaVersion: 1 as const,
    kitVersion: "0.2.0" as const,
    target,
    spec,
    versions,
    versionSource: offline ? ("tested-snapshot" as const) : ("registry" as const),
    files,
    actions,
    pending: pendingSteps(spec),
  };
  return { ...base, planId: digest(base) };
}

export function readPlan(input: unknown): Plan {
  const result = planSchema.safeParse(input);
  if (!result.success)
    throw new SetupError(
      "invalid_plan",
      "Plan is not a supported VibeStartKit plan.",
      result.error.issues,
    );
  const { planId, ...base } = result.data;
  if (digest(base) !== planId)
    throw new SetupError(
      "changed_plan",
      "The plan changed; generate a new plan before applying it.",
    );
  parseSpec(base.spec);
  checkVersions(base.spec, base.versions);
  return result.data;
}

export async function readState(target: string): Promise<RunState | undefined> {
  const file = join(target, ".vibe-kit/state.json");
  await assertNoSymlinks(file);
  try {
    const raw: unknown = JSON.parse(await readFile(file, "utf8"));
    const schema = z.strictObject({
      schemaVersion: z.literal(1),
      planId: z.string(),
      actions: z.array(
        z.object({
          id: z.string(),
          status: z.enum(["success", "failed", "needs_action"]),
          exitCode: z.number().optional(),
          message: z.string().optional(),
        }),
      ),
      verification: z.object({ passed: z.boolean(), at: z.string() }).optional(),
    });
    return schema.parse(raw);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT")
      return undefined;
    throw new SetupError("invalid_state", "Could not read this project's setup state.");
  }
}

async function saveState(target: string, state: RunState): Promise<void> {
  const destination = join(target, ".vibe-kit/state.json");
  await assertNoSymlinks(destination);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  await rename(temporary, destination);
}

export async function findBinary(name: string): Promise<string | undefined> {
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    for (const extension of extensions) {
      const candidate = join(directory, name + extension);
      try {
        await access(candidate, constants.X_OK);
        return candidate;
      } catch {
        /* Try the next PATH entry. */
      }
    }
  }
  return undefined;
}

export const runCommand: Runner = async (action, cwd) => {
  if (action.id === "hooks") {
    await assertNoSymlinks(join(cwd, ".git/hooks"));
    const { stdout } = await execFileAsync("git", ["config", "--get", "core.hooksPath"], { cwd });
    if (stdout.trim() !== ".git/hooks")
      return {
        id: action.id,
        status: "needs_action",
        message:
          "The effective hook path changed; restore the planned project-local .git/hooks setting before resuming.",
      };
  }
  if (action.skipIfBinary && (await findBinary(action.skipIfBinary)))
    return {
      id: action.id,
      status: "success",
      message: "Existing binary found; authentication/version not established.",
    };
  if (action.command === "brew" && !(await findBinary("brew")))
    return {
      id: action.id,
      status: "needs_action",
      message:
        "Install this selected tool through your OS package manager, then resume; Homebrew was not found.",
    };
  const binary =
    action.command === "pnpm" ? (process.platform === "win32" ? "npm.cmd" : "npm") : action.command;
  const args =
    action.command === "pnpm"
      ? [
          "exec",
          "--yes",
          "--package=pnpm@" +
            JSON.parse(await readFile(join(cwd, "package.json"), "utf8")).packageManager.split(
              "@",
            )[1],
          "--",
          "pnpm",
          ...action.args,
        ]
      : action.args;
  return await new Promise<ActionResult>((resolveResult) => {
    const child = spawn(binary, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CI: "1", NEXT_TELEMETRY_DISABLED: "1", TURBO_TELEMETRY_DISABLED: "1" },
      shell: false,
    });
    child.stdout?.on("data", (data) => process.stderr.write(data));
    child.stderr?.on("data", (data) => process.stderr.write(data));
    child.once("error", (error) =>
      resolveResult({ id: action.id, status: "needs_action", message: error.message }),
    );
    child.once("exit", (code) =>
      resolveResult({
        id: action.id,
        status: code === 0 ? "success" : "failed",
        exitCode: code ?? 1,
      }),
    );
  });
};

export async function applyPlan(
  plan: Plan,
  expected: Plan,
  runner: Runner = runCommand,
): Promise<RunState> {
  if (plan.planId !== expected.planId)
    throw new SetupError(
      "recipe_changed",
      "This plan does not match the current recipe; regenerate it.",
    );
  await validateTarget(plan.target, plan.planId);
  let state = await readState(plan.target);
  if (!state) {
    const parent = dirname(plan.target);
    await mkdir(parent, { recursive: true });
    await assertNoSymlinks(parent);
    const staging = join(parent, `.${plan.spec.name}-${randomUUID()}.staging`);
    await mkdir(staging, { recursive: false });
    try {
      for (const [file, contents] of Object.entries(plan.files)) {
        const destination = pathInProject(staging, file);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, contents, { flag: "wx" });
      }
      state = { schemaVersion: 1, planId: plan.planId, actions: [] };
      await mkdir(join(staging, ".vibe-kit"), { recursive: true });
      await writeFile(join(staging, ".vibe-kit/plan.json"), `${JSON.stringify(plan, null, 2)}\n`, {
        flag: "wx",
        mode: 0o600,
      });
      await saveState(staging, state);
      await assertNoSymlinks(plan.target);
      try {
        await rmdir(plan.target);
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT"))
          throw error;
      }
      await rename(staging, plan.target);
    } catch (error) {
      await rm(staging, { recursive: true, force: true });
      throw error;
    }
  }
  for (const action of plan.actions) {
    if (state.actions.some((result) => result.id === action.id && result.status === "success"))
      continue;
    await assertNoSymlinks(plan.target);
    const result = await runner(action, plan.target);
    state.actions = state.actions.filter((previous) => previous.id !== action.id).concat(result);
    await saveState(plan.target, state);
    if (result.status !== "success") break;
  }
  return state;
}

export async function verifyProject(
  target: string,
  runner: Runner = runCommand,
): Promise<{ passed: boolean; checks: ActionResult[]; pending: Plan["pending"] }> {
  await assertNoSymlinks(target);
  const plan = readPlan(JSON.parse(await readFile(join(target, ".vibe-kit/plan.json"), "utf8")));
  if (plan.target !== resolve(target))
    throw new SetupError(
      "moved_project",
      "Project moved; review the saved setup paths before verification.",
    );
  const state = await readState(target);
  if (!state) throw new SetupError("missing_state", "Apply a setup plan first.");
  const checks: ActionResult[] = [];
  for (const id of ["format:check", "lint", "typecheck", "test", "build"]) {
    const result = await runner(
      { id, command: "pnpm", args: ["run", id], scope: "project" },
      target,
    );
    checks.push(result);
    if (result.status !== "success") break;
  }
  if (plan.spec.setup.installHooks) {
    let installed = false;
    try {
      const { stdout } = await execFileAsync("git", ["config", "--get", "core.hooksPath"], {
        cwd: target,
      });
      if (stdout.trim() !== ".git/hooks") throw new Error("Hook scope changed.");
      installed = true;
      for (const name of ["pre-commit", "pre-push"]) {
        const path = join(target, ".git/hooks", name);
        await assertNoSymlinks(path);
        await access(path, constants.X_OK);
        installed &&= (await readFile(path, "utf8")).includes("lefthook");
      }
    } catch {
      installed = false;
    }
    checks.push({
      id: "hooks-active",
      status: installed ? "success" : "failed",
      message: installed
        ? "Executable Lefthook pre-commit and pre-push hooks present."
        : "Expected Lefthook hook was not found.",
    });
  }
  const passed = checks.every((check) => check.status === "success");
  state.verification = { passed, at: new Date().toISOString() };
  await saveState(target, state);
  return { passed, checks, pending: plan.pending };
}

export async function inspectEnvironment(): Promise<unknown> {
  const binaries = [
    "node",
    "npm",
    "git",
    "gh",
    "rg",
    "jq",
    "claude",
    "codex",
    "opencode",
    "render",
    "temporal",
  ];
  const found = await Promise.all(
    binaries.map(async (name) => ({ name, path: (await findBinary(name)) ?? null })),
  );
  return {
    platform: platform(),
    node: process.versions.node,
    binaries: found,
    scope: "Binary discovery only; no credentials or provider accounts inspected.",
  };
}
