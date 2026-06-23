import { addons, useEffect } from "storybook/preview-api";
import type {
  Renderer,
  PartialStoryFn as StoryFunction,
  StoryContext,
} from "storybook/internal/types";
import {
  createDomScanner,
  generateAnnouncement,
  getContextEndAnnouncement,
} from "@sr-output/engine";
import { EVENTS } from "./constants";

// ── Highlight overlay ─────────────────────────────────────────────────────────

const OVERLAY_ID = "__sr-addon-highlight__";

function getOrCreateOverlay(root: HTMLElement): HTMLElement {
  let overlay = root.ownerDocument.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = root.ownerDocument.createElement("div");
    overlay.id = OVERLAY_ID;
    Object.assign(overlay.style, {
      position: "fixed",
      pointerEvents: "none",
      border: "3px solid red",
      background: "rgba(255, 0, 0, 0.12)",
      borderRadius: "3px",
      zIndex: "2147483647",
      display: "none",
      boxSizing: "border-box",
    });
    root.ownerDocument.documentElement.appendChild(overlay);
  }
  return overlay;
}

function positionOverlay(overlay: HTMLElement, el: Element) {
  const rect = el.getBoundingClientRect();
  Object.assign(overlay.style, {
    display: "block",
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function hideOverlay(root: HTMLElement) {
  const overlay = root.ownerDocument.getElementById(OVERLAY_ID);
  if (overlay) overlay.style.display = "none";
}

function runScan(root: HTMLElement) {
  root.querySelectorAll("[data-sr-id]").forEach((el) => {
    el.removeAttribute("data-sr-id");
  });
  const { scanSubtree } = createDomScanner({
    generateAnnouncement,
    getContextEndAnnouncement: (d) => getContextEndAnnouncement(d) ?? undefined,
    now: () => Date.now(),
  });
  return scanSubtree(root);
}

// ── Module-level channel listeners (registered exactly once) ──────────────────
//
// Storybook's framework-agnostic useEffect([], ...) can fire multiple times
// per story lifecycle in development, causing duplicate onRescan handlers to
// stack up on the channel. Moving listeners to module scope guarantees they
// are registered once for the lifetime of the preview bundle.

let _currentRoot: HTMLElement | null = null;
let _listenersRegistered = false;

function ensureListeners() {
  if (_listenersRegistered) return;
  _listenersRegistered = true;

  const channel = addons.getChannel();

  channel.on(EVENTS.HIGHLIGHT, (srId: string) => {
    if (!_currentRoot) return;
    const el = _currentRoot.querySelector(`[data-sr-id="${CSS.escape(srId)}"]`);
    if (el) positionOverlay(getOrCreateOverlay(_currentRoot), el);
  });

  channel.on(EVENTS.CLEAR_HIGHLIGHT, () => {
    if (_currentRoot) hideOverlay(_currentRoot);
  });

  channel.on(EVENTS.RESCAN, () => {
    const root = _currentRoot;
    if (!root || !root.isConnected) return;
    try {
      channel.emit(EVENTS.RESULT, runScan(root));
    } catch { /* ignore */ }
  });
}

// ── Decorator ─────────────────────────────────────────────────────────────────

export const withSRScan = (
  StoryFn: StoryFunction<Renderer>,
  context: StoryContext<Renderer>,
) => {
  // Always keep the module-level ref pointing at the current canvas element.
  _currentRoot = context.canvasElement as HTMLElement | null;
  ensureListeners();

  // Auto-scan once when the story ID changes (i.e. on navigation).
  useEffect(() => {
    const root = _currentRoot;
    if (!root) return;
    try {
      addons.getChannel().emit(EVENTS.RESULT, runScan(root));
    } catch { /* ignore — channel not available in test runner */ }
    return () => { _currentRoot = null; };
  }, [context.id]);

  return StoryFn();
};

export const decorators = [withSRScan];
