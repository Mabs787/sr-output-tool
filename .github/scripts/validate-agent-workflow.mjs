#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROLE_BY_PHASE = new Map([
  ["0", "scan-health"],
  ["A", "intake"],
  ["B", "evidence-refiner"],
  ["C", "fixture-judge"],
  ["C.5", "repro-scanner"],
  ["D", "engine-refiner"],
  ["E", "promoter"],
]);

const RECEIPT_BY_PHASE = new Map([
  ["0", ["00-scan-health.json"]],
  ["A", ["01-intake.json", "02-preprocess.json"]],
  ["B", ["03-evidence-refinement.json"]],
  ["C", ["04-fixture-judge.json"]],
  ["C.5", ["04-minimal-reproduction-scan.json"]],
  ["D", ["05-engine-refinement.json"]],
  ["E", ["06-promotion.json"]],
]);

const REQUIRED_COMMON_FIELDS = [
  "schemaVersion",
  "phase",
  "agent",
  "agentConfigPath",
  "spawnedBy",
  "sessionId",
  "target",
  "runId",
  "status",
  "inputs",
  "decisions",
  "evidence",
  "fixtureChanges",
  "nextPhase",
  "handoffReason",
  "handoffFrom",
  "handoffTo",
];

const PHASE_B_OCR_GLYPH_SWEEP_CHECK = "phase-b-ocr-glyph-sweep";

function usage() {
  return [
    "Usage: node .github/scripts/validate-agent-workflow.mjs <receipt-dir> [options]",
    "",
    "Options:",
    "  --required-phases 0,A,B,C,C.5,D,E Phases that must have receipts.",
    "  --phase-05-summary <path>          Validate the run-level Phase 0.5 compact summary.",
    "  --allow-missing-preflight          Validate legacy receipts without 00-agent-preflight.json.",
    "  --allow-degraded                   Permit explicit degraded/manual runs.",
    "",
    "Example:",
    "  yarn voiceover:validate-agent-workflow voiceover-smoke/agent-work/local/www-sky-com-protect --required-phases 0,B,C,C.5,E",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    receiptDir: "",
    requiredPhases: [],
    allowMissingPreflight: false,
    allowDegraded: false,
    phase05Summary: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--allow-missing-preflight") {
      options.allowMissingPreflight = true;
      continue;
    }
    if (arg === "--allow-degraded") {
      options.allowDegraded = true;
      continue;
    }
    if (arg === "--phase-05-summary") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--phase-05-summary requires a JSON path");
      }
      options.phase05Summary = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--phase-05-summary=")) {
      options.phase05Summary = arg.slice("--phase-05-summary=".length);
      continue;
    }
    if (arg === "--required-phases") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--required-phases requires a comma-separated value");
      }
      options.requiredPhases = parsePhaseList(value);
      index += 1;
      continue;
    }
    if (arg.startsWith("--required-phases=")) {
      options.requiredPhases = parsePhaseList(arg.slice("--required-phases=".length));
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    if (options.receiptDir) {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
    options.receiptDir = arg;
  }

  if (!options.receiptDir) {
    throw new Error("Missing receipt directory");
  }

  for (const phase of options.requiredPhases) {
    if (!ROLE_BY_PHASE.has(phase)) {
      throw new Error(`Unknown required phase: ${phase}`);
    }
  }

  return options;
}

function parsePhaseList(value) {
  return value
    .split(",")
    .map((phase) => phase.trim())
    .filter(Boolean);
}

function readJson(filePath, errors) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`${filePath}: invalid JSON (${error.message})`);
    return null;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function requireNonEmptyString(receipt, field, filePath, errors) {
  if (typeof receipt[field] !== "string" || receipt[field].trim() === "") {
    errors.push(`${filePath}: missing non-empty ${field}`);
  }
}

