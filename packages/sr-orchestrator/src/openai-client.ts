import OpenAI from 'openai';
import type { AgentTool } from './types.js';

export interface OpenAiMessage {
  role: 'user' | 'assistant';
  content: string | OpenAiContentBlock[];
}

export type OpenAiContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface OpenAiAgentResponse {
  stopReason: 'end_turn' | 'tool_use' | 'other';
  content: OpenAiContentBlock[];
  usage: { inputTokens: number; outputTokens: number };
}

export class OpenAiAgentClient {
  readonly name = 'OpenAI';
  private client: OpenAI | null;

  constructor(client: OpenAI | null = null) {
    this.client = client;
  }

  async complete(params: {
    model: string;
    system: string;
    messages: OpenAiMessage[];
    tools: AgentTool[];
    maxTokens: number;
  }): Promise<OpenAiAgentResponse> {
    const response = await this.getClient().responses.create({
      model: params.model,
      instructions: params.system,
      input: toResponseInput(params.messages) as never,
      tools: params.tools.map(toResponseTool) as never,
      max_output_tokens: params.maxTokens,
    });

    const content = normaliseResponseOutput(response.output ?? []);
    const hasToolUse = content.some((block) => block.type === 'tool_use');

    return {
      stopReason: hasToolUse ? 'tool_use' : 'end_turn',
      content,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }

  private getClient(): OpenAI {
    this.client ??= new OpenAI();
    return this.client;
  }
}

function toResponseTool(tool: AgentTool): Record<string, unknown> {
  return {
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  };
}

function toResponseInput(messages: OpenAiMessage[]): Record<string, unknown>[] {
  return messages.flatMap((message) => {
    if (typeof message.content === 'string') {
      return [{ role: message.role, content: message.content }];
    }

    const items: Record<string, unknown>[] = [];
    const text = message.content
      .filter((block): block is Extract<OpenAiContentBlock, { type: 'text' }> => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    if (text) {
      items.push({ role: message.role, content: text });
    }

    for (const block of message.content) {
      if (block.type === 'tool_use') {
        items.push({
          type: 'function_call',
          call_id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input),
        });
      } else if (block.type === 'tool_result') {
        items.push({
          type: 'function_call_output',
          call_id: block.tool_use_id,
          output: block.content,
        });
      }
    }

    return items;
  });
}

function normaliseResponseOutput(output: unknown[]): OpenAiContentBlock[] {
  const blocks: OpenAiContentBlock[] = [];

  for (const item of output) {
    if (!isRecord(item)) continue;

    if (item.type === 'function_call') {
      const callId = stringValue(item.call_id) ?? stringValue(item.id) ?? '';
      const name = stringValue(item.name) ?? '';
      blocks.push({
        type: 'tool_use',
        id: callId,
        name,
        input: parseJsonObject(stringValue(item.arguments) ?? '{}'),
      });
      continue;
    }

    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const contentItem of item.content) {
        const text = extractOutputText(contentItem);
        if (text) blocks.push({ type: 'text', text });
      }
      continue;
    }

    const text = extractOutputText(item);
    if (text) blocks.push({ type: 'text', text });
  }

  return blocks;
}

function extractOutputText(item: unknown): string | null {
  if (!isRecord(item)) return null;
  if (typeof item.text === 'string') return item.text;
  if (typeof item.content === 'string') return item.content;
  if (typeof item.output_text === 'string') return item.output_text;
  return null;
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
