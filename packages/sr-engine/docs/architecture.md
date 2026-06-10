# Engine Architecture

`@sr-output/engine` is the shared screen-reader modeling core used by the browser extension.

The engine turns DOM structure, roles, labels, states, grouping, and context into human-readable screen-reader-style output. Current behavior is modeled primarily around VoiceOver patterns.

## What The Engine Owns

- announcement generation
- context-end announcements
- DOM scanning and capture heuristics used by the extension
- the shared browser runtime that gets bundled into the extension package

## Main Source Files

```text
src/announcements.ts    — announcement formatting and context-end announcements
src/dom.ts              — DOM scanning, stop detection, descriptor capture, and traversal
src/ax-tree.ts          — accessibility-tree descriptor conversion
src/event-tracker.ts    — event tracking support
src/types.ts            — shared report and descriptor types
src/index.ts            — public package exports
```

## Refinement Boundary

Most output changes should happen in either:

- `src/announcements.ts`, when the descriptor is correct but the spoken wording/order is wrong
- `src/dom.ts`, when the scanner captures the wrong role, label, grouping, order, or stop boundary

Extension UI code should only change when the inspector workflow itself needs to change.
