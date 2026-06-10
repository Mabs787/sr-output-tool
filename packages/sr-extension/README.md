# SR Output Tool — Browser Extension

A Chrome/Chromium browser extension that opens an inspector overlay inside the current page so you can select part of the DOM and review simulated screen reader output without leaving the tab.

The main goal of the tool is to make screen reader output easier to inspect while building and reviewing web components. It gives you a fast, readable approximation of what the accessibility tree is likely to expose.

The shared engine behind the extension is modeled primarily around VoiceOver-style output and interaction patterns. This extension is useful for quick feedback, but it should not replace testing important flows with real assistive technology.

## Install And Use

If you downloaded `sr-extension-chrome.zip` from a GitHub Release, use the non-technical guide:

- [Install and use the extension](docs/install-and-use.md)

## Developer Docs

- [Extension development](docs/development.md)
- [Packaging and release](docs/packaging-and-release.md)
- [Extension architecture](docs/architecture.md)

## Quick Development Commands

From the repo root:

```bash
yarn install
yarn build
yarn test:unit
```

Extension-facing regression tests live in `packages/sr-extension/tests/`.
