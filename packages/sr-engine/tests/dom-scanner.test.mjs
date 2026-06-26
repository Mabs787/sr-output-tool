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

function scanHtml(html) {
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

test("scanSubtree falls back to link URL slugs when links have no readable label", () => {
  assert.deepEqual(
    scanHtml(`
      <nav>
        <a href="https://web.dev/html"></a>
        <a href="https://web.dev/css"></a>
        <a href="https://web.dev/explore/ai"></a>
        <a href="#main-content"></a>
        <a href="mailto:hello@example.com"></a>
        <a href="/has-title" title="Explicit title"></a>
      </nav>
    `),
    [
      "navigation",
      "link, HTML",
      "link, CSS",
      "link, AI",
      "link",
      "link",
      "link, Explicit title",
      "end of, navigation",
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
          <li><a href="/one">One</a></li>
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
      "Previous slide: 4 of 4 - Mobile Insurance, button, group",
      "Next slide: 2 of 4 - Accidental Damage, button, group",
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
      "The Dyers' Caravan Park, group, 1 of 2",
      "Watson, group, 2 of 2",
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
