# VoiceOver Refinement Workflow

This is the canonical workflow for live-site Chrome + VoiceOver corpus refinement.

The goal is to turn scan artifacts into trusted `refinedAnnouncements`, then use those fully processed fixtures to improve reusable engine behavior. Preprocessing alone is not refinement.

## Required Phases

1. [Phase A: Intake](phase-a-intake.md)
2. [Phase B: Evidence Refinement](phase-b-evidence-refinement.md)
3. [Phase C: Fixture Judge](phase-c-fixture-judge.md)
4. [Phase C.5: Minimal Reproduction Scan](phase-c5-minimal-reproduction-scan.md)
5. [Phase D: Engine Refinement](phase-d-engine-refinement.md)
6. [Phase E: Promotion](phase-e-promotion.md)

All phase receipts must follow [Agent Receipts](agent-receipts.md).

## Agent Routing

Project-scoped subagents live in `.codex/agents/`.

- `orchestrator`: coordinates phases, handoffs, and target order.
- `intake`: Phase A artifact intake and preprocessing.
- `evidence-refiner`: Phase B source-of-truth `refinedAnnouncements` review.
- `fixture-judge`: Phase C mismatch classification.
- `repro-scanner`: Phase C.5 minimal reproduction scan loop for uncertain evidence.
- `engine-refiner`: Phase D reusable engine/scanner changes.
- `promoter`: Phase E manifest, docs, status, and final receipts.

Keep model choices in `.codex/agents/*.toml`. Keep behavior and handoffs in these workflow docs.

## Multi-Agent Execution Contract

The repository scripts do not spawn Codex subagents. The top-level Codex
session must spawn the phase agents with the available multi-agent tool when
the user asks for the multi-agent workflow.

Before any phase work starts, the top-level session must create an agent
registry preflight receipt:

```text
voiceover-smoke/agent-work/<run-id>/<target>/00-agent-preflight.json
```

The preflight must record the required roles, roles exposed by the current
multi-agent tool registry, whether tool discovery was attempted, roles still
missing after discovery, the final decision, and the spawned agent ids for the
phase agents. Use `decision: "ready"` only when every required role is exposed
and can be spawned. Use `decision: "blocked"` when a required role is missing
after discovery. Use `decision: "degraded"` only when the user explicitly asks
to continue without a named role.

A run is `multi-agent` only when at least two phase-specific agents are
spawned, or when the top-level session records why only one phase was required.
An orchestrator-only run is not multi-agent.

The top-level session may spawn `orchestrator` to create a routing plan, but it
must still spawn phase-specific agents for the actual phase work:

- `intake` for Phase A when artifact import is needed
- `evidence-refiner` for Phase B
- `fixture-judge` for Phase C
- `repro-scanner` for Phase C.5 when Phase B/C has a scanner-evidence gap,
  uncertain replayability, truncation doubt, or a broad engine rule candidate
- `engine-refiner` for Phase D when Phase C finds a reusable gap
- `promoter` for Phase E when promotion or status updates are needed

Before finalizing, the top-level session must report the spawned agent ids or
nicknames and the receipt files they produced. If a phase is skipped, report the
evidence-backed reason.

Default agents cannot satisfy named phases in a normal multi-agent workflow. If
`repro-scanner` or another required role is not available, do not silently use
`default`; run tool discovery once and either spawn the named role or stop with
`00-agent-preflight.json` set to `blocked`. A degraded/default-agent run may be
useful as exploratory work, but it must not be described as a completed
multi-agent refinement run and must not promote a fixture as `refined`.

Before Phase E promotion, validate the receipt directory:

```sh
yarn voiceover:validate-agent-workflow voiceover-smoke/agent-work/<run-id>/<target> --required-phases A,B,C,C.5,D,E
```

Use the actual required phase list for the target. Omit `C.5` or `D` only when
the receipts explain why those phases were not required.

## Non-Negotiable Rules

- VoiceOver output is the primary evidence. The current engine is not a source of truth.
- Raw `expectedAnnouncements` should preserve what VoiceOver actually heard.
  `refinedAnnouncements` is the replay target for the engine and must describe
  the initial `rendered-html.html` fixture input.
- Raw VoiceOver evidence is append-only. Do not hand-edit raw scan output to
  make a compare pass. If a later scan disagrees, record the later artifact id
  and compare the two evidence sets instead of overwriting the original record.
- `voiceover:preprocess-artifact` / `voiceover:refine-artifact` is Phase A
  preprocessing only.
- A fixture is not refined just because `refinedAnnouncements` exists.
- Evidence refinement must treat `refinedAnnouncements` as an untrusted draft,
  inspect it against HTML, AX, snapshots, and VoiceOver source evidence, and
  edit it directly when the draft is wrong.
- A `refinedAnnouncements` edit is allowed only when it explains the evidence,
  not when it makes an engine change easier. Every edit must carry a fixture
  change receipt entry with the changed range, raw text, before/after refined
  text, reason enum, evidence pointers, confidence, and whether an engine gap
  still remains.
- Structural VoiceOver-vs-engine mismatches must include a focused-node
  contract before they are dismissed as broad or ambiguous. In particular,
  when VoiceOver announces one grouped/card object and the engine decomposes
  children, inspect the active element, focusability, AX/computed name, child
  HTML shape, and scanner descent behavior.
- Text split/join mismatches must include a text-boundary check before they are
  dismissed as OCR noise or flakiness. Inspect the relevant `outerHTML` for
  inline emphasis, `br`, block/span/markdown fragments, list markers, hidden
  text, and text-node boundaries.
