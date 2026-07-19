# VoiceOver Corpus Baseline

Last refreshed: 2026-07-19

This baseline uses the VoiceOver-first refinement workflow:

- VoiceOver output is the primary evidence.
- `refinedAnnouncements` remove only clear capture noise.
- Rendered HTML, AX tree, and step snapshots explain or repair capture issues; they do not override page-backed VoiceOver output.
- Surprising output, such as `link, undefined page link`, remains valid when live page evidence backs it.

## Corpus Tiers

The repository intentionally keeps real captured fixtures because they expose
messy framework, content, and browser/VoiceOver behavior that synthetic tests
miss. The corpus should still be curated:

- Exact fixtures are full-page golden gates. They should protect distinct
  behavior or meaningful live-site diversity.
- Focused exact fixtures are compact or component-focused gates for one narrow
  behavior family. They are exact tests, but they are not counted as full-page
  live-site diversity.
- Partial fixtures protect reliable slices while unresolved regions remain out
  of exact gating.
- Candidate fixtures preserve useful evidence and revisit queues, but do not
  block normal exact corpus expectations.
- Focused repro fixtures live under `voiceover-repros/` and should be preferred
  when a new scan only repeats an already-covered behavior.

When adding a scanned site, Phase E must record the unique coverage it adds and
whether an existing exact fixture or focused repro already covers the same
logic. If the value is duplicated, keep the site as candidate evidence or
distill the behavior into a focused repro instead of expanding the golden
corpus by default.

The 2026-07-10 curation pass added explicit tier and coverage-cluster metadata
to every existing manifest entry: 33 full-page golden exact fixtures, 2 focused
exact fixtures, 13 candidate/parked fixtures, and 1 partial fixture. The largest
overlap cluster is the Sky commerce family; keep its exact anchors for now, but
review that cluster first when pruning full-page gates or replacing duplicate
coverage with focused repros.

Run `yarn voiceover:element-coverage` when planning new scans or focused repros
to see which HTML element types are already covered by the fixture corpus and
which gaps are still worth targeting.

## Exact Fixtures

These fixtures currently match the engine exactly against `refinedAnnouncements`:

- `www-bbc-co-uk-weather`
- `www-google-com-accessibility`
- `www-gov-uk-apply-blue-badge`
- `www-gov-uk`
- `www-microsoft-com-en-us-accessibility`
- `developer-mozilla-org-en-us`
- `design-system-service-gov-uk-components-character-count`
- `design-system-service-gov-uk-components-checkboxes`
- `design-system-service-gov-uk-components-date-input`
- `design-system-service-gov-uk-components-error-summary`
- `design-system-service-gov-uk-components-file-upload`
- `design-system-service-gov-uk-components-password-input`
- `design-system-service-gov-uk-components-radios`
- `design-system-service-gov-uk-components-select`
- `design-system-service-gov-uk-components-text-input`
- `design-system-service-gov-uk-components-textarea`
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
- `www-w3-org-wai`
- `www-w3-org-wai-standards-guidelines-wcag`
- `www-wikipedia-org`

## Active Partial Fixtures

These fixtures protect reliable slices while leaving unresolved regions out of exact gating:

- `web-dev`: header through appearance/language shadow controls; direct compare is exact 0, but capture timing remains under review so the slice stays partial.
- `www-apple-com-accessibility`: global/local navigation and the reviewed gallery slices.

## Candidate / Needs Refinement

These fixtures are useful evidence but are not exact corpus gates yet:

- `business-sky-com-s`
- `developer-mozilla-org-en-us-docs-web-html`
- `www-bbc-co-uk-news`
- `www-sky-com-broadband`
- `www-sky-com-broadband-gaming`
- `www-sky-com-glass`
- `www-sky-com-glass-43-inch`
- `www-sky-com-glass-air` - current compare is 257 expected, 265 actual, and 11 mismatch windows; keep as candidate until the color/price, hero/carousel, table, and tab-panel boundaries are resolved or reclassified.
- `www-sky-com-shop-mobile`
- `www-sky-com-watch`
- `www-tesco-com`

The Sky candidates listed here have completed Phase B evidence review. A 2026-06-28 fixture-trust audit restored several refined-output edits that could have hidden true VoiceOver output, so remaining gaps are page-backed dynamic, structural, list-marker, or scanner traversal differences that need reusable engine/scanner decisions before exact gating.

The Dropbox Phase E curation pass isolated 16 non-exact full-page candidates
outside the canonical corpus and kept 4 invalid captures as recapture-only
artifacts. The 16 sets total 687MB, including 190MB of Plans step snapshots,
and focused repros plus engine unit coverage already protect the accepted
reusable consent, narrow list/card, button/region, and linked-image behavior.
Carousel/media remains recapture-only, while broader list/card, pricing/table,
and tooltip/link families remain parked with evidence. None reached exact
gating, so no Dropbox full-page entry was added to the canonical index or
refinement manifest.

The Notion Phase E curation pass for run `29641641399` kept 18 valid targets as
isolated parked evidence, kept `www-notion-com-contact-sales` as isolated
conditional-state-blocked evidence, and kept `www-notion-com-product-mail` as
skip/recapture-only. The final compare has 3,886 expected announcements, 3,533
actual announcements, and 481 mismatch windows, with 0 exact targets and 0
actionable family buckets. The exhaustive Phase B OCR/glyph sweep applied 169
evidence-backed repairs, left 0 remaining candidates, and preserved raw
`expectedAnnouncements`. No full-page Notion fixture was copied into the
canonical corpus, and `index.json` plus `refinement-manifest.json` remain
unchanged; focused repros and unit tests cover the reusable behavior.

