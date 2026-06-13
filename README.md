# Screen Reader Output Tool

This repo contains the shared screen-reader modeling engine and the browser extension that uses it to inspect page output quickly while building accessible UI.

Task orchestration is handled with Turbo, so package builds and tests reuse cached outputs instead of rebuilding the whole repo on every run.

The repo uses Yarn as the source-of-truth package manager.

## Repo Structure

```text
packages/
  sr-engine/      shared screen-reader rules, announcement logic, and DOM scanning
    tests/        direct engine unit coverage
  sr-extension/   browser extension shell built on top of the engine
    tests/        extension-facing regression and popup coverage
test-app/         optional local fixture for manual checks
```

## Package Docs

- [packages/sr-engine/README.md](packages/sr-engine/README.md) explains what the engine owns, how to build it, and how to refine its output.
- [packages/sr-extension/README.md](packages/sr-extension/README.md) explains how to build, load, use, and package the browser extension.
- [packages/sr-extension/RELEASE_NOTES.md](packages/sr-extension/RELEASE_NOTES.md) is the extension-specific release-notes file to use when publishing extension zip builds.

## Quick Start

```bash
yarn install
yarn build
yarn test:unit
```

`yarn build`, `yarn test:unit`, and `yarn package:extension` now run through Turbo across the workspace graph, with the extension build depending on the engine build and a bundled browser runtime step.

## Continuous Integration

GitHub Actions runs on pushes and pull requests to `main`. The CI workflow has separate jobs for:

- `Build`
- `Unit tests`
- `Package extension`

The build job archives the compiled engine, generated extension runtime, and unpacked extension build for the downstream test and package jobs.

The `VoiceOver smoke` workflow runs on hosted macOS and captures real VoiceOver output for fixture pages. Its artifact includes `ai-refinement-input.json` files that pair normalized VoiceOver output with normalized engine output and source HTML.

Manual workflow runs can scan whole pages from a pasted URL list. In GitHub Actions, run `VoiceOver smoke` with the `urls` input set to one or more page URLs. No element selector is required; URL targets default to scanning the full `body`.

To create the same URL manifest locally:

```bash
yarn voiceover:create-url-manifest --urls "https://example.com/page"
```

After downloading the `voiceover-smoke-diagnostics` artifact, prepare the refinement queue with:

```bash
yarn voiceover:refinement
```

To download the latest successful artifact from `main` with the GitHub CLI:

```bash
yarn voiceover:refinement --download-latest --force
```

To create a controlled AI handoff prompt for one eligible scan:

```bash
yarn voiceover:create-refinement-prompt --list
yarn voiceover:create-refinement-prompt --target hero-sibling-copy
```

The refinement queue and prompt classify mismatches before any AI edit is attempted. Punctuation-only and role-order differences are treated as low-confidence and should not trigger engine changes by themselves.

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
# Build the engine and bundle the extension runtime
yarn build

# Run the regression suite
yarn test:unit

# Create a zip of the latest extension build
yarn package:extension

# Optional local page for manual checks
yarn test-app
```

## Releases

For public sharing, the intended flow is:

1. Run `yarn package:extension` to produce the latest extension zip.
2. Add a new entry to [packages/sr-extension/RELEASE_NOTES.md](packages/sr-extension/RELEASE_NOTES.md).
3. Create a GitHub Release and attach the generated zip from `packages/sr-extension/dist/`.

## License

Copyright (c) 2026 Mabs787. All rights reserved.

This repository is public for transparency and review. Commercial use,
redistribution, sublicensing, or republishing is not permitted without prior
written permission.
