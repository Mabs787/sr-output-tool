# SR Output Tool — Engine

`@sr-output/engine` is the shared screen-reader modeling core used by the browser extension.

It owns the rules that decide how DOM structure, roles, labels, states, grouping, and context should be turned into human-readable screen-reader-style output. Current behavior is modeled around Chrome + VoiceOver patterns.

## Docs

- [Engine architecture](docs/architecture.md)
- [Refinement workflow](docs/refinement-workflow.md)
- [AI corpus refinement workflow](docs/ai-corpus-refinement-workflow.md)
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

The imported Chrome + VoiceOver corpus is gated separately:

```bash
yarn workspace @sr-output/engine test:voiceover
```

To compare one fixture and inspect mismatch windows:

```bash
yarn workspace @sr-output/engine voiceover:compare www-sky-com
```

## Refining The Engine

The most reliable way to improve the engine is to compare actual Chrome + VoiceOver output against rendered DOM/AX evidence, then lock reusable behavior into unit tests and corpus fixtures.

Use [docs/refinement-workflow.md](docs/refinement-workflow.md) for the
step-by-step process, [docs/ai-corpus-refinement-workflow.md](docs/ai-corpus-refinement-workflow.md)
for the site-set-to-engine AI loop, and [docs/refinement-template.md](docs/refinement-template.md)
when preparing a new refinement request.

## Notes

- The goal is to get closer to real assistive technology behavior, not to create a fake universal standard.
- Chrome + VoiceOver is the primary reference model right now.
- Safari + VoiceOver may become a separate engine profile later; do not mix Safari-only behavior into the Chrome-focused engine.
- Every meaningful refinement should end with a reproducible rule, a targeted test where practical, and passing corpus gates.
