# VoiceOver Refinement Workflow

This is the canonical workflow for live-site Chrome + VoiceOver corpus refinement.

The goal is to turn scan artifacts into trusted `refinedAnnouncements`, then use those fully processed fixtures to improve reusable engine behavior. Preprocessing alone is not refinement.

The target outcome for each site is zero compare mismatches. A non-zero result
is allowed only as a recorded `candidate`, `partial`, `blocked`, or `skip`
outcome with evidence-backed revisit entries. Do not treat a difficult mismatch
as an acceptable endpoint until the workflow has rechecked the saved evidence,
attempted the safe reusable path, and used Phase C.5 when a focused scan could
reduce uncertainty.

The refined fixture oracle is the VoiceOver output for the initial captured
HTML, not every announcement produced while VoiceOver navigation mutates the
page. Raw `expectedAnnouncements` may preserve hover, focus, carousel,
accordion, timer, personalization, or other step-time output, but
`refinedAnnouncements` must represent what VoiceOver should produce when
entering the initial `rendered-html.html` state. If page state changes while
moving down the page, use `htmlAfterStep` and snapshots to explain the raw
capture, then remove or normalize non-initial state from the refined replay
target unless the same semantic content is present and replayable in the
initial HTML.

## Required Phases

0. [Phase 0: Scan Health Gate](phase-0-scan-health.md)
0.5. [Phase 0.5: Compare Summary Triage](phase-05-compare-summary.md)
1. [Phase A: Intake](phase-a-intake.md)
2. [Phase B: Evidence Refinement](phase-b-evidence-refinement.md)
3. [Phase C: Fixture Judge](phase-c-fixture-judge.md)
4. [Phase C.5: Minimal Reproduction Scan](phase-c5-minimal-reproduction-scan.md)
5. [Phase D: Engine Refinement](phase-d-engine-refinement.md)
6. [Phase E: Promotion](phase-e-promotion.md)

For continuous multi-site operation, use
[Autonomous VoiceOver Loop](autonomous-voiceover-loop.md). The autonomous loop
adds queue/state management and learning capture; it does not replace the phase
rules in this document.

All phase receipts must follow [Agent Receipts](agent-receipts.md).

## Large Multi-Site Scan Strategy

For a large live-site scan set, do not begin by blindly processing fixed-size
site batches. Start with a fast triage pass across every artifact, then batch
work by mismatch family. Fixed-size batches are acceptable for download,
intake, or scan-health throughput, but refinement should pivot to family-based
work as soon as compare results show repeated patterns.

Before Phase B starts in earnest, run
[Phase 0.5: Compare Summary Triage](phase-05-compare-summary.md) across the
whole set and record, for each target:

- expected count, actual count, and mismatch window count
- dominant mismatch families
- confidence in the raw/refined oracle
- whether the target is exact, fixture-evidence cleanup, engine-family
  candidate, needs C.5, needs recapture, or conditional-state blocked
- the next action and owner
- a semantic shell fingerprint and shared shell-family ids for repeated header,
  logo, navigation, consent, and footer structures

Use this triage to separate special cases early:

- Bad oracle or suspicious capture: for example, a one-line expected oracle
  against a large actual traversal. Route to recapture or fixture normalization;
  do not spend engine-refinement time on it.
- Conditional-state fixture: page state differs between initial
  `rendered-html.html` and step-time snapshots. Route through Phase B and C.5
  only if the initial-state replay target remains unclear.
- Repeated mismatch family: if the same family appears on two or more sites,
  stop per-site grinding and investigate it as a family.
- Repeated page shell: use one representative target to establish the generic
  HTML/AX contract, then verify the decision across every target sharing the
  shell fingerprint. Do not derive engine predicates from site copy or CSS
  classes.
- Exact or near-exact target: finish evidence receipts quickly and keep it out
  of broad engine experiments.

Phase 0.5 must also record an early corpus-value recommendation for every
target: `golden-exact-candidate`, `future-golden-candidate`,
`focused-family-evidence`, `park-candidate`, or `archive-partial`. This is a
routing recommendation, not promotion. Use it to spend deep Phase B/C time on
durable targets and shared families rather than treating every scanned page as
an equally likely full-page golden fixture.

