import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

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

function evaluateConsentHtml(html) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    url: "https://example.test/page",
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { document, HTMLElement } = dom.window;

  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value() {
      if (this.hidden || this.getAttribute("aria-hidden") === "true") {
        return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
      }
      return { x: 0, y: 0, top: 0, left: 0, right: 120, bottom: 40, width: 120, height: 40 };
    },
  });

  for (const element of document.querySelectorAll("a,button,[role='button'],input")) {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.clickedLabel = String(
        element.getAttribute("aria-label") ||
          element.getAttribute("title") ||
          element.value ||
          element.textContent ||
          "",
      )
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    });
  }

  const result = JSON.parse(dom.window.eval(scanner.getDismissPageConsentExpression()));
  return {
    result,
    clickedLabel: document.body.dataset.clickedLabel || "",
    document,
  };
}

test("DOM consent handler clicks exact controls inside bounded consent surfaces", () => {
  const buttonCase = evaluateConsentHtml(`
    <main>
      <a href="/legal">Membership Agreement</a>
      <button type="button">Accept</button>
      <aside role="dialog" aria-modal="true" aria-label="Cookie consent">
        <h2>Cookie notice</h2>
        <p>Cookies help us remember your privacy preferences.</p>
        <button type="button">Accept all</button>
      </aside>
    </main>
  `);

  assert.equal(buttonCase.result.action, "clicked");
  assert.equal(buttonCase.result.preference, "accept");
  assert.equal(buttonCase.result.label, "accept all");
  assert.equal(buttonCase.result.tagName, "button");
  assert.equal(buttonCase.clickedLabel, "accept all");

  const linkCase = evaluateConsentHtml(`
    <main>
      <div class="cookie-banner" style="position: fixed">
        <p>This cookie notice explains privacy choices.</p>
        <a href="/accept">Accept</a>
      </div>
    </main>
  `);

  assert.equal(linkCase.result.action, "clicked");
  assert.equal(linkCase.result.preference, "accept");
  assert.equal(linkCase.result.label, "accept");
  assert.equal(linkCase.result.tagName, "a");
  assert.equal(linkCase.clickedLabel, "accept");
});

test("DOM consent handler permits bounded suffix variants only for button-like controls", () => {
  const rejectVariant = evaluateConsentHtml(`
    <main>
      <aside role="dialog" aria-modal="true" aria-label="Cookie consent">
        <p>Cookies and privacy controls are available.</p>
        <button type="button">Reject optional cookies</button>
      </aside>
    </main>
  `);

  assert.equal(rejectVariant.result.action, "clicked");
  assert.equal(rejectVariant.result.preference, "reject");
  assert.equal(rejectVariant.result.label, "reject optional cookies");
  assert.equal(rejectVariant.clickedLabel, "reject optional cookies");

  const acceptVariant = evaluateConsentHtml(`
    <main>
      <div class="cookie-banner" style="position: fixed">
        <p>This cookie banner explains privacy choices.</p>
        <button type="button">Accept all cookies</button>
      </div>
    </main>
  `);

  assert.equal(acceptVariant.result.action, "clicked");
  assert.equal(acceptVariant.result.preference, "accept");
  assert.equal(acceptVariant.result.label, "accept all cookies");
  assert.equal(acceptVariant.clickedLabel, "accept all cookies");

  const linkVariant = evaluateConsentHtml(`
    <main>
      <aside role="dialog" aria-modal="true" aria-label="Cookie consent">
        <p>Cookies and privacy controls are available.</p>
        <a href="/accept-all-cookies">Accept all cookies</a>
        <button type="button">Close cookie notice</button>
      </aside>
    </main>
  `);

  assert.equal(linkVariant.result.action, "hidden");
  assert.equal(linkVariant.clickedLabel, "");
});

test("DOM consent handler does not click partial ordinary legal or content links", () => {
  const { result, clickedLabel } = evaluateConsentHtml(`
    <main>
      <nav aria-label="Legal">
        <a href="/membership-agreement">Membership Agreement</a>
        <a href="/acceptable-use">Acceptable Use Policy</a>
        <a href="/accept-all-cookies-policy">Accept all cookies policy</a>
        <a href="/service-agreement">Service Agreement</a>
        <a href="/cardholder-agreement">Cardholder Agreement</a>
      </nav>
      <section aria-label="Privacy resources">
        <h2>Privacy resources</h2>
        <p>Privacy and personal data guidance for account owners.</p>
        <a href="/privacy-details">Read privacy details</a>
      </section>
    </main>
  `);

  assert.equal(result.action, "none");
  assert.equal(clickedLabel, "");
  assert.equal(result.url, "https://example.test/page");
});

test("DOM consent handler hides only active bounded consent overlays", () => {
  const { result, document } = evaluateConsentHtml(`
    <main>
      <section aria-label="Privacy" data-negative-control="normal-privacy-section">
        <h2>Privacy features</h2>
        <p>Privacy settings protect personal data for signed-in members.</p>
        <a href="#privacy-detail">Read privacy details</a>
      </section>
      <ul aria-label="Account cards">
        <li class="privacy-card" tabindex="-1" data-negative-control="normal-listitem">
          <h2>Trusted partners</h2>
          <p>Personal data sharing is explained in this normal visible list item.</p>
          <a href="#partners-detail">Read partner details</a>
        </li>
      </ul>
      <div role="dialog" aria-modal="true" aria-hidden="true" aria-label="Hidden cookie preferences" data-negative-control="inactive-dialog">
        <p>Hidden cookie choices are not visible page content.</p>
        <button type="button">Close</button>
      </div>
      <aside role="dialog" aria-modal="true" aria-label="Cookie notice" data-positive-control="visible-cookie-dialog">
        <h2>Cookie notice</h2>
        <p>Cookies support privacy choices for this local fixture.</p>
        <button type="button">Close cookie notice</button>
      </aside>
    </main>
  `);

  assert.equal(result.action, "hidden");
  assert.equal(result.hiddenCount, 1);
  assert.equal(
    document.querySelector("[data-positive-control='visible-cookie-dialog']").getAttribute("data-sr-voiceover-hidden-consent"),
    "true",
  );
  assert.equal(
    document.querySelector("[data-negative-control='normal-privacy-section']").hasAttribute("data-sr-voiceover-hidden-consent"),
    false,
  );
  assert.equal(
    document.querySelector("[data-negative-control='normal-listitem']").hasAttribute("data-sr-voiceover-hidden-consent"),
    false,
  );
  assert.equal(
    document.querySelector("[data-negative-control='inactive-dialog']").hasAttribute("data-sr-voiceover-hidden-consent"),
    false,
  );
});

test("DOM consent handler ignores inactive dialogs and unrelated controls", () => {
  const { result, clickedLabel, document } = evaluateConsentHtml(`
    <main>
      <div role="dialog" aria-modal="true" aria-hidden="true" aria-label="Hidden cookie preferences">
        <p>Cookies and privacy settings.</p>
        <button type="button">Accept all</button>
      </div>
      <section class="privacy-preferences" aria-label="Privacy preferences">
        <h2>Privacy preferences</h2>
        <p>This ordinary content section describes personal data policies.</p>
        <button type="button">Agree</button>
      </section>
      <div class="privacy-card">
        <p>A normal visible card about privacy features.</p>
        <button type="button">Accept</button>
      </div>
    </main>
  `);

  assert.equal(result.action, "none");
  assert.equal(clickedLabel, "");
  assert.equal(document.querySelectorAll("[data-sr-voiceover-hidden-consent]").length, 0);
});

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
