# SR Output Tool Extension Release Notes

This file is the human-readable release notes history for `@sr-output/extension`, especially for GitHub Releases and packaged zip builds shared with non-developers.

## Unreleased

- Ongoing local changes.

## Version 1.0.0 - 2026-05-27

### Highlights

- First public release of the SR Output Tool extension.
- Added a shareable packaged browser extension zip for non-developer distribution.

### Extension

- Packaged the browser extension as `@sr-output/extension`.
- Added the generated engine runtime sync flow used by the extension.
- Added extension-specific documentation for setup, local loading, packaging, and release sharing.

### Engine Dependency Notes

- Uses `@sr-output/engine` as the shared screen-reader modeling core.
- Includes centralized announcement generation, context-end announcements, and DOM scanning logic provided by the engine package.
- Follows a VoiceOver-led refinement workflow backed by reduced examples and regression tests.

### Notes

- The engine behavior used by the extension is modeled primarily around VoiceOver.
- The extension is intended as a fast accessibility feedback tool and should not replace testing with real screen readers.
- Current sharing is through GitHub release assets rather than a browser store listing.

### Asset

- Attach `packages/sr-extension/dist/sr-output-tool-extension-v1.0.0.zip` to the matching GitHub Release.

## Release Template

Copy this section when preparing a new extension release.

### Version x.y.z - YYYY-MM-DD

#### Highlights

- Short summary of the main extension changes.
- Short summary of the main fixes.

#### Extension

- Changes to the browser extension UI, packaging, or workflow.

#### Engine Dependency Notes

- Relevant engine changes that affect extension output or behavior.

#### Notes

- Known limitations or important caveats for non-developers.
- Reminder that the tool is directional and should not replace real screen reader testing.

#### Asset

- Attach `packages/sr-extension/dist/sr-output-tool-extension-vx.y.z.zip` to the matching GitHub Release.