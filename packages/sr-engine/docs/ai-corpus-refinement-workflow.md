# AI Corpus Refinement Workflow

This workflow starts when a user submits a set of live sites and ends with
engine changes that are backed by refined VoiceOver corpus evidence.

The goal is not to make every raw scan pass immediately. The goal is to turn
messy real-site captures into trusted examples, extract reusable VoiceOver
rules, and only then change the engine.

Use this as the canonical workflow for live-site scan artifacts. If the input
is a reduced local HTML example, use
[refinement-workflow.md](refinement-workflow.md) instead.

## Start Here When Artifacts Are Ready

When the user says an artifact is ready, do this:

1. Download or locate the completed artifact.
2. List every scan target in the artifact.
3. For a single target, run the full target loop in section 3.
4. For multiple targets, run the loop one target at a time. Do not merely import
   all targets and stop.
5. After each target, record whether it is `refined`, `partial`, `candidate`,
   or `skip`, and why.
6. Apply reusable engine changes as they are discovered, then rerun the relevant
   tests before moving on when practical.
7. Finish with a summary of refined fixtures, candidate backlog, engine changes,
   test results, and unresolved questions.

## 1. Intake The Site Set

Before triggering a scan, sense check the submitted URLs.

Check:

- Pages are public and do not require login.
- Pages are likely accessible from the runner region.
- The set is diverse enough to cover different page patterns.
- The set is small enough for the workflow timeout.
- URLs are stable pages, not highly personalized account, basket, or checkout
  flows.
- The requested browser/profile matches the engine target: Chrome + VoiceOver.

Ask questions before scanning if:

- A page may require geo, cookies, age gates, or consent state.
- The user expects UK-local behavior but the runner is US-hosted.
- The set mixes unrelated goals, for example marketing pages and app flows.
- A page is likely to exceed the timeout and needs its own scan.

Output of this step:

- Approved URL list.
- Any excluded URLs with reasons.
- Scan options, including snapshots, timeout, and recording choice.

## 2. Trigger The Scan

Run the VoiceOver workflow with:

- rendered HTML capture
- refined VoiceOver output
- step snapshots
- accessibility tree capture
- screen recording only when debugging scan behavior

Current scan defaults:

- workflow name: `VoiceOver scan`
- browser/AT target: Chrome + VoiceOver
- viewport: `1200x543`
- navigation: `voiceover-right-arrow`
- timeout: 120 minutes per page

Prefer no recording for normal corpus collection so artifacts stay small. Use
recording only when investigating whether VoiceOver was enabled, whether focus
moved as expected, or whether a modal/overlay blocked traversal.

Output of this step:

- One scan artifact per site.
- Manifest describing environment, URL, scan settings, and available payload.

## 3. Run The Full Target Refinement Loop

After artifacts are available, pull them locally and sanitize before using them
as engine evidence. Treat the VoiceOver announcement stream as the primary
evidence for what Chrome + VoiceOver announced. Use `step-snapshots.json`,
`voiceover-sources.json`, rendered HTML, and the accessibility tree to explain
surprising output or repair clear capture noise, not to override valid
VoiceOver output with current engine expectations.

When a user says to run the refinement workflow for an artifact, complete the
whole loop below. Do not stop after import/preprocessing unless the user
explicitly asks for that only.

The target loop is AI-led and has two phases. For a batch of scan artifacts,
repeat both phases for each target before calling the batch refined.

Batch rule:

- Process targets one at a time.
- Prefer the smallest or cleanest candidate first so reusable engine gaps are
  discovered early.
- If a reusable engine change affects earlier targets, rerun their comparison
  before final classification.
- It is acceptable to import all targets into the corpus as `candidate` for
  visibility, but that is not the same as completing refinement for the batch.

### Phase A: Stage And Preprocess

1. Download the completed workflow artifact.
2. Import the artifact into a fixture workspace with raw output preserved.
3. Create `expectedAnnouncements` from the raw scan output.
4. Create initial `refinedAnnouncements`.
5. Apply deterministic cleanup where it is safe, such as quote/apostrophe
   normalization or obvious caption-source cleanup backed by evidence.
6. Store rendered HTML, AX tree, step snapshots, VoiceOver sources, and scan
   metadata.
7. Generate an AI refinement prompt for the scan target.
8. Write a Markdown evidence/comparison report.

Use:

```bash
npm run voiceover:refine-artifact -- \
  --run-id 123456789 \
  --target www-example-com-page \
  --work-dir /tmp/voiceover-refinement \
  --promote none
```

This command performs Phase A. It downloads or reads the artifact, imports the
fixture into a staging workspace, creates the AI prompt, writes a Markdown
evidence report, compares the current engine against `refinedAnnouncements`,
and only copies files into the corpus when `--promote` is explicitly set to
`candidate` or `refined`.

