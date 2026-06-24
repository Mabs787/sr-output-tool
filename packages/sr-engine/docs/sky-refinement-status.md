# Sky Refinement Status

This is the handover note for continuing the Sky VoiceOver corpus refinement in a fresh context window.

## Pulled Artifact

- GitHub Actions run/artifact source: `27963923991`
- Local download/import workspace used during refinement: `voiceover-smoke/sky-artifacts-27963923991`
- Imported fixture location: `packages/sr-engine/tests/fixtures/voiceover/`
- Evidence imported per site: rendered HTML, accessibility tree, step snapshots, expected/refined announcement JSON.

The `voiceover-smoke/` workspace is local scratch/debug output and is ignored by git. The checked-in corpus fixtures are the source of truth for future refinement work.

## Workflow Completion Status

The Sky batch has not been fully refined end to end. The artifact import and
preprocessing step created `expectedAnnouncements` and initial
`refinedAnnouncements` for every Sky page, but that is only Phase A of the
workflow. A page is complete only after the Phase B AI/manual evidence review,
engine comparison, reusable engine changes where needed, test run, and manifest
classification.

## Fully Refined Sky Sites

These Sky fixtures are promoted to `refined` in `refinement-manifest.json` and pass the exact VoiceOver corpus gate:

- `www-sky-com`
- `www-sky-com-broadband-gaming`
- `www-sky-com-tv-stream`

`www-sky-com-tv-stream` was refined after reusable engine changes for ARIA tabs, focusable image-card groups, level-2 heading fragments, paragraph-block list items, native select values, and extension runtime rebuild.
`www-sky-com-broadband-gaming` was refined with fixture-only cleanup for product-card spacing, four-item carousel position noise, and a truncated list position; no engine changes were needed.

`www-sky-com-protect` has had an AI refinement pass and remains `candidate`.
Clear caption spacing/truncation was corrected, but raw VoiceOver and step
snapshots still support grouped hero/postcode traversal, carousel group/region
phrasing, grouped support text, reminder-section grouping, and footer group
noise that need reusable engine or scanner decisions before exact gating.

## Phase B Complete Sky Candidates

These fixtures have completed the Phase B evidence review and remain
`candidate` because the current engine comparison still has page-backed
VoiceOver behavior that is not ready for exact gating:

- `business-sky-com-s`: phase B preserved the captured open Broadband/Mobile
  submenu traversal, Salesforce/lightning shadow-DOM carousel/product
  traversal, live-status title announcement, and consent-dialog tail because
  step snapshots and AX/HTML evidence support those states. Only deterministic
  OCR/punctuation cleanup was applied.
- `www-sky-com-broadband`: phase B corrected OCR/caption noise for currency,
  smart punctuation, speed-card spacing, a stray list bullet, and I/l drift.
  Remaining gaps are postcode text-field phrasing, speed-card decomposition,
  and FAQ body/region traversal that are backed by VoiceOver and snapshots.
- `www-sky-com-deals`: phase B corrected evidence-backed OCR/caption noise for
  currency, smart punctuation, rendered en dash counter, Wifi OCR, and an FAQ
  OCR merge. Reusable engine logic was added for single-select ARIA listboxes,
  compact result-count splitting, decorative versus meaningful image-choice
  button grouping, visual separator list items, and trailing disclaimer button
  groups. Remaining gaps are footer tail group announcements around the country
  selector/back-to-top traversal.
- `www-sky-com-glass-43-inch`: phase B corrected monthly price spacing, a
  truncated table column phrase, and FAQ casing. Remaining gaps are page-backed
  strong-text benefit-list segmentation and the native 3-column/9-row
  comparison-table traversal versus the current engine row flattening.
- `www-sky-com-protect`: grouped hero/postcode traversal, carousel
  group/region phrasing, grouped support text, reminder-section grouping, and
  footer group noise remain page-backed candidate evidence.
- `www-sky-com-smart-home`: grouped hero/price fragments, rail image/list
  decomposition, grouped card text, FAQ wrapper grouping, footer group noise,
  and trailing alert remain page-backed candidate evidence.

## Remaining Preprocessed Sky Candidates

These Sky fixtures are imported and have initial `refinedAnnouncements`, but
they still need the full Phase B AI/manual refinement loop before promotion:

- `www-sky-com-glass-air`
- `www-sky-com-glass`
- `www-sky-com-shop-mobile`
- `www-sky-com-tv`
- `www-sky-com-tvandbroadband`
- `www-sky-com-watch-what-to-watch-this-week`
- `www-sky-com-watch`

Recommended next targets by current mismatch size are:

1. `www-sky-com-broadband`
2. `www-sky-com-watch`
3. `www-sky-com-watch-what-to-watch-this-week`

## Fresh Context Prompt

Use this prompt when starting a new refinement context:

```text
Continue the Sky VoiceOver corpus refinement.

Read:
- packages/sr-engine/docs/ai-corpus-refinement-workflow.md
- packages/sr-engine/docs/sky-refinement-status.md
- packages/sr-engine/docs/voiceover-corpus-baseline.md
- packages/sr-engine/tests/fixtures/voiceover/refinement-manifest.json

Refine the remaining Sky candidates one site at a time, starting with the
lowest mismatch candidate in sky-refinement-status.md.
Do not stop after running voiceover:refine-artifact; that is only Phase A
preprocessing.
Use rendered HTML, AX tree, and step snapshots as evidence.
Update engine only with reusable logic, never site-specific logic.
Update refinedAnnouncements, refinement-manifest.json, voiceover-corpus-baseline.md, and extension runtime where needed.
Run unit tests, the fixture compare, and the VoiceOver corpus gate before
marking a site refined. After each site, record whether it is refined, partial,
candidate, or skip, then continue to the next remaining candidate unless asked
to stop.
```

## Useful Commands

```bash
yarn workspace @sr-output/engine voiceover:compare <fixture-name>
yarn workspace @sr-output/engine test:unit
yarn workspace @sr-output/engine test:voiceover
yarn build:extension-runtime
```
