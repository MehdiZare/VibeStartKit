# Use OpenRouter and OpenCode to evaluate a coding task

OpenCode and OpenRouter solve different parts of my workflow. OpenCode is a coding client that works with the repository and tools. OpenRouter provides model/provider access for a compatible client.

That separation gives me choices, but a choice is useful only when I can connect it to the task. I want to know whether the configuration completes accepted work, what corrections it needs and what the whole run costs.

Here is the evaluation I would use when adding that combination to a vibe coding setup. It is a proposed method, not a benchmark result from every available model.

## Connect the client deliberately

OpenCode's provider guide describes the setup through /connect. Choose OpenRouter, enter the credential inside the client and use /models to select an available model.

Confirm the intended account and configuration before sending a task. The VibeStartKit checker can find the OpenCode binary, but it does not authenticate the provider or make an inference call.

Use the current model catalog rather than copying an old identifier from a tutorial. Check the selected model's tool support, limits and relevant settings. A provider integration does not imply that every model has the same capabilities or request behavior.

Keep the first task small enough to inspect. The starter's offline exercise is one way to learn the evaluation structure before applying it to a real repository.

## Record the provider route as part of the configuration

A model name is not the whole configuration. OpenRouter's routing documentation describes provider selection and controls such as fallback behavior, parameter requirements and data-policy filtering.

Those controls matter when the application needs a particular route, supported parameter or data-handling arrangement. Read the current settings and provider information for the task you intend to run.

I would record the model identifier, client version, relevant effort/settings, provider route where available, fallback policy and instruction revision. If a run used a fallback, retain that fact rather than assigning all its behavior to the original configuration.

This record also helps explain changes in timing or reliability. A comparison becomes harder to interpret when the routing behavior changes silently between runs.

## Define accepted work first

Pick an observable task with a maintained acceptance check. A narrow bug fix, a review with a known defect and an investigation requiring tool evidence exercise different abilities.

For the synthetic job-ledger example, accepted behavior means the first ID is stored, repeated IDs are rejected, the original payload is preserved and distinct IDs remain distinct. The existing tests express those behaviors.

A real application task needs its own checks. The worker should also stay within the agreed scope and disclose anything it could not verify.

Do not make a polished final answer the acceptance criterion. Read the actual diff, output or cited source. If the result needs correction before review, that effort belongs in the evaluation.

## Keep the comparison controlled

I would compare the existing model and instructions with the candidate configuration on the same saved task. Keep starting files, permissions, tools and acceptance criteria consistent.

Then test one justified instruction change with the candidate. That helps separate the model change from the prompt change.

Repeat enough runs to see whether the result is stable. Preserve failures and unexpected stops in the record. Selecting only the clean demonstration produces an incomplete picture of operating behavior.

This does not require a large benchmark suite before the first experiment. A small representative set can reveal whether a configuration deserves a broader trial, provided its limits are clear.

## Evaluate each role separately

The planner, worker and reviewer have different outputs. A planner needs to find the relevant facts and frame the owner decisions. A worker needs to implement the approved scope. A reviewer needs to identify real problems and account for the review process.

I would avoid assigning a single overall winner before checking those roles. A model that writes a useful investigation may still make unexpected edits as a worker. A reviewer may produce many findings while missing the known defect.

The role brief and required evidence should remain explicit. Use the same handoff fields so each run can be assessed against the same agreement.

Keep the coordinator responsible for reading the returned evidence and deciding whether the task can move forward. Delegation does not remove the need for that integration step.

## Measure the cost of the complete run

Record elapsed time, tokens, tool calls, delegated work and provider usage where the client exposes them. Include human inspection and correction time.

Two runs can pass the same automated test while creating different amounts of review work. A result with unrelated edits or missing evidence may be more expensive to accept than its token bill suggests.

For an interactive session, waiting time affects the experience. For an unattended investigation, a longer run may be acceptable if it reaches a better-supported result. Define which target matters for the workload.

Provider prices and available routes change, so use the current account information for an actual budget decision. The kit does not estimate a universal cheapest model or promise a fixed saving.

## Make fallback behavior inspectable

Fallbacks can improve availability, but the successful response still needs the same acceptance check. If the fallback changes a relevant capability or setting, the task may need a different result assessment.

The run record should show the failure, fallback and final outcome where those facts are available. A successful HTTP response alone does not establish that a tool call or coding change met the contract.

If the client cannot expose enough information for the decision you are trying to make, name that limitation. Do not invent a route or cost from the requested model name.

This is an application-observability question as well as a prompting question. Keep that distinction visible when investigating an unexpected result.

For a first comparison, I would keep a row for each task/run containing the task revision, client/model, route if known, relevant settings, instruction revision, accepted behavior, unexpected edits, correction time and measured usage. Leave an unavailable field explicitly unknown. Use the same acceptance rubric for both configurations. If the provider changes during a retry, retain that event in the row. The resulting table can support a narrow decision about that workload without pretending to rank every model or account for information the client never exposed.

## Promote a configuration with a bounded trial

Once a candidate performs well on the representative set, I would give it a defined role in a limited real workload. Keep a known baseline and a way to compare accepted work and correction effort.

Document the decision and its scope: which tasks, client/model/settings and instruction revision were evaluated, what evidence supported the choice and what remains untested.

Revisit the evaluation after a meaningful model, client, provider or instruction change. An earlier result is evidence for that earlier setup.

Use VibeStartKit's [handoff template](../../templates/handoff.md) to record a first trial. A useful feedback report describes the task, selected configuration, acceptance result and limitation without exposing private code or credentials.

Sources: [OpenCode providers](https://opencode.ai/docs/providers), [OpenRouter model catalog](https://openrouter.ai/models), [OpenRouter provider routing](https://openrouter.ai/docs/features/provider-routing), [OpenRouter quickstart](https://openrouter.ai/docs/quickstart). No paid inference evaluation is performed by the starter.

---

*Disclosure: I'm not affiliated with, sponsored by or paid by any tool or company named here; they are my personal preferences. Paid services and prices change. See [Disclosures](../../DISCLOSURES.md).*
