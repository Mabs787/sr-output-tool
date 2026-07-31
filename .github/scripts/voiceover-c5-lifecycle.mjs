#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = process.cwd();
const isCli = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

function usage() {
  return [
    "Usage: yarn voiceover:c5 --spec <path> [options]",
    "",
    "Options:",
    "  --stage prepare|canary|full|retry  Lifecycle stage (default: prepare).",
    "  --artifact-dir <path>             Assess a downloaded scan artifact.",
    "  --attempt <0|1>                    Reproduction retry count (default: 0).",
    "  --output <path>                    Write the lifecycle receipt to this path.",
    "  --check                            Print JSON without writing.",
    "  --help                             Show this help.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    spec: "",
    stage: "prepare",
    artifactDir: "",
    attempt: 0,
    output: "",
    check: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { ...options, help: true };
    if (arg === "--check") {
      options.check = true;
      continue;
    }
    const [name, inlineValue] = arg.split("=", 2);
    if (["--spec", "--stage", "--artifact-dir", "--attempt", "--output"].includes(name)) {
      const value = inlineValue ?? argv[index + 1];
      if (inlineValue === undefined) index += 1;
      if (!value) throw new Error(`${name} requires a value`);
      if (name === "--spec") options.spec = value;
      if (name === "--stage") options.stage = value;
      if (name === "--artifact-dir") options.artifactDir = value;
      if (name === "--attempt") options.attempt = Number(value);
      if (name === "--output") options.output = value;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.spec) throw new Error("--spec is required");
  if (!["prepare", "canary", "full", "retry"].includes(options.stage)) {
    throw new Error("--stage must be prepare, canary, full, or retry");
  }
  if (![0, 1].includes(options.attempt)) {
    throw new Error("--attempt must be 0 or 1; C.5 permits at most one retry");
  }
  if (options.stage === "retry" && options.attempt !== 1) {
    throw new Error("--stage retry requires --attempt 1");
  }
  if (options.stage !== "prepare" && !options.artifactDir) {
    throw new Error(`${options.stage} requires --artifact-dir`);
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeControl(control, kind, index) {
  if (typeof control === "string") {
    return { id: `${kind}-${index + 1}`, text: control };
  }
  if (!control || typeof control.text !== "string" || !control.text.trim()) {
    throw new Error(`${kind}[${index}] requires non-empty text`);
  }
  return { id: control.id || `${kind}-${index + 1}`, text: control.text };
}

function controls(spec, field) {
  return (spec[field] || []).map((control, index) =>
    normalizeControl(control, field, index),
  );
}

export function validateC5Spec(spec, options = {}) {
  const root = options.repoRoot || repoRoot;
  const errors = [];
  for (const field of ["runId", "familyId", "ownerTarget", "fixturePath", "branch", "identityText"]) {
    if (typeof spec[field] !== "string" || !spec[field].trim()) {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  if (!Array.isArray(spec.targets) || spec.targets.length === 0) {
    errors.push("targets must be a non-empty array");
  }
  if (!Array.isArray(spec.candidateRefs) || spec.candidateRefs.length === 0) {
    errors.push("candidateRefs must be a non-empty array");
  }
  for (const field of ["positiveControls", "negativeControls", "tailGuards"]) {
    try {
      if (controls(spec, field).length === 0) {
        errors.push(`${field} must be a non-empty array`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  const fixturePath = path.resolve(root, spec.fixturePath || "missing");
  const relativeFixturePath = path.relative(root, fixturePath);
  if (
    relativeFixturePath.startsWith("..") ||
    path.isAbsolute(relativeFixturePath) ||
    !String(spec.fixturePath || "").startsWith(
      "packages/sr-engine/tests/fixtures/voiceover-repros/",
    )
  ) {
    errors.push("fixturePath must be under packages/sr-engine/tests/fixtures/voiceover-repros/");
  }

  let fixtureHtml = "";
  if (!existsSync(fixturePath)) {
    errors.push(`fixturePath does not exist: ${spec.fixturePath}`);
  } else {
    fixtureHtml = readFileSync(fixturePath, "utf8");
    if (!/data-sr-scan-root(?:\s|=|>)/.test(fixtureHtml)) {
      errors.push("fixture is missing data-sr-scan-root");
    }
    if (spec.identityText && !fixtureHtml.includes(spec.identityText)) {
      errors.push("fixture does not contain identityText");
    }
    for (const control of [
      ...controls(spec, "positiveControls"),
      ...controls(spec, "negativeControls"),
      ...controls(spec, "tailGuards"),
    ]) {
      if (!fixtureHtml.includes(control.text)) {
        errors.push(`fixture does not contain control text: ${control.text}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    fixturePath,
    fixtureHtml,
    fixtureSha256: fixtureHtml ? sha256(fixtureHtml) : "",
  };
}

function workflowCommand(spec, stage) {
  const isCanary = stage === "canary";
  const isRetry = stage === "retry";
  const maxSteps = isCanary
    ? spec.canaryMaxSteps || 40
    : isRetry
      ? spec.retryMaxSteps || Math.min((spec.fullMaxSteps || 80) * 2, 250)
      : spec.fullMaxSteps || 80;
  const conditional = Boolean(spec.conditionalStateRisk);
  const args = [
    "gh", "workflow", "run", "VoiceOver scan",
    "--ref", spec.branch,
    "-f", `urls=${spec.fixturePath}`,
    "-f", "capture_step_snapshots=true",
    "-f", `capture_step_screenshots=${conditional || !isCanary}`,
    "-f", `capture_conditional_evidence=${conditional}`,
    "-f", `capture_screen_recording=${conditional && !isCanary}`,
    "-f", "adaptive_max_steps=true",
    "-f", `max_steps=${maxSteps}`,
    "-f", `max_steps_ceiling=${spec.maxStepsCeiling || 500}`,
    "-f", "navigation_mode=voiceover-right-arrow",
  ];
  return { stage, maxSteps, args, command: args.map(shellQuote).join(" ") };
}

function shellQuote(value) {
  const text = String(value);
  return /^[a-zA-Z0-9_./:=+-]+$/.test(text)
    ? text
    : `'${text.replaceAll("'", `'\\''`)}'`;
}

export function createC5Plan(spec, options = {}) {
  const validation = validateC5Spec(spec, options);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }
  return {
    schemaVersion: 1,
    phase: "C.5-lifecycle",
    runId: spec.runId,
    familyId: spec.familyId,
    ownerTarget: spec.ownerTarget,
    matrixTargets: spec.targets,
    candidateRefs: spec.candidateRefs,
    familyScope: {
      confirmedScope: spec.confirmedScope || [],
      patchedScope: spec.patchedScope || [],
      remainingScope: spec.remainingScope || [],
    },
    fixture: {
      path: spec.fixturePath,
      sha256: validation.fixtureSha256,
      identityText: spec.identityText,
      hasScanRoot: true,
    },
    controls: {
      positive: controls(spec, "positiveControls"),
      negative: controls(spec, "negativeControls"),
      tail: controls(spec, "tailGuards"),
    },
    capturePolicy: {
      snapshots: true,
      stateTransitionScreenshots: Boolean(spec.conditionalStateRisk),
      fullStepScreenshots: true,
      recording: Boolean(spec.conditionalStateRisk),
    },
    retryPolicy: {
      maximumRetries: 1,
      insufficientReproRetriesRemaining: 1,
    },
    dispatches: {
      canary: workflowCommand(spec, "canary"),
      full: workflowCommand(spec, "full"),
      retry: workflowCommand(spec, "retry"),
    },
    status: "prepared",
    nextAction: "dispatch-canary",
  };
}

function findScanRoot(directory) {
  if (!existsSync(directory)) return "";
  const required = ["voiceover-output.json", "scan-debug.json"];
  const entries = readdirSync(directory, { withFileTypes: true });
  if (required.every((file) => existsSync(path.join(directory, file)))) {
    return directory;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const found = findScanRoot(path.join(directory, entry.name));
    if (found) return found;
  }
  return "";
}

function announcementList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.announcements)) return value.announcements;
  return [];
}

function assessControls(controlList, transcript) {
  return controlList.map((control) => ({
    ...control,
    reached: transcript.includes(control.text),
  }));
}

function allReached(entries) {
  return entries.length > 0 && entries.every((entry) => entry.reached);
}

export function assessC5Artifact(spec, artifactDir, options = {}) {
  const plan = createC5Plan(spec, options);
  const scanRoot = findScanRoot(artifactDir);
  if (!scanRoot) {
    return {
      ...plan,
      status: "debug-evidence-missing",
      nextAction: "scanner-fix-required",
      assessment: { errors: ["No scan root with voiceover-output.json and scan-debug.json"] },
    };
  }

  const requiredFiles = [
    "voiceover-output.json",
    "voiceover-sources.json",
    "rendered-html.html",
    "accessibility-tree.json",
    "step-snapshots.json",
    "engine-traversal-debug.json",
    "scan-debug.json",
  ];
  const missingFiles = requiredFiles.filter(
    (file) => !existsSync(path.join(scanRoot, file)),
  );
  const voiceOver = announcementList(readJson(path.join(scanRoot, "voiceover-output.json")));
  const engineDebug = existsSync(path.join(scanRoot, "engine-traversal-debug.json"))
    ? readJson(path.join(scanRoot, "engine-traversal-debug.json"))
    : {};
  const engine = (engineDebug.entries || []).map((entry) => entry.announcement);
  const scanDebug = readJson(path.join(scanRoot, "scan-debug.json"));
  const renderedHtml = existsSync(path.join(scanRoot, "rendered-html.html"))
    ? readFileSync(path.join(scanRoot, "rendered-html.html"), "utf8")
    : "";
  const ax = existsSync(path.join(scanRoot, "accessibility-tree.json"))
    ? readJson(path.join(scanRoot, "accessibility-tree.json"))
    : {};
  const snapshots = existsSync(path.join(scanRoot, "step-snapshots.json"))
    ? readJson(path.join(scanRoot, "step-snapshots.json"))
    : {};
  const transcript = voiceOver.join("\n");
  const positive = assessControls(plan.controls.positive, transcript);
  const negative = assessControls(plan.controls.negative, transcript);
  const tail = assessControls(plan.controls.tail, transcript);
  const identityPassed = renderedHtml.includes(spec.identityText);
  const stopReason = scanDebug.scan?.stopReason || "";
  const debugEvidenceComplete =
    missingFiles.length === 0 &&
    (ax.nodeCount || ax.nodes?.length || 0) > 0 &&
    (snapshots.snapshots?.length || 0) > 0;
  const controlsComplete =
    allReached(positive) && allReached(negative) && allReached(tail);
  const reachedEnd = stopReason === "scan-end-marker";
  const exactEngineMatch =
    voiceOver.length === engine.length &&
    voiceOver.every((announcement, index) => announcement === engine[index]);

  let suggestedVerdict = "insufficient-repro";
  if (!debugEvidenceComplete) suggestedVerdict = "debug-evidence-missing";
  else if (identityPassed && controlsComplete && reachedEnd) {
    suggestedVerdict = exactEngineMatch
      ? "fixture-noise-confirmed"
      : "engine-gap-confirmed";
  }

  const attempt = options.attempt || 0;
  const retryAvailable = suggestedVerdict === "insufficient-repro" && attempt < 1;
  return {
    ...plan,
    status: suggestedVerdict,
    nextAction:
      suggestedVerdict === "engine-gap-confirmed"
        ? "return-engine-refiner"
        : suggestedVerdict === "fixture-noise-confirmed"
          ? "return-evidence-refiner"
          : retryAvailable
            ? "dispatch-single-retry"
            : "return-fixture-judge-for-parking",
    retryPolicy: {
      ...plan.retryPolicy,
      attemptsUsed: attempt,
      insufficientReproRetriesRemaining: retryAvailable ? 1 : 0,
    },
    assessment: {
      stage: options.stage || "full",
      artifactRoot: path.relative(options.repoRoot || repoRoot, artifactDir),
      scanRoot: path.relative(options.repoRoot || repoRoot, scanRoot),
      missingFiles,
      identityPassed,
      stopReason,
      reachedEnd,
      debugEvidenceComplete,
      controls: { positive, negative, tail },
      controlsComplete,
      voiceOverAnnouncementCount: voiceOver.length,
      engineAnnouncementCount: engine.length,
      exactEngineMatch,
      suggestedVerdict,
      verdictRequiresEvidenceReview: true,
      note:
        "The suggested verdict is routing support only. The repro-scanner must review raw VoiceOver, DOM, AX, sources, snapshots, and engine differences before recording the terminal C.5 verdict.",
    },
  };
}

function defaultOutputPath(spec, stage) {
  return path.join(
    repoRoot,
    "voiceover-smoke/agent-work",
    spec.runId,
    "_summaries",
    `c5-${spec.familyId}-${stage}.json`,
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const specPath = path.resolve(repoRoot, options.spec);
  const spec = readJson(specPath);
  const result = options.stage === "prepare"
    ? createC5Plan(spec)
    : assessC5Artifact(spec, path.resolve(repoRoot, options.artifactDir), options);
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (options.check) {
    process.stdout.write(output);
    return;
  }
  const outputPath = options.output
    ? path.resolve(repoRoot, options.output)
    : defaultOutputPath(spec, options.stage);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output);
  console.log(path.relative(repoRoot, outputPath));
}

export { findScanRoot, parseArgs };

if (isCli) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error("");
    console.error(usage());
    process.exitCode = 1;
  }
}
