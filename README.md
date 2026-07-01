# Screen Reader Output Tool

This repo contains the shared screen-reader modeling engine and the browser extension that uses it to inspect page output quickly while building accessible UI.

Task orchestration is handled with Turbo, so package builds and tests reuse cached outputs instead of rebuilding the whole repo on every run.

The repo uses Yarn as the source-of-truth package manager.

## Repo Structure

```text
packages/
  sr-engine/       Chrome + VoiceOver-focused announcement engine and DOM scanner
    tests/         unit tests plus imported VoiceOver corpus fixtures
  sr-extension/    Chrome extension UI built on top of the generated engine runtime
    docs/          install, development, architecture, and release notes
    tests/         extension-facing and popup coverage
docs/              workflow, status, and design docs shared across packages
.codex/            agents, prompts, context, and knowledge for Codex workflows
test-app/          optional local fixture for manual checks
.github/scripts/   VoiceOver scan, artifact import, and refinement helpers
```

## Package Docs

- [packages/sr-engine/README.md](packages/sr-engine/README.md) explains what the engine owns and how to build/test it.
- [packages/sr-extension/README.md](packages/sr-extension/README.md) explains how to build, load, use, and package the browser extension.
- [packages/sr-extension/RELEASE_NOTES.md](packages/sr-extension/RELEASE_NOTES.md) is the extension-specific release-notes file to use when publishing extension zip builds.
- [docs/workflows/voiceover-refinement.md](docs/workflows/voiceover-refinement.md) is the canonical multi-agent VoiceOver refinement workflow.
- [docs/workflows/autonomous-voiceover-loop.md](docs/workflows/autonomous-voiceover-loop.md) describes the continuous scan/refine queue and learning loop.
- [.codex/README.md](.codex/README.md) explains the project-scoped Codex agents, prompts, context, and knowledge layout.

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

The `VoiceOver scan` workflow runs manually on hosted macOS and captures real Chrome + VoiceOver output for pasted page URLs. Each URL runs in its own macOS job and uploads a refinement artifact with:

- `voiceover-output.json`
- `voiceover-sources.json`
- `rendered-html.html`
- `accessibility-tree.json`
- optional `step-snapshots.json`
- optional screenshots
- `scan-debug.json`
- `refinement-manifest.json`

In GitHub Actions, run `VoiceOver scan` with the `urls` input set to one or more page URLs. No element selector is required; URL targets default to scanning the full `body`. The default scan viewport is `1200x543`. Step snapshots should be enabled for corpus/refinement runs; screenshots and screen recordings are disabled by default and should only be enabled for debugging scan behavior.

To create the same URL manifest locally:

```bash
yarn voiceover:create-url-manifest --urls "https://example.com/page"
```

After downloading a `voiceover-scan-*` artifact, the preferred one-target refinement entrypoint is:

```bash
yarn voiceover:preprocess-artifact -- --artifact-dir /tmp/voiceover-artifacts --target www-example-com
```

To download from a GitHub Actions run directly:

```bash
yarn voiceover:preprocess-artifact -- --run-id 123456789 --target www-example-com --force
```

That command is the preprocessing entrypoint: it downloads or reads the artifact, imports a fixture workspace, creates initial `expectedAnnouncements` and `refinedAnnouncements`, applies safe deterministic cleanup, creates an AI prompt, writes a Markdown evidence report, stores rendered HTML / AX tree / step snapshots, and compares the current engine with `refinedAnnouncements`. It does not promote files into the checked-in corpus unless `--promote candidate` or `--promote refined` is passed.

The full refinement workflow continues after that command. The AI/manual pass must review the prompt, report, raw VoiceOver output, rendered HTML, AX tree, step snapshots, and engine diff; correct `refinedAnnouncements` only for evidence-backed capture noise; classify the fixture; update the reusable engine where the refined fixture exposes a real behavior gap; rebuild the extension runtime when engine output changes; and rerun the relevant tests.

Use the lower-level import/prompt commands only when debugging Phase A:

```bash
yarn voiceover:create-refinement-prompt --list
yarn voiceover:create-refinement-prompt --target www-example-com-page
```

The refinement workflow treats the raw VoiceOver stream as the primary evidence. Rendered HTML, step snapshots, AX tree data, computed style evidence, and source diagnostics explain surprising output or repair clear capture noise; they should not be used to reshape valid VoiceOver output to match the current engine.

For the full multi-agent process, use
`docs/workflows/voiceover-refinement.md`. That document is the canonical
workflow for deciding which agents preprocess artifacts, refine
`refinedAnnouncements`, judge mismatches, update reusable engine logic, and
promote fixtures.

For autonomous multi-site operation, use
`docs/workflows/autonomous-voiceover-loop.md`. New live-site scan artifacts must
pass `docs/workflows/phase-0-scan-health.md` before Phase A imports them.

Project-scoped Codex subagents live in `.codex/agents/`. Those TOML files
define phase-specific agent instructions and model routing; workflow markdown
defines behavior and handoffs only.

## Architecture Overview

`@sr-output/engine` owns the reusable screen-reader logic:

- announcement generation
- context-end announcements
- browser-side DOM scan and capture rules

`@sr-output/extension` owns extension-specific behavior:

- in-page overlay UI
- element selection and highlighting
- full-page scan command
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

# Compare one imported VoiceOver fixture against the engine
yarn workspace @sr-output/engine voiceover:compare www-sky-com
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
