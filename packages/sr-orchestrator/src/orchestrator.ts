import fs from 'node:fs';
import path from 'node:path';
import type {
  AgentContext,
  AgentDefinition,
  OrchestratorConfig,
  Phase,
  RunState,
  ScanQualityReport,
  StageReceipt,
  TargetState,
  TargetStatus,
  TokenUsage,
} from './types.js';
import { PHASE_ORDER } from './types.js';
import { runAgent } from './agent-runner.js';
import { OpenAiAgentClient } from './openai-client.js';

// ---------------------------------------------------------------------------
// Phase → next status mapping
// ---------------------------------------------------------------------------

const PHASE_COMPLETE_STATUS: Record<Phase, TargetStatus> = {
  intake: 'preprocessed',
  preprocess: 'preprocessed',
  'evidence-refinement': 'evidence-refined',
  'fixture-judge': 'fixture-judged',
  'engine-refinement': 'engine-refined',
  promotion: 'promoted',
};

const STATUS_TO_NEXT_PHASE: Record<TargetStatus, Phase | null> = {
  pending: 'intake',
  preprocessed: 'evidence-refinement',
  'evidence-refined': 'fixture-judge',
  'fixture-judged': 'engine-refinement',
  'engine-refined': 'promotion',
  promoted: null,
  failed: null,
  skipped: null,
};

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export class Orchestrator {
  private config: OrchestratorConfig;
  private agents: Map<Phase, AgentDefinition>;
  private state: RunState;
  private client: OpenAiAgentClient;
  /** Shared token accumulator across all phases in this run (for spend-limit checks). */
  private accumulatedUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };

  constructor(config: OrchestratorConfig, agents: AgentDefinition[]) {
    this.config = config;
    this.agents = new Map(agents.map((a) => [a.phase, a]));
    this.state = this.initState();
    this.client = new OpenAiAgentClient();
  }

  // ---- State management ---------------------------------------------------

  private initState(): RunState {
    const targets: Record<string, TargetState> = {};
    for (const name of this.config.targets) {
      targets[name] = {
        name,
        status: detectTargetStatus(name, this.config.repoRoot),
        currentPhase: null,
        receipts: {
          intake: null,
          preprocess: null,
          'evidence-refinement': null,
          'fixture-judge': null,
          'engine-refinement': null,
          promotion: null,
        },
      };
    }
    return {
      runId: `run-${Date.now()}`,
      startedAt: new Date().toISOString(),
      targets,
      completedTargets: [],
      failedTargets: [],
      currentTarget: null,
    };
  }

  /** Persist run state to disk so runs can be resumed. */
  private persistState(): void {
    const stateFile = path.join(this.config.workDir, this.state.runId, 'run-state.json');
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    const stateWithUsage = { ...this.state, accumulatedUsage: this.accumulatedUsage };
    fs.writeFileSync(stateFile, JSON.stringify(stateWithUsage, null, 2));
  }

  /** Resume from a previous run-state.json. */
  static resume(
    stateFile: string,
    config: OrchestratorConfig,
    agents: AgentDefinition[],
  ): Orchestrator {
    const saved = JSON.parse(fs.readFileSync(stateFile, 'utf-8')) as RunState;
    const orc = new Orchestrator(config, agents);
    orc.state = saved;
    return orc;
  }

  // ---- Stage directory helpers --------------------------------------------

  private stageDir(target: string): string {
    return path.join(this.config.workDir, this.state.runId, target);
  }

  private writeReceipt(target: string, receipt: StageReceipt): void {
    const dir = this.stageDir(target);
    fs.mkdirSync(dir, { recursive: true });
    const idx = PHASE_ORDER.indexOf(receipt.phase) + 1;
    const pad = String(idx).padStart(2, '0');
    const filename = `${pad}-${receipt.phase}.json`;
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(receipt, null, 2));
  }

  // ---- Core loop ----------------------------------------------------------

  /** Run the full orchestration for all targets. */
  async run(): Promise<RunState> {
    console.log(`\n🎼 Orchestrator run ${this.state.runId}`);
    console.log(`   Provider: ${this.client.name}`);
    console.log(`   Targets: ${this.config.targets.join(', ')}`);
    if (this.config.spendLimit?.maxTotalCostUsd) {
      console.log(`   Spend limit: $${this.config.spendLimit.maxTotalCostUsd}`);
    }
    console.log('');

    for (const targetName of this.config.targets) {
      const target = this.state.targets[targetName];
      if (!target) continue;

      this.state.currentTarget = targetName;
      console.log(`\n━━━ Target: ${targetName}  (detected status: ${target.status}) ━━━`);

      try {
        await this.processTarget(target);
        this.state.completedTargets.push(targetName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ Target ${targetName} failed: ${msg}`);
        target.status = 'failed';
        this.state.failedTargets.push(targetName);
      }

      this.state.currentTarget = null;
      this.persistState();
    }

    this.printSummary();
    return this.state;
  }

  /** Walk a single target through its remaining phases. */
  private async processTarget(target: TargetState): Promise<void> {
    // Per-target override > global override > auto-detected status
    const perTargetPhase = this.config.targetStartPhases?.[target.name];
    let nextPhase: Phase | null = perTargetPhase ?? this.config.startPhase ?? STATUS_TO_NEXT_PHASE[target.status];

    if (target.status === 'promoted') {
      console.log(`  ✓ Already promoted, skipping`);
      return;
    }

    while (nextPhase) {
      const agent = this.agents.get(nextPhase);
      if (!agent) {
        console.log(`  ⚠ No agent registered for phase "${nextPhase}", skipping`);
        break;
      }

      console.log(`  ▸ Phase: ${nextPhase} (model tier: ${agent.modelTier})`);
      target.currentPhase = nextPhase;

      const receipt = await this.executePhase(agent, target);

      if (this.config.dryRun) {
        const simulatedStatus = PHASE_COMPLETE_STATUS[nextPhase];
        nextPhase = STATUS_TO_NEXT_PHASE[simulatedStatus];
        continue;
      }

      target.receipts[nextPhase] = receipt;
      this.writeReceipt(target.name, receipt);

      if (receipt.status === 'failed') {
        target.status = 'failed';
        throw new Error(`Phase ${nextPhase} failed: ${receipt.summary}`);
      }

      if (receipt.status === 'needs-review') {
        console.log(`  ⏸ Phase ${nextPhase} needs human review — pausing target`);
        break;
      }

      // Advance status
      target.status = PHASE_COMPLETE_STATUS[nextPhase];
      nextPhase = STATUS_TO_NEXT_PHASE[target.status];
    }

    target.currentPhase = null;
  }

  /** Execute a single phase agent and return a receipt. */
  private async executePhase(
    agent: AgentDefinition,
    target: TargetState,
  ): Promise<StageReceipt> {
    const ctx: AgentContext = {
      runId: this.state.runId,
      target: target.name,
      workDir: this.config.workDir,
      repoRoot: this.config.repoRoot,
      stageDir: this.stageDir(target.name),
      previousReceipts: PHASE_ORDER.filter((p) => target.receipts[p] !== null).map(
        (p) => target.receipts[p]!,
      ),
      // Compute scan quality if we have an artifact directory
      scanQuality: this.config.artifactDir
        ? assessScanQuality(target.name, this.config.artifactDir)
        : undefined,
    };

    const startedAt = new Date().toISOString();

    if (this.config.dryRun) {
      console.log(`    [dry-run] Would run ${agent.name} for ${target.name}`);
      return {
        phase: agent.phase,
        target: target.name,
        runId: this.state.runId,
        startedAt,
        completedAt: new Date().toISOString(),
        modelUsed: 'dry-run',
        status: 'success',
        summary: 'Dry run — no action taken',
        artifacts: [],
      };
    }

    let retries = 0;
    while (retries <= this.config.maxRetriesPerPhase) {
      try {
        const result = await runAgent(
          agent,
          ctx,
          this.config.models,
          this.client,
          this.accumulatedUsage,
          this.config.spendLimit,
        );
        // Merge usage back (accumulatedUsage is mutated in-place by runAgent)
        return {
          phase: agent.phase,
          target: target.name,
          runId: this.state.runId,
          startedAt,
          completedAt: new Date().toISOString(),
          modelUsed: this.config.models[agent.modelTier],
          status: result.status,
          summary: result.summary,
          artifacts: result.artifacts,
          errors: result.errors,
          tokenUsage: result.usage,
        };
      } catch (err) {
        retries++;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`    Retry ${retries}/${this.config.maxRetriesPerPhase}: ${msg}`);
        if (retries > this.config.maxRetriesPerPhase) {
          return {
            phase: agent.phase,
            target: target.name,
            runId: this.state.runId,
            startedAt,
            completedAt: new Date().toISOString(),
            modelUsed: this.config.models[agent.modelTier],
            status: 'failed',
            summary: `Failed after ${retries} attempts: ${msg}`,
            artifacts: [],
            errors: [msg],
          };
        }
      }
    }

    // Unreachable but satisfies TS
    throw new Error('Exhausted retries');
  }

  // ---- Reporting ----------------------------------------------------------

  private printSummary(): void {
    console.log('\n━━━ Run Summary ━━━');
    for (const [name, target] of Object.entries(this.state.targets)) {
      const icon =
        target.status === 'promoted'
          ? '✓'
          : target.status === 'failed'
            ? '✗'
            : '◦';
      console.log(`  ${icon} ${name}: ${target.status}`);
    }
    console.log(
      `\n  Completed: ${this.state.completedTargets.length}  Failed: ${this.state.failedTargets.length}`,
    );
    console.log(
      `  Total tokens — input: ${this.accumulatedUsage.inputTokens.toLocaleString()}  ` +
      `output: ${this.accumulatedUsage.outputTokens.toLocaleString()}  ` +
      `estimated cost: $${this.accumulatedUsage.estimatedCostUsd.toFixed(4)}\n`,
    );
  }
}

// ---------------------------------------------------------------------------
// Auto-detect target status from refinement-manifest + fixture files
// ---------------------------------------------------------------------------

/**
 * Infer how far a target has already progressed without requiring a
 * run-state.json from a previous orchestrator run.
 *
 * Detection order (most advanced → least advanced):
 * 1. manifest.json says "refined" or "partial"  → promoted
 * 2. Fixture .expected.json + evidence + manifest = "candidate"
 *    and the sky-refinement-status.md says "Phase B complete" → evidence-refined
 * 3. Fixture .expected.json exists              → preprocessed
 * 4. Nothing                                    → pending
 */
function detectTargetStatus(target: string, repoRoot: string): TargetStatus {
  const fixtureDir = path.join(repoRoot, 'packages/sr-engine/tests/fixtures/voiceover');
  const manifestFile = path.join(fixtureDir, 'refinement-manifest.json');
  const expectedFile = path.join(fixtureDir, `${target}.expected.json`);

  // Check refinement-manifest.json
  if (fs.existsSync(manifestFile)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8')) as {
        cases?: Record<string, { status?: string }>;
      };
      const entry = manifest.cases?.[target];
      if (entry?.status === 'refined' || entry?.status === 'partial') {
        return 'promoted';
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check fixture file exists (Phase A complete)
  if (!fs.existsSync(expectedFile)) {
    return 'pending';
  }

  // Phase B detection: check sky-refinement-status.md for "Phase B complete" mention
  // This is a heuristic — if the status doc explicitly lists the target under the
  // "Phase B Complete" section, treat it as evidence-refined.
  const statusDoc = path.join(repoRoot, 'packages/sr-engine/docs/sky-refinement-status.md');
  if (fs.existsSync(statusDoc)) {
    try {
      const content = fs.readFileSync(statusDoc, 'utf-8');
      // Heuristic: the target appears under a "Phase B" heading before the next heading
      const phaseBSection = content.match(
        /##\s+Phase B[^\n]*\n([\s\S]*?)(?=\n##\s|\s*$)/i,
      );
      if (phaseBSection && phaseBSection[1].includes(target)) {
        return 'evidence-refined';
      }
    } catch {
      // Ignore
    }
  }

  // Fixture exists but no Phase B signal
  return 'preprocessed';
}

// ---------------------------------------------------------------------------
// Scan quality assessment (used by the intake agent context)
// ---------------------------------------------------------------------------

export function assessScanQuality(
  target: string,
  artifactDir: string,
): import('./types.js').ScanQualityReport {
  const scanDir = path.join(artifactDir, `voiceover-scan-${target}`, 'scans', target);
  const manifestFile = path.join(scanDir, 'refinement-manifest.json');

  const REQUIRED_FILES = [
    'voiceover-output.json',
    'rendered-html.html',
    'accessibility-tree.json',
    'scan-debug.json',
    'step-snapshots.json',
    'voiceover-sources.json',
  ];

  if (!fs.existsSync(manifestFile)) {
    return {
      verdict: 'needs-rescan',
      stopReason: 'unknown',
      capturedSteps: 0,
      missingFiles: ['refinement-manifest.json'],
      issues: ['No refinement-manifest.json found in artifact'],
      rescanRecommended: true,
      rescanReason: 'Artifact not found or incomplete',
    };
  }

  let manifest: {
    scan?: { stopReason?: string; capturedSteps?: number };
    files?: Record<string, string>;
  } = {};
  try {
    manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
  } catch {
    return {
      verdict: 'needs-rescan',
      stopReason: 'unknown',
      capturedSteps: 0,
      missingFiles: [],
      issues: ['Could not parse refinement-manifest.json'],
      rescanRecommended: true,
      rescanReason: 'Corrupt manifest',
    };
  }

  const stopReason = manifest.scan?.stopReason ?? 'unknown';
  const capturedSteps = manifest.scan?.capturedSteps ?? 0;
  const declaredFiles = manifest.files ?? {};

  const missingFiles: string[] = [];
  for (const required of REQUIRED_FILES) {
    // Check if it's declared in the manifest and the file actually exists
    const declaredKey = Object.values(declaredFiles).find((v) => v === required);
    if (!declaredKey || !fs.existsSync(path.join(scanDir, required))) {
      missingFiles.push(required);
    }
  }

  const issues: string[] = [];
  let rescanRecommended = false;
  let rescanReason: string | undefined;

  if (stopReason !== 'scan-end-marker') {
    issues.push(`Scan did not complete cleanly (stopReason: "${stopReason}")`);
    rescanRecommended = true;
    rescanReason = `Scan interrupted — stopReason "${stopReason}" indicates incomplete capture`;
  }

  if (capturedSteps < 10) {
    issues.push(`Very few captured steps (${capturedSteps}) — scan may have started but not navigated`);
    rescanRecommended = true;
    rescanReason = rescanReason ?? `Only ${capturedSteps} steps captured`;
  }

  if (missingFiles.length > 0) {
    issues.push(`Missing evidence files: ${missingFiles.join(', ')}`);
    if (missingFiles.includes('voiceover-sources.json') || missingFiles.includes('step-snapshots.json')) {
      rescanRecommended = true;
      rescanReason = rescanReason ?? `Missing critical evidence files: ${missingFiles.join(', ')}`;
    }
  }

  const verdict =
    rescanRecommended ? 'needs-rescan' :
    issues.length > 0  ? 'degraded' :
                         'good';

  return {
    verdict,
    stopReason,
    capturedSteps,
    missingFiles,
    issues,
    rescanRecommended,
    rescanReason,
  };
}
