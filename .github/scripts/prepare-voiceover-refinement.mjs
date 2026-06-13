import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { analyzeMismatches } from "./voiceover-refinement-analysis.mjs";

const repoRoot = process.cwd();
const defaultArtifactDir = path.join(repoRoot, "voiceover-smoke-diagnostics");
const defaultWorkflow = "VoiceOver smoke";
const defaultBranch = "main";
const artifactName = "voiceover-smoke-diagnostics";

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
  --artifact-dir <path>   Diagnostics folder to inspect. Defaults to ./voiceover-smoke-diagnostics
  --download-latest       Download the latest successful VoiceOver smoke artifact with gh
  --workflow <name>       Workflow name for --download-latest. Defaults to "VoiceOver smoke"
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
    "--name",
    artifactName,
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

function getScanNames(artifactDir) {
  const scansDir = path.join(artifactDir, "scans");
  if (!existsSync(scansDir)) {
    throw new Error(`${path.relative(repoRoot, scansDir)} was not found.`);
  }

  return readdirSync(scansDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((filePath) => ({
      name: filePath.name,
      payloadPath: path.join(scansDir, filePath.name, "ai-refinement-input.json"),
    }))
    .filter((scan) => existsSync(scan.payloadPath))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function buildQueue(artifactDir) {
  return getScanNames(artifactDir).map(({ name, payloadPath }) => {
    const payload = readJson(payloadPath);
    const voiceOverOutput = payload.voiceOverOutput || [];
    const engineOutput = payload.engineOutput || [];
    return {
      name,
      payloadPath: path.relative(repoRoot, payloadPath),
      eligible: Boolean(payload.refinement?.eligible),
      skipReasons: payload.refinement?.skipReasons || [],
      voiceOverCount: voiceOverOutput.length,
      engineCount: engineOutput.length,
      mismatch: analyzeMismatches(voiceOverOutput, engineOutput),
      payload,
    };
  });
}

function printQueue(queue, downloadRun) {
  if (downloadRun) {
    console.log(
      `Downloaded ${artifactName} from ${downloadRun.url} (${downloadRun.createdAt})`,
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
    console.log(`  payload: ${item.payloadPath}`);
    console.log(`  counts: VoiceOver ${item.voiceOverCount}, engine ${item.engineCount}`);

    if (item.skipReasons.length) {
      console.log(`  skip: ${item.skipReasons.join("; ")}`);
    }

    if (item.eligible) {
      console.log(`  mismatches: ${item.mismatch.count}`);
      console.log(`  high-confidence hints: ${item.mismatch.highConfidenceCount}`);
      console.log(`  low-confidence hints: ${item.mismatch.lowConfidenceCount}`);
      if (item.mismatch.firstHighConfidence) {
        console.log(`  first high-confidence hint #${item.mismatch.firstHighConfidence.index}`);
        console.log(
          `    type: ${item.mismatch.firstHighConfidence.type} (${item.mismatch.firstHighConfidence.confidence})`,
        );
        console.log(
          `    VoiceOver: ${item.mismatch.firstHighConfidence.voiceOver || "(none)"}`,
        );
        console.log(
          `    Engine:    ${item.mismatch.firstHighConfidence.engine || "(none)"}`,
        );
      } else if (item.mismatch.first) {
        console.log(`  first mismatch #${item.mismatch.first.index}`);
        console.log(
          `    type: ${item.mismatch.first.type} (${item.mismatch.first.confidence})`,
        );
        console.log(`    VoiceOver: ${item.mismatch.first.voiceOver || "(none)"}`);
        console.log(`    Engine:    ${item.mismatch.first.engine || "(none)"}`);
      }
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
