# Continue VoiceOver Workflow

Continue the VoiceOver multi-agent refinement workflow from the current status.

Read:

- `.codex/README.md`
- `.codex/context/repository-map.md`
- `.codex/context/coding-standards.md`
- `.codex/context/testing.md`
- `docs/workflows/voiceover-refinement.md`
- `docs/workflows/agent-receipts.md`
- `docs/status/voiceover-corpus-baseline.md`
- target-specific status docs in `docs/status/`
- `packages/sr-engine/tests/fixtures/voiceover/refinement-manifest.json`

This prompt requires a real multi-agent run. The repository scripts cannot
spawn Codex subagents. The top-level Codex session must spawn phase-specific
agents with the multi-agent tool and report their agent ids or nicknames.

Before any phase work for a target, create
`voiceover-smoke/agent-work/<run-id>/<target>/00-agent-preflight.json`. Record
required roles, available roles before/after tool discovery, missing roles,
decision, and spawned agent ids. If a required role is missing after discovery,
stop with `decision: "blocked"` unless the user explicitly asks for a degraded
run. Do not use `default` for a named phase in a normal multi-agent run.

Optional: spawn `orchestrator` only to produce the routing plan. Do not let the
orchestrator do all phase work by itself. A single orchestrator doing all work
is a multi-phase run, not a multi-agent run.

For each target, run every required phase:

- Spawn `intake` for Phase A only when fixture evidence has not been imported.
- Spawn `evidence-refiner` for Phase B for every candidate before judging. Treat the current refined output
  as an untrusted draft and verify disputed lines against HTML, AX, snapshots,
  captions/source evidence, and raw VoiceOver before approving or editing it.
  Preserve raw expectedAnnouncements as what VoiceOver heard; make
  refinedAnnouncements the initial rendered-html.html replay output. When
  step snapshots exist, require initialDomStatus for disputed lines:
  `initial-dom`, `step-only-dom`, `volatile-dom`, or `not-found`.
- Spawn `fixture-judge` for Phase C after evidence refinement.
- Spawn `repro-scanner` for Phase C.5 whenever Phase B/C marks a family as
  uncertain, truncation-prone, conditional-state-dependent, scanner-evidence,
  ambiguous, or too broad to safely turn into a reusable engine rule from the
  full page alone. The repro-scanner must create a same-structure minimal HTML
  example, trigger/import a focused VoiceOver scan, and hand the result back to
  evidence-refiner, fixture-judge, or engine-refiner.
- Spawn `engine-refiner` for Phase D only when a trusted `initial-dom`
  mismatch proves a reusable engine or scanner gap, or Phase C.5 concludes
  `engine-gap-confirmed`. Phase D may also request Phase C.5 when an engine
  rule needs isolated same-structure VoiceOver confirmation before it is safe
  to implement.
- Spawn `promoter` for Phase E after compare and tests pass, or when status/docs must record candidate/partial/skip.

Each spawned phase agent must produce the receipt defined in
`docs/workflows/agent-receipts.md`. If a phase is skipped, the top-level
session must record the evidence-backed skip reason in its final summary and in
the prior phase handoff receipt.

Before Phase E promotion, run
`yarn voiceover:validate-agent-workflow voiceover-smoke/agent-work/<run-id>/<target> --required-phases <actual-phases>`
and record the result in `06-promotion.json`. A failed validation blocks
`refined` promotion until the missing named phase is rerun or the workflow is
explicitly recorded as degraded.

For structural mismatches where VoiceOver announces one grouped/card object but
the engine emits child announcements, require the focused-node evidence packet
from Phase B before judging or skipping engine refinement.

For text split/join mismatches, require the Phase B text-boundary evidence
packet before judging or skipping engine refinement.

Do not ask the user to manually confirm local VoiceOver behavior when a minimal
same-structure reproduction scan can decide the issue.

Keep fixture purity visible. Raw VoiceOver output is append-only scan evidence,
and every refined output edit must have fixtureChanges receipt coverage. When
the user asks for a push and fixture files changed, Phase E must run the fixture
push review and block fixture-heavy changes that are not evidence-backed.

Do not stop after preprocessing. Do not move to the next site until the current site has a recorded outcome.
