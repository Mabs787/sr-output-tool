# Phase D: Engine Refinement

Run this phase only after Phase B has edited or explicitly approved `refinedAnnouncements`, and Phase C has classified a trusted mismatch as a reusable engine or scanner gap.

## Agent

Use `.codex/agents/engine-refiner.toml`.

## Edit Boundary

- Change `packages/sr-engine/src/dom.ts` when traversal, role, label, grouping, state, or order is wrong.
- Change `packages/sr-engine/src/announcements.ts` when descriptor data is right but wording or order is wrong.
- Add focused unit coverage for reusable behavior when practical.
- Rebuild extension runtime whenever engine output changes.

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

