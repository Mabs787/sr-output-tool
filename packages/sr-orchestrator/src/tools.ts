import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import type { AgentContext, AgentTool } from './types.js';

// ---------------------------------------------------------------------------
// File system tools
// ---------------------------------------------------------------------------

export const readFileTool: AgentTool = {
  name: 'read_file',
  description: 'Read the contents of a file. Returns the full text.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'Absolute or repo-relative file path.' },
    },
    required: ['path'],
  },
  async execute(input, ctx) {
    const filePath = resolvePath(input.path as string, ctx);
    return fs.readFileSync(filePath, 'utf-8');
  },
};

export const writeFileTool: AgentTool = {
  name: 'write_file',
  description: 'Write content to a file. Creates parent directories if needed.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'Absolute or repo-relative file path.' },
      content: { type: 'string', description: 'Full file content.' },
    },
    required: ['path', 'content'],
  },
  async execute(input, ctx) {
    const filePath = resolvePath(input.path as string, ctx);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, input.content as string);
    return `Wrote ${filePath}`;
  },
};

export const writeJsonTool: AgentTool = {
  name: 'write_json',
  description: 'Write a JSON object to a file with pretty formatting.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'Absolute or repo-relative file path.' },
      data: { type: 'object', description: 'JSON data to write.' },
    },
    required: ['path', 'data'],
  },
  async execute(input, ctx) {
    const filePath = resolvePath(input.path as string, ctx);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(input.data, null, 2));
    return `Wrote JSON to ${filePath}`;
  },
};

export const listDirTool: AgentTool = {
  name: 'list_dir',
  description: 'List files and directories at a path.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'Directory path.' },
    },
    required: ['path'],
  },
  async execute(input, ctx) {
    const dirPath = resolvePath(input.path as string, ctx);
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map((e) => `${e.isDirectory() ? '[dir] ' : ''}${e.name}`).join('\n');
  },
};

export const grepTool: AgentTool = {
  name: 'grep',
  description: 'Search for a pattern in files. Returns matching lines with file paths.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      pattern: { type: 'string', description: 'Regex pattern to search for.' },
      path: { type: 'string', description: 'File or directory to search in.' },
      include: { type: 'string', description: 'Glob pattern for files to include (e.g. "*.ts").' },
    },
    required: ['pattern', 'path'],
  },
  async execute(input, ctx) {
    const searchPath = resolvePath(input.path as string, ctx);
    const args = ['-rn'];
    if (input.include) args.push(`--include=${input.include}`);
    args.push(input.pattern as string, searchPath);
    try {
      const result = execFileSync('grep', args, {
        encoding: 'utf-8',
        timeout: 10_000,
        maxBuffer: 1024 * 1024,
      });
      const lines = result.split('\n').filter(Boolean).slice(0, 100);
      return lines.join('\n') || 'No matches found.';
    } catch {
      return 'No matches found.';
    }
  },
};

// ---------------------------------------------------------------------------
// Targeted evidence lookup tools
// These avoid loading 75K+ token AX trees / HTML blobs into the context.
// ---------------------------------------------------------------------------

/**
 * Read the announcements from a fixture without loading HTML/AX tree.
 * Returns expectedAnnouncements + refinedAnnouncements only.
 */
export const readAnnouncementsTool: AgentTool = {
  name: 'read_announcements',
  description:
    'Read only the announcement arrays from a fixture .expected.json. ' +
    'Much cheaper than read_file on the full fixture. ' +
    'Returns expectedAnnouncements, refinedAnnouncements, and refinementNotes.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      target: { type: 'string', description: 'Fixture name, e.g. "www-sky-com-tv".' },
    },
    required: ['target'],
  },
  async execute(input, ctx) {
    const file = path.join(
      ctx.repoRoot,
      'packages/sr-engine/tests/fixtures/voiceover',
      `${input.target}.expected.json`,
    );
    const fixture = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>;
    return JSON.stringify(
      {
        expectedAnnouncements: fixture['expectedAnnouncements'],
        refinedAnnouncements: fixture['refinedAnnouncements'],
        refinementNotes: fixture['refinementNotes'],
      },
      null,
      2,
    );
  },
};

/**
 * Look up AX tree nodes matching a keyword, role, or selector fragment.
 * Returns only matching nodes instead of the full 75K-token tree.
 */
