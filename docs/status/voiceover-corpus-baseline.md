# VoiceOver Corpus Baseline

Last refreshed: 2026-06-28

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
- `www-sky-com-broadband-gaming`
- `www-sky-com-deals`
- `www-sky-com-smart-home`
- `www-sky-com-tv-stream`
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
- `www-sky-com-glass-43-inch`
- `www-sky-com-glass-air`
- `www-sky-com-glass`
- `www-sky-com-protect`
- `www-sky-com-shop-mobile`
- `www-sky-com-tv`
- `www-sky-com-tvandbroadband`
- `www-sky-com-watch`
- `www-tesco-com`
- `www-w3-org-wai`
- `www-w3-org-wai-standards-guidelines-wcag`

The Sky candidates listed here have completed Phase B evidence review; remaining gaps are page-backed dynamic, structural, list-marker, or scanner traversal differences that need reusable engine/scanner decisions before exact gating. See `docs/status/sky-refinement-status.md`.

`business-sky-com-s` was refreshed from successful scan `28301913611` on 2026-06-27 and reviewed through Phase B/C/D/E. OCR/source-backed fixture repairs were applied, and hover-open navigation submenu announcements were later removed because the fixture replays the initial non-hover DOM state. Saved page state still diverges from VoiceOver for carousel/package content, legal/tail state, and timer/list-position volatility. A narrow Phase D heading prototype regressed already-refined Sky fixtures and was removed, so the target remains candidate.

`www-sky-com-tv` was freshly reviewed through Phase B/C/D/E on 2026-06-27. Seven refinedAnnouncements repairs were applied, leaving 9 trusted reusable engine gaps. A broad Phase D prototype made the target exact but regressed already-refined corpus fixtures, so it was removed. A narrower follow-up engine fix for focusable structured carousel/list-card `li` groups was kept, reducing the target to 7 remaining mismatch windows; the target remains candidate.

`www-tesco-com` was processed through Phase E on 2026-06-28. The target remains candidate: the Tesco compare improved from 28 to 2 mismatch windows after reusable carousel/slideshow, linked-heading, quantity-label, fieldset-radio, structured native-footer, searchbox wording, Clubcard list-position spacing, Pets roundel fixture, and promo punctuation cleanup. The target-specific status doc now carries a revisit queue for the remaining saved/live header DOM-state divergence; exact gating is still unresolved and the full corpus test remains red on unrelated Sky fixtures.
