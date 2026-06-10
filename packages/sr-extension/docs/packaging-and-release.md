# Packaging And Release

Use this guide when preparing a shareable extension zip or GitHub Release.

## Create A Zip

From the repo root:

```bash
yarn package:extension
```

That command builds the engine, rebuilds `src/content/engine-runtime.js`, prepares `dist/sr-extension-chrome/`, and writes `sr-extension-chrome.zip` to:

```text
packages/sr-extension/dist/
```

The zip contains the extension files needed for manual installation workflows. Browser store publishing may still require store-specific packaging and review steps.

## GitHub Release Flow

1. Run `yarn package:extension` from the repo root.
2. Update the extension release notes in [../RELEASE_NOTES.md](../RELEASE_NOTES.md).
3. Create a GitHub Release for the version.
4. Upload `packages/sr-extension/dist/sr-extension-chrome.zip` as the release asset.
5. Link non-technical users to [install-and-use.md](install-and-use.md).

That gives you a public release page with human-readable notes plus a downloadable zip for people who do not need the source repository.