### Phase B: AI/Manual Refinement

After Phase A, the AI agent must use the generated prompt/report plus the
captured evidence to finish the target:

1. Review raw `expectedAnnouncements`, initial `refinedAnnouncements`,
   `voiceover-sources.json`, rendered HTML, step snapshots, AX tree, and the
   current engine diff.
2. Update `refinedAnnouncements` from the raw VoiceOver
   output, keeping VoiceOver wording by default and changing it only for clear
   capture corruption backed by `voiceover-sources.json`, rendered HTML, AX
   tree, or step snapshots.
3. Split, merge, or restore announcements only when captured evidence shows the
   scanner/OCR/caption source missed the page-backed VoiceOver output.
4. Compare the engine against the updated `refinedAnnouncements`.
5. Decide for each mismatch whether it is fixture cleanup, a reusable engine
   gap, a scanner evidence gap, or genuinely ambiguous.
6. Change the engine only for reusable behavior gaps.
7. Promote the fixture as `refined` only when the full page is a reliable exact
   gate. Otherwise promote it as `candidate`, `partial`, or `skip` with a
   specific reason.
8. Leave notes for ambiguous fixture/scanner issues.
9. Update the engine for any confirmed reusable gaps, rebuild the extension
   runtime when engine output changes, and rerun the relevant tests.

Raw VoiceOver output is the default source of truth. The refined output is the
test oracle after removing capture noise, not after reshaping VoiceOver output
to match the current engine.

Use the lower-level commands when you need to debug one step:

```bash
npm run voiceover:import-fixtures -- \
  --artifact-dir /tmp/voiceover-artifacts \
  --output-dir /tmp/voiceover-fixture-workspace \
  --include-step-snapshots \
  --force

npm run voiceover:create-refinement-prompt -- \
  --artifact-dir /tmp/voiceover-artifacts \
  --target www-example-com-page \
  --output-dir /tmp/voiceover-refinement-prompts
```

Keep:

- `voiceover-output.json`
- `voiceover-sources.json`
- `rendered-html.html`
- `step-snapshots.json`
- `accessibility-tree.json`
- site manifest / runner environment metadata

Drop unless actively debugging:

- screen recordings
- screenshots
- raw temporary logs
- duplicated HTML payloads
- files unrelated to VoiceOver refinement

Check for:

- system noise at the start, such as system settings announcements
- leading caption artifacts like stray bullets or punctuation
- truncated captions
- access denied pages
- cookie or consent overlays
- mismatch between final rendered HTML and step snapshot state
- incomplete scans
- dynamic content captured by VoiceOver but absent from HTML/AX evidence

Evidence priority for each disputed announcement:

1. Raw VoiceOver announcement plus `voiceover-sources.json` for the same step,
   especially `voCursorText`, focused AX role/name, and caption source errors.
2. Nearest `step-snapshots.json` entry for the VoiceOver step.
3. Accessibility-tree evidence captured for the same page state.
4. Final `rendered-html.html` for whole-page structure and context.
5. Raw caption text, only after checking it is not truncated or polluted by OCR.

If final HTML and the nearest step snapshot disagree, prefer the step snapshot
for that announcement and record the conflict in the fixture notes.

Question the fixture only when there is positive evidence of capture noise:
OCR drift, truncation, duplicated captions, missing caption text, system UI
noise, or scan boundary artifacts. Otherwise, treat the mismatch as an engine
gap first. Preserve surprising output when live page evidence supports it; for
example, `link, undefined page link` is valid expected output if the focused
element has `aria-label="undefined page link"`.

Output of this step:

- Sanitized fixture input.
- AI-refined `refinedAnnouncements` with raw `expectedAnnouncements`
  preserved.
- Notes about artifact reliability.

Do not move to the next target until the current target has one of these
outcomes:

- `refined`: full page is a reliable exact gate and passes the engine.
- `partial`: at least one reliable slice is encoded as `partialAssertions`.
- `candidate`: useful evidence remains, but exact output or engine behavior is
  not resolved yet.
- `skip`: evidence is too broken or irrelevant to use.

## 4. Classify Each Site

Each imported fixture must have a status in
`tests/fixtures/voiceover/refinement-manifest.json`.

Use:

- `trusted`: captured VoiceOver, rendered HTML, snapshots, and AX context agree.
- `refined`: exact gate after documented correction of capture noise.
- `candidate`: useful for development, but not yet an exact gate.
- `partial`: useful only for documented slices. These can be used as exact
  gates when the fixture includes `partialAssertions`.
- `skip`: not suitable until manually reworked.

Classification rules:

- Do not promote a fixture just because the engine happens to pass it.
- Do not block useful candidates just because later page regions are noisy.
- Prefer `partial` when the header/search/list area is reliable but deeper page
  content is dynamic or ambiguous. Add one `partialAssertions` entry per exact
  slice, with a short reason and the expected announcement sequence.
