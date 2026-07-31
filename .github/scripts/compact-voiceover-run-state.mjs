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
    "  --stale-after-minutes <n>   Flag unfinished handoffs older than this (default: 60).",
    "  --require-terminal          Fail --check when any target lacks terminal Phase E accounting.",
    "  --check                    Print JSON without writing and fail on budget warnings.",
    "  --help                     Show this help.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    runId: "",
    runDir: "",
    maxReceiptBytes: 4096,
    staleAfterMinutes: 60,
    requireTerminal: false,
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
    if (arg === "--require-terminal") {
      options.requireTerminal = true;
      continue;
    }
    const [name, inlineValue] = arg.split("=", 2);
    if (["--run-id", "--run-dir", "--max-receipt-bytes", "--stale-after-minutes"].includes(name)) {
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
        if (name === "--max-receipt-bytes") {
          options.maxReceiptBytes = Number(value);
        } else {
          options.staleAfterMinutes = Number(value);
        }
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
  if (!Number.isFinite(options.staleAfterMinutes) || options.staleAfterMinutes < 1) {
    throw new Error("--stale-after-minutes must be at least 1.");
  }
  return options;
}

function isEvidenceSidecar(filePath, receipt) {
  const baseName = path.basename(filePath);
  const parentName = path.basename(path.dirname(filePath));
  return (
    parentName === "_summaries" ||
    parentName === "_evidence" ||
    /evidence-packet|family-coverage|family-queue|artifact-metadata|file-hashes/.test(baseName) ||
    receipt?.sidecar === true
  );
}

function parseAgentRouting(repoDirectory) {
  const agentsDir = path.join(repoDirectory, ".codex/agents");
  if (!existsSync(agentsDir)) return {};
  return Object.fromEntries(
    readdirSync(agentsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".toml"))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((entry) => {
        const source = readFileSync(path.join(agentsDir, entry.name), "utf8");
        const field = (name) =>
          source.match(new RegExp(`^${name}\\s*=\\s*"([^"]+)"`, "m"))?.[1] || "";
        return [
          entry.name.replace(/\.toml$/, ""),
          {
            configPath: `.codex/agents/${entry.name}`,
            model: field("model"),
            reasoningEffort: field("model_reasoning_effort"),
          },
        ];
      }),
  );
}

function terminalReceipt(receipt) {
  return (
    receipt?.phase === "E" &&
    ["passed", "skipped"].includes(receipt.status) &&
    (receipt.nextPhase === "complete" || receipt.handoffTo === "complete") &&
    (!receipt.nextRecommendedWorker || receipt.nextRecommendedWorker.type === "none")
  );
}

