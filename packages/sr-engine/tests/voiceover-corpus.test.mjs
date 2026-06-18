import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
const shouldRun = process.env.SR_VOICEOVER_CORPUS_TESTS === "true";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function escapeCssIdentifier(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => {
    const hex = character.codePointAt(0).toString(16);
    return `\\${hex} `;
  });
}

function getCases() {
  if (!existsSync(fixturesDir)) {
    return [];
  }

  return readdirSync(fixturesDir)
    .filter((fileName) => fileName.endsWith(".expected.json"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => readJson(path.join(fixturesDir, fileName)));
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
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }

    if (previousCSS === undefined) {
      delete globalThis.CSS;
    } else {
      globalThis.CSS = previousCSS;
    }

    if (previousGetComputedStyle === undefined) {
      delete globalThis.getComputedStyle;
    } else {
      globalThis.getComputedStyle = previousGetComputedStyle;
    }

    if (previousHTMLElement === undefined) {
      delete globalThis.HTMLElement;
    } else {
      globalThis.HTMLElement = previousHTMLElement;
    }

    if (previousNode === undefined) {
      delete globalThis.Node;
    } else {
      globalThis.Node = previousNode;
    }
  }
}

function getExpectedAnnouncements(fixture) {
  return fixture.refinedAnnouncements || fixture.expectedAnnouncements;
}

function assertAnnouncementsMatch(actual, expected) {
  const mismatchIndex = expected.findIndex(
    (announcement, index) => actual[index] !== announcement,
  );

  if (actual.length === expected.length && mismatchIndex === -1) {
    return;
  }

  const firstMismatchIndex =
    mismatchIndex === -1 ? Math.min(actual.length, expected.length) : mismatchIndex;
  const contextStart = Math.max(0, firstMismatchIndex - 3);
  const contextEnd = firstMismatchIndex + 4;

  assert.fail(
    JSON.stringify(
      {
        expectedCount: expected.length,
        actualCount: actual.length,
        firstMismatchIndex,
        expected: expected[firstMismatchIndex] ?? null,
        actual: actual[firstMismatchIndex] ?? null,
        expectedContext: expected.slice(contextStart, contextEnd),
        actualContext: actual.slice(contextStart, contextEnd),
      },
      null,
      2,
    ),
  );
}

const cases = getCases();

test("VoiceOver corpus fixtures are present", () => {
  assert.ok(
    cases.length > 0,
    "Run yarn voiceover:import-fixtures before running the corpus suite.",
  );
});

for (const fixture of cases) {
  const runFixtureTest =
    shouldRun && !fixture.skipCorpusReason ? test : test.skip;

  runFixtureTest(`VoiceOver corpus: ${fixture.name}`, () => {
    const html = readFileSync(path.join(fixturesDir, fixture.html), "utf8");
    const expected = getExpectedAnnouncements(fixture);
    let actual;
    try {
      actual = scanHtml(html);
    } catch (error) {
      assert.fail(
        JSON.stringify(
          {
            scanError: true,
            fixture: fixture.name,
            errorName: error?.name ?? null,
            errorMessage: error?.message ?? String(error),
            stack: error?.stack?.split("\n").slice(0, 8) ?? [],
          },
          null,
          2,
        ),
      );
    }

    assertAnnouncementsMatch(actual, expected);
  });
}
