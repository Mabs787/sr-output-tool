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
- `repro-scanner` for Phase C.5 when uncertainty can be resolved by a
  same-structure minimal VoiceOver scan
- `engine-refiner` for Phase D when Phase C finds a reusable gap
- `promoter` for Phase E when status/docs/promotion are needed

Each phase agent must write the receipt defined in
`docs/workflows/agent-receipts.md`, including `sessionId` for spawned agents.

In Phase B, do not take existing refined output as truth. Verify disputed lines
against HTML, AX, snapshots, captions/source evidence, and raw VoiceOver before
approving or editing them.

Preserve raw `expectedAnnouncements` as what VoiceOver heard. Build
`refinedAnnouncements` as the output for the initial `rendered-html.html`
fixture only. When step snapshots are present, use `htmlAfterStep.fingerprint`,
`stats`, `htmlExcerpt`, `bodyTextExcerpt`, active element text, and matched
DOM/AX evidence to decide whether each disputed line is `initial-dom`,
`step-only-dom`, `volatile-dom`, or `not-found`.

Remove or normalize `step-only-dom` and `volatile-dom` lines from
`refinedAnnouncements` unless the same semantic content is present and
replayable in the initial rendered HTML. Do not send those removed raw-only
lines to engine refinement.

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

When saved evidence still leaves doubt, do not fall back to manual user
confirmation. Route the family to Phase C.5. The repro-scanner must preserve the
same accessibility-relevant DOM structure and attributes in a small page, run a
focused VoiceOver scan, and use that mini artifact to decide whether the issue
is an engine gap, fixture noise, conditional state, or an insufficient repro.

Do not modify unrelated fixtures. Do not move to another target.
