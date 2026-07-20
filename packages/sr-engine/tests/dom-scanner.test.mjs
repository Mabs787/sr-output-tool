import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const {
  createDomScanner,
  generateAnnouncement,
  getContextEndAnnouncement,
} = require("../dist/index.js");

function scanHtml(html, scannerOptions = {}) {
  const dom = new JSDOM(html);
  const previousDocument = globalThis.document;
  const previousCSS = globalThis.CSS;
  const previousGetComputedStyle = globalThis.getComputedStyle;
  const previousHTMLElement = globalThis.HTMLElement;
  const previousNode = globalThis.Node;

  globalThis.document = dom.window.document;
  globalThis.CSS = dom.window.CSS;
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;

  try {
    const scanner = createDomScanner({
      generateAnnouncement,
      getContextEndAnnouncement,
      ...scannerOptions,
    });
    return scanner.scanSubtree(dom.window.document.body).map((entry) => entry.announcement);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;

    if (previousCSS === undefined) delete globalThis.CSS;
    else globalThis.CSS = previousCSS;

    if (previousGetComputedStyle === undefined) delete globalThis.getComputedStyle;
    else globalThis.getComputedStyle = previousGetComputedStyle;

    if (previousHTMLElement === undefined) delete globalThis.HTMLElement;
    else globalThis.HTMLElement = previousHTMLElement;

    if (previousNode === undefined) delete globalThis.Node;
    else globalThis.Node = previousNode;
  }
}

function scanEntries(html, scannerOptions = {}) {
  const dom = new JSDOM(html);
  const previousDocument = globalThis.document;
  const previousCSS = globalThis.CSS;
  const previousGetComputedStyle = globalThis.getComputedStyle;
  const previousHTMLElement = globalThis.HTMLElement;
  const previousNode = globalThis.Node;

  globalThis.document = dom.window.document;
  globalThis.CSS = dom.window.CSS;
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;

  try {
    const scanner = createDomScanner({
      generateAnnouncement,
      getContextEndAnnouncement,
      ...scannerOptions,
    });
    return scanner.scanSubtree(dom.window.document.body);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;

    if (previousCSS === undefined) delete globalThis.CSS;
    else globalThis.CSS = previousCSS;

    if (previousGetComputedStyle === undefined) delete globalThis.getComputedStyle;
    else globalThis.getComputedStyle = previousGetComputedStyle;

    if (previousHTMLElement === undefined) delete globalThis.HTMLElement;
    else globalThis.HTMLElement = previousHTMLElement;

    if (previousNode === undefined) delete globalThis.Node;
    else globalThis.Node = previousNode;
  }
}

test("scanSubtree exposes traversal debug metadata only when requested", () => {
  const html = `<main><h1>Debug heading</h1><p>Debug body</p></main>`;

  assert.equal(scanEntries(html)[0].traversalDebug, undefined);

  const entries = scanEntries(html, { includeTraversalDebug: true });
  assert.deepEqual(
    entries.map((entry) => ({
      announcement: entry.announcement,
      debug: entry.traversalDebug,
    })),
    [
      {
        announcement: "main",
        debug: {
          stopKind: "split",
          stopSource: "descriptor-announcement",
          descriptorRole: "main",
          descriptorName: undefined,
        },
      },
      {
        announcement: "heading level 1, Debug heading",
        debug: {
          stopKind: "split",
          stopSource: "descriptor-announcement",
          descriptorRole: "heading",
          descriptorName: "Debug heading",
        },
      },
      {
        announcement: "Debug body",
        debug: {
          stopKind: "split",
          stopSource: "descriptor-announcement",
          descriptorRole: "paragraph",
          descriptorName: "Debug body",
        },
      },
      {
        announcement: "end of, main",
        debug: {
          stopKind: "context-end",
          stopSource: "context-end-announcement",
          descriptorRole: "main",
          descriptorName: undefined,
        },
      },
    ],
  );

  assert.deepEqual(
    scanEntries(`<p>Read the <a href="/guide">guide</a>.</p>`, {
      includeTraversalDebug: true,
    }).map((entry) => ({
      announcement: entry.announcement,
      source: entry.traversalDebug?.stopSource,
    })),
    [
      {
        announcement: "Read the",
        source: "split-inline-text-link",
      },
      {
        announcement: "link, guide",
        source: "split-inline-text-link",
      },
    ],
  );
});

test("scanSubtree handles embedded inline links without site-specific rules", () => {
  assert.deepEqual(
    scanHtml(`
      <p>You have accepted additional cookies. <span>You can <a href="/cookies">change your cookie settings</a> at any time.</span></p>
      <button>Hide cookie message</button>
    `),
    [
      "You have accepted additional cookies. You can",
      "Hide cookie message, button",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <p>Go to <a href="https://111.nhs.uk">111.nhs.uk</a> or <a href="tel:111">call 111</a>.</p>
    `),
    ["Go to or", "link, 111.nhs.uk", "link, call 111"],
  );
});

test("scanSubtree does not inject child image role into AX-named labelled links", () => {
  assert.deepEqual(
    scanHtml(
      `
        <a href="/" aria-label="Brand home" data-sr-dom-node-id="logo-link">
          <svg role="img" aria-label="Brand mark" data-sr-dom-node-id="logo-image"></svg>
        </a>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "1",
              role: "link",
              name: "Brand home",
              domNodeId: "logo-link",
              properties: { focusable: true },
              childIds: ["2"],
            },
            {
              nodeId: "2",
              role: "image",
              name: "Brand mark",
              domNodeId: "logo-image",
            },
          ],
        },
      },
    ),
    ["link, Brand home"],
  );
});

test("scanSubtree preserves image role for AX-named logo links when child image names the link", () => {
  assert.deepEqual(
    scanHtml(
      `
        <a href="/" aria-label="Go to the Example homepage" data-sr-dom-node-id="logo-link">
          <svg role="img" aria-label="Example" data-sr-dom-node-id="logo-image"></svg>
        </a>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "1",
              role: "link",
              name: "Go to the Example homepage",
              domNodeId: "logo-link",
              properties: { focusable: true },
              childIds: ["2"],
            },
            {
              nodeId: "2",
              role: "image",
              name: "Example",
              domNodeId: "logo-image",
            },
          ],
        },
      },
    ),
    ["link, image, Go to the Example homepage"],
  );

  assert.deepEqual(
    scanHtml(
      `
        <a href="/" aria-label="Example Airways, go back to homepage" data-sr-dom-node-id="logo-link">
          <img alt="example-airways-colour-negative-dark-colour logo" data-sr-dom-node-id="logo-image">
        </a>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "1",
              role: "link",
              name: "Example Airways, go back to homepage",
              domNodeId: "logo-link",
              properties: { focusable: true },
              childIds: ["2"],
            },
            {
              nodeId: "2",
              role: "image",
              name: "example-airways-colour-negative-dark-colour logo",
              domNodeId: "logo-image",
            },
          ],
        },
      },
    ),
    ["link, image, Example Airways, go back to homepage"],
  );
});

test("scanSubtree preserves AX media group names and heading levels for linked cards", () => {
  assert.deepEqual(
    scanHtml(
      `
        <article aria-labelledby="card-a-title" data-sr-dom-node-id="card-a">
          <a href="#card-a" data-sr-dom-node-id="card-a-link">
            <span role="group" aria-label="Plan A media" data-sr-dom-node-id="card-a-media">
              <svg role="img" aria-label="Plan A image" data-sr-dom-node-id="card-a-image"></svg>
              <img alt="" data-sr-dom-node-id="card-a-empty-image">
            </span>
            <h2 id="card-a-title" data-sr-dom-node-id="card-a-heading">Plan A</h2>
            <p data-sr-dom-node-id="card-a-body">Use any time.</p>
          </a>
        </article>
        <article aria-labelledby="card-b-title" data-sr-dom-node-id="card-b">
          <span aria-hidden="true">
            <svg aria-hidden="true"></svg>
          </span>
          <h2 id="card-b-title" data-sr-dom-node-id="card-b-heading">Plan B</h2>
          <p>Print label later.</p>
          <a href="#card-b" data-sr-dom-node-id="card-b-link">Choose plan</a>
        </article>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "card-a",
              role: "article",
              name: "Plan A",
              domNodeId: "card-a",
              childIds: ["card-a-link"],
            },
            {
              nodeId: "card-a-link",
              role: "link",
              name: "Plan A media Plan A Use any time.",
              domNodeId: "card-a-link",
              properties: { focusable: true, url: "https://example.test/#card-a" },
              childIds: ["card-a-media", "card-a-heading", "card-a-body-text"],
            },
            {
              nodeId: "card-a-media",
              role: "group",
              name: "Plan A media",
              domNodeId: "card-a-media",
              childIds: ["card-a-image"],
            },
            {
              nodeId: "card-a-image",
              role: "image",
              name: "Plan A image",
              domNodeId: "card-a-image",
            },
            {
              nodeId: "card-a-heading",
              role: "heading",
              name: "Plan A",
              domNodeId: "card-a-heading",
              properties: { level: 2 },
              childIds: ["card-a-heading-text"],
            },
            { nodeId: "card-a-heading-text", role: "StaticText", name: "Plan A" },
            { nodeId: "card-a-body-text", role: "StaticText", name: "Use any time." },
            {
              nodeId: "card-b",
              role: "article",
              name: "Plan B",
              domNodeId: "card-b",
              childIds: ["card-b-heading", "card-b-link"],
            },
            {
              nodeId: "card-b-heading",
              role: "heading",
              name: "Plan B",
              domNodeId: "card-b-heading",
              properties: { level: 2 },
            },
            {
              nodeId: "card-b-link",
              role: "link",
              name: "Choose plan",
              domNodeId: "card-b-link",
              properties: { focusable: true, url: "https://example.test/#card-b" },
            },
          ],
        },
      },
    ),
    [
      "Plan A, article",
      "link, heading level 2, Plan A media Plan A Use any time.",
      "end of, Plan A, article",
      "Plan B, article",
      "heading level 2, Plan B",
      "Print label later.",
      "link, Choose plan",
      "end of, Plan B, article",
    ],
  );
});

test("scanSubtree uses AX URL fallback for empty-alt image-only links", () => {
  assert.deepEqual(
    scanHtml(
      `
        <a href="/" data-sr-dom-node-id="root-link"><img alt="" data-sr-dom-node-id="root-image"></a>
        <a href="/help/scam-protection" data-sr-dom-node-id="path-link"><img alt="" data-sr-dom-node-id="path-image"></a>
        <a href="/" aria-label="Example home" data-sr-dom-node-id="aria-link"><img alt="" data-sr-dom-node-id="aria-image"></a>
        <a href="/" title="Titled home" data-sr-dom-node-id="title-link"><img alt="" data-sr-dom-node-id="title-image"></a>
        <a href="/beta" data-sr-dom-node-id="text-link"><span>Beta partner</span><img alt="" data-sr-dom-node-id="text-image"></a>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "root-link",
              role: "link",
              name: "",
              domNodeId: "root-link",
              properties: { focusable: true, url: "https://example.test/" },
            },
            {
              nodeId: "path-link",
              role: "link",
              name: "",
              domNodeId: "path-link",
              properties: {
                focusable: true,
                url: "https://example.test/help/scam-protection",
              },
            },
            {
              nodeId: "aria-link",
              role: "link",
              name: "Example home",
              domNodeId: "aria-link",
              properties: { focusable: true, url: "https://example.test/" },
            },
            {
              nodeId: "title-link",
              role: "link",
              name: "Titled home",
              domNodeId: "title-link",
              properties: { focusable: true, url: "https://example.test/" },
            },
            {
              nodeId: "text-link",
              role: "link",
              name: "Beta partner",
              domNodeId: "text-link",
              properties: { focusable: true, url: "https://example.test/beta" },
            },
          ],
        },
      },
    ),
    [
      "link, https://example.test/",
      "link, scam-protection",
      "link, Example home",
      "link, Titled home",
      "link, Beta partner",
    ],
  );
});

test("scanSubtree suppresses AX-empty non-HTTP empty-alt image-only links", () => {
  assert.deepEqual(
    scanHtml(
      `
        <footer>
          <div>
            <a href="/" data-sr-dom-node-id="http-root"><img alt="" data-sr-dom-node-id="http-root-image"><span style="display:none">Home</span></a>
            <a href="javascript:void(0)" data-sr-dom-node-id="non-http-empty"><img alt="" data-sr-dom-node-id="non-http-empty-image"><span style="display:none">Hidden partner</span></a>
            <a href="/help/scam-protection" data-sr-dom-node-id="http-path"><img alt="" data-sr-dom-node-id="http-path-image"><span style="display:none">Scam protection</span></a>
            <a href="javascript:void(0)" aria-label="Named control" data-sr-dom-node-id="named-non-http"><img alt="" data-sr-dom-node-id="named-non-http-image"></a>
            <a href="javascript:void(0)" data-sr-dom-node-id="visible-non-http"><span>Visible control</span><img alt="" data-sr-dom-node-id="visible-non-http-image"></a>
            <a href="/terms" data-sr-dom-node-id="terms-link">Terms</a>
          </div>
        </footer>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "http-root",
              role: "link",
              name: "",
              domNodeId: "http-root",
              properties: { focusable: true, url: "https://example.test/" },
            },
            {
              nodeId: "non-http-empty",
              role: "link",
              name: "",
              domNodeId: "non-http-empty",
              properties: { focusable: true, url: "javascript:void(0)" },
            },
            {
              nodeId: "http-path",
              role: "link",
              name: "",
              domNodeId: "http-path",
              properties: {
                focusable: true,
                url: "https://example.test/help/scam-protection",
              },
            },
            {
              nodeId: "named-non-http",
              role: "link",
              name: "Named control",
              domNodeId: "named-non-http",
              properties: { focusable: true, url: "javascript:void(0)" },
            },
            {
              nodeId: "visible-non-http",
              role: "link",
              name: "Visible control",
              domNodeId: "visible-non-http",
              properties: { focusable: true, url: "javascript:void(0)" },
            },
            {
              nodeId: "terms-link",
              role: "link",
              name: "Terms",
              domNodeId: "terms-link",
              properties: { focusable: true, url: "https://example.test/terms" },
            },
          ],
        },
      },
    ),
    [
      "footer",
      "link, https://example.test/",
      "link, scam-protection",
      "link, Named control",
      "link, Visible control",
      "link, Terms",
      "end of, footer",
    ],
  );
});

test("scanSubtree preserves image role for unnamed SVG-only AX URL fallback links", () => {
  assert.deepEqual(
    scanHtml(
      `
        <a href="/" data-sr-dom-node-id="svg-root-link"><svg data-sr-dom-node-id="svg-root-image"></svg></a>
        <a href="/" aria-label="Named home" data-sr-dom-node-id="named-svg-link"><svg data-sr-dom-node-id="named-svg-image"></svg></a>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "svg-root-link",
              role: "link",
              name: "",
              domNodeId: "svg-root-link",
              properties: { focusable: true, url: "https://example.test/" },
            },
            {
              nodeId: "named-svg-link",
              role: "link",
              name: "Named home",
              domNodeId: "named-svg-link",
              properties: { focusable: true, url: "https://example.test/" },
            },
          ],
        },
      },
    ),
    [
      "link, image, https://example.test/",
      "link, Named home",
    ],
  );
});

test("scanSubtree splits AX linebreak static text runs in inline text", () => {
  assert.deepEqual(
    scanHtml(
      `
        <span data-sr-dom-node-id="price">$5/mo (Free plan);<br>included with Pro/Biz/Ent</span>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "1",
              ignored: true,
              role: "generic",
              domNodeId: "price",
              childIds: ["2", "3", "4"],
            },
            {
              nodeId: "2",
              role: "StaticText",
              name: "$5/mo (Free plan);",
            },
            {
              nodeId: "3",
              role: "LineBreak",
              name: "\n",
            },
            {
              nodeId: "4",
              role: "StaticText",
              name: "included with Pro/Biz/Ent",
            },
          ],
        },
      },
    ),
    ["$5/mo (Free plan);", "included with Pro/Biz/Ent"],
  );
});

test("scanSubtree splits AX static text runs with numeric units", () => {
  assert.deepEqual(
    scanHtml(
      `
        <div data-sr-dom-node-id="weight">up to 1kg</div>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "weight",
              ignored: true,
              role: "none",
              domNodeId: "weight",
              childIds: ["weight-prefix", "weight-value"],
            },
            {
              nodeId: "weight-prefix",
              role: "StaticText",
              name: "up to ",
            },
            {
              nodeId: "weight-value",
              role: "StaticText",
              name: "1kg",
            },
          ],
        },
      },
    ),
    ["up to", "1kg"],
  );
});

test("scanSubtree keeps visible small status text as one stop", () => {
  assert.deepEqual(
    scanHtml(
      `
        <div>
          <button>See all roles</button>
          <small data-sr-dom-node-id="count">Showing 6 of 268 roles. Use "See all roles" to browse everything.</small>
          <h3>Cloudflare Capabilities</h3>
        </div>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "count",
              role: "generic",
              name: "",
              domNodeId: "count",
              childIds: ["count-1", "count-2", "count-3", "count-4"],
            },
            { nodeId: "count-1", role: "StaticText", name: "Showing " },
            { nodeId: "count-2", role: "StaticText", name: "6" },
            { nodeId: "count-3", role: "StaticText", name: " of 268 " },
            {
              nodeId: "count-4",
              role: "StaticText",
              name: "roles. Use \"See all roles\" to browse everything.",
            },
          ],
        },
      },
    ),
    [
      "See all roles, button",
      "Showing 6 of 268 roles. Use \"See all roles\" to browse everything.",
      "heading level 3, Cloudflare Capabilities",
    ],
  );
});

test("scanSubtree traverses standalone inline emphasis siblings as text stops", () => {
  assert.deepEqual(
    scanHtml(
      `
        <div>
          <span>Cloudflare employees come from all walks of life. Our team is energized by a </span>
          <strong data-sr-dom-node-id="collab">collaborative</strong>
          <span>, </span>
          <strong data-sr-dom-node-id="creative">creative</strong>
          <span> environment that celebrates our differences and fosters new ways to </span>
          <strong data-sr-dom-node-id="grow">grow together.</strong>
        </div>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "collab",
              role: "strong",
              name: "",
              domNodeId: "collab",
              childIds: ["collab-text"],
            },
            { nodeId: "collab-text", role: "StaticText", name: "collaborative" },
            {
              nodeId: "creative",
              role: "strong",
              name: "",
              domNodeId: "creative",
              childIds: ["creative-text"],
            },
            { nodeId: "creative-text", role: "StaticText", name: "creative" },
            {
              nodeId: "grow",
              role: "strong",
              name: "",
              domNodeId: "grow",
              childIds: ["grow-text"],
            },
            { nodeId: "grow-text", role: "StaticText", name: "grow together." },
          ],
        },
      },
    ),
    [
      "Cloudflare employees come from all walks of life. Our team is energized by a",
      "collaborative",
      "creative",
      "environment that celebrates our differences and fosters new ways to",
      "grow together.",
    ],
  );
});

test("scanSubtree uses AX-rendered casing for figcaption text", () => {
  assert.deepEqual(
    scanHtml(
      `
        <figure>
          <figcaption data-sr-dom-node-id="caption">Compute</figcaption>
        </figure>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "1",
              role: "Figcaption",
              name: "",
              domNodeId: "caption",
              childIds: ["2"],
            },
            {
              nodeId: "2",
              role: "StaticText",
              name: "COMPUTE",
              childIds: ["3"],
            },
            {
              nodeId: "3",
              role: "InlineTextBox",
              name: "COMPUTE",
            },
          ],
        },
      },
    ),
    ["COMPUTE"],
  );
});

test("scanSubtree follows AX static text numeric run splits", () => {
  assert.deepEqual(
    scanHtml(
      `
        <span data-sr-dom-node-id="1">Audit logs automatically keep track of important workspace events over the last 3 months.</span>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "1",
              ignored: true,
              role: "none",
              domNodeId: "1",
              childIds: ["2", "3", "4", "5"],
            },
            {
              nodeId: "2",
              ignored: false,
              role: "StaticText",
              name: "Audit logs automatically keep track of important workspace events over the last",
            },
            {
              nodeId: "3",
              ignored: false,
              role: "StaticText",
              name: " ",
            },
            {
              nodeId: "4",
              ignored: false,
              role: "StaticText",
              name: "3",
            },
            {
              nodeId: "5",
              ignored: false,
              role: "StaticText",
              name: " months.",
            },
          ],
        },
      },
    ),
    [
      "Audit logs automatically keep track of important workspace events over the last",
      "3",
      "months.",
    ],
  );
});

test("scanSubtree keeps compact pagination range text intact despite AX numeric runs", () => {
  assert.deepEqual(
    scanHtml(
      `
        <span data-sr-dom-node-id="1">Showing 1 – 9 of 31</span>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "1",
              ignored: true,
              role: "none",
              domNodeId: "1",
              childIds: ["2", "3", "4", "5"],
            },
            {
              nodeId: "2",
              ignored: false,
              role: "StaticText",
              name: "Showing 1 –",
            },
            {
              nodeId: "3",
              ignored: false,
              role: "StaticText",
              name: "9",
            },
            {
              nodeId: "4",
              ignored: false,
              role: "StaticText",
              name: "of",
            },
            {
              nodeId: "5",
              ignored: false,
              role: "StaticText",
              name: "31",
            },
          ],
        },
      },
    ),
    ["Showing 1 – 9 of 31"],
  );
});

test("scanSubtree skips paragraph wrappers that only contain interactive content", () => {
  assert.deepEqual(
    scanHtml(`
      <div>
        <h2>Must-know features.</h2>
        <p><a href="/features/"><span>Browse all features</span><span aria-hidden="true">›</span></a></p>
      </div>
    `),
    [
      "heading level 2, Must-know features.",
      "link, Browse all features",
    ],
  );
});

test("scanSubtree ignores hidden responsive disclosure buttons inside headings", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Directory">
        <h3>
          <span>Shop and Learn</span>
          <button disabled data-sr-computed-hidden="display:none">
            <span>Shop and Learn</span>
            <span aria-hidden="true">+</span>
          </button>
        </h3>
        <ul role="list">
          <li><a href="/store">Store</a></li>
          <li><a href="/mac">Mac</a></li>
        </ul>
      </nav>
    `),
    [
      "Directory, navigation",
      "heading level 3, Shop and Learn",
      "list 2 items",
      "link, Store, 1 of 2",
      "link, Mac, 2 of 2",
      "end of list",
      "end of, Directory, navigation",
    ],
  );
});

test("scanSubtree emits direct aria-labelledby navigation header labels before child lists", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-labelledby="toc-heading">
        <header id="toc-heading">Page Contents</header>
        <div>
          <ul>
            <li><a href="#intro">Introduction</a></li>
            <li><a href="#more">More</a></li>
          </ul>
        </div>
      </nav>
    `),
    [
      "Page Contents, navigation",
      "Page Contents",
      "list 2 items",
      "link, Introduction, 1 of 2",
      "link, More, 2 of 2",
      "end of list",
      "end of, Page Contents, navigation",
    ],
  );
});

test("scanSubtree does not duplicate aria-label-only or out-of-flow navigation labels", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Page Contents">
        <ul><li><a href="#intro">Introduction</a></li></ul>
      </nav>
    `),
    [
      "Page Contents, navigation",
      "list 1 item",
      "link, Introduction",
      "end of list",
      "end of, Page Contents, navigation",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <h2 id="toc-heading">Page Contents</h2>
      <nav aria-labelledby="toc-heading">
        <ul><li><a href="#intro">Introduction</a></li></ul>
      </nav>
    `),
    [
      "heading level 2, Page Contents",
      "Page Contents, navigation",
      "list 1 item",
      "link, Introduction",
      "end of list",
      "end of, Page Contents, navigation",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <nav aria-labelledby="toc-heading">
        <header id="toc-heading" hidden>Page Contents</header>
        <ul><li><a href="#intro">Introduction</a></li></ul>
      </nav>
    `),
    [
      "Page Contents, navigation",
      "list 1 item",
      "link, Introduction",
      "end of list",
      "end of, Page Contents, navigation",
    ],
  );
});

test("scanSubtree traverses links inside presentation list items", () => {
  assert.deepEqual(
    scanHtml(`
      <div class="oh-toolbar">
        <button aria-label="Open menu"></button>
        <a role="link" href="/" aria-label="TUI homepage">
          <img alt="" src="/logo.svg">
        </a>
        <ul role="navigation" class="oh-service-links">
          <li>
            <a href="tel:02034512688">To book, call <strong>0203 451 2688</strong></a>
          </li>
          <li role="presentation" class="desktop">
            <a role="link" href="/destinations/info/travel-information">Travel information</a>
          </li>
          <li role="presentation" class="desktop">
            <a role="link" href="/destinations/faq">Help Centre</a>
          </li>
        </ul>
      </div>
    `),
    [
      "Open menu, button",
      "link, TUI homepage",
      "navigation",
      "link, To book, call 0203 451 2688",
      "link, Travel information",
      "link, Help Centre",
      "end of, navigation",
    ],
  );
});

test("scanSubtree splits direct text and one inline link in generic div blocks", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <div>Interaction to Next Paint (INP) is now a Core Web Vital metrics. <a href="/explore/how-to-optimize-inp">Start measuring and optimizing</a> your site's INP.</div>
        <div>Get up to speed with the latest updates and news on <a href="/baseline">Baseline</a>.</div>
      </section>
    `),
    [
      "Interaction to Next Paint (INP) is now a Core Web Vital metrics.",
      "link, Start measuring and optimizing",
      "your site's INP.",
      "Get up to speed with the latest updates and news on",
      "link, Baseline",
    ],
  );
});

test("scanSubtree follows AX order for link-first article paragraphs", () => {
  assert.deepEqual(
    scanHtml(
      `
        <article>
          <p data-sr-dom-node-id="recent-text"><a href="/sign-in" data-sr-dom-node-id="sign-in-link">Sign in</a> to see saved items.</p>
        </article>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "recent-text",
              childIds: ["link", "tail"],
            },
            {
              nodeId: "link",
              role: "link",
              name: "Sign in",
              domNodeId: "sign-in-link",
              properties: { focusable: true, url: "https://example.test/sign-in" },
            },
            {
              nodeId: "tail",
              role: "StaticText",
              name: " to see saved items.",
            },
          ],
        },
      },
    ),
    [
      "article",
      "link, Sign in",
      "to see saved items.",
      "end of, article",
    ],
  );
});

test("scanSubtree names native submit controls from AX-confirmed form values", () => {
  assert.deepEqual(
    scanHtml(
      `
        <form>
          <label for="site-search">Search</label>
          <input id="site-search" type="text" placeholder="Search Royal Mail" value="" data-sr-dom-node-id="search-input">
          <input type="submit" value="Search" data-sr-dom-node-id="search-submit">
        </form>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "input",
              role: "textbox",
              name: "Search",
              domNodeId: "search-input",
              properties: { focusable: true },
            },
            {
              nodeId: "submit",
              role: "button",
              name: "Search",
              domNodeId: "search-submit",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "Search",
      "Search Search Royal Mail, edit text",
      "Search, button",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <form>
        <label for="site-search">Search</label>
        <input id="site-search" type="text" placeholder="Search Royal Mail" value="">
        <input type="submit" value="Search">
      </form>
    `),
    [
      "Search Search Royal Mail, edit text",
      "button",
    ],
  );
});

test("scanSubtree emits label stops and submit names for AX-confirmed native search forms", () => {
  assert.deepEqual(
    scanHtml(
      `
        <form role="search">
          <label for="primary-search">Search</label>
          <input id="primary-search" type="text" placeholder="Search site" value="" data-sr-dom-node-id="primary-input">
          <input type="submit" value="Search" data-sr-dom-node-id="primary-submit">
        </form>
        <form role="search">
          <label for="secondary-search">Search</label>
          <input id="secondary-search" type="text" placeholder="Search site" value="" data-sr-dom-node-id="secondary-input">
          <button type="submit" data-sr-dom-node-id="secondary-submit">Search</button>
        </form>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "primary-input",
              role: "textbox",
              name: "Search",
              domNodeId: "primary-input",
              properties: { focusable: true },
            },
            {
              nodeId: "primary-submit",
              role: "button",
              name: "Search",
              domNodeId: "primary-submit",
              properties: { focusable: true },
            },
            {
              nodeId: "secondary-input",
              role: "textbox",
              name: "Search",
              domNodeId: "secondary-input",
              properties: { focusable: true },
            },
            {
              nodeId: "secondary-submit",
              role: "button",
              name: "Search",
              domNodeId: "secondary-submit",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "search",
      "Search",
      "Search Search site, edit text",
      "Search, button",
      "end of, search",
      "search",
      "Search",
      "Search Search site, edit text",
      "Search, button",
      "end of, search",
    ],
  );
});

test("scanSubtree ignores native search-form shortcut when no label exists", () => {
  assert.deepEqual(
    scanHtml(`
      <form>
        <input type="text" aria-label="input" placeholder="Departure city" data-sr-dom-node-id="ba-input">
        <input type="submit" value="Find flights" data-sr-dom-node-id="ba-submit">
      </form>
    `),
    [
      "input, edit text, Departure city",
      "button",
    ],
  );
});

test("scanSubtree places AX-confirmed placeholder-only textbox names before edit text", () => {
  assert.deepEqual(
    scanHtml(
      `
        <form>
          <input type="text" placeholder="Reference number e.g. CD123456789XY" value="" data-sr-dom-node-id="reference-input">
          <a href="/reference-help">Where to find this</a>
          <button type="submit">Check item</button>
        </form>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "reference-input",
              role: "textbox",
              name: "Reference number e.g. CD123456789XY",
              domNodeId: "reference-input",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "Reference number e.g. CD123456789XY edit text, blank",
      "link, Where to find this",
      "Check item, button",
    ],
  );
});

test("scanSubtree announces named form boundaries around labelled combobox controls", () => {
  assert.deepEqual(
    scanHtml(`
      <div role="form" aria-label="Search MCP registry">
        <label for="mcp-search">Search MCP registry</label>
        <input
          id="mcp-search"
          type="text"
          role="combobox"
          placeholder="Search MCPs"
          aria-haspopup="listbox"
          aria-expanded="false"
        >
        <button type="submit">Search</button>
      </div>
    `),
    [
      "Search MCP registry, form",
      "Search MCP registry",
      "Search MCP registry Search MCPs, list box pop up collapsed, combo box",
      "Search, button",
      "end of, Search MCP registry, form",
    ],
  );
});

test("scanSubtree announces named native form boundaries inside anonymous shadow hosts", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <x-search-shell>
          <template shadowrootmode="open">
            <form aria-label="Package search">
              <button type="button">Search holidays</button>
            </form>
          </template>
        </x-search-shell>
      </main>
    `),
    [
      "main",
      "Package search, form",
      "Search holidays, button",
      "end of, Package search, form",
      "end of, main",
    ],
  );
});

test("scanSubtree keeps anonymous shadow hosts transparent around named context children", () => {
  assert.deepEqual(
    scanHtml(`
      <x-search-shell>
        <template shadowrootmode="open">
          <nav aria-label="Search type">
            <button type="button">Holidays</button>
            <button type="button">Cruises</button>
          </nav>
          <form aria-label="Package search">
            <button type="button">Search holidays</button>
          </form>
        </template>
      </x-search-shell>
    `),
    [
      "Search type, navigation",
      "Holidays, button",
      "Cruises, button",
      "end of, Search type, navigation",
      "Package search, form",
      "Search holidays, button",
      "end of, Package search, form",
    ],
  );
});

test("scanSubtree announces fieldset legend groups inside named forms", () => {
  assert.deepEqual(
    scanHtml(`
      <x-search-shell>
        <template shadowrootmode="open">
          <form aria-label="Package search">
            <fieldset>
              <legend class="visually-hidden">Unfortunately, this form is not fully accessible.</legend>
              <div aria-live="polite">Search panel ready</div>
              <button type="button">Search</button>
            </fieldset>
          </form>
        </template>
      </x-search-shell>
    `),
    [
      "Package search, form",
      "Unfortunately, this form is not fully accessible., group",
      "Unfortunately, this form is not fully accessible.",
      "Search panel ready",
      "Search, button",
      "end of, Unfortunately, this form is not fully accessible., group",
      "end of, Package search, form",
    ],
  );
});

test("scanSubtree announces labelled radiogroup boundaries inside named forms", () => {
  assert.deepEqual(
    scanHtml(`
      <x-search-shell>
        <template shadowrootmode="open">
          <form aria-label="Package search">
            <div role="radiogroup" aria-label="Holiday type">
              <label for="package-holiday">
                <input type="radio" id="package-holiday" name="holiday-type" checked>
                Package holiday
              </label>
              <label for="flight-only">
                <input type="radio" id="flight-only" name="holiday-type">
                Flight only
              </label>
            </div>
          </form>
        </template>
      </x-search-shell>
    `),
    [
      "Package search, form",
      "Holiday type, radio group",
      "Package holiday, selected, radio button, 1 of 2",
      "Flight only, radio button, 2 of 2",
      "end of, Holiday type, radio group",
      "end of, Package search, form",
    ],
  );
});

test("scanSubtree splits composite readonly overlay input labels and text wording", () => {
  assert.deepEqual(
    scanHtml(`
      <x-search-shell>
        <template shadowrootmode="open">
          <form aria-label="Package search">
            <label for="departure-airport">Where from?</label>
            <div>
              <button type="button"></button>
              <input
                id="departure-airport"
                type="text"
                readonly
                tabindex="-1"
                aria-label="Select departure airport(s), collapsed"
                placeholder="Any UK airport"
              >
              <button type="reset" aria-label="Reset departure airport" tabindex="-1">x</button>
            </div>
          </form>
        </template>
      </x-search-shell>
    `),
    [
      "Package search, form",
      "Where from?",
      "button",
      "Select departure airport(s), collapsed Any UK airport, clickable, text",
      "Reset departure airport, button",
      "end of, Package search, form",
    ],
  );
});

test("scanSubtree announces native horizontal rules as splitters", () => {
  assert.deepEqual(
    scanHtml(`
      <footer>
        <hr>
        <h2>Support links</h2>
      </footer>
    `),
    [
      "content information",
      "horizontal splitter",
      "heading level 2, Support links",
      "end of, content information",
    ],
  );
});

test("scanSubtree splits visible labels before required native password inputs", () => {
  assert.deepEqual(
    scanHtml(`
      <form>
        <label for="password">Password</label>
        <input id="password" type="password" required>
      </form>
    `),
    [
      "Password",
      "Password, required, secure text field",
    ],
  );
});

test("scanSubtree announces empty banner landmarks without a matching end boundary", () => {
  assert.deepEqual(
    scanHtml(
      `
        <a href="#main">Skip to content</a>
        <div role="banner" data-sr-dom-node-id="banner"></div>
        <main id="main"><h1>Sign in</h1></main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "banner",
              role: "banner",
              name: "",
              domNodeId: "banner",
            },
          ],
        },
      },
    ),
    [
      "link, Skip to content",
      "empty banner",
      "main",
      "heading level 1, Sign in",
      "end of, main",
    ],
  );
});

test("scanSubtree uses visible ellipsis text when it only differs from a button aria name by glyph form", () => {
  assert.deepEqual(
    scanHtml(
      `
        <button aria-label="Search or jump to…" aria-haspopup="dialog" data-sr-dom-node-id="search-button">
          <span>Search or jump to...</span>
        </button>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "search-button",
              role: "button",
              name: "Search or jump to…",
              domNodeId: "search-button",
              properties: { focusable: true, hasPopup: "dialog" },
            },
          ],
        },
      },
    ),
    ["Search or jump to... dialog pop up, button"],
  );
});

test("scanSubtree suppresses paragraph text that only duplicates a named native button", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <p data-sr-dom-node-id="wrapper">
            <button type="button" data-sr-dom-node-id="passkey"><span><span>Sign in with a passkey</span></span></button>
          </p>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "button",
              role: "button",
              name: "Sign in with a passkey",
              domNodeId: "passkey",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "main",
      "Sign in with a passkey, button",
      "end of, main",
    ],
  );
});

test("scanSubtree keeps pagination navigation buttons ungrouped while preserving current page", () => {
  assert.deepEqual(
    scanHtml(
      `
        <nav aria-label="Pagination">
          <a role="button" aria-disabled="true" aria-label="Previous Page" data-sr-dom-node-id="previous"><span><span>Previous</span></span></a>
          <a role="button" href="?page=1" aria-current="page" aria-label="Page 1" data-sr-dom-node-id="page-1"><span>1</span></a>
          <a role="button" href="?page=2" aria-label="Page 2..." data-sr-dom-node-id="page-2"><span>2</span></a>
          <a role="button" href="?page=2" aria-label="Next Page" data-sr-dom-node-id="next"><span><span>Next</span></span></a>
        </nav>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "previous",
              role: "button",
              name: "Previous Page",
              domNodeId: "previous",
              properties: { disabled: true },
            },
            {
              nodeId: "page-1",
              role: "button",
              name: "Page 1",
              domNodeId: "page-1",
              properties: { focusable: true },
            },
            {
              nodeId: "page-2",
              role: "button",
              name: "Page 2...",
              domNodeId: "page-2",
              properties: { focusable: true },
            },
            {
              nodeId: "next",
              role: "button",
              name: "Next Page",
              domNodeId: "next",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "Pagination, navigation",
      "Previous Page, dimmed, button",
      "Page 1, current page, button",
      "Page 2..., button",
      "Next Page, button",
      "end of, Pagination, navigation",
    ],
  );
});

test("scanSubtree preserves VoiceOver selected group wording for controlled tablists without aria-selected", () => {
  assert.deepEqual(
    scanHtml(`
      <div role="tablist" aria-controls="feature-panel">
        <button role="tab">Code</button>
        <button role="tab">Plan</button>
      </div>
      <p id="feature-panel" role="region">Write, test, and fix code quickly.</p>
    `),
    [
      "Code, selected, tab, group, 1 of 2",
      "Plan, selected, tab, group, 2 of 2",
      "Write, test, and fix code quickly.",
    ],
  );
});

test("scanSubtree matches checkbox role button accordion state and named region ordering", () => {
  assert.deepEqual(
    scanHtml(`
      <section aria-label="Expanded selected checkbox-button with region">
        <div>
          <input
            id="alpha-control"
            type="checkbox"
            role="button"
            aria-label="Alpha sharing"
            aria-expanded="true"
            aria-controls="alpha-panel"
            checked
            disabled
          >
          <label for="alpha-control" aria-hidden="true">
            <span>Alpha sharing</span>
          </label>
          <div aria-live="polite">
            <div id="alpha-panel" role="region" aria-labelledby="alpha-control">
              <p>Panel text for the selected item.</p>
              <a href="/learn">Learn more</a>
              <img src="/preview.png" alt="Panel preview">
            </div>
          </div>
          <input
            id="beta-control"
            type="checkbox"
            role="button"
            aria-label="Beta analytics"
            aria-expanded="false"
            aria-controls="beta-panel"
          >
          <label for="beta-control" aria-hidden="true">
            <span>Beta analytics</span>
          </label>
          <div aria-live="polite">
            <div
              id="beta-panel"
              role="region"
              aria-labelledby="beta-control"
              data-sr-computed-hidden="display:none"
            >
              <p>Hidden beta panel text.</p>
            </div>
          </div>
        </div>
      </section>
    `),
    [
      "Expanded selected checkbox-button with region, region",
      "Alpha sharing, dimmed expanded, button",
      "Alpha sharing, region",
      "Panel text for the selected item.",
      "link, Learn more",
      "Panel preview, image",
      "end of, Alpha sharing, region",
      "Beta analytics, collapsed, button",
      "end of, Expanded selected checkbox-button with region, region",
    ],
  );
});

test("scanSubtree announces labelled ARIA tablists as tab groups", () => {
  assert.deepEqual(
    scanHtml(`
      <section aria-label="Build examples">
        <div role="tablist" aria-label="Build primitives">
          <button id="tab-compute" role="tab" aria-selected="true" aria-controls="panel-compute">Compute</button>
          <button id="tab-ai" role="tab" aria-selected="false" aria-controls="panel-ai">AI</button>
          <button id="tab-storage" role="tab" aria-selected="false" aria-controls="panel-storage">Storage</button>
        </div>
      </section>
    `),
    [
      "Build examples, region",
      "Build primitives, tab group",
      "Compute, selected, tab, 1 of 3",
      "AI, tab, 2 of 3",
      "Storage, tab, 3 of 3",
      "end of, Build primitives, tab group",
      "end of, Build examples, region",
    ],
  );
});

test("scanSubtree suppresses decorative terminal horizontal rules before hidden content", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <p>Language links</p>
        <hr>
        <div data-sr-computed-hidden="display:none">
          <button>Hidden prompt</button>
        </div>
      </main>
    `),
    [
      "main",
      "Language links",
      "end of, main",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <main>
        <p>Section content</p>
        <hr>
      </main>
    `),
    [
      "main",
      "Section content",
      "horizontal splitter",
      "end of, main",
    ],
  );
});

test("scanSubtree preserves main-content separators before headed lists", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <p>Previous section.</p>
        <hr>
        <section>
          <h2>Related links</h2>
          <ul>
            <li><a href="/one">One</a></li>
            <li><a href="/two">Two</a></li>
          </ul>
        </section>
      </main>
    `),
    [
      "main",
      "Previous section.",
      "horizontal splitter",
      "heading level 2, Related links",
      "list 2 items",
      "link, One, 1 of 2",
      "link, Two, 2 of 2",
      "end of list",
      "end of, main",
    ],
  );
});

test("scanSubtree distinguishes unmarked footer link sections from marker-backed lists after separators", () => {
  assert.deepEqual(
    scanHtml(`
      <footer>
        <p>Previous footer content.</p>
        <hr>
        <div>
          <h2>Support links</h2>
          <ul>
            <li><a href="/help">Help</a></li>
            <li><a href="/privacy">Privacy</a></li>
          </ul>
        </div>
      </footer>
    `),
    [
      "footer",
      "Previous footer content.",
      "heading level 2, Support links",
      "list 2 items",
      "link, Help, 1 of 2",
      "link, Privacy, 2 of 2",
      "end of list",
      "end of, footer",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <footer>
        <p>Previous footer content.</p>
        <hr>
        <div>
          <h2>Support links</h2>
          <ul>
            <li data-sr-marker-content="normal" data-sr-marker-display="inline-block" data-sr-marker-list-style-type="disc"><a href="/help">Help</a></li>
            <li data-sr-marker-content="normal" data-sr-marker-display="inline-block" data-sr-marker-list-style-type="disc"><a href="/privacy">Privacy</a></li>
          </ul>
        </div>
      </footer>
    `),
    [
      "footer",
      "Previous footer content.",
      "horizontal splitter",
      "heading level 2, Support links",
      "list 2 items",
      "link, Help, 1 of 2",
      "link, Privacy, 2 of 2",
      "end of list",
      "end of, footer",
    ],
  );
});

test("scanSubtree suppresses decorative footer separators before inline legal paragraphs", () => {
  assert.deepEqual(
    scanHtml(`
      <footer>
        <nav aria-label="Other projects">
          <a href="/project">Project directory</a>
        </nav>
        <hr>
        <p>
          <small>This page is available under the <a href="/license">Creative Commons Attribution-ShareAlike License</a></small>
          <small><a href="/terms">Terms of Use</a></small>
          <small><a href="/privacy">Privacy Policy</a></small>
        </p>
      </footer>
    `),
    [
      "footer",
      "Other projects, navigation",
      "link, Project directory",
      "end of, Other projects, navigation",
      "This page is available under the",
      "link, Creative Commons Attribution-ShareAlike License",
      "link, Terms of Use",
      "link, Privacy Policy",
      "end of, footer",
    ],
  );
});

test("scanSubtree splits paragraph text around inline semantic and link boundaries", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <p>The <strong><code>accept</code></strong> attribute takes as its value a comma-separated list of one or more file types, or <a href="#unique_file_type_specifiers">unique file type specifiers</a>, describing which file types to allow.</p>
      </main>
    `),
    [
      "main",
      "The",
      "accept",
      "attribute takes as its value a comma-separated list of one or more file types, or",
      "link, unique file type specifiers",
      ", describing which file types to allow.",
      "end of, main",
    ],
  );
});

test("scanSubtree tolerates MathML computed style gaps in JSDOM", () => {
  const announcements = scanHtml(`
    <main>
      <p>The equation is <math aria-label="x plus y equals z over one half"><mi>x</mi><mo>+</mo><mi>y</mi><mo>=</mo><mi>z</mi><mfrac><mn>1</mn><mn>2</mn></mfrac></math>.</p>
    </main>
  `);

  assert.ok(
    announcements.some((announcement) => announcement.includes("The equation is")),
    "expected scanner to traverse text around inline MathML",
  );
});

test("scanSubtree suppresses unnamed scan-root main wrapper boundaries", () => {
  assert.deepEqual(
    scanHtml(`
      <main data-sr-scan-root>
        <h1>Fixture root</h1>
        <section aria-label="Details"><p>Reusable content.</p></section>
      </main>
    `),
    [
      "heading level 1, Fixture root",
      "Details, region",
      "Reusable content.",
      "end of, Details, region",
    ],
  );
});

test("scanSubtree exposes portal fallback text", () => {
  assert.deepEqual(
    scanHtml(`
      <main data-sr-scan-root>
        <h1>Portal coverage</h1>
        <section aria-label="Portal example">
          <p>Before portal.</p>
          <portal src="https://example.test/preview">Portal fallback text</portal>
        </section>
      </main>
    `),
    [
      "heading level 1, Portal coverage",
      "Portal example, region",
      "Before portal.",
      "Portal fallback text",
      "end of, Portal example, region",
    ],
  );
});

test("scanSubtree announces native meter and progress semantics", () => {
  assert.deepEqual(
    scanHtml(`
      <main data-sr-scan-root>
        <h1>Meter and progress controls</h1>
        <label for="storage-used">Storage used</label>
        <meter id="storage-used" min="0" max="100" value="64">64%</meter>
        <label for="reduced-storage">Reduced storage</label>
        <meter id="reduced-storage" value="64">64%</meter>
        <label for="upload-progress">Upload progress</label>
        <progress id="upload-progress" max="100" value="70">70%</progress>
        <label for="loading-progress">Loading progress</label>
        <progress id="loading-progress">Loading</progress>
      </main>
    `),
    [
      "heading level 1, Meter and progress controls",
      "Storage used",
      "64%, Storage used, level indicator",
      "Reduced storage",
      "64%, Reduced storage, level indicator",
      "Upload progress",
      "Upload progress, 70%, progress indicator",
      "Loading progress",
      "Loading progress, indeterminate, progress indicator",
    ],
  );
});

test("scanSubtree exposes named object and embed elements as objects", () => {
  assert.deepEqual(
    scanHtml(`
      <main data-sr-scan-root>
        <h1>Object coverage</h1>
        <embed aria-label="Embedded SVG demo" type="image/svg+xml">
        <embed aria-label="Loaded SVG demo" type="image/svg+xml" src="data:image/svg+xml,%3Csvg/%3E">
        <object data="data:image/svg+xml,%3Csvg/%3E" aria-label="Loaded object demo"></object>
        <object>Fallback text that VoiceOver does not expose as object name.</object>
      </main>
    `),
    [
      "heading level 1, Object coverage",
      "Embedded SVG demo, empty object",
      "Loaded SVG demo, object",
      "Loaded object demo, object",
    ],
  );
});

test("scanSubtree exposes image map areas as grouped links from native and reduced HTML", () => {
  assert.deepEqual(
    scanHtml(`
      <main data-sr-scan-root>
        <h1>Image map coverage</h1>
        <img alt="Travel services map">
        <map name="travel-map">
          <area href="#flights" alt="Flights">
          <area href="#hotels" alt="Hotels">
          <area href="#missing-name">
          <area href="plain-target.html">
          <area href="/absolute/path-target.html" alt="">
        </map>
        <p id="flights">Flights section target.</p>
        <p id="hotels">Hotels section target.</p>
        <img alt="Image with broken map reference" usemap="#missing-map">
      </main>
    `),
    [
      "heading level 1, Image map coverage",
      "Travel services map, group",
      "link, Flights",
      "link, Hotels",
      "link, blank",
      "link, plain-target.html",
      "link, path-target.html",
      "end of, Travel services map, group",
      "Flights section target.",
      "Hotels section target.",
      "Image with broken map reference, image",
    ],
  );
});

test("scanSubtree announces native datalist, select, number, and range controls", () => {
  assert.deepEqual(
    scanHtml(`
      <main data-sr-scan-root>
        <h1>Native form controls</h1>
        <label for="city-choice">Choose a city</label>
        <input id="city-choice" list="city-options">
        <datalist id="city-options"><option value="London"></option></datalist>
        <input placeholder="No visible label" list="colour-options">
        <datalist id="colour-options"><option value="Red"></option></datalist>
        <input aria-label="No visible label" list="missing-options">
        <label for="broken-list-input">Input with missing datalist target</label>
        <input id="broken-list-input" list="missing-list">
        <label for="support-topic">Support topic</label>
        <select id="support-topic"><option>Select a topic</option></select>
        <select id="search-department" title="Search in" aria-describedby="search-help">
          <option selected>All Departments</option>
          <option>Books</option>
        </select>
        <span id="search-help" hidden>Select the department you want to search in</span>
        <label for="price">Price</label>
        <input id="price" type="number" value="10">
        <label for="volume">Volume</label>
        <input id="volume" type="range" min="0" max="100" value="40">
      </main>
    `),
    [
      "heading level 1, Native form controls",
      "Choose a city",
      "Choose a city, list box pop up, combo box",
      "No visible label list box pop up, combo box",
      "No visible label, edit text",
      "Input with missing datalist target",
      "Input with missing datalist target, edit text",
      "Support topic",
      "Select a topic, Support topic, menu pop up collapsed, button",
      "All Departments, Search in Select the department you want to search in, menu pop up collapsed, button",
      "Price",
      "10, Price, stepper",
      "Volume",
      "40, Volume, slider",
    ],
  );
});

test("scanSubtree splits direct HTML phrasing element text boundaries", () => {
  assert.deepEqual(
    scanHtml(`
      <main data-sr-scan-root>
        <p><dfn>Cache</dfn> means stored data.</p>
        <p>The product is <mark>available today</mark> from selected stores.</p>
        <p>The policy says <q>bring one photo ID</q>.</p>
        <p>The old word was <del>voucher</del> and the new word is <ins>credit</ins>.</p>
        <p>Water is H<sub>2</sub>O.</p>
        <p><s>Sold out</s> Reopened for booking.</p>
      </main>
    `),
    [
      "Cache, empty term",
      "means stored data.",
      "The product is",
      "available today",
      "from selected stores.",
      "The policy says “bring one photo ID”.",
      "The old word was",
      "voucher",
      "• and the new word is",
      "credit",
      "Water is H",
      "O.",
      "Sold out",
      "Reopened for booking.",
    ],
  );
});

test("scanSubtree splits output values, address lines, and canvas fallback text", () => {
  assert.deepEqual(
    scanHtml(`
      <main data-sr-scan-root>
        <h1>Authored fallback coverage</h1>
        <p>Total: <output>12</output></p>
        <p>Status: <output role="status">No changes saved yet.</output></p>
        <canvas>Canvas fallback text describing the drawing.</canvas>
        <address>
          Example Travel Ltd<br>
          1 Station Road<br>
          London
        </address>
      </main>
    `),
    [
      "heading level 1, Authored fallback coverage",
      "Total:",
      "12",
      "Status:",
      "No changes saved yet.",
      "Canvas fallback text describing the drawing.",
      "Example Travel Ltd",
      "1 Station Road",
      "London",
    ],
  );
});

test("scanSubtree includes native table captions and VoiceOver-style first-column context", () => {
  assert.deepEqual(
    scanHtml(`
      <main data-sr-scan-root>
        <table>
          <caption>Monthly travel costs</caption>
          <thead>
            <tr><th scope="col">Month</th><th scope="col">Rail</th><th scope="col">Hotel</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row">January</th><td>100</td><td>200</td></tr>
            <tr><th scope="row">February</th><td>120</td><td>180</td></tr>
          </tbody>
          <tfoot>
            <tr><th scope="row">Total</th><td>220</td><td>380</td></tr>
          </tfoot>
        </table>
        <table>
          <tbody>
            <tr><td>London</td><td>10</td></tr>
            <tr><td>Paris</td><td>20</td></tr>
          </tbody>
          <tfoot>
            <tr><td></td><td>30</td></tr>
          </tfoot>
        </table>
      </main>
    `),
    [
      "Monthly travel costs, table, 3 columns, 4 rows",
      "Month, column 1 of 3",
      "Rail Rail, column 2 of 3",
      "Hotel Hotel, column 3 of 3",
      "row 2 of 4 January Month January, column 1 of 3",
      "Rail 100, column 2 of 3",
      "Hotel 200, column 3 of 3",
      "row 3 of 4 February Month February, column 1 of 3",
      "Rail 120, column 2 of 3",
      "Hotel 180, column 3 of 3",
      "row 4 of 4 Total Month Total, column 1 of 3",
      "Rail 220, column 2 of 3",
      "Hotel 380, column 3 of 3",
      "end of table",
      "table, 2 columns, 3 rows",
      "London, column 1 of 2",
      "10, column 2 of 2",
      "row 2 of 3 Paris, column 1 of 2",
      "20, column 2 of 2",
      "row 3 of 3 blank, column 1 of 2",
      "30, column 2 of 2",
      "end of table",
    ],
  );
});

test("scanSubtree splits AX-confirmed native table cell child text", () => {
  assert.deepEqual(
    scanHtml(
      `
        <table>
          <thead>
            <tr><th scope="col">Format</th><th scope="col">Weight</th></tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Letter</th>
              <td data-sr-dom-node-id="weight-cell">
                <p>up to</p>
                <p><strong>100 g</strong></p>
              </td>
            </tr>
          </tbody>
        </table>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "weight-cell",
              role: "cell",
              name: "up to 100 g",
              domNodeId: "weight-cell",
              childIds: ["weight-prefix", "weight-value"],
            },
            {
              nodeId: "weight-prefix",
              role: "StaticText",
              name: "up to",
            },
            {
              nodeId: "weight-value",
              role: "StaticText",
              name: "100 g",
            },
          ],
        },
      },
    ),
    [
      "table, 2 columns, 2 rows",
      "Format, column 1 of 2",
      "Weight Weight, column 2 of 2",
      "row 2 of 2 Letter Format Letter, column 1 of 2",
      "Weight up to, column 2 of 2",
      "100 g",
      "end of table",
    ],
  );
});

test("scanSubtree preserves DOM card spacing when AX only inserts post-punctuation whitespace", () => {
  assert.deepEqual(
    scanHtml(
      `
        <section aria-labelledby="card-heading" data-sr-dom-node-id="region">
          <ul>
            <li>
              <a href="/join" data-sr-dom-node-id="card-link">
                <p id="card-heading">Join the panel</p><p>Available in the U.S., U.K., and Germany.</p><span>Join now</span>
              </a>
            </li>
          </ul>
        </section>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "region",
              role: "region",
              name: "Join the panel",
              domNodeId: "region",
            },
            {
              nodeId: "link",
              role: "link",
              name: "Join the panel Available in the U.S., U.K., and Germany. Join now",
              domNodeId: "card-link",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "Join the panel, region",
      "list 1 item",
      "link, Join the panel Available in the U.S., U.K., and Germany.Join now",
      "end of list",
      "end of, Join the panel, region",
    ],
  );
});

test("scanSubtree splits paragraph text around code-backed inline links", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <p>The accept property is an attribute of the <a href="/file">file</a><a href="/input"><code>&lt;input&gt;</code></a> type. It was supported on the <a href="/form"><code>&lt;form&gt;</code></a> element, but was removed in favor of <a href="/file">file</a>.</p>
      </main>
    `),
    [
      "main",
      "The accept property is an attribute of the",
      "link, file",
      "link, <input>",
      "type. It was supported on the",
      "link, <form>",
      "element, but was removed in favor of",
      "link, file",
      "end of, main",
    ],
  );
});

test("scanSubtree splits C5-confirmed GOV.UK paragraph inline code tokens", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <div aria-hidden="true">GOV.UK Design System team</div>
        <p>The 3 date fields are grouped together in a <code>&lt;fieldset&gt;</code> with a <code>&lt;legend&gt;</code> that describes them.</p>
        <p>Set the <code>inputmode</code> attribute to <code>numeric</code> for whole numbers. For decimal values, set <code>inputmode</code> to <code>decimal</code>.</p>
        <p data-sr-rendered-position="offscreen">To do this, set the <code data-sr-rendered-position="offscreen">autocomplete</code> attribute on the 3 fields to <code data-sr-rendered-position="offscreen">bday-day</code>, <code data-sr-rendered-position="offscreen">bday-month</code> and <code data-sr-rendered-position="offscreen">bday-year</code>.</p>
      </main>
    `),
    [
      "main",
      "The 3 date fields are grouped together in a",
      "<fieldset>",
      "with a",
      "<legend>",
      "that describes them.",
      "Set the",
      "inputmode",
      "attribute to",
      "numeric",
      "for whole numbers. For decimal values, set",
      "inputmode",
      "to",
      "decimal",
      "To do this, set the",
      "autocomplete",
      "attribute on the 3 fields to",
      "bday-day",
      "bday-month",
      "and",
      "bday-year",
      "end of, main",
    ],
  );
});

test("scanSubtree splits C5-confirmed GOV.UK validation br examples", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <p>Say 'Enter [whatever it is]'.<br><br>For example, 'Enter your first name'.</p>
        <p>Say 'Select if [whatever it is]'.<br><br>For example, 'Select if you are British, Irish or a citizen of a different country'.</p>
      </main>
    `),
    [
      "main",
      "Say 'Enter [whatever it is]'.",
      "For example, 'Enter your first name'.",
      "Say 'Select if [whatever it is]'.",
      "For example, 'Select if you are British, Irish or a citizen of a different country'.",
      "end of, main",
    ],
  );
});

test("scanSubtree splits C5-confirmed GOV.UK strong and link adjacent paragraph boundaries", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <p><strong>Description Required.</strong> The label used by the text input component. <a href="/options">See macro options for label</a>.</p>
        <p>Text to add before the input. If <strong>html</strong> is provided, the <strong>text</strong> option will be ignored.</p>
      </main>
    `),
    [
      "main",
      "Description Required.",
      "The label used by the text input component.",
      "link, See macro options for label",
      "Text to add before the input. If",
      "html",
      "is provided, the",
      "text",
      "option will be ignored.",
      "end of, main",
    ],
  );
});

test("scanSubtree does not split ordinary prose around emphasized titles", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <p>There’s plenty more to enjoy, with a new episode of <strong>FROM</strong>, while new comedy <strong>Best Medicine</strong> continues.</p>
      </main>
    `),
    [
      "main",
      "There’s plenty more to enjoy, with a new episode of FROM, while new comedy Best Medicine continues.",
      "end of, main",
    ],
  );
});

test("scanSubtree splits AX-confirmed direct paragraph text/link boundaries", () => {
  assert.deepEqual(
    scanHtml(
      `
        <p data-sr-dom-node-id="hero-copy">
          Documenting <a href="/css" data-sr-dom-node-id="css-link">CSS</a>, <a href="/html" data-sr-dom-node-id="html-link">HTML</a>, and <a href="/js" data-sr-dom-node-id="js-link">JavaScript</a>, since 2005.
        </p>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "hero-copy",
              childIds: ["text-1", "css", "comma", "html", "and", "js", "since"],
            },
            { nodeId: "text-1", role: "StaticText", name: "Documenting " },
            { nodeId: "css", role: "link", name: "CSS", domNodeId: "css-link" },
            { nodeId: "comma", role: "StaticText", name: ", " },
            { nodeId: "html", role: "link", name: "HTML", domNodeId: "html-link" },
            { nodeId: "and", role: "StaticText", name: ", and " },
            { nodeId: "js", role: "link", name: "JavaScript", domNodeId: "js-link" },
            { nodeId: "since", role: "StaticText", name: ", since 2005." },
          ],
        },
      },
    ),
    [
      "Documenting",
      "link, CSS",
      "link, HTML",
      ", and",
      "link, JavaScript",
      ", since 2005.",
    ],
  );
});

test("scanSubtree splits AX-confirmed two-link paragraph text boundaries", () => {
  assert.deepEqual(
    scanHtml(
      `
        <p data-sr-dom-node-id="updates">
          Updates are explained in <a href="/parsing" data-sr-dom-node-id="parsing-link">Parsing FAQ</a>. More language notes are in <a href="/i18n" data-sr-dom-node-id="i18n-link">Internationalization FAQ</a>.
        </p>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "updates",
              childIds: ["before", "parsing", "middle", "i18n", "after"],
            },
            { nodeId: "before", role: "StaticText", name: "Updates are explained in " },
            {
              nodeId: "parsing",
              role: "link",
              name: "Parsing FAQ",
              domNodeId: "parsing-link",
            },
            { nodeId: "middle", role: "StaticText", name: ". More language notes are in " },
            {
              nodeId: "i18n",
              role: "link",
              name: "Internationalization FAQ",
              domNodeId: "i18n-link",
            },
            { nodeId: "after", role: "StaticText", name: "." },
          ],
        },
      },
    ),
    [
      "Updates are explained in",
      "link, Parsing FAQ",
      ". More language notes are in",
      "link, Internationalization FAQ",
    ],
  );
});

test("scanSubtree splits C5-confirmed one-link direct paragraph text boundaries", () => {
  assert.deepEqual(
    scanHtml(
      `
        <p data-sr-dom-node-id="wcag-process">
          Web Content Accessibility Guidelines (WCAG) 2 is developed through the <a href="/process" data-sr-dom-node-id="process-link">W3C process</a> in cooperation with individuals.
        </p>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "wcag-process",
              childIds: ["before", "process", "after"],
            },
            {
              nodeId: "before",
              role: "StaticText",
              name: "Web Content Accessibility Guidelines (WCAG) 2 is developed through the ",
            },
            {
              nodeId: "process",
              role: "link",
              name: "W3C process",
              domNodeId: "process-link",
              properties: { focusable: true },
            },
            {
              nodeId: "after",
              role: "StaticText",
              name: " in cooperation with individuals.",
            },
          ],
        },
      },
    ),
    [
      "Web Content Accessibility Guidelines (WCAG) 2 is developed through the",
      "link, W3C process",
      "in cooperation with individuals.",
    ],
  );
});

test("scanSubtree keeps one-link article prose as paragraph text plus link stop", () => {
  assert.deepEqual(
    scanHtml(
      `
        <article>
          <p data-sr-dom-node-id="news-copy">
            While the text leaves questions unanswered - and <a href="/key-issues" data-sr-dom-node-id="key-link">many</a> - here's what we know.
          </p>
        </article>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "article",
              role: "article",
              name: "",
              childIds: ["paragraph"],
            },
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "news-copy",
              childIds: ["before", "key", "after"],
            },
            {
              nodeId: "before",
              role: "StaticText",
              name: "While the text leaves questions unanswered - and ",
            },
            {
              nodeId: "key",
              role: "link",
              name: "many",
              domNodeId: "key-link",
              properties: { focusable: true },
            },
            {
              nodeId: "after",
              role: "StaticText",
              name: " - here's what we know.",
            },
          ],
        },
      },
    ),
    [
    "article",
      "While the text leaves questions unanswered - and - here's what we know.",
      "link, many",
      "end of, article",
    ],
  );
});

test("scanSubtree traverses article byline author links before inline separators", () => {
  assert.deepEqual(
    scanHtml(`
      <section aria-label="Archive posts">
        <article>
          <h2>Two author article</h2>
          <p>Short excerpt.</p>
          <div>
            <div>
              <span><img alt="Marina Elmore"></span>
              <span><img alt="Benedikt Wolters"></span>
            </div>
            <p>
              <span><a href="/author/marina-elmore/"><bdi>Marina Elmore</bdi></a></span>
              <span> and </span>
              <span><a href="/author/benedikt/"><bdi>Benedikt Wolters</bdi></a></span>
            </p>
          </div>
        </article>
        <article>
          <h2>Three author article</h2>
          <p>Another excerpt.</p>
          <p>
            <span><a href="/author/alice/"><bdi>Alice Chen</bdi></a></span>
            <span>, </span>
            <span><a href="/author/bob/"><bdi>Bob Lee</bdi></a></span>
            <span>, and </span>
            <span><a href="/author/casey/"><bdi>Casey Smith</bdi></a></span>
          </p>
        </article>
      </section>
    `),
    [
      "Archive posts, region",
      "Two author article, article",
      "heading level 2, Two author article",
      "Short excerpt.",
      "Marina Elmore, image",
      "Benedikt Wolters, image",
      "link, Marina Elmore",
      "and",
      "link, Benedikt Wolters",
      "end of, article",
      "Three author article, article",
      "heading level 2, Three author article",
      "Another excerpt.",
      "link, Alice Chen",
      "link, Bob Lee",
      "and",
      "link, Casey Smith",
      "end of, article",
      "end of, Archive posts, region",
    ],
  );
});

test("scanSubtree leaves ordinary span-wrapped inline article prose in DOM order", () => {
  assert.deepEqual(
    scanHtml(`
      <article>
        <h2>Research update</h2>
        <p>
          <span>Read the </span>
          <span><a href="/paper"><bdi>research paper</bdi></a></span>
          <span> and </span>
          <span><a href="/faq"><bdi>implementation FAQ</bdi></a></span>
          <span> before deploying.</span>
        </p>
      </article>
    `),
    [
      "Research update, article",
      "heading level 2, Research update",
      "Read the and before deploying.",
      "link, research paper",
      "link, implementation FAQ",
      "end of, article",
    ],
  );
});

test("scanSubtree normalizes AX inline link spacing before external punctuation", () => {
  assert.deepEqual(
    scanHtml(
      `
        <footer>
          <p data-sr-dom-node-id="weather-credit">
            Weather data supplied by <a href="/provider" data-sr-dom-node-id="meteo-link">MeteoGroup</a>.
          </p>
        </footer>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "contentinfo",
              role: "contentinfo",
              name: "",
              childIds: ["paragraph"],
            },
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "weather-credit",
              childIds: ["before", "meteo"],
            },
            {
              nodeId: "before",
              role: "StaticText",
              name: "Weather data supplied by ",
            },
            {
              nodeId: "meteo",
              role: "link",
              name: "MeteoGroup , external",
              domNodeId: "meteo-link",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "content information",
      "Weather data supplied by",
      "link, MeteoGroup, external",
      "end of, content information",
    ],
  );
});

test("scanSubtree preserves AX-confirmed whitespace inside link names", () => {
  assert.deepEqual(
    scanHtml(
      `
        <p>
          <a href="/paf" data-sr-dom-node-id="paf-link">Read our PAF Code of Practice (PDF)<span>Opens in a new window</span></a>
        </p>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "link",
              role: "link",
              name: "Read our PAF Code of Practice (PDF) Opens in a new window",
              domNodeId: "paf-link",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "link, Read our PAF Code of Practice (PDF) Opens in a new window",
    ],
  );
});

test("scanSubtree preserves AX-confirmed short one-link paragraph tails", () => {
  assert.deepEqual(
    scanHtml(
      `
        <p data-sr-dom-node-id="faq-copy">
          See the <a href="/faq" data-sr-dom-node-id="faq-link">WCAG 2 FAQ</a> for more information on:
        </p>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "faq-copy",
              childIds: ["before", "faq", "after"],
            },
            { nodeId: "before", role: "StaticText", name: "See the " },
            {
              nodeId: "faq",
              role: "link",
              name: "WCAG 2 FAQ",
              domNodeId: "faq-link",
              properties: { focusable: true },
            },
            { nodeId: "after", role: "StaticText", name: " for more information on:" },
          ],
        },
      },
    ),
    [
      "See the",
      "link, WCAG 2 FAQ",
      "for more information on:",
    ],
  );
});

test("scanSubtree preserves AX-confirmed comma-tail one-link paragraph boundaries", () => {
  assert.deepEqual(
    scanHtml(
      `
        <p data-sr-dom-node-id="iso-standard">
          WCAG 2.2 is an approved International Organization for Standardization (ISO) standard: <a href="/standard" data-sr-dom-node-id="iso-link">ISO/IEC 40500:2025</a>, and is available free from ISO.
        </p>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "iso-standard",
              childIds: ["before", "standard", "after"],
            },
            {
              nodeId: "before",
              role: "StaticText",
              name: "WCAG 2.2 is an approved International Organization for Standardization (ISO) standard: ",
            },
            {
              nodeId: "standard",
              role: "link",
              name: "ISO/IEC 40500:2025",
              domNodeId: "iso-link",
              properties: { focusable: true },
            },
            {
              nodeId: "after",
              role: "StaticText",
              name: ", and is available free from ISO.",
            },
          ],
        },
      },
    ),
    [
      "WCAG 2.2 is an approved International Organization for Standardization (ISO) standard:",
      "link, ISO/IEC 40500:2025",
      ", and is available free from ISO.",
    ],
  );
});

test("scanSubtree preserves AX-confirmed punctuation-tail one-link paragraph boundaries", () => {
  assert.deepEqual(
    scanHtml(
      `
        <p data-sr-dom-node-id="issue-copy">
          Also, this component <a href="/issue" data-sr-dom-node-id="issue-link">counts some characters as multiple characters</a>. For example, emoji may be counted differently.
        </p>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "issue-copy",
              childIds: ["before", "issue", "after"],
            },
            { nodeId: "before", role: "StaticText", name: "Also, this component " },
            {
              nodeId: "issue",
              role: "link",
              name: "counts some characters as multiple characters",
              domNodeId: "issue-link",
              properties: { focusable: true },
            },
            {
              nodeId: "after",
              role: "StaticText",
              name: ". For example, emoji may be counted differently.",
            },
          ],
        },
      },
    ),
    [
      "Also, this component",
      "link, counts some characters as multiple characters",
      ". For example, emoji may be counted differently.",
    ],
  );
});

test("scanSubtree preserves AX-confirmed link-first paragraph boundaries", () => {
  assert.deepEqual(
    scanHtml(
      `
        <p data-sr-dom-node-id="research-copy">
          <a href="/research" data-sr-dom-node-id="research-link">Research findings</a> showed that users understood the updated wording.
        </p>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "research-copy",
              childIds: ["research", "after"],
            },
            {
              nodeId: "research",
              role: "link",
              name: "Research findings",
              domNodeId: "research-link",
              properties: { focusable: true },
            },
            {
              nodeId: "after",
              role: "StaticText",
              name: " showed that users understood the updated wording.",
            },
          ],
        },
      },
    ),
    [
      "link, Research findings",
      "showed that users understood the updated wording.",
    ],
  );
});

test("scanSubtree splits C5-confirmed one-link strong paragraph without punctuation-only tail", () => {
  assert.deepEqual(
    scanHtml(
      `
        <p data-sr-dom-node-id="wcag-start">
          WCAG is for those who want a technical standard.
          <strong data-sr-dom-node-id="wcag-strong">It is not an introduction to accessibility. For links to introductory material, see <a href="/faq/#start" data-sr-dom-node-id="start-link">"Where should I start?" in the FAQ</a>.</strong>
        </p>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "wcag-start",
              childIds: ["intro", "strong"],
            },
            {
              nodeId: "intro",
              role: "StaticText",
              name: "WCAG is for those who want a technical standard. ",
            },
            {
              nodeId: "strong",
              role: "strong",
              name: "",
              domNodeId: "wcag-strong",
              childIds: ["prelink", "start", "dot"],
            },
            {
              nodeId: "prelink",
              role: "StaticText",
              name: "It is not an introduction to accessibility. For links to introductory material, see ",
            },
            {
              nodeId: "start",
              role: "link",
              name: "\"Where should I start?\" in the FAQ",
              domNodeId: "start-link",
              properties: { focusable: true },
            },
            { nodeId: "dot", role: "StaticText", name: "." },
          ],
        },
      },
    ),
    [
      "WCAG is for those who want a technical standard.",
      "It is not an introduction to accessibility. For links to introductory material, see",
      "link, \"Where should I start?\" in the FAQ",
    ],
  );
});

test("scanSubtree skips punctuation-only inline siblings after links", () => {
  assert.deepEqual(
    scanHtml(`
      <section aria-label="Agent tools">
        <span>
          <x-inline>
            <span>Run commands in secure containers with our </span>
            <a href="/sandbox-sdk">Sandbox SDK</a>
            <span>.</span>
          </x-inline>
        </span>
        <h3>Powerful primitives, seamlessly integrated</h3>
      </section>
    `),
    [
      "Agent tools, region",
      "Run commands in secure containers with our",
      "link, Sandbox SDK",
      "heading level 3, Powerful primitives, seamlessly integrated",
      "end of, Agent tools, region",
    ],
  );
});

test("scanSubtree preserves terminal strong-wrapped paragraph link before sibling landmark", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <p data-sr-dom-node-id="wcag3">
            For information on the early draft of W3C Accessibility Guidelines 3.0, see the <strong data-sr-dom-node-id="wcag3-strong"><a href="/wcag3" data-sr-dom-node-id="wcag3-link">WCAG 3 Introduction</a></strong>.
          </p>
          <aside aria-label="feedback" data-sr-dom-node-id="feedback"></aside>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "wcag3",
              childIds: ["before", "strong", "dot"],
            },
            {
              nodeId: "before",
              role: "StaticText",
              name: "For information on the early draft of W3C Accessibility Guidelines 3.0, see the ",
            },
            {
              nodeId: "strong",
              role: "strong",
              name: "",
              domNodeId: "wcag3-strong",
              childIds: ["intro"],
            },
            {
              nodeId: "intro",
              role: "link",
              name: "WCAG 3 Introduction",
              domNodeId: "wcag3-link",
              properties: { focusable: true },
            },
            { nodeId: "dot", role: "StaticText", name: "." },
            {
              nodeId: "feedback",
              role: "complementary",
              name: "feedback",
              domNodeId: "feedback",
            },
          ],
        },
      },
    ),
    [
      "main",
      "For information on the early draft of W3C Accessibility Guidelines 3.0, see the",
      "link, WCAG 3 Introduction",
      "feedback, complementary",
      "end of, feedback, complementary",
      "end of, main",
    ],
  );
});

test("scanSubtree splits C5-confirmed feedback mailto paragraph and preserves sibling links", () => {
  assert.deepEqual(
    scanHtml(
      `
        <aside aria-label="feedback">
          <h2>Help improve this page</h2>
          <div>
            <p data-sr-dom-node-id="feedback-copy">
              Please share your ideas, suggestions, or comments via e-mail to the publicly-archived list <a href="mailto:wai@w3.org" data-sr-dom-node-id="mailto-link">wai@w3.org</a> or via GitHub.
            </p>
            <a href="/email">E-mail</a>
            <a href="/fork">Fork & Edit on GitHub</a>
            <a href="/issue">New GitHub Issue</a>
          </div>
        </aside>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "feedback-copy",
              childIds: ["before", "mailto", "after"],
            },
            {
              nodeId: "before",
              role: "StaticText",
              name: "Please share your ideas, suggestions, or comments via e-mail to the publicly-archived list ",
            },
            {
              nodeId: "mailto",
              role: "link",
              name: "wai@w3.org",
              domNodeId: "mailto-link",
              properties: { focusable: true },
            },
            { nodeId: "after", role: "StaticText", name: " or via GitHub." },
          ],
        },
      },
    ),
    [
      "feedback, complementary",
      "heading level 2, Help improve this page",
      "Please share your ideas, suggestions, or comments via e-mail to the publicly-archived list",
      "link, wai@w3.org",
      "or via GitHub.",
      "link, E-mail",
      "link, Fork & Edit on GitHub",
      "link, New GitHub Issue",
      "end of, feedback, complementary",
    ],
  );
});

test("scanSubtree does not split short one-link service-action paragraphs", () => {
  assert.deepEqual(
    scanHtml(
      `
        <p data-sr-dom-node-id="return-copy">
          You can <a href="/return" data-sr-dom-node-id="return-link">save and return to your application</a> at a later date if you need to.
        </p>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "return-copy",
              childIds: ["before", "return", "after"],
            },
            { nodeId: "before", role: "StaticText", name: "You can " },
            {
              nodeId: "return",
              role: "link",
              name: "save and return to your application",
              domNodeId: "return-link",
              properties: { focusable: true },
            },
            { nodeId: "after", role: "StaticText", name: " at a later date if you need to." },
          ],
        },
      },
    ),
    [
      "You can at a later date if you need to.",
      "link, save and return to your application",
    ],
  );
});

test("scanSubtree keeps bare or with lead text for AX-confirmed two-link paragraphs", () => {
  assert.deepEqual(
    scanHtml(
      `
        <p data-sr-dom-node-id="help">
          Go to <a href="https://111.example" data-sr-dom-node-id="online-link">111.example</a> or <a href="tel:111" data-sr-dom-node-id="phone-link">call 111</a>.
        </p>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "help",
              childIds: ["before", "online", "or", "phone", "after"],
            },
            { nodeId: "before", role: "StaticText", name: "Go to " },
            {
              nodeId: "online",
              role: "link",
              name: "111.example",
              domNodeId: "online-link",
            },
            { nodeId: "or", role: "StaticText", name: " or " },
            { nodeId: "phone", role: "link", name: "call 111", domNodeId: "phone-link" },
            { nodeId: "after", role: "StaticText", name: "." },
          ],
        },
      },
    ),
    ["Go to or", "link, 111.example", "link, call 111"],
  );
});

test("scanSubtree splits AX-confirmed parenthetical inline emphasis paragraph boundaries", () => {
  assert.deepEqual(
    scanHtml(
      `
        <p data-sr-dom-node-id="working-group">
          Developed by the Working Group (<a href="/group" data-sr-dom-node-id="group-link">WG</a>) <em data-sr-dom-node-id="former">(formerly the Guidelines Working Group)</em>, part of Consortium (<a href="/org" data-sr-dom-node-id="org-link">Org</a>) Initiative (<a href="/wai" data-sr-dom-node-id="wai-link">WAI</a>).
        </p>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "working-group",
              childIds: [
                "before",
                "group",
                "close",
                "former",
                "middle",
                "org",
                "initiative",
                "wai",
                "after",
              ],
            },
            { nodeId: "before", role: "StaticText", name: "Developed by the Working Group (" },
            { nodeId: "group", role: "link", name: "WG", domNodeId: "group-link" },
            { nodeId: "close", role: "StaticText", name: ") " },
            {
              nodeId: "former",
              role: "emphasis",
              name: "",
              domNodeId: "former",
              childIds: ["former-text"],
            },
            {
              nodeId: "former-text",
              role: "StaticText",
              name: "(formerly the Guidelines Working Group)",
            },
            { nodeId: "middle", role: "StaticText", name: ", part of Consortium (" },
            { nodeId: "org", role: "link", name: "Org", domNodeId: "org-link" },
            { nodeId: "initiative", role: "StaticText", name: ") Initiative (" },
            { nodeId: "wai", role: "link", name: "WAI", domNodeId: "wai-link" },
            { nodeId: "after", role: "StaticText", name: ")." },
          ],
        },
      },
    ),
    [
      "Developed by the Working Group (",
      "link, WG",
      "(formerly the Guidelines Working Group)",
      ", part of Consortium (",
      "link, Org",
      ") Initiative (",
      "link, WAI",
    ],
  );
});

test("scanSubtree compacts C5-backed lead paragraph conjunction punctuation", () => {
  assert.deepEqual(
    scanHtml(
      `
        <section data-sr-dom-node-id="hero">
          <h1 data-sr-dom-node-id="hero-heading">Resources for Developers,<br> by Developers</h1>
          <p data-sr-dom-node-id="hero-copy">
            Documenting <a href="/css" data-sr-dom-node-id="css-link">CSS</a>, <a href="/html" data-sr-dom-node-id="html-link">HTML</a>, and <a href="/js" data-sr-dom-node-id="js-link">JavaScript</a>, since 2005.
          </p>
        </section>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "heading",
              role: "heading",
              name: "Resources for Developers, by Developers _",
              domNodeId: "hero-heading",
              properties: { level: 1 },
            },
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "hero-copy",
              childIds: ["text-1", "css", "comma", "html", "and", "js", "since"],
            },
            { nodeId: "text-1", role: "StaticText", name: "Documenting " },
            { nodeId: "css", role: "link", name: "CSS", domNodeId: "css-link" },
            { nodeId: "comma", role: "StaticText", name: ", " },
            { nodeId: "html", role: "link", name: "HTML", domNodeId: "html-link" },
            { nodeId: "and", role: "StaticText", name: ", and " },
            { nodeId: "js", role: "link", name: "JavaScript", domNodeId: "js-link" },
            { nodeId: "since", role: "StaticText", name: ", since 2005." },
          ],
        },
      },
    ),
    [
      "heading level 1 Resources for Developers, by Developers, 2 items",
      "Documenting",
      "link, CSS",
      "link, HTML",
      ",and",
      "link, JavaScript",
      ", since 2005.",
    ],
  );
});

test("scanSubtree preserves W3-style article conjunction spacing", () => {
  assert.deepEqual(
    scanHtml(
      `
        <article data-sr-dom-node-id="article">
          <h3 data-sr-dom-node-id="article-heading">For Review: Cognitive Accessibility Research Modules</h3>
          <p data-sr-dom-node-id="article-copy">
            <a href="/modules" data-sr-dom-node-id="modules-link">Cognitive Accessibility Research Modules</a> are available for
            <a href="/voice" data-sr-dom-node-id="voice-link">Voice Systems and Conversational Interfaces</a>,
            <a href="/wayfinding" data-sr-dom-node-id="wayfinding-link">Technology Assisted Indoor Navigation / Wayfinding</a>,
            <a href="/safety" data-sr-dom-node-id="safety-link">Online Safety and Wellbeing (Algorithms and Data)</a>, and
            <a href="/decision" data-sr-dom-node-id="decision-link">Supported Decision-Making Online</a>.
          </p>
        </article>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "heading",
              role: "heading",
              name: "For Review: Cognitive Accessibility Research Modules",
              domNodeId: "article-heading",
              properties: { level: 3 },
            },
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "article-copy",
              childIds: [
                "modules",
                "available",
                "voice",
                "comma-1",
                "wayfinding",
                "comma-2",
                "safety",
                "and",
                "decision",
                "after",
              ],
            },
            {
              nodeId: "modules",
              role: "link",
              name: "Cognitive Accessibility Research Modules",
              domNodeId: "modules-link",
            },
            { nodeId: "available", role: "StaticText", name: " are available for " },
            {
              nodeId: "voice",
              role: "link",
              name: "Voice Systems and Conversational Interfaces",
              domNodeId: "voice-link",
            },
            { nodeId: "comma-1", role: "StaticText", name: ", " },
            {
              nodeId: "wayfinding",
              role: "link",
              name: "Technology Assisted Indoor Navigation / Wayfinding",
              domNodeId: "wayfinding-link",
            },
            { nodeId: "comma-2", role: "StaticText", name: ", " },
            {
              nodeId: "safety",
              role: "link",
              name: "Online Safety and Wellbeing (Algorithms and Data)",
              domNodeId: "safety-link",
            },
            { nodeId: "and", role: "StaticText", name: ", and " },
            {
              nodeId: "decision",
              role: "link",
              name: "Supported Decision-Making Online",
              domNodeId: "decision-link",
            },
            { nodeId: "after", role: "StaticText", name: "." },
          ],
        },
      },
    ),
    [
    "For Review: Cognitive Accessibility Research Modules, article",
      "heading level 3, For Review: Cognitive Accessibility Research Modules",
      "link, Cognitive Accessibility Research Modules",
      "are available for",
      "link, Voice Systems and Conversational Interfaces",
      "link, Technology Assisted Indoor Navigation / Wayfinding",
      "link, Online Safety and Wellbeing (Algorithms and Data)",
      ", and",
      "link, Supported Decision-Making Online",
      "end of, article",
    ],
  );
});

test("scanSubtree splits simple trailing paragraph links", () => {
  assert.deepEqual(
    scanHtml(`
      <footer>
        <p>Content available under <a href="/license">a Creative Commons license</a>.</p>
      </footer>
    `),
    [
      "content information",
      "Content available under",
      "link, a Creative Commons license",
      "end of, content information",
    ],
  );
});

test("scanSubtree preserves small footer static text before inline links", () => {
  assert.deepEqual(
    scanHtml(`
      <footer>
        <ul>
          <li><a href="/contact">Contact</a></li>
        </ul>
        <small><em>Copyright 2026 Example.</em> External sites are not controlled by us. <span><a href="/external"> Read about external links. </a></span></small>
      </footer>
    `),
    [
      "footer",
      "list 1 item",
      "link, Contact",
      "end of list",
      "Copyright 2026 Example.",
      "External sites are not controlled by us.",
      "link, Read about external links.",
      "end of, footer",
    ],
  );
});

test("scanSubtree preserves footer static text around direct inline links", () => {
  assert.deepEqual(
    scanHtml(
      `
        <footer>
          <div data-sr-dom-node-id="built">Built by the <a href="/team" data-sr-dom-node-id="team">GOV.UK Design System team</a></div>
          <span data-sr-dom-node-id="license-text">All content is available under the <a href="/license" data-sr-dom-node-id="license">Open Government Licence v3.0</a>, except where otherwise stated</span>
          <div><a href="/copyright" data-sr-dom-node-id="copyright">© Crown copyright</a></div>
        </footer>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "built-node",
              role: "generic",
              name: "",
              domNodeId: "built",
              childIds: ["built-text", "team-link"],
            },
            {
              nodeId: "built-text",
              role: "StaticText",
              name: "Built by the ",
            },
            {
              nodeId: "team-link",
              role: "link",
              name: "GOV.UK Design System team",
              domNodeId: "team",
              properties: { focusable: true },
            },
            {
              nodeId: "license-node",
              role: "generic",
              name: "",
              domNodeId: "license-text",
              childIds: ["license-before", "license-link", "license-after"],
            },
            {
              nodeId: "license-before",
              role: "StaticText",
              name: "All content is available under the ",
            },
            {
              nodeId: "license-link",
              role: "link",
              name: "Open Government Licence v3.0",
              domNodeId: "license",
              properties: { focusable: true },
            },
            {
              nodeId: "license-after",
              role: "StaticText",
              name: ", except where otherwise stated",
            },
            {
              nodeId: "copyright-link",
              role: "link",
              name: "© Crown copyright",
              domNodeId: "copyright",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "footer",
      "Built by the",
      "link, GOV.UK Design System team",
      "link, Open Government Licence v3.0",
      "link, © Crown copyright",
      "end of, footer",
    ],
  );
});

test("scanSubtree keeps list positions on direct article card stops", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>Updates</h2>
        <ul>
          <li>
            <article>
              <a href="/blog">Blog</a>
              <h3><a href="/one">First article</a></h3>
              <p>First summary.</p>
            </article>
          </li>
          <li>
            <article>
              <a href="/blog">Blog</a>
              <h3><a href="/two">Second article</a></h3>
              <p>Second summary.</p>
            </article>
          </li>
        </ul>
      </section>
    `),
    [
      "heading level 2, Updates",
      "list 2 items",
      "article, 1 of 2",
      "link, Blog",
      "heading level 3, level 2, link, First article",
      "First summary.",
      "end of, article",
      "article, 2 of 2",
      "link, Blog",
      "heading level 3, level 2, link, Second article",
      "Second summary.",
      "end of, article",
      "end of list",
    ],
  );
});

test("scanSubtree groups standalone button actions in structured article cards", () => {
  assert.deepEqual(
    scanHtml(`
      <section aria-label="Contact cards">
        <article>
          <h4>General communication</h4>
          <p>For other questions, email us</p>
          <div>
            <button type="button">
              <span>
                <span>hello@example.com</span><span>+</span>
              </span>
            </button>
          </div>
        </article>
        <article>
          <h4>Documentation</h4>
          <p>Read setup guides and reference docs</p>
          <div>
            <a href="/docs">
              <span>
                <span>Docs</span><span>→</span>
              </span>
            </a>
          </div>
        </article>
      </section>
    `),
    [
      "Contact cards, region",
      "General communication, article",
      "heading level 4, General communication",
      "For other questions, email us",
      "hello@example.com+, button, group",
      "end of, General communication, article",
      "Documentation, article",
      "heading level 4, Documentation",
      "Read setup guides and reference docs",
      "link, Docs→",
      "end of, Documentation, article",
      "end of, Contact cards, region",
    ],
  );
});

test("scanSubtree names dated direct article card end boundaries from heading links", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>Latest</h2>
        <ul>
          <li>
            <article>
              <a href="/source">developer.example</a>
              <h3><a href="/one">First article</a></h3>
              <time>2 weeks ago</time>
              <p>First summary.</p>
            </article>
          </li>
          <li>
            <article>
              <a href="/source">developer.example</a>
              <h3><a href="/two">Second article</a></h3>
              <time>3 months ago</time>
              <p>Second summary.</p>
            </article>
          </li>
        </ul>
      </section>
    `),
    [
      "heading level 2, Latest",
      "list 2 items",
      "article, 1 of 2",
      "link, developer.example",
      "heading level 3, level 2, link, First article",
      "2 weeks ago",
      "First summary.",
      "end of, First article, article",
      "article, 2 of 2",
      "link, developer.example",
      "heading level 3, level 2, link, Second article",
      "3 months ago",
      "Second summary.",
      "end of, Second article, article",
      "end of list",
    ],
  );
});

test("scanSubtree names dated sibling article card end boundaries from heading links", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>Latest</h2>
        <article>
          <h3><a href="/launch">Launch update</a></h3>
          <time>10 Jan 2026</time>
          <p>Initial launch details.</p>
        </article>
        <article>
          <h3><a href="/research">Research note</a></h3>
          <time>12 Jan 2026</time>
          <p>Early research findings.</p>
        </article>
      </section>
    `),
    [
      "heading level 2, Latest",
    "Launch update, article",
      "heading level 3, level 2, link, Launch update",
      "10 Jan 2026",
      "Initial launch details.",
      "end of, Launch update, article",
    "Research note, article",
      "heading level 3, level 2, link, Research note",
      "12 Jan 2026",
      "Early research findings.",
      "end of, Research note, article",
    ],
  );
});

test("scanSubtree keeps list positions on simple linked card heading stops with decorative lead images", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li>
          <img src="/first.png" alt="">
          <h2><a href="/first">First feature</a></h2>
          <p>A short card summary.</p>
        </li>
        <li>
          <img src="/second.png" alt="">
          <h2><a href="/second">Second feature</a></h2>
          <p>Another short card summary.</p>
        </li>
      </ul>
    `),
    [
      "list 2 items",
      "heading level 2, level 1, link, First feature, 1 of 2",
      "A short card summary.",
      "heading level 2, level 1, link, Second feature, 2 of 2",
      "Another short card summary.",
      "end of list",
    ],
  );
});

test("scanSubtree splits AX-confirmed inline abbr and superscript paragraph boundaries", () => {
  const accessibilityTree = {
    nodes: [
      {
        nodeId: "p",
        role: "paragraph",
        domNodeId: "1",
        childIds: ["text1", "link1", "dot", "br", "abbr", "sup", "space", "link2", "comma", "link3", "and", "link4", "after", "link5", "dot2"],
      },
      { nodeId: "text1", role: "StaticText", name: "Copyright © 2026 " },
      { nodeId: "link1", role: "link", name: "Example Consortium", domNodeId: "2", properties: { focusable: true } },
      { nodeId: "dot", role: "StaticText", name: "." },
      { nodeId: "br", role: "LineBreak", name: "\n", domNodeId: "3" },
      { nodeId: "abbr", role: "Abbr", name: "Example Consortium", domNodeId: "4" },
      { nodeId: "sup", role: "superscript", name: "", domNodeId: "5" },
      { nodeId: "space", role: "StaticText", name: " " },
      { nodeId: "link2", role: "link", name: "liability", domNodeId: "6", properties: { focusable: true } },
      { nodeId: "comma", role: "StaticText", name: ", " },
      { nodeId: "link3", role: "link", name: "trademark", domNodeId: "7", properties: { focusable: true } },
      { nodeId: "and", role: "StaticText", name: " and " },
      { nodeId: "link4", role: "link", name: "permissive license", domNodeId: "8", properties: { focusable: true } },
      { nodeId: "after", role: "StaticText", name: " rules apply unless otherwise noted. See " },
      { nodeId: "link5", role: "link", name: "Permission to Use Material", domNodeId: "9", properties: { focusable: true } },
      { nodeId: "dot2", role: "StaticText", name: "." },
    ],
  };

  assert.deepEqual(
    scanHtml(`
      <p data-sr-dom-node-id="1">Copyright © 2026 <a href="/" data-sr-dom-node-id="2">Example Consortium</a>.<br data-sr-dom-node-id="3"><abbr title="Example Consortium" data-sr-dom-node-id="4">EX</abbr><sup data-sr-dom-node-id="5">®</sup><a href="/liability" data-sr-dom-node-id="6">liability</a>, <a href="/trademark" data-sr-dom-node-id="7">trademark</a> and <a href="/license" data-sr-dom-node-id="8">permissive license</a> rules apply unless otherwise noted. See <a href="/permission" data-sr-dom-node-id="9">Permission to Use Material</a>.</p>
    `, { accessibilityTree }),
    [
      "Copyright © 2026",
      "link, Example Consortium",
      "Example Consortium, group",
      "EX",
      "end of, Example Consortium, group",
      "®",
      "link, liability",
      "link, trademark",
      "and",
      "link, permissive license",
      "rules apply unless otherwise noted. See",
      "link, Permission to Use Material",
    ],
  );
});

test("scanSubtree counts list items through neutral list wrappers", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>Media details</h2>
        <ul role="list">
          <div>
            <li role="listitem">
              <div>Last updated</div>
              <div>5 hours ago</div>
            </li>
          </div>
        </ul>
      </section>
    `),
    [
      "heading level 2, Media details",
      "list 1 item",
      "Last updated",
      "5 hours ago",
      "end of list",
    ],
  );
});

test("scanSubtree excludes display-none list items from counts and positions", () => {
  assert.deepEqual(
    scanHtml(`
      <footer>
        <ul>
          <li><a href="/terms">Terms</a></li>
          <li style="display: none"><button>Manage cookies</button></li>
          <li><a href="/privacy">Privacy</a></li>
          <li><button>Do not share my personal information</button></li>
          <li>© Example 2026</li>
        </ul>
      </footer>
    `),
    [
      "footer",
      "list 4 items",
      "link, Terms, 1 of 4",
      "link, Privacy, 2 of 4",
      "Do not share my personal information, button, 3 of 4",
      "© Example 2026, 4 of 4",
      "end of list",
      "end of, footer",
    ],
  );
});

test("scanSubtree excludes hidden consent-only list items from list summaries", () => {
  assert.deepEqual(
    scanHtml(`
      <footer>
        <ul>
          <li><a href="/about">About us</a></li>
          <li><a href="/report">Report an issue with the NHS website</a></li>
          <li><a href="/accessibility">Accessibility statement</a></li>
          <li><a href="/policies">Our policies</a></li>
          <li>
            <a
              href="/cookies"
              data-sr-voiceover-hidden-consent="true"
              data-sr-computed-hidden="display:none visibility:hidden"
            >Cookies</a>
          </li>
        </ul>
      </footer>
    `),
    [
      "footer",
      "list 4 items",
      "link, About us, 1 of 5",
      "link, Report an issue with the NHS website, 2 of 5",
      "link, Accessibility statement, 3 of 5",
      "link, Our policies, 4 of 5",
      "end of list",
      "end of, footer",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <footer>
        <nav aria-label="Corporate links">
          <ul>
            <li><a href="/contact">Contact us</a></li>
            <li><a href="/privacy" data-sr-voiceover-hidden-consent="true" data-sr-computed-hidden="display:none visibility:hidden">Privacy</a></li>
            <li><a href="/terms">Terms of use</a></li>
            <li>© Example 2026</li>
          </ul>
        </nav>
      </footer>
    `),
    [
      "footer",
      "Corporate links, navigation",
      "list 4 items",
      "link, Contact us, 1 of 4",
      "link, Terms of use, 3 of 4",
      "© Example 2026, 4 of 4",
      "end of list",
      "end of, Corporate links, navigation",
      "end of, footer",
    ],
  );
});

test("scanSubtree announces fieldset legend groups and VoiceOver checkbox state order", () => {
  assert.deepEqual(
    scanHtml(`
      <fieldset>
        <legend><span>Topic</span></legend>
        <section><label for="ai">AI</label><input id="ai" type="checkbox" checked></section>
        <section><label for="security">Security</label><input id="security" type="checkbox"></section>
      </fieldset>
    `),
    [
      "Topic, group",
      "Topic",
      "AI, checked, checkbox",
      "Security, unchecked, checkbox",
      "end of, Topic, group",
    ],
  );
});

test("scanSubtree names checkboxes from the first non-empty associated label", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <label for="billing-toggle"><input id="billing-toggle" type="checkbox" checked><span aria-hidden="true"></span></label>
        <label for="billing-toggle">Billed yearly</label>
      </section>
    `),
    ["Billed yearly, checked, checkbox"],
  );
});

test("scanSubtree splits simple metadata paragraphs around time and link boundaries", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <p>This page was last modified on <time>Apr 20, 2026</time> by <a href="/contributors.txt">MDN contributors</a>.</p>
      </main>
    `),
    [
      "main",
      "This page was last modified on",
      "Apr 20, 2026",
      "by",
      "link, MDN contributors",
      "end of, main",
    ],
  );
});

test("scanSubtree announces direct fieldset prompt labels before controls", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <fieldset>
          <label>Was this page helpful to you?</label>
          <button>Yes</button>
          <button>No</button>
        </fieldset>
      </main>
    `),
    [
      "main",
      "Was this page helpful to you?",
      "Yes, button",
      "No, button",
      "end of, main",
    ],
  );
});

test("scanSubtree treats labelled filter input wrappers as transparent", () => {
  assert.deepEqual(
    scanHtml(`
      <aside>
        <nav>
          <div>
            <filter-widget>
              <template shadowrootmode="open">
                <label for="filter-input"><span>Filter catalog</span></label>
                <input id="filter-input" type="text" placeholder="Filter">
                <button type="button">Clear filter input</button>
              </template>
            </filter-widget>
          </div>
          <ol>
            <li><a href="/alpha">Alpha</a></li>
          </ol>
        </nav>
      </aside>
    `),
    [
      "complementary",
      "navigation",
      "Filter catalog",
      "Filter catalog Filter, edit text",
      "Clear filter input, button",
      "list 1 item",
      "link, Alpha",
      "end of list",
      "end of, navigation",
      "end of, complementary",
    ],
  );
});

test("scanSubtree adds direct definition-list term metadata for list-backed definitions", () => {
  assert.deepEqual(
    scanHtml(`
      <footer>
        <dl>
          <dt>Resources</dt>
          <dd>
            <ul>
              <li><a href="/docs">Docs</a></li>
              <li><a href="/blog">Blog</a></li>
            </ul>
          </dd>
        </dl>
      </footer>
    `),
    [
      "footer",
      "definition list 2 items",
      "Resources, empty term, (1 of 2), 1 of 2",
      "list 2 items, level 2 2 of 2",
      "link, Docs, 1 of 2",
      "link, Blog, 2 of 2",
      "end of list",
      "end of definition list",
      "end of, footer",
    ],
  );
});

test("scanSubtree includes AX-confirmed unlabeled SVG images before region labels", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <section aria-labelledby="feedback">
            <div><svg data-sr-dom-node-id="feedback-image"></svg></div>
            <h2 id="feedback">Help improve MDN</h2>
          </section>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              role: "image",
              name: "",
              domNodeId: "feedback-image",
            },
          ],
        },
      },
    ),
    [
      "main",
      "Help improve MDN, region",
      "image",
      "heading level 2, Help improve MDN",
      "end of, Help improve MDN, region",
      "end of, main",
    ],
  );
});

test("scanSubtree includes AX-confirmed unlabeled SVG intro images before headings", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <header>
            <div><video inert></video><svg data-sr-dom-node-id="intro-image"></svg></div>
            <div>
              <span data-sr-dom-node-id="intro-label">
                <span data-sr-dom-node-id="intro-version">1.0</span><span data-sr-dom-node-id="intro-title">Intake</span>
              </span>
              <h1>Make product operations self-driving</h1>
            </div>
          </header>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              role: "image",
              name: "",
              domNodeId: "intro-image",
            },
            {
              nodeId: "label",
              ignored: true,
              role: "none",
              domNodeId: "intro-label",
              childIds: ["version-wrapper", "title-wrapper"],
            },
            {
              nodeId: "version-wrapper",
              ignored: true,
              role: "none",
              domNodeId: "intro-version",
              childIds: ["version-text"],
            },
            {
              nodeId: "title-wrapper",
              ignored: true,
              role: "none",
              domNodeId: "intro-title",
              childIds: ["title-text"],
            },
            {
              nodeId: "version-text",
              ignored: false,
              role: "StaticText",
              name: "1.0",
            },
            {
              nodeId: "title-text",
              ignored: false,
              role: "StaticText",
              name: "Intake",
            },
          ],
        },
      },
    ),
    [
      "main",
      "image",
      "1.0 Intake",
      "heading level 1, Make product operations self-driving",
      "end of, main",
    ],
  );
});

test("scanSubtree includes AX-confirmed unnamed SVG media before card text", () => {
  assert.deepEqual(
    scanHtml(
      `
        <section aria-label="Use cases">
          <div>
            <div><svg data-sr-dom-node-id="card-image"></svg></div>
            <div>
              <p><strong>Secure public apps</strong></p>
              <p>Protect traffic before it reaches origin services.</p>
            </div>
          </div>
        </section>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              role: "image",
              name: "",
              domNodeId: "card-image",
            },
          ],
        },
      },
    ),
    [
      "Use cases, region",
      "image",
      "Secure public apps",
      "Protect traffic before it reaches origin services.",
      "end of, Use cases, region",
    ],
  );
});

test("scanSubtree does not expose decorative hidden SVG card media", () => {
  assert.deepEqual(
    scanHtml(`
      <section aria-label="Use cases">
        <div>
          <div><svg aria-hidden="true" data-sr-dom-node-id="card-image"></svg></div>
          <div>
            <p><strong>Secure public apps</strong></p>
            <p>Protect traffic before it reaches origin services.</p>
          </div>
        </div>
      </section>
    `),
    [
      "Use cases, region",
      "Secure public apps",
      "Protect traffic before it reaches origin services.",
      "end of, Use cases, region",
    ],
  );
});

test("scanSubtree preserves exact AX parenthetical link names", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <a data-sr-dom-node-id="external-source" href="https://example.com/source">source code</a>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              role: "link",
              name: "source code (external)",
              domNodeId: "external-source",
              properties: { url: "https://example.com/source" },
            },
          ],
        },
      },
    ),
    ["main", "link, source code (external)", "end of, main"],
  );
});

test("scanSubtree keeps AX casing scoped to duplicate same-href link DOM nodes", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <p>If you need help, <a href="/contact/" data-sr-dom-node-id="main-contact">contact the team</a>.</p>
        </main>
        <footer>
          <ul>
            <li><a href="/accessibility">Accessibility statement</a></li>
            <li><a href="/sitemap">Sitemap</a></li>
            <li><a href="/cookies">Cookies</a></li>
            <li><a href="/privacy">Privacy</a></li>
            <li><a href="/contact/" data-sr-dom-node-id="footer-contact">Contact the team</a></li>
          </ul>
        </footer>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "main-contact-node",
              role: "link",
              name: "contact the team",
              domNodeId: "main-contact",
              properties: {
                focusable: true,
                url: "https://example.test/contact/",
              },
            },
            {
              nodeId: "footer-contact-node",
              role: "link",
              name: "Contact the team",
              domNodeId: "footer-contact",
              properties: {
                focusable: true,
                url: "https://example.test/contact/",
              },
            },
          ],
        },
      },
    ),
    [
      "main",
      "If you need help,",
      "link, contact the team",
      "end of, main",
      "footer",
      "list 5 items",
      "link, Accessibility statement, 1 of 5",
      "link, Sitemap, 2 of 5",
      "link, Cookies, 3 of 5",
      "link, Privacy, 4 of 5",
      "link, Contact the team, 5 of 5",
      "end of list",
      "end of, footer",
    ],
  );
});

test("scanSubtree uses AX-backed body names for focusable linked cards with headings", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <section data-sr-dom-node-id="course-region" aria-labelledby="course-title">
            <a data-sr-dom-node-id="course-card" href="https://example.com/course">
              <header>
                <h2 id="course-title"><span>Training Course:</span><span>Digital Accessibility Foundations</span></h2>
              </header>
              <p>The free course gives you a foundation. It is designed for:</p>
              <ul>
                <li>technical and non-technical learners</li>
                <li>developers, designers, writers</li>
              </ul>
              <span>About the Free Online Course</span>
            </a>
          </section>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "region-1",
              role: "region",
              name: "Training Course: Digital Accessibility Foundations",
              domNodeId: "course-region",
            },
            {
              nodeId: "link-1",
              role: "link",
              name: "The free course gives you a foundation. It is designed for: technical and non-technical learners developers, designers, writers About the Free Online Course",
              domNodeId: "course-card",
              properties: {
                focusable: true,
                url: "https://example.com/course",
              },
            },
          ],
        },
      },
    ),
    [
      "main",
      "Training Course: Digital Accessibility Foundations, region",
      "link, heading level 2, The free course gives you a foundation. It is designed for: technical and non-technical learners developers, designers, writers About the Free Online Course",
      "end of, Training Course: Digital Accessibility Foundations, region",
      "end of, main",
    ],
  );
});

test("scanSubtree uses AX-backed body names for labelled linked resource cards without AX label punctuation changes", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <section data-sr-dom-node-id="resource-region" aria-labelledby="resource-title">
            <a data-sr-dom-node-id="resource-card" href="/resources/media">
              <header>
                <h2 id="resource-title"><span>Featured Resource: </span><span>Making Media Accessible</span></h2>
              </header>
              <p>This resource covers captions, audio description, transcripts, and sign language.</p>
              <span>Making Media Accessible</span>
            </a>
          </section>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "region-1",
              role: "region",
              name: "Featured Resource: Making Media Accessible",
              domNodeId: "resource-region",
            },
            {
              nodeId: "link-1",
              role: "link",
              name: "This resource covers captions, audio description, transcripts, and sign language. Making Media Accessible",
              domNodeId: "resource-card",
              properties: {
                focusable: true,
                url: "https://example.com/resources/media",
              },
            },
          ],
        },
      },
    ),
    [
      "main",
      "Featured Resource: Making Media Accessible, region",
      "link, heading level 2, This resource covers captions, audio description, transcripts, and sign language. Making Media Accessible",
      "end of, Featured Resource: Making Media Accessible, region",
      "end of, main",
    ],
  );
});

test("scanSubtree preserves descendant heading level for AX-backed simple links", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <a href="/introducing-precursor/" data-sr-dom-node-id="title-link">
            <h2 data-sr-dom-node-id="title-heading">Introducing Precursor</h2>
          </a>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "link-ax",
              role: "link",
              name: "Introducing Precursor",
              domNodeId: "title-link",
              childIds: ["heading-ax"],
              properties: {
                focusable: true,
                url: "https://example.com/introducing-precursor/",
              },
            },
            {
              nodeId: "heading-ax",
              role: "heading",
              name: "Introducing Precursor",
              domNodeId: "title-heading",
              properties: { level: 2 },
            },
          ],
        },
      },
    ),
    [
      "main",
      "link, heading level 2, Introducing Precursor",
      "end of, main",
    ],
  );
});

test("scanSubtree omits inferred article names when AX exposes an unnamed article", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <article data-sr-dom-node-id="article">
            <time>2026-07-17</time>
            <a href="/post" data-sr-dom-node-id="post-link">
              <h2 data-sr-dom-node-id="post-heading">Post title</h2>
            </a>
            <p>Summary text.</p>
          </article>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "article-ax",
              role: "article",
              name: "",
              domNodeId: "article",
            },
            {
              nodeId: "link-ax",
              role: "link",
              name: "Post title",
              domNodeId: "post-link",
              childIds: ["heading-ax"],
              properties: {
                focusable: true,
                url: "https://example.com/post",
              },
            },
            {
              nodeId: "heading-ax",
              role: "heading",
              name: "Post title",
              domNodeId: "post-heading",
              properties: { level: 2 },
            },
          ],
        },
      },
    ),
    [
      "main",
      "article",
      "2026-07-17",
      "link, heading level 2, Post title",
      "Summary text.",
      "end of, article",
      "end of, main",
    ],
  );
});

test("scanSubtree announces titled iframes inside generic single-child wrappers as media groups", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <section aria-labelledby="video-title">
            <h2 id="video-title">Video example</h2>
            <div data-sr-dom-node-id="video-wrapper">
              <iframe data-sr-dom-node-id="video-frame" title="Video"></iframe>
            </div>
            <p>Caption body follows the embedded video.</p>
          </section>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "section-1",
              role: "region",
              name: "Video example",
            },
            {
              nodeId: "wrapper-1",
              role: "generic",
              name: "",
              domNodeId: "video-wrapper",
              childIds: ["frame-1"],
            },
            {
              nodeId: "frame-1",
              role: "Iframe",
              name: "Video",
              domNodeId: "video-frame",
            },
          ],
        },
      },
    ),
    [
      "main",
      "Video example, region",
      "heading level 2, Video example",
      "Video, group",
      "Video, frame",
      "end of, Video, group",
      "Caption body follows the embedded video.",
      "end of, Video example, region",
      "end of, main",
    ],
  );
});

test("scanSubtree includes a leading focusable titled iframe as one empty group stop", () => {
  assert.deepEqual(
    scanHtml(`
      <body data-sr-scan-root>
        <iframe title="Consent Preferences" tabindex="1"></iframe>
        <a href="#main-content">Skip to main content</a>
        <main id="main-content">
          <h1>Example page</h1>
        </main>
      </body>
    `),
    [
      "Consent Preferences, empty group",
      "link, Skip to main content",
      "main",
      "heading level 1, Example page",
      "end of, main",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <iframe title="Consent Preferences" tabindex="1"></iframe>
      <a href="#main-content">Skip to main content</a>
      <main id="main-content">
        <h1>Saved fixture page</h1>
      </main>
    `),
    [
      "Consent Preferences, empty group",
      "link, Skip to main content",
      "main",
      "heading level 1, Saved fixture page",
      "end of, main",
    ],
  );
});

test("scanSubtree does not promote non-leading or unfocusable titled iframes", () => {
  assert.deepEqual(
    scanHtml(`
      <body data-sr-scan-root>
        <a href="#main-content">Skip to main content</a>
        <iframe title="Consent Preferences" tabindex="1"></iframe>
        <main id="main-content">
          <h1>Example page</h1>
        </main>
      </body>
    `),
    [
      "link, Skip to main content",
      "main",
      "heading level 1, Example page",
      "end of, main",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <body data-sr-scan-root>
        <iframe title="Consent Preferences" tabindex="-1"></iframe>
        <a href="#main-content">Skip to main content</a>
      </body>
    `),
    ["link, Skip to main content"],
  );
});

test("scanSubtree preserves AX-confirmed spacing for open-example hidden suffix links", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <a href="/examples/contact" data-sr-dom-node-id="example-link">
            Open this example in a new tab<span data-sr-rendered-position="offscreen">: contact form</span>
          </a>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "example-link-node",
              role: "link",
              name: "Open this example in a new tab : contact form",
              domNodeId: "example-link",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "main",
      "link, Open this example in a new tab : contact form",
      "end of, main",
    ],
  );
});

test("scanSubtree announces preview iframe groups before collapsed example tabs", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <div>
            <div>
              <div>
                <a href="/components/date-input/default/" data-sr-dom-node-id="example-link">
                  Open this example in a new tab<span data-sr-rendered-position="offscreen">: date input</span>
                </a>
              </div>
              <iframe title="Date input example"></iframe>
            </div>
            <span></span>
            <ul role="tablist">
              <li role="presentation"><a href="#html" role="tab" aria-controls="html" aria-expanded="false">HTML</a></li>
              <li role="presentation"><a href="#nunjucks" role="tab" aria-controls="nunjucks" aria-expanded="false">Nunjucks</a></li>
            </ul>
          </div>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "example-link-node",
              role: "link",
              name: "Open this example in a new tab : date input",
              domNodeId: "example-link",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "main",
      "link, Open this example in a new tab : date input",
      "Date input example, group",
      "Date input - Example - GOV.UK Design System, frame",
      "end of, Date input example, group",
      "HTML, collapsed, tab, 1 of 2",
      "Nunjucks, collapsed, tab, 2 of 2",
      "end of, main",
    ],
  );
});

test("scanSubtree announces expanded state for preview example tabs", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <div>
          <div>
            <div>
              <a href="/components/date-input/date-of-birth/">
                Open this example in a new tab<span>: date input to ask for date of birth - date input</span>
              </a>
            </div>
            <iframe title="Date input to ask for date of birth – Date input example"></iframe>
          </div>
          <span></span>
          <ul role="tablist">
            <li role="presentation"><a href="#html" role="tab" aria-controls="html" aria-expanded="true">HTML</a></li>
            <li role="presentation"><a href="#nunjucks" role="tab" aria-controls="nunjucks" aria-expanded="false">Nunjucks</a></li>
          </ul>
        </div>
      </main>
    `),
    [
      "main",
      "link, Open this example in a new tab: date input to ask for date of birth - date input",
      "Date input to ask for date of birth - Date input example, group",
      "Date input to ask for date of birth - Date input - Example - GOV.UK Design System, frame",
      "end of, Date input to ask for date of birth - Date input example, group",
      "HTML, expanded, tab, 1 of 2",
      "Nunjucks, collapsed, tab, 2 of 2",
      "end of, main",
    ],
  );
});

test("scanSubtree compacts expanded code panel syntax descendants", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <ul role="tablist">
          <li role="presentation"><a href="#html" role="tab" aria-controls="html-panel" aria-expanded="true">HTML</a></li>
          <li role="presentation"><a href="#nunjucks" role="tab" aria-controls="nunjucks-panel" aria-expanded="false">Nunjucks</a></li>
        </ul>
        <div id="html-panel" role="tabpanel">
          <div>
            <button>Copy code</button>
            <span aria-live="assertive"></span>
            <pre tabindex="0"><code tabindex="0"><span>&lt;div class="govuk-form-group"&gt;</span> <span>&lt;label class="govuk-label" for="postcode"&gt;Postcode&lt;/label&gt;</span> <span>&lt;input class="govuk-input" id="postcode" name="postcode" type="text" autocomplete="postal-code"&gt;</span> <span>&lt;/div&gt;</span></code></pre>
          </div>
        </div>
        <div id="nunjucks-panel" role="tabpanel" hidden>
          <div>
            <button>Copy code</button>
            <span aria-live="assertive"></span>
            <pre><code><span>{{ govukInput({ id: "postcode" }) }}</span></code></pre>
          </div>
        </div>
        <p>After panel.</p>
      </main>
    `),
    [
      "main",
      "HTML, expanded, tab, 1 of 2",
      "Nunjucks, collapsed, tab, 2 of 2",
      "Copy code, button",
      '<div class="govuk-form-group"> <label class="govuk-label" for="postcode">Postcode</label> <input class="govuk-input" id="postcode" name="postcode" type="text" autocomplete="postal-code"> </div>',
      "After panel.",
      "end of, main",
    ],
  );
});

test("scanSubtree compacts focusable tokenized pre code as one group stop", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <pre tabindex="0"><code>
          <span class="line"><span class="token keyword">class</span> <span class="token class-name">CodeSandbox</span> <span class="token keyword">extends</span> <span class="token class-name">Container</span> <span class="token punctuation">{</span></span>
          <span class="line"><span class="token property">defaultPort</span> <span class="token operator">=</span> <span class="token number">1337</span><span class="token punctuation">;</span></span>
        </code></pre>
      </section>
    `),
    ["class CodeSandbox extends Container { defaultPort = 1337; group"],
  );
});

test("scanSubtree keeps unfocusable tokenized pre code out of compact group stop", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <pre><code>
          <span class="line"><span class="token keyword">class</span> <span class="token class-name">Worker</span> <span class="token punctuation">{</span><span class="token punctuation">}</span></span>
        </code></pre>
      </section>
    `),
    ["class", "Worker", "{", "}"],
  );
});

test("scanSubtree keeps footer legal separators visual and suppresses footer action group", () => {
  assert.deepEqual(
    scanHtml(`
      <footer>
        <a href="/privacy">Privacy policy</a><span>|</span>
        <a href="/security">Report security issues</a><span>|</span>
        <a href="/terms">Terms of use</a><span>|</span>
        <a href="/trademark">Trademark</a><span>|</span>
        <button type="button"><svg aria-hidden="true"></svg><span>Your privacy choices</span></button>
      </footer>
    `),
    [
      "footer",
      "link, Privacy policy",
      "link, Report security issues",
      "link, Terms of use",
      "link, Trademark",
      "Your privacy choices, button",
      "end of, footer",
    ],
  );
});

test("scanSubtree preserves terminal punctuation before code action button group suffix", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <section>
          <pre tabindex="0"><code><span class="token keyword">class</span> <span class="token class-name">Worker</span> <span class="token punctuation">{</span><span class="token punctuation">}</span></code></pre>
          <button type="button"><p>Generate markdown</p><span>Convert content for AI processing. See docs.</span></button>
        </section>
      </main>
    `),
    [
      "main",
      "class Worker {} group",
      "Generate markdown Convert content for AI processing. See docs., button, group",
      "end of, main",
    ],
  );
});

test("scanSubtree adds group suffix for filter and code example action buttons", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <section>
          <p>Filter By:</p>
          <div><button type="button"><span>All Industries</span><svg aria-hidden="true"></svg></button></div>
          <div><button type="button"><span>All Regions</span><svg aria-hidden="true"></svg></button></div>
          <div><button type="button"><span>All Use Cases</span><svg aria-hidden="true"></svg></button></div>
          <div><button type="button"><span>All Products</span><svg aria-hidden="true"></svg></button></div>
        </section>
        <section>
          <pre tabindex="0"><code><span class="token keyword">class</span> <span class="token class-name">Worker</span> <span class="token punctuation">{</span><span class="token punctuation">}</span></code></pre>
          <button type="button" aria-label="Copy code to clipboard"><svg aria-hidden="true"></svg></button>
          <button type="button"><p>Define Container</p><span>Define and customize your container.</span></button>
        </section>
      </main>
    `),
    [
      "main",
      "Filter By:",
      "All Industries, button, group",
      "All Regions, button, group",
      "All Use Cases, button, group",
      "All Products, button, group",
      "class Worker {} group",
      "Copy code to clipboard, button, group",
      "Define Container Define and customize your container., button, group",
      "end of, main",
    ],
  );
});

test("scanSubtree exposes standalone code badge text", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <img alt="Background Pattern">
        <code>Containers</code>
        <h4>You can use Containers to:</h4>
      </section>
    `),
    [
      "Background Pattern, image",
      "Containers",
      "heading level 4, You can use Containers to:",
    ],
  );
});

test("scanSubtree uses AX descendant casing for paragraph StaticText", () => {
  assert.deepEqual(
    scanHtml(
      `
        <p data-sr-dom-node-id="featured">Featured in</p>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "paragraph",
              role: "paragraph",
              name: "",
              domNodeId: "featured",
              childIds: ["static"],
            },
            {
              nodeId: "static",
              role: "StaticText",
              name: "FEATURED IN",
            },
          ],
        },
      },
    ),
    ["FEATURED IN"],
  );
});

test("scanSubtree preserves AX-generated trailing punctuation for expanded buttons", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <button data-sr-dom-node-id="disclosure" aria-expanded="true">Hide Section</button>
          <button data-sr-dom-node-id="plain">Close</button>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "button-1",
              role: "button",
              name: "Hide Section –",
              domNodeId: "disclosure",
              properties: { focusable: true, expanded: true },
            },
            {
              nodeId: "button-2",
              role: "button",
              name: "Close –",
              domNodeId: "plain",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "main",
      "Hide Section –, expanded, button, group",
      "Close, button",
      "end of, main",
    ],
  );
});

test("scanSubtree announces expanded navigation list item buttons as grouped controls", () => {
  assert.deepEqual(
    scanHtml(
      `
        <nav aria-label="Options">
          <ul>
            <li><a href="/translations">All Translations</a></li>
            <li><button data-sr-dom-node-id="toggle" aria-expanded="true">Hide Options</button></li>
          </ul>
        </nav>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "button-1",
              role: "button",
              name: "Hide Options –",
              domNodeId: "toggle",
              properties: { focusable: true, expanded: true },
            },
          ],
        },
      },
    ),
    [
      "Options, navigation",
      "list 2 items",
      "link, All Translations, 1 of 2",
      "Hide Options –, expanded, button, group, 2 of 2",
      "end of list",
      "end of, Options, navigation",
    ],
  );
});

test("scanSubtree does not group collapsed or popup navigation list item buttons", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Options">
        <ul>
          <li><button aria-expanded="false">Show Options</button></li>
          <li><button aria-haspopup="menu" aria-expanded="true">Menu</button></li>
        </ul>
      </nav>
    `),
    [
      "Options, navigation",
      "list 2 items",
      "Show Options, collapsed, button, 1 of 2",
      "Menu, menu pop up expanded, button, 2 of 2",
      "end of list",
      "end of, Options, navigation",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Primary">
        <button aria-expanded="false" aria-label="Open All Categories Menu">All</button>
      </nav>
    `),
    [
      "Primary, navigation",
      "Open All Categories Menu, collapsed, button",
      "end of, Primary, navigation",
    ],
  );
});

test("scanSubtree keeps role presentation collapsed accordion lists transparent", () => {
  assert.deepEqual(
    scanHtml(`
      <div>
        <ul role="presentation">
          <li role="presentation">
            <button aria-expanded="false">Popular Destinations</button>
          </li>
          <div aria-label="Popular Destinations">
            <a href="/bodrum">Bodrum Holidays</a>
            <a href="/canary-islands">Canary Islands Holidays</a>
          </div>
          <li role="presentation">
            <button aria-expanded="false">Flights To</button>
          </li>
          <div aria-label="Flights To">
            <a href="/alicante">Alicante Flights</a>
          </div>
        </ul>
      </div>
    `),
    [
      "Popular Destinations, collapsed, button",
      "Popular Destinations, group",
      "link, Bodrum Holidays",
      "link, Canary Islands Holidays",
      "end of, Popular Destinations, group",
      "Flights To, collapsed, button",
      "Flights To, group",
      "link, Alicante Flights",
      "end of, Flights To, group",
    ],
  );
});

test("scanSubtree traverses labelled role presentation list links inside groups", () => {
  assert.deepEqual(
    scanHtml(`
      <footer>
        <div aria-label="Company Information & Policies">
          <span>Company Information & Policies</span>
          <ul role="presentation">
            <li role="presentation"><a role="link" href="/privacy">Privacy notice</a></li>
            <li role="presentation"><a role="link" href="/terms">Booking terms & conditions</a></li>
          </ul>
        </div>
        <div aria-labelledby="resources-heading">
          <span id="resources-heading">Holiday Resources</span>
          <ul role="presentation">
            <li role="presentation"><a href="/insurance">Travel insurance</a></li>
          </ul>
        </div>
      </footer>
    `),
    [
      "footer",
      "Company Information & Policies, group",
      "Company Information & Policies",
      "link, Privacy notice",
      "link, Booking terms & conditions",
      "end of, Company Information & Policies, group",
      "Holiday Resources, group",
      "Holiday Resources",
      "link, Travel insurance",
      "end of, Holiday Resources, group",
      "end of, footer",
    ],
  );
});

test("scanSubtree groups focusable paragraph rich-text wrappers before sibling navigation", () => {
  assert.deepEqual(
    scanHtml(`
      <footer>
        <h2>Travel Aware - Staying Safe and Healthy Abroad</h2>
        <span tabindex="0">
          <p>FCDO and <b>Travel Health</b> have current advice for safe travel abroad.</p>
          <p>For the latest advice, check <a href="/travel-aware">Travel Aware</a> and follow <a href="/fcdo">@FCDOtravelGovUK</a>.</p>
          <p><a href="/documents">Travel documents</a></p>
          <p>Advice can change so check regularly for updates.</p>
        </span>
        <span>
          <nav aria-label="Travel Aware - Staying Safe and Healthy Abroad">
            <img alt="fcdo" title="fcdo">
          </nav>
        </span>
        <div tabindex="0">
          <h2>Your holiday protection</h2>
          <p>Protection sync marker.</p>
        </div>
      </footer>
    `),
    [
      "footer",
      "heading level 2, Travel Aware - Staying Safe and Healthy Abroad",
      "FCDO and Travel Health have current advice for safe travel abroad. For the latest advice, check Travel Aware and follow @FCDOtravelGovUK. Travel documents Advice can change so check regularly for updates. group",
      "Travel Aware - Staying Safe and Healthy Abroad, navigation",
      "fcdo, image",
      "end of, Travel Aware - Staying Safe and Healthy Abroad, navigation",
      "heading level 2, Your holiday protection",
      "Protection sync marker.",
      "end of, footer",
    ],
  );
});

test("scanSubtree groups focusable heading rich-text wrappers with internal navigation", () => {
  assert.deepEqual(
    scanHtml(`
      <div data-sr-scan-root>
        <footer>
          <div tabindex="0">
            <h2>Your holiday protection</h2>
            <div>
              <span>
                <div>
                  <p><b>ATOL protection for flight-inclusive package holidays</b></p>
                  <p>Flight-inclusive holidays are financially protected by the ATOL scheme.</p>
                </div>
                <div>
                  <p><b>What this means for you</b></p>
                  <p>You receive an ATOL certificate.</p>
                </div>
                <div>
                  <p><b>More Information:</b></p>
                  <p>Visit <a href="/caa">the Civil Aviation Authority website</a> for ATOL certificate information.</p>
                </div>
              </span>
              <span>
                <nav aria-label="Your holiday protection">
                  <span><img alt="abta" title="ABTA - The Travel Association"></span>
                  <span><img alt="atol" title="ATOL Protected"></span>
                </nav>
              </span>
            </div>
          </div>
          <a href="/sync">Footer sync after protection</a>
        </footer>
      </div>
    `),
    [
      "footer",
      "Your holiday protection ATOL protection for flight-inclusive package holidays Flight-inclusive holidays are financially protected by the ATOL scheme. What this means for you You receive an ATOL certificate. More Information: Visit the Civil Aviation Authority website for ATOL certificate information. Your holiday protection group",
      "link, Footer sync after protection",
      "end of, footer",
    ],
  );
});

test("scanSubtree suppresses terminal footer end after final focusable rich-text group", () => {
  assert.deepEqual(
    scanHtml(`
      <div data-sr-scan-root>
        <footer>
          <div tabindex="0">
            <h2>Your holiday protection</h2>
            <div>
              <span>
                <div>
                  <p><b>ATOL protection for flight-inclusive package holidays</b></p>
                  <p>Flight-inclusive holidays are financially protected by the ATOL scheme.</p>
                </div>
                <div>
                  <p><b>What this means for you</b></p>
                  <p>You receive an ATOL certificate.</p>
                </div>
                <div>
                  <p><b>More Information:</b></p>
                  <p>Visit <a href="/caa">the Civil Aviation Authority website</a> for ATOL certificate information.</p>
                </div>
              </span>
              <span>
                <nav aria-label="Your holiday protection">
                  <span><img alt="abta" title="ABTA - The Travel Association"></span>
                  <span><img alt="atol" title="ATOL Protected"></span>
                </nav>
              </span>
            </div>
          </div>
        </footer>
      </div>
    `),
    [
      "footer",
      "Your holiday protection ATOL protection for flight-inclusive package holidays Flight-inclusive holidays are financially protected by the ATOL scheme. What this means for you You receive an ATOL certificate. More Information: Visit the Civil Aviation Authority website for ATOL certificate information. Your holiday protection group",
    ],
  );
});

test("scanSubtree keeps unlabelled role presentation link lists as lists", () => {
  assert.deepEqual(
    scanHtml(`
      <div>
        <span>Useful links</span>
        <ul role="presentation">
          <li role="presentation"><a href="/privacy">Privacy notice</a></li>
          <li role="presentation"><a href="/terms">Terms</a></li>
        </ul>
      </div>
    `),
    [
      "Useful links",
      "list",
      "end of list",
    ],
  );
});

test("scanSubtree does not add a group suffix to collapsed dialog popup image text buttons", () => {
  assert.deepEqual(
    scanHtml(`
      <footer>
        <button aria-label="TUI UK" aria-haspopup="dialog" aria-expanded="false">
          <img alt="uk">
          <span>TUI UK</span>
        </button>
        <p>Country button suffix sync marker.</p>
      </footer>
    `),
    [
      "content information",
      "TUI UK, dialog pop up collapsed, button",
      "Country button suffix sync marker.",
      "end of, content information",
    ],
  );
});

test("scanSubtree does not add a group suffix to AX-confirmed empty offscreen collapsed buttons", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <a href="/cy">Fersiwn Cymraeg</a>
          <div
            role="button"
            aria-controls="result-content"
            aria-expanded="false"
            data-sr-dom-node-id="collapsed-result"
            data-sr-rendered-position="offscreen"
          ></div>
          <p>Postcodes are not intended to pinpoint an exact geographical location.</p>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "collapsed-result-ax",
              role: "button",
              name: "",
              domNodeId: "collapsed-result",
              properties: { expanded: false },
            },
          ],
        },
      },
    ),
    [
      "main",
      "link, Fersiwn Cymraeg",
      "collapsed, button",
      "Postcodes are not intended to pinpoint an exact geographical location.",
      "end of, main",
    ],
  );
});

test("scanSubtree does not add a group suffix to AX-confirmed collapsed native buttons with hidden controlled regions", () => {
  const accessibilityTree = {
    nodes: [
      {
        nodeId: "menu-button",
        role: "button",
        name: "Show navigation menu",
        domNodeId: "menu-button",
        tagName: "button",
        properties: { focusable: true, expanded: false },
      },
      {
        nodeId: "search-button",
        role: "button",
        name: "Show search menu",
        domNodeId: "search-button",
        tagName: "button",
        properties: { focusable: true, expanded: false },
      },
    ],
  };

  assert.deepEqual(
    scanHtml(
      `
        <header>
          <nav aria-label="Primary">
            <button
              type="button"
              aria-controls="primary-menu"
              aria-expanded="false"
              aria-label="Show navigation menu"
              data-sr-dom-node-id="menu-button"
            >
              <span>Menu</span>
            </button>
            <div id="primary-menu" hidden data-sr-computed-hidden="display:none">
              <a href="/services">Services</a>
            </div>
            <button
              type="button"
              aria-controls="site-search"
              aria-expanded="false"
              aria-label="Show search menu"
              data-sr-dom-node-id="search-button"
            >
              <span>Search</span>
              <svg aria-hidden="true"></svg>
            </button>
            <div id="site-search" data-sr-computed-hidden="display:none">
              <form role="search"><input type="search" aria-label="Search"></form>
            </div>
          </nav>
        </header>
      `,
      { accessibilityTree },
    ),
    [
      "banner",
      "Primary, navigation",
      "Show navigation menu, collapsed, button",
      "Show search menu, collapsed, button",
      "end of, Primary, navigation",
      "end of, banner",
    ],
  );
});

test("scanSubtree suppresses child control group suffixes inside named action groups", () => {
  assert.deepEqual(
    scanHtml(`
      <header>
        <nav aria-label="Main">
          <div role="group" aria-label="Site actions">
            <details>
              <summary aria-label="All Categories">
                <span hidden>All Categories</span>
              </summary>
              <div hidden><a href="/tag/ai/">AI</a></div>
            </details>
            <button type="button" aria-label="Search posts and pages" aria-expanded="false">
              <svg aria-hidden="true"></svg>
            </button>
          </div>
        </nav>
      </header>
    `),
    [
      "banner",
      "Main, navigation",
      "Site actions, group",
      "All Categories, collapsed, disclosure triangle",
      "Search posts and pages, collapsed, button",
      "end of, Site actions, group",
      "end of, Main, navigation",
      "end of, banner",
    ],
  );
});

test("scanSubtree keeps a group suffix on collapsed native buttons with visibility-hidden controlled regions", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <nav aria-label="Languages">
            <button
              type="button"
              aria-controls="language-list"
              aria-expanded="false"
              data-sr-dom-node-id="language-button"
            >
              <span>Read in your language</span>
            </button>
            <div id="language-list" data-sr-computed-hidden="visibility:hidden">
              <a href="/es" data-sr-computed-hidden="visibility:hidden">Spanish</a>
            </div>
          </nav>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "language-button",
              role: "button",
              name: "Read in your language",
              domNodeId: "language-button",
              tagName: "button",
              properties: { focusable: true, expanded: false },
            },
          ],
        },
      },
    ),
    [
      "main",
      "Languages, navigation",
      "Read in your language, collapsed, button, group",
      "end of, Languages, navigation",
      "end of, main",
    ],
  );
});

test("scanSubtree keeps a group suffix on collapsed native buttons with visible controlled regions", () => {
  assert.deepEqual(
    scanHtml(
      `
        <header>
          <nav aria-label="Primary">
            <button
              type="button"
              aria-controls="primary-menu"
              aria-expanded="false"
              aria-label="Show navigation menu"
              data-sr-dom-node-id="menu-button"
            >
              <span>Menu</span>
            </button>
            <div id="primary-menu">
              <a href="/services">Services</a>
            </div>
          </nav>
        </header>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "menu-button",
              role: "button",
              name: "Show navigation menu",
              domNodeId: "menu-button",
              tagName: "button",
              properties: { focusable: true, expanded: false },
            },
          ],
        },
      },
    ),
    [
      "banner",
      "Primary, navigation",
      "Show navigation menu, collapsed, button, group",
      "end of, Primary, navigation",
      "end of, banner",
    ],
  );
});

test("scanSubtree scans collapsed controlled regions when AX keeps the region visible", () => {
  const accessibilityTree = {
    nodes: [
      {
        nodeId: "alpha-button-ax",
        role: "button",
        name: "Alpha",
        domNodeId: "alpha-button",
        tagName: "div",
        properties: { expanded: false, controls: "alpha-region" },
      },
      {
        nodeId: "alpha-region-ax",
        role: "region",
        name: "Alpha",
        domNodeId: "alpha-region",
        tagName: "div",
      },
      {
        nodeId: "epsilon-button-ax",
        role: "button",
        name: "Epsilon",
        domNodeId: "epsilon-button",
        tagName: "div",
        properties: { expanded: false, controls: "epsilon-region" },
      },
      {
        nodeId: "zeta-button-ax",
        role: "button",
        name: "Zeta",
        domNodeId: "zeta-button",
        tagName: "div",
        properties: { expanded: true, controls: "zeta-region" },
      },
      {
        nodeId: "zeta-region-ax",
        role: "region",
        name: "Zeta",
        domNodeId: "zeta-region",
        tagName: "div",
      },
    ],
  };

  assert.deepEqual(
    scanHtml(
      `
        <footer>
          <nav aria-label="Footer">
            <div
              id="alpha-button"
              role="button"
              aria-controls="alpha-region"
              aria-expanded="false"
              data-sr-dom-node-id="alpha-button"
            >Alpha</div>
            <div
              id="alpha-region"
              role="region"
              aria-labelledby="alpha-button"
              data-sr-dom-node-id="alpha-region"
            >
              <a href="/alpha-one">Alpha one</a>
            </div>

            <div
              id="epsilon-button"
              role="button"
              aria-controls="epsilon-region"
              aria-expanded="false"
              data-sr-dom-node-id="epsilon-button"
            >Epsilon</div>
            <div
              id="epsilon-region"
              role="region"
              aria-labelledby="epsilon-button"
              hidden
              data-sr-computed-hidden="display:none"
            >
              <a href="/hidden-one">Hidden one</a>
            </div>

            <div
              id="zeta-button"
              role="button"
              aria-controls="zeta-region"
              aria-expanded="true"
              data-sr-dom-node-id="zeta-button"
            >Zeta</div>
            <div
              id="zeta-region"
              role="region"
              aria-labelledby="zeta-button"
              data-sr-dom-node-id="zeta-region"
            >
              <a href="/visible-one">Visible one</a>
            </div>
          </nav>
        </footer>
      `,
      { accessibilityTree },
    ),
    [
      "footer",
      "Footer, navigation",
      "Alpha, collapsed, button, group",
      "Alpha, region",
      "link, Alpha one",
      "end of, Alpha, region",
      "Epsilon, collapsed, button, group",
      "Zeta, expanded, button, group",
      "Zeta, region",
      "link, Visible one",
      "end of, Zeta, region",
      "end of, Footer, navigation",
      "end of, footer",
    ],
  );
});

test("scanSubtree keeps AX-visible collapsed controlled region lists at the VoiceOver level", () => {
  const accessibilityTree = {
    nodes: [
      {
        nodeId: "alpha-button-ax",
        role: "button",
        name: "Alpha",
        domNodeId: "alpha-button",
        tagName: "div",
        properties: { expanded: false, controls: "alpha-region" },
      },
      {
        nodeId: "alpha-region-ax",
        role: "region",
        name: "Alpha",
        domNodeId: "alpha-region",
        tagName: "div",
      },
    ],
  };

  assert.deepEqual(
    scanHtml(
      `
        <footer>
          <nav aria-label="Footer">
            <ul>
              <li>
                <div
                  id="alpha-button"
                  role="button"
                  aria-controls="alpha-region"
                  aria-expanded="false"
                  data-sr-dom-node-id="alpha-button"
                >Alpha</div>
                <div
                  id="alpha-region"
                  role="region"
                  aria-labelledby="alpha-button"
                  data-sr-dom-node-id="alpha-region"
                >
                  <ul>
                    <li><a href="/alpha-one">Alpha one</a></li>
                  </ul>
                </div>
              </li>
            </ul>
          </nav>
        </footer>
      `,
      { accessibilityTree },
    ),
    [
      "footer",
      "Footer, navigation",
      "list 1 item",
      "Alpha, collapsed, button, group",
      "Alpha, region",
      "list 1 item",
      "link, Alpha one",
      "end of list",
      "end of, Alpha, region",
      "end of list",
      "end of, Footer, navigation",
      "end of, footer",
    ],
  );
});

test("scanSubtree preserves AX-confirmed leading-space heading fragments", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <h2 data-sr-dom-node-id="news-heading"><span></span><span>News</span></h2>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "heading",
              role: "heading",
              name: "\u00A0 News",
              domNodeId: "news-heading",
              tagName: "h2",
              childIds: ["space", "title-wrapper"],
              properties: { level: 2 },
            },
            {
              nodeId: "space",
              role: "StaticText",
              name: "\u00A0",
            },
            {
              nodeId: "title-wrapper",
              ignored: true,
              role: "none",
              name: "",
              childIds: ["title"],
            },
            {
              nodeId: "title",
              role: "StaticText",
              name: "News",
            },
          ],
        },
      },
    ),
    [
      "main",
      "heading level 2 space, level 1 News, level 1, 2 items",
      "end of, main",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <main>
        <h2 data-sr-dom-node-id="news-heading"><span></span><span>News</span></h2>
      </main>
    `),
    ["main", "heading level 2, News", "end of, main"],
  );
});

test("scanSubtree preserves semantic parents whose text is inside declarative shadow DOM", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h3>
          <x-rich-text>
            <template shadowrootmode="open">
              <span>Why Sky Business broadband?</span>
            </template>
          </x-rich-text>
        </h3>
        <button>
          <x-rich-text>
            <template shadowrootmode="open">
              <span>Discover Full Fibre</span>
            </template>
          </x-rich-text>
        </button>
      </section>
    `),
    [
      "heading level 3, Why Sky Business broadband?",
      "Discover Full Fibre, button",
    ],
  );
});

test("scanSubtree falls back to link URL slugs when links have no readable label", () => {
  assert.deepEqual(
    scanHtml(`
      <nav>
        <a href="https://web.dev/html"></a>
        <a href="https://web.dev/css"></a>
        <a href="https://web.dev/explore/ai"></a>
        <a href="https://web.dev/learn/javascript"></a>
        <a href="https://web.dev/explore/how-to-optimize-inp?utm_source=cards"></a>
        <a href="#main-content"></a>
        <a href="mailto:hello@example.com"></a>
        <a href="/has-title" title="Explicit title"></a>
      </nav>
    `),
    [
      "navigation",
      "link, html",
      "link, CSS",
      "link, ai",
      "link, javascript",
      "link, how-to-optimize-inp",
      "link",
      "link",
      "link, Explicit title",
      "end of, navigation",
    ],
  );
});

test("scanSubtree preserves rendered uppercase link casing from generic sources", () => {
  assert.deepEqual(
    scanHtml(`
      <a href="/advertising" style="text-transform: uppercase">Ad</a>
    `),
    ["link, AD"],
  );

  assert.deepEqual(
    scanHtml(
      `
        <ad-note>
          <template shadowrootmode="open">
            <a href="/advertising">Ad</a>
          </template>
        </ad-note>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              role: "link",
              name: "AD",
              properties: {
                url: "https://example.test/advertising",
              },
            },
          ],
        },
      },
    ),
    ["link, AD"],
  );

  assert.deepEqual(
    scanHtml(`
      <h3 style="text-transform: uppercase">Platform</h3>
    `),
    ["heading level 3, PLATFORM"],
  );

  assert.deepEqual(
    scanHtml(
      `
        <button data-sr-dom-node-id="consent">Do not share my personal information</button>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              role: "button",
              name: "DO NOT SHARE MY PERSONAL INFORMATION",
              domNodeId: "consent",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    ["DO NOT SHARE MY PERSONAL INFORMATION, button"],
  );
});

test("scanSubtree splits a leading emphasized blockquote fragment before the quoted role", () => {
  assert.deepEqual(
    scanHtml(`
      <figure>
        <blockquote>
          <span>
            <em>Actions is an exciting development and unlocks so much potential beyond CI/CD.</em>
            It promises to streamline our workflows for a variety of tasks.
          </span>
        </blockquote>
      </figure>
    `),
    [
      "Actions is an exciting development and unlocks so much potential beyond CI/CD.",
      "It promises to streamline our workflows for a variety of tasks., block quote level 1",
    ],
  );
});

test("scanSubtree omits the block quote suffix for plain span-only blockquotes", () => {
  assert.deepEqual(
    scanHtml(`
      <figure>
        <blockquote>
          <span>Shopify uses GitHub Sponsors to efficiently manage and fund projects within the open source community.</span>
        </blockquote>
      </figure>
    `),
    [
      "Shopify uses GitHub Sponsors to efficiently manage and fund projects within the open source community.",
    ],
  );
});

test("scanSubtree preserves a boundary before dot-prefixed word tokens", () => {
  assert.deepEqual(
    scanHtml(`
      <p>Setup<span>.NET</span> Core SDK</p>
      <p>Rust,<span>.NET</span>, and more.</p>
    `),
    [
      "Setup .NET Core SDK",
      "Rust, .NET, and more.",
    ],
  );
});

test("scanSubtree includes captured generated button text for popup tab buttons", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Upper tabs">
        <div>
          <button data-sr-pseudo-before="arrow_drop_down">Resources</button>
          <div role="menu" hidden>
            <a href="/html">HTML</a>
          </div>
        </div>
        <button data-sr-pseudo-before="search">Search</button>
      </nav>
    `),
    [
      "Upper tabs, navigation",
      "arrow_drop_down Resources, button, group",
      "search Search, button",
      "end of, Upper tabs, navigation",
    ],
  );
});

test("scanSubtree collapses focusable summary panels into a single group stop", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <div tabindex="0">
          <div>
            <h1>Log in to Example</h1>
            <div>
              <button type="button">Continue with Google</button>
              <button type="button">Continue with email</button>
              <button type="button">Continue with SAML SSO</button>
              <button type="button">Log in with passkey</button>
            </div>
            <p>Don't have an account? <a href="/signup">Sign up</a> or <a href="/home">learn more</a></p>
          </div>
        </div>
      </main>
    `),
    [
      "main",
      "Log in to Example Continue with Google Continue with email Continue with SAML SSO Log in with passkey Don't have an account? Sign up or learn more, group",
      "end of, main",
    ],
  );
});

test("scanSubtree closes main before entering a following contentinfo landmark", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <h1>Page title</h1>
      </main>
      <footer role="contentinfo" aria-label="Apple Footer">
        <h2>Apple Footer</h2>
      </footer>
    `),
    [
      "main",
      "heading level 1, Page title",
      "end of, main",
      "Apple Footer, content information",
      "heading level 2, Apple Footer",
      "end of, Apple Footer, content information",
    ],
  );
});

test("scanSubtree uses footer wording for native footer landmarks", () => {
  assert.deepEqual(
    scanHtml(`
      <main>Main body</main>
      <footer>
        <a href="/visa"><img alt="Visa Secure"></a>
      </footer>
    `),
    [
      "main",
      "end of, main",
      "footer",
      "link, image, Visa Secure",
      "end of, footer",
    ],
  );
});

test("scanSubtree uses footer wording for structured native footer landmarks", () => {
  assert.deepEqual(
    scanHtml(`
      <main>Main body</main>
      <footer>
        <h2>Here to help</h2>
        <ul>
          <li><a href="/account">My Account</a></li>
          <li><a href="/help">Help</a></li>
          <li><a href="/stores">Store locator</a></li>
        </ul>
      </footer>
    `),
    [
      "main",
      "end of, main",
      "footer",
      "heading level 2, Here to help",
      "list 3 items",
      "link, My Account, 1 of 3",
      "link, Help, 2 of 3",
      "link, Store locator, 3 of 3",
      "end of list",
      "end of, footer",
    ],
  );
});

test("scanSubtree uses footer wording for labelled structured native footer landmarks", () => {
  assert.deepEqual(
    scanHtml(`
      <main>Main body</main>
      <footer aria-label="Site">
        <a href="/home">Example Home</a>
        <ul role="list">
          <li><a href="/news">News</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </footer>
    `),
    [
      "main",
      "end of, main",
      "Site, footer",
      "link, Example Home",
      "list 2 items",
      "link, News, 1 of 2",
      "link, Contact, 2 of 2",
      "end of list",
      "end of, Site, footer",
    ],
  );
});

test("scanSubtree keeps content information wording for informational native footers", () => {
  assert.deepEqual(
    scanHtml(`
      <main>Main body</main>
      <footer>
        <p>Weather data supplied by <a href="/provider">MeteoGroup</a>.</p>
        <p>Copyright 2026.</p>
      </footer>
    `),
    [
      "main",
      "end of, main",
      "content information",
      "Weather data supplied by",
      "link, MeteoGroup",
      "Copyright 2026.",
      "end of, content information",
    ],
  );
});

test("scanSubtree keeps content information wording for labelled informational native footers", () => {
  assert.deepEqual(
    scanHtml(`
      <main>Main body</main>
      <footer aria-label="Legal">
        <p>Weather data supplied by <a href="/provider">MeteoGroup</a>.</p>
        <p>Copyright 2026.</p>
      </footer>
    `),
    [
      "main",
      "end of, main",
      "Legal, content information",
      "Weather data supplied by",
      "link, MeteoGroup",
      "Copyright 2026.",
      "end of, Legal, content information",
    ],
  );
});

test("scanSubtree treats native footer inside role main as section footer content", () => {
  assert.deepEqual(
    scanHtml(`
      <div role="main">
        <p>Main body</p>
        <footer>
          <p>Data supplied by <a href="/provider">Provider</a>.</p>
          <p>All times are local.</p>
        </footer>
      </div>
      <footer role="contentinfo">
        <a href="/terms">Terms</a>
      </footer>
    `),
    [
      "main",
      "Main body",
      "Data supplied by",
      "link, Provider",
      "All times are local.",
      "end of, main",
      "content information",
      "link, Terms",
      "end of, content information",
    ],
  );
});

test("scanSubtree preserves AX-confirmed named section footer stops", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <section>
            <article>
              <h3>Beach holidays</h3>
            </article>
            <footer aria-label="ATOL Protected holidays | Terms and Conditions apply" data-sr-dom-node-id="footer">
              <small data-sr-dom-node-id="small">ATOL Protected holidays | Terms and Conditions apply</small>
            </footer>
          </section>
          <h2>With you every step of the journey.</h2>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "footer-node",
              role: "sectionfooter",
              name: "ATOL Protected holidays | Terms and Conditions apply",
              domNodeId: "footer",
              tagName: "footer",
              childIds: ["small-node"],
            },
            {
              nodeId: "small-node",
              role: "generic",
              name: "",
              domNodeId: "small",
              tagName: "small",
              childIds: ["small-text"],
            },
            {
              nodeId: "small-text",
              role: "StaticText",
              name: "ATOL Protected holidays | Terms and Conditions apply",
            },
          ],
        },
      },
    ),
    [
      "main",
    "Beach holidays, article",
      "heading level 3, Beach holidays",
      "end of, article",
      "ATOL Protected holidays | Terms and Conditions apply",
      "ATOL Protected holidays | Terms and Conditions apply",
      "end of, ATOL Protected holidays | Terms and Conditions apply",
      "heading level 2, With you every step of the journey.",
      "end of, main",
    ],
  );
});

test("scanSubtree preserves line break heading fragments", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <h1>Keep the drama on the screen<br>with Sky Protect</h1>
      </main>
    `),
    [
      "main",
      "heading level 1 Keep the drama on the screen with Sky Protect, 2 items",
      "end of, main",
    ],
  );
});

test("scanSubtree preserves AX-confirmed h1 line break marker fragments", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <h1 data-sr-dom-node-id="hero-heading">Resources for Developers,<br data-sr-dom-node-id="hero-break">by Developers</h1>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "heading",
              role: "heading",
              name: "Resources for Developers, by Developers _",
              domNodeId: "hero-heading",
              tagName: "h1",
              childIds: ["heading-text-1", "heading-break", "heading-text-2"],
              properties: { level: 1 },
            },
            { nodeId: "heading-text-1", role: "StaticText", name: "Resources for Developers," },
            {
              nodeId: "heading-break",
              role: "LineBreak",
              name: "\n",
              domNodeId: "hero-break",
              tagName: "br",
            },
            { nodeId: "heading-text-2", role: "StaticText", name: "by Developers" },
          ],
        },
      },
    ),
    [
      "main",
      "heading level 1 Resources for Developers, by Developers -, 3 items",
      "end of, main",
    ],
  );
});

test("scanSubtree preserves h1 direct inline code child boundaries", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <h1><code>accept</code> HTML attribute</h1>
      </main>
    `),
    [
      "main",
      "heading level 1 accept HTML attribute, 2 items",
      "end of, main",
    ],
  );
});

test("scanSubtree follows comparison table accessibility row order", () => {
  assert.deepEqual(
    scanHtml(`
      <table>
        <thead>
          <tr>
            <th>&nbsp;</th>
            <th>Product A</th>
            <th>Product B</th>
          </tr>
        </thead>
        <thead aria-hidden="true">
          <tr>
            <th>&nbsp;</th>
            <th>Sticky Product A</th>
            <th>Sticky Product B</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Monthly Plan</th>
            <td><a href="/a">Buy A</a></td>
            <td><a href="/b">Buy B</a></td>
          </tr>
        </tbody>
        <thead data-table-group-header="true">
          <tr>
            <th>
              <button id="picture-heading" aria-controls="picture-content" aria-expanded="true">
                Picture
              </button>
            </th>
          </tr>
        </thead>
        <tbody id="picture-content" role="region" aria-labelledby="picture-heading">
          <tr>
            <th>4k display</th>
            <td>Visible in DOM, ignored in table navigation</td>
            <td>Also ignored in table navigation</td>
          </tr>
        </tbody>
      </table>
    `),
    [
      "table, 3 columns, 3 rows",
      "blank, column 1 of 3",
      "Product A, column 2 of 3",
      "Product B, column 3 of 3",
      "row 2 of 3 Monthly Plan, column 1 of 3",
      "Product A link, Buy A, column 2 of 3",
      "Product B link, Buy B, column 3 of 3",
      "row 3 of 3 Picture, expanded, button, group, column 1 of 3",
      "end of table",
    ],
  );
});

test("scanSubtree uses singular column wording for one-column tables", () => {
  assert.deepEqual(
    scanHtml(`
      <table>
        <thead><tr><th>Specification</th></tr></thead>
        <tbody><tr><td>HTML</td></tr></tbody>
      </table>
    `),
    [
      "table, 1 column, 2 rows",
      "Specification, column 1 of 1",
      "row 2 of 2 Specification HTML, column 1 of 1",
      "end of table",
    ],
  );
});

test("scanSubtree matches VoiceOver context for simple native two-column header tables", () => {
  assert.deepEqual(
    scanHtml(`
      <table>
        <thead>
          <tr>
            <th>When to call</th>
            <th>Here's the number</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Monday to Friday 2pm to 6pm</td>
            <td>0345 7111 222*</td>
          </tr>
        </tbody>
      </table>
    `),
    [
      "table, 2 columns, 2 rows",
      "When to call, column 1 of 2",
      "Here's the number Here's the number, column 2 of 2",
      "row 2 of 2 When to call Monday to Friday 2pm to 6pm, column 1 of 2",
      "Here's the number 0345 7111 222*, column 2 of 2",
      "end of table",
    ],
  );
});

test("scanSubtree preserves definition list items through generic wrappers", () => {
  assert.deepEqual(
    scanHtml(`
      <dl>
        <div>
          <dt><span>Full support</span></dt>
          <dd>Full support</dd>
        </div>
        <div>
          <dt><abbr title="See implementation notes."></abbr></dt>
          <dd>See implementation notes.</dd>
        </div>
      </dl>
    `),
    [
      "definition list 4 items",
      "Full support, term, (1 of 4), 1 of 4",
      "Full support",
      "end of, Full support, term, (1 of 4)",
      "Full support, 2 of 4",
      "See implementation notes., term, (3 of 4), 3 of 4",
      "See implementation notes., empty group",
      "end of, See implementation notes., term, (3 of 4)",
      "See implementation notes., 4 of 4",
      "end of definition list",
    ],
  );
});

test("scanSubtree announces direct definition-list disclosure buttons and dd link position like VoiceOver", () => {
  assert.deepEqual(
    scanHtml(`
      <dl>
        <dt><button aria-expanded="true">Automate everything</button></dt>
        <dd>
          <p>Ship faster with secure, reliable CI/CD.</p>
          <a href="/actions">Explore GitHub Actions</a>
        </dd>
        <dt><button aria-expanded="false">Code instantly from anywhere</button></dt>
        <dd hidden>
          <p>Start coding in seconds.</p>
        </dd>
      </dl>
    `),
    [
      "definition list 3 items",
      "Automate everything, term, (1 of 3), 1 of 3",
      "Automate everything, expanded, button, group",
      "end of, Automate everything, term, (1 of 3)",
      "Ship faster with secure, reliable CI/CD., 2 of 3",
      "link, Explore GitHub Actions",
      "Code instantly from anywhere, term, (3 of 3), 3 of 3",
      "Code instantly from anywhere, collapsed, button, group",
      "end of, Code instantly from anywhere, term, (3 of 3)",
      "end of definition list",
    ],
  );
});

test("scanSubtree uses abbr title names for table cell support buttons", () => {
  assert.deepEqual(
    scanHtml(`
      <table>
        <thead>
          <tr><th>Feature</th><th>Chrome</th></tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">accept</th>
            <td>
              <button type="button" aria-expanded="false">
                <abbr title="Chrome – Full support">
                  <span>Chrome – Full support</span>
                </abbr>
                <span>Chrome 1</span>
                <abbr title="See implementation notes.">footnote</abbr>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    `),
    [
      "table, 2 columns, 2 rows",
      "Feature, column 1 of 2",
      "Chrome, column 2 of 2",
      "row 2 of 2 Feature accept, column 1 of 2",
      "Chrome – Full support 1 footnote, collapsed, button, group, column 2 of 2",
      "end of table",
    ],
  );
});

test("scanSubtree includes grouped table headers in first-column row header context", () => {
  assert.deepEqual(
    scanHtml(`
      <table>
        <thead>
          <tr>
            <th>&nbsp;</th>
            <th>Product A</th>
            <th>Product B</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Monthly Plan</th>
            <td>£6 a month</td>
            <td>£14 a month</td>
          </tr>
        </tbody>
        <thead data-table-group-header="true">
          <tr>
            <th>
              <button id="picture-heading" aria-controls="picture-content" aria-expanded="true">
                Picture
              </button>
            </th>
          </tr>
        </thead>
        <tbody id="picture-content" role="region" aria-labelledby="picture-heading">
          <tr>
            <th>4k display</th>
            <td>Ignored group content A</td>
            <td>Ignored group content B</td>
          </tr>
        </tbody>
        <thead data-table-group-header="true">
          <tr>
            <th>
              <button id="sound-heading" aria-controls="sound-content" aria-expanded="true">
                Sound
              </button>
            </th>
          </tr>
        </thead>
        <tbody id="sound-content" role="region" aria-labelledby="sound-heading">
          <tr>
            <th>Speakers</th>
            <td>Ignored group content C</td>
            <td>Ignored group content D</td>
          </tr>
        </tbody>
        <thead data-table-group-header="true">
          <tr>
            <th>
              <button id="hardware-heading" aria-controls="hardware-content" aria-expanded="true">
                Hardware
              </button>
            </th>
          </tr>
        </thead>
        <tbody id="hardware-content" role="region" aria-labelledby="hardware-heading">
          <tr>
            <th>Ports</th>
            <td>Ignored group content E</td>
            <td>Ignored group content F</td>
          </tr>
        </tbody>
      </table>
    `),
    [
      "table, 3 columns, 5 rows",
      "blank, column 1 of 3",
      "Product A, column 2 of 3",
      "Product B, column 3 of 3",
      "row 2 of 5 Monthly Plan, Picture, Sound, and Hardware Monthly Plan, column 1 of 3",
      "Product A £6 a month, column 2 of 3",
      "Product B £14 a month, column 3 of 3",
      "row 3 of 5 Picture, Sound, and Hardware Picture, expanded, button, group, column 1 of 3",
      "row 4 of 5 Sound, expanded, button, group, column 1 of 3",
      "row 5 of 5 Hardware, expanded, button, group, column 1 of 3",
      "end of table",
    ],
  );
});

test("scanSubtree splits complex table column headers into group and child text stops", () => {
  assert.deepEqual(
    scanHtml(`
      <table>
        <thead>
          <tr>
            <th>&nbsp;</th>
            <th><div><img alt=""><span>Product A</span><div><span>The practical choice</span></div><div><span>Black</span><span></span><span>Blue</span><span></span><span>White</span><span></span></div></div></th>
            <th><div><img alt=""><span>Product B</span><div><span>The premium choice</span></div><div><span>Grey</span><span></span><span>Silver</span><span></span><span>Green</span><span></span></div></div></th>
          </tr>
        </thead>
      </table>
    `),
    [
      "table, 3 columns, 1 row",
      "column header, column 1, row 1",
      "Product A, The practical choice, Black, Blue, and White Product A, column 2 of 3",
      "The practical choice",
      "Black",
      "Blue",
      "White",
      "Product B, The premium choice, Grey, Silver, and Green Product B, column 3 of 3",
      "The premium choice",
      "Grey",
      "Silver",
      "Green",
      "end of table",
    ],
  );
});

test("scanSubtree splits data cells with complex product column headers", () => {
  assert.deepEqual(
    scanHtml(`
      <table>
        <thead>
          <tr>
            <th>&nbsp;</th>
            <th>
              <div>
                <span>Sky Glass Air</span>
                <span>Available in</span>
                <span>Carbon Grey</span><span>Sea Green</span><span>Cotton White</span>
                <span>43", 55", 65"</span>
                <span>TV Starting from</span>
                <span>£6 a month</span>
                <span>Over a 48-month loan.</span>
                <a href="/learn">Learn more</a>
                <a href="/buy">Buy Now</a>
              </div>
            </th>
            <th>
              <div>
                <span>Sky Glass Gen 2</span>
                <span>Available in</span>
                <span>Volcanic Grey</span><span>Atlantic Blue</span><span>Arctic Silver</span>
                <span>43", 55", 65"</span>
                <span>TV Starting from</span>
                <span>£14 a month</span>
                <span>Over a 48-month loan.</span>
                <a href="/learn-gen2">Learn More</a>
                <a href="/buy-gen2">Buy Now</a>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Quantum Dot Display</th>
            <td>Quantum Dot Display</td>
            <td>Quantum Dot Display</td>
          </tr>
        </tbody>
      </table>
    `),
    [
      "table, 3 columns, 2 rows",
      "blank, column 1 of 3",
      "Sky Glass Air, Available in, Carbon Grey, Sea Green, Cotton White, 43\", 55\", 65\", TV Starting from, Learn more, and Buy Now Sky Glass Air, column 2 of 3",
      "Available in",
      "Carbon GreySea GreenCotton White",
      "43\", 55\", 65\"",
      "TV Starting from",
      "£6 a month",
      "Over a 48-month loan.",
      "link, Learn more",
      "link, Buy Now",
      "Sky Glass Gen 2, Available in, Volcanic Grey, Atlantic Blue, Arctic Silver, 43\", 55\", 65\", TV Starting from, Learn More, and Buy Now Sky Glass Gen 2, column 3 of 3",
      "Available in",
      "Volcanic GreyAtlantic BlueArctic Silver",
      "43\", 55\", 65\"",
      "TV Starting from",
      "£14 a month",
      "Over a 48-month loan.",
      "link, Learn More",
      "link, Buy Now",
      "row 2 of 2 Quantum Dot Display Quantum Dot Display, column 1 of 3",
      "Sky Glass Air, Available in, Carbon Grey, Sea Green, Cotton White, 43\", 55\", 65\", TV Starting from, Learn more, and Buy Now group, column 2 of 3",
      "Quantum Dot Display",
      "Sky Glass Gen 2, Available in, Volcanic Grey, Atlantic Blue, Arctic Silver, 43\", 55\", 65\", TV Starting from, Learn More, and Buy Now group, column 3 of 3",
      "Quantum Dot Display",
      "end of table",
    ],
  );
});

test("scanSubtree splits described autocomplete search inputs", () => {
  assert.deepEqual(
    scanHtml(`
      <form role="search">
        <label for="site-search">Search</label>
        <input
          id="site-search"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="false"
          aria-controls="site-search-listbox"
          aria-describedby="site-search-hint"
        >
        <span id="site-search-hint" style="display: none">When search suggestions are available use up and down arrows to review.</span>
        <button type="submit">Search GOV.UK</button>
      </form>
    `),
    [
      "search",
      "Search",
      "group",
      "Search When search suggestions are available use up and down arrows to review.",
      "Search GOV.UK, button",
      "end of, search",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <form role="search">
        <label for="nhs-search">Search the NHS website</label>
        <input
          id="nhs-search"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="false"
          aria-owns="nhs-search-listbox"
          aria-describedby="nhs-search-hint"
        >
        <span id="nhs-search-hint" style="display: none">When autocomplete results are available use up and down arrows to review.</span>
        <button type="submit"><svg aria-hidden="true"></svg><span>Search</span></button>
      </form>
    `),
    [
      "search",
      "Search the NHS website",
      "Search the NHS website When autocomplete results are available use up and down arrows to review.",
      "Search, button, group",
      "end of, search",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <form role="search">
        <input
          type="text"
          role="combobox"
          placeholder="Enter a city"
          aria-description="Enter a city"
          aria-autocomplete="list"
          aria-expanded="false"
          aria-owns="location-list"
        >
        <button type="submit"><span>Search</span><svg aria-hidden="true"></svg></button>
      </form>
    `),
    [
      "search",
      "Enter a city, list box pop up collapsed, combo box",
      "Search, button",
      "end of, search",
    ],
  );
});

test("scanSubtree splits native search label stops and popup listbox boundaries", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <h1>Search label stop</h1>
        <form role="search">
          <label for="video-search">Search videos</label>
          <input
            id="video-search"
            type="search"
            placeholder="Search"
            aria-autocomplete="list"
            aria-controls="video-suggestions"
            aria-expanded="true"
          >
          <button type="submit" aria-label="Search">Search</button>
        </form>
        <div id="video-suggestions" role="listbox">
          <div role="option">VoiceOver tutorial</div>
          <div role="option">Screen reader basics</div>
        </div>
      </main>
    `),
    [
      "main",
      "heading level 1, Search label stop",
      "search",
      "Search videos",
      "Search videos Search, search text field",
      "Search, button",
      "end of, search",
      "list box",
      "end of, main",
    ],
  );
});

test("scanSubtree splits labelled header search comboboxes with both autocomplete", () => {
  assert.deepEqual(
    scanHtml(`
      <header>
        <a href="/">GOV.UK Design System</a>
        <div>
          <label for="site-search">Search Design system</label>
          <input
            id="site-search"
            type="text"
            role="combobox"
            aria-autocomplete="both"
            aria-expanded="false"
            aria-controls="site-search-listbox"
            aria-describedby="site-search-hint"
          >
          <ul id="site-search-listbox" role="listbox" style="display: none"></ul>
          <span id="site-search-hint" style="display: none">When autocomplete results are available use up and down arrows to review and enter to select.</span>
        </div>
      </header>
    `),
    [
      "banner",
      "link, GOV.UK Design System",
      "Search Design system",
      "Search Design system When autocomplete results are available use up and down arrows to review and enter to select.",
      "end of, banner",
    ],
  );
});

test("scanSubtree announces required state for list autocomplete combobox inputs", () => {
  assert.deepEqual(
    scanHtml(`
      <form>
        <button type="submit" aria-label="Submit"></button>
        <input
          type="text"
          name="term"
          required
          aria-autocomplete="list"
          aria-expanded="false"
          role="combobox"
          aria-controls="suggestions"
          tabindex="0"
          id="faq-search-bar"
        >
        <ul id="suggestions" role="listbox" aria-hidden="true" aria-labelledby="faq-search-bar"></ul>
      </form>
    `),
    [
      "Submit, button",
      "required list box pop up collapsed, combo box",
    ],
  );
});

test("scanSubtree announces compact labelled input action groups before the input", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <div>
          <label for="address-postcode-input" aria-label="Enter your postcode">
            Enter your postcode
          </label>
          <div>
            <input
              id="address-postcode-input"
              type="text"
              placeholder="Enter your postcode"
              aria-label="Enter your postcode"
            >
            <button type="button">Get Started</button>
          </div>
        </div>
      </section>
    `),
    [
      "Enter your postcode, group",
      "Enter your postcode",
      "end of, Enter your postcode, group",
      "Enter your postcode, edit text",
      "Get Started, button",
    ],
  );
});

test("scanSubtree does not compact autocomplete search input action groups", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <form role="search">
          <div>
            <label for="search-main">Search</label>
            <div>
              <input
                id="search-main"
                type="search"
                role="combobox"
                aria-expanded="false"
                aria-controls="search-main__listbox"
                aria-autocomplete="list"
                aria-describedby="search-main__assistiveHint"
              >
              <ul id="search-main__listbox" role="listbox" hidden></ul>
              <span id="search-main__assistiveHint" hidden>
                When search suggestions are available use up and down arrows.
              </span>
            </div>
            <button type="submit">Search GOV.UK</button>
          </div>
        </form>
      </main>
    `),
    [
      "main",
      "search",
      "Search",
      "group",
      "Search When search suggestions are available use up and down arrows.",
      "Search GOV.UK, button",
      "end of, search",
      "end of, main",
    ],
  );
});

test("scanSubtree includes expanded accordion region body text inside list items", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>Frequently Asked Questions</h2>
        <ul>
          <li>
            <h3>
              <button id="faq-0-heading" aria-controls="faq-0-content" aria-expanded="true">
                What is One Touch Switch for Broadband?
              </button>
            </h3>
            <div id="faq-0-content" aria-labelledby="faq-0-heading" aria-hidden="false" role="region">
              <div>
                <div>
                  <span>One Touch Switch means it is easier to switch broadband provider.</span>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </section>
    `),
    [
      "heading level 2, Frequently Asked Questions",
      "list 1 item",
      "heading level 3, What is One Touch Switch for Broadband?, expanded, button, group",
      "What is One Touch Switch for Broadband?, region",
      "One Touch Switch means it is easier to switch broadband provider.",
      "end of, What is One Touch Switch for Broadband?, region",
      "end of list",
    ],
  );
});

test("scanSubtree suppresses closed native details body descendants", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Reference">
        <ol>
          <li><a href="/overview">Overview</a></li>
          <li>
            <details>
              <summary><a href="/guides">Guides</a></summary>
              <ol>
                <li><a href="/guides/one">Hidden guide</a></li>
                <li><button>Hidden action</button></li>
              </ol>
            </details>
          </li>
          <li><a href="/attributes">Attributes</a></li>
        </ol>
      </nav>
    `),
    [
      "Reference, navigation",
      "list 3 items",
      "link, Overview, 1 of 3",
      "Guides, collapsed, disclosure triangle, group, 2 of 3",
      "link, Attributes, 3 of 3",
      "end of list",
      "end of, Reference, navigation",
    ],
  );
});

test("scanSubtree traverses open native details body descendants", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Reference">
        <ol>
          <li>
            <details open>
              <summary><a href="/attributes">Attributes</a></summary>
              <ol>
                <li><a href="/attributes/accept">accept</a></li>
                <li><a href="/attributes/capture">capture</a></li>
              </ol>
            </details>
          </li>
        </ol>
      </nav>
    `),
    [
      "Reference, navigation",
      "list 1 item",
      "Attributes, expanded, disclosure triangle, group",
      "list 2 items, level 2 1 of 1",
      "link, accept, 1 of 2",
      "link, capture, 2 of 2",
      "end of list",
      "end of list",
      "end of, Reference, navigation",
    ],
  );
});

test("scanSubtree announces native details summaries with text labels as disclosure groups", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Reference">
        <ol>
          <li><a href="/overview">Overview</a></li>
          <li>
            <details>
              <summary><span>Attribute values</span></summary>
              <ol>
                <li><a href="/attributes/rel">Hidden rel</a></li>
              </ol>
            </details>
          </li>
        </ol>
      </nav>
    `),
    [
      "Reference, navigation",
      "list 2 items",
      "link, Overview, 1 of 2",
      "Attribute values, collapsed, disclosure triangle, group, 2 of 2",
      "end of list",
      "end of, Reference, navigation",
    ],
  );
});

test("scanSubtree splits text-link-text runs inside expanded accordion regions", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>Frequently Asked Questions</h2>
        <ul>
          <li>
            <h3>
              <button id="faq-1-heading" aria-controls="faq-1-content" aria-expanded="true">
                Which packages are available?
              </button>
            </h3>
            <div id="faq-1-content" aria-labelledby="faq-1-heading" aria-hidden="false" role="region">
              <div>
                <div>
                  Use our <a href="/checker">postcode checker</a> to see available packages.
                </div>
              </div>
            </div>
          </li>
        </ul>
      </section>
    `),
    [
      "heading level 2, Frequently Asked Questions",
      "list 1 item",
      "heading level 3, Which packages are available?, expanded, button, group",
      "Which packages are available?, region",
      "Use our",
      "link, postcode checker",
      "to see available packages.",
      "end of, Which packages are available?, region",
      "end of list",
    ],
  );
});

test("scanSubtree splits emphasized rich text inside expanded accordion regions", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>Frequently Asked Questions</h2>
        <ul>
          <li>
            <h3>
              <button id="faq-2-heading" aria-controls="faq-2-content" aria-expanded="true">
                What do the options mean?
              </button>
            </h3>
            <div id="faq-2-content" aria-labelledby="faq-2-heading" aria-hidden="false" role="region">
              <div>
                <strong>First option</strong>, also known as option one. <br><br>
                More detail follows. <br><br>
                <strong>Second option</strong>, also known as option two to the<br>customer.
              </div>
            </div>
          </li>
        </ul>
      </section>
    `),
    [
      "heading level 2, Frequently Asked Questions",
      "list 1 item",
      "heading level 3, What do the options mean?, expanded, button, group",
      "What do the options mean?, region",
      "First option",
      ", also known as option one.More detail follows.",
      "Second option",
      ", also known as option two to thecustomer.",
      "end of, What do the options mean?, region",
      "end of list",
    ],
  );
});

test("scanSubtree traverses declarative shadow root controls", () => {
  assert.deepEqual(
    scanHtml(`
      <custom-appearance>
        <template shadowrootmode="open">
          <button type="button" aria-haspopup="menu" aria-label="Appearance: Light theme"></button>
        </template>
      </custom-appearance>
      <custom-language>
        <template shadowrootmode="open">
          <button type="button" aria-haspopup="menu">Language</button>
        </template>
      </custom-language>
    `),
    [
      "group",
      "Appearance: Light theme, menu pop up, button",
      "group",
      "Language, menu pop up, button",
    ],
  );
});

test("scanSubtree skips anonymous custom structural hosts around native controls", () => {
  assert.deepEqual(
    scanHtml(`
      <custom-placement>
        <template shadowrootmode="open">
          <div>
            <a href="/sponsor">Mozilla Foundation Give Now</a>
            <custom-placement-note>
              <template shadowrootmode="open">
                <a href="/ads">AD</a>
              </template>
            </custom-placement-note>
          </div>
        </template>
      </custom-placement>
      <nav>
        <custom-search-button>
          <template shadowrootmode="open">
            <button type="button" title="Search the site"></button>
          </template>
        </custom-search-button>
      </nav>
      <custom-theme>
        <template shadowrootmode="open">
          <custom-dropdown>
            <template shadowrootmode="open">
              <slot name="button"></slot>
              <slot name="dropdown" hidden></slot>
            </template>
            <button slot="button" type="button" aria-expanded="false" aria-controls="theme-menu">Switch color theme</button>
            <div slot="dropdown" id="theme-menu" hidden>
              <button type="button">Dark</button>
            </div>
          </custom-dropdown>
        </template>
      </custom-theme>
    `),
    [
      "link, Mozilla Foundation Give Now",
      "link, AD",
      "navigation",
      "Search the site, button, group",
      "end of, navigation",
      "Switch color theme, collapsed, button",
    ],
  );
});

test("scanSubtree adds AX-confirmed trailing group after single shadow button wrappers", () => {
  assert.deepEqual(
    scanHtml(
      `
        <div data-sr-dom-node-id="search-wrapper">
          <custom-homepage-search>
            <template shadowrootmode="open">
              <button type="button" title="Search the site">Search</button>
            </template>
          </custom-homepage-search>
        </div>
        <custom-placement>
          <template shadowrootmode="open">
            <div>
              <section>
                <a href="/sponsor"><img alt="Sponsor banner"></a>
                <custom-placement-note>
                  <template shadowrootmode="open">
                    <a href="/ads">AD</a>
                  </template>
                </custom-placement-note>
              </section>
            </div>
          </template>
        </custom-placement>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "wrapper",
              role: "generic",
              name: "",
              domNodeId: "search-wrapper",
              childIds: ["button"],
            },
            { nodeId: "button", role: "button", name: "Search" },
          ],
        },
      },
    ),
    [
      "Search, button",
      "group",
      "link, image, Sponsor banner",
      "link, AD",
    ],
  );
});

test("scanSubtree skips anonymous custom player wrappers around named CTA groups", () => {
  assert.deepEqual(
    scanHtml(`
      <section aria-labelledby="forecast-heading">
        <h2 id="forecast-heading">Forecast for North America</h2>
        <h3>Latest forecast for North America</h3>
        <forecast-player>
          <template shadowrootmode="open">
            <player-shell>
              <template shadowrootmode="open">
                <div>
                  <player-layout>
                    <template shadowrootmode="open">
                      <forecast-cta title="Play Latest forecast for North America">
                        <template shadowrootmode="open">
                          <button type="button" aria-label="Play Latest forecast for North America">
                            <svg aria-hidden="true"></svg>
                          </button>
                          <time datetime="PT1M25S">01:25</time>
                        </template>
                      </forecast-cta>
                    </template>
                  </player-layout>
                </div>
              </template>
            </player-shell>
          </template>
        </forecast-player>
        <ul>
          <li><span>Last updated</span> <span>5 hours ago</span></li>
        </ul>
      </section>
    `),
    [
      "Forecast for North America, region",
      "heading level 2, Forecast for North America",
      "heading level 3, Latest forecast for North America",
      "Play Latest forecast for North America, group",
      "Play Latest forecast for North America, button",
      "01:25",
      "end of, Play Latest forecast for North America, group",
      "list 1 item",
      "Last updated",
      "5 hours ago",
      "end of list",
      "end of, Forecast for North America, region",
    ],
  );
});

test("scanSubtree traverses serialized semantic light-DOM controls for named shadow slots", () => {
  assert.deepEqual(
    scanHtml(`
      <nav>
        <custom-dropdown>
          <template shadowrootmode="open">
            <slot name="button"></slot>
            <slot name="dropdown" hidden></slot>
          </template>
          <button type="button" aria-expanded="false" aria-controls="products-menu">
            Products
          </button>
          <div id="products-menu">
            <a href="/alpha">Alpha</a>
          </div>
        </custom-dropdown>
      </nav>
    `),
    [
      "navigation",
      "Products, collapsed, button",
      "end of, navigation",
    ],
  );
});

test("scanSubtree coalesces tokenized pre code into logical lines", () => {
  assert.deepEqual(
    scanHtml(`
      <pre><code><span><span>&lt;</span>input</span>
  <span>type</span><span>=</span><span>"file"</span>
  <span>id</span><span>=</span><span>"docpicker"</span>
  <span>accept</span><span>=</span><span>".doc,.docx,application/msword"</span> <span>/&gt;</span>
</code></pre>
    `),
    [
      "<input",
      'type="file"',
      'id="docpicker"',
      'accept=".doc,.docx,application/msword" />',
    ],
  );
});

test("scanSubtree preserves code example language and slotted copy controls", () => {
  assert.deepEqual(
    scanHtml(`
      <code-example>
        <template shadowrootmode="open">
          <div class="code-example">
            <div class="example-header">
              <span class="language-name">html</span>
              <copy-button>
                <template shadowrootmode="open">
                  <x-button>
                    <template shadowrootmode="open">
                      <button aria-labelledby="copy-label">
                        <span id="copy-label"><slot></slot></span>
                      </button>
                    </template>
                    Copy
                  </x-button>
                </template>
              </copy-button>
            </div>
            <pre><code><span class="token tag"><span class="token punctuation">&lt;</span>input</span></code></pre>
          </div>
        </template>
      </code-example>
    `),
    ["HTML", "Copy, button", "<input"],
  );
});

test("scanSubtree normalizes complete one-line tokenized HTML tag fragments", () => {
  assert.deepEqual(
    scanHtml(`
      <pre><code><span class="token tag"><span class="token punctuation">&lt;</span>input</span> <span class="token attr-name">type</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>file<span class="token punctuation">"</span></span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>soundFile<span class="token punctuation">"</span></span> <span class="token attr-name">accept</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>audio/*<span class="token punctuation">"</span></span> <span class="token punctuation">/&gt;</span>
<span class="token tag"><span class="token punctuation">&lt;</span>input</span> <span class="token attr-name">type</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>file<span class="token punctuation">"</span></span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>videoFile<span class="token punctuation">"</span></span> <span class="token attr-name">accept</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>video/*<span class="token punctuation">"</span></span> <span class="token punctuation">/&gt;</span></code></pre>
    `),
    [
      "input",
      "type",
      "file",
      "soundFile",
      "accept",
      "audio/*",
      "input",
      "type",
      "file",
      "videoFile",
      "accept",
      "video/*",
    ],
  );
});

test("scanSubtree preserves standalone tokenized HTML tag lines", () => {
  assert.deepEqual(
    scanHtml(`
      <pre><code><span class="token tag"><span class="token punctuation">&lt;</span>input</span> <span class="token attr-name">type</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>file<span class="token punctuation">"</span></span> <span class="token attr-name">accept</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>image/*,.pdf<span class="token punctuation">"</span></span> <span class="token punctuation">/&gt;</span></code></pre>
    `),
    ['<input type="file" accept="image/*.pdf" />'],
  );
});

test("scanSubtree tokenizes mixed HTML form examples without tag punctuation", () => {
  assert.deepEqual(
    scanHtml(`
      <pre><code><span class="token tag"><span class="token punctuation">&lt;</span>p<span class="token punctuation">&gt;</span></span>
  <span class="token tag"><span class="token punctuation">&lt;</span>label</span> <span class="token attr-name">for</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>soundFile<span class="token punctuation">"</span></span><span class="token punctuation">&gt;</span>Select an audio file:<span class="token tag"><span class="token punctuation">&lt;/</span>label<span class="token punctuation">&gt;</span></span>
  <span class="token tag"><span class="token punctuation">&lt;</span>input</span> <span class="token attr-name">type</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>file<span class="token punctuation">"</span></span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>soundFile<span class="token punctuation">"</span></span> <span class="token attr-name">accept</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>audio/*<span class="token punctuation">"</span></span> <span class="token punctuation">/&gt;</span>
<span class="token tag"><span class="token punctuation">&lt;/</span>p<span class="token punctuation">&gt;</span></span></code></pre>
    `),
    [
      "label",
      "for",
      "soundFile",
      "Select an audio file:",
      "label",
      "input",
      "type",
      "file",
      "soundFile",
      "accept",
      "audio/*",
    ],
  );
});

test("scanSubtree tokenizes form and button example labels", () => {
  assert.deepEqual(
    scanHtml(`
      <pre><code><span class="token tag"><span class="token punctuation">&lt;</span>form</span> <span class="token attr-name">method</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>post<span class="token punctuation">"</span></span> <span class="token attr-name">enctype</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>multipart/form-data<span class="token punctuation">"</span></span><span class="token punctuation">&gt;</span>
  <span class="token tag"><span class="token punctuation">&lt;</span>div<span class="token punctuation">&gt;</span></span>
    <span class="token tag"><span class="token punctuation">&lt;</span>label</span> <span class="token attr-name">for</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>profile_pic<span class="token punctuation">"</span></span><span class="token punctuation">&gt;</span>Choose file to upload<span class="token tag"><span class="token punctuation">&lt;/</span>label<span class="token punctuation">&gt;</span></span>
    <span class="token tag"><span class="token punctuation">&lt;</span>input</span>
      <span class="token attr-name">type</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>file<span class="token punctuation">"</span></span>
      <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>profile_pic<span class="token punctuation">"</span></span>
      <span class="token attr-name">name</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>profile_pic<span class="token punctuation">"</span></span>
      <span class="token attr-name">accept</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>.jpg,.jpeg,.png<span class="token punctuation">"</span></span> <span class="token punctuation">/&gt;</span>
  <span class="token tag"><span class="token punctuation">&lt;/</span>div<span class="token punctuation">&gt;</span></span>
  <span class="token tag"><span class="token punctuation">&lt;</span>div<span class="token punctuation">&gt;</span></span>
    <span class="token tag"><span class="token punctuation">&lt;</span>button<span class="token punctuation">&gt;</span></span>Submit<span class="token tag"><span class="token punctuation">&lt;/</span>button<span class="token punctuation">&gt;</span></span>
  <span class="token tag"><span class="token punctuation">&lt;/</span>div<span class="token punctuation">&gt;</span></span>
<span class="token tag"><span class="token punctuation">&lt;/</span>form<span class="token punctuation">&gt;</span></span></code></pre>
    `),
    [
      "form",
      "method",
      "post",
      "enctype",
      "multipart/form-data",
      "label",
      "for",
      "profile_pic",
      "Choose file to upload",
      "label",
      "input",
      "type",
      "file",
      "profile_pic",
      "name",
      "profile_pic",
      "accept",
      "jpg, jpeg, png",
      "button",
      "Submit",
      "button",
      "form",
    ],
  );
});

test("scanSubtree announces CodeMirror contenteditable textboxes as text entry areas", () => {
  assert.deepEqual(
    scanHtml(`
      <div role="tabpanel" aria-label="HTML">
        <div
          contenteditable="true"
          class="cm-content cm-lineWrapping"
          role="textbox"
          aria-multiline="true"
        >
          <div class="cm-line"><span>&lt;</span><span>label</span> for=<span>"movie"</span><span>&gt;</span>Choose a movie:</div>
          <div class="cm-line"><br></div>
          <div class="cm-line">&lt;<span>input</span> type=<span>"file"</span> id=<span>"movie"</span> accept=<span>"video/*"</span> &gt;</div>
        </div>
      </div>
    `),
    [
      "HTML, tab panel",
      'text entry area <label for="movie">Choose a movie: <input type="file" id="movie" accept="video/*" >,',
      "end of, HTML, tab panel",
    ],
  );
});

test("scanSubtree includes leading unnamed tab panel images", () => {
  assert.deepEqual(
    scanHtml(`
      <section aria-label="Product tabs">
        <div role="tablist" aria-label="Build primitives">
          <button id="tab-compute" role="tab" aria-selected="true" aria-controls="panel-compute">Compute</button>
          <button id="tab-ai" role="tab" aria-selected="false" aria-controls="panel-ai">AI</button>
        </div>
        <div id="panel-compute" role="tabpanel" aria-labelledby="tab-compute">
          <svg role="img" aria-label="" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"></circle></svg>
          <h3>Deploy with one command</h3>
        </div>
      </section>
    `),
    [
      "Product tabs, region",
      "Build primitives, tab group",
      "Compute, selected, tab, 1 of 2",
      "AI, tab, 2 of 2",
      "end of, Build primitives, tab group",
      "Compute, tab panel",
      "image",
      "heading level 3, Deploy with one command",
      "end of, Compute, tab panel",
      "end of, Product tabs, region",
    ],
  );
});

test("scanSubtree composes declarative shadow slots with host light DOM children", () => {
  assert.deepEqual(
    scanHtml(`
      <x-carousel>
        <template shadowrootmode="open">
          <ul>
            <slot></slot>
          </ul>
        </template>
        <x-slide>
          <template shadowrootmode="open">
            <li><h1>First offer</h1><a href="/first">See first</a></li>
          </template>
        </x-slide>
        <x-slide>
          <template shadowrootmode="open">
            <li><h1>Second offer</h1><a href="/second">See second</a></li>
          </template>
        </x-slide>
      </x-carousel>
    `),
    [
      "group",
      "list",
      "group",
      "heading level 1, First offer",
      "link, See first",
      "group",
      "heading level 1, Second offer",
      "link, See second",
      "end of list",
    ],
  );
});

test("scanSubtree flattens slotted carousel slide stops into list positions", () => {
  assert.deepEqual(
    scanHtml(`
      <x-carousel>
        <template shadowrootmode="open">
          <x-carousel-base>
            <template shadowrootmode="open">
              <ul class="carousel is-set">
                <slot></slot>
              </ul>
              <div class="carousel-navigation carousel-navigation-previous">
                <lightning-button>
                  <template shadowrootmode="open">
                    <button type="button"></button>
                  </template>
                </lightning-button>
              </div>
              <div class="carousel-navigation">
                <lightning-button>
                  <template shadowrootmode="open">
                    <button type="button"></button>
                  </template>
                </lightning-button>
              </div>
              <ul class="carousel-paginator">
                <li><a href=""><span></span></a></li>
                <li><a href=""><span></span></a></li>
              </ul>
            </template>
            <x-slide class="slds-carousel__panel">
              <template shadowrootmode="open">
                <section>
                  <h1>First offer</h1>
                  <div>First offer copy</div>
                  <a href="/first">See first</a>
                  <a href="/secondary-first">Call me back</a>
                  <img alt="image">
                </section>
              </template>
            </x-slide>
            <x-slide class="slds-carousel__panel">
              <template shadowrootmode="open">
                <section>
                  <h1>Second offer</h1>
                  <div>Second offer copy</div>
                  <a href="/second">See second</a>
                </section>
              </template>
            </x-slide>
          </x-carousel-base>
        </template>
      </x-carousel>
    `),
    [
      "list 7 items",
      "heading level 1, First offer, (1 of 7), 1 of 7",
      "First offer copy, 2 of 7",
      "link, See first, 3 of 7",
      "link, Call me back",
      "image. To get missing image descriptions, open the context menu., Unlabeled image, 4 of 7",
      "heading level 1, Second offer, (5 of 7), 5 of 7",
      "Second offer copy, 6 of 7",
      "link, See second, 7 of 7",
      "end of list",
      "button",
      "button",
      "list 2 items",
      "link s, 1 of 2",
      "link s, 2 of 2",
      "end of list",
    ],
  );
});

test("scanSubtree treats labelled custom element shadow controls as a group", () => {
  assert.deepEqual(
    scanHtml(`
      <custom-language aria-label="Select your language preference.">
        <template shadowrootmode="open">
          <button type="button" aria-haspopup="menu">Language</button>
        </template>
      </custom-language>
    `),
    [
      "Select your language preference., group",
      "Language, menu pop up, button",
      "end of, Select your language preference., group",
    ],
  );
});

test("scanSubtree skips anonymous Lightning structural wrapper groups", () => {
  assert.deepEqual(
    scanHtml(`
      <c-bos-tiles>
        <template shadowrootmode="open">
          <section>
            <h3>Why Sky Business broadband?</h3>
            <h4>Full Fibre speeds up to 900Mbps</h4>
            <p>A choice of speeds available on all packs.</p>
            <lightning-button>
              <template shadowrootmode="open">
                <button type="button">Discover Full Fibre</button>
              </template>
            </lightning-button>
          </section>
        </template>
      </c-bos-tiles>
    `),
    [
      "heading level 3, Why Sky Business broadband?",
      "heading level 4, Full Fibre speeds up to 900Mbps",
      "A choice of speeds available on all packs.",
      "Discover Full Fibre, button",
    ],
  );
});

test("scanSubtree scans visible controlled content when paired controllers disagree", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Local">
        <a href="/accessibility/">Accessibility</a>
        <a href="#menu-state" role="button" aria-controls="local-menu" aria-expanded="false" data-sr-computed-hidden="display:none">Local Nav Menu</a>
        <a href="#" role="button" aria-controls="local-menu" aria-expanded="true" data-sr-computed-hidden="display:none">Local Nav Menu</a>
        <div id="local-menu">
          <ul>
            <li><span role="link" aria-disabled="true" aria-current="page">Overview</span></li>
            <li><a href="/features/">Features</a></li>
          </ul>
        </div>
      </nav>
    `),
    [
      "Local, navigation",
      "link, Accessibility",
      "list 2 items",
      "dimmed current page, link, Overview, 1 of 2",
      "link, Features, 2 of 2",
      "end of list",
      "end of, Local, navigation",
    ],
  );
});

test("scanSubtree ignores false current state and keeps choice buttons ungrouped", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Breadcrumbs">
        <ol>
          <li><a href="/" aria-current="false">Home</a></li>
          <li><a href="/current" aria-current="page">Current</a></li>
        </ol>
      </nav>
    `),
    [
      "Breadcrumbs, navigation",
      "list 2 items",
      "link, Home, 1 of 2",
      "current page, link, Current, 2 of 2",
      "end of list",
      "end of, Breadcrumbs, navigation",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <fieldset>
        <legend>Speed</legend>
        <input type="radio" name="speed" id="speed-76" checked><label for="speed-76">76 Mb/s</label>
        <input type="radio" name="speed" id="speed-150"><label for="speed-150">150 Mb/s</label>
      </fieldset>
    `),
    [
      "76 Mb/s, selected, radio button, 1 of 2",
      "150 Mb/s, radio button, 2 of 2",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <ul>
        <li><button><svg aria-hidden="true"></svg>All</button></li>
        <li><button><svg aria-hidden="true"></svg>Streaming</button></li>
      </ul>
    `),
    [
      "list 2 items",
      "All, button, 1 of 2",
      "Streaming, button, 2 of 2",
      "end of list",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <ul>
        <li><button aria-label="Sky Stream"><img alt="" src="/stream.png"></button></li>
        <li><button aria-label="Netflix"><img alt="" src="/netflix.png"></button></li>
      </ul>
    `),
    [
      "list 2 items",
      "Sky Stream, button, 1 of 2",
      "Netflix, button, 2 of 2",
      "end of list",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <ul>
        <li><button aria-label="Sky Cinema"><img alt="Sky cinema logo" src="/cinema.png"></button></li>
      </ul>
    `),
    [
      "list 1 item",
      "Sky Cinema, button, group",
      "end of list",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <ul>
        <li>TV &amp; Broadband</li>
        <li>|</li>
        <li>TV</li>
      </ul>
    `),
    [
      "list 2 items",
      "TV & Broadband, 1 of 3",
      "TV, 3 of 3",
      "end of list",
    ],
  );
});

test("scanSubtree keeps trailing disclaimer buttons grouped", () => {
  assert.deepEqual(
    scanHtml(`
      <section aria-label="Deal">
        <p>New customers only.</p>
        <div><button>See all legals</button></div>
      </section>
    `),
    [
      "Deal, region",
      "New customers only.",
      "See all legals, button, group",
      "end of, Deal, region",
    ],
  );
});

test("scanSubtree infers first previous slide buttons as dimmed", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <div>
          <button aria-label="Previous slide"></button>
          <button aria-label="Next slide"></button>
        </div>
        <ul>
          <li tabindex="0"><a href="/one">One</a></li>
        </ul>
      </section>
    `),
    [
      "Previous slide, dimmed, button",
      "Next slide, button",
      "list 1 item",
      "link, One",
      "end of list",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <section aria-roledescription="carousel">
        <button aria-label="Previous slide: 4 of 4 - Mobile Insurance"></button>
        <button aria-label="Next slide: 2 of 4 - Accidental Damage"></button>
      </section>
    `),
    [
      "Previous slide: 4 of 4 - Mobile Insurance, button",
      "Next slide: 2 of 4 - Accidental Damage, button",
    ],
  );
});

test("scanSubtree skips unnamed carousel region wrappers", () => {
  assert.deepEqual(
    scanHtml(`
      <section role="region" aria-roledescription="Carousel">
        <span>Current slide, 1 of 5, undefined</span>
        <button aria-label="Previous slide: 5 of 5 - "></button>
        <button aria-label="Next slide: 2 of 5 - "></button>
      </section>
    `),
    [
      "Current slide, 1 of 5, undefined",
      "Previous slide: 5 of 5 -, button",
      "Next slide: 2 of 5 -, button",
    ],
  );
});

test("scanSubtree includes VoiceOver group stops for active carousel slides", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>Products</h2>
        <div role="region" aria-roledescription="carousel">
          <span>Current slide, 1 of 2, Home Insurance</span>
          <button aria-label="Previous slide: 2 of 2 - Mobile Insurance"></button>
          <button aria-label="Next slide: 2 of 2 - Mobile Insurance"></button>
          <div aria-live="polite">
            <div aria-hidden="false" role="group" tabindex="0">
              <div>
                <p>Home Insurance</p>
                <p>Cover for your home-sweet-home</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `),
    [
      "heading level 2, Products",
      "group",
      "Current slide, 1 of 2, Home Insurance",
      "Previous slide: 2 of 2 - Mobile Insurance, button",
      "Next slide: 2 of 2 - Mobile Insurance, button",
      "Home Insurance",
      "Cover for your home-sweet-home",
      "group",
      "group",
    ],
  );
});

test("scanSubtree keeps aria-controlled carousel navigation buttons ungrouped", () => {
  assert.deepEqual(
    scanHtml(`
      <section role="group" aria-label="Deals" aria-roledescription="carousel">
        <div id="carousel-items">
          <a href="/deal">Deal</a>
        </div>
        <button aria-label="Go forward to next set of carousel items" aria-controls="carousel-items">
          <svg aria-hidden="true"></svg>
        </button>
      </section>
    `),
    [
      "Deals, carousel",
      "link, Deal",
      "Go forward to next set of carousel items, button",
      "end of, Deals, carousel",
    ],
  );
});

test("scanSubtree does not add generic image group suffixes to toggle buttons", () => {
  assert.deepEqual(
    scanHtml(`
      <section aria-label="Stories">
        <button aria-pressed="true" aria-label="Resume customer story and logo rotation">
          <img alt="Resume customer story and logo rotation" src="/resume.svg">
        </button>
      </section>
    `),
    [
      "Stories, region",
      "Resume customer story and logo rotation, selected, toggle button",
      "end of, Stories, region",
    ],
  );
});

test("scanSubtree preserves carousel and slide roledescriptions with described controls", () => {
  assert.deepEqual(
    scanHtml(
      `
        <section aria-roledescription="carousel" aria-label="Promotional carousel" data-sr-dom-node-id="carousel">
          <div role="group" aria-roledescription="slide" aria-label="1 of 4" data-sr-dom-node-id="slide"></div>
          <div id="base-carousel-footer" aria-label="Choose slide to display" data-sr-dom-node-id="footer">
            <button aria-label="Previous slide" aria-describedby="base-carousel-footer" data-sr-dom-node-id="previous"></button>
            <button aria-label="Next slide" aria-describedby="base-carousel-footer" data-sr-dom-node-id="next"></button>
          </div>
        </section>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "carousel-ax",
              role: "region",
              name: "Promotional carousel",
              domNodeId: "carousel",
              properties: { roledescription: "carousel" },
            },
            {
              nodeId: "slide-ax",
              role: "group",
              name: "1 of 4",
              domNodeId: "slide",
              properties: { roledescription: "slide" },
            },
            {
              nodeId: "footer-ax",
              role: "generic",
              name: "Choose slide to display",
              domNodeId: "footer",
            },
            {
              nodeId: "previous-ax",
              role: "button",
              name: "Previous slide",
              description: "Choose slide to display",
              domNodeId: "previous",
              properties: { focusable: true },
            },
            {
              nodeId: "next-ax",
              role: "button",
              name: "Next slide",
              description: "Choose slide to display",
              domNodeId: "next",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "Promotional carousel, carousel",
      "1 of 4, slide",
      "end of, 1 of 4, slide",
      "Previous slide Choose slide to display, button",
      "Next slide Choose slide to display, button",
      "end of, Promotional carousel, carousel",
    ],
  );
});

test("scanSubtree suppresses leading groups for labelled info-card headings after hidden media", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <section aria-label="All you have to know before you fly">
          <picture>
            <source type="image/webp">
            <img alt="Before you fly" aria-hidden="true">
          </picture>
          <section>
            <div>
              <h3>Before you fly</h3>
              <p>Check baggage and entry requirements.</p>
            </div>
            <footer>
              <a href="/before-you-fly" aria-label="Plan your journey">
                <p>Plan your journey</p>
              </a>
            </footer>
          </section>
        </section>
      </main>
    `),
    [
      "main",
      "All you have to know before you fly, region",
      "heading level 3, Before you fly",
      "Check baggage and entry requirements.",
      "link, Plan your journey",
      "end of, All you have to know before you fly, region",
      "end of, main",
    ],
  );
});

test("scanSubtree keeps leading groups for labelled cards without hidden media", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <section aria-label="Help card">
          <section>
            <div>
              <h3>Need help</h3>
              <p>Contact the support team.</p>
            </div>
            <footer>
              <a href="/help" aria-label="Contact support">
                <p>Contact support</p>
              </a>
            </footer>
          </section>
        </section>
      </main>
    `),
    [
      "main",
      "Help card, region",
      "group",
      "heading level 3, Need help",
      "Contact the support team.",
      "link, Contact support",
      "end of, Help card, region",
      "end of, main",
    ],
  );
});

test("scanSubtree keeps aria-label-only decorative icon buttons ungrouped", () => {
  assert.deepEqual(
    scanHtml(`
      <button aria-label="Learn more about Magnifier">
        <span aria-hidden="true"><svg></svg></span>
      </button>
    `),
    ["Learn more about Magnifier, button"],
  );

  assert.deepEqual(
    scanHtml(`
      <x-toolbar-button>
        <span>
          <button aria-label="Guide">
            <span aria-hidden="true"><svg></svg></span>
          </button>
        </span>
      </x-toolbar-button>
    `),
    ["Guide, button"],
  );

  assert.deepEqual(
    scanHtml(`
      <x-toolbar-button>
        <button aria-label="Search"><x-empty-icon></x-empty-icon></button>
      </x-toolbar-button>
    `),
    ["Search, button"],
  );

  assert.deepEqual(
    scanHtml(`
      <uhf-search>
        <button aria-label="Search Microsoft.com">
          <span hidden>Search</span>
          <x-empty-icon><i></i></x-empty-icon>
        </button>
      </uhf-search>
    `),
    ["Search Microsoft.com, button, group"],
  );
});

test("scanSubtree groups AX-confirmed tabindex toolbar icon buttons", () => {
  const accessibilityTree = {
    nodes: [
      {
        role: "button",
        name: "Attach",
        domNodeId: "attach",
        properties: { focusable: true },
      },
      {
        role: "button",
        name: "Format text",
        domNodeId: "format",
        properties: { focusable: true },
      },
      {
        role: "button",
        name: "Emoji",
        domNodeId: "emoji",
        properties: { focusable: true },
      },
    ],
  };

  assert.deepEqual(
    scanHtml(
      `
        <div>
          <button tabindex="-1" aria-label="Attach" data-sr-dom-node-id="attach"><svg></svg></button>
          <button tabindex="-1" aria-label="Format text" data-sr-dom-node-id="format"><svg></svg></button>
          <button tabindex="-1" aria-label="Emoji" data-sr-dom-node-id="emoji"><svg></svg></button>
        </div>
      `,
      { accessibilityTree },
    ),
    ["Attach, button, group", "Format text, button, group", "Emoji, button, group"],
  );
});

test("scanSubtree emits standalone groups for clustered visual button shells", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <a href="#size-43">43 inch</a>
        <a href="#size-55">55 inch</a>
        <div>
          <div>
            <button aria-label="Colour - Carbon Grey"><span aria-hidden="true"></span></button>
            <div><span aria-hidden="true"></span></div>
          </div>
          <div>
            <button aria-label="Colour - Sea Green"><span aria-hidden="true"></span></button>
            <div><span aria-hidden="true"></span></div>
          </div>
          <div>
            <button aria-label="Colour - Cotton White"><span aria-hidden="true"></span></button>
            <div><span aria-hidden="true"></span></div>
          </div>
        </div>
        <button aria-label="Pause"><svg aria-hidden="true"></svg></button>
      </section>
    `),
    [
      "link, 43 inch",
      "link, 55 inch",
      "group",
      "group",
      "Colour - Carbon Grey, button",
      "group",
      "Colour - Sea Green, button",
      "group",
      "Colour - Cotton White, button",
      "group",
      "Pause, button",
    ],
  );
});

test("scanSubtree groups AX-confirmed focusable feedback panels", () => {
  const html = `
    <div tabindex="-1" data-sr-dom-node-id="feedback">
      <div>
        <h2 data-sr-dom-node-id="feedback-heading">Is this page useful?</h2>
        <ul data-sr-dom-node-id="feedback-list">
          <li hidden><a role="button" hidden href="/contact">Maybe</a></li>
          <li><button data-sr-dom-node-id="yes">Yes <span>this page is useful</span></button></li>
          <li><button data-sr-dom-node-id="no">No <span>this page is not useful</span></button></li>
        </ul>
      </div>
      <div role="alert" hidden>Thank you for your feedback</div>
      <div><button data-sr-dom-node-id="report">Report a problem with this page</button></div>
      <form hidden data-sr-computed-hidden="display:none"><button>Send</button></form>
    </div>
  `;

  assert.deepEqual(
    scanHtml(html, {
      accessibilityTree: {
        nodes: [
          {
            nodeId: "feedback-ax",
            role: "generic",
            name: "",
            domNodeId: "feedback",
            childIds: ["feedback-heading-ax", "feedback-list-ax", "report-ax"],
            properties: { focusable: true },
          },
          {
            nodeId: "feedback-heading-ax",
            role: "heading",
            name: "Is this page useful?",
            domNodeId: "feedback-heading",
            properties: { level: 2 },
          },
          {
            nodeId: "feedback-list-ax",
            role: "list",
            name: "",
            domNodeId: "feedback-list",
          },
          {
            nodeId: "yes-ax",
            role: "button",
            name: "Yes this page is useful",
            domNodeId: "yes",
            properties: { focusable: true },
          },
          {
            nodeId: "no-ax",
            role: "button",
            name: "No this page is not useful",
            domNodeId: "no",
            properties: { focusable: true },
          },
          {
            nodeId: "report-ax",
            role: "button",
            name: "Report a problem with this page",
            domNodeId: "report",
            properties: { focusable: true },
          },
        ],
      },
    }),
    [
      "Is this page useful? Yes this page is useful No this page is not useful Report a problem with this page, group",
    ],
  );

  assert.deepEqual(
    scanHtml(html),
    [
      "heading level 2, Is this page useful?",
      "list 2 items",
      "Yes this page is useful, button, 1 of 2",
      "No this page is not useful, button, 2 of 2",
      "end of list",
      "Report a problem with this page, button",
    ],
  );
});

test("scanSubtree preserves heading context inside linked promo cards", () => {
  assert.deepEqual(
    scanHtml(`
      <a href="/promo" aria-label="Ready for kick-off?. Shop now.">
        <h3>Ready for kick-off?</h3>
        <p>Shop now.</p>
      </a>
    `),
    ["link, heading level 3, Ready for kick-off?. Shop now."],
  );
});

test("scanSubtree preserves AX-confirmed aria-label names in linked headings", () => {
  assert.deepEqual(
    scanHtml(
      `
        <section>
          <h2 data-sr-dom-node-id="offers-heading" aria-label="Take your pick from  our best offers .">
            Take your pick from our best offers
          </h2>
          <h3 data-sr-dom-node-id="plain-heading">
            <a data-sr-dom-node-id="plain-link" href="/plain" aria-label="The British Airways Holidays Promise.">
              The British Airways Holidays Promise
            </a>
          </h3>
          <h3 data-sr-dom-node-id="offer-heading">
            <a data-sr-dom-node-id="offer-link" href="/offer" aria-label="Last-minute deals. From £79. Each-way, from London, Jul 2026">
              Last-minute deals
            </a>
          </h3>
          <h3 data-sr-dom-node-id="external-heading">
            <a data-sr-dom-node-id="external-link" href="/external" aria-label="Read more. Opens in a new window">
              Read more
            </a>
          </h3>
        </section>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "offers-heading-ax",
              ignored: false,
              role: "heading",
              name: "Take your pick from our best offers .",
              domNodeId: "offers-heading",
              childIds: ["offers-heading-text-1", "offers-heading-text-2"],
              properties: { level: 2 },
            },
            {
              nodeId: "offers-heading-text-1",
              ignored: false,
              role: "StaticText",
              name: "Take your pick from ",
            },
            {
              nodeId: "offers-heading-text-2",
              ignored: false,
              role: "StaticText",
              name: "our best offers",
            },
            {
              nodeId: "plain-ax",
              ignored: false,
              role: "link",
              name: "The British Airways Holidays Promise.",
              domNodeId: "plain-link",
            },
            {
              nodeId: "offer-heading-ax",
              ignored: false,
              role: "heading",
              name: "Last-minute deals. From £79. Each-way, from London, Jul 2026",
              domNodeId: "offer-heading",
              properties: { level: 3 },
            },
            {
              nodeId: "offer-ax",
              ignored: false,
              role: "link",
              name: "Last-minute deals. From £79. Each-way, from London, Jul 2026",
              domNodeId: "offer-link",
            },
            {
              nodeId: "external-heading-ax",
              ignored: false,
              role: "heading",
              name: "Read more. Opens in a new window",
              domNodeId: "external-heading",
              properties: { level: 3 },
            },
            {
              nodeId: "external-ax",
              ignored: false,
              role: "link",
              name: "Read more. Opens in a new window",
              domNodeId: "external-link",
            },
          ],
        },
      },
    ),
    [
      "heading level 2, Take your pick from our best offers ., 2 items",
      "heading level 3, level 2, link, The British Airways Holidays Promise.",
      "heading level 3, Last-minute deals. From £79. Each-way, from London, Jul 2026",
      "heading level 3, level 2, link, Read more",
    ],
  );
});

test("scanSubtree uses AX-confirmed aria-label heading names with visible fragment counts", () => {
  assert.deepEqual(
    scanHtml(
      `
        <section>
          <h2
            data-sr-dom-node-id="hero-heading"
            aria-label="Summer's sorted: Your Avios are worth 33% more on holidays Limited time offer."
          >
            <span>Summer's sorted: Your Avios are worth 33% more on holidays</span><span>Limited time offer</span>
          </h2>
          <h2
            data-sr-dom-node-id="world-heading"
            aria-label="The world is yours to discover."
          >The world is yours<span hidden>you should not hear this</span><span> to discover.</span></h2>
        </section>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "hero-heading-ax",
              ignored: false,
              role: "heading",
              name: "Summer's sorted: Your Avios are worth 33% more on holidays Limited time offer.",
              domNodeId: "hero-heading",
              properties: { level: 2 },
            },
            {
              nodeId: "world-heading-ax",
              ignored: false,
              role: "heading",
              name: "The world is yours to discover.",
              domNodeId: "world-heading",
              properties: { level: 2 },
            },
          ],
        },
      },
    ),
    [
      "heading level 2, Summer's sorted: Your Avios are worth 33% more on holidays Limited time offer., 2 items",
      "heading level 2, The world is yours to discover., 2 items",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <h2 aria-label="Accessible combined."><span>Visible one</span><span>Visible two</span></h2>
    `),
    [
      "heading level 2 Visible one, level 1 Visible two, level 1, 2 items",
    ],
  );
});

test("scanSubtree emits quantity labels before add buttons", () => {
  assert.deepEqual(
    scanHtml(`
      <div>
        <label for="quantity-controls-1">Quantity controls, undefined</label>
        <div>
          <button type="submit" aria-label="add 1 Garden Table">Add</button>
        </div>
        <div aria-live="polite"></div>
      </div>
    `),
    ["Quantity controls, undefined", "add 1 Garden Table, button"],
  );
});

test("scanSubtree suppresses empty alert live regions", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <p>Ready.</p>
          <p data-sr-dom-node-id="alert" role="alert" aria-live="assertive"></p>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "1",
              ignored: false,
              role: "alert",
              name: "",
              domNodeId: "alert",
              properties: { live: "assertive", atomic: true },
            },
          ],
        },
      },
    ),
    ["main", "Ready.", "end of, main"],
  );

  assert.deepEqual(
    scanHtml(`
      <main>
        <p role="alert" aria-live="assertive">Saved.</p>
        <p role="alert" aria-live="assertive" aria-label="Upload failed"></p>
      </main>
    `),
    ["main", "alert, Saved.", "alert, Upload failed", "end of, main"],
  );

  assert.deepEqual(
    scanHtml(`
      <main>
        <div role="alert" aria-label="Announcement">
          <a href="/universe">GitHub Universe 2026</a>
          <span aria-hidden="true">|</span>
          <span>Find your people at GitHub Universe.</span>
          <a href="/register">Register now</a>
          <button aria-label="Close">Close</button>
        </div>
      </main>
    `),
    [
      "main",
      "Announcement, alert",
      "link, GitHub Universe 2026",
      "Find your people at GitHub Universe.",
      "link, Register now",
      "Close, button",
      "end of, Announcement, alert",
      "end of, main",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <main>
        <footer>
          <a href="#top">back to top</a>
        </footer>
        <div>
          <p id="__next-route-announcer__" role="alert" aria-live="assertive"></p>
        </div>
        <div role="dialog"></div>
      </main>
    `),
    ["main", "link, back to top", "group", "end of, main"],
  );

  assert.deepEqual(
    scanHtml(`
      <main>
        <footer>
          <a href="#top">back to top</a>
        </footer>
        <div>
          <p id="__next-route-announcer__" role="alert" aria-live="assertive"></p>
        </div>
        <div role="dialog" aria-modal="true"><iframe title="SP Consent Message"></iframe></div>
      </main>
    `),
    ["main", "link, back to top", "group", "dialog", "end of, main"],
  );

  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Primary">
        <div role="dialog" aria-label="No suggestions">No suggestions</div>
      </nav>
    `),
    [
      "Primary, navigation",
      "No suggestions, dialog",
      "No suggestions",
      "end of, No suggestions, dialog",
      "end of, Primary, navigation",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <header>
        <x-action>
          <span>
            <button aria-label="Settings"></button>
          </span>
          <div role="tooltip" aria-label="tooltip">
            <span hidden>Settings</span>
          </div>
        </x-action>
      </header>
    `),
    [
      "banner",
      "Settings, button",
      "tooltip, empty tooltip",
      "end of, banner",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <header>
        <x-action>
          <button aria-label="Settings"></button>
          <x-tooltip role="tooltip" tabindex="-1" aria-label="tooltip">
            <span hidden>Settings</span>
          </x-tooltip>
        </x-action>
      </header>
    `),
    [
      "banner",
      "Settings, button",
      "tooltip",
      "end of, banner",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <main>
        <button aria-label="Search with your voice" aria-describedby="voice-tip"></button>
        <div id="voice-tip" role="tooltip">Search with your voice</div>
        <div role="tooltip" aria-label="tooltip"></div>
      </main>
    `),
    [
      "main",
      "Search with your voice Search with your voice, button",
      "Search with your voice, empty tooltip",
      "tooltip, empty tooltip",
      "end of, main",
    ],
  );
});

test("scanSubtree matches VoiceOver modal dialog summaries", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <h1 id="dialog-title">Main menu</h1>
          <p>Choose a section to continue.</p>
          <button type="button">Close</button>
        </div>
      </main>
    `),
    [
      "main",
      "Main menu, dialog",
      "heading level 1, Main menu",
      "dialog, with 3 items",
      "end of, main",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <main>
        <div role="dialog" aria-modal="true">
          <button type="button" aria-label="Back">Back</button>
          <a href="/orders">Orders</a>
          <a href="/account">Account</a>
        </div>
      </main>
    `),
    [
      "main",
      "Back, button",
      "link, Orders",
      "link, Account",
      "end of, main",
    ],
  );
});

test("scanSubtree keeps labeled fieldset radio groups and VoiceOver radio phrasing", () => {
  assert.deepEqual(
    scanHtml(`
      <fieldset aria-label="Filter tabs">
        <button type="button" role="radio" aria-checked="true">All</button>
        <button type="button" role="radio" aria-checked="false">Electronics & Gaming</button>
      </fieldset>
    `),
    [
      "Filter tabs, group",
      "All, selected, radio button",
      "Electronics & Gaming, radio button",
      "end of, Filter tabs, group",
    ],
  );
});

test("scanSubtree uses AX-confirmed VoiceOver phrasing for native fieldset radios", () => {
  const accessibilityTree = {
    nodes: [
      {
        nodeId: "departures",
        role: "radio",
        name: "Departures",
        domNodeId: "departures",
        properties: { checked: true, focusable: true },
      },
      {
        nodeId: "arrivals",
        role: "radio",
        name: "Arrivals",
        domNodeId: "arrivals",
        properties: { checked: false, focusable: true },
      },
    ],
  };

  assert.deepEqual(
    scanHtml(`
      <fieldset>
        <legend data-sr-computed-hidden="display:none">Radio buttons live-trains-finder-type</legend>
        <input id="departures" data-sr-dom-node-id="departures" type="radio" name="board" checked>
        <label for="departures">Departures</label>
        <input id="arrivals" data-sr-dom-node-id="arrivals" type="radio" name="board">
        <label for="arrivals">Arrivals</label>
      </fieldset>
    `, { accessibilityTree }),
    [
      "Departures, selected, radio button, 1 of 2",
      "Arrivals, radio button, 2 of 2",
    ],
  );
});

test("scanSubtree uses grouped VoiceOver radio phrasing for SLDS radio button groups", () => {
  assert.deepEqual(
    scanHtml(`
      <div class="slds-radio_button-group">
        <span class="slds-button slds-radio_button">
          <input type="radio" name="speed" value="76 Mb/s" checked>
          <label><span>76 Mb/s</span></label>
        </span>
        <span class="slds-button slds-radio_button">
          <input type="radio" name="speed" value="150 Mb/s">
          <label><span>150 Mb/s</span></label>
        </span>
      </div>
    `),
    [
      "selected, radio button, 1 of 2",
      "76 Mb/s",
      "radio button, 2 of 2",
      "150 Mb/s",
    ],
  );
});

test("scanSubtree infers selected SLDS radio from styled label when checked is not serialized", () => {
  assert.deepEqual(
    scanHtml(`
      <div class="slds-radio_button-group radio_container">
        <span class="slds-button slds-radio_button btnSpan">
          <input type="radio" name="speed" role="radio" value="76 Mb/s">
          <label class="slds-radio_button__label radioLabel optLabel radioBkgColor" style="background: linear-gradient(to right, rgb(0, 55, 255), rgb(0, 131, 255));">
            <span class="slds-radio_faux radioSpan" role="text" style="color: white;">76 Mb/s</span>
          </label>
        </span>
        <span class="slds-button slds-radio_button btnSpan" tabindex="0">
          <input type="radio" name="speed" role="radio" value="150 Mb/s">
          <label class="slds-radio_button__label radioLabel optLabel" style="background: white;">
            <span class="slds-radio_faux radioSpan" role="text" style="color: rgb(74, 74, 74);">150 Mb/s</span>
          </label>
        </span>
      </div>
    `),
    [
      "selected, radio button, 1 of 2",
      "76 Mb/s",
      "radio button, 2 of 2",
      "150 Mb/s",
    ],
  );
});

test("scanSubtree groups text buttons with trailing icons", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <p>Already have a subscription?</p>
        <button><p>Learn More</p><svg aria-hidden="true"></svg></button>
      </section>
    `),
    ["Already have a subscription?", "Learn More, button, group"],
  );

  assert.deepEqual(
    scanHtml(`
      <button>
        <svg aria-hidden="true" viewBox="0 0 16 16"></svg>
        Sign in
      </button>
    `),
    ["Sign in, button"],
  );
});

test("scanSubtree adds post-heading groups for h2 cards with leading decorative media", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <div>
          <h2>Not quite ready to switch?</h2>
          <div><img alt="" role="presentation"></div>
          <div>
            <span>Let us know your home insurance renewal date and we'll send you a reminder to switch.</span>
            <a href="/save-date">Save the date</a>
          </div>
        </div>
        <div>
          <div><h2>Existing Sky Protect customer?</h2></div>
          <div>
            <p>Access your policy documents anytime in My Sky App, or find them here</p>
            <a href="/policy-documents">See full insurance coverage</a>
          </div>
          <div><img alt="" role="presentation"></div>
        </div>
      </section>
    `),
    [
      "heading level 2, Not quite ready to switch?",
      "group",
      "Let us know your home insurance renewal date and we'll send you a reminder to switch.",
      "link, Save the date",
      "heading level 2, Existing Sky Protect customer?",
      "Access your policy documents anytime in My Sky App, or find them here",
      "link, See full insurance coverage",
    ],
  );
});

test("scanSubtree announces decorative media groups before native link actions", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <h1>TV &amp; Broadband Packages</h1>
        <div>
          <span>Get Sky TV with fast broadband for seamless streaming.</span>
        </div>
        <div role="group">
          <div><img alt=""></div>
        </div>
        <div>
          <a href="/build">Build your package</a>
          <a href="/deals">See all deals</a>
        </div>
      </main>
    `),
    [
      "main",
      "heading level 1, TV & Broadband Packages",
      "Get Sky TV with fast broadband for seamless streaming.",
      "group",
      "link, Build your package",
      "link, See all deals",
      "end of, main",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <main>
        <h1>TV &amp; Broadband Packages</h1>
        <div>
          <span>Get Sky TV with fast broadband for seamless streaming.</span>
        </div>
        <div>
          <div><img alt=""></div>
        </div>
        <div>
          <a href="/build">Build your package</a>
          <a href="/deals">See all deals</a>
        </div>
      </main>
    `),
    [
      "main",
      "heading level 1, TV & Broadband Packages",
      "Get Sky TV with fast broadband for seamless streaming.",
      "group",
      "link, Build your package",
      "link, See all deals",
      "end of, main",
    ],
  );
});

test("scanSubtree keeps native package action disclosure buttons ungrouped and preserves detail text", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li>
          <div aria-labelledby="package-heading">
            <h2 id="package-heading">Ultimate TV &amp; 300Mbps Full Fibre Broadband</h2>
            <div>
              <span>£41 /month</span>
              <div aria-hidden="true"><span>£41</span><span>/month</span></div>
              <span>Prices may change during 24 month minimum term.</span>
            </div>
            <div>
              <a href="/start">Get Started</a>
              <button>What's included<svg aria-hidden="true"></svg></button>
            </div>
            <div>
              <span>Full Fibre 300 available to UK homes. New Sky TV &amp; Broadband customers only</span>
              <div><button>See all legals</button></div>
            </div>
          </div>
        </li>
      </ul>
    `),
    [
      "list 1 item",
      "Ultimate TV & 300Mbps Full Fibre Broadband, group",
      "heading level 2, Ultimate TV & 300Mbps Full Fibre Broadband",
      "£41 /month Prices may change during 24 month minimum term.",
      "link, Get Started",
      "What's included, button",
      "Full Fibre 300 available to UK homes. New Sky TV & Broadband customers only",
      "See all legals, button, group",
      "end of, Ultimate TV & 300Mbps Full Fibre Broadband, group",
      "end of list",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <ul>
        <li>
          <div aria-labelledby="package-heading">
            <h2 id="package-heading">Ultimate TV &amp; 300Mbps Full Fibre Broadband</h2>
            <div>
              <span>£41 /month</span>
              <div aria-hidden="true"><span>£41</span><span>/month</span></div>
              <span>Prices may change during 24 month minimum term.</span>
            </div>
            <div>
              <div><a href="/start">Get Started</a></div>
              <div><button>What's included<svg aria-hidden="true"></svg></button></div>
            </div>
            <div>
              <span>Full Fibre 300 available to UK homes. New Sky TV &amp; Broadband customers only.</span>
              <div><button>See all legals</button></div>
            </div>
          </div>
        </li>
      </ul>
    `),
    [
      "list 1 item",
      "Ultimate TV & 300Mbps Full Fibre Broadband, group",
      "heading level 2, Ultimate TV & 300Mbps Full Fibre Broadband",
      "£41 /month Prices may change during 24 month minimum term.",
      "link, Get Started",
      "What's included, button",
      "Full Fibre 300 available to UK homes. New Sky TV & Broadband customers only.",
      "See all legals, button, group",
      "end of, Ultimate TV & 300Mbps Full Fibre Broadband, group",
      "end of list",
    ],
  );
});

test("scanSubtree suppresses outer list metadata inside grouped list-item cards", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li>
          <div aria-labelledby="package-a-heading">
            <div><span>Best value package</span></div>
            <h2 id="package-a-heading">Package A</h2>
            <ul><li><button>Feature A</button></li></ul>
            <ul><li>Advanced hub</li></ul>
          </div>
        </li>
        <li>
          <div aria-labelledby="package-b-heading">
            <div><span>Streaming package</span></div>
            <h2 id="package-b-heading">Package B</h2>
            <ul><li><button>Feature B</button></li></ul>
          </div>
        </li>
      </ul>
    `),
    [
      "list 2 items",
      "Package A, group, 1 of 2",
      "Best value package",
      "heading level 2, Package A, 1 of 2",
      "list 1 item",
      "Feature A, button",
      "end of list",
      "list 1 item",
      "Advanced hub",
      "end of list",
      "end of, Package A, group",
      "Package B, group, 2 of 2",
      "Streaming package",
      "heading level 2, Package B, 2 of 2",
      "list 1 item",
      "Feature B, button",
      "end of list",
      "end of, Package B, group",
      "end of list",
    ],
  );
});

test("scanSubtree counts parenthesized heading child boundary fragments without splitting visible text", () => {
  assert.deepEqual(
    scanHtml(`
      <h2>
        <span>TV &amp; Broadband Packages</span>
        <span>(<!-- -->9<!-- -->)</span>
      </h2>
    `),
    [
      "heading level 2 TV & Broadband Packages, level 1 (, level 1 9, level 1), level 1, 4 items",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <h2>
        <span>TV &amp; Broadband Packages</span>
        <span><span>(9)</span></span>
      </h2>
    `),
    [
      "heading level 2 TV & Broadband Packages, level 1 (, level 1 9, level 1), level 1, 4 items",
    ],
  );
});

test("scanSubtree adds leading groups for standalone h3 content cards", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>Sky Products</h2>
        <div>
          <div></div>
          <div>
            <h3>Meet the streaming apps, included with Ultimate TV</h3>
            <span>You get shows plus apps together.</span>
            <a href="/apps">Learn more</a>
          </div>
        </div>
        <div>
          <div>
            <span>20% off Sky Glass</span>
          </div>
          <div>
            <h3>Sky Glass</h3>
            <span>Sky Glass is the smarter TV.</span>
            <a href="/glass">Learn more</a>
          </div>
        </div>
      </section>
    `),
    [
      "heading level 2, Sky Products",
      "group",
      "heading level 3, Meet the streaming apps, included with Ultimate TV",
      "You get shows plus apps together.",
      "link, Learn more",
      "group",
      "20% off Sky Glass",
      "heading level 3, Sky Glass",
      "Sky Glass is the smarter TV.",
      "link, Learn more",
    ],
  );
});

test("scanSubtree groups custom headed informational card body text", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <x-feed-card>
          <div>
            <h2>Try searching to get started</h2>
            <x-formatted-text aria-label="Start watching videos to help us build a feed of videos you'll love.">
              Start watching videos to help us build a feed of videos you'll love.
            </x-formatted-text>
          </div>
        </x-feed-card>
      </main>
    `),
    [
      "main",
      "heading level 2, Try searching to get started",
      "Start watching videos to help us build a feed of videos you'll love., group",
      "Start watching videos to help us build a feed of videos you'll love.",
      "end of, Start watching videos to help us build a feed of videos you'll love., group",
      "end of, main",
    ],
  );
});

test("scanSubtree does not add a leading group before standalone h3 cards after decorative media", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>Learn the web platform</h2>
        <div>
          <div>
            <figure><picture><img alt=""></picture></figure>
          </div>
          <div>
            <div>
              <h3>Keep up on web development news</h3>
              <p>Read web development news.</p>
              <div><a href="/blog">Read the blog</a></div>
            </div>
          </div>
        </div>
      </section>
    `),
    [
      "heading level 2, Learn the web platform",
      "heading level 3, Keep up on web development news",
      "Read web development news.",
      "link, Read the blog",
    ],
  );
});

test("scanSubtree adds paired groups for decorative text-only content cards", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>TV guaranteed for every mood, and everyone</h2>
        <h3>Included in your TV and Broadband package</h3>
        <p>Find shows from Sky, Netflix, Discovery+, BBC and ITV.</p>
        <ul>
          <li><img alt=""><p>More of the UK's highest rated shows</p><p>Sky and Netflix in one simple subscription.</p></li>
          <li><img alt=""><p>No dish, just plug and play</p><p>Stream straight to any TV over WiFi.</p></li>
          <li><img alt=""><p>UK's fastest speeds</p><p>Speeds up to 5Gbps.</p></li>
        </ul>
        <div>
          <div>
            <div><img alt=""></div>
            <div><img alt=""><span>Sky Atlantic has world class television and stories.</span></div>
          </div>
          <div>
            <div><img alt=""></div>
            <div><img alt=""><span>Netflix shows are included. Bring your profile or create a new one.</span></div>
          </div>
          <div>
            <div><img alt=""></div>
            <div><img alt=""><span>Discovery+ has documentaries and reality shows on demand.</span></div>
          </div>
        </div>
      </section>
    `),
    [
      "heading level 2, TV guaranteed for every mood, and everyone",
      "heading level 3, Included in your TV and Broadband package",
      "Find shows from Sky, Netflix, Discovery+, BBC and ITV.",
      "list 3 items",
      "More of the UK's highest rated shows, 1 of 3",
      "Sky and Netflix in one simple subscription.",
      "No dish, just plug and play, 2 of 3",
      "Stream straight to any TV over WiFi.",
      "UK's fastest speeds, 3 of 3",
      "Speeds up to 5Gbps.",
      "end of list",
      "group",
      "group",
      "Sky Atlantic has world class television and stories.",
      "group",
      "group",
      "Netflix shows are included. Bring your profile or create a new one.",
      "group",
      "group",
      "Discovery+ has documentaries and reality shows on demand.",
    ],
  );
});

test("scanSubtree does not add standalone card groups before linked headings", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>Featured</h2>
        <div>
          <h3><a href="/find-a-job">Find a job</a></h3>
          <p>Search and apply for jobs.</p>
        </div>
      </section>
    `),
    [
      "heading level 2, Featured",
      "heading level 3, level 2, link, Find a job",
      "Search and apply for jobs.",
    ],
  );
});

test("scanSubtree does not add standalone card groups to multi-metadata cards", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>AI skills</h2>
        <div>
          <span>General</span>
          <h3>AI and accessibility overview</h3>
          <div>
            <p>This video focuses on the intersection of AI and accessibility.</p>
            <p>Duration: 4 minutes 30 seconds</p>
          </div>
          <div><a href="/video">Learn about AI solutions</a></div>
        </div>
      </section>
    `),
    [
      "heading level 2, AI skills",
      "General",
      "heading level 3, AI and accessibility overview",
      "This video focuses on the intersection of AI and accessibility.",
      "Duration: 4 minutes 30 seconds",
      "link, Learn about AI solutions",
    ],
  );
});

test("scanSubtree announces single-select listboxes with the selected option", () => {
  assert.deepEqual(
    scanHtml(`
      <div role="listbox" aria-label="Deals filters">
        <button role="option" aria-selected="true" type="button">All</button>
        <button role="option" aria-selected="false" type="button">TV</button>
        <button role="option" aria-selected="false" type="button">Broadband</button>
      </div>
    `),
    [
      "Deals filters, list box, 1 item selected. All, menu item, (1 of 3)",
    ],
  );

  assert.deepEqual(
    scanHtml(`<span>31results</span>`),
    ["31", "results"],
  );
});

test("scanSubtree keeps opacity-hidden native controls in accessibility traversal", () => {
  assert.deepEqual(
    scanHtml(`
      <div>
        <label for="sort-by">Sort by:</label>
        <select id="sort-by" data-sr-computed-hidden="opacity:0">
          <option selected>Relevance</option>
          <option>Price (low to high)</option>
        </select>
      </div>
    `),
    [
      "Sort by:",
      "Relevance, Sort by:, menu pop up collapsed, button",
    ],
  );
});

test("scanSubtree keeps native search control wrappers transparent inside search landmarks", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Meta">
        <ul>
          <li><a href="/about">About</a></li>
          <li>
            <form role="search">
              <div>
                <label for="header-search"><span>Search:</span><input id="header-search" type="search" placeholder="Search" aria-label="Search"></label>
                <button><span><svg aria-label="Submit Search"></svg></span></button>
              </div>
            </form>
          </li>
        </ul>
      </nav>
    `),
    [
      "Meta, navigation",
      "list 2 items",
      "link, About, 1 of 2",
      "search, 2 of 2",
      "Search:",
      "Search: Search, search text field",
      "Submit Search, button, group",
      "end of, search",
      "end of list",
      "end of, Meta, navigation",
    ],
  );
});

test("scanSubtree uses AX-backed names and label stops for native search panels", () => {
  const accessibilityTree = {
    nodes: [
      {
        nodeId: "panel",
        role: "tabpanel",
        name: "Search flights. option selected.",
        domNodeId: "panel",
      },
      {
        nodeId: "trip",
        role: "combobox",
        name: "Trip type",
        value: "Return trip",
        domNodeId: "trip",
        properties: { focusable: true, hasPopup: "menu", expanded: false },
      },
      {
        nodeId: "from-input",
        role: "textbox",
        name: "input",
        description: "From",
        domNodeId: "from-input",
        properties: { focusable: true },
      },
      {
        nodeId: "depart",
        role: "textbox",
        name: "Depart",
        domNodeId: "depart",
        properties: { focusable: true },
      },
      {
        nodeId: "travel",
        role: "combobox",
        name: "Select a travel class. Currently selected Economy",
        value: "Economy",
        domNodeId: "travel",
        properties: { focusable: true, hasPopup: "menu", expanded: false },
      },
      {
        nodeId: "passengers-label",
        role: "LabelText",
        name: "",
        domNodeId: "passengers-label",
        childIds: ["passengers-label-text"],
      },
      {
        nodeId: "passengers-label-text",
        role: "StaticText",
        name: "Select passengers",
      },
      {
        nodeId: "passengers",
        role: "button",
        name: "Select the type and number of passengers. Currently selected 1 Adult.",
        domNodeId: "passengers",
        properties: { focusable: true, expanded: false },
      },
      {
        nodeId: "submit",
        role: "button",
        name: "Find flights",
        domNodeId: "submit",
        properties: { focusable: true },
      },
    ],
  };

  assert.deepEqual(
    scanHtml(
      `
        <button id="tab-0" aria-label="Search flights. option selected." aria-controls="panel-0">
          Flights
        </button>
        <section id="panel-0" role="tabpanel" aria-labelledby="tab-0" data-sr-dom-node-id="panel">
          <form>
            <div>
              <label for="trip">Trip type</label>
              <div>
                <select
                  id="trip"
                  aria-label="Select your trip. Currently selected Return trip."
                  data-sr-dom-node-id="trip"
                >
                  <option selected>Return trip</option>
                </select>
              </div>
            </div>
            <div>
              <div id="from-description" aria-live="polite">From</div>
              <label for="from-typeahead">From</label>
              <div>
                <input
                  aria-label="input"
                  type="text"
                  placeholder="Departure city"
                  aria-describedby="from-description"
                  data-sr-dom-node-id="from-input"
                >
              </div>
            </div>
            <section>
              <label for="depart">Depart</label>
              <div>
                <input
                  id="depart"
                  placeholder="dd/mm/yyyy"
                  data-sr-dom-node-id="depart"
                >
                <button type="button" aria-hidden="true" tabindex="-1"></button>
              </div>
            </section>
            <div>
              <label for="travel">Travel class</label>
              <div>
                <select
                  id="travel"
                  aria-label="Select a travel class. Currently selected Economy"
                  data-sr-dom-node-id="travel"
                >
                  <option selected>Economy</option>
                </select>
              </div>
            </div>
            <div>
              <label for=":passengers:" data-sr-dom-node-id="passengers-label">Select passengers</label>
              <button
                type="button"
                aria-expanded="false"
                aria-label="Select the type and number of passengers. Currently selected 1 Adult."
                aria-labelledby="Select the type and number of passengers. Currently selected 1 Adult."
                data-sr-dom-node-id="passengers"
              >
                <span>1 Adult</span>
              </button>
            </div>
            <div>
              <button type="submit" data-sr-dom-node-id="submit">
                <div><span>Find flights</span></div>
              </button>
            </div>
          </form>
        </section>
      `,
      { accessibilityTree },
    ),
    [
      "Search flights. option selected., button",
      "Search flights. option selected., tab panel",
      "Trip type",
      "Return trip, Trip type, menu pop up collapsed, button",
      "From",
      "From",
      "input From, edit text",
      "Depart",
      "Depart dd/mm/yyyy, edit text",
      "Travel class",
      "Economy, Select a travel class. Currently selected Economy, menu pop up collapsed, button",
      "Select passengers",
      "Select the type and number of passengers. Currently selected 1 Adult., collapsed, button",
      "Find flights, button, group",
      "end of, Search flights. option selected., tab panel",
    ],
  );
});

test("scanSubtree gives explicit aria-label precedence for native input and select controls", () => {
  assert.deepEqual(
    scanHtml(`
      <form>
        <label for="destinations">Destination or hotel</label>
        <input
          id="destinations"
          type="text"
          aria-label="Search for destinations or accommodation, start typing for autocomplete or tab to the next element to get a list of destinations, Autocomplete"
          placeholder="Any"
        >
        <label for="duration">Duration</label>
        <select id="duration" aria-label="Select duration">
          <option selected>2 nights</option>
          <option>3 nights</option>
        </select>
      </form>
    `),
    [
      "Search for destinations or accommodation, start typing for autocomplete or tab to the next element to get a list of destinations, Autocomplete Any, edit text",
      "2 nights, Select duration, menu pop up collapsed, button",
    ],
  );
});

test("scanSubtree does not add native tab-panel submit grouping outside tab panels", () => {
  const accessibilityTree = {
    nodes: [
      {
        nodeId: "submit",
        role: "button",
        name: "Find",
        domNodeId: "submit",
        properties: { focusable: true },
      },
    ],
  };

  assert.deepEqual(
    scanHtml(
      `
        <form>
          <button type="submit" data-sr-dom-node-id="submit">
            <div><span>Find</span></div>
          </button>
        </form>
      `,
      { accessibilityTree },
    ),
    ["Find, button"],
  );
});

test("scanSubtree adds group suffix for adjacent direct span native weather buttons", () => {
  assert.deepEqual(
    scanHtml(`
      <div>
        <button type="button"><span>Any</span></button>
        <button type="button"><span>Warm</span><span>16 - 22ºC</span></button>
        <button type="button" class="active"><span>Hot</span><span>23 - 28ºC</span></button>
        <button type="button"><span>Very Hot</span><span>29 - 40ºC</span></button>
      </div>
    `),
    [
      "Any, button",
      "Warm16 - 22ºC, button, group",
      "Hot23 - 28ºC, button, group",
      "Very Hot29 - 40ºC, button, group",
    ],
  );
});

test("scanSubtree preserves real whitespace between direct span fragments in native button names", () => {
  assert.deepEqual(
    scanHtml(`
      <button type="button"><span>Warm</span> <span>16 - 22ºC</span></button>
    `),
    ["Warm 16 - 22ºC, button"],
  );
});

test("scanSubtree omits group suffix for AX-confirmed collapsed anchor buttons with hidden alternate text", () => {
  assert.deepEqual(
    scanHtml(
      `
        <article aria-labelledby="option-title">
          <h2 id="option-title">Option A</h2>
          <p>Fast service.</p>
          <a role="button" aria-expanded="false" data-sr-dom-node-id="details-toggle">
            <span>Details</span>
            <span data-sr-computed-hidden="display:none">Hide details</span>
            <span><svg aria-hidden="true" role="img"></svg></span>
          </a>
        </article>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "details-toggle-ax",
              role: "button",
              name: "Details",
              domNodeId: "details-toggle",
              tagName: "a",
              properties: { expanded: false },
            },
          ],
        },
      },
    ),
    [
      "Option A, article",
      "heading level 2, Option A",
      "Fast service.",
      "Details, collapsed, button",
      "end of, Option A, article",
    ],
  );
});

test("scanSubtree keeps group suffix for ordinary collapsed anchor role buttons", () => {
  assert.deepEqual(
    scanHtml(
      `
        <a role="button" aria-expanded="false" data-sr-dom-node-id="menu-toggle">
          Menu
        </a>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "menu-toggle-ax",
              role: "button",
              name: "Menu",
              domNodeId: "menu-toggle",
              tagName: "a",
              properties: { expanded: false },
            },
          ],
        },
      },
    ),
    ["Menu, collapsed, button, group"],
  );
});

test("scanSubtree uses AX-confirmed spacing for compact adjacent span popup buttons", () => {
  assert.deepEqual(
    scanHtml(
      `
        <button type="button" aria-haspopup="dialog" aria-expanded="false" data-sr-dom-node-id="feature-button">
          <div><span>1.1</span><span>Linear Agent</span><span>+</span></div>
        </button>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              role: "button",
              name: "1.1 Linear Agent +",
              domNodeId: "feature-button",
              properties: {
                focusable: true,
                hasPopup: "dialog",
                expanded: false,
              },
            },
          ],
        },
      },
    ),
    ["1.1 Linear Agent +, dialog pop up collapsed, button"],
  );
});

test("scanSubtree keeps ordinary compact input action wrappers grouped", () => {
  assert.deepEqual(
    scanHtml(`
      <div>
        <label for="email">Email</label>
        <input id="email" type="text" placeholder="Email">
        <button><svg aria-label="Submit"></svg></button>
      </div>
    `),
    ["Email, group", "Email", "end of, Email, group", "Email, edit text", "Submit, button, group"],
  );
});

test("scanSubtree emits direct visible label stops before named native textboxes", () => {
  assert.deepEqual(
    scanHtml(`
      <form>
        <div>
          <label for="location">Enter a town, city or postcode in England</label>
          <input id="location" name="Location" type="text">
        </div>
        <button type="submit">Search</button>
      </form>
    `),
    [
      "Enter a town, city or postcode in England",
      "Enter a town, city or postcode in England, edit text",
      "Search, button",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <form>
        <div>
          <label for="location">Visible label</label>
          <input id="location" type="text" aria-label="ARIA name">
        </div>
      </form>
    `),
    ["ARIA name, edit text"],
  );
});

test("scanSubtree emits visible label and described hint before native textboxes", () => {
  const accessibilityTree = {
    nodes: [
      {
        nodeId: "label",
        role: "LabelText",
        name: "",
        domNodeId: "label",
        childIds: ["label-text"],
      },
      { nodeId: "label-text", role: "StaticText", name: "Enter a postcode" },
      {
        nodeId: "hint",
        role: "generic",
        name: "",
        domNodeId: "hint",
        childIds: ["hint-text"],
      },
      { nodeId: "hint-text", role: "StaticText", name: "For example SW1A 2AA" },
      {
        nodeId: "input",
        role: "textbox",
        name: "Enter a postcode",
        description: "For example SW1A 2AA",
        domNodeId: "input",
        properties: { focusable: true },
      },
    ],
  };

  assert.deepEqual(
    scanHtml(`
      <form>
        <div>
          <label for="postcode" data-sr-dom-node-id="label">Enter a postcode</label>
          <div id="postcode-hint" data-sr-dom-node-id="hint">For example SW1A 2AA</div>
          <input id="postcode" type="text" aria-describedby="postcode-hint" data-sr-dom-node-id="input">
        </div>
        <button type="submit">Find</button>
      </form>
    `, { accessibilityTree }),
    [
      "Enter a postcode",
      "For example SW1A 2AA",
      "Enter a postcode For example SW1A 2AA, edit text",
      "Find, button",
    ],
  );
});

test("scanSubtree matches VoiceOver stops for simple labelled contact forms", () => {
  assert.deepEqual(
    scanHtml(`
      <form aria-label="Contact us">
        <h2>Contact us</h2>
        <div>
          <label for="cf-name">Name <span aria-hidden="true">*</span></label>
          <input id="cf-name" type="text" required aria-required="true" placeholder="Jane Smith">
        </div>
        <div>
          <label for="cf-email">Email <span aria-hidden="true">*</span></label>
          <input id="cf-email" type="email" required aria-required="true" placeholder="jane@example.com">
        </div>
        <div>
          <label for="cf-subject">Subject</label>
          <select id="cf-subject">
            <option value="">Choose a topic</option>
          </select>
        </div>
        <div>
          <label for="cf-message">Message <span aria-hidden="true">*</span></label>
          <textarea id="cf-message" required aria-required="true" placeholder="Your message..."></textarea>
        </div>
        <button type="submit">Send message</button>
      </form>
    `),
    [
      "heading level 2, Contact us",
      "Name",
      "Name Jane Smith, required, edit text",
      "Email",
      "Email jane@example.com, required, email",
      "Subject",
      "Choose a topic, Subject, menu pop up collapsed, button",
      "Message",
      "Message Your message..., required, text entry area",
      "Send message, button",
    ],
  );
});

test("scanSubtree descends into labeled native selects inside list items", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>Settings</h2>
        <ul role="list">
          <li>
            <label for="language">Language</label>
            <select id="language">
              <option selected>English</option>
              <option>Spanish</option>
            </select>
          </li>
          <li>
            <label for="temperature">Temperature</label>
            <select id="temperature">
              <option selected>Celsius</option>
              <option>Fahrenheit</option>
            </select>
          </li>
        </ul>
      </section>
    `),
    [
      "heading level 2, Settings",
      "list 2 items",
      "Language, 1 of 2",
      "English, Language, menu pop up collapsed, button",
      "Temperature, 2 of 2",
      "Celsius, Temperature, menu pop up collapsed, button",
      "end of list",
    ],
  );
});

test("scanSubtree does not emit separate native select label stops for hidden labels", () => {
  assert.deepEqual(
    scanHtml(`
      <form>
        <label for="language" data-sr-rendered-position="offscreen">en</label>
        <select id="language" data-sr-computed-hidden="opacity:0">
          <option selected>English</option>
        </select>
      </form>
    `),
    ["English, en, menu pop up collapsed, button"],
  );
});

test("scanSubtree uses describedby text instead of placeholder for split email controls", () => {
  assert.deepEqual(
    scanHtml(`
      <form aria-label="Newsletter">
        <label for="newsletter-email">Email address</label>
        <p id="newsletter-email-helper" style="display: none">We'll never share your email address.</p>
        <input
          id="newsletter-email"
          type="email"
          required
          aria-describedby="newsletter-email-helper"
          placeholder="Your email address"
        >
        <button type="submit">Subscribe</button>
      </form>
    `),
    [
      "Newsletter, form",
      "Email address",
      "Email address We'll never share your email address., required, email",
      "Subscribe, button",
      "end of, Newsletter, form",
    ],
  );
});

test("scanSubtree does not carry heading list item position onto nested section lists", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Resources">
        <ul role="list">
          <li>
            <div><h3>Guides</h3></div>
            <ul role="list">
              <li><a href="/start">Getting started</a></li>
              <li><a href="/advanced">Advanced topics</a></li>
            </ul>
          </li>
          <li>
            <div><h3>Reference</h3></div>
            <ul role="list">
              <li><a href="/api">API</a></li>
            </ul>
          </li>
        </ul>
      </nav>
    `),
    [
      "Resources, navigation",
      "list 2 items",
      "heading level 3, Guides, 1 of 2",
      "list 2 items, level 2",
      "link, Getting started, 1 of 2",
      "link, Advanced topics, 2 of 2",
      "end of list",
      "heading level 3, Reference, 2 of 2",
      "list 1 item, level 2",
      "link, API",
      "end of list",
      "end of list",
      "end of, Resources, navigation",
    ],
  );
});

test("scanSubtree does not carry navigation list item position onto nested list summaries", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Secondary">
        <ul>
          <li><a href="/standards">Standards</a></li>
          <li>
            <a href="/current" aria-current="page">Current section</a>
            <ul>
              <li><a href="/details">Details</a></li>
              <li><a href="/faq">FAQ</a></li>
            </ul>
          </li>
          <li><a href="/drafts">Drafts</a></li>
        </ul>
      </nav>
    `),
    [
      "Secondary, navigation",
      "list 3 items",
      "link, Standards, 1 of 3",
      "current page, link, Current section, 2 of 3",
      "list 2 items, level 2",
      "link, Details, 1 of 2",
      "link, FAQ, 2 of 2",
      "end of list",
      "link, Drafts, 3 of 3",
      "end of list",
      "end of, Secondary, navigation",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Footer links">
        <ul>
          <li>
            <h3 hidden>About</h3>
            <ul>
              <li><div>About this site.</div></li>
            </ul>
          </li>
          <li><h3>Contribute</h3></li>
        </ul>
      </nav>
    `),
    [
      "Footer links, navigation",
      "list 2 items",
      "list 1 item, level 2 1 of 2",
      "About this site.",
      "end of list",
      "Contribute, 2 of 2",
      "end of list",
      "end of, Footer links, navigation",
    ],
  );
});

test("scanSubtree groups AX-named navigation listitems around matching child links", () => {
  const html = `
    <nav aria-label="header">
      <ul>
        <li aria-labelledby="live-label" data-sr-dom-node-id="live-item">
          <a href="/live" aria-label="Live Departures" data-sr-dom-node-id="live-link">
            <span aria-hidden="true"></span>
            <span id="live-label">Live Departures</span>
          </a>
        </li>
        <li aria-labelledby="status-label" data-sr-dom-node-id="status-item">
          <a href="/status" aria-label="Status and Disruptions" data-sr-dom-node-id="status-link">
            <span aria-hidden="true"></span>
            <span id="status-label">Status and Disruptions</span>
          </a>
        </li>
      </ul>
    </nav>
  `;

  assert.deepEqual(
    scanHtml(html, {
      accessibilityTree: {
        nodes: [
          {
            nodeId: "live-item-ax",
            role: "listitem",
            name: "Live Departures",
            domNodeId: "live-item",
            childIds: ["live-link-ax"],
          },
          {
            nodeId: "live-link-ax",
            role: "link",
            name: "Live Departures",
            domNodeId: "live-link",
            properties: { focusable: true },
          },
          {
            nodeId: "status-item-ax",
            role: "listitem",
            name: "Status and Disruptions",
            domNodeId: "status-item",
            childIds: ["status-link-ax"],
          },
          {
            nodeId: "status-link-ax",
            role: "link",
            name: "Status and Disruptions",
            domNodeId: "status-link",
            properties: { focusable: true },
          },
        ],
      },
    }),
    [
      "header, navigation",
      "list 2 items",
      "Live Departures, group, (1 of 2), 1 of 2",
      "link, Live Departures",
      "end of, Live Departures, group, (1 of 2)",
      "Status and Disruptions, group, (2 of 2), 2 of 2",
      "link, Status and Disruptions",
      "end of, Status and Disruptions, group, (2 of 2)",
      "end of list",
      "end of, header, navigation",
    ],
  );

  assert.deepEqual(
    scanHtml(html),
    [
      "header, navigation",
      "list 2 items",
      "link, Live Departures, 1 of 2",
      "link, Status and Disruptions, 2 of 2",
      "end of list",
      "end of, header, navigation",
    ],
  );
});

test("scanSubtree prefixes AX-confirmed generic form groups before disabled controls", () => {
  const html = `
    <form>
      <section data-sr-dom-node-id="section">
        <div data-sr-dom-node-id="wrapper">
          <h1 data-sr-dom-node-id="heading">Plan Your Journey</h1>
          <div data-sr-dom-node-id="controls">
            <div role="status" aria-live="polite"></div>
            <button type="button" disabled data-sr-dom-node-id="swap">
              <svg aria-hidden="true"></svg>
              <span>Swap from and to stations</span>
            </button>
          </div>
          <button aria-label="Plan Your Journey" data-sr-dom-node-id="plan"></button>
        </div>
      </section>
    </form>
  `;

  const accessibilityTree = {
    nodes: [
      {
        nodeId: "section-ax",
        role: "generic",
        name: "",
        domNodeId: "section",
        childIds: ["wrapper-ax"],
      },
      {
        nodeId: "wrapper-ax",
        ignored: true,
        role: "none",
        name: "",
        domNodeId: "wrapper",
        childIds: ["heading-ax", "controls-ax", "plan-ax"],
      },
      {
        nodeId: "heading-ax",
        role: "heading",
        name: "Plan Your Journey",
        domNodeId: "heading",
        properties: { level: 1 },
      },
      {
        nodeId: "controls-ax",
        role: "generic",
        name: "",
        domNodeId: "controls",
        childIds: ["swap-ax"],
      },
      {
        nodeId: "swap-ax",
        role: "button",
        name: "Swap from and to stations",
        domNodeId: "swap",
        properties: { disabled: true },
      },
      {
        nodeId: "plan-ax",
        role: "button",
        name: "Plan Your Journey",
        domNodeId: "plan",
        properties: { focusable: true },
      },
    ],
  };

  assert.deepEqual(
    scanHtml(html, { accessibilityTree }),
    [
      "heading level 1, Plan Your Journey",
      "group",
      "group",
      "Swap from and to stations, dimmed, button",
      "Plan Your Journey, button",
    ],
  );

  assert.deepEqual(
    scanHtml(html),
    [
      "heading level 1, Plan Your Journey",
      "Swap from and to stations, dimmed, button, group",
      "Plan Your Journey, button",
    ],
  );
});

test("scanSubtree suppresses status role prefix for plain post-footer text status", () => {
  assert.deepEqual(
    scanHtml(`
      <div>
        <footer>
          <p>Copyright 2026</p>
        </footer>
      </div>
      <div role="status">National Rail Enquiries - Official source for UK train times and timetables</div>
      <form>
        <div role="status">Type to filter stations</div>
      </form>
    `),
    [
      "content information",
      "Copyright 2026",
      "end of, content information",
      "National Rail Enquiries - Official source for UK train times and timetables",
      "status, Type to filter stations",
    ],
  );
});

test("scanSubtree composes multiple image labels in button names", () => {
  assert.deepEqual(
    scanHtml(`
      <button>
        <img alt="Wifi Icon">
        <img alt="Phone Icon">
        Broadband &amp; Phone Prices from £26.95
      </button>
      <a href="/bundle">
        <img alt="TV Icon">
        <img alt="Broadband Icon">
        TV &amp; Broadband
      </a>
    `),
    [
      "Wifi Icon Phone Icon Broadband & Phone Prices from £26.95, button, group",
      "link, TV Icon Broadband Icon TV & Broadband",
    ],
  );
});

test("scanSubtree composes control names from image and text fragments in DOM order", () => {
  assert.deepEqual(
    scanHtml(`
      <a href="/image-first">
        <img alt="Sky Atlantic">
        <p>These two women are about to become the CIA's best kept secrets.</p>
        <span>Included with Essential TV</span>
      </a>
      <a href="/text-first">
        <span>Discover new movies on Sky this month</span>
        <img alt="What to watch on Sky Cinema this month">
      </a>
    `),
    [
      "link, Sky Atlantic These two women are about to become the CIA's best kept secrets. Included with Essential TV",
      "link, Discover new movies on Sky this month What to watch on Sky Cinema this month",
    ],
  );
});

test("scanSubtree splits price containers with serialized aria-hidden duplicate price pieces", () => {
  assert.deepEqual(
    scanHtml(`
      <div>
        <div>
          <span>From £24 /month</span>
          <div aria-hidden="true">
            <span>From</span><span>£24</span><span>/month</span>
          </div>
        </div>
        <span>Prices may change during 24 month minimum term.</span>
      </div>
    `),
    ["From £24 /month Prices may change during 24 month minimum term."],
  );
});

test("scanSubtree skips zero prices in free heading groups while preserving paid prices", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <section>
          <hgroup>
            <h3>Free</h3>
            <div><span>$0</span></div>
          </hgroup>
          <span><div><span>Free for everyone</span></div></span>
        </section>
        <section>
          <hgroup>
            <h3>Basic</h3>
            <div><span>$10 per user/month</span></div>
          </hgroup>
        </section>
      </main>
    `),
    [
      "main",
      "heading level 3, Free",
      "Free for everyone",
      "heading level 3, Basic",
      "$10 per user/month",
      "end of, main",
    ],
  );
});

test("scanSubtree splits rich price disclosure clusters into VoiceOver leaf stops", () => {
  assert.deepEqual(
    scanHtml(`
      <div>
        <div>
          <div>
            <span>£41 /month</span>
            <div aria-hidden="true"><span>£41</span><span>/month</span></div>
          </div>
        </div>
        <div><span><span>Prices may change during 24 month minimum term.</span></span></div>
        <div>
          <span>No upfront fees</span>
          <div><span>Claim up to £300 switching credit</span></div>
        </div>
      </div>
    `),
    [
      "£41 /month",
      "Prices may change during 24 month minimum term.",
      "No upfront fees",
      "Claim up to £300 switching credit",
    ],
  );
});

test("scanSubtree groups noninteractive metric cards with title, speed range, and body text", () => {
  assert.deepEqual(
    scanHtml(`
      <div>
        <div>
          <span>Everyday essential</span>
          <span>67 Mbps - 150 Mbps</span>
        </div>
        <span>Perfect for browsing and video calling.</span>
      </div>
    `),
    ["Everyday essential 67 Mbps - 150 Mbps Perfect for browsing and video calling."],
  );
});

test("scanSubtree descends into image-link caption list items", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li>
          <a aria-label="Navigate to PONIES" href="/watch/ponies">
            <img alt="PONIES on Sky Atlantic">
            <img alt="">
          </a>
          <span>PONIES</span>
        </li>
        <li>
          <a aria-label="Navigate to FROM" href="/watch/from">
            <img alt="FROM on Sky Atlantic">
          </a>
          <span>FROM</span>
        </li>
      </ul>
    `),
    [
      "list 2 items",
      "link, image, Navigate to PONIES, 1 of 2",
      "PONIES",
      "link, image, Navigate to FROM, 2 of 2",
      "FROM",
      "end of list",
    ],
  );
});

test("scanSubtree includes named images in otherwise empty list items", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li><img alt="The Guardian - 5 of 5 stars"></li>
        <li><img alt="T3 - 4 of 5 stars"></li>
      </ul>
    `),
    [
      "list 2 items",
      "The Guardian - 5 of 5 stars, image, 1 of 2",
      "T3 - 4 of 5 stars, image, 2 of 2",
      "end of list",
    ],
  );
});

test("scanSubtree suppresses zero-width text artifacts and decorative emoji", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h3>Roam with Ease\u200B</h3>
        <p>24/7 switching service with real person support\u200B.</p>
        <span>😍</span>
        <h2>More reasons to choose Sky Mobile</h2>
      </section>
    `),
    [
      "heading level 3, Roam with Ease",
      "24/7 switching service with real person support.",
      "heading level 2, More reasons to choose Sky Mobile",
    ],
  );
});

test("scanSubtree announces empty headings and block quotes", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2><span></span></h2>
        <figure>
          <blockquote>Slim, lightweight and bright.</blockquote>
          <figcaption>Trusted reviewer</figcaption>
        </figure>
      </section>
    `),
    [
      "heading level 2",
      "Slim, lightweight and bright., block quote level 1",
      "Trusted reviewer",
    ],
  );
});

test("scanSubtree splits inline emphasis inside simple list items", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li>
          <div>
            <svg aria-hidden="true"></svg>
            <span><div><strong>Free delivery</strong> on the day of your choice</div></span>
          </div>
        </li>
        <li>
          <div>
            <svg aria-hidden="true"></svg>
            <span><div><strong>2 Year</strong> Warranty &amp; <strong>30 day</strong> return</div></span>
          </div>
        </li>
      </ul>
    `),
    [
      "list 2 items",
      "Free delivery, 1 of 2",
      "• on the day of your choice",
      "2 Year, 2 of 2",
      "Warranty &",
      "30 day",
      "return",
      "end of list",
    ],
  );
});

test("scanSubtree preserves native list marker stops without leaking markers into labelled regions", () => {
  assert.deepEqual(
    scanHtml(`
      <section aria-labelledby="related">
        <h2 id="related">Related resources</h2>
        <ul>
          <li
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><a href="/guide">Using files from web applications</a></li>
          <li
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><a href="/api">File API</a></li>
        </ul>
      </section>
    `),
    [
      "Related resources, region",
      "heading level 2, Related resources",
      "list 2 items",
      ".,1of2",
      "link, Using files from web applications",
      ".,2 of2",
      "link, File API",
      "end of list",
      "end of, Related resources, region",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <section aria-labelledby="related">
        <h2 id="related"><a href="#related">Related resources</a></h2>
        <ul>
          <li
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><a href="/guide">Using files from web applications</a></li>
          <li
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><a href="/api">File API</a></li>
        </ul>
      </section>
    `),
    [
      "* Related resources, region",
      "heading level 2, level 1, link, Related resources",
      "list 2 items",
      ".,1of2",
      "link, Using files from web applications",
      ".,2 of2",
      "link, File API",
      "end of list",
      "end of, Related resources, region",
    ],
  );
});

test("scanSubtree expands AX-confirmed one-item inline two-link list items", () => {
  assert.deepEqual(
    scanHtml(
      `
        <div aria-hidden="true">GOV.UK Design System team</div>
        <ul data-sr-dom-node-id="10">
          <li
            data-sr-dom-node-id="11"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><span><a href="/alpha" data-sr-dom-node-id="12">Alpha Foundation</a>, <a href="/beta" data-sr-dom-node-id="13">Beta Program</a></span></li>
        </ul>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "20",
              ignored: false,
              role: "list",
              name: "",
              domNodeId: "10",
              tagName: "ul",
              childIds: ["21"],
            },
            {
              nodeId: "21",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "11",
              tagName: "li",
              childIds: ["22", "23", "24", "25"],
            },
            { nodeId: "22", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "23",
              ignored: false,
              role: "link",
              name: "Alpha Foundation",
              domNodeId: "12",
              tagName: "a",
              properties: { focusable: true },
            },
            { nodeId: "24", ignored: false, role: "StaticText", name: ", " },
            {
              nodeId: "25",
              ignored: false,
              role: "link",
              name: "Beta Program",
              domNodeId: "13",
              tagName: "a",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "list 1 item",
      "You are currently on a AXListMarker.",
      "link, Alpha Foundation",
      "You are currently on a selectable list item.",
      "link, Beta Program",
      "end of list",
    ],
  );
});

test("scanSubtree splits AX-confirmed marker code list items", () => {
  assert.deepEqual(
    scanHtml(
      `
        <div aria-hidden="true">GOV.UK Design System team</div>
        <ul data-sr-dom-node-id="10">
          <li
            data-sr-dom-node-id="11"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><code data-sr-dom-node-id="12" data-sr-rendered-position="offscreen">id</code> and its value are copied</li>
          <li
            data-sr-dom-node-id="13"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><code data-sr-dom-node-id="14" data-sr-rendered-position="offscreen">multiple</code>, which changes the button text</li>
        </ul>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "20",
              role: "list",
              name: "",
              domNodeId: "10",
              childIds: ["21", "25"],
            },
            {
              nodeId: "21",
              role: "listitem",
              name: "",
              domNodeId: "11",
              childIds: ["22", "23", "24"],
              properties: { level: 1 },
            },
            { nodeId: "22", role: "ListMarker", name: "• " },
            {
              nodeId: "23",
              role: "code",
              name: "",
              domNodeId: "12",
              childIds: ["23-text"],
            },
            { nodeId: "23-text", role: "StaticText", name: "id" },
            { nodeId: "24", role: "StaticText", name: " and its value are copied" },
            {
              nodeId: "25",
              role: "listitem",
              name: "",
              domNodeId: "13",
              childIds: ["26", "27", "28"],
              properties: { level: 1 },
            },
            { nodeId: "26", role: "ListMarker", name: "• " },
            {
              nodeId: "27",
              role: "code",
              name: "",
              domNodeId: "14",
              childIds: ["27-text"],
            },
            { nodeId: "27-text", role: "StaticText", name: "multiple" },
            { nodeId: "28", role: "StaticText", name: ", which changes the button text" },
          ],
        },
      },
    ),
    [
      "list 2 items",
      "•, 1 of 2",
      "id",
      "and its value are copied",
      "•, 2 of 2",
      "multiple",
      ", which changes the button text",
      "end of list",
    ],
  );
});

test("scanSubtree prefixes AX-confirmed plain text disc list items with native markers", () => {
  assert.deepEqual(
    scanHtml(
      `
        <ul data-sr-dom-node-id="10">
          <li
            data-sr-dom-node-id="11"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          >Plain marker text</li>
          <li
            data-sr-dom-node-id="12"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          >Second marker text</li>
        </ul>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "20",
              ignored: false,
              role: "list",
              name: "",
              domNodeId: "10",
              tagName: "ul",
              childIds: ["21", "24"],
            },
            {
              nodeId: "21",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "11",
              tagName: "li",
              childIds: ["22", "23"],
            },
            { nodeId: "22", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "23",
              ignored: false,
              role: "StaticText",
              name: "Plain marker text",
            },
            {
              nodeId: "24",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "12",
              tagName: "li",
              childIds: ["25", "26"],
            },
            { nodeId: "25", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "26",
              ignored: false,
              role: "StaticText",
              name: "Second marker text",
            },
          ],
        },
      },
    ),
    [
      "list 2 items",
      "• Plain marker text, 1 of 2",
      "• Second marker text, 2 of 2",
      "end of list",
    ],
  );
});

test("scanSubtree prefixes AX-confirmed leading text in mixed text-link list items", () => {
  assert.deepEqual(
    scanHtml(
      `
        <ul data-sr-dom-node-id="10">
          <li
            data-sr-dom-node-id="11"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          >Plain marker text</li>
          <li
            data-sr-dom-node-id="12"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          >Text before <a href="/more" data-sr-dom-node-id="13">linked detail</a>.</li>
        </ul>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "20",
              ignored: false,
              role: "list",
              name: "",
              domNodeId: "10",
              tagName: "ul",
              childIds: ["21", "24"],
            },
            {
              nodeId: "21",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "11",
              tagName: "li",
              childIds: ["22", "23"],
            },
            { nodeId: "22", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "23",
              ignored: false,
              role: "StaticText",
              name: "Plain marker text",
            },
            {
              nodeId: "24",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "12",
              tagName: "li",
              childIds: ["25", "26", "27", "28"],
            },
            { nodeId: "25", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "26",
              ignored: false,
              role: "StaticText",
              name: "Text before ",
            },
            {
              nodeId: "27",
              ignored: false,
              role: "link",
              name: "linked detail",
              domNodeId: "13",
              tagName: "a",
              properties: { focusable: true },
            },
            { nodeId: "28", ignored: false, role: "StaticText", name: "." },
          ],
        },
      },
    ),
    [
      "list 2 items",
      "• Plain marker text, 1 of 2",
      "• Text before, 2 of 2",
      "link, linked detail",
      "end of list",
    ],
  );
});

test("scanSubtree decomposes AX-confirmed mixed text-link list item boundaries", () => {
  assert.deepEqual(
    scanHtml(
      `
        <ul data-sr-dom-node-id="10">
          <li
            data-sr-dom-node-id="11"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          >take part in the <a href="/discussion" data-sr-dom-node-id="12">‘Date input’ discussion on GitHub</a> and share your research</li>
          <li
            data-sr-dom-node-id="13"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><a href="/edit" data-sr-dom-node-id="14">propose a change on GitHub</a> – read more about <a href="/help" data-sr-dom-node-id="15">how to propose changes in GitHub</a></li>
        </ul>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "20",
              ignored: false,
              role: "list",
              name: "",
              domNodeId: "10",
              tagName: "ul",
              childIds: ["21", "26"],
            },
            {
              nodeId: "21",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "11",
              tagName: "li",
              childIds: ["22", "23", "24", "25"],
            },
            { nodeId: "22", ignored: false, role: "ListMarker", name: "• " },
            { nodeId: "23", ignored: false, role: "StaticText", name: "take part in the " },
            {
              nodeId: "24",
              ignored: false,
              role: "link",
              name: "‘Date input’ discussion on GitHub ",
              domNodeId: "12",
              tagName: "a",
              properties: { focusable: true },
            },
            { nodeId: "25", ignored: false, role: "StaticText", name: "and share your research" },
            {
              nodeId: "26",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "13",
              tagName: "li",
              childIds: ["27", "28", "29", "30"],
            },
            { nodeId: "27", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "28",
              ignored: false,
              role: "link",
              name: "propose a change on GitHub",
              domNodeId: "14",
              tagName: "a",
              properties: { focusable: true },
            },
            { nodeId: "29", ignored: false, role: "StaticText", name: " – read more about " },
            {
              nodeId: "30",
              ignored: false,
              role: "link",
              name: "how to propose changes in GitHub",
              domNodeId: "15",
              tagName: "a",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "list 2 items",
      "• take part in the, 1 of 2",
      "link, ‘Date input’ discussion on GitHub",
      "and share your research",
      "•, 2 of 2",
      "link, propose a change on GitHub",
      "– read more about",
      "link, how to propose changes in GitHub",
      "end of list",
    ],
  );
});

test("scanSubtree does not use plain text marker prefix without the AX marker contract", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li
          data-sr-marker-content="normal"
          data-sr-marker-display="inline-block"
          data-sr-marker-list-style-type="disc"
        >Plain marker text</li>
      </ul>
    `),
    [
      "list 1 item",
      "Plain marker text",
      "end of list",
    ],
  );
});

test("scanSubtree uses saved rendered marker metadata for plain native list items", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li
          data-sr-marker-content="normal"
          data-sr-marker-display="inline-block"
          data-sr-marker-list-style-type='"• "'
        >Ask questions and find answers.</li>
        <li
          data-sr-marker-content="normal"
          data-sr-marker-display="inline-block"
          data-sr-marker-list-style-type='"• "'
        >Chat with your content.</li>
        <li
          data-sr-marker-content="normal"
          data-sr-marker-display="inline-block"
          data-sr-marker-list-style-type='"• "'
        >Turn files into project spaces.</li>
      </ul>
    `),
    [
      "list 3 items",
      "• Ask questions and find answers., 1 of 3",
      "Chat with your content., 2 of 3",
      "Turn files into project spaces., 3 of 3",
      "end of list",
    ],
  );
});

test("scanSubtree announces focusable generic descendants in native list items as groups", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li>For 1 person or more</li>
        <li>
          <span aria-hidden="true"><svg role="presentation"></svg></span>
          <span><span tabindex="0" aria-expanded="false">Starts at 3 TB for the team</span></span>
        </li>
        <li>Stay connected across devices</li>
        <li>
          <span aria-hidden="true"><svg role="presentation"></svg></span>
          <span><span tabindex="0" aria-expanded="false">Transfer files up to 100 GB</span></span>
        </li>
      </ul>
    `),
    [
      "list 4 items",
      "For 1 person or more, 1 of 4",
      "Starts at 3 TB for the team, group",
      "Stay connected across devices, 3 of 4",
      "Transfer files up to 100 GB, group",
      "end of list",
    ],
  );

  assert.deepEqual(
    scanHtml(`
      <ul>
        <li>
          <span><span tabindex="0" aria-expanded="false" aria-label="Storage details">Starts at 3 TB for the team</span></span>
        </li>
        <li>
          <span><span tabindex="0" aria-expanded="false" aria-haspopup="dialog">Transfer files up to 100 GB</span></span>
        </li>
      </ul>
    `),
    [
      "list 2 items",
      "Starts at 3 TB for the team, 1 of 2",
      "Transfer files up to 100 GB, 2 of 2",
      "end of list",
    ],
  );
});

test("scanSubtree emits AX-confirmed marker and trailing text for mixed link list items", () => {
  assert.deepEqual(
    scanHtml(
      `
        <ul data-sr-dom-node-id="10">
          <li
            data-sr-dom-node-id="11"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><a href="/alpha" data-sr-dom-node-id="12">Alpha</a> trailing text</li>
        </ul>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "20",
              ignored: false,
              role: "list",
              name: "",
              domNodeId: "10",
              tagName: "ul",
              childIds: ["21"],
            },
            {
              nodeId: "21",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "11",
              tagName: "li",
              childIds: ["22", "23", "24"],
            },
            { nodeId: "22", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "23",
              ignored: false,
              role: "link",
              name: "Alpha",
              domNodeId: "12",
              tagName: "a",
              properties: { focusable: true },
            },
            { nodeId: "24", ignored: false, role: "StaticText", name: " trailing text" },
          ],
        },
      },
    ),
	    [
	      "list 1 item",
	      "•, 1 of 1",
	      "link, Alpha",
	      "• trailing text",
	      "end of list",
	    ],
	  );
	});

	test("scanSubtree splits AX-confirmed ordered markers before link list item content", () => {
	  assert.deepEqual(
	    scanHtml(
	      `
	        <ol data-sr-dom-node-id="10">
	          <li
	            data-sr-dom-node-id="11"
	            data-sr-marker-content="normal"
	            data-sr-marker-display="inline-block"
	            data-sr-marker-list-style-type="decimal"
	          ><a href="/buy" data-sr-dom-node-id="12">Buying your postage</a></li>
	          <li
	            data-sr-dom-node-id="13"
	            data-sr-marker-content="normal"
	            data-sr-marker-display="inline-block"
	            data-sr-marker-list-style-type="decimal"
	          ><a href="/print" data-sr-dom-node-id="14">Print your label</a></li>
	        </ol>
	      `,
	      {
	        accessibilityTree: {
	          nodes: [
	            {
	              nodeId: "20",
	              ignored: false,
	              role: "list",
	              name: "",
	              domNodeId: "10",
	              tagName: "ol",
	              childIds: ["21", "24"],
	            },
	            {
	              nodeId: "21",
	              ignored: false,
	              role: "listitem",
	              name: "",
	              domNodeId: "11",
	              tagName: "li",
	              childIds: ["22", "23"],
	            },
	            { nodeId: "22", ignored: false, role: "ListMarker", name: "1. " },
	            {
	              nodeId: "23",
	              ignored: false,
	              role: "link",
	              name: "Buying your postage",
	              domNodeId: "12",
	              tagName: "a",
	              properties: { focusable: true },
	            },
	            {
	              nodeId: "24",
	              ignored: false,
	              role: "listitem",
	              name: "",
	              domNodeId: "13",
	              tagName: "li",
	              childIds: ["25", "26"],
	            },
	            { nodeId: "25", ignored: false, role: "ListMarker", name: "2. " },
	            {
	              nodeId: "26",
	              ignored: false,
	              role: "link",
	              name: "Print your label",
	              domNodeId: "14",
	              tagName: "a",
	              properties: { focusable: true },
	            },
	          ],
	        },
	      },
	    ),
	    [
	      "list 2 items",
	      "1.",
	      "link, Buying your postage",
	      "2.",
	      "link, Print your label",
	      "end of list",
	    ],
	  );
	});

	test("scanSubtree keeps AX-confirmed ordered plain text marker and item text together", () => {
	  assert.deepEqual(
	    scanHtml(
	      `
	        <ol data-sr-dom-node-id="10">
	          <li
	            data-sr-dom-node-id="11"
	            data-sr-marker-content="normal"
	            data-sr-marker-display="inline-block"
	            data-sr-marker-list-style-type="decimal"
	          >Pick up or print out a swap out form</li>
	          <li
	            data-sr-dom-node-id="12"
	            data-sr-marker-content="normal"
	            data-sr-marker-display="inline-block"
	            data-sr-marker-list-style-type="decimal"
	          >Complete your form</li>
	        </ol>
	      `,
	      {
	        accessibilityTree: {
	          nodes: [
	            {
	              nodeId: "20",
	              ignored: false,
	              role: "list",
	              name: "",
	              domNodeId: "10",
	              tagName: "ol",
	              childIds: ["21", "24"],
	            },
	            {
	              nodeId: "21",
	              ignored: false,
	              role: "listitem",
	              name: "",
	              domNodeId: "11",
	              tagName: "li",
	              childIds: ["22", "23"],
	            },
	            { nodeId: "22", ignored: false, role: "ListMarker", name: "1. " },
	            {
	              nodeId: "23",
	              ignored: false,
	              role: "StaticText",
	              name: "Pick up or print out a swap out form",
	            },
	            {
	              nodeId: "24",
	              ignored: false,
	              role: "listitem",
	              name: "",
	              domNodeId: "12",
	              tagName: "li",
	              childIds: ["25", "26"],
	            },
	            { nodeId: "25", ignored: false, role: "ListMarker", name: "2. " },
	            {
	              nodeId: "26",
	              ignored: false,
	              role: "StaticText",
	              name: "Complete your form",
	            },
	          ],
	        },
	      },
	    ),
	    [
	      "list 2 items",
	      "1. Pick up or print out a swap out form, 1 of 2",
	      "2. Complete your form, 2 of 2",
	      "end of list",
	    ],
	  );
	});

	test("scanSubtree keeps simple AX-confirmed bullet leading text with its marker before a link", () => {
	  assert.deepEqual(
	    scanHtml(
	      `
	        <ul data-sr-dom-node-id="10">
	          <li
	            data-sr-dom-node-id="11"
	            data-sr-marker-content="normal"
	            data-sr-marker-display="inline-block"
	            data-sr-marker-list-style-type="disc"
	          >13 January - <a href="/issue" data-sr-dom-node-id="12">Stranger Things</a></li>
	        </ul>
	      `,
	      {
	        accessibilityTree: {
	          nodes: [
	            {
	              nodeId: "20",
	              ignored: false,
	              role: "list",
	              name: "",
	              domNodeId: "10",
	              tagName: "ul",
	              childIds: ["21"],
	            },
	            {
	              nodeId: "21",
	              ignored: false,
	              role: "listitem",
	              name: "",
	              domNodeId: "11",
	              tagName: "li",
	              childIds: ["22", "23", "24"],
	            },
	            { nodeId: "22", ignored: false, role: "ListMarker", name: "• " },
	            {
	              nodeId: "23",
	              ignored: false,
	              role: "StaticText",
	              name: "13 January - ",
	            },
	            {
	              nodeId: "24",
	              ignored: false,
	              role: "link",
	              name: "Stranger Things",
	              domNodeId: "12",
	              tagName: "a",
	              properties: { focusable: true },
	            },
	          ],
	        },
	      },
	    ),
	    [
	      "list 1 item",
	      "• 13 January -, 1 of 1",
	      "link, Stranger Things",
	      "end of list",
	    ],
	  );
	});

test("scanSubtree emits AX-confirmed marker-only stops before link list item content", () => {
  assert.deepEqual(
    scanHtml(
      `
        <ul data-sr-dom-node-id="10">
          <li
            data-sr-dom-node-id="11"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline"
            data-sr-marker-list-style-type="square"
          ><strong data-sr-dom-node-id="12">English (original)</strong></li>
          <li
            data-sr-dom-node-id="13"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline"
            data-sr-marker-list-style-type="square"
          ><a href="/cs" data-sr-dom-node-id="14">Čeština</a></li>
          <li
            data-sr-dom-node-id="15"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline"
            data-sr-marker-list-style-type="square"
          ><a href="/es" data-sr-dom-node-id="16">Español</a></li>
        </ul>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "20",
              ignored: false,
              role: "list",
              name: "",
              domNodeId: "10",
              tagName: "ul",
              childIds: ["21", "24", "27"],
            },
            {
              nodeId: "21",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "11",
              tagName: "li",
              childIds: ["22", "23"],
            },
            { nodeId: "22", ignored: false, role: "ListMarker", name: "■ " },
            {
              nodeId: "23",
              ignored: false,
              role: "strong",
              name: "",
              domNodeId: "12",
              tagName: "strong",
              childIds: ["32"],
            },
            { nodeId: "32", ignored: false, role: "StaticText", name: "English (Original)" },
            {
              nodeId: "24",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "13",
              tagName: "li",
              childIds: ["25", "26"],
            },
            { nodeId: "25", ignored: false, role: "ListMarker", name: "■ " },
            {
              nodeId: "26",
              ignored: false,
              role: "link",
              name: "Čeština",
              domNodeId: "14",
              tagName: "a",
              properties: { focusable: true },
            },
            {
              nodeId: "27",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "15",
              tagName: "li",
              childIds: ["28", "29"],
            },
            { nodeId: "28", ignored: false, role: "ListMarker", name: "■ " },
            {
              nodeId: "29",
              ignored: false,
              role: "link",
              name: "Español",
              domNodeId: "16",
              tagName: "a",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "list 3 items",
      "•, 1 of 3",
      "English (Original)",
      "•, 2 of 3",
      "link, Čeština",
      "•, 3 of 3",
      "link, Español",
      "end of list",
    ],
  );
});

test("scanSubtree emits marker-only stops for AX-confirmed two-link comma list items", () => {
  assert.deepEqual(
    scanHtml(
      `
        <ul data-sr-dom-node-id="10">
          <li
            data-sr-dom-node-id="11"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><a href="/quick" data-sr-dom-node-id="12">How to Meet WCAG 2</a></li>
          <li
            data-sr-dom-node-id="13"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><a href="/standard" data-sr-dom-node-id="14">WCAG 2.2 Standard</a>, <a href="/new" data-sr-dom-node-id="15">What’s New in WCAG 2.2</a></li>
          <li
            data-sr-dom-node-id="16"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><a href="/old-standard" data-sr-dom-node-id="17">WCAG 2.1 Standard</a></li>
        </ul>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "20",
              ignored: false,
              role: "list",
              name: "",
              domNodeId: "10",
              tagName: "ul",
              childIds: ["21", "24", "29"],
            },
            {
              nodeId: "21",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "11",
              tagName: "li",
              childIds: ["22", "23"],
            },
            { nodeId: "22", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "23",
              ignored: false,
              role: "link",
              name: "How to Meet WCAG 2",
              domNodeId: "12",
              tagName: "a",
              properties: { focusable: true },
            },
            {
              nodeId: "24",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "13",
              tagName: "li",
              childIds: ["25", "26", "27", "28"],
            },
            { nodeId: "25", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "26",
              ignored: false,
              role: "link",
              name: "WCAG 2.2 Standard",
              domNodeId: "14",
              tagName: "a",
              properties: { focusable: true },
            },
            { nodeId: "27", ignored: false, role: "StaticText", name: ", " },
            {
              nodeId: "28",
              ignored: false,
              role: "link",
              name: "What’s New in WCAG 2.2",
              domNodeId: "15",
              tagName: "a",
              properties: { focusable: true },
            },
            {
              nodeId: "29",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "16",
              tagName: "li",
              childIds: ["30", "31"],
            },
            { nodeId: "30", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "31",
              ignored: false,
              role: "link",
              name: "WCAG 2.1 Standard",
              domNodeId: "17",
              tagName: "a",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "list 3 items",
      "•, 1 of 3",
      "link, How to Meet WCAG 2",
      "•, 2 of 3",
      "link, WCAG 2.2 Standard",
      "link, What’s New in WCAG 2.2",
      "•, 3 of 3",
      "link, WCAG 2.1 Standard",
      "end of list",
    ],
  );
});

test("scanSubtree keeps strong-plus-link list items out of marker-only stops", () => {
  const announcements = scanHtml(
    `
      <ul data-sr-dom-node-id="10">
        <li
          data-sr-dom-node-id="11"
          data-sr-marker-content="normal"
          data-sr-marker-display="inline-block"
          data-sr-marker-list-style-type="disc"
        ><strong data-sr-dom-node-id="12">WCAG 2 coverage of <a href="/mobile" data-sr-dom-node-id="13">mobile accessibility</a></strong></li>
      </ul>
    `,
    {
      accessibilityTree: {
        nodes: [
          {
            nodeId: "20",
            ignored: false,
            role: "list",
            name: "",
            domNodeId: "10",
            tagName: "ul",
            childIds: ["21"],
          },
          {
            nodeId: "21",
            ignored: false,
            role: "listitem",
            name: "",
            domNodeId: "11",
            tagName: "li",
            childIds: ["22", "23", "24"],
          },
          { nodeId: "22", ignored: false, role: "ListMarker", name: "• " },
          {
            nodeId: "23",
            ignored: false,
            role: "strong",
            name: "",
            domNodeId: "12",
            tagName: "strong",
          },
          {
            nodeId: "24",
            ignored: false,
            role: "link",
            name: "mobile accessibility",
            domNodeId: "13",
            tagName: "a",
            properties: { focusable: true },
          },
        ],
      },
    },
  );

  assert.equal(announcements.includes("•, 1 of 1"), false);
});

test("scanSubtree splits AX-confirmed marker strong text-link list items", () => {
  assert.deepEqual(
    scanHtml(
      `
        <ul data-sr-dom-node-id="10">
          <li
            data-sr-dom-node-id="11"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><strong data-sr-dom-node-id="12">WCAG 2 coverage of <a href="/mobile" data-sr-dom-node-id="13">mobile accessibility</a></strong></li>
          <li
            data-sr-dom-node-id="14"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><strong data-sr-dom-node-id="15">applying WCAG 2 to <a href="/documents" data-sr-dom-node-id="16">documents and software</a></strong></li>
          <li
            data-sr-dom-node-id="17"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          >and more...</li>
        </ul>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "20",
              ignored: false,
              role: "list",
              name: "",
              domNodeId: "10",
              tagName: "ul",
              childIds: ["21", "25", "29"],
            },
            {
              nodeId: "21",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "11",
              tagName: "li",
              childIds: ["22", "23"],
            },
            { nodeId: "22", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "23",
              ignored: false,
              role: "strong",
              name: "",
              domNodeId: "12",
              tagName: "strong",
              childIds: ["24", "40"],
            },
            { nodeId: "24", ignored: false, role: "StaticText", name: "WCAG 2 coverage of " },
            {
              nodeId: "40",
              ignored: false,
              role: "link",
              name: "mobile accessibility",
              domNodeId: "13",
              tagName: "a",
              properties: { focusable: true },
            },
            {
              nodeId: "25",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "14",
              tagName: "li",
              childIds: ["26", "27"],
            },
            { nodeId: "26", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "27",
              ignored: false,
              role: "strong",
              name: "",
              domNodeId: "15",
              tagName: "strong",
              childIds: ["28", "41"],
            },
            { nodeId: "28", ignored: false, role: "StaticText", name: "applying WCAG 2 to " },
            {
              nodeId: "41",
              ignored: false,
              role: "link",
              name: "documents and software",
              domNodeId: "16",
              tagName: "a",
              properties: { focusable: true },
            },
            {
              nodeId: "29",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "17",
              tagName: "li",
              childIds: ["30", "31"],
            },
            { nodeId: "30", ignored: false, role: "ListMarker", name: "• " },
            { nodeId: "31", ignored: false, role: "StaticText", name: "and more..." },
          ],
        },
      },
    ),
    [
      "list 3 items",
      "•, 1 of 3",
      "WCAG 2 coverage of",
      "link, mobile accessibility",
      "•, 2 of 3",
      "applying WCAG 2 to",
      "link, documents and software",
      "• and more..., 3 of 3",
      "end of list",
    ],
  );
});

test("scanSubtree keeps footer inline link punctuation from crossing AX boundaries", () => {
  assert.deepEqual(
    scanHtml(
      `
        <footer aria-label="Page" data-sr-dom-node-id="footer">
          <p data-sr-dom-node-id="updated">
            <strong data-sr-dom-node-id="updated-label">Updated:</strong>
            26 May 2026.
            <a href="/changes" data-sr-dom-node-id="changes-link">Latest changes</a>.<br data-sr-dom-node-id="updated-break">
            First published July 2005.
          </p>
          <p data-sr-dom-node-id="editor">
            <strong data-sr-dom-node-id="editor-label">Editor:</strong><a href="/people/shawn" data-sr-dom-node-id="editor-link">Shawn Lawton Henry</a>.
          </p>
          <p data-sr-dom-node-id="input">
            Developed with input from the Accessibility Guidelines Working Group (<a href="/agwg" data-sr-dom-node-id="agwg-link">AG WG</a>).
          </p>
        </footer>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "footer",
              ignored: false,
              role: "contentinfo",
              name: "Page",
              domNodeId: "footer",
              tagName: "footer",
              childIds: ["updated", "editor", "input"],
            },
            {
              nodeId: "updated",
              ignored: false,
              role: "paragraph",
              name: "",
              domNodeId: "updated",
              tagName: "p",
              childIds: ["updated-strong", "updated-date", "changes", "changes-period", "break", "published"],
            },
            {
              nodeId: "updated-strong",
              ignored: false,
              role: "strong",
              name: "",
              domNodeId: "updated-label",
              tagName: "strong",
              childIds: ["updated-label-text"],
            },
            { nodeId: "updated-label-text", ignored: false, role: "StaticText", name: "Updated:" },
            { nodeId: "updated-date", ignored: false, role: "StaticText", name: " 26 May 2026. " },
            {
              nodeId: "changes",
              ignored: false,
              role: "link",
              name: "Latest changes",
              domNodeId: "changes-link",
              tagName: "a",
              properties: { focusable: true },
            },
            { nodeId: "changes-period", ignored: false, role: "StaticText", name: "." },
            {
              nodeId: "break",
              ignored: false,
              role: "LineBreak",
              name: "\\n",
              domNodeId: "updated-break",
              tagName: "br",
            },
            { nodeId: "published", ignored: false, role: "StaticText", name: " First published July 2005." },
            {
              nodeId: "editor",
              ignored: false,
              role: "paragraph",
              name: "",
              domNodeId: "editor",
              tagName: "p",
              childIds: ["editor-strong", "editor-space", "editor-link", "editor-period"],
            },
            {
              nodeId: "editor-strong",
              ignored: false,
              role: "strong",
              name: "",
              domNodeId: "editor-label",
              tagName: "strong",
              childIds: ["editor-label-text"],
            },
            { nodeId: "editor-label-text", ignored: false, role: "StaticText", name: "Editor:" },
            { nodeId: "editor-space", ignored: false, role: "StaticText", name: " " },
            {
              nodeId: "editor-link",
              ignored: false,
              role: "link",
              name: "Shawn Lawton Henry",
              domNodeId: "editor-link",
              tagName: "a",
              properties: { focusable: true },
            },
            { nodeId: "editor-period", ignored: false, role: "StaticText", name: "." },
            {
              nodeId: "input",
              ignored: false,
              role: "paragraph",
              name: "",
              domNodeId: "input",
              tagName: "p",
              childIds: ["input-text", "agwg", "input-tail"],
            },
            {
              nodeId: "input-text",
              ignored: false,
              role: "StaticText",
              name: "Developed with input from the Accessibility Guidelines Working Group (",
            },
            {
              nodeId: "agwg",
              ignored: false,
              role: "link",
              name: "AG WG",
              domNodeId: "agwg-link",
              tagName: "a",
              properties: { focusable: true },
            },
            { nodeId: "input-tail", ignored: false, role: "StaticText", name: ")." },
          ],
        },
      },
    ),
    [
      "Page, footer",
      "Updated:",
      "26 May 2026.",
      "link, Latest changes",
      "First published July 2005.",
      "Editor:",
      "link, Shawn Lawton Henry",
      "Developed with input from the Accessibility Guidelines Working Group (",
      "link, AG WG",
      "end of, Page, footer",
    ],
  );
});

test("scanSubtree splits AX-confirmed publication list marker link text boundaries", () => {
  assert.deepEqual(
    scanHtml(
      `
        <ul data-sr-dom-node-id="10">
          <li
            data-sr-dom-node-id="11"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><a href="/wcag20" data-sr-dom-node-id="12">WCAG 2.0</a> was published on 11 December 2008.</li>
          <li
            data-sr-dom-node-id="13"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><a href="/wcag21" data-sr-dom-node-id="14">WCAG 2.1</a> was published on <a href="/tr/wcag21" data-sr-dom-node-id="15">5 June 2018 at https://www.w3.org/TR/2018/REC-WCAG21-20180605/</a>, and updates were published on 21 September 2023.</li>
          <li
            data-sr-dom-node-id="16"
            data-sr-marker-content="normal"
            data-sr-marker-display="inline-block"
            data-sr-marker-list-style-type="disc"
          ><strong data-sr-dom-node-id="17"><a href="/wcag22" data-sr-dom-node-id="18">WCAG 2.2</a></strong> was published on 5 October 2023.</li>
        </ul>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "20",
              ignored: false,
              role: "list",
              name: "",
              domNodeId: "10",
              tagName: "ul",
              childIds: ["21", "24", "30"],
            },
            {
              nodeId: "21",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "11",
              tagName: "li",
              childIds: ["22", "23", "40"],
            },
            { nodeId: "22", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "23",
              ignored: false,
              role: "link",
              name: "WCAG 2.0",
              domNodeId: "12",
              tagName: "a",
              properties: { focusable: true },
            },
            { nodeId: "40", ignored: false, role: "StaticText", name: " was published on 11 December 2008." },
            {
              nodeId: "24",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "13",
              tagName: "li",
              childIds: ["25", "26", "27", "28", "29"],
            },
            { nodeId: "25", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "26",
              ignored: false,
              role: "link",
              name: "WCAG 2.1",
              domNodeId: "14",
              tagName: "a",
              properties: { focusable: true },
            },
            { nodeId: "27", ignored: false, role: "StaticText", name: " was published on " },
            {
              nodeId: "28",
              ignored: false,
              role: "link",
              name: "5 June 2018 at https://www.w3.org/TR/2018/REC-WCAG21-20180605/",
              domNodeId: "15",
              tagName: "a",
              properties: { focusable: true },
            },
            {
              nodeId: "29",
              ignored: false,
              role: "StaticText",
              name: ", and updates were published on 21 September 2023.",
            },
            {
              nodeId: "30",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "16",
              tagName: "li",
              childIds: ["31", "32", "34"],
            },
            { nodeId: "31", ignored: false, role: "ListMarker", name: "• " },
            {
              nodeId: "32",
              ignored: false,
              role: "strong",
              name: "",
              domNodeId: "17",
              tagName: "strong",
              childIds: ["33"],
            },
            {
              nodeId: "33",
              ignored: false,
              role: "link",
              name: "WCAG 2.2",
              domNodeId: "18",
              tagName: "a",
              properties: { focusable: true },
            },
            { nodeId: "34", ignored: false, role: "StaticText", name: " was published on 5 October 2023." },
          ],
        },
      },
    ),
    [
      "list 3 items",
      "•, 1 of 3",
      "link, WCAG 2.0",
      "• was published on 11 December 2008.",
      "•, 2 of 3",
      "link, WCAG 2.1",
      "was published on",
      "link, 5 June 2018 at https://www.w3.org/TR/2018/REC-WCAG21-20180605/",
      ", and updates were published on 21 September 2023.",
      "•, 3 of 3",
      "link, WCAG 2.2",
      "• was published on 5 October 2023.",
      "end of list",
    ],
  );
});

test("scanSubtree splits AX-confirmed contribution list items", () => {
  assert.deepEqual(
    scanHtml(
      `
        <ul data-sr-dom-node-id="10">
          <li data-sr-dom-node-id="11">
            <span data-sr-dom-node-id="12"><a href="https://example.test/repo" data-sr-dom-node-id="13">org/repo</a></span>
            <time data-sr-dom-node-id="14">2 days ago</time>
            <div data-sr-dom-node-id="15"><a href="https://example.test/pull/1" data-sr-dom-node-id="16">Document a web API</a></div>
          </li>
          <li data-sr-dom-node-id="17">
            <span data-sr-dom-node-id="18"><a href="https://example.test/repo" data-sr-dom-node-id="19">org/repo</a></span>
            <time data-sr-dom-node-id="20">1 hour ago</time>
            <div data-sr-dom-node-id="21"><a href="https://example.test/pull/2" data-sr-dom-node-id="22">Fix redirect handling</a></div>
          </li>
        </ul>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "30",
              ignored: false,
              role: "list",
              name: "",
              domNodeId: "10",
              tagName: "ul",
              childIds: ["31", "37"],
            },
            {
              nodeId: "31",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "11",
              tagName: "li",
              childIds: ["32", "33", "34"],
            },
            {
              nodeId: "32",
              ignored: false,
              role: "link",
              name: "org/repo (external)",
              domNodeId: "13",
              tagName: "a",
              properties: { focusable: true },
            },
            {
              nodeId: "33",
              ignored: false,
              role: "time",
              name: "",
              domNodeId: "14",
              tagName: "time",
              childIds: ["35"],
            },
            {
              nodeId: "34",
              ignored: false,
              role: "generic",
              name: "",
              domNodeId: "15",
              tagName: "div",
              childIds: ["36"],
            },
            { nodeId: "35", ignored: false, role: "StaticText", name: "2 days ago" },
            {
              nodeId: "36",
              ignored: false,
              role: "link",
              name: "Document a web API (external)",
              domNodeId: "16",
              tagName: "a",
              properties: { focusable: true },
            },
            {
              nodeId: "37",
              ignored: false,
              role: "listitem",
              name: "",
              domNodeId: "17",
              tagName: "li",
              childIds: ["38", "39", "40"],
            },
            {
              nodeId: "38",
              ignored: false,
              role: "link",
              name: "org/repo (external)",
              domNodeId: "19",
              tagName: "a",
              properties: { focusable: true },
            },
            {
              nodeId: "39",
              ignored: false,
              role: "time",
              name: "",
              domNodeId: "20",
              tagName: "time",
              childIds: ["41"],
            },
            {
              nodeId: "40",
              ignored: false,
              role: "generic",
              name: "",
              domNodeId: "21",
              tagName: "div",
              childIds: ["42"],
            },
            { nodeId: "41", ignored: false, role: "StaticText", name: "1 hour ago" },
            {
              nodeId: "42",
              ignored: false,
              role: "link",
              name: "Fix redirect handling (external)",
              domNodeId: "22",
              tagName: "a",
              properties: { focusable: true },
            },
          ],
        },
      },
    ),
    [
      "list 2 items",
      "link, org/repo (external), 1 of 2",
      "2 days ago",
      "link, Document a web API (external)",
      "link, org/repo (external), 2 of 2",
      "1 hour ago",
      "link, Fix redirect handling (external)",
      "end of list",
    ],
  );
});

test("scanSubtree uses focused marker formatting for non-interactive 11-item disc link lists", () => {
  const items = Array.from({ length: 11 }, (_, index) => `
    <li
      data-sr-marker-content="normal"
      data-sr-marker-display="inline-block"
      data-sr-marker-list-style-type="disc"
    ><a href="/resource-${index + 1}">Resource ${String(index + 1).padStart(2, "0")}</a></li>
  `).join("");

  assert.deepEqual(
    scanHtml(`
      <section aria-labelledby="resources-title">
        <h2 id="resources-title"><span>Resources for: </span><span>Choose a topic</span></h2>
        <ul>${items}</ul>
      </section>
    `),
    [
      "Resources for: Choose a topic, region",
      "heading level 2 Resources for:, level 1 Choose a topic, level 1, 2 items",
      "list 11 items",
      "•,1 of11",
      "link, Resource 01",
      "•,2 of11",
      "link, Resource 02",
      "•,3 of 11",
      "link, Resource 03",
      "•, 4 of11",
      "link, Resource 04",
      "•,5 of 11",
      "link, Resource 05",
      "., 6 of 11",
      "link, Resource 06",
      ".,7 of 11",
      "link, Resource 07",
      "•,8 of 11",
      "link, Resource 08",
      "•, 9 of11",
      "link, Resource 09",
      "•,10 of 11",
      "link, Resource 10",
      "•, 11 of 11",
      "link, Resource 11",
      "end of list",
      "end of, Resources for: Choose a topic, region",
    ],
  );
});

test("scanSubtree suppresses product card CTA link positions", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li>
          <h3>Samsung Galaxy A37 5G</h3>
          <p>Pair with 50GB for £12 a month.</p>
          <a aria-label="View Samsung Galaxy deal" href="/shop/mobile/samsung">View deal</a>
        </li>
        <li>
          <h3>iPhone 16e</h3>
          <p>Pair with 50GB for £10 a month.</p>
          <a aria-label="View iPhone 16e deal" href="/shop/mobile/iphone">View deal</a>
        </li>
      </ul>
    `),
    [
      "list 2 items",
      "heading level 3, Samsung Galaxy A37 5G, 1 of 2",
      "Pair with 50GB for £12 a month.",
      "link, View Samsung Galaxy deal",
      "heading level 3, iPhone 16e, 2 of 2",
      "Pair with 50GB for £10 a month.",
      "link, View iPhone 16e deal",
      "end of list",
    ],
  );
});

test("scanSubtree keeps list positions on single-link card list items with pre-heading images", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2 id="news-heading">Latest articles</h2>
        <div role="group" aria-labelledby="news-heading">
          <ul role="list">
            <li role="listitem">
              <a aria-label="First story - News - Jan 1" href="/first">
                <div><img alt=""></div>
                <div>
                  <p>News</p>
                  <h3>First story</h3>
                  <p>Jan 1</p>
                </div>
              </a>
            </li>
            <li role="listitem">
              <a aria-label="Second story - Feature - Jan 2" href="/second">
                <div><img alt=""></div>
                <div>
                  <p>Feature</p>
                  <h3>Second story</h3>
                  <p>Jan 2</p>
                </div>
              </a>
            </li>
          </ul>
        </div>
      </section>
    `),
    [
      "heading level 2, Latest articles",
      "Latest articles, group",
      "list 2 items",
      "link, heading level 3, First story - News - Jan 1, 1 of 2",
      "link, heading level 3, Second story - Feature - Jan 2, 2 of 2",
      "end of list",
      "end of, Latest articles, group",
    ],
  );
});

test("scanSubtree traverses structured article cards through headline links and metadata values", () => {
  assert.deepEqual(
    scanHtml(`
      <section>
        <h2>Features</h2>
        <ul role="list">
          <li>
            <div>
              <a href="/first"><span role="text"><p>First feature headline</p></span></a>
              <p>First feature summary.</p>
              <ul role="list">
                <li role="listitem">
                  <div>Attribution</div>
                  <div><a href="/section">Weather</a></div>
                </li>
                <div>
                  <li role="listitem">
                    <div>Posted</div>
                    <div><span>8 hours ago</span></div>
                  </li>
                  <li role="listitem">
                    <div>Comments</div>
                    <div><a href="/first#comments">3050</a></div>
                  </li>
                </div>
              </ul>
            </div>
          </li>
          <li>
            <div>
              <a href="/second"><span role="text"><p>Second feature headline</p></span></a>
              <p>Second feature summary.</p>
              <ul role="list">
                <li role="listitem">
                  <div>Attribution</div>
                  <div><a href="/section">Weather</a></div>
                </li>
                <div>
                  <li role="listitem">
                    <div>Posted</div>
                    <div><span>10 hours ago</span></div>
                  </li>
                </div>
              </ul>
            </div>
          </li>
        </ul>
      </section>
    `),
    [
      "heading level 2, Features",
      "list 2 items",
      "link, First feature headline, 1 of 2",
      "First feature summary.",
      "list 3 items, level 2",
      "Attribution, 1 of 3",
      "link, Weather",
      "Posted, 2 of 3",
      "8 hours ago",
      "Comments, 3 of 3",
      "link, 3050",
      "end of list",
      "link, Second feature headline, 2 of 2",
      "Second feature summary.",
      "list 2 items, level 2",
      "Attribution, 1 of 2",
      "link, Weather",
      "Posted, 2 of 2",
      "10 hours ago",
      "end of list",
      "end of list",
    ],
  );
});

test("scanSubtree names semantic articles from first headings and splits direct inline article links", () => {
  assert.deepEqual(
    scanHtml(`
      <main>
        <article>
          <h3>First story</h3>
          <p><a href="/alpha">Alpha</a> opens the <a href="/beta">Beta (Two)</a>, and <a href="/gamma">Gamma</a>.</p>
        </article>
        <article>
          <p>No heading body.</p>
        </article>
      </main>
    `),
    [
      "main",
      "First story, article",
      "heading level 3, First story",
      "link, Alpha",
      "opens the",
      "link, Beta (Two)",
      ", and",
      "link, Gamma",
      "end of, article",
      "article",
      "No heading body.",
      "end of, article",
      "end of, main",
    ],
  );
});

test("scanSubtree splits heading and body text in structured list items", () => {
  assert.deepEqual(
    scanHtml(`
      <div role="list">
        <div role="listitem">
          <h3>Ultra-reliable Full Fibre broadband</h3>
          <div><span>Take your gaming to the next level.</span></div>
        </div>
        <div role="listitem">
          <h3>Game Changing Speeds</h3>
          <div><span>Speeds up to 5Gbps.</span></div>
        </div>
      </div>
    `),
    [
      "list 2 items",
      "heading level 3, Ultra-reliable Full Fibre broadband, 1 of 2",
      "Take your gaming to the next level.",
      "heading level 3, Game Changing Speeds, 2 of 2",
      "Speeds up to 5Gbps.",
      "end of list",
    ],
  );
});

test("scanSubtree splits text and controls in interactive card list items", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li>
          <div>
            <div>
              <span>Full Fibre 150</span>
              <span>Recommended for streaming.</span>
            </div>
            <button><span>What is Full Fibre?</span><svg aria-hidden="true"></svg></button>
            <button><span>Standard hub</span><svg aria-hidden="true"></svg></button>
            <div><span>£25</span><span>/month</span></div>
            <a href="/check">Check availability</a>
          </div>
        </li>
        <li>
          <div>
            <div><span>Full Fibre 500</span></div>
            <button><span>What is Full Fibre?</span><svg aria-hidden="true"></svg></button>
          </div>
        </li>
      </ul>
    `),
    [
      "list 2 items",
      "Full Fibre 150 Recommended for streaming., 1 of 2",
      "What is Full Fibre?, button, group",
      "Standard hub, button, group",
      "£25/month",
      "link, Check availability",
      "Full Fibre 500, 2 of 2",
      "What is Full Fibre?, button, group",
      "end of list",
    ],
  );
});

test("scanSubtree decomposes rich product cards with feature rows", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li>
          <div>
            <div class="offer-banner"><span>Summer sale - up to 20% off</span></div>
            <p>Broadband Essential</p>
            <p>£21.50</p>
            <p>a month</p>
            <p>24-months contract</p>
            <p>Entry-level broadband for emails and everyday tasks</p>
          </div>
          <div>
            <p>Features included:</p>
            <p><img alt="featureIconIncluded"><span>24/7 Support</span></p>
            <p><img alt="featureIconIncluded"><span>Minimum Speed Guarantee</span></p>
            <p><img alt="featureIconExcluded"><span>4G Backup</span></p>
            <button>Check availability</button>
          </div>
        </li>
        <li>
          <div>
            <div class="offer-banner"><span>Summer sale - up to 20% off</span></div>
            <p>Broadband Advanced</p>
            <p>£31.50</p>
            <p>a month</p>
            <p>24-months contract</p>
            <p>Reliable business broadband with automatic 4G backup</p>
          </div>
          <div>
            <p>Features included:</p>
            <p><img alt="featureIconIncluded"><span>24/7 Support</span></p>
            <p><img alt="featureIconIncluded"><span>Minimum Speed Guarantee</span></p>
            <p><img alt="featureIconIncluded"><span>4G Backup</span></p>
            <button>Check availability</button>
          </div>
        </li>
        <div>Offer terms apply.</div>
      </ul>
    `),
    [
      "list 3 items",
      "Summer sale - up to 20% off, 1 of 3",
      "Broadband Essential",
      "£21.50",
      "a month",
      "24-months contract",
      "Entry-level broadband for emails and everyday tasks",
      "list item",
      "Features included:",
      "featureIconIncluded, image",
      "24/7 Support",
      "featureIconIncluded, image",
      "Minimum Speed Guarantee",
      "featureIconExcluded, image",
      "4G Backup",
      "Check availability, button",
      "Summer sale - up to 20% off, 2 of 3",
      "Broadband Advanced",
      "£31.50",
      "a month",
      "24-months contract",
      "Reliable business broadband with automatic 4G backup",
      "Features included:",
      "featureIconIncluded, image",
      "24/7 Support",
      "featureIconIncluded, image",
      "Minimum Speed Guarantee",
      "featureIconIncluded, image",
      "4G Backup",
      "Check availability, button",
      "Offer terms apply.",
      "end of list",
    ],
  );
});

test("scanSubtree announces focusable custom tooltip triggers as groups", () => {
  assert.deepEqual(
    scanHtml(`
      <c-product-tooltip>
        <template shadowrootmode="open">
          <div>
            <span class="slds-button" tabindex="0">More about these features</span>
          </div>
        </template>
      </c-product-tooltip>
    `),
    ["More about these features, group"],
  );
});

test("scanSubtree ends articles before following informative unlabeled CMS images", () => {
  assert.deepEqual(
    scanHtml(`
      <c-product-selection>
        <template shadowrootmode="open">
          <article>
            <p>Package prices based on 76 Mb/s download speed</p>
          </article>
        </template>
      </c-product-selection>
      <c-omni-side-by-side>
        <template shadowrootmode="open">
          <div>
            <h3 class="slds-hide_medium">Switch with confidence</h3>
            <img src="https://business.sky.com/cms/delivery/media/MCZQVPUVZFVRFHRPEDMQLSJCGTUU">
            <h3 class="slds-show_medium">Switch with confidence</h3>
            <ul>
              <li>From the second you sign up.</li>
            </ul>
          </div>
        </template>
      </c-omni-side-by-side>
    `),
    [
      "article",
      "Package prices based on 76 Mb/s download speed",
      "end of, article",
      "/MCZQVPUVZFVRFHRPEDMQLSJCGTUU, Unlabeled image",
      "heading level 3, Switch with confidence",
      "list 1 item",
      "From the second you sign up.",
      "end of list",
    ],
  );
});

test("scanSubtree announces focusable structured list items as grouped cards", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li tabindex="0">
          <div>
            <img alt="">
            <p>Forget app hopping</p>
            <p>Search across your apps in one place. Spend less time app hopping and more time watching.</p>
          </div>
        </li>
        <li tabindex="0">
          <div>
            <h3>Sky Sports</h3>
            <p>All 9 dedicated sports channels, including Premier League, F1 and more. Includes Sky Sports+</p>
            <a href="/sports">Learn more</a>
          </div>
        </li>
        <li tabindex="0">
          <div>
            <h3>Sky Cinema</h3>
            <p>Includes 2 Vue Cinema tickets every month and Paramount+ at no extra cost</p>
            <a href="/cinema">Learn More</a>
          </div>
        </li>
      </ul>
    `),
    [
      "list 3 items",
      "Forget app hopping Search across your apps in one place. Spend less time app hopping and more time watching., group, (1 of 3)",
      "Sky Sports All 9 dedicated sports channels, including Premier League, F1 and more. Includes Sky Sports+ Learn more, group, (2 of 3)",
      "Sky Cinema Includes 2 Vue Cinema tickets every month and Paramount+ at no extra cost Learn More, group, (3 of 3)",
      "end of list",
    ],
  );
});

test("scanSubtree accounts for generated rail pseudo-items in grouped card positions", () => {
  assert.deepEqual(
    scanHtml(`
      <ul data-sr-pseudo-before-layout-item="true" data-sr-pseudo-after-layout-item="true">
        <li tabindex="0">
          <div>
            <img alt="">
            <p>Forget app hopping</p>
            <p>Search across your apps in one place. Spend less time app hopping and more time watching.</p>
          </div>
        </li>
        <li tabindex="0">
          <div>
            <h3>Sky Sports</h3>
            <p>All 9 dedicated sports channels, including Premier League, F1 and more. Includes Sky Sports+</p>
            <a href="/sports">Learn more</a>
          </div>
        </li>
        <li tabindex="0">
          <div>
            <h3>Sky Cinema</h3>
            <p>Includes 2 Vue Cinema tickets every month and Paramount+ at no extra cost</p>
            <a href="/cinema">Learn More</a>
          </div>
        </li>
      </ul>
    `),
    [
      "list 3 items",
      "Forget app hopping Search across your apps in one place. Spend less time app hopping and more time watching., group, (2 of 5)",
      "Sky Sports All 9 dedicated sports channels, including Premier League, F1 and more. Includes Sky Sports+ Learn more, group, (3 of 5)",
      "Sky Cinema Includes 2 Vue Cinema tickets every month and Paramount+ at no extra cost Learn More, group, (4 of 5)",
      "end of list",
    ],
  );
});

test("scanSubtree does not apply generated pseudo-items to ordinary list link positions", () => {
  assert.deepEqual(
    scanHtml(`
      <ul data-sr-pseudo-before-layout-item="true" data-sr-pseudo-after-layout-item="true">
        <li><a href="/one">One</a></li>
        <li><a href="/two">Two</a></li>
      </ul>
    `),
    [
      "list 2 items",
      "link, One, 1 of 2",
      "link, Two, 2 of 2",
      "end of list",
    ],
  );
});

test("scanSubtree includes ARIA tabs and visible tab panel list cards", () => {
  assert.deepEqual(
    scanHtml(`
      <nav role="tablist">
        <button role="tab" aria-selected="true" aria-controls="panel-a" id="tab-a">Sky Entertainment</button>
        <button role="tab" aria-controls="panel-b" id="tab-b">Netflix</button>
      </nav>
      <div role="tabpanel" id="panel-a" aria-labelledby="tab-a">
        <ul>
          <li tabindex="0"><img alt="The Dyers' Caravan Park"></li>
          <li tabindex="0"><img alt="Watson"></li>
        </ul>
      </div>
      <div role="tabpanel" id="panel-b" aria-labelledby="tab-b" aria-hidden="true">
        <ul><li tabindex="0"><img alt="Hidden title"></li></ul>
      </div>
    `),
    [
      "Sky Entertainment, selected, tab, 1 of 2",
      "Netflix, tab, 2 of 2",
      "Sky Entertainment, tab panel",
      "list 2 items",
      "The Dyers' Caravan Park, group, (1 of 2)",
      "Watson, group, (2 of 2)",
      "end of list",
      "end of, Sky Entertainment, tab panel",
    ],
  );
});

test("scanSubtree splits paragraph text blocks in list items", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li>
          <img alt="">
          <p>Watch on the go</p>
          <div><p>Watch on any device with the Sky Go app</p></div>
        </li>
        <li>
          <img alt="">
          <p>Award-winning</p>
          <div><p>Content and service people love and trust</p></div>
        </li>
      </ul>
    `),
    [
      "list 2 items",
      "Watch on the go, 1 of 2",
      "Watch on any device with the Sky Go app",
      "Award-winning, 2 of 2",
      "Content and service people love and trust",
      "end of list",
    ],
  );
});

test("scanSubtree preserves wrapped heading line-break fragments", () => {
  assert.deepEqual(
    scanHtml(`
      <h1><div>The new <br><span>Product TV</span></div></h1>
      <h4><div>Plan for <br><span>£5 a month</span></div></h4>
    `),
    [
      "heading level 1 The new Product TV, 2 items",
      "heading level 4, Plan for £5 a month",
    ],
  );
});

test("scanSubtree splits generic inline emphasis text boundaries", () => {
  assert.deepEqual(
    scanHtml(`
      <div>for 48 months 0% interest or <strong>£309</strong></div>
      <div><strong>150</strong> Mbps avg. speed</div>
    `),
    [
      "for 48 months 0% interest or",
      "£309",
      "150",
      "Mbps avg. speed",
    ],
  );
});

test("scanSubtree merges adjacent colon label and value paragraphs", () => {
  assert.deepEqual(
    scanHtml(`
      <div class="custom-box">
        <p class="bos-text_body-sml slds-size_10-of-12 slds-medium-size_8-of-12 slds-align_absolute-center bos-text-medium slds-text-align_center slds-m-top_large">Speeds suitable for:\u200b</p>
        <p class="bos-text_body-sml slds-size_10-of-12 slds-medium-size_8-of-12 slds-align_absolute-center slds-p-bottom_large slds-text-align_center">Emails, browsing and card payments. Upgrade to 150Mbps for video calls, cloud apps and everyday business tasks.</p>
      </div>
    `),
    [
      "Speeds suitable for:Emails, browsing and card payments. Upgrade to 150Mbps for video calls, cloud apps and everyday business tasks.",
    ],
  );
});

test("scanSubtree preserves explicit wbr boundaries in link names", () => {
  assert.deepEqual(
    scanHtml(`
      <nav aria-label="Main">
        <ul>
          <li><a href="/standards-guidelines/"><span>Standards/<wbr>Guidelines</span></a></li>
          <li><a href="/plain-slash/">Standards/Guidelines</a></li>
        </ul>
      </nav>
    `),
    [
      "Main, navigation",
      "list 2 items",
      "link, Standards/ Guidelines, 1 of 2",
      "link, Standards/Guidelines, 2 of 2",
      "end of list",
      "end of, Main, navigation",
    ],
  );
});

test("scanSubtree uses AX-confirmed rendered uppercase for generic text stops", () => {
  assert.deepEqual(
    scanHtml(
      `
        <main>
          <span data-sr-dom-node-id="eyebrow">GitHub Actions</span>
          <ul>
            <li data-sr-dom-node-id="copyright-item">
              <time data-sr-dom-node-id="copyright">© 2026 GitHub, Inc.</time>
            </li>
          </ul>
        </main>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "eyebrow",
              role: "StaticText",
              name: "GITHUB ACTIONS",
              domNodeId: "eyebrow",
            },
            {
              nodeId: "copyright",
              role: "StaticText",
              name: "© 2026 GITHUB, INC.",
              domNodeId: "copyright",
            },
          ],
        },
      },
    ),
    [
      "main",
      "GITHUB ACTIONS",
      "list 1 item",
      "© 2026 GITHUB, INC.",
      "end of list",
      "end of, main",
    ],
  );
});

test("scanSubtree does not prefix inline emphasis list-item tail fragments with a marker", () => {
  assert.deepEqual(
    scanHtml(`
      <ul>
        <li><span><em>Want to venture off the beaten path?</em> Use reusable actions from the marketplace.</span></li>
      </ul>
    `),
    [
      "list 1 item",
      "Want to venture off the beaten path?",
      "Use reusable actions from the marketplace.",
      "end of list",
    ],
  );
});

test("scanSubtree suppresses wrapper group stops before standalone card headings", () => {
  assert.deepEqual(
    scanHtml(
      `
        <section>
          <div data-sr-dom-node-id="card">
            <div><h3 data-sr-dom-node-id="heading">Secure package registry for code and workflows</h3></div>
            <div><p>Securely store and manage your code and packages.</p></div>
            <div><a href="/packages">Read the package docs</a></div>
          </div>
        </section>
      `,
      {
        accessibilityTree: {
          nodes: [
            {
              nodeId: "card",
              role: "none",
              name: "",
              domNodeId: "card",
              ignored: true,
              childIds: ["heading"],
            },
            {
              nodeId: "heading",
              role: "heading",
              name: "Secure package registry for code and workflows",
              domNodeId: "heading",
            },
          ],
        },
      },
    ),
    [
      "heading level 3, Secure package registry for code and workflows",
      "Securely store and manage your code and packages.",
      "link, Read the package docs",
    ],
  );
});
