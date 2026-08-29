# Safari engine evidence

This directory contains the frozen six-site experiment manifest and browser-specific evidence assembled from three independent runner artifacts.

- `safari/*.fixture.json` is accepted only from direct VoiceOver `lastPhrase`/`voCursorText` captures.
- `chrome-fresh/*.fixture.json` stores fresh Chrome evidence without changing the production golden corpus.
- A fixture is `trusted` only when all three runs are complete and byte-identical. Otherwise it remains `candidate`.
- Fixtures never contain `refinedAnnouncements`; captured browser evidence is preserved without lexical correction.

Create a fixture after downloading three artifacts:

```sh
node packages/sr-safari-engine/tooling/assemble-browser-evidence.mjs \
  --browser safari \
  --name www-sky-com-shop-mobile \
  --run /path/to/run-1 \
  --run /path/to/run-2 \
  --run /path/to/run-3
```
