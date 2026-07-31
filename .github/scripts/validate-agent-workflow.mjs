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
const PHASE_05_SHELL_FAMILIES_CHECK = "phase-05-shell-families";
const RECAPTURE_ACCOUNTING_CHECK = "recapture-accounting";
const STABLE_CANDIDATE_REFERENCES_CHECK = "stable-candidate-references";
const STRUCTURAL_EVIDENCE_PACKETS_CHECK = "structural-evidence-packets";
const C5_FIXTURE_PATH_DIAGNOSTICS_CHECK = "c5-fixture-path-diagnostics";
const FINAL_RUN_METRICS_CHECK = "final-run-metrics";

const CONTRACT_V3_REQUIRED_RUN_CHECKS = [
  PHASE_B_OCR_GLYPH_SWEEP_CHECK,
  PHASE_05_SHELL_FAMILIES_CHECK,
  RECAPTURE_ACCOUNTING_CHECK,
  STABLE_CANDIDATE_REFERENCES_CHECK,
  STRUCTURAL_EVIDENCE_PACKETS_CHECK,
  C5_FIXTURE_PATH_DIAGNOSTICS_CHECK,
  FINAL_RUN_METRICS_CHECK,
];

function usage() {
  return [
    "Usage: node .github/scripts/validate-agent-workflow.mjs <receipt-dir> [options]",
    "",
    "Options:",
    "  --required-phases 0,A,B,C,C.5,D,E Phases that must have receipts.",
    "  --phase-05-summary <path>          Validate the run-level Phase 0.5 compact summary.",
    "  --allow-missing-preflight          Validate legacy receipts without 00-agent-preflight.json.",
    "  --allow-degraded                   Permit explicit degraded/manual runs.",
    "  --strict-terminal-outcome          Validate candidate/partial/skip Phase E closure, not only refined promotion.",
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
    strictTerminalOutcome: false,
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
    if (arg === "--strict-terminal-outcome") {
      options.strictTerminalOutcome = true;
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

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
  if (![2, 3].includes(preflight.contractVersion)) {
    errors.push(`${preflightPath}: contractVersion must be 2 or 3 when present`);
    return;
  }

  const requiredRunChecks = asArray(preflight.requiredRunChecks);
  if (preflight.contractVersion === 2 && !requiredRunChecks.includes(PHASE_B_OCR_GLYPH_SWEEP_CHECK)) {
    errors.push(`${preflightPath}: contractVersion 2 requires requiredRunChecks to include ${PHASE_B_OCR_GLYPH_SWEEP_CHECK}`);
  }
  if (preflight.contractVersion === 3) {
    if (!Array.isArray(preflight.requiredRunChecks)) {
      errors.push(`${preflightPath}: contractVersion 3 requires requiredRunChecks to be an array`);
      return;
    }
    for (const check of CONTRACT_V3_REQUIRED_RUN_CHECKS) {
      if (!requiredRunChecks.includes(check)) {
        errors.push(`${preflightPath}: contractVersion 3 requires requiredRunChecks to include ${check}`);
      }
    }
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

function validateRequiredRunChecks(preflightContext, receiptDir, options, errors) {
  if (!preflightContext) {
    return;
  }

  const requiredRunChecks = asArray(preflightContext.preflight.requiredRunChecks);
  if (!requiredRunChecks.includes(PHASE_B_OCR_GLYPH_SWEEP_CHECK)) {
    return;
  }

  validatePhaseBOcrGlyphSweep(preflightContext.preflightPath, receiptDir, errors);
  if (requiredRunChecks.includes(PHASE_05_SHELL_FAMILIES_CHECK)) {
    validatePhase05ShellFingerprintContract(preflightContext.preflightPath, options.phase05Summary, errors);
  }
  if (requiredRunChecks.includes(RECAPTURE_ACCOUNTING_CHECK)) {
    validatePhase0RecaptureAccounting(receiptDir, errors);
  }
  if (requiredRunChecks.includes(STABLE_CANDIDATE_REFERENCES_CHECK)) {
    validatePhaseBStableCandidateRefs(receiptDir, errors);
  }
  if (requiredRunChecks.includes(STRUCTURAL_EVIDENCE_PACKETS_CHECK)) {
    validatePhaseCStructuralEvidencePackets(receiptDir, errors);
  }
  if (requiredRunChecks.includes(C5_FIXTURE_PATH_DIAGNOSTICS_CHECK)) {
    validatePhaseC5FixturePathDiagnostic(receiptDir, errors);
  }
  if (requiredRunChecks.includes(FINAL_RUN_METRICS_CHECK)) {
    validatePhaseERunMetrics(receiptDir, errors);
  }
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

function validatePhase05ShellFingerprintContract(preflightPath, explicitSummaryPath, errors) {
  const summaryPath = path.resolve(explicitSummaryPath || path.join(path.dirname(preflightPath), "phase05-compact-compare.json"));
  if (!existsSync(summaryPath)) {
    errors.push(`${summaryPath}: missing required ${PHASE_05_SHELL_FAMILIES_CHECK} run summary`);
    return;
  }

  const receipt = readJson(summaryPath, errors);
  if (!receipt) {
    return;
  }
  validatePhase05Summary(summaryPath, errors);

  for (const [index, row] of asArray(receipt.rows).entries()) {
    if (!isObject(row)) {
      errors.push(`${summaryPath}: rows[${index}] must be an object`);
      continue;
    }
    if (typeof row.shellFingerprint !== "string" || row.shellFingerprint.trim() === "") {
      errors.push(`${summaryPath}: rows[${index}] must include non-empty shellFingerprint`);
    }
    if (!Array.isArray(row.sharedShellFamilies)) {
      errors.push(`${summaryPath}: rows[${index}] sharedShellFamilies must be an array`);
    }
  }

  for (const [index, family] of asArray(receipt.recurringFamilies).entries()) {
    if (!isObject(family)) {
      errors.push(`${summaryPath}: recurringFamilies[${index}] must be an object`);
      continue;
    }
    if (typeof family.familySignature !== "string" || family.familySignature.trim() === "") {
      errors.push(`${summaryPath}: recurringFamilies[${index}] must include non-empty familySignature`);
    }
  }

  for (const [index, family] of asArray(receipt.sharedShellFamilies).entries()) {
    if (!isObject(family)) {
      errors.push(`${summaryPath}: sharedShellFamilies[${index}] must be an object`);
      continue;
    }
    if (typeof family.shellFingerprint !== "string" || family.shellFingerprint.trim() === "") {
      errors.push(`${summaryPath}: sharedShellFamilies[${index}] must include non-empty shellFingerprint`);
    }
  }
}

function validatePhase0RecaptureAccounting(receiptDir, errors) {
  const receiptPath = path.join(receiptDir, "00-scan-health.json");
  if (!existsSync(receiptPath)) {
    return;
  }

  const receipt = readJson(receiptPath, errors);
  if (!receipt || receipt.status === "passed") {
    return;
  }

  const entry = receipt.recaptureQueueEntry;
  if (!isObject(entry)) {
    errors.push(`${receiptPath}: non-passed Phase 0 requires recaptureQueueEntry`);
    return;
  }
  if (typeof entry.recaptureId !== "string" || entry.recaptureId.trim() === "") {
    errors.push(`${receiptPath}: recaptureQueueEntry requires non-empty recaptureId`);
  }
  if (typeof entry.queuePath !== "string" || entry.queuePath.trim() === "") {
    errors.push(`${receiptPath}: recaptureQueueEntry requires non-empty queuePath`);
    return;
  }

  const queuePath = path.resolve(receiptDir, entry.queuePath);
  if (!existsSync(queuePath)) {
    errors.push(`${queuePath}: missing recapture queue for non-passed Phase 0`);
    return;
  }

  const queue = readJson(queuePath, errors);
  if (!queue) {
    return;
  }
  const queueEntries = recaptureQueueEntries(queue);
  const matchingEntry = queueEntries.find((queueEntry) => {
    return isObject(queueEntry)
      && queueEntry.recaptureId === entry.recaptureId
      && (!("target" in queueEntry) || queueEntry.target === receipt.target);
  });
  if (!matchingEntry) {
    errors.push(`${queuePath}: recapture queue must include recaptureId ${entry.recaptureId} for target ${receipt.target}`);
  }
}

function recaptureQueueEntries(queue) {
  if (Array.isArray(queue)) {
    return queue;
  }
  if (!isObject(queue)) {
    return [];
  }
  for (const field of ["entries", "recaptureQueue", "queue", "targets"]) {
    if (Array.isArray(queue[field])) {
      return queue[field];
    }
  }
  return [];
}

function validatePhaseBStableCandidateRefs(receiptDir, errors) {
  const receiptPath = path.join(receiptDir, "03-evidence-refinement.json");
  if (!existsSync(receiptPath)) {
    return;
  }

  const receipt = readJson(receiptPath, errors);
  if (!receipt) {
    return;
  }

  const candidateEntries = [];
  collectCandidateEntries(receipt.decisions, "decisions", candidateEntries);
  collectCandidateEntries(receipt.evidence, "evidence", candidateEntries);
  for (const [index, change] of asArray(receipt.fixtureChanges).entries()) {
    if (isCandidateFixtureChange(change)) {
      candidateEntries.push({ value: change, location: `fixtureChanges[${index}]` });
    }
  }

  for (const entry of candidateEntries) {
    validateCandidateRef(entry.value?.candidateRef, `${receiptPath}: ${entry.location}`, errors);
  }
}

function collectCandidateEntries(value, location, entries) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectCandidateEntries(item, `${location}[${index}]`, entries));
    return;
  }
  if (!isObject(value)) {
    return;
  }

  if (isCandidateEntry(value)) {
    entries.push({ value, location });
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "candidateRef") {
      continue;
    }
    if (Array.isArray(child) || isObject(child)) {
      collectCandidateEntries(child, `${location}.${key}`, entries);
    }
  }
}

function isCandidateEntry(value) {
  return "candidateRef" in value
    || "candidateId" in value
    || "sourceIndex" in value
    || "currentRefinedIndex" in value
    || "compareWindowId" in value
    || "rawTextSha256" in value
    || "refinedTextSha256" in value;
}

function isCandidateFixtureChange(change) {
  return isObject(change)
    && ["refinedAnnouncements", "expectedAnnouncements"].includes(change.field)
    && change.reason !== "status-only";
}

function validateCandidateRef(candidateRef, location, errors) {
  if (!isObject(candidateRef)) {
    errors.push(`${location}: candidate entry requires stable candidateRef`);
    return;
  }

  for (const field of ["candidateId", "rawTextSha256", "refinedTextSha256", "previousTextSha256", "nextTextSha256", "family", "compareWindowId", "resolution"]) {
    if (typeof candidateRef[field] !== "string" || candidateRef[field].trim() === "") {
      errors.push(`${location}: candidateRef requires non-empty ${field}`);
    }
  }
  for (const field of ["sourceIndex", "currentRefinedIndex"]) {
    if (!Number.isInteger(candidateRef[field])) {
      errors.push(`${location}: candidateRef requires integer ${field}`);
    }
  }
  if (!["matched", "remapped", "stale-reference"].includes(candidateRef.resolution)) {
    errors.push(`${location}: candidateRef resolution must be matched, remapped, or stale-reference`);
  }
  if (candidateRef.resolution === "stale-reference") {
    errors.push(`${location}: stale candidateRef blocks Phase B candidate decisions and fixture changes`);
  }
}

function validatePhaseCStructuralEvidencePackets(receiptDir, errors) {
  const receiptPath = path.join(receiptDir, "04-fixture-judge.json");
  if (!existsSync(receiptPath)) {
    return;
  }

  const receipt = readJson(receiptPath, errors);
  if (!receipt) {
    return;
  }

  const decisions = [];
  collectObjects(receipt.decisions, "decisions", decisions);
  for (const decision of decisions) {
    if (!isEngineReadyStructuralDecision(decision.value)) {
      continue;
    }
    const packet = decision.value.structuralEvidencePacket;
    if (!isObject(packet)) {
      errors.push(`${receiptPath}: ${decision.location} engine-ready structural decision requires structuralEvidencePacket`);
      continue;
    }
    validateStructuralEvidencePacket(packet, `${receiptPath}: ${decision.location}.structuralEvidencePacket`, errors);
  }
}

function validateStructuralEvidencePacket(packet, location, errors) {
  if (packet.completeness !== "complete") {
    errors.push(`${location}: completeness must be complete`);
  }
  validateCandidateRef(packet.candidateRef, `${location}.candidateRef`, errors);
  requireAnyStructuralField(packet, ["compareWindow", "compareWindowId"], location, "compare window", errors);
  requireAnyStructuralField(packet, ["focusedDomNodeId", "focusedDOMNodeId", "focusedNodeId"], location, "focused DOM node id", errors);
  requireAnyStructuralField(packet, ["outerHtmlSha256", "outerHTMLSha256", "outerHtmlHash", "outerHTMLHash"], location, "outerHTML hash", errors);
  requireNonEmptyArrayField(packet, ["semanticAncestorChain", "ancestorChain"], location, "semantic ancestor chain", errors);
  requireAnyStructuralField(packet, ["siblingSummary", "siblings"], location, "sibling summary", errors);
  requireAnyStructuralField(packet, ["matchedAxNode", "matchedAXNode", "axNode"], location, "matched AX node", errors);
  requireAnyStructuralField(packet, ["voiceOverStepRef", "voiceOverStep", "stepRef"], location, "VoiceOver step pointer", errors);
  requireAnyStructuralField(packet, ["voiceOverSourceRef", "voiceOverSource", "sourceRef"], location, "VoiceOver source pointer", errors);
  if (packet.visualStateMatters === true) {
    requireAnyStructuralField(packet, ["screenshotRef", "screenshotReference"], location, "screenshot pointer", errors);
  }
}

function requireAnyStructuralField(packet, fields, location, label, errors) {
  if (fields.some((field) => hasStructuralValue(packet[field]))) {
    return;
  }
  errors.push(`${location}: requires ${label}`);
}

function requireNonEmptyArrayField(packet, fields, location, label, errors) {
  if (fields.some((field) => Array.isArray(packet[field]) && packet[field].length > 0)) {
    return;
  }
  errors.push(`${location}: requires non-empty ${label}`);
}

function hasStructuralValue(value) {
  if (typeof value === "string") {
    return value.trim() !== "";
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (isObject(value)) {
    return Object.keys(value).length > 0;
  }
  return typeof value === "number" && Number.isFinite(value);
}

function collectObjects(value, location, entries) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectObjects(item, `${location}[${index}]`, entries));
    return;
  }
  if (!isObject(value)) {
    return;
  }
  entries.push({ value, location });
  for (const [key, child] of Object.entries(value)) {
    if (Array.isArray(child) || isObject(child)) {
      collectObjects(child, `${location}.${key}`, entries);
    }
  }
}