Prefer batches like these over "first five sites" batches:

- linked logo or image-role behavior
- navigation, menu, list, and marker behavior
- cards, grouped wrappers, leading media, and image stops
- form, combobox, select, popup, and conditional control state
- code, `pre`, table, punctuation, and text-boundary behavior
- carousels, dialogs, date pickers, and other dynamic widgets
- bad oracle, recapture, or scanner-debug failures

This makes C.5 more efficient: one focused repro can answer a reusable behavior
question for several sites, and one Phase D engine pass can reduce multiple
fixtures. If a mismatch appears on two or more sites, the default next action is
family C.5, not more isolated fixture editing.

Parking a mismatch is allowed only when the receipt records one of:

- existing C.5 evidence says the generic rule is unsafe
- a new C.5 scan is required, with the proposed fixture shape or exact command
- recapture or fixture normalization is required
- the mismatch is conditional-state-only and not replayable from initial HTML
- the proposed engine rule would be site-specific, broad, or insufficiently
  guarded

Do not let `parked` mean "not attempted." Every parked family needs a concrete
revisit entry with owner, next action, blocker, and evidence needed.

Parallelize by ownership:

- Phase 0/A/B/C evidence and fixture-judge work may run per site in parallel
  when each worker writes only isolated target receipts or fixtures.
- Phase C.5 may run per mismatch family in parallel when repro fixtures and
  receipts do not overlap.
- Only one Phase D engine-refiner may edit engine/runtime/test files at a time
  unless separate worktrees are explicitly used. Record an exactly-one
  engine-refiner lease before editing shared engine/runtime/test files.

For time efficiency, use short per-site limits after triage. Spend only enough
time to prove whether the issue is fixture evidence, a repeated family, or a
blocker. Move repeated or uncertain behavior into C.5 quickly, then return to
the affected sites after the family decision. Final receipts for a large set
must include the compact compare table, C.5 count, engine changes, fixture
changes, exact targets, parked blockers, and verification results.

Do not use mismatch-window totals alone as the progress or regression metric.
The window heuristic can increase when a correct insertion creates additional
sync points. Capture the pre-patch engine output, then compare the patched
output against it:

```bash
yarn workspace @sr-output/engine voiceover:compare <target> \
  --actual-output <pre-patch-announcements.json>

# After the patch:
yarn workspace @sr-output/engine voiceover:compare <target> \
  --baseline-actual <pre-patch-announcements.json>
```

Review `semanticDiagnostics.baselineComparison` for correct expected
insertions, genuine regression candidates, new unexpected output, resolved
unexpected output, unmatched tails, and alignment-window splits. Target-level
semantic evidence and negative controls govern the decision; window totals are
secondary routing data.

## Next-Run Action Checklist

For every new multi-site refinement session, confirm these contracts before
final Phase C/E:

- Phase 0 has a recapture queue entry and complete skipped/recapture-only
  accounting for every invalid artifact.
- Phase 0.5 has semantic shell fingerprints and family signatures before work
  is divided by target.
- Phase B uses stable `candidateRef` anchors and re-resolves them after every
  fixture-edit batch.
- Structural Phase C decisions have complete DOM/AX/VoiceOver evidence packets.
- Local-fixture C.5 runs pass the fixture-path diagnostic canary before their
  family verdict is trusted.
- Conditional state is stored separately from the initial-DOM fixture oracle.
- The final report separates candidate reviews, fixture repairs, engine
  changes, mismatch-window deltas, and disposition totals.

## Agent Routing

Project-scoped subagents live in `.codex/agents/`.

- `scan-health`: Phase 0 scan-health checks.
- `compare-summarizer`: Phase 0.5 run-level compare triage.
- `orchestrator`: coordinates phases, handoffs, and target order.
- `intake`: Phase A artifact intake and preprocessing.
- `evidence-refiner`: Phase B source-of-truth `refinedAnnouncements` review.
- `fixture-judge`: Phase C mismatch classification.
- `repro-scanner`: Phase C.5 minimal reproduction scan loop for uncertain evidence.
- `engine-refiner`: Phase D reusable engine/scanner changes.
- `promoter`: Phase E manifest, docs, status, and final receipts.