The British Airways Phase E curation pass for run `29664876599` kept all 18
valid fresh BA captures as isolated parked evidence and kept Flights plus
Holidays as recapture-only because Chrome geolocation permission prompts
captured focus before page traversal. The final valid-target compare has 1,719
expected announcements, 2,005 actual announcements, and 264 mismatch windows,
with 0 exact fresh targets and 0 promotions. The sweep applied 100
evidence-backed repairs, left 0 unreviewed OCR/glyph/source candidates, and
preserved raw `expectedAnnouncements`. No BA full-page fixture was copied into
the canonical corpus, and `index.json` plus `refinement-manifest.json` remain
unchanged.

The canonical BA homepage fixture remains the promoted exact gate at 208
expected, 208 actual, and 0 mismatch windows. The fresh homepage capture from
run `29664876599` is a different live `Last-minute getaways` state and remains
isolated drift evidence only; do not overwrite the canonical `Summer's sorted`
fixture unless a future Phase E has exact compare output and explicit
replacement rationale.

`web-dev` remains partial because the direct compare is exact, but the 60-second settle rescan still has capture-timing evidence under review. Do not edit the refined announcements from that rescan unless a future receipt documents a fresh evidence-backed correction.

`developer-mozilla-org-en-us` was promoted after the final Phase E review landed at 180 expected, 180 actual, and 0 mismatch windows.

`www-bbc-co-uk-weather` was promoted after the final Phase E review landed at 181 expected, 181 actual, and 0 mismatch windows.

`www-w3-org-wai` was promoted after the final Phase E review landed at 207 expected, 207 actual, and 0 mismatch windows.

`www-w3-org-wai-standards-guidelines-wcag` was promoted after receipt 27 closed the footer punctuation family and the final compare landed at 320 expected, 320 actual, and 0 mismatch windows.

The GOV.UK Design System component fixtures from run `28971764455` were first
refined in an isolated fixture directory, then promoted into the canonical
VoiceOver corpus on 2026-07-09 after Phase B/C/C.5/D/E review. The promoted set
covers character count, checkboxes, date input, error summary, file upload,
password input, radios, select, text input, and textarea. The final isolated
and canonical compare landed at 0 mismatch windows across all ten component
fixtures.

`www-bbc-co-uk-news` is listed as a known unrelated corpus failure until its
card-link ordering mismatch is revisited. The latest Phase E receipt for run
`28405210071` reports first mismatch index 130 and a protected compare with 2
mismatch windows, so do not treat it as exact despite earlier refined status
metadata.

`www-sky-com-tvandbroadband` was refreshed from successful scan `28305378853` on 2026-06-28 and reviewed through Phase B/C/D/E. OCR/source-backed fixture repairs were applied, and hover-open navigation submenu announcements were later removed because the fixture replays the initial non-hover DOM state. Phase D resolved package-card list-marker/position, parenthesized heading-fragment, and price/disclosure split families. Phase C.5 confirmed the remaining hero CTA, What's included, and included-content families as reusable engine gaps, and Phase E promotion now makes the exact compare 351 expected, 351 actual, and 0 mismatch windows.

`business-sky-com-s` was refreshed from successful scan `28305378853` on 2026-06-28 and reviewed through Phase B/C/D/E. OCR/source-backed fixture repairs were applied, and hover-open navigation submenu announcements were later removed because the fixture replays the initial non-hover DOM state. The current compare is 193 expected, 233 actual, and 31 mismatch windows. Rich package-card decomposition/list counting is now fixed, while unresolved trusted initial-DOM families still cover carousel/list-position, wrapper groups, legal/tail traversal, selected-state/text-boundary evidence, and timer volatility. The target remains candidate.

`www-sky-com-tv` was promoted after Phase D fixed the reusable generic-wrapper group-boundary traversal gap. Phase B trusted the three standalone `group` announcements as initial-DOM replayable, and the exact compare is now 177 expected, 177 actual, and 0 mismatch windows.

`www-tesco-com` was processed through Phase E on 2026-06-28. The target remains candidate: the Tesco compare improved from 28 to 2 mismatch windows after reusable carousel/slideshow, linked-heading, quantity-label, fieldset-radio, structured native-footer, searchbox wording, Clubcard list-position spacing, Pets roundel fixture, and promo punctuation cleanup. The target-specific status doc now carries a revisit queue for the remaining saved/live header DOM-state divergence; exact gating is still unresolved and the full corpus test remains red on unrelated Sky fixtures.

Run `29014999637` promoted four exact targets into the canonical corpus: `www-britishairways-com-travel-home-public-en-gb`, `www-gov-uk-find-local-council`, `www-nationalrail-co-uk`, and `www-nhs-uk-service-search-pharmacy-find-a-pharmacy`. `www-royalmail-com-find-a-postcode` stayed candidate with the parked `footer-empty-name-url-path-fallbacks` family at 99 expected, 100 actual, and 2 mismatch windows.
