# Autonomous VoiceOver Loop

This document defines the continuous multi-site workflow that keeps one site
scanning while another site is being refined.

The autonomous loop coordinates work. It does not weaken the evidence rules in
the phase docs. VoiceOver output remains the primary evidence, Phase C.5 remains
the uncertainty tool, and reusable engine behavior is preferred over
site-specific logic.

The loop refines fixtures toward VoiceOver-equivalent output for the initial
captured HTML. It must not chase transient output caused only by page changes
while VoiceOver moves down the page. Use step snapshots and recordings to
explain those raw announcements, then keep `refinedAnnouncements` aligned to
the initial `rendered-html.html` oracle.

## Lanes

Run two lanes in parallel when capacity allows:

```text
Scan lane:
  queued site
  -> trigger full debug VoiceOver scan
  -> wait for artifact
  -> Phase 0 scan-health gate
  -> ready artifact

Refinement lane:
  ready artifact
  -> Phase A intake
  -> Phase B evidence refinement
  -> Phase C fixture judge
  -> Phase C.5 when required
  -> Phase D engine refinement
  -> Phase E canonical fixture promotion/status
  -> learning ledger
  -> next ready artifact
```

Only the scan lane should trigger new live-site scans. Only the refinement lane
should change fixtures, engine code, tests, manifests, or status docs.

## State Directory

Each autonomous batch should keep durable scratch state under:

```text
voiceover-smoke/autonomous-runs/<batch-id>/
  queue.json
  learnings.jsonl
  sites/<target>/state.json
  sites/<target>/00-scan-health.json
  sites/<target>/agent-work/
```

`queue.json` records the target order and scan settings. `state.json` records
the current target status and latest phase receipts. `learnings.jsonl` records
cross-target decisions that future refinement should reuse. The compact
run-level agent state is written separately to
`voiceover-smoke/agent-work/<batch-id>/_summaries/orchestrator-state.json`.

Recommended target states:

- `queued`
- `scan-running`
- `scan-health-failed`
- `scanner-fix-required`
- `artifact-ready`
- `refining`
- `needs-c5`
- `engine-fixed`
- `candidate`
- `refined`
- `blocked`
- `skipped`

The orchestrator may move to the next site only after the current site has a
recorded state and next action. It may continue refining one site while a later
site is in `scan-running`.

Use the workflow status helper before resuming a paused run, before declaring a
target complete, and before final handoff:

```sh
yarn voiceover:workflow-status --run-id <run-id>
```

The command summarizes active workers/scans, corpus status counts, and
promotion gaps where an isolated fixture set has reached zero mismatches but has
not yet been copied into the canonical VoiceOver corpus.

For agent-work receipts, generate the smaller orchestration resume packet:

```sh
yarn voiceover:compact-state --run-id <run-id>
```

Read `_summaries/orchestrator-state.json` before individual target receipts.
Regenerate it after a family disposition, agent replacement, or phase batch.

## Handoff Modes

Use the lightest continuation mechanism that matches the thing being waited on:

- Subagent completion: keep the top-level turn open with `wait_agent` when the
  next step is on the critical path. Subagent completion notifications are
  passive; they do not by themselves spawn the next worker after the top-level
  turn has ended. A blocking wait lets the orchestrator close the completed
  agent, read its receipt, and launch the next phase without a scheduled poll.
- GitHub Actions or other remote scans: use a heartbeat, scheduled
  continuation, or explicit polling only while waiting for remote run status or
  artifact availability.
- No active external wait: do not keep a heartbeat running merely to ask
  subagents for status. Either keep the orchestrator turn open on `wait_agent`
  or stop with the active worker id, receipt path, and next action recorded in
  state.

This keeps the loop event-like for local agent handoffs while reserving polling
for genuinely asynchronous external systems.

## Orchestrator Responsibilities

The top-level session or orchestrator agent must:

- Maintain the queue and one `state.json` per target.
- Keep the phase-agent pool stable. Reuse sessions for sequential scopes through
  compact input handoffs instead of spawning a new agent for each target, retry,
  compare, or verification pass.
