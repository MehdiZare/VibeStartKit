import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Files, ProjectSpec } from "@vibestartkit/core";

async function collect(directory: string, prefix: string): Promise<Files> {
  const files: Files = {};
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.isSymbolicLink()) throw new Error("Skill assets must not contain symlinks.");
    const source = join(directory, item.name);
    const destination = `${prefix}/${item.name}`;
    if (item.isDirectory()) Object.assign(files, await collect(source, destination));
    else if (item.isFile()) files[destination] = await readFile(source, "utf8");
  }
  return files;
}

export async function agentFiles(spec: ProjectSpec, assets: string): Promise<Files> {
  const files: Files = {};
  const locations = new Set(
    spec.agents.map((client) => (client === "claude-code" ? ".claude/skills" : ".agents/skills")),
  );
  for (const location of locations)
    Object.assign(files, await collect(join(assets, "skills"), location));
  Object.assign(files, await collect(join(assets, "templates"), ".vibe-kit/templates"));
  if (spec.agents.includes("claude-code")) files["CLAUDE.md"] = "@AGENTS.md\n";
  if (spec.agents.includes("cursor"))
    files[".cursor/rules/project.mdc"] =
      "---\ndescription: Project instructions\nalwaysApply: true\n---\nRead AGENTS.md in the project root.\n";
  const urls: Record<ProjectSpec["mcp"]["servers"][number], string> = {
    supabase:
      "https://mcp.supabase.com/mcp?project_ref=" +
      (spec.mcp.supabaseProjectRef ?? "") +
      "&read_only=true",
    render: "https://mcp.render.com/mcp",
    vercel: "https://mcp.vercel.com",
    supermemory: "https://mcp.supermemory.ai/mcp",
  };
  const entries = spec.mcp.servers.map((id) => [id, urls[id]] as const);
  if (spec.agents.includes("claude-code") && entries.length)
    files[".mcp.json"] = `${JSON.stringify(
      { mcpServers: Object.fromEntries(entries.map(([id, url]) => [id, { type: "http", url }])) },
      null,
      2,
    )}\n`;
  if (spec.agents.includes("codex") && entries.length)
    files[".codex/config.toml"] = entries
      .map(([id, url]) => `[mcp_servers.${id}]\nurl = ${JSON.stringify(url)}\n`)
      .join("\n");
  if (spec.agents.includes("cursor") && entries.length)
    files[".cursor/mcp.json"] = `${JSON.stringify(
      { mcpServers: Object.fromEntries(entries.map(([id, url]) => [id, { url }])) },
      null,
      2,
    )}\n`;
  if (spec.agents.includes("opencode"))
    files["opencode.json"] = `${JSON.stringify(
      {
        $schema: "https://opencode.ai/config.json",
        ...(entries.length
          ? {
              mcp: {
                servers: Object.fromEntries(
                  entries.map(([id, url]) => [id, { type: "remote", url }]),
                ),
              },
            }
          : {}),
      },
      null,
      2,
    )}\n`;
  return files;
}
