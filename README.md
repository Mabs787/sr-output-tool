# Screen Reader Output Tool

This repo contains the shared screen-reader modeling engine and the browser extension that uses it to inspect page output quickly while building accessible UI.

## Repo Structure

```text
packages/
  sr-engine/      shared screen-reader rules, announcement logic, and DOM scanning
  sr-extension/   browser extension shell built on top of the engine
tests/            extension-facing regression coverage
test-app/         optional local fixture for manual checks
```

## Package Docs

- [packages/sr-engine/README.md](packages/sr-engine/README.md) explains what the engine owns, how to build it, and how to refine its output.
- [packages/sr-extension/README.md](packages/sr-extension/README.md) explains how to build, load, use, and package the browser extension.
- [CHANGELOG.md](CHANGELOG.md) is the release-notes file to use when publishing extension zip builds.

## Quick Start

```bash
npm install
npm run build
npm run test:unit
```

## Architecture Overview

`@sr-output/engine` owns the reusable screen-reader logic:

- announcement generation
- context-end announcements
- browser-side DOM scan and capture rules

`@sr-output/extension` owns extension-specific behavior:

- in-page overlay UI
- element selection and highlighting
- background messaging and clipboard flow
- packaging the engine runtime for browser injection

## Common Commands

```bash
# Build the engine and sync the generated runtime into the extension
npm run build

# Run the regression suite
npm run test:unit

# Create a zip of the latest extension build
npm run package:extension

# Optional local page for manual checks
npm run test-app
```

## Releases

For public sharing, the intended flow is:

1. Run `npm run package:extension` to produce the latest extension zip.
2. Add a new entry to [CHANGELOG.md](CHANGELOG.md).
3. Create a GitHub Release and attach the generated zip from `packages/sr-extension/dist/`.
