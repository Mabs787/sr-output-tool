import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const engineRuntimeSource = readFileSync(
  path.join(repoRoot, "packages/sr-extension/src/content/engine-runtime.js"),
  "utf8",
);
const contentScriptSource = readFileSync(
  path.join(repoRoot, "packages/sr-extension/src/content/content.js"),
  "utf8",
);

function createChromeMock() {
  return {
    runtime: {
      id: "test-extension",
      getURL: (assetPath) => `chrome-extension://test/${assetPath}`,
      sendMessage: async () => undefined,
      onMessage: {
        addListener() {},
      },
    },
    storage: {
      session: {
        async get() {
          return {};
        },
        async set() {},
      },
    },
  };
}

function loadExtensionHarness(html) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    url: "https://example.test/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });

  const { window } = dom;

  if (
    !Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "innerText")
  ) {
    Object.defineProperty(window.HTMLElement.prototype, "innerText", {
      configurable: true,
      get() {
        return this.textContent || "";
      },
      set(value) {
        this.textContent = value;
      },
    });
  }

  if (!window.CSS) {
    window.CSS = {};
  }

  if (!window.CSS.escape) {
    window.CSS.escape = (value) => String(value);
  }

  window.HTMLElement.prototype.scrollIntoView ||= function scrollIntoView() {};

  window.chrome = createChromeMock();
  window.Date.now = () => 1700000000000;
  window.eval(engineRuntimeSource);
  window.eval(contentScriptSource);

  return {
    window,
    document: window.document,
    harness: window.__sr_extension_test__,
  };
}

function getAnnouncements(log) {
  return Array.from(log, (entry) => String(entry.announcement));
}

function getLogEntry(log, announcement) {
  return log.find((entry) => entry.announcement === announcement);
}

function setVisibleLayout(root) {
  let index = 0;
  function collectElements(node) {
    const elements = [];
    for (const el of node.querySelectorAll("*")) {
      elements.push(el);
      if (el.shadowRoot) {
        elements.push(...collectElements(el.shadowRoot));
      }
      if (el.tagName?.toLowerCase() === "template" && el.content) {
        elements.push(...collectElements(el.content));
      }
    }
    return elements;
  }

  for (const el of collectElements(root)) {
    Object.defineProperty(el, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        width: 320,
        height: 48,
        top: index++ * 12,
        left: 0,
        right: 320,
        bottom: index * 12 + 48,
        x: 0,
        y: index * 12,
        toJSON() {
          return this;
        },
      }),
    });
  }
}

test("announces sibling body copy between heading, image, and link", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="hero-root">
      <div>
        <div>
          <h1>Discover your latest deals</h1>
          <span>Browse our best customer deals across Sky TV, Broadband, Mobile and Protect</span>
        </div>
        <div>
          <img alt="Latest Deals" src="https://example.test/deals.png">
        </div>
        <div>
          <a href="https://example.test/deals">See all deals</a>
        </div>
      </div>
    </div>
  `);

  const root = document.getElementById("hero-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 1, Discover your latest deals",
    "Browse our best customer deals across Sky TV, Broadband, Mobile and Protect",
    "Latest Deals, image",
    "See all deals, link",
  ]);
});

test("announces multiline styled hero headings with VoiceOver nested text levels", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="hero-root">
      <div class="media-banner">
        <div class="single-box-curved centered">
          <div class="card__wrapper">
            <div class="card">
              <div class="boxes">
                <div class="text-box__wrapper alignment_center">
                  <div class="text-box">
                    <div class="text-box__title">
                      <h3>Price drop: up to <b><span style="color: red;">£600</span></b> off<br>last-minute holidays</h3>
                    </div>
                    <div class="text-box__subtitle">
                      <p>Summer deals too good to miss.</p>
                    </div>
                    <div class="text-box__button-container">
                      <a class="text-box__button button promotion medium" href="https://www.tui.co.uk/destinations/deals/last-minute-holidays">
                        View deals
                      </a>
                    </div>
                    <div class="text-box__tncText">Based on 2 adults. Travel by 31st July. T&amp;Cs apply.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="media-banner__media-wrapper">
            <figure class="media-banner__figure">
              <img class="media-banner__image" src="https://example.test/menorca.jpg" alt="" aria-hidden="true">
            </figure>
          </div>
        </div>
        <a href="https://www.tui.co.uk/destinations/deals/last-minute-holidays" class="js-media-banner-link">
          <span class="u-hide-visually">View deals</span>
        </a>
      </div>
    </div>
  `);

  const root = document.getElementById("hero-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 3, Price drop: up to, level 2 £600, level 2 off, level 2 last-minute holidays, level 2, 4 items",
    "Summer deals too good to miss.",
    "View deals, link",
    "Based on 2 adults. Travel by 31st July. T&Cs apply.",
    "View deals, link",
  ]);
});

test("announces budget deal card links with grouped visible text and compact per-person prices", () => {
  const { document, harness } = loadExtensionHarness(`
    <section id="budget-deals-root">
      <h2>Holiday deals on a budget</h2>
      <a href="/deals-under-300" aria-label="<p>Under</p><p><b>£300</b>pp</p>. <p>Deals under £300pp</p>">
        <div role="group">
          <p>Deals under</p>
          <p><b>£300</b>pp</p>
          <p>Deals under £300pp</p>
        </div>
      </a>
      <a href="/deals-under-500" aria-label="<p>Under</p><p><b>£500</b>pp</p>. <p>Deals under £500pp</p>">
        <div role="group">
          <p>Deals under</p>
          <p><b>£500</b>pp</p>
          <p>Deals under £500pp</p>
        </div>
      </a>
      <a href="/deals-under-1000" aria-label="<p>Under</p><p><b>£1000</b>pp</p>. <p>Deals under £1000pp</p>">
        <div role="group">
          <p>Deals under</p>
          <p><b>£1000</b>pp</p>
          <p>Deals under £1000pp</p>
        </div>
      </a>
    </section>
  `);

  const root = document.getElementById("budget-deals-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 2, Holiday deals on a budget",
    "link, <p>Under</p><p><b>£300</b>pp</p>. <p>Deals under £300pp</p>",
    "group",
    "Deals under",
    "£300pp",
    "Deals under £300pp",
    "link, <p>Under</p><p><b>£500</b>pp</p>. <p>Deals under £500pp</p>",
    "group",
    "Deals under",
    "£500pp",
    "Deals under £500pp",
    "link, <p>Under</p><p><b>£1000</b>pp</p>. <p>Deals under £1000pp</p>",
    "group",
    "Deals under",
    "£1000pp",
    "Deals under £1000pp",
  ]);
});

test("announces links inside TUI confidence carousel text cards", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="confidence-root">
      <div class="usp-carousel-container__header">
        <div class="usp-carousel-container__top-title">
          <p>Book with confidence</p>
        </div>
        <div class="usp-carousel-container__bottom-title">
          <p><a href="https://www.tui.co.uk/holidays/home-of-holiday-value">Find out more reasons to book with TUI</a></p>
        </div>
      </div>
      <div class="embla__container" aria-live="polite">
        <div class="embla__slide">
          <div class="card usp-carousel-container__carousel-content">
            <div class="usp-carousel-container__carousel-content__slide-text">
              <p role="presentation"><b>Hotels, flights,</b></p>
              <p role="presentation"><b>transfers and more</b></p>
              <p role="presentation"><b> all packed up. </b></p>
            </div>
          </div>
        </div>
        <div class="embla__slide">
          <div class="card usp-carousel-container__carousel-content">
            <div class="usp-carousel-container__carousel-content__slide-text" aria-label="Price-Match Promise.  Get the best price  guaranteed. ">
              <p><span aria-hidden="true"><b>Price-Match Promise.</b></span></p>
              <p><span aria-hidden="true">Get the </span><a href="https://www.tui.co.uk/info/price-match-promise">best price </a></p>
              <p><a href="https://www.tui.co.uk/info/price-match-promise">guaranteed. </a></p>
            </div>
          </div>
        </div>
        <div class="embla__slide">
          <div class="card usp-carousel-container__carousel-content">
            <div class="usp-carousel-container__carousel-content__slide-text">
              <p role="presentation"><b>Book and pay, </b></p>
              <p role="presentation"><b>your way.</b></p>
            </div>
          </div>
        </div>
      </div>
      <button type="button"><span class="u-hide-visually"></span></button>
    </div>
  `);

  const root = document.getElementById("confidence-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "Book with confidence",
    "link, Find out more reasons to book with TUI",
    "Hotels, flights,",
    "transfers and more",
    "all packed up.",
    "Price-Match Promise. Get the best price guaranteed., group",
    "link, best price",
    "link, guaranteed.",
    "end of, Price-Match Promise.  Get the best price  guaranteed. , group",
    "Book and pay,",
    "your way.",
    "button",
  ]);
});

test("announces weather widget content inside declarative shadow roots", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="weather-root">
      <tui-weather>
        <template shadowrootmode="open">
          <div>
            <div>
              <div>Where's hot when?</div>
              <div>Let our handy tool help you decide where to head for your next sunshine fix.</div>
            </div>
            <div>
              <div>Changing any of the fields will automatically update the context.</div>
              <div>
                <div>When</div>
                <select>
                  <option>January</option>
                  <option selected>May</option>
                </select>
              </div>
              <div>
                <div>Where</div>
                <div role="combobox" aria-haspopup="listbox" aria-expanded="false">
                  <input type="text" aria-autocomplete="list" placeholder="Anywhere">
                  <div role="listbox"></div>
                </div>
              </div>
              <div>
                <div>Weather</div>
                <button type="button"><span>Any</span></button>
                <button type="button"><span>Warm</span><span>16 - 22ºC</span></button>
                <button type="button"><span>Hot</span><span>23 - 28ºC</span></button>
              </div>
            </div>
            <div aria-live="polite" role="region">There are now 30 destinations.</div>
            <div>
              <a href="/koh-samui">
                <div>
                  <span>28 ºC</span>
                  <span>Koh Samui, Thailand</span>
                </div>
                <div>
                  <span>2%</span>
                  <span>chance of sun</span>
                  <span>110mm</span>
                  <span>rain per month</span>
                </div>
              </a>
            </div>
            <ul role="navigation" aria-label="Pagination">
              <li><a href="#1" aria-label="Page 1 is your current page" aria-current="page">1</a></li>
              <li><a href="#2" aria-label="Page 2">2</a></li>
              <li><a role="button" tabindex="0" aria-label="Jump forward">...</a></li>
              <li><a href="#5" aria-label="Page 5">5</a></li>
              <li><a href="#2" role="button" aria-label="Next page">Next</a></li>
            </ul>
          </div>
        </template>
      </tui-weather>
    </div>
  `);

  const root = document.getElementById("weather-root");
  setVisibleLayout(root);
  const log = harness.scanSubtree(root);
  const announcements = getAnnouncements(log);

  assert.notDeepEqual(announcements, ["No output for element."]);
  assert.ok(announcements.includes("Where's hot when?"));
  harness.highlightElement(
    getLogEntry(log, "Where's hot when?")?.srId,
  );

  const highlight = document.getElementById("__sr-ext-highlight__");
  assert.equal(highlight?.style.display, "block");
  assert.equal(highlight?.style.width, "320px");
  assert.equal(highlight?.style.height, "48px");

  assert.ok(
    announcements.includes(
      "Let our handy tool help you decide where to head for your next sunshine fix.",
    ),
  );
  assert.ok(
    announcements.includes(
      "Changing any of the fields will automatically update the context.",
    ),
  );
  assert.ok(announcements.includes("May, menu pop up, collapsed, button"));
  assert.ok(
    announcements.some(
      (announcement) =>
        announcement.includes("Koh Samui, Thailand") &&
        announcement.includes("2% chance of sun") &&
        announcement.includes("110mm rain per month") &&
        announcement.includes("link"),
    ),
  );
  assert.ok(announcements.includes("Pagination, navigation"));
  assert.ok(
    announcements.some(
      (announcement) =>
        announcement.includes("Page 2") && announcement.includes("link"),
    ),
  );
  assert.ok(
    announcements.some(
      (announcement) =>
        announcement.includes("Jump forward") &&
        announcement.includes("button"),
    ),
  );
  assert.ok(announcements.includes("end of Pagination navigation"));
});

