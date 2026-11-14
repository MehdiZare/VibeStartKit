# Use CLI tools and CI to prove an AI coding change

The toolchain around an agent should make the result easier to inspect. I want to find the relevant code, read the tracker state, run the repository's checks and connect the evidence to the commit under review.

GitHub CLI, rg, jq and named project commands are useful parts of that workflow. CI then runs the maintained checks in another environment against a specific revision.

Blacksmith is part of my broader stack, but its role is CI infrastructure. It does not determine which behavior the tests should prove or whether the PR owner has addressed the review.

## Give each local tool a small job

Git records the change and manages branches/worktrees. GitHub CLI reads issues, PRs, reviews and checks through the account you authenticated. rg searches the local repository. jq selects fields from structured output.

Runtime and package tools solve another problem: running the project's supported environment. I use tools including uv, Bun, Task, fnm and pyenv, but a starter should not require all of them for every project.

Choose the runtime and command path maintained by the repository. A tool catalog is useful for understanding the options; it is not a reason to replace a working setup.

VibeStartKit itself is a TypeScript/Node CLI (Node 24.11+, pnpm) with an optional Python 3.12+ helper and exercise. Neither launches clients, reads credentials or tests account access while checking which binaries are present.

## Search the actual implementation

Begin with a targeted search for the affected symbol, route, error or contract. Read enough surrounding code to understand the behavior and its callers.

A filename match can locate the right area without establishing the root cause. Follow the relevant imports and execution path before proposing a fix.

Use the issue's reproduction and acceptance criteria to decide what evidence matters. A broad search for every nearby improvement can distract from the agreed task.

Record the file locations supporting the plan. Another agent or reviewer should be able to verify the finding rather than relying on a confident explanation alone.

## Use structured tracker output carefully

The GitHub CLI can expose specific PR fields as JSON. For example:

```sh
gh pr view NUMBER --repo OWNER/REPO --json headRefOid,baseRefName,reviewDecision,statusCheckRollup
```

This is a source of current state, not a complete merge policy. The worker still needs the repository's required checks, full review surfaces, unresolved threads and owner decisions.

Keep query limits and pagination visible. A convenient first page of comments or search results can omit a relevant item.

Avoid putting secrets or private code into a public progress comment. The useful record is the decision, change and validation evidence, with enough context to assess it.

## Run the maintained local gate

Read AGENTS.md and the project's scripts before choosing commands. A named Task or package command can include setup and architecture assumptions that an improvised invocation misses.

For this starter, the maintained checks are:

```sh
pnpm check
pnpm test:generated
python3 -m unittest discover -s tests -v
python3 tools/check_content.py
```

pnpm check type-checks, lints, builds and tests the CLI. pnpm test:generated (after pnpm build) generates each preset into a disposable directory, installs it, checks that its hooks actually run and starts the local web app. Use a supported interpreter for the Python checks: the installer tests exercise preview behavior, project-local installation, conflict protection, idempotence, destination boundaries and the offline example. The content checker verifies maintained local references and publication hygiene.

Those are the checks appropriate to this repository. They do not establish that a client is authenticated or that a cloud deployment behaves correctly.

## Make behavioral checks explain the result

For a bug fix, prefer a check that demonstrates the reported behavior against the baseline and the proposed change. Use a safe separate copy for the baseline.

The starter's teaching example makes this visible: the original duplicate-job behavior fails, while the separate reference solution passes the same behavioral checks.

That is useful evidence for the exercise. It is not a benchmark for a production queue or a proof of durability under concurrent failures.

For a real application, choose the highest level that still localizes the relevant failure. A meaningful test should protect observable behavior or a real contract, rather than merely repeating the implementation's shape.

## Keep CI tied to the commit

CI gives another execution environment and a durable run record. Connect its result to the remote head SHA and the workflow/check that produced it.

A successful old run does not prove the current head is ready. A skipped job, canceled run or unavailable environment should remain visible in the report.

Fix failures introduced by the PR. Disclose unrelated failures and any authorized exception accurately. Do not describe a failed required gate as passed because another command succeeded.

The ready-PR handoff should say which local checks ran and which CI/review gates remain. This makes the next owner's job more concrete.

Suppose an earlier PR head passed both runtime jobs, then a new push changes the installer. The relevant question is whether those jobs passed on the new head, not whether the PR has ever been green. A reviewer can use the current head field and the check run's associated revision to resolve that. If one runtime is pending or canceled, report that state. The same reasoning applies when comparing runners: preserve the commit and workload so a timing difference describes the same check.

## Add Blacksmith where it is available

Blacksmith's current quickstart supports GitHub organizations and says personal repositories are not supported. VibeStartKit's personal repo therefore uses GitHub-hosted Actions.

For an eligible organization, the documented integration grants Blacksmith access and uses an appropriate runner label in the workflow. Treat that as an infrastructure choice with its own account and scope decision.

Preserve the same acceptance commands while evaluating the runner. Otherwise, a faster pipeline may simply be running a different workload.

I would measure queue time, environment setup, dependency installation, test/build time, failures and actual cost on representative jobs. Provider performance claims are a reason to evaluate, not results from your own project.

## Inspect the whole feedback loop

A fast test run is helpful when the test catches the relevant failure. A fast queue also matters when developers wait for the runner. Measure the part that affects your workflow rather than optimizing the most visible number.

Local and CI evidence can disagree because of runtime, environment, fixture or command differences. Investigate those differences before assuming one result invalidates the other.

Keep the command versions and relevant environment facts in the run record. Do not copy credential values into that record.

When the configuration changes, reassess the checks affected by the change. Repeating unrelated tests indefinitely does not improve the explanation of the result.

## Carry the evidence into review and delivery

The PR owner needs the actual change, accepted behavior, current-head check state and remaining decisions. A green badge alone cannot settle review findings or deployment acceptance.

For a change that requires production verification, keep that obligation open after merge. Record the deployed revision and relevant application observation when the task reaches that stage.

The practical toolchain is the one that lets another person follow that chain of evidence. Start with the commands already maintained by the project, then improve a demonstrated bottleneck.

See [the stack guide](../stack-and-mcp.md) for how local tools, coding clients, MCP and cloud infrastructure fit together. Which part of your current check loop takes the most time, and what evidence would show a useful improvement?

Sources: [GitHub CLI PR view](https://cli.github.com/manual/gh_pr_view), [Git worktree](https://git-scm.com/docs/git-worktree), [Blacksmith quickstart](https://docs.blacksmith.sh/introduction/quickstart), [Blacksmith documentation](https://docs.blacksmith.sh/). No performance saving is asserted for the starter.

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../../DISCLOSURES.md).*
