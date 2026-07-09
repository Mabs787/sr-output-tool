# Phase E: Promotion

Run this phase after compare and required tests pass, or after a documented blocker decides the target should remain candidate, partial, or skip.

## Agent

Use `.codex/agents/promoter.toml`.

## Update

- `packages/sr-engine/tests/fixtures/voiceover/refinement-manifest.json`
- `packages/sr-engine/tests/fixtures/voiceover/index.json`
- `packages/sr-engine/tests/fixtures/voiceover/<target>.*`
- `docs/status/voiceover-corpus-baseline.md`
- target-specific status docs in `docs/status/`, when present
- `voiceover-smoke/agent-work/<run-id>/<target>/06-promotion.json`

If refinement was performed in an isolated fixture directory, Phase E is not
complete when that isolated compare reaches zero. Promotion must explicitly copy
the approved `.html`, `.expected.json`, `.ax.json`, and any
`.step-snapshots.json` files into
`packages/sr-engine/tests/fixtures/voiceover/`, merge their entries into
`index.json`, and update `refinement-manifest.json`. Record the source run,
target names, and receipt path in the promotion receipt. Do not report the
target as fully promoted until the canonical fixture corpus, not just the
isolated directory, has been compared.

## Classes

- `refined`: trusted full-page fixture and exact engine match.
- `partial`: reliable slices only; document the slices.
- `candidate`: useful evidence remains, but exact behavior is unresolved.
- `skip`: evidence is too broken or irrelevant.

Use one of these exact machine enum values in `06-promotion.json`:

- `refined`
- `partial`
- `candidate`
- `skip`

## Decision Fields

`06-promotion.json` must include:

- `promotionDecision`
- `exactMatch`: boolean
- `trustedSlices`: array of announcement ranges or named slices for `partial`
- `remainingMismatchFamilies`
- `revisitQueue`: array of unresolved families with next owner, next action, evidence needed, and checks needed
- `blockers`
- `manifestChanges`
- `statusDocsUpdated`
- `fixturePushReview`
- `checks`: commands with status, exit code, summary, and skip reason
- `agentWorkflowValidation`: command, required phases, status, exit code,
  summary, and any degraded/manual/default-agent blockers

Only use `refined` when `exactMatch` is true, Phase B trusted the fixture, and
required checks passed. Required checks include agent workflow validation for
multi-agent runs:

```sh
yarn voiceover:validate-agent-workflow voiceover-smoke/agent-work/<run-id>/<target> --required-phases 0,A,B,C,C.5,D,E
```

Use the actual phase list for the target. Omit `0` only when the artifact was
already imported before the scan-health gate existed or no new scan artifact
was used. Omit other phases only when the receipts explain why they were not
required. If validation fails because a named role was missing, a phase was
executed manually, or `default` was used for a named phase, do not promote the
target as `refined`; record the blocker or rerun the missing phase with the
correct agent role. Use `partial` only when `trustedSlices` identifies the
reliable ranges and `remainingMismatchFamilies` records what is excluded.

Legacy/manual receipt sets may predate `00-agent-preflight.json`, common
receipt fields, or the current phase file names. In that case, Phase E may
record a `legacy-validation-warning` only when the receipt explains:

- which validation command failed
- which schema-era fields or receipts are missing
- which independent compare/test checks passed
- why promotion is still a local status update rather than proof of a fully
  schema-valid multi-agent run

Do not hide the warning. Either normalize the receipt tree in a follow-up pass
or keep the warning visible in `06-promotion.json` and the status docs.

The preferred promotion outcome is `refined` with zero mismatches. Use
`candidate`, `partial`, or `skip` only as a controlled fallback, not as a way to
end a hard mismatch. The promotion receipt must show:

- whether the canonical corpus fixtures were added or updated
- the isolated source directory, if any
- the latest compare count and mismatch families
- which resources were rechecked for each unresolved family
- whether Phase C.5 was run, requested, or impossible
- what reusable engine/scanner fix was attempted or why it was unsafe
- the exact blocker, owner, and next action

Do not promote a target with unresolved mismatches unless every remaining
family has a revisit queue entry that a future autonomous run can resume.

When the promotion decision is `candidate` or `partial`, do not leave the
remaining mismatch list as a dead end. Update the target status doc and
`06-promotion.json` with a revisit queue. Each queue entry must name the family,
the latest compare window indexes, the current actual/expected shape, the next
recommended phase owner, and the concrete action needed before the target can be
promoted. If a family is blocked, record the missing evidence or rejected
prototype and the check that should be rerun after it is addressed.

Do not commit or push ordinary refinement, fixture, engine, status, or docs
changes just because a target phase completed. Push only when it is required to
trigger a remote scan workflow, make a repo-local Phase C.5 reproduction
available to the runner, or satisfy another explicitly required remote workflow
input. Otherwise leave changes local until the user explicitly asks for commit,
push, or PR work.

## Fixture Push Review

When a push is required for scan execution and the diff includes fixture files,
Phase E must review fixture purity before committing or pushing. Record the
result in `fixturePushReview` with:

- `changedFixtureFiles`
- `rawOutputEdited`: boolean
- `rawOutputSourceRunIds`: scan run ids for any imported raw evidence
- `refinedOutputChanged`: boolean
- `refinedChangeCount`
- `receiptCoverage`: whether every refined output edit has a matching
  `fixtureChanges` entry
- `mixedEngineAndFixtureChanges`: boolean
- `riskLevel`: `low`, `medium`, or `high`
- `decision`: `allow-push`, `split-commit-recommended`, or `block-push`
- `reason`

Block the push when it is not required for scan/workflow execution, when raw
VoiceOver output appears hand-edited, when refined output changed without
evidence receipt coverage, or when fixture-heavy changes only reduce mismatch
counts without valid evidence classifications.

When engine, fixture, docs, and workflow changes are mixed, do not push the
whole working tree to trigger a scan. Stage and push only the minimal files
required by the remote scan workflow, such as a repo-local Phase C.5 HTML repro
or workflow input file. If a mixed diff must be pushed for an explicitly
approved reason, the final response must call out the fixture changes and the
evidence classification that justified them.
