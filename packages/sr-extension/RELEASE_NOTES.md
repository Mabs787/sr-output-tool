# SR Output Tool Extension Release Notes

This file is the human-readable release notes history for `@sr-output/extension`, especially for GitHub Releases and packaged zip builds shared with non-developers.

## Version 1.1.0 - 2026-06-09

### Highlights

- Reworked extension packaging so builds produce a loadable Chrome extension and shareable zip.
- Improved VoiceOver-aligned output for grouped metadata, linked image cards, and rail-style content.
- Added inspector UI improvements for selected-element visibility and page highlighting.

### Extension

- Moved extension source into `src/` and added build tooling for unpacked and zipped extension output.
- Added an in-page inspector panel with draggable/resizable behavior.
- Added selected-element tag display with overflow ellipsis.
- Added hover highlighting for selected elements and output rows, with the inspector panel layered above highlights.

### Engine Dependency Notes

- Refined DOM scanning for text-only groups, metadata groups, transparent list wrappers, and linked image-card rails.
- Added regression coverage for VoiceOver-style traversal and grouping behavior.
- Added a reusable refinement prompt template for future engine comparisons.

### Notes

- The tool remains VoiceOver-led and directional; important accessibility flows should still be verified with real assistive technology.

### Asset

- Attach `packages/sr-extension/dist/sr-extension-chrome.zip` to the matching GitHub Release.

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

- Attach `packages/sr-extension/dist/sr-extension-chrome.zip` to the matching GitHub Release.

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

- Attach `packages/sr-extension/dist/sr-extension-chrome.zip` to the matching GitHub Release.
