# Phase C.5: Minimal Reproduction Scan

Run this phase when Phase B or Phase C cannot confidently decide a mismatch
from saved site evidence alone, or when Phase D would otherwise need a broad
engine rule based on one complex page.

The goal is to turn uncertainty into new VoiceOver evidence by scanning a small
same-structure page that preserves the accessibility-relevant DOM contract.

Phase C.5 is a supporting evidence loop for the original site target. It is not
a standalone site-refinement workflow and it must not promote the repro as a
normal corpus fixture. Process the mini scan with the same evidence discipline
as a site scan, then return the conclusion to the site phase that requested it.

## Agent

Use `.codex/agents/repro-scanner.toml`.

## Required Triggers

Run Phase C.5 before fixture edits, ambiguity labels, or broad engine changes
when any of these are true:

- caption/source text appears truncated or may have stopped recording mid-line
- `htmlAfterStep` suggests hover, focus, carousel, timer, or other conditional
  state, but saved evidence does not prove whether the behavior is replayable
- VoiceOver output is surprising but plausible, such as table header context,
  list position wording, generic `group`/`list item` boundaries, or wrapper
  skipping
- the engine differs from trusted-looking VoiceOver output, but the current
  page has too much unrelated structure to derive a safe reusable predicate
- Phase C would otherwise classify the family as `scanner-evidence-gap` or
  `ambiguous`

Do not run Phase C.5 for OCR/glyph fixes that are already proven by rendered
HTML, AX text/name, source/caption diagnostics, step snapshots, or screenshots.
In those cases, return to Phase B and repair `refinedAnnouncements` as
`caption-or-ocr-repair` while keeping raw `expectedAnnouncements` unchanged.
Use Phase C.5 only when saved evidence cannot decide whether a disputed
glyph/text is a real VoiceOver announcement or a capture/OCR artifact, for
example when testing how VoiceOver speaks a standalone symbol or punctuation
pattern.

## Minimal Reproduction Requirements

Create a small repo-local HTML page that preserves the disputed accessibility
contract. Start from the original mismatch window's rendered HTML, focused-node
evidence, AX node, and nearby ancestor/sibling context. Then reduce the page
only after you can explain why each removed node/attribute is irrelevant to the
VoiceOver behavior being tested.

The reproduction should be minimal, but it must be structurally equivalent for
the disputed behavior. Prefer short, deterministic content such as "Plan A",
"Feature", or "Buy now" to avoid caption/recording truncation. Keep long text
only when the mismatch is specifically about truncation, text wrapping,
line-breaks, punctuation, or text-boundary joining.

The reproduction must keep:

- native semantic elements: headings, buttons, links, lists, tables, rows,
  cells, `th`/`td`, forms, labels, images, `article`, landmarks, etc.
- ARIA roles, names, states, relationships, and IDREFs:
  `role`, `aria-label`, `aria-labelledby`, `aria-describedby`,
  `aria-controls`, `aria-expanded`, `aria-hidden`, `aria-current`,
  `aria-selected`, `aria-checked`, `aria-disabled`, `aria-live`
- focusability and navigation state: `tabindex`, native focusable elements,
  selected/checked state, disabled state, active/focus-triggered wrappers
- hidden and responsive state relevant to VoiceOver:
  `hidden`, inline `display`, `visibility`, `opacity`, offscreen/visually
  hidden styles, duplicate responsive structures, and sticky/aria-hidden clones
- DOM text boundaries: text nodes, inline emphasis, `br`, `p`, `div`, `span`,
  markdown-rendered wrappers, list markers, visually hidden text, and adjacent
  text/control order
- ancestor and sibling context needed for synthesized VoiceOver context:
  nearest list/table/card/landmark/article/group ancestors, row/column header
  relationships, and preceding/following section boundaries
- AX-derived values that explain the original output. You cannot hand-author
  Chrome's AX tree, but the HTML must preserve the DOM conditions that produce
  the same AX contract: role, name, description/details, value, checked/selected/
  expanded/disabled/current state, level, row/column index/count, set position/
  size, modal/live state, hidden state, and control/label relationships.
- enough CSS to preserve visibility, hidden state, display type, and
  focusability. Avoid decorative CSS unless it affects accessibility.

Remove unrelated ads, analytics, legal tails, images, scripts, and duplicate
content unless they are part of the suspected behavior.

Every reproduction file should live under:

```text
packages/sr-engine/tests/fixtures/voiceover-repros/<target>/<family>.html
```

Add a `data-sr-scan-root` wrapper around the reduced test surface so the runner
and engine compare the intended content, not surrounding helper text.

