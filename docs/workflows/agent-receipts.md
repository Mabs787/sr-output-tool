# Agent Receipts

Every phase agent must write a machine-readable receipt under:

```text
voiceover-smoke/agent-work/<run-id>/<target>/
```

Every multi-agent run must also include a preflight receipt before phase work:

```text
voiceover-smoke/agent-work/<run-id>/<target>/00-agent-preflight.json
```

Multi-target runs may instead use one shared run-level preflight:

```text
voiceover-smoke/agent-work/<run-id>/_summaries/00-agent-preflight.json
```

Target phase receipts covered by a shared preflight must include
`agentPreflightRef` or `sharedPreflightRef`, usually
`../_summaries/00-agent-preflight.json`, so validators and future agents can
prove which spawned-agent registry applied to that target.

`00-agent-preflight.json` must include:

- `schemaVersion`: `1`
- `phase`: `preflight`
- `target`
- `runId`
- `requiredRoles`: named roles needed for the requested workflow
- `availableRolesBeforeDiscovery`: roles initially exposed by the multi-agent
  tool registry
- `discoveryAttempted`: boolean
- `availableRolesAfterDiscovery`: roles exposed after tool discovery, if any
- `missingRolesAfterDiscovery`: required roles still unavailable
- `decision`: `ready`, `blocked`, or `degraded`
- `degradedReason`: empty unless `decision` is `degraded`
- `spawnedAgents`: array of `{ phase, agentType, sessionId, nickname,
  agentConfigPath }`
- `blockedReason`: empty unless `decision` is `blocked`
- `startedAt` and `finishedAt`: ISO timestamps when available

New refinement runs may opt into stricter validator-backed run contracts while
remaining backward-compatible with older receipts:

- `contractVersion`: `2` requires `requiredRunChecks` to include
  `phase-b-ocr-glyph-sweep`
- `contractVersion`: `3` requires `requiredRunChecks` to include
  `phase-b-ocr-glyph-sweep`, `phase-05-shell-families`,
  `recapture-accounting`, `stable-candidate-references`,
  `structural-evidence-packets`, `c5-fixture-path-diagnostics`, and
  `final-run-metrics`

When a contract declares `phase-b-ocr-glyph-sweep`, include this run-level
summary next to the shared preflight:

```text
voiceover-smoke/agent-work/<run-id>/_summaries/phase-b-ocr-glyph-sweep.json
```

`phase-b-ocr-glyph-sweep.json` must include:

- `schemaVersion`: `1`
- `phase`: `B-ocr-glyph-sweep`
- `agent`: `evidence-refiner`
- `agentConfigPath`: `.codex/agents/evidence-refiner.toml`
- `sessionId`: non-empty evidence-refiner session id
- `runId`: non-empty run id
- `status`: `passed`
- `rawExpectedAnnouncementsPreserved`: `true`
- `unreviewedCandidateCount`: `0`
- `remainingSuspiciousLiteralCandidateCount`: `0`
- `rows`: one object per target, including `target` and
  `scanStatus: "complete"`

The sweep covers all final `refinedAnnouncements`, all text and punctuation
compare windows, and every OCR/caption/glyph candidate against initial
`rendered-html.html` and AX evidence. Raw `expectedAnnouncements` must remain
unchanged; C.5 is reserved for cases where saved evidence disagrees or cannot
settle the OCR/glyph question.

New scan artifacts must also include a scan-health receipt before Phase A:

```text
voiceover-smoke/agent-work/<run-id>/<target>/00-scan-health.json
```

See `docs/workflows/phase-0-scan-health.md` for the full schema. Phase A must
not import a newly downloaded artifact unless Phase 0 passed or explicitly
returned accepted `partial-evidence`.

Receipts must be valid JSON and must include these common fields:

- `schemaVersion`: `1`
- `phase`: `0`, `A`, `B`, `C`, `C.5`, `D`, or `E`
- `agent`: agent role name
- `agentConfigPath`: `.codex/agents/<role>.toml`
- `spawnedBy`: `top-level-codex`, `orchestrator`, or `manual`
- `sessionId`: subagent id when a Codex subagent was spawned, otherwise empty
- `target`: fixture or target name
- `runId`: workflow run id, artifact run id, or `local`
- `status`: `passed`, `skipped`, `returned`, `blocked`, or `failed`.
  Phase-specific docs may define additional statuses, such as Phase 0
  `retry-required`, `scanner-fix-required`, and `partial-evidence`.
- `startedAt` and `finishedAt`: ISO timestamps when available
- `inputs`: files, artifact paths, run ids, and commands used
- `decisions`: concrete decisions made by the phase
- `evidence`: HTML, AX, snapshot, source, compare, and test evidence consulted
- `fixtureChanges`: fixture edits made or proposed by the phase. Use an empty
  array when none were made.
