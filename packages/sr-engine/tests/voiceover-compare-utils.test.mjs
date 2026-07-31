import assert from "node:assert/strict";
import test from "node:test";
import {
  alignAnnouncementSequences,
  createSemanticDiagnostics,
  findMismatchWindows,
} from "./voiceover-compare-utils.mjs";

test("aligns repeated announcements by stable sequence position", () => {
  const result = alignAnnouncementSequences(
    ["start", "link", "link", "end"],
    ["start", "text", "link", "link", "end"],
  );

  assert.equal(result.matchedCount, 4);
  assert.deepEqual(result.missingExpected, [
    { expectedIndex: 1, text: "text" },
  ]);
  assert.deepEqual(result.unexpectedActual, []);
});

test("classifies a correct insertion that splits heuristic mismatch windows", () => {
  const expected = ["start", "expected insertion", "sync", "tail"];
  const baselineActual = ["start", "wrong", "sync", "tail"];
  const actual = ["start", "expected insertion", "wrong", "sync", "tail"];
  const baselineWindows = findMismatchWindows(baselineActual, expected);
  const currentWindows = findMismatchWindows(actual, expected);
  const diagnostics = createSemanticDiagnostics({
    actual,
    expected,
    mismatchWindowCount: baselineWindows.length + 1,
    baselineActual,
    baselineMismatchWindowCount: baselineWindows.length,
  });

  assert.equal(
    diagnostics.baselineComparison.classification,
    "alignment-window-split",
  );
  assert.equal(
    diagnostics.baselineComparison.correctExpectedInsertions.count,
    1,
  );
  assert.equal(
    diagnostics.baselineComparison.genuineRegressionCandidates.count,
    0,
  );
  assert.equal(diagnostics.baselineComparison.newUnexpectedActual.count, 0);
  assert.ok(currentWindows.length >= 1);
});

test("flags lost expected announcements as regression candidates", () => {
  const diagnostics = createSemanticDiagnostics({
    actual: ["start", "end"],
    expected: ["start", "button", "end"],
    mismatchWindowCount: 1,
    baselineActual: ["start", "button", "end"],
    baselineMismatchWindowCount: 0,
  });

  assert.equal(
    diagnostics.baselineComparison.classification,
    "possible-regression",
  );
  assert.equal(
    diagnostics.baselineComparison.genuineRegressionCandidates.count,
    1,
  );
});

test("reports terminal unmatched tails separately", () => {
  const diagnostics = createSemanticDiagnostics({
    actual: ["start", "actual tail"],
    expected: ["start", "expected tail"],
    mismatchWindowCount: 1,
  });

  assert.equal(diagnostics.existingUnmatchedTail.actual.count, 1);
  assert.equal(diagnostics.existingUnmatchedTail.expected.count, 1);
});
