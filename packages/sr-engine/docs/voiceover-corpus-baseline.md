# VoiceOver Corpus Baseline

Last refreshed: 2026-06-22

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
- `www-wikipedia-org`

## Active Partial Fixtures

These fixtures protect reliable slices while leaving unresolved regions out of exact gating:

- `web-dev`: header through appearance/language shadow controls.
- `www-apple-com-accessibility`: global/local navigation and the reviewed gallery slices.
- `www-bbc-co-uk-weather`: BBC-wide header through location search button.

## Candidate / Needs Fresh Evidence

These fixtures should be rescanned with current scanner evidence before promotion:

- `www-w3-org-wai-standards-guidelines-wcag`: useful W3C language/list/marker evidence, but current engine comparison has large list/structure divergence from the stored fixture.
- `developer-mozilla-org-en-us`
- `developer-mozilla-org-en-us-docs-web-html`
- `www-w3-org-wai`

## Latest Sky Artifact Note

The current engine matched the latest 1200px Sky artifact with zero mismatch
windows in the staging refinement report. The checked-in `www-sky-com` fixture
has been replaced from that artifact and promoted to `refined`.
