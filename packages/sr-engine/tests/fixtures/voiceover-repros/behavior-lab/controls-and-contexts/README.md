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
- `tooltip-associated-describedby.html`
- `tooltip-hidden-custom-wrapper.html`
- `tooltip-empty-boundary.html`
- `leading-icon-text-button.html`
- `search-label-stop.html`
- `expanded-listbox-popup.html`
- `aria-grid-popup-table-mapping.html`
- `grid-popup-row-cell-decomposition.html`

The side-by-side follow-up fixtures from run `29209152951` were accepted after
Phase 0/B/C review and exact analyzer receipts:

- `tooltip-associated-describedby.html`
- `tooltip-hidden-custom-wrapper.html`
- `tooltip-empty-boundary.html`
- `leading-icon-text-button.html`
- `search-label-stop.html`
- `expanded-listbox-popup.html`
- `aria-grid-popup-table-mapping.html`
- `grid-popup-row-cell-decomposition.html`

Other fixtures keep `data-sr-fixture-status="draft"` until Phase 0/B/C evidence
review accepts the scan output.

Do not combine multiple always-visible `aria-modal="true"` dialogs in one
draft scan target. Run `29203076966` showed that shape can trap VoiceOver
navigation and prevent the scanner from reaching its end condition.