Keep model choices in `.codex/agents/*.toml`. The deterministic Phase 0,
Phase A, and Phase 0.5 roles use GPT-5.6 Luna at low reasoning effort.
Evidence, judging, C.5, engine refinement, and promotion remain on GPT-5.5.
The user's selected GPT-5.6 Sol session is the sole top-level orchestrator; that
task-level choice is not a repository-wide default. Keep behavior and handoffs
in these workflow docs.

`yarn voiceover:compact-state` exposes the effective model and reasoning effort
from every agent config in `agents.routing`. Check that routing summary before
spawning workers. Do not replace the low-cost Phase 0/A/0.5 roles with a
high-reasoning model unless a receipt records a concrete nondeterministic
evidence problem that requires escalation.

## Token-Efficient Execution

Start each multi-site refinement set in a fresh Codex chat. Keep the top-level
session as the sole orchestrator and do not spawn the optional `orchestrator`
role for a normal full-set run. The top-level session should read compact
run-level summaries and receipts; open full artifacts only for integration
conflicts or decisions that cannot be resolved from the evidence packet.

At every phase boundary refresh the campaign state:

```bash
yarn voiceover:compact-state -- --run-id <run-id>
```

Before Phase E closure, require terminal accounting and fail stale handoffs:

```bash
yarn voiceover:compact-state -- --run-id <run-id> --check \
  --require-terminal --stale-after-minutes 60
```

Reuse phase agents instead of spawning one agent per target or loop iteration:

- Use one `scan-health`, one `intake`, and one `compare-summarizer` for the run.
- Keep a small fixed pool of `evidence-refiner` and `fixture-judge` agents,
  partitioned by mismatch family. Send each next compact family packet to the
  same session after it completes its current scope.
- Keep at most two `repro-scanner` sessions. Each owns disjoint family queues
  and handles the canary, full C.5 scan, and allowed retry for its family.
- Use exactly one long-lived `engine-refiner` session for the run. Feed
  engine-ready families to it sequentially while the run-level lease remains
  assigned to that session.
- Use one `promoter` after the family queue stabilizes.

For a 20-target run, plan for no more than 40 distinct phase-agent sessions and
prefer roughly 8-25 when family batching permits. This is a soft ceiling, not a
minimum. Exceed it only when isolation, context size, agent failure, or
conflicting write ownership requires a replacement, and record the reason.

Do not send raw logs, complete artifacts, or repeated phase documentation in
agent prompts. Give each agent explicit paths, relevant candidate and family
ids, allowed files, the prior compact receipt, and the requested output path.
When continuing the same role and ownership scope, reuse the existing session.

Regenerate compact run state after each family disposition and before handoff:

```sh
yarn voiceover:compact-state --run-id <run-id>
```

The generated
`voiceover-smoke/agent-work/<run-id>/_summaries/orchestrator-state.json` is the
top-level session's default resume input. It reports phase coverage, unique
agent sessions, receipt sizes, and each target's next worker without loading
all receipts into context.

## Multi-Agent Execution Contract

The repository scripts do not spawn Codex subagents. The top-level Codex
session must spawn the phase agents with the available multi-agent tool when
the user asks for the multi-agent workflow.

Before any phase work starts, the top-level session must create an agent
registry preflight receipt:

```text
voiceover-smoke/agent-work/<run-id>/<target>/00-agent-preflight.json
```

For multi-target runs, one shared run-level preflight may cover all targets:

```text
voiceover-smoke/agent-work/<run-id>/_summaries/00-agent-preflight.json
```

Target receipts that rely on the shared preflight must include
`agentPreflightRef` or `sharedPreflightRef`, normally
`../_summaries/00-agent-preflight.json`.

The preflight must record the required roles, roles exposed by the current
multi-agent tool registry, whether tool discovery was attempted, roles still
missing after discovery, the final decision, and the spawned agent ids for the
phase agents. It must also record the planned agent pool by role, the soft
session ceiling, and any replacement-session reasons. Use `decision: "ready"`
only when every required role is exposed
and can be spawned. Use `decision: "blocked"` when a required role is missing
after discovery. Use `decision: "degraded"` only when the user explicitly asks
to continue without a named role.

