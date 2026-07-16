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
- `comparison-table-section-checkbox-c5.html`
- `inline-text-link-and-break-boundary-c5.html`
- `install-cta-toggle-button-c5.html`
- `image-radio-footer-c5.html`
- `tui-shadow-root-choice-search-panel-c5.html`

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

Linear run `29429919047` added a draft C.5 fixture for pricing-style plan
checkbox labels and comparison-table section/header traversal after Pricing
evidence showed `Billed yearly, checked, checkbox`, duplicated column header
context (`Free Free, column 2 of 5`), skipped section labels, and a post-table
AI credits note. Keep it draft until scan evidence is reviewed.

Linear run `29429919047` added a draft C.5 fixture for inline span prose plus
one CTA link and `<br>` paragraph boundaries after Security evidence showed
missing prose stops before CTA links and a concatenated line-break paragraph.
Keep it draft until scan evidence is reviewed.

Linear run `29429919047` added draft C.5 fixtures for install CTA toggle-button
wording and footer image/radio wording after Mobile and Now evidence showed
`Scan to download, toggle button` and `image, selected, radio button, group`
style announcements. Keep them draft until scan evidence is reviewed.

The TUI shadow-root choice-search-panel fixture captures a serialized custom
element tree with declarative shadow roots and nested form controls. It is a
focused repro for mismatches around custom-element/shadow-root traversal and
the VoiceOver announcement that the form is not accessible. External scripts
are stripped so the scan exercises the captured static DOM state. Keep it
draft until Phase 0/B/C evidence review accepts the scan output.
