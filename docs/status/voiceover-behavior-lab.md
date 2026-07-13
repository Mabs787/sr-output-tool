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

Run `29209152951` completed the side-by-side follow-up batch. Receipts live
under `voiceover-smoke/agent-work/29209152951/behavior-lab/`, with artifacts in
`voiceover-smoke/autonomous-runs/29209152951/artifacts/`.

Accepted exact fixtures after generic engine refinement:

- `tooltip-associated-describedby`: exact, 3/3.
- `tooltip-hidden-custom-wrapper`: exact, 3/3.
- `tooltip-empty-boundary`: exact, 4/4.
- `leading-icon-text-button`: exact, 2/2.
- `search-label-stop`: exact, 6/6.
- `expanded-listbox-popup`: exact, 7/7.
- `aria-grid-popup-table-mapping`: exact, 7/7.
- `grid-popup-row-cell-decomposition`: exact, 6/6.

Reusable engine behavior accepted:

- Native tooltip stops suppress descendant/end traversal. Visible non-custom
  tooltip text is rendered as an `empty tooltip` stop; custom tooltip wrappers
  with hidden-only text remain a plain tooltip stop.
- Leading decorative icon plus direct text native buttons are not grouped just
  because the icon comes first; trailing visible text elements still preserve
  the grouped icon-button behavior.
- Simple native search controls in search contexts split the visible label as
  its own VoiceOver stop and suppress generic `auto complete available` wording
  for the focused search field. Do not apply this split when the same search
  context has a visible native `select` companion, matching the protected
  Wikipedia corpus fixture.
- Expanded autocomplete-owned listbox popups are boundary stops only: VoiceOver
  announces `list box` and does not right-arrow into the option descendants.
- Expanded autocomplete/search controls with `aria-haspopup="grid"` expose the
  owned grid popup as table-like: the popup says `table`, rows are transparent,
  grid cells use table column wording, and the boundary closes with
  `end of table`.

The eight accepted follow-up fixtures no longer carry
`data-sr-fixture-status="draft"`. Keep them as focused repro fixtures; do not
promote them into the live-site corpus unless a later Phase E records unique
corpus value.

Validation after the dialog engine refinement:

- `yarn workspace @sr-output/engine build`: passed.
- `yarn workspace @sr-output/engine test:unit`: passed, 244 passed, 49 skipped.
- `yarn build:extension-runtime`: passed.
- `yarn workspace @sr-output/engine test:voiceover`: passed, 38 passed,
  14 skipped.

Validation after run `29209152951` follow-up refinement:

- `yarn workspace @sr-output/engine build`: passed.
- `yarn workspace @sr-output/engine test:unit`: passed, 245 passed, 49 skipped.
- `node /tmp/analyze-behavior-followup.mjs`: passed, 8 exact fixtures, 0
  mismatch windows.
- `yarn build:extension-runtime`: passed.
- `yarn workspace @sr-output/engine test:voiceover`: passed, 38 passed,
  14 skipped.

## Next Batch: Lists and Cards

Draft scan targets on branch `codex/voiceover-list-card-lab`:

- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/lists-and-cards/marker-link-listitem-boundary.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/lists-and-cards/linked-card-listitem-position.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/lists-and-cards/article-card-heading-boundary.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/lists-and-cards/mixed-inline-listitem-links.html`

Behavior questions:

- How VoiceOver right-arrow traversal treats native list markers when list
  items contain links, trailing text, or lead text before links.
- Whether linked card list items carry list position onto the card, the image,
  the heading link, or only the list summary.
- Where article-card boundaries occur when a date, heading link, and summary
  text are siblings.
- How mixed inline list item text is segmented around one or more links and
  inline emphasis.

Run these as focused repro fixtures. Do not promote them into the live-site
corpus unless Phase E records unique corpus value.

Run `29210975599` completed the initial lists/cards batch. Receipts live under
`voiceover-smoke/agent-work/29210975599/behavior-lab/lists-and-cards/`, with
artifacts in `voiceover-smoke/autonomous-runs/29210975599/artifacts/`.

Accepted exact fixtures after generic engine refinement:

- `linked-card-listitem-position`: exact, 7/7.
- `article-card-heading-boundary`: exact, 13/13.

Reusable engine behavior accepted:

- Simple linked-card list items with a decorative lead image, a single heading
  link, and a paragraph summary carry the list item position onto the heading
  stop. The rule remains generic and does not encode fixture or site copy.
- Dated sibling article-card collections use the article heading link name for
  the VoiceOver article end boundary, matching the existing dated direct-list
  article-card behavior.

Parked families:

- `marker-link-listitem-boundary`: still draft. The scan includes one
  environmental `UserNotificationCenter is not responding` line plus native
  marker/link segmentation differences. The saved AX tree was empty and the
  snapshot payload was metadata-only, so do not broaden marker splitting from
  DOM alone.
- `mixed-inline-listitem-links`: still draft. VoiceOver splits marker, lead
  text, inline emphasis, links, and tails more granularly than the current
  engine, but the available evidence is raw VoiceOver output without AX marker
  contract nodes. Prepare a narrower C.5 rerun with stronger AX/snapshot
  evidence before changing marker logic.

The two accepted lists/cards fixtures no longer carry
`data-sr-fixture-status="draft"`. Keep all four as focused behavior-lab repros;
do not promote them into the live-site corpus unless a later Phase E records
unique corpus value.

Validation after run `29210975599` lists/cards refinement:

- `yarn workspace @sr-output/engine build`: passed.
- `yarn workspace @sr-output/engine test:unit`: passed, 247 passed, 49 skipped.
- `node /tmp/analyze-list-card-lab.mjs`: 2 exact fixtures, 2 parked
  marker-segmentation fixtures.
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
