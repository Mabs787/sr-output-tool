#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Orchestrator } from './orchestrator.js';
import { allAgents } from './agents.js';
import type { OrchestratorConfig, Phase } from './types.js';
import { PHASE_ORDER } from './types.js';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const DEFAULT_MODELS = {
  cheap: 'gpt-4.1-mini',
  mid: 'gpt-4.1',
  strong: 'gpt-5',
};

const { values } = parseArgs({
  options: {
    targets: { type: 'string', short: 't', description: 'Comma-separated target names' },
    'artifact-dir': { type: 'string', description: 'Artifact directory path' },
    'start-phase': { type: 'string', description: 'Resume from this phase (applies to all targets)' },
    'target-phase': {
      type: 'string',
      description: 'Per-target phase override, format: "target:phase,target:phase"',
    },
    'dry-run': { type: 'boolean', default: false, description: 'Plan without executing' },
    'max-retries': { type: 'string', default: '1', description: 'Max retries per phase' },
    resume: { type: 'string', description: 'Path to run-state.json to resume' },
    'cheap-model': { type: 'string' },
    'mid-model': { type: 'string' },
    'strong-model': { type: 'string' },
    'spend-limit': { type: 'string', description: 'Max total spend in USD, e.g. "5.00"' },
    'warn-at': {
      type: 'string',
      description: 'Warn when spend reaches this fraction of limit, e.g. "0.8"',
      default: '0.8',
    },
    help: { type: 'boolean', short: 'h' },
  },
  strict: true,
});

if (values.help) {
  console.log(`
Usage: sr-orchestrate [options]

Options:
  -t, --targets <names>           Comma-separated target names (required unless --resume)
  --artifact-dir <path>           Artifact directory path
  --start-phase <phase>           Force all targets to start from this phase
  --target-phase <overrides>      Per-target phase override: "target:phase,target:phase"
  --dry-run                       Plan without executing agent turns
  --max-retries <n>               Max retries per phase (default: 1)
  --resume <path>                 Resume from a run-state.json file
  --cheap-model <model>           Model for cheap tier (default: gpt-4.1-mini)
  --mid-model <model>             Model for mid tier (default: gpt-4.1)
  --strong-model <model>          Model for strong tier (default: gpt-5)
  --spend-limit <usd>             Hard cap on total estimated USD spend, e.g. "5.00"
  --warn-at <fraction>            Warn when spend reaches this fraction of limit (default: 0.8)
  -h, --help                      Show this help

Model tiers (defaults optimised for cost ~$4/site):
  cheap  → Phase A (Intake), Phase E (Promotion)  — gpt-4.1-mini
  mid    → Phase C (Fixture Judge)                — gpt-4.1
  strong → Phase B (Evidence Refinement),
           Phase D (Engine Refinement)            — gpt-5

Use --strong-model to override Phase B/D when you want a different reasoning model.
Rough cost depends heavily on evidence lookup volume; use --spend-limit for batch runs.

Phases: ${PHASE_ORDER.join(', ')}

Examples:
  # Run full pipeline, auto-detect each target's current phase
  sr-orchestrate -t www-sky-com-tv

  # Dry-run to see the plan
  sr-orchestrate -t www-sky-com-tv --dry-run

  # Force all targets to start from evidence-refinement
  sr-orchestrate -t www-sky-com-tv --start-phase evidence-refinement

  # Per-target phase override (one at Phase B, another at Phase D)
  sr-orchestrate -t www-sky-com-tv,www-sky-com-glass \\
    --target-phase "www-sky-com-tv:evidence-refinement,www-sky-com-glass:engine-refinement"

  # Multiple targets with a $5 spend cap and warning at 80%
  sr-orchestrate -t www-sky-com-tv,www-sky-com-watch,www-sky-com-glass \\
    --spend-limit 5.00 --warn-at 0.8

  # Override OpenAI model tiers. Requires OPENAI_API_KEY.
  sr-orchestrate -t www-sky-com-tv \\
    --cheap-model gpt-4.1-mini --mid-model gpt-4.1 --strong-model gpt-5

  # Resume a failed run
  sr-orchestrate --resume voiceover-smoke/agent-work/run-123/run-state.json
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------

const repoRoot = path.resolve(new URL('.', import.meta.url).pathname, '../../../');
const workDir = path.join(repoRoot, 'voiceover-smoke', 'agent-work');

if (!values.targets && !values.resume) {
  console.error('Error: --targets or --resume is required. Use --help for usage.');
  process.exit(1);
}

const startPhase = values['start-phase'] as Phase | undefined;
if (startPhase && !PHASE_ORDER.includes(startPhase)) {
  console.error(`Error: Invalid phase "${startPhase}". Valid: ${PHASE_ORDER.join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Build config & run
// ---------------------------------------------------------------------------

const config: OrchestratorConfig = {
  models: {
    cheap: values['cheap-model'] ?? DEFAULT_MODELS.cheap,
    mid: values['mid-model'] ?? DEFAULT_MODELS.mid,
    strong: values['strong-model'] ?? DEFAULT_MODELS.strong,
  },
  repoRoot,
  artifactDir: values['artifact-dir'],
  workDir,
  targets: values.targets?.split(',').map((t) => t.trim()) ?? [],
  startPhase,
  // Parse --target-phase "target:phase,target:phase"
  targetStartPhases: values['target-phase']
    ? Object.fromEntries(
        values['target-phase'].split(',').map((s) => {
          const [target, phase] = s.trim().split(':');
          return [target, phase as Phase];
        }),
      )
    : undefined,
  dryRun: values['dry-run'] ?? false,
  maxRetriesPerPhase: parseInt(values['max-retries'] ?? '1', 10),
  spendLimit: values['spend-limit']
    ? {
        maxTotalCostUsd: parseFloat(values['spend-limit']),
        warnAtFraction: parseFloat(values['warn-at'] ?? '0.8'),
      }
    : undefined,
};

async function main() {
  let orchestrator: Orchestrator;

  if (values.resume) {
    console.log(`Resuming from ${values.resume}`);
    orchestrator = Orchestrator.resume(values.resume, config, allAgents);
  } else {
    orchestrator = new Orchestrator(config, allAgents);
  }

  const result = await orchestrator.run();

  // Exit with non-zero if any targets failed
  if (result.failedTargets.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Orchestrator error:', err);
  process.exit(1);
});
