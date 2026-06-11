import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..", "..");
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

export async function flushAsyncWork() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

export function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function loadPopup(options = {}) {
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
