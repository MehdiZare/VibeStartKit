# PR comment ledger

Keep this file outside every disposable worktree. Record the exact repository, PR and session.

| Comment ID | Surface | Thread ID | Root comment ID | Author | File:line | Current ask | Disposition | Reply ID and evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Inventory line comments, review bodies and conversation comments. Retrieve GraphQL review-thread state, including nested comment pagination. Keep one row per comment from someone else, including informational and outdated comments.

Before merge, re-fetch the source APIs and verify reply coverage against what actually landed. A ledger row alone is not proof. Record covered N/N and zero uncovered for the current head; keep owner decisions and unresolved acceptance separate.
