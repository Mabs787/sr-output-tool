import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const defaultOutputDir = path.join(
  repoRoot,
  "packages/sr-engine/tests/fixtures/voiceover",
);

function parseArgs(argv) {
  const options = {
    artifactDir: "",
    outputDir: defaultOutputDir,
    force: false,
    includeStepSnapshots: false,
    runId: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--artifact-dir") {
      options.artifactDir = path.resolve(repoRoot, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--output-dir") {
      options.outputDir = path.resolve(repoRoot, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--run-id") {
      options.runId = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--include-step-snapshots") {
      options.includeStepSnapshots = true;
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
  node .github/scripts/import-voiceover-fixtures.mjs --artifact-dir /tmp/voiceover-artifacts --force

Options:
  --artifact-dir <path>   Downloaded VoiceOver scan artifact directory.
  --output-dir <path>     Fixture output directory. Defaults to packages/sr-engine/tests/fixtures/voiceover
  --run-id <id>           Optional workflow run id to record in the fixture index.
  --include-step-snapshots
                          Also write reduced *.step-snapshots.json fixtures for partial gates that need live per-step DOM evidence.
  --force                 Replace existing generated fixtures.
  --help                  Show this help
`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function truncate(value, maxLength = 4000) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
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

function reduceElementEvidence(element) {
  if (!element) return undefined;

  return {
    ...(element.score !== undefined ? { score: element.score } : {}),
    tagName: element.tagName || "",
    attributes: element.attributes || {},
    text: truncate(element.text, 300),
    computed: element.computed || {},
    rect: element.rect || undefined,
    ...(element.html ? { html: truncate(element.html) } : {}),
    ...(Array.isArray(element.ancestors)
      ? {
          ancestors: element.ancestors.slice(0, 2).map((ancestor) => ({
            tagName: ancestor.tagName || "",
            attributes: ancestor.attributes || {},
            text: truncate(ancestor.text, 300),
            computed: ancestor.computed || {},
            rect: ancestor.rect || undefined,
            ...(ancestor.html ? { html: truncate(ancestor.html) } : {}),
          })),
        }
      : {}),
  };
}

function reduceStepSnapshots(stepSnapshots) {
  return {
    schemaVersion: 1,
    source: stepSnapshots.source || "",
    description:
      "Reduced per-step evidence for refining fixtures when final rendered HTML differs from the live DOM/AX state at the VoiceOver step.",
    partial: Boolean(stepSnapshots.partial),
    snapshots: (stepSnapshots.snapshots || []).map((snapshot) => ({
      index: snapshot.index,
      capturedAt: snapshot.capturedAt || "",
      announcement: snapshot.announcement || "",
      focus: snapshot.focus || {},
      pageStateCapture: snapshot.pageStateCapture
        ? {
            ok: Boolean(snapshot.pageStateCapture.ok),
            status: snapshot.pageStateCapture.status ?? null,
            error: snapshot.pageStateCapture.error || "",
          }
        : undefined,
      pageState: snapshot.pageState
        ? {
            title: snapshot.pageState.title || "",
            readyState: snapshot.pageState.readyState || "",
            url: snapshot.pageState.url || "",
            viewport: snapshot.pageState.viewport || {},
            scroll: snapshot.pageState.scroll || {},
            activeElement: reduceElementEvidence(snapshot.pageState.activeElement),
            activeElementAncestors: (snapshot.pageState.activeElementAncestors || [])
              .slice(0, 2)
              .map(reduceElementEvidence)
              .filter(Boolean),
            matchedDomElements: (snapshot.pageState.matchedDomElements || [])
              .slice(0, 5)
              .map(reduceElementEvidence)
              .filter(Boolean),
          }
        : undefined,
      accessibility: snapshot.accessibility
        ? {
            ok: Boolean(snapshot.accessibility.ok),
            nodeCount: snapshot.accessibility.nodeCount || 0,
            ignoredNodeCount: snapshot.accessibility.ignoredNodeCount || 0,
            domSnapshotMappedNodeCount:
              snapshot.accessibility.domSnapshotMappedNodeCount || 0,
            tokens: snapshot.accessibility.tokens || [],
            matchedNodes: (snapshot.accessibility.matchedNodes || [])
              .slice(0, 8)
              .map((node) => ({
                score: node.score,
                role: node.role || "",
                name: truncate(node.name, 300),
                ignored: Boolean(node.ignored),
                domNodeId: node.domNodeId || "",
                renderedHtmlSelector: node.renderedHtmlSelector || "",
                tagName: node.tagName || "",
                properties: node.properties || undefined,
              })),
          }
        : undefined,
    })),
  };
}

function sanitizeAnnouncement(announcement) {
  return String(announcement || "")
    .replace(/^link, inside of web content, (.+) link$/i, "link, $1")
    .replace(/^Chrome, Wikipedia - Google Chrome, window, link, /, "link, ")
    .replace(/^I banner$/, "banner")
    .replace(/^I (?=heading level \d+\b)/, "")
    .replace(/^I 6 days ago$/, "6 days ago")
    .replace(/^AII BBC destinations menu\b/, "All BBC destinations menu")
    .replace(/\bAl (?=(and the web|skills?|capabilities|meets accessibility|solutions|web interfaces)\b)/g, "AI ")
    .replace(/\bfor responsible Al\b/g, "for responsible AI")
    .replace(/\bAl Skills\b/g, "AI Skills")
    .replace(/\bAl and accessibility\b/g, "AI and accessibility")
    .replace(/\bAl skilling\b/g, "AI skilling")
    .replace(/^Products , menu pop up collapsed, button$/, "Products, menu pop up collapsed, button")
    .replace(/^All Microsoft , menu pop up collapsed, button$/, "All Microsoft, menu pop up collapsed, button")
    .replace(/^More B, menu pop up collapsed, button$/, "More, menu pop up collapsed, button")
    .replace(/^, endof list$/, "end of list");
}

function findSanitizationIssues(announcements) {
  const severePatterns = [
    /[ХЖ≤™ŒŁФ]/,
    /-iL/i,
    /^[-:]*1l/i,
    /^AIIIA\b/,
  ];
  const warningPatterns = [
    /^AII\b/,
    /\bAl (?=(and the web|skills?|capabilities|meets accessibility|solutions|web interfaces)\b)/,
    /^I (?=(banner|heading level \d+|6 days ago)\b)/,
    /^Chrome, .+ Google Chrome, window,/,
    /^link, inside of web content,/,
    /^Products ,/,
    /^All Microsoft ,/,
    /^More B,/,
  ];

  const severe = [];
  const warnings = [];
  for (const [index, announcement] of announcements.entries()) {
    if (severePatterns.some((pattern) => pattern.test(announcement))) {
      severe.push({ index, announcement });
    } else if (warningPatterns.some((pattern) => pattern.test(announcement))) {
      warnings.push({ index, announcement });
    }
  }

  return {
    severe,
    warnings,
  };
}

function createSanitizedOutput({
  announcements,
  manifest,
  scanDebug,
  stepSnapshotsPath,
  renderedHtml,
}) {
  const refinedAnnouncements = announcements.map(sanitizeAnnouncement);
  const changedCount = refinedAnnouncements.filter(
    (announcement, index) => announcement !== announcements[index],
  ).length;
  const issues = findSanitizationIssues(announcements);
  const skipReasons = [];

  if (manifest.scan?.stopReason !== "scan-end-marker") {
    skipReasons.push(
      `Scan stop reason was ${manifest.scan?.stopReason || "unknown"}.`,
    );
  }
  if (!announcements.length) {
    skipReasons.push("VoiceOver output is empty.");
  }
  if (!stepSnapshotsPath || !existsSync(stepSnapshotsPath)) {
    skipReasons.push("Missing step-snapshots.json diagnostics.");
  }
  if (issues.severe.length) {
    skipReasons.push(
      `Contains ${issues.severe.length} severe OCR/caption artifact(s) requiring manual refinement.`,
    );
  }
  if ((manifest.stats?.reducedHtml?.reducedLength || 0) < 1000) {
    skipReasons.push("Rendered HTML is empty or too small to be a useful fixture.");
  }
  if (
    scanDebug.output?.htmlSource === "chrome-rendered-dom" &&
    scanDebug.setup?.sourceHtmlCapture?.ok === false
  ) {
    skipReasons.push("Rendered HTML capture failed.");
  }
  if (
    announcements.some((announcement) =>
      /Mechanize is hiring|^link, AD$|Don['’]t want to see ads/i.test(
        announcement,
      ),
    ) &&
    !/Mechanize is hiring|>\s*AD\s*<|Don['’]t want to see ads/i.test(renderedHtml)
  ) {
    skipReasons.push(
      "VoiceOver captured dynamic advertising content that is absent from rendered HTML.",
    );
  }

  return {
    refinedAnnouncements:
      changedCount > 0 ? refinedAnnouncements : undefined,
    skipCorpusReason: skipReasons.length
      ? `Skipped for corpus gating: ${skipReasons.join(" ")}`
      : "",
    sanitization: {
      status: skipReasons.length ? "needs-manual-refinement" : "sanitized",
      changedAnnouncementCount: changedCount,
      warningCount: issues.warnings.length,
      severeIssueCount: issues.severe.length,
      warnings: issues.warnings.slice(0, 20),
      severeIssues: issues.severe.slice(0, 20),
      notes: [
        "Raw expectedAnnouncements are preserved.",
        "refinedAnnouncements contain only high-confidence OCR/system-caption corrections.",
        "Fixtures with skipCorpusReason are excluded from opt-in corpus gating until manually refined.",
      ],
    },
  };
}

function prepareOutputDir(outputDir, force) {
  if (existsSync(outputDir)) {
    if (!force) {
      throw new Error(
        `${path.relative(repoRoot, outputDir)} already exists. Pass --force to replace it.`,
      );
    }
    rmSync(outputDir, { recursive: true, force: true });
  }

  mkdirSync(outputDir, { recursive: true });
}

function importFixture({ manifestPath, outputDir, runId, includeStepSnapshots }) {
  const scanDir = path.dirname(manifestPath);
  const manifest = readJson(manifestPath);
  const name = path.basename(scanDir);
  const voiceOverPath = resolveManifestFile(scanDir, manifest, "voiceOverOutput");
  const renderedHtmlPath = resolveManifestFile(scanDir, manifest, "renderedHtml");
  const accessibilityTreePath = resolveManifestFile(
    scanDir,
    manifest,
    "accessibilityTree",
  );
  const scanDebugPath = resolveManifestFile(scanDir, manifest, "scanDebug");
  const stepSnapshotsPath = resolveManifestFile(scanDir, manifest, "stepSnapshots");
  const requiredFiles = [
    voiceOverPath,
    renderedHtmlPath,
    accessibilityTreePath,
    scanDebugPath,
  ];
  const missingFiles = requiredFiles.filter((filePath) => !existsSync(filePath));

  if (missingFiles.length) {
    return {
      name,
      imported: false,
      reason: `missing files: ${missingFiles
        .map((filePath) => path.relative(scanDir, filePath))
        .join(", ")}`,
    };
  }

  if (manifest.scan?.stopReason !== "scan-end-marker") {
    return {
      name,
      imported: false,
      reason: `stop reason: ${manifest.scan?.stopReason || "unknown"}`,
    };
  }

  const voiceOver = readJson(voiceOverPath);
  const accessibilityTree = readJson(accessibilityTreePath);
  const scanDebug = readJson(scanDebugPath);
  const renderedHtml = readFileSync(renderedHtmlPath, "utf8");
  const sanitized = createSanitizedOutput({
    announcements: voiceOver.announcements || [],
    manifest,
    scanDebug,
    stepSnapshotsPath,
    renderedHtml,
  });
  const htmlFileName = `${name}.html`;
  const axFileName = `${name}.ax.json`;
  const stepSnapshotsFileName = `${name}.step-snapshots.json`;
  const expectedFileName = `${name}.expected.json`;
  const hasStepSnapshots = Boolean(
    includeStepSnapshots && stepSnapshotsPath && existsSync(stepSnapshotsPath),
  );

  copyFileSync(renderedHtmlPath, path.join(outputDir, htmlFileName));
  writeJson(path.join(outputDir, axFileName), accessibilityTree);
  if (hasStepSnapshots) {
    writeJson(
      path.join(outputDir, stepSnapshotsFileName),
      reduceStepSnapshots(readJson(stepSnapshotsPath)),
    );
  }
  writeJson(path.join(outputDir, expectedFileName), {
    schemaVersion: 1,
    name,
    url: manifest.target?.url || "",
    sourceRunId: runId,
    html: htmlFileName,
    accessibilityTree: axFileName,
    ...(hasStepSnapshots ? { stepSnapshots: stepSnapshotsFileName } : {}),
    expectedAnnouncements: voiceOver.announcements || [],
    ...(sanitized.refinedAnnouncements
      ? { refinedAnnouncements: sanitized.refinedAnnouncements }
      : {}),
    ...(sanitized.skipCorpusReason
      ? { skipCorpusReason: sanitized.skipCorpusReason }
      : {}),
    scan: {
      stopReason: manifest.scan?.stopReason || "",
      capturedSteps: manifest.scan?.capturedSteps || 0,
    },
    stats: {
      voiceOverAnnouncementCount: voiceOver.announcements?.length || 0,
      reducedHtml: manifest.stats?.reducedHtml || {},
      accessibilityTree: manifest.stats?.accessibilityTree || {},
    },
    refinementNotes: manifest.refinementNotes || [],
    source: {
      manifestPath: path.relative(repoRoot, manifestPath),
      scanDebug: {
        firstVoiceOverAnnouncement:
          scanDebug.output?.firstVoiceOverAnnouncement || "",
        lastVoiceOverAnnouncement: scanDebug.output?.lastVoiceOverAnnouncement || "",
      },
    },
    sanitization: sanitized.sanitization,
  });

  return {
    name,
    imported: true,
    expected: expectedFileName,
    html: htmlFileName,
    accessibilityTree: axFileName,
    stepSnapshots: hasStepSnapshots ? stepSnapshotsFileName : "",
    count: voiceOver.announcements?.length || 0,
    sanitizedStatus: sanitized.sanitization.status,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!options.artifactDir) {
    throw new Error("Pass --artifact-dir <path>.");
  }
  if (!existsSync(options.artifactDir)) {
    throw new Error(`${path.relative(repoRoot, options.artifactDir)} was not found.`);
  }

  prepareOutputDir(options.outputDir, options.force);

  const manifests = collectFiles(options.artifactDir, "refinement-manifest.json")
    .sort((left, right) => left.localeCompare(right));
  if (!manifests.length) {
    throw new Error(
      `No refinement-manifest.json files found in ${path.relative(
        repoRoot,
        options.artifactDir,
      )}.`,
    );
  }

  const results = manifests.map((manifestPath) =>
    importFixture({
      manifestPath,
      outputDir: options.outputDir,
      runId: options.runId,
      includeStepSnapshots: options.includeStepSnapshots,
    }),
  );
  const imported = results.filter((result) => result.imported);
  const skipped = results.filter((result) => !result.imported);

  writeJson(path.join(options.outputDir, "index.json"), {
    schemaVersion: 1,
    sourceRunId: options.runId,
    importedAt: new Date().toISOString(),
    cases: imported.map((result) => ({
      name: result.name,
      expected: result.expected,
      html: result.html,
      accessibilityTree: result.accessibilityTree,
      ...(result.stepSnapshots ? { stepSnapshots: result.stepSnapshots } : {}),
      voiceOverAnnouncementCount: result.count,
      sanitizationStatus: result.sanitizedStatus,
    })),
    skipped,
    sanitization: {
      status: "import-sanitized",
      notes: [
        "Raw expectedAnnouncements are preserved in each fixture.",
        "Tests prefer refinedAnnouncements when present.",
        "Fixtures with skipCorpusReason are excluded from opt-in corpus gating until manually refined.",
        "Reduced step-snapshot fixtures are included only when import is run with --include-step-snapshots.",
      ],
    },
  });

  console.log(
    `Imported ${imported.length} VoiceOver fixture(s) to ${path.relative(
      repoRoot,
      options.outputDir,
    )}`,
  );
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} incomplete fixture(s).`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
