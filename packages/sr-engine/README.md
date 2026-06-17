# SR Output Tool — Engine

`@sr-output/engine` is the shared screen-reader modeling core used by the browser extension.

It owns the rules that decide how DOM structure, roles, labels, states, grouping, and context should be turned into human-readable screen-reader-style output. Current behavior is modeled around Chrome + VoiceOver patterns.

## Docs

- [Engine architecture](docs/architecture.md)
- [Refinement workflow](docs/refinement-workflow.md)
- [Refinement prompt template](docs/refinement-template.md)

## Build

From the repo root:

```bash
yarn build:engine
```

Or from this package:

```bash
yarn workspace @sr-output/engine build
```

## Tests

Direct engine unit tests live in `packages/sr-engine/tests/` and run through the workspace test command:

```bash
yarn test:unit
```

Or from this package:

```bash
yarn workspace @sr-output/engine test:unit
```

## Refining The Engine

The most reliable way to improve the engine is to compare a small real DOM sample against actual Chrome + VoiceOver output, then lock the fix in with a regression test.

Use [docs/refinement-workflow.md](docs/refinement-workflow.md) for the step-by-step process and [docs/refinement-template.md](docs/refinement-template.md) when preparing a new refinement request.

## Notes

- The goal is to get closer to real assistive technology behavior, not to create a fake universal standard.
- Chrome + VoiceOver is the primary reference model right now.
- Safari + VoiceOver may become a separate engine profile later; do not mix Safari-only behavior into the Chrome-focused engine.
- Every meaningful refinement should end with a reproducible reduced case and a regression test.
