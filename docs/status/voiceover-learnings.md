# VoiceOver Refinement Learnings

This file is the durable human-readable rollup of reusable lessons discovered
during VoiceOver refinement. Detailed per-run entries belong in
`voiceover-smoke/autonomous-runs/<batch-id>/learnings.jsonl`.

Use this file for cross-target knowledge that future agents should remember:

- generic VoiceOver behavior confirmed by a live scan or Phase C.5 scan
- reusable scanner or engine predicates
- fixture-refinement traps to avoid
- regressions that changed how future evidence should be classified
- cases where a tempting rule was rejected as too site-specific

Each entry should include the target, run id or receipt path, evidence source,
decision, tests added or updated, and what future agents must avoid.

## 2026-07-27 Royal Mail Session Efficiency

- Target: 20-page Royal Mail refinement from run `29684347419`.
- Evidence: local Codex session telemetry for the refinement window. GPT-5.5
  phase agents accounted for about 91% of uncached-equivalent usage and 95% of
  output tokens across 247 phase-session records. C.5 and engine-refiner work
  represented about three quarters of GPT-5.5 raw context usage.
- Decision: the main optimization is session and context reuse, not weakening
  evidence gates. Start each scan set in a fresh chat, reuse a small fixed
  family-partitioned agent pool, keep one engine-refiner, cap C.5 at one family
  canary plus one full scan and one retry, and use the patch/family/final
  verification ladder.
- Tooling: `yarn voiceover:compact-state --run-id <run-id>` writes a compact
  resume state and audits unique sessions plus oversized receipts.
- Avoid: per-target agent spawning, a new agent for each C.5 poll or retry,
  repeated full-corpus verification after every patch, and copying full logs or
  artifact bodies into prompts and receipts.

## Current Standing Rules

- VoiceOver output is the primary evidence. Engine output can reveal a gap but
  cannot prove the fixture should change.
- `refinedAnnouncements` models VoiceOver output for entering the initial
  captured HTML. Raw `expectedAnnouncements` can preserve step-time output from
  hover, focus, carousel, accordion, modal, timer, lazy-rendered, or
  personalized page changes.
- Prefer Phase C.5 when a complex page makes a broad engine rule feel plausible
  but under-evidenced.
- When a focused repro already proves the reusable rule, keep a non-exact,
  high-cost full page as isolated candidate evidence rather than adding it to
  the canonical corpus. Promote only when Phase E documents distinct,
  proportionate live-site coverage.
- Keep mini repro fixtures in
  `packages/sr-engine/tests/fixtures/voiceover-repros/`; do not promote them as
  live-site corpus fixtures.
- Remove or normalize step-only page state from `refinedAnnouncements` only
  when rendered HTML, AX, snapshots, source evidence, or Phase C.5 proves it is
  not replayable from the initial fixture DOM.
- Do not encode site-specific selectors, class names, copy, or layout accidents
  in scanner or engine logic.
- Treat initial-DOM trust and conditional-state evidence as separate problems:
  a page can still be a useful candidate even when a focused repro has already
  accepted the generic behavior.
- Scope C.5 conclusions to reached, shape-matched controls only. Bind
  repo-local scans to the dispatched head fixture SHA, treat rejected workflow
  aliases as no-op operations, account for fixture edits by stable logical
  hunks instead of shifted indexes, and require an auditable Phase D engine
  lease history before Phase E promotion.

## 2026-07-12 Behavior Lab: Modal Dialogs

- Target: behavior-lab controls/context fixtures on branch
  `codex/voiceover-behavior-lab`.
- Evidence: runs `29203076966` and `29207406381`; receipts under
  `voiceover-smoke/agent-work/<run>/behavior-lab/`.
- Decision: VoiceOver-backed reusable rule for `aria-modal="true"` dialogs.
  Do not announce `modal`. Explicitly named modal dialogs announce the dialog
  stop, heading child, and `dialog, with N items`; suppress body descendants and
  the dialog end boundary for that narrow shape. Unnamed modal dialogs with
  visible interactive descendants are transparent wrappers.