function triageRecommendation(row) {
  const final = row.finalAfterPhaseD || row.postRepairCompare || row.preRepairCompare || {};
  const windows = final.mismatchWindowCount;
  if (row.scanStatus && row.scanStatus !== "complete") return "archive-partial";
  if (windows === 0) return "golden-exact-candidate";
  if (Number.isInteger(windows) && windows <= 15) return "future-golden-candidate";
  if ((row.sharedShellFamilies || []).length > 0) return "focused-family-evidence";
  return "park-candidate";
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

function targetDirectories(runDir, expectedTargets = []) {
  if (expectedTargets.length > 0) {
    return expectedTargets.map((target) => path.join(runDir, target));
  }
  return readdirSync(runDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => path.join(runDir, entry.name))
    .sort();
}

function declaredTargetNames(summariesDir, invalidJson) {
  const phaseEPath = path.join(summariesDir, "06-promotion.json");
  if (!existsSync(phaseEPath)) return [];
  const phaseE = readJson(phaseEPath, invalidJson);
  return Array.from(
    new Set(
      (phaseE?.decisionLedger || [])
        .map((entry) => entry?.target)
        .filter((target) => typeof target === "string" && target.trim()),
    ),
  ).sort();
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

function buildState(runDir, maxReceiptBytes, options = {}) {
  const invalidJson = [];
  const sessionIds = new Set();
  const sessionsByRole = new Map();
  const phaseTargets = new Map();
  const oversizedReceipts = [];
  const oversizedSidecars = [];
  const targets = [];
  let receiptCount = 0;
  let receiptBytes = 0;
  let ordinaryReceiptCount = 0;
  let ordinaryReceiptBytes = 0;
  let sidecarCount = 0;
  let sidecarBytes = 0;

  const summariesDir = path.join(runDir, "_summaries");
  const expectedTargets = declaredTargetNames(summariesDir, invalidJson);
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
    if (isEvidenceSidecar(filePath, receipt)) {
      sidecarCount += 1;
      sidecarBytes += stats.size;
      if (stats.size > maxReceiptBytes) {
        oversizedSidecars.push({ path: relativePath, bytes: stats.size });
      }
    } else {
      ordinaryReceiptCount += 1;
      ordinaryReceiptBytes += stats.size;
      if (stats.size > maxReceiptBytes) {
        oversizedReceipts.push({ path: relativePath, bytes: stats.size });
      }
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

  for (const targetDir of targetDirectories(runDir, expectedTargets)) {
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
      if (isEvidenceSidecar(filePath, receipt)) {
        sidecarCount += 1;
        sidecarBytes += stats.size;
        if (stats.size > maxReceiptBytes) {
          oversizedSidecars.push({ path: relativePath, bytes: stats.size });
        }
      } else {
        ordinaryReceiptCount += 1;
        ordinaryReceiptBytes += stats.size;
        if (stats.size > maxReceiptBytes) {
          oversizedReceipts.push({ path: relativePath, bytes: stats.size });
        }
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
          promotionDecision: receipt.promotionDecision || "",
          exactMatch: receipt.exactMatch ?? null,
          terminal: terminalReceipt(receipt),
          mtimeMs: stats.mtimeMs,
        });
      }
    }

    const receipts = [...receiptsByPhase.values()].sort(
      (left, right) => left.mtimeMs - right.mtimeMs,
    );
    const latest = receipts.at(-1) || null;
    const handoffAgeMinutes = latest
      ? Math.max(0, (Date.now() - latest.mtimeMs) / 60000)
      : null;
    const stalled = Boolean(
      latest &&
      !latest.terminal &&
      latest.nextWorker?.type !== "none" &&
      handoffAgeMinutes >= (options.staleAfterMinutes || 60),
    );
    targets.push({
      target,
      latestPhase: latest?.phase || "",
      status: latest?.status || "missing-receipts",
      nextPhase: latest?.nextPhase || "",
      nextWorker: latest?.nextWorker || { type: "unknown" },
      terminal: Boolean(latest?.terminal),
      promotionDecision: latest?.promotionDecision || "",
      handoffAgeMinutes: handoffAgeMinutes === null ? null : Math.round(handoffAgeMinutes),
      stalled,
      receipts: receipts.map(({ mtimeMs: _mtimeMs, ...receipt }) => receipt),
    });
  }

  const summaryRefs = jsonFiles(summariesDir)
    .filter((filePath) => path.basename(filePath) !== "orchestrator-state.json")
    .map((filePath) => path.relative(repoRoot, filePath));
  const targetCount = targets.length;
  const discoveredDirectoryNames = readdirSync(runDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
  const targetNameSet = new Set(targets.map((target) => target.target));
  const supportDirectories = discoveredDirectoryNames.filter(
    (name) => !targetNameSet.has(name),
  );
  const ceiling = softSessionCeiling(targetCount);
  const sessionCount = sessionIds.size;
  const terminalTargets = targets.filter((target) => target.terminal);
  const missingTerminalTargets = targets
    .filter((target) => !target.terminal)
    .map((target) => target.target);
  const stalledTargets = targets
    .filter((target) => target.stalled)
    .map((target) => ({
      target: target.target,
      latestPhase: target.latestPhase,
      nextWorker: target.nextWorker,
      handoffAgeMinutes: target.handoffAgeMinutes,
    }));
  const phase05Path = path.join(summariesDir, "phase05-compact-compare.json");
  const phase05 = existsSync(phase05Path)
    ? readJson(phase05Path, invalidJson)
    : null;
  const curationTriage = (phase05?.rows || []).map((row) => ({
    target: row.target,
    recommendation: triageRecommendation(row),
    mismatchWindowCount:
      row.finalAfterPhaseD?.mismatchWindowCount ??
      row.postRepairCompare?.mismatchWindowCount ??
      row.preRepairCompare?.mismatchWindowCount ??
      null,
    sharedFamilies: row.sharedShellFamilies || [],
  }));
  const triagedTargets = new Set(curationTriage.map((entry) => entry.target));
  const phaseESummaryPath = path.join(summariesDir, "06-promotion.json");
  const phaseESummary = existsSync(phaseESummaryPath)
    ? readJson(phaseESummaryPath, invalidJson)
    : null;
  for (const decision of phaseESummary?.decisionLedger || []) {
    if (!decision?.target || triagedTargets.has(decision.target)) continue;
    curationTriage.push({
      target: decision.target,
      recommendation:
        decision.promotionDecision === "partial"
          ? "archive-partial"
          : "park-candidate",
      mismatchWindowCount: null,
      sharedFamilies: [],
    });
  }
  curationTriage.sort((left, right) => left.target.localeCompare(right.target));

  return {
    schemaVersion: 1,
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    runDir: path.relative(repoRoot, runDir),
    targetCount,
    declaredTargetInventory: expectedTargets.length > 0 ? "phase-e-decision-ledger" : "directory-fallback",
    supportDirectories,
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
      routing: parseAgentRouting(repoRoot),
    },
    receipts: {
      count: receiptCount,
      totalBytes: receiptBytes,
      targetBytesPerOrdinaryReceipt: maxReceiptBytes,
      oversizedCount: oversizedReceipts.length,
      oversized: oversizedReceipts,
      ordinaryCount: ordinaryReceiptCount,
      ordinaryBytes: ordinaryReceiptBytes,
      sidecarCount,
      sidecarBytes,
      oversizedSidecarCount: oversizedSidecars.length,
      oversizedSidecars,
      sidecarGuidance:
        "Large evidence belongs in hashed sidecars; ordinary routing receipts remain subject to the size budget.",
      invalidJson,
    },
    watchdog: {
      staleAfterMinutes: options.staleAfterMinutes || 60,
      terminalTargetCount: terminalTargets.length,
      missingTerminalTargets,
      stalledTargets,
      status:
        missingTerminalTargets.length === 0 && stalledTargets.length === 0
          ? "complete"
          : stalledTargets.length > 0
            ? "stalled-handoffs"
            : "incomplete",
    },
    curationTriage,
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

  const state = buildState(runDir, options.maxReceiptBytes, options);
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
      state.receipts.invalidJson.length > 0 ||
      state.watchdog.stalledTargets.length > 0 ||
      (options.requireTerminal && state.watchdog.missingTerminalTargets.length > 0))
  ) {
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error.message);
  console.error("");
  console.error(usage());
  process.exit(1);
}