test("selects the composed-path child inside open shadow roots", () => {
  const { document, harness, window } = loadExtensionHarness(`
    <div id="shadow-selection-root">
      <tui-product-card></tui-product-card>
    </div>
  `);

  const host = document.querySelector("tui-product-card");
  const shadowRoot = host.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = `
    <article>
      <button type="button"><span>Shortlist</span></button>
    </article>
  `;

  const root = document.getElementById("shadow-selection-root");
  setVisibleLayout(root);

  const button = shadowRoot.querySelector("button");
  const label = shadowRoot.querySelector("span");
  const eventElement = harness.getEventElement({
    target: host,
    composedPath: () => [
      label,
      button,
      shadowRoot,
      host,
      document.body,
      document.documentElement,
      document,
      window,
    ],
  });

  assert.equal(eventElement, label);
  assert.equal(harness.getSelectableTarget(eventElement), button);
});

test("announces TUI sort listbox and filter tabs closer to VoiceOver", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="filter-sort-root">
      <div class="sorting-wrapper" data-testid="sorting-wrapper">
        <span class="sorting-wrapper__text">Refine your results by applying filters:</span>
        <span class="sorting-wrapper__label">Sort by:</span>
        <div class="input input-select override sorting-wrapper__select">
          <div class="group">
            <select id="select-sort-by-P-19059254752" name="sort-by" aria-label="" aria-disabled="false" data-testid="sort-type" role="listbox" tabindex="0">
              <option value="default">Recommended</option>
              <option value="priceAsc">Price - lowest to highest</option>
              <option value="priceDesc">Price - highest to lowest</option>
              <option value="tripAdvisorRatingDesc">TripAdvisor rating</option>
              <option value="discountDesc">Saving amount</option>
              <option value="departureDateAsc">Departure Date</option>
            </select>
            <span aria-hidden="true" class="icon-control"><span class="icon sort-by"></span></span>
          </div>
        </div>
      </div>
      <div class="filters-panel" data-testid="filters-panel" style="min-height: 108px;">
        <div class="filters-panel__inner">
          <div class="modal-positioning">
            <div>
              <div class="filters-panel__content">
                <div class="filters-panel__filters" role="tablist">
                  <div class="filter-pill"><button class="filter-pill__button" aria-haspopup="true" role="tab" aria-selected="false" type="button" tabindex="0"><h4>Dates &amp; duration</h4></button></div>
                  <div class="filter-pill"><button class="filter-pill__button" aria-haspopup="true" role="tab" aria-selected="false" type="button" tabindex="0"><h4>Board</h4></button></div>
                  <div class="filter-pill"><button class="filter-pill__button" aria-haspopup="true" role="tab" aria-selected="false" type="button" tabindex="0"><h4>Destination</h4></button></div>
                  <div class="filter-pill"><button class="filter-pill__button" aria-haspopup="true" role="tab" aria-selected="false" type="button" tabindex="0"><h4>2 Guests</h4></button></div>
                  <div class="filter-pill"><button class="filter-pill__button" aria-haspopup="true" role="tab" aria-selected="false" type="button" tabindex="0"><h4>Departure airport</h4></button></div>
                  <div class="filter-pill"><button class="filter-pill__button" aria-haspopup="true" role="tab" aria-selected="false" type="button" tabindex="0"><h4>Rating</h4></button></div>
                  <div class="filter-pill"><button class="filter-pill__button" aria-haspopup="true" role="tab" aria-selected="false" type="button" tabindex="0"><h4>Price</h4></button></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);

  const root = document.getElementById("filter-sort-root");
  setVisibleLayout(root);
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "Refine your results by applying filters:",
    "Sort by:",
    "list box, 1 item selected, Recommended, menu item, 1 of 6",
    "Dates & duration, menu pop-up, tab, group, 1 of 7",
    "Board, menu pop-up, tab, group, 2 of 7",
    "Destination, menu pop-up, tab, group, 3 of 7",
    "2 Guests, menu pop-up, tab, group, 4 of 7",
    "Departure airport, menu pop-up, tab, group, 5 of 7",
    "Rating, menu pop-up, tab, group, 6 of 7",
    "Price, menu pop-up, tab, group, 7 of 7",
  ]);
});

test("announces TUI awards image strip links with URL and award labels", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="awards-root" class="awards">
      <div class="awards__container content-width">
        <div class="awards__title">Delivering happiness to our customers</div>
        <div class="awards__images-container">
          <a
            class="awards__link"
            href="https://www.tui.co.uk/destinations/info/reviews-and-awards/?vlid=T|NL|B1|AV|NA|NA|NO|NO|NO|BAU|440"
            aria-label=""
          >
            <span class="u-hide-visually">
              https://www.tui.co.uk/destinations/info/reviews-and-awards/?vlid=T|NL|B1|AV|NA|NA|NO|NO|NO|BAU|440
            </span>
            <ul>
              <li><img src="https://example.test/trustpilot.jpg" alt="Trustpilot"></li>
              <li><img src="https://example.test/good-housekeeping.png" alt="Good Housekeeping Reader Recommended"></li>
              <li><img src="https://example.test/british-travel-awards.png" alt="British Travel Awards"></li>
              <li><img src="https://example.test/disability-smart.png" alt="Disability Smart Awards"></li>
            </ul>
          </a>
        </div>
      </div>
    </div>
  `);

  const root = document.getElementById("awards-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "Delivering happiness to our customers",
    "link, https://www.tui.co.uk/destinations/info/reviews-and-awards/?vlid=T|NL|B1|AV|NA|NA|NO|NO|NO|BAU|440 Trustpilot Good Housekeeping Reader",
  ]);
});

test("skips empty aria-labeled media banner landmarks with hidden content", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="media-banner-root" class="media-banner">
      <div class="single-box-curved left-aligned no-image-for-mobile" aria-label="" role="banner">
        <div class="card__wrapper">
          <div class="card standard">
            <div class="boxes">
              <div class="text-box__wrapper alignment_center">
                <div class="text-box">
                  <div class="text-box__title" aria-hidden="true">
                    <h1>Awards and accolades</h1>
                  </div>
                  <div class="text-box__subtitle" aria-hidden="true">
                    <p>From Most Trusted Travel Company to Family Holidays Provider of the Year 2025, our many awards do the talking for us.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="media-banner__media-wrapper">
          <figure class="media-banner__figure">
            <img
              class="media-banner__image"
              src="https://example.test/awards-hero.jpg"
              alt="Illustration of a person jumping up and celebrating."
              aria-hidden="true"
            >
          </figure>
        </div>
      </div>
      <page-slot name="uniqodo-media-banner"></page-slot>
    </div>
  `);

  const root = document.getElementById("media-banner-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), []);
});

test("announces code snippets before their nested clipboard buttons", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="snippet-root" class="snippet-clipboard-content notranslate position-relative overflow-auto">
      <pre class="notranslate"><code>
  window.masthead.addBanners([
    {
      id: 'notification-example-1',
      title: "Some title",
      description: "Some description"
    }
  ]);
      </code></pre>
      <div class="zeroclipboard-container position-absolute right-0 top-0">
        <clipboard-copy
          aria-label="Copy code to clipboard"
          class="ClipboardButton btn js-clipboard-copy m-2 p-0"
          role="button"
          tabindex="0"
        >
          Copy
        </clipboard-copy>
      </div>
    </div>
  `);

  const root = document.getElementById("snippet-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    `window.masthead.addBanners([ { id: 'notification-example-1', title: "Some title", description: "Some description" } ]);`,
    "Copy code to clipboard, button",
  ]);
});

test("normalizes code-block selections to the enclosing snippet container", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="snippet-root" class="snippet-clipboard-content notranslate position-relative overflow-auto">
      <pre class="notranslate"><code>
  window.masthead.addBanners([
    {
      id: 'notification-example-1',
      title: "Some title",
      description: "Some description"
    }
  ]);
      </code></pre>
      <div class="zeroclipboard-container position-absolute right-0 top-0">
        <clipboard-copy
          aria-label="Copy code to clipboard"
          class="ClipboardButton btn js-clipboard-copy m-2 p-0"
          role="button"
          tabindex="0"
        >
          Copy
        </clipboard-copy>
      </div>
    </div>
  `);

  const code = document.querySelector("#snippet-root code");
  const scanRoot = harness.getScanRoot(code);

  assert.equal(scanRoot?.id, "snippet-root");
  assert.deepEqual(getAnnouncements(harness.scanSubtree(scanRoot)), [
    `window.masthead.addBanners([ { id: 'notification-example-1', title: "Some title", description: "Some description" } ]);`,
    "Copy code to clipboard, button",
  ]);
});

