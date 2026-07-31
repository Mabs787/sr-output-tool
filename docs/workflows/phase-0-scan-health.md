# Phase 0: Scan Health Gate

Run this phase after a live-site or minimal-reproduction VoiceOver scan artifact
is available, and before Phase A imports or trusts the artifact.

The goal is to prove that the runner reached the intended page, VoiceOver was
running, blocking UI was handled, and the uploaded artifact is complete enough
for evidence refinement. A completed GitHub Actions run is not, by itself, a
successful scan.

## Agent

Use `.codex/agents/scan-health.toml`. The scan-health receipt must identify
the phase as `0`.

## Required Inputs

- GitHub Actions run id or local artifact directory.
- Target URL or repo-relative HTML fixture path.
- The scan options used, especially debug options:
  `capture_step_snapshots`, `capture_step_screenshots`,
  `capture_conditional_evidence`, `capture_screen_recording`, `max_steps`,
  `adaptive_max_steps`, `max_steps_ceiling`, `max_step_seconds`, viewport, and
  navigation mode.
- Uploaded artifact file list.

## Health Checks

The artifact may proceed to Phase A only when all applicable checks pass:

- The runner opened the intended URL or `file://` fixture path, not browser
  chrome, an error page, a login wall, or a blocked navigation page.
- Page identity is confirmed from the intended URL/path, final URL/path,
  document title or route marker, canonical URL when present, rendered body
  marker text, and screenshot/recording evidence when textual identity is
  ambiguous.
- `voiceover-output.json`, `voiceover-sources.json`, `rendered-html.html`,
  `accessibility-tree.json`, `scan-debug.json`, and
  `refinement-manifest.json` exist.
- Step snapshots exist for corpus/refinement runs, unless the receipt records
  why they were intentionally disabled.
- VoiceOver produced non-empty announcements and at least one announcement is
  page content or a scan boundary marker.
- The scan start marker is present. The scan end marker is present for normal
  full-page scans, or the receipt records the configured step cap/timeout and
  explains why the partial artifact is still useful.
- VoiceOver did not remain stuck on browser chrome, permission prompts, system
  UI, a single repeated announcement, or an unrelated modal.
- Popups, cookie banners, chat launchers, newsletter modals, autoplay overlays,
  and permission prompts that could interfere with navigation were absent,
  dismissed, or recorded as blockers.
- `rendered-html.html` and the AX tree describe the same page state that the
  VoiceOver output appears to traverse.
- If screenshots or a screen recording were enabled, they were inspected when
  the textual evidence suggests page-load, popup, focus, or VoiceOver startup
  uncertainty.

## Debug Evidence Requirements

Structural mismatch families require richer evidence before engine work:
list-marker segmentation, inline text splitting, card/group atomicity,
focusable wrapper descent, table/grid decomposition, and dialog/list boundary
behavior. For these families, raw VoiceOver lines plus rendered HTML are not
enough to justify broad scanner or engine changes when AX or step evidence is
missing.

When a scan target is new, uncertain, or intended to support engine behavior,
enable debugging features by default:

- `capture_step_snapshots=true`
- `capture_step_screenshots=true`
- `capture_screen_recording=true` when diagnosing page access, popup,
  VoiceOver startup, focus, hover, timer, carousel, or other step-time state
- a nonzero `max_steps` large enough to reach the disputed content but small
  enough to avoid long hangs on focused repros

For broad pages with a nonzero cap, enable `adaptive_max_steps=true`. The
runner estimates a safer limit from the initial rendered-DOM and AX node counts,
raises the configured cap when needed, never exceeds `max_steps_ceiling`, and
records the configured, estimated, and effective limits in `scan-debug.json`.
An explicit `max_steps=0` remains unlimited.

When full per-step screenshots would be wasteful but focus, carousel, popup,
timer, or responsive state remains possible, set
`capture_conditional_evidence=true` with step snapshots. The runner persists a
screenshot only when the rendered DOM fingerprint, node count, body-text
length, URL, or title changes. Enable a full recording separately when motion
or VoiceOver focus movement itself is the disputed behavior.

