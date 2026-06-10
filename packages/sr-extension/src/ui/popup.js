const selectBtn = document.getElementById("select-btn");
const copyBtn = document.getElementById("copy-btn");
const clearBtn = document.getElementById("clear-btn");
const feedbackBtn = document.getElementById("feedback-btn");
const settingsBtn = document.getElementById("settings-btn");
const settingsMenu = document.getElementById("settings-menu");
const closeBtn = document.getElementById("close-btn");
const statusEl = document.getElementById("status");
const selectedElementEl = document.getElementById("selected-element");
const selectedElementTextEl = document.getElementById("selected-element-text");
const logContainer = document.getElementById("log-container");
const logList = document.getElementById("log-list");
const themeInputs = Array.from(document.querySelectorAll("input[name='theme']"));

const params = new URLSearchParams(window.location.search);
const FEEDBACK_URL = "https://github.com/Mabs787/sr-output-tool/issues";
const THEME_STORAGE_KEY = "sr_theme";
const THEME_MODES = new Set(["system", "light", "dark"]);

let targetTabId = Number.parseInt(params.get("tabId") || "", 10);
let currentLog = [];
let currentSelectedElement = "";
let isSelecting = false;
let currentThemePreference = "system";
const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function getResolvedTheme(preference) {
  if (preference === "dark" || preference === "light") {
    return preference;
  }

  return systemDarkQuery.matches ? "dark" : "light";
}

async function persistThemePreference(preference) {
  try {
    await chrome.storage.sync.set({ [THEME_STORAGE_KEY]: preference });
  } catch {
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: preference });
  }
}

async function readThemePreference() {
  try {
    const data = await chrome.storage.sync.get([THEME_STORAGE_KEY]);
    return data[THEME_STORAGE_KEY];
  } catch {
    const data = await chrome.storage.local.get([THEME_STORAGE_KEY]);
    return data[THEME_STORAGE_KEY];
  }
}

function applyThemePreference(preference) {
  currentThemePreference = THEME_MODES.has(preference) ? preference : "system";
  const resolvedTheme = getResolvedTheme(currentThemePreference);

  document.documentElement.dataset.themePreference = currentThemePreference;
  document.documentElement.dataset.theme = resolvedTheme;
  document.body.dataset.themePreference = currentThemePreference;
  document.body.dataset.theme = resolvedTheme;

  for (const input of themeInputs) {
    input.checked = input.value === currentThemePreference;
  }

  sendToContentScript({
    type: "SR_SET_PANEL_THEME",
    theme: resolvedTheme,
  });
}

async function initTheme() {
  const storedPreference = await readThemePreference();
  applyThemePreference(storedPreference);
}

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

function setSettingsMenuOpen(open) {
  settingsMenu.classList.toggle("hidden", !open);
  settingsBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

function isSettingsMenuOpen() {
  return !settingsMenu.classList.contains("hidden");
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
  await initTheme();

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

feedbackBtn.addEventListener("click", async () => {
  await chrome.tabs.create({ url: FEEDBACK_URL });
});

settingsBtn.addEventListener("click", () => {
  setSettingsMenuOpen(!isSettingsMenuOpen());
});

document.addEventListener("click", (event) => {
  if (
    !isSettingsMenuOpen() ||
    settingsMenu.contains(event.target) ||
    settingsBtn.contains(event.target)
  ) {
    return;
  }

  setSettingsMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !isSettingsMenuOpen()) {
    return;
  }

  setSettingsMenuOpen(false);
  settingsBtn.focus();
});

for (const input of themeInputs) {
  input.addEventListener("change", async () => {
    if (!input.checked) {
      return;
    }

    const nextPreference = THEME_MODES.has(input.value)
      ? input.value
      : "system";
    applyThemePreference(nextPreference);
    await persistThemePreference(nextPreference);
  });
}

systemDarkQuery.addEventListener("change", () => {
  if (currentThemePreference === "system") {
    applyThemePreference("system");
  }
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
    logContainer.classList.remove("hidden");
    clearBtn.disabled = false;
    copyBtn.disabled = true;

    const li = document.createElement("li");
    li.className = "empty-output";

    const annoSpan = document.createElement("span");
    annoSpan.className = "announcement";
    annoSpan.textContent = "No output for element.";
    li.appendChild(annoSpan);
    logList.appendChild(li);

    setStatus("");
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
