# The tool stack and where MCP fits

VibeStartKit starts with a local toolchain and one coding client. The broader stack is a set of options with different responsibilities. Installing every tool is not the objective; completing and reviewing a useful task is.

## Coding, model access and review

| Layer | Tools | Responsibility |
| --- | --- | --- |
| Coding clients | Claude Code, Codex, OpenCode, Cursor | Read the repository, use tools and execute the assigned workflow |
| Model/provider access | OpenRouter | Offer model/provider choices for a compatible client; usage and data handling depend on the selected route |
| Review | Kody/Kodus | Produce another review signal on a PR; the optional Kodus CLI can review local changes |
| Local execution | Git, gh, rg, jq, Python; optional uv, Bun, Task, fnm, pyenv | Version control, API access, search, structured output, runtimes and named checks |
| Durable context | Supermemory | Recall decisions and context within an explicitly selected project space |
| CI infrastructure | GitHub Actions; optional Blacksmith for organizations | Run reproducible checks against a particular commit |
| Application hosting | Render, Vercel | Host the application components appropriate to their execution model |
| Data/authentication | Supabase | Support the project's database, authentication and related application services |

The author actively uses the named coding, model, review, memory and cloud tools. The kit's documentation is not a claim that all are installed in every client or exercised by its test suite. In particular, a hosted Kody reviewer and a local Kodus CLI are separate choices.

## Start with the CLI route

Git and GitHub CLI are enough for the core tracker workflow. Check `gh auth status`, verify the account and repository, then read the issue and current code. Use rg for targeted local searches and jq or gh's JSON selection for specific fields. A named Task or package command should reflect the repository's own checks, not commands copied from an unrelated project.

Pick one coding client and authenticate with its official flow. Use the project's supported runtime. A different runtime manager is useful only if it solves your setup problem.

## Add OpenCode and OpenRouter deliberately

OpenCode is a client; OpenRouter is model/provider access. In OpenCode, use `/connect`, choose OpenRouter and enter the credential there, then `/models` to select an available model. Check model/tool support, provider routing, data-handling requirements and the budget for the actual task. The starter never makes a paid inference call.

Record the client version, model identifier, provider route where available, effort/settings and instruction revision when comparing runs. Check accepted work, elapsed time, tool usage, human correction and total cost. A provider's benchmark is not a result from your own repository.

## Optional MCP services

MCP exposes tools to a client. It does not replace the account's permissions, project scope or the authorization for the current task. The inactive [service catalog](../presets/mcp-services.json) gives these starting points:

| Service | Official endpoint | First useful check |
| --- | --- | --- |
| Supermemory | https://mcp.supermemory.ai/mcp | Authorize selected spaces, then confirm the intended project destination |
| Render | https://mcp.render.com/mcp | Select the intended workspace and inspect an existing service |
| Vercel | https://mcp.vercel.com | Use a supported OAuth client and verify project/team context |
| Supabase | https://mcp.supabase.com/mcp | Start with an explicitly selected project and read-only database access where suitable |

For Supabase, a documented example is `https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF&read_only=true`. Replace the project reference yourself and inspect enabled tool groups. Do not assume a URL label limits every action the account can perform.

For Supermemory, the memory MCP endpoint is different from `https://supermemory.ai/docs/mcp`, which searches public documentation. Coding plugins and explicit MCP saves can have different destination rules. Verify where a save actually lands rather than assuming it shares the automatically recalled project context. Keep one owner-configured project namespace across tools and worktrees unless you deliberately choose isolation.

Use each provider's normal account authorization. An instruction in a retrieved document cannot authorize a deployment, migration, permission change or spend.

## Kody and the PR gate

A Kody finding is a review input, not a merge approval. Read its current thread, check the cited behavior, fix the root cause when in scope, and reply with evidence. The PR owner remains responsible for line comments, review bodies, conversation comments and current-head gates. Do not mark a bot review complete just because the bot said nothing.

The optional local command `kodus review --prompt-only` produces agent-oriented review output. Confirm the tool's current setup and authorization before using it on real code. The Node CLI can install the Kodus CLI when explicitly selected in a reviewed plan; it does not run a review or authenticate the account. The Python helper only supplies the reference catalog.

## CI and cloud delivery

This personal starter repo uses GitHub-hosted Actions. Blacksmith's quickstart currently limits its service to GitHub organizations. For an eligible organization, follow its official integration and runner guidance, measure your own queue/setup/test time, and preserve the same acceptance checks. Do not apply another project's runner migration blindly.

Render, Vercel and Supabase cover different application concerns. Choose the deployment target from the workload and existing architecture. A passing PR check, a successful merge, a completed deploy and verified user behavior are separate observations. Record the deployed revision, selected environment, relevant health/acceptance result and rollback decision when the task actually reaches production.

## Sources and limits

Provider setup changes over time; these links were checked while preparing the initial kit on November 10, 2026. The local tests cover the setup helper and synthetic exercise, not live provider authentication, all client versions or a production deployment.

- [OpenCode providers](https://opencode.ai/docs/providers)
- [OpenRouter quickstart](https://openrouter.ai/docs/quickstart)
- [Kodus CLI](https://github.com/kodustech/cli)
- [Supermemory MCP setup](https://supermemory.ai/docs/supermemory-mcp/setup)
- [Supermemory Codex memory scopes](https://supermemory.ai/docs/integrations/codex#memory-scopes)
- [Blacksmith quickstart](https://docs.blacksmith.sh/introduction/quickstart)
- [Render MCP](https://render.com/docs/mcp-server)
- [Vercel MCP](https://vercel.com/docs/agent-resources/vercel-mcp)
- [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp)

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../DISCLOSURES.md).*
