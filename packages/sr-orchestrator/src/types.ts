/**
 * Core types for the multi-agent VoiceOver refinement orchestrator.
 */

// ---------------------------------------------------------------------------
// Model tiers
// ---------------------------------------------------------------------------

/** Model tier routing — cheap for mechanical work, strong for judgment. */
export type ModelTier = 'cheap' | 'mid' | 'strong';

/** Map tiers to concrete model identifiers. */
export interface ModelConfig {
  cheap: string;
  mid: string;
  strong: string;
}

// ---------------------------------------------------------------------------
// Phase identifiers
// ---------------------------------------------------------------------------

export type Phase =
  | 'intake'
  | 'preprocess'
  | 'evidence-refinement'
  | 'fixture-judge'
  | 'engine-refinement'
  | 'promotion';

export const PHASE_ORDER: Phase[] = [
  'intake',
  'preprocess',
  'evidence-refinement',
  'fixture-judge',
  'engine-refinement',
  'promotion',
];

// ---------------------------------------------------------------------------
// Stage receipts
// ---------------------------------------------------------------------------

export interface StageReceipt {
  phase: Phase;
  target: string;
  runId: string;
  startedAt: string;
  completedAt?: string;
  modelUsed: string;
  status: 'success' | 'failed' | 'needs-review';
  summary: string;
  artifacts: string[];
  errors?: string[];
  tokenUsage?: TokenUsage;
}

// ---------------------------------------------------------------------------
// Target state tracked by the orchestrator
// ---------------------------------------------------------------------------

export type TargetStatus =
  | 'pending'
  | 'preprocessed'
  | 'evidence-refined'
  | 'fixture-judged'
  | 'engine-refined'
  | 'promoted'
  | 'failed'
  | 'skipped';

export interface TargetState {
  name: string;
  status: TargetStatus;
  currentPhase: Phase | null;
  receipts: Record<Phase, StageReceipt | null>;
  fixtureClassification?: 'refined' | 'partial' | 'candidate' | 'skip';
}

// ---------------------------------------------------------------------------
// Orchestrator run state
// ---------------------------------------------------------------------------

export interface RunState {
  runId: string;
  startedAt: string;
  targets: Record<string, TargetState>;
  completedTargets: string[];
  failedTargets: string[];
  currentTarget: string | null;
}

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>, ctx: AgentContext) => Promise<string>;
}

export interface AgentDefinition {
  name: string;
  phase: Phase;
  modelTier: ModelTier;
  systemPrompt: string;
  tools: AgentTool[];
  /** Max turns before forcing a summary/handoff. */
  maxTurns: number;
}

export interface AgentContext {
  runId: string;
  target: string;
  workDir: string;
  repoRoot: string;
  stageDir: string;
  previousReceipts: StageReceipt[];
  /** Pre-computed scan quality report for this target (if available). */
  scanQuality?: ScanQualityReport;
}

// ---------------------------------------------------------------------------
// Token usage tracking
// ---------------------------------------------------------------------------

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  /** Estimated USD cost based on model pricing. */
  estimatedCostUsd: number;
}

/** Approximate pricing per million tokens (update as needed). */
export const MODEL_PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-4o':                    { input:  2.50, output: 10.00 },
  'gpt-4o-mini':               { input:  0.15, output:  0.60 },
  'gpt-4.1':                   { input:  2.00, output:  8.00 },
  'gpt-4.1-mini':              { input:  0.40, output:  1.60 },
  'gpt-4.1-nano':              { input:  0.10, output:  0.40 },
  // Keep this conservative unless pricing is refreshed from the provider.
  'gpt-5':                     { input:  3.00, output: 15.00 },
  // Fallback for unknown models
  default:                     { input:  3.00, output: 15.00 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING_PER_MILLION[model] ?? MODEL_PRICING_PER_MILLION['default'];
  return (inputTokens / 1_000_000) * pricing.input +
         (outputTokens / 1_000_000) * pricing.output;
}

// ---------------------------------------------------------------------------
// Scan quality assessment
// ---------------------------------------------------------------------------

export type ScanQualityVerdict = 'good' | 'degraded' | 'needs-rescan';

export interface ScanQualityReport {
  verdict: ScanQualityVerdict;
  stopReason: string;
  capturedSteps: number;
  missingFiles: string[];
  issues: string[];
  rescanRecommended: boolean;
  rescanReason?: string;
}

// ---------------------------------------------------------------------------
// Orchestrator config
// ---------------------------------------------------------------------------

export interface SpendLimit {
  /** Hard cap on total estimated USD spend for the entire run. */
  maxTotalCostUsd?: number;
  /** Hard cap on total input tokens across all agents in the run. */
  maxInputTokens?: number;
  /** Hard cap on total output tokens across all agents in the run. */
  maxOutputTokens?: number;
  /** Warn (but don't abort) when estimated cost exceeds this fraction of maxTotalCostUsd. */
  warnAtFraction?: number;
}

export interface OrchestratorConfig {
  models: ModelConfig;
  repoRoot: string;
  artifactDir?: string;
  workDir: string;
  targets: string[];
  /** Per-target phase override map. Takes precedence over auto-detection. */
  targetStartPhases?: Record<string, Phase>;
  /** Global start-phase fallback for all targets (use targetStartPhases for per-target). */
  startPhase?: Phase;
  /** Dry-run: plan but don't execute agent turns. */
  dryRun: boolean;
  maxRetriesPerPhase: number;
  /** Token and cost spend limits. If omitted, no limits are enforced. */
  spendLimit?: SpendLimit;
}
