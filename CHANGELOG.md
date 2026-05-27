# Changelog

This file is the human-readable release notes for the repo, especially for extension builds shared with non-developers.

## Unreleased

- Ongoing local changes.

## Version 1.0.0 - 2026-05-27

### Highlights

- First public release of the SR Output Tool.
- Added a shareable packaged browser extension zip for non-developer distribution.

### Engine

- Split the shared screen-reader logic into `@sr-output/engine`.
- Centralized announcement generation, context-end announcements, and DOM scanning logic in the engine package.
- Documented a VoiceOver-led workflow for refining engine output using reduced examples and regression tests.

### Extension

- Packaged the browser extension as `@sr-output/extension`.
- Added the generated engine runtime sync flow used by the extension.
- Added extension-specific documentation for setup, local loading, packaging, and release sharing.

### Notes

- The engine is modeled primarily around VoiceOver behavior.
- The extension is intended as a fast accessibility feedback tool and should not replace testing with real screen readers.
- Current sharing is through GitHub release assets rather than a browser store listing.

### Asset

- Attach `packages/sr-extension/dist/sr-output-tool-extension-v1.0.0.zip` to the matching GitHub Release.

## Release Template

Copy this section when preparing a new release.

### Version x.y.z - YYYY-MM-DD

#### Highlights

- Short summary of the main changes.
- Short summary of the main fixes.

#### Engine

- Changes to VoiceOver modeling, announcement logic, or DOM scanning.

#### Extension

- Changes to the browser extension UI, packaging, or workflow.

#### Notes

- Known limitations or important caveats for non-developers.
- Reminder that the tool is directional and should not replace real screen reader testing.

#### Asset

- Attach `packages/sr-extension/dist/sr-output-tool-extension-vx.y.z.zip` to the matching GitHub Release.