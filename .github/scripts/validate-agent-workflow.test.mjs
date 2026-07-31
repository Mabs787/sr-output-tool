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

function contractV3(overrides = {}) {
  return {
    contractVersion: 3,
    requiredRunChecks: [
      "phase-b-ocr-glyph-sweep",
      "phase-05-shell-families",
      "recapture-accounting",
      "stable-candidate-references",
      "structural-evidence-packets",
      "c5-fixture-path-diagnostics",
      "final-run-metrics",
    ],
    ...overrides,
  };
}

function candidateRef(overrides = {}) {
  return {
    candidateId: "example-target:structural:abc123",
    sourceIndex: 12,
    currentRefinedIndex: 12,
    rawTextSha256: "raw-sha",
    refinedTextSha256: "refined-sha",
    previousTextSha256: "previous-sha",
    nextTextSha256: "next-sha",
    domNodeIds: ["node-1"],
    htmlSnippetSha256: "html-sha",
    axRoleNameSha256: "ax-sha",
    family: "structural-card",
    compareWindowId: "window-1",
    resolution: "matched",
    ...overrides,
  };
}

function phaseReceipt(phase, agent, overrides = {}) {
  const phaseDefaults = {
    B: {
      agentConfigPath: ".codex/agents/evidence-refiner.toml",
      nextPhase: "fixture-judge",
      handoffFrom: "A",
      handoffTo: "fixture-judge",
    },
    C: {
      agentConfigPath: ".codex/agents/fixture-judge.toml",
      nextPhase: "repro-scanner",
      handoffFrom: "B",
      handoffTo: "repro-scanner",
    },
    "C.5": {
      agentConfigPath: ".codex/agents/repro-scanner.toml",
      nextPhase: "promoter",
      handoffFrom: "C",
      handoffTo: "promoter",
    },
    E: {
      agentConfigPath: ".codex/agents/promoter.toml",
      nextPhase: "complete",
      handoffFrom: "C.5",
      handoffTo: "complete",
    },
  };

  return {
    schemaVersion: 1,
    phase,
    agent,
    agentConfigPath: phaseDefaults[phase].agentConfigPath,
    spawnedBy: "top-level-codex",
    sessionId: `agent-${agent}`,
    target: "example-target",
    runId: "run-1",
    status: "passed",
    inputs: {},
    decisions: {},
    evidence: {},
    fixtureChanges: [],
    nextPhase: phaseDefaults[phase].nextPhase,
    handoffReason: "ready for next phase",
    handoffFrom: phaseDefaults[phase].handoffFrom,
    handoffTo: phaseDefaults[phase].handoffTo,
    sharedPreflightRef: "../_summaries/00-agent-preflight.json",
    ...overrides,
  };
}

function phase05Summary(overrides = {}) {
  return {
    schemaVersion: 1,
    phase: "0.5",
    agent: "compare-summarizer",
    agentConfigPath: ".codex/agents/compare-summarizer.toml",
    spawnedBy: "top-level-codex",
    sessionId: "agent-compare-summarizer",
    runId: "run-1",
    status: "passed",
    totals: { targetCount: 1, validCount: 1, invalidCount: 0 },
    rows: [{
      target: "example-target",
      disposition: "engine-family-candidate",
      shellFingerprint: "landmarks:main>footer;footer:links",
      sharedShellFamilies: ["footer-shell"],
    }],
    recurringFamilies: [{
      family: "structural-card",
      familySignature: "li>article[tabindex]>h3+p+a",
      affectedTargets: ["example-target"],
    }],
    sharedShellFamilies: [{
      family: "footer-shell",
      shellFingerprint: "footer>nav[list]>legal-tail",
      affectedTargets: ["example-target"],
    }],
    sharedPreflightRef: "00-agent-preflight.json",
    ...overrides,
  };
}

async function writeV3Base(runDir, targetDir, { preflightOverrides = {}, phase05Overrides = {} } = {}) {
  await writeJson(
    path.join(runDir, "_summaries", "00-agent-preflight.json"),
    preflight(
      ["scan-health", "evidence-refiner", "fixture-judge", "repro-scanner", "promoter"],
      ["scan-health", "evidence-refiner", "fixture-judge", "repro-scanner", "promoter"],
      contractV3(preflightOverrides),
    ),
  );
  await writeJson(path.join(runDir, "_summaries", "phase-b-ocr-glyph-sweep.json"), phaseBOcrGlyphSweep());
  await writeJson(path.join(runDir, "_summaries", "phase05-compact-compare.json"), phase05Summary(phase05Overrides));
  await writeJson(
    path.join(targetDir, "00-scan-health.json"),
    commonReceipt({ sharedPreflightRef: "../_summaries/00-agent-preflight.json" }),
  );
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

test("rejects v3 shared preflight when a required run check is missing", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    const requiredRunChecks = contractV3().requiredRunChecks.filter((check) => check !== "final-run-metrics");
    await writeV3Base(runDir, targetDir, { preflightOverrides: { requiredRunChecks } });

    const result = await runValidator([targetDir, "--required-phases", "0"]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /contractVersion 3 requires requiredRunChecks to include final-run-metrics/);
  });
});