test("prefers the nearest visible div container during element picking", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="page-root">
      <div id="card-root">
        <div id="copy-root">
          <span id="copy-text">Plan details</span>
        </div>
      </div>
    </div>
  `);

  setVisibleLayout(document.body);

  const target = document.getElementById("copy-text");
  const selectableTarget = harness.getSelectableTarget(target);

  assert.equal(selectableTarget?.id, "copy-root");
});

test("announces tabs, tab panel, grouped cards, and container end markers", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="gallery-root">
      <div>
        <nav role="tablist">
          <button id="tab-0" role="tab" aria-controls="panel-0" aria-selected="true">
            <div>Sky Entertainment</div>
          </button>
          <button id="tab-1" role="tab" aria-controls="panel-1">
            <div>Netflix</div>
          </button>
        </nav>
      </div>
      <div>
        <div id="panel-0" role="tabpanel" aria-labelledby="tab-0">
          <ul>
            <li tabindex="0"><img alt="The Dyers' Caravan Park" src="https://example.test/1.jpg"></li>
            <li tabindex="0"><img alt="Watson" src="https://example.test/2.jpg"></li>
            <li tabindex="0"><img alt="Last Week Tonight With John Oliver" src="https://example.test/3.jpg"></li>
            <li tabindex="0"><img alt="Dr. Strangelove" src="https://example.test/4.jpg"></li>
            <li tabindex="0"><img alt="Charmed By The Devil" src="https://example.test/5.jpg"></li>
            <li tabindex="0"><img alt="I'm Chevy Chase And You're Not" src="https://example.test/6.jpg"></li>
          </ul>
        </div>
        <div id="panel-1" role="tabpanel" aria-labelledby="tab-1" aria-hidden="true">
          <ul>
            <li tabindex="0"><img alt="Hidden card" src="https://example.test/7.jpg"></li>
          </ul>
        </div>
      </div>
    </div>
  `);

  const root = document.getElementById("gallery-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "Sky Entertainment, selected, tab, 1 of 2",
    "Netflix, tab, 2 of 2",
    "Sky Entertainment, tab panel",
    "list, 6 items",
    "The Dyers' Caravan Park, group, 1 of 6",
    "Watson, group, 2 of 6",
    "Last Week Tonight With John Oliver, group, 3 of 6",
    "Dr. Strangelove, group, 4 of 6",
    "Charmed By The Devil, group, 5 of 6",
    "I'm Chevy Chase And You're Not, group, 6 of 6",
    "end of list",
    "end of Sky Entertainment tab panel",
  ]);

  assert.equal(getLogEntry(log, "end of list")?.role, "list");
  assert.equal(
    getLogEntry(log, "end of Sky Entertainment tab panel")?.role,
    "tabpanel",
  );
});

test("announces pricing list items separately from their nested action buttons", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="product-root">
      <div>
        <h3>Product Name</h3>
        <a href="#">Learn more</a>
        <div><span>Lörem ipsum stenoliga homorebel i rejäligen och segt, fastän semimett trumpifiering askade prerade.</span></div>
        <ul>
          <li>
            <div>
              <div>
                <span>£X.XX a month</span>
                <div aria-hidden="true">
                  <span>£X.XX</span>
                  <span>a month</span>
                </div>
              </div>
              <span>for 6 months</span>
            </div>
            <button aria-label="Add PRODUCT NAME for 6 months to basket">Add</button>
          </li>
          <li>
            <div>
              <div>
                <span>£X.XX a month</span>
                <div aria-hidden="true">
                  <span>£X.XX</span>
                  <span>a month</span>
                </div>
              </div>
              <span>for 12 months</span>
            </div>
            <button aria-label="Add PRODUCT NAME for 12 months to basket">Add</button>
          </li>
          <li>
            <div>
              <div>
                <span>£X.XX a month</span>
                <div aria-hidden="true">
                  <span>£X.XX</span>
                  <span>a month</span>
                </div>
              </div>
              <span>for 18 months</span>
            </div>
            <button aria-label="Add PRODUCT NAME for 18 months to basket">Add</button>
          </li>
        </ul>
        <div><span>This is a test</span></div>
      </div>
    </div>
  `);

  const root = document.getElementById("product-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 3, Product Name",
    "Learn more, link",
    "Lörem ipsum stenoliga homorebel i rejäligen och segt, fastän semimett trumpifiering askade prerade.",
    "list, 3 items",
    "£X.XX a month for 6 months, list item, 1 of 3",
    "Add PRODUCT NAME for 6 months to basket, button, group",
    "£X.XX a month for 12 months, list item, 2 of 3",
    "Add PRODUCT NAME for 12 months to basket, button, group",
    "£X.XX a month for 18 months, list item, 3 of 3",
    "Add PRODUCT NAME for 18 months to basket, button, group",
    "end of list",
    "This is a test",
  ]);

  assert.equal(log.at(-2).srId, log[3].srId);
  assert.equal(
    document.querySelector(`[data-sr-id="${log[4].srId}"]`)?.tagName,
    "DIV",
  );
});

test("skips presentational board wrappers and announces role listitem cards", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="jira-root" class="ghx-swimlane ghx-first">
      <div class="ghx-swimlane-header" aria-label="Swimlane for epic: Masthead Revival" tabindex="0">
        <div class="ghx-heading" title="2 issues - Masthead Revival">
          <div role="button" tabindex="0" class="aui-button js-expander ghx-heading-expander" aria-expanded="true" title="Toggle swimlane visibility"></div>
          <span>Masthead Revival</span>
          <span class="ghx-info"><span class="ghx-description">2 issues</span></span>
        </div>
      </div>
      <ul class="ghx-columns" role="presentation">
        <li class="ghx-column" role="list" aria-labelledby="todo-title">
          <h3 id="todo-title" class="assistive">To Do: Masthead Revival swimlane</h3>
        </li>
        <li class="ghx-column" role="list" aria-labelledby="in-progress-title">
          <h3 id="in-progress-title" class="assistive">In Progress: Masthead Revival swimlane</h3>
          <div class="ghx-issue" role="listitem" id="1829282">
            <div class="m-sortable-trigger" role="button" tabindex="0" aria-label="In Progress Draggable item. Ensure your screen reader is not in browse mode and then press space bar to lift."></div>
            <div class="assistive" role="group" aria-label="Issue: GEMINI-905, Update Masthead Service CIs ."></div>
            <div class="ghx-issue-content">
              <div class="ghx-issue-fields">
                <div class="ghx-key"><a role="button" href="/browse/GEMINI-905" aria-label="GEMINI-905" title="GEMINI-905">GEMINI-905</a></div>
                <div class="ghx-summary" title="Update Masthead Service CIs "><span class="ghx-inner">Update Masthead Service CIs </span></div>
              </div>
              <div class="ghx-highlighted-fields"><div class="ghx-highlighted-field"><span class="aui-label ghx-label-14" title="Masthead Revival">Masthead Revival</span></div></div>
              <div class="ghx-extra-fields"><div class="ghx-extra-field-row"><span class="ghx-extra-field ghx-fa" title="Fix Version/s: None"><span class="ghx-extra-field-content">None</span></span></div></div>
            </div>
            <div class="ghx-card-footer">
              <div class="ghx-avatar"><img alt="Assignee: Dinsdale, Joe (Principal Engineer (System))"></div>
              <div class="ghx-type"><img alt="Issue Type: Story"></div>
              <div class="ghx-flags"><span class="ghx-priority"><img alt="Priority: Major"></span></div>
              <div class="ghx-end"><div class="ghx-corner"><aui-badge title="Story Points">1</aui-badge></div></div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  `);

  const root = document.getElementById("jira-root");
  const log = harness.scanSubtree(root);
  const announcements = getAnnouncements(log);

  assert.ok(
    !announcements.some((entry) =>
      entry.startsWith("To Do: Masthead Revival swimlane In Progress:"),
    ),
  );

  assert.deepEqual(announcements, [
    "Swimlane for epic: Masthead Revival, group",
    "Toggle swimlane visibility, expanded, button",
    "Masthead Revival",
    "2 issues",
    "end of, Swimlane for epic: Masthead Revival, group",
    "To Do: Masthead Revival swimlane, list",
    "In Progress: Masthead Revival swimlane, list, 1 items",
    "heading level 3, In Progress: Masthead Revival swimlane",
    "Update Masthead Service CIs Masthead Revival None 1, list item, 1 of 1",
    "In Progress Draggable item. Ensure your screen reader is not in browse mode and then press space bar to lift., button",
    "Issue: GEMINI-905, Update Masthead Service CIs ., group",
    "end of, Issue: GEMINI-905, Update Masthead Service CIs ., group",
    "GEMINI-905, button",
    "Assignee: Dinsdale, Joe (Principal Engineer (System)), image",
    "Issue Type: Story, image",
    "Priority: Major, image",
    "Story Points, group",
    "1",
    "end of, Story Points, group",
    "end of list",
  ]);
});

