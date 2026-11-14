# Contribute to VibeStartKit

Try a generated project or the optional offline exercise, then use a setup/workflow feedback issue to report an observable problem.

Include the operating system, Node/Python/client versions, recipe/specification, exact command, expected behavior and actual result. Redact credentials, private code, filesystem paths, account IDs and private memory namespaces.

Before implementation, describe the outcome and scope in an issue. Explain the tradeoffs for non-obvious choices. Keep the change coherent and within the actual assignment.

For the Node CLI, run pnpm check. For application recipes, build the CLI and run pnpm test:generated; --preset can select one affected preset through tools/smoke-generated.mjs. The smoke check creates disposable projects, installs their packages, runs local gates, checks actual hook behavior and starts the local web app. It does not provision a provider account or call a paid model.

Preserve the Python helper's tests with Python 3.12+: python3 -m unittest discover -s tests -v. Run python3 tools/check_content.py for maintained documentation/manifest checks.

Keep planning read-only, selected installations explicit, new destinations isolated and setup progress resumable. Recipes must declare ownership and dependencies; they may not silently replace another recipe's files.

`main` is protected: every change lands through a pull request, squash merged after all CI jobs pass on an up-to-date branch and every review thread is resolved. Direct pushes, force pushes and branch deletion are blocked. Open ready PRs after the required checks pass; the maintainer reviews them. Describe the observable problem, the resulting behavior, the exact validation you ran (a passing CI run alone is not enough) and the limits. Verify changing provider behavior with primary sources and label unperformed integration tests honestly.
