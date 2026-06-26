# Phase E: Promotion

Run this phase after compare and required tests pass, or after a documented blocker decides the target should remain candidate, partial, or skip.

## Agent

Use `.codex/agents/promoter.toml`.

## Update

- `packages/sr-engine/tests/fixtures/voiceover/refinement-manifest.json`
- `docs/status/voiceover-corpus-baseline.md`
- target-specific status docs in `docs/status/`
- `voiceover-smoke/agent-work/<run-id>/<target>/06-promotion.json`

## Classes

- `refined`: trusted full-page fixture and exact engine match.
- `partial`: reliable slices only; document the slices.
- `candidate`: useful evidence remains, but exact behavior is unresolved.
- `skip`: evidence is too broken or irrelevant.

Commit and push the target's changes before starting the next target when the user has asked for a commit-based workflow.

