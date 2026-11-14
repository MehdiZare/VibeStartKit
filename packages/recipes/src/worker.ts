import type { Files, ProjectSpec, Versions } from "@vibestartkit/core";

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export function workerFiles(spec: ProjectSpec, v: Versions): Files {
  if (spec.preset !== "ai-worker") return {};
  return {
    "apps/worker/package.json": json({
      name: "@app/worker",
      version: "0.0.0",
      private: true,
      type: "module",
      scripts: {
        build: "tsc",
        typecheck: "tsc --noEmit",
        test: "node --test tests/*.test.mjs",
        dev: "pnpm build && node --env-file-if-exists=.env dist/worker.js",
        start: "node --env-file-if-exists=.env dist/worker.js",
        workflow: "pnpm build && node --env-file-if-exists=.env dist/start-workflow.js",
      },
      dependencies: {
        "@app/contracts": "workspace:*",
        "@temporalio/client": v["@temporalio/client"],
        "@temporalio/worker": v["@temporalio/worker"],
        "@temporalio/workflow": v["@temporalio/workflow"],
        "@temporalio/activity": v["@temporalio/activity"],
      },
      devDependencies: { "@types/node": v["@types/node"], typescript: v.typescript },
    }),
    "apps/worker/tsconfig.json": json({
      extends: "../../packages/config/tsconfig.json",
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        outDir: "dist",
        rootDir: "src",
        declaration: true,
      },
      include: ["src/**/*.ts"],
    }),
    "apps/worker/.env.example":
      "TEMPORAL_ADDRESS=localhost:7233\nTEMPORAL_NAMESPACE=default\nTEMPORAL_TASK_QUEUE=vibestartkit\nTEMPORAL_TLS=false\nTEMPORAL_API_KEY=\n",
    "apps/worker/src/activities.ts": `import { parseTextTask, type TextTask, type TextReport } from "@app/contracts";
export async function analyzeText(input: TextTask): Promise<TextReport> {
  const task = parseTextTask(input);
  return { requestId: task.requestId, words: task.text.split(/\\s+/u).length, preview: task.text.slice(0,120) };
}
`,
    "apps/worker/src/workflows.ts": `import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "./activities.js";
import type { TextTask, TextReport } from "@app/contracts";
const { analyzeText } = proxyActivities<typeof activities>({startToCloseTimeout:"30 seconds"});
export async function analyzeTextWorkflow(input: TextTask): Promise<TextReport> {
  return analyzeText(input);
}
`,
    "apps/worker/src/worker.ts": `import { NativeConnection, Worker } from "@temporalio/worker";
import { fileURLToPath } from "node:url";
import * as activities from "./activities.js";
const connection = await NativeConnection.connect({
  address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
  ...(process.env.TEMPORAL_TLS === "true" ? {tls:true} : {}),
  ...(process.env.TEMPORAL_API_KEY ? {apiKey:process.env.TEMPORAL_API_KEY} : {}),
});
try {
  const worker = await Worker.create({
    connection, namespace:process.env.TEMPORAL_NAMESPACE || "default",
    taskQueue:process.env.TEMPORAL_TASK_QUEUE || "vibestartkit",
    workflowsPath:fileURLToPath(new URL("./workflows.js",import.meta.url)),activities,
  });
  await worker.run();
} finally { await connection.close(); }
`,
    "apps/worker/src/start-workflow.ts": `import { Client, Connection } from "@temporalio/client";
import { randomUUID } from "node:crypto";
import { parseTextTask } from "@app/contracts";
import type { analyzeTextWorkflow } from "./workflows.js";
const connection=await Connection.connect({
  address:process.env.TEMPORAL_ADDRESS || "localhost:7233",
  ...(process.env.TEMPORAL_TLS === "true" ? {tls:true} : {}),
  ...(process.env.TEMPORAL_API_KEY ? {apiKey:process.env.TEMPORAL_API_KEY} : {}),
});
try {
  const client=new Client({connection,namespace:process.env.TEMPORAL_NAMESPACE || "default"});
  const task=parseTextTask({requestId:randomUUID(),text:process.argv.slice(2).join(" ") || "My first VibeStartKit workflow"});
  const result=await client.workflow.execute<typeof analyzeTextWorkflow>("analyzeTextWorkflow",{
    taskQueue:process.env.TEMPORAL_TASK_QUEUE || "vibestartkit",
    workflowId:"text-"+task.requestId,args:[task],
  });
  console.log(JSON.stringify(result,null,2));
} finally { await connection.close(); }
`,
    "apps/worker/tests/activity.test.mjs": `import assert from "node:assert/strict";
import test from "node:test";
import { analyzeText } from "../dist/activities.js";
test("activity preserves request identity and handles repeated whitespace", async () => {
  assert.deepEqual(await analyzeText({requestId:"trial-1",text:"  hello\\n world  "}),{requestId:"trial-1",words:2,preview:"hello\\n world"});
});
test("empty work is rejected before a provider or model can be called", async () => {
  await assert.rejects(analyzeText({requestId:"trial-2",text:"   "}),/text/i);
});
`,
    ...(spec.deployment.worker === "render"
      ? {
          "render.yaml": `services:
  - type: worker
    name: ${spec.name}-worker
    runtime: node
    buildCommand: npm exec --yes --package=pnpm@${v.pnpm} -- pnpm install --frozen-lockfile --prod=false && npm exec --yes --package=pnpm@${v.pnpm} -- pnpm --filter @app/worker... build
    startCommand: node apps/worker/dist/worker.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: TEMPORAL_ADDRESS
        sync: false
      - key: TEMPORAL_NAMESPACE
        sync: false
      - key: TEMPORAL_TASK_QUEUE
        value: vibestartkit
      - key: TEMPORAL_TLS
        value: "true"
      - key: TEMPORAL_API_KEY
        sync: false
`,
        }
      : {}),
  };
}
