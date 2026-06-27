# Phase D: Engine Refinement

Run this phase only after Phase B has edited or explicitly approved `refinedAnnouncements`, and Phase C has classified a trusted mismatch as a reusable engine or scanner gap.

## Agent

Use `.codex/agents/engine-refiner.toml`.

## Edit Boundary

- Change `packages/sr-engine/src/dom.ts` when traversal, role, label, grouping, state, or order is wrong.
- Change `packages/sr-engine/src/announcements.ts` when descriptor data is right but wording or order is wrong.
- Add focused unit coverage for reusable behavior when practical.
- Rebuild extension runtime whenever engine output changes.

## Engine-Confidence Checklist

For structural/decomposition gaps, attempt a focused reusable fix before
declaring the gap too broad when the Phase B/C evidence shows:

- raw VoiceOver or source evidence for the single grouped/card announcement
- rendered HTML for the focused node and its child shape
- AX tree or step-snapshot evidence for focused role/name/focusability
- current engine comparison proving the engine decomposes the same object
- a reusable predicate based on semantics or computed accessibility facts, not site-specific class names or copy

Common reusable patterns to check:

- focusable `li` or `role=listitem` cards with a whole-card AX/computed name
- focusable grouped controls whose parent receives focus while child text/link/image nodes supply the name
- scanner-stop mistakes where the focused object should be announced as one unit instead of descending into descendants
- announcement-format gaps where descriptor metadata is right but VoiceOver punctuation, position, or group wording differs

If a prototype is too broad, reduce it to the evidence-backed focused-node
shape and rerun target and corpus checks before abandoning the engine path.
Record both rejected broad prototypes and any narrower kept fixes.

## Checks

```bash
yarn workspace @sr-output/engine test:unit
yarn workspace @sr-output/engine voiceover:compare <fixture-name>
yarn workspace @sr-output/engine test:voiceover
yarn build:extension-runtime
```

## Output

Write `05-engine-refinement.json` with changed files, behavior fixed, checks run, and remaining mismatches.

Do not add site-specific engine logic.
