import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  generateAnnouncement,
  getContextEndAnnouncement,
} = require("../dist/index.js");

test("generateAnnouncement formats interactive control states", () => {
  assert.equal(
    generateAnnouncement({
      role: "button",
      name: "Filters",
      hasPopup: "menu",
      expanded: false,
    }),
    "Filters, menu pop up collapsed, button",
  );

  assert.equal(
    generateAnnouncement({
      role: "checkbox",
      name: "Email alerts",
      checked: "mixed",
      details: "Choose at least one alert type",
    }),
    "Email alerts, check box, half checked, Choose at least one alert type",
  );

  assert.equal(
    generateAnnouncement({
      role: "button",
      name: "Pause",
      pressed: true,
    }),
    "Pause, selected, toggle button",
  );

  assert.equal(
    generateAnnouncement({
      role: "article",
      text: "Long article body text should not become the article name.",
    }),
    "article",
  );
});

test("generateAnnouncement formats headings, links, and table cells", () => {
  assert.equal(
    generateAnnouncement({
      role: "heading",
      level: 1,
      headingFragments: ["Pricing", "For teams"],
      headingLink: true,
      positionInSet: 2,
      setSize: 4,
    }),
    "heading level 1, link, Pricing, level 2 For teams, level 2, 2 items, 2 of 4",
  );

  assert.equal(
    generateAnnouncement({
      role: "heading",
      level: 3,
      name: "Benefits",
      headingLink: true,
      positionInSet: 1,
      setSize: 16,
    }),
    "heading level 3, level 2, link, Benefits, 1 of 16",
  );

  assert.equal(
    generateAnnouncement({
      role: "link",
      name: "Health A to Z",
      current: true,
      positionInSet: 1,
      setSize: 5,
    }),
    "current item, link, Health A to Z, 1 of 5",
  );

  assert.equal(
    generateAnnouncement({
      role: "cell",
      name: "£99",
      columnHeaderText: "Price",
      tableRole: "table",
      columnIndex: 2,
      columnCount: 3,
      rowIndex: 4,
      rowCount: 8,
    }),
    "Price £99, column 2 of 3",
  );
});

test("getContextEndAnnouncement returns matching container end phrases", () => {
  assert.equal(
    getContextEndAnnouncement({
      role: "navigation",
      name: "Primary",
    }),
    "end of, Primary, navigation",
  );
  assert.equal(
    getContextEndAnnouncement({
      role: "banner",
    }),
    "end of, banner",
  );
  assert.equal(
    getContextEndAnnouncement({
      role: "list",
      roleDescription: "definition list",
    }),
    "end of definition list",
  );
  assert.equal(
    getContextEndAnnouncement({
      role: "complementary",
    }),
    "end of, complementary",
  );
  assert.equal(
    generateAnnouncement({
      role: "contentinfo",
      name: "Apple Footer",
    }),
    "Apple Footer, content information",
  );
  assert.equal(
    getContextEndAnnouncement({
      role: "contentinfo",
      name: "Apple Footer",
    }),
    "end of, Apple Footer, content information",
  );
  assert.equal(
    getContextEndAnnouncement({
      role: "contentinfo",
    }),
    "end of, content information",
  );
  assert.equal(
    getContextEndAnnouncement({
      role: "main",
    }),
    "end of, main",
  );
  assert.equal(
    getContextEndAnnouncement({
      role: "group",
      suppressContextEnd: true,
    }),
    null,
  );
});

test("generateAnnouncement matches VoiceOver phrasing for separators and disabled links", () => {
  assert.equal(
    generateAnnouncement({
      role: "separator",
    }),
    "horizontal splitter",
  );

  assert.equal(
    generateAnnouncement({
      role: "link",
      name: "Checkout",
      disabled: true,
    }),
    "dimmed, link, Checkout",
  );

  assert.equal(
    generateAnnouncement({
      role: "button",
      name: "Previous slide",
      disabled: true,
    }),
    "Previous slide, dimmed, button",
  );

  assert.equal(
    generateAnnouncement({
      role: "link",
      name: "Skip to main content",
    }),
    "link, Skip to main content",
  );

  assert.equal(
    generateAnnouncement({
      role: "list",
      setSize: 2,
    }),
    "list 2 items",
  );
});
