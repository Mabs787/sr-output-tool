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

Optional: spawn `orchestrator` only to produce the routing plan. Do not let the
orchestrator do all phase work by itself. A single orchestrator doing all work
is a multi-phase run, not a multi-agent run.

For each target, run every required phase:

- Spawn `intake` for Phase A only when fixture evidence has not been imported.
- Spawn `evidence-refiner` for Phase B for every candidate before judging. Treat the current refined output
  as an untrusted draft and verify disputed lines against HTML, AX, snapshots,
  captions/source evidence, and raw VoiceOver before approving or editing it.
- Spawn `fixture-judge` for Phase C after evidence refinement.
- Spawn `engine-refiner` for Phase D only when a trusted mismatch proves a reusable engine or scanner gap.
- Spawn `promoter` for Phase E after compare and tests pass, or when status/docs must record candidate/partial/skip.

Each spawned phase agent must produce the receipt defined in
`docs/workflows/agent-receipts.md`. If a phase is skipped, the top-level
session must record the evidence-backed skip reason in its final summary and in
the prior phase handoff receipt.

For structural mismatches where VoiceOver announces one grouped/card object but
the engine emits child announcements, require the focused-node evidence packet
from Phase B before judging or skipping engine refinement.

For text split/join mismatches, require the Phase B text-boundary evidence
packet before judging or skipping engine refinement.

Do not stop after preprocessing. Do not move to the next site until the current site has a recorded outcome.