- Keep one long-lived engine-refiner session and lease for the whole run.
- Keep no more than two C.5 repro-scanner sessions, partitioned by mismatch
  family, unless a recorded infrastructure blocker requires replacement.
- Trigger scans with debug evidence enabled for new or uncertain sites:
  step snapshots on, screenshots and screen recording on when diagnosing page
  access, popup, focus, or VoiceOver startup problems.
- Treat debug capture as required, not optional, for scans intended to support
  scanner or engine changes. Structural mismatch families such as list markers,
  inline text segmentation, grouped/card atomicity, dialogs, tables/grids, and
  focusable wrapper descent need rendered HTML, AX nodes, step snapshots, and
  screenshots/source evidence. If those are absent, route the target to
  `scanner-fix-required` or `debug-evidence-missing` before Phase D.
- Wait for artifacts and run Phase 0 before Phase A.
- Spawn the named phase agents required by
  `docs/workflows/voiceover-refinement.md`.
- Keep write ownership narrow:
  Phase B owns refined fixture edits, Phase D owns engine/test changes, Phase E
  owns manifest/status updates, and the orchestrator owns queue/state files.
- Trigger Phase C.5 when Phase B, C, or D receipts request it.
- Keep advancing each site toward zero mismatches by repeatedly routing unresolved
  families through B/C/C.5/D until exact match or a genuine fallback condition
  is recorded.
- Enforce the initial-HTML oracle: before treating a mismatch as an engine gap,
  confirm the expected refined line is replayable from initial
  `rendered-html.html`, not only from a later `htmlAfterStep` mutation.
- Validate phase receipts before promotion.
- When refinement used an isolated fixture directory, treat zero mismatches as
  "ready for Phase E," not "done." Phase E must copy the approved fixture files
  into `packages/sr-engine/tests/fixtures/voiceover/`, merge `index.json`,
  update `refinement-manifest.json`, and verify the canonical corpus before the
  target may move to `refined`.
- Append learnings after each target outcome or reusable engine decision.
- Stop instead of guessing when evidence is missing or a rule would become
  site-specific.
- Continue the batch after a target reaches `refined`, `candidate`, `partial`,
  `blocked`, or `skipped` by selecting the next queued or artifact-ready site.
  Only stop the batch when the queue is empty, required credentials/tools are
  unavailable, or the same infrastructure blocker prevents further sites.
- Push only when required to trigger a remote scan workflow, expose a repo-local
  Phase C.5 repro to the runner, or provide another required remote workflow
  input. Do not push ordinary refinement, fixture, engine, docs, or status
  changes during the autonomous loop unless the user explicitly asks.

## Phase C.5 Loop Rules

Phase C.5 is an autonomous loop primitive. Any phase may request it when saved
site evidence cannot safely decide fixture noise, conditional state, or reusable
engine behavior.

The requester must record:

- mismatch family
- original target and compare windows
- exact uncertainty
- DOM/AX contract to preserve
- expected loop-back phase

For a recurring family, build one family matrix containing every affected
target, representative positive shapes, negative controls, and tail/guard
windows. Dispatch one diagnostic canary and one full scan for that matrix. A
single same-structure retry is allowed when the first full scan is insufficient;
do not start independent per-site C.5 scans for a family already covered by the
matrix.

The Phase C.5 result routes back to the original site workflow:

- `engine-gap-confirmed` -> Phase D
- `fixture-noise-confirmed` -> Phase B
- `conditional-state-confirmed` -> Phase B
- `insufficient-repro` -> refine the mini repro once, then return to Phase C
  with a blocker if it still fails

If fixing one site creates a mismatch in an existing refined or candidate page,
the orchestrator should run the relevant compare, classify the regression, and
trigger Phase C.5 when the previous logic needs a VoiceOver-backed check.

## Stop Rules

Autonomy stops for a target when any of these are true:

- Phase 0 cannot prove page access or VoiceOver health.
- Raw VoiceOver evidence appears inconsistent across scans and the difference
  is not explained by saved HTML/AX/snapshot evidence.
