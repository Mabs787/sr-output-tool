import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessSafariCaptureTrust } from "../../../.github/scripts/run-safari-voiceover-scan.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const result = { browser: "", name: "", runs: [], outputRoot: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--browser") result.browser = argv[++index] || "";
    else if (value === "--name") result.name = argv[++index] || "";
    else if (value === "--run") result.runs.push(path.resolve(argv[++index] || ""));
    else if (value === "--output-root") result.outputRoot = path.resolve(argv[++index] || "");
    else throw new Error(`Unknown argument: ${value}`);
  }
  return result;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function locateScanDirectory(runRoot, name, browser) {
  const candidates = [
    runRoot,
    path.join(runRoot, browser === "safari" ? "safari-scans" : "scans", name),
    path.join(runRoot, "voiceover-smoke", browser === "safari" ? "safari-scans" : "scans", name),
  ];
  const match = candidates.find((candidate) => existsSync(path.join(candidate, "voiceover-output.json")));
  if (!match) throw new Error(`Could not locate ${browser} output for ${name} under ${runRoot}`);
  return match;
}

function hash(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function readRun(runRoot, name, browser) {
  const directory = locateScanDirectory(runRoot, name, browser);
  const output = readJson(path.join(directory, "voiceover-output.json"));
  const sourcePath = path.join(directory, "voiceover-sources.json");
  const sourcesFile = existsSync(sourcePath) ? readJson(sourcePath) : { steps: [] };
  const debugPath = path.join(directory, "scan-debug.json");
  const debug = existsSync(debugPath) ? readJson(debugPath) : {};
  const capturePath = path.join(directory, "capture-manifest.json");
  const capture = existsSync(capturePath) ? readJson(capturePath) : {};
  const htmlPath = path.join(directory, "rendered-html.html");
  const html = readFileSync(htmlPath, "utf8");
  const sources = browser === "safari"
    ? (sourcesFile.sources || sourcesFile.steps?.map((step) => step.selected?.source).filter(Boolean) || [])
    : [output.normalization || "chrome-caption"];
  const markers = output.markers || debug.markers || {
    startReached: !output.partial,
    endReached: debug.stopReason === "scan-end-marker" || !output.partial,
  };
  return {
    directory,
    announcements: output.announcements || [],
    sources,
    markers,
    errors: debug.errors || (output.partial ? ["partial capture"] : []),
    semanticFingerprint: capture.semanticFingerprint || hash(html.replace(/\s+/g, " ")),
    html,
    environment: existsSync(path.join(directory, "runner-environment.json"))
      ? readJson(path.join(directory, "runner-environment.json"))
      : {},
  };
}

function assessChromeTrust(runs) {
  const reasons = [];
  if (runs.length !== 3) reasons.push("exactly three runs are required");
  if (runs.some((run) => run.errors.length)) reasons.push("one or more Chrome runs is partial or failed");
  if (runs.length === 3 && new Set(runs.map((run) => JSON.stringify(run.announcements))).size !== 1) {
    reasons.push("ordered announcements differ between runs");
  }
  return { trusted: reasons.length === 0, status: reasons.length ? "candidate" : "trusted", reasons };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.name) throw new Error("--name is required");
  if (!['safari', 'chrome'].includes(options.browser)) throw new Error("--browser must be safari or chrome");
  if (options.runs.length !== 3) throw new Error("Provide exactly three --run paths");
  const runs = options.runs.map((runRoot) => readRun(runRoot, options.name, options.browser));
  const trust = options.browser === "safari" ? assessSafariCaptureTrust(runs) : assessChromeTrust(runs);
  const outputRoot = options.outputRoot || path.join(packageRoot, "fixtures", options.browser === "safari" ? "safari" : "chrome-fresh");
  mkdirSync(outputRoot, { recursive: true });
  const htmlFileName = `${options.name}.html`;
  copyFileSync(path.join(runs[0].directory, "rendered-html.html"), path.join(outputRoot, htmlFileName));
  const fixture = {
    schemaVersion: 1,
    name: options.name,
    browserProfile: options.browser === "safari" ? "safari-voiceover" : "chrome-voiceover",
    status: trust.status,
    trustReasons: trust.reasons,
    html: htmlFileName,
    expectedAnnouncements: trust.trusted ? runs[0].announcements : [],
    candidateRuns: trust.trusted ? undefined : runs.map((run) => run.announcements),
    rawRuns: runs.map((run, index) => ({
      run: index + 1,
      announcements: run.announcements,
      sources: run.sources,
      markers: run.markers,
      errors: run.errors,
      semanticFingerprint: hash(run.semanticFingerprint),
      environment: run.environment,
    })),
  };
  writeFileSync(path.join(outputRoot, `${options.name}.fixture.json`), `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(`${options.browser} ${options.name}: ${trust.status}${trust.reasons.length ? ` (${trust.reasons.join("; ")})` : ""}`);
}

main();
