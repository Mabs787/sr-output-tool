import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.VOICEOVER_CAPTURE_STEP_SNAPSHOTS = "true";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scannerPath = path.join(repoRoot, ".github/scripts/run-voiceover-scan.mjs");
const scanner = await import(`${pathToFileURL(scannerPath).href}?diagnostics-test`);

function commandResult(stdout, extras = {}) {
  return {
    ok: true,
    status: 0,
    signal: null,
    stdout,
    stderr: "",
    error: "",
    ...extras,
  };
}

function fakeAxCommand(method) {
  assert.equal(method, "Accessibility.getFullAXTree");
  return commandResult(
    JSON.stringify({
      nodes: [
        {
          nodeId: "1",
          role: { value: "RootWebArea" },
          name: { value: "Fixture page" },
          backendDOMNodeId: 1,
          childIds: ["2"],
        },
        {
          nodeId: "2",
          role: { value: "button" },
          name: { value: "Continue" },
          backendDOMNodeId: 2,
        },
      ],
    }),
    { source: "chrome-devtools", method },
  );
}

function fakeDomNodeMap() {
  return {
    ok: true,
    map: new Map([
      [1, { backendDOMNodeId: 1, domNodeId: "1", tagName: "body" }],
      [2, { backendDOMNodeId: 2, domNodeId: "2", tagName: "button" }],
    ]),
    stats: { mappedNodeCount: 2 },
    capture: commandResult("{}", { source: "chrome-devtools" }),
  };
}

test("repo-local fixtures use a live Chrome file URL for rendered diagnostics", async () => {
  const fixtureTarget = {
    fixturePath: "packages/sr-engine/tests/fixtures/voiceover-repros/example.html",
  };
  const expectedUrl = pathToFileURL(path.join(repoRoot, fixtureTarget.fixturePath)).href;
  const evaluations = [];

  const rendered = await scanner.captureRenderedSourceHtml(fixtureTarget, {
    evaluateJavaScriptInChrome: async (expression) => {
      evaluations.push(expression);
      if (evaluations.length === 1) {
        return commandResult(
          JSON.stringify({
            url: expectedUrl,
            nodeCount: 3,
            scanRootSelector: scanner.getScanRootSelector(fixtureTarget),
          }),
          { source: "chrome-devtools" },
        );
      }
      return commandResult(
        '<!doctype html><html><body><main data-sr-scan-root data-sr-repro-family="generic"><button>Continue</button></main></body></html>',
        { source: "chrome-devtools" },
      );
    },
  });

  assert.equal(scanner.hasLiveChromeDiagnosticsTarget(fixtureTarget), true);
  assert.equal(scanner.getTargetUrl(fixtureTarget), expectedUrl);
  assert.equal(scanner.getScanRootSelector(fixtureTarget), "[data-sr-scan-root]");
  assert.equal(rendered.source, "chrome-rendered-dom");
  assert.equal(rendered.ok, true);
  assert.match(rendered.stdout, /data-sr-scan-root/);
  assert.equal(JSON.parse(rendered.annotation.stdout).url, expectedUrl);
  assert.equal(evaluations.length, 2);
});

test("repo-local fixture AX and step snapshots are captured and persisted", async () => {
  const fixtureTarget = {
    fixturePath: "packages/sr-engine/tests/fixtures/voiceover-repros/example.html",
  };
  const expectedUrl = scanner.getTargetUrl(fixtureTarget);

  const accessibilityTree = await scanner.captureAccessibilityTree(fixtureTarget, {
    sendChromeDevToolsCommand: fakeAxCommand,
    captureBackendDomNodeMap: fakeDomNodeMap,
  });

  assert.equal(accessibilityTree.source, "chrome-accessibility-tree");
  assert.equal(accessibilityTree.tree.nodeCount, 2);
  assert.equal(accessibilityTree.tree.axMappedNodeCount, 2);

  const snapshot = await scanner.captureStepSnapshot({
    target: fixtureTarget,
    stepIndex: 1,
    announcement: "Continue, button",
    focus: { AXRole: "AXButton", AXTitle: "Continue" },
    deps: {
      evaluateJavaScriptInChrome: async () =>
        commandResult(
          JSON.stringify({
            url: expectedUrl,
            activeElement: {
              tagName: "button",
              attributes: { "data-sr-dom-node-id": "2" },
              text: "Continue",
            },
          }),
          { source: "chrome-devtools" },
        ),
      captureStepHtmlAfterStep: async () => ({
        capture: commandResult("", {
          source: "chrome-rendered-dom-after-voiceover-step",
          mode: "summary",
        }),
        htmlAfterStep: {
          source: "chrome-rendered-dom-after-voiceover-step",
          mode: "summary",
          htmlExcerpt:
            '<main data-sr-scan-root data-sr-repro-family="generic"><button>Continue</button></main>',
          stats: { nodeCount: 2 },
        },
      }),
      sendChromeDevToolsCommand: fakeAxCommand,
      captureBackendDomNodeMap: fakeDomNodeMap,
    },
  });

  assert.ok(snapshot);
  assert.equal(snapshot.pageState.url, expectedUrl);
  assert.equal(snapshot.accessibility.nodeCount, 2);
  assert.equal(snapshot.accessibility.matchedNodes[0].name, "Continue");
  assert.match(snapshot.htmlAfterStep.htmlExcerpt, /data-sr-scan-root/);

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "sr-vo-scanner-test-"));
  try {
    await mkdir(tempRoot, { recursive: true });
    scanner.writeStepSnapshotsFile(tempRoot, [snapshot], false);
    const persisted = JSON.parse(
      await readFile(path.join(tempRoot, "step-snapshots.json"), "utf8"),
    );
    assert.equal(persisted.partial, false);
    assert.equal(persisted.snapshots.length, 1);
    assert.equal(persisted.snapshots[0].accessibility.nodeCount, 2);
    assert.match(
      persisted.snapshots[0].htmlAfterStep.htmlExcerpt,
      /data-sr-scan-root/,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
