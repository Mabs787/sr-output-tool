# Phase C: Fixture Judge

Run this phase after Phase B has edited or explicitly approved `refinedAnnouncements`.

## Agent

Use `.codex/agents/fixture-judge.toml`.

## Compare

```bash
yarn workspace @sr-output/engine voiceover:compare <fixture-name>
```

## Classifications

Classify each mismatch as one of:

- fixture still noisy
- reusable engine gap
- dynamic state mismatch
- scanner evidence gap
- ambiguous

Classification is evidence-weighted, not evenly balanced. After known
unreplayable state has been removed from the fixture, a remaining mismatch
between trusted VoiceOver output and deterministic engine replay should default
to `reusable engine gap` unless the judge can point to concrete fixture noise,
missing evidence, or saved/live state divergence for that exact window.

`ambiguous` is not a shortcut classification. Use it only after checking the
plausible causes against the evidence and recording what is still missing.

## Structural Decomposition Gate

Before classifying a structural mismatch as broad, ambiguous, or not suitable
for Phase D, check whether Phase B produced a focused-node contract.

When VoiceOver announces a single card/group/list-item object but the engine
emits child headings, paragraphs, links, images, or buttons, classify it as a
potential reusable engine gap if:

- the focused DOM node is itself focusable, such as `tabindex="0"` or native focusability
- the AX/step-snapshot role and name describe the whole object
- the rendered HTML child shape is generic enough to model without site-specific selectors
- the expected announcement is backed by raw VoiceOver/source or step evidence

If those facts are missing, send the target back to Phase B or mark the mismatch
as `scanner-evidence-gap`; do not dismiss it as too broad without recording the
missing focused-node fields.

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

If the lookup is missing, send the target back to Phase B or record a
`scanner-evidence-gap`. Do not call a text split flaky until the relevant
`outerHTML`, child text fragments, and AX/source evidence have been checked.

When a target has multiple mismatch families, split them. Send any trusted,
narrow reusable family to Phase D even if other families remain dynamic,
scanner-evidence, or ambiguous.

## Replayable-State Gate

Before marking a window as `dynamic state mismatch`, check whether the expected
VoiceOver line is supported by the saved fixture HTML/AX/snapshots after the
fixture has excluded known unreplayable state such as hover-only menus,
countdown text, or live personalization. If saved evidence still contains the
semantic object that VoiceOver announced, the mismatch is not dynamic-state
noise; it is a reusable engine/scanner gap.

The engine comparison is against the initial `rendered-html.html` fixture. If a
line is supported only by a step snapshot's `htmlAfterStep` and the semantic
content is absent from initial `rendered-html.html`, classify it as fixture
still noisy or conditional scan state and return it to Phase B for removal or
normalization. Do not send step-only hover/focus/carousel/timer mutations to
Phase D as engine gaps.

Examples:

- saved HTML contains `<h3>` or `<h4>` but the engine emits plain text:
  `reusable engine gap`
- saved HTML contains a focusable/button-like card with visible descendant text
  and VoiceOver speaks one grouped button: `reusable engine gap`
- expected line is a countdown value that changes independently of structure:
  `fixture still noisy` or normalized/ignored volatility
- expected line exists only because a hover menu was open during capture while
  saved HTML has the menu hidden: remove it from fixture or classify the window
  as unreplayable page state, not an engine gap

## Structural-Inference Gate

Do not require every VoiceOver phrase to appear literally in one AX name. When
the saved scan HTML and AX tree together explain a phrase through generic
document structure, classify the mismatch as a potential reusable engine gap.

Examples of enough evidence:

- a native table rowheader has only its own AX name, but VoiceOver also speaks
  generic sibling/group header context visible in the same table structure
- grouped native table sections are represented by direct `thead` controller
  buttons with `aria-controls` pointing at sibling `tbody` regions
- AX confirms the individual roles/names while rendered HTML explains the
  context VoiceOver appears to synthesize

If this evidence exists in the saved scan, do not send the user back for live
DevTools screenshots before Phase D. Ask for extra live evidence only when the
scan lacks the relevant HTML, AX role/name, or control relationship.

## Output

Write `04-fixture-judge.json` with one decision per mismatch.

If the refined fixture is trusted and the engine differs, send the target to Phase D.
