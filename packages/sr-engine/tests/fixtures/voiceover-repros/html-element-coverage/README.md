# HTML Element Coverage Draft Fixtures

These draft fixtures are local scan targets for native HTML elements that are
missing or rare in the current VoiceOver corpus.

They are intentionally marked with `data-sr-fixture-status="draft"` so
`yarn voiceover:element-coverage` does not count them as covered until they have
been scanned and reviewed. Use `--include-drafts` when planning coverage.

Each file contains good and bad authoring examples. The good examples are the
ones we expect to use for reusable VoiceOver evidence; the bad examples are
included to show skipped, hidden, unlabeled, or otherwise poor accessibility
patterns without needing a live site.

Suggested scan targets:

- `packages/sr-engine/tests/fixtures/voiceover-repros/html-element-coverage/form-status-controls.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/html-element-coverage/text-semantics.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/html-element-coverage/media-graphics-fallbacks.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/html-element-coverage/image-map.html`
- `packages/sr-engine/tests/fixtures/voiceover-repros/html-element-coverage/table-columns-footer.html`

