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
      "article",
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
      "row 2 of 3, Monthly Plan, column 1 of 3",
      "Product A link, Buy A, column 2 of 3",
      "Product B link, Buy B, column 3 of 3",
      "row 3 of 3, Picture, expanded, button, group, column 1 of 3",
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
      "row 2 of 2, Specification HTML, column 1 of 1",
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
      "row 2 of 2, Feature accept, column 1 of 2",
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
      "row 3 of 5, Picture, Sound, and Hardware Picture, expanded, button, group, column 1 of 3",
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
      "table, 3 columns, 1 rows",
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
      "76 Mb/s, radio button, selected, 1 of 2",
      "150 Mb/s, radio button, not selected, 2 of 2",
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

test("scanSubtree keeps aria-label-only decorative icon buttons ungrouped", () => {
  assert.deepEqual(
    scanHtml(`
      <button aria-label="Learn more about Magnifier">
        <span aria-hidden="true"><svg></svg></span>
      </button>
    `),
    ["Learn more about Magnifier, button"],
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
      "end of, First story, article",
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
