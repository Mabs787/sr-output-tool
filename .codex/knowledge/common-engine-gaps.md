# Common Engine Gaps

Recurring reusable gap areas:

- grouped cards where VoiceOver announces image, text, and nested actions separately
- carousel previous/next disabled-state inference
- native form controls and selected values
- ARIA tabs and tabpanel traversal
- list marker and paragraph-block segmentation
- inline emphasis and text-node boundary segmentation inside simple list items
- zero-width format character cleanup, decorative emoji-only text suppression, empty heading skips, and blockquote role announcements
- named images inside otherwise empty list items, especially rating-logo rails
- footer country-selector grouping
- empty live region or alert group handling
- table traversal versus flattened row output, including complex product column headers, grouped `thead`/controlled-`tbody` row-header context, and table child link/list column context

Treat this list as a starting point, not proof. Every change still needs fixture evidence and tests.
