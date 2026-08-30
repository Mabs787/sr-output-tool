import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const chromeFixturesRoot = path.join(repoRoot, "packages/sr-engine/tests/fixtures/voiceover");
const manifest = JSON.parse(readFileSync(path.join(packageRoot, "fixtures/benchmark-manifest.json"), "utf8"));
const evidenceCost = JSON.parse(readFileSync(path.join(packageRoot, "fixtures/evidence-cost.json"), "utf8"));
const refinementManifest = JSON.parse(readFileSync(path.join(chromeFixturesRoot, "refinement-manifest.json"), "utf8"));
const safariEngine = require(path.join(packageRoot, "dist/index.js"));
const chromeEngine = require(path.join(repoRoot, "packages/sr-engine/dist/index.js"));

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] || 0;
}

function withDom(html, callback) {
  const dom = new JSDOM(html);
  const previous = {};
  for (const key of ["CSS", "Document", "HTMLElement", "Node", "NodeFilter", "document", "getComputedStyle"]) {
    previous[key] = globalThis[key];
  }
  const css = dom.window.CSS || {};
  if (typeof css.escape !== "function") css.escape = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
  globalThis.CSS = css;
  globalThis.Document = dom.window.Document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  globalThis.NodeFilter = dom.window.NodeFilter;
  globalThis.document = dom.window.document;
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  try {
    return callback(dom.window.document);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
    dom.window.close();
  }
}

function scanSafari(html) {
  return withDom(html, (document) => safariEngine.createSafariDomScanner({ root: document.body }).scan());
}

function scanChrome(html, accessibilityTree) {
  return withDom(html, (document) => {
    const scanner = chromeEngine.createDomScanner({
      generateAnnouncement: chromeEngine.generateAnnouncement,
      getContextEndAnnouncement: chromeEngine.getContextEndAnnouncement,
      accessibilityTree,
    });
    const entries = scanner.scanSubtree(document.body);
    return { announcements: entries.map((entry) => entry.announcement), candidates: [] };
  });
}

function multisetDifference(left, right) {
  const counts = new Map();
  for (const value of right) counts.set(value, (counts.get(value) || 0) + 1);
  const result = [];
  for (const value of left) {
    const count = counts.get(value) || 0;
    if (count) counts.set(value, count - 1);
    else result.push(value);
  }
  return result;
}

function compare(actual, expected) {
  const max = Math.max(actual.length, expected.length);
  const mismatches = [];
  for (let index = 0; index < max; index += 1) {
    if (actual[index] !== expected[index]) mismatches.push(index);
  }
  const windows = [];
  for (const index of mismatches) {
    const previous = windows.at(-1);
    if (previous && index <= previous.end + 1) previous.end = index;
    else windows.push({ start: index, end: index });
  }
  const missing = multisetDifference(expected, actual);
  const extra = multisetDifference(actual, expected);
  return {
    exact: mismatches.length === 0,
    expectedCount: expected.length,
    actualCount: actual.length,
    firstMismatchIndex: mismatches[0] ?? -1,
    mismatchWindows: windows,
    mismatchWindowDetails: windows.map((window) => ({
      ...window,
      expected: expected.slice(Math.max(0, window.start - 2), window.end + 3),
      actual: actual.slice(Math.max(0, window.start - 2), window.end + 3),
    })),
    missing,
    extra,
    reordered: mismatches.length > 0 && missing.length === 0 && extra.length === 0,
  };
}

function loadAssembledFixture(browser, name) {
  const directory = path.join(packageRoot, "fixtures", browser === "safari" ? "safari" : "chrome-fresh");
  const fixturePath = path.join(directory, `${name}.fixture.json`);
  if (!existsSync(fixturePath)) return null;
  const fixture = readJson(fixturePath);
  const representativeCandidateRun = fixture.rawRuns?.find(
    (run) => run.markers?.startReached && run.markers?.endReached && !run.errors?.length,
  );
  return {
    browser,
    status: fixture.status,
    statusReason: fixture.trustReasons?.join("; ") || "three-run trust gate passed",
    expected:
      fixture.expectedAnnouncements?.length
        ? fixture.expectedAnnouncements
        : representativeCandidateRun?.announcements || fixture.candidateRuns?.[0] || [],
    html: readFileSync(path.join(directory, fixture.html), "utf8"),
    accessibilityTree: null,
    source: path.relative(repoRoot, fixturePath),
  };
}

function loadExistingChromeFixture(target) {
  const name = target.chromeFixture;
  const expectedPath = path.join(chromeFixturesRoot, `${name}.expected.json`);
  const htmlPath = path.join(chromeFixturesRoot, `${name}.html`);
  if (!existsSync(expectedPath) || !existsSync(htmlPath)) return null;
  const fixture = readJson(expectedPath);
  const statusEntry = refinementManifest.cases?.[name] || {};
  const axPath = fixture.accessibilityTree ? path.join(chromeFixturesRoot, fixture.accessibilityTree) : "";
  return {
    browser: "chrome",
    status: statusEntry.status || refinementManifest.defaultStatus || "candidate",
    statusReason: statusEntry.reason || "existing Chrome corpus fixture",
    expected: fixture.refinedAnnouncements || fixture.expectedAnnouncements || [],
    html: readFileSync(htmlPath, "utf8"),
    accessibilityTree: axPath && existsSync(axPath) ? readJson(axPath) : null,
    source: path.relative(repoRoot, expectedPath),
  };
}