- Prefer `skip` for access denied pages, severe capture loss, or dynamic content
  absent from captured HTML and AX data.

Output of this step:

- Updated manifest status and reason for every fixture.
- `partialAssertions` for any reliable slices promoted before whole-page
  refinement is complete.

## 5. Generate AI Review Questions

For each candidate/refined fixture, compare:

- raw VoiceOver output
- `voiceover-sources.json`
- refined VoiceOver output
- rendered HTML
- step snapshot at the relevant announcement
- accessibility tree
- current engine output

Create questions only for decisions that the AI cannot resolve with captured
evidence and that would change the expected output or engine rules.

Good questions include:

- Should VoiceOver announce this unnamed landmark?
- Is this leading character valid output or caption noise?
- Should this text be full DOM text or a truncated caption?
- Should this nested list include parent item position?
- Is the rendered HTML stale compared with the step snapshot?
- Is this behavior page-specific or a reusable DOM/AX rule?

Questions should include enough context to answer without reopening artifacts:

- fixture name
- current mismatch
- relevant HTML snippet
- relevant VoiceOver lines
- relevant AX evidence, if available
- proposed options: keep VO, refine expected, fix engine, partial, or skip

Output of this step:

- Updated refinement report notes for unresolved decisions, with enough context
  for the next pass to continue without reopening the full artifact.

## 6. Apply User Answers

Use the user's answers as the refinement spec.

Apply answers in this order:

1. Correct obvious fixture noise in `refinedAnnouncements`.
2. Add or update `partialAssertions` for reliable slices.
3. Update manifest statuses and reasons.
4. Identify remaining mismatches that point to reusable engine rules.
5. Leave unresolved cases as `candidate`, `partial`, or `skip`.

Never turn a site-shaped quirk into engine logic unless the evidence shows a
general VoiceOver behavior.

Output of this step:

- Refined expected output and/or exact partial assertions.
- Updated notes explaining each correction.
- A short list of engine rules to implement.

## 7. Refine The Engine

For every engine change, write down the underlying rule first.

Good rule shape:

- "A wrapper `role=combobox` inherits state from its inner input."
- "A heading made of multiple child text fragments can announce item count."
- "A native `<search>` element is a search landmark."

Bad rule shape:

- "Make BBC Weather pass."
- "Skip the second link on Wikipedia."
- "Remove bullets from all output."

Prefer changes in:

- `src/dom.ts` for traversal, role detection, names, visibility, list context,
  and scan boundaries.
- `src/announcements.ts` for phrasing, role/state order, and suffixes.
- `src/types.ts` only when descriptor metadata needs a new field.

After changing the engine, regenerate the extension runtime:

```bash
npm run build:extension-runtime
```

Output of this step:

- Engine changes that explain multiple similar examples where possible.
- Extension runtime in sync with the engine.

## 8. Add Or Update Tests

Use three levels of tests:

- Unit tests for small reusable rules.
- Corpus tests for refined/trusted real-site examples.
- Partial corpus tests for reliable slices inside otherwise noisy fixtures.

Candidate corpus is diagnostic:

```bash
SR_VOICEOVER_CORPUS_CANDIDATES=true npm run test:voiceover -w packages/sr-engine
```

Normal corpus is the gate:

```bash
npm run test:voiceover -w packages/sr-engine
```

Do not promote a candidate fixture to `refined` until its expected output is
trusted enough to be an exact contract.

Do promote a fixture to `partial` when at least one documented slice is reliable
enough to become an exact contract. This creates a ratchet: future engine
changes must keep that slice passing while the rest of the page can remain in
candidate refinement.

Output of this step:

- Unit tests for new rules where practical.
- Refined/trusted corpus gates for reliable full fixtures.
- Partial corpus gates for reliable slices in otherwise unresolved fixtures.

## 9. Verify The Extension

The engine rebuild is only useful if the extension still works.

Run:

```bash
npm run build -w packages/sr-engine
npm run test:unit -w packages/sr-engine
npm run test:voiceover -w packages/sr-engine
npm run build:extension-runtime
npm run test:unit -w packages/sr-extension
```

If the user wants to evaluate reliability manually, build or load the extension
and compare extension output against the first refined site set.

Output of this step:

- Passing engine and extension tests.
- Known remaining candidate failures documented as refinement backlog.

## 10. Report Back

The final AI response should clearly separate:

- what was refined in fixture data
- what changed in engine behavior
- which tests passed
- which sites remain candidate/partial/skip and why
- what questions still need user judgement

Avoid saying the engine is fully rebuilt or reliable just because the normal
gate passes. The normal gate only includes trusted/refined examples; candidate
mode is the ongoing discovery surface.
