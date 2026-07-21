# Phase C: Fixture Judge

Run this phase after Phase B has edited or explicitly approved `refinedAnnouncements`.

## Agent

Use `.codex/agents/fixture-judge.toml`.

## Compare

```bash
yarn workspace @sr-output/engine voiceover:compare <fixture-name>
```

## Classifications

Classify each mismatch with one of these exact machine enum values:

- `fixture-still-noisy`
- `reusable-engine-gap`
- `dynamic-state-mismatch`
- `scanner-evidence-gap`
- `ambiguous`

After classification, assign one disposition enum:

- `resolved`
- `fixture-ready`
- `engine-ready`
- `recapture-only`
- `conditional-state-blocked`
- `parked-with-evidence`

Classification is evidence-weighted, not evenly balanced. After known
unreplayable state has been removed from the fixture, a remaining mismatch
between trusted VoiceOver output and deterministic engine replay should default
to `reusable-engine-gap` unless the judge can point to concrete fixture noise,
missing evidence, or saved/live state divergence for that exact window.

The target is zero mismatches for each site. Phase C should split mismatch
families and keep routing them until each family is resolved, routed to C.5,
sent to Phase D, or recorded with a genuine blocker. Do not use a broad
classification to end work on a mismatch that can still be tested with saved
evidence or a minimal reproduction scan.

`ambiguous` is not a shortcut classification. Use it only after checking the
plausible causes against the evidence and recording what is still missing.
If the missing evidence can be produced with a minimal same-structure
reproduction scan, route to Phase C.5 before using `ambiguous` as the terminal
classification for that family.

Before classifying any mismatch, double-check the evidence packet:

- rendered HTML for the disputed node and nearest relevant ancestors/siblings
- AX tree role, name, state, level, position, and focusability
- step snapshots and `htmlAfterStep` for state changes
- VoiceOver source/caption evidence for truncation or transcription drift
- scan-debug data, screenshots, and screen recording when the textual evidence
  suggests page-load, popup, focus, or VoiceOver startup problems

If these resources disagree, return the family to Phase B or Phase C.5 instead
of making an engine or fixture decision from only the compare output.
If the resources are absent rather than merely contradictory, classify the
family as `scanner-evidence-gap`, use `recapture-only` or
`parked-with-evidence` as the disposition, and route to Phase 0/C.5 before
Phase D.

For structural families, require a Phase B `structuralEvidencePacket` with
`completeness: "complete"` before assigning `engine-ready`. A partial packet
must name the missing DOM, AX, VoiceOver-step, source, or screenshot link and
route to Phase 0 or C.5. Do not turn repeated compare text alone into a broad
engine rule.

Phase C judges the engine against the refined initial-HTML oracle. If the
expected line is explained only by `htmlAfterStep` or another navigation-time
mutation, return it to Phase B for removal or normalization from
`refinedAnnouncements`; do not classify it as a reusable engine gap. If the
same semantic content exists in initial `rendered-html.html` and AX evidence,
then the mismatch can proceed as a fixture or engine question.

Require `stateScope` on every dynamic or conditional decision. Only
`initial-dom` belongs in the normal fixture compare. Preserve
`interaction-sequence` and `volatile-value` announcements in raw evidence and a
`conditionalStateEvidence` block with trigger, step, before/after DOM
fingerprints, and replayability decision. Never use a conditional-state label
to hide a replayable initial-DOM mismatch.

## Structural Decomposition Gate

Before classifying a structural mismatch as broad, ambiguous, or not suitable
for Phase D, check whether Phase B produced a focused-node contract.

When VoiceOver announces a single card/group/list-item object but the engine
emits child headings, paragraphs, links, images, or buttons, classify it as a
potential reusable engine gap if:

- the focused DOM node is itself focusable, such as `tabindex="0"` or native focusability
- the AX/step-snapshot role and name describe the whole object
- the rendered HTML child shape is generic enough to model without site-specific selectors
- the nearest semantic ancestor chain and sibling context explain the announced boundary, such as a generic `list item` stop while entering a subsection inside a rich card `<li>`
- the expected announcement is backed by raw VoiceOver/source or step evidence

