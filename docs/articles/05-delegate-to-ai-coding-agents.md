# Delegate coding work with a brief the next agent can verify

I use Claude Code to coordinate work that can involve Codex, OpenCode and Cursor. The useful part of that arrangement is a clear assignment and a result another agent can inspect.

A delegation brief needs to carry the same agreement as the issue: outcome, scope, ownership, acceptance and the decisions that remain with the owner. Without that, each participant can optimize for a different interpretation of the task.

VibeStartKit includes a handoff template and portable skills for the issue-to-PR lifecycle. Here is the delegation pattern I want those materials to make repeatable.

## Give each role a concrete responsibility

A planner investigates the problem and proposes a coherent change. A worker implements the approved scope. A reviewer checks the result and owns the review process within the authorization given.

Those roles can be performed by different clients or by different sessions in one client. The names of the models are less useful than knowing what each role is allowed to change and how its result will be evaluated.

For a small task, one implementation owner is often sufficient. Additional agents can inspect a separate question or independently review evidence. Parallel activity becomes useful when the tasks can stay independent and their outputs have an explicit integration point.

The coordinator remains responsible for reading those outputs and resolving the next action. Starting an agent is the beginning of a delegated task, not evidence that the assignment succeeded.

## Write the brief before launching the worker

The brief should name the exact repository and issue or PR, the current branch/base and the owned workspace. It should state the approved outcome and the relevant facts already established.

Then name the allowed changes. If the assignment is an investigation, say that implementation is pending. If a scope was approved, include the decision and the actions it authorizes.

Add the acceptance check and required evidence. A worker should know which command demonstrates the behavior and what limitation it must disclose if that check cannot run.

Finally, define stopping conditions. A product choice, an unexpected migration or an overlap with another owner's work can require a decision. Routine work inside the approved scope should continue without asking the same question again.

## Use a file the next session can read

Markdown is useful because the brief can live beside the work, be reviewed in a diff and be read by another client. The structure matters more than the file extension.

For example, a worker brief for the synthetic job ledger would identify the in-memory duplicate-delivery behavior, preserve the record/count interface, require the existing behavioral tests and exclude a new service or dependency.

The worker's closing handoff should update the same facts with what actually happened. Which files changed? Which command ran? What passed? What remains unverified? Which revision does the evidence describe?

Avoid carrying an old conclusion forward as if it were an instruction. The next agent needs to distinguish a verified fact, a proposal and an owner decision.

Here is a short brief for the exercise: “Owner: the assigned worker. Outcome: a repeated job ID is accepted once, preserving the first payload. Allowed change: the existing in-memory implementation and a necessary behavioral check. Evidence: run the maintained test command and inspect the resulting diff. Stop for a new storage requirement or a public-interface change. Return the exact revision, command result and remaining limits.” A real assignment also includes its repository and issue URL. This is small enough to read before launching a client and specific enough to assess afterward.

## Use planning modes for investigation

The command shapes below were checked against the installed clients' help while preparing this kit. They illustrate how a planning assignment can be started after the project and account are selected.

```sh
claude --permission-mode plan -p "Read handoff.md and investigate the issue. Return findings and a proposed scope."
codex exec --sandbox read-only - < handoff.md
cursor-agent --mode plan -p "Read handoff.md and return an investigation and plan."
```

These examples are not agent-task benchmark runs. Client versions, workspace trust, project configuration and account/provider settings still matter.

Use the supported permission and planning controls appropriate to the role. An instruction to “only investigate” is useful task guidance, but the client controls the tools and permissions that actually apply.

## Pass the brief to OpenCode explicitly

OpenCode's installed run command accepts a file attachment. A corresponding invocation is:

```sh
opencode run --file handoff.md "Investigate this assignment and return a plan. Do not implement."
```

Confirm the selected agent, model/provider and permission configuration before running it. The file supplies context; it does not establish a read-only permission boundary by itself.

When using OpenRouter through OpenCode, choose the model in the client and record it with the task. A different provider or model can change cost and behavior, so keep that configuration visible in comparisons.

The starter setup never launches these model calls. Readers choose when to run an assignment and what budget or account they use.

## Keep implementation ownership explicit

Once the owner approves the defined scope, the worker can implement in its own valid worktree. The assignment should identify which branch and files it owns and how related work will be integrated.

Two agents editing the same working tree can interfere even when their prompts sound independent. Shared test fixtures, generated files, migrations or package metadata can also create overlap beyond the files named in the brief.

Inspect the actual boundaries before parallelizing. A read-only investigation and a separately owned implementation can coexist more easily than two workers choosing competing designs for the same contract.

When the boundary changes, update the brief and the ownership record. Preserve pre-existing changes rather than making the workspace look clean by discarding them.

## Evaluate the returned result

Read the diff and acceptance evidence. A confident summary can omit an unexpected edit, an unrun check or a decision the worker made without approval.

For an implementation, verify the exact remote head associated with the handoff. For an investigation, check the cited code or source. For a review, confirm that findings relate to actual behavior and the current change.

I would compare planner, worker and reviewer performance separately before changing a model assignment. Useful measures include accepted work, corrections, elapsed time, tool usage and the full cost of delegated calls.

A strong result in one role does not establish the reliability of the other roles or the whole workflow.

## Close the loop on the original issue

The coordinator should reconcile the worker's output with the approved plan and the issue's remaining obligations. The ready-PR handoff then moves review ownership to pr-ownership.

The handoff includes repository, issue/PR, branch/base, exact head SHA, owned worktree, commands/results, owner decisions and any deployment/live acceptance still required.

That makes the next step inspectable. It also helps another session resume without asking the owner to reconstruct the conversation.

Try the [handoff template](../../templates/handoff.md) on one narrow task. The useful feedback is whether another client could find the facts, check the result and identify the next decision from that brief alone.

Sources for current command and client behavior: [Claude Code documentation](https://code.claude.com/docs/en/overview), [Codex CLI](https://developers.openai.com/codex/cli/), [OpenCode CLI](https://opencode.ai/docs/cli/), [Cursor CLI](https://cursor.com/docs/cli/overview). Command help was inspected; no live multi-client execution benchmark is claimed.

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../../DISCLOSURES.md).*
