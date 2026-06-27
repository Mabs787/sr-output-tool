# Refine Single Target

Refine only the target named by the user.

Read:

- `docs/workflows/voiceover-refinement.md`
- the relevant phase docs in `docs/workflows/`
- `docs/status/voiceover-corpus-baseline.md`
- the relevant target status document in `docs/status/`
- `packages/sr-engine/tests/fixtures/voiceover/refinement-manifest.json`

Run the target through the required phases. For preprocessed targets, start at Phase B.

In Phase B, do not take existing refined output as truth. Verify disputed lines
against HTML, AX, snapshots, captions/source evidence, and raw VoiceOver before
approving or editing them.

For structural mismatches, especially when VoiceOver announces one grouped/card
object but the engine emits child announcements, require a focused-node evidence
packet before judging the gap: active element tag/id, `tabindex`, role/ARIA,
child HTML shape, AX or computed name, focusable/focused state, and whether the
name represents the whole object. Use that packet in Phase C/D to decide whether
a reusable scanner/engine fix is possible.

Do not modify unrelated fixtures. Do not move to another target.