If those facts are missing, send the target back to Phase B or mark the mismatch
as `scanner-evidence-gap`; do not dismiss it as too broad without recording the
missing focused-node fields.
If the missing fields are caused by page complexity rather than unavailable
evidence, route the family to Phase C.5 with a minimal focused-node reproduction
request.

For generic boundary words such as `list item`, `group`, `article`, `banner`, or
`end of`, do not rely on text matching alone. Require Phase B evidence that maps
the announcement to the closest semantic HTML ancestor and corresponding AX
role/name/position data. If the saved HTML contains the ancestor and the AX tree
confirms the semantics, default to `reusable-engine-gap` unless a concrete
dynamic or fixture-noise explanation is recorded.

## Text-Boundary Gate

Before classifying a text split/join mismatch as fixture noise, ambiguous, or
OCR/caption cleanup, check whether Phase B produced a text-boundary lookup.

Classify the mismatch as a potential reusable engine gap when the expected
VoiceOver split aligns with generic DOM boundaries such as:

- inline emphasis: `strong`, `b`, `em`, `i`
- explicit breaks: `br`
- block or markdown-rendered fragments: `p`, `div`, `span`
- list marker text or generated marker-like text
- hidden/visually-hidden text that explains extra or missing words
- parenthesized heading counters or count badges whose DOM/comment/text-node
  boundaries explain VoiceOver-style fragments such as
  `level 1 (, level 1 9, level 1), level 1, 4 items`

If the lookup is missing, send the target back to Phase B or record a
`scanner-evidence-gap`. Do not call a text split flaky until the relevant
`outerHTML`, child text fragments, and AX/source evidence have been checked.
If the saved page evidence remains inconclusive, route the family to Phase C.5
with a minimal text-boundary reproduction that preserves the same text nodes,
inline elements, `br`, hidden text, and wrapper structure.

When a target has multiple mismatch families, split them. Send any trusted,
narrow reusable family to Phase D even if other families remain dynamic,
scanner-evidence, or ambiguous.

## Replayable-State Gate

Before marking a window as `dynamic-state-mismatch`, check whether the expected
VoiceOver line is supported by the saved fixture HTML/AX/snapshots after the
fixture has excluded known unreplayable state such as hover-only menus,
countdown text, or live personalization. If saved evidence still contains the
semantic object that VoiceOver announced, the mismatch is not dynamic-state
noise; it is a reusable engine/scanner gap.

The engine comparison is against `refinedAnnouncements`, and
`refinedAnnouncements` must describe the initial `rendered-html.html` fixture.
Raw `expectedAnnouncements` may include what VoiceOver heard after hover/focus
or other step-time page state. If a line is supported only by a step snapshot's
`htmlAfterStep` and the semantic content is absent, hidden, or not replayable in
initial `rendered-html.html`, classify it as `fixture-still-noisy` and return
it to Phase B for removal or normalization. Do not send step-only
hover/focus/carousel/timer mutations to Phase D as engine gaps.

If moving down the page opens, expands, rotates, lazy-renders, or personalizes
content, the refined output should still model the initial HTML state. Keep the
mutated-state announcement in raw evidence and receipt notes, not in the exact
refined replay target, unless the initial HTML already contains the same
visible/AX-supported semantic content.

Phase C must verify that Phase B assigned an initial-DOM status for disputed
lines whenever step snapshots are available:

- `initial-dom`: compare mismatches can proceed to reusable engine/scanner
  classification.
- `step-only-dom`: return to Phase B if the line remains in
  `refinedAnnouncements`; otherwise ignore it as raw-only scan evidence.
- `volatile-dom`: compare only normalized static structure or the value present
  in `rendered-html.html`.
- `not-found`: classify as `scanner-evidence-gap` or return to Phase B unless
  other saved evidence explains the line.

