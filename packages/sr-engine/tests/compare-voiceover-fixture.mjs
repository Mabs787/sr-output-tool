import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const {
  createDomScanner,
  generateAnnouncement,
  getContextEndAnnouncement,
} = require("../dist/index.js");

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(testDir, "fixtures/voiceover");
const fixtureName = process.argv[2];
const contextSize = Number.parseInt(process.argv[3] || "3", 10);

if (!fixtureName) {
  console.error("Usage: node tests/compare-voiceover-fixture.mjs <fixture-name> [context]");
  process.exit(1);
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

function scanHtml(html) {
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

function findMismatchWindows(actual, expected) {
  const windows = [];
  let actualIndex = 0;
  let expectedIndex = 0;

  while (actualIndex < actual.length || expectedIndex < expected.length) {
    if (actual[actualIndex] === expected[expectedIndex]) {
      actualIndex += 1;
      expectedIndex += 1;
      continue;
    }

    const firstActualIndex = actualIndex;
    const firstExpectedIndex = expectedIndex;
    const nextMatch = findNextSyncPoint(actual, expected, actualIndex, expectedIndex);

    windows.push({
      index: windows.length + 1,
      actualIndex: firstActualIndex,
      expectedIndex: firstExpectedIndex,
      actual: actual.slice(
        Math.max(0, firstActualIndex - contextSize),
        Math.min(actual.length, nextMatch.actualIndex + contextSize),
      ),
      expected: expected.slice(
        Math.max(0, firstExpectedIndex - contextSize),
        Math.min(expected.length, nextMatch.expectedIndex + contextSize),
      ),
      firstActual: actual[firstActualIndex] ?? null,
      firstExpected: expected[firstExpectedIndex] ?? null,
    });

    actualIndex = nextMatch.actualIndex;
    expectedIndex = nextMatch.expectedIndex;
  }

  return windows;
}

function findNextSyncPoint(actual, expected, actualIndex, expectedIndex) {
  const maxLookahead = 30;

  for (let offset = 1; offset <= maxLookahead; offset += 1) {
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

function classifyWindow(window) {
  const text = [...window.actual, ...window.expected].join("\n");
  if (/^•|,\s*\d+ of \d+|list \d+ items/.test(text)) return "list/marker";
  if (/[()".,]$|^\W+$/.test(text)) return "punctuation/text-boundary";
  if (/link,|button|navigation|group/.test(text)) return "role/structure";
  return "text";
}

const expectedPath = path.join(fixturesDir, `${fixtureName}.expected.json`);
if (!existsSync(expectedPath)) {
  console.error(`Fixture not found: ${expectedPath}`);
  process.exit(1);
}

const fixture = readJson(expectedPath);
const html = readFileSync(path.join(fixturesDir, fixture.html), "utf8");
const expected = fixture.refinedAnnouncements || fixture.expectedAnnouncements;
const actual = scanHtml(html);
const windows = findMismatchWindows(actual, expected);
const grouped = windows.reduce((result, window) => {
  const key = classifyWindow(window);
  result[key] = (result[key] || 0) + 1;
  return result;
}, {});

console.log(
  JSON.stringify(
    {
      fixture: fixture.name,
      sourceRunId: fixture.sourceRunId,
      expectedCount: expected.length,
      actualCount: actual.length,
      mismatchWindowCount: windows.length,
      grouped,
      windows: windows.slice(0, 20),
      truncated: windows.length > 20,
    },
    null,
    2,
  ),
);