export const lookupAxNodesTool: AgentTool = {
  name: 'lookup_ax_nodes',
  description:
    'Search the AX tree for nodes matching a keyword, role, or name fragment. ' +
    'Returns up to `limit` matching nodes. ' +
    'MUCH cheaper than reading the whole AX tree (avg 75K tokens). ' +
    'Use this to look up specific elements mentioned in disputed announcements.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      target: { type: 'string', description: 'Fixture name, e.g. "www-sky-com-tv".' },
      query: {
        type: 'string',
        description: 'Case-insensitive string to match against node role, name, or description.',
      },
      limit: { type: 'number', description: 'Max nodes to return (default 30).' },
    },
    required: ['target', 'query'],
  },
  async execute(input, ctx) {
    const file = path.join(
      ctx.repoRoot,
      'packages/sr-engine/tests/fixtures/voiceover',
      `${input.target}.ax.json`,
    );
    const tree = JSON.parse(fs.readFileSync(file, 'utf-8')) as { nodes?: unknown[] };
    const nodes = tree.nodes ?? (Array.isArray(tree) ? tree as unknown[] : []);
    const query = (input.query as string).toLowerCase();
    const limit = (input.limit as number) ?? 30;

    const matches = (nodes as Record<string, unknown>[]).filter((n) => {
      const role = String(n['role'] ?? '').toLowerCase();
      const name = String(n['name'] ?? '').toLowerCase();
      const desc = String(n['description'] ?? '').toLowerCase();
      return role.includes(query) || name.includes(query) || desc.includes(query);
    });

    return JSON.stringify(matches.slice(0, limit), null, 2) +
      `\n\n(${matches.length} total matches, showing first ${Math.min(matches.length, limit)})`;
  },
};

/**
 * Look up step snapshots around a specific announcement index.
 * Returns a narrow window rather than the full 8M-token file.
 */
export const lookupStepSnapshotsTool: AgentTool = {
  name: 'lookup_step_snapshots',
  description:
    'Fetch step snapshots around a specific step index (±window). ' +
    'The full step-snapshots file is 8M tokens — use this instead. ' +
    'Use to inspect the live AX/DOM state at specific disputed steps.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      target: { type: 'string', description: 'Fixture name, e.g. "www-sky-com-tv".' },
      stepIndex: { type: 'number', description: 'Centre step index to inspect.' },
      window: { type: 'number', description: 'Steps before and after to include (default 3).' },
    },
    required: ['target', 'stepIndex'],
  },
  async execute(input, ctx) {
    const snapshotFile = path.join(
      ctx.repoRoot,
      'packages/sr-engine/tests/fixtures/voiceover',
      `${input.target}.step-snapshots.json`,
    );
    if (!fs.existsSync(snapshotFile)) {
      return 'step-snapshots.json not found for this fixture.';
    }
    const snapshots = JSON.parse(fs.readFileSync(snapshotFile, 'utf-8')) as unknown[];
    const idx = input.stepIndex as number;
    const win = (input.window as number) ?? 3;
    const slice = snapshots.slice(Math.max(0, idx - win), idx + win + 1);
    return JSON.stringify(slice, null, 2);
  },
};

/**
 * Extract a section of rendered HTML by CSS selector or line range.
 * Avoids loading the full 26K-token HTML file.
 */
export const lookupHtmlSectionTool: AgentTool = {
  name: 'lookup_html_section',
  description:
    'Extract a section of the rendered HTML by keyword search. ' +
    'Returns lines surrounding the first match. ' +
    'Use instead of read_file on the full HTML (avg 25K tokens).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      target: { type: 'string', description: 'Fixture name, e.g. "www-sky-com-tv".' },
      query: { type: 'string', description: 'Case-insensitive string to find in the HTML.' },
      contextLines: { type: 'number', description: 'Lines of context before/after (default 20).' },
    },
    required: ['target', 'query'],
  },
  async execute(input, ctx) {
    const htmlFile = path.join(
      ctx.repoRoot,
      'packages/sr-engine/tests/fixtures/voiceover',
      `${input.target}.html`,
    );
    const html = fs.readFileSync(htmlFile, 'utf-8');
    const lines = html.split('\n');
    const query = (input.query as string).toLowerCase();
    const ctx2 = (input.contextLines as number) ?? 20;

    const matchIdx = lines.findIndex((l) => l.toLowerCase().includes(query));
    if (matchIdx === -1) return `No match found for "${input.query}" in HTML.`;

    const start = Math.max(0, matchIdx - ctx2);
    const end = Math.min(lines.length - 1, matchIdx + ctx2);
    return (
      `Line ${start + 1}–${end + 1} of ${lines.length} (match at line ${matchIdx + 1}):\n\n` +
      lines.slice(start, end + 1).join('\n')
    );
  },
};

// ---------------------------------------------------------------------------
// Shell command tools
// ---------------------------------------------------------------------------

