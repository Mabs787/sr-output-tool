# Phase A: Intake And Preprocessing

Run this phase only when a target has not already been imported or preprocessed.

For newly downloaded scan artifacts, Phase A must be preceded by a passing
[Phase 0 scan-health gate](phase-0-scan-health.md), or an explicit
`partial-evidence` Phase 0 receipt that prevents premature promotion.

## Agent

Use `.codex/agents/intake.toml`.

## Steps

1. Check whether Phase A can be skipped.
2. Download or locate the scan artifact when required.
3. Confirm the target/run has `00-scan-health.json` when the artifact came from
   a new scan.
4. List every target and evidence file in the artifact.
5. Confirm the target has rendered HTML, AX tree, step snapshots, raw VoiceOver output, and source/caption evidence where available.
6. Run preprocessing:

```bash
yarn voiceover:preprocess-artifact -- --run-id <run-id> --target <target> --promote candidate
```

or:

```bash
yarn voiceover:preprocess-artifact -- --artifact-dir <artifact-dir> --target <target> --promote candidate
```

7. Record `01-intake.json` and `02-preprocess.json` using `docs/workflows/agent-receipts.md`.

## Skip Criteria

Phase A may be skipped only when all of these are true:

- `packages/sr-engine/tests/fixtures/voiceover/<target>.expected.json` exists
- the fixture contains non-empty `expectedAnnouncements`
- the fixture contains `refinedAnnouncements`, even if still draft
- `packages/sr-engine/tests/fixtures/voiceover/<target>.html` exists
- `packages/sr-engine/tests/fixtures/voiceover/<target>.ax.json` exists
- the target appears in `packages/sr-engine/tests/fixtures/voiceover/index.json`
- the target appears in `packages/sr-engine/tests/fixtures/voiceover/refinement-manifest.json`
- if available in the source artifact, step snapshots have either been imported
  or the Phase A receipt records why they are absent

If any required marker is missing, run Phase A or return `blocked` with the
missing artifact path, run id, or evidence file.

## Boundary

Phase A creates draft `expectedAnnouncements` and `refinedAnnouncements`. That output is a draft test oracle, not a trusted refinement.
