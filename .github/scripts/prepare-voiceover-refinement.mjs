import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const defaultArtifactDir = path.join(repoRoot, "voiceover-scan-artifacts");
const defaultWorkflow = "VoiceOver scan";
const defaultBranch = "main";

function parseArgs(argv) {
  const options = {
    artifactDir: defaultArtifactDir,
    branch: defaultBranch,
    downloadLatest: false,
    force: false,
    json: false,
    workflow: defaultWorkflow,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--artifact-dir") {
      options.artifactDir = path.resolve(repoRoot, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--branch") {
      options.branch = argv[index + 1] || defaultBranch;
      index += 1;
    } else if (arg === "--download-latest") {
      options.downloadLatest = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--workflow") {
      options.workflow = argv[index + 1] || defaultWorkflow;
      index += 1;
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
  node .github/scripts/prepare-voiceover-refinement.mjs [options]

Options:
  --artifact-dir <path>   Diagnostics folder to inspect. Defaults to ./voiceover-scan-artifacts
  --download-latest       Download all artifacts from the latest successful VoiceOver scan run with gh
  --workflow <name>       Workflow name for --download-latest. Defaults to "VoiceOver scan"
  --branch <name>         Branch for --download-latest. Defaults to main
  --force                 Replace the artifact directory when downloading
  --json                  Print the refinement queue as JSON
  --help                  Show this help
`);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
    error: result.error ? String(result.error.message || result.error) : "",
  };
}

function requireCommand(command) {
  const result = run(command, ["--version"]);
  if (!result.ok) {
    throw new Error(
      `${command} is not available. Install and authenticate GitHub CLI before using --download-latest.`,
    );
  }
}

function downloadLatestArtifact(options) {
  requireCommand("gh");

  if (existsSync(options.artifactDir)) {
    if (!options.force) {
      throw new Error(
        `${path.relative(repoRoot, options.artifactDir)} already exists. Pass --force to replace it.`,
      );
    }
    rmSync(options.artifactDir, { recursive: true, force: true });
  }

  mkdirSync(options.artifactDir, { recursive: true });

  const listResult = run("gh", [
    "run",
    "list",
    "--workflow",
    options.workflow,
    "--branch",
    options.branch,
    "--status",
    "success",
    "--limit",
    "1",
    "--json",
    "databaseId,createdAt,conclusion,headBranch,status,url",
  ]);

  if (!listResult.ok) {
    throw new Error(listResult.stderr || listResult.error || "Unable to list workflow runs.");
  }

  const runs = JSON.parse(listResult.stdout || "[]");
  const latestRun = runs[0];
  if (!latestRun) {
    throw new Error(
      `No successful "${options.workflow}" workflow runs found on ${options.branch}.`,
    );
  }

  const downloadResult = run("gh", [
    "run",
    "download",
    String(latestRun.databaseId),
    "--dir",
    options.artifactDir,
  ]);

  if (!downloadResult.ok) {
    throw new Error(
      downloadResult.stderr || downloadResult.error || "Unable to download workflow artifact.",
    );
  }

  return latestRun;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
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

function getScanManifests(artifactDir) {
  if (!existsSync(artifactDir)) {
    throw new Error(`${path.relative(repoRoot, artifactDir)} was not found.`);
  }

  const manifests = collectFiles(artifactDir, "refinement-manifest.json")
    .map((manifestPath) => ({
      name: path.basename(path.dirname(manifestPath)),
      manifestPath,
      scanDir: path.dirname(manifestPath),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (!manifests.length) {
    throw new Error(
      `No refinement-manifest.json files were found in ${path.relative(repoRoot, artifactDir)}.`,
    );
  }

  return manifests;
}

function buildQueue(artifactDir) {
  return getScanManifests(artifactDir).map(({ name, manifestPath, scanDir }) => {
    const manifest = readJson(manifestPath);
    const voiceOverPath = resolveManifestFile(scanDir, manifest, "voiceOverOutput");
    const renderedHtmlPath = resolveManifestFile(scanDir, manifest, "renderedHtml");
    const accessibilityTreePath = resolveManifestFile(
      scanDir,
      manifest,
      "accessibilityTree",
    );
    const scanDebugPath = resolveManifestFile(scanDir, manifest, "scanDebug");
    const voiceOverOutput = existsSync(voiceOverPath)
      ? readJson(voiceOverPath).announcements || []
      : [];
    const requiredFiles = [
      voiceOverPath,
      renderedHtmlPath,
      accessibilityTreePath,
      scanDebugPath,
    ];
    const missingFiles = requiredFiles.filter((filePath) => !existsSync(filePath));
    const skipReasons = [];

    if (missingFiles.length) {
      skipReasons.push(
        `Missing artifact file(s): ${missingFiles
          .map((filePath) => path.relative(scanDir, filePath))
          .join(", ")}.`,
      );
    }
    if (manifest.scan?.stopReason !== "scan-end-marker") {
      skipReasons.push(
        `Scan stop reason was ${manifest.scan?.stopReason || "unknown"}.`,
      );
    }
    if (!voiceOverOutput.length) {
      skipReasons.push("VoiceOver output is empty.");
    }

    return {
      name,
      manifestPath: path.relative(repoRoot, manifestPath),
      scanDir: path.relative(repoRoot, scanDir),
      files: Object.fromEntries(
        Object.entries(manifest.files || {}).map(([key, filePath]) => [
          key,
          path.relative(repoRoot, path.join(scanDir, filePath)),
        ]),
      ),
      eligible: skipReasons.length === 0,
      skipReasons,
      voiceOverCount: voiceOverOutput.length,
      manifest,
    };
  });
}

function printQueue(queue, downloadRun) {
  if (downloadRun) {
    console.log(
      `Downloaded VoiceOver scan artifacts from ${downloadRun.url} (${downloadRun.createdAt})`,
    );
    console.log("");
  }

  const eligible = queue.filter((item) => item.eligible);
  const skipped = queue.filter((item) => !item.eligible);
  console.log(`VoiceOver refinement queue: ${eligible.length} eligible, ${skipped.length} skipped`);
  console.log("");

  for (const item of queue) {
    const status = item.eligible ? "eligible" : "skipped";
    console.log(`${item.name}: ${status}`);
    console.log(`  manifest: ${item.manifestPath}`);
    console.log(`  count: VoiceOver ${item.voiceOverCount}`);

    if (item.skipReasons.length) {
      console.log(`  skip: ${item.skipReasons.join("; ")}`);
    }
    console.log("");
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const downloadRun = options.downloadLatest
    ? downloadLatestArtifact(options)
    : null;
  const queue = buildQueue(options.artifactDir);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          artifactDir: path.relative(repoRoot, options.artifactDir),
          downloadRun,
          queue,
        },
        null,
        2,
      ),
    );
    return;
  }

  printQueue(queue, downloadRun);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