test("rejects v3 Phase 0.5 summaries without shell fingerprints and family signatures", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeV3Base(runDir, targetDir, {
      phase05Overrides: {
        rows: [{ target: "example-target", disposition: "engine-family-candidate", sharedShellFamilies: [] }],
        recurringFamilies: [{ family: "structural-card", affectedTargets: ["example-target"] }],
        sharedShellFamilies: [{ family: "footer-shell", affectedTargets: ["example-target"] }],
      },
    });

    const result = await runValidator([targetDir, "--required-phases", "0"]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /rows\[0\] must include non-empty shellFingerprint/);
    assert.match(result.stderr, /recurringFamilies\[0\] must include non-empty familySignature/);
    assert.match(result.stderr, /sharedShellFamilies\[0\] must include non-empty shellFingerprint/);
  });
});

test("rejects v3 non-passed Phase 0 receipts without recapture queue accounting", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeV3Base(runDir, targetDir);
    await writeJson(
      path.join(targetDir, "00-scan-health.json"),
      commonReceipt({
        sharedPreflightRef: "../_summaries/00-agent-preflight.json",
        status: "retry-required",
        handoffTo: "scan-retry",
        recaptureQueueEntry: {
          recaptureId: "recapture-example-target",
          queuePath: "../_summaries/recapture-queue.json",
        },
      }),
    );

    const result = await runValidator([targetDir, "--required-phases", "0"]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /missing recapture queue for non-passed Phase 0/);
  });
});

test("rejects v3 Phase B candidate decisions without stable candidate refs", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeV3Base(runDir, targetDir);
    await writeJson(
      path.join(targetDir, "03-evidence-refinement.json"),
      phaseReceipt("B", "evidence-refiner", {
        decisions: {
          candidates: [{
            candidateId: "example-target:text-boundary:1",
            sourceIndex: 4,
            currentRefinedIndex: 4,
            decision: "edited",
          }],
        },
      }),
    );

    const result = await runValidator([targetDir, "--required-phases", "B"]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /candidate entry requires stable candidateRef/);
  });
});

test("rejects v3 Phase C engine-ready structural decisions without complete packets", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeV3Base(runDir, targetDir);
    await writeJson(
      path.join(targetDir, "04-fixture-judge.json"),
      phaseReceipt("C", "fixture-judge", {
        decisions: [{
          family: "structural-card",
          disposition: "engine-ready",
          structuralEvidencePacket: { completeness: "partial" },
        }],
      }),
    );

    const result = await runValidator([targetDir, "--required-phases", "C"]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /structuralEvidencePacket: completeness must be complete/);
  });
});

test("rejects v3 executed Phase C.5 receipts without passing fixture path diagnostics", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeV3Base(runDir, targetDir);
    await writeJson(
      path.join(targetDir, "04-minimal-reproduction-scan.json"),
      phaseReceipt("C.5", "repro-scanner", {
        fixturePathDiagnostic: {
          fixturePath: "packages/sr-engine/tests/fixtures/voiceover-repros/example-target/card.html",
          resolvedPath: "/tmp/card.html",
          sha256: "sha",
          identityMarker: "Example repro",
          renderedPath: "file:///tmp/card.html",
          renderedHtmlNonEmpty: true,
          axNodeCount: 1,
          stepSnapshotCount: 1,
          decision: "failed",
        },
      }),
    );

    const result = await runValidator([targetDir, "--required-phases", "C.5"]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /fixturePathDiagnostic must pass/);
  });
});

test("rejects v3 Phase E receipts without final run metrics", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeV3Base(runDir, targetDir);
    await writeJson(path.join(targetDir, "06-promotion.json"), phaseReceipt("E", "promoter"));

    const result = await runValidator([targetDir, "--required-phases", "E"]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Phase E requires runMetrics/);
  });
});

