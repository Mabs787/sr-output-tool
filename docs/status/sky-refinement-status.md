# Sky Refinement Status

This is the handover note for continuing the Sky VoiceOver corpus refinement.

## Pulled Artifact

- GitHub Actions run/artifact source: `27963923991`
- Local download/import workspace used during refinement: `voiceover-smoke/sky-artifacts-27963923991`
- Imported fixture location: `packages/sr-engine/tests/fixtures/voiceover/`
- Evidence imported per site: rendered HTML, accessibility tree, step snapshots, expected/refined announcement JSON.

The `voiceover-smoke/` workspace is local scratch/debug output and is ignored by git. The checked-in corpus fixtures are the source of truth for future refinement work.

## Workflow Completion Status

The latest Sky batch has completed Phase B review for every imported site.

Six Sky fixtures are promoted to exact `refined` gates. The remaining Sky fixtures are reviewed `candidate` evidence because their current engine comparisons still expose page-backed dynamic, structural, list-marker, or scanner traversal differences that should not be papered over with fixture edits.

## Fully Refined Sky Sites

These Sky fixtures are promoted to `refined` in `refinement-manifest.json` and pass the exact VoiceOver corpus gate:

- `www-sky-com`
- `www-sky-com-broadband-gaming`
- `www-sky-com-deals`
- `www-sky-com-smart-home`
- `www-sky-com-tv-stream`
- `www-sky-com-watch-what-to-watch-this-week`

Notes:

- `www-sky-com-tv-stream` was refined after reusable engine changes for ARIA tabs, focusable image-card groups, level-2 heading fragments, paragraph-block list items, native select values, and extension runtime rebuild.
- `www-sky-com-broadband-gaming` was refined with fixture-only cleanup for product-card spacing, four-item carousel position noise, and a truncated list position.
- `www-sky-com-deals` was promoted after reusable footer country-selector grouping and empty-alert group handling.
- `www-sky-com-smart-home` was promoted after reusable media/text list-card decomposition, footer country-selector grouping, empty-alert group handling, and first previous-slide disabled-state inference.
- `www-sky-com-watch-what-to-watch-this-week` was promoted after article/show-description cleanup plus reusable footer country-selector grouping and first previous-slide disabled-state inference.

## Phase B Complete Sky Candidates

These fixtures have completed Phase B evidence review and remain `candidate`:

- `business-sky-com-s`: open Broadband/Mobile submenu traversal, Salesforce/lightning shadow-DOM carousel/product traversal, live-status title announcement, and consent-dialog tail remain page-backed.
- `www-sky-com-broadband`: remaining gaps include postcode text-field phrasing, speed-card decomposition, and FAQ body/region traversal.
- `www-sky-com-glass-43-inch`: remaining gaps include strong-text benefit-list segmentation and native comparison-table traversal.
- `www-sky-com-protect`: grouped hero/postcode traversal, carousel group/region phrasing, grouped support text, reminder-section grouping, and footer group noise remain page-backed.
- `www-sky-com-glass-air`: remaining gaps include hero/heading grouping, native control traversal, table/card segmentation, and repeated button/list groups.
- `www-sky-com-glass`: remaining gaps include hero group announcements, heading/card decomposition, button/group phrasing, and list/marker segmentation.
- `www-sky-com-shop-mobile`: remaining gaps include carousel dynamic state, slide button grouping, heading/card decomposition, and list/marker traversal.
- `www-sky-com-tv`: Fresh Phase B review on 2026-06-27 treated the draft refined output as untrusted and applied seven evidence-backed repairs: missing `skip to search`, two truncated list counts, two truncated legal/disclaimer lines, Sky Products typography, and restored FAQ button/group state. Phase C then found 9 trusted reusable engine gaps: price/legal text-boundary joins, grouped trailing-icon button context, grouped carousel cards, and standalone product-card group stops. A broad Phase D prototype made this target exact but regressed already-refined corpus fixtures, so it was removed. A narrower focusable structured carousel/list-card `li` group fix was kept, reducing the target to 7 mismatch windows; the remaining price/legal, trailing-icon button, and standalone product-card group gaps keep this as candidate evidence rather than an exact gate.
- `www-sky-com-tvandbroadband`: remaining gaps include hero/CTA group announcements, product-card grouped text, carousel/package ordering, and list/marker segmentation.
- `www-sky-com-watch`: remaining gaps are list/marker carousel traversal and dynamic slide disabled-state behavior rather than isolated fixture text noise.

## Resume Prompt

Use `.codex/prompts/continue-workflow.md` for the whole backlog, or `.codex/prompts/refine-target.md` for one named Sky target.
