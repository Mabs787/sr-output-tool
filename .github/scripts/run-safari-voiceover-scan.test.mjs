import assert from "node:assert/strict";
import test from "node:test";
import {
  assessSafariCaptureTrust,
  detectSafariStall,
  directSourcesAreCursorAligned,
  getScanBoundary,
  isSafariSystemNoise,
  minimumSemanticFingerprintSimilarity,
  normalizeCapturedAnnouncements,
  normalizeDirectVoiceOverText,
  selectDirectVoiceOverSource,
} from "./run-safari-voiceover-scan.mjs";

test("prefers cursor-aligned lastPhrase and falls back to voCursorText", () => {
  assert.deepEqual(selectDirectVoiceOverSource({ lastPhrase: "  Price   £30 ", voCursorText: "Price £30" }), {
    source: "lastPhrase", text: "Price £30", direct: true,
  });
  assert.deepEqual(selectDirectVoiceOverSource({ lastPhrase: "", voCursorText: "View deal" }), {
    source: "voCursorText", text: "View deal", direct: true,
  });
  assert.deepEqual(selectDirectVoiceOverSource({
    lastPhrase: "Safari Example window Example web content has keyboard focus",
    voCursorText: "SR Output Tool VoiceOver scan start marker",
  }), {
    source: "voCursorText", text: "SR Output Tool VoiceOver scan start marker", direct: true,
  });
});

test("rejects unrelated live-region and status speech in lastPhrase", () => {
  const promotionalAlt = "Sky promotional banner with a pink, purple, and blue gradient background. Explore now";
  const samsungHeading = "Samsung Galaxy Z Flip8 5G with Galaxy AI heading level 3";
  assert.equal(directSourcesAreCursorAligned(promotionalAlt, samsungHeading), false);
  assert.deepEqual(selectDirectVoiceOverSource({
    lastPhrase: promotionalAlt,
    voCursorText: samsungHeading,
  }), {
    source: "voCursorText", text: samsungHeading, direct: true,
  });
  assert.deepEqual(selectDirectVoiceOverSource({
    lastPhrase: "You are currently on a selectable text.",
    voCursorText: "from £38 a month",
  }), {
    source: "voCursorText", text: "from £38 a month", direct: true,
  });
  assert.deepEqual(selectDirectVoiceOverSource({
    lastPhrase: "Orange iPhone 17 Pro Max. From £34.75 a month. Pair with Unlimited data for £19 a month.",
    voCursorText: "from £38 a month",
  }), {
    source: "voCursorText", text: "from £38 a month", direct: true,
  });
});

test("keeps richer lastPhrase context when it describes the cursor item", () => {
  assert.equal(directSourcesAreCursorAligned(
    "heading level 3 Samsung Galaxy Z Flip8 5G with Galaxy AI",
    "Samsung Galaxy Z Flip8 5G with Galaxy AI heading level 3",
  ), true);
  assert.deepEqual(selectDirectVoiceOverSource({
    lastPhrase: "link View deal 1 of 3",
    voCursorText: "View deal link",
  }), {
    source: "lastPhrase", text: "link View deal 1 of 3", direct: true,
  });
});

test("normalization only changes whitespace and removes explicit system noise", () => {
  assert.equal(normalizeDirectVoiceOverText(" heading level 3,  Product "), "heading level 3, Product");
  assert.equal(normalizeDirectVoiceOverText("Safari, Example, window"), "");
  assert.equal(normalizeDirectVoiceOverText("Safari Example window Example web content has keyboard focus"), "");
  assert.equal(normalizeDirectVoiceOverText("list 4 items"), "list 4 items");
  assert.equal(isSafariSystemNoise("main"), false);
  assert.equal(isSafariSystemNoise("collection"), false);
});

test("markers bound output and only terminal duplicates are removed", () => {
  const step = (text) => ({ selected: { text } });
  assert.deepEqual(normalizeCapturedAnnouncements([
    step("browser noise"), step("SR Output Tool VoiceOver scan start marker"),
    step("Price £30"), step("Price £30"), step("Tail"), step("Tail"),
    step("SR Output Tool VoiceOver scan end marker"), step("outside"),
  ]), ["Price £30", "Price £30", "Tail"]);
  assert.equal(getScanBoundary("SR Output Tool VoiceOver scan end marker, text"), "end");
});

test("detects repeated and empty direct-output stalls", () => {
  const repeated = Array.from({ length: 8 }, () => ({ selected: { text: "same" } }));
  assert.equal(detectSafariStall(repeated), "repeated-direct-output");
  const empty = Array.from({ length: 5 }, () => ({ selected: { text: "" } }));
  assert.equal(detectSafariStall(empty), "no-direct-output");
});

test("trust requires three identical complete direct-source runs", () => {
  const run = {
    announcements: ["heading level 1, Example", "Tail"],
    markers: { startReached: true, endReached: true },
    errors: [],
    sources: ["lastPhrase", "voCursorText"],
    semanticFingerprint: "stable",
  };
  assert.deepEqual(assessSafariCaptureTrust([run, run, run]), { trusted: true, status: "trusted", reasons: [] });
  const changed = { ...run, announcements: ["changed"] };
  const result = assessSafariCaptureTrust([run, run, changed]);
  assert.equal(result.trusted, false);
  assert.match(result.reasons.join(" "), /differ/);
});

test("semantic stability tolerates a bounded dynamic line", () => {
  const stableLines = Array.from({ length: 40 }, (_, index) => `BUTTON|item-${index}`);
  const first = [...stableLines, "SPAN|timestamp-one"].join("\n");
  const second = [...stableLines, "SPAN|timestamp-two"].join("\n");
  assert.ok(minimumSemanticFingerprintSimilarity([first, second, second]) >= 0.95);
  assert.ok(minimumSemanticFingerprintSimilarity(["A\nB", "C\nD", "A\nB"]) < 0.95);
});
