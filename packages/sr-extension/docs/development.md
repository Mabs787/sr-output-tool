# Extension Development

Use this guide when working on the browser extension from the repo.

## Setup

From the repo root:

```bash
yarn install
yarn build
```

`yarn build` does three things:

- builds `@sr-output/engine`
- bundles the browser runtime into `src/content/engine-runtime.js`
- writes a loadable unpacked extension build to `dist/sr-extension-chrome/`

If you change engine logic, rerun `yarn build` before reloading the extension in the browser.

## Load A Local Development Build

1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top-right.
3. Click **Load unpacked**.
4. Select the `packages/sr-extension/dist/sr-extension-chrome` folder.
5. After local code changes, click **Reload** on the extension card to pick up the latest files.

## Development Commands

From the repo root:

```bash
yarn build
yarn test:unit
```

When working only in this package:

```bash
yarn workspace @sr-output/extension build
yarn workspace @sr-output/extension test:unit
```

Extension-facing regression tests live in `packages/sr-extension/tests/`.
Popup-specific tests live in `packages/sr-extension/tests/popup/`.

## Continuous Integration

GitHub Actions runs the standard build, unit test, and extension packaging checks on pushes and pull requests to `main`. The unit test job runs both the direct engine tests and the extension test suite.
