# VoiceOver Minimal Repro Fixtures

This directory contains synthetic Phase C.5 HTML fixtures used to scan focused
DOM/AX contracts with real VoiceOver.

These files are intentionally separate from captured live-site fixtures in
`packages/sr-engine/tests/fixtures/voiceover/`.

- `voiceover/`: captured site artifacts imported from full-page scans.
- `voiceover-repros/`: small hand-authored reproductions for one mismatch
  family, scanned through the VoiceOver GitHub Action.

Prefer a focused repro over another full-page corpus fixture when the live site
only repeats behavior already covered elsewhere. Full-page fixtures belong in
the corpus when they add distinct behavior or meaningful live-site diversity;
focused repros are the lighter guardrail for one proven DOM/AX contract.

Each repro should use a `data-sr-scan-root` wrapper and preserve the
accessibility-relevant DOM, ARIA, focusability, hidden state, text boundaries,
and AX-derived role/name/state relationships from the original issue.

Draft scan targets may use `data-sr-fixture-status="draft"` on their
`data-sr-scan-root` wrapper. Drafts are useful for planning local fixture scans,
but they are excluded from `yarn voiceover:element-coverage` by default so they
do not look like VoiceOver-verified coverage before a scan has actually run. Use
`yarn voiceover:element-coverage --include-drafts` to include them during
coverage planning, then remove the draft marker after the scan and evidence
review accepts the fixture.
