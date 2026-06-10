# Refinement Workflow

The most reliable way to improve the engine is to compare a small real DOM sample against actual VoiceOver output, then lock the fix in with a regression test.

## Recommended Workflow

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
   Put the reduced example into the extension-facing regression suite so the VoiceOver-aligned behavior stays locked in.

8. Rebuild and rerun tests.

```bash
yarn build
yarn test:unit
```

Use [refinement-template.md](refinement-template.md) when preparing a new refinement request.
