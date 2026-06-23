# SR Engine Refinement Prompt

Use this template only for a manual reduced example. For live-site artifacts or
batches of scanned sites, use
[ai-corpus-refinement-workflow.md](ai-corpus-refinement-workflow.md). That
workflow starts with `voiceover:refine-artifact`, then continues through the
AI/manual fixture refinement and engine update loop.

```text
I want to refine the SR Output Tool engine using this VoiceOver comparison.

Please update only the necessary `sr-engine` logic, prefer the smallest defensible change, and add or update only the relevant regression test.

Page / component:
[Briefly describe the page, component, or UI pattern]

Interaction path:
Extension scan output, modeled as the sequence VoiceOver would announce when moving item-by-item with the right arrow key.

Scan root / selected element:
[Describe the element or subtree selected in the extension]

Reduced HTML sample:
```html
[Paste the smallest DOM snippet that reproduces the mismatch]
```

Current SR Output Tool output:
```text
[Paste the extension output]
```

Actual VoiceOver output:
```text
[Paste the VoiceOver output]
```

Desired behavior:
[Summarize the intended change in one or two sentences]

Constraints:
- Keep the change focused on the mismatch above.
- Trust actual Chrome + VoiceOver output unless there is concrete capture corruption.
- Prefer reusable DOM/AX behavior over site-specific logic.
- Do not update unrelated tests.
- Rebuild the extension runtime if engine logic changes.
- Run the relevant unit tests and report the result.

Optional hypothesis:
[If you have a guess, add it here. Otherwise leave blank.]
```