export const runCommandTool: AgentTool = {
  name: 'run_command',
  description:
    'Run a shell command in the repo root. Returns stdout+stderr. ' +
    'Use for yarn scripts, test runners, build commands.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      command: { type: 'string', description: 'Shell command to execute.' },
      cwd: { type: 'string', description: 'Working directory (default: repo root).' },
    },
    required: ['command'],
  },
  async execute(input, ctx) {
    const cwd = input.cwd ? resolvePath(input.cwd as string, ctx) : ctx.repoRoot;
    // Security: disallow dangerous commands
    const cmd = input.command as string;
    const dangerous = ['rm -rf /', 'rm -rf ~', 'mkfs', 'dd if=', ':(){'];
    if (dangerous.some((d) => cmd.includes(d))) {
      throw new Error('Refusing to execute potentially dangerous command.');
    }
    try {
      const result = execSync(cmd, {
        cwd,
        encoding: 'utf-8',
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
      });
      return result;
    } catch (err) {
      const execErr = err as { stdout?: string; stderr?: string; message: string };
      return `COMMAND FAILED:\n${execErr.stdout || ''}\n${execErr.stderr || ''}\n${execErr.message}`;
    }
  },
};

// ---------------------------------------------------------------------------
// Workflow-specific tools
// ---------------------------------------------------------------------------

export const refineArtifactTool: AgentTool = {
  name: 'refine_artifact',
  description:
    'Run the voiceover:refine-artifact script (Phase A preprocessing). ' +
    'This creates initial expectedAnnouncements and refinedAnnouncements.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      target: { type: 'string', description: 'Target name, e.g. "www-sky-com".' },
      artifactDir: { type: 'string', description: 'Path to artifact directory.' },
      runId: { type: 'string', description: 'GitHub Actions run ID.' },
      promote: {
        type: 'string',
        enum: ['none', 'candidate', 'refined'],
        description: 'Promotion mode (default: candidate).',
      },
    },
    required: ['target'],
  },
  async execute(input, ctx) {
    const args = [`--target`, input.target as string];
    if (input.artifactDir) args.push('--artifact-dir', input.artifactDir as string);
    if (input.runId) args.push('--run-id', input.runId as string);
    args.push('--promote', (input.promote as string) || 'candidate');

    try {
      return execFileSync('yarn', ['voiceover:refine-artifact', '--', ...args], {
        cwd: ctx.repoRoot,
        encoding: 'utf-8',
        timeout: 120_000,
      });
    } catch (err) {
      const execErr = err as { stdout?: string; stderr?: string };
      return `FAILED:\n${execErr.stdout || ''}\n${execErr.stderr || ''}`;
    }
  },
};

export const compareFixtureTool: AgentTool = {
  name: 'compare_fixture',
  description:
    'Run voiceover:compare for a fixture — compares current engine output ' +
    'against refinedAnnouncements. Returns mismatch table.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      fixture: { type: 'string', description: 'Fixture name, e.g. "www-sky-com".' },
    },
    required: ['fixture'],
  },
  async execute(input, ctx) {
    try {
      return execFileSync(
        'yarn',
        ['workspace', '@sr-output/engine', 'voiceover:compare', input.fixture as string],
        {
          cwd: ctx.repoRoot,
          encoding: 'utf-8',
          timeout: 60_000,
        },
      );
    } catch (err) {
      const execErr = err as { stdout?: string; stderr?: string };
      return `COMPARE OUTPUT:\n${execErr.stdout || ''}\n${execErr.stderr || ''}`;
    }
  },
};

export const runTestsTool: AgentTool = {
  name: 'run_tests',
  description: 'Run engine unit tests and/or voiceover corpus tests.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      suite: {
        type: 'string',
        enum: ['unit', 'voiceover', 'both'],
        description: 'Which test suite to run.',
      },
    },
    required: ['suite'],
  },
  async execute(input, ctx) {
    const suite = input.suite as string;
    const results: string[] = [];

    if (suite === 'unit' || suite === 'both') {
      try {
        results.push(
          'UNIT TESTS:\n' +
            execSync('yarn workspace @sr-output/engine test:unit', {
              cwd: ctx.repoRoot,
              encoding: 'utf-8',
              timeout: 60_000,
            }),
        );
      } catch (err) {
        const execErr = err as { stdout?: string; stderr?: string };
        results.push(`UNIT TESTS FAILED:\n${execErr.stdout || ''}\n${execErr.stderr || ''}`);
      }
    }

    if (suite === 'voiceover' || suite === 'both') {
      try {
        results.push(
          'VOICEOVER TESTS:\n' +
            execSync('yarn workspace @sr-output/engine test:voiceover', {
              cwd: ctx.repoRoot,
              encoding: 'utf-8',
              timeout: 120_000,
            }),
        );
      } catch (err) {
        const execErr = err as { stdout?: string; stderr?: string };
        results.push(`VOICEOVER TESTS FAILED:\n${execErr.stdout || ''}\n${execErr.stderr || ''}`);
      }
    }

    return results.join('\n\n');
  },
};

