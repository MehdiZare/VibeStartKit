---
name: pr-ownership
description: Own assigned PRs through review, every comment reply, verified merge gates, squash merge, and safe cleanup. Use for PR ownership or review-and-merge requests; accept ready-PR handoffs from issue-closure.
---

Own every assigned PR. Review it, fold related work into the correct PR, reply inline to every comment, merge with squash auto-merge when the owner authorized merging, then remove only owned disposable artifacts. No follow-up PRs for work that belongs here.

Two hard gates, both non-negotiable:
- **Every comment gets an inline reply.** N comments in → N replies out.
- **Every non-obvious fork goes to the owner.** You never pick for them.

## Handoff and acceptance
Accept the issue-closure handoff: repository, PR, exact head, worktree, approved scope, checks, owner decisions, and remaining acceptance obligations. Verify these against current state; do not restart issue planning or reopen settled approvals. Honor a narrower review-only request.

A merge does not prove deployment or live/client acceptance. Inspect closing keywords and use references for any issue whose acceptance requires work beyond merge. Keep those obligations open and report the distinction.

For optional project memory, read [the project-memory reference](references/project-memory.md) when needed. A memory service is not required. Current code, repository instructions and owner decisions take precedence over recalled claims.

## Multi-PR
If several PRs are assigned, plan before merging.
- Identify number, repo, head, base, status for each.
- Map dependencies: stack, shared files/behavior, migrations, flags, contracts, "assumes the other landed."
- Merge dependencies first. Parallelize only if they cannot conflict or undo each other.
- Diff them together for overlap, conflicting logic, revert/weaken, incompatible migrations/APIs, CI/test order assumptions, and semantic clash even when git is clean.
- On conflict: fold the smaller related change into the earlier PR, or rebase the later one after the earlier is ready. Do not merge a dependent until its parent is merged and the dependent is refreshed and green. If coherence needs M+ work, stop, report, issue — do not force-ship.
- Re-check order after every merge.
- One valid worktree per PR. Never mix PRs in one dirty tree.

## Worktree
Assume one may already exist. Do not create until you have checked.
- Identify PR, head, base, repo. Inspect worktrees and local branches.
- Reuse a valid tree that already has this PR branch in the correct repo.
- Check modified/staged/untracked/uncommitted files. Do not overwrite, discard, stash, or edit pre-existing changes unless they belong to this PR and are safe.
- No duplicate trees for the same PR/branch. Repair or prune stale registrations safely.
- Create an isolated worktree only if none is valid.
Then fetch; confirm HEAD is the PR branch and the PR targets the expected base; review local changes; keep that PR's work only in that tree.

A worktree can be removed out from under you mid-task. Never keep the comment ledger, draft replies, or the fork list inside it — those live at an absolute path outside every worktree in a dedicated directory such as `/tmp/pr-ownership-<owner>-<repo>-<n>-<session>/`. Use that absolute directory for every ledger, reply draft, and fork list below; repository and session identity prevent collisions.

## Review
Do not treat bot silence as approval — a bot that posted nothing has reviewed nothing. Your review is still required. If CodeRabbit or another review bot is pending or rate-limited, keep watching (Comments step 6) and do not enable auto-merge until it posts or the owner waives it. When the owner says to check CodeRabbit reviews, wait for that review to land and handle its comments before merge.
Read description, linked issues, diff, CI, findings, comments, and ADRs/architecture docs in the repo. Review the full change and, if stacked, the sequence.

Check intent vs diff; behavior vs linked issue; architecture vs filed ADRs/patterns; correctness and realistic edge cases; tests per strategy below; contracts/migrations/compat/rollout; security/secrets/authz; performance/concurrency; new duplication/dead code; bitrot-prone docs; CI failures/flakes from this PR; clash with other assigned PRs.

Label each finding: fix here / fold-in if small / move to another assigned PR / owner fork / issue. Then apply scope and resolve forks before coding.

## Comments — reply to every single one
A pushed fix with no reply is unfinished work. No summary comment in place of inline replies. No silent fixes.

