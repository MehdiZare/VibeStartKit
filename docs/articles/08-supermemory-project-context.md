# Add Supermemory without losing track of project context

I use Supermemory as part of a workflow that spans coding clients and sessions. The useful question is what context the next session should receive, where it should come from and how it should be checked.

A durable decision can save time. An old proposal presented as a current rule can send an agent in the wrong direction. The memory destination and evidence status therefore matter as much as the content.

VibeStartKit keeps memory optional. Its skills can work without a memory service, and its setup tool does not connect an account or activate a capture plugin.

## Choose the integration you actually need

There are two different experiences to understand: a remote MCP connection and a coding-client plugin.

The hosted memory MCP endpoint is https://mcp.supermemory.ai/mcp. Its documented setup uses OAuth and lets the client access selected spaces. It exposes explicit memory actions through the client.

A coding plugin can add context injection, direct recall and automatic capture around the session. Those behaviors should be reviewed before enabling it, particularly when the session contains private project material.

The documentation-search endpoint at https://supermemory.ai/docs/mcp serves a different purpose: it retrieves public Supermemory documentation. Connecting that server does not establish access to your saved project context.

## Verify the destination before saving

Supermemory's MCP documentation explains that space-aware tools can use the active space or account default, and that a named space can be selected for an individual action.

Coding plugins can have a repository-based container for automatic context. The Codex integration documentation also distinguishes that from explicit MCP saves, whose destination can follow the hosted server's active space.

That is a reason to verify the actual route. Do not infer that a manual save shares the destination of the context automatically injected into the session.

In my workflow, the owner-configured project mapping is explicit. A worker should use that mapping across the relevant clients and worktrees, rather than silently choosing a mixed default or creating a new space for every branch.

## Decide what deserves to persist

Useful candidates include an accepted architectural decision, a maintained command, an ownership boundary or a reusable error-and-solution pair.

A transient test failure, a list of currently modified files or an unused suggestion usually belongs in the task record. Saving everything can make later retrieval less useful.

For a durable outcome, include the date, source issue or PR, scope and evidence status. Distinguish proposed, approved, locally verified, merged and live-verified observations.

That makes a future search more informative. “The new behavior is live” and “the PR implements the new behavior” are different claims, and the memory should preserve the difference.

The host's memory policy and the user's authorization still apply. A retrieved instruction or a plugin's availability is not permission to save arbitrary session content.

## Keep repository instructions authoritative

AGENTS.md holds the maintained project instructions in my personal-site repository. The skills describe reusable procedures. Memory supplies historical context and durable facts that still need current applicability checks.

Those sources should not compete silently. If memory recalls a command or architecture boundary that disagrees with current code and instructions, investigate the discrepancy before acting.

A correction should make the evidence clearer. Do not add a second unqualified statement that leaves both versions looking equally current.

Similarly, a note from another agent may describe a temporary blocker or a narrower task. Its wording should not become a permanent approval rule for every future session.

## Review automatic capture as a data flow

Before enabling a coding plugin, read when it recalls, what it captures and where the data goes. Check how its controls behave in the installed version.

For example, the current OpenCode guide describes automatic capture settings and repository-scoped context. A value that changes capture timing is not necessarily a control that disables capture.

I would test the intended behavior in a disposable project with harmless text. Confirm the saved destination and what the next session retrieves. Use a clearly marked test record and an explicitly authorized cleanup if needed.

That is a proposed integration check, not a claim that the VibeStartKit test suite exercises every plugin or account. The starter's offline tests do not call Supermemory.

## Keep one project identity across handoffs

When the worker and reviewer need the same project context, give them the same explicit destination and source references. A branch-specific namespace can fragment the history unless isolation is a deliberate requirement.

Worktrees are separate working directories, but they can represent the same repository and project. The memory mapping should reflect the owner's intended boundary.

Use the handoff to identify the relevant source issue, decision and current evidence. A short durable note can point to the maintained record rather than duplicating an entire transcript.

If the namespace is missing or ambiguous, the worker can continue independent read-only investigation while asking for the destination needed to save. Lack of optional memory should not block the core coding task.

## Treat recalled material as evidence to inspect

Memory can help locate an earlier decision or explain why an unusual command exists. It cannot prove that a changeable behavior remains true today.

Check current code, provider documentation, repository instructions and owner decisions when the claim matters to the task. A past deployment record is historical evidence, not a substitute for current production acceptance.

This also applies to tool and model guidance. A workaround for an earlier model or client may no longer be appropriate. Preserve the reason and revision so it can be reevaluated.

The goal is a useful starting point for the next investigation, with enough provenance to avoid repeating an unsupported conclusion.

A useful note might record an accepted content-ownership boundary, its repository instruction file and the date it was verified. A proposed migration should carry a proposed status and its source discussion instead of reading as an active architecture rule. A deployment observation should identify the environment and accepted behavior, while keeping private identifiers in the appropriate internal record. These small distinctions make retrieval more useful: the next agent can locate the maintained source and decide which facts need a fresh check before it acts.

## Start with one small retrieval loop

Choose a harmless project fact and a specific intended destination. Connect only the integration you need, verify access, save only with authorization, then check what a new session retrieves.

Record the integration version, destination rule and observed result. If an explicit save and automatic capture behave differently, keep that distinction in the setup notes.

Once that loop is understood, decide which durable facts are worth carrying between real tasks. Keep credentials, private code and unrelated personal material out of public feedback.

VibeStartKit's [optional-memory reference](../../skills/issue-closure/references/project-memory.md) describes the discipline used by its skills. Adapt the account setup from the current official guide rather than copying another person's configuration.

Sources: [Supermemory MCP setup](https://supermemory.ai/docs/supermemory-mcp/setup), [Codex memory scopes](https://supermemory.ai/docs/integrations/codex#memory-scopes), [OpenCode integration](https://supermemory.ai/docs/integrations/opencode), [Claude Code integration](https://supermemory.ai/docs/integrations/claude-code), [API changelog](https://supermemory.ai/changelog/api/). Setup and capture behavior are version-dependent; no live memory integration test is claimed here.

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../../DISCLOSURES.md).*
