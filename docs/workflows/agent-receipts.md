# Agent Receipts

Every phase agent must write a machine-readable receipt under:

```text
voiceover-smoke/agent-work/<run-id>/<target>/
```

Receipts must be valid JSON and must include these common fields:

- `schemaVersion`: `1`
- `phase`: `A`, `B`, `C`, `C.5`, `D`, or `E`
- `agent`: agent role name
- `agentConfigPath`: `.codex/agents/<role>.toml`
- `spawnedBy`: `top-level-codex`, `orchestrator`, or `manual`
- `sessionId`: subagent id when a Codex subagent was spawned, otherwise empty
- `target`: fixture or target name
- `runId`: workflow run id, artifact run id, or `local`
- `status`: `passed`, `skipped`, `returned`, `blocked`, or `failed`
- `startedAt` and `finishedAt`: ISO timestamps when available
- `inputs`: files, artifact paths, run ids, and commands used
- `decisions`: concrete decisions made by the phase
- `evidence`: HTML, AX, snapshot, source, compare, and test evidence consulted
- `nextPhase`: next phase role name, `complete`, or `stop`
- `handoffReason`: why the next phase should run or why the target stops
- `handoffFrom`: previous phase or empty for Phase A
- `handoffTo`: next phase role or `complete`

Do not use `uncertain` as a terminal status. If uncertainty remains, use
`returned` with the exact missing evidence or required prior phase. Use
`skipped` only with an evidence-backed `handoffReason`.

For a real multi-agent run, `sessionId` must be populated for every phase that
was executed by a spawned subagent. Generated or coordinator-only receipts must
set `spawnedBy` to `manual` and must not be used as proof that a multi-agent
run occurred.

## Phase Minimums

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

`04-fixture-judge.json` must include:

- compare command and summary counts
- one entry per mismatch family
- classification: `fixture-still-noisy`, `reusable-engine-gap`,
  `dynamic-state-mismatch`, `scanner-evidence-gap`, or `ambiguous`
- evidence for the classification
- confirmation that mismatch-relevant lines in `refinedAnnouncements` are
  replayable from the initial `rendered-html.html`, or the Phase B
  `initialDomStatus` reason for returning them
- whether Phase C.5 is required before fixture edits, ambiguity labels, or
  broad engine changes
- whether Phase D should run

`04-minimal-reproduction-scan.json` must include:

- mismatch family and source fixture/window indexes
- original expected/refined/actual snippets
- why the saved site evidence was insufficient
- reproduction HTML path or URL
- preserved DOM contract checklist
- scan workflow command, run id, and artifact path
- mini raw VoiceOver output
- mini rendered HTML, AX, and step-snapshot evidence summary
- mini engine output
- conclusion: `engine-gap-confirmed`, `fixture-noise-confirmed`,
  `conditional-state-confirmed`, or `insufficient-repro`
- next phase and handoff reason

`05-engine-refinement.json` must include:

- mismatch family selected
- files changed
- generic predicate or behavior rule implemented
- tests and compares run
- before/after compare counts
- unresolved mismatch families and why

`06-promotion.json` must include:

- final fixture status: `refined`, `partial`, `candidate`, or `skip`
- compare/test evidence
- manifest and docs changed
- commit/push status when requested
