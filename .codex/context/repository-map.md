# Repository Map

```text
packages/
  sr-engine/       shared screen-reader engine and VoiceOver corpus fixtures
  sr-extension/    Chrome extension UI and bundled engine runtime
  sr-orchestrator/ multi-agent/orchestration package
test-app/          optional local fixture for manual checks
.github/scripts/   VoiceOver scan, artifact import, and refinement helpers
docs/
  workflows/       human workflow docs and phase definitions
  status/          corpus and target handoff status
  design/          architecture/design notes
voiceover-smoke/
  agent-work/      ignored scratch receipts from multi-agent runs
```

## Key Fixture Paths

- `packages/sr-engine/tests/fixtures/voiceover/*.expected.json`
- `packages/sr-engine/tests/fixtures/voiceover/*.html`
- `packages/sr-engine/tests/fixtures/voiceover/*.ax.json`
- `packages/sr-engine/tests/fixtures/voiceover/*.step-snapshots.json`
- `packages/sr-engine/tests/fixtures/voiceover/refinement-manifest.json`

