# Codex Project Workspace

This directory separates reusable Codex behavior from repository source code.

## Layout

```text
.codex/
  agents/      specialist subagents and model routing
  prompts/     reusable prompts for starting or continuing work
  context/     stable repository context and engineering conventions
  knowledge/   VoiceOver/domain notes accumulated during refinement
```

## Use

- Read `.codex/context/` before making broad source changes.
- Use `.codex/prompts/` when starting a repeat workflow in a fresh chat.
- Keep model choices inside `.codex/agents/*.toml`.
- Keep workflow behavior in `docs/workflows/`.
- Keep scratch receipts under `voiceover-smoke/agent-work/`; those files are not checked in.
- Keep autonomous batch state under `voiceover-smoke/autonomous-runs/`.
- Promote durable VoiceOver refinement lessons to `docs/status/voiceover-learnings.md`.
