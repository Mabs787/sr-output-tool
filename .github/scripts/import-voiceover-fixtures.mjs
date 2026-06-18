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

function importFixture({ manifestPath, outputDir, runId }) {
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
  const htmlFileName = `${name}.html`;
  const axFileName = `${name}.ax.json`;
  const expectedFileName = `${name}.expected.json`;

  copyFileSync(renderedHtmlPath, path.join(outputDir, htmlFileName));
  writeJson(path.join(outputDir, axFileName), accessibilityTree);
  writeJson(path.join(outputDir, expectedFileName), {
    schemaVersion: 1,
    name,
    url: manifest.target?.url || "",
    sourceRunId: runId,
    html: htmlFileName,
    accessibilityTree: axFileName,
    expectedAnnouncements: voiceOver.announcements || [],
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
  });

  return {
    name,
    imported: true,
    expected: expectedFileName,
    html: htmlFileName,
    accessibilityTree: axFileName,
    count: voiceOver.announcements?.length || 0,
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
      voiceOverAnnouncementCount: result.count,
    })),
    skipped,
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
