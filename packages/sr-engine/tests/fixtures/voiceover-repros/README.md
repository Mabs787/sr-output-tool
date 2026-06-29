# VoiceOver Minimal Repro Fixtures

This directory contains synthetic Phase C.5 HTML fixtures used to scan focused
DOM/AX contracts with real VoiceOver.

These files are intentionally separate from captured live-site fixtures in
`packages/sr-engine/tests/fixtures/voiceover/`.

- `voiceover/`: captured site artifacts imported from full-page scans.
- `voiceover-repros/`: small hand-authored reproductions for one mismatch
  family, scanned through the VoiceOver GitHub Action.

Each repro should use a `data-sr-scan-root` wrapper and preserve the
accessibility-relevant DOM, ARIA, focusability, hidden state, text boundaries,
and AX-derived role/name/state relationships from the original issue.
