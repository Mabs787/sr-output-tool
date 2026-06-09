// ──────────────────────────────────────────────
// SR Extension — Background Service Worker
//
// Toggles an in-page inspector overlay and relays
// scan state updates to the embedded inspector UI.
// ──────────────────────────────────────────────

async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/content/engine-runtime.js", "src/content/content.js"],
    });
  } catch {
    // Unsupported pages such as chrome:// pages.
  }
}

let creatingOffscreenDocument = null;

async function hasOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL("src/background/offscreen.html");

  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl],
    });
    return contexts.length > 0;
  }

  const matchedClients = await clients.matchAll();
  return matchedClients.some((client) => client.url === offscreenUrl);
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  if (creatingOffscreenDocument) {
    await creatingOffscreenDocument;
    return;
  }

  creatingOffscreenDocument = chrome.offscreen
    .createDocument({
      url: "src/background/offscreen.html",
      reasons: ["CLIPBOARD"],
      justification: "Copy SR output from the embedded inspector panel.",
    })
    .finally(() => {
      creatingOffscreenDocument = null;
    });

  await creatingOffscreenDocument;
}

async function copyTextToClipboard(text) {
  await ensureOffscreenDocument();

  const response = await chrome.runtime.sendMessage({
    type: "SR_OFFSCREEN_COPY",
    text,
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Clipboard copy failed.");
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) {
    return;
  }

  await ensureContentScript(tab.id);

  chrome.tabs
    .sendMessage(tab.id, {
      type: "SR_TOGGLE_PANEL",
      tabId: tab.id,
    })
    .catch(() => {
      // Ignore if the page cannot host the inspector.
    });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SR_COPY_TEXT") {
    copyTextToClipboard(msg.text || "")
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error?.message || String(error),
        });
      });

    return true;
  }

  if (!sender.tab) {
    return undefined;
  }

  if (msg.type === "SR_SCAN_RESULT") {
    chrome.storage.session.set({
      sr_log: msg.log || [],
      sr_selected_element: msg.selectedElement || "",
      sr_selecting: false,
    });
  }

  if (msg.type === "SR_SELECTION_CANCELLED") {
    chrome.storage.session.set({ sr_selecting: false });
  }

  chrome.runtime.sendMessage(msg).catch(() => {
    // The inspector UI may not be mounted.
  });

  return undefined;
});
