import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import {
  classifyWindow,
  createSemanticDiagnostics,
  findMismatchWindows,
} from "./voiceover-compare-utils.mjs";

const require = createRequire(import.meta.url);
const {
  createDomScanner,
  generateAnnouncement,
  getContextEndAnnouncement,
} = require("../dist/index.js");

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir =
  process.env.SR_VOICEOVER_FIXTURES_DIR || path.join(testDir, "fixtures/voiceover");
const { fixtureName, contextSize, baselineActualPath, actualOutputPath } = parseArgs(
  process.argv.slice(2),
);

if (!fixtureName) {
  console.error(
    "Usage: node tests/compare-voiceover-fixture.mjs <fixture-name> [context] [--actual-output <path>] [--baseline-actual <path>]",
  );
  process.exit(1);
}

function parseArgs(args) {
  const options = {
    fixtureName: "",
    contextSize: 3,
    baselineActualPath: "",
    actualOutputPath: "",
  };
  const remaining = [...args];
  options.fixtureName = remaining.shift() || "";
  if (remaining[0] && /^\d+$/.test(remaining[0])) {
    options.contextSize = Number.parseInt(remaining.shift(), 10);
  }
  while (remaining.length > 0) {
    const arg = remaining.shift();
    if (arg === "--baseline-actual") {
      options.baselineActualPath = remaining.shift() || "";
      if (!options.baselineActualPath) {
        throw new Error("--baseline-actual requires a JSON path");
      }
      continue;
    }
    if (arg.startsWith("--baseline-actual=")) {
      options.baselineActualPath = arg.slice("--baseline-actual=".length);
      continue;
    }
    if (arg === "--actual-output") {
      options.actualOutputPath = remaining.shift() || "";
      if (!options.actualOutputPath) {
        throw new Error("--actual-output requires a JSON path");
      }
      continue;
    }
    if (arg.startsWith("--actual-output=")) {
      options.actualOutputPath = arg.slice("--actual-output=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function escapeCssIdentifier(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => {
    const hex = character.codePointAt(0).toString(16);
    return `\\${hex} `;
  });
}

function scanHtml(html, accessibilityTree) {
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

  globalThis.CSS = css;
  globalThis.document = dom.window.document;
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;

  try {
    const scanner = createDomScanner({
      generateAnnouncement,
      getContextEndAnnouncement,
      accessibilityTree,
    });
    return scanner.scanSubtree(dom.window.document.body).map((entry) => entry.announcement);
  } finally {
    restoreGlobal("document", previousDocument);
    restoreGlobal("CSS", previousCSS);
    restoreGlobal("getComputedStyle", previousGetComputedStyle);
    restoreGlobal("HTMLElement", previousHTMLElement);
    restoreGlobal("Node", previousNode);
  }
}

function restoreGlobal(name, previousValue) {
  if (previousValue === undefined) {
    delete globalThis[name];
  } else {
    globalThis[name] = previousValue;
  }
}

const expectedPath = path.join(fixturesDir, `${fixtureName}.expected.json`);
if (!existsSync(expectedPath)) {
  console.error(`Fixture not found: ${expectedPath}`);
  process.exit(1);
}

const fixture = readJson(expectedPath);
const html = readFileSync(path.join(fixturesDir, fixture.html), "utf8");
const accessibilityTree = fixture.accessibilityTree
  ? readJson(path.join(fixturesDir, fixture.accessibilityTree))
  : undefined;
const expected = fixture.refinedAnnouncements || fixture.expectedAnnouncements;
const actual = scanHtml(html, accessibilityTree);
if (actualOutputPath) {
  writeFileSync(
    path.resolve(actualOutputPath),
    `${JSON.stringify(
      {
        fixture: fixture.name,
        sourceRunId: fixture.sourceRunId,
        announcements: actual,
      },
      null,
      2,
    )}\n`,
  );
}
const windows = findMismatchWindows(actual, expected, contextSize);
const grouped = windows.reduce((result, window) => {
  const key = classifyWindow(window);
  result[key] = (result[key] || 0) + 1;
  return result;
}, {});
let baselineActual = null;
let baselineMismatchWindowCount = null;
if (baselineActualPath) {
  const baselineValue = readJson(path.resolve(baselineActualPath));
  baselineActual = Array.isArray(baselineValue)
    ? baselineValue
    : baselineValue.announcements;
  if (!Array.isArray(baselineActual)) {
    throw new Error(
      "Baseline JSON must be an announcement array or an object with announcements.",
    );
  }
  baselineMismatchWindowCount = findMismatchWindows(
    baselineActual,
    expected,
    contextSize,
  ).length;
}
const semanticDiagnostics = createSemanticDiagnostics({
  actual,
  expected,
  mismatchWindowCount: windows.length,
  baselineActual,
  baselineMismatchWindowCount,
});

console.log(
  JSON.stringify(
    {
      fixture: fixture.name,
      sourceRunId: fixture.sourceRunId,
      expectedCount: expected.length,
      actualCount: actual.length,
      mismatchWindowCount: windows.length,
      grouped,
      semanticDiagnostics,
      windows: windows.slice(0, 20),
      truncated: windows.length > 20,
    },
    null,
    2,
  ),
);
