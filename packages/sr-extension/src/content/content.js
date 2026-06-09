// ──────────────────────────────────────────────
// SR Extension — Content Script
//
// Injected into the active tab on demand. Handles:
//  1. DOM section selection (hover highlight → click to pick)
//  2. Walking the selected subtree to build SR output log
//  3. Highlighting individual elements on demand (from popup)
// ──────────────────────────────────────────────

(() => {
  // Guard against double-injection
  if (window.__sr_extension_injected__) return;
  window.__sr_extension_injected__ = true;

  const MAX_SELECTABLE_ELEMENTS = 150;
  const SELECTABLE_ROOT_SELECTOR = [
    "body",
    "main",
    "section",
    "article",
    "nav",
    "aside",
    "header",
    "footer",
    "form",
    "dialog",
    "button",
    "a[href]",
    'input:not([type="hidden"])',
    "select",
    "textarea",
    "table",
    "pre",
    "ul",
    "ol",
    "p",
    "blockquote",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    '[role="main"]',
    '[role="region"]',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    '[role="complementary"]',
    '[role="dialog"]',
  ].join(", ");

  // ── State ──────────────────────────────────
  let selectionMode = false;
  let hoveredEl = null;
  let panelHost = null;
  let panelFrame = null;
  let panelDragHandle = null;
  let panelDragState = null;
  let selectedScanRoot = null;

  // Overlay element for selection preview
  let overlay = null;
  // Highlight element for log hover
  let highlight = null;

  // ── Overlay helpers ────────────────────────

  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.id = "__sr-ext-overlay__";
    Object.assign(overlay.style, {
      position: "fixed",
      pointerEvents: "none",
      border: "2px solid #0060df",
      background: "rgba(0, 96, 223, 0.08)",
      borderRadius: "3px",
      zIndex: "2147483647",
      transition: "all 0.05s ease",
      display: "none",
    });
    document.documentElement.appendChild(overlay);
  }

  function createHighlight() {
    if (highlight) return;
    highlight = document.createElement("div");
    highlight.id = "__sr-ext-highlight__";
    Object.assign(highlight.style, {
      position: "fixed",
      pointerEvents: "none",
      border: "3px solid red",
      background: "rgba(255, 0, 0, 0.12)",
      borderRadius: "3px",
      zIndex: "2147483646",
      display: "none",
    });
    document.documentElement.appendChild(highlight);
  }

  function positionBox(box, rect) {
    Object.assign(box.style, {
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      height: rect.height + "px",
      display: "block",
    });
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = "none";
  }

  function hideHighlight() {
    if (highlight) highlight.style.display = "none";
  }

  function cleanup() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    if (highlight) {
      highlight.remove();
      highlight = null;
    }
  }

  function isPanelTarget(target) {
    return !!panelHost && (target === panelHost || panelHost.contains(target));
  }

  function createPanel(tabId) {
    if (panelHost) return;

    panelHost = document.createElement("div");
    panelHost.id = "__sr-ext-panel-host__";
    Object.assign(panelHost.style, {
      position: "fixed",
      top: "16px",
      right: "16px",
      width: "420px",
      maxWidth: "calc(100vw - 32px)",
      height: "min(78vh, 760px)",
      maxHeight: "calc(100vh - 32px)",
      minWidth: "320px",
      minHeight: "260px",
      zIndex: "2147483647",
      borderRadius: "14px",
      overflow: "hidden",
      boxShadow: "0 20px 50px rgba(0, 0, 0, 0.28)",
      border: "1px solid rgba(0, 0, 0, 0.12)",
      background: "#fafafa",
      display: "flex",
      flexDirection: "column",
      resize: "both",
    });

    panelDragHandle = document.createElement("div");
    panelDragHandle.id = "__sr-ext-panel-drag__";
    panelDragHandle.setAttribute("aria-hidden", "true");
    Object.assign(panelDragHandle.style, {
      height: "18px",
      flex: "0 0 18px",
      cursor: "move",
      background:
        "linear-gradient(180deg, rgba(0, 0, 0, 0.06), rgba(0, 0, 0, 0.02))",
      borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
    });
    panelDragHandle.addEventListener("mousedown", startPanelDrag);

    panelFrame = document.createElement("iframe");
    panelFrame.id = "__sr-ext-panel-frame__";
    panelFrame.src = chrome.runtime.getURL(
      `src/ui/popup.html?tabId=${tabId}&embedded=1`,
    );
    panelFrame.title = "SR Output Tool";
    Object.assign(panelFrame.style, {
      width: "100%",
      flex: "1 1 auto",
      minHeight: "0",
      border: "0",
      display: "block",
      background: "#fafafa",
    });

    panelHost.appendChild(panelDragHandle);
    panelHost.appendChild(panelFrame);
    document.documentElement.appendChild(panelHost);
  }

  function clampPanelPosition(left, top) {
    if (!panelHost) {
      return { left, top };
    }

    const rect = panelHost.getBoundingClientRect();
    const maxLeft = Math.max(window.innerWidth - rect.width - 8, 8);
    const maxTop = Math.max(window.innerHeight - rect.height - 8, 8);

    return {
      left: Math.min(Math.max(left, 8), maxLeft),
      top: Math.min(Math.max(top, 8), maxTop),
    };
  }

  function updatePanelPosition(left, top) {
    if (!panelHost) return;
    const next = clampPanelPosition(left, top);
    panelHost.style.left = `${next.left}px`;
    panelHost.style.top = `${next.top}px`;
    panelHost.style.right = "auto";
  }

  function onPanelDragMove(event) {
    if (!panelDragState || !panelHost) return;
    updatePanelPosition(
      event.clientX - panelDragState.offsetX,
      event.clientY - panelDragState.offsetY,
    );
  }

  function stopPanelDrag() {
    panelDragState = null;
    window.removeEventListener("mousemove", onPanelDragMove, true);
    window.removeEventListener("mouseup", stopPanelDrag, true);
  }

  function startPanelDrag(event) {
    if (!panelHost) return;
    const rect = panelHost.getBoundingClientRect();
    panelDragState = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    window.addEventListener("mousemove", onPanelDragMove, true);
    window.addEventListener("mouseup", stopPanelDrag, true);
    event.preventDefault();
  }

  function removePanel() {
    exitSelectionMode();
    stopPanelDrag();
    selectedScanRoot = null;
    if (panelDragHandle) {
      panelDragHandle.removeEventListener("mousedown", startPanelDrag);
      panelDragHandle = null;
    }
    if (panelHost) {
      panelHost.remove();
      panelHost = null;
      panelFrame = null;
    }
    clearHighlight();
  }

  function togglePanel(tabId) {
    if (panelHost) {
      removePanel();
      return;
    }

    createPanel(tabId);
  }

  function getReadableText(el) {
    if (!el) return undefined;

    function needsTextBoundary(left, right) {
      const leftChar = left.slice(-1);
      const rightChar = right[0];

      if (!leftChar || !rightChar) {
        return false;
      }

      if (/\s/.test(leftChar) || /\s/.test(rightChar)) {
        return false;
      }

      if (/[.,;:!?)]/.test(rightChar) || /[(]/.test(leftChar)) {
        return false;
      }

      return /[\p{L}\p{N}%]/u.test(leftChar) && /[\p{L}\p{N}]/u.test(rightChar);
    }

    function collectReadableText(node) {
      if (!node) {
        return "";
      }

      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || "";
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }

      let result = "";
      for (const child of Array.from(node.childNodes)) {
        const part = collectReadableText(child);
        if (!part) {
          continue;
        }

        if (result && needsTextBoundary(result, part)) {
          result += " ";
        }

        result += part;
      }

      return result;
    }

    const text = collectReadableText(el).replace(/\s+/g, " ").trim();
    return text || undefined;
  }

  function getStandaloneLabelText(el) {
    if (!el || el.tagName?.toLowerCase() !== "label") {
      return undefined;
    }

    const parts = [];
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.replace(/\s+/g, " ").trim();
        if (text) {
          parts.push(text);
        }
        continue;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      const childEl = child;
      const childTag = childEl.tagName.toLowerCase();
      const childRole = childEl.getAttribute("role") || "";
      if (childEl.getAttribute("aria-hidden") === "true") {
        continue;
      }

      if (
        childTag === "label" ||
        childTag === "input" ||
        childTag === "select" ||
        childTag === "textarea" ||
        childTag === "button" ||
        (childTag === "a" && childEl.hasAttribute("href")) ||
        childRole === "button" ||
        childRole === "link"
      ) {
        continue;
      }

      const text = getReadableText(childEl);
      if (text) {
        parts.push(text);
      }
    }

    return parts.join(" ").replace(/\s+/g, " ").trim() || undefined;
  }

  function hasStandaloneLabelStop(el) {
    if (!el || el.tagName?.toLowerCase() !== "label") {
      return false;
    }

    const labelText = getStandaloneLabelText(el) || getReadableText(el);
    if (!labelText) {
      return false;
    }

    if (
      el.querySelector("select") ||
      el.parentElement?.closest("label")?.querySelector("select")
    ) {
      return true;
    }

    const htmlFor = el.getAttribute("for");
    if (!htmlFor) {
      return false;
    }

    const control = document.getElementById(htmlFor);
    if (!control) {
      return Boolean(el.parentElement?.querySelector("button"));
    }

    const controlTag = control.tagName.toLowerCase();
    const controlRole = control.getAttribute("role") || "";
    return controlTag === "select" || controlRole === "switch";
  }

  function getFocusableTableGroupLabel(el) {
    if (!el || el.tabIndex < 0) {
      return undefined;
    }

    const tables = Array.from(
      el.querySelectorAll(
        ":scope > table, :scope > [role='table'], :scope > [role='grid']",
      ),
    ).filter(
      (child) =>
        child.getAttribute("aria-hidden") !== "true" &&
        isStructuredTableStop(child),
    );

    if (tables.length !== 1) {
      return undefined;
    }

    const nonTableContent = Array.from(el.children).filter(
      (child) => child !== tables[0] && getReadableText(child),
    );
    if (nonTableContent.length > 0) {
      return undefined;
    }

    return (
      tables[0].getAttribute("aria-label") ||
      getReadableText(tables[0].querySelector("caption")) ||
      undefined
    );
  }

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }

    return true;
  }

  function getElementName(el) {
    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel) {
      return ariaLabel.trim();
    }

    const ariaLabelledBy = el.getAttribute("aria-labelledby");
    if (ariaLabelledBy) {
      return ariaLabelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() || "")
        .filter(Boolean)
        .join(" ");
    }

    if ("labels" in el && el.labels && el.labels.length) {
      return el.labels[0].textContent.trim();
    }

    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label) {
        return label.textContent.trim();
      }
    }

    return (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
  }

  function describeSelectableElement(el) {
    const tag = el.tagName.toLowerCase();
    const idPart = el.id ? `#${el.id}` : "";
    const role = el.getAttribute("role");
    const name = getElementName(el);
    const rect = el.getBoundingClientRect();
    const box = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    const descriptor = `<${tag}${idPart}>`;
    const extras = [role ? `role=${role}` : "", name, box].filter(Boolean);
    return [descriptor, extras.join(" - ")].filter(Boolean).join(" ");
  }

  function describeSelectedElementTag(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const tag = el.tagName.toLowerCase();
    const attrs = el
      .getAttributeNames()
      .filter(
        (name) =>
          name !== "data-sr-id" &&
          name !== "data-sr-candidate-id" &&
          !name.startsWith("__sr"),
      )
      .map((name) => {
        const value = el.getAttribute(name);
        return value === "" ? name : `${name}="${value}"`;
      });

    return [`<${tag}`, ...attrs].join(" ") + ">";
  }

  const generateAnnouncement = window.__srEngineGenerateAnnouncement;
  const getContextEndAnnouncement = window.__srEngineGetContextEndAnnouncement;
  const createDomScanner = window.__srEngineCreateDomScanner;
  if (typeof generateAnnouncement !== "function") {
    throw new Error("SR engine announcement helper is not loaded.");
  }
  if (typeof getContextEndAnnouncement !== "function") {
    throw new Error("SR engine context-end helper is not loaded.");
  }
  if (typeof createDomScanner !== "function") {
    throw new Error("SR engine DOM scanner helper is not loaded.");
  }

  const {
    getScanRoot,
    scanSubtree,
    captureElement,
    isStopElement,
    shouldDescendIntoStop,
  } = createDomScanner({
    generateAnnouncement,
    getContextEndAnnouncement,
    now: () => Date.now(),
  });

  function clearCandidateIds() {
    document.querySelectorAll("[data-sr-candidate-id]").forEach((el) => {
      el.removeAttribute("data-sr-candidate-id");
    });
  }

  function getSelectableElements() {
    clearCandidateIds();

    const candidates = [];
    const seen = new Set();
    const elements = document.querySelectorAll(SELECTABLE_ROOT_SELECTOR);

    for (const rawEl of elements) {
      const el = getScanRoot(rawEl);
      if (seen.has(el) || !isVisible(el)) {
        continue;
      }

      seen.add(el);

      const id = `__sr_candidate_${Date.now()}_${candidates.length}`;
      el.setAttribute("data-sr-candidate-id", id);
      candidates.push({
        id,
        label: describeSelectableElement(el),
      });

      if (candidates.length >= MAX_SELECTABLE_ELEMENTS) {
        break;
      }
    }

    return candidates;
  }

  function getCandidateElement(candidateId) {
    if (!candidateId) {
      return null;
    }

    return document.querySelector(
      `[data-sr-candidate-id="${CSS.escape(candidateId)}"]`,
    );
  }

  function scanElement(el) {
    const scanRoot = getScanRoot(el);
    selectedScanRoot = scanRoot;

    if (!scanRoot) {
      selectedScanRoot = null;
      chrome.runtime.sendMessage({
        type: "SR_SCAN_RESULT",
        log: [],
        selectedElement: "",
      });
      return;
    }

    clearSrIds();
    const selectedElement = describeSelectedElementTag(scanRoot);
    const log = scanSubtree(scanRoot);
    chrome.runtime.sendMessage({
      type: "SR_SCAN_RESULT",
      log,
      selectedElement,
    });
  }

  window.__sr_extension_test__ = {
    getScanRoot,
    getSelectableTarget,
    scanSubtree,
    captureElement,
    generateAnnouncement,
    isStopElement,
    shouldDescendIntoStop,
  };

  // ── Highlight a specific element by its sr-id ──

  function highlightElement(srId) {
    createHighlight();
    const el = document.querySelector(`[data-sr-id="${CSS.escape(srId)}"]`);
    if (!el) {
      hideHighlight();
      return;
    }
    const rect = el.getBoundingClientRect();
    positionBox(highlight, rect);
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function highlightSelectedElement() {
    if (!selectedScanRoot || !document.documentElement.contains(selectedScanRoot)) {
      hideHighlight();
      return false;
    }

    createHighlight();
    positionBox(highlight, selectedScanRoot.getBoundingClientRect());
    selectedScanRoot.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return true;
  }

  function clearHighlight() {
    hideHighlight();
  }

  function clearSrIds() {
    document.querySelectorAll("[data-sr-id]").forEach((el) => {
      el.removeAttribute("data-sr-id");
    });
    hideHighlight();
  }

  function isInlineSelectionTarget(el) {
    const style = getComputedStyle(el);
    if (style.display === "inline" || style.display === "contents") {
      return true;
    }

    return [
      "span",
      "strong",
      "em",
      "b",
      "i",
      "small",
      "mark",
      "abbr",
      "cite",
      "q",
      "s",
      "u",
      "sub",
      "sup",
      "time",
    ].includes(el.tagName.toLowerCase());
  }

  function getSelectionContainerTarget(target) {
    let current = target;

    while (
      current &&
      current !== document.body &&
      current !== document.documentElement
    ) {
      if (!isInlineSelectionTarget(current)) {
        return current;
      }

      current = current.parentElement;
    }

    return target;
  }

  function getSelectableTarget(target) {
    if (!target || target.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    if (isPanelTarget(target)) {
      return null;
    }

    const containerTarget = getSelectionContainerTarget(target);
    const containerScanRoot = getScanRoot(containerTarget);

    if (
      containerScanRoot &&
      containerScanRoot !== document.body &&
      containerScanRoot !== document.documentElement &&
      isVisible(containerScanRoot)
    ) {
      return containerScanRoot;
    }

    const matched = target.matches(SELECTABLE_ROOT_SELECTOR)
      ? target
      : target.closest(SELECTABLE_ROOT_SELECTOR);

    if (!matched) {
      return null;
    }

    const scanRoot = getScanRoot(matched);
    return scanRoot && isVisible(scanRoot) ? scanRoot : null;
  }

  function updateHoveredElement(nextEl) {
    hoveredEl = nextEl;

    if (!hoveredEl) {
      hideOverlay();
      return;
    }

    createOverlay();
    positionBox(overlay, hoveredEl.getBoundingClientRect());
  }

  function handleSelectionPointerMove(event) {
    if (!selectionMode) {
      return;
    }

    const nextEl = getSelectableTarget(event.target);
    if (nextEl === hoveredEl) {
      return;
    }

    updateHoveredElement(nextEl);
  }

  function handleSelectionClick(event) {
    if (!selectionMode) {
      return;
    }

    const target = getSelectableTarget(event.target);
    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    exitSelectionMode({ notify: false });
    scanElement(target);
  }

  function handleSelectionKeydown(event) {
    if (!selectionMode || event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    exitSelectionMode({ notify: true });
  }

  function enterSelectionMode() {
    if (selectionMode) {
      return;
    }

    selectionMode = true;
    createOverlay();
    hideOverlay();

    window.addEventListener("mousemove", handleSelectionPointerMove, true);
    window.addEventListener("click", handleSelectionClick, true);
    window.addEventListener("keydown", handleSelectionKeydown, true);
  }

  function exitSelectionMode(options = {}) {
    const { notify = true } = options;

    if (!selectionMode) {
      return;
    }

    selectionMode = false;
    hoveredEl = null;
    hideOverlay();

    window.removeEventListener("mousemove", handleSelectionPointerMove, true);
    window.removeEventListener("click", handleSelectionClick, true);
    window.removeEventListener("keydown", handleSelectionKeydown, true);

    if (notify) {
      chrome.runtime.sendMessage({ type: "SR_SELECTION_CANCELLED" }).catch(() => {
        // Ignore if the extension UI is no longer listening.
      });
    }
  }

  // ── Message handling ───────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg.type) {
      case "SR_TOGGLE_PANEL":
        togglePanel(msg.tabId);
        sendResponse({ ok: true });
        break;

      case "SR_CLOSE_PANEL":
        removePanel();
        sendResponse({ ok: true });
        break;

      case "SR_START_SELECTION":
        enterSelectionMode();
        sendResponse({ ok: true });
        break;

      case "SR_CANCEL_SELECTION":
        exitSelectionMode();
        sendResponse({ ok: true });
        break;

      case "SR_GET_SELECTABLE_ELEMENTS":
        sendResponse({ elements: getSelectableElements() });
        break;

      case "SR_SCAN_ELEMENT":
        scanElement(getCandidateElement(msg.candidateId));
        sendResponse({ ok: true });
        break;

      case "SR_HIGHLIGHT":
        highlightElement(msg.srId);
        sendResponse({ ok: true });
        break;

      case "SR_HIGHLIGHT_SELECTED_ELEMENT":
        sendResponse({ ok: highlightSelectedElement() });
        break;

      case "SR_HIGHLIGHT_CANDIDATE": {
        const el = getCandidateElement(msg.candidateId);
        if (!el) {
          clearHighlight();
          sendResponse({ ok: false });
          break;
        }

        createHighlight();
        positionBox(highlight, el.getBoundingClientRect());
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        sendResponse({ ok: true });
        break;
      }

      case "SR_CLEAR_HIGHLIGHT":
        clearHighlight();
        sendResponse({ ok: true });
        break;

      case "SR_CLEAR":
        exitSelectionMode();
        selectedScanRoot = null;
        clearCandidateIds();
        clearSrIds();
        clearHighlight();
        sendResponse({ ok: true });
        break;

      default:
        sendResponse({ ok: false });
    }
    return true; // keep channel open for async
  });
})();
