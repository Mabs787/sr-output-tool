# Phase B: Evidence Refinement

Run this phase for every candidate before fixture judging or engine refinement.

## Agent

Use `.codex/agents/evidence-refiner.toml`.

## Required Evidence

- raw `expectedAnnouncements`
- current `refinedAnnouncements`
- rendered HTML
- AX tree
- step snapshots around disputed steps
- VoiceOver source/caption evidence
- current engine comparison

## Steps

For each suspicious announcement:

1. Decide whether the raw VoiceOver output is plausible and evidence-backed.
2. Preserve surprising output when evidence supports it.
3. Repair `refinedAnnouncements` only when HTML, AX, snapshots, or source evidence prove capture noise.
4. Record every edit with the evidence used.

## Output

- updated fixture JSON when edits are needed
- `03-evidence-refinement.json`
- remaining uncertain announcements, if any

Do not reshape valid VoiceOver output to match the current engine.

