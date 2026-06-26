# Architecture Context

`@sr-output/engine` is the shared Chrome + VoiceOver-focused screen-reader modeling core used by the browser extension.

The engine turns DOM structure, roles, labels, states, grouping, and context into human-readable screen-reader-style output.

## Engine Owns

- announcement generation
- context-end announcements
- DOM scanning and capture heuristics
- accessibility-tree descriptor conversion
- the browser runtime bundled into the extension

## Extension Owns

- in-page overlay UI
- element selection and highlighting
- full-page scan command
- background messaging and clipboard flow
- packaging the generated engine runtime for browser injection

## Refinement Boundary

- Change `packages/sr-engine/src/dom.ts` when traversal, role, label, grouping, state, or stop boundaries are wrong.
- Change `packages/sr-engine/src/announcements.ts` when descriptor data is correct but wording or order is wrong.
- Change extension UI code only when the inspector workflow itself needs to change.

