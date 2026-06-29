# Sky Refinement Status

This is the handover note for continuing the Sky VoiceOver corpus refinement.

## Pulled Artifact

- GitHub Actions run/artifact source: `27963923991`
- Local download/import workspace used during refinement: `voiceover-smoke/sky-artifacts-27963923991`
- Imported fixture location: `packages/sr-engine/tests/fixtures/voiceover/`
- Evidence imported per site: rendered HTML, accessibility tree, step snapshots, expected/refined announcement JSON.
- Business Sky follow-up rescan: `28305378853`, processed from `voiceover-smoke/refinement-workspace/business-sky-com-s/artifacts/28305378853`.

The `voiceover-smoke/` workspace is local scratch/debug output and is ignored by git. The checked-in corpus fixtures are the source of truth for future refinement work.

## Workflow Completion Status

The latest Sky batch has completed Phase B review for every imported site.

Five Sky fixtures currently pass the exact VoiceOver corpus gate. A fixture-trust audit on 2026-06-28 restored several agent-made refined-output edits that could have masked true VoiceOver output. The restored fixtures are reviewed `candidate` evidence until their remaining gaps are fixed in the engine or re-refined with stronger HTML/AX/step evidence.

## Fully Refined Sky Sites

These Sky fixtures are promoted to `refined` in `refinement-manifest.json` and pass the exact VoiceOver corpus gate:

- `www-sky-com`
- `www-sky-com-deals`
- `www-sky-com-smart-home`
- `www-sky-com-tv-stream`
- `www-sky-com-watch-what-to-watch-this-week`

Notes:

- `www-sky-com-tv-stream` was refined after VO-backed engine changes for empty level-2 headings and parenthesized focusable image-card list positions, alongside the existing ARIA tab/focusable image-card traversal support.
- `www-sky-com-deals` was promoted after reusable footer country-selector grouping and empty-alert group handling.
- `www-sky-com-smart-home` was promoted after reusable media/text list-card decomposition, footer country-selector grouping, empty-alert group handling, and first previous-slide disabled-state inference.
- `www-sky-com-watch-what-to-watch-this-week` was promoted after article/show-description cleanup plus reusable footer country-selector grouping and first previous-slide disabled-state inference.

## Latest Compare Snapshot

Rerun on 2026-06-29 after the Phase D engine pass and Phase E promotion review:

| Fixture | Expected | Actual | Mismatch windows | Main buckets |
| --- | ---: | ---: | ---: | --- |
| `business-sky-com-s` | 193 | 233 | 31 | candidate: run `28305378853` completed and evidence-backed OCR cleanup was applied; hover-open nav submenu announcements were removed to match the initial DOM replay, and rich package cards now decompose in VO order; carousel/list-position, wrapper groups, legal/tail state, and smaller card-adjacent details still diverge |
| `www-sky-com-broadband` | 154 | 154 | 11 | restored fixture baseline; candidate again |
| `www-sky-com-broadband-gaming` | 130 | 130 | 11 | restored VO-backed product-card/list-position output; candidate again |
| `www-sky-com-deals` | 299 | 299 | 0 | exact |
| `www-sky-com-glass` | 149 | 136 | 28 | comparison-table/card structure, hero/card groups, legal text cleanup |
| `www-sky-com-glass-43-inch` | 127 | 127 | 4 | restored fixture baseline; candidate again |
| `www-sky-com-glass-air` | 257 | 265 | 11 | color/price boundaries, hero/carousel grouping, comparison-table segmentation |
| `www-sky-com-protect` | 104 | 106 | 2 | restored fixture baseline; candidate again |
| `www-sky-com-shop-mobile` | 165 | 160 | 12 | restored carousel/group/card output; candidate again |
| `www-sky-com-smart-home` | 150 | 150 | 0 | exact |
| `www-sky-com-tv` | 177 | 174 | 3 | restored group output; candidate again |
| `www-sky-com-tv-stream` | 116 | 116 | 0 | exact |
| `www-sky-com-tvandbroadband` | 351 | 309 | 48 | package/card grouping, price/legal boundaries, list-marker traversal |
| `www-sky-com-watch` | 259 | 259 | 8 | restored carousel/text-boundary output; candidate again |
| `www-sky-com-watch-what-to-watch-this-week` | 171 | 171 | 0 | exact |

## Phase B Complete Sky Candidates

These fixtures have completed Phase B evidence review and remain `candidate`:

- `business-sky-com-s`: run `28305378853` replaced the older Business Sky artifact as the active evidence and remains `candidate`. The scan completed to `scan-end-marker` with 213 captured steps, 211 VoiceOver announcements, rendered HTML, AX tree, full step snapshots, OCR/source evidence, and a repo-local artifact copy under `voiceover-smoke/refinement-workspace/business-sky-com-s/artifacts/28305378853`. Evidence-backed OCR/text cleanup was applied for currency zeroes, `Icon` names, `money-back`, the VAT continuation, `Sky Group`, and curly apostrophe drift. The hover-open Broadband/Mobile submenu announcements were removed from the checked-in expected/refined output because the fixture replays the initial non-hover DOM state. The current compare is 193 expected, 233 actual, and 31 mismatch windows. Phase D now keeps reusable fixes for multi-image control names, SLDS radio-group phrasing, and rich package-card decomposition/list counting; the package cards now replay in VO order for offer banner, product text, feature icon/label rows, and CTA controls. Exact gating is still blocked by hero carousel timer/list-position behavior, wrapper groups, selected-state/text-boundary evidence, legal/tail traversal, and smaller card-adjacent details such as tooltip group wording and article closure.
- `www-sky-com-broadband`: restored to the prior refined baseline after the trust audit; current compare is 154 expected, 154 actual, and 11 mismatch windows.
- `www-sky-com-broadband-gaming`: restored to the prior refined baseline after product-card/list-position edits were judged unsafe; current compare is 130 expected, 130 actual, and 11 mismatch windows.
- `www-sky-com-glass`: 2026-06-27 stricter Phase C/D pass confirmed native comparison-table traversal as the main reusable engine gap. Hero/card standalone groups and legal truncation remain evidence-refinement work, not safe broad engine targets.
- `www-sky-com-glass-43-inch`: restored to the prior refined baseline; current compare is 127 expected, 127 actual, and 4 mismatch windows.
- `www-sky-com-glass-air`: the Phase D pass reduced the compare to 257 expected, 265 actual, and 11 mismatch windows. Remaining gaps now cluster around color/price boundaries, hero/carousel grouping, sky-os copy boundaries, comparison-table segmentation, and tab-panel/list boundaries; the target remains candidate until those families are resolved or reclassified with fresh evidence.
- `www-sky-com-protect`: restored to the prior refined baseline; current compare is 104 expected, 106 actual, and 2 mismatch windows.
- `www-sky-com-shop-mobile`: restored to the prior refined baseline after carousel/group/card edits were judged unsafe; current compare is 165 expected, 160 actual, and 12 mismatch windows.
- `www-sky-com-tv`: restored to the prior refined baseline; current compare is 177 expected, 174 actual, and 3 mismatch windows.
- `www-sky-com-tvandbroadband`: remaining gaps include hero/CTA group announcements, product-card grouped text, carousel/package ordering, and list/marker segmentation. The current compare is 351 expected, 309 actual, and 48 mismatch windows.
- `www-sky-com-watch`: restored to the prior refined baseline after carousel/text-boundary edits were judged unsafe; current compare is 259 expected, 259 actual, and 8 mismatch windows.

## Resume Prompt

Use `.codex/prompts/continue-workflow.md` for the whole backlog, or `.codex/prompts/refine-target.md` for one named Sky target.
