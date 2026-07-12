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
      role: "button",
      name: "Show/hide shortcuts, shift, option, z",
      details: "To move between items, use your keyboard's up or down arrows.",
      positionInSet: 5,
      setSize: 5,
    }),
    "Show/hide shortcuts, shift, option, z To move between items, use your keyboard's up or down arrows., button, 5 of 5",
  );

  assert.equal(
    generateAnnouncement({
      role: "button",
      name: "All Departments",
      details: "Select the department you want to search in",
      hasPopup: "menu",
      expanded: false,
    }),
    "All Departments Select the department you want to search in, menu pop up collapsed, button",
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

  assert.equal(
    generateAnnouncement({
      role: "textbox",
      name: "Postcode",
      placeholder: "Postcode",
      invalid: true,
    }),
    "Postcode, invalid data, edit text",
  );

  assert.equal(
    generateAnnouncement({
      role: "textbox",
      name: "Enter your postcode",
      placeholder: "Enter your postcode",
    }),
    "Enter your postcode, edit text",
  );

  assert.equal(
    generateAnnouncement({
      role: "textbox",
      name: "Email",
      placeholder: "name@example.com",
    }),
    "Email, edit text, name@example.com",
  );

  assert.equal(
    generateAnnouncement({
      role: "searchbox",
      name: "Enter a product to search for Search",
      required: true,
      hasPopup: "listbox",
      autocomplete: "list",
    }),
    "Enter a product to search for Search, required list box pop up, search text field",
  );

  assert.equal(
    generateAnnouncement({
      role: "searchbox",
      name: "Search Amazon",
      placeholder: "Search Amazon",
      hasPopup: "grid",
      autocomplete: "list",
    }),
    "Search Amazon, grid pop up, search text field",
  );

  assert.equal(
    generateAnnouncement({
      role: "combobox",
      required: true,
      autocomplete: "list",
      expanded: false,
    }),
    "required list box pop up collapsed, combo box",
  );

  assert.equal(
    generateAnnouncement({
      role: "combobox",
      placeholder: "Search",
      hasPopup: "listbox",
      autocomplete: "list",
      expanded: true,
    }),
    "Search list box pop up expanded, combo box",
  );

  assert.equal(
    generateAnnouncement({
      role: "combobox",
      name: "Search",
      placeholder: "Search",
      hasPopup: "listbox",
      autocomplete: "list",
      expanded: true,
    }),
    "Search list box pop up expanded, combo box",
  );

  assert.equal(
    generateAnnouncement({
      role: "combobox",
      nativeSelect: true,
      value: "All Departments",
      name: "Search in",
      details: "Select the department you want to search in",
      expanded: false,
    }),
    "All Departments, Search in Select the department you want to search in, menu pop up collapsed, button",
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
      role: "link",
      name: "main content",
      details: "To move between items, use your keyboard's up or down arrows.",
      positionInSet: 1,
      setSize: 1,
    }),
    "link, main content To move between items, use your keyboard's up or down arrows.",
  );

  assert.equal(
    generateAnnouncement({
      role: "link",
      name: "Search, option, forward slash",
      details: "To move between items, use your keyboard's up or down arrows.",
      positionInSet: 1,
      setSize: 5,
    }),
    "link, Search, option, forward slash To move between items, use your keyboard's up or down arrows., 1 of 5",
  );

  assert.equal(
    generateAnnouncement({
      role: "link",
      name: "Ready for kick-off?. Shop now.",
      linkHeadingLevel: 3,
    }),
    "link, heading level 3, Ready for kick-off?. Shop now.",
  );

  assert.equal(
    generateAnnouncement({
      role: "radio",
      name: "All",
      checked: true,
      fieldsetRadioGroup: true,
    }),
    "All, selected, radio button",
  );

  assert.equal(
    generateAnnouncement({
      role: "radio",
      name: "Electronics & Gaming",
      checked: false,
      fieldsetRadioGroup: true,
    }),
    "Electronics & Gaming, radio button",
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
    generateAnnouncement({
      role: "group",
      name: "Popular offers ending soon",
      roleDescription: "carousel",
    }),
    "Popular offers ending soon, carousel",
  );
  assert.equal(
    getContextEndAnnouncement({
      role: "group",
      name: "Popular offers ending soon",
      roleDescription: "carousel",
    }),
    "end of, Popular offers ending soon, carousel",
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
      role: "dialog",
      name: "No suggestions",
    }),
    "end of, No suggestions, dialog",
  );
  assert.equal(
    getContextEndAnnouncement({
      role: "tooltip",
    }),
    "end of, tooltip",
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
      role: "heading",
      name: "What broadband speed do I need for gaming?",
      level: 3,
      headingButton: true,
      expanded: false,
      groupContext: true,
      positionInSet: 1,
      setSize: 5,
    }),
    "heading level 3, What broadband speed do I need for gaming?, collapsed, button, group, 1 of 5",
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
