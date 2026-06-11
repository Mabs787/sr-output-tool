import test from "node:test";
import assert from "node:assert/strict";
import { flushAsyncWork, loadPopup, toPlain } from "./harness.mjs";

test("theme changes persist and update the content panel theme", async () => {
  const { document, window, calls } = await loadPopup({
    syncData: {
      sr_theme: "system",
    },
  });

  const darkInput = document.querySelector("input[name='theme'][value='dark']");
  darkInput.checked = true;
  darkInput.dispatchEvent(new window.Event("change", { bubbles: true }));
  await flushAsyncWork();

  assert.equal(document.documentElement.dataset.themePreference, "dark");
  assert.equal(document.documentElement.dataset.theme, "dark");
  assert.deepEqual(toPlain(calls.syncSet.at(-1)), { sr_theme: "dark" });
  assert.deepEqual(toPlain(calls.tabsSendMessage.at(-1)), {
    tabId: 123,
    message: {
      type: "SR_SET_PANEL_THEME",
      theme: "dark",
    },
  });
});

test("settings menu toggles open and closes on Escape", async () => {
  const { document, window } = await loadPopup();
  const settingsBtn = document.querySelector("#settings-btn");
  const settingsMenu = document.querySelector("#settings-menu");

  settingsBtn.click();

  assert.equal(settingsMenu.classList.contains("hidden"), false);
  assert.equal(settingsBtn.getAttribute("aria-expanded"), "true");

  document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" }));

  assert.equal(settingsMenu.classList.contains("hidden"), true);
  assert.equal(settingsBtn.getAttribute("aria-expanded"), "false");
});
