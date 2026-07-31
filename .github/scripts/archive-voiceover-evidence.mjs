#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = process.cwd();
const isCli = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

function usage() {
  return [
    "Usage: yarn voiceover:archive-evidence (--run-id <id> | --run-dir <path>) [options]",
    "",
    "Options:",
    "  --output <path>       Archive path (default: voiceover-smoke/evidence-archives/<run>.tar.gz).",
    "  --exclude-artifacts   Archive receipts/sidecars without downloaded _artifacts.",
    "  --check               Print the file manifest without creating an archive.",
    "  --help                Show this help.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    runId: "",
    runDir: "",
    output: "",
    includeArtifacts: true,
    check: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { ...options, help: true };
    if (arg === "--check") {
      options.check = true;
      continue;
    }
    if (arg === "--exclude-artifacts") {
      options.includeArtifacts = false;
      continue;
    }
    const [name, inlineValue] = arg.split("=", 2);
    if (["--run-id", "--run-dir", "--output"].includes(name)) {
      const value = inlineValue ?? argv[index + 1];
      if (inlineValue === undefined) index += 1;
      if (!value) throw new Error(`${name} requires a value`);
      if (name === "--run-id") options.runId = value;
      if (name === "--run-dir") options.runDir = value;
      if (name === "--output") options.output = value;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (Boolean(options.runId) === Boolean(options.runDir)) {
    throw new Error("Use exactly one of --run-id or --run-dir");
  }
  return options;
}

function hashFile(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function listFiles(directory, options, root = directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const filePath = path.join(directory, entry.name);
    const relativePath = path.relative(root, filePath);
    if (
      entry.isDirectory() &&
      entry.name === "_artifacts" &&
      !options.includeArtifacts
    ) {
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...listFiles(filePath, options, root));
      continue;
    }
    if (!entry.isFile()) continue;
    const stats = statSync(filePath);
    files.push({
      path: relativePath,
      bytes: stats.size,
      sha256: hashFile(filePath),
      category: relativePath.split(path.sep).includes("_artifacts")
        ? "raw-artifact"
        : /evidence-packet|_evidence|family-coverage|family-queue/.test(relativePath)
          ? "evidence-sidecar"
          : "receipt-or-summary",
    });
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function gitValue(args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

export function createEvidenceManifest(runDir, options = {}) {
  const files = listFiles(runDir, {
    includeArtifacts: options.includeArtifacts !== false,
  });
  const categoryCounts = {};
  const categoryBytes = {};
  for (const file of files) {
    categoryCounts[file.category] = (categoryCounts[file.category] || 0) + 1;
    categoryBytes[file.category] = (categoryBytes[file.category] || 0) + file.bytes;
  }
  return {
    schemaVersion: 1,
    runId: path.basename(runDir),
    sourceRoot: path.relative(options.repoRoot || repoRoot, runDir),
    includeArtifacts: options.includeArtifacts !== false,
    sourceRevision: {
      branch: options.branch ?? gitValue(["branch", "--show-current"]),
      head: options.head ?? gitValue(["rev-parse", "HEAD"]),
    },
    fileCount: files.length,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
    categoryCounts,
    categoryBytes,
    files,
  };
}

function createArchive(runDir, outputPath) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const result = spawnSync(
    "tar",
    ["-czf", outputPath, "-C", path.dirname(runDir), path.basename(runDir)],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (result.status !== 0 || !existsSync(outputPath)) {
    throw new Error(`tar failed: ${result.stderr || result.stdout}`);
  }
  return {
    path: path.relative(repoRoot, outputPath),
    bytes: statSync(outputPath).size,
    sha256: hashFile(outputPath),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const runDir = options.runDir
    ? path.resolve(repoRoot, options.runDir)
    : path.join(repoRoot, "voiceover-smoke/agent-work", options.runId);
  if (!existsSync(runDir)) throw new Error(`Run directory does not exist: ${runDir}`);
  const manifest = createEvidenceManifest(runDir, {
    includeArtifacts: options.includeArtifacts,
  });
  if (options.check) {
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
    return;
  }
  const outputPath = options.output
    ? path.resolve(repoRoot, options.output)
    : path.join(
        repoRoot,
        "voiceover-smoke/evidence-archives",
        `${manifest.runId}.tar.gz`,
      );
  const archive = createArchive(runDir, outputPath);
  const receipt = {
    ...manifest,
    generatedAt: new Date().toISOString(),
    archive,
    retentionGuidance:
      "Upload the archive and this manifest as a durable CI/review artifact. Commit only canonical code, focused fixtures, and concise indexes unless receipt archival was explicitly requested.",
  };
  const manifestPath = `${outputPath}.manifest.json`;
  writeFileSync(manifestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(path.relative(repoRoot, manifestPath));
}

export { parseArgs };

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
