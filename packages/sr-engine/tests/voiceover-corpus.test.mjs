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
const refinementManifestPath = path.join(fixturesDir, "refinement-manifest.json");
const shouldRun = process.env.SR_VOICEOVER_CORPUS_TESTS === "true";
const includeCandidates = process.env.SR_VOICEOVER_CORPUS_CANDIDATES === "true";
const corpusFixtureFilter = process.env.SR_VOICEOVER_CORPUS_FIXTURE || "";
const logCorpusProgress = process.env.SR_VOICEOVER_CORPUS_PROGRESS === "true";

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

function getRefinementManifest() {
  if (!existsSync(refinementManifestPath)) {
    return {
      defaultStatus: "candidate",
      cases: {},
    };
  }

  return readJson(refinementManifestPath);
}

const refinementManifest = getRefinementManifest();

function getRefinementStatus(fixture) {
  return (
    refinementManifest.cases?.[fixture.name] || {
      status: refinementManifest.defaultStatus || "candidate",
      reason: "No fixture-specific refinement status has been recorded.",
    }
  );
}

function isGateStatus(status) {
  return status === "trusted" || status === "refined";
}

function isPartialGateStatus(fixture, status) {
  return (
    status === "partial" &&
    Array.isArray(fixture.partialAssertions) &&
    fixture.partialAssertions.length > 0
  );
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

function selectSnapshotElement(snapshot, source) {
  const pageState = snapshot.pageState || {};
  const selector = source.element || "activeElement";

  if (selector === "activeElement") {
    return pageState.activeElement;
  }

  if (selector === "activeElementAncestor") {
    const ancestors = pageState.activeElementAncestors || [];
    if (source.matchText) {
      return ancestors.find((element) => element.text?.includes(source.matchText));
    }
    return ancestors[source.elementIndex ?? 0];
  }

  if (selector === "matchedDomElement") {
    const matches = pageState.matchedDomElements || [];
    if (source.matchText) {
      return matches.find(
        (element) =>
          element.text?.includes(source.matchText) ||
          element.html?.includes(source.matchText),
      );
    }
    return matches[source.elementIndex ?? 0];
  }

  throw new Error(`Unsupported step snapshot element selector: ${selector}`);
}

function getPartialHtml(fixture, partial, defaultHtml) {
  const source = partial.htmlSource?.stepSnapshot;
  if (!source) return defaultHtml;

  assert.ok(
    fixture.stepSnapshots,
    `Partial corpus assertion ${partial.name} requested a step snapshot, but fixture ${fixture.name} has no stepSnapshots file.`,
  );

  const stepSnapshots = readJson(path.join(fixturesDir, fixture.stepSnapshots));
  const snapshot =
    source.index !== undefined
      ? stepSnapshots.snapshots?.find((candidate) => candidate.index === source.index)
      : stepSnapshots.snapshots?.find(
          (candidate) => candidate.announcement === source.announcement,
        );

  assert.ok(
    snapshot,
    `Partial corpus assertion ${partial.name} could not find requested step snapshot.`,
  );

  const element = selectSnapshotElement(snapshot, source);
  assert.ok(
    element?.html,
    `Partial corpus assertion ${partial.name} selected a step snapshot element without HTML.`,
  );

  return element.html;
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

function assertPartialAnnouncementsMatch(actual, partial) {
  assert.ok(partial.name, "Partial corpus assertions must include a name.");
  assert.ok(
    Array.isArray(partial.expectedAnnouncements),
    `Partial corpus assertion ${partial.name} must include expectedAnnouncements.`,
  );

  const startAt = partial.startAt ?? partial.expectedAnnouncements[0];
  const startIndex = actual.indexOf(startAt);

  assert.notEqual(
    startIndex,
    -1,
    JSON.stringify(
      {
        partial: partial.name,
        startAt,
        actualPreview: actual.slice(0, 20),
      },
      null,
      2,
    ),
  );

  assertAnnouncementsMatch(
    actual.slice(startIndex, startIndex + partial.expectedAnnouncements.length),
    partial.expectedAnnouncements,
  );
}

function matchesCorpusFixtureFilter(fixture) {
  if (!corpusFixtureFilter) return true;
  return fixture.name.includes(corpusFixtureFilter);
}

function logProgress(message) {
  if (!logCorpusProgress) return;
  process.stderr.write(`[voiceover-corpus] ${message}\n`);
}

const cases = getCases().filter(matchesCorpusFixtureFilter);

test("VoiceOver corpus fixtures are present", () => {
  assert.ok(
    cases.length > 0,
    "Run yarn voiceover:import-fixtures before running the corpus suite.",
  );
});

test("VoiceOver corpus refinement manifest covers every fixture", () => {
  const missing = cases
    .map((fixture) => fixture.name)
    .filter((name) => !refinementManifest.cases?.[name]);

  assert.deepEqual(missing, []);
});

test("VoiceOver corpus refinement manifest records fixture tiers", () => {
  const validTiers = new Set(Object.keys(refinementManifest.fixtureTierDefinitions || {}));
  assert.ok(
    validTiers.size > 0,
    "refinement-manifest.json must define fixtureTierDefinitions.",
  );

  const missingTierMetadata = cases
    .map((fixture) => {
      const refinement = refinementManifest.cases?.[fixture.name];
      if (!refinement) return null;
      const coverageCheck = refinement.existingCoverageChecked;
      const validCoverageCheck =
        typeof coverageCheck === "string"
          ? coverageCheck.length > 0
          : Boolean(coverageCheck?.status);

      return validTiers.has(refinement.fixtureTier) &&
        typeof refinement.uniqueCoverage === "string" &&
        refinement.uniqueCoverage.length > 0 &&
        validCoverageCheck
        ? null
        : fixture.name;
    })
    .filter(Boolean);

  assert.deepEqual(missingTierMetadata, []);
});

for (const fixture of cases) {
  const refinement = getRefinementStatus(fixture);
  const gateFixture =
    !fixture.skipCorpusReason &&
    (isGateStatus(refinement.status) ||
      isPartialGateStatus(fixture, refinement.status) ||
      (includeCandidates && refinement.status === "candidate"));
  const runFixtureTest = shouldRun && gateFixture ? test : test.skip;

  runFixtureTest(
    `VoiceOver corpus: ${fixture.name} [${refinement.status}]`,
    () => {
    const startedAt = Date.now();
    logProgress(`start ${fixture.name}`);
    const html = readFileSync(path.join(fixturesDir, fixture.html), "utf8");
    const accessibilityTree = fixture.accessibilityTree
      ? readJson(path.join(fixturesDir, fixture.accessibilityTree))
      : undefined;
    let actual;
    try {
      actual = scanHtml(html, accessibilityTree);
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

    if (isPartialGateStatus(fixture, refinement.status)) {
      for (const partial of fixture.partialAssertions) {
        const partialHtml = getPartialHtml(fixture, partial, html);
        const partialActual =
          partialHtml === html ? actual : scanHtml(partialHtml);
        assertPartialAnnouncementsMatch(partialActual, partial);
      }
    } else {
      const expected = getExpectedAnnouncements(fixture);
      assertAnnouncementsMatch(actual, expected);
    }
    logProgress(`end ${fixture.name} ${Date.now() - startedAt}ms`);
    },
  );
}
