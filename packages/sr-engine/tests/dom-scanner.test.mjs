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
      "Product A, The practical choice, Black, Blue, and White group, column 2 of 3",
      "Product AThe practical choiceBlackBlueWhite",
      "Product B, The premium choice, Grey, Silver, and Green group, column 3 of 3",
      "Product BThe premium choiceGreySilverGreen",
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

test("scanSubtree skips empty headings and announces block quotes", () => {
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
    ["Slim, lightweight and bright., block quote level 1", "Trusted reviewer"],
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
