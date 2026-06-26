import type {
  AgentContext,
  AgentDefinition,
  ModelConfig,
  SpendLimit,
  TokenUsage,
} from './types.js';
import { estimateCost } from './types.js';
import type { OpenAiAgentClient, OpenAiContentBlock, OpenAiMessage } from './openai-client.js';

// ---------------------------------------------------------------------------
// Agent result
// ---------------------------------------------------------------------------

export interface AgentResult {
  status: 'success' | 'failed' | 'needs-review';
  summary: string;
  artifacts: string[];
  errors?: string[];
  usage: TokenUsage;
}

// ---------------------------------------------------------------------------
// Run a single agent in an agentic tool-use loop
// ---------------------------------------------------------------------------

export async function runAgent(
  agent: AgentDefinition,
  ctx: AgentContext,
  models: ModelConfig,
  client: OpenAiAgentClient,
  /** Accumulated usage so the agent can check the global budget before each turn. */
  accumulatedUsage: TokenUsage,
  spendLimit?: SpendLimit,
): Promise<AgentResult> {
  const model = models[agent.modelTier];

  // Build initial user message with context
  const contextMessage = buildContextMessage(agent, ctx);

  const messages: OpenAiMessage[] = [
    { role: 'user', content: contextMessage },
  ];

  let turns = 0;
  const artifacts: string[] = [];
  const errors: string[] = [];
  const agentUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };

  while (turns < agent.maxTurns) {
    turns++;

    // Check spend limit before each turn
    const limitError = checkSpendLimit(
      model,
      accumulatedUsage,
      agentUsage,
      spendLimit,
    );
    if (limitError) {
      console.warn(`    ⚠ Spend limit reached: ${limitError}`);
      return {
        status: 'needs-review',
        summary: `Spend limit reached before agent could conclude: ${limitError}`,
        artifacts,
        errors,
        usage: agentUsage,
      };
    }

    console.log(
      `    Turn ${turns}/${agent.maxTurns} via ${client.name} ` +
      `(agent cost so far: $${agentUsage.estimatedCostUsd.toFixed(4)})`,
    );

    const response = await client.complete({
      model,
      system: agent.systemPrompt,
      tools: agent.tools,
      messages,
      maxTokens: 8192,
    });

    // Accumulate token usage from this turn
    const turnInput = response.usage.inputTokens;
    const turnOutput = response.usage.outputTokens;
    agentUsage.inputTokens += turnInput;
    agentUsage.outputTokens += turnOutput;
    agentUsage.estimatedCostUsd += estimateCost(model, turnInput, turnOutput);
    // Also add to caller's accumulator
    accumulatedUsage.inputTokens += turnInput;
    accumulatedUsage.outputTokens += turnOutput;
    accumulatedUsage.estimatedCostUsd += estimateCost(model, turnInput, turnOutput);

    // Collect text blocks
    const textBlocks = response.content.filter(isTextBlock);
    if (textBlocks.length > 0) {
      const text = textBlocks.map((b) => b.text).join('\n');
      console.log(`    Agent: ${text.slice(0, 200)}${text.length > 200 ? '…' : ''}`);
    }

    // If the model stops without tool use, we're done
    if (response.stopReason === 'end_turn') {
      const finalText =
        textBlocks.map((b) => b.text).join('\n') ||
        'Phase completed.';
      return parseAgentConclusion(finalText, artifacts, errors, agentUsage);
    }

    // Process tool calls
    const toolUseBlocks = response.content.filter(isToolUseBlock);
    if (toolUseBlocks.length === 0) {
      // Model stopped without tool use or end_turn
      const finalText =
        textBlocks.map((b) => b.text).join('\n') ||
        'Phase completed (no tool use).';
      return parseAgentConclusion(finalText, artifacts, errors, agentUsage);
    }

    // Add assistant message with all content blocks
    messages.push({ role: 'assistant', content: response.content });

    // Execute each tool call and collect results
    const toolResults: OpenAiContentBlock[] = [];

    for (const toolBlock of toolUseBlocks) {
      const tool = agent.tools.find((t) => t.name === toolBlock.name);

      if (!tool) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: `Error: Unknown tool "${toolBlock.name}"`,
          is_error: true,
        });
        continue;
      }

      console.log(`    Tool: ${toolBlock.name}`);
      try {
        const result = await tool.execute(
          toolBlock.input as Record<string, unknown>,
          ctx,
        );
        // Track file artifacts
        if (
          toolBlock.name === 'write_file' ||
          toolBlock.name === 'write_json' ||
          toolBlock.name === 'edit_file'
        ) {
          const filePath = (toolBlock.input as Record<string, unknown>).path;
          if (typeof filePath === 'string') artifacts.push(filePath);
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: truncate(result, 50_000),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${toolBlock.name}: ${msg}`);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: `Error: ${msg}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  // Ran out of turns
  return {
    status: 'needs-review',
    summary: `Agent exhausted ${agent.maxTurns} turns without concluding.`,
    artifacts,
    errors,
    usage: agentUsage,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildContextMessage(agent: AgentDefinition, ctx: AgentContext): string {
  const lines = [
    `You are the **${agent.name}** agent.`,
    ``,
    `## Context`,
    `- Run ID: ${ctx.runId}`,
    `- Target: ${ctx.target}`,
    `- Repo root: ${ctx.repoRoot}`,
    `- Stage directory: ${ctx.stageDir}`,
    `- Work directory: ${ctx.workDir}`,
  ];

  if (ctx.previousReceipts.length > 0) {
    lines.push('', '## Previous Phase Receipts');
    for (const r of ctx.previousReceipts) {
      lines.push(
        `- **${r.phase}** (${r.status}): ${r.summary}`,
      );
    }
  }

  if (ctx.scanQuality) {
    lines.push('', '## Scan Quality Assessment');
    lines.push(`- Verdict: **${ctx.scanQuality.verdict}**`);
    lines.push(`- Stop reason: ${ctx.scanQuality.stopReason}`);
    lines.push(`- Captured steps: ${ctx.scanQuality.capturedSteps}`);
    if (ctx.scanQuality.missingFiles.length > 0) {
      lines.push(`- Missing files: ${ctx.scanQuality.missingFiles.join(', ')}`);
    }
    if (ctx.scanQuality.issues.length > 0) {
      lines.push('- Issues:');
      ctx.scanQuality.issues.forEach((i) => lines.push(`  - ${i}`));
    }
    if (ctx.scanQuality.rescanRecommended) {
      lines.push(`- ⚠ RESCAN RECOMMENDED: ${ctx.scanQuality.rescanReason}`);
      lines.push('  Set status to "needs-review" and include rescan recommendation in your receipt.');
    }
  }

  lines.push(
    '',
    '## Instructions',
    'Follow the multi-agent-voiceover-workflow.md instructions for your phase exactly.',
    'When finished, output a JSON summary with { "status": "success"|"failed"|"needs-review", "summary": "..." }.',
  );

  return lines.join('\n');
}

function isTextBlock(
  block: OpenAiContentBlock,
): block is Extract<OpenAiContentBlock, { type: 'text' }> {
  return block.type === 'text';
}

function isToolUseBlock(
  block: OpenAiContentBlock,
): block is Extract<OpenAiContentBlock, { type: 'tool_use' }> {
  return block.type === 'tool_use';
}

// ---------------------------------------------------------------------------
// Spend limit enforcement
// ---------------------------------------------------------------------------

function checkSpendLimit(
  model: string,
  accumulated: TokenUsage,
  agentSoFar: TokenUsage,
  limit?: SpendLimit,
): string | null {
  if (!limit) return null;

  const totalInput = accumulated.inputTokens;
  const totalOutput = accumulated.outputTokens;
  const totalCost = accumulated.estimatedCostUsd;

  if (limit.maxTotalCostUsd !== undefined && totalCost >= limit.maxTotalCostUsd) {
    return `Total cost $${totalCost.toFixed(4)} reached limit $${limit.maxTotalCostUsd}`;
  }
  if (limit.maxInputTokens !== undefined && totalInput >= limit.maxInputTokens) {
    return `Total input tokens ${totalInput.toLocaleString()} reached limit ${limit.maxInputTokens.toLocaleString()}`;
  }
  if (limit.maxOutputTokens !== undefined && totalOutput >= limit.maxOutputTokens) {
    return `Total output tokens ${totalOutput.toLocaleString()} reached limit ${limit.maxOutputTokens.toLocaleString()}`;
  }

  // Warn threshold
  if (
    limit.maxTotalCostUsd !== undefined &&
    limit.warnAtFraction !== undefined &&
    totalCost >= limit.maxTotalCostUsd * limit.warnAtFraction
  ) {
    console.warn(
      `  ⚠ Spend warning: $${totalCost.toFixed(4)} / $${limit.maxTotalCostUsd} (${(limit.warnAtFraction * 100).toFixed(0)}% threshold)`,
    );
  }

  return null;
}

function parseAgentConclusion(
  text: string,
  artifacts: string[],
  errors: string[],
  usage: TokenUsage,
): AgentResult {
  // Try to extract JSON from the agent's final message
  const jsonMatch = text.match(/\{[\s\S]*"status"\s*:\s*"(success|failed|needs-review)"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        status: string;
        summary?: string;
      };
      return {
        status: parsed.status as AgentResult['status'],
        summary: parsed.summary || text.slice(0, 500),
        artifacts,
        errors: errors.length > 0 ? errors : undefined,
        usage,
      };
    } catch {
      // Fall through
    }
  }

  return {
    status: 'success',
    summary: text.slice(0, 500),
    artifacts,
    errors: errors.length > 0 ? errors : undefined,
    usage,
  };
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + `\n…[truncated ${s.length - maxLen} chars]`;
}
