# Phase B: Evidence Refinement

Run this phase for every candidate before fixture judging or engine refinement.

The current `refinedAnnouncements` / refined output is an untrusted Phase A
draft until this phase verifies it against the site evidence.

## Agent

Use `.codex/agents/evidence-refiner.toml`.

## Required Evidence

- raw `expectedAnnouncements`
- current `refinedAnnouncements`
- rendered HTML
- AX tree
- step snapshots around disputed steps, including `htmlAfterStep` when present
- VoiceOver source/caption evidence
- current engine comparison

## Steps

For each suspicious announcement:

1. Treat the current refined line as a hypothesis, not truth.
2. Compare raw VoiceOver, rendered HTML, AX nodes, step snapshots, and source/caption evidence for that step or nearby content.
3. For any VoiceOver line that is present in `htmlAfterStep` but absent from the initial `rendered-html.html`, classify the line as conditional scan state unless the initial fixture HTML also contains the same semantic content. Remove or normalize hover-only, focus-only, carousel-advanced, timer-mutated, or otherwise step-time-only content from `refinedAnnouncements` because the engine fixture replays the initial DOM.
4. For any text split/join mismatch, check whether the split aligns with DOM text boundaries before calling it OCR/caption noise:
   - inline emphasis boundaries: `strong`, `b`, `em`, `i`
   - explicit line or block boundaries: `br`, `p`, `div`, `span`, list marker text, or markdown-rendered fragments
   - hidden/offscreen or visually-hidden text near the disputed words
   - text-node boundaries inside the focused element's direct/relevant `outerHTML`
5. For structural mismatches where VoiceOver announces one object but the engine decomposes children, build a focused-node contract before deciding:
   - focused/active DOM node tag, `data-sr-dom-node-id`, `tabindex`, role, ARIA attributes, and direct/relevant `outerHTML`
   - child shape: headings, paragraphs, links, images, buttons, lists, inline emphasis, explicit line breaks, and visible text blocks
   - AX or step-snapshot role, name, focusable/focused state, level, and position/set metadata when available
   - whether the focused node's computed/AX name equals the whole announced card/group text, or only a child fragment
6. Decide whether the raw VoiceOver output is plausible and evidence-backed.
7. Preserve surprising output when evidence supports it and it is replayable from the initial fixture DOM.
8. Repair `refinedAnnouncements` when the draft refined output is contradicted by stronger site evidence, or when the evidence proves capture noise or conditional step-only state.
9. Before leaving any line uncertain, test the likely explanations against the evidence: hidden/offscreen capture state, ARIA controller state, missing descendants, focus target drift, dynamic page state, DOM text-boundary segmentation, text-boundary normalization, scanner traversal, and `htmlAfterStep` versus initial DOM divergence.
10. Record every approval, edit, or uncertainty with the evidence used.

## Evidence Packet

Every disputed line must have a receipt entry with:

- announcement index or range
- raw `expectedAnnouncements` text
- current `refinedAnnouncements` text
- HTML lookup summary
- AX lookup summary
- step snapshot or VoiceOver source/caption summary
- `htmlAfterStep` versus initial `rendered-html.html` comparison for content that may be hover/focus/dynamic-step-only state
- text-boundary lookup for text split/join disputes: the relevant `outerHTML`, inline children, text-node/`br`/block boundaries, and whether the expected split follows those boundaries
- focused-node contract for structural/decomposition disputes, including focusability and computed/AX name evidence when available
- decision: `approved`, `edited`, or `uncertain`
- confidence and reason
- plausible causes checked, with the missing evidence that prevents a firmer decision when the line remains uncertain

## Output

- updated fixture JSON when edits are needed
- `03-evidence-refinement.json`
- remaining uncertain announcements, if any

Do not approve the refined output simply because it already exists. Do not
reshape valid VoiceOver output to match the current engine.

Do not classify a one-object VoiceOver announcement versus multi-child engine
output as broad structural drift until the focused-node contract has been
checked. If the focused node is focusable and its AX/computed name contains the
whole card/group text, preserve that VoiceOver announcement and flag the case
for Phase C/D scanner-stop or grouping analysis.
