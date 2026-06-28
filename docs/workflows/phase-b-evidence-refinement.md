# Phase B: Evidence Refinement

Run this phase for every candidate before fixture judging or engine refinement.
When rerunning a target, start by reading the latest target status doc and prior
Phase D/E revisit queue, then reconcile each queued family against the current
compare before adding new families.

The current `refinedAnnouncements` / refined output is an untrusted Phase A
draft until this phase verifies it against the site evidence.

Phase B is the normal owner for refined fixture edits. Its job is to preserve
true VoiceOver behavior while removing or repairing evidence that cannot be
replayed from the initial fixture input.

## Agent

Use `.codex/agents/evidence-refiner.toml`.

## Required Evidence

- raw `expectedAnnouncements`
- current `refinedAnnouncements`
- rendered HTML
- AX tree
- step snapshots around disputed steps, including `htmlAfterStep` when present:
  `fingerprint`, `stats`, `htmlExcerpt`, `bodyTextExcerpt`, active element,
  matched DOM elements, and matched AX nodes
- VoiceOver source/caption evidence
- current engine comparison

## Steps

Build an audit set before editing. The audit set must include:

- every current engine compare mismatch window
- every line that Phase A preprocessing edited between raw `expectedAnnouncements`
  and draft `refinedAnnouncements`
- every line whose content may be present only in `htmlAfterStep`, or whose
  step fingerprint/body text changes from nearby initial/top-level steps
- every text split/join candidate
- every structural/decomposition candidate where VoiceOver announces one object
  and the engine emits descendants
- any line with OCR/caption/source disagreement

The receipt must include an audit coverage summary with audited ranges and any
unaudited ranges. Do not call the fixture trusted if mismatch-relevant ranges
were not audited.

For each audited announcement or range:

1. Treat the current refined line as a hypothesis, not truth.
2. Compare raw VoiceOver, rendered HTML, AX nodes, step snapshots, and source/caption evidence for that step or nearby content.
3. For any VoiceOver line that is present in `htmlAfterStep` but absent from the initial `rendered-html.html`, classify the line as conditional scan state unless the initial fixture HTML also contains the same semantic content in a replayable visible/AX-supported state. Remove or normalize hover-only, focus-only, carousel-advanced, timer-mutated, or otherwise step-time-only content from `refinedAnnouncements` because the engine fixture replays the initial DOM. Keep the raw line in `expectedAnnouncements`.
4. For each disputed line with step evidence, assign one initial-DOM status:
   - `initial-dom`: the semantic content exists in initial `rendered-html.html` and is replayable from saved HTML/AX
   - `step-only-dom`: `htmlAfterStep`/active text/matched nodes expose content that is hidden, absent, or not replayable in initial `rendered-html.html`
   - `volatile-dom`: the content is present in initial DOM but the value changes by time, carousel progression, personalization, or another volatile page update
   - `not-found`: neither initial DOM nor step evidence explains the line
   Record the `htmlAfterStep.fingerprint`, relevant `stats`, and the specific
   excerpt/source evidence used for the status.
5. For any text split/join mismatch, check whether the split aligns with DOM text boundaries before calling it OCR/caption noise:
   - inline emphasis boundaries: `strong`, `b`, `em`, `i`
   - explicit line or block boundaries: `br`, `p`, `div`, `span`, list marker text, or markdown-rendered fragments
   - hidden/offscreen or visually-hidden text near the disputed words
   - text-node boundaries inside the focused element's direct/relevant `outerHTML`
6. For structural mismatches where VoiceOver announces one object but the engine decomposes children, build a focused-node contract before deciding:
   - focused/active DOM node tag, `data-sr-dom-node-id`, `tabindex`, role, ARIA attributes, and direct/relevant `outerHTML`
   - nearest semantic ancestor chain from the disputed node to the scan root, including `ul`/`ol`, `li`/`role=listitem`, landmarks, articles, groups, tables, and custom-element/shadow-root boundaries
   - sibling context before and after the disputed node, especially section-heading paragraphs, feature rows, CTA controls, and decorative or labelled images that may cause VoiceOver to announce a boundary
   - child shape: headings, paragraphs, links, images, buttons, lists, inline emphasis, explicit line breaks, and visible text blocks
   - AX or step-snapshot role, name, focusable/focused state, level, and position/set metadata when available
   - whether the focused node's computed/AX name equals the whole announced card/group text, or only a child fragment