New runs may opt into the backward-compatible validator contract by adding
`contractVersion` and `requiredRunChecks` to the preflight. Use
`contractVersion: 2` for the Phase B OCR/glyph sweep only. Use
`contractVersion: 3` for the full foundation:

```json
{
  "schemaVersion": 1,
  "phase": "preflight",
  "contractVersion": 3,
  "requiredRunChecks": [
    "phase-b-ocr-glyph-sweep",
    "phase-05-shell-families",
    "recapture-accounting",
    "stable-candidate-references",
    "structural-evidence-packets",
    "c5-fixture-path-diagnostics",
    "final-run-metrics"
  ]
}
```

Contract v3 requires the run-level Phase 0.5 summary, recapture accounting,
stable candidate references, complete structural packets for engine-ready
families, C.5 fixture-path diagnostics, and separated final metrics.

A run is `multi-agent` only when at least two phase-specific agents are
spawned, or when the top-level session records why only one phase was required.
An orchestrator-only run is not multi-agent.

The top-level session may spawn `orchestrator` for an unusual routing audit, but
should not do so during a normal full-set run. It must still spawn
phase-specific agents for the actual phase work:

- `scan-health` for Phase 0 when a new scan artifact needs health validation
- `compare-summarizer` for Phase 0.5 when a run needs target/family triage
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
yarn voiceover:validate-agent-workflow voiceover-smoke/agent-work/<run-id>/<target> --required-phases 0,A,B,C,C.5,D,E
```

Use the actual required phase list for the target. Omit `0` only when the
artifact was already imported before the scan-health gate existed or the
receipts explain why no new scan artifact was used. Omit `C.5` or `D` only when
the receipts explain why those phases were not required.

## Non-Negotiable Rules

- VoiceOver output is the primary evidence. The current engine is not a source of truth.
- Raw `expectedAnnouncements` should preserve what VoiceOver actually heard.
  `refinedAnnouncements` is the replay target for the engine and must describe
  the initial `rendered-html.html` fixture input.
- The goal is not to reproduce transient page mutations that happened during
  capture. The goal is to produce VoiceOver-equivalent output for entering the
  initial captured HTML.
- Raw VoiceOver evidence is append-only. Do not hand-edit raw scan output to
  make a compare pass. If a later scan disagrees, record the later artifact id
  and compare the two evidence sets instead of overwriting the original record.
- `voiceover:preprocess-artifact` is Phase A preprocessing only.
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
- Announcement indexes are not stable identity. Every mismatch candidate must
  use text-neighbour hashes plus DOM/AX anchors, and must be re-resolved after
  fixture edits before an agent applies a later indexed change.
- Structural families need a complete evidence packet linking the compare
  window, focused DOM node, semantic ancestors, AX node, VoiceOver step/source,
  and screenshot when state is visual before Phase D may act.
- Text split/join mismatches must include a text-boundary check before they are
  dismissed as OCR noise or flakiness. Inspect the relevant `outerHTML` for
  inline emphasis, `br`, block/span/markdown fragments, list markers, hidden
  text, and text-node boundaries.
- Use rendered HTML, AX tree, step snapshots, screenshots, and VoiceOver source
  evidence to repair clear scan/caption/OCR/truncation noise. For OCR/glyph
  disagreements, the refined replay oracle should follow the initial rendered
  HTML/AX text when the evidence agrees. Examples: repair `Al` back to `AI`,
  `APl` back to `API`, `OpenAl` back to `OpenAI`, capture-normalized quote or
  ellipsis artifacts back to the rendered punctuation, and external-link glyph
  misreads such as `↗` captured as `2`, `a`, or `»`. Do not change engine logic
  to reproduce OCR artifacts proven wrong by the saved page evidence.
- New v2/v3 contract runs must complete the validator-backed Phase B OCR/glyph
  sweep before final Phase C/E. This is an exhaustive final pass over refined
  text and text/punctuation compare windows, not a spot check of known
  mismatches. Use Phase C.5 only when saved HTML, AX, snapshots/source
  evidence, screenshots, or recordings disagree or cannot decide the OCR/glyph
  question.
- For structural scanner mismatches, require debug evidence before Phase D:
  rendered HTML, AX tree nodes, step snapshots or cursor/source evidence, and
  screenshots when the visual state matters. If a scan reproduces the raw
  VoiceOver line but has empty AX trees or empty step snapshots, classify the
  target as `debug-evidence-missing` or `scanner-fix-required`; do not make a
  broad engine rule from DOM-only evidence.
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
- Keep interaction-sequence and volatile-value announcements in raw evidence
  plus `conditionalStateEvidence`; only initial-DOM output belongs in the
  ordinary refined fixture oracle.
- When Phase B or Phase C cannot confidently decide whether a disputed line is
  true VoiceOver behavior, capture truncation, conditional state, or an engine
  gap from the saved site evidence, run Phase C.5 before changing fixtures or
  broad engine logic. Phase C.5 must create a minimal same-structure DOM
  reproduction, trigger a focused VoiceOver scan, import the artifact, and feed
  the result back to Phase B/C/D.
- If there is any meaningful doubt about truncation, saved HTML correctness,
  AX/tree interpretation, source/caption drift, step-only DOM state, or whether
  VoiceOver behavior is generic, prefer a Phase C.5 test over a terminal
  ambiguity label.
- Before every local-fixture C.5 family scan, prove the requested fixture path,
  file hash, scan-root identity, AX output, and step snapshots with the
  diagnostic canary. Wrong or empty evidence is a scanner-path failure, not a
  family verdict.
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
- Fallback is not an escape route. A target may pause or skip only when the
  receipts show the exact evidence checked, the C.5/retry attempts made or why
  they were impossible, the generic fix attempted or rejected, and the concrete
  external blocker or risk that prevents safe progress.
- Do not add site-specific engine logic.
- Do not move to the next site until the current site has a recorded outcome.
- Invalid captures must enter the run-level recapture queue and receive skipped
  A/B plus recapture-only C/E receipts so final accounting covers every target
  without treating failed scans as zero-mismatch fixtures.
- Do not promote every scanned site as a full-page golden fixture by default.
  Phase E must decide whether the result belongs in the golden exact corpus,
  candidate/parked corpus, a focused repro fixture, or artifact archive. Promote
  a full-page exact fixture only when it adds useful coverage beyond existing
  fixtures or materially increases live-site diversity.

## Fixture Purity

Treat fixture data as two layers:

- Raw evidence: immutable scan evidence that records what VoiceOver heard.
- Refined output: an evidence-bound replay oracle for the initial
  `rendered-html.html` fixture.

Valid reasons to edit `refinedAnnouncements` are limited to:

- `caption-or-ocr-repair`: source/caption evidence proves a transcription issue.
  This includes rendered HTML/AX/screenshot-backed glyph repairs such as
  `AI`/`Al`, `API`/`APl`, ellipsis/quote drift, and misread external-link
  glyphs.
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

## Operational Push Gate

Do not push ordinary refinement, fixture, engine, status, or docs changes
during a refinement campaign unless the user explicitly asks for commit, push,
or PR work. Push only when required to trigger a remote scan workflow, expose a
repo-local Phase C.5 reproduction to the runner, or provide another required
remote workflow input.

Before any required operational push when fixture files changed, the top-level
session or Phase E must run a fixture-change review:

- Identify changed fixture files and whether raw evidence, refined output, HTML,
  AX, or manifest data changed.
- Confirm the push is required for scan/workflow execution and cannot be
  avoided by using an existing artifact or already-pushed file.
- Block the push if raw VoiceOver output was hand-edited.
- Require a fixture change receipt entry for every `refinedAnnouncements` range
  that changed.
- Require an explicit warning in the final response and `06-promotion.json` when
  a commit mixes engine changes and more than a small number of fixture-output
  edits.
- Stage only the minimal files required by the scan/workflow. Leave unrelated
  local refinement, engine, fixture, status, and docs changes unpushed.
- Do not push fixture-heavy changes that only reduce mismatch counts without
  evidence classifications.

## Receipts

Each phase must leave a machine-readable receipt under:

```text
voiceover-smoke/agent-work/<run-id>/<target>/
  00-scan-health.json
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
- `docs/status/voiceover-learnings.md`
- target-specific status docs in `docs/status/`, when present

## Fresh Chat Entry

Use `.codex/prompts/continue-workflow.md` to resume the whole workflow.
Use `.codex/prompts/refine-target.md` to process one named target only.
