import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const popupHtml = readFileSync(
  path.join(packageRoot, "src/ui/popup.html"),
  "utf8",
).replace(/<script src="popup\.js"><\/script>/, "");
const popupSource = readFileSync(
  path.join(packageRoot, "src/ui/popup.js"),
  "utf8",
);

function createChromeMock({
  sessionData = {},
  syncData = {},
  fallbackTabId = 777,
  copyResponse = { ok: true },
} = {}) {
  const calls = {
    executeScript: [],
    sessionSet: [],
    syncSet: [],
    localSet: [],
    tabsQuery: [],
    tabsSendMessage: [],
    tabsCreate: [],
    runtimeSendMessage: [],
  };
  const runtimeListeners = [];

  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          runtimeListeners.push(listener);
        },
      },
      async sendMessage(message) {
        calls.runtimeSendMessage.push(message);
        if (message.type === "SR_COPY_TEXT") {
          return copyResponse;
        }
        return undefined;
      },
    },
    scripting: {
      async executeScript(details) {
        calls.executeScript.push(details);
      },
    },
    storage: {
      session: {
        async get(keys) {
          return Object.fromEntries(keys.map((key) => [key, sessionData[key]]));
        },
        async set(nextData) {
          calls.sessionSet.push(nextData);
          Object.assign(sessionData, nextData);
        },
      },
      sync: {
        async get(keys) {
          return Object.fromEntries(keys.map((key) => [key, syncData[key]]));
        },
        async set(nextData) {
          calls.syncSet.push(nextData);
          Object.assign(syncData, nextData);
        },
      },
      local: {
        async get() {
          return {};
        },
        async set(nextData) {
          calls.localSet.push(nextData);
        },
      },
    },
    tabs: {
      async query(query) {
        calls.tabsQuery.push(query);
        return [{ id: fallbackTabId }];
      },
      async sendMessage(tabId, message) {
        calls.tabsSendMessage.push({ tabId, message });
        return undefined;
      },
      async create(details) {
        calls.tabsCreate.push(details);
      },
    },
  };

  return {
    chrome,
    calls,
    emitRuntimeMessage(message) {
      for (const listener of runtimeListeners) {
        listener(message);
      }
    },
  };
}

function createMatchMedia({ matches = false } = {}) {
  const listeners = new Set();

  return () => ({
    matches,
    media: "(prefers-color-scheme: dark)",
    addEventListener(type, listener) {
      if (type === "change") {
        listeners.add(listener);
      }
    },
    removeEventListener(type, listener) {
      if (type === "change") {
        listeners.delete(listener);
      }
    },
    dispatchChange(nextMatches) {
      matches = nextMatches;
      for (const listener of listeners) {
        listener({ matches });
      }
    },
  });
}

async function flushAsyncWork() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

async function loadPopup(options = {}) {
  const chromeMock = createChromeMock(options);
  const dom = new JSDOM(popupHtml, {
    url: options.url || "chrome-extension://test/src/ui/popup.html?tabId=123",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });

  dom.window.chrome = chromeMock.chrome;
  dom.window.matchMedia = createMatchMedia({
    matches: Boolean(options.systemDark),
  });
  dom.window.navigator.clipboard = {
    writeText: async () => undefined,
  };
  dom.window.eval(popupSource);

  await flushAsyncWork();

  return {
    dom,
    window: dom.window,
    document: dom.window.document,
    ...chromeMock,
  };
}

test("popup initializes from stored log and selected element", async () => {
  const { document } = await loadPopup({
    sessionData: {
      sr_log: [
        {
          announcement: "Submit button",
          role: "button",
          srId: "sr-1",
        },
      ],
      sr_selected_element: "button#submit",
      sr_selecting: false,
    },
  });

  assert.equal(
    document.querySelector("#selected-element").classList.contains("hidden"),
    false,
  );
  assert.equal(
    document.querySelector("#selected-element-text").textContent,
    "button#submit",
  );
  assert.equal(
    document.querySelector("#log-list .announcement").textContent,
    "Submit button",
  );
  assert.equal(document.querySelector("#log-list .role-tag").textContent, "button");
  assert.equal(document.querySelector("#copy-btn").disabled, false);
  assert.equal(document.querySelector("#clear-btn").disabled, false);
});

