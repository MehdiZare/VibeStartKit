# What changed in the public skill copies

The initial public copies come from the author's installed issue-closure and pr-ownership skills, captured on November 10, 2026. Those installed files matched across Claude Code, Codex and OpenCode. This repository is a separate portable distribution; its setup helper never updates the author's installed copies.

Preserved rules include investigation before claims, an approved scope before coding unless already authorized, explicit owner decisions for non-obvious choices, isolated owned worktrees, meaningful acceptance checks, a ready PR after local gates pass, an exact handoff, every-comment reply coverage, current-head merge gates, dependency ordering and careful owned-artifact cleanup. Merge, deployment and live acceptance remain separate observations.

Portability changes:

- Removed a project-specific local command example. Each adopting repository must supply its own required local gate.
- Moved project-memory details into a supporting reference and made the service optional. Explicit project scope and the host's memory-write policy still apply; no private namespace is distributed.
- Clarified that squash auto-merge requires authorization to merge. A narrower review assignment remains narrower.
- Corrected the line-comment reply example to use GitHub's top-level root comment ID. GitHub does not accept a reply ID at that endpoint. A follow-up still gets its own substantive reply in the root thread, with a quote or permalink identifying the comment being answered. The ledger now records that root ID.

These are instruction files, not a permissions engine. Syntax validation and the helper's tests do not prove that a model will follow every rule. Try a bounded task, inspect the actual output, and report a concrete failure or ambiguity.

Source for the reply behavior: [GitHub review-comment API](https://docs.github.com/en/rest/pulls/comments#create-a-reply-for-a-review-comment).

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../DISCLOSURES.md).*
