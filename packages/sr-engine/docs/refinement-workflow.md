# Engine Refinement Workflow

The most reliable way to improve the engine is to compare actual Chrome + VoiceOver output against rendered DOM, AX, and per-step evidence, then lock reusable behavior into tests.

Use this workflow for small local or reduced HTML examples. Use
[ai-corpus-refinement-workflow.md](ai-corpus-refinement-workflow.md) as the
canonical workflow when the input is a live-site scan artifact or a batch of
site scans.

## Small Example Workflow

1. Isolate the smallest possible example.
   Copy the relevant element or subtree into a minimal test page or reduced HTML snippet. Keep only the structure needed to reproduce the mismatch.

2. Capture what the extension outputs.
   Load the page, inspect the target with the extension, and copy the generated output.

3. Capture what VoiceOver outputs.
   Run the same interaction with VoiceOver and write down the exact wording, order, grouping, and anything it skips or combines.

4. Compare the mismatch directly.
   Look for the smallest concrete difference: missing label, wrong role order, duplicated text, incorrect list behavior, extra wrapper output, missing end marker, and so on.

5. Ask the AI tool to refine the engine.
   Give it these inputs together:
   - the reduced HTML snippet
   - the current extension output
   - the actual VoiceOver output
   - the selected scan root or interaction path
   - any hypothesis about the mismatch

6. Make the smallest engine change that explains the mismatch.
   In practice this is usually in the announcement formatter or DOM scanner logic rather than extension UI code.

7. Add or update a regression test.
   Put small reusable rules in engine unit tests. Use extension-facing tests only when the extension workflow or UI behavior changes.

8. Rebuild and rerun tests.

```bash
yarn build:engine
yarn test:unit
yarn workspace @sr-output/engine test:voiceover
yarn build:extension-runtime
```

Use [refinement-template.md](refinement-template.md) when preparing a new refinement request.

## Live-Site Artifacts

Do not run live-site artifact refinement from this document. Use
[ai-corpus-refinement-workflow.md](ai-corpus-refinement-workflow.md).

The short version is:

1. Run `voiceover:refine-artifact` to stage and preprocess the target.
2. Complete the AI/manual refinement pass against the generated prompt, report,
   rendered HTML, AX tree, VoiceOver sources, and step snapshots.
3. Update `refinedAnnouncements`, fixture status, and reusable engine logic as
   needed.
4. Rebuild extension runtime when engine output changes.
5. Rerun the relevant tests before promotion.

For reference, the preprocessing command is:

```bash
npm run voiceover:refine-artifact -- \
  --artifact-dir /tmp/voiceover-artifacts \
  --target www-example-com \
  --work-dir /tmp/voiceover-refinement \
  --promote none
```

The command is not the full workflow by itself.

## Corpus Gating

Imported VoiceOver site scans are classified in
`tests/fixtures/voiceover/refinement-manifest.json` before they become exact
engine contracts.

Use these statuses:

- `trusted`: exact gate; captured VoiceOver, rendered HTML, and AX context agree.
- `refined`: exact gate after documented correction of capture noise.
- `candidate`: useful for development, but not yet a hard pass/fail contract.
- `partial`: useful only for documented regions or slices.
- `skip`: excluded until manually reworked.

Run only trusted/refined fixtures:

```bash
npm run test:voiceover -w packages/sr-engine
```

Include candidate fixtures while rebuilding/refining:

```bash
SR_VOICEOVER_CORPUS_CANDIDATES=true npm run test:voiceover -w packages/sr-engine
```

Compare one fixture directly:

```bash
npm run voiceover:compare -w packages/sr-engine -- www-sky-com
```
