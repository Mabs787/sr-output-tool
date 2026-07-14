# Lists and Cards Behavior Lab

These fixtures isolate reusable VoiceOver behavior questions from recent
broad-site scans around list markers, linked cards, article-card boundaries,
and mixed inline list item text.

Scan these before changing engine logic:

- `marker-link-listitem-boundary.html`
- `linked-card-listitem-position.html`
- `article-card-heading-boundary.html`
- `mixed-inline-listitem-links.html`

`linked-card-listitem-position.html` and
`article-card-heading-boundary.html` were accepted from run `29210975599` after
generic engine refinement.

`marker-link-listitem-boundary.html` and `mixed-inline-listitem-links.html`
remain draft. Their raw VoiceOver output shows native marker/text/link
segmentation that needs a narrower C.5 rerun with AX or richer snapshot
evidence before changing marker logic.

Keep engine changes generic and VoiceOver-backed. Do not encode site names,
class names, product copy, or one-off card layouts.
