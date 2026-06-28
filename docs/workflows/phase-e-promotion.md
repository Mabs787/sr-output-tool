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

Use one of these exact machine enum values in `06-promotion.json`:

- `refined`
- `partial`
- `candidate`
- `skip`

## Decision Fields

`06-promotion.json` must include:

- `promotionDecision`
- `exactMatch`: boolean
- `trustedSlices`: array of announcement ranges or named slices for `partial`
- `remainingMismatchFamilies`
- `revisitQueue`: array of unresolved families with next owner, next action, evidence needed, and checks needed
- `blockers`
- `manifestChanges`
- `statusDocsUpdated`
- `checks`: commands with status, exit code, summary, and skip reason

Only use `refined` when `exactMatch` is true, Phase B trusted the fixture, and
required checks passed. Use `partial` only when `trustedSlices` identifies the
reliable ranges and `remainingMismatchFamilies` records what is excluded.

When the promotion decision is `candidate` or `partial`, do not leave the
remaining mismatch list as a dead end. Update the target status doc and
`06-promotion.json` with a revisit queue. Each queue entry must name the family,
the latest compare window indexes, the current actual/expected shape, the next
recommended phase owner, and the concrete action needed before the target can be
promoted. If a family is blocked, record the missing evidence or rejected
prototype and the check that should be rerun after it is addressed.

Commit and push the target's changes before starting the next target when the user has asked for a commit-based workflow.
