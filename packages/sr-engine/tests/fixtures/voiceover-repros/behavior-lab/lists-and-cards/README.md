# Lists and Cards Behavior Lab

These fixtures isolate reusable VoiceOver behavior questions from recent
broad-site scans around list markers, linked cards, article-card boundaries,
and mixed inline list item text.

Scan these before changing engine logic:

- `marker-link-listitem-boundary.html`
- `linked-card-listitem-position.html`
- `article-card-heading-boundary.html`
- `mixed-inline-listitem-links.html`
- `plain-large-static-list-position-c5.html`
- `dom-marketing-mockup-grouping-c5.html`
- `mock-toolbar-button-group-suffixes-c5.html`
- `figure-mockup-image-caption-boundary-c5.html`
- `mock-composer-button-wrapper-groups-c5.html`
- `mock-composer-icon-label-button-groups-c5.html`
- `expanded-disclosure-button-list-position-c5.html`
- `expanded-button-list-position-minimal-c5.html`
- `article-card-group-boundary-c5.html`
- `plain-article-card-link-position-c5.html`
- `definition-list-positioned-terms-c5.html`
- `definition-list-simple-position-c5.html`

`linked-card-listitem-position.html` and
`article-card-heading-boundary.html` were accepted from run `29210975599` after
generic engine refinement.

`marker-link-listitem-boundary.html` and `mixed-inline-listitem-links.html`
remain draft. Their raw VoiceOver output shows native marker/text/link
segmentation that needs a narrower C.5 rerun with AX or richer snapshot
evidence before changing marker logic.

Keep engine changes generic and VoiceOver-backed. Do not encode site names,
class names, product copy, or one-off card layouts.

Linear run `29429919047` added draft C.5 fixtures for large plain-list position verbosity, DOM-built marketing mockup grouping, and mock toolbar button group suffixes. Keep them draft until scan evidence is reviewed.

Linear run `29429919047` later added draft C.5 fixtures for figure/mockup image-caption boundaries and composer button wrapper group suffixes. Keep them draft until scan evidence is reviewed.

Linear run `29429919047` added a draft C.5 fixture for aria-label icon-only composer buttons after Intake evidence showed `Attach, button, group` while earlier visible-text composer repros did not reproduce the suffix. Keep it draft until scan evidence is reviewed.

Linear run `29429919047` added a draft C.5 fixture for expanded disclosure buttons inside parent list items after Developers evidence showed `GraphQL API, expanded, button, 1 of 5` while the current engine emitted the same button without parent list position. Keep it draft until scan evidence is reviewed.

Linear run `29429919047` added draft C.5 fixtures for article-card anonymous group/end-boundary behavior and definition-list positioned term traversal after Contact and Mobile evidence exposed reusable mismatches. Keep them draft until scan evidence is reviewed.

Linear phase-loop branch `codex/linear-refinement-phase-loop` added smaller
draft C.5 fixtures for the second Linear C.5 wave:

- `definition-list-simple-position-c5.html` isolates named definition-list
  `dt`/`dd` traversal without footnotes or links.
- `expanded-button-list-position-minimal-c5.html` isolates parent list
  position on expanded buttons separately from the larger nested-link repro.
- `list-marker-button-content-c5.html` isolates marker stops before expanded
  buttons and following text content.
- `nested-list-marker-link-c5.html` isolates nested marker stops before links.
- `plain-article-card-link-position-c5.html` isolates whether a single
  descendant link inside a positioned article card repeats the article/list
  position.

Keep these draft until the second wave scan evidence is reviewed.
