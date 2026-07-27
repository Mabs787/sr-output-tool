#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

function usage() {
  return [
    "Usage: yarn voiceover:compact-state (--run-id <id> | --run-dir <path>) [options]",
    "",
    "Options:",
    "  --run-id <id>              Read voiceover-smoke/agent-work/<id>.",
    "  --run-dir <path>           Read an explicit agent-work run directory.",
    "  --max-receipt-bytes <n>    Ordinary receipt size target (default: 4096).",
    "  --check                    Print JSON without writing and fail on budget warnings.",
    "  --help                     Show this help.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    runId: "",
    runDir: "",
    maxReceiptBytes: 4096,
    check: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--check") {
      options.check = true;
      continue;
    }
    const [name, inlineValue] = arg.split("=", 2);
    if (["--run-id", "--run-dir", "--max-receipt-bytes"].includes(name)) {
      const value = inlineValue ?? argv[index + 1];
      if (inlineValue === undefined) {
        index += 1;
      }
      if (!value) {
        throw new Error(`Missing value for ${name}`);
      }
      if (name === "--run-id") {
        options.runId = value;
      } else if (name === "--run-dir") {
        options.runDir = value;
      } else {
        options.maxReceiptBytes = Number(value);
      }
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (Boolean(options.runId) === Boolean(options.runDir)) {
    throw new Error("Use exactly one of --run-id or --run-dir.");
  }
  if (!Number.isInteger(options.maxReceiptBytes) || options.maxReceiptBytes < 256) {
    throw new Error("--max-receipt-bytes must be an integer of at least 256.");
  }
  return options;
}

function readJson(filePath, invalidJson) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    invalidJson.push({
      path: path.relative(repoRoot, filePath),
      error: error.message,
    });
    return null;
  }
}

function targetDirectories(runDir) {
  return readdirSync(runDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => path.join(runDir, entry.name))
    .sort();
}

function jsonFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

function addSession(sessionIds, sessionsByRole, sessionId, role) {
  if (!sessionId) {
    return;
  }
  sessionIds.add(sessionId);
  const roleName = role || "unknown";
  if (!sessionsByRole.has(roleName)) {
    sessionsByRole.set(roleName, new Set());
  }
  sessionsByRole.get(roleName).add(sessionId);
}

function collectPreflightSessions(preflight, sessionIds, sessionsByRole) {
  for (const agent of preflight?.spawnedAgents || []) {
    addSession(
      sessionIds,
      sessionsByRole,
      agent.sessionId,
      agent.agentType || agent.phase,
    );
  }
}

function preferredSessionMaximum(targetCount) {
  return Math.max(8, Math.ceil(targetCount * 1.25));
}

function softSessionCeiling(targetCount) {
  return targetCount >= 15 ? 40 : Math.max(8, targetCount * 2);
}

