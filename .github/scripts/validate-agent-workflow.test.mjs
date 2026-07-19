import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const validatorPath = path.join(repoRoot, ".github/scripts/validate-agent-workflow.mjs");

function runValidator(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [validatorPath, ...args], (error, stdout, stderr) => {
      resolve({
        exitCode: error?.code ?? 0,
        stdout,
        stderr,
      });
    });
  });
}

async function withTempRun(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agent-workflow-validator-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function commonReceipt(overrides) {
  return {
    schemaVersion: 1,
    phase: "0",
    agent: "scan-health",
    agentConfigPath: ".codex/agents/scan-health.toml",
    spawnedBy: "top-level-codex",
    sessionId: "agent-scan-health",
    target: "example-target",
    runId: "run-1",
    status: "passed",
    inputs: {},
    decisions: {},
    evidence: {},
    fixtureChanges: [],
    nextPhase: "intake",
    handoffReason: "healthy artifact",
    handoffFrom: "",
    handoffTo: "intake",
    ...overrides,
  };
}

function preflight(requiredRoles, spawnedRoles = requiredRoles, overrides = {}) {
  return {
    schemaVersion: 1,
    phase: "preflight",
    target: "example-target",
    runId: "run-1",
    requiredRoles,
    availableRolesBeforeDiscovery: requiredRoles,
    discoveryAttempted: false,
    availableRolesAfterDiscovery: requiredRoles,
    missingRolesAfterDiscovery: [],
    decision: "ready",
    degradedReason: "",
    spawnedAgents: spawnedRoles.map((role) => ({
      phase: role === "scan-health" ? "0" : "B",
      agentType: role,
      sessionId: `agent-${role}`,
      nickname: role,
      agentConfigPath: `.codex/agents/${role}.toml`,
    })),
    blockedReason: "",
    startedAt: "2026-07-18T00:00:00.000Z",
    finishedAt: "2026-07-18T00:00:01.000Z",
    ...overrides,
  };
}

function phaseBOcrGlyphSweep(overrides = {}) {
  return {
    schemaVersion: 1,
    phase: "B-ocr-glyph-sweep",
    agent: "evidence-refiner",
    agentConfigPath: ".codex/agents/evidence-refiner.toml",
    spawnedBy: "top-level-codex",
    sessionId: "agent-evidence-refiner",
    runId: "run-1",
    status: "passed",
    rawExpectedAnnouncementsPreserved: true,
    unreviewedCandidateCount: 0,
    remainingSuspiciousLiteralCandidateCount: 0,
    rows: [{ target: "example-target", scanStatus: "complete" }],
    ...overrides,
  };
}

function phaseBOcrGlyphSweepContract() {
  return {
    contractVersion: 2,
    requiredRunChecks: ["phase-b-ocr-glyph-sweep"],
  };
}

test("accepts Phase 0 receipts with a shared run-level preflight", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeJson(path.join(runDir, "_summaries", "00-agent-preflight.json"), preflight(["scan-health"]));
    await writeJson(
      path.join(targetDir, "00-scan-health.json"),
      commonReceipt({ sharedPreflightRef: "../_summaries/00-agent-preflight.json" }),
    );

    const result = await runValidator([targetDir, "--required-phases", "0"]);

    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /Agent workflow validation passed/);
  });
});

test("allows planned roles to be spawned incrementally", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeJson(
      path.join(runDir, "_summaries", "00-agent-preflight.json"),
      preflight(["scan-health", "evidence-refiner", "fixture-judge"], ["scan-health"]),
    );
    await writeJson(
      path.join(targetDir, "00-scan-health.json"),
      commonReceipt({ sharedPreflightRef: "../_summaries/00-agent-preflight.json" }),
    );

    const result = await runValidator([targetDir, "--required-phases", "0"]);

    assert.equal(result.exitCode, 0, result.stderr);
  });
});

test("validates a run-level Phase 0.5 compact summary", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    const summaryPath = path.join(runDir, "_summaries", "phase05-compact-compare.json");
    await writeJson(path.join(runDir, "_summaries", "00-agent-preflight.json"), preflight(["scan-health"]));
    await writeJson(
      path.join(targetDir, "00-scan-health.json"),
      commonReceipt({ sharedPreflightRef: "../_summaries/00-agent-preflight.json" }),
    );
    await writeJson(summaryPath, {
      schemaVersion: 1,
      phase: "0.5",
      agent: "compare-summarizer",
      agentConfigPath: ".codex/agents/compare-summarizer.toml",
      spawnedBy: "top-level-codex",
      sessionId: "agent-compare-summarizer",
      runId: "run-1",
      status: "passed",
      totals: { targetCount: 1, validCount: 1, invalidCount: 0 },
      rows: [{ target: "example-target", disposition: "exact" }],
      recurringFamilies: [],
    });

    const result = await runValidator([
      targetDir,
      "--required-phases",
      "0",
      "--phase-05-summary",
      summaryPath,
    ]);

    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /Agent workflow validation passed/);
  });
});