function validatePreflight(receiptDir, options, errors, warnings) {
  const preflightPath = resolvePreflightPath(receiptDir, errors);
  if (!existsSync(preflightPath)) {
    if (options.allowMissingPreflight) {
      warnings.push(`${preflightPath}: missing preflight allowed by flag`);
      return null;
    }
    errors.push(`${preflightPath}: missing agent registry preflight`);
    return null;
  }

  const preflight = readJson(preflightPath, errors);
  if (!preflight) {
    return null;
  }

  const requiredRoles = asArray(preflight.requiredRoles);
  const missingRoles = asArray(preflight.missingRolesAfterDiscovery);
  const spawnedAgents = asArray(preflight.spawnedAgents);
  const expectedRoles = expectedRolesForValidation(receiptDir, options);

  if (preflight.schemaVersion !== 1) {
    errors.push(`${preflightPath}: schemaVersion must be 1`);
  }
  validatePreflightContract(preflight, preflightPath, errors);
  if (preflight.phase !== "preflight") {
    errors.push(`${preflightPath}: phase must be "preflight"`);
  }
  if (!["ready", "blocked", "degraded"].includes(preflight.decision)) {
    errors.push(`${preflightPath}: decision must be ready, blocked, or degraded`);
  }
  if (preflight.decision !== "ready" && !options.allowDegraded) {
    errors.push(`${preflightPath}: decision=${preflight.decision}; rerun with named agents or explicitly allow degraded mode`);
  }
  if (missingRoles.length > 0 && !options.allowDegraded) {
    errors.push(`${preflightPath}: missing roles after discovery: ${missingRoles.join(", ")}`);
  }
  if (requiredRoles.length === 0) {
    errors.push(`${preflightPath}: requiredRoles must list the roles needed for the run`);
  }
  for (const role of expectedRoles) {
    if (!requiredRoles.includes(role)) {
      errors.push(`${preflightPath}: requiredRoles must include ${role} for the requested phases`);
    }
  }

  const spawnedByRole = new Map();
  for (const agent of spawnedAgents) {
    if (agent && typeof agent === "object" && typeof agent.agentType === "string") {
      spawnedByRole.set(agent.agentType, agent);
    }
  }

  for (const role of expectedRoles) {
    const agent = spawnedByRole.get(role);
    if (!agent) {
      errors.push(`${preflightPath}: required role was not spawned: ${role}`);
      continue;
    }
    if (typeof agent.sessionId !== "string" || agent.sessionId.trim() === "") {
      errors.push(`${preflightPath}: spawned role ${role} is missing sessionId`);
    }
  }

  return { preflight, preflightPath };
}

function validatePreflightContract(preflight, preflightPath, errors) {
  if (!("contractVersion" in preflight)) {
    return;
  }
  if (preflight.contractVersion !== 2) {
    errors.push(`${preflightPath}: contractVersion must be 2 when present`);
    return;
  }

  const requiredRunChecks = asArray(preflight.requiredRunChecks);
  if (!requiredRunChecks.includes(PHASE_B_OCR_GLYPH_SWEEP_CHECK)) {
    errors.push(`${preflightPath}: contractVersion 2 requires requiredRunChecks to include ${PHASE_B_OCR_GLYPH_SWEEP_CHECK}`);
  }
}

function resolvePreflightPath(receiptDir, errors) {
  const targetPreflightPath = path.join(receiptDir, "00-agent-preflight.json");
  if (existsSync(targetPreflightPath)) {
    return targetPreflightPath;
  }

  const referencedPreflightPath = preflightPathFromReceiptReference(receiptDir, errors);
  if (referencedPreflightPath) {
    return referencedPreflightPath;
  }

  return path.join(path.dirname(receiptDir), "_summaries", "00-agent-preflight.json");
}

function validatePhase05Summary(summaryPath, errors) {
  if (!summaryPath) {
    return;
  }
  const resolvedPath = path.resolve(summaryPath);
  if (!existsSync(resolvedPath)) {
    errors.push(`${resolvedPath}: missing Phase 0.5 compact summary`);
    return;
  }
  const receipt = readJson(resolvedPath, errors);
  if (!receipt) {
    return;
  }
  if (receipt.schemaVersion !== 1) {
    errors.push(`${resolvedPath}: schemaVersion must be 1`);
  }
  if (receipt.phase !== "0.5") {
    errors.push(`${resolvedPath}: phase must be 0.5`);
  }
  if (receipt.agent !== "compare-summarizer") {
    errors.push(`${resolvedPath}: agent must be compare-summarizer`);
  }
  if (receipt.agentConfigPath !== ".codex/agents/compare-summarizer.toml") {
    errors.push(`${resolvedPath}: agentConfigPath must be .codex/agents/compare-summarizer.toml`);
  }
  requireNonEmptyString(receipt, "sessionId", resolvedPath, errors);
  requireNonEmptyString(receipt, "runId", resolvedPath, errors);
  if (!receipt.totals || typeof receipt.totals !== "object") {
    errors.push(`${resolvedPath}: totals must be an object`);
  }
  if (!Array.isArray(receipt.rows) || receipt.rows.length === 0) {
    errors.push(`${resolvedPath}: rows must be a non-empty array`);
  }
  if (!Array.isArray(receipt.recurringFamilies)) {
    errors.push(`${resolvedPath}: recurringFamilies must be an array`);
  }
}

