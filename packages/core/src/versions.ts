import type { ProjectSpec, Versions } from "./spec.js";
import { SetupError } from "./spec.js";

export const testedVersions: Versions = {
  pnpm: "12.18.0",
  turbo: "2.11.10",
  lefthook: "2.2.2",
  typescript: "7.0.2",
  "@types/node": "26.6.6",
  "@biomejs/biome": "2.6.6",
  next: "16.4.6",
  react: "19.3.1",
  "react-dom": "19.3.1",
  "@types/react": "19.3.0",
  "@types/react-dom": "19.3.0",
  "@supabase/supabase-js": "2.119.0",
  "@supabase/ssr": "0.12.7",
  "@temporalio/client": "1.25.0",
  "@temporalio/worker": "1.25.0",
  "@temporalio/workflow": "1.25.0",
  "@temporalio/activity": "1.25.0",
  tsx: "4.23.15",
  "@anthropic-ai/claude-code": "2.1.322",
  "@openai/codex": "0.167.0",
  "@opencode/cli": "2.2.7",
  "@kodus/cli": "0.4.22",
  supabase: "3.1.0",
  vercel: "65.14.0",
  bun: "1.4.4",
};
export const npmTools = {
  "claude-code": "@anthropic-ai/claude-code",
  codex: "@openai/codex",
  opencode: "@opencode/cli",
  kodus: "@kodus/cli",
  supabase: "supabase",
  vercel: "vercel",
  bun: "bun",
} as const;

export function requiredPackages(spec: ProjectSpec): string[] {
  return Object.keys(testedVersions).filter((name) => {
    if (name.startsWith("@temporalio/")) return spec.preset === "ai-worker";
    if (new Set<string>(Object.values(npmTools)).has(name))
      return spec.tools.some((tool) => npmTools[tool as keyof typeof npmTools] === name);
    return true;
  });
}

export function checkVersions(spec: ProjectSpec, versions: Versions): void {
  for (const name of requiredPackages(spec)) {
    if (!/^\d+\.\d+\.\d+$/.test(versions[name] ?? ""))
      throw new SetupError("invalid_version", "Missing exact stable package version.", {
        package: name,
      });
  }
  if (!versions.next?.startsWith("16.") || !versions.react?.startsWith("19."))
    throw new SetupError(
      "unsupported_release",
      "This recipe currently supports Next.js 16 and React 19; update the recipe before using a new major release.",
    );
  if (spec.preset === "ai-worker") {
    const temporal = Object.entries(versions)
      .filter(([name]) => name.startsWith("@temporalio/"))
      .map(([, version]) => version);
    if (new Set(temporal).size !== 1)
      throw new SetupError(
        "incompatible_sdk",
        "Temporal SDK packages must resolve to the same release.",
      );
  }
}

export async function resolveVersions(spec: ProjectSpec, offline: boolean): Promise<Versions> {
  const packages = requiredPackages(spec);
  const values = await Promise.all(
    packages.map(async (name) => {
      if (offline) {
        const version = testedVersions[name];
        if (!version)
          throw new SetupError("missing_snapshot", "The recorded package version is missing.", {
            package: name,
          });
        return [name, version] as const;
      }
      const response = await fetch(
        `https://registry.npmjs.org/${encodeURIComponent(name)}/latest`,
        { signal: AbortSignal.timeout(20_000) },
      );
      if (!response.ok)
        throw new SetupError(
          "registry_unavailable",
          "Could not resolve the latest package release.",
          { package: name, status: response.status },
        );
      const result: unknown = await response.json();
      if (
        !result ||
        typeof result !== "object" ||
        !("version" in result) ||
        typeof result.version !== "string"
      )
        throw new SetupError("registry_response", "Registry response has no version.", {
          package: name,
        });
      return [name, result.version] as const;
    }),
  );
  const versions = Object.fromEntries(values);
  checkVersions(spec, versions);
  return versions;
}
