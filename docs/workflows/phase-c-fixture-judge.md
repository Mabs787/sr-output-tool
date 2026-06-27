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

## Output

Write `04-fixture-judge.json` with one decision per mismatch.

If the refined fixture is trusted and the engine differs, send the target to Phase D.
