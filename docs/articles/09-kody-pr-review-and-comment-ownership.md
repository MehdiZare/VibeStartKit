# Use Kody in a PR workflow that accounts for every comment

Kody is one of the tools I use around code review. Its findings can point to a bug or a contract worth investigating. The review process still needs an owner who checks the concern, decides the appropriate scope and leaves evidence that the request was addressed.

That is what my pr-ownership skill is designed to do. It takes the ready-PR handoff from issue-closure and follows the change through review and an authorized merge.

VibeStartKit packages that workflow alongside guidance for adding Kody. A reviewer supplies evidence to examine; the PR owner remains responsible for the result.

## Decide where the review runs

Kody can review a pull request through the Kodus integration. Kodus also offers a CLI for local review, including agent-oriented output.

Those are separate setup choices. Using a hosted PR reviewer does not establish that the local CLI is installed or authenticated. The starter's checker reports binary presence, and the setup tool runs neither kind of review.

If you want the local route, follow the current official setup and authorization instructions. The documented command for structured agent output is:

```sh
kodus review --prompt-only
```

Inspect the output against the actual change. Review findings are hypotheses to verify, including when they come from a tool that usually provides useful suggestions.

## Start from an exact handoff

The PR owner needs the repository, PR, approved scope, branch/base, exact remote head, owned worktree, local check results and remaining acceptance obligations.

That avoids restarting settled planning or reviewing evidence for the wrong revision. It also establishes whether the assignment includes implementation, review, merge or only a narrower subset.

Read the linked issue and current diff. Compare the resulting behavior with the intended outcome. Review the relevant contracts, tests, architecture and rollout constraints rather than relying only on a bot summary.

If there are dependent PRs, inspect the sequence. A later change may assume behavior that has not landed yet.

## Inventory all three comment surfaces

The skill treats line comments, review bodies and conversation comments as separate sources. Querying one surface and calling it the full review can miss work.

The CLI shapes are:

```sh
gh api repos/OWNER/REPO/pulls/NUMBER/comments --paginate
gh api repos/OWNER/REPO/pulls/NUMBER/reviews --paginate
gh api repos/OWNER/REPO/issues/NUMBER/comments --paginate
```

Add GraphQL review-thread state, including resolution and nested comment pagination. An outer page of threads is not proof that every thread's comments were retrieved.

Record each comment from someone else in a ledger: its ID, surface, thread, root comment ID, author, current ask, disposition and reply evidence. Keep this bookkeeping outside disposable worktrees.

## Read the current ask before changing code

A thread can evolve. The first comment may identify one symptom, while the discussion ends with a different decision or a more precise requirement.

Read the whole thread and relevant files, including referenced files outside the diff. An outdated line comment can still describe a live issue; moved code can also make the concern obsolete.

Then choose a substantive disposition. A fix needs evidence from the change. An already-handled concern needs the code location that demonstrates it. A decision not to change something needs a concrete reason.

A real out-of-scope concern needs the authorized follow-up and an accurate statement of the remaining risk. A product or architecture fork goes to the owner with alternatives and tradeoffs.

## Reply on the relevant thread

My rule is one substantive reply for every comment from someone else. A pushed fix without a reply leaves the review record unfinished.

For a line comment, post in its review thread. There is an API detail worth making explicit: GitHub's reply endpoint requires the top-level comment ID. It does not accept the ID of another reply.

When answering a follow-up, post to the root thread and identify the specific comment with a quote or permalink. The public skill and ledger include the root ID for this reason.

Review bodies and conversation comments use a different reply pattern: a conversation comment that identifies and answers the specific source. A single closing summary does not replace that coverage.

## Resolve findings with evidence

A useful fixed reply explains the change and cites the commit and relevant location. A bare “done” does not help a reviewer verify the result.

Thread resolution has its own meaning in this workflow. Resolve when the fix landed and the evidence supports the disposition. Keep disputed, deferred, partial and owner-decision threads visible until the appropriate decision is made.

Do not turn a legitimate finding into “no action” just to make the gate pass. Equally, do not implement a misleading suggestion merely because an automated reviewer posted it.

The owner must be able to explain why the resulting behavior is correct and how the review record supports that conclusion.

Consider a synthetic reviewer suggestion to normalize job IDs to lowercase. That may change the public identity contract, so it needs an owner decision unless the issue already establishes the behavior. Another finding might correctly identify duplicate appends, which belongs in the approved fix. The replies should explain those different dispositions with evidence. When the fix exists, cite its actual commit and location; when a decision is pending, identify the options and blocker. Neither response should claim a completed change before it exists, and the later follow-up still needs its own answer. This is how the ledger stays connected to engineering work rather than becoming a checklist of reassuring words.

## Re-fetch before calling the review complete

The ledger records what the worker believes happened. Re-fetch the source APIs and verify the replies that actually landed.

Check all surfaces again after a push and while an authorized auto-merge is pending. New comments create new obligations. A reply posted before a later follow-up cannot answer that follow-up.

The coverage result should connect each inventoried comment with its substantive response. Keep unanswered owner decisions separate; a complete reply inventory does not settle a pending product choice.

This discipline costs effort, especially on a busy PR. It also gives the next reviewer an inspectable account of what was fixed, explained or left open.

## Verify the current head before merge

Immediately before enabling an authorized merge, confirm the remote head/base, required check results, review state, comment coverage, unresolved threads and dependency readiness.

A passing result on an older commit is evidence for that older commit. A new push can require another review or a relevant check, even when the previous summary sounded complete.

Keep local checks, CI, review and acceptance distinct. The issue may still need deployment or a live observation after merge.

Kody fits into this process as another source of findings. The PR owner connects those findings with the actual implementation, decisions and evidence.

Inspect the [portable pr-ownership skill](../../skills/pr-ownership/SKILL.md), [comment ledger](../../templates/comment-ledger.md) and [portability notes](../skill-portability.md) before trying it. The first useful trial is a small PR whose review surfaces and resulting replies you can inspect end to end.

Sources: [Kodus CLI](https://github.com/kodustech/cli), [Kodus project](https://github.com/kodustech/kodus-ai), [GitHub review-comment replies](https://docs.github.com/en/rest/pulls/comments#create-a-reply-for-a-review-comment). No live Kody effectiveness benchmark is claimed by this guide.

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../../DISCLOSURES.md).*
