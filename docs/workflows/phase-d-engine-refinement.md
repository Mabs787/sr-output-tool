# Phase D: Engine Refinement

Run this phase only after Phase B has edited or explicitly approved
`refinedAnnouncements`, and Phase C has classified a trusted `initial-dom`
mismatch as a reusable engine or scanner gap.

## Agent

Use `.codex/agents/engine-refiner.toml`.

## Edit Boundary

- Change `packages/sr-engine/src/dom.ts` when traversal, role, label, grouping, state, or order is wrong.
- Change `packages/sr-engine/src/announcements.ts` when descriptor data is right but wording or order is wrong.
- Add focused unit coverage for reusable behavior when practical.
- Rebuild extension runtime whenever engine output changes.
- Split mixed mismatch families into independent sub-gaps. Implement and verify any narrow reusable fix, then record the families that still remain unresolved.
- Keep revisiting the remaining mismatch families until the target is exact, every safe reusable family has been attempted, or a specific evidence-backed blocker is recorded for each unresolved family.
- Do not implement engine behavior for raw VoiceOver lines that Phase B marked
  `step-only-dom` or `volatile-dom`; those belong in raw expectedAnnouncements
  or fixture normalization, not reusable engine traversal.

## Engine-Confidence Checklist

Phase D is expected to produce at least one focused reusable patch when Phase C
has identified a replayable engine/scanner gap. Leaving Phase D with no engine
change is acceptable only when the receipt includes:

- the narrow gap selected for implementation
- the exact generic predicate or wording rule attempted
- the target compare delta
- the corpus regression, if any
- the narrower follow-up that was attempted before abandoning the patch

Do not reject all engine work because the full target remains far from exact.
Make progress on one mismatch family at a time.

For structural/decomposition gaps, attempt a focused reusable fix before
declaring the gap too broad when the Phase B/C evidence shows:

- raw VoiceOver or source evidence for the single grouped/card announcement
- rendered HTML for the focused node and its child shape
- AX tree or step-snapshot evidence for focused role/name/focusability
- current engine comparison proving the engine decomposes the same object
- a reusable predicate based on semantics or computed accessibility facts, not site-specific class names or copy

Common reusable patterns to check:

- declarative shadow DOM or serialized shadow-root content where semantic tags
  such as `h1`-`h6`, `button`, `a`, `ul`/`li`, `input`, or ARIA roles are
  present in saved fixture HTML but the engine drops their role/level/state
- generic boundary announcements synthesized from ancestor semantics, such as a
  `list item` stop when VoiceOver enters a subsection inside the first rich card
  `li`, even when the immediate wrapper is only a `div` or `p`
- focusable `li` or `role=listitem` cards with a whole-card AX/computed name
- focusable grouped controls whose parent receives focus while child text/link/image nodes supply the name
- scanner-stop mistakes where the focused object should be announced as one unit instead of descending into descendants
- expanded disclosure or accordion regions whose body descendants are present in HTML/source evidence but missing from current traversal
- native tables where VoiceOver synthesizes context from generic structure, such as direct grouped `thead` controller buttons paired with controlled `tbody` regions, even when the synthesized phrase is not present in one AX name
- text segmentation caused by generic DOM boundaries such as inline emphasis (`strong`, `b`, `em`, `i`), `br`, markdown-rendered fragments, or visible text-node/block boundaries
- announcement-format gaps where descriptor metadata is right but VoiceOver punctuation, position, or group wording differs

If a prototype is too broad, reduce it to the evidence-backed focused-node
shape and rerun target and corpus checks before abandoning the engine path.
Record both rejected broad prototypes and any narrower kept fixes.

When a broad prototype regresses corpus fixtures, first try reducing it to the
smallest generic condition that explains the target mismatch. For example,
prefer "preserve heading level for semantic heading elements discovered in
declarative shadow-root fixture HTML" over a broad "use all declarative
shadow-root text as accessible names" rule.

Scan artifacts are sufficient when they contain the relevant rendered HTML,
AX roles/names, and control relationships. Do not require a live DevTools
recapture only to confirm that a phrase is absent from an AX name.
Before writing or rejecting a scanner rule, record the minimal DOM/AX contract:
the disputed node, semantic ancestors, nearby siblings, AX role/name/position
evidence, and why those facts explain VoiceOver better than the current engine
output. If that contract is present and generic, implement the narrowest rule
that matches it before labeling the family unresolved.

Do not abandon Phase D only because a target has several mismatch families. A
single page can produce one safe traversal fix, one dynamic-state mismatch, and
one still-ambiguous family; keep those outcomes separate.

## Revisit Queue

Before Phase D completes, rerun the target compare and reconcile every remaining
mismatch family against the Phase C classifications. If any trusted reusable
family remains unresolved, either continue with the next focused patch or add a
revisit queue entry to `05-engine-refinement.json` with:

- `family`
- `currentWindowIndexes`
- `latestActual`
- `latestExpected`
- `nextOwner`: `evidence-refiner`, `fixture-judge`, `engine-refiner`, or `promoter`
- `nextAction`
- `blocker`, if any
- `checksNeeded`

Do not mark Phase D complete with a vague "remaining mismatches" summary when
the current compare still contains replayable families. The receipt must make
the next refinement step obvious enough that a future run can resume with the
first unresolved family.

## Checks

```bash
yarn workspace @sr-output/engine test:unit
yarn workspace @sr-output/engine voiceover:compare <fixture-name>
yarn workspace @sr-output/engine test:voiceover
yarn build:extension-runtime
```

Record every check in `05-engine-refinement.json` with:

- `command`
- `required`: `true` or `false`
- `status`: `passed`, `failed`, or `skipped`
- `exitCode` when run
- `summary`
- `skipReason` when omitted

`test:unit` and the target `voiceover:compare` are required for any engine
logic change. `test:voiceover` and `build:extension-runtime` are required
unless the receipt records a concrete blocker or why the touched files cannot
affect that surface. If focused unit coverage is omitted, record why it was not
practical.

## Output

Write `05-engine-refinement.json` with changed files, behavior fixed, checks run, remaining mismatches, and the revisit queue.

Do not add site-specific engine logic.
