const selectBtn = document.getElementById("select-btn");
const copyBtn = document.getElementById("copy-btn");
const clearBtn = document.getElementById("clear-btn");
const closeBtn = document.getElementById("close-btn");
const statusEl = document.getElementById("status");
const selectedElementEl = document.getElementById("selected-element");
const selectedElementTextEl = document.getElementById("selected-element-text");
const logContainer = document.getElementById("log-container");
const logList = document.getElementById("log-list");

const params = new URLSearchParams(window.location.search);

let targetTabId = Number.parseInt(params.get("tabId") || "", 10);
let currentLog = [];
let currentSelectedElement = "";
let isSelecting = false;

function renderSelectedElement() {
  const text = (currentSelectedElement || "").trim();
  selectedElementTextEl.textContent = text;
  selectedElementTextEl.title = text;
  selectedElementEl.classList.toggle("hidden", !text);
}

function setStatus(text) {
  statusEl.textContent = text;
  statusEl.classList.toggle("hidden", !text);
}

function hasTargetTab() {
  return Number.isInteger(targetTabId) && targetTabId > 0;
}

async function resolveFallbackTab() {
  if (hasTargetTab()) {
    return targetTabId;
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  targetTabId = tab?.id;
  return targetTabId;
}

async function ensureContentScript() {
  const tabId = await resolveFallbackTab();
  if (!tabId) {
    return false;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/content/engine-runtime.js", "src/content/content.js"],
    });
    return true;
  } catch {
    setStatus("The inspector is not available on this page.");
    return false;
  }
}

async function sendToContentScript(msg) {
  const tabId = await resolveFallbackTab();
  if (!tabId) {
    return null;
  }

  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch {
    return null;
  }
}

function updateSelectionState(selecting) {
  isSelecting = selecting;
  selectBtn.textContent = selecting ? "Cancel Picking" : "Pick On Page";
  selectBtn.classList.toggle("active", selecting);
}

function getCopyText() {
  return currentLog.map((entry) => entry.announcement).join("\n");
}

function copyWithExecCommand(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  Object.assign(textarea.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  textarea.remove();
  return copied;
}

async function copyOutput() {
  const text = getCopyText();
  if (!text) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: "SR_COPY_TEXT",
      text,
    });

    if (response?.ok) {
      setStatus("Output copied to clipboard.");
      return;
    }
  } catch {
    // Fall through to the local fallback below.
  }

  if (copyWithExecCommand(text)) {
    setStatus("Output copied to clipboard.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus("Output copied to clipboard.");
    return;
  } catch {
    setStatus("Unable to copy the output from this panel.");
  }
}

async function init() {
  const data = await chrome.storage.session.get([
    "sr_log",
    "sr_selected_element",
    "sr_selecting",
  ]);

  updateSelectionState(Boolean(data.sr_selecting));
  currentSelectedElement = data.sr_selected_element || "";
  renderSelectedElement();

  if (data.sr_selecting) {
    setStatus("Click back into the page and choose an element to scan.");
  }

  if (data.sr_log && data.sr_log.length > 0) {
    currentLog = data.sr_log;
    renderLog();
  }
}

selectBtn.addEventListener("click", async () => {
  const injected = await ensureContentScript();
  if (!injected) {
    return;
  }

  if (isSelecting) {
    await chrome.storage.session.set({ sr_selecting: false });
    updateSelectionState(false);
    setStatus("");
    await sendToContentScript({ type: "SR_CANCEL_SELECTION" });
    return;
  }

  await chrome.storage.session.set({ sr_selecting: true, sr_log: [] });
  currentLog = [];
  currentSelectedElement = "";
  renderSelectedElement();
  renderLog();
  updateSelectionState(true);
  setStatus("Click any element on the page to scan its screen reader output.");
  await sendToContentScript({ type: "SR_START_SELECTION" });
});

copyBtn.addEventListener("click", async () => {
  await copyOutput();
});

clearBtn.addEventListener("click", async () => {
  currentLog = [];
  currentSelectedElement = "";
  renderSelectedElement();
  logList.innerHTML = "";
  logContainer.classList.add("hidden");
  clearBtn.disabled = true;
  copyBtn.disabled = true;
  updateSelectionState(false);
  setStatus("");
  await chrome.storage.session.set({
    sr_log: [],
    sr_selected_element: "",
    sr_selecting: false,
  });
  await ensureContentScript();
  await sendToContentScript({ type: "SR_CLEAR" });
});

selectedElementEl.addEventListener("mouseenter", async () => {
  if (!currentSelectedElement) {
    return;
  }

  await ensureContentScript();
  await sendToContentScript({ type: "SR_HIGHLIGHT_SELECTED_ELEMENT" });
});

selectedElementEl.addEventListener("mouseleave", async () => {
  await sendToContentScript({ type: "SR_CLEAR_HIGHLIGHT" });
});

closeBtn.addEventListener("click", async () => {
  await sendToContentScript({ type: "SR_CLOSE_PANEL" });
});

window.addEventListener("beforeunload", () => {
  sendToContentScript({ type: "SR_CLEAR_HIGHLIGHT" });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SR_SCAN_RESULT") {
    updateSelectionState(false);
    currentLog = msg.log || [];
    currentSelectedElement = msg.selectedElement || "";
    renderSelectedElement();
    renderLog();
  }

  if (msg.type === "SR_SELECTION_CANCELLED") {
    updateSelectionState(false);
    setStatus("");
  }
});

function renderLog() {
  logList.innerHTML = "";

  if (currentLog.length === 0) {
    logContainer.classList.add("hidden");
    clearBtn.disabled = true;
    copyBtn.disabled = true;
    if (!isSelecting && !statusEl.textContent) {
      setStatus("No accessible elements found in the selected element.");
    }
    return;
  }

  logContainer.classList.remove("hidden");
  clearBtn.disabled = false;
  copyBtn.disabled = false;
  setStatus("");

  currentLog.forEach((entry) => {
    const li = document.createElement("li");

    const annoSpan = document.createElement("span");
    annoSpan.className = "announcement";
    annoSpan.textContent = entry.announcement;
    li.appendChild(annoSpan);

    if (entry.role) {
      const roleSpan = document.createElement("span");
      roleSpan.className = "role-tag";
      roleSpan.textContent = entry.role;
      li.appendChild(roleSpan);
    }

    if (entry.srId) {
      li.addEventListener("mouseenter", async () => {
        await ensureContentScript();
        await sendToContentScript({ type: "SR_HIGHLIGHT", srId: entry.srId });
      });

      li.addEventListener("mouseleave", async () => {
        await sendToContentScript({ type: "SR_CLEAR_HIGHLIGHT" });
      });
    }

    logList.appendChild(li);
  });
}

init();
