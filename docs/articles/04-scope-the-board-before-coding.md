# Review the GitHub board before an agent expands the task

A single issue rarely contains every fact needed to plan a useful change. Related work can explain the root cause, establish an existing decision or reveal that another agent already owns part of the implementation.

That is why my issue-closure workflow includes a board and concurrent-work review before coding. The goal is to propose one coherent change with a scope the owner can assess.

This is a workflow convention in VibeStartKit. It helps make decisions visible; it does not give an agent permission to absorb every nearby issue.

## Begin with the verified problem

Read the primary issue, its full comments, linked PRs and acceptance criteria. Then inspect the current default-branch code and relevant tests.

Separate what the ticket says from what the code demonstrates. A closed issue is not proof that the application behaves correctly. An open issue is not proof that the fix is missing.

If the behavior is already implemented, show the relevant code or live evidence and propose the next disposition. Reimplementing an existing fix adds review work while making the historical record harder to follow.

If the issue and current behavior disagree about intent, identify that disagreement before choosing a design. Existing behavior can be a bug; it is not automatically the contract to preserve.

## Search by the behavior, not only the title

Use the affected interface, module, error, flag, schema, user action and milestone to look for related issues and PRs. Review recent closed work as well as the current open list.

A large board needs several relevant searches. A capped first page is a slice of the board, so keep the search limits visible.

Local state contributes different evidence. Check existing branches and worktrees, active PR file sets and any maintained current-work record. A board status cannot reveal a worker's uncommitted files.

Preserve that work. Do not stash, discard or overwrite an unrelated change just because the new task touches the same area. Ownership and current implementation state are part of the planning input.

## Classify each candidate's relationship

The skill uses a small vocabulary: companion, blocker, blocked-by, conflict, duplicate and topic-only noise. An item can have more than one relationship.

Consider a synthetic extension of the job-ledger exercise. One issue reports duplicate deliveries inflating counts. Another reports the first payload being replaced on replay. Those may be companions if investigation shows a shared acceptance path.

An unrelated request for a new dashboard may share the word “jobs” while belonging to a separate product decision. A pending public-interface change may be a blocker or conflict even if it modifies different files.

The classification needs code or PR evidence. It should explain why the relationship changes the proposed scope, sequence or acceptance obligation.

## Build a findings table the owner can use

The table should contain the related item, relationship, supporting evidence and proposed disposition.

“Include” should mean the work belongs in this coherent change. “Separate” should explain the new boundary, cost or owner decision. “Exclude” should identify topic-only relevance or another reason it does not belong.

The table is useful because it exposes the bundle before implementation. The owner can see whether a small necessary test is included or a much larger redesign has quietly appeared.

It also gives the next worker a record of the search. An excluded item should not later re-enter the implementation merely because another agent rediscovers it without the earlier reasoning.

## Compare bundling and separation honestly

Bundling can make a root-cause change easier to verify when the affected behaviors depend on the same contract. A single PR can carry the implementation, regression check, type and documentation that must agree.

Separation can protect reviewability when the extra work introduces product behavior, migration/backfill operations, infrastructure or a different owner. It also lets a prerequisite land before a dependent change is refreshed.

Both approaches have costs. A bundle can become hard to review; a split can create temporary incompatibility or assumptions about merge order.

Present those tradeoffs with a recommendation and the actual decision needed. The owner should not discover the architecture choice only after a large diff already exists.

## Resolve sequencing and ownership

For related PRs, identify dependencies in behavior and contracts as well as shared files. A clean Git merge can still combine incompatible assumptions.

If a child depends on a parent, the handoff should say so. After the parent changes or merges, refresh the dependent and re-check the affected behavior. Evidence from the earlier stack is not automatically current.

Give each implementation a clear owner and a valid isolated worktree. Reuse an existing appropriate worktree rather than creating duplicates for the same branch.

When ownership is unclear, preserve the current artifacts and ask for direction. The useful outcome is a clear boundary, not maximum parallel activity.

For the synthetic ledger, the recommendation might bundle duplicate counting and conflicting replay handling because both depend on the same job-identity contract. A request for persistence would be separate: it adds a storage choice, failure behavior and operational acceptance. A dashboard change would remain excluded from this fix even if it displays the same count. That recommendation is useful only after checking the actual code. The owner can then approve the coherent behavior change while leaving the new storage and interface work for their own decisions.

## Get approval for the defined scope

The proposed plan should connect the root cause, included work, acceptance criteria, affected contracts, exact checks and rollout implications. Record unresolved choices with options and risks.

The issue-closure skill requires approval before coding unless that defined plan was already approved or the user explicitly directed its immediate implementation. It also says not to ask again for settled decisions.

While an answer is pending, continue independent investigation or already-authorized work. A delayed answer does not approve a default, and a new observation should reopen only the decision it materially changes.

For an implementation workflow, the agreed plan belongs on the primary issue so the next agent and reviewer can find it. A request for a plan alone does not authorize posting it elsewhere.

## Keep the final scope connected to evidence

During implementation, new facts may change the plan. Report newly discovered adjacent work before folding it in. Explain whether it is a necessary part of the existing root-cause fix or a new decision.

At the ready-PR handoff, map each included issue to the change and validation that address it. Record deferred obligations with an accurate reason and an authorized follow-up when one exists.

Keep deployment and live acceptance visible. A companion issue might require an application check after the code is merged, so a closing keyword can be premature even when the local change is correct.

## Try the review on a small cluster

Choose a primary issue and a few plausible related items. Ask the agent for a findings table and scope recommendation, then verify the evidence yourself.

The value is in the decisions the table supports: which behavior is actually broken, which items share the fix, which owner needs to decide and what must happen first.

VibeStartKit's [plan template](../../templates/plan.md) and [issue-closure skill](../../skills/issue-closure/SKILL.md) provide the structure. A strong feedback report includes a redacted example where the classification improved the plan, or where the proposed bundle still needed a clearer boundary.

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../../DISCLOSURES.md).*