test("keeps legacy missing-preflight allowance", async () => {
  await withTempRun(async (dir) => {
    const targetDir = path.join(dir, "run-1", "example-target");
    await writeJson(path.join(targetDir, "00-scan-health.json"), commonReceipt({}));

    const result = await runValidator([
      targetDir,
      "--required-phases",
      "0",
      "--allow-missing-preflight",
    ]);

    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stderr, /missing preflight allowed by flag/);
  });
});

test("rejects v2 shared preflight when the Phase B OCR/glyph sweep is missing", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeJson(
      path.join(runDir, "_summaries", "00-agent-preflight.json"),
      preflight(["scan-health"], ["scan-health"], phaseBOcrGlyphSweepContract()),
    );
    await writeJson(
      path.join(targetDir, "00-scan-health.json"),
      commonReceipt({ sharedPreflightRef: "../_summaries/00-agent-preflight.json" }),
    );

    const result = await runValidator([targetDir, "--required-phases", "0"]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /missing required phase-b-ocr-glyph-sweep run summary/);
  });
});

test("rejects v2 shared preflight when the Phase B OCR/glyph sweep failed", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeJson(
      path.join(runDir, "_summaries", "00-agent-preflight.json"),
      preflight(["scan-health"], ["scan-health"], phaseBOcrGlyphSweepContract()),
    );
    await writeJson(
      path.join(runDir, "_summaries", "phase-b-ocr-glyph-sweep.json"),
      phaseBOcrGlyphSweep({ status: "failed" }),
    );
    await writeJson(
      path.join(targetDir, "00-scan-health.json"),
      commonReceipt({ sharedPreflightRef: "../_summaries/00-agent-preflight.json" }),
    );

    const result = await runValidator([targetDir, "--required-phases", "0"]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /status must be passed/);
  });
});

test("rejects v2 shared preflight when the Phase B OCR/glyph target sweep is incomplete", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeJson(
      path.join(runDir, "_summaries", "00-agent-preflight.json"),
      preflight(["scan-health"], ["scan-health"], phaseBOcrGlyphSweepContract()),
    );
    await writeJson(
      path.join(runDir, "_summaries", "phase-b-ocr-glyph-sweep.json"),
      phaseBOcrGlyphSweep({
        unreviewedCandidateCount: 0,
        rows: [{ target: "example-target", scanStatus: "partial" }],
      }),
    );
    await writeJson(
      path.join(targetDir, "00-scan-health.json"),
      commonReceipt({ sharedPreflightRef: "../_summaries/00-agent-preflight.json" }),
    );

    const result = await runValidator([targetDir, "--required-phases", "0"]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /target example-target scan status must be complete/);
  });
});

test("rejects v2 shared preflight when a reviewed OCR/glyph repair remains unapplied", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeJson(
      path.join(runDir, "_summaries", "00-agent-preflight.json"),
      preflight(["scan-health"], ["scan-health"], phaseBOcrGlyphSweepContract()),
    );
    await writeJson(
      path.join(runDir, "_summaries", "phase-b-ocr-glyph-sweep.json"),
      phaseBOcrGlyphSweep({ remainingSuspiciousLiteralCandidateCount: 1 }),
    );
    await writeJson(
      path.join(targetDir, "00-scan-health.json"),
      commonReceipt({ sharedPreflightRef: "../_summaries/00-agent-preflight.json" }),
    );

    const result = await runValidator([targetDir, "--required-phases", "0"]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /remainingSuspiciousLiteralCandidateCount must be 0/);
  });
});

test("accepts v2 shared preflight when the Phase B OCR/glyph sweep is complete", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeJson(
      path.join(runDir, "_summaries", "00-agent-preflight.json"),
      preflight(["scan-health"], ["scan-health"], phaseBOcrGlyphSweepContract()),
    );
    await writeJson(
      path.join(runDir, "_summaries", "phase-b-ocr-glyph-sweep.json"),
      phaseBOcrGlyphSweep(),
    );
    await writeJson(
      path.join(targetDir, "00-scan-health.json"),
      commonReceipt({ sharedPreflightRef: "../_summaries/00-agent-preflight.json" }),
    );

    const result = await runValidator([targetDir, "--required-phases", "0"]);

    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /Agent workflow validation passed/);
  });
});
