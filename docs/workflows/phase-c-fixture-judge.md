# Phase C: Fixture Judge

Run this phase after Phase B has edited or explicitly approved `refinedAnnouncements`.

## Agent

Use `.codex/agents/fixture-judge.toml`.

## Compare

```bash
yarn workspace @sr-output/engine voiceover:compare <fixture-name>
```

## Classifications

Classify each mismatch as one of:

- fixture still noisy
- reusable engine gap
- dynamic state mismatch
- scanner evidence gap
- ambiguous

## Output

Write `04-fixture-judge.json` with one decision per mismatch.

If the refined fixture is trusted and the engine differs, send the target to Phase D.

