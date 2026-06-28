# Investigate Engine Gap

Investigate a trusted VoiceOver fixture mismatch as a possible reusable engine or scanner gap.

Read:

- `.codex/context/coding-standards.md`
- `.codex/context/testing.md`
- `.codex/knowledge/common-engine-gaps.md`
- `docs/workflows/phase-d-engine-refinement.md`

Use the engine-refiner agent.

Change reusable engine logic only when the refined fixture is trusted and the mismatch is not fixture noise, dynamic state, scanner evidence loss, or ambiguity.

If the trusted behavior is still doubtful, caption/source text may be
truncated, or the proposed fix would be broad based on one complex page, run or
request Phase C.5 first. Use a same-structure minimal reproduction VoiceOver
scan to confirm `engine-gap-confirmed` before changing engine logic.

For text split/join gaps, inspect the Phase B text-boundary evidence packet
before deciding. If the expected VoiceOver split follows generic DOM boundaries
such as inline emphasis, `br`, block/span/markdown fragments, list markers,
hidden text, or text nodes, try a narrow reusable scanner/announcement rule.
