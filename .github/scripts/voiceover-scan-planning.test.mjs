import assert from "node:assert/strict";
import test from "node:test";
import {
  detectConditionalEvidence,
  isPartialStopReason,
  planAdaptiveMaxSteps,
} from "./voiceover-scan-planning.mjs";

test("adaptive planning raises a capped scan from preflight complexity", () => {
  const plan = planAdaptiveMaxSteps({
    configuredMaxSteps: 250,
    ceiling: 800,
    domNodeCount: 520,
    accessibilityNodeCount: 310,
    source: "url",
  });

  assert.equal(plan.adjusted, true);
  assert.ok(plan.effectiveMaxSteps > 250);
  assert.ok(plan.effectiveMaxSteps <= 800);
  assert.equal(plan.reason, "raised-from-preflight-complexity");
});

test("adaptive planning preserves unlimited scans", () => {
  const plan = planAdaptiveMaxSteps({
    configuredMaxSteps: 0,
    domNodeCount: 5000,
    accessibilityNodeCount: 3000,
  });

  assert.equal(plan.effectiveMaxSteps, 0);
  assert.equal(plan.adjusted, false);
  assert.equal(plan.reason, "unlimited-configured");
});

test("adaptive planning preserves a sufficient configured cap", () => {
  const plan = planAdaptiveMaxSteps({
    configuredMaxSteps: 250,
    ceiling: 800,
    domNodeCount: 100,
    accessibilityNodeCount: 80,
    source: "url",
  });

  assert.equal(plan.effectiveMaxSteps, 250);
  assert.equal(plan.adjusted, false);
  assert.equal(plan.reason, "configured-limit-sufficient");
});

test("bounded and timeout stops are partial while a scan end is complete", () => {
  assert.equal(isPartialStopReason("max-steps:250"), true);
  assert.equal(isPartialStopReason("timeout:1800"), true);
  assert.equal(isPartialStopReason("not-stopped"), true);
  assert.equal(isPartialStopReason("scan-end-marker"), false);
});

test("conditional evidence detects DOM state transitions", () => {
  const result = detectConditionalEvidence(
    {
      htmlAfterStep: {
        fingerprint: "before",
        stats: { nodeCount: 20, bodyTextLength: 100 },
      },
      pageState: { url: "https://example.test/", title: "Example" },
    },
    {
      htmlAfterStep: {
        fingerprint: "after",
        stats: { nodeCount: 22, bodyTextLength: 120 },
      },
      pageState: { url: "https://example.test/", title: "Example" },
    },
  );

  assert.equal(result.capture, true);
  assert.deepEqual(result.reasons, [
    "rendered-dom-fingerprint-changed",
    "rendered-dom-node-count-changed",
    "rendered-body-text-length-changed",
  ]);
});

test("conditional evidence ignores stable snapshots", () => {
  const snapshot = {
    htmlAfterStep: {
      fingerprint: "stable",
      stats: { nodeCount: 20, bodyTextLength: 100 },
    },
    pageState: { url: "https://example.test/", title: "Example" },
  };

  assert.equal(detectConditionalEvidence(snapshot, snapshot).capture, false);
});
