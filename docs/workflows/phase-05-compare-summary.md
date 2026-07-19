# Phase 0.5: Compare Summary Triage

Run this phase after Phase 0/A has made scan artifacts available and before
Phase B starts deep evidence refinement across a large target set.

The goal is to produce a compact run-level routing table so repeated mismatch
families are handled together instead of one site at a time.

## Agent

Use `.codex/agents/compare-summarizer.toml`.

## Inputs

- Run id and target list.
- Existing imported fixture paths or artifact paths.
- Latest compare output for each target.
- Phase 0 scan-health receipts when new artifacts are involved.
- Shared run preflight reference when one preflight covers the target set.

## Output

Write a run-level summary under:

```text
voiceover-smoke/agent-work/<run-id>/_summaries/phase05-compact-compare.json
```

The run-level summary must also include:

- `totals`: target, valid, invalid, exact, actionable mismatch-window, and
  conditional-state/outlier mismatch-window counts
- `recurringFamilies`: family name, affected targets, occurrence count,
  confidence, C.5 requirement, next owner, next action, and a reusable
  `familySignature` derived from semantic HTML/AX shape rather than site copy
  or CSS classes
- `sharedShellFamilies`: repeated header, navigation, logo, footer, consent,
  and legal-tail structures, with their `shellFingerprint`, affected targets,
  confidence, and proposed family owner
- `sharedPreflightRef`: `00-agent-preflight.json`

The summary must include one row per target:

- `target`
- `pageIdentity`: expected URL/path, final URL/path, title or page marker,
  and whether the artifact is for the intended page
- `expectedCount`
- `actualCount`
- `mismatchWindowCount`
- `dominantMismatchFamilies`
- `shellFingerprint`: a compact signature of repeated page-shell semantics,
  including landmark order, navigation/list shape, logo/image role shape, and
  footer structure; do not include unstable CSS classes or full page copy
- `sharedShellFamilies`: family ids that this target shares with other rows
- `oracleConfidence`: `high`, `medium`, or `low`
- `disposition`: `exact`, `fixture-evidence-cleanup`,
  `engine-family-candidate`, `needs-c5`, `needs-recapture`, or
  `conditional-state-blocked`
- `nextOwner`: `evidence-refiner`, `fixture-judge`, `repro-scanner`,
  `engine-refiner`, `promoter`, `scan-health`, or `none`
- `nextAction`

Keep detailed compare windows in per-target compare output files. The run-level
receipt should contain counts, family labels, and evidence pointers rather than
embedding full logs or announcement arrays.

## Rules

- Do not edit fixtures or reusable engine logic.
- Do not promote targets from Phase 0.5.
- If the same mismatch family appears on two or more targets, prefer a family
  Phase C.5 or Phase D route over isolated per-site grinding.
- Compute shell fingerprints before assigning per-target Phase B work. When two
  or more targets share a shell family, audit one representative evidence
  packet first, then fan the proven fixture or engine decision out to the
  remaining targets with per-target verification.
- Treat a shell fingerprint as a routing hint, not engine evidence. Any engine
  rule still needs a generic HTML/AX contract and must not depend on a site
  name, copied text, URL, CSS class, or layout accident.
- If page identity is uncertain, route back to Phase 0 or recapture before
  trusting compare counts.
- Keep parked families concrete: owner, next action, blocker, and evidence or
  checks needed.