function evaluateEngine(engine, corpus) {
  const durations = [];
  let result;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const started = performance.now();
    result = engine === "safari"
      ? scanSafari(corpus.html)
      : scanChrome(corpus.html, corpus.accessibilityTree);
    durations.push(performance.now() - started);
  }
  const comparison = compare(result.announcements, corpus.expected);
  const candidates = result.candidates || [];
  return {
    ...comparison,
    engine,
    corpusBrowser: corpus.browser,
    corpusStatus: corpus.status,
    corpusSource: corpus.source,
    uncoveredCandidates: candidates.filter((candidate) => candidate.disposition === "uncovered").length,
    duplicateCandidates: candidates.filter((candidate) => candidate.disposition === "duplicate").length,
    dispositionCounts: candidates.reduce((counts, candidate) => {
      counts[candidate.disposition] = (counts[candidate.disposition] || 0) + 1;
      return counts;
    }, {}),
    runtimeMs: {
      median: Number(percentile(durations, 0.5).toFixed(3)),
      p95: Number(percentile(durations, 0.95).toFixed(3)),
    },
  };
}

function recommendation(rows, pendingSafariTargets) {
  if (pendingSafariTargets.length) {
    return {
      outcome: "continue the independent Safari engine",
      reason: `Evidence collection is incomplete for ${pendingSafariTargets.length} target(s); no production conclusion is warranted yet.`,
    };
  }
  const safariOwn = rows.filter((row) => row.engine === "safari" && row.corpusBrowser === "safari" && ["trusted", "refined"].includes(row.corpusStatus));
  const exactRate = safariOwn.length ? safariOwn.filter((row) => row.exact).length / safariOwn.length : 0;
  const duplicates = safariOwn.reduce((total, row) => total + row.duplicateCandidates, 0);
  const uncovered = safariOwn.reduce((total, row) => total + row.uncoveredCandidates, 0);
  if (safariOwn.length >= 4 && exactRate >= 0.75 && duplicates === 0 && uncovered === 0) {
    return { outcome: "continue the independent Safari engine", reason: "Safari-own fidelity and coverage accounting are strong enough for a larger frozen holdout." };
  }
  if (safariOwn.some((row) => row.dispositionCounts.consumed > 0) && uncovered === 0) {
    return { outcome: "transfer specific proven mechanisms", reason: "The ownership ledger is useful, but announcement fidelity does not justify replacing the Chrome engine." };
  }
  return { outcome: "stop the experiment", reason: "The independent engine did not demonstrate reliable Safari-own fidelity or complete coverage accounting." };
}