7. Decide whether the raw VoiceOver output is plausible and evidence-backed.
8. Preserve surprising output when evidence supports it and it is replayable from the initial fixture DOM.
9. Repair `refinedAnnouncements` when the draft refined output is contradicted by stronger site evidence, or when the evidence proves capture noise or conditional step-only state.
10. Before leaving any line uncertain, test the likely explanations against the evidence: hidden/offscreen capture state, ARIA controller state, missing descendants, focus target drift, dynamic page state, DOM text-boundary segmentation, text-boundary normalization, scanner traversal, and `htmlAfterStep` versus initial DOM divergence.
11. When live/local DOM evidence is available and it contradicts the saved fixture order or duplicate structure, compare both against VoiceOver before blaming the engine. If VoiceOver matches live DOM but not saved `rendered-html.html`, record saved/live DOM-state divergence and return the target for fixture repair, recapture, or fixture-level normalization.
12. Do not edit refined output because the current engine already emits the
    replacement, because an engine fix would be difficult, or because the
    mismatch count decreases. Those are not evidence.
13. For every refined output edit, add a `fixtureChanges` receipt entry using
    the schema in `agent-receipts.md`. The entry must identify the exact range,
    before/after text, valid reason enum, evidence pointers, confidence, and
    whether an engine gap still remains after the edit.
14. Record every approval, edit, or uncertainty with the evidence used.
15. When a disputed line remains uncertain after the required HTML, AX,
    step-snapshot, source/caption, text-boundary, and focused-node checks,
    request Phase C.5 instead of asking the user for manual confirmation. The
    request must include the minimal DOM contract to preserve, the suspected
    cause to test, and what result would prove fixture noise versus an engine
    gap.

## Evidence Packet

Every disputed line must have a receipt entry with:

- announcement index or range
- raw `expectedAnnouncements` text
- current `refinedAnnouncements` text
- HTML lookup summary
- AX lookup summary
- step snapshot or VoiceOver source/caption summary
- `htmlAfterStep` versus initial `rendered-html.html` comparison for content that may be hover/focus/dynamic-step-only state
- initial-DOM status: `initial-dom`, `step-only-dom`, `volatile-dom`, or
  `not-found`, with the `htmlAfterStep` fingerprint/stat/excerpt evidence
- text-boundary lookup for text split/join disputes: the relevant `outerHTML`, inline children, text-node/`br`/block boundaries, and whether the expected split follows those boundaries
- focused-node contract for structural/decomposition disputes, including focusability, computed/AX name evidence, nearest semantic ancestor chain, and sibling context when available
- saved/live DOM comparison when local or refreshed evidence shows different order, visibility, or duplicate responsive structures from the saved fixture
- decision: `approved`, `edited`, or `uncertain`
- confidence and reason
- fixture change receipt entry when `decision` is `edited`
- plausible causes checked, with the missing evidence that prevents a firmer decision when the line remains uncertain
- Phase C.5 request when needed: reproduction purpose, DOM/AX contract to
  preserve, suspected cause, and decisive mini-scan outcomes

## Output

- updated fixture JSON when edits are needed
- `03-evidence-refinement.json`
- remaining uncertain announcements, if any, each with a Phase C.5 request or a
  concrete blocker explaining why no reproduction scan is possible

Do not approve the refined output simply because it already exists. Do not
reshape valid VoiceOver output to match the current engine.

Do not hand-edit raw `expectedAnnouncements`. If raw VoiceOver evidence looks
wrong, preserve it, record the suspected issue, and request a recapture or Phase
C.5 reproduction scan. A refreshed artifact may add new raw evidence; it should
not overwrite prior raw evidence without recording the source run id.

Do not classify a one-object VoiceOver announcement versus multi-child engine
output as broad structural drift until the focused-node contract has been
checked. If the focused node is focusable and its AX/computed name contains the
whole card/group text, preserve that VoiceOver announcement and flag the case
for Phase C/D scanner-stop or grouping analysis.
