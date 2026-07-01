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
- Keep mini repro fixtures in
  `packages/sr-engine/tests/fixtures/voiceover-repros/`; do not promote them as
  live-site corpus fixtures.
- Remove or normalize step-only page state from `refinedAnnouncements` only
  when rendered HTML, AX, snapshots, source evidence, or Phase C.5 proves it is
  not replayable from the initial fixture DOM.
- Do not encode site-specific selectors, class names, copy, or layout accidents
  in scanner or engine logic.

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
