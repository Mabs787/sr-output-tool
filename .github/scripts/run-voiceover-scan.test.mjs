import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const scriptPath = path.resolve(".github/scripts/run-voiceover-scan.mjs");

async function importScannerWithStepSnapshots(enabled) {
  const previousTestExports = process.env.SR_VOICEOVER_SCAN_TEST_EXPORTS;
  const previousStepSnapshots = process.env.VOICEOVER_CAPTURE_STEP_SNAPSHOTS;
  process.env.SR_VOICEOVER_SCAN_TEST_EXPORTS = "true";
  process.env.VOICEOVER_CAPTURE_STEP_SNAPSHOTS = enabled ? "true" : "false";

  try {
    return await import(`${pathToFileURL(scriptPath).href}?stepSnapshots=${enabled}`);
  } finally {
    if (previousTestExports === undefined) {
      delete process.env.SR_VOICEOVER_SCAN_TEST_EXPORTS;
    } else {
      process.env.SR_VOICEOVER_SCAN_TEST_EXPORTS = previousTestExports;
    }

    if (previousStepSnapshots === undefined) {
      delete process.env.VOICEOVER_CAPTURE_STEP_SNAPSHOTS;
    } else {
      process.env.VOICEOVER_CAPTURE_STEP_SNAPSHOTS = previousStepSnapshots;
    }
  }
}

test("treats repo-local fixturePath targets as live Chrome diagnostics targets", async () => {
  const { __test } = await importScannerWithStepSnapshots(true);

  assert.equal(
    __test.hasLiveChromeTarget({
      fixturePath:
        "packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/focusable-login-panel-group-c5.html",
    }),
    true,
  );
  assert.equal(
    __test.getTargetUrl({
      fixturePath:
        "packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/focusable-login-panel-group-c5.html",
    }).startsWith("file://"),
    true,
  );
  assert.equal(
    __test.hasLiveChromeTarget({ url: "https://example.com/" }),
    true,
  );
  assert.equal(__test.hasLiveChromeTarget({}), false);
});

test("captures step snapshots for fixturePath targets when enabled", async () => {
  const { __test } = await importScannerWithStepSnapshots(true);

  assert.equal(
    __test.shouldCaptureStepSnapshotForTarget({
      fixturePath:
        "packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/focusable-login-panel-group-c5.html",
    }),
    true,
  );
  assert.equal(__test.shouldCaptureStepSnapshotForTarget({}), false);
});

test("does not capture fixturePath step snapshots when the workflow input is disabled", async () => {
  const { __test } = await importScannerWithStepSnapshots(false);

  assert.equal(
    __test.shouldCaptureStepSnapshotForTarget({
      fixturePath:
        "packages/sr-engine/tests/fixtures/voiceover-repros/behavior-lab/controls-and-contexts/focusable-login-panel-group-c5.html",
    }),
    false,
  );
});
