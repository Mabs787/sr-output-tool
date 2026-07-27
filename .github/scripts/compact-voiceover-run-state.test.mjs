import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const scriptPath = path.join(
  repoRoot,
  ".github/scripts/compact-voiceover-run-state.mjs",
);

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function receipt(phase, agent, sessionId, overrides = {}) {
  return {
    schemaVersion: 1,
    phase,
    agent,
    sessionId,
    status: "passed",
    nextPhase: "complete",
    nextRecommendedWorker: { type: "none" },
    ...overrides,
  };
}

test("writes compact phase and session state", () => {
  const runDir = mkdtempSync(path.join(os.tmpdir(), "voiceover-compact-state-"));
  writeJson(path.join(runDir, "_summaries/00-agent-preflight.json"), {
    spawnedAgents: [
      {
        agentType: "scan-health",
        sessionId: "scan-session",
      },
    ],
  });
  writeJson(path.join(runDir, "_summaries/phase05-compact-compare.json"), {
    schemaVersion: 1,
    phase: "0.5",
    agent: "compare-summarizer",
    sessionId: "compare-session",
    rows: [{ target: "target-a" }, { target: "target-b" }],
  });
  writeJson(
    path.join(runDir, "target-a/00-scan-health.json"),
    receipt("0", "scan-health", "scan-session", {
      nextPhase: "A",
      nextRecommendedWorker: { type: "intake" },
    }),
  );
  writeJson(
    path.join(runDir, "target-a/03-evidence-refinement.json"),
    receipt("B", "evidence-refiner", "evidence-session", {
      nextPhase: "C",
      nextRecommendedWorker: { type: "fixture-judge" },
    }),
  );
  writeJson(
    path.join(runDir, "target-b/00-scan-health.json"),
    receipt("0", "scan-health", "scan-session"),
  );

  execFileSync(process.execPath, [scriptPath, "--run-dir", runDir], {
    cwd: repoRoot,
  });

  const state = JSON.parse(
    readFileSync(
      path.join(runDir, "_summaries/orchestrator-state.json"),
      "utf8",
    ),
  );
  assert.equal(state.targetCount, 2);
  assert.equal(state.phaseCoverage["0"], 2);
  assert.equal(state.phaseCoverage["0.5"], 2);
  assert.equal(state.phaseCoverage.B, 1);
  assert.equal(state.agents.uniqueSessionCount, 3);
  assert.equal(state.agents.byRole["scan-health"], 1);
  assert.equal(state.targets[0].nextWorker.type, "fixture-judge");
  assert.equal(state.receipts.oversizedCount, 0);
});

test("--check reports oversized receipts without writing state", () => {
  const runDir = mkdtempSync(path.join(os.tmpdir(), "voiceover-compact-check-"));
  writeJson(
    path.join(runDir, "target-a/03-evidence-refinement.json"),
    receipt("B", "evidence-refiner", "evidence-session", {
      evidence: "x".repeat(800),
    }),
  );

  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--run-dir",
      runDir,
      "--max-receipt-bytes",
      "256",
      "--check",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 2);
  const state = JSON.parse(result.stdout);
  assert.equal(state.receipts.oversizedCount, 1);
  assert.equal(
    state.receipts.oversized[0].path.endsWith(
      "03-evidence-refinement.json",
    ),
    true,
  );
});
