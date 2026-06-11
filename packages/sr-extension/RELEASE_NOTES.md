# SR Output Tool Extension Release Notes

This file is the human-readable release notes history for `@sr-output/extension`, especially for GitHub Releases and packaged zip builds shared with non-developers.

## Version 1.2.1 - 2026-06-11

### Highlights

- Improved VoiceOver-aligned output for native select listboxes, tablists, separators, disabled links, complementary regions, and guide-price heading fragments.
- Improved element selection and highlighting inside open and declarative shadow DOM content.
- Added popup accessibility polish for larger button targets, clearer focus rings, aligned output rows, and more consistent theme colors.

### Extension

- Updated element picking to use the composed event path so child elements inside open shadow roots can be selected instead of only selecting the host wrapper.
- Updated selected-element highlighting and SR output row hover behavior to work across regular DOM, open shadow roots, and declarative shadow templates.
- Increased popup button and output-row interaction targets to at least 44 by 44 pixels.
- Added a 1px blue focus ring offset outside popup buttons.
- Removed inconsistent blue borders from appearance buttons and the selected-element panel.
- Aligned SR output row numbers with their announcement text.
- Made the dark-mode pick-element button use the same bold blue treatment as light mode.
- Kept cancel button red styling consistent across themes.

### Engine Dependency Notes

- Refined native select listbox output to include selected item count, selected option text, menu item role, and option position.
- Refined `aria-haspopup` tab output to include menu pop-up, tab, group, and tablist-relative position.
- Refined separator, disabled link, decorative SVG link, complementary region end, and guide-price heading output.
- Added DOM traversal support for open shadow roots and declarative shadow templates.
- Added focused regression coverage for the new VoiceOver comparisons and shadow DOM selection behavior.

### Notes

- The tool remains VoiceOver-led and directional; important accessibility flows should still be verified with real assistive technology.

### Asset

- Attach `packages/sr-extension/dist/sr-extension-chrome.zip` to the matching GitHub Release.
- Link users to [docs/install-and-use.md](docs/install-and-use.md) for non-technical installation and usage steps.

## Version 1.2.0 - 2026-06-10

### Highlights

- Added feedback entry points through the extension popup and GitHub issue templates.
- Improved VoiceOver-aligned output for several real TUI component patterns.
- Added clearer empty-output handling when a selected element has no modeled screen reader output.

### Extension

- Added a top-level Feedback button that opens the repo's GitHub Issues page.
- Added GitHub issue forms for output mismatches and feature requests.
- Added in-output empty state messaging: "No output for element."
- Continued popup polish for theme-aware UI, selected-element display, and output rendering.

### Engine Dependency Notes

- Refined multiline styled heading output to include VoiceOver-style nested text levels.
- Refined grouped card links, paragraph-contained links, award image-strip links, and compact per-person price text.
- Skips empty `role="banner"` media banners when all meaningful content is hidden from assistive technology.
- Added regression coverage for each VoiceOver comparison used in this release.

### Notes

- The tool remains VoiceOver-led and directional; important accessibility flows should still be verified with real assistive technology.
- Empty output now appears inside the output panel instead of only as a status message.

### Asset

- Attach `packages/sr-extension/dist/sr-extension-chrome.zip` to the matching GitHub Release.
- Link users to [docs/install-and-use.md](docs/install-and-use.md) for non-technical installation and usage steps.

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
- Added a persisted System/Light/Dark theme preference for the inspector panel.

### Engine Dependency Notes

- Refined DOM scanning for text-only groups, metadata groups, transparent list wrappers, and linked image-card rails.
- Added regression coverage for VoiceOver-style traversal and grouping behavior.
- Added a reusable refinement prompt template for future engine comparisons.

### Notes

- The tool remains VoiceOver-led and directional; important accessibility flows should still be verified with real assistive technology.

### Asset

- Attach `packages/sr-extension/dist/sr-extension-chrome.zip` to the matching GitHub Release.
- Link users to [docs/install-and-use.md](docs/install-and-use.md) for non-technical installation and usage steps.

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
