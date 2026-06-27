# Sky Refinement Status

This is the handover note for continuing the Sky VoiceOver corpus refinement.

## Pulled Artifact

- GitHub Actions run/artifact source: `27963923991`
- Local download/import workspace used during refinement: `voiceover-smoke/sky-artifacts-27963923991`
- Imported fixture location: `packages/sr-engine/tests/fixtures/voiceover/`
- Evidence imported per site: rendered HTML, accessibility tree, step snapshots, expected/refined announcement JSON.
- Business Sky follow-up rescan: `28301913611`, processed from `voiceover-smoke/refinement-workspace/business-sky-com-s/artifacts/28301913611`.

The `voiceover-smoke/` workspace is local scratch/debug output and is ignored by git. The checked-in corpus fixtures are the source of truth for future refinement work.

## Workflow Completion Status

The latest Sky batch has completed Phase B review for every imported site.

Eight Sky fixtures currently pass the exact VoiceOver corpus gate. The remaining Sky fixtures are reviewed `candidate` evidence because their current engine comparisons still expose page-backed dynamic, structural, list-marker, or scanner traversal differences that should not be papered over with fixture edits.

## Fully Refined Sky Sites

These Sky fixtures are promoted to `refined` in `refinement-manifest.json` and pass the exact VoiceOver corpus gate:

- `www-sky-com`
- `www-sky-com-broadband-gaming`
- `www-sky-com-deals`
- `www-sky-com-glass-43-inch`
- `www-sky-com-smart-home`
- `www-sky-com-tv-stream`
- `www-sky-com-watch`
- `www-sky-com-watch-what-to-watch-this-week`

Notes:

- `www-sky-com-tv-stream` was refined after reusable engine changes for ARIA tabs, focusable image-card groups, level-2 heading fragments, paragraph-block list items, native select values, and extension runtime rebuild.
- `www-sky-com-broadband-gaming` was refined with fixture-only cleanup for product-card spacing, four-item carousel position noise, and a truncated list position.
- `www-sky-com-deals` was promoted after reusable footer country-selector grouping and empty-alert group handling.
- `www-sky-com-smart-home` was promoted after reusable media/text list-card decomposition, footer country-selector grouping, empty-alert group handling, and first previous-slide disabled-state inference.
- `www-sky-com-glass-43-inch` was promoted after reusable native comparison-table traversal, complex product column-header splitting, grouped-table synthesized row-header context, table descendant link/list column-context phrasing, inline-emphasis benefit-list segmentation, and Phase B cleanup for price/legal table cells plus the `Netflix` caption/OCR typo.
- `www-sky-com-watch` was promoted after image-link rail card traversal and Phase B cleanup for stale previous-slide disabled state plus apostrophe/text-boundary drift.
- `www-sky-com-watch-what-to-watch-this-week` was promoted after article/show-description cleanup plus reusable footer country-selector grouping and first previous-slide disabled-state inference.

## Latest Compare Snapshot

Rerun on 2026-06-27 after the stricter Phase C/D workflow and latest reusable engine fixes:

| Fixture | Expected | Actual | Mismatch windows | Main buckets |
| --- | ---: | ---: | ---: | --- |
| `business-sky-com-s` | 194 | 130 | 116 | candidate: run `28301913611` completed and evidence-backed OCR cleanup was applied; hover-open nav submenu announcements were removed to match the initial DOM replay, but carousel/package and legal/tail state still diverge |
| `www-sky-com-broadband` | 154 | 155 | 12 | speed-card decomposition, FAQ/link text-boundaries, fixture cleanup |
| `www-sky-com-broadband-gaming` | 130 | 130 | 0 | exact |
| `www-sky-com-deals` | 299 | 299 | 0 | exact |
| `www-sky-com-glass` | 149 | 136 | 28 | comparison-table/card structure, hero/card groups, legal text cleanup |
| `www-sky-com-glass-43-inch` | 127 | 127 | 0 | exact |
| `www-sky-com-glass-air` | 257 | 243 | 43 | legal/text cleanup, colour/gallery state, table/card structure |
| `www-sky-com-protect` | 104 | 106 | 2 | zero-width heading artifact, support benefit text joining |
| `www-sky-com-shop-mobile` | 165 | 160 | 12 | dynamic carousel state, product heading positions, shop-card groups |
| `www-sky-com-smart-home` | 150 | 150 | 0 | exact |
| `www-sky-com-tv` | 177 | 177 | 6 | price/legal boundaries, standalone product-card group stops |
| `www-sky-com-tv-stream` | 115 | 115 | 0 | exact |
| `www-sky-com-tvandbroadband` | 351 | 303 | 54 | package/card grouping, price/legal boundaries, list-marker traversal |
| `www-sky-com-watch` | 259 | 259 | 0 | exact |
| `www-sky-com-watch-what-to-watch-this-week` | 171 | 171 | 0 | exact |

