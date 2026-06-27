# VoiceOver Behaviour Notes

- Real Chrome + VoiceOver output is the primary evidence for corpus refinement.
- Surprising announcements remain valid when raw VoiceOver, snapshots, HTML, or AX evidence back them.
- Rendered HTML, AX tree, step snapshots, captions, and source diagnostics explain or repair capture noise; they do not override valid VoiceOver output.
- Phase A `refinedAnnouncements` are not truth; they are a draft that Phase B must audit against HTML, AX, snapshots, captions/source evidence, and raw VoiceOver.
- Trusted `refinedAnnouncements` should remove clear capture noise such as OCR drift, truncation, spacing artifacts, or caption-source corruption, and should also correct draft refined output when stronger site evidence proves it wrong.
- When VoiceOver announces one grouped/card object but the engine decomposes headings, text, links, or images, inspect the focused node before calling the gap broad: focusability, `tabindex`, role, AX/computed name, focused state, child shape, and whether the name contains the whole object text are decisive evidence for scanner stop/grouping fixes.
