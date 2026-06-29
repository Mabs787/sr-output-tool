# VoiceOver Corpus Baseline

Last refreshed: 2026-06-29

This baseline uses the VoiceOver-first refinement workflow:

- VoiceOver output is the primary evidence.
- `refinedAnnouncements` remove only clear capture noise.
- Rendered HTML, AX tree, and step snapshots explain or repair capture issues; they do not override page-backed VoiceOver output.
- Surprising output, such as `link, undefined page link`, remains valid when live page evidence backs it.

## Exact Fixtures

These fixtures currently match the engine exactly against `refinedAnnouncements`:

- `www-bbc-co-uk-news`
- `www-google-com-accessibility`
- `www-gov-uk-apply-blue-badge`
- `www-gov-uk`
- `www-microsoft-com-en-us-accessibility`
- `www-nhs-uk-conditions`
- `www-nhs-uk`
- `www-sky-com`
- `www-sky-com-deals`
- `www-sky-com-protect`
- `www-sky-com-smart-home`
- `www-sky-com-tv`
- `www-sky-com-tv-stream`
- `www-sky-com-tvandbroadband`
- `www-sky-com-watch-what-to-watch-this-week`
- `www-wikipedia-org`

## Active Partial Fixtures

These fixtures protect reliable slices while leaving unresolved regions out of exact gating:

- `web-dev`: header through appearance/language shadow controls.
- `www-apple-com-accessibility`: global/local navigation and the reviewed gallery slices.
- `www-bbc-co-uk-weather`: BBC-wide header through location search button.

## Candidate / Needs Refinement

These fixtures are useful evidence but are not exact corpus gates yet:

- `business-sky-com-s`
- `developer-mozilla-org-en-us`
- `developer-mozilla-org-en-us-docs-web-html`
- `www-sky-com-broadband`
- `www-sky-com-broadband-gaming`
- `www-sky-com-glass`
- `www-sky-com-glass-43-inch`
- `www-sky-com-glass-air` - current compare is 257 expected, 265 actual, and 11 mismatch windows; keep as candidate until the color/price, hero/carousel, table, and tab-panel boundaries are resolved or reclassified.
- `www-sky-com-shop-mobile`
- `www-sky-com-watch`
- `www-tesco-com`
- `www-w3-org-wai`
- `www-w3-org-wai-standards-guidelines-wcag`

The Sky candidates listed here have completed Phase B evidence review. A 2026-06-28 fixture-trust audit restored several refined-output edits that could have hidden true VoiceOver output, so remaining gaps are page-backed dynamic, structural, list-marker, or scanner traversal differences that need reusable engine/scanner decisions before exact gating. See `docs/status/sky-refinement-status.md`.

`www-sky-com-tvandbroadband` was refreshed from successful scan `28305378853` on 2026-06-28 and reviewed through Phase B/C/D/E. OCR/source-backed fixture repairs were applied, and hover-open navigation submenu announcements were later removed because the fixture replays the initial non-hover DOM state. Phase D resolved package-card list-marker/position, parenthesized heading-fragment, and price/disclosure split families. Phase C.5 confirmed the remaining hero CTA, What's included, and included-content families as reusable engine gaps, and Phase E promotion now makes the exact compare 351 expected, 351 actual, and 0 mismatch windows.

`business-sky-com-s` was refreshed from successful scan `28305378853` on 2026-06-28 and reviewed through Phase B/C/D/E. OCR/source-backed fixture repairs were applied, and hover-open navigation submenu announcements were later removed because the fixture replays the initial non-hover DOM state. The current compare is 193 expected, 233 actual, and 31 mismatch windows. Rich package-card decomposition/list counting is now fixed, while unresolved trusted initial-DOM families still cover carousel/list-position, wrapper groups, legal/tail traversal, selected-state/text-boundary evidence, and timer volatility. The target remains candidate.

`www-sky-com-tv` was promoted after Phase D fixed the reusable generic-wrapper group-boundary traversal gap. Phase B trusted the three standalone `group` announcements as initial-DOM replayable, and the exact compare is now 177 expected, 177 actual, and 0 mismatch windows.

`www-tesco-com` was processed through Phase E on 2026-06-28. The target remains candidate: the Tesco compare improved from 28 to 2 mismatch windows after reusable carousel/slideshow, linked-heading, quantity-label, fieldset-radio, structured native-footer, searchbox wording, Clubcard list-position spacing, Pets roundel fixture, and promo punctuation cleanup. The target-specific status doc now carries a revisit queue for the remaining saved/live header DOM-state divergence; exact gating is still unresolved and the full corpus test remains red on unrelated Sky fixtures.