- Required artifacts are missing and cannot be regenerated.
- A fixture edit lacks an allowed reason and evidence pointers.
- A proposed scanner or engine change depends on site-specific selectors,
  class names, copy, or layout accidents.
- Phase C.5 cannot reproduce the disputed behavior after one focused revision.
- A reusable change regresses existing refined fixtures and the regression
  cannot be explained with evidence.
- Credentials, permissions, workflow availability, or artifact download access
  fail.

Use `blocked` or `scanner-fix-required` in state instead of silently moving the
target to `candidate`.

## Fallback Rules

Fallback exists to protect evidence quality, not to make the run easier. Before
setting `candidate`, `partial`, `blocked`, or `skipped`, the orchestrator must
confirm the target has:

- a current compare result
- a resource consistency check for each unresolved family: rendered HTML, AX
  tree, step snapshots, VoiceOver source/caption evidence, scan-debug data, and
  screenshots/recording when available
- a truncation check for every suspicious or incomplete VoiceOver line
- a Phase C.5 result, or a receipt-backed reason C.5 cannot answer the question
- a record of the generic engine/scanner fix attempted, or why any such fix
  would be unsafe or site-specific
- a revisit queue entry with owner, next action, blocker, and checks needed

Use these outcomes narrowly:

- `candidate`: evidence is useful, but one or more unresolved families still
  need a future C.5 scan, engine attempt, recapture, or regression review.
- `partial`: specific announcement ranges are trusted and useful, but other
  ranges are excluded because evidence is missing or unstable.
- `blocked`: progress depends on external state such as credentials, workflow
  availability, artifact access, page access, or a runner capability.
- `skipped`: the target is out of scope or evidence is irrecoverably broken,
  and the receipt explains why rescanning or C.5 cannot produce useful evidence.

Every fallback must preserve enough state for the next autonomous run to resume
at the first unresolved family. A fallback without a next action is invalid.

## Keeping The Loop Running

The orchestrator should treat the batch as a durable queue, not a single chat
turn. After each phase, update `state.json` with:

- current target state
- latest run id and artifact path
- latest phase receipt paths
- unresolved families and next owner
- whether a scan is already running for another site
- next action and resume command/prompt

When the active target pauses on a genuine fallback, immediately choose the next
queued or artifact-ready target if the blocker is target-specific. Do not wait
for a human unless all queued work is blocked, credentials/tools are missing, or
continuing would risk corrupting evidence.

For long-running batches, use a thread automation or scheduled continuation to
reopen the same thread only when there is external state to check, such as a
GitHub Actions scan, artifact upload, credentials recovery, or another remote
runner event. Prefer `wait_agent` for local subagent handoffs that should
continue immediately.

If a scan requires pushed files, create the smallest possible operational push:
stage only the repro or workflow input needed by the scan, record the reason in
state, and leave unrelated local refinement changes unpushed.

## Learning Ledger

Every reusable decision should append one JSON object to:

```text
voiceover-smoke/autonomous-runs/<batch-id>/learnings.jsonl
```

Use this shape:

```json
{
  "schemaVersion": 1,
  "date": "2026-06-29",
  "target": "example-com-page",
  "family": "generic wrapper group boundary",
  "trigger": "VoiceOver announced a parent group while the engine decomposed children",
  "evidence": {
    "siteRunId": "123",
    "c5RunId": "456",
    "fixture": "packages/sr-engine/tests/fixtures/voiceover/example.expected.json",
    "repro": "packages/sr-engine/tests/fixtures/voiceover-repros/example/group-boundary.html"
  },
  "decision": "engine-gap-confirmed",
  "engineRule": "Do not descend through a focusable named generic wrapper when AX exposes it as a standalone group.",
  "testsAdded": ["packages/sr-engine/tests/voiceover-repros.test.mjs"],
  "regressionsChecked": ["voiceover corpus"],
  "avoid": "Do not key on example.com class names.",
  "status": "encoded"
}
```

Promote durable, broadly useful learnings into:

```text
docs/status/voiceover-learnings.md
```

The Markdown rollup should stay short and point back to receipts, repro files,
tests, and engine changes. The JSONL is the detailed machine-readable log for
future agents.