- `nextPhase`: next phase role name, `complete`, or `stop`
- `handoffReason`: why the next phase should run or why the target stops
- `handoffFrom`: previous phase or empty for Phase 0/A
- `handoffTo`: next phase role or `complete`
- `agentPreflightRef` or `sharedPreflightRef`: optional reference to the
  run-level `00-agent-preflight.json` when the target directory does not carry
  its own preflight
- `nextRecommendedWorker`: a compact machine-readable handoff block when more
  work is expected:

```json
{
  "type": "fixture-judge",
  "scope": "Classify only footer-punctuation-tail",
  "c5Needed": false,
  "reason": "Latest compare leaves one trusted initial-DOM family"
}
```

Use `type: "none"` when the target is complete or intentionally parked. Keep
`scope` narrow enough that the next worker can start without inferring ownership
from narrative text.

Do not use `uncertain` as a terminal status. If uncertainty remains, use
`returned` with the exact missing evidence or required prior phase. Use
`skipped` only with an evidence-backed `handoffReason`.

For a real multi-agent run, `sessionId` must be populated for every phase that
was executed by a spawned subagent. Generated or coordinator-only receipts must
set `spawnedBy` to `manual` and must not be used as proof that a multi-agent
run occurred.

`default` is not a valid `agent` for a named phase receipt. If the named role is
missing from the tool registry, record the missing role in
`00-agent-preflight.json` and stop or mark the run `degraded` with explicit user
approval. A degraded run cannot promote a fixture to `refined`.

## Stable Candidate References

Any receipt that points to an announcement candidate after Phase B starts must
use `candidateRef`, not an index alone:

```json
{
  "candidateId": "www-example-com:text-boundary:4f33d2c1",
  "sourceIndex": 214,
  "currentRefinedIndex": 215,
  "rawTextSha256": "...",
  "refinedTextSha256": "...",
  "previousTextSha256": "...",
  "nextTextSha256": "...",
  "domNodeIds": ["768"],
  "htmlSnippetSha256": "...",
  "axRoleNameSha256": "...",
  "family": "text-boundary",
  "compareWindowId": "window-17",
  "resolution": "remapped"
}
```

Valid `resolution` values are `matched`, `remapped`, and `stale-reference`.
`stale-reference` blocks the edit until the evidence packet is rebuilt.

## Structural Evidence Packets

Structural mismatch receipts must include `structuralEvidencePacket` with the
focused DOM node, outerHTML hash, semantic ancestor chain, sibling summary,
matched AX role/name/state/position, VoiceOver step/source pointer, screenshot
pointer when visual state matters, compare window, and `completeness`.
`engine-ready` requires `completeness: "complete"`.

## Run Metrics

Final run summaries must report these separately:

- reviewed candidate count
- applied fixture-repair count
- rejected candidate count
- mismatch windows before and after fixture repair
- mismatch windows before and after engine work
- exact, actionable, conditional, parked, and recapture-only totals

Do not imply that one repair equals one mismatch window. Window alignment can
group several repairs or remain unchanged after an evidence-correct edit.

## Recapture Queue Receipts

`_summaries/recapture-queue.json` contains one stable `recaptureId` entry per
invalid target capture. Each entry records failed and replacement run ids,
failure category, missing evidence, retry settings, owner, next action, status,
and the skipped A/B plus recapture-only C/E receipt paths used for complete run
accounting.

## Fixture Change Entries

Whenever `refinedAnnouncements`, fixture HTML, fixture AX, manifest metadata, or
status docs are edited, the responsible receipt must include one
`fixtureChanges` entry per logical change:

- `file`
- `field`: for example `refinedAnnouncements`, `expectedAnnouncements`,
  `html`, `ax`, `manifest`, or `status-doc`
- `range` or `indexes`
- `before`
- `after`
- `reason`: `caption-or-ocr-repair`, `truncation-repair`,
  `conditional-state-removed`, `saved-live-dom-divergence`,
  `manual-vo-confirmed`, `minimal-repro-confirmed`, `preprocess-correction`,
  or `status-only`
- `evidencePointers`: artifact id, step id, HTML/AX snippets, source/caption
  references, mini-scan run id, local-VO note, compare window, or status source
- `confidence`: `high`, `medium`, or `low`
- `engineGapStillOpen`: boolean
- `approvedByPhase`: `B`, `C.5`, `E`, or `manual`

Fixture-change coverage may also include hunk-level identity fields when one
logical insert, delete, or replacement shifts later indexes:

- `logicalHunkId`
- `candidateRefs`: stable candidate refs covered by the hunk
- `beforeRange` and `afterRange`
- `sequenceBeforeSha256` and `sequenceAfterSha256`
- `indexShift`: signed integer when known

Coverage audits must resolve shifted ranges through stable `candidateRef`
anchors before declaring uncovered refined-output edits. Downstream per-index
diffs caused only by a covered insertion or deletion are not independent
fixture changes.