test("pick button starts and cancels page selection", async () => {
  const { document, calls } = await loadPopup();
  const selectBtn = document.querySelector("#select-btn");

  selectBtn.click();
  await flushAsyncWork();

  assert.equal(selectBtn.textContent, "Cancel Picking");
  assert.equal(selectBtn.classList.contains("active"), true);
  assert.deepEqual(toPlain(calls.sessionSet.at(-1)), {
    sr_selecting: true,
    sr_log: [],
  });
  assert.deepEqual(toPlain(calls.tabsSendMessage.at(-1)), {
    tabId: 123,
    message: { type: "SR_START_SELECTION" },
  });
  assert.deepEqual(toPlain(calls.executeScript.at(-1)), {
    target: { tabId: 123 },
    files: ["src/content/engine-runtime.js", "src/content/content.js"],
  });

  selectBtn.click();
  await flushAsyncWork();

  assert.equal(selectBtn.textContent, "Pick On Page");
  assert.equal(selectBtn.classList.contains("active"), false);
  assert.deepEqual(toPlain(calls.sessionSet.at(-1)), { sr_selecting: false });
  assert.deepEqual(toPlain(calls.tabsSendMessage.at(-1)), {
    tabId: 123,
    message: { type: "SR_CANCEL_SELECTION" },
  });
});

test("runtime scan result renders output and enables copy", async () => {
  const { document, emitRuntimeMessage } = await loadPopup();

  emitRuntimeMessage({
    type: "SR_SCAN_RESULT",
    selectedElement: "a.learn-more",
    log: [
      {
        announcement: "Learn more link",
        role: "link",
        srId: "sr-2",
      },
    ],
  });

  assert.equal(document.querySelector("#select-btn").textContent, "Pick On Page");
  assert.equal(
    document.querySelector("#selected-element-text").textContent,
    "a.learn-more",
  );
  assert.equal(
    document.querySelector("#log-list .announcement").textContent,
    "Learn more link",
  );
  assert.equal(document.querySelector("#copy-btn").disabled, false);
});

test("copy sends joined screen reader output to the background worker", async () => {
  const { document, calls } = await loadPopup({
    sessionData: {
      sr_log: [
        { announcement: "Name edit text" },
        { announcement: "Required" },
      ],
    },
  });

  document.querySelector("#copy-btn").click();
  await flushAsyncWork();

  assert.deepEqual(toPlain(calls.runtimeSendMessage.at(-1)), {
    type: "SR_COPY_TEXT",
    text: "Name edit text\nRequired",
  });
  assert.equal(
    document.querySelector("#status").textContent,
    "Output copied to clipboard.",
  );
});

test("clear resets stored state and tells the content script", async () => {
  const { document, calls } = await loadPopup({
    sessionData: {
      sr_log: [{ announcement: "Heading level 1" }],
      sr_selected_element: "h1",
    },
  });

  document.querySelector("#clear-btn").click();
  await flushAsyncWork();

  assert.equal(document.querySelector("#copy-btn").disabled, true);
  assert.equal(document.querySelector("#clear-btn").disabled, true);
  assert.equal(document.querySelector("#log-container").classList.contains("hidden"), true);
  assert.equal(
    document.querySelector("#selected-element").classList.contains("hidden"),
    true,
  );
  assert.deepEqual(toPlain(calls.sessionSet.at(-1)), {
    sr_log: [],
    sr_selected_element: "",
    sr_selecting: false,
  });
  assert.deepEqual(toPlain(calls.tabsSendMessage.at(-1)), {
    tabId: 123,
    message: { type: "SR_CLEAR" },
  });
});

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