test("announces jira quick filters as a definition list with toggle buttons", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="filters-root" class="ghx-controls-filters js-quickfilter-selector">
      <div id="aui-tooltip" style="display: none;">Use Quick Filters to view a subset of issues. Board owners can add more.</div>
      <dl id="js-work-quickfilters" class="aui-expander-content ghx-quick-content">
        <dt aria-describedby="aui-tooltip" tabindex="0" id="js-quickfilters-label" class="ghx-cursor-help">Quick Filters:</dt>
        <dd><a role="button" href="#" aria-pressed="false" class="js-quickfilter-button" title="type != Task ">Filter Tasks</a></dd>
        <dd><a role="button" href="#" aria-pressed="false" class="js-quickfilter-button" title="Displays issues which are currently assigned to the current user">My issues only</a></dd>
        <dd><a role="button" href="#" aria-pressed="false" class="js-quickfilter-button" title="Displays issues which are Dev only">Dev only</a></dd>
        <dd><a role="button" href="#" aria-pressed="false" class="js-quickfilter-button" title="Displays issues which are Design only">Design only</a></dd>
        <dd><a role="button" href="#" aria-pressed="false" class="js-quickfilter-button" title="Displays issues which have changed status in the last day">Recently changed status</a></dd>
        <dd><a role="button" href="#" aria-pressed="false" class="js-quickfilter-button" title="Displays issues which have been updated in the last day">Recently updated</a></dd>
        <dd><a role="button" href="#" aria-pressed="false" class="js-quickfilter-button" title="Displays tickets that have been carried from a previous sprint">Tickets carried</a></dd>
        <dd><a role="button" href="#" aria-pressed="false" class="js-quickfilter-button" title="Displays issues which are unrefined">Tickets unrefined</a></dd>
        <dd><a role="button" href="#" aria-pressed="false" class="js-quickfilter-button" title="Displays issues which are older than 9 months">Stale tickets</a></dd>
        <dd><a role="button" href="#" aria-pressed="false" class="js-quickfilter-button" title="labels not in (Outlier) or labels is EMPTY ">Filter Outliers</a></dd>
        <dd class="ghx-quickfilter-trigger" style="display: none;"><a id="js-work-quickfilters-trigger" aria-controls="js-work-quickfilters">… Show more</a></dd>
      </dl>
    </div>
  `);

  const root = document.getElementById("filters-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "definition list, 11 items",
    "Quick Filters:, Use Quick Filters to view a subset of issues. Board owners can add more., term, 1 of 1",
    "Filter Tasks, toggle button, 2 of 11",
    "My issues only, toggle button, 3 of 11",
    "Dev only, toggle button, 4 of 11",
    "Design only, toggle button, 5 of 11",
    "Recently changed status, toggle button, 6 of 11",
    "Recently updated, toggle button, 7 of 11",
    "Tickets carried, toggle button, 8 of 11",
    "Tickets unrefined, toggle button, 9 of 11",
    "Stale tickets, toggle button, 10 of 11",
    "Filter Outliers, toggle button, 11 of 11",
    "end of definition list",
  ]);
});

test("announces progress indicators and summary text inside overview list rows", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="overview-root">
      <ul>
        <li class="Box-row p-0 d-flex flex-wrap">
          <div class="col-12 col-md-6 tmp-px-3 tmp-py-4">
            <div class="position-relative">
              <span>
                <span role="progressbar" aria-label="Merged Pull Requests" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></span>
                <span role="progressbar" aria-label="Open Pull Requests" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></span>
              </span>
              <a href="/merged" aria-label="View merged pull requests"></a>
              <a href="/open" aria-label="View open pull requests"></a>
            </div>
            <div class="mt-2"><span class="text-emphasized">0</span> Active pull requests</div>
          </div>
          <div class="col-12 col-md-6 tmp-px-3 tmp-py-4">
            <div class="position-relative">
              <span>
                <span role="progressbar" aria-label="Closed Issues" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></span>
                <span role="progressbar" aria-label="Active Issues" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></span>
              </span>
              <a href="/closed" aria-label="View closed issues"></a>
              <a href="/issues" aria-label="View open issues"></a>
            </div>
            <div class="mt-2"><span class="text-emphasized">0</span> Active issues</div>
          </div>
        </li>
      </ul>
    </div>
  `);

  const root = document.getElementById("overview-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "list, 1 items",
    "Merged Pull Requests, 0%, progress indicator, 1 of 2",
    "Open Pull Requests, 0%, progress indicator, 2 of 2",
    "link, image, View merged pull requests",
    "link, image, View open pull requests",
    "0 Active pull requests",
    "Closed Issues, 0%, progress indicator, 1 of 2",
    "Active Issues, 0%, progress indicator, 2 of 2",
    "link, image, View closed issues",
    "link, image, View open issues",
    "0 Active issues",
    "end of list",
  ]);
});

test("announces metric links with spaces between adjacent span text", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="metrics-root">
      <ul>
        <li>
          <a href="#merged">
            <span><svg aria-hidden="true"></svg> 0</span>
            <span>Merged pull requests</span>
          </a>
        </li>
        <li>
          <a href="#opened">
            <span><svg aria-hidden="true"></svg> 0</span>
            <span>Open pull requests</span>
          </a>
        </li>
        <li>
          <a href="#closed">
            <span><svg aria-hidden="true"></svg> 0</span>
            <span>Closed issues</span>
          </a>
        </li>
        <li>
          <a href="#new">
            <span><svg aria-hidden="true"></svg> 0</span>
            <span>New issues</span>
          </a>
        </li>
      </ul>
    </div>
  `);

  const root = document.getElementById("metrics-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "list, 4 items",
    "0 Merged pull requests, link, 1 of 4",
    "0 Open pull requests, link, 2 of 4",
    "0 Closed issues, link, 3 of 4",
    "0 New issues, link, 4 of 4",
    "end of list",
  ]);
});

test("announces accordion heading buttons with heading level and collapsed state", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="accordion-root">
      <div>
        <h3>
          <button
            id="example-callbacks-heading"
            aria-controls="example-callbacks-content"
            aria-expanded="false"
          >
            <span>Heading</span>
            <span>
              <span><svg aria-hidden="true"></svg></span>
            </span>
          </button>
        </h3>
        <div
          id="example-callbacks-content"
          aria-labelledby="example-callbacks-heading"
          aria-hidden="true"
          role="region"
          hidden
        >
          <div>Content goes here.</div>
        </div>
      </div>
      <span>The last callback was closed</span>
    </div>
  `);

  const root = document.getElementById("accordion-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 3, Heading, collapsed, button, group",
    "The last callback was closed",
  ]);
});

test("announces additional aria help, error, popup, live, modal, and sort context", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="aria-root">
      <label for="email">Email</label>
      <input
        id="email"
        type="text"
        aria-describedby="email-help"
        aria-invalid="true"
        aria-errormessage="email-error"
        aria-autocomplete="list"
      >
      <div id="email-help">Enter your email address</div>
      <div id="email-error">Email is invalid</div>
      <button aria-label="Filters" aria-haspopup="dialog">Open</button>
      <div aria-live="polite">Saved successfully</div>
      <div role="dialog" aria-label="Preferences" aria-modal="true"></div>
      <table>
        <tr>
          <th aria-sort="ascending">Name</th>
        </tr>
      </table>
    </div>
  `);

  const root = document.getElementById("aria-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "Email, text field, auto complete available, Enter your email address, invalid, Email is invalid",
    "Enter your email address",
    "Email is invalid",
    "Filters, dialog pop up button",
    "status, Saved successfully",
    "Preferences, dialog, modal",
    "Name, column header, column 1, row 1, sorted ascending",
  ]);
});

test("announces jira sprint header buttons closer to voiceover", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="jira-header-root">
      <div class="ghx-sprint-meta">
        <span class="time"><span class="days-left">4 days remaining</span></span>
        <span class="complete-sprint-container" title="To complete a sprint, you must have permissions.">
          <a id="ghx-complete-sprint" tabindex="0" role="button" aria-haspopup="dialog" aria-pressed="false" aria-disabled="true">Complete sprint</a>
        </span>
      </div>
      <div class="ghx-view-section"><button aria-haspopup="true" aria-expanded="false">Links Hierarchy</button></div>
      <div class="ghx-view-section"><button aria-haspopup="true" aria-expanded="false">Board</button></div>
      <div id="ghx-view-presentation"><button title="Hide the header ( Z )" aria-label="Hide the header" role="button"><span aria-hidden="true"></span></button></div>
      <h1><span>DTE - Gemini Squad Board</span><span><span><span title="Gemini - 2026.2.2">Gemini - 2026.2.2</span></span></span></h1>
      <span id="ghx-sprint-goal" title="Get ASA and CMA Price updates published in Figma and Released in React">Get ASA and CMA Price updates published in Figma and Released in React</span>
    </div>
  `);

  const root = document.getElementById("jira-header-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "4 days remaining",
    "Complete sprint, dimmed, toggle button",
    "Links Hierarchy, menu pop up, collapsed, button",
    "Board, menu pop up, collapsed, button",
    "Hide the header, button",
    "heading level 1, DTE - Gemini Squad Board Gemini - 2026.2.2",
    "Get ASA and CMA Price updates published in Figma and Released in React",
  ]);
});

test("announces jira header popup links without leaking collapsed menu content", () => {
  const { document, harness } = loadExtensionHarness(`
    <ul id="jira-header-root" class="aui-nav">
      <li>
        <a class="jira-feedback-plugin aui-button-round" role="button" aria-label="Feedback" aria-haspopup="dialog" id="jira-header-feedback-link" href="#">
          <span class="aui-icon aui-icon-small aui-iconfont-feedback">Give feedback to Atlassian</span>
        </a>
      </li>
      <li id="system-help-menu">
        <a class="aui-nav-link aui-dropdown2-trigger aui-dropdown2-trigger-arrowless aui-button-round" id="help_menu" aria-label="Help" aria-haspopup="true" href="https://docs.atlassian.com/jira/jsw-docs-103/" title="Help" aria-controls="system-help-menu-content" aria-expanded="false">
          <span class="aui-icon aui-icon-small aui-iconfont-question-filled">Help</span>
        </a>
        <div id="system-help-menu-content" class="aui-dropdown2 aui-style-default aui-layer" tabindex="-1">
          <div class="aui-dropdown2-section">
            <ul id="jira-help" class="aui-list-truncate">
              <li><a id="gh_view_help" class="aui-nav-link" href="https://docs.atlassian.com/jira/jsw-docs-103/" target="_blank">Jira Software help</a></li>
            </ul>
          </div>
        </div>
      </li>
      <li id="system-admin-menu">
        <a href="/secure/project/BrowseProjects.jspa?s=view_projects" id="admin_menu" class="aui-nav-link aui-dropdown2-trigger aui-dropdown2-trigger-arrowless aui-button-round" aria-label="Administration" aria-haspopup="true" title="Administration" aria-controls="system-admin-menu-content" aria-expanded="false">
          <span class="aui-icon aui-icon-small aui-iconfont-configure">Administration</span>
        </a>
        <div id="system-admin-menu-content" class="aui-dropdown2 aui-style-default aui-layer" tabindex="-1">
          <div class="aui-dropdown2-section">
            <strong>Jira administration</strong>
            <ul class="aui-list-truncate">
              <li><a href="/secure/project/BrowseProjects.jspa?s=view_projects" class="aui-nav-link" id="admin_project_menu">Projects</a></li>
            </ul>
          </div>
        </div>
      </li>
      <li id="user-options">
        <a id="header-details-user-fullname" class="aui-dropdown2-trigger aui-dropdown2-trigger-arrowless aui-button-round" aria-label="User Profile" aria-haspopup="true" href="/secure/ViewProfile.jspa" title="User profile" aria-controls="user-options-content" aria-expanded="false">
          <span class="aui-avatar aui-avatar-small">
            <span class="aui-avatar-inner">
              <img src="https://example.test/avatar.png" alt="User profile for Rahman, Mabs (Associate Software Engineer)">
            </span>
          </span>
        </a>
        <div id="newsletter-signup-container-helper" role="presentation"></div>
        <div id="user-options-content" class="aui-dropdown2 aui-style-default aui-layer" tabindex="-1">
          <div class="aui-dropdown2-section">
            <ul id="personal" class="aui-list-truncate" role="menu">
              <li role="presentation"><a id="view_profile" href="/secure/ViewProfile.jspa">Profile</a></li>
              <li role="presentation"><aui-item-link id="theme-button" class="interactive aui-dropdown2-interactive" interactive="true" type="button"><a role="menuitem" tabindex="-1" class="interactive aui-dropdown2-interactive"><span class="status">Theme</span></a></aui-item-link></li>
            </ul>
          </div>
          <div class="aui-dropdown2-section">
            <strong>My Jira Home</strong>
          </div>
        </div>
      </li>
    </ul>
  `);

  const root = document.getElementById("jira-header-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "list, 4 items",
    "Feedback, dialog pop up button, 1 of 4",
    "menu pop up, collapsed, link, Help, 2 of 4",
    "menu pop up, collapsed, link, Administration, 3 of 4",
    "menu pop up, collapsed, link, image, User Profile, 4 of 4",
    "end of list",
  ]);
});