Keep these synthetic/minimal repro fixtures separate from captured site
fixtures:

- captured live-site fixtures: `packages/sr-engine/tests/fixtures/voiceover/`
- synthetic Phase C.5 repro fixtures:
  `packages/sr-engine/tests/fixtures/voiceover-repros/`

Do not copy a mini repro into the live-site fixture directory. A mini repro is
evidence about a focused DOM/AX contract, not a replacement for the captured
page artifact.

## Scan Artifact

The reproduction must be scanned by VoiceOver, not only inspected by the
engine. Prefer checking the reproduction HTML into a repo-local repro path and
passing that fixture path to the VoiceOver scan workflow. The workflow accepts
repo-relative HTML fixture paths and the runner opens them as local `file://`
pages, avoiding public hosting, CDN interstitials, and third-party page chrome.
Use public `http`/`https` URLs only when the reproduction genuinely needs live
network behavior.

Record the exact command or workflow invocation in the receipt. A typical
workflow invocation should include:

```bash
gh workflow run "VoiceOver scan" \
  --ref <branch> \
  -f urls=packages/sr-engine/tests/fixtures/voiceover-repros/<target>/<family>.html \
  -f capture_step_snapshots=true \
  -f capture_step_screenshots=false \
  -f capture_screen_recording=false \
  -f max_steps=80 \
  -f navigation_mode=voiceover-right-arrow
```

If a workflow alias is rejected before a run is created, record that command as
an operational no-op, then dispatch the accepted workflow name. A rejected alias
is not a failed C.5 scan attempt and is not evidence for or against the family.

For structural behavior questions, prefer full debug evidence even in small
repros. Use `capture_step_screenshots=true`, and enable screen recording when
the mismatch may depend on focus movement, hover/focus side effects, delayed
rendering, popup state, or VoiceOver startup. A focused repro that repeats the
raw VoiceOver mismatch but emits 0 AX nodes or 0 step snapshots is useful
triage evidence, but it is not sufficient proof for a broad engine rule.

If the reproduction cannot be hosted or scanned, Phase C.5 must return with a
blocker instead of deciding the mismatch.

## Fixture-Path Diagnostic Gate

Before requesting the family scan, run the local-fixture diagnostic canary and
record:

- requested repo-relative `fixturePath`
- requested ref and dispatched workflow run head SHA
- resolved absolute path and file SHA-256
- SHA-256 of the fixture file as resolved from the dispatched head git object
- expected `data-sr-scan-root` marker or fixture identity text
- rendered page URL/path observed by the runner
- non-empty rendered HTML, relevant AX-node count, and step-snapshot count

The canary passes only when the runner opened the requested file and the saved
artifact contains the expected fixture identity plus usable AX and step
evidence. If the resolved path, identity, AX, or snapshots are wrong or empty,
stop the family scan and return `debug-evidence-missing` or
`scanner-fix-required`. Do not interpret that artifact as evidence for or
against the mismatch family.

For remote scans, a local working-tree hash is not enough. The canary must bind
the accepted artifact to the fixture content checked out by the runner at the
dispatched head; if the branch moved or the file differs, rerun with the
intended git object before using the artifact.

Use a small `max_steps` value for minimal reproductions so a missing end marker
or stalled VoiceOver cursor cannot hold the workflow open indefinitely. This is
a step cap for focused mini evidence, not a substitute for the normal page end
marker on full-site scans.

## Analysis

After triggering the workflow, do not immediately assume failure if the run is
not visible or complete. Wait 5 minutes before the first status/artifact check;
after that, poll once per minute until the run completes, fails, or reaches the
workflow timeout. Minimal examples should usually finish quickly, but this
cadence keeps larger reproductions from being misclassified just because the
runner was still starting VoiceOver.

After the artifact is ready:

1. Import or inspect the mini-scan artifact.
2. Compare raw VoiceOver output, rendered HTML, AX tree, and step snapshots.
3. Run the engine against the same reproduction HTML.
4. Decide whether the mini scan confirms:
   - `engine-gap-confirmed`: mini VoiceOver matches the original refined output
     and the engine differs
   - `fixture-noise-confirmed`: mini VoiceOver contradicts the questionable
     refined line and supports fixture correction
   - `conditional-state-confirmed`: mini scan proves the output depends on
     hover/focus/timer/carousel or another step-only state
   - `insufficient-repro`: mini page failed to reproduce the original behavior
     or omitted required DOM/AX conditions
   - `debug-evidence-missing`: mini VoiceOver reproduces the family, but the
     artifact lacks AX nodes, step snapshots, cursor/source evidence, or
     screenshots needed to identify the reusable DOM/AX contract