function buildState(runDir, maxReceiptBytes) {
  const invalidJson = [];
  const sessionIds = new Set();
  const sessionsByRole = new Map();
  const phaseTargets = new Map();
  const oversizedReceipts = [];
  const targets = [];
  let receiptCount = 0;
  let receiptBytes = 0;

  const summariesDir = path.join(runDir, "_summaries");
  const sharedPreflightPath = path.join(summariesDir, "00-agent-preflight.json");
  if (existsSync(sharedPreflightPath)) {
    collectPreflightSessions(
      readJson(sharedPreflightPath, invalidJson),
      sessionIds,
      sessionsByRole,
    );
  }

  for (const filePath of jsonFiles(summariesDir)) {
    if (
      filePath === sharedPreflightPath ||
      path.basename(filePath) === "orchestrator-state.json"
    ) {
      continue;
    }
    const receipt = readJson(filePath, invalidJson);
    if (!receipt || receipt.phase === undefined) {
      continue;
    }
    const stats = statSync(filePath);
    const relativePath = path.relative(repoRoot, filePath);
    receiptCount += 1;
    receiptBytes += stats.size;
    if (stats.size > maxReceiptBytes) {
      oversizedReceipts.push({ path: relativePath, bytes: stats.size });
    }
    addSession(sessionIds, sessionsByRole, receipt.sessionId, receipt.agent);

    const phase = String(receipt.phase);
    if (!phaseTargets.has(phase)) {
      phaseTargets.set(phase, new Set());
    }
    const coveredTargets = (receipt.rows || [])
      .map((row) => row.target)
      .filter(Boolean);
    for (const target of coveredTargets.length > 0 ? coveredTargets : ["_run"]) {
      phaseTargets.get(phase).add(target);
    }
  }

  for (const targetDir of targetDirectories(runDir)) {
    const target = path.basename(targetDir);
    const receiptsByPhase = new Map();

    for (const filePath of jsonFiles(targetDir)) {
      const receipt = readJson(filePath, invalidJson);
      if (!receipt) {
        continue;
      }
      if (receipt.phase === "preflight") {
        collectPreflightSessions(receipt, sessionIds, sessionsByRole);
        continue;
      }
      if (receipt.schemaVersion === undefined || receipt.phase === undefined) {
        continue;
      }

      const stats = statSync(filePath);
      const relativePath = path.relative(repoRoot, filePath);
      receiptCount += 1;
      receiptBytes += stats.size;
      if (stats.size > maxReceiptBytes) {
        oversizedReceipts.push({ path: relativePath, bytes: stats.size });
      }
      addSession(
        sessionIds,
        sessionsByRole,
        receipt.sessionId,
        receipt.agent,
      );

      const phase = String(receipt.phase);
      if (!phaseTargets.has(phase)) {
        phaseTargets.set(phase, new Set());
      }
      phaseTargets.get(phase).add(target);

      const previous = receiptsByPhase.get(phase);
      if (!previous || previous.mtimeMs < stats.mtimeMs) {
        receiptsByPhase.set(phase, {
          phase,
          status: receipt.status || "unknown",
          agent: receipt.agent || "unknown",
          receipt: relativePath,
          nextPhase: receipt.nextPhase || receipt.handoffTo || "",
          nextWorker: receipt.nextRecommendedWorker || { type: "unknown" },
          mtimeMs: stats.mtimeMs,
        });
      }
    }

    const receipts = [...receiptsByPhase.values()].sort(
      (left, right) => left.mtimeMs - right.mtimeMs,
    );
    const latest = receipts.at(-1) || null;
    targets.push({
      target,
      latestPhase: latest?.phase || "",
      status: latest?.status || "missing-receipts",
      nextPhase: latest?.nextPhase || "",
      nextWorker: latest?.nextWorker || { type: "unknown" },
      receipts: receipts.map(({ mtimeMs: _mtimeMs, ...receipt }) => receipt),
    });
  }

  const summaryRefs = jsonFiles(summariesDir)
    .filter((filePath) => path.basename(filePath) !== "orchestrator-state.json")
    .map((filePath) => path.relative(repoRoot, filePath));
  const targetCount = targets.length;
  const ceiling = softSessionCeiling(targetCount);
  const sessionCount = sessionIds.size;

  return {
    schemaVersion: 1,
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    runDir: path.relative(repoRoot, runDir),
    targetCount,
    phaseCoverage: Object.fromEntries(
      [...phaseTargets.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([phase, coveredTargets]) => [phase, coveredTargets.size]),
    ),
    agents: {
      uniqueSessionCount: sessionCount,
      preferredMaximum: preferredSessionMaximum(targetCount),
      softCeiling: ceiling,
      status: sessionCount > ceiling ? "over-soft-ceiling" : "within-soft-ceiling",
      byRole: Object.fromEntries(
        [...sessionsByRole.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([role, ids]) => [role, ids.size]),
      ),
    },
    receipts: {
      count: receiptCount,
      totalBytes: receiptBytes,
      targetBytesPerOrdinaryReceipt: maxReceiptBytes,
      oversizedCount: oversizedReceipts.length,
      oversized: oversizedReceipts,
      invalidJson,
    },
    summaryRefs,
    targets,
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const runDir = options.runDir
    ? path.resolve(repoRoot, options.runDir)
    : path.join(repoRoot, "voiceover-smoke/agent-work", options.runId);
  if (!existsSync(runDir)) {
    throw new Error(`Run directory does not exist: ${runDir}`);
  }

  const state = buildState(runDir, options.maxReceiptBytes);
  const output = `${JSON.stringify(state, null, 2)}\n`;
  if (options.check) {
    process.stdout.write(output);
  } else {
    const outputDir = path.join(runDir, "_summaries");
    mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "orchestrator-state.json");
    writeFileSync(outputPath, output);
    console.log(path.relative(repoRoot, outputPath));
  }

  if (
    options.check &&
    (state.agents.status === "over-soft-ceiling" ||
      state.receipts.oversizedCount > 0 ||
      state.receipts.invalidJson.length > 0)
  ) {
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error.message);
  console.error("");
  console.error(usage());
  process.exit(1);
}