If `accessibility-tree.json` has 0 relevant nodes, `step-snapshots.json` has 0
snapshots, or the active VoiceOver cursor/DOM state cannot be tied to the
disputed line, the Phase 0 outcome should be `retry-required` or
`scanner-fix-required` for engine-refinement targets. Use `partial-evidence`
only for archival or triage work, and record that Phase D must not make a broad
engine change from the partial artifact.

The receipt must call out missing debug evidence as a first-class blocker, not
as a minor warning. Recommended next actions include rerunning with richer
debug capture, reducing the repro to a smaller fixture, increasing step caps,
or fixing the scan runner so AX and step snapshots are emitted for local
fixture scans.

## Popup And Interstitial Policy

Dismiss interfering UI only with reusable behavior:

- Prefer role/name/state based handling such as buttons or links named
  "accept", "reject", "close", "continue", "skip", "not now", or equivalent
  common consent/modal controls.
- Prefer keyboard and accessibility-tree visible controls over CSS selectors.
- Record every dismissed item in `scan-debug.json` or the Phase 0 receipt with
  role, accessible name, action, and before/after evidence.
- Do not add site-specific selectors, class names, or URL-specific branches
  unless the receipt marks them as a quarantined diagnostic workaround and the
  next action is to replace them with a reusable scanner rule.

If popup handling changes are needed, keep them generic and rerun the scan
before Phase A.

## Outcomes

- `passed`: artifact is healthy and can enter Phase A.
- `retry-required`: scan should be rerun with changed scanner/debug settings.
- `scanner-fix-required`: the runner needs a reusable change before retrying.
- `blocked`: the page cannot be scanned with current permissions, login state,
  network availability, or runner capability.
- `partial-evidence`: only allowed when the receipt names the missing evidence,
  explains why the remaining evidence is still useful, and prevents Phase E
  promotion to `refined` until the gap is resolved.

## Recapture Accounting

Every outcome other than `passed` must create or update a run-level recapture
queue entry under:

```text
voiceover-smoke/agent-work/<run-id>/_summaries/recapture-queue.json
```

The entry must include the target, failed run/artifact, failure category,
missing or invalid evidence, recommended scan-option changes, owner, next check
or retry action, and whether refinement of any partial evidence is allowed.
Use a stable `recaptureId` so retries append evidence instead of replacing the
original failure record.

Before final run accounting, the orchestrator must also materialize skipped
Phase A/B receipts and Phase C/E `recapture-only` dispositions for an invalid
capture. This keeps every requested target represented without importing a bad
fixture or inventing zero mismatch counts. A later successful capture may
supersede the queue entry, but it must retain the failed run id and evidence
history.

## Receipt

Write:

```text
voiceover-smoke/agent-work/<run-id>/<target>/00-scan-health.json
```

The receipt must include:

- `schemaVersion`: `1`
- `phase`: `0`
- `agent`
- `agentConfigPath`
- `target`
- `runId`
- `status`: `passed`, `retry-required`, `scanner-fix-required`, `blocked`, or
  `partial-evidence`
- `scanCommand` or workflow invocation
- `scanOptions`
- `artifactPath` or download location
- `artifactFiles`
- `pageIdentity`: intended URL/path, final URL/path, title or route marker,
  canonical URL when present, rendered body marker text, screenshot/recording
  evidence checked, and `matchesIntendedTarget`
- `urlReached`: intended URL/path, final URL/path, and whether they match
- `pageAccess`: loaded, login-wall, blocked, error-page, browser-chrome, or
  unknown
- `voiceOverHealth`: non-empty output, start marker, end marker, repeated-line
  check, browser-chrome check, and startup evidence
- `popupHandling`: controls detected, controls dismissed, controls left open,
  and evidence pointers
- `debugEvidence`: screenshots, recording, step snapshots, source output, and
  scan-debug entries inspected
- `decision`
- `nextAction`
- `handoffTo`: `intake`, `scan-retry`, `scanner-fix`, or `stop`
- `recaptureQueueEntry`: `null` for `passed`; otherwise `recaptureId`, queue
  path, failure category, retry settings, owner, and next action

Phase A must not import a newly downloaded artifact unless the same target/run
has a passing or explicitly accepted `partial-evidence` Phase 0 receipt.