- Tests: added focused DOM scanner coverage; protected corpus remained exact.
- Avoid: applying this rule to ordinary non-modal dialogs such as the Amazon
  no-suggestions dialog, or to unnamed modal shells that exist only to wrap
  iframe/consent content without visible interactive descendants.

## 2026-07-12 Behavior Lab: Tooltips, Search Popups, and Grid Popups

- Target: behavior-lab controls/context follow-up fixtures on branch
  `codex/voiceover-behavior-lab`.
- Evidence: run `29209152951`; receipts under
  `voiceover-smoke/agent-work/29209152951/behavior-lab/`.
- Decision: accepted generic VoiceOver-backed rules for focused controls.
  Tooltip stops suppress descendant/end traversal. Simple native search
  controls in search contexts split the visible label and suppress generic
  autocomplete wording, but the split is not applied when the same search
  context has a visible native `select` companion. Expanded autocomplete-owned
  listboxes are boundary-only stops. Expanded autocomplete/search controls with
  `aria-haspopup="grid"` expose the owned grid popup as a table-like popup with
  transparent rows, column-formatted cells, and `end of table`.
- Tests: added focused DOM scanner coverage for native search label stops and
  popup listbox boundaries; updated table row-count grammar to use singular
  `row` for one-row tables.
- Avoid: broad rules for every `role="tooltip"`, every listbox, or every ARIA
  grid without the supporting ownership/expanded-autocomplete contract.

## 2026-07-12 Behavior Lab: Lists and Cards

- Target: behavior-lab lists/cards fixtures on branch
  `codex/voiceover-list-card-lab`.
- Evidence: run `29210975599`; receipts under
  `voiceover-smoke/agent-work/29210975599/behavior-lab/lists-and-cards/`.
- Decision: accepted generic rules for simple linked-card heading list
  positions and dated sibling article-card end names. Linked-card list items
  with decorative lead media, exactly one heading link, and summary paragraph
  carry `N of M` on the heading stop. Dated sibling article-card collections
  use the heading link name for `end of, <name>, article`.
- Tests: added focused DOM scanner coverage for both reusable behaviors; unit
  suite passed after refinement.
- Avoid: changing plain native marker/text/link segmentation from DOM-only
  evidence. In run `29210975599`, the marker fixtures had raw VoiceOver
  evidence but empty AX trees and metadata-only step snapshots, so keep those
  fixtures draft until a narrower C.5 rerun captures stronger marker evidence.
- Follow-up: focused marker C.5 run `29248120879` reproduced the same
  segmentation family but again produced 0 AX nodes and 0 step snapshots for
  both parked marker fixtures. Treat this as confirmation that the mismatch is
  real, not as enough evidence for a broad marker splitter. Future work should
  first improve marker evidence capture or use a different C.5 capture route.

## 2026-07-01 Autonomous Workflow Notes

- Use `wait_agent` for critical-path subagent handoff. Subagent completion
  notifications are passive unless the top-level orchestrator turn is still
  active; a blocking wait lets the next worker start without heartbeat polling.
- Reserve heartbeat or scheduled polling for external asynchronous state such
  as GitHub Actions scan completion and artifact availability.
- Require receipts to carry a compact `nextRecommendedWorker` block. It should
  name the next role, the narrow scope, whether C.5 is needed, and the reason,
  so the orchestrator does not have to infer routing from prose.
- Treat longer post-navigation settle scans as evidence, not as automatic
  fixture authority. If delayed capture still disagrees with manual/local DOM,
  keep the initial rendered HTML oracle until a focused C.5 scan proves the
  disputed structure.
- Keep parked targets explicit. A parked target needs mismatch counts, family
  names, blocker reason, and the exact evidence or C.5 work needed to resume.
