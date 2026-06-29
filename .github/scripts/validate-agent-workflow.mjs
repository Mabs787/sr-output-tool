#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROLE_BY_PHASE = new Map([
  ["A", "intake"],
  ["B", "evidence-refiner"],
  ["C", "fixture-judge"],
  ["C.5", "repro-scanner"],
  ["D", "engine-refiner"],
  ["E", "promoter"],
]);

const RECEIPT_BY_PHASE = new Map([
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

function usage() {
  return [
    "Usage: node .github/scripts/validate-agent-workflow.mjs <receipt-dir> [options]",
    "",
    "Options:",
    "  --required-phases A,B,C,C.5,D,E   Phases that must have receipts.",
    "  --allow-missing-preflight          Validate legacy receipts without 00-agent-preflight.json.",
    "  --allow-degraded                   Permit explicit degraded/manual runs.",
    "",
    "Example:",
    "  yarn voiceover:validate-agent-workflow voiceover-smoke/agent-work/local/www-sky-com-protect --required-phases B,C,C.5,E",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    receiptDir: "",
    requiredPhases: [],
    allowMissingPreflight: false,
    allowDegraded: false,
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
  const preflightPath = path.join(receiptDir, "00-agent-preflight.json");
  if (!existsSync(preflightPath)) {
    if (options.allowMissingPreflight) {
      warnings.push(`${preflightPath}: missing preflight allowed by flag`);
      return;
    }
    errors.push(`${preflightPath}: missing agent registry preflight`);
    return;
  }

  const preflight = readJson(preflightPath, errors);
  if (!preflight) {
    return;
  }

  const requiredRoles = asArray(preflight.requiredRoles);
  const missingRoles = asArray(preflight.missingRolesAfterDiscovery);
  const spawnedAgents = asArray(preflight.spawnedAgents);
  const expectedRoles = expectedRolesForValidation(receiptDir, options);

  if (preflight.schemaVersion !== 1) {
    errors.push(`${preflightPath}: schemaVersion must be 1`);
  }
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

  for (const role of new Set([...requiredRoles, ...expectedRoles])) {
    const agent = spawnedByRole.get(role);
    if (!agent) {
      errors.push(`${preflightPath}: required role was not spawned: ${role}`);
      continue;
    }
    if (typeof agent.sessionId !== "string" || agent.sessionId.trim() === "") {
      errors.push(`${preflightPath}: spawned role ${role} is missing sessionId`);
    }
  }
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

  validatePreflight(receiptDir, options, errors, warnings);
  validateReceipts(receiptDir, options, errors);

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
