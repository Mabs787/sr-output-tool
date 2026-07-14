# VoiceOver Scanner Architecture

Last updated: 2026-07-14

## Purpose

This branch starts the scanner architecture pass recommended after the behavior
lab work exposed diminishing returns from small predicate-only refinements.
The goal is to separate traversal, segmentation, context attachment, and
announcement formatting so future VoiceOver evidence maps to a clear layer.

## Branch

- `codex/scanner-traversal-refactor`
- `codex/scanner-inline-segmentation-refactor`
- `codex/scanner-debug-artifacts`

## Step 1: Traversal Stop Seam

Implemented a behavior-preserving intermediate `TraversalStop` representation
inside the DOM scanner.

What changed:

- Added exported `TraversalStopKind` and `TraversalStop` types.
- Routed synthetic text stops, descriptor split stops, modal summary stops, and
  context-end stops through one `emitTraversalStop` path.
- Preserved existing `ScanLogEntry` output shape and announcement strings.

Why this matters:

- Future debug tooling can attach stop `kind` and `source` before the scanner
  collapses everything into announcement strings.
- Future segmentation modules can emit stops without duplicating bounding-box,
  role/name, and log-index plumbing.
- Marker/inline text work can move toward a reusable segmenter instead of more
  ad hoc `scanSubtree` branches.

Validation:

- `yarn workspace @sr-output/engine build`: passed.
- `yarn workspace @sr-output/engine test:unit`: passed, 247 passed, 49 skipped.

## Step 2: Optional Traversal Debug Metadata

Added opt-in traversal debug metadata to scan log entries.

What changed:

- Added `includeTraversalDebug?: boolean` to `DomScannerOptions`.
- Added exported `TraversalDebugMetadata`.
- When debug is enabled, each emitted `ScanLogEntry` includes
  `traversalDebug.stopKind`, `traversalDebug.stopSource`,
  `traversalDebug.descriptorRole`, and `traversalDebug.descriptorName`.
- Default `scanSubtree()` output remains unchanged because
  `traversalDebug` is omitted unless the option is enabled.

Why this matters:

- Engineers can now ask why a stop exists without changing the scanner's normal
  public output.
- Future VoiceOver receipts can distinguish descriptor, split, synthetic, and
  context-end stops when investigating traversal or segmentation mismatches.
- This creates a safe landing zone for the next inline/list segmentation
  module.

Validation:

- `yarn workspace @sr-output/engine build`: passed.
- `yarn workspace @sr-output/engine test:unit`: passed, 248 passed, 49 skipped.

## Step 3: Named Descriptor Split Sources

Started the inline/list segmentation seam by moving the existing descriptor
split-helper priority chain behind `descriptorAnnouncementResult`.

What changed:

- Preserved the existing split-helper priority order and announcement output.
- Replaced the generic `descriptor-announcements` debug source with specific
  sources such as `descriptor-announcement` and `split-inline-text-link`.
- Added a focused debug test proving ordinary descriptor stops and inline
  text-link split stops can be distinguished when `includeTraversalDebug` is
  enabled.

Why this matters:

- Debug receipts can now identify whether an announcement came from the base
  descriptor formatter or a specific segmentation helper.
- Future marker/list segmentation work can be migrated one helper family at a
  time without changing public scan output.

Validation:

- `yarn workspace @sr-output/engine build`: passed.
- `yarn workspace @sr-output/engine test:unit`: passed, 248 passed, 49 skipped.

## Step 4: Scan Artifact Traversal Debug

Added an opt-in engine traversal debug artifact to the VoiceOver scan runner.

What changed:

- Each scan target now writes `engine-traversal-debug.json` beside
  `voiceover-output.json`, `rendered-html.html`, `accessibility-tree.json`, and
  `scan-debug.json`.
- The artifact runs the built DOM scanner over the reduced rendered HTML with
  `includeTraversalDebug: true`.
- `scan-debug.json` and `refinement-manifest.json` now reference the debug
  artifact and include quick source/kind counts.
- The artifact is fail-soft: if the built engine cannot be loaded in the scan
  environment, the scan still completes and the debug JSON records the error.

Why this matters:

- Broad site scans can now classify mismatch families by scanner emission
  source instead of guessing from final announcement strings.
- C.5 repro prep can identify whether a mismatch points at traversal,
  segmentation, context-end handling, descriptor formatting, or synthetic text
  handling.
- The debug output remains diagnostic only; VoiceOver evidence, rendered HTML,
  AX output, snapshots, and screenshots still decide expected behavior.

Validation:

- `node --check .github/scripts/run-voiceover-scan.mjs`: passed.
- `yarn workspace @sr-output/engine build`: passed.
- `yarn workspace @sr-output/engine test:unit`: passed, 248 passed, 49 skipped.

## Next Architecture Steps

- Run a broad site scan with debug artifacts enabled by default.
- Use the new source/kind counts to choose the next reusable behavior questions.
- Move inline text/list segmentation helpers behind a dedicated stop-emitter
  module once scan receipts show the highest-value mismatch family.
- Add targeted tests that prove output stability while debug stop sources
  identify traversal, segmentation, context-end, and synthetic stops.
