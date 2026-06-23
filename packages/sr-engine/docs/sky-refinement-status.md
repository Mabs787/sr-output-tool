# Sky Refinement Status

This is the handover note for continuing the Sky VoiceOver corpus refinement in a fresh context window.

## Pulled Artifact

- GitHub Actions run/artifact source: `27963923991`
- Local download/import workspace used during refinement: `voiceover-smoke/sky-artifacts-27963923991`
- Imported fixture location: `packages/sr-engine/tests/fixtures/voiceover/`
- Evidence imported per site: rendered HTML, accessibility tree, step snapshots, expected/refined announcement JSON.

The `voiceover-smoke/` workspace is local scratch/debug output and is ignored by git. The checked-in corpus fixtures are the source of truth for future refinement work.

## Refined Sky Sites

These Sky fixtures are promoted to `refined` in `refinement-manifest.json` and pass the exact VoiceOver corpus gate:

- `www-sky-com`
- `www-sky-com-broadband-gaming`
- `www-sky-com-tv-stream`

`www-sky-com-tv-stream` was refined after reusable engine changes for ARIA tabs, focusable image-card groups, level-2 heading fragments, paragraph-block list items, native select values, and extension runtime rebuild.
`www-sky-com-broadband-gaming` was refined with fixture-only cleanup for product-card spacing, four-item carousel position noise, and a truncated list position; no engine changes were needed.

## Remaining Sky Candidates

These Sky fixtures are imported but still need page-by-page AI/manual refinement before promotion:

- `business-sky-com-s`
- `www-sky-com-broadband`
- `www-sky-com-deals`
- `www-sky-com-glass-43-inch`
- `www-sky-com-glass-air`
- `www-sky-com-glass`
- `www-sky-com-protect`
- `www-sky-com-shop-mobile`
- `www-sky-com-smart-home`
- `www-sky-com-tv`
- `www-sky-com-tvandbroadband`
- `www-sky-com-watch-what-to-watch-this-week`
- `www-sky-com-watch`

Recommended next targets by current mismatch size are:

1. `www-sky-com-protect`
2. `www-sky-com-smart-home`
3. `www-sky-com-broadband`
4. `www-sky-com-watch`
5. `www-sky-com-watch-what-to-watch-this-week`

## Fresh Context Prompt

Use this prompt when starting a new refinement context:

```text
Continue the Sky VoiceOver corpus refinement.

Read:
- packages/sr-engine/docs/ai-corpus-refinement-workflow.md
- packages/sr-engine/docs/sky-refinement-status.md
- packages/sr-engine/docs/voiceover-corpus-baseline.md
- packages/sr-engine/tests/fixtures/voiceover/refinement-manifest.json

Refine one remaining Sky candidate only, starting with the lowest mismatch candidate.
Use rendered HTML, AX tree, and step snapshots as evidence.
Update engine only with reusable logic, never site-specific logic.
Update refinedAnnouncements, refinement-manifest.json, voiceover-corpus-baseline.md, and extension runtime where needed.
Run unit tests, the fixture compare, and the VoiceOver corpus gate before stopping with a summary.
```

## Useful Commands

```bash
yarn workspace @sr-output/engine voiceover:compare <fixture-name>
yarn workspace @sr-output/engine test:unit
yarn workspace @sr-output/engine test:voiceover
yarn build:extension-runtime
```
