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
- Keep the known Microsoft full-corpus baseline failure visible until it is
  revisited: `www-microsoft-com-en-us-accessibility` currently reports 164
  expected announcements, 165 actual announcements, and first mismatch index 31
  (`Disability Answer Desk` versus `Ask Microsoft Accessibility`).
- Before final Phase C/E validation, require the validator-backed exhaustive
  Phase B OCR/glyph sweep across every refined announcement and text or
  punctuation mismatch window. The sweep must preserve raw expected output,
  apply every safe evidence-backed repair, and report zero unreviewed or
  remaining suspicious literal candidates.
- For long static text where caption/chosen output stops early, prefer the
  VoiceOver cursor/source text plus initial DOM/AX name over the visible caption
  crop. BA run `29664876599` and C.5 run `29669455470` confirmed the tail is
  spoken when `voCursorText`, `lastPhrase`, rendered HTML, and AX StaticText
  names all contain it.
- Treat Chrome geolocation permission prompts as a pre-traversal scanner
  blocker. BA Flights and Holidays in run `29664876599` produced permission
  prompt output instead of page traversal and must be recaptured only after the
  prompt is dismissed, denied, or handled generically before VoiceOver starts.

## 2026-07-19 British Airways Phase E Curation

- Target: British Airways run `29664876599`.
- Evidence: concise receipts under
  `voiceover-smoke/agent-work/29664876599/`, especially
  `_summaries/phase-c-final-compact-compare.json`,
  `_summaries/phase-c-final-residual-family-inventory.json`,
  `_summaries/phase-c5-family-truncation.json`,
  `_summaries/phase-d-social-x-list-punctuation.json`,
  `_summaries/phase-d-shared-shell-structure.json`, and
  `_summaries/phase-e-final-promotion.json`.
- Decision: promote none. All 18 valid fresh BA fixtures remain isolated
  parked-with-evidence or conditional candidates after definitive final compare:
  1,714 expected, 1,949 actual, and 197 mismatch windows. Terminal buckets are
  189 parked windows, 8 conditional windows, 0 actionable, 0 ambiguous, 0
  unclassified, and 2 recapture-only targets. Flights and Holidays stay
  recapture-only because the Chrome geolocation permission prompt captured focus
  before page traversal.
- Fixture repair accounting: the earlier OCR/HTML/AX/source sweep applied 100
  evidence-backed refined repairs. The reopened residual pass reviewed 13 more
  candidates and applied 11, for 135 reviewed, 111 applied, and 4 rejected
  cumulatively. It left 0 unreviewed candidates, preserved raw
  `expectedAnnouncements`, and kept unresolved families in revisit queues.
- Canonical drift rule: keep the promoted BA homepage fixture unchanged. The
  canonical tracked page remains exact at 208 expected, 208 actual, and 0
  windows; the fresh homepage is 210 expected, 210 actual, and 2 conditional
  `Last-minute getaways` live-state windows, so it remains drift evidence only.
- Phase C.5/Phase D checkpoints: the C.5 fixture-path canary passed before
  family conclusions were trusted. The definitive Phase C final compare and
  residual inventory are the source for the 197-window total; do not replace
  them with a generic remaining-mismatches summary or stale 264-window batch
  totals.
- Reopened delivery audit at branch
  `codex/british-airways-voiceover-refinement` HEAD `b44517a` corrected the
  final audit to the definitive terminal buckets: original 264 to 197 (-67),
  post-first-fixture 259 to 197 (-62), and previous 222 to 197 (-25). All 20
  targets have 0/A/B/C/E accounting, the engine leases are clear, and no
  fixture is promoted.

## 2026-07-19 Notion Curation Refresh

- Target: Notion run `29641641399` on branch
  `codex/notion-voiceover-refinement`.
- Evidence: final receipts under
  `voiceover-smoke/agent-work/29641641399/`, especially
  `_summaries/final-compact-compare.json`,
  `_summaries/final-phase-c-dispositions.json`, and
  `_summaries/phase-e-promotion.json`.
- Decision: no full-page Notion fixture was promoted. Of 19 valid targets, 18
  stay parked and Contact Sales stays conditional-state-blocked; Mail stays
  recapture-only. Final accounting is 481 mismatch windows with no actionable
  family buckets. The exhaustive Phase B sweep applied 169 evidence-backed
  OCR/glyph repairs, left zero remaining candidates, and preserved raw
  `expectedAnnouncements`; the canonical index and manifest stay unchanged.
- Reusable behavior accepted elsewhere: media icon button grouping, generic
  heading child boundaries, footer `ul[aria-labelledby]` list labels,
  AX-empty article naming, and empty-link URL basename fallback are protected by
  focused repros plus unit tests rather than by non-exact Notion full-page
  gates.
- Fixture trap: the C.5 diagnostic canary showed that `fixturePath` handling can
  make focused scans appear to lack evidence. Treat an empty or wrong-fixture
  C.5 capture as a scanner diagnostic first; rerun the canary or fix the
  fixture-path plumbing before using that result to reject or accept a broad
  engine rule.
- Avoid: promoting large live-site candidates when final Phase C has 0
  actionable family buckets but nonzero parked windows. Keep the revisit queue
  family-specific with blocker, owner, next action, and checks needed.
- Workflow follow-up: the next run must use semantic shell fingerprints,
  stable text-neighbour plus DOM/AX candidate references, complete structural
  evidence packets, a pre-scan C.5 fixture-path canary, separate conditional
  state evidence, and a run-level recapture queue with complete skipped-phase
  accounting. Final metrics must distinguish reviewed candidates and applied
  repairs from mismatch-window reductions.

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
