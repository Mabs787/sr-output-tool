# Phase C.5: Minimal Reproduction Scan

Run this phase when Phase B or Phase C cannot confidently decide a mismatch
from saved site evidence alone, or when Phase D would otherwise need a broad
engine rule based on one complex page.

The goal is to turn uncertainty into new VoiceOver evidence by scanning a small
same-structure page that preserves the accessibility-relevant DOM contract.

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

Do not run Phase C.5 for trivial OCR fixes that are already proven by raw
VoiceOver/source evidence and saved HTML.

## Minimal Reproduction Requirements

Create a small HTML page that preserves the disputed accessibility contract.
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
- enough CSS to preserve visibility, hidden state, display type, and
  focusability. Avoid decorative CSS unless it affects accessibility.

Remove unrelated ads, analytics, legal tails, images, scripts, and duplicate
content unless they are part of the suspected behavior.

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
gh workflow run "VoiceOver smoke" \
  --ref <branch> \
  -f urls=docs/voiceover-repros/<target>/<family>.html \
  -f capture_step_snapshots=true \
  -f capture_step_screenshots=false \
  -f capture_screen_recording=false \
  -f max_steps=80 \
  -f navigation_mode=voiceover-right-arrow
```

If the reproduction cannot be hosted or scanned, Phase C.5 must return with a
blocker instead of deciding the mismatch.

Use a small `max_steps` value for minimal reproductions so a missing end marker
or stalled VoiceOver cursor cannot hold the workflow open indefinitely. This is
a step cap for focused mini evidence, not a substitute for the normal page end
marker on full-site scans.

## Analysis

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

When the mini scan confirms an engine gap, send the target to Phase D with the
minimal DOM/AX contract and a focused unit-test sketch. When it confirms
fixture noise or conditional state, send the target back to Phase B. When it is
insufficient, refine the reproduction once before returning `scanner-evidence-gap`.

## Receipt

Write `04-minimal-reproduction-scan.json` with:

- mismatch family and source fixture/window indexes
- original expected/refined/actual snippets
- reason Phase C.5 was required
- reproduction file/path/URL
- preserved DOM contract checklist
- omitted page context and why it was safe to omit
- scan workflow command/run id/artifact path
- mini raw VoiceOver output
- mini rendered HTML and AX evidence summary
- mini engine output
- conclusion:
  `engine-gap-confirmed`, `fixture-noise-confirmed`,
  `conditional-state-confirmed`, or `insufficient-repro`
- next phase and handoff reason

Do not use the current engine output as proof that the reproduction is correct.
The mini VoiceOver scan is the deciding evidence.