function validateRequiredRunChecks(preflightContext, receiptDir, errors) {
  if (!preflightContext) {
    return;
  }

  const requiredRunChecks = asArray(preflightContext.preflight.requiredRunChecks);
  if (!requiredRunChecks.includes(PHASE_B_OCR_GLYPH_SWEEP_CHECK)) {
    return;
  }

  validatePhaseBOcrGlyphSweep(preflightContext.preflightPath, receiptDir, errors);
}

function validatePhaseBOcrGlyphSweep(preflightPath, receiptDir, errors) {
  const summaryPath = path.join(path.dirname(preflightPath), "phase-b-ocr-glyph-sweep.json");
  if (!existsSync(summaryPath)) {
    errors.push(`${summaryPath}: missing required ${PHASE_B_OCR_GLYPH_SWEEP_CHECK} run summary`);
    return;
  }

  const receipt = readJson(summaryPath, errors);
  if (!receipt) {
    return;
  }

  if (receipt.schemaVersion !== 1) {
    errors.push(`${summaryPath}: schemaVersion must be 1`);
  }
  if (receipt.phase !== "B-ocr-glyph-sweep") {
    errors.push(`${summaryPath}: phase must be B-ocr-glyph-sweep`);
  }
  if (receipt.agent !== "evidence-refiner") {
    errors.push(`${summaryPath}: agent must be evidence-refiner`);
  }
  if (receipt.agentConfigPath !== ".codex/agents/evidence-refiner.toml") {
    errors.push(`${summaryPath}: agentConfigPath must be .codex/agents/evidence-refiner.toml`);
  }
  requireNonEmptyString(receipt, "sessionId", summaryPath, errors);
  requireNonEmptyString(receipt, "runId", summaryPath, errors);
  if (receipt.status !== "passed") {
    errors.push(`${summaryPath}: status must be passed`);
  }
  if (receipt.rawExpectedAnnouncementsPreserved !== true) {
    errors.push(`${summaryPath}: rawExpectedAnnouncementsPreserved must be true`);
  }
  if (receipt.unreviewedCandidateCount !== 0) {
    errors.push(`${summaryPath}: unreviewedCandidateCount must be 0`);
  }
  if (receipt.remainingSuspiciousLiteralCandidateCount !== 0) {
    errors.push(`${summaryPath}: remainingSuspiciousLiteralCandidateCount must be 0`);
  }

  const target = targetNameForValidation(receiptDir, errors);
  const rows = asArray(receipt.rows);
  if (rows.length === 0) {
    errors.push(`${summaryPath}: rows must be a non-empty array`);
    return;
  }

  const targetRow = rows.find((row) => row && typeof row === "object" && row.target === target);
  if (!targetRow) {
    errors.push(`${summaryPath}: rows must include target ${target}`);
    return;
  }

  if (runCheckRowScanStatus(targetRow) !== "complete") {
    errors.push(`${summaryPath}: target ${target} scan status must be complete`);
  }
}

function targetNameForValidation(receiptDir, errors) {
  if (existsSync(receiptDir)) {
    for (const fileName of readdirSync(receiptDir)) {
      if (!fileName.endsWith(".json")) {
        continue;
      }
      const receipt = readJson(path.join(receiptDir, fileName), errors);
      if (receipt && typeof receipt.target === "string" && receipt.target.trim() !== "") {
        return receipt.target;
      }
    }
  }

  return path.basename(receiptDir);
}

function runCheckRowScanStatus(row) {
  if (typeof row.scanStatus === "string") {
    return row.scanStatus;
  }
  if (row.scan && typeof row.scan === "object" && typeof row.scan.status === "string") {
    return row.scan.status;
  }
  return "";
}

