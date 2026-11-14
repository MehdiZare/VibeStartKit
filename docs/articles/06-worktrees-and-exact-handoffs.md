# Use Git worktrees and exact handoffs to keep delegated work coherent

When several coding sessions touch one repository, I want each change to have a clear owner, a valid workspace and evidence tied to a specific revision.

Git worktrees help with that workspace boundary. They let separate working directories share one repository's history while checking out different branches. The workflow around them still needs ownership, current-state checks and careful cleanup.

VibeStartKit's two skills use worktrees as part of a coherent issue-to-PR process. Here is how I would teach the pattern to someone trying delegated coding work.

## Inspect what already exists

Before creating another worktree, identify the repository, issue or PR, expected branch and base. Check the existing registrations and local state:

```sh
git worktree list
git status --short
git branch --show-current
```

An appropriate worktree may already belong to the assignment. Reusing it preserves the context and avoids duplicate directories for the same branch.

Inspect modified, staged and untracked files. If a directory contains work from another task, preserve it and resolve ownership before editing. A clean-looking board status does not establish that a local workspace is disposable.

Important ignored files also matter when cleanup is considered. A normal status view is only part of that check; never treat an ignored file as expendable merely because Git does not track it.

## Verify the branch and base

Read the PR's current head and base rather than relying on a folder name. Check which default branch the repository uses and whether the proposed change depends on another PR.

Fetch current remote state before making decisions about the branch. A local ref or an earlier handoff can lag behind the remote.

The following example assumes you already verified that origin/main is the intended base and that the branch/worktree does not exist:

```sh
git fetch origin
git worktree add -b fix/issue-123 ../project-issue-123 origin/main
```

Replace the example names with the actual approved assignment. A different base, fork or dependent branch can be an owner decision when it changes the integration path.

## Give one coherent change its own workspace

A worktree should contain the issue cluster or PR it owns. Keep unrelated implementation out of that directory.

The boundary is about the change, not the number of tools. A worker can use several tools inside an owned workspace, while an independent reviewer can inspect the same committed revision from another appropriate context.

Parallel work needs a real separation. Two changes can conflict in schema, generated types, feature flags or behavior even when Git can merge their files without a textual conflict.

Before starting parallel implementations, identify the shared contracts and the integration order. If the boundary is uncertain, investigate it or ask the owner rather than letting two workers choose independently.

## Keep the branch and evidence connected

The handoff should identify the exact current remote head SHA. A phrase such as “the latest push” does not tell a reviewer which code the checks describe.

Record the relevant commands and outcomes, the files or contracts changed, the approved scope and unresolved decisions. If a check was unavailable, disclose the limitation.

The worktree path helps the next agent find the existing implementation. It should also explain whether there are uncommitted changes and who owns them.

For a ready PR, include outstanding CI/review gates and remaining deployment or live acceptance. The next session should not have to infer those obligations from a successful local test.

Imagine a handoff says that tests passed, then another push changes the duplicate-handling branch. The reviewer needs to know which revision the earlier result covered and whether the relevant check ran again. Recording a head SHA makes that question answerable. Recording the workspace and current dirty state also lets the next worker distinguish the committed result from unfinished work. These fields are useful even for a single agent moving between sessions; they reduce the amount of context the owner has to reconstruct from memory.

## Store review bookkeeping outside disposable trees

The pr-ownership skill keeps the comment ledger, reply drafts and owner-decision list outside every disposable worktree. That matters because a tree can be removed or replaced during a long-running task.

Use a dedicated directory whose identity includes the repository, PR and session. Keep an absolute path in the handoff so a later session can find the record.

The ledger records each comment's surface, ID, current request, disposition and reply evidence. Before merge, verify the replies against the source APIs again; the ledger reflects what the worker believes happened, while the API shows what actually landed.

Once the durable evidence is recorded, disposable drafts can be cleaned up within the authorized workflow. Preserve anything still needed for review, deployment or live acceptance.

## Refresh dependent work after a parent changes

A stacked PR can depend on more than a shared line of code. It may assume a migration, an API contract or a feature flag introduced by its parent.

If the parent changes, refresh the dependent and reassess affected checks. After a parent merges, verify the child against the new base before enabling its merge.

A successful check from the earlier stack is not automatically evidence for the current head and base. Keep the revision, dependency order and validation result connected.

This is where a coordinator adds value. It can maintain the dependency map and confirm that a later worker has received the updated contract instead of continuing from an older brief.

## Review before removing anything

Cleanup should follow a confirmed merge and a check that the artifacts are owned and disposable. A closed PR may have been abandoned rather than merged.

Confirm the exact branch and worktree. Inspect uncommitted, untracked, important ignored and unpushed work. Check whether another PR or task still uses the directory or branch.

If unexpected work exists, preserve it and report the path and state. Removing a confusing artifact can destroy the evidence needed to understand the problem.

Delete only the approved disposable artifacts. Preserve the default/base branch, unrelated workspaces and evidence still needed for pending acceptance. Then confirm that remaining worktrees are valid.

## Practise the handoff on the local example

The duplicate-job exercise is small enough to use as a teaching task. You can create a scratch repository for it, investigate the failing behavior, approve a narrow fix and record a local handoff.

That practice demonstrates the structure. It does not create a real GitHub issue, PR, merge or production acceptance by itself.

Ask a second session to read the handoff and identify the current result and next action. If it cannot tell which revision was checked or which decision remains open, improve the record before adding more parallel work.

The point of a worktree is a clearer implementation boundary. The point of the handoff is a clearer evidence boundary. Together they make a delegated change easier to resume and review.

Use the [handoff template](../../templates/handoff.md) and [comment ledger](../../templates/comment-ledger.md) as starting points. Verify the actual repository state every time the work moves between owners.

Source: [Git worktree documentation](https://git-scm.com/docs/git-worktree). The examples describe a proposed workflow and a synthetic exercise; they do not claim a production deployment or a live multi-agent concurrency test.

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../../DISCLOSURES.md).*
