import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const defaultWorkDir = path.join(repoRoot, "voiceover-smoke/refinement-workspace");
const defaultWorkflow = "VoiceOver scan";

function parseArgs(argv) {
  const options = {
    artifactDir: "",
    compare: true,
    force: false,
    promote: "none",
    runId: "",
    target: "",
    workflow: defaultWorkflow,
    workDir: defaultWorkDir,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--artifact-dir") {
      options.artifactDir = path.resolve(repoRoot, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--run-id") {
      options.runId = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--target") {
      options.target = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--work-dir") {
      options.workDir = path.resolve(repoRoot, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--workflow") {
      options.workflow = argv[index + 1] || defaultWorkflow;
      index += 1;
    } else if (arg === "--promote") {
      options.promote = argv[index + 1] || "none";
      index += 1;
    } else if (arg === "--no-compare") {
      options.compare = false;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  npm run voiceover:preprocess-artifact -- --run-id 123 --target www-example-com
  npm run voiceover:preprocess-artifact -- --artifact-dir /tmp/artifacts --target www-example-com

This is Phase A preprocessing/import only. It does not run the full multi-agent
refinement workflow or spawn phase agents. The legacy script name
\`voiceover:refine-artifact\` is kept as an alias.

Options:
  --run-id <id>           Download artifacts from a GitHub Actions run.
  --artifact-dir <path>   Use an existing artifact directory instead of downloading.
  --target <name>         Target fixture name, for example www-sky-com.
  --work-dir <path>       Workspace for imported fixture, prompt, and report.
  --workflow <name>       Workflow name for diagnostics. Defaults to "VoiceOver scan".
  --promote <mode>        none, candidate, or refined. Defaults to none.
  --no-compare            Skip local engine comparison.
  --force                 Replace work/artifact directories if present.
  --help                  Show this help
`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: options.stdio || "pipe",
  });

  if (options.allowFailure) {
    return result;
  }

  if (result.status !== 0 || result.error) {
    throw new Error(
      [
        `${command} ${args.join(" ")} failed.`,
        result.stdout,
        result.stderr,
        result.error?.message,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function collectFiles(dir, fileName, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(entryPath, fileName, results);
    } else if (entry.name === fileName) {
      results.push(entryPath);
    }
  }
  return results;
}

function resolveManifestFile(scanDir, manifest, key) {
  const relativePath = manifest.files?.[key] || "";
  return relativePath ? path.join(scanDir, relativePath) : "";
}

function downloadArtifacts(options) {
  if (options.artifactDir) {
    return options.artifactDir;
  }
  if (!options.runId) {
    throw new Error("Pass either --run-id <id> or --artifact-dir <path>.");
  }

  const artifactDir = path.join(options.workDir, "artifacts", String(options.runId));
  if (existsSync(artifactDir)) {
    if (!options.force) {
      return artifactDir;
    }
    rmSync(artifactDir, { recursive: true, force: true });
  }
  mkdirSync(artifactDir, { recursive: true });

  run("gh", ["run", "download", String(options.runId), "--dir", artifactDir]);
  return artifactDir;
}

function findTargetPayload(artifactDir, target) {
  const payloads = collectFiles(artifactDir, "refinement-manifest.json").map(
    (manifestPath) => {
      const scanDir = path.dirname(manifestPath);
      const manifest = readJson(manifestPath);
      return {
        name: path.basename(scanDir),
        manifest,
        manifestPath,
        scanDir,
      };
    },
  );

  if (!payloads.length) {
    throw new Error(`No refinement-manifest.json files found in ${artifactDir}.`);
  }

  if (!target && payloads.length === 1) {
    return payloads[0];
  }

  const payload = payloads.find((entry) => entry.name === target);
  if (!payload) {
    throw new Error(
      `Target ${target || "(missing)"} not found. Available: ${payloads
        .map((entry) => entry.name)
        .join(", ")}`,
    );
  }

  return payload;
}

function importFixture({ artifactDir, fixtureDir, runId }) {
  run("npm", [
    "run",
    "voiceover:import-fixtures",
    "--",
    "--artifact-dir",
    artifactDir,
    "--output-dir",
    fixtureDir,
    "--include-step-snapshots",
    "--force",
    ...(runId ? ["--run-id", runId] : []),
  ]);
}

function createPrompt({ artifactDir, target, promptDir }) {
  run("npm", [
    "run",
    "voiceover:create-refinement-prompt",
    "--",
    "--artifact-dir",
    artifactDir,
    "--target",
    target,
    "--output-dir",
    promptDir,
  ]);
}

function countSourceFields(voiceOverSources) {
  const steps = voiceOverSources.steps || [];
  const counts = {
    steps: steps.length,
    captionText: 0,
    captionContentText: 0,
    captionAxText: 0,
    captionUiText: 0,
    captionOcrText: 0,
    voCursorText: 0,
    captionContentErrors: 0,
  };

  for (const step of steps) {
    for (const key of [
      "captionText",
      "captionContentText",
      "captionAxText",
      "captionUiText",
      "captionOcrText",
      "voCursorText",
    ]) {
      if (String(step[key] || "").trim()) counts[key] += 1;
    }
    if (step.captionContentError || step.captionWindowContentError) {
      counts.captionContentErrors += 1;
    }
  }

  return counts;
}

function evidenceNotes({ fixture, voiceOverSources, stepSnapshots }) {
  const notes = [];
  const sources = voiceOverSources.steps || [];
  const snapshots = stepSnapshots.snapshots || [];

  const undefinedLinks = fixture.expectedAnnouncements
    .map((announcement, index) => ({ announcement, index }))
    .filter(({ announcement }) => /undefined page link/i.test(announcement));
  if (undefinedLinks.length) {
    const examples = undefinedLinks.slice(0, 3).map(({ index }) => {
      const snapshot = snapshots.find((candidate) => candidate.index === index + 1);
      const active = snapshot?.pageState?.activeElement;
      return {
        step: index + 1,
        ariaLabel: active?.attributes?.["aria-label"] || "",
        text: active?.text || "",
        href: active?.attributes?.href || "",
      };
    });
    notes.push({
      type: "page-authored-aria-label",
      summary: `${undefinedLinks.length} announcement(s) contain "undefined page link"; snapshots show this comes from live aria-label values. Keep this VoiceOver output for engine refinement; treat it as a page quality issue only if auditing the site.`,
      examples,
    });
  }

  const tail = fixture.expectedAnnouncements.slice(-5);
  if (tail.some((announcement) => announcement === "group" || announcement === "alert")) {
    notes.push({
      type: "tail-groups",
      summary:
        "The scan ends with generic group/alert announcements after the footer; this may be valid VoiceOver traversal, but inspect source evidence before promoting as exact.",
      examples: tail,
    });
  }

  if (sources.length && sources.every((step) => !step.captionText && !step.captionContentText)) {
    notes.push({
      type: "ocr-primary",
      summary:
        "Direct VoiceOver caption text was unavailable; OCR is the selected caption source with voCursorText as supporting evidence. Keep VoiceOver output unless there is specific OCR drift or truncation evidence.",
    });
  }

  return notes;
}

function escapeCssIdentifier(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => {
    const hex = character.codePointAt(0).toString(16);
    return `\\${hex} `;
  });
}

function restoreGlobal(name, previousValue) {
  if (previousValue === undefined) {
    delete globalThis[name];
  } else {
    globalThis[name] = previousValue;
  }
}

function scanHtml(html) {
  const {
    createDomScanner,
    generateAnnouncement,
    getContextEndAnnouncement,
  } = require(path.join(repoRoot, "packages/sr-engine/dist/index.js"));
  const dom = new JSDOM(html);
  const css = dom.window.CSS ?? {};
  const previousDocument = globalThis.document;
  const previousCSS = globalThis.CSS;
  const previousGetComputedStyle = globalThis.getComputedStyle;
  const previousHTMLElement = globalThis.HTMLElement;
  const previousNode = globalThis.Node;

  if (typeof css.escape !== "function") {
    css.escape = escapeCssIdentifier;
  }

  globalThis.document = dom.window.document;
  globalThis.CSS = css;
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;

  try {
    return createDomScanner({
      generateAnnouncement,
      getContextEndAnnouncement,
    }).scanSubtree(dom.window.document.body).map((entry) => entry.announcement);
  } finally {
    restoreGlobal("document", previousDocument);
    restoreGlobal("CSS", previousCSS);
    restoreGlobal("getComputedStyle", previousGetComputedStyle);
    restoreGlobal("HTMLElement", previousHTMLElement);
    restoreGlobal("Node", previousNode);
  }
}

function findNextSyncPoint(actual, expected, actualIndex, expectedIndex) {
  for (let offset = 1; offset <= 30; offset += 1) {
    for (let actualOffset = 0; actualOffset <= offset; actualOffset += 1) {
      const expectedOffset = offset - actualOffset;
      if (actual[actualIndex + actualOffset] === expected[expectedIndex + expectedOffset]) {
        return {
          actualIndex: actualIndex + actualOffset,
          expectedIndex: expectedIndex + expectedOffset,
        };
      }
    }
  }
  return {
    actualIndex: Math.min(actual.length, actualIndex + 1),
    expectedIndex: Math.min(expected.length, expectedIndex + 1),
  };
}

function classifyMismatch(window) {
  const first = [window.firstActual, window.firstExpected].filter(Boolean).join("\n");
  const text = [...window.actual, ...window.expected].join("\n");
  if (/['’]|["“”]|\||\/|[.,]$/.test(first)) return "text-cleanup";
  if (/menu pop up|select|Country:/.test(first)) return "native-control";
  if (/button|group|collapsed|expanded/.test(first)) return "button/group";
  if (/heading level|level 2|items/.test(first)) return "heading/grouped-text";
  if (/content information|footer|main|banner|navigation/.test(first)) return "landmark";
  if (/button|group|collapsed|expanded/.test(text)) return "button/group";
  if (/heading level|level 2|items/.test(text)) return "heading/grouped-text";
  if (/menu pop up|select|Country:/.test(text)) return "native-control";
  if (/content information|footer|main|banner|navigation/.test(text)) return "landmark";
  return "other";
}

function compareEngine(fixtureDir, target) {
  run("npm", ["run", "build:engine"]);
  const fixturePath = path.join(fixtureDir, `${target}.expected.json`);
  const fixture = readJson(fixturePath);
  const html = readFileSync(path.join(fixtureDir, fixture.html), "utf8");
  const expected = fixture.refinedAnnouncements || fixture.expectedAnnouncements || [];
  const actual = scanHtml(html);
  const windows = [];
  let actualIndex = 0;
  let expectedIndex = 0;

  while (actualIndex < actual.length || expectedIndex < expected.length) {
    if (actual[actualIndex] === expected[expectedIndex]) {
      actualIndex += 1;
      expectedIndex += 1;
      continue;
    }
    const next = findNextSyncPoint(actual, expected, actualIndex, expectedIndex);
    const window = {
      actualIndex,
      expectedIndex,
      firstActual: actual[actualIndex] || null,
      firstExpected: expected[expectedIndex] || null,
      actual: actual.slice(Math.max(0, actualIndex - 3), Math.min(actual.length, next.actualIndex + 3)),
      expected: expected.slice(Math.max(0, expectedIndex - 3), Math.min(expected.length, next.expectedIndex + 3)),
    };
    window.type = classifyMismatch(window);
    windows.push(window);
    actualIndex = next.actualIndex;
    expectedIndex = next.expectedIndex;
  }

  const grouped = windows.reduce((result, window) => {
    result[window.type] = (result[window.type] || 0) + 1;
    return result;
  }, {});

  return {
    expectedCount: expected.length,
    actualCount: actual.length,
    mismatchWindowCount: windows.length,
    grouped,
    windows: windows.slice(0, 20),
    truncated: windows.length > 20,
  };
}

function writeReport({
  artifactDir,
  compare,
  fixture,
  manifest,
  promptPath,
  reportPath,
  evidenceNotes,
  sourceCounts,
}) {
  const raw = fixture.expectedAnnouncements || [];
  const refined = fixture.refinedAnnouncements || [];
  const cleanup = refined
    .map((announcement, index) =>
      announcement !== raw[index]
        ? {
            index: index + 1,
            raw: raw[index],
            refined: announcement,
          }
        : null,
    )
    .filter(Boolean);

  const report = `# VoiceOver Artifact Refinement Report

## Target

- Name: ${fixture.name}
- URL: ${fixture.url}
- Artifact: ${path.relative(repoRoot, artifactDir)}
- Prompt: ${path.relative(repoRoot, promptPath)}

## Scan Health

- Stop reason: ${manifest.scan?.stopReason || "unknown"}
- Captured steps: ${manifest.scan?.capturedSteps || 0}
- Raw announcements: ${raw.length}
- Refined announcements: ${refined.length}
- Step snapshots: ${fixture.stepSnapshots ? "yes" : "no"}
- Source counts: ${JSON.stringify(sourceCounts)}

## Deterministic Cleanup

${
  cleanup.length
    ? cleanup
        .map(
          (item) =>
            `- ${item.index}: \`${item.raw}\` -> \`${item.refined}\``,
        )
        .join("\n")
    : "- No deterministic cleanup changed the output."
}

## Evidence Notes

${
  evidenceNotes.length
    ? evidenceNotes
        .map(
          (note) =>
            `- ${note.type}: ${note.summary}${
              note.examples ? `\n  Evidence: ${JSON.stringify(note.examples)}` : ""
            }`,
        )
        .join("\n")
    : "- None detected."
}

## Engine Comparison

${
  compare
    ? `- Expected: ${compare.expectedCount}
- Actual: ${compare.actualCount}
- Mismatch windows: ${compare.mismatchWindowCount}
- Grouped: ${JSON.stringify(compare.grouped)}

${compare.windows
  .map(
    (window, index) => `### Window ${index + 1}: ${window.type}

- Expected first: ${window.firstExpected ?? "(none)"}
- Actual first: ${window.firstActual ?? "(none)"}
- Expected context: ${JSON.stringify(window.expected)}
- Actual context: ${JSON.stringify(window.actual)}
`,
  )
  .join("\n")}`
    : "Skipped."
}
`;

  writeFileSync(reportPath, report);
}

function promoteFixture({ fixtureDir, promote, target }) {
  if (promote === "none") return;
  if (!["candidate", "refined"].includes(promote)) {
    throw new Error("--promote must be one of: none, candidate, refined");
  }

  const corpusDir = path.join(repoRoot, "packages/sr-engine/tests/fixtures/voiceover");
  const fixture = readJson(path.join(fixtureDir, `${target}.expected.json`));
  for (const suffix of [".expected.json", ".html", ".ax.json", ".step-snapshots.json"]) {
    const source = path.join(fixtureDir, `${target}${suffix}`);
    if (existsSync(source)) {
      copyFileSync(source, path.join(corpusDir, `${target}${suffix}`));
    }
  }

  const manifestPath = path.join(corpusDir, "refinement-manifest.json");
  const manifest = readJson(manifestPath);
  manifest.cases[target] = {
    status: promote,
    reason:
      promote === "candidate"
        ? "Imported by voiceover:refine-artifact. Keep as candidate until the generated report's engine gaps are resolved."
        : "Imported by voiceover:refine-artifact and promoted as refined after evidence review.",
  };
  writeJson(manifestPath, manifest);

  const indexPath = path.join(corpusDir, "index.json");
  const index = readJson(indexPath);
  index.cases = (index.cases || []).filter((entry) => entry.name !== target);
  index.cases.push({
    name: target,
    expected: `${target}.expected.json`,
    html: `${target}.html`,
    accessibilityTree: `${target}.ax.json`,
    ...(existsSync(path.join(fixtureDir, `${target}.step-snapshots.json`))
      ? { stepSnapshots: `${target}.step-snapshots.json` }
      : {}),
    voiceOverAnnouncementCount: fixture.expectedAnnouncements?.length || 0,
    sanitizationStatus: fixture.sanitization?.status || "imported",
  });
  writeJson(indexPath, index);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (existsSync(options.workDir) && options.force) {
    rmSync(options.workDir, { recursive: true, force: true });
  }
  mkdirSync(options.workDir, { recursive: true });

  const artifactDir = downloadArtifacts(options);
  const payload = findTargetPayload(artifactDir, options.target);
  const target = payload.name;
  const fixtureDir = path.join(options.workDir, "fixtures");
  const promptDir = path.join(options.workDir, "prompts");
  const reportDir = path.join(options.workDir, "reports");
  mkdirSync(reportDir, { recursive: true });

  importFixture({
    artifactDir,
    fixtureDir,
    runId: options.runId,
  });
  createPrompt({
    artifactDir,
    target,
    promptDir,
  });

  const fixture = readJson(path.join(fixtureDir, `${target}.expected.json`));
  const voiceOverSourcesPath = resolveManifestFile(
    payload.scanDir,
    payload.manifest,
    "voiceOverSources",
  );
  const stepSnapshotsPath = path.join(fixtureDir, `${target}.step-snapshots.json`);
  const voiceOverSources = existsSync(voiceOverSourcesPath)
    ? readJson(voiceOverSourcesPath)
    : {};
  const stepSnapshots = existsSync(stepSnapshotsPath) ? readJson(stepSnapshotsPath) : {};
  const compare = options.compare ? compareEngine(fixtureDir, target) : null;
  const promptPath = path.join(promptDir, `${target}.md`);
  const reportPath = path.join(reportDir, `${target}.md`);

  writeReport({
    artifactDir,
    compare,
    fixture,
    manifest: payload.manifest,
    promptPath,
    reportPath,
    evidenceNotes: evidenceNotes({ fixture, voiceOverSources, stepSnapshots }),
    sourceCounts: countSourceFields(voiceOverSources),
  });

  promoteFixture({
    fixtureDir,
    promote: options.promote,
    target,
  });

  console.log(
    JSON.stringify(
      {
        target,
        artifactDir: path.relative(repoRoot, artifactDir),
        fixtureDir: path.relative(repoRoot, fixtureDir),
        prompt: path.relative(repoRoot, promptPath),
        report: path.relative(repoRoot, reportPath),
        promote: options.promote,
        compare: compare
          ? {
              expectedCount: compare.expectedCount,
              actualCount: compare.actualCount,
              mismatchWindowCount: compare.mismatchWindowCount,
              grouped: compare.grouped,
            }
          : null,
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
