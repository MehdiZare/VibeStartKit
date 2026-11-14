# VibeStartKit contributor instructions

This file is the single source for project instructions. Do not duplicate it in CLAUDE.md.

VibeStartKit is a TypeScript/Node CLI with two presets: Next.js + Supabase web SaaS, and that stack plus Temporal with Render/Vercel configuration. Python remains available for relevant projects and the existing offline exercise.

Keep the user's existing coding agent as the primary interface. The engine owns schema validation, recipe compatibility, reproducible plans, selected installations and evidence. It must not require an LLM account or turn agent calls into blocking terminal menus.

Keep core, CLI, recipes and client adapters separate. Route additional transports through the same core. Resolve current compatible stable dependencies for a new plan, record exact versions, and reject unsupported combinations explicitly. Verify new dependencies/actions against their official sources and commit the lockfile.

Planning previews changes. Apply works in a new destination, preserves conflicts, rejects destination symlinks and resumes only its own plan. Keep every tool installation in the selected plan. Authentication, cloud provisioning, deployments and paid inference remain explicit tasks with separate evidence.

Keep AGENTS.md as the generated project's maintained instruction source. Client discovery files can point to it. Do not duplicate policy into CLAUDE.md. Copy the portable skills with their supporting files and the chosen client paths.

Before a ready PR, run pnpm check, the legacy exercise tests with Python 3.12+, and python3 tools/check_content.py. Changes to generated applications also need the generated-project smoke check. A rendered template snapshot does not prove that its packages install, its hooks activate or its app builds.

Keep provider/client compatibility version-aware. Current OpenCode V2 uses @opencode/cli and mcp.servers; the older opencode-ai format is a different adapter contract. Check current commands before using account services.

Public documentation must separate generated files, installed tools, local checks, authenticated connections and live acceptance. Do not invent benchmarks, adoption, production outcomes or unperformed compatibility tests. Keep credentials, private local paths, account/resource IDs and private memory namespaces out of public examples.

Keep social drafts outside this repository. Open ready PRs for maintainer review; do not change repository settings or publish packages.

The project is MIT-licensed and independent. Every page under docs/ and the README links DISCLOSURES.md; tools/check_content.py enforces it. When you name a new third-party tool or service, add it with its official link to the DISCLOSURES.md table, and never add affiliate, referral or tracking links. Describe tools as the author's preferences, not endorsements, and date any price you quote.