- Use rendered HTML, AX tree, step snapshots, and VoiceOver source evidence to repair clear scan/caption/OCR/truncation noise.
- Treat `rendered-html.html` as the initial DOM fixture that the engine replays.
  Use per-step `htmlAfterStep` snapshots to identify whether content appeared
  only because VoiceOver navigation triggered hover, focus, carousel, timer, or
  other step-time state. Check `htmlAfterStep.fingerprint`, `stats`,
  `htmlExcerpt`, `bodyTextExcerpt`, active element text, and matched DOM/AX
  evidence. Such content should remain in raw `expectedAnnouncements`, but it
  must be removed or normalized from `refinedAnnouncements` unless the same
  semantic content is also present and replayable in the initial DOM.
- If `htmlAfterStep` shows a DOM fingerprint/body text change at the same step
  as a disputed VoiceOver line, Phase B must classify the line as
  `initial-dom`, `step-only-dom`, `volatile-dom`, or `not-found` before Phase C
  judges the mismatch.
- When Phase B or Phase C cannot confidently decide whether a disputed line is
  true VoiceOver behavior, capture truncation, conditional state, or an engine
  gap from the saved site evidence, run Phase C.5 before changing fixtures or
  broad engine logic. Phase C.5 must create a minimal same-structure DOM
  reproduction, trigger a focused VoiceOver scan, import the artifact, and feed
  the result back to Phase B/C/D.
- Phase C.5 is also a Phase D confidence tool. When an engine rule feels too
  broad, site-shaped, or surprising, Phase D should request a mini scan to prove
  the isolated DOM/ARIA/table/list/control behavior before committing the rule.
- If refined output is trusted and the engine differs, change reusable engine logic unless there is a documented blocker.
- Once unreplayable page state is removed or normalized from the fixture,
  remaining mismatches are presumed engine/scanner gaps until Phase C/D prove
  otherwise with evidence. Do not hide replayable gaps under a broad
  "dynamic-state" label.
- Remaining mismatches must be revisited, not merely listed. Phase D and Phase E
  receipts must include a revisit queue with the next owner, next action,
  blocker, and checks for every unresolved family.
- Do not add site-specific engine logic.
- Do not move to the next site until the current site has a recorded outcome.

## Fixture Purity

Treat fixture data as two layers:

- Raw evidence: immutable scan evidence that records what VoiceOver heard.
- Refined output: an evidence-bound replay oracle for the initial
  `rendered-html.html` fixture.

Valid reasons to edit `refinedAnnouncements` are limited to:

- `caption-or-ocr-repair`: source/caption evidence proves a transcription issue.
- `truncation-repair`: raw/caption/source or a mini scan proves truncation.
- `conditional-state-removed`: per-step HTML/AX proves hover, focus, carousel,
  timer, personalization, or another step-only state was announced but is not
  replayable from initial DOM.
- `saved-live-dom-divergence`: saved fixture HTML differs from refreshed or
  local DOM, and VoiceOver matches the refreshed/live structure.
- `manual-vo-confirmed`: the user supplied a local VoiceOver confirmation and
  the receipt records the exact text and DOM snippet checked.
- `minimal-repro-confirmed`: Phase C.5 confirmed fixture noise or conditional
  state for the same structure.
- `preprocess-correction`: Phase A made a mechanical normalization error and
  the correction is backed by raw/source evidence.

Invalid reasons:

- the current engine already emits the proposed refined text
- the engine rule would be hard to implement
- the mismatch count decreases
- the site behavior seems unusual but is backed by raw VoiceOver and replayable
  initial DOM evidence

Phase B owns fixture edits. Phase C can return a fixture to Phase B. Phase D
must not edit fixtures while implementing engine logic; if Phase D discovers a
fixture evidence problem, it must stop that family and route it to Phase B or
Phase C.5 with the evidence gap.

## Push Gate

Before pushing when fixture files changed, the top-level session or Phase E must
run a fixture-change review:

- Identify changed fixture files and whether raw evidence, refined output, HTML,
  AX, or manifest data changed.
- Block the push if raw VoiceOver output was hand-edited.
- Require a fixture change receipt entry for every `refinedAnnouncements` range
  that changed.
- Require an explicit warning in the final response and `06-promotion.json` when
  a commit mixes engine changes and more than a small number of fixture-output
  edits.
- Prefer separate commits for engine logic, fixture/evidence changes, and
  workflow/docs changes when the user has not requested a single combined push.
- Do not push fixture-heavy changes that only reduce mismatch counts without
  evidence classifications.

## Receipts

Each phase must leave a machine-readable receipt under:

```text
voiceover-smoke/agent-work/<run-id>/<target>/
  01-intake.json
  02-preprocess.json
  03-evidence-refinement.json
  04-fixture-judge.json
  04-minimal-reproduction-scan.json
  05-engine-refinement.json
  06-promotion.json
  notes.md
```

These files are ignored scratch output. Checked-in source of truth remains in:

- `packages/sr-engine/tests/fixtures/voiceover/`
- `packages/sr-engine/tests/fixtures/voiceover/refinement-manifest.json`
- `docs/status/voiceover-corpus-baseline.md`
- target-specific status docs in `docs/status/`

## Fresh Chat Entry

Use `.codex/prompts/continue-workflow.md` to resume the whole workflow.
Use `.codex/prompts/refine-target.md` to process one named target only.
