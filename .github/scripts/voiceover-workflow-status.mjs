#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const canonicalFixtureDir = path.join(
  rootDir,
  "packages/sr-engine/tests/fixtures/voiceover",
);
const autonomousRunsDir = path.join(rootDir, "voiceover-smoke/autonomous-runs");

function usage() {
  return [
    "Usage: yarn voiceover:workflow-status [options]",
    "",
    "Options:",
    "  --run-id <id>       Inspect a specific voiceover-smoke/autonomous-runs/<id> run.",
    "  --run-dir <path>    Inspect a specific autonomous run directory.",
    "  --json              Print machine-readable JSON.",
    "  --help              Show this help.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    runId: "",
    runDir: "",
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--run-id") {
      options.runId = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--run-id=")) {
      options.runId = arg.slice("--run-id=".length);
      continue;
    }
    if (arg === "--run-dir") {
      options.runDir = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--run-dir=")) {
      options.runDir = arg.slice("--run-dir=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.runId && options.runDir) {
    throw new Error("Use either --run-id or --run-dir, not both.");
  }

  return options;
}

function readJson(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function latestRunDir() {
  if (!existsSync(autonomousRunsDir)) {
    return "";
  }
  const dirs = readdirSync(autonomousRunsDir)
    .map((name) => path.join(autonomousRunsDir, name))
    .filter((entry) => statSync(entry).isDirectory())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return dirs[0] || "";
}

function resolveRunDir(options) {
  if (options.runDir) {
    return path.resolve(rootDir, options.runDir);
  }
  if (options.runId) {
    return path.join(autonomousRunsDir, options.runId);
  }
  return latestRunDir();
}

function corpusSummary() {
  const index = readJson(path.join(canonicalFixtureDir, "index.json"));
  const manifest = readJson(path.join(canonicalFixtureDir, "refinement-manifest.json"));
  if (!index || !manifest) {
    return {
      available: false,
      total: 0,
      counts: {},
      missingManifestEntries: [],
    };
  }

  const counts = {};
  const missingManifestEntries = [];
  for (const testCase of index.cases || []) {
    const entry = manifest.cases?.[testCase.name];
    if (!entry) {
      missingManifestEntries.push(testCase.name);
    }
    const status = entry?.status || manifest.defaultStatus || "candidate";
    counts[status] = (counts[status] || 0) + 1;
  }

  return {
    available: true,
    total: (index.cases || []).length,
    counts,
    missingManifestEntries,
  };
}

function activeWorkFromState(state) {
  if (!state) {
    return [];
  }

  const active = [];
  for (const field of [
    "activeWorker",
    "activeC5Scan",
    "activeC5PrepWorkers",
    "activeC5ResultWorkers",
    "activeEvidenceWorkers",
    "activeReadOnlyWorkers",
  ]) {
    const value = state[field];
    if (!value) {
      continue;
    }
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (!item) {
        continue;
      }
      if (typeof item === "object" && /completed|closed|absent/.test(String(item.status || ""))) {
        continue;
      }
      active.push({ field, value: item });
    }
  }
  return active;
}

function promotionGaps(runDir) {
  const isolatedIndex = readJson(path.join(runDir, "fixtures/index.json"));
  const canonicalIndex = readJson(path.join(canonicalFixtureDir, "index.json"));
  const manifest = readJson(path.join(canonicalFixtureDir, "refinement-manifest.json"));
  if (!isolatedIndex || !canonicalIndex || !manifest) {
    return [];
  }

  const canonicalNames = new Set((canonicalIndex.cases || []).map((testCase) => testCase.name));
  const gaps = [];
  for (const testCase of isolatedIndex.cases || []) {
    const manifestStatus = manifest.cases?.[testCase.name]?.status;
    if (!canonicalNames.has(testCase.name)) {
      gaps.push({
        name: testCase.name,
        issue: "missing-from-canonical-corpus",
      });
      continue;
    }
    if (manifestStatus !== "refined") {
      gaps.push({
        name: testCase.name,
        issue: "canonical-fixture-not-marked-refined",
        status: manifestStatus || manifest.defaultStatus || "candidate",
      });
    }
  }
  return gaps;
}

function runSummary(runDir) {
  if (!runDir || !existsSync(runDir)) {
    return {
      available: false,
      runDir,
    };
  }
  const state = readJson(path.join(runDir, "orchestration-state.json"));
  const gaps = promotionGaps(runDir);
  const status = state?.status || "unknown";
  const latestCompare = state?.latestGovukDesignSystemCompare || state?.latestCompare || null;
  const completeButNotPromoted =
    status === "complete" && gaps.length > 0;
  const exactButNotPromoted =
    latestCompare?.mismatchWindowCount === 0 && gaps.length > 0;

  return {
    available: true,
    runDir: path.relative(rootDir, runDir),
    runId: state?.runId || path.basename(runDir),
    status,
    activeWork: activeWorkFromState(state),
    latestCompare,
    promotionGaps: gaps,
    warnings: [
      ...(completeButNotPromoted
        ? ["run-complete-but-isolated-fixtures-not-promoted"]
        : []),
      ...(exactButNotPromoted
        ? ["exact-isolated-compare-but-canonical-promotion-missing"]
        : []),
    ],
  };
}

function printText(report) {
  console.log("VoiceOver workflow status");
  console.log("");
  if (report.run.available) {
    console.log(`Run: ${report.run.runId} (${report.run.runDir})`);
    console.log(`Status: ${report.run.status}`);
    if (report.run.latestCompare) {
      console.log(
        `Latest compare: ${report.run.latestCompare.mismatchWindowCount} mismatch windows`,
      );
    }
    if (report.run.activeWork.length > 0) {
      console.log("Active work:");
      for (const item of report.run.activeWork) {
        const value = item.value;
        const label =
          typeof value === "object"
            ? [value.nickname, value.agentId, value.runId, value.status].filter(Boolean).join(" ")
            : String(value);
        console.log(`- ${item.field}: ${label}`);
      }
    } else {
      console.log("Active work: none");
    }
    if (report.run.promotionGaps.length > 0) {
      console.log("Promotion gaps:");
      for (const gap of report.run.promotionGaps) {
        console.log(`- ${gap.name}: ${gap.issue}${gap.status ? ` (${gap.status})` : ""}`);
      }
    } else {
      console.log("Promotion gaps: none");
    }
    for (const warning of report.run.warnings) {
      console.log(`Warning: ${warning}`);
    }
  } else {
    console.log("Run: none found");
  }

  console.log("");
  if (report.corpus.available) {
    console.log(`Corpus fixtures: ${report.corpus.total}`);
    for (const [status, count] of Object.entries(report.corpus.counts).sort()) {
      console.log(`- ${status}: ${count}`);
    }
    if (report.corpus.missingManifestEntries.length > 0) {
      console.log("Missing manifest entries:");
      for (const name of report.corpus.missingManifestEntries) {
        console.log(`- ${name}`);
      }
    }
  } else {
    console.log("Corpus fixtures: unavailable");
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  const runDir = resolveRunDir(options);
  const report = {
    run: runSummary(runDir),
    corpus: corpusSummary(),
  };
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printText(report);
  }
  if (report.run.warnings?.length || report.corpus.missingManifestEntries?.length) {
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error.message);
  console.error("");
  console.error(usage());
  process.exit(1);
}
