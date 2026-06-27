# Continue VoiceOver Workflow

Continue the VoiceOver multi-agent refinement workflow from the current status.

Read:

- `.codex/README.md`
- `.codex/context/repository-map.md`
- `.codex/context/coding-standards.md`
- `.codex/context/testing.md`
- `docs/workflows/voiceover-refinement.md`
- `docs/status/voiceover-corpus-baseline.md`
- target-specific status docs in `docs/status/`
- `packages/sr-engine/tests/fixtures/voiceover/refinement-manifest.json`

Use the orchestrator agent to coordinate, but the top-level Codex session must
verify that the phase agents are actually spawned. A single orchestrator doing
all work itself is a multi-phase run, not a multi-agent run.

For each target, run every required phase:

- Phase A only when fixture evidence has not been imported.
- Phase B for every candidate before judging. Treat the current refined output
  as an untrusted draft and verify disputed lines against HTML, AX, snapshots,
  captions/source evidence, and raw VoiceOver before approving or editing it.
- Phase C after evidence refinement.
- Phase D only when a trusted mismatch proves a reusable engine or scanner gap.
- Phase E after compare and tests pass.

For structural mismatches where VoiceOver announces one grouped/card object but
the engine emits child announcements, require the focused-node evidence packet
from Phase B before judging or skipping engine refinement.

For text split/join mismatches, require the Phase B text-boundary evidence
packet before judging or skipping engine refinement.

Do not stop after preprocessing. Do not move to the next site until the current site has a recorded outcome.