### 1. Enumerate before touching code
Three separate surfaces, three separate APIs. Querying one and calling it "the comments" is how whole threads get missed.

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/comments  --paginate   # line-level, threaded
gh api repos/{owner}/{repo}/pulls/{pr}/reviews   --paginate   # review bodies (approve/request-changes text)
gh api repos/{owner}/{repo}/issues/{pr}/comments --paginate   # conversation-level
```
Then GraphQL `reviewThreads(first: 100) { nodes { id isResolved path line comments(first: 50) { nodes { id databaseId body author { login } createdAt } } } }` for thread ids and resolution state. Request `pageInfo { hasNextPage endCursor }` for both `reviewThreads` and each thread's `comments` connection. Paginate threads with `after`, then separately paginate comments in every thread that has another page; a complete outer page does not make nested comments complete. Correlate GraphQL `databaseId` ↔ REST comment `id`.

Write the inventory to `<ledger-dir>/comments.md` before the first edit. One row per comment: `id | surface | thread id | root comment id | author | file:line | ask | disposition | reply id`. This ledger is the record, not the PR page, and not your memory of it.

**Count is the contract.** Every comment from anyone else is a row: bots, nitpicks, praise, questions, outdated comments on stale lines, comments on files outside the diff, already-resolved threads that you touched code in. Your own comments and replies are not rows. Record the total; it is what you verify against in step 4.

### 2. Address it properly first
Reply only after the work behind it is real. "Properly" means the root cause, not the symptom the reviewer happened to point at, and not a reply that reframes the ask into something easier.

Read the full thread before acting — a back-and-forth often ends somewhere other than where it started; the last ask wins. Read any file the comment references, including files outside the PR diff. If the concern still applies on an outdated comment, fix it; if the code moved past it, say which change made it moot.

Every comment ends in exactly one disposition:

| Disposition | Means | Requires |
|---|---|---|
| Fixed | code changed on this PR | commit SHA + file:line |
| Already handled | code already did this | file:line proving it |
| Won't fix | the concern does not hold | the concrete reason it does not hold |
| Moved | belongs to another assigned PR | that PR number, and it must actually be done there |
| Deferred | real but M+ / out of scope | issue link, size, named unprotected risk |
| Owner fork | you cannot pick without the owner | the fork, escalated per **Decision forks** |
| No action | praise, bot noise, informational | nothing |

"Deferred" with no issue and "won't fix" with no reason are not dispositions. If you skipped a code change, the evidence goes in the reply.

### 3. Reply inline, on the thread, immediately
Post as soon as the fix is pushed. Do not stack replies to the end of the run — a killed session loses them and the thread reads as ignored.

- Line-level: `gh api repos/{owner}/{repo}/pulls/{pr}/comments/{root_comment_id}/replies -F body=@<ledger-dir>/reply-<id>.md` — a real threaded reply, one per comment, even when five comments share one fix (each reply may point at the same SHA). GitHub requires the top-level review comment ID, not the ID of a reply. Keep the root ID in the ledger; when answering a follow-up comment, quote or permalink that specific comment inside the reply posted to its root thread. Use `-F` (typed file field), never `-f`, which posts the literal `@path`. See [GitHub's reply endpoint](https://docs.github.com/en/rest/pulls/comments#create-a-reply-for-a-review-comment).
- Review body / conversation comment: no reply endpoint exists. Post one conversation comment that quotes or permalinks the specific comment and answers it. Never fold several of these into one blob.

Body carries the disposition and its evidence:
```
**Fixed** — <what changed and why that is the root cause> — <sha> `<file:line>`
```
Bare `Done`, `Good catch`, `Fixed in latest push`, or a thumbs-up is not a reply. No SHA, no file:line, no reason → not addressed.

Push and reply without asking for confirmation. Decisions (**Decision forks**) still wait for the owner.

### 4. Verify coverage before you go near merge
Re-fetch all three surfaces. For every id in the ledger, assert a reply exists authored by you with `createdAt` later than the comment. Do not verify off the ledger's own reply-id column — that records what you believe you posted; the API records what landed.

Print `covered N / N`. Anything uncovered blocks the merge. If a reply failed to post (permissions, deleted comment, locked thread), retry, then report it explicitly — never let a failed post pass as covered.

### 5. Resolve
Resolve a thread only when a code fix landed for it and you cited the SHA:
```bash
gh api graphql -f query='mutation($threadId: ID!){ resolveReviewThread(input:{threadId:$threadId}){ thread { id isResolved } } }' -f threadId="<node id>"
```
One at a time. Never resolve a thread that is deferred, disputed, moved, no-action, partially addressed, or waiting on an owner fork — those stay open and block the merge until the owner rules. Unresolved threads block auto-merge; that is the intended behavior, not an obstacle to route around.

### 6. New comments keep arriving
Re-run steps 1–5 after every push and again while auto-merge is pending. A comment posted after your last sweep is a comment you owe a reply to. The gate holds until the PR is merged.

## Decision forks
You do not get to pick for the owner. When the answer is not obvious, ask — never assume, never "reasonable default," never pick the option that is easiest to implement and mention it afterward.

Ask when you see:
- behavior change not in the linked issue or PR intent
- architecture change (new layer, boundary, store, public contract, migration strategy)
- deviance from repo ADRs / filed architectural decisions
- multiple reasonable approaches with different product, risk, or long-term cost
- hard-to-reverse change
- a local tweak that would set a new copied pattern
- a reviewer asking for something that conflicts with the issue, an ADR, another assigned PR, or your own read of correctness
- ambiguity about what the ask even is, after reading the full thread
- anything where you notice yourself writing "presumably", "I'll assume", or "most likely they meant"

**Obvious** = one defensible option given the stated intent, ADRs, and surrounding code, and you could name why every alternative is wrong. Anything else is a fork. If you are picking between options on taste, cost, or a guess about intent, it is a fork. Uncertainty about which is right is itself the signal — do not resolve it by deciding.

Batch per PR: collect forks while reviewing and implementing that PR, ask them in one round, then keep working on everything that does not depend on an answer. Do not build on a guess and rework later.

Ask in one short note per fork: options, your default, risk of each, what you need (approve default / pick B / defer). No context the owner already has. Then wait for the answer — do not proceed on the default because a reply is slow.

Every fork gets an inline reply on its thread stating that it is an owner call and is blocked; when the owner rules, reply again with the decision and the resulting SHA.

If the owner is unreachable and the PR cannot ship without the call, block that PR, say so, and continue with independent PRs. A blocked PR is a correct outcome. Shipping a guess is not.

Routine choices inside the stated intent do not need a ping.

## Tests
Coverage % is irrelevant. A test that never exercises the feature is worthless.

Keep/add a test only if it locks user- or system-visible behavior, would catch a production break if deleted, guards a real risk (not a synthetic one), and tests a contract rather than a churny internal.
Worth adding: intended happy path; realistic edges (empty/missing/invalid/boundary/replay/timeout/concurrency/authz denial/partial failure/idempotency/rollback); a named regression; public contract/schema/API/migration; anything that fails if this change is wrong or reverted.

Do not add/keep tests that exist for coverage, assert internals/call counts, duplicate another test, mirror implementation, pass via unrealistic mocks while the feature can still be broken, or are flaky/time/env-dependent without cause.

Fewer sharper tests at the highest level that still localizes failure. Integration/behavior for the real path; unit only for a pure decision/parser/policy/algorithm. Do not unit-test just because mocking is easier.
Make tests better, not bigger. Delete tests that prove nothing. Feature with no test that would catch a break = must-fix. Tests that can still let a broken feature ship = rewrite.
If a worthwhile test is M+ (new harness, fixture rewrite, cross-service setup), issue it (P0/P1) and name the unprotected risk.

## Scope
- Related to one assigned PR + XS/S/small-M → do it there.
- Belongs in a later assigned PR → put it there.
- Related + M+ (redesign, abstraction, migration, broad refactor, large harness, product call) → issue + thread reply with link/why. Do not expand this PR.
- Unrelated → do not sneak it in. Issue only if real and actionable.

Default: implement in the correct assigned PR. Follow-up PRs are last resort when this PR would become unsafe or unreviewable.
Issues need S/M/L and why this diff would get harder to review.
Grow via isolated commits in the correct PR, not a new PR.

## Implement
Fix root causes. If you skip a code change, the thread reply carries the evidence (**Comments** step 2).
Minimal coherent diffs. No opportunistic refactors unless required and in-scope.
After changing a parent PR, refresh dependents and recheck them before merge.
Escalate permissions, infra, product, secrets, missing context, or decision forks immediately. Do not stall.

## Merge
If this work requires creating a PR, run required local checks first and open it ready for review. Do not create a draft unless the owner explicitly requests one. An existing draft becomes ready only after those checks pass.

Do not leave after the first push.

Ready = required local checks passed and all required CI/review gates pass for the current remote head SHA; findings addressed; **coverage verified `N / N` against a re-fetch, zero uncovered**; threads resolved only where a fix landed; **zero open owner forks**; pending CodeRabbit/review-bot comments handled or owner-waived; tests lock the actual feature and real risks; dependencies merged; base updated; no git/semantic clash with other assigned PRs; nothing that belongs here remains.

An unanswered fork or an uncovered comment is a hard block. Do not merge past either, and do not close the gap by downgrading the comment to "no action" or the fork to "obvious."

Immediately before enabling merge, re-fetch the PR head SHA and base, required check results, approval state, all comment surfaces, and unresolved threads. Evidence from an older head is not proof for the current head. If the head or base changed, reassess the affected checks and review before proceeding.

Merge only when ready. Enable squash auto-merge and watch until it lands. Fix new CI, and reply to new comments, in that PR.
No auto-merge on a dependent until its parent merged and the dependent was rebuilt/rechecked.
After each merge, update remaining PRs, re-assess conflicts, continue in order.

## Issues
Only for real M+ or out-of-scope leftovers.
P0: correctness, security, data loss, broken CI, user-facing breakage, unprotected critical behavior.
P1 soon; P2 should-do; P3 nice-to-have.
Include why out of this PR, area, approach, PR interactions, unprotected behavior if tests were deferred, and links.

## Cleanup
After each merge, remove that PR's owned disposable workspace artifacts. Preserve durable evidence. Do not delete trees/branches still needed by remaining assigned PRs.

Before delete: confirm merged (not just closed); confirm exact branch/worktree; confirm no uncommitted/untracked/important-ignored/unpushed work; confirm no other PR/task uses them. Never delete default/base or unrelated trees/branches.

Then: post-merge checks if available; remove worktree; delete local branch; delete remote branch if it remains and permissions allow; prune stale worktree regs and remote-tracking refs; remove owned disposable temp/patches and reply drafts only after their outcomes are recorded on GitHub or another durable handoff. Preserve requested receipts, ignored evidence, and any artifacts still needed for deployment or live acceptance; report their location. Confirm that PR's tree/branch/lock/registration are gone and remaining trees are valid.

If unexpected work exists, stop, preserve it, report path/branch/status.

## Report to owner
Short. Only what the owner must know. No process diary, no obvious facts, no "CI green," no branch names unless something failed, no coverage talk, no restated ticket text, nothing visible on the PR itself. Do not list the replies you posted — the owner can read the PR.

Include only if non-obvious or actionable:
- what shipped and merge order, if that mattered
- behavior or architecture that changed, especially if not in the linked issue
- owner forks still open, or calls you made and why
- comments you could not cover, and why
- conflicts, cancellations, blocked PRs
- leftover risk: unprotected behavior, deferred M+, P0/P1 issues opened
- cleanup that failed or anything the owner must do

Done when every assigned PR is merged or explicitly blocked, every comment on every merged PR has a replied-and-verified disposition, owner-relevant leftovers are listed, and only trees/branches for blocked work remain.
