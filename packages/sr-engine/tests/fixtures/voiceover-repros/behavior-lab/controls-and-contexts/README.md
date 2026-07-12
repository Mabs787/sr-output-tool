# Controls and Contexts Behavior Lab

These draft fixtures isolate reusable VoiceOver behavior questions from recent
YouTube, Amazon, and protected corpus refinement work.

Scan these before changing engine logic:

- `icon-button-tooltip-contexts.html`
- `combobox-popup-search-controls.html`
- `grouped-control-wrapper-boundaries.html`
- `named-modal-dialog.html`
- `unnamed-modal-dialog.html`
- `dialog-with-navigation-list.html`

Each fixture uses `data-sr-fixture-status="draft"` until Phase 0/B/C evidence
review accepts the scan output.

Do not combine multiple always-visible `aria-modal="true"` dialogs in one
draft scan target. Run `29203076966` showed that shape can trap VoiceOver
navigation and prevent the scanner from reaching its end condition.