test("announces masthead landmarks and skip links without redundant list item output", () => {
  const { document, harness } = loadExtensionHarness(`
    <header id="masthead-root">
      <ul>
        <li><a href="#content">Skip to content</a></li>
        <li><a href="#nav">Skip to navigation</a></li>
        <li><a href="#assistant" aria-hidden="true" tabindex="-1">Skip to assistant</a></li>
        <li><a href="#footer">Skip to footer</a></li>
        <li><a href="#search">Skip to search</a></li>
      </ul>
      <nav aria-label="Primary">
        <ul>
          <li>
            <a href="/watch">Watch</a>
            <button aria-label="Open Watch menu" aria-expanded="false"></button>
          </li>
          <li><a href="/tv">TV</a></li>
        </ul>
      </nav>
    </header>
  `);

  const root = document.getElementById("masthead-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "banner",
    "list, 5 items",
    "Skip to content, link, 1 of 5",
    "Skip to navigation, link, 2 of 5",
    "Skip to footer, link, 4 of 5",
    "Skip to search, link, 5 of 5",
    "end of list",
    "Primary, navigation",
    "list, 2 items",
    "Watch, link, 1 of 2",
    "Open Watch menu, collapsed, button, group",
    "TV, link, 2 of 2",
    "end of list",
    "end of Primary navigation",
    "end of banner",
  ]);

  assert.equal(getLogEntry(log, "end of list")?.role, "list");
  assert.equal(
    getLogEntry(log, "end of Primary navigation")?.role,
    "navigation",
  );
  assert.equal(getLogEntry(log, "end of banner")?.role, "banner");
});

test("announces accordion faq items as heading buttons with region content", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="faq-root">
      <h2>Sky Glass FAQs</h2>
      <ul>
        <li>
          <h3>
            <button
              id="faq-accordion-0-heading"
              aria-controls="faq-accordion-0-content"
              aria-expanded="true"
            >
              <span>How does Sky Glass TV work?</span>
              <span aria-hidden="true">icon</span>
            </button>
          </h3>
          <div
            id="faq-accordion-0-content"
            aria-labelledby="faq-accordion-0-heading"
            aria-hidden="false"
            role="region"
          >
            <div><div><span>Sky Glass is a 4K smart, streaming TV. All you’ll need is a strong home broadband package to stream all your favourites.</span></div></div>
          </div>
        </li>
        <li>
          <h3>
            <button
              id="faq-accordion-1-heading"
              aria-controls="faq-accordion-1-content"
              aria-expanded="true"
            >
              <span>Who makes the Sky Glass TV?</span>
              <span aria-hidden="true">icon</span>
            </button>
          </h3>
          <div
            id="faq-accordion-1-content"
            aria-labelledby="faq-accordion-1-heading"
            aria-hidden="false"
            role="region"
          >
            <div><div><span>Our Sky Glass TVs are made by our trusted hardware partners TP Vision.</span></div></div>
          </div>
        </li>
      </ul>
    </div>
  `);

  const root = document.getElementById("faq-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 2, Sky Glass FAQs",
    "list, 2 items",
    "heading level 3, How does Sky Glass TV work?, expanded, button, group, 1 of 2",
    "How does Sky Glass TV work?, region",
    "Sky Glass is a 4K smart, streaming TV. All you’ll need is a strong home broadband package to stream all your favourites.",
    "end of, How does Sky Glass TV work?, region",
    "heading level 3, Who makes the Sky Glass TV?, expanded, button, group, 2 of 2",
    "Who makes the Sky Glass TV?, region",
    "Our Sky Glass TVs are made by our trusted hardware partners TP Vision.",
    "end of, Who makes the Sky Glass TV?, region",
    "end of list",
  ]);

  assert.equal(
    getLogEntry(log, "end of, How does Sky Glass TV work?, region")?.role,
    "region",
  );
  assert.equal(
    getLogEntry(log, "end of, Who makes the Sky Glass TV?, region")?.role,
    "region",
  );
  assert.equal(getLogEntry(log, "end of list")?.role, "list");
});

test("announces rail groups with nested image cards and group end marker", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="rail-root">
      <div>
        <h2>Inside job</h2>
        <p>Your Indoor Camera is your eyes and ears on the inside.</p>
      </div>
      <div role="group" aria-label="Inside job">
        <ul>
          <li>
            <div>
              <img alt="Indoor Camera" src="https://example.test/1.png">
              <div>
                <span>Indoor Camera</span>
                <span>Keep an eye and ear on what’s happening inside your home.</span>
              </div>
            </div>
          </li>
          <li>
            <div>
              <img alt="sound-check" src="https://example.test/2.png">
              <div>
                <span>Sound check</span>
                <span>You heard it here first. Get a heads-up when there's a loud noise.</span>
              </div>
            </div>
          </li>
          <li>
            <div>
              <img alt="Close up" src="https://example.test/3.png">
              <div>
                <span>Close up</span>
                <span>Get closer to the action with 8x digital zoom.</span>
              </div>
            </div>
          </li>
          <li>
            <div>
              <img alt="away mode" src="https://example.test/4.png">
              <div>
                <span>Away mode</span>
                <span>Turns on when you leave and off again when you’re back home.</span>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <button aria-label="Previous slide"></button>
      <button aria-label="Next slide" disabled></button>
      <p>Requires an upgrade to Smart Home Plan +.</p>
      <a href="/buy">Buy now</a>
      <a href="/explore">Explore the tech</a>
    </div>
  `);

  const root = document.getElementById("rail-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 2, Inside job",
    "Your Indoor Camera is your eyes and ears on the inside.",
    "Inside job, group",
    "list, 4 items",
    "Indoor Camera, image, 1 of 4",
    "Indoor Camera",
    "Keep an eye and ear on what’s happening inside your home.",
    "sound-check, image, 2 of 4",
    "Sound check",
    "You heard it here first. Get a heads-up when there's a loud noise.",
    "Close up, image, 3 of 4",
    "Close up",
    "Get closer to the action with 8x digital zoom.",
    "away mode, image, 4 of 4",
    "Away mode",
    "Turns on when you leave and off again when you’re back home.",
    "end of list",
    "end of, Inside job, group",
    "Previous slide, button",
    "Next slide, button, dimmed",
    "Requires an upgrade to Smart Home Plan +.",
    "Buy now, link",
    "Explore the tech, link",
  ]);

  assert.equal(getLogEntry(log, "end of list")?.role, "list");
  assert.equal(getLogEntry(log, "end of, Inside job, group")?.role, "group");
});

test("announces linked channel rails without unlabeled wrapper groups", () => {
  const { document, harness } = loadExtensionHarness(`
    <section id="channel-rail-root" data-test-id="channel-rail-section">
      <h2>Explore by channel</h2>
      <button aria-label="Previous slide" disabled></button>
      <button aria-label="Next slide"></button>
      <div role="group" data-drag-to-scroll="drag-scroll">
        <ul>
          <li>
            <div>
              <a aria-label="Navigate to Sky One" href="/watch/channel/sky-one">
                <img alt="Sky One" src="https://example.test/sky-one.png">
                <img alt="" src="https://example.test/glare.png">
              </a>
              <span>Sky One</span>
            </div>
          </li>
          <li>
            <div>
              <a aria-label="Navigate to Sky Atlantic" href="/watch/channel/sky-atlantic">
                <img alt="Sky Atlantic" src="https://example.test/sky-atlantic.png">
                <img alt="" src="https://example.test/glare.png">
              </a>
              <span>Sky Atlantic</span>
            </div>
          </li>
          <li>
            <div>
              <a aria-label="Navigate to Sky Arts" href="/watch/channel/sky-arts">
                <img alt="Sky Arts" src="https://example.test/sky-arts.png">
                <img alt="" src="https://example.test/glare.png">
              </a>
              <span>Sky Arts</span>
            </div>
          </li>
          <li>
            <div>
              <a aria-label="Navigate to Sky Witness" href="/watch/channel/sky-witness">
                <img alt="Sky Witness" src="https://example.test/sky-witness.png">
                <img alt="" src="https://example.test/glare.png">
              </a>
              <span>Sky Witness</span>
            </div>
          </li>
          <li>
            <div>
              <a aria-label="Navigate to Sky Comedy" href="/watch/channel/sky-comedy">
                <img alt="Sky Comedy" src="https://example.test/sky-comedy.png">
                <img alt="" src="https://example.test/glare.png">
              </a>
              <span>Sky Comedy</span>
            </div>
          </li>
          <li>
            <div>
              <a aria-label="Navigate to Sky Documentaries" href="/watch/channel/sky-documentaries">
                <img alt="Sky Documentaries" src="https://example.test/sky-documentaries.png">
                <img alt="" src="https://example.test/glare.png">
              </a>
              <span>Sky Documentaries</span>
            </div>
          </li>
          <li>
            <div>
              <a aria-label="Navigate to Sky Crime" href="/watch/channel/sky-crime">
                <img alt="Sky Crime" src="https://example.test/sky-crime.png">
                <img alt="" src="https://example.test/glare.png">
              </a>
              <span>Sky Crime</span>
            </div>
          </li>
        </ul>
      </div>
    </section>
  `);

  const root = document.getElementById("channel-rail-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 2, Explore by channel",
    "Previous slide, button, dimmed",
    "Next slide, button",
    "list, 7 items",
    "link, image, Navigate to Sky One, 2 of 9",
    "Sky One",
    "link, image, Navigate to Sky Atlantic, 3 of 9",
    "Sky Atlantic",
    "link, image, Navigate to Sky Arts, 4 of 9",
    "Sky Arts",
    "link, image, Navigate to Sky Witness, 5 of 9",
    "Sky Witness",
    "link, image, Navigate to Sky Comedy, 6 of 9",
    "Sky Comedy",
    "link, image, Navigate to Sky Documentaries, 7 of 9",
    "Sky Documentaries",
    "link, image, Navigate to Sky Crime, 8 of 9",
    "Sky Crime",
    "end of list",
  ]);

  assert.equal(getLogEntry(log, "end of list")?.role, "list");
});

