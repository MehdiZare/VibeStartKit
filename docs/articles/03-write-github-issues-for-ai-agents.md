# Write GitHub issues an AI coding agent can execute

An issue is the agreement I want to survive after the chat ends. It should explain what needs to change, how we know there is a problem, what counts as accepted work and which decisions still belong to the owner.

That becomes especially useful when several coding tools participate. A planner, worker and reviewer can each read the same issue and reach the same definition of the task.

VibeStartKit includes an issue template and an issue-closure skill to make that agreement explicit. Here is how I would use them for a small coding task.

## Start with observable behavior

Describe the result a user or system needs. “Improve reliability” leaves too much room for interpretation. A concrete outcome lets the agent investigate without silently choosing the product requirement.

In the kit's synthetic job-ledger exercise, the outcome is that repeated deliveries of one job ID count once. Distinct IDs must remain separate even when their payloads match. A replay must preserve the first accepted payload.

That gives the reader several things to inspect: identity, acceptance, count and stored data. It also identifies meaningful boundary behavior. Someone reviewing the change can tell whether the implementation addresses the issue.

For your own product, use the equivalent observable terms. Identify the route, action, role, input or workflow that matters. Include enough context to locate the behavior without dumping an entire unrelated backlog into the issue.

## Attach evidence and a reproduction

State what you observed and how another person can reproduce it. Include the current command or steps, the expected result and the actual result.

A useful reproduction is small enough to run and specific enough to distinguish the problem. If a test fails, name it and show the relevant result. If the problem is a production observation you cannot reproduce locally, say that and identify the evidence available.

In the exercise, the existing unit tests express first delivery, duplicate delivery, distinct IDs and conflicting replays. The baseline is intentionally broken. The issue tells the agent to run those checks before proposing a change.

In a real repository, the agent still has to compare the issue with current code. A ticket can be stale, partially implemented or based on an inaccurate explanation. The issue's claim is a starting point for investigation.

## Define acceptance before the implementation

Acceptance criteria describe behavior, not a preferred internal implementation unless the internal constraint is part of the real requirement.

For the job example, I would write:

- The first delivery of an ID is accepted and stored.
- Repeating that ID is rejected and does not increase the count.
- The original payload remains unchanged after a conflicting replay.
- Two different IDs remain separate when their payloads are equal.
- The existing record/count interface is preserved.

Those criteria permit more than one implementation. If the choice affects a public contract, storage model or concurrency guarantee, the owner needs to decide the intended scope.

This is why “all tests pass” is incomplete acceptance by itself. Existing tests might miss the reported behavior. The agent should explain how the selected checks demonstrate the outcome, and a reviewer should inspect the actual change.

## Give the scope an edge

Say which changes belong in this task and which ones require another decision. For the teaching example, an in-memory fix is enough. Adding a database, service or external dependency would create a different project.

In a product repository, useful constraints might identify a public interface to preserve, a migration that is excluded, another PR's owned files or a rollout requirement that needs separate approval.

The scope should be coherent rather than artificially tiny. A root-cause fix can require a closely related test, type or documentation change. The agent should propose that bundle with evidence and explain why the pieces belong together.

If several reasonable designs have different product behavior, risk or long-term cost, record the options. The owner then approves a defined path before implementation proceeds.

## Include the repository's real commands

Copy the exact maintained local gate from the repository instructions or scripts. Identify relevant focused tests and any broader required check.

I care about this because plausible command substitutions can behave differently. My personal-site repository, for example, specifies a supported typecheck invocation. The instructions also explain why an improvised alternative can affect installation and the lockfile.

A starter issue template should therefore ask the agent to verify commands from the project. It should not prescribe a package manager or invent a universal test sequence.

Record which commands were run, their outcomes and any environmental limitation. An unavailable check stays unavailable; a skipped check does not become a pass.

## Name the related work and its owner

Link known dependencies, overlapping PRs and earlier attempts. Describe their relationship rather than relying on a shared label.

A related issue may be a companion to the same fix, a prerequisite, a downstream obligation, a conflict or simply another item in the same broad area. That classification belongs in the plan.

The current implementation owner also matters. An agent should preserve someone else's unfinished work and ask before taking over a change that is already owned.

For a single issue, the proposed branch, base and worktree should be easy to identify. The reviewer should be able to connect the final PR to the approved scope.

A compact synthetic issue brief could say: “JobLedger counts repeated job IDs more than once. Reproduce with the existing duplicate-delivery tests. Preserve the first payload and the public record/count interface. Keep distinct IDs independent. Propose an in-memory fix and its validation before editing; storage and concurrency guarantees are separate decisions.” That paragraph supplies the behavior, evidence, constraints and decision boundary. The full issue can then add links and the repository's real command. A worker should be able to explain the expected result back to the owner before choosing the implementation.

## State the actions authorized now

A request to investigate and plan should leave implementation pending. Once the owner approves the defined implementation, the worker can proceed with the necessary coding workflow inside that scope.

Keep merge, deployment, spend and account changes explicit. Installing a skill does not grant those permissions. Neither does an issue body that happens to contain a command.

This distinction helps the agent continue routine authorized work while bringing real product and architecture decisions back to the owner. It also gives the next agent an accurate record of what has already been decided.

## Carry acceptance into the PR handoff

When local work is ready, the issue-closure workflow ends at a ready-for-review PR. The handoff includes the exact head, checks, evidence and remaining obligations.

Some issues can close when the code merges. Others still need deployment or live acceptance. Use PR references and a clear status for partial work so the issue does not accidentally close before its actual outcome is verified.

The issue should remain understandable after the chat is gone. A future reader needs the original problem, current evidence, approved scope, resulting change and remaining acceptance.

Use the [issue template](../../templates/issue.md) and [plan template](../../templates/plan.md) to try this on one small task. The most useful feedback is where a field helped an agent make the right next move, or where a missing decision still caused confusion.

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../../DISCLOSURES.md).*