## Phase B Complete Sky Candidates

These fixtures have completed Phase B evidence review and remain `candidate`:

- `business-sky-com-s`: run `28301913611` replaced the older Business Sky artifact as the active evidence and remains `candidate`. The scan completed to `scan-end-marker` with 213 captured steps, 211 VoiceOver announcements, rendered HTML, AX tree, full step snapshots, OCR/source evidence, and a repo-local artifact copy under `voiceover-smoke/refinement-workspace/business-sky-com-s/artifacts/28301913611`. Evidence-backed OCR/text cleanup was applied for currency zeroes, `Icon` names, `money-back`, the VAT continuation, `Sky Group`, and curly apostrophe drift. The hover-open Broadband/Mobile submenu announcements were removed from the checked-in expected/refined output because the fixture replays the initial non-hover DOM state. The fixture now has 194 expected announcements, but evidence quality is still not high enough for exact gating: the hero carousel timer and slide/list position content are volatile; package/radio/legal state diverges between VoiceOver and saved HTML; and most source steps still report `missing value` focused AX nodes. Phase D tried a narrow declarative-shadow heading prototype before the submenu exclusion; it did not provide a safe reusable fix and regressed already-refined Sky fixtures, so it was removed. Keep this as candidate diagnostic evidence for scan/fixture work, not as a refined engine contract; future partial gating would need a deliberately scoped stable slice.
- `www-sky-com-broadband`: 2026-06-27 stricter Phase C/D pass fixed invalid postcode textbox phrasing and expanded FAQ body traversal. Remaining windows are speed-card decomposition, zero-width/quote/text-boundary fixture cleanup, and inline FAQ link surrounding text. Do not treat the draft refined output as truth for apostrophe or zero-width mismatches.
- `www-sky-com-protect`: stricter pass fixed label/placeholder textbox duplication, `<br>` split hero heading fragments, and `Previous slide...` carousel button grouping. Remaining postcode wrapper group, carousel container/group exits, support text grouping, and reminder-section group need fresh focused-node evidence before Phase D.
- `www-sky-com-glass-air`: stricter pass confirmed rating images and native comparison-table traversal as reusable engine candidates. Hero grouped heading, standalone groups, colour/gallery state, legal truncation, and quote/spacing differences require Phase B evidence cleanup or fresh focused-node evidence.
- `www-sky-com-glass`: stricter pass confirmed native comparison-table traversal as the main reusable engine gap. Hero/card standalone groups and legal truncation remain evidence-refinement work, not safe broad engine targets.
- `www-sky-com-shop-mobile`: stricter pass fixed unnamed carousel-region wrapper output, `Previous slide...`/`Next slide...` button grouping, and generic product-card CTA link position over-propagation. Remaining slide number/content mismatches are dynamic state; `Shop now` group stops and product heading positions need focused-node evidence.
- `www-sky-com-tv`: Fresh Phase B review on 2026-06-27 treated the draft refined output as untrusted and applied seven evidence-backed repairs: missing `skip to search`, two truncated list counts, two truncated legal/disclaimer lines, Sky Products typography, and restored FAQ button/group state. Phase C then found 9 trusted reusable engine gaps: price/legal text-boundary joins, grouped trailing-icon button context, grouped carousel cards, and standalone product-card group stops. A broad Phase D prototype made this target exact but regressed already-refined corpus fixtures, so it was removed. A narrower focusable structured carousel/list-card `li` group fix was kept, reducing the target to 7 mismatch windows; the remaining price/legal, trailing-icon button, and standalone product-card group gaps keep this as candidate evidence rather than an exact gate.
- `www-sky-com-tvandbroadband`: remaining gaps include hero/CTA group announcements, product-card grouped text, carousel/package ordering, and list/marker segmentation.

## Resume Prompt

Use `.codex/prompts/continue-workflow.md` for the whole backlog, or `.codex/prompts/refine-target.md` for one named Sky target.