If local/live DOM evidence shows a different stable order or duplicate structure
than the saved fixture, and VoiceOver matches the live/local DOM rather than the
saved fixture, classify the window as `fixture-still-noisy` or
`scanner-evidence-gap` and return it for fixture repair, recapture, or
fixture-level normalization. Do not ask Phase D to globally reorder nodes to
compensate for a stale or malformed saved DOM snapshot.

## Minimal-Reproduction Gate

Before sending a mismatch to Phase D with a broad rule, or leaving it as
`ambiguous`/`scanner-evidence-gap`, decide whether Phase C.5 can produce
decisive evidence. Phase C.5 is required when:

- the mismatch depends on caption/source truncation uncertainty
- the VoiceOver line may have been truncated, partially captured, or stitched
  from adjacent output
- the mismatch may be conditional on hover, focus, carousel movement, timer
  changes, or other step-only DOM state
- the saved initial `rendered-html.html` disagrees with later local/manual DOM
  inspection and the difference would change `refinedAnnouncements`
- rendered HTML, AX tree, snapshots, source/caption evidence, screenshots, or
  recording do not agree about the disputed content
- VoiceOver appears to synthesize context from generic structure but the full
  page is too complex to isolate the predicate confidently
- the proposed engine fix would be broad punctuation, marker, link-boundary,
  iframe/shadow, carousel, table, or group traversal behavior based on only one
  live-site example
- the judge has meaningful doubt and a minimal same-structure page could answer
  the question faster than further speculation

The Phase C receipt must either route the family to `repro-scanner` or record
why a reproduction scan is impossible or unnecessary.

A C.5 verdict may be applied only to original `candidateRef`s whose DOM, AX,
and VoiceOver evidence packet shape was matched by the reached reproduction
contract. Do not extrapolate a positive C.5 result across candidate refs,
negative controls, or tail windows that were not reached or shape-matched; keep
those windows unresolved with a specific retry, owner, blocker, and checks
needed.

Longer page-settle waits do not automatically replace C.5. If a delayed rescan
still captures a different DOM from manual local testing, keep the existing
initial-HTML oracle until a focused scan proves the exact structure and
announcement under test.

Examples:

- saved HTML contains `<h3>` or `<h4>` but the engine emits plain text:
  `reusable-engine-gap`
- saved HTML contains a focusable/button-like card with visible descendant text
  and VoiceOver speaks one grouped button: `reusable-engine-gap`
- expected line is a countdown value that changes independently of structure:
  `fixture-still-noisy` or normalized/ignored volatility
- expected line exists only because a hover menu was open during capture while
  saved HTML has the menu hidden: remove it from fixture or classify the window
  as unreplayable page state, not an engine gap
- saved fixture has duplicate responsive header navigation before and after a
  search form, while live DOM and VoiceOver agree on a single stable order:
  repair/recapture/normalize the fixture before considering an engine rule

## Structural-Inference Gate

Do not require every VoiceOver phrase to appear literally in one AX name. When
the saved scan HTML and AX tree together explain a phrase through generic
document structure, classify the mismatch as a potential reusable engine gap.

Examples of enough evidence:

- a native table rowheader has only its own AX name, but VoiceOver also speaks
  generic sibling/group header context visible in the same table structure
- a feature-section paragraph is plain text, but its ancestor chain shows it is
  inside a product-card `li` and AX exposes that card/list context, explaining a
  VoiceOver `list item` boundary before the paragraph
- grouped native table sections are represented by direct `thead` controller
  buttons with `aria-controls` pointing at sibling `tbody` regions
- AX confirms the individual roles/names while rendered HTML explains the
  context VoiceOver appears to synthesize

If this evidence exists in the saved scan, do not send the user back for live
DevTools screenshots before Phase D. Ask for extra live evidence only when the
scan lacks the relevant HTML, AX role/name, or control relationship.

## Output

Write `04-fixture-judge.json` with one decision per mismatch.

If the refined fixture is trusted and the engine differs, send the target to
Phase D unless Phase C.5 is required to prove the reusable behavior first.
