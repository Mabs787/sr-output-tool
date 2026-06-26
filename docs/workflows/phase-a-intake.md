# Phase A: Intake And Preprocessing

Run this phase only when a target has not already been imported or preprocessed.

## Agent

Use `.codex/agents/intake.toml`.

## Steps

1. Download or locate the scan artifact.
2. List every target and evidence file in the artifact.
3. Confirm the target has rendered HTML, AX tree, step snapshots, raw VoiceOver output, and source/caption evidence where available.
4. Run preprocessing:

```bash
yarn voiceover:refine-artifact -- --run-id <run-id> --target <target> --promote candidate
```

or:

```bash
yarn voiceover:refine-artifact -- --artifact-dir <artifact-dir> --target <target> --promote candidate
```

5. Record `01-intake.json` and `02-preprocess.json`.

## Boundary

Phase A creates draft `expectedAnnouncements` and `refinedAnnouncements`. That output is a draft test oracle, not a trusted refinement.