Raw VoiceOver scan output must not be hand-edited. If a receipt contains a
fixture change with `field: "expectedAnnouncements"`, it must be an import from
a named scan artifact or the run must stop before push.

## Phase Minimums

`00-scan-health.json` must include:

- artifact source, target URL/path, final URL/path, and artifact file list
- scan options and debug options used
- page access result
- page identity: intended URL/path, final URL/path, title or route marker,
  canonical URL when present, marker text checked, and whether it matches the
  intended target
- VoiceOver health checks, including non-empty output, start marker, end marker
  or step-cap reason, repeated-output check, and browser-chrome check
- popup/interstitial handling evidence
- screenshot, recording, source, scan-debug, and step-snapshot evidence
  inspected when relevant
- decision: `passed`, `retry-required`, `scanner-fix-required`, `blocked`, or
  `partial-evidence`
- next action and handoff target

`01-intake.json` must include:

- artifact source and target list
- imported files
- missing evidence, if any
- preprocessing command and result

`02-preprocess.json` must include:

- fixture files written
- raw and refined announcement counts
- whether step snapshots were imported
- draft status and why it is not trusted yet

`03-evidence-refinement.json` must include:

- one entry per disputed announcement or range
- raw, draft refined, and final refined text
- initial `rendered-html.html` lookup
- `htmlAfterStep` lookup when conditional state is possible, including
  `fingerprint`, relevant `stats`, `htmlExcerpt`/`bodyTextExcerpt` snippets,
  active element text, and matched DOM/AX evidence used
- `initialDomStatus`: `initial-dom`, `step-only-dom`, `volatile-dom`, or
  `not-found`
- AX and source/caption lookup
- text-boundary lookup for split/join disputes
- focused-node contract for structural/decomposition disputes
- decision: `approved`, `edited`, or `returned`
- confidence and evidence-backed reason
- fixture change entries for every refined output edit

`04-fixture-judge.json` must include:

- compare command and summary counts
- one entry per mismatch family
- classification: `fixture-still-noisy`, `reusable-engine-gap`,
  `dynamic-state-mismatch`, `scanner-evidence-gap`, or `ambiguous`
- disposition: `resolved`, `fixture-ready`, `engine-ready`, `recapture-only`,
  `conditional-state-blocked`, or `parked-with-evidence`
- evidence for the classification
- resource consistency check for each mismatch family: rendered HTML, AX tree,
  step snapshots, source/caption evidence, scan-debug data, and
  screenshots/recording when available
- truncation check for every suspicious or incomplete VoiceOver line
- confirmation that mismatch-relevant lines in `refinedAnnouncements` are
  replayable from the initial `rendered-html.html`, or the Phase B
  `initialDomStatus` reason for returning them
- whether Phase C.5 is required before fixture edits, ambiguity labels, or
  broad engine changes
- whether Phase D should run

`04-minimal-reproduction-scan.json` must include:

- mismatch family and source fixture/window indexes
- original site target and requesting phase
- original expected/refined/actual snippets
- why the saved site evidence was insufficient
- reproduction HTML path or URL
- preserved DOM contract checklist
- original AX contract copied into the reproduction, including source node ids
  and relevant role/name/state/table/list/focusability values
- content-shortening notes, including why shortened text cannot affect the
  tested behavior or why long text had to be preserved
- omitted page context and why it was safe to omit
- scan workflow command, run id, and artifact path
- wait/poll timeline, including the first 5-minute wait, subsequent 1-minute
  polls, final run status, and artifact completeness
- mini raw VoiceOver output
- mini rendered HTML, AX, and step-snapshot evidence summary
- mini engine output
- conclusion: `engine-gap-confirmed`, `fixture-noise-confirmed`,
  `conditional-state-confirmed`, `insufficient-repro`, or
  `debug-evidence-missing`
- recurring repro family path under
  `packages/sr-engine/tests/fixtures/voiceover-repros/_families/<family>.html`
- canary scan or compare evidence showing the reproduction fixture still
  exercises the intended family before it is used to justify Phase D
- loop-back target phase and handoff reason for the original site workflow

`05-engine-refinement.json` must include:

- mismatch family selected
- files changed
- generic predicate or behavior rule implemented
- tests and compares run
- before/after compare counts
- unresolved mismatch families and why
- empty `fixtureChanges`, unless the phase returned a fixture evidence problem
  without editing files

`06-promotion.json` must include:

- final fixture status: `refined`, `partial`, `candidate`, or `skip`
- compare/test evidence
- manifest and docs changed
- agent workflow validation command and result
- fallback review for any non-`refined` or non-zero-mismatch result: resource
  checks completed, C.5 result or impossibility reason, generic engine attempt
  or unsafe reason, blocker, next owner, next action, and checks needed
- commit/push status when requested
- fixture push review: changed fixture files, raw-output edit check, receipt
  coverage for refined-output changes, mixed engine/fixture warning, and final
  push decision