test("announces carousel slide text once with group context", () => {
  const { document, harness } = loadExtensionHarness(`
    <section id="carousel-root">
      <h2>Insurance products for your home-sweet-home</h2>
      <div role="region" aria-roledescription="carousel">
        <span class="visually-hidden">Current slide, 1 of 4, Home Insurance</span>
        <button aria-label="Previous slide: 4 of 4 - Mobile Insurance"></button>
        <button aria-label="Next slide: 2 of 4 - Accidental Damage"></button>
        <div aria-live="polite">
          <div aria-hidden="true" role="group" tabindex="-1">
            <p>Mobile Insurance</p>
            <p>5-star Defaqto Mobile Insurance</p>
          </div>
          <div aria-hidden="false" role="group" tabindex="0">
            <div>
              <img alt="" role="presentation" src="https://example.test/home.png">
              <p>Home Insurance</p>
              <p>Cover for your home-sweet-home</p>
            </div>
          </div>
          <div aria-hidden="true" role="group" tabindex="-1">
            <p>Accidental Damage</p>
            <p>Add additional accidental damage cover for added peace of mind</p>
          </div>
        </div>
      </div>
    </section>
  `);

  const root = document.getElementById("carousel-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 2, Insurance products for your home-sweet-home",
    "group",
    "Current slide, 1 of 4, Home Insurance",
    "Previous slide: 4 of 4 - Mobile Insurance, button",
    "Next slide: 2 of 4 - Accidental Damage, button",
    "group",
    "Home Insurance",
    "Cover for your home-sweet-home",
    "end of group",
    "end of group",
  ]);

  assert.equal(
    getAnnouncements(log).filter(
      (announcement) =>
        announcement === "Home Insurance" ||
        announcement === "Cover for your home-sweet-home",
    ).length,
    2,
  );
});

test("announces wrapped accordion items in order even when ids are duplicated", () => {
  const { document, harness } = loadExtensionHarness(`
    <section id="smart-home-faq-root">
      <h2>Sky Smart Home FAQs</h2>
      <p>Answers to your questions and other helpful things.</p>
      <ul>
        <li>
          <div>
            <h3>
              <button
                id="undefined-heading"
                aria-controls="undefined-content"
                aria-expanded="false"
              >
                <span>What is Sky Smart Home?</span>
                <span aria-hidden="true">icon</span>
              </button>
            </h3>
            <div
              id="undefined-content"
              aria-labelledby="undefined-heading"
              aria-hidden="true"
              role="region"
              hidden
            >
              <p>Hidden answer.</p>
            </div>
          </div>
        </li>
        <li>
          <div>
            <h3>
              <button
                id="undefined-heading"
                aria-controls="undefined-content"
                aria-expanded="true"
              >
                <span>Can I buy the Indoor Camera on its own?</span>
                <span aria-hidden="true">icon</span>
              </button>
            </h3>
            <div
              id="undefined-content"
              aria-labelledby="undefined-heading"
              aria-hidden="false"
              role="region"
            >
              <p>The Indoor Camera is only available in the Smart Home Bundle, which includes the Smart Doorbell, Chime, and Indoor Camera.</p>
              <p>To use these devices together and unlock all features, you’ll need the Smart Home Plan +.</p>
              <p>The Smart Home Plan + includes features like:</p>
              <ul>
                <li>Video Recording</li>
                <li>Clip Sharing</li>
              </ul>
              <p>It also gives you the flexibility to add more Smart Tech, like Leak Pack, Motion Pack, and an extra Indoor Camera.</p>
            </div>
          </div>
        </li>
      </ul>
      <a href="/help">More FAQs</a>
    </section>
  `);

  const root = document.getElementById("smart-home-faq-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 2, Sky Smart Home FAQs",
    "Answers to your questions and other helpful things.",
    "list, 2 items",
    "heading level 3, What is Sky Smart Home?, collapsed, button, group, 1 of 2",
    "heading level 3, Can I buy the Indoor Camera on its own?, expanded, button, group, 2 of 2",
    "Can I buy the Indoor Camera on its own?, region",
    "The Indoor Camera is only available in the Smart Home Bundle, which includes the Smart Doorbell, Chime, and Indoor Camera.",
    "To use these devices together and unlock all features, you’ll need the Smart Home Plan +.",
    "The Smart Home Plan + includes features like:",
    "list, 2 items",
    "Video Recording, list item, 1 of 2",
    "Clip Sharing, list item, 2 of 2",
    "end of list",
    "It also gives you the flexibility to add more Smart Tech, like Leak Pack, Motion Pack, and an extra Indoor Camera.",
    "end of, Can I buy the Indoor Camera on its own?, region",
    "end of list",
    "More FAQs, link",
  ]);
});

test("announces listbox filters with selected option summary", () => {
  const { document, harness } = loadExtensionHarness(`
    <div
      id="deals-filters-root"
      aria-label="Deals filters"
      role="listbox"
    >
      <button aria-selected="true" role="option" type="button">
        <svg aria-hidden="true"></svg>
        All
      </button>
      <button aria-selected="false" role="option" type="button">TV</button>
      <button aria-selected="false" role="option" type="button">TV &amp; Broadband</button>
      <button aria-selected="false" role="option" type="button">Glass</button>
      <button aria-selected="false" role="option" type="button">Broadband</button>
      <button aria-selected="false" role="option" type="button">Mobile</button>
      <button aria-selected="false" role="option" type="button">Smart Home</button>
    </div>
  `);

  const root = document.getElementById("deals-filters-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "Deals filters, list box, 1 item selected",
    "All, menu item, 1 of 7",
  ]);
});

test("announces labeled deal cards as groups with positioned feature buttons", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="deal-card-root" aria-labelledby="heading-stream_tv_netflix">
      <div>
        <ul style="display:flex;list-style:none;margin:0">
          <li><span>TV</span></li>
        </ul>
      </div>
      <div>
        <h2 id="heading-stream_tv_netflix">Ultimate TV</h2>
      </div>
      <div>
        <ul>
          <li><button aria-label="Sky Stream" type="button"></button></li>
          <li><button aria-label="Ultimate TV" type="button"></button></li>
          <li><button aria-label="Netflix Standard with Ads" type="button"></button></li>
          <li><button aria-label="Disney+ Standard with Ads" type="button"></button></li>
          <li><button aria-label="Hayu" type="button"></button></li>
          <li><button aria-label="Hayu" type="button"></button></li>
          <li><button aria-label="discovery+" type="button"></button></li>
        </ul>
      </div>
      <div>
        <span>From £24 /month</span>
      </div>
      <div>
        <span>Prices may change during 24 month minimum term.</span>
      </div>
      <div>
        <span>No upfront fees</span>
        <span>Streaming sorted for less than £1 a day</span>
      </div>
      <a href="/start">Get Started</a>
      <button type="button">What's included</button>
      <div>
        <span>New Sky Ultimate TV customers only.</span>
        <div><button type="button">See all legals</button></div>
      </div>
    </div>
  `);

  const root = document.getElementById("deal-card-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "Ultimate TV, group",
    "list, 1 items",
    "TV, list item, 1 of 1",
    "end of list",
    "heading level 2, Ultimate TV",
    "list, 7 items",
    "Sky Stream, button, 1 of 7",
    "Ultimate TV, button, 2 of 7",
    "Netflix Standard with Ads, button, 3 of 7",
    "Disney+ Standard with Ads, button, 4 of 7",
    "Hayu, button, 5 of 7",
    "Hayu, button, 6 of 7",
    "discovery+, button, 7 of 7",
    "end of list",
    "From £24 /month",
    "Prices may change during 24 month minimum term.",
    "No upfront fees",
    "Streaming sorted for less than £1 a day",
    "Get Started, link",
    "What's included, button",
    "New Sky Ultimate TV customers only.",
    "See all legals, button",
    "end of, Ultimate TV, group",
  ]);

  assert.equal(getLogEntry(log, "end of, Ultimate TV, group")?.role, "group");
});

test("announces native select sort controls with cleaned labels", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="sort-results-root">
      <span>33 results</span>
      <div>
        <label for="sort-by">
          Sort by:
          <label data-test-id="dropdown-overlay-label">Relevance</label>
          <select id="sort-by">
            <option value="relevance">Relevance</option>
            <option value="price-low-to-high">Price (low to high)</option>
            <option value="price-high-to-low">Price (high to low)</option>
            <option value="most-popular">Most popular</option>
          </select>
        </label>
      </div>
    </div>
  `);

  const root = document.getElementById("sort-results-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "33 results",
    "Sort by:",
    "Relevance",
    "Relevance, Sort by: Relevance, menu pop up, collapsed, button",
  ]);
});

