# VoiceOver Behaviour Notes

- Real Chrome + VoiceOver output is the primary evidence for corpus refinement.
- Surprising announcements remain valid when raw VoiceOver, snapshots, HTML, or AX evidence back them.
- Rendered HTML, AX tree, step snapshots, captions, and source diagnostics explain or repair capture noise; they do not override valid VoiceOver output.
- `refinedAnnouncements` should remove only clear capture noise such as OCR drift, truncation, spacing artifacts, or caption-source corruption.

