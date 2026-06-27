# VoiceOver Refinement Workflow

This is the canonical workflow for live-site Chrome + VoiceOver corpus refinement.

The goal is to turn scan artifacts into trusted `refinedAnnouncements`, then use those fully processed fixtures to improve reusable engine behavior. Preprocessing alone is not refinement.

## Required Phases

1. [Phase A: Intake](phase-a-intake.md)
2. [Phase B: Evidence Refinement](phase-b-evidence-refinement.md)
3. [Phase C: Fixture Judge](phase-c-fixture-judge.md)
4. [Phase D: Engine Refinement](phase-d-engine-refinement.md)
5. [Phase E: Promotion](phase-e-promotion.md)

## Agent Routing

Project-scoped subagents live in `.codex/agents/`.

- `orchestrator`: coordinates phases, handoffs, and target order.
- `intake`: Phase A artifact intake and preprocessing.
- `evidence-refiner`: Phase B source-of-truth `refinedAnnouncements` review.
- `fixture-judge`: Phase C mismatch classification.
- `engine-refiner`: Phase D reusable engine/scanner changes.
- `promoter`: Phase E manifest, docs, status, and final receipts.

Keep model choices in `.codex/agents/*.toml`. Keep behavior and handoffs in these workflow docs.

## Non-Negotiable Rules

- VoiceOver output is the primary evidence. The current engine is not a source of truth.
- `voiceover:refine-artifact` is Phase A preprocessing only.
- A fixture is not refined just because `refinedAnnouncements` exists.
- Evidence refinement must treat `refinedAnnouncements` as an untrusted draft,
  inspect it against HTML, AX, snapshots, and VoiceOver source evidence, and
  edit it directly when the draft is wrong.
- Structural VoiceOver-vs-engine mismatches must include a focused-node
  contract before they are dismissed as broad or ambiguous. In particular,
  when VoiceOver announces one grouped/card object and the engine decomposes
  children, inspect the active element, focusability, AX/computed name, child
  HTML shape, and scanner descent behavior.
- Text split/join mismatches must include a text-boundary check before they are
  dismissed as OCR noise or flakiness. Inspect the relevant `outerHTML` for
  inline emphasis, `br`, block/span/markdown fragments, list markers, hidden
  text, and text-node boundaries.
- Use rendered HTML, AX tree, step snapshots, and VoiceOver source evidence to repair clear scan/caption/OCR/truncation noise.
- If refined output is trusted and the engine differs, change reusable engine logic unless there is a documented blocker.
- Do not add site-specific engine logic.
- Do not move to the next site until the current site has a recorded outcome.

## Receipts

Each phase must leave a machine-readable receipt under:

```text
voiceover-smoke/agent-work/<run-id>/<target>/
  01-intake.json
  02-preprocess.json
  03-evidence-refinement.json
  04-fixture-judge.json
  05-engine-refinement.json
  06-promotion.json
  notes.md
```

These files are ignored scratch output. Checked-in source of truth remains in:

- `packages/sr-engine/tests/fixtures/voiceover/`
- `packages/sr-engine/tests/fixtures/voiceover/refinement-manifest.json`
- `docs/status/voiceover-corpus-baseline.md`
- target-specific status docs in `docs/status/`

## Fresh Chat Entry

Use `.codex/prompts/continue-workflow.md` to resume the whole workflow.
Use `.codex/prompts/refine-target.md` to process one named target only.
