# Refine Single Target

Refine only the target named by the user.

Read:

- `docs/workflows/voiceover-refinement.md`
- `docs/workflows/agent-receipts.md`
- the relevant phase docs in `docs/workflows/`
- `docs/status/voiceover-corpus-baseline.md`
- the relevant target status document in `docs/status/`
- `packages/sr-engine/tests/fixtures/voiceover/refinement-manifest.json`

Run the target through the required phases. For preprocessed targets, start at Phase B.

If the user asks for a multi-agent run, the top-level Codex session must spawn
separate phase agents with the multi-agent tool and report their agent ids or
nicknames. Do not let a single orchestrator or the top-level session perform
all phases and call it multi-agent.

Use these phase agents for actual phase work:

- `intake` for Phase A when import/preprocessing is needed
- `evidence-refiner` for Phase B
- `fixture-judge` for Phase C
- `engine-refiner` for Phase D when Phase C finds a reusable gap
- `promoter` for Phase E when status/docs/promotion are needed

Each phase agent must write the receipt defined in
`docs/workflows/agent-receipts.md`, including `sessionId` for spawned agents.

In Phase B, do not take existing refined output as truth. Verify disputed lines
against HTML, AX, snapshots, captions/source evidence, and raw VoiceOver before
approving or editing them.

For text split/join mismatches, require a text-boundary evidence packet before
judging the gap: relevant `outerHTML`, inline emphasis (`strong`, `b`, `em`,
`i`), `br`, block/span/markdown fragments, list markers, hidden text, and
text-node boundaries.

For structural mismatches, especially when VoiceOver announces one grouped/card
object but the engine emits child announcements, require a focused-node evidence
packet before judging the gap: active element tag/id, `tabindex`, role/ARIA,
child HTML shape, AX or computed name, focusable/focused state, and whether the
name represents the whole object. Use that packet in Phase C/D to decide whether
a reusable scanner/engine fix is possible.

Do not modify unrelated fixtures. Do not move to another target.
