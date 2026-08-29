import assert from "node:assert/strict";
import test from "node:test";
import {
  assessSafariCaptureTrust,
  detectSafariStall,
  getScanBoundary,
  isSafariSystemNoise,
  normalizeCapturedAnnouncements,
  normalizeDirectVoiceOverText,
  selectDirectVoiceOverSource,
} from "./run-safari-voiceover-scan.mjs";

test("prefers lastPhrase and falls back to voCursorText", () => {
  assert.deepEqual(selectDirectVoiceOverSource({ lastPhrase: "  Price   £30 ", voCursorText: "cursor" }), {
    source: "lastPhrase", text: "Price £30", direct: true,
  });
  assert.deepEqual(selectDirectVoiceOverSource({ lastPhrase: "", voCursorText: "View deal" }), {
    source: "voCursorText", text: "View deal", direct: true,
  });
});

test("normalization only changes whitespace and removes explicit system noise", () => {
  assert.equal(normalizeDirectVoiceOverText(" heading level 3,  Product "), "heading level 3, Product");
  assert.equal(normalizeDirectVoiceOverText("Safari, Example, window"), "");
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
