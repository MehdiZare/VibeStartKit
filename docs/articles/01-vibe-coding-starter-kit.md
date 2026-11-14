# Vibe coding starter kit: what I want in place before the first feature

I want a new AI-assisted project to start with a few things I can understand and reuse: a coding client, a clear task, the right local commands, a way to review the result, and a record that survives the conversation.

That is why I am building VibeStartKit. It packages the setup and workflow I want around vibe coding, with tools readers can try and instructions they can inspect.

My current work spans Claude Code, Codex, OpenCode and Cursor. I also use Kody, OpenRouter, Supermemory and a cloud stack that includes Blacksmith, Render, Vercel and Supabase. Those tools have different responsibilities. A useful starter should explain those responsibilities and let someone adopt the smallest useful combination.

## Give the first session a concrete outcome

The first experience with a starter kit should end in something observable. In this kit, that is a new project your coding agent creates with you: you describe what you want, the agent collects the remaining choices, the CLI shows a plan with exact versions and files, and after you approve it the project is generated, installed and checked. The web homepage and health route run before you connect any account.

For a first session without any accounts at all, there is also an optional offline exercise with a reproducible bug. You run a command, see the failing behavior, investigate it, propose a change and check the result.

The exercise concerns a small in-memory job ledger. A repeated delivery is currently added again. The expected behavior is precise: accept the first job ID, reject subsequent deliveries of that ID, preserve the original payload and count distinct jobs independently.

It is a teaching example. It does not claim production durability, concurrency safety or exactly-once processing. Those limits make it useful: a reader can practise a complete local change without setting up cloud infrastructure or pretending the small sample is an entire distributed system.

The project setup needs Node 24.11 or newer; the exercise needs Python 3.12 or newer. Neither makes a model call or needs an account or API key for its first run. When a reader wants an agent to help, they can add the client and provider they choose.

## Separate the jobs the tools do

A coding client is where the agent reads files and uses tools. A model/provider layer affects which model runs the task. A reviewer supplies findings to investigate. A memory service carries durable context. CI executes checks against a commit. Hosting and data services run the application after the code is ready.

I find this separation useful when a result goes wrong. If a task stops halfway through, changing the model might be relevant. So might an ambiguous instruction, a missing permission, a broken command or a handoff that omitted the acceptance check.

VibeStartKit therefore includes a tool catalog and an MCP service catalog that stay inactive until a project selects them. The CLI's plan lists each selected installation, and verify checks what was actually installed. It does not turn a found executable into a claim that authentication works, a provider is configured or a deployment is healthy.

The first adoption decision is simple: choose one coding client and get one small workflow working. Other components can earn their place as a concrete need appears.

## Make the issue carry the agreement

GitHub Issues are where I want the durable task agreement to live. A useful issue explains the outcome, current evidence, acceptance criteria, exclusions and owner decisions.

The investigation can change the plan. The issue may describe a symptom whose cause is elsewhere. Related work may already address part of it. Another agent may own an overlapping PR. Those facts should affect the scope before someone starts editing.

My issue-closure skill covers that transition from issue to ready PR. It asks the agent to compare the ticket with current code, inspect related work and present the coherent change it proposes.

The owner then has something concrete to approve. Implementation proceeds within that agreement. A planning request stays a planning request; an unresolved product or architecture decision remains an owner decision.

This is also where I want the exact existing validation commands. A repo-specific command can contain important assumptions that a plausible replacement misses. In my personal-site repository, for example, the instructions specify the supported typecheck command and identify which content belongs in the repo versus the CMS.

## Delegate with an explicit handoff

I have shared how I use Claude Code to dispatch work to Codex, OpenCode and Cursor. A starter kit for that style of work needs more than a list of agent names.

Every delegated assignment needs an outcome, permitted scope, acceptance check, owner and stopping condition. The next agent also needs the current result: which files changed, which command ran, what passed, what failed and which decision is still pending.

The supplied handoff template makes those fields visible. For a PR, it includes the exact remote head SHA and the owned worktree. That connects the evidence to a specific change rather than an ambiguous phrase such as “the latest version.”

More parallel work can add coordination cost. I would split independent investigations or clearly separate changes when ownership is explicit. I would keep overlapping implementation under one owner until the boundary is resolved.

## Give review its own owner

A ready PR is a useful boundary. The implementation is available for review, but the work still needs someone responsible for the review process.

That is the job of pr-ownership. It follows the PR through findings, comment replies, current-head checks and an authorized merge. It distinguishes line comments, review bodies and conversation comments, because reading only one surface can miss an important request.

Kody can contribute a valuable finding. So can another reviewer or a coding agent. The owner still needs to verify the concern, address the root cause when appropriate and leave evidence on the relevant thread.

The same discipline applies to merge readiness. A passing result from an older commit does not establish that the current commit is ready. An unanswered owner decision is still unanswered after another push.

## Keep delivery and acceptance visible

Some issues are satisfied by a merged code change. Others require a deployment, a migration, a natural scheduled run or a user-visible acceptance check.

Those obligations belong in the issue and PR handoff. I want a reader to be able to tell whether work is proposed, implemented, locally checked, merged, deployed or verified in the application.

Render, Vercel and Supabase fit into that later delivery work according to the application architecture. They are optional to the first exercise. Connecting a cloud tool should be a deliberate project choice with a defined task.

## Improve the kit through real attempts

The initial value of VibeStartKit is a repeatable starting experience: generate a project with your agent, review its plan, get portable skills and templates with it, write a better issue, hand off an exact result and review it carefully.

The local checks cover the CLI, both generated presets (fresh install, active hooks, type, test and build checks, and the local web app) and the offline exercise. They do not prove that every client, model and cloud combination works end to end.

That is why feedback matters. A useful report says which command or workflow you tried, what you expected, what happened and where the instructions stopped helping. Those reports can become scoped improvements that another reader can verify.

Start with the [getting-started guide](../getting-started.md), or inspect [issue-closure](../../skills/issue-closure/SKILL.md) and [pr-ownership](../../skills/pr-ownership/SKILL.md). The aim is to make the next useful coding session easier to start, easier to hand off and easier to assess.

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../../DISCLOSURES.md).*
