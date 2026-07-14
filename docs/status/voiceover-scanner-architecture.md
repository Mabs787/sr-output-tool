# VoiceOver Scanner Architecture

Last updated: 2026-07-14

## Purpose

This branch starts the scanner architecture pass recommended after the behavior
lab work exposed diminishing returns from small predicate-only refinements.
The goal is to separate traversal, segmentation, context attachment, and
announcement formatting so future VoiceOver evidence maps to a clear layer.

## Branch

- `codex/scanner-traversal-refactor`

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

## Next Architecture Steps

- Expose optional debug stop metadata without changing default public scan
  output.
- Move inline text/list segmentation helpers behind a dedicated stop-emitter
  module.
- Add targeted tests that prove output stability while debug stop sources
  identify traversal, segmentation, context-end, and synthetic stops.
