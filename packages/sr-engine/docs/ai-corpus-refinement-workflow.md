# AI Corpus Refinement Workflow

This workflow starts when a user submits a set of live sites and ends with
engine changes that are backed by refined VoiceOver corpus evidence.

The goal is not to make every raw scan pass immediately. The goal is to turn
messy real-site captures into trusted examples, extract reusable VoiceOver
rules, and only then change the engine.

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

Prefer no recording for normal corpus collection so artifacts stay small. Use
recording only when investigating whether VoiceOver was enabled, whether focus
moved as expected, or whether a modal/overlay blocked traversal.

Output of this step:

- One scan artifact per site.
- Manifest describing environment, URL, scan settings, and available payload.

## 3. Import And Sanitize Artifacts

After artifacts are available, pull them locally and sanitize before using them
as engine evidence.

Keep:

- `vo-output.json`
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

Output of this step:

- Sanitized fixture input.
- Notes about artifact reliability.

## 4. Classify Each Site

Each imported fixture must have a status in
`tests/fixtures/voiceover/refinement-manifest.json`.

Use:

- `trusted`: captured VoiceOver, rendered HTML, snapshots, and AX context agree.
- `refined`: exact gate after documented correction of capture noise.
- `candidate`: useful for development, but not yet an exact gate.
- `partial`: useful only for documented slices.
- `skip`: not suitable until manually reworked.

Classification rules:

- Do not promote a fixture just because the engine happens to pass it.
- Do not block useful candidates just because later page regions are noisy.
- Prefer `partial` when the header/search/list area is reliable but deeper page
  content is dynamic or ambiguous.
- Prefer `skip` for access denied pages, severe capture loss, or dynamic content
  absent from captured HTML and AX data.

Output of this step:

- Updated manifest status and reason for every fixture.

## 5. Generate AI Review Questions

For each candidate/refined fixture, compare:

- refined VoiceOver output
- rendered HTML
- step snapshot at the relevant announcement
- accessibility tree
- current engine output

Create questions only for decisions that change the expected output or engine
rules.

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

- Updated `docs/corpus-refinement-questions.md`.

## 6. Apply User Answers

Use the user's answers as the refinement spec.

Apply answers in this order:

1. Correct obvious fixture noise in `refinedAnnouncements`.
2. Update manifest statuses and reasons.
3. Identify remaining mismatches that point to reusable engine rules.
4. Leave unresolved cases as `candidate`, `partial`, or `skip`.

Never turn a site-shaped quirk into engine logic unless the evidence shows a
general VoiceOver behavior.

Output of this step:

- Refined expected output.
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
npm run build:runtime -w packages/sr-extension
```

Output of this step:

- Engine changes that explain multiple similar examples where possible.
- Extension runtime in sync with the engine.

## 8. Add Or Update Tests

Use two levels of tests:

- Unit tests for small reusable rules.
- Corpus tests for refined/trusted real-site examples.

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

Output of this step:

- Unit tests for new rules where practical.
- Refined/trusted corpus gates only for reliable fixtures.

## 9. Verify The Extension

The engine rebuild is only useful if the extension still works.

Run:

```bash
npm run build -w packages/sr-engine
npm run test:unit -w packages/sr-engine
npm run test:voiceover -w packages/sr-engine
npm run build:runtime -w packages/sr-extension
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

