# SR Output Tool — Browser Extension

A Chrome/Chromium browser extension that opens an inspector overlay inside the current page so you can select part of the DOM and review simulated screen reader output without leaving the tab.

The main goal of the tool is to make screen reader output easier to inspect while building and reviewing web components. Instead of switching in and out of VoiceOver just to sanity-check a button, card, form control, or composite widget, you can quickly scan a section of the page and get a readable approximation of what the accessibility tree is likely to expose.

The shared engine behind the extension is modeled primarily around VoiceOver-style output and interaction patterns. That means the wording, ordering, and grouping logic are intentionally biased toward VoiceOver behavior rather than trying to be a perfect generic abstraction for every assistive technology.

This extension should be treated as a fast feedback tool, not a replacement for real assistive technology testing. It can help you catch obvious labeling, role, state, and grouping issues earlier, but it will never fully represent the behavior of VoiceOver, NVDA, JAWS, TalkBack, or browser-specific accessibility quirks. Use it to get a strong initial signal, then confirm important flows with actual screen reader testing.

Extension-facing regression tests live in `packages/sr-extension/tests/` and run with `yarn test:unit` from the repo root or `yarn workspace @sr-output/extension test:unit` when working only in this package.

## Development Setup

From the repo root:

```bash
yarn install
yarn build
```

`yarn build` does two things:

- builds `@sr-output/engine`
- bundles the browser runtime into `src/content/engine-runtime.js`
- writes a loadable unpacked extension build to `dist/sr-extension-chrome/`

If you change engine logic, rerun `yarn build` before reloading the extension in the browser.

## Load The Extension Locally

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the `packages/sr-extension/dist/sr-extension-chrome` folder
5. After local code changes, click **Reload** on the extension card to pick up the latest files

## How to Use

1. Navigate to any webpage
2. Click the **SR Output Tool** extension icon in the toolbar
3. An inspector overlay opens inside the current page and stays visible while you work
4. Click **Pick On Page**, then click the element directly in the webpage
5. Review the generated screen reader output in the overlay
6. **Hover over any log entry** to see the corresponding DOM element highlighted in red on the page
7. Click **Copy Output** to copy the announcements as plain text
8. Click **Clear Log** to reset

## How It Works

- **In-Page Inspector Overlay**: Clicking the extension action toggles a fixed overlay inside the current tab, so status stays visible during scanning.
- **DOM Selection**: A crosshair overlay lets you pick any element directly on the page. The entire subtree is scanned.
- **Copy Output**: The overlay can copy the current announcement list directly to the clipboard.
- **SR Engine**: Uses the shared engine package that drives the project's screen reader modeling logic, with announcements currently tuned most closely to VoiceOver-style output.
- **Element Highlighting**: Each scanned element is tagged with a `data-sr-id` attribute. When you hover a log entry, the matching element gets a red highlight border.

## Create A Zip Of The Latest Build

You can package the current unpacked extension files into a zip archive for sharing or manual installation workflows.

From the repo root:

```bash
yarn package:extension
```

That command builds the engine, rebuilds `src/content/engine-runtime.js`, prepares `dist/sr-extension-chrome/`, and writes `sr-extension-chrome.zip` to:

```text
packages/sr-extension/dist/
```

The zip contains the extension files needed for the latest local build. It is useful for sharing a snapshot or keeping a manual release artifact, but browser store publishing may still require store-specific packaging and review steps.

## Release Notes And Sharing

If you want to share the extension with non-developers through GitHub:

1. Run `yarn package:extension` from the repo root.
2. Update the extension release notes in [RELEASE_NOTES.md](RELEASE_NOTES.md).
3. Create a GitHub Release for the version.
4. Upload `packages/sr-extension/dist/sr-extension-chrome.zip` as the release asset.

That gives you a public release page with human-readable notes plus a downloadable zip for people who do not need the source repository.

## Architecture

```text
src/ui/popup.html / src/ui/popup.js / src/ui/popup.css            — Embedded inspector overlay UI
src/content/content.js                                           — Content script (overlay host, DOM selection, scanning, highlighting)
src/content/engine-runtime-entry.js                              — Bundle entry that imports the shared engine package for the browser runtime
src/content/engine-runtime.js                                    — Generated browser bundle injected before the content script
src/background/background.js                                     — Service worker (overlay toggle, message relay, storage)
src/background/offscreen.html / src/background/offscreen.js      — Offscreen clipboard document
src/manifest.json                                                — MV3 manifest source copied to dist/sr-extension-chrome/manifest.json at build time
```