function isEngineReadyStructuralDecision(decision) {
  if (!isObject(decision) || decision.disposition !== "engine-ready") {
    return false;
  }

  const familyText = [
    decision.family,
    decision.mismatchFamily,
    decision.familyName,
    decision.category,
    decision.type,
  ].filter((value) => typeof value === "string").join(" ").toLowerCase();

  if (familyText.includes("structural") || familyText.includes("decomposition")) {
    return true;
  }
  return ["card", "group", "list item", "table", "wrapper"].some((term) => familyText.includes(term));
}

function validatePhaseC5FixturePathDiagnostic(receiptDir, errors) {
  const receiptPath = path.join(receiptDir, "04-minimal-reproduction-scan.json");
  if (!existsSync(receiptPath)) {
    return;
  }

  const receipt = readJson(receiptPath, errors);
  if (!receipt || ["skipped", "blocked"].includes(receipt.status)) {
    return;
  }

  const diagnostic = receipt.fixturePathDiagnostic;
  if (!isObject(diagnostic)) {
    errors.push(`${receiptPath}: executed Phase C.5 receipt requires fixturePathDiagnostic`);
    return;
  }

  const decision = diagnostic.decision ?? diagnostic.status ?? diagnostic.result;
  if (!(diagnostic.passed === true || decision === "passed" || decision === "pass")) {
    errors.push(`${receiptPath}: fixturePathDiagnostic must pass before executed C.5 evidence is valid`);
  }
  if (typeof diagnostic.fixturePath !== "string" || diagnostic.fixturePath.trim() === "") {
    errors.push(`${receiptPath}: fixturePathDiagnostic requires non-empty fixturePath`);
  }
  if (typeof diagnostic.resolvedPath !== "string" || diagnostic.resolvedPath.trim() === "") {
    errors.push(`${receiptPath}: fixturePathDiagnostic requires non-empty resolvedPath`);
  }
  if (typeof (diagnostic.sha256 ?? diagnostic.fileSha256) !== "string" || (diagnostic.sha256 ?? diagnostic.fileSha256).trim() === "") {
    errors.push(`${receiptPath}: fixturePathDiagnostic requires non-empty SHA-256`);
  }
  if (typeof (diagnostic.identityMarker ?? diagnostic.expectedIdentityText) !== "string" || (diagnostic.identityMarker ?? diagnostic.expectedIdentityText).trim() === "") {
    errors.push(`${receiptPath}: fixturePathDiagnostic requires non-empty identity marker`);
  }
  if (typeof (diagnostic.renderedPath ?? diagnostic.renderedPageUrl ?? diagnostic.renderedUrl) !== "string" || (diagnostic.renderedPath ?? diagnostic.renderedPageUrl ?? diagnostic.renderedUrl).trim() === "") {
    errors.push(`${receiptPath}: fixturePathDiagnostic requires non-empty rendered path`);
  }
  if (!diagnosticHasRenderedHtml(diagnostic)) {
    errors.push(`${receiptPath}: fixturePathDiagnostic requires non-empty rendered HTML evidence`);
  }
  if (!positiveNumber(diagnostic.axNodeCount ?? diagnostic.relevantAxNodeCount)) {
    errors.push(`${receiptPath}: fixturePathDiagnostic requires positive AX node count`);
  }
  if (!positiveNumber(diagnostic.stepSnapshotCount ?? diagnostic.snapshotCount)) {
    errors.push(`${receiptPath}: fixturePathDiagnostic requires positive step snapshot count`);
  }
}

function positiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function diagnosticHasRenderedHtml(diagnostic) {
  if (diagnostic.renderedHtmlNonEmpty === true) {
    return true;
  }
  return positiveNumber(diagnostic.renderedHtmlByteCount ?? diagnostic.renderedHtmlLength);
}

function validatePhaseERunMetrics(receiptDir, errors) {
  const receiptPath = path.join(receiptDir, "06-promotion.json");
  if (!existsSync(receiptPath)) {
    return;
  }

  const receipt = readJson(receiptPath, errors);
  if (!receipt) {
    return;
  }

  const metrics = receipt.runMetrics;
  if (!isObject(metrics)) {
    errors.push(`${receiptPath}: Phase E requires runMetrics`);
    return;
  }

  const requiredMetricGroups = [
    ["reviewedCandidateCount", "reviewedCandidates"],
    ["appliedFixtureRepairCount", "appliedFixtureRepairs"],
    ["rejectedCandidateCount", "rejectedCandidates"],
    ["mismatchWindowsBeforeFixtureRepair", "mismatchWindowsBeforeFixtureWork"],
    ["mismatchWindowsAfterFixtureRepair", "mismatchWindowsAfterFixtureWork"],
    ["mismatchWindowsBeforeEngineWork"],
    ["mismatchWindowsAfterEngineWork"],
    ["exactTotal", "exactCount"],
    ["actionableTotal", "actionableCount"],
    ["conditionalTotal", "conditionalCount"],
    ["parkedTotal", "parkedCount"],
    ["recaptureOnlyTotal", "recaptureOnlyCount", "recaptureTotal"],
  ];

  for (const fields of requiredMetricGroups) {
    if (!fields.some((field) => Number.isInteger(metrics[field]))) {
      errors.push(`${receiptPath}: runMetrics requires integer ${fields.join(" or ")}`);
    }
  }
}

