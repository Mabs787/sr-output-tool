# SR Output Tool — Engine

`@sr-output/engine` is the shared screen-reader modeling core used by the browser extension.

It owns the rules that decide how DOM structure, roles, labels, states, grouping, and context should be turned into human-readable screen-reader-style output. Current behavior is modeled around Chrome + VoiceOver patterns.

## Docs

- [Engine architecture](../../docs/design/engine-architecture.md)
- [Multi-agent VoiceOver refinement workflow](../../docs/workflows/voiceover-refinement.md)
- [VoiceOver corpus baseline](../../docs/status/voiceover-corpus-baseline.md)

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

To inspect the current autonomous VoiceOver workflow state and catch isolated
fixture promotion gaps:

```bash
yarn voiceover:workflow-status --run-id 28971764455
```

To audit which HTML element types are covered by the VoiceOver fixture corpus:

```bash
yarn voiceover:element-coverage
```

## Refining The Engine

The most reliable way to improve the engine is to compare actual Chrome + VoiceOver output against rendered DOM/AX evidence, then lock reusable behavior into unit tests and corpus fixtures.

Use [../../docs/workflows/voiceover-refinement.md](../../docs/workflows/voiceover-refinement.md)
as the single source of truth for live-site artifact refinement. It covers
artifact preprocessing, evidence-backed `refinedAnnouncements` cleanup, engine
refinement, promotion, and handoff status.

## Notes

- The goal is to get closer to real assistive technology behavior, not to create a fake universal standard.
- Chrome + VoiceOver is the primary reference model right now.
- Safari + VoiceOver may become a separate engine profile later; do not mix Safari-only behavior into the Chrome-focused engine.
- Every meaningful refinement should end with a reproducible rule, a targeted test where practical, and passing corpus gates.