export const buildExtensionRuntimeTool: AgentTool = {
  name: 'build_extension_runtime',
  description: 'Rebuild the extension runtime after engine changes.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
  async execute(_input, ctx) {
    try {
      return execSync('yarn build:extension-runtime', {
        cwd: ctx.repoRoot,
        encoding: 'utf-8',
        timeout: 60_000,
      });
    } catch (err) {
      const execErr = err as { stdout?: string; stderr?: string };
      return `BUILD FAILED:\n${execErr.stdout || ''}\n${execErr.stderr || ''}`;
    }
  },
};

export const editFileTool: AgentTool = {
  name: 'edit_file',
  description:
    'Replace an exact string in a file with new content. ' +
    'The old string must appear exactly once in the file.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'File path.' },
      old_string: { type: 'string', description: 'Exact string to replace (must appear once).' },
      new_string: { type: 'string', description: 'Replacement string.' },
    },
    required: ['path', 'old_string', 'new_string'],
  },
  async execute(input, ctx) {
    const filePath = resolvePath(input.path as string, ctx);
    const content = fs.readFileSync(filePath, 'utf-8');
    const oldStr = input.old_string as string;
    const newStr = input.new_string as string;

    const count = content.split(oldStr).length - 1;
    if (count === 0) throw new Error('old_string not found in file.');
    if (count > 1) throw new Error(`old_string found ${count} times; must appear exactly once.`);

    fs.writeFileSync(filePath, content.replace(oldStr, newStr));
    return `Edited ${filePath}`;
  },
};

// ---------------------------------------------------------------------------
// Git tools
// ---------------------------------------------------------------------------

export const gitTool: AgentTool = {
  name: 'git',
  description: 'Run a git command (add, commit, status, diff). Push requires human approval.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      args: { type: 'string', description: 'Git subcommand and args, e.g. "status" or "add -A".' },
    },
    required: ['args'],
  },
  async execute(input, ctx) {
    const args = input.args as string;
    // Block force-push and destructive operations
    if (/push\s+.*--force|reset\s+--hard|clean\s+-fd/.test(args)) {
      throw new Error('Destructive git operations require human approval.');
    }
    try {
      return execFileSync('git', splitArgs(args), {
        cwd: ctx.repoRoot,
        encoding: 'utf-8',
        timeout: 30_000,
      });
    } catch (err) {
      const execErr = err as { stdout?: string; stderr?: string };
      return `GIT:\n${execErr.stdout || ''}\n${execErr.stderr || ''}`;
    }
  },
};

// ---------------------------------------------------------------------------
// Tool bundles per phase
// ---------------------------------------------------------------------------

/** Common tools available to all agents. */
export const commonTools: AgentTool[] = [
  readFileTool,
  writeFileTool,
  writeJsonTool,
  listDirTool,
  grepTool,
  runCommandTool,
];

/** Phase A: Intake + Preprocessing. */
export const phaseATools: AgentTool[] = [
  ...commonTools,
  refineArtifactTool,
  compareFixtureTool,
];

/**
 * Phase B: Evidence Refinement.
 * Uses targeted lookup tools to avoid loading full AX trees (avg 75K tokens)
 * and step-snapshots (8M tokens) into the context.
 */
export const phaseBTools: AgentTool[] = [
  ...commonTools,
  readAnnouncementsTool,
  lookupAxNodesTool,
  lookupStepSnapshotsTool,
  lookupHtmlSectionTool,
  compareFixtureTool,
  editFileTool,
];

/**
 * Phase C: Fixture Judge.
 * Targeted lookups let it verify specific mismatches without full file loads.
 */
export const phaseCTools: AgentTool[] = [
  ...commonTools,
  readAnnouncementsTool,
  lookupAxNodesTool,
  lookupHtmlSectionTool,
  compareFixtureTool,
];

/** Phase D: Engine Refinement. */
export const phaseDTools: AgentTool[] = [
  ...commonTools,
  editFileTool,
  runTestsTool,
  compareFixtureTool,
  buildExtensionRuntimeTool,
];

/** Phase E: Promotion. */
export const phaseETools: AgentTool[] = [
  ...commonTools,
  editFileTool,
  runTestsTool,
  gitTool,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolvePath(p: string, ctx: AgentContext): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(ctx.repoRoot, p);
}

function splitArgs(args: string): string[] {
  return args.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((arg) =>
    arg.startsWith('"') && arg.endsWith('"') ? arg.slice(1, -1) : arg,
  ) ?? [];
}
