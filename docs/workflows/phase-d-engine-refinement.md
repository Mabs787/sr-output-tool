# Phase D: Engine Refinement

Run this phase only after Phase B has edited or explicitly approved
`refinedAnnouncements`, and Phase C has classified a trusted `initial-dom`
mismatch as a reusable engine or scanner gap.

If Phase C marked the family for Phase C.5, do not implement the engine rule
until the minimal reproduction scan concludes `engine-gap-confirmed`.

The target is zero mismatches for the site. Phase D should continue resolving
one trusted reusable family at a time until the target compares exactly, all
safe reusable fixes have been attempted, or each remaining family has an
evidence-backed blocker and next owner.

## Agent

Use `.codex/agents/engine-refiner.toml`.

## Edit Boundary

- Before editing shared engine/runtime/test files, acquire and record an
  exactly-one-engine-refiner lease for the current branch/run. The receipt
  should name the lease owner, started timestamp, target family, and whether
  any separate worktree exception exists.
- Change `packages/sr-engine/src/dom.ts` when traversal, role, label, grouping, state, or order is wrong.
- Change `packages/sr-engine/src/announcements.ts` when descriptor data is right but wording or order is wrong.
- Add focused unit coverage for reusable behavior when practical.
- Rebuild extension runtime whenever engine output changes.
- Split mixed mismatch families into independent sub-gaps. Implement and verify any narrow reusable fix, then record the families that still remain unresolved.
- Keep revisiting the remaining mismatch families until the target is exact, every safe reusable family has been attempted, or a specific evidence-backed blocker is recorded for each unresolved family.
- Do not implement engine behavior for raw VoiceOver lines that Phase B marked
  `step-only-dom` or `volatile-dom`; those belong in raw expectedAnnouncements
  or fixture normalization, not reusable engine traversal.
- Do not implement a broad rule from a complex page when Phase C.5 was required
  but not run.
- Do not edit `refinedAnnouncements`, raw `expectedAnnouncements`, fixture HTML,
  or fixture AX while implementing engine logic. If an engine investigation
  reveals fixture evidence is wrong or incomplete, stop that mismatch family and
  return it to Phase B or Phase C.5 with the exact evidence problem.

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
- parenthesized heading counters or count badges whose nested text/comment
  boundaries produce VoiceOver-style boundary fragments, for example
  `level 1 (, level 1 9, level 1), level 1, 4 items` instead of normalized
  `(9)` wording
- announcement-format gaps where descriptor metadata is right but VoiceOver punctuation, position, or group wording differs

If a prototype is too broad, reduce it to the evidence-backed focused-node
shape and rerun target and corpus checks before abandoning the engine path.
Record both rejected broad prototypes and any narrower kept fixes.

Broad punctuation, marker, link-boundary, iframe/shadow, carousel, table, or
group traversal changes require extra caution. A target compare improvement is
not enough. The receipt must show either protected compares that stayed stable
or a Phase C.5 result that proves the generic behavior before the rule is kept.
If the first broad prototype regresses a protected fixture, unwind it and route
the disputed sub-family back to Phase C/C.5 unless a narrower semantic
predicate is obvious from saved HTML and AX evidence.

When a broad prototype regresses corpus fixtures, first try reducing it to the
smallest generic condition that explains the target mismatch. For example,
prefer "preserve heading level for semantic heading elements discovered in
declarative shadow-root fixture HTML" over a broad "use all declarative
shadow-root text as accessible names" rule.

When the smallest generic condition is still unclear, create or request a Phase
C.5 minimal reproduction scan before committing the rule. Use the mini-scan
result to decide whether the behavior is a real VoiceOver rule, fixture noise,
or conditional step state.

If the mismatch might be caused by truncated VoiceOver output, stale saved HTML,
AX/source disagreement, missing step-state evidence, or a scan artifact problem,
return that family to Phase B or Phase C.5 before changing engine logic.

Phase C.5 is not limited to noisy-output suspicion. Use it as an engine-rule
confidence check whenever:

- the proposed rule would affect multiple roles, landmarks, tables, lists, or
  card/group traversal shapes
- the VoiceOver behavior is surprising but plausible
- the saved page evidence proves the content exists, but not whether VoiceOver
  behavior comes from generic semantics or site-specific state
- the rule would otherwise depend on copy, classes, product names, or one site's
  component library
- rejecting the rule would leave a trusted replayable mismatch unresolved

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
- `nextOwner`: `evidence-refiner`, `fixture-judge`, `repro-scanner`,
  `engine-refiner`, or `promoter`
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

The receipt must include `fixtureChanges: []` for a normal Phase D run. If this
array is non-empty, Phase D has crossed its edit boundary and the target must be
returned for Phase B/E review before push.
