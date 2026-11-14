import * as z from "zod";

export const agentIds = ["claude-code", "codex", "cursor", "opencode"] as const;
export const toolIds = [
  "git",
  "gh",
  "rg",
  "jq",
  "claude-code",
  "codex",
  "opencode",
  "kodus",
  "supabase",
  "vercel",
  "render",
  "temporal",
  "uv",
  "bun",
  "task",
  "fnm",
  "pyenv",
] as const;
export const mcpIds = ["supabase", "render", "vercel", "supermemory"] as const;

export const projectSpec = z.strictObject({
  schemaVersion: z.literal(1),
  name: z
    .string()
    .regex(/^[a-z][a-z0-9-]{0,62}$/)
    .describe("Lowercase project name"),
  directory: z
    .string()
    .min(1)
    .describe("New, empty destination; resolved relative to the spec file"),
  preset: z.enum(["web-saas", "ai-worker"]),
  agents: z.array(z.enum(agentIds)).min(1),
  deployment: z.strictObject({
    web: z.enum(["vercel", "none"]),
    worker: z.enum(["render", "none"]),
  }),
  integrations: z.strictObject({
    openrouter: z.boolean(),
    kody: z.boolean(),
    supermemory: z.boolean(),
    blacksmith: z.boolean(),
  }),
  githubOwner: z.enum(["personal", "organization", "none"]),
  tools: z.array(z.enum(toolIds)),
  mcp: z.strictObject({
    servers: z.array(z.enum(mcpIds)),
    supabaseProjectRef: z
      .string()
      .regex(/^[a-z0-9]{10,40}$/)
      .optional(),
  }),
  setup: z.strictObject({ installDependencies: z.boolean(), installHooks: z.boolean() }),
});
export type ProjectSpec = z.infer<typeof projectSpec>;
export type AgentId = ProjectSpec["agents"][number];
export type ToolId = ProjectSpec["tools"][number];
export type Files = Record<string, string>;
export type Versions = Record<string, string>;

export class SetupError extends Error {
  constructor(
    public code: string,
    message: string,
    public details: unknown = undefined,
  ) {
    super(message);
  }
}

export function parseSpec(input: unknown): ProjectSpec {
  const parsed = projectSpec.safeParse(input);
  if (!parsed.success)
    throw new SetupError(
      "needs_input",
      "Complete the project choices before planning.",
      parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    );
  const spec = parsed.data;
  const errors: { field: string; message: string }[] = [];
  if (spec.preset === "web-saas" && spec.deployment.worker !== "none")
    errors.push({
      field: "deployment.worker",
      message: "A web-saas preset has no worker; choose none or the ai-worker preset.",
    });
  if (spec.integrations.blacksmith && spec.githubOwner !== "organization")
    errors.push({ field: "githubOwner", message: "Blacksmith requires a GitHub organization." });
  if (spec.setup.installHooks && !spec.setup.installDependencies)
    errors.push({
      field: "setup",
      message: "Hook activation needs the project dependencies installed.",
    });
  if (spec.mcp.servers.includes("supabase") && !spec.mcp.supabaseProjectRef)
    errors.push({
      field: "mcp.supabaseProjectRef",
      message: "Choose the Supabase project before configuring its MCP connection.",
    });
  if (spec.mcp.servers.includes("supermemory") && !spec.integrations.supermemory)
    errors.push({
      field: "integrations.supermemory",
      message: "Enable Supermemory when selecting its MCP server.",
    });
  for (const field of ["agents", "tools"] as const)
    if (new Set(spec[field]).size !== spec[field].length)
      errors.push({ field, message: "Selections must not contain duplicates." });
  if (new Set(spec.mcp.servers).size !== spec.mcp.servers.length)
    errors.push({ field: "mcp.servers", message: "Selections must not contain duplicates." });
  if (errors.length)
    throw new SetupError(
      "incompatible_choices",
      "Resolve these stack choices; nothing was changed.",
      errors,
    );
  return spec;
}

export function jsonSchema(): unknown {
  return z.toJSONSchema(projectSpec);
}

export function exampleSpec(preset: "web-saas" | "ai-worker" = "web-saas"): ProjectSpec {
  return {
    schemaVersion: 1,
    name: "my-project",
    directory: "./my-project",
    preset,
    agents: ["codex"],
    deployment: { web: "vercel", worker: preset === "ai-worker" ? "render" : "none" },
    integrations: { openrouter: false, kody: false, supermemory: false, blacksmith: false },
    githubOwner: "personal",
    tools: [],
    mcp: { servers: [] },
    setup: { installDependencies: true, installHooks: true },
  };
}