test("accepts complete v3 workflow receipts with all required run checks", async () => {
  await withTempRun(async (dir) => {
    const runDir = path.join(dir, "run-1");
    const targetDir = path.join(runDir, "example-target");
    await writeV3Base(runDir, targetDir);
    await writeJson(
      path.join(targetDir, "03-evidence-refinement.json"),
      phaseReceipt("B", "evidence-refiner", {
        decisions: {
          candidates: [{
            candidateRef: candidateRef(),
            decision: "edited",
          }],
        },
        fixtureChanges: [{
          file: "packages/sr-engine/tests/fixtures/voiceover/example-target.expected.json",
          field: "refinedAnnouncements",
          indexes: [12],
          before: "Old text",
          after: "New text",
          reason: "caption-or-ocr-repair",
          evidencePointers: ["window-1"],
          candidateRef: candidateRef(),
        }],
      }),
    );
    await writeJson(
      path.join(targetDir, "04-fixture-judge.json"),
      phaseReceipt("C", "fixture-judge", {
        decisions: [{
          family: "structural-card",
          disposition: "engine-ready",
          structuralEvidencePacket: {
            completeness: "complete",
            candidateRef: candidateRef(),
            compareWindowId: "window-1",
            focusedDomNodeId: "node-1",
            outerHtmlSha256: "outer-html-sha",
            semanticAncestorChain: ["main", "ul", "li"],
            siblingSummary: "one preceding heading",
            matchedAxNode: { role: "group", name: "New text" },
            voiceOverStepRef: "step-12",
            voiceOverSourceRef: "source-12",
          },
        }],
      }),
    );
    await writeJson(
      path.join(targetDir, "04-minimal-reproduction-scan.json"),
      phaseReceipt("C.5", "repro-scanner", {
        fixturePathDiagnostic: {
          fixturePath: "packages/sr-engine/tests/fixtures/voiceover-repros/example-target/card.html",
          resolvedPath: "/tmp/card.html",
          sha256: "sha",
          identityMarker: "Example repro",
          renderedPath: "file:///tmp/card.html",
          renderedHtmlNonEmpty: true,
          axNodeCount: 1,
          stepSnapshotCount: 1,
          decision: "passed",
        },
      }),
    );
    await writeJson(
      path.join(targetDir, "06-promotion.json"),
      phaseReceipt("E", "promoter", {
        runMetrics: {
          reviewedCandidateCount: 1,
          appliedFixtureRepairCount: 1,
          rejectedCandidateCount: 0,
          mismatchWindowsBeforeFixtureRepair: 1,
          mismatchWindowsAfterFixtureRepair: 1,
          mismatchWindowsBeforeEngineWork: 1,
          mismatchWindowsAfterEngineWork: 0,
          exactTotal: 1,
          actionableTotal: 0,
          conditionalTotal: 0,
          parkedTotal: 0,
          recaptureOnlyTotal: 0,
        },
      }),
    );

    const result = await runValidator([targetDir, "--required-phases", "0,B,C,C.5,E"]);

    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /Agent workflow validation passed/);
  });
});

test("strict terminal validation accepts evidence-backed candidate closure", async () => {
  await withTempRun(async (dir) => {
    const targetDir = path.join(dir, "run-1/example-target");
    await writeJson(
      path.join(targetDir, "00-agent-preflight.json"),
      preflight(["promoter"]),
    );
    await writeJson(
      path.join(targetDir, "06-promotion.json"),
      phaseReceipt("E", "promoter", {
        promotionDecision: "candidate",
        exactMatch: false,
        revisitQueue: [{
          family: "carousel-context",
          nextOwner: "repro-scanner",
          nextAction: "Run the focused carousel reproduction.",
          blocker: "Saved evidence does not contain the interaction state.",
          checksNeeded: ["C.5 canary", "target comparison"],
        }],
        checks: [{ status: "passed", command: "fixture comparison" }],
        nextPhase: "complete",
        handoffTo: "complete",
        nextRecommendedWorker: { type: "none" },
      }),
    );

    const result = await runValidator([
      targetDir,
      "--required-phases",
      "E",
      "--strict-terminal-outcome",
    ]);

    assert.equal(result.exitCode, 0, result.stderr);
  });
});

test("strict terminal validation rejects generic candidate parking", async () => {
  await withTempRun(async (dir) => {
    const targetDir = path.join(dir, "run-1/example-target");
    await writeJson(
      path.join(targetDir, "00-agent-preflight.json"),
      preflight(["promoter"]),
    );
    await writeJson(
      path.join(targetDir, "06-promotion.json"),
      phaseReceipt("E", "promoter", {
        promotionDecision: "candidate",
        exactMatch: false,
        revisitQueue: [],
        checks: [{ status: "pending" }],
        nextPhase: "complete",
        handoffTo: "complete",
        nextRecommendedWorker: { type: "none" },
      }),
    );

    const result = await runValidator([
      targetDir,
      "--required-phases",
      "E",
      "--strict-terminal-outcome",
    ]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /requires a non-empty revisitQueue/);
    assert.match(result.stderr, /checks must not be pending/);
  });
});
