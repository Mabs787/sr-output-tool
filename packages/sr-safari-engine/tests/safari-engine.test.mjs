import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import {
  createSafariDomScanner,
  generateSafariAnnouncement,
} from "../dist/index.js";

function scan(html) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  const previous = {
    HTMLElement: globalThis.HTMLElement,
    NodeFilter: globalThis.NodeFilter,
  };
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.NodeFilter = dom.window.NodeFilter;
  try {
    return createSafariDomScanner({ root: dom.window.document.body }).scan();
  } finally {
    globalThis.HTMLElement = previous.HTMLElement;
    globalThis.NodeFilter = previous.NodeFilter;
  }
}

test("announces lists, headings, prices, links, and the list ending in DOM order", () => {
  const result = scan(`
    <ul>
      <li><h3>Apple iPhone 17 Pro</h3><span>£30 a month</span><a href="/deal">View deal</a></li>
      <li><h3>Google Pixel 11</h3><span>£28 a month</span><a href="/deal">View deal</a></li>
      <li><h3>Samsung Galaxy Z Flip8</h3><span>£35 a month</span><a href="/deal">View deal</a></li>
    </ul>
  `);
  assert.deepEqual(result.announcements, [
    "list 3 items",
    "heading level 3 Apple iPhone 17 Pro 1 of 3",
    "£30 a month 1 of 3",
    "link View deal 1 of 3",
    "heading level 3 Google Pixel 11 2 of 3",
    "£28 a month 2 of 3",
    "link View deal 2 of 3",
    "heading level 3 Samsung Galaxy Z Flip8 3 of 3",
    "£35 a month 3 of 3",
    "link View deal 3 of 3",
    "end of list",
  ]);
  assert.equal(result.candidates.some((candidate) => candidate.disposition === "uncovered"), false);
});

test("announces generic standalone readable leaves", () => {
  const result = scan(`<section><div><span>Delivery included</span></div><div>Tail guard</div></section>`);
  assert.deepEqual(result.announcements, ["Delivery included", "Tail guard"]);
});

test("suppresses aria-hidden visual duplicates", () => {
  const result = scan(`<span aria-hidden="true">£30</span><span>£30</span>`);
  assert.deepEqual(result.announcements, ["£30"]);
  const hidden = result.candidates.find((candidate) => candidate.domPath.includes("nth-of-type(1)"));
  assert.equal(hidden?.disposition, "suppressed");
});

test("does not repeat aria-labelledby or aria-describedby sources", () => {
  const result = scan(`
    <span id="name">Account</span><span id="help">Use your email address</span>
    <input aria-labelledby="name" aria-describedby="help" value="me@example.test">
  `);
  assert.deepEqual(result.announcements, [
    "Account Use your email address me@example.test edit text",
  ]);
  assert.equal(result.candidates.filter((candidate) => candidate.text === "Account")[0]?.disposition, "consumed");
});

test("visible labels are announced and also name their controls", () => {
  const result = scan(`<label for="email">Email address</label><input id="email" required>`);
  assert.deepEqual(result.announcements, ["Email address", "Email address edit text required"]);
});

test("text inside headings, paragraphs, links, and buttons is owned once", () => {
  const result = scan(`<h2>Title</h2><p>Introduction</p><a href="/a"><span>Read more</span></a><button><span>Save</span></button>`);
  assert.deepEqual(result.announcements, [
    "heading level 2 Title",
    "Introduction",
    "link Read more",
    "Save button",
  ]);
  assert.equal(result.candidates.some((candidate) => candidate.disposition === "uncovered"), false);
});

test("records duplicate standalone leaves instead of announcing them twice", () => {
  const result = scan(`<div>Repeated</div><div>Repeated</div>`);
  assert.deepEqual(result.announcements, ["Repeated"]);
  assert.equal(result.candidates.filter((candidate) => candidate.disposition === "duplicate").length, 1);
});

test("renders compact descriptors without accessing the production formatter", () => {
  assert.equal(generateSafariAnnouncement({
    id: "test",
    kind: "element",
    role: "checkbox",
    name: "Updates",
    description: "",
    value: "",
    text: "",
    tagName: "input",
    checked: true,
    provenance: { candidateIds: [], domPath: "input", source: "semantic" },
  }), "Updates checked checkbox");
});

test("models Safari landmark entry and exit phrasing without exposing scripts", () => {
  const result = scan(`
    <script>window.secret = 'not accessible'</script>
    <section aria-label="Cookies"><h2>Cookies</h2><button>Accept</button></section>
    <header><nav aria-label="Primary"><a href="/"><img alt="Home"></a></nav></header>
    <main><p>Page content</p></main><footer><hr><a href="/privacy">Privacy</a></footer>
  `);
  assert.deepEqual(result.announcements, [
    "Cookies region",
    "heading level 2 Cookies",
    "Accept button",
    "end of Cookies region",
    "banner",
    "Primary navigation",
    "link image Home",
    "end of Primary navigation",
    "end of banner",
    "main",
    "Page content",
    "end of main",
    "content information",
    "horizontal separator",
    "link Privacy",
    "end of content information",
  ]);
  assert.equal(result.announcements.some((announcement) => announcement.includes("secret")), false);
});
