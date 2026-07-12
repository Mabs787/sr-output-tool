# VoiceOver Behavior Lab

Last updated: 2026-07-12

## Purpose

The behavior lab moves VoiceOver refinement from broad live-site scans toward
focused, reusable behavior questions. New engine rules should come from
VoiceOver-backed DOM/AX contracts, not from site names, class names, product
copy, or one-off fixture coincidences.

## Evidence Inputs

- PR #11 merged the YouTube, Amazon, Twitch, and HTML element coverage
  refinement work into `main`.
- Protected local checks before the merge were green:
  `yarn workspace @sr-output/engine build`,
  `yarn workspace @sr-output/engine test:unit`,
  `yarn build:extension-runtime`, and
  `yarn workspace @sr-output/engine test:voiceover`.
- GitHub CI for PR #11 was green for Build, Unit tests, and Package extension.
- Run `29174041478` found broad-site mismatch families:
  YouTube had `search-header-structure` and `container-or-frame-boundary`;
  Amazon had `search-header-structure`, `list-or-marker`,
  `container-or-frame-boundary`, and `role-or-structure`;
  Twitch was partial artifact evidence only because rendered HTML and AX were
  unavailable.
- C.5 run `29190020121` confirmed the focused YouTube header repro at
  25 expected, 25 actual, and 0 mismatch windows.
- C.5 run `29186810681` confirmed Amazon header search groups at 0 mismatch
  windows and parked the Amazon no-suggestions dialog residual strings as OCR
  ambiguity: `O` versus `0`, and `Al` versus `AI`.
- HTML element coverage run `29108794263` left `media-graphics-fallbacks` and
  `image-map` with remaining role/structure or text families; other reviewed
  coverage fixtures were exact after C.5-backed refinement.

## Mismatch Family Report

| Family | Evidence | Current status | Behavior lab action |
| --- | --- | --- | --- |
| Icon button wrapper/group wording | YouTube broad scan, YouTube C.5 final confirmation, Microsoft protected regression | Partly resolved; needs broader generic proof for custom wrapper and tooltip combinations | Scan focused icon-button/tooltip contexts with native and custom wrappers |
| Combobox/search popup phrasing | YouTube and Amazon broad scans, Amazon header C.5 confirmation | Partly resolved for current protected shapes | Scan focused native searchbox, ARIA combobox, and submit-button adjacency variants |
| Explicit tooltip context | YouTube C.5 iterations and protected regressions | Resolved for known header repro | Scan associated, nested, hidden, and aria-describedby tooltip contexts independently |
| Dialog boundary and navigation list context | Amazon no-suggestions dialog C.5, Sky protected regression | Exact except OCR ambiguity and unnamed-dialog handling | Scan named/unnamed modal dialog contexts with nested nav/list controls |
| List/card marker and structural grouping | Amazon broad scan, corpus baseline candidates | Not first batch; requires a separate card/list lab | Park until controls-and-contexts batch is scanned |
| Media fallback and image-map fallback roles | HTML element coverage C.5 | Remaining focused mismatches | Park for a later native-elements lab |
| OCR/name ambiguity | Amazon no-suggestions dialog C.5 | Parked; not an engine issue | Do not change engine or fixtures without stronger rendered HTML/AX evidence |
| Partial artifact without rendered HTML/AX | Twitch broad scan | Not engine-actionable | Rescan only if we need Twitch-specific evidence later |

## First Batch: Controls and Contexts

Draft scan targets:

- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/icon-button-tooltip-contexts.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/combobox-popup-search-controls.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/dialog-navigation-contexts.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/grouped-control-wrapper-boundaries.html`

These files are marked `data-sr-fixture-status="draft"`. Remove that marker
only after Phase 0/B/C review accepts the VoiceOver scan evidence.

## Scan Command Template

Use the VoiceOver scan workflow on the current branch with:

```bash
/opt/homebrew/bin/gh workflow run "VoiceOver scan" --ref codex/voiceover-behavior-lab -f urls=$'packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/icon-button-tooltip-contexts.html\npackages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/combobox-popup-search-controls.html\npackages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/dialog-navigation-contexts.html\npackages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/grouped-control-wrapper-boundaries.html' -f capture_step_snapshots=true -f capture_step_screenshots=true -f capture_screen_recording=false -f max_steps=0 -f navigation_mode=voiceover-right-arrow -f post_navigation_settle_seconds=0
```

## Guardrails

- Preserve the initial rendered HTML oracle for `refinedAnnouncements`.
- Make fixture corrections only with evidence receipts.
- Make engine changes only for reusable VoiceOver-backed behavior.
- If evidence is doubtful, create a narrower C.5 repro rather than guessing.
- Keep behavior-lab repros under `voiceover-repros/behavior-lab/` unless
  Phase E records unique corpus value.
