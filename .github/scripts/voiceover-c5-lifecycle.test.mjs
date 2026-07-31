import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assessC5Artifact,
  createC5Plan,
  validateC5Spec,
} from "./voiceover-c5-lifecycle.mjs";

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function fixtureSpec(root) {
  const fixturePath = "packages/sr-engine/tests/fixtures/voiceover-repros/_families/example.html";
  const absolute = path.join(root, fixturePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(
    absolute,
    '<main data-sr-scan-root><p>C5 identity example</p><p>Positive</p><p>Negative</p><p>Tail</p></main>',
  );
  return {
    runId: "run-1",
    familyId: "example-family",
    ownerTarget: "example-target",
    targets: ["example-target"],
    candidateRefs: [{ candidateId: "example:1" }],
    fixturePath,
    branch: "codex/example",
    identityText: "C5 identity example",
    positiveControls: ["Positive"],
    negativeControls: ["Negative"],
    tailGuards: ["Tail"],
    conditionalStateRisk: true,
  };
}

function artifact(root, announcements, engineAnnouncements = announcements) {
  const scanRoot = path.join(root, "artifact/scans/example");
  mkdirSync(scanRoot, { recursive: true });
  writeJson(path.join(scanRoot, "voiceover-output.json"), { announcements });
  writeJson(path.join(scanRoot, "voiceover-sources.json"), { steps: [{}] });
  writeFileSync(
    path.join(scanRoot, "rendered-html.html"),
    '<main data-sr-scan-root>C5 identity example</main>',
  );
  writeJson(path.join(scanRoot, "accessibility-tree.json"), {
    nodeCount: 4,
    nodes: [{ role: "main" }],
  });
  writeJson(path.join(scanRoot, "step-snapshots.json"), { snapshots: [{}] });
  writeJson(path.join(scanRoot, "engine-traversal-debug.json"), {
    entries: engineAnnouncements.map((announcement) => ({ announcement })),
  });
  writeJson(path.join(scanRoot, "scan-debug.json"), {
    scan: { stopReason: "scan-end-marker", partial: false },
  });
  return path.join(root, "artifact");
}

test("prepares a matrix canary/full/retry plan with conditional capture", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "c5-plan-"));
  const spec = fixtureSpec(root);
  const plan = createC5Plan(spec, { repoRoot: root });

  assert.equal(plan.status, "prepared");
  assert.equal(plan.retryPolicy.maximumRetries, 1);
  assert.match(plan.dispatches.canary.command, /adaptive_max_steps=true/);
  assert.match(plan.dispatches.full.command, /capture_screen_recording=true/);
});

test("rejects fixtures without the scan root or declared controls", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "c5-invalid-"));
  const spec = fixtureSpec(root);
  writeFileSync(path.join(root, spec.fixturePath), "<main>wrong</main>");
  const validation = validateC5Spec(spec, { repoRoot: root });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join("\n"), /data-sr-scan-root/);
  assert.match(validation.errors.join("\n"), /identityText/);
});

test("assesses complete differing output as an engine-gap candidate", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "c5-assess-"));
  const spec = fixtureSpec(root);
  const artifactRoot = artifact(
    root,
    ["C5 identity example", "Positive", "Negative", "Tail"],
    ["C5 identity example", "Positive", "Tail"],
  );
  const result = assessC5Artifact(spec, artifactRoot, {
    repoRoot: root,
    stage: "full",
    attempt: 0,
  });

  assert.equal(result.status, "engine-gap-confirmed");
  assert.equal(result.assessment.controlsComplete, true);
  assert.equal(result.assessment.debugEvidenceComplete, true);
  assert.equal(result.assessment.verdictRequiresEvidenceReview, true);
});

test("permits one insufficient reproduction retry and then parks", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "c5-retry-"));
  const spec = fixtureSpec(root);
  const artifactRoot = artifact(root, ["C5 identity example", "Positive"]);
  const first = assessC5Artifact(spec, artifactRoot, {
    repoRoot: root,
    stage: "full",
    attempt: 0,
  });
  const retry = assessC5Artifact(spec, artifactRoot, {
    repoRoot: root,
    stage: "retry",
    attempt: 1,
  });

  assert.equal(first.nextAction, "dispatch-single-retry");
  assert.equal(retry.nextAction, "return-fixture-judge-for-parking");
  assert.equal(retry.retryPolicy.insufficientReproRetriesRemaining, 0);
});
