# Tesco Refinement Status

This is the handover note for `www-tesco-com` in VoiceOver smoke run `28285349794`.

## Outcome

- Promotion decision: `candidate`
- Exact match: `false`
- Compare state: `333` expected, `338` actual, `2` mismatch windows
- Final gate status: not exact, so do not promote to `refined`

## What Changed

- Phase D kept reusable carousel/slideshow `roleDescription`, carousel-control grouping, linked-card heading context, quantity-label prelude, labeled fieldset radio phrasing, structured native footer naming, and searchbox popup wording fixes.
- Follow-up evidence review treated the local Tesco DOM/VoiceOver checks as source-of-truth evidence for the previously queued Pets, promo punctuation, and native footer families. Tesco compare improved from `28` to `2` mismatch windows.
- The full corpus test still fails on unrelated Sky fixtures, so the target remains candidate evidence.

## Remaining Mismatch Families

- header-saved-live-dom-state-divergence

## Revisit Queue

- `header-saved-live-dom-state-divergence`: compare windows `1` and `2`; the saved fixture HTML contains an extra early `All departments menu` before the search form, then a second `All departments menu` after search/sign-in/register. A local live Tesco DOM sample shows the expected order instead: Tesco logo, search form, search button, sign-in/register, then All departments. VoiceOver expected output matches the local live DOM order, while the engine is replaying the saved fixture order. Next owner: `evidence-refiner`; next action: repair or recapture the Tesco header fixture, or add fixture-level normalization for duplicate responsive header/nav blocks. Do not treat this as a generic engine ordering bug unless a refreshed fixture still contains the same saved DOM order and VoiceOver still skips/reorders it.

## Resolved In Follow-Up

- `roundel-link-image-and-visible-text-composition`: the local Tesco snippet has `aria-label="Pets"` on the link and local VoiceOver says `link, Pets`; the previous `link, image for Pets Pets Pets` refinement was fixture noise and has been reverted to the engine/local-VO output.
- `promo-card-inline-text-boundary-and-punctuation`: cleaned fixture punctuation/hyphen artifacts and added generic announcement normalization for spaces before punctuation.
- `native-footer-landmark-naming`: local VoiceOver says `footer`; the engine now uses `footer` for unlabeled native footers with structured footer navigation/link content while preserving explicit/named `contentinfo` and informational paragraph footers.

## Source Of Truth

- Manifest entry: `packages/sr-engine/tests/fixtures/voiceover/refinement-manifest.json`
- Corpus baseline: `docs/status/voiceover-corpus-baseline.md`
