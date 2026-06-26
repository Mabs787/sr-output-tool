# Testing Context

Use the narrowest check that proves the current change, then broaden when shared behavior changes.

## Common Commands

```bash
yarn workspace @sr-output/engine build
yarn workspace @sr-output/engine test:unit
yarn workspace @sr-output/engine voiceover:compare <fixture-name>
yarn workspace @sr-output/engine test:voiceover
yarn build:extension-runtime
```

## Phase D Minimum

When reusable engine output changes:

1. Run unit tests.
2. Compare the active fixture.
3. Run the VoiceOver corpus gate when practical.
4. Rebuild the extension runtime.