function preflightPathFromReceiptReference(receiptDir, errors) {
  if (!existsSync(receiptDir)) {
    return "";
  }

  for (const fileName of readdirSync(receiptDir)) {
    if (!fileName.endsWith(".json")) {
      continue;
    }
    const filePath = path.join(receiptDir, fileName);
    const receipt = readJson(filePath, errors);
    if (!receipt) {
      continue;
    }
    const ref = receipt.agentPreflightRef ?? receipt.sharedPreflightRef;
    if (typeof ref === "string" && ref.trim() !== "") {
      return path.resolve(receiptDir, ref);
    }
  }

  return "";
}

function expectedRolesForValidation(receiptDir, options) {
  const phases = options.requiredPhases.length > 0
    ? options.requiredPhases
    : Array.from(receiptPhasesPresent(receiptDir));
  return Array.from(new Set(phases.map((phase) => ROLE_BY_PHASE.get(phase)).filter(Boolean)));
}

function validateReceipt(filePath, expectedPhase, expectedRole, options, errors) {
  const receipt = readJson(filePath, errors);
  if (!receipt) {
    return;
  }

  for (const field of REQUIRED_COMMON_FIELDS) {
    if (!(field in receipt)) {
      errors.push(`${filePath}: missing common field ${field}`);
    }
  }

  if (receipt.schemaVersion !== 1) {
    errors.push(`${filePath}: schemaVersion must be 1`);
  }
  if (receipt.phase !== expectedPhase) {
    errors.push(`${filePath}: phase must be ${expectedPhase}, got ${receipt.phase}`);
  }
  if (receipt.agent !== expectedRole) {
    errors.push(`${filePath}: agent must be ${expectedRole}, got ${receipt.agent}`);
  }
  if (receipt.agent === "default") {
    errors.push(`${filePath}: default agent cannot satisfy a named workflow phase`);
  }
  if (receipt.agentConfigPath !== `.codex/agents/${expectedRole}.toml`) {
    errors.push(`${filePath}: agentConfigPath must be .codex/agents/${expectedRole}.toml`);
  }
  if (receipt.spawnedBy === "manual" && !options.allowDegraded) {
    errors.push(`${filePath}: spawnedBy=manual is not proof of a multi-agent run`);
  }
  if (!["top-level-codex", "orchestrator"].includes(receipt.spawnedBy) && !options.allowDegraded) {
    errors.push(`${filePath}: spawnedBy must be top-level-codex or orchestrator`);
  }
  requireNonEmptyString(receipt, "sessionId", filePath, errors);
  if (!Array.isArray(receipt.fixtureChanges)) {
    errors.push(`${filePath}: fixtureChanges must be an array`);
  }
}

function receiptPhasesPresent(receiptDir) {
  const present = new Set();
  const names = new Set(readdirSync(receiptDir));
  for (const [phase, files] of RECEIPT_BY_PHASE.entries()) {
    if (files.some((fileName) => names.has(fileName))) {
      present.add(phase);
    }
  }
  return present;
}

function validateReceipts(receiptDir, options, errors) {
  const phases = options.requiredPhases.length > 0
    ? options.requiredPhases
    : Array.from(receiptPhasesPresent(receiptDir));

  if (phases.length === 0) {
    errors.push(`${receiptDir}: no workflow phase receipts found`);
    return;
  }

  for (const phase of phases) {
    const expectedRole = ROLE_BY_PHASE.get(phase);
    const files = RECEIPT_BY_PHASE.get(phase) ?? [];
    for (const fileName of files) {
      const filePath = path.join(receiptDir, fileName);
      if (!existsSync(filePath)) {
        errors.push(`${filePath}: missing required receipt for Phase ${phase}`);
        continue;
      }
      validateReceipt(filePath, phase, expectedRole, options, errors);
    }
  }
}

function main() {
  const errors = [];
  const warnings = [];
  let options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error("");
    console.error(usage());
    process.exit(2);
  }

  const receiptDir = path.resolve(options.receiptDir);
  if (!existsSync(receiptDir)) {
    console.error(`Receipt directory does not exist: ${receiptDir}`);
    process.exit(2);
  }

  const preflightContext = validatePreflight(receiptDir, options, errors, warnings);
  validateReceipts(receiptDir, options, errors);
  validatePhase05Summary(options.phase05Summary, errors);
  validateRequiredRunChecks(preflightContext, receiptDir, errors);

  for (const warning of warnings) {
    console.warn(`warning: ${warning}`);
  }

  if (errors.length > 0) {
    console.error(`Agent workflow validation failed for ${receiptDir}`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Agent workflow validation passed for ${receiptDir}`);
}

main();
