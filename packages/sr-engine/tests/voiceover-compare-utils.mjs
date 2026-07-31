function findNextSyncPoint(actual, expected, actualIndex, expectedIndex, maxLookahead = 30) {
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

export function findMismatchWindows(actual, expected, contextSize = 3) {
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
    const nextMatch = findNextSyncPoint(
      actual,
      expected,
      actualIndex,
      expectedIndex,
    );

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

export function classifyWindow(window) {
  const text = [...window.actual, ...window.expected].join("\n");
  if (/^•|,\s*\d+ of \d+|list \d+ items/.test(text)) return "list/marker";
  if (/[()".,]$|^\W+$/.test(text)) return "punctuation/text-boundary";
  if (/link,|button|navigation|group/.test(text)) return "role/structure";
  return "text";
}

export function alignAnnouncementSequences(actual, expected) {
  const rowLength = expected.length + 1;
  const table = new Uint32Array((actual.length + 1) * rowLength);
  const cell = (actualIndex, expectedIndex) => actualIndex * rowLength + expectedIndex;

  for (let actualIndex = actual.length - 1; actualIndex >= 0; actualIndex -= 1) {
    for (
      let expectedIndex = expected.length - 1;
      expectedIndex >= 0;
      expectedIndex -= 1
    ) {
      table[cell(actualIndex, expectedIndex)] =
        actual[actualIndex] === expected[expectedIndex]
          ? table[cell(actualIndex + 1, expectedIndex + 1)] + 1
          : Math.max(
              table[cell(actualIndex + 1, expectedIndex)],
              table[cell(actualIndex, expectedIndex + 1)],
            );
    }
  }

  const matches = [];
  const unexpectedActual = [];
  const missingExpected = [];
  let actualIndex = 0;
  let expectedIndex = 0;

  while (actualIndex < actual.length && expectedIndex < expected.length) {
    if (actual[actualIndex] === expected[expectedIndex]) {
      matches.push({ actualIndex, expectedIndex, text: actual[actualIndex] });
      actualIndex += 1;
      expectedIndex += 1;
      continue;
    }

    if (
      table[cell(actualIndex + 1, expectedIndex)] >=
      table[cell(actualIndex, expectedIndex + 1)]
    ) {
      unexpectedActual.push({ actualIndex, text: actual[actualIndex] });
      actualIndex += 1;
    } else {
      missingExpected.push({ expectedIndex, text: expected[expectedIndex] });
      expectedIndex += 1;
    }
  }

  while (actualIndex < actual.length) {
    unexpectedActual.push({ actualIndex, text: actual[actualIndex] });
    actualIndex += 1;
  }
  while (expectedIndex < expected.length) {
    missingExpected.push({ expectedIndex, text: expected[expectedIndex] });
    expectedIndex += 1;
  }

  const lastMatch = matches.at(-1);
  return {
    matchedCount: matches.length,
    matches,
    missingExpected,
    unexpectedActual,
    unmatchedTail: {
      expected: missingExpected.filter(
        (entry) => entry.expectedIndex > (lastMatch?.expectedIndex ?? -1),
      ),
      actual: unexpectedActual.filter(
        (entry) => entry.actualIndex > (lastMatch?.actualIndex ?? -1),
      ),
    },
  };
}

function indexSet(entries, key) {
  return new Set(entries.map((entry) => entry[key]));
}

function summarizeEntries(entries, limit = 20) {
  return {
    count: entries.length,
    items: entries.slice(0, limit),
    truncated: entries.length > limit,
  };
}

function countByText(entries) {
  const counts = new Map();
  for (const entry of entries) {
    counts.set(entry.text, (counts.get(entry.text) || 0) + 1);
  }
  return counts;
}

function multisetDifference(entries, referenceEntries) {
  const remaining = countByText(referenceEntries);
  return entries.filter((entry) => {
    const count = remaining.get(entry.text) || 0;
    if (count === 0) {
      return true;
    }
    remaining.set(entry.text, count - 1);
    return false;
  });
}

export function createSemanticDiagnostics({
  actual,
  expected,
  mismatchWindowCount,
  baselineActual = null,
  baselineMismatchWindowCount = null,
}) {
  const current = alignAnnouncementSequences(actual, expected);
  const result = {
    matchedExpectedCount: current.matchedCount,
    missingExpected: summarizeEntries(current.missingExpected),
    unexpectedActual: summarizeEntries(current.unexpectedActual),
    existingUnmatchedTail: {
      expected: summarizeEntries(current.unmatchedTail.expected),
      actual: summarizeEntries(current.unmatchedTail.actual),
    },
  };

  if (!baselineActual) {
    return result;
  }

  const baseline = alignAnnouncementSequences(baselineActual, expected);
  const currentMatchedIndexes = indexSet(current.matches, "expectedIndex");
  const baselineMatchedIndexes = indexSet(baseline.matches, "expectedIndex");
  const newlyMatchedExpected = current.matches.filter(
    (entry) => !baselineMatchedIndexes.has(entry.expectedIndex),
  );
  const regressedExpected = baseline.matches.filter(
    (entry) => !currentMatchedIndexes.has(entry.expectedIndex),
  );
  const newUnexpectedActual = multisetDifference(
    current.unexpectedActual,
    baseline.unexpectedActual,
  );
  const resolvedUnexpectedActual = multisetDifference(
    baseline.unexpectedActual,
    current.unexpectedActual,
  );
  const mismatchWindowDelta =
    Number.isInteger(baselineMismatchWindowCount) &&
    Number.isInteger(mismatchWindowCount)
      ? mismatchWindowCount - baselineMismatchWindowCount
      : null;

  let classification = "unchanged";
  if (regressedExpected.length > 0 || newUnexpectedActual.length > 0) {
    classification = "possible-regression";
  } else if (mismatchWindowDelta > 0 && newlyMatchedExpected.length > 0) {
    classification = "alignment-window-split";
  } else if (
    newlyMatchedExpected.length > 0 ||
    resolvedUnexpectedActual.length > 0
  ) {
    classification = "semantic-improvement";
  }

  result.baselineComparison = {
    classification,
    baselineActualCount: baselineActual.length,
    baselineMatchedExpectedCount: baseline.matchedCount,
    mismatchWindowDelta,
    correctExpectedInsertions: summarizeEntries(newlyMatchedExpected),
    genuineRegressionCandidates: summarizeEntries(regressedExpected),
    newUnexpectedActual: summarizeEntries(newUnexpectedActual),
    resolvedUnexpectedActual: summarizeEntries(resolvedUnexpectedActual),
  };

  return result;
}
