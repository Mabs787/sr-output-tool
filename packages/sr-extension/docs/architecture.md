# Extension Architecture

The browser extension opens an inspector overlay inside the current page, lets the user select a DOM subtree, and displays simulated screen reader output from the shared engine.

## Main Pieces

- **In-page inspector overlay**: Clicking the extension action toggles a fixed overlay inside the current tab, so status stays visible during scanning.
- **DOM selection**: A crosshair overlay lets the user pick any element directly on the page. The selected subtree is scanned.
- **Copy output**: The overlay can copy the current announcement list directly to the clipboard.
- **SR Engine**: Uses `@sr-output/engine`, with announcements currently tuned most closely to Chrome + VoiceOver output.
- **Element highlighting**: Each scanned element is tagged with a `data-sr-id` attribute. Hovering a log entry highlights the matching element on the page.

## File Map

```text
src/ui/popup.html / src/ui/popup.js / src/ui/popup.css            — Embedded inspector overlay UI
src/content/content.js                                           — Content script: overlay host, DOM selection, scanning, highlighting
src/content/engine-runtime-entry.js                              — Bundle entry that imports the shared engine package for the browser runtime
src/content/engine-runtime.js                                    — Generated browser bundle injected before the content script
src/background/background.js                                     — Service worker: overlay toggle, message relay, storage
src/background/offscreen.html / src/background/offscreen.js      — Offscreen clipboard document
src/manifest.json                                                — MV3 manifest source copied to dist/sr-extension-chrome/manifest.json at build time
```
