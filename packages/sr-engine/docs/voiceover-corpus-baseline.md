# VoiceOver Corpus Baseline

Last refreshed: 2026-06-23

This baseline uses the VO-first refinement workflow:

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
- `www-sky-com-tv-stream`
- `www-wikipedia-org`

## Active Partial Fixtures

These fixtures protect reliable slices while leaving unresolved regions out of exact gating:

- `web-dev`: header through appearance/language shadow controls.
- `www-apple-com-accessibility`: global/local navigation and the reviewed gallery slices.
- `www-bbc-co-uk-weather`: BBC-wide header through location search button.

## Candidate / Needs Fresh Evidence

These fixtures should be rescanned with current scanner evidence before promotion:

- `business-sky-com-s`: Phase B review preserved the captured open submenu traversal, Salesforce/lightning shadow-DOM carousel/product traversal, live-status title announcement, and consent-dialog tail as page-backed VoiceOver evidence; remaining gaps are too broad for exact gating.
- `www-w3-org-wai-standards-guidelines-wcag`: useful W3C language/list/marker evidence, but current engine comparison has large list/structure divergence from the stored fixture.
- `www-sky-com-broadband`: latest Sky batch candidate; remaining gaps include postcode text-field phrasing, CTA/card grouping, and text cleanup.
- `www-sky-com-deals`: latest Sky batch candidate; remaining gaps include listbox selected-state phrasing, result-count decomposition, and deal-card grouping.
- `www-sky-com-glass-43-inch`: latest Sky batch candidate; remaining gaps include bullet/list decomposition, hero/product grouping, and button/group phrasing.
- `www-sky-com-glass-air`: latest Sky batch candidate; remaining gaps include grouped hero headings, price text cleanup, native controls, and repeated card/button groups.
- `www-sky-com-glass`: latest Sky batch candidate; remaining gaps include hero group announcements, heading/card decomposition, and button/group phrasing.
- `www-sky-com-protect`: Phase B AI refinement corrected clear caption spacing/truncation, but grouped hero/postcode traversal, carousel group/region phrasing, grouped support text, reminder-section grouping, and footer group noise still need reusable engine or scanner decisions.
- `www-sky-com-shop-mobile`: latest Sky batch candidate; remaining gaps include carousel dynamic state, slide button grouping, and heading/card decomposition.
- `www-sky-com-smart-home`: Phase B review preserved grouped hero/price fragments, rail image/list decomposition, grouped card text, FAQ wrapper grouping, footer group noise, and trailing alert as page-backed VoiceOver evidence; not exact yet.
- `www-sky-com-tv`: latest Sky batch candidate; remaining gaps include skip-link capture/order, native controls, and repeated button/group card differences.
- `www-sky-com-tvandbroadband`: latest Sky batch candidate; remaining gaps include hero/CTA group announcements, product-card grouped text, and repeated text cleanup.
- `www-sky-com-watch-what-to-watch-this-week`: latest Sky batch candidate; remaining gaps include text truncation cleanup, local navigation/landmark ordering, grouped headings, and button grouping.
- `www-sky-com-watch`: latest Sky batch candidate; remaining gaps include carousel disabled state from dynamic step state, card grouping, and text cleanup.
- `developer-mozilla-org-en-us`
- `developer-mozilla-org-en-us-docs-web-html`
- `www-w3-org-wai`

## Latest Sky Artifact Note

The latest 1200px Sky batch from run/artifact `27963923991` has been imported
into the corpus. Import/preprocessing created initial `expectedAnnouncements`
and `refinedAnnouncements` for every Sky page, but that is only Phase A of the
workflow. `www-sky-com`, `www-sky-com-broadband-gaming`, and
`www-sky-com-tv-stream` match the current engine exactly and are promoted to
`refined`; the other 13 Sky pages are checked in as preprocessed `candidate`
fixtures with step snapshots. See `sky-refinement-status.md` for the current
handover list.
