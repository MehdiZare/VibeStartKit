# Duplicate job deliveries inflate the in-memory ledger

This is a synthetic teaching issue. It does not describe an incident in any production system.

An event can be delivered more than once. JobLedger currently appends each delivery, so one logical job appears several times. Reproduce with `python3 -m unittest -v` in this directory. The first-delivery and distinct-job checks pass; duplicate and conflicting-replay behavior fails.

## Expected behavior

The first call for a job ID returns true and stores the payload. A later call for the same ID returns false and preserves the first payload. Distinct IDs remain distinct even when their payloads match. Count is the number of accepted unique jobs.

## Scope

Fix the in-memory behavior in jobs.py, preserve the public record/count interface, and use the existing behavioral checks. Explain the root cause and a plan before editing. Do not add a database, network service, dependency, cloud account or paid model call to complete this example.

This sample does not establish production durability, concurrency or exactly-once processing. Those would require a separate design and validation. A real issue would also identify its repository, owner and deployment acceptance.

## Handoff

Record the change, exact test command and result, files touched, remaining limitations and next reviewer. Practise the issue-closure → ready PR → pr-ownership distinction; a local test is not a merged PR.
