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

Use the orchestrator agent. For each target, run every required phase:

- Phase A only when fixture evidence has not been imported.
- Phase B for every candidate before judging.
- Phase C after evidence refinement.
- Phase D only when a trusted mismatch proves a reusable engine or scanner gap.
- Phase E after compare and tests pass.

Do not stop after preprocessing. Do not move to the next site until the current site has a recorded outcome.