test("announces lead copy for non-interactive list cards with list positions", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="why-choose-sky-root">
      <h2>Why Choose Sky?</h2>
      <ul>
        <li>
          <div>
            <img alt="" src="https://example.test/1.png">
            <p>Watch now on Sky go</p>
            <div>
              <p>While waiting for your Sky Stream or Glass to arrive</p>
            </div>
          </div>
        </li>
        <li>
          <div>
            <img alt="" src="https://example.test/2.png">
            <p>24/7 UK customer support</p>
            <div>
              <p>If you need any help we're always here to support</p>
            </div>
          </div>
        </li>
        <li>
          <div>
            <img alt="" src="https://example.test/3.png">
            <p>Over 25 years of experience</p>
            <div>
              <p>Trusted by customers for over two decades</p>
            </div>
          </div>
        </li>
      </ul>
    </div>
  `);

  const root = document.getElementById("why-choose-sky-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 2, Why Choose Sky?",
    "list, 3 items",
    "Watch now on Sky go, 1 of 3",
    "While waiting for your Sky Stream or Glass to arrive",
    "24/7 UK customer support, 2 of 3",
    "If you need any help we're always here to support",
    "Over 25 years of experience, 3 of 3",
    "Trusted by customers for over two decades",
    "end of list",
  ]);
});

test("announces footer landmarks, footer select labels, and footer end marker", () => {
  const { document, harness } = loadExtensionHarness(`
    <footer id="footer-root">
      <div>
        <a href="https://www.sky.com"><span>Sky home page</span></a>
        <span>© 2026 Sky UK</span>
      </div>
      <div>
        <ul>
          <li><a href="#">Privacy options</a></li>
          <li><a href="https://www.sky.com/help/articles/sky-terms-and-conditions">Terms &amp; conditions</a></li>
          <li><a href="https://www.sky.com/help/articles/sky-privacy-and-cookies-notice">Privacy &amp; cookies notice</a></li>
          <li><a href="https://skyaccessibility.sky/">Accessibility</a></li>
          <li><a href="https://www.sky.com/sitemap">Site map</a></li>
          <li><a href="https://www.sky.com/help/articles/contacting-sky">Contact us</a></li>
          <li><a href="https://www.sky.com/help/articles/sky-customer-complaints-code-of-practice/">Complaints</a></li>
          <li><a href="https://www.skygroup.sky/">Sky Group</a></li>
          <li><a href="https://www.sky.com/shop/store-locator">Store locator</a></li>
        </ul>
      </div>
      <div>
        <label for="mast-f-country-switcher">Country:</label>
        <div>
          <div>
            <select id="mast-f-country-switcher">
              <option value="gb" selected>United Kingdom</option>
              <option value="ie">Republic of Ireland</option>
            </select>
          </div>
        </div>
      </div>
      <a href="#page-top">back to top</a>
    </footer>
  `);

  const root = document.getElementById("footer-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "footer",
    "Sky home page, link",
    "© 2026 Sky UK",
    "list, 9 items",
    "Privacy options, link, 1 of 9",
    "Terms & conditions, link, 2 of 9",
    "Privacy & cookies notice, link, 3 of 9",
    "Accessibility, link, 4 of 9",
    "Site map, link, 5 of 9",
    "Contact us, link, 6 of 9",
    "Complaints, link, 7 of 9",
    "Sky Group, link, 8 of 9",
    "Store locator, link, 9 of 9",
    "end of list",
    "Country:",
    "United Kingdom, Country:, menu pop up, collapsed, button",
    "back to top, link",
    "end of, footer",
  ]);

  assert.equal(getLogEntry(log, "end of, footer")?.role, "contentinfo");
});

test("announces empty basket summary closer to VoiceOver", () => {
  const { document, harness } = loadExtensionHarness(`
    <aside id="basket-root">
      <h2>Basket</h2>
      <hr role="separator">
      <div aria-label="Basket Summary">
        <div>
          <a aria-label="Review your basket" href="https://www.tesco.com/shop/en-GB/trolley">
            <svg aria-hidden="true" viewBox="0 0 24 24"></svg>
          </a>
          <output>
            <h3>£0.00 Guide price</h3>
            <span aria-hidden="true">
              <span>£0.00</span>
              <span>Guide price</span>
            </span>
          </output>
        </div>
        <a aria-disabled="true" role="link">
          <span>Checkout</span>
        </a>
      </div>
      <div>
        <h3>Groceries</h3>
        <hr role="separator">
        <h4>Reserve a slot for either home delivery or collection</h4>
      </div>
      <div>
        <svg aria-hidden="true" viewBox="0 0 24 24"></svg>
        <h4>Grocery basket empty</h4>
        <p>Products you add to your basket will appear here</p>
      </div>
    </aside>
  `);

  const root = document.getElementById("basket-root");
  setVisibleLayout(root);
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "complementary",
    "heading level 2, Basket",
    "horizontal splitter",
    "Basket Summary, group",
    "link, Review your basket",
    "heading level 3, £0.00, level 2 space, level 2 Guide price, level 2, 3 items",
    "dimmed, link, Checkout",
    "end of, Basket Summary, group",
    "heading level 3, Groceries",
    "horizontal splitter",
    "heading level 4, Reserve a slot for either home delivery or collection",
    "heading level 4, Grocery basket empty",
    "Products you add to your basket will appear here",
    "end of, complementary",
  ]);
});

test("announces product cards with linked headings, rating images, and quantity labels", () => {
  const { document, harness } = loadExtensionHarness(`
    <ul>
      <li>
        <div id="product-card-root">
          <h3>
            <a href="https://www.tesco.com/shop/en-GB/products/316438362">
              Tesco Finest Mac &amp; Four Cheese 400g
            </a>
          </h3>
          <div data-testid="star-rating">
            <svg aria-hidden="false" aria-label="Average customer rating 3.8 out of 5 stars" role="img"></svg>
            <svg aria-hidden="true"></svg>
            <p aria-hidden="true">3.8 (57)</p>
          </div>
          <div>
            <a href="/shop/en-GB/reviews/create/products/316438362">Write a review</a>
            <a aria-label="More like this Premium &amp; Tesco Finest Ready Meals For 1" href="/shop/en-GB/browse/fresh-food/ready-meals/tesco-finest-and-premium-ready-meals/premium-and-tesco-finest-ready-meals-for-1">More like this</a>
          </div>
          <div>
            <a href="/shop/en-GB/promotions/98534858">
              <div>
                <svg><title>Clubcard Price</title></svg>
                <p>Any 2 for £8 Clubcard Price - Selected Tesco Finest* Ready Meals</p>
              </div>
              <p>Offer valid for delivery from 03/03/2026 until 12/04/2027</p>
            </a>
          </div>
          <p>£4.75</p>
          <p>£11.88/kg</p>
          <div>
            <label for="quantity-controls-316438362">Quantity controls, undefined</label>
            <div>
              <button type="submit" aria-label="add 1 Tesco Finest Mac &amp; Four Cheese 400g" _formgroupid="quantity-controls-316438362">Add</button>
            </div>
          </div>
        </div>
      </li>
    </ul>
  `);

  const root = document.getElementById("product-card-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 3, link, Tesco Finest Mac & Four Cheese 400g, 1 of 1",
    "Average customer rating 3.8 out of 5 stars, image",
    "Write a review, link",
    "More like this Premium & Tesco Finest Ready Meals For 1, link",
    "Clubcard Price Any 2 for £8 Clubcard Price - Selected Tesco Finest* Ready Meals Offer valid for delivery from 03/03/2026 until 12/04/2027, link",
    "£4.75",
    "£11.88/kg",
    "Quantity controls, undefined",
    "add 1 Tesco Finest Mac & Four Cheese 400g, button",
  ]);
});

test("announces icon-only social links using nested image labels", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="social-links-root">
      <h2>Follow us</h2>
      <ul>
        <li>
          <a href="https://www.facebook.com/tesco/">
            <svg aria-label="Facebook" role="img"></svg>
          </a>
        </li>
        <li>
          <a href="https://twitter.com/tesco">
            <svg aria-label="Twitter" role="img"></svg>
          </a>
        </li>
        <li>
          <a href="https://pinterest.com/tesco/">
            <svg aria-label="Pinterest" role="img"></svg>
          </a>
        </li>
        <li>
          <a href="https://www.youtube.com/tesco">
            <svg aria-label="YouTube" role="img"></svg>
          </a>
        </li>
        <li>
          <a href="https://www.instagram.com/tesco/">
            <svg aria-label="Instagram" role="img"></svg>
          </a>
        </li>
      </ul>
    </div>
  `);

  const root = document.getElementById("social-links-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 2, Follow us",
    "list, 5 items",
    "link, image, Facebook, 1 of 5",
    "link, image, Twitter, 2 of 5",
    "link, image, Pinterest, 3 of 5",
    "link, image, YouTube, 4 of 5",
    "link, image, Instagram, 5 of 5",
    "end of list",
  ]);
});

test("announces masthead logo links and search inputs closer to VoiceOver", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="tesco-masthead-root" data-testid="masthead">
      <a href="/" aria-label="Tesco Home page">
        <svg><title>Tesco Home</title></svg>
      </a>
      <form>
        <div aria-atomic="true" aria-live="polite" role="status" id="search-input-1-results-status"></div>
        <input
          type="search"
          aria-describedby="search-input-1-results-status"
          aria-autocomplete="list"
          aria-busy="false"
          aria-haspopup="listbox"
          id="search-input-1"
          aria-label="Enter a product to search for"
          placeholder="Search"
          value=""
          required
          autocomplete="off"
        >
        <button type="submit" aria-label="Search for products">Search</button>
      </form>
      <a href="/signin">Sign in</a>
      <a href="/register">Register</a>
    </div>
  `);

  const root = document.getElementById("tesco-masthead-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "link, image, Tesco Home page",
    "Enter a product to search for Search, required, list box pop up, search text field, auto complete available",
    "Search for products, button",
    "Sign in, link",
    "Register, link",
  ]);
});

test("announces dependency tables with table context and table-wide row coordinates", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="dependencies-root">
      <h2>Dependencies</h2>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Version</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>@sky-uk/skycons</td>
            <td>2.11.0</td>
          </tr>
          <tr>
            <td>@sky-uk/ui-core</td>
            <td>12.2.1</td>
          </tr>
          <tr>
            <td>@sky-uk/molecules</td>
            <td>Not Found</td>
          </tr>
          <tr>
            <td>@sky-uk/toolkit-react</td>
            <td>Not Found</td>
          </tr>
          <tr>
            <td>@sky-uk/orion-toolkit-react</td>
            <td>Not Found</td>
          </tr>
        </tbody>
      </table>
    </div>
  `);

  const root = document.getElementById("dependencies-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 2, Dependencies",
    "table, 2 columns, 6 rows",
    "Package, column 1 of 2",
    "Version, column 2 of 2",
    "row 2 of 6, Package @sky-uk/skycons, column 1 of 2",
    "Version 2.11.0, column 2 of 2",
    "row 3 of 6, Package @sky-uk/ui-core, column 1 of 2",
    "Version 12.2.1, column 2 of 2",
    "row 4 of 6, Package @sky-uk/molecules, column 1 of 2",
    "Version Not Found, column 2 of 2",
    "row 5 of 6, Package @sky-uk/toolkit-react, column 1 of 2",
    "Version Not Found, column 2 of 2",
    "row 6 of 6, Package @sky-uk/orion-toolkit-react, column 1 of 2",
    "Version Not Found, column 2 of 2",
    "end of table",
  ]);

  assert.equal(getLogEntry(log, "end of table")?.role, "table");
});