function markdownReport(report) {
  const lines = [
    "# Safari vs Chrome Engine Experiment",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Outcome: **${report.recommendation.outcome}**`,
    "",
    report.recommendation.reason,
    "",
    `Safari engine freeze: \`${report.evidenceCost.engineFreezeCommit}\``,
    "",
    "The comparison keeps browser evidence and engine implementation separate. Reduced Safari context is not treated as inherently better than Chrome context.",
    "",
    "## Key findings",
    "",
    ...report.findings.map((finding) => `- ${finding}`),
    "",
    "## Evidence status",
    "",
    `Trusted Safari targets: ${report.trustedSafariTargets.length ? report.trustedSafariTargets.join(", ") : "none"}`,
    "",
    `Candidate Safari targets: ${report.candidateSafariTargets.length ? report.candidateSafariTargets.join(", ") : "none"}`,
    "",
    `Trusted Chrome targets: ${report.trustedChromeTargets.length ? report.trustedChromeTargets.join(", ") : "none"}`,
    "",
    `Candidate Chrome targets: ${report.candidateChromeTargets.length ? report.candidateChromeTargets.join(", ") : "none"}`,
    "",
    `Safari targets pending three-run trust: ${report.pendingSafariTargets.length ? report.pendingSafariTargets.join(", ") : "none"}`,
    "",
    "## Evidence cost",
    "",
    "| Browser | Attempts | Successful | Failed | Stable targets | Median job | p95 job | Manual refinement in fresh matrix |",
    "|---|---:|---:|---:|---:|---:|---:|---|",
    `| Safari | ${report.evidenceCost.safari.attempts} | ${report.evidenceCost.safari.successes} | ${report.evidenceCost.safari.failures} | ${report.evidenceCost.safari.stableTargets}/${report.evidenceCost.safari.totalTargets} | ${report.evidenceCost.safari.medianJobSeconds}s | ${report.evidenceCost.safari.p95JobSeconds}s | ${report.evidenceCost.manualRefinement.safariMatrix ? "yes" : "no"} |`,
    `| Chrome | ${report.evidenceCost.chrome.attempts} | ${report.evidenceCost.chrome.successes} | ${report.evidenceCost.chrome.failures} | ${report.evidenceCost.chrome.stableTargets}/${report.evidenceCost.chrome.totalTargets} | ${report.evidenceCost.chrome.medianJobSeconds}s | ${report.evidenceCost.chrome.p95JobSeconds}s | ${report.evidenceCost.manualRefinement.chromeFreshMatrix ? "yes" : "no"} |`,
    "",
    `Safari canary: ${report.evidenceCost.canary.successes}/${report.evidenceCost.canary.attempts} successful. Historical Chrome corpus fixtures may still contain manually refined expectations; the fresh comparison matrix does not.`,
    "",
    "## Two-by-two results",
    "",
    "| Target | Use | Engine | Corpus | Corpus status | Exact | Missing | Extra | Windows | Uncovered | Duplicates | Median ms | p95 ms |",
    "|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  ];
  for (const row of report.rows) {
    lines.push(`| ${row.target} | ${row.use} | ${row.engine} | ${row.corpusBrowser} | ${row.corpusStatus} | ${row.exact ? "yes" : "no"} | ${row.missing.length} | ${row.extra.length} | ${row.mismatchWindows.length} | ${row.uncoveredCandidates} | ${row.duplicateCandidates} | ${row.runtimeMs.median} | ${row.runtimeMs.p95} |`);
  }
  lines.push("", "## Interpretation rules", "", "- Trusted/refined rows are gates; candidate rows are informational.", "- Own-browser rows measure fidelity to each engine's evidence source.", "- Cross-browser rows help separate engine rules from browser DOM and VoiceOver differences.", "- The Safari package remains experimental and is not connected to the extension.", "");
  return lines.join("\n");
}

function main() {
  const rows = [];
  const pendingSafariTargets = [];
  const trustedSafariTargets = [];
  const candidateSafariTargets = [];
  const trustedChromeTargets = [];
  const candidateChromeTargets = [];
  for (const target of manifest.targets) {
    const safariCorpus = loadAssembledFixture("safari", target.name);
    const chromeCorpus = loadAssembledFixture("chrome", target.name) || loadExistingChromeFixture(target);
    if (!safariCorpus) pendingSafariTargets.push(target.name);
    else if (safariCorpus.status === "trusted") trustedSafariTargets.push(target.name);
    else candidateSafariTargets.push(target.name);
    if (chromeCorpus && ["trusted", "refined"].includes(chromeCorpus.status)) trustedChromeTargets.push(target.name);
    else if (chromeCorpus) candidateChromeTargets.push(target.name);
    for (const corpus of [safariCorpus, chromeCorpus].filter(Boolean)) {
      if (!corpus.expected.length) continue;
      for (const engine of ["safari", "chrome"]) {
        try {
          rows.push({ target: target.name, use: target.use, ...evaluateEngine(engine, corpus) });
        } catch (error) {
          rows.push({
            target: target.name,
            use: target.use,
            engine,
            corpusBrowser: corpus.browser,
            corpusStatus: corpus.status,
            corpusSource: corpus.source,
            exact: false,
            expectedCount: corpus.expected.length,
            actualCount: 0,
            firstMismatchIndex: 0,
            mismatchWindows: [{ start: 0, end: corpus.expected.length - 1 }],
            missing: corpus.expected,
            extra: [],
            reordered: false,
            uncoveredCandidates: 0,
            duplicateCandidates: 0,
            dispositionCounts: {},
            runtimeMs: { median: 0, p95: 0 },
            error: error?.stack || error?.message || String(error),
          });
        }
      }
    }
  }
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    matrix: "own-oracle-plus-cross-browser",
    pendingSafariTargets,
    trustedSafariTargets,
    candidateSafariTargets,
    trustedChromeTargets,
    candidateChromeTargets,
    evidenceCost: {
      requiredRunsPerBrowserPerTarget: manifest.browserSettings.repeatRuns,
      ...evidenceCost,
    },
    findings: [
      "Safari produced trusted three-run evidence for 1 of 6 targets; Chrome produced trusted evidence for 3 of 6.",
      "Two complete Safari Sky runs announced two prices but omitted the Samsung £38 price, so direct VoiceOver capture does not guarantee text coverage.",
      "The Safari engine did not exactly match its only trusted Safari corpus; the Chrome engine also did not exactly match any trusted fresh Chrome corpus.",
      "Safari capture was much faster, but 5 of 22 matrix attempts failed; all 18 Chrome attempts succeeded at substantially higher median and p95 cost.",
      "The ownership ledger is useful, but W3C retained uncovered and duplicate candidates, while Apple retained uncovered candidates.",
      "No production engine, extension, permission, or public API was changed by this experiment."
    ],
    rows,
  };
  report.recommendation = recommendation(rows, pendingSafariTargets);
  const reportsRoot = path.join(packageRoot, "reports");
  mkdirSync(reportsRoot, { recursive: true });
  writeFileSync(path.join(reportsRoot, "safari-vs-chrome.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(path.join(reportsRoot, "safari-vs-chrome.md"), markdownReport(report));
  console.log(`Wrote ${rows.length} matrix row(s); ${pendingSafariTargets.length} Safari target(s) pending.`);
}

main();