function validatePhaseETerminalOutcome(receiptDir, options, errors) {
  if (!options.strictTerminalOutcome) {
    return;
  }
  const receiptPath = path.join(receiptDir, "06-promotion.json");
  if (!existsSync(receiptPath)) {
    return;
  }
  const receipt = readJson(receiptPath, errors);
  if (!receipt) {
    return;
  }

  const decisions = ["refined", "candidate", "partial", "skip"];
  if (!decisions.includes(receipt.promotionDecision)) {
    errors.push(`${receiptPath}: promotionDecision must be ${decisions.join(", ")}`);
  }
  if (typeof receipt.exactMatch !== "boolean") {
    errors.push(`${receiptPath}: exactMatch must be boolean`);
  }
  if (receipt.promotionDecision === "refined" && receipt.exactMatch !== true) {
    errors.push(`${receiptPath}: refined promotion requires exactMatch=true`);
  }
  if (["candidate", "partial"].includes(receipt.promotionDecision)) {
    const queue = asArray(receipt.revisitQueue);
    if (queue.length === 0) {
      errors.push(`${receiptPath}: ${receipt.promotionDecision} outcome requires a non-empty revisitQueue`);
    }
    queue.forEach((entry, index) => {
      if (!isObject(entry)) {
        errors.push(`${receiptPath}: revisitQueue[${index}] must be an object`);
        return;
      }
      for (const field of ["family", "nextOwner", "nextAction", "blocker"]) {
        if (typeof entry[field] !== "string" || !entry[field].trim()) {
          errors.push(`${receiptPath}: revisitQueue[${index}] requires non-empty ${field}`);
        }
      }
      if (!Array.isArray(entry.checksNeeded) || entry.checksNeeded.length === 0) {
        errors.push(`${receiptPath}: revisitQueue[${index}] requires checksNeeded`);
      }
    });
  }
  const checks = asArray(receipt.checks);
  if (checks.some((check) => !check?.status || check.status === "pending")) {
    errors.push(`${receiptPath}: terminal Phase E checks must not be pending`);
  }
  if (receipt.fixturePushReview?.rawOutputEdited === true) {
    errors.push(`${receiptPath}: terminal outcome cannot report hand-edited raw VoiceOver output`);
  }
  if (receipt.nextPhase !== "complete" || receipt.handoffTo !== "complete") {
    errors.push(`${receiptPath}: terminal Phase E outcome must hand off to complete`);
  }
  if (receipt.nextRecommendedWorker?.type !== "none") {
    errors.push(`${receiptPath}: terminal Phase E outcome requires nextRecommendedWorker.type=none`);
  }
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
  validateRequiredRunChecks(preflightContext, receiptDir, options, errors);
  validatePhaseETerminalOutcome(receiptDir, options, errors);

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