test("announces ranked tables with tbody row headers like VoiceOver", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="most-used-components-root">
      <h2>Most Used Components</h2>
      <span aria-atomic="true" aria-live="polite">Page 1 of 2. Showing rows 1 to 10.</span>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Component</th>
            <th>Total usage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>1</th>
            <td>Text</td>
            <td>13</td>
          </tr>
          <tr>
            <th>2</th>
            <td>Box</td>
            <td>12</td>
          </tr>
          <tr>
            <th>3</th>
            <td>Flex</td>
            <td>6</td>
          </tr>
        </tbody>
      </table>
      <button disabled>Previous</button>
      <button>Next</button>
    </div>
  `);

  const root = document.getElementById("most-used-components-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 2, Most Used Components",
    "status, Page 1 of 2. Showing rows 1 to 10.",
    "table, 3 columns, 4 rows",
    "Rank, column 1 of 3",
    "Component, column 2 of 3",
    "Total usage, column 3 of 3",
    "row 1 of 4, Rank 1, column 1 of 3",
    "Component Text, column 2 of 3",
    "Total usage 13, column 3 of 3",
    "row 2 of 4, Rank 2, column 1 of 3",
    "Component Box, column 2 of 3",
    "Total usage 12, column 3 of 3",
    "row 3 of 4, Rank 3, column 1 of 3",
    "Component Flex, column 2 of 3",
    "Total usage 6, column 3 of 3",
    "end of table",
    "Previous, button, dimmed",
    "Next, button",
  ]);
});

test("announces focusable comparison tables with switch labels and group context", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="comparison-root">
      <label for="show-differences">Show only differences</label>
      <div>
        <button
          role="switch"
          aria-checked="false"
          id="show-differences"
          aria-label="Differences on"
        ></button>
      </div>
      <div tabindex="0">
        <table aria-label="Comparison Table Example 2">
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>Column Header 1</th>
              <th>Column Header 2</th>
            </tr>
          </thead>
          <thead aria-hidden="true">
            <tr>
              <th>&nbsp;</th>
              <th>Column Header 1</th>
              <th>Column Header 2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Row Header 1</th>
              <td>Row 1 Cell 1</td>
              <td>Row 1 Cell 2</td>
            </tr>
            <tr>
              <th>Row Header 2</th>
              <td>Row 2 Cell 1</td>
              <td>Row 2 Cell 2</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `);

  const root = document.getElementById("comparison-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "Show only differences",
    "Differences on, off, switch",
    "Comparison Table Example 2, group",
    "Comparison Table Example 2, table, 3 columns, 3 rows",
    "blank, column 1 of 3",
    "Column Header 1, column 2 of 3",
    "Column Header 2, column 3 of 3",
    "row 2 of 3, Row Header 1, column 1 of 3",
    "Column Header 1 Row 1 Cell 1, column 2 of 3",
    "Column Header 2 Row 1 Cell 2, column 3 of 3",
    "row 3 of 3, Row Header 2, column 1 of 3",
    "Column Header 1 Row 2 Cell 1, column 2 of 3",
    "Column Header 2 Row 2 Cell 2, column 3 of 3",
    "end of table",
    "end of, Comparison Table Example 2, group",
  ]);
});

test("flattens text-only youtube metadata groups closer to voiceover", () => {
  const { document, harness } = loadExtensionHarness(`
    <div id="youtube-lockup-root">
      <yt-lockup-view-model class="ytd-item-section-renderer lockup ytLockupViewModelWrapper">
        <div class="ytLockupViewModelHost ytLockupViewModelHorizontal ytLockupViewModelCompact ytLockupViewModelFlexNone">
          <div class="ytLockupViewModelMetadata">
            <yt-lockup-metadata-view-model class="ytLockupMetadataViewModelHost ytLockupMetadataViewModelHorizontal ytLockupMetadataViewModelCompact">
              <div class="ytLockupMetadataViewModelTextContainer">
                <h3 class="ytLockupMetadataViewModelHeadingReset" title="late night drive with sombr | undressed, back to friends, and more">
                  <a href="/watch?v=u36th-a8zMM&amp;t=613s" rel="nofollow" class="ytLockupMetadataViewModelTitle" aria-haspopup="false" aria-label="late night drive with sombr | undressed, back to friends, and more 1 hour, 16 minutes">
                    <span class="ytAttributedStringHost ytAttributedStringWhiteSpacePreWrap" dir="auto" role="text">late night drive with sombr | undressed, back to friends, and more</span>
                  </a>
                </h3>
                <div class="ytLockupMetadataViewModelMetadata">
                  <yt-content-metadata-view-model class="ytContentMetadataViewModelHost">
                    <div role="group" class="ytContentMetadataViewModelMetadataRow">
                      <span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText" dir="auto" role="text">sombaddies</span>
                    </div>
                    <div role="group" class="ytContentMetadataViewModelMetadataRow">
                      <span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText" dir="auto" role="text">648k views</span>
                      <span aria-hidden="true" class="ytContentMetadataViewModelDelimiter"> • </span>
                      <span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText" dir="auto" aria-label="10 months ago" role="text">10 months ago</span>
                    </div>
                  </yt-content-metadata-view-model>
                </div>
              </div>
              <div class="ytLockupMetadataViewModelMenuButton">
                <button-view-model class="ytSpecButtonViewModelHost">
                  <button class="ytSpecButtonShapeNextHost" aria-label="More actions" aria-disabled="false"></button>
                </button-view-model>
              </div>
            </yt-lockup-metadata-view-model>
          </div>
        </div>
      </yt-lockup-view-model>
      <yt-lockup-view-model class="ytd-item-section-renderer lockup ytLockupViewModelWrapper">
        <div class="ytLockupViewModelHost ytLockupViewModelHorizontal ytLockupViewModelCompact ytLockupViewModelFlexNone">
          <div class="ytLockupViewModelMetadata">
            <yt-lockup-metadata-view-model class="ytLockupMetadataViewModelHost ytLockupMetadataViewModelHorizontal ytLockupMetadataViewModelCompact">
              <div class="ytLockupMetadataViewModelTextContainer">
                <h3 class="ytLockupMetadataViewModelHeadingReset" title="🌍 OUR WORLD CUP 2026 PREDICTIONS!">
                  <a href="/watch?v=Gvc0x_tg3IA" rel="nofollow" class="ytLockupMetadataViewModelTitle" aria-haspopup="false" aria-label="🌍 OUR WORLD CUP 2026 PREDICTIONS! 1 hour, 9 minutes">
                    <span class="ytAttributedStringHost ytAttributedStringWhiteSpacePreWrap" dir="auto" role="text">🌍 OUR WORLD CUP 2026 PREDICTIONS!</span>
                  </a>
                </h3>
                <div class="ytLockupMetadataViewModelMetadata">
                  <yt-content-metadata-view-model class="ytContentMetadataViewModelHost">
                    <div role="group" class="ytContentMetadataViewModelMetadataRow">
                      <span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText" dir="auto" role="text">DR Sports<span class="ytAttributedStringLinkInheritColor" dir="auto"><span class="ytAttributedStringInlineBlockMod"><span class="ytIconWrapperHost ytAttributedStringImageElement" role="img" aria-label="" aria-hidden="true"></span></span></span></span>
                    </div>
                    <div role="group" class="ytContentMetadataViewModelMetadataRow">
                      <span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText" dir="auto" role="text">4.8k views</span>
                      <span aria-hidden="true" class="ytContentMetadataViewModelDelimiter"> • </span>
                      <span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText" dir="auto" aria-label="Streamed 6 minutes ago" role="text">Streamed 6 minutes ago</span>
                    </div>
                    <div role="group" class="ytContentMetadataViewModelMetadataRow ytContentMetadataViewModelMetadataRowMetadataRowWrap">
                      <div class="ytContentMetadataViewModelBadge">
                        <yt-badge-view-model class="ytBadgeViewModelHost">
                          <badge-shape class="ytBadgeShapeHost ytBadgeShapeDefault ytBadgeShapeTypography">
                            <div class="ytBadgeShapeText">New</div>
                          </badge-shape>
                        </yt-badge-view-model>
                      </div>
                    </div>
                  </yt-content-metadata-view-model>
                </div>
              </div>
              <div class="ytLockupMetadataViewModelMenuButton">
                <button-view-model class="ytSpecButtonViewModelHost">
                  <button class="ytSpecButtonShapeNextHost" aria-label="More actions" aria-disabled="false"></button>
                </button-view-model>
              </div>
            </yt-lockup-metadata-view-model>
          </div>
        </div>
      </yt-lockup-view-model>
      <yt-lockup-view-model class="ytd-item-section-renderer lockup ytLockupViewModelWrapper">
        <div class="ytLockupViewModelHost ytLockupViewModelHorizontal ytLockupViewModelCompact ytLockupViewModelFlexNone">
          <div class="ytLockupViewModelMetadata">
            <yt-lockup-metadata-view-model class="ytLockupMetadataViewModelHost ytLockupMetadataViewModelHorizontal ytLockupMetadataViewModelCompact">
              <div class="ytLockupMetadataViewModelTextContainer">
                <h3 class="ytLockupMetadataViewModelHeadingReset" title="Stable Ronaldo Reacts To Drake - ICEMAN (Album Reactions)">
                  <a href="/watch?v=5UdPaMbEf9E&amp;t=4090s" rel="nofollow" class="ytLockupMetadataViewModelTitle" aria-haspopup="false" aria-label="Stable Ronaldo Reacts To Drake - ICEMAN (Album Reactions) 2 hours, 18 minutes">
                    <span class="ytAttributedStringHost ytAttributedStringWhiteSpacePreWrap" dir="auto" role="text">Stable Ronaldo Reacts To Drake - ICEMAN (Album Reactions)</span>
                  </a>
                </h3>
                <div class="ytLockupMetadataViewModelMetadata">
                  <yt-content-metadata-view-model class="ytContentMetadataViewModelHost">
                    <div role="group" class="ytContentMetadataViewModelMetadataRow">
                      <span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText" dir="auto" role="text">Stable Ronaldo Live<span class="ytAttributedStringLinkInheritColor" dir="auto"><span class="ytAttributedStringInlineBlockMod"><span class="ytIconWrapperHost ytAttributedStringImageElement" role="img" aria-label="" aria-hidden="true"></span></span></span></span>
                    </div>
                    <div role="group" class="ytContentMetadataViewModelMetadataRow">
                      <span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText" dir="auto" role="text">149k views</span>
                      <span aria-hidden="true" class="ytContentMetadataViewModelDelimiter"> • </span>
                      <span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText" dir="auto" aria-label="3 weeks ago" role="text">3 weeks ago</span>
                    </div>
                  </yt-content-metadata-view-model>
                </div>
              </div>
              <div class="ytLockupMetadataViewModelMenuButton">
                <button-view-model class="ytSpecButtonViewModelHost">
                  <button class="ytSpecButtonShapeNextHost" aria-label="More actions" aria-disabled="false"></button>
                </button-view-model>
              </div>
            </yt-lockup-metadata-view-model>
          </div>
        </div>
      </yt-lockup-view-model>
    </div>
  `);

  const root = document.getElementById("youtube-lockup-root");
  const log = harness.scanSubtree(root);

  assert.deepEqual(getAnnouncements(log), [
    "heading level 3, link, late night drive with sombr | undressed, back to friends, and more 1 hour, 16 minutes",
    "sombaddies",
    "648k views",
    "10 months ago, group",
    "10 months ago",
    "end of, 10 months ago, group",
    "More actions, button",
    "heading level 3, link, 🌍 OUR WORLD CUP 2026 PREDICTIONS! 1 hour, 9 minutes",
    "DR Sports",
    "4.8k views",
    "Streamed 6 minutes ago, group",
    "Streamed 6 minutes ago",
    "end of, Streamed 6 minutes ago, group",
    "New",
    "More actions, button",
    "heading level 3, link, Stable Ronaldo Reacts To Drake - ICEMAN (Album Reactions) 2 hours, 18 minutes",
    "Stable Ronaldo Live",
    "149k views",
    "3 weeks ago, group",
    "3 weeks ago",
    "end of, 3 weeks ago, group",
    "More actions, button",
  ]);
});
