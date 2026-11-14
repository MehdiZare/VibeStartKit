import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

const kit = resolve(import.meta.dirname, "..");
const cli = join(kit, "packages/cli/dist/index.mjs");
const { values } = parseArgs({
  options: { preset: { type: "string" }, latest: { type: "boolean" }, keep: { type: "boolean" } },
});
const presets = values.preset ? [values.preset] : ["web-saas", "ai-worker"];
assert.ok(presets.every((preset) => ["web-saas", "ai-worker"].includes(preset)));
const temporary = await realpath(await mkdtemp(join(tmpdir(), "vsk-generated-")));
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  GIT_CONFIG_GLOBAL: join(temporary, "synthetic-gitconfig"),
  NEXT_TELEMETRY_DISABLED: "1",
  TURBO_TELEMETRY_DISABLED: "1",
};

function run(command, args, cwd, { expected = 0, json = false, quiet = false } = {}) {
  return new Promise((resolveResult, reject) => {
    let output = "";
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    child.stdout.on("data", (data) => {
      output += data;
      if (!json && !quiet) process.stderr.write(data);
    });
    child.stderr.on("data", (data) => {
      if (!quiet) process.stderr.write(data);
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code !== expected)
        return reject(
          new Error(`${command} ${args.join(" ")} exited ${code}; expected ${expected}\n${output}`),
        );
      try {
        resolveResult(json ? JSON.parse(output) : output);
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const port = server.address().port;
  await new Promise((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );
  return port;
}

async function checkHttp(project) {
  const port = await availablePort();
  const child = spawn(
    process.execPath,
    [
      join(project, "apps/web/node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: join(project, "apps/web"),
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    },
  );
  let logs = "";
  child.stdout.on("data", (data) => (logs += data));
  child.stderr.on("data", (data) => (logs += data));
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(`Web server exited:\n${logs}`);
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* The server is still starting. */
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    assert.equal(ready, true, logs);
    const base = `http://127.0.0.1:${port}`;
    const home = await fetch(base);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /VibeStartKit monorepo is running/);
    const health = await (await fetch(`${base}/api/health`)).json();
    assert.deepEqual(health, { status: "ok", supabase: "needs_configuration" });
    const dashboard = await fetch(`${base}/dashboard`, { redirect: "manual" });
    assert.ok([302, 303, 307, 308].includes(dashboard.status));
    assert.ok(dashboard.headers.get("location")?.endsWith("/login"));
    const login = await fetch(`${base}/login`);
    assert.equal(login.status, 200);
    return { home: 200, health: "ok", unauthenticatedDashboard: "redirected", login: 200 };
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolveExit) => {
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        resolveExit();
      }, 5000);
      child.once("exit", () => {
        clearTimeout(timeout);
        resolveExit();
      });
    });
  }
}

async function checkHook(project, pnpmVersion) {
  const probe = join(project, "hook-probe.ts");
  await writeFile(probe, "export const hookProbe={value:1}\n");
  try {
    await run("git", ["add", "hook-probe.ts"], project, { quiet: true });
    const pnpm = ["exec", "--yes", `--package=pnpm@${pnpmVersion}`, "--", "pnpm"];
    await run("npm", [...pnpm, "exec", "lefthook", "run", "pre-commit"], project, {
      expected: 1,
      quiet: true,
    });
    await run("npm", [...pnpm, "exec", "biome", "format", "--write", "hook-probe.ts"], project, {
      quiet: true,
    });
    await run("git", ["add", "hook-probe.ts"], project, { quiet: true });
    await run("npm", [...pnpm, "exec", "lefthook", "run", "pre-commit"], project, { quiet: true });
    return "Rejected unformatted staged code and accepted the formatted version.";
  } finally {
    await run("git", ["rm", "--cached", "--force", "--ignore-unmatch", "hook-probe.ts"], project, {
      quiet: true,
    });
    await rm(probe, { force: true });
  }
}

const sharedHooks = join(temporary, "shared-hooks");
await mkdir(sharedHooks);
await writeFile(join(sharedHooks, "pre-commit"), "# synthetic shared hook: preserve this file\n");
await writeFile(env.GIT_CONFIG_GLOBAL, `[core]\n  hooksPath = ${JSON.stringify(sharedHooks)}\n`);
const results = [];
try {
  for (const preset of presets) {
    const workspace = join(temporary, preset);
    await mkdir(workspace);
    const spec = JSON.parse(await readFile(join(kit, "presets", `${preset}.json`), "utf8"));
    spec.name = `smoke-${preset}`;
    spec.directory = "./project";
    const specification = join(workspace, "project.json");
    const planFile = join(workspace, "plan.json");
    await writeFile(specification, `${JSON.stringify(spec, null, 2)}\n`);
    const plan = await run(
      process.execPath,
      [
        cli,
        "plan",
        "--spec",
        specification,
        "--out",
        planFile,
        ...(values.latest ? [] : ["--offline"]),
      ],
      workspace,
      { json: true },
    );
    const applied = await run(process.execPath, [cli, "apply", "--plan", planFile], workspace, {
      json: true,
    });
    assert.equal(applied.status, "generated");
    const verified = await run(
      process.execPath,
      [cli, "verify", "--project", plan.target],
      workspace,
      { json: true },
    );
    assert.equal(verified.status, "local_checks_passed");
    if (preset === "ai-worker") {
      await run(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          'import { bundleWorkflowCode } from "@temporalio/worker"; import { resolve } from "node:path"; const result = await bundleWorkflowCode({ workflowsPath: resolve("dist/workflows.js") }); if (!result.code) throw new Error("Empty workflow bundle");',
        ],
        join(plan.target, "apps/worker"),
      );
    }
    const hook = await checkHook(plan.target, plan.versions.pnpm);
    const http = await checkHttp(plan.target);
    assert.equal(
      await readFile(join(sharedHooks, "pre-commit"), "utf8"),
      "# synthetic shared hook: preserve this file\n",
    );
    results.push({
      preset,
      localChecks: true,
      workflowBundled: preset === "ai-worker",
      hook,
      http,
      pending: verified.pending.map((item) => item.id),
    });
  }
  console.log(
    JSON.stringify(
      { status: "passed", versions: values.latest ? "registry" : "tested-snapshot", results },
      null,
      2,
    ),
  );
} finally {
  if (values.keep) console.error(`Kept disposable projects at ${temporary}`);
  else await rm(temporary, { recursive: true, force: true });
}
