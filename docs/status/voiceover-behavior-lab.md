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
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/grouped-control-wrapper-boundaries.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/named-modal-dialog.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/unnamed-modal-dialog.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/dialog-with-navigation-list.html`

These files are marked `data-sr-fixture-status="draft"`. Remove that marker
only after Phase 0/B/C review accepts the VoiceOver scan evidence.

Run `29203076966` produced successful artifacts for the icon-button, combobox,
and grouped-control fixtures, but the original combined
`dialog-navigation-contexts.html` target hung in `Run VoiceOver scan` for about
2h10m before cancellation. Treat that as fixture-design evidence only. The
combined dialog fixture was replaced with one-dialog-per-page targets above.

## 2026-07-12 Processing Results

Artifact receipts:

- `voiceover-smoke/agent-work/29203076966/behavior-lab/`
- `voiceover-smoke/agent-work/29207406381/behavior-lab/`
- `voiceover-smoke/agent-work/behavior-lab-controls-and-contexts-aggregate.json`

Accepted exact fixtures after engine refinement:

- `grouped-control-wrapper-boundaries`: exact before engine changes, 22/22.
- `named-modal-dialog`: exact after modal dialog summary refinement, 3/3.
- `unnamed-modal-dialog`: exact after unnamed modal flattening, 3/3.
- `dialog-with-navigation-list`: exact after modal dialog summary refinement, 3/3.

Reusable engine behavior accepted:

- VoiceOver does not announce `modal` for `aria-modal="true"` dialogs in the
  focused behavior-lab evidence.
- Explicitly named modal dialogs announce the dialog stop, heading child, then
  a summary such as `dialog, with 3 items`; the engine now suppresses the modal
  body descendants and end boundary for this narrow shape.
- Unnamed modal dialogs with visible interactive descendants are transparent
  wrappers; their child controls are announced directly.

Parked families:

- `icon-button-tooltip-contexts`: 3 tooltip-context windows remain. The windows
  mix associated tooltip naming, hidden tooltip text, tooltip end boundaries,
  and a simple leading-icon text button group suffix. Keep parked until smaller
  repros isolate each sub-family.
- `combobox-popup-search-controls`: 4 combobox/search-popup windows remain. The
  windows mix native search label stops, listbox option traversal, ARIA grid
  popup table/grid wording, and row/cell decomposition. Keep parked for a
  separate form-popup behavior batch.

## Side-by-side Follow-up Batches

Draft tooltip/icon-button repros:

- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/tooltip-associated-describedby.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/tooltip-hidden-custom-wrapper.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/tooltip-empty-boundary.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/leading-icon-text-button.html`

Draft combobox/search-popup repros:

- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/search-label-stop.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/expanded-listbox-popup.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/aria-grid-popup-table-mapping.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/grid-popup-row-cell-decomposition.html`

Run these side by side as fixture-only C.5 evidence gathering. Do not make a
tooltip or combobox engine change until each sub-family is backed by its own
scan receipt.

Validation after the dialog engine refinement:

- `yarn workspace @sr-output/engine build`: passed.
- `yarn workspace @sr-output/engine test:unit`: passed, 244 passed, 49 skipped.
- `yarn build:extension-runtime`: passed.
- `yarn workspace @sr-output/engine test:voiceover`: passed, 38 passed,
  14 skipped.

## Scan Command Template

Use the VoiceOver scan workflow on the current branch with:

```bash
/opt/homebrew/bin/gh workflow run "VoiceOver scan" --ref codex/voiceover-behavior-lab -f urls=$'packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/icon-button-tooltip-contexts.html\npackages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/combobox-popup-search-controls.html\npackages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/grouped-control-wrapper-boundaries.html\npackages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/named-modal-dialog.html\npackages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/unnamed-modal-dialog.html\npackages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/dialog-with-navigation-list.html' -f capture_step_snapshots=true -f capture_step_screenshots=true -f capture_screen_recording=false -f max_steps=60 -f navigation_mode=voiceover-right-arrow -f post_navigation_settle_seconds=0
```

## Guardrails

- Preserve the initial rendered HTML oracle for `refinedAnnouncements`.
- Make fixture corrections only with evidence receipts.
- Make engine changes only for reusable VoiceOver-backed behavior.
- If evidence is doubtful, create a narrower C.5 repro rather than guessing.
- Keep behavior-lab repros under `voiceover-repros/behavior-lab/` unless
  Phase E records unique corpus value.