Record both fields separately:

- `verdict`: one of `engine-gap-confirmed`, `fixture-noise-confirmed`,
  `conditional-state-confirmed`, `insufficient-repro`, or
  `debug-evidence-missing`
- `debugEvidenceStatus`: `complete`, `partial`, or `missing`

Also record which positive controls, negative controls, and tail or guard
windows were reached. If a required negative control or tail window was not
reached, the verdict applies only to the reached positive contracts. Return the
unreached shapes to Phase C with a concrete retry, blocker, or parked-evidence
entry; do not extrapolate the C.5 result across the whole family.

Before Phase C.5 evidence can justify Phase D, keep a family repro path and a
canary:

- `familyReproPath`:
  `packages/sr-engine/tests/fixtures/voiceover-repros/_families/<family>.html`
- `canary`: the focused mini VoiceOver scan or compare check that proves the
  reproduction still exercises the original family after reduction

## Loop Back

The repro result must resolve an original site mismatch family, not create a
new independent target. Record the original site target, original compare
windows/indexes, and requesting phase in the receipt.

Route the original site workflow as follows:

- `engine-gap-confirmed`: return to the original site Phase D with the minimal
  DOM/AX contract and a focused unit-test sketch.
- `fixture-noise-confirmed`: return to the original site Phase B so the
  evidence-refiner can make or reject a fixture edit with receipt coverage.
- `conditional-state-confirmed`: return to the original site Phase B to remove,
  normalize, or classify the step-only output against the initial DOM fixture.
- `insufficient-repro`: refine the reproduction once and rerun C.5. If it still
  cannot reproduce the behavior, return to Phase C with a concrete blocker and
  classify the original family as `scanner-evidence-gap`.
- `debug-evidence-missing`: return to Phase 0 or scanner-fix work for a richer
  artifact before Phase D changes reusable engine behavior.

Do not send a repro fixture to Phase E promotion, add it to the live-site corpus
manifest, or treat its exact-match status as a site result.

Before terminally parking an `insufficient-repro` family, write a retry gate in
the receipt. It must name the source `candidateRef`s, what source contract the
failed repro changed or omitted, the same-structure retry shape, max
steps/timeouts, the workflow command to dispatch, polling cadence, and the
post-artifact checks needed to prove the retry preserved the original shape.

## Receipt

Write `04-minimal-reproduction-scan.json` with:

- mismatch family and source fixture/window indexes
- original site target and requesting phase
- original expected/refined/actual snippets
- reason Phase C.5 was required
- reproduction file/path/URL
- `fixturePathDiagnostic`: requested path, resolved path, SHA-256, identity
  marker, rendered path, AX count, snapshot count, and pass/fail decision
- `artifactPath`: `repoRelativeFixturePath`, `workflowRunId`, `artifactId`,
  `downloadRoot`, `scanRoot`, `runnerRenderedUrl`, and `renderedFixturePath`
- stable source `candidateRef` copied from Phase B/C; source indexes must be
  re-resolved if the fixture changed before the mini scan
- preserved DOM contract checklist
- original AX contract copied into the reproduction: source node ids and the
  role/name/state/table/list/focusability values that mattered
- content shortening notes: what text was shortened, why that cannot affect the
  disputed behavior, or why long text had to be preserved
- omitted page context and why it was safe to omit
- scan workflow command/run id/artifact path
- wait/poll timeline: initial 5-minute wait, subsequent 1-minute checks, final
  run status, and whether the artifact was complete
- mini raw VoiceOver output
- mini rendered HTML and AX evidence summary
- mini engine output
- `verdict`:
  `engine-gap-confirmed`, `fixture-noise-confirmed`,
  `conditional-state-confirmed`, `insufficient-repro`, or
  `debug-evidence-missing`
- `debugEvidenceStatus`: `complete`, `partial`, or `missing`
- controls reached: positive controls, negative controls, and tail/guard
  windows, including any unreached indexes
- retry gate for any unresolved `insufficient-repro` outcome
- `familyReproPath`
- `canary`
- loop-back target phase and handoff reason for the original site workflow

Do not use the current engine output as proof that the reproduction is correct.
The mini VoiceOver scan is the deciding evidence.
Every verdict evidence pointer must resolve under the accepted `scanRoot`.
Distinguish the downloaded artifact root, scan artifact root, rendered file URL,
and repo-relative fixture path; do not mix stale dispatch paths with the current
accepted scan.
