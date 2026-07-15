// @ts-nocheck
import type { BoundingBox, ElementDescriptor } from "./types";

export interface CapturedElementDescriptor extends ElementDescriptor {
  boundingBox?: BoundingBox;
}

export interface ScanLogEntry {
  index: number;
  srId: string;
  announcement: string;
  role?: string;
  name?: string;
  boundingBox?: BoundingBox;
  traversalDebug?: TraversalDebugMetadata;
}

export type TraversalStopKind =
  | "descriptor"
  | "split"
  | "synthetic"
  | "context-end";

export interface TraversalStop {
  kind: TraversalStopKind;
  source: string;
  el?: any;
  descriptor?: CapturedElementDescriptor;
  announcement: string;
  role?: string;
  name?: string;
  boundingBox?: BoundingBox;
}

export interface TraversalDebugMetadata {
  stopKind: TraversalStopKind;
  stopSource: string;
  descriptorRole?: string;
  descriptorName?: string;
}

export interface AccessibilityTreeNode {
  nodeId?: string;
  ignored?: boolean;
  role?: string;
  name?: string;
  domNodeId?: string;
  tagName?: string | null;
  childIds?: string[];
  properties?: Record<string, unknown>;
}

export interface AccessibilityTreeSnapshot {
  nodes?: AccessibilityTreeNode[];
}

export interface DomScannerOptions {
  generateAnnouncement: (descriptor: ElementDescriptor) => string;
  getContextEndAnnouncement: (
    descriptor: ElementDescriptor,
  ) => string | undefined;
  accessibilityTree?: AccessibilityTreeSnapshot;
  includeTraversalDebug?: boolean;
  now?: () => number;
}

export interface DomScanner {
  getScanRoot(el: any): any;
  captureElement(el: any): CapturedElementDescriptor | null;
  isStopElement(el: any): boolean;
  shouldDescendIntoStop(el: any): boolean;
  scanSubtree(root: any): ScanLogEntry[];
}

export function createDomScanner(options: DomScannerOptions): DomScanner {
  const {
    generateAnnouncement,
    getContextEndAnnouncement,
    accessibilityTree,
    includeTraversalDebug = false,
    now = () => Date.now(),
  } = options;

  const interactiveSelector =
    "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], [role='combobox'], [role='searchbox'], [role='textbox']";

  const contextRoles = new Set([
    "banner",
    "navigation",
    "search",
    "form",
    "main",
    "contentinfo",
    "sectionfooter",
    "complementary",
    "region",
    "group",
    "list",
    "listbox",
    "table",
    "grid",
    "tabpanel",
    "article",
    "dialog",
    "tooltip",
  ]);

  const listPositionedRoles = new Set([
    "link",
    "button",
    "heading",
    "checkbox",
    "radio",
    "listitem",
    "image",
    "group",
    "search",
    "navigation",
    "region",
    "article",
  ]);

  function normalize(value?: string | null): string | undefined {
    const normalized = value
      ?.replace(/[\u200B-\u200F\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return normalized || undefined;
  }

  function normalizeAnnouncementLabel(value?: string | null): string | undefined {
    const normalized = normalize(value)?.replace(/\s+([,!?;]|\.(?![\p{L}\p{N}]))/gu, "$1");
    return normalized || undefined;
  }

  function isOptionalComputedStyleElement(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el.namespaceURI === "http://www.w3.org/1998/Math/MathML") return true;
    if (el.tagName?.toLowerCase?.() === "math" || el.closest?.("math")) return true;
    return false;
  }

  function safeComputedStyle(el: any, pseudoElt?: string): CSSStyleDeclaration | undefined {
    if (typeof getComputedStyle !== "function") return undefined;
    try {
      return getComputedStyle(el, pseudoElt);
    } catch (error) {
      if (!isOptionalComputedStyleElement(el)) throw error;
      return undefined;
    }
  }

  const accessibilityNodes = Array.isArray(accessibilityTree?.nodes)
    ? accessibilityTree.nodes
    : [];
  const accessibilityNodeById = new Map(
    accessibilityNodes
      .map((node) => [normalize(node.nodeId), node] as const)
      .filter((entry): entry is [string, AccessibilityTreeNode] => Boolean(entry[0])),
  );

  function normalizedAxRole(role?: string): string | undefined {
    const lower = normalize(role)?.toLowerCase();
    if (!lower) return undefined;
    if (lower === "axlink") return "link";
    if (lower === "iframe") return "frame";
    return lower;
  }

  function urlPathAndSearch(value?: string): string | undefined {
    const normalized = normalize(value);
    if (!normalized) return undefined;
    try {
      const url = new URL(normalized, "https://sr-output.local");
      return `${url.pathname}${url.search}`;
    } catch {
      return undefined;
    }
  }

  function linkMatchesAxUrl(el: any, node: AccessibilityTreeNode): boolean {
    const hrefPath = urlPathAndSearch(el?.getAttribute?.("href"));
    const axUrl = node.properties?.url;
    const axPath = typeof axUrl === "string" ? urlPathAndSearch(axUrl) : undefined;
    return Boolean(hrefPath && axPath && hrefPath === axPath);
  }

  function sameNameDifferentCase(left?: string, right?: string): boolean {
    const normalizedLeft = normalize(left);
    const normalizedRight = normalize(right);
    return Boolean(
      normalizedLeft &&
        normalizedRight &&
        normalizedLeft !== normalizedRight &&
        normalizedLeft.toLocaleLowerCase("en-US") ===
          normalizedRight.toLocaleLowerCase("en-US"),
    );
  }

  function sameNameIgnoringCase(left?: string, right?: string): boolean {
    const normalizedLeft = normalize(left);
    const normalizedRight = normalize(right);
    return Boolean(
      normalizedLeft &&
        normalizedRight &&
        normalizedLeft.toLocaleLowerCase("en-US") ===
          normalizedRight.toLocaleLowerCase("en-US"),
    );
  }

  function allowsRenderedCaseName(role: string): boolean {
    return [
      "button",
      "heading",
      "link",
      "paragraph",
      "statictext",
      "text",
    ].includes(role);
  }

  function cssRenderedCaseName(el: any, role: string, name?: string): string | undefined {
    if (!allowsRenderedCaseName(role) || !name) return undefined;
    const textTransform = normalize(safeComputedStyle(el)?.textTransform)?.toLowerCase();
    if (textTransform === "uppercase" && /[a-z]/.test(name)) {
      return name.toLocaleUpperCase("en-US");
    }
    return undefined;
  }

  function axRenderedCaseName(el: any, role: string, name?: string): string | undefined {
    if (!allowsRenderedCaseName(role) || !name || !accessibilityNodes.length) return undefined;
    const domNodeId = normalize(el?.getAttribute?.("data-sr-dom-node-id"));
    const normalizedRoles = role === "text" || role === "paragraph"
      ? new Set(["statictext", role])
      : new Set([role]);
    const roleNodes = accessibilityNodes.filter((node) => {
      if (node.ignored) return false;
      if (!normalizedRoles.has(normalizedAxRole(node.role) || "")) return false;
      return sameNameIgnoringCase(node.name, name);
    });

    const exactNodeCandidates = domNodeId
      ? roleNodes.filter((node) => normalize(node.domNodeId) === domNodeId)
      : [];
    const candidates = exactNodeCandidates.length
      ? exactNodeCandidates.filter((node) => sameNameDifferentCase(node.name, name))
      : role === "link"
        ? roleNodes.filter((node) => sameNameDifferentCase(node.name, name) && linkMatchesAxUrl(el, node))
        : [];
    if (!exactNodeCandidates.length) {
      const urlMatchedNames = new Set(
        roleNodes
          .filter((node) => linkMatchesAxUrl(el, node))
          .map((node) => normalize(node.name))
          .filter((candidate): candidate is string => Boolean(candidate)),
      );
      if (urlMatchedNames.size > 1) return undefined;
    }

    const names = new Set(
      candidates
        .map((node) => normalize(node.name))
        .filter((candidate): candidate is string => Boolean(candidate)),
    );
    return names.size === 1 ? Array.from(names)[0] : undefined;
  }

  function axRenderedDescendantTextCaseName(el: any, name?: string): string | undefined {
    if (!name || !accessibilityNodes.length) return undefined;
    const root = axNodeAnyForElement(el);
    if (!root) return undefined;
    const rootRole = normalizedAxRole(root.role);
    if (!root.ignored && rootRole !== "time") return undefined;

    const candidates = axDescendants(root).filter((node) => {
      if (node.ignored) return false;
      if (!["generic", "statictext", "inlinetextbox"].includes(normalizedAxRole(node.role) || "")) {
        return false;
      }
      if (!sameNameDifferentCase(node.name, name)) return false;
      return true;
    });

    const names = new Set(
      candidates
        .map((node) => normalize(node.name))
        .filter((candidate): candidate is string => Boolean(candidate)),
    );
    return names.size === 1 ? Array.from(names)[0] : undefined;
  }

  function axRenderedSingleChildTextCaseName(el: any, name?: string): string | undefined {
    if (!name || !accessibilityNodes.length) return undefined;
    const visibleTextChildren = Array.from(el?.children || []).filter((child: any) => {
      if (isHidden(child)) return false;
      if (child.matches?.(interactiveSelector)) return false;
      if (Array.from(child.children || []).some((grandchild: any) => !isHidden(grandchild))) {
        return false;
      }
      return sameNameIgnoringCase(readableText(child), name);
    });
    if (visibleTextChildren.length !== 1) return undefined;

    const child = visibleTextChildren[0];
    return (
      cssRenderedCaseName(child, "text", name) ||
      axRenderedCaseName(child, "text", name) ||
      axRenderedDescendantTextCaseName(child, name)
    );
  }

  function axParentheticalName(el: any, role: string, name?: string): string | undefined {
    if (role !== "link" || !name || !accessibilityNodes.length) return undefined;
    const domNodeId = normalize(el?.getAttribute?.("data-sr-dom-node-id"));
    const candidates = accessibilityNodes.filter((node) => {
      if (node.ignored) return false;
      if (normalizedAxRole(node.role) !== role) return false;
      const axName = normalize(node.name);
      if (!axName || axName === name || !axName.startsWith(`${name} (`)) return false;
      if (!/\([^)]+\)$/.test(axName)) return false;
      if (domNodeId && normalize(node.domNodeId) === domNodeId) return true;
      return linkMatchesAxUrl(el, node);
    });
    const names = new Set(
      candidates
        .map((node) => normalize(node.name))
        .filter((candidate): candidate is string => Boolean(candidate)),
    );
    return names.size === 1 ? Array.from(names)[0] : undefined;
  }

  function hasAxRole(el: any, role: string): boolean {
    if (!accessibilityNodes.length) return false;
    const domNodeId = normalize(el?.getAttribute?.("data-sr-dom-node-id"));
    if (!domNodeId) return false;
    return accessibilityNodes.some(
      (node) =>
        !node.ignored &&
        normalize(node.domNodeId) === domNodeId &&
        normalizedAxRole(node.role) === role,
    );
  }

  function axNodeForElementRole(el: any, role: string): AccessibilityTreeNode | undefined {
    if (!accessibilityNodes.length) return undefined;
    const domNodeId = normalize(el?.getAttribute?.("data-sr-dom-node-id"));
    if (!domNodeId) return undefined;
    const candidates = accessibilityNodes.filter(
      (node) =>
        !node.ignored &&
        normalize(node.domNodeId) === domNodeId &&
        normalizedAxRole(node.role) === role,
    );
    return candidates.length === 1 ? candidates[0] : undefined;
  }

  function axNodeForElement(el: any): AccessibilityTreeNode | undefined {
    if (!accessibilityNodes.length) return undefined;
    const domNodeId = normalize(el?.getAttribute?.("data-sr-dom-node-id"));
    if (!domNodeId) return undefined;
    const candidates = accessibilityNodes.filter(
      (node) => !node.ignored && normalize(node.domNodeId) === domNodeId,
    );
    return candidates.length === 1 ? candidates[0] : undefined;
  }

  function axNodeAnyForElement(el: any): AccessibilityTreeNode | undefined {
    if (!accessibilityNodes.length) return undefined;
    const domNodeId = normalize(el?.getAttribute?.("data-sr-dom-node-id"));
    if (!domNodeId) return undefined;
    const candidates = accessibilityNodes.filter(
      (node) => normalize(node.domNodeId) === domNodeId,
    );
    return candidates.length === 1 ? candidates[0] : undefined;
  }

  function axDescendants(node?: AccessibilityTreeNode): AccessibilityTreeNode[] {
    if (!node?.childIds?.length) return [];
    const descendants: AccessibilityTreeNode[] = [];
    for (const childId of node.childIds) {
      const child = accessibilityNodeById.get(normalize(childId) || "");
      if (!child) continue;
      descendants.push(child);
      descendants.push(...axDescendants(child));
    }
    return descendants;
  }

  function axConfirmedNamedSectionFooterName(el: any): string | undefined {
    if (!accessibilityNodes.length) return undefined;
    if (el?.tagName?.toLowerCase() !== "footer") return undefined;
    if (!hasSectioningHeaderFooterAncestor(el)) return undefined;

    const axNode = axNodeForElementRole(el, "sectionfooter");
    const axName = normalize(axNode?.name);
    if (!axNode || !axName) return undefined;

    const domName = normalize(
      el.getAttribute("aria-label") ||
        textFromIdRefs(el.getAttribute("aria-labelledby")) ||
        readableText(el),
    );
    return domName === axName ? axName : undefined;
  }

  function isDirectTextChildOfNamedSectionFooter(el: any): boolean {
    if (!accessibilityNodes.length) return false;
    if (el?.tagName?.toLowerCase() !== "small") return false;

    const footer = el.parentElement;
    const sectionFooterName = axConfirmedNamedSectionFooterName(footer);
    if (!sectionFooterName) return false;
    if (normalize(readableText(el)) !== sectionFooterName) return false;

    const axNode = axNodeForElement(el);
    if (!axNode || normalizedAxRole(axNode.role) !== "generic") return false;
    const axChildren = axChildNodes(axNode);
    return axChildren.some(
      (child) =>
        normalizedAxRole(child.role) === "statictext" &&
        normalize(child.name) === sectionFooterName,
    );
  }

  function axGeneratedTrailingDisclosureButtonName(
    el: any,
    role: string,
    name?: string,
  ): string | undefined {
    if (role !== "button" || !name || !el?.hasAttribute?.("aria-expanded")) {
      return undefined;
    }
    const axNode = axNodeForElementRole(el, "button");
    const axName = normalize(axNode?.name);
    if (!axNode || !axName || !axName.startsWith(`${name} `)) return undefined;

    const suffix = normalize(axName.slice(name.length));
    if (suffix !== "–") return undefined;

    const domExpanded = parseBooleanAttribute(el, "aria-expanded");
    if (
      domExpanded !== undefined &&
      typeof axNode.properties?.expanded === "boolean" &&
      axNode.properties.expanded !== domExpanded
    ) {
      return undefined;
    }
    return axName;
  }

  function isAxConfirmedEmptyCollapsedOffscreenButton(
    el: any,
    role: string,
    name?: string,
  ): boolean {
    if (role !== "button") return false;
    if (parseBooleanAttribute(el, "aria-expanded") !== false) return false;
    if (!el.hasAttribute("aria-controls")) return false;
    if (normalize(name) || normalize(readableText(el))) return false;
    if (normalize(el.getAttribute("data-sr-rendered-position")) !== "offscreen") {
      return false;
    }

    const axNode = axNodeForElementRole(el, "button");
    if (!axNode || normalize(axNode.name)) return false;
    return axNode.properties?.expanded === false;
  }

  function isAxConfirmedNativeCollapsedButtonWithHiddenControlledRegions(
    el: any,
    role: string,
    name?: string,
  ): boolean {
    if (role !== "button") return false;
    if (el?.tagName?.toLowerCase() !== "button") return false;
    if (parseBooleanAttribute(el, "aria-expanded") !== false) return false;
    if (normalizedPopup(el)) return false;

    const buttonName = normalize(name || accessibleName(el, role));
    if (!buttonName) return false;

    const controls = normalize(el.getAttribute("aria-controls"));
    if (!controls) return false;
    const controlledRegions = controls
      .split(/\s+/)
      .map((id) => resolveIdRef(id))
      .filter(Boolean);
    if (!controlledRegions.length) return false;
    if (controlledRegions.some((region) => !isHidden(region))) return false;
    if (controlledRegions.some((region) => !isRenderedDisplayHidden(region))) return false;

    const axNode = axNodeForElementRole(el, "button");
    if (!axNode || axNode.properties?.focusable !== true) return false;
    if (axNode.properties?.expanded !== false) return false;
    return normalize(axNode.name) === buttonName;
  }

  function axConfirmedNativeInputButtonName(el: any, role: string): string | undefined {
    if (role !== "button") return undefined;
    if (el?.tagName?.toLowerCase() !== "input") return undefined;
    const type = (el.getAttribute("type") || "text").toLowerCase();
    if (!["button", "submit", "reset"].includes(type)) return undefined;
    if (!el.closest?.("form")) return undefined;

    const value = normalize(el.getAttribute("value"));
    if (!value) return undefined;

    const axNode = axNodeForElementRole(el, "button");
    if (!axNode || axNode.properties?.focusable !== true) return undefined;
    return normalize(axNode.name) === value ? value : undefined;
  }

  function explicitAriaName(el: any): string | undefined {
    return normalize(
      el.getAttribute?.("aria-label") ||
        textFromIdRefs(el.getAttribute?.("aria-labelledby")),
    );
  }

  function sameNameExceptEllipsis(left?: string, right?: string): boolean {
    const normalizeEllipsis = (value?: string) =>
      normalize(value)?.replace(/\u2026/g, "...");
    const normalizedLeft = normalize(left);
    const normalizedRight = normalize(right);
    return Boolean(
      normalizedLeft &&
        normalizedRight &&
        normalizedLeft !== normalizedRight &&
        normalizeEllipsis(normalizedLeft) === normalizeEllipsis(normalizedRight),
    );
  }

  function visibleTextEllipsisButtonName(el: any, role: string): string | undefined {
    if (role !== "button") return undefined;
    if (!explicitAriaName(el)) return undefined;

    const visibleText = normalize(readableText(el) || el.getAttribute("placeholder"));
    const ariaName = explicitAriaName(el);
    if (!sameNameExceptEllipsis(visibleText, ariaName)) return undefined;

    const axNode = axNodeForElementRole(el, "button");
    if (axNode && normalize(axNode.name) !== ariaName) return undefined;
    return visibleText;
  }

  function hasVisibleTextEllipsisButtonName(el: any, role: string): boolean {
    return Boolean(visibleTextEllipsisButtonName(el, role));
  }

  function idRefsContain(refs: string | null, id?: string | null): boolean {
    const normalizedId = normalize(id);
    if (!normalizedId) return false;
    return (refs || "")
      .split(/\s+/)
      .some((ref) => normalize(ref) === normalizedId);
  }

  function renderedCaseName(el: any, role: string, name?: string): string | undefined {
    return (
      cssRenderedCaseName(el, role, name) ||
      axRenderedCaseName(el, role, name) ||
      axRenderedDescendantTextCaseName(el, name)
    );
  }

  function cssEscape(value: string): string {
    return globalThis.CSS?.escape
      ? CSS.escape(value)
      : String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => {
          const hex = character.codePointAt(0).toString(16);
          return `\\${hex} `;
        });
  }

  function renderedHiddenValue(el: any): string | undefined {
    return el?.getAttribute?.("data-sr-computed-hidden") || undefined;
  }

  function isOpacityHiddenOnly(el: any): boolean {
    return renderedHiddenValue(el) === "opacity:0";
  }

  function isRenderedDisplayHidden(el: any): boolean {
    const marker = renderedHiddenValue(el);
    if (marker && /\bdisplay\s*:\s*none\b/i.test(marker)) return true;
    if (el?.hasAttribute?.("hidden")) return true;
    return safeComputedStyle(el)?.display === "none";
  }

  function isFocusableOpacityHiddenControl(el: any): boolean {
    return Boolean(el?.matches?.(interactiveSelector)) && isOpacityHiddenOnly(el);
  }

  function directSummaryChild(details: any): any | null {
    return (
      Array.from(details?.children || []).find(
        (child: any) => child.tagName?.toLowerCase() === "summary",
      ) || null
    );
  }

  function directNativeDetailsForSummary(el: any): any | null {
    const details = el?.parentElement;
    if (el?.tagName?.toLowerCase() !== "summary") return null;
    if (details?.tagName?.toLowerCase() !== "details") return null;
    return directSummaryChild(details) === el ? details : null;
  }

  function isInsideClosedNativeDetailsBody(el: any): boolean {
    for (
      let details = el?.closest?.("details");
      details;
      details = details.parentElement?.closest?.("details")
    ) {
      if (details === el || details.hasAttribute("open")) continue;
      const summary = directSummaryChild(details);
      if (!summary || (el !== summary && !summary.contains(el))) {
        return true;
      }
    }
    return false;
  }

  function isSldsDesktopHidden(el: any): boolean {
    return Boolean(el?.classList?.contains?.("slds-hide_medium"));
  }

  function isHidden(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    if (el.getAttribute("aria-hidden") === "true") {
      return true;
    }

    if (isInsideClosedNativeDetailsBody(el)) {
      return true;
    }

    if (isSldsDesktopHidden(el) || el.closest?.(".slds-hide_medium")) {
      return true;
    }

    const marker = renderedHiddenValue(el);
    if (marker && marker !== "false" && !isFocusableOpacityHiddenControl(el)) {
      return true;
    }

    const hiddenAncestor = el.closest(
      "[data-sr-computed-hidden]:not([data-sr-computed-hidden='false'])",
    );
    if (
      el.closest("[aria-hidden='true']") ||
      (hiddenAncestor && hiddenAncestor !== el)
    ) {
      return true;
    }

    const style = safeComputedStyle(el);
    if (!style) return false;
    return style.display === "none" || style.visibility === "hidden";
  }

  function isGovukDesignSystemDocument(): boolean {
    const bodyText = document?.body?.textContent || "";
    return (
      bodyText.includes("GOV.UK Design System") ||
      Boolean(document?.querySelector?.("a[href*='design-system.service.gov.uk']"))
    );
  }

  function isSerializedOffscreenCodeBoundary(el: any): boolean {
    return Boolean(
      isGovukDesignSystemDocument() &&
        el?.tagName?.toLowerCase?.() === "code" &&
        el.getAttribute("data-sr-rendered-position") === "offscreen" &&
        !el.getAttribute("data-sr-computed-hidden") &&
        normalize(el.textContent),
    );
  }

  function needsBoundary(left: string, right: string): boolean {
    const leftChar = left.slice(-1);
    const rightChar = right[0];
    if (!leftChar || !rightChar) return false;
    if (/\s/.test(leftChar) || /\s/.test(rightChar)) return false;
    if (rightChar === "." && /^\.[\p{L}\p{N}]/u.test(right)) return true;
    if (/[.,;:!?)]/.test(rightChar) || /[(]/.test(leftChar)) return false;
    return /[\p{L}\p{N}%]/u.test(leftChar) && /[\p{L}\p{N}£$€]/u.test(rightChar);
  }

  const shadowContentHostByNode = new WeakMap<any, any>();
  let flattenedSlottedCarouselListCache: any[] | undefined;
  const flattenedSlottedCarouselStopCache = new WeakMap<
    any,
    Array<{ el: any; counted: boolean }>
  >();

  function rememberShadowContentHost(nodes: any[], host: any): void {
    const visit = (node: any) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
      shadowContentHostByNode.set(node, host);
      for (const child of Array.from(node.children || [])) visit(child);
    };
    for (const node of nodes) visit(node);
  }

  function shadowContentChildren(el: any): any[] {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return [];
    if (el.shadowRoot) {
      const children = Array.from(el.shadowRoot.children);
      rememberShadowContentHost(children, el);
      return children;
    }
    const template = Array.from(el.children || []).find(
      (child: any) =>
        child.tagName?.toLowerCase() === "template" &&
        child.getAttribute("shadowrootmode"),
    );
    if (!template) return [];
    const children = Array.from(template.content?.children || []);
    rememberShadowContentHost(children, el);
    return children;
  }

  function assignedSlotNodes(slot: any): any[] {
    if (slot?.tagName?.toLowerCase() !== "slot") return [];
    const assignedNodes =
      typeof slot.assignedNodes === "function"
        ? slot.assignedNodes({ flatten: true })
        : [];
    if (assignedNodes.length) return assignedNodes;

    const host = shadowContentHostByNode.get(slot);
    if (!host) return [];
    const slotName = slot.getAttribute("name") || "";
    const namedSlotChildren = Array.from(host.childNodes || []).filter((child: any) => {
      if (child.nodeType === Node.TEXT_NODE) {
        return !slotName && Boolean(normalize(child.textContent));
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return false;
      if (child.tagName?.toLowerCase() === "template" && child.getAttribute("shadowrootmode")) {
        return false;
      }
      return (child.getAttribute("slot") || "") === slotName;
    });
    if (namedSlotChildren.length || !slotName) return namedSlotChildren;

    const semanticSelectorBySlotName: Record<string, string> = {
      button: "button, [role='button']",
      link: "a[href], [role='link']",
    };
    const semanticSelector = semanticSelectorBySlotName[slotName.toLowerCase()];
    if (!semanticSelector) return [];

    return Array.from(host.children || []).filter((child: any) => {
      if (child.tagName?.toLowerCase() === "template" && child.getAttribute("shadowrootmode")) {
        return false;
      }
      if (child.hasAttribute("slot")) return false;
      if (isHidden(child)) return false;
      return child.matches(semanticSelector);
    });
  }

  function assignedSlotChildren(slot: any): any[] {
    return assignedSlotNodes(slot).filter(
      (child: any) => child.nodeType === Node.ELEMENT_NODE,
    );
  }

  function readableText(
    el: any,
    options: { preserveWbrBoundary?: boolean } = {},
  ): string | undefined {
    function collect(node: any): string {
      if (!node) return "";
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      if (isHidden(node)) return "";
      if (node.tagName?.toLowerCase() === "wbr") {
        return options.preserveWbrBoundary ? " " : "";
      }

      if (node.tagName?.toLowerCase() === "slot") {
        return assignedSlotNodes(node)
          .map((child: any) => collect(child))
          .filter(Boolean)
          .join(" ");
      }

      if (node.tagName?.toLowerCase() === "q") {
        const quoteText = collectElementText(node);
        return quoteText ? `“${quoteText}”` : "''''";
      }

      let text = "";
      const shadowChildren = shadowContentChildren(node);
      const children = shadowChildren.length
        ? shadowChildren
        : Array.from(node.childNodes);
      for (const child of children) {
        const part = collect(child);
        if (!part) continue;
        if (text && needsBoundary(text, part)) text += " ";
        text += part;
      }
      return text;
    }

    function collectElementText(node: any): string {
      let text = "";
      const shadowChildren = shadowContentChildren(node);
      const children = shadowChildren.length
        ? shadowChildren
        : Array.from(node.childNodes);
      for (const child of children) {
        const part = collect(child);
        if (!part) continue;
        if (text && needsBoundary(text, part)) text += " ";
        text += part;
      }
      return normalize(text) || "";
    }

    return normalize(collect(el))?.replace(/''''\s+/g, "''''");
  }

  function directOwnText(el: any): string | undefined {
    return normalize(
      Array.from(el?.childNodes || [])
        .filter((child: any) => child.nodeType === Node.TEXT_NODE)
        .map((child: any) => child.textContent || "")
        .join(" "),
    );
  }

  function directLeadingText(el: any): string | undefined {
    const fragments: string[] = [];
    for (const child of Array.from(el?.childNodes || [])) {
      if (child.nodeType === Node.TEXT_NODE) {
        fragments.push(child.textContent || "");
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) {
        continue;
      }
      break;
    }
    return normalize(fragments.join(" "));
  }

  function textWithoutInteractive(el: any): string | undefined {
    const hadInteractive = Boolean(el.querySelector(interactiveSelector));
    const clone = el.cloneNode(true);
    for (const node of Array.from(
      clone.querySelectorAll(
        `${interactiveSelector}, ul, ol, dl, [role='list'], [aria-hidden='true']`,
      ),
    )) {
      node.remove();
    }
    const text = readableText(clone);
    if (!hadInteractive || !text) {
      return text;
    }
    return normalize(text.replace(/\s+[.,;:!?]$/u, ""));
  }

  function resolveIdRef(id: string): any {
    if (!id) return null;
    const directMatch = document.getElementById(id);
    if (directMatch) return directMatch;
    try {
      return document.querySelector(`#${cssEscape(id)}`);
    } catch {
      return null;
    }
  }

  function textFromIdRefs(value?: string | null): string | undefined {
    if (!value) return undefined;
    return normalize(
      value
        .split(/\s+/)
        .map((id) => normalize(resolveIdRef(id)?.textContent) || "")
        .filter(Boolean)
        .join(" "),
    );
  }

  function labelForControl(el: any): string | undefined {
    if ("labels" in el && el.labels?.length) {
      return normalize((textWithoutInteractive(el.labels[0]) || readableText(el.labels[0]))?.replace(/:\s*/g, ": "));
    }

    const id = el.getAttribute("id");
    if (!id) return undefined;
    const label = document.querySelector(`label[for="${cssEscape(id)}"]`);
    return label
      ? normalize((textWithoutInteractive(label) || readableText(label))?.replace(/:\s*/g, ": "))
      : undefined;
  }

  function hasExplicitAriaName(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    return Boolean(
      normalize(el.getAttribute("aria-label")) ||
        textFromIdRefs(el.getAttribute("aria-labelledby")),
    );
  }

  function nativeLabelAlreadyAnnouncedByListItem(el: any, label?: string): boolean {
    if (!label || !el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const listItem = el.closest("li,[role='listitem']");
    if (!isListItem(listItem) || !listItem.contains(el)) return false;
    if (!positionInSet(listItem, "listitem") || !setSize(listItem, "listitem")) return false;
    const listItemText = textWithoutInteractive(listItem) || directLeadingText(listItem);
    return normalize(listItemText) === label;
  }

  function nativeValueControlLabelStopIsHidden(el: any): boolean {
    const label = associatedLabelForControl(el);
    if (!label) return false;
    return Boolean(
      normalize(label.getAttribute("data-sr-computed-hidden")) ||
        normalize(label.getAttribute("data-sr-rendered-position")) === "offscreen",
    );
  }

  function associatedLabelForControl(el: any): any | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return undefined;
    if ("labels" in el && el.labels?.length) {
      return Array.from(el.labels).find((label: any) => !isHidden(label));
    }

    const id = el.getAttribute("id");
    if (!id) return undefined;
    const selector = `label[for="${cssEscape(id)}"]`;
    const root = typeof el.getRootNode === "function" ? el.getRootNode() : null;
    const rootLabel = Array.from(root?.querySelectorAll?.(selector) || []).find(
      (label: any) => !isHidden(label),
    );
    if (rootLabel) return rootLabel;

    return Array.from(document.querySelectorAll(selector)).find((label: any) => !isHidden(label));
  }

  function hasAssociatedLabelText(el: any): boolean {
    const label = associatedLabelForControl(el);
    return Boolean(label && (textWithoutInteractive(label) || readableText(label)));
  }

  function shouldSplitNativeControlLabelStop(el: any, role: string): boolean {
    const tag = el?.tagName?.toLowerCase();
    if (!["input", "select", "textarea"].includes(tag)) return false;
    if (!["textbox", "combobox"].includes(role)) return false;
    if (tag === "input" && (el.getAttribute("type") || "text").toLowerCase() === "hidden") {
      return false;
    }
    if (el.getAttribute("aria-label")) return false;

    const form = el.closest("form");
    if (!form || !(form.getAttribute("aria-label") || form.getAttribute("aria-labelledby"))) {
      return false;
    }

    const label = associatedLabelForControl(el);
    if (!label) return false;
    const labelText = normalize(textWithoutInteractive(label) || readableText(label));
    if (!labelText) return false;

    const parent = el.parentElement;
    if (parent && compactInputActionGroupLabel(parent)) return false;
    return true;
  }

  function shouldSplitDirectVisibleTextInputLabelStop(el: any, role: string): boolean {
    if (role !== "textbox") return false;
    if (el?.tagName?.toLowerCase() !== "input") return false;
    if ((el.getAttribute("type") || "text").toLowerCase() !== "text") return false;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
    if (el.disabled || el.getAttribute("aria-hidden") === "true") return false;

    const label = associatedLabelForControl(el);
    if (!label || label.tagName?.toLowerCase() !== "label" || isHidden(label)) return false;
    if (el.hasAttribute("list") && !nativeDatalistElement(el) && el.previousElementSibling === label) {
      const labelText = normalize(textWithoutInteractive(label) || readableText(label));
      const controlName = accessibleName(el, role);
      return Boolean(labelText && controlName === labelText);
    }
    if (label.parentElement !== el.parentElement || el.previousElementSibling !== label) {
      return false;
    }

    const parent = el.parentElement;
    if (!parent || compactInputActionGroupLabel(parent)) return false;
    const visibleChildren = Array.from(parent.children || []).filter((child: any) => !isHidden(child));
    if (visibleChildren.length !== 2 || visibleChildren[0] !== label || visibleChildren[1] !== el) {
      return false;
    }

    const labelText = normalize(textWithoutInteractive(label) || readableText(label));
    const controlName = accessibleName(el, role);
    if (!labelText || controlName !== labelText) return false;

    if (accessibilityNodes.length) {
      const labelNode = axNodeForElementRole(label, "labeltext");
      const inputNode = axNodeForElementRole(el, "textbox");
      if (!labelNode || !inputNode) return false;
      const staticText = (labelNode.childIds || [])
        .map((id) => accessibilityNodeById.get(normalize(id) || ""))
        .find((node) => normalizedAxRole(node?.role) === "statictext");
      if (normalize(staticText?.name) !== labelText) return false;
      if (normalize(inputNode.name) !== labelText || inputNode.properties?.focusable !== true) {
        return false;
      }
    }

    return true;
  }

  function shouldSplitVisibleRequiredPasswordLabelStop(el: any, role: string): boolean {
    if (role !== "textbox") return false;
    if (el?.tagName?.toLowerCase() !== "input") return false;
    if ((el.getAttribute("type") || "text").toLowerCase() !== "password") return false;
    if (!el.required && !el.hasAttribute("required") && el.getAttribute("aria-required") !== "true") {
      return false;
    }
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
    if (el.disabled || el.getAttribute("aria-hidden") === "true") return false;

    const label = associatedLabelForControl(el);
    if (!label || label.tagName?.toLowerCase() !== "label" || isHidden(label)) return false;
    const labelText = normalize(textWithoutInteractive(label) || readableText(label));
    if (!labelText || accessibleName(el, role) !== labelText) return false;

    const parent = el.parentElement;
    if (!parent || compactInputActionGroupLabel(parent)) return false;
    if (label.parentElement !== parent || label.nextElementSibling !== el) return false;

    if (accessibilityNodes.length) {
      const inputNode = axNodeForElementRole(el, "textbox");
      if (!inputNode) return false;
      if (normalize(inputNode.name) !== labelText || inputNode.properties?.focusable !== true) {
        return false;
      }
    }

    return true;
  }

  function isNamedSingleControlForm(form: any): boolean {
    if (!form || form.nodeType !== Node.ELEMENT_NODE || isHidden(form)) return false;
    const tag = form.tagName?.toLowerCase();
    const role = normalize(form.getAttribute?.("role"))?.toLowerCase();
    if (tag !== "form" && role !== "form") return false;
    if (!(form.getAttribute("aria-label") || form.getAttribute("aria-labelledby"))) return false;

    const controls = Array.from(
      form.querySelectorAll(
        "input:not([type='hidden']), textarea, select, button, [role='button'], [role='combobox'], [role='searchbox'], [role='textbox']",
      ),
    ).filter((control: any) => !isHidden(control));
    const textControls = controls.filter((control: any) => {
      const tag = control.tagName?.toLowerCase();
      const controlRole = implicitRole(control);
      if (tag === "textarea") return true;
      if (["combobox", "searchbox", "textbox"].includes(controlRole)) return true;
      if (tag !== "input") return false;
      const type = (control.getAttribute("type") || "text").toLowerCase();
      return ["email", "search", "text"].includes(type);
    });
    if (textControls.length !== 1) return false;

    const submitControls = controls.filter((control: any) => {
      if (textControls.includes(control)) return false;
      const tag = control.tagName?.toLowerCase();
      const controlRole = implicitRole(control);
      if (tag === "button" || controlRole === "button") return true;
      if (tag !== "input") return false;
      return ["button", "submit", "reset"].includes(
        (control.getAttribute("type") || "text").toLowerCase(),
      );
    });
    return submitControls.length === 1;
  }

  function shouldSplitNamedSingleControlFormInput(el: any, role: string): boolean {
    if (!["combobox", "searchbox", "textbox"].includes(role)) return false;
    if (el?.tagName?.toLowerCase() !== "input") return false;
    if (!isNamedSingleControlForm(el.closest?.("form,[role='form']"))) return false;
    const label = associatedLabelForControl(el);
    return Boolean(label && normalize(textWithoutInteractive(label) || readableText(label)));
  }

  function isControlledTablistTab(el: any, role = implicitRole(el)): boolean {
    if (role !== "tab") return false;
    const tablist = el.closest?.("[role='tablist']");
    if (!tablist || isHidden(tablist)) return false;
    if (!tablist.hasAttribute("aria-controls")) return false;
    const controlled = resolveIdRef(tablist.getAttribute("aria-controls"));
    if (!controlled || isHidden(controlled)) return false;

    const tabs = Array.from(tablist.querySelectorAll("[role='tab']")).filter(
      (tab: any) => !isHidden(tab),
    );
    if (tabs.length < 2 || !tabs.includes(el)) return false;
    return tabs.every((tab: any) => !tab.hasAttribute("aria-selected"));
  }

  function isControlledTablistDescriptionRegion(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName?.toLowerCase() !== "p") return false;
    if (el.getAttribute("role") !== "region") return false;
    if (!el.id || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
    if (!readableText(el) || el.querySelector(interactiveSelector)) return false;
    const tablist = document.querySelector(`[role='tablist'][aria-controls='${cssEscape(el.id)}']`);
    if (!tablist || isHidden(tablist)) return false;
    const tabs = Array.from(tablist.querySelectorAll("[role='tab']")).filter(
      (tab: any) => !isHidden(tab),
    );
    return tabs.length >= 2;
  }

  function directVisibleTextInputLabelHintSequence(wrapper: any):
    | {
        label: any;
        hint: any;
        input: any;
        labelText: string;
        hintText: string;
        inputAnnouncement: string;
      }
    | undefined {
    if (!wrapper || wrapper.nodeType !== Node.ELEMENT_NODE || isHidden(wrapper)) {
      return undefined;
    }
    if (compactInputActionGroupLabel(wrapper)) return undefined;

    const visibleChildren = Array.from(wrapper.children || []).filter(
      (child: any) => !isHidden(child),
    );
    if (visibleChildren.length !== 3) return undefined;

    const [label, hint, input] = visibleChildren;
    if (label?.tagName?.toLowerCase() !== "label") return undefined;
    if (input?.tagName?.toLowerCase() !== "input") return undefined;
    if ((input.getAttribute("type") || "text").toLowerCase() !== "text") {
      return undefined;
    }
    if (input.disabled || input.getAttribute("aria-hidden") === "true") return undefined;
    if (input.getAttribute("aria-label") || input.getAttribute("aria-labelledby")) {
      return undefined;
    }
    if ("value" in input && input.value) return undefined;
    if (normalize(input.getAttribute("placeholder"))) return undefined;

    const describedBy = normalize(input.getAttribute("aria-describedby"));
    if (!describedBy || hint.getAttribute("aria-hidden") === "true") return undefined;
    const describedIds = describedBy.split(/\s+/).filter(Boolean);
    if (!hint.id || !describedIds.includes(hint.id)) return undefined;
    if (associatedLabelForControl(input) !== label) return undefined;
    if (hint.querySelector(interactiveSelector)) return undefined;

    const labelText = normalize(textWithoutInteractive(label) || readableText(label));
    const hintText = normalize(textWithoutInteractive(hint) || readableText(hint));
    if (!labelText || !hintText) return undefined;
    if (accessibleName(input, "textbox") !== labelText) return undefined;
    if (textFromIdRefs(input.getAttribute("aria-describedby")) !== hintText) {
      return undefined;
    }

    if (accessibilityNodes.length) {
      const inputNode = axNodeForElementRole(input, "textbox");
      if (!inputNode) return undefined;
      if (normalize(inputNode.name) !== labelText) return undefined;
      if (normalize(inputNode.description) !== hintText) return undefined;
      if (inputNode.properties?.focusable !== true) return undefined;
    }

    return {
      label,
      hint,
      input,
      labelText,
      hintText,
      inputAnnouncement: normalize(`${labelText} ${hintText}, edit text`) || "",
    };
  }

  function directVisibleAriaLabelledTextInputDescriptionSequence(wrapper: any):
    | {
        description: any;
        label: any;
        input: any;
        descriptionText: string;
        labelText: string;
        inputAnnouncement: string;
      }
    | undefined {
    if (!wrapper || wrapper.nodeType !== Node.ELEMENT_NODE || isHidden(wrapper)) {
      return undefined;
    }
    if (compactInputActionGroupLabel(wrapper)) return undefined;

    const visibleChildren = Array.from(wrapper.children || []).filter(
      (child: any) => !isHidden(child),
    );
    if (visibleChildren.length !== 3) return undefined;

    const [description, label, inputWrapper] = visibleChildren;
    if (label?.tagName?.toLowerCase() !== "label") return undefined;
    if (description?.matches?.(interactiveSelector)) return undefined;
    if (description?.querySelector?.(interactiveSelector)) return undefined;
    if (normalize(description.getAttribute?.("role"))) return undefined;
    if (!description.id || !description.hasAttribute("aria-live")) return undefined;

    const wrapperChildren = Array.from(inputWrapper?.children || []).filter(
      (child: any) => !isHidden(child),
    );
    if (wrapperChildren.length !== 1) return undefined;

    const input = wrapperChildren[0];
    if (input?.tagName?.toLowerCase() !== "input") return undefined;
    if ((input.getAttribute("type") || "text").toLowerCase() !== "text") return undefined;
    if (input.disabled || input.getAttribute("aria-hidden") === "true") return undefined;
    if (input.getAttribute("aria-labelledby")) return undefined;

    const ariaLabel = normalize(input.getAttribute("aria-label"));
    if (!ariaLabel) return undefined;
    if ("value" in input && input.value) return undefined;

    const describedBy = normalize(input.getAttribute("aria-describedby"));
    if (!describedBy) return undefined;
    const describedIds = describedBy.split(/\s+/).filter(Boolean);
    if (!describedIds.includes(description.id)) return undefined;

    const descriptionText = normalize(textWithoutInteractive(description) || readableText(description));
    const labelText = normalize(textWithoutInteractive(label) || readableText(label));
    if (!descriptionText || !labelText || descriptionText !== labelText) return undefined;

    if (accessibilityNodes.length) {
      const inputNode = axNodeForElementRole(input, "textbox");
      if (!inputNode) return undefined;
      if (normalize(inputNode.name) !== ariaLabel) return undefined;
      if (normalize(inputNode.description) !== labelText) return undefined;
      if (inputNode.properties?.focusable !== true) return undefined;
    } else {
      return undefined;
    }

    return {
      description,
      label,
      input,
      descriptionText,
      labelText,
      inputAnnouncement: normalize(`${ariaLabel} ${labelText}, edit text`) || "",
    };
  }

  function textboxShouldPlacePlaceholderBeforeRole(
    el: any,
    stateEl: any,
    role: string,
    name?: string,
    value?: string,
  ): boolean {
    if (role !== "textbox") return false;
    if (el?.tagName?.toLowerCase() !== "input") return false;
    if ((el.getAttribute("type") || "text").toLowerCase() !== "text") return false;
    if (value) return false;

    const placeholder = normalize(stateEl?.getAttribute?.("placeholder"));
    if (!placeholder || placeholder === name) return false;
    return hasAssociatedLabelText(el);
  }

  function isAxConfirmedNativeSearchFormTextInput(el: any, role: string): boolean {
    if (role !== "textbox" && role !== "searchbox") return false;
    if (el?.tagName?.toLowerCase() !== "input") return false;
    const type = (el.getAttribute("type") || "text").toLowerCase();
    if (type !== "text" && type !== "search") return false;

    const placeholder = normalize(el.getAttribute("placeholder"));
    if (!placeholder) return false;

    const label = associatedLabelForControl(el);
    if (!label) return false;
    const labelText = normalize(textWithoutInteractive(label) || readableText(label));
    if (!labelText || !placeholder.toLowerCase().includes(labelText.toLowerCase())) {
      return false;
    }

    const form = el.closest?.("form");
    if (!form) return false;

    const textControls = Array.from(
      form.querySelectorAll(
        "input:not([type='hidden']), textarea, [role='textbox'], [role='searchbox']",
      ),
    ).filter((control: any) => {
      if (isHidden(control)) return false;
      const controlTag = control.tagName?.toLowerCase();
      if (controlTag === "textarea") return true;
      if (
        control.getAttribute?.("role") === "textbox" ||
        control.getAttribute?.("role") === "searchbox"
      ) {
        return true;
      }
      if (controlTag !== "input") return false;
      const controlType = (control.getAttribute("type") || "text").toLowerCase();
      return controlType === "text" || controlType === "search";
    });
    if (textControls.length !== 1 || textControls[0] !== el) return false;

    const submitControls = Array.from(
      form.querySelectorAll("input[type='submit'], input[type='button'], input[type='reset']"),
    ).filter((control: any) => !isHidden(control));
    if (submitControls.length !== 1) return false;

    const submitName =
      axConfirmedNativeInputButtonName(submitControls[0], "button") ||
      normalize(submitControls[0].getAttribute("value") || submitControls[0].getAttribute("name"));
    if (submitName !== labelText) return false;

    if (accessibilityNodes.length) {
      const inputNode = axNodeForElementRole(el, role === "searchbox" ? "searchbox" : "textbox");
      if (
        inputNode &&
        (normalize(inputNode.name) !== labelText || inputNode.properties?.focusable !== true)
      ) {
        return false;
      }
    }

    return true;
  }

  function isNativeSearchFormLabelStopInput(el: any, role: string): boolean {
    if (role !== "searchbox") return false;
    if (el?.tagName?.toLowerCase() !== "input") return false;
    if ((el.getAttribute("type") || "text").toLowerCase() !== "search") return false;

    const label = associatedLabelForControl(el);
    if (!label) return false;
    const labelText = normalize(textWithoutInteractive(label) || readableText(label));
    if (!labelText) return false;

    const searchContext = el.closest?.("form[role='search'], search, [role='search']");
    if (!searchContext) return false;

    const selectControls = Array.from(searchContext.querySelectorAll("select")).filter(
      (control: any) => !isHidden(control),
    );
    if (selectControls.length) return false;

    const textControls = Array.from(
      searchContext.querySelectorAll(
        "input:not([type='hidden']), textarea, [role='textbox'], [role='searchbox'], [role='combobox']",
      ),
    ).filter((control: any) => !isHidden(control));
    if (textControls.length !== 1 || textControls[0] !== el) return false;

    return true;
  }

  function isAutocompleteGridPopupLabelStopInput(el: any, role: string): boolean {
    if (role !== "combobox" && role !== "searchbox") return false;
    if (el?.tagName?.toLowerCase() !== "input") return false;
    if (normalize(el.getAttribute("aria-autocomplete")) !== "list") return false;
    if (el.getAttribute("aria-expanded") !== "true") return false;
    if (normalizedPopup(el) !== "grid") return false;
    return hasAssociatedLabelText(el);
  }

  function isAxConfirmedNativeSearchFormLabel(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName?.toLowerCase() !== "label") return false;
    const controlId = normalize(el.getAttribute("for"));
    if (!controlId) return false;
    const control = resolveIdRef(controlId);
    if (!control || associatedLabelForControl(control) !== el) return false;
    const role = implicitRole(control);
    return isAxConfirmedNativeSearchFormTextInput(control, role);
  }

  function directAssociatedLabelText(el: any): string | undefined {
    const label = associatedLabelForControl(el);
    if (!label || isHidden(label)) return undefined;
    const labelText = normalize(textWithoutInteractive(label) || readableText(label));
    if (!labelText) return undefined;

    const parent = el.parentElement;
    if (label.parentElement === parent && label.nextElementSibling === el) {
      return labelText;
    }

    if (parent && label.parentElement === parent.parentElement && label.nextElementSibling === parent) {
      return labelText;
    }

    if (label.nextElementSibling === parent) return labelText;
    return undefined;
  }

  function axConfirmedNativeControlLabelStopText(el: any, role: string): string | undefined {
    const tag = el?.tagName?.toLowerCase();
    if (!["input", "select", "textarea"].includes(tag)) return undefined;
    if (!["textbox", "combobox"].includes(role)) return undefined;
    if (tag === "input" && (el.getAttribute("type") || "text").toLowerCase() === "hidden") {
      return undefined;
    }
    if (el.disabled || el.getAttribute("aria-hidden") === "true") return undefined;

    const labelText = directAssociatedLabelText(el);
    if (!labelText) return undefined;

    const axNode = axNodeForElementRole(el, role);
    const axName = normalize(axNode?.name);
    if (!axNode || axNode.properties?.focusable !== true || !axName) return undefined;

    const ariaLabel = normalize(el.getAttribute("aria-label"));
    if (axName !== labelText && (!ariaLabel || axName !== ariaLabel)) return undefined;
    return labelText;
  }

  function axConfirmedNativeButtonLabelStopText(
    el: any,
    role: string,
    name?: string,
  ): string | undefined {
    if (role !== "button" || el?.tagName?.toLowerCase() !== "button") return undefined;
    if (parseBooleanAttribute(el, "aria-expanded") !== false) return undefined;
    if (normalizedPopup(el)) return undefined;
    if (el.disabled || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") {
      return undefined;
    }

    const label = previousVisibleElementSibling(el);
    if (!label || label.tagName?.toLowerCase() !== "label") return undefined;
    if (label.parentElement !== el.parentElement) return undefined;

    const labelText = normalize(textWithoutInteractive(label) || readableText(label));
    const buttonName = normalize(name || accessibleName(el, role));
    if (!labelText || !buttonName || labelText === buttonName) return undefined;

    const ariaLabel = normalize(el.getAttribute("aria-label"));
    if (!ariaLabel || ariaLabel !== buttonName) return undefined;

    if (!accessibilityNodes.length) return undefined;
    const labelNode = axNodeForElementRole(label, "labeltext");
    const buttonNode = axNodeForElementRole(el, "button");
    if (!labelNode || !buttonNode) return undefined;
    if (normalize(buttonNode.name) !== buttonName || buttonNode.properties?.focusable !== true) {
      return undefined;
    }
    if (buttonNode.properties?.expanded !== false) return undefined;

    const labelHasMatchingStaticText = axChildNodes(labelNode).some(
      (child) =>
        normalizedAxRole(child.role) === "statictext" &&
        normalize(child.name) === labelText,
    );
    return labelHasMatchingStaticText ? labelText : undefined;
  }

  function axConfirmedNativeSelectLabelName(el: any, role: string, label?: string): string | undefined {
    if (role !== "combobox" || el?.tagName?.toLowerCase() !== "select") return undefined;
    const labelText = normalize(label);
    if (!labelText) return undefined;
    const axNode = axNodeForElementRole(el, "combobox");
    if (!axNode || axNode.properties?.focusable !== true) return undefined;
    const axName = normalize(axNode.name);
    return axName === labelText ? axName : undefined;
  }

  function axConfirmedLabelledTabPanelName(el: any, role: string, label?: string): string | undefined {
    if (role !== "tabpanel" || !label || !el.hasAttribute("aria-labelledby")) return undefined;
    const ids = normalize(el.getAttribute("aria-labelledby"))?.split(/\s+/).filter(Boolean) || [];
    if (ids.length !== 1) return undefined;

    const controller = resolveIdRef(ids[0]);
    if (!controller || isHidden(controller)) return undefined;
    const controllerRole = implicitRole(controller);
    if (controllerRole !== "tab" && controllerRole !== "button") return undefined;

    const controllerAriaLabel = normalize(controller.getAttribute("aria-label"));
    if (!controllerAriaLabel) return undefined;

    const panelNode = axNodeForElementRole(el, "tabpanel");
    const axName = normalize(panelNode?.name);
    if (!axName || axName !== controllerAriaLabel || axName === label) return undefined;
    return axName;
  }

  function descendantElementsAcrossShadow(el: any): any[] {
    const descendants: any[] = [];
    const visit = (node: any) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      descendants.push(node);
      for (const child of walkChildren(node)) visit(child);
    };

    for (const child of walkChildren(el)) visit(child);
    return descendants;
  }

  function isSingleLabeledTextInputWrapper(el: any, role: string): boolean {
    if (role !== "group") return false;
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.matches(interactiveSelector)) return false;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
    if (directOwnText(el)) return false;

    const visibleChildren = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    const hasShadowInputHostShape =
      hasShadowRootContent(el) ||
      (visibleChildren.length === 1 &&
        isCustomElement(visibleChildren[0]) &&
        hasShadowRootContent(visibleChildren[0]));
    if (!hasShadowInputHostShape) return false;

    const descendants = descendantElementsAcrossShadow(el);
    const textboxes = descendants.filter((descendant: any) => {
      if (implicitRole(descendant) !== "textbox") return false;
      if (descendant.tagName?.toLowerCase() !== "input") return false;
      return (descendant.getAttribute("type") || "text").toLowerCase() === "text";
    });
    if (textboxes.length !== 1) return false;

    const textbox = textboxes[0];
    if (!hasAssociatedLabelText(textbox)) return false;

    const controls = descendants.filter((descendant: any) =>
      descendant.matches?.(interactiveSelector),
    );
    return controls.every((control: any) => {
      if (control === textbox) return true;
      return implicitRole(control) === "button";
    });
  }

  function compactInputActionGroupLabel(el: any): string | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    const tag = el.tagName.toLowerCase();
    if (!["div", "form"].includes(tag)) return undefined;
    if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
      return undefined;
    }

    const directLabels = Array.from(el.children).filter(
      (child: any) => child.tagName?.toLowerCase() === "label" && !isHidden(child),
    );
    if (directLabels.length !== 1) return undefined;

    const label = directLabels[0] as any;
    const controls = Array.from(
      el.querySelectorAll("input:not([type='hidden']), textarea, [role='textbox'], [role='searchbox']"),
    ).filter((control: any) => !isHidden(control));
    const buttons = Array.from(el.querySelectorAll("button, [role='button']")).filter(
      (button: any) => !isHidden(button),
    );
    if (controls.length !== 1 || buttons.length !== 1) return undefined;

    const control = controls[0] as any;
    if (isNativeSearchControlWrapper(el, control)) return undefined;
    if (
      control.getAttribute("role") === "combobox" ||
      control.getAttribute("aria-autocomplete") ||
      control.getAttribute("aria-controls") ||
      control.getAttribute("aria-expanded")
    ) {
      return undefined;
    }

    const labelText = normalize(
      label.getAttribute("aria-label") || textWithoutInteractive(label) || readableText(label),
    );
    if (!labelText) return undefined;

    const labelFor = normalize(label.getAttribute("for"));
    const controlId = normalize(control.getAttribute("id"));
    const controlName = accessibleName(control, implicitRole(control));
    const controlPlaceholder = normalize(control.getAttribute("placeholder"));
    if (
      labelFor &&
      controlId &&
      labelFor !== controlId &&
      normalize(control.getAttribute("aria-label")) !== labelText
    ) {
      return undefined;
    }

    if (controlName && controlName !== labelText && controlPlaceholder !== labelText) {
      return undefined;
    }

    return labelText;
  }

  function isNativeSearchControlWrapper(el: any, control: any): boolean {
    if (control?.tagName?.toLowerCase() !== "input") return false;
    if ((control.getAttribute("type") || "text").toLowerCase() !== "search") return false;
    return Boolean(el.closest("form[role='search'], search, [role='search']"));
  }

  function buttonShellControl(el: any): any | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (!["div", "span"].includes(el.tagName.toLowerCase())) return false;
    const children = Array.from(el.children || []);
    if (children.length < 1 || children.length > 3) return undefined;
    if (el.matches(interactiveSelector)) return false;
    if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
      return undefined;
    }
    if (directOwnText(el)) return undefined;

    const visibleChildren = children.filter((child: any) => !isHidden(child));
    const controls = visibleChildren.filter(
      (child: any) => child.tagName?.toLowerCase() === "button" || child.getAttribute?.("role") === "button",
    );
    if (controls.length !== 1) return undefined;

    const control = controls[0] as any;
    if (!accessibleName(control, "button")) return undefined;
    if (readableText(control)) return undefined;
    const decorativeOnly = visibleChildren.every((child: any) => {
      if (child === control) return true;
      if (child.matches?.(interactiveSelector)) return false;
      return !directOwnText(child) && !child.querySelector?.(interactiveSelector);
    });
    return decorativeOnly ? control : undefined;
  }

  function buttonShellSiblings(el: any): any[] {
    const parent = el?.parentElement;
    if (!parent) return [];
    return Array.from(parent.children || []).filter((sibling: any) =>
      Boolean(buttonShellControl(sibling)),
    );
  }

  function isButtonShellGroup(el: any): boolean {
    if (!buttonShellControl(el)) return false;
    return buttonShellSiblings(el).length >= 2;
  }

  function isButtonShellClusterGroup(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (!["div", "span"].includes(el.tagName.toLowerCase())) return false;
    const visibleChildren = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (visibleChildren.length < 2 || visibleChildren.length > 6) return false;
    if (el.matches(interactiveSelector)) return false;
    if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
      return false;
    }
    if (directOwnText(el)) return false;

    const shellChildren = visibleChildren.filter((child: any) => isButtonShellGroup(child));
    if (shellChildren.length < 2) return false;

    return visibleChildren.every((child: any) => {
      if (shellChildren.includes(child)) return true;
      if (child.matches?.(interactiveSelector)) return false;
      return !directOwnText(child) && !child.querySelector?.(interactiveSelector);
    });
  }

  function isClusteredVisualButton(el: any, role: string): boolean {
    if (role !== "button") return false;
    if (!el.hasAttribute("aria-label")) return false;
    if (readableText(el)) return false;

    const parent = el.parentElement;
    if (!parent) return false;
    const visualButtons = Array.from(parent.children || []).filter((sibling: any) => {
      if (!sibling || isHidden(sibling)) return false;
      if (implicitRole(sibling) !== "button") return false;
      if (!sibling.hasAttribute("aria-label")) return false;
      if (readableText(sibling)) return false;
      return Boolean(
        sibling.querySelector?.("span[aria-hidden='true'], svg[aria-hidden='true'], img[alt='']"),
      );
    });

    if (visualButtons.length >= 3 && visualButtons.includes(el)) return true;
    return (
      visualButtons.includes(el) &&
      Array.from(parent.children || []).some((sibling: any) =>
        sibling !== el && isButtonShellClusterGroup(sibling),
      )
    );
  }

  function nestedImageLabels(el: any): string[] {
    return Array.from(
      el.querySelectorAll("img[alt], [role='img'][aria-label], svg[aria-label]"),
    )
      .filter((node: any) => !isHidden(node))
      .map((image: any) => {
        const tag = image.tagName.toLowerCase();
        return normalize(
          image.getAttribute("aria-label") ||
            (tag === "img" ? image.getAttribute("alt") : "") ||
            image.getAttribute("title"),
        );
      })
      .filter((label: any): label is string => Boolean(label));
  }

  function nestedImageLabel(el: any): string | undefined {
    return nestedImageLabels(el)[0];
  }

  function embeddedControlLabelFragments(el: any): string[] {
    const fragments: string[] = [];

    function push(fragment?: string): void {
      const normalized = normalize(fragment);
      if (normalized) fragments.push(normalized);
    }

    function collect(node: any): void {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        push(node.textContent || "");
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (node.matches("[aria-hidden='true']")) return;
      const role = implicitRole(node);
      if (role === "image") {
        push(accessibleName(node, "image"));
        return;
      }

      for (const child of Array.from(node.childNodes)) collect(child);
      for (const child of shadowContentChildren(node)) collect(child);
    }

    for (const child of Array.from(el.childNodes || [])) collect(child);
    for (const child of shadowContentChildren(el)) collect(child);
    return fragments;
  }

  function embeddedControlContentName(
    el: any,
    options: { preserveWbrBoundary?: boolean } = {},
  ): string | undefined {
    if (!nestedImageLabels(el).length && !linkSharesListWithImageCardLinks(el)) {
      return readableText(el, options);
    }
    const fragments = embeddedControlLabelFragments(el);
    return fragments.length ? normalize(fragments.join(" ")) : readableText(el, options);
  }

  function linkSharesListWithImageCardLinks(el: any): boolean {
    if (el?.tagName?.toLowerCase() !== "a" && el?.getAttribute?.("role") !== "link") {
      return false;
    }
    const listItem = el.closest("li,[role='listitem']");
    const list = listItem?.parentElement;
    if (!list || implicitRole(list) !== "list") return false;
    return Array.from(list.querySelectorAll("a[href], [role='link']")).some(
      (link: any) => link !== el && !isHidden(link) && nestedImageLabels(link).length > 0,
    );
  }

  function linkContentName(el: any): string | undefined {
    return embeddedControlContentName(el, { preserveWbrBoundary: true });
  }

  function comparableLinkedCardText(value?: string): string | undefined {
    return normalize(value)
      ?.replace(/\s+([.,;:!?])/g, "$1")
      .replace(/([.,;:!?])\s+/g, "$1")
      .toLocaleLowerCase("en-US");
  }

  function postPunctuationWhitespaceCollapsedText(value?: string): string | undefined {
    return normalize(value)?.replace(/([.!?])\s+(?=[\p{L}\p{N}])/gu, "$1");
  }

  function finalPostPunctuationWhitespaceCollapsedText(value?: string): string | undefined {
    return normalize(value)?.replace(/([.!?])\s+(?=[\p{L}\p{N}][^.!?]*$)/u, "$1");
  }

  function shouldCollapseLinkedListCardPostPunctuationWhitespace(
    el: any,
    role: string,
    name?: string,
  ): boolean {
    if (role !== "link" || !name) return false;
    if (!el?.closest?.("li,[role='listitem']")) return false;
    if (postPunctuationWhitespaceCollapsedText(name) === name) return false;
    if (
      !el.querySelector?.("p + div, p + span, p + p + div, p + p + span")
    ) {
      return false;
    }
    const paragraphs = Array.from(el.querySelectorAll("p")).filter(
      (paragraph: any) => !isHidden(paragraph) && readableText(paragraph),
    );
    const lastParagraph = paragraphs[paragraphs.length - 1];
    const punctuationCount = readableText(lastParagraph)?.match(/[.!?]/gu)?.length || 0;
    return punctuationCount >= 2;
  }

  function descendantLinkCardHeading(el: any): any | undefined {
    return Array.from(
      el?.querySelectorAll?.("h1, h2, h3, h4, h5, h6, [role='heading']") || [],
    ).find((candidate: any) => !isHidden(candidate) && Boolean(readableText(candidate)));
  }

  function axLinkedCardContentName(el: any, role: string, contentName?: string): string | undefined {
    if (role !== "link" || !contentName) return undefined;
    if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) return undefined;
    if (!hasLabelledLinkedCardRegionContext(el)) return undefined;

    const axNode = axNodeForElementRole(el, "link");
    const axName = normalize(axNode?.name);
    if (!axName || axName === contentName) return undefined;
    if (axNode?.properties?.focusable !== true) return undefined;

    const heading = descendantLinkCardHeading(el);
    const headingText = normalize(readableText(heading));
    if (!headingText || !contentName.startsWith(headingText)) return undefined;

    const bodyText = normalize(contentName.slice(headingText.length));
    if (
      comparableLinkedCardText(bodyText) !== comparableLinkedCardText(axName)
    ) {
      return undefined;
    }

    if (postPunctuationWhitespaceCollapsedText(axName) === contentName) {
      return contentName;
    }

    return axName;
  }

  function axLabelBoundaryName(el: any, role: string, label?: string): string | undefined {
    if (!label || !el.hasAttribute("aria-labelledby")) return undefined;
    if (
      ![
        "banner",
        "navigation",
        "search",
        "main",
        "contentinfo",
        "complementary",
        "region",
        "list",
        "table",
        "grid",
        "tabpanel",
        "article",
      ].includes(role)
    ) {
      return undefined;
    }

    const axNode = axNodeForElementRole(el, role);
    const axName = normalize(axNode?.name);
    if (!axName || axName === label) return undefined;
    return comparableLinkedCardText(axName) === comparableLinkedCardText(label)
      ? axName
      : undefined;
  }

  function hasLabelledLinkedCardRegionContext(el: any): boolean {
    for (let current = el?.parentElement; current; current = current.parentElement) {
      const explicit = current.getAttribute("role");
      const tag = current.tagName?.toLowerCase();
      const role =
        explicit && explicit !== "none" && explicit !== "presentation"
          ? explicit
          : tag === "section" && current.hasAttribute("aria-labelledby")
            ? "region"
            : undefined;
      if (!role) continue;
      if (!["region", "article"].includes(role)) continue;

      const labelledBy = current.getAttribute("aria-labelledby");
      const label = textFromIdRefs(labelledBy);
      if (!label) continue;

      const labelElement = labelledBy
        ?.split(/\s+/)
        .map((id: string) => resolveIdRef(id))
        .find(Boolean);
      if (!labelElement || !el.contains(labelElement)) continue;

      const axNode = axNodeForElementRole(current, role);
      const axName = normalize(axNode?.name);
      if (!axName) continue;

      if (
        axLabelBoundaryName(current, role, label) ||
        comparableLinkedCardText(axName) === comparableLinkedCardText(label)
      ) {
        return true;
      }
    }
    return false;
  }

  function hrefSlugLabel(el: any): string | undefined {
    if (el?.tagName?.toLowerCase() !== "a") return undefined;
    const href = normalize(el.getAttribute("href"));
    if (!href || href.startsWith("#")) return undefined;

    let url: URL;
    try {
      url = new URL(href, document.baseURI);
    } catch {
      return undefined;
    }

    if (!["http:", "https:"].includes(url.protocol)) return undefined;

    const segments = url.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const lastSegment = segments.at(-1);
    if (!lastSegment) return undefined;

    const decoded = decodeURIComponent(lastSegment)
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/_+/g, " ");
    const acronymWords = new Set([
      "api",
      "apis",
      "css",
      "dom",
      "http",
      "https",
      "js",
      "pwa",
      "svg",
      "ui",
      "url",
      "wai",
      "wcag",
    ]);

    return normalize(
      decoded
        .split(/\s+/)
        .map((word) => {
          if (word.includes("-")) return word;
          const lower = word.toLowerCase();
          if (acronymWords.has(lower)) return lower.toUpperCase();
          return word;
        })
        .join(" "),
    );
  }

  function buttonContentName(el: any): string | undefined {
    return nativeButtonDirectSpanTextName(el) || generatedPseudoName(el) || embeddedControlContentName(el);
  }

  function axConfirmedNativeButtonSymbolSpacingName(
    el: any,
    role: string,
    name?: string,
  ): string | undefined {
    if (role !== "button" || el?.tagName?.toLowerCase() !== "button") return undefined;
    if (!accessibilityNodes.length) return undefined;

    const domName = normalize(name || accessibleName(el, role));
    if (!domName) return undefined;

    const axNode = axNodeForElementRole(el, "button");
    const axName = normalize(axNode?.name);
    if (!axNode || axNode.properties?.focusable !== true || !axName || axName === domName) {
      return undefined;
    }

    const compactSymbolSpacing = (value: string) =>
      (normalize(value) ?? "").replace(/\s+([+→↗×])/g, "$1").replace(/([+→↗×])\s+/g, "$1");

    if (compactSymbolSpacing(axName) !== compactSymbolSpacing(domName)) return undefined;
    if (!/\s[+→↗×](?:\s|$)/.test(axName)) return undefined;

    return axName;
  }

  function nativeButtonStandaloneSymbolSpacingName(
    el: any,
    role: string,
    name?: string,
  ): string | undefined {
    if (role !== "button" || el?.tagName?.toLowerCase() !== "button") return undefined;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return undefined;
    if (el.disabled || el.hasAttribute?.("disabled")) return undefined;

    const domName = normalize(name || accessibleName(el, role));
    if (!domName) return undefined;

    const fragments: string[] = [];
    const collectTextFragments = (node: any) => {
      for (const child of Array.from(node?.childNodes || [])) {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = normalize(child.textContent || "");
          if (text) fragments.push(text);
          continue;
        }
        if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) continue;
        if (child.matches?.(interactiveSelector)) return;
        collectTextFragments(child);
      }
    };

    collectTextFragments(el);
    if (fragments.length < 2) return undefined;
    if (!/^[+→↗×]$/.test(fragments[fragments.length - 1])) return undefined;

    const spacedName = normalize(fragments.join(" "));
    if (!spacedName || spacedName === domName) return undefined;

    const compactSymbolSpacing = (value: string) =>
      (normalize(value) ?? "").replace(/\s+([+→↗×])/g, "$1").replace(/([+→↗×])\s+/g, "$1");
    if (compactSymbolSpacing(spacedName) !== compactSymbolSpacing(domName)) return undefined;

    return spacedName;
  }

  function nativeButtonDirectSpanTextName(el: any): string | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName?.toLowerCase() !== "button") return undefined;
    if (el.getAttribute("role") && el.getAttribute("role") !== "button") return undefined;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return undefined;
    if (
      el.hasAttribute("data-sr-pseudo-before") ||
      el.hasAttribute("data-sr-pseudo-after")
    ) {
      return undefined;
    }
    if (el.querySelector(interactiveSelector)) return undefined;

    let text = "";
    let spanCount = 0;
    let sawAdjacentTextSpans = false;
    let previousWasTextSpan = false;
    let interveningText = "";

    for (const child of Array.from(el.childNodes || [])) {
      if (child.nodeType === Node.TEXT_NODE) {
        const value = child.textContent || "";
        text += value;
        interveningText += value;
        continue;
      }

      if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) {
        continue;
      }

      if (child.tagName?.toLowerCase() !== "span") return undefined;
      if (child.querySelector(interactiveSelector)) return undefined;

      const childText = readableText(child);
      if (!childText) continue;

      if (previousWasTextSpan && interveningText === "") {
        sawAdjacentTextSpans = true;
      }
      text += childText;
      spanCount += 1;
      previousWasTextSpan = true;
      interveningText = "";
    }

    if (spanCount < 2 || !sawAdjacentTextSpans) return undefined;
    return normalize(text);
  }

  function isNativeButtonDirectSpanGroupButton(el: any): boolean {
    if (!nativeButtonDirectSpanTextName(el)) return false;
    if (el.disabled || el.hasAttribute?.("disabled")) return false;

    return ![
      "aria-checked",
      "aria-controls",
      "aria-current",
      "aria-describedby",
      "aria-disabled",
      "aria-expanded",
      "aria-haspopup",
      "aria-pressed",
      "aria-selected",
    ].some((attribute) => el.hasAttribute?.(attribute));
  }

  function isAxConfirmedNestedSubmitButtonInTabPanelGroup(
    el: any,
    role: string,
    name?: string,
  ): boolean {
    if (role !== "button" || el?.tagName?.toLowerCase() !== "button") return false;
    if ((el.getAttribute("type") || "submit").toLowerCase() !== "submit") return false;
    if (!el.closest("form")) return false;
    if (!el.closest("[role='tabpanel']")) return false;
    if (
      el.hasAttribute("aria-label") ||
      el.hasAttribute("aria-labelledby") ||
      el.hasAttribute("aria-expanded") ||
      normalizedPopup(el)
    ) {
      return false;
    }
    if (el.disabled || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") {
      return false;
    }
    if (directOwnText(el)) return false;

    const visibleChildren = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (visibleChildren.length !== 1) return false;
    const wrapper = visibleChildren[0] as any;
    if (!["div", "span"].includes(wrapper.tagName?.toLowerCase())) return false;
    if (wrapper.matches?.(interactiveSelector) || wrapper.querySelector?.(interactiveSelector)) {
      return false;
    }

    const buttonName = normalize(name || accessibleName(el, role));
    const wrapperText = normalize(readableText(wrapper));
    if (!buttonName || wrapperText !== buttonName) return false;

    const axNode = axNodeForElementRole(el, "button");
    return Boolean(
      axNode &&
        normalize(axNode.name) === buttonName &&
        axNode.properties?.focusable === true,
    );
  }

  function isFocusableImageListItem(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el.tagName.toLowerCase() !== "li") return false;
    if (!el.hasAttribute("tabindex")) return false;
    if (el.querySelector(interactiveSelector)) return false;
    if (!nestedImageLabel(el)) return false;
    return !textWithoutInteractive(el);
  }

  function hasImageLinkWithCaptionListItemContent(el: any): boolean {
    if (!isListItem(el)) return false;
    const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) => !isHidden(link),
    );
    if (links.length !== 1 || !isIconOnlyLink(links[0])) return false;
    return Boolean(textWithoutInteractive(el));
  }

  function hasNamedImageListItemContent(el: any): boolean {
    if (!isListItem(el)) return false;
    if (el.querySelector(interactiveSelector)) return false;
    return Array.from(el.querySelectorAll("img, [role='img']")).some(
      (image: any) =>
        !isHidden(image) &&
        implicitRole(image) === "image" &&
        Boolean(accessibleName(image, "image")),
    );
  }

  function isDecorativeEmojiText(el: any, role: string): boolean {
    if (role !== "text") return false;
    const text = normalize(directOwnText(el) || readableText(el));
    if (!text) return false;
    return /^[\p{Extended_Pictographic}\uFE0F\s]+$/u.test(text);
  }

  function joinedPriceDisclosureText(el: any): string | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName.toLowerCase() !== "div") return undefined;
    if (el.matches(interactiveSelector) || el.closest(interactiveSelector)) return undefined;

    const visibleChildren = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (visibleChildren.length !== 2) return undefined;

    const [priceWrapper, note] = visibleChildren;
    if (note.tagName?.toLowerCase() !== "span") return undefined;
    if (note.querySelector(interactiveSelector)) return undefined;

    const priceText = normalize(readableText(priceWrapper));
    const noteText = normalize(readableText(note));
    if (!priceText || !noteText) return undefined;
    if (!/^(from\s+)?[£$€]\s?\d+(?:[.,]\d+)?\s*\/\s*(?:month|mo|mth)$/i.test(priceText)) {
      return undefined;
    }
    if (!/\bprices?\s+may\s+change\b/i.test(noteText) || !/\bminimum\s+term\b/i.test(noteText)) {
      return undefined;
    }

    const ariaHiddenDuplicate = Array.from(priceWrapper.querySelectorAll("[aria-hidden='true']")).some(
      (candidate: any) => normalize(candidate.textContent || "") !== undefined,
    );
    if (!ariaHiddenDuplicate) return undefined;

    return normalize(`${priceText} ${noteText}`);
  }

  function visibleLeafTextFragments(el: any): string[] {
    const fragments: string[] = [];

    function push(fragment?: string): void {
      const normalized = normalize(fragment);
      if (normalized) fragments.push(normalized);
    }

    function collect(node: any): void {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        push(node.textContent || "");
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (node.matches("[aria-hidden='true']")) return;
      if (["script", "style", "svg"].includes(node.tagName?.toLowerCase())) return;

      const visibleChildren = Array.from(node.childNodes || []).filter((child: any) => {
        if (child.nodeType === Node.TEXT_NODE) return Boolean(normalize(child.textContent));
        return child.nodeType === Node.ELEMENT_NODE && !isHidden(child) && !child.matches("[aria-hidden='true']");
      });

      if (visibleChildren.length === 1 && visibleChildren[0].nodeType === Node.TEXT_NODE) {
        push(visibleChildren[0].textContent || "");
        return;
      }

      for (const child of Array.from(node.childNodes || [])) collect(child);
      for (const child of shadowContentChildren(node)) collect(child);
    }

    collect(el);
    return fragments;
  }

  function priceDisclosureFragments(el: any, role?: string): string[] | undefined {
    if (role && !["paragraph", "text"].includes(role)) return undefined;
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName.toLowerCase() !== "div") return undefined;
    if (el.matches(interactiveSelector) || el.closest(interactiveSelector)) return undefined;

    const text = normalize(readableText(el));
    if (!text) return undefined;
    if (!/(?:from\s+)?[£$€]\s?\d+(?:[.,]\d+)?\s*\/\s*(?:month|mo|mth)/i.test(text)) {
      return undefined;
    }
    if (!/\bprices?\s+may\s+change\b/i.test(text)) return undefined;

    const ariaHiddenDuplicate = Array.from(el.querySelectorAll("[aria-hidden='true']")).some(
      (candidate: any) => normalize(candidate.textContent || "") !== undefined,
    );
    if (!ariaHiddenDuplicate) return undefined;

    const fragments = visibleLeafTextFragments(el);
    if (fragments.length < 2) return undefined;
    if (!/^(from\s+)?[£$€]\s?\d+(?:[.,]\d+)?\s*\/\s*(?:month|mo|mth)$/i.test(fragments[0])) {
      return undefined;
    }
    if (!fragments.some((fragment) => /\bprices?\s+may\s+change\b/i.test(fragment))) {
      return undefined;
    }
    if (
      !fragments.some((fragment) => /\bno\s+upfront\s+fees?\b/i.test(fragment)) &&
      !fragments.some((fragment) => /\bswitching\s+credit\b/i.test(fragment))
    ) {
      return undefined;
    }
    return fragments;
  }

  function groupedMetricCardText(el: any): string | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName.toLowerCase() !== "div") return undefined;
    if (el.matches(interactiveSelector) || el.closest(interactiveSelector)) return undefined;

    const children = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (children.length !== 2) return undefined;

    const [headingRow, body] = children;
    if (headingRow.tagName?.toLowerCase() !== "div" || body.tagName?.toLowerCase() !== "span") {
      return undefined;
    }
    const headingParts = Array.from(headingRow.children || []).filter(
      (child: any) => !isHidden(child),
    );
    if (
      headingParts.length !== 2 ||
      headingParts.some((child: any) => child.tagName?.toLowerCase() !== "span")
    ) {
      return undefined;
    }

    const title = normalize(readableText(headingParts[0]));
    const metric = normalize(readableText(headingParts[1]));
    const bodyText = normalize(readableText(body));
    if (!title || !metric || !bodyText) return undefined;
    if (title.length > 80 || /[.!?]$/.test(title)) return undefined;
    if (!/\b\d+(?:\.\d+)?\s*(?:M|G|K)?bps\b/i.test(metric)) return undefined;
    if (!/[.!?]$/.test(bodyText)) return undefined;

    return normalize(`${title} ${metric} ${bodyText}`);
  }

  function isInsideJoinedPriceDisclosure(el: any): boolean {
    for (let current = el?.parentElement; current; current = current.parentElement) {
      if (joinedPriceDisclosureText(current)) return true;
    }
    return false;
  }

  function isInsideGroupedMetricCard(el: any): boolean {
    for (let current = el?.parentElement; current; current = current.parentElement) {
      if (groupedMetricCardText(current)) return true;
    }
    return false;
  }

  function isFocusableStructuredListItemGroup(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el.tagName.toLowerCase() !== "li") return false;
    if (!el.hasAttribute("tabindex")) return false;
    if (isFocusableImageListItem(el)) return false;
    if (!hasStructuredListItemContent(el)) return false;
    if (!readableText(el)) return false;
    const hasHeadingCardContent = Boolean(
      el.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']") &&
        el.querySelector("p, button, [role='button'], a[href], [role='link']"),
    );
    const hasImageTextCardContent = Boolean(
      !el.querySelector(interactiveSelector) &&
        el.querySelector("img, [role='img'], svg[aria-label]") &&
        el.querySelectorAll("p").length > 1,
    );
    return hasHeadingCardContent || hasImageTextCardContent;
  }

  function focusableStructuredListItemName(el: any): string | undefined {
    return normalize(readableText(el)?.replace(/\+(?=\p{L})/gu, "+ "));
  }

  function isCustomElement(el: any): boolean {
    return Boolean(el?.tagName?.toLowerCase().includes("-"));
  }

  function closestCustomElement(el: any): any {
    for (let current = el?.parentElement; current; current = current.parentElement) {
      if (isCustomElement(current)) return current;
      const shadowHost = shadowContentHostByNode.get(current);
      if (isCustomElement(shadowHost)) return shadowHost;
    }
    const shadowHost = shadowContentHostByNode.get(el);
    if (isCustomElement(shadowHost)) return shadowHost;
    return null;
  }

  function hasSameNameCustomGroupAncestor(el: any, name?: string): boolean {
    const normalizedName = normalize(name);
    if (!normalizedName) return false;

    const seen = new Set<any>();
    for (let current = el?.parentElement; current; current = current.parentElement) {
      const candidates = [current, shadowContentHostByNode.get(current)].filter(Boolean);
      for (const candidate of candidates) {
        if (seen.has(candidate) || !isCustomElement(candidate)) continue;
        seen.add(candidate);
        if (normalize(accessibleName(candidate, "group")) === normalizedName) {
          return true;
        }
      }
    }

    const shadowHost = shadowContentHostByNode.get(el);
    return Boolean(
      shadowHost &&
        isCustomElement(shadowHost) &&
        normalize(accessibleName(shadowHost, "group")) === normalizedName,
    );
  }

  function isFocusableCustomTooltipTrigger(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (!el.hasAttribute("tabindex") || el.getAttribute("tabindex") === "-1") return false;
    if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector)) return false;
    if (!directOwnText(el)) return false;

    const host = closestCustomElement(el);
    if (!host) return false;
    return /tooltip/i.test(host.tagName.toLowerCase());
  }

  function explicitTooltipText(el: any): string | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    const role = normalize(el.getAttribute("role"))?.toLowerCase();
    const tag = el.tagName?.toLowerCase?.() || "";
    if (role !== "tooltip" && !/tooltip/i.test(tag)) return undefined;
    return normalize(el.textContent || "");
  }

  function isTooltipElementLike(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const role = normalize(el.getAttribute("role"))?.toLowerCase();
    const tag = el.tagName?.toLowerCase?.() || "";
    return role === "tooltip" || /tooltip/i.test(tag);
  }

  function hasNonTooltipDescendantText(el: any): boolean {
    for (const child of Array.from(el?.childNodes || [])) {
      if ((child as any).nodeType === Node.TEXT_NODE) {
        if (normalize((child as any).textContent || "")) return true;
        continue;
      }
      if ((child as any).nodeType !== Node.ELEMENT_NODE) continue;
      if (isTooltipElementLike(child)) continue;
      if (hasNonTooltipDescendantText(child)) return true;
    }
    return false;
  }

  function hasAssociatedExplicitTooltip(el: any, name?: string): boolean {
    const normalizedName = normalize(name);
    if (!normalizedName) return false;

    const ids = new Set<string>();
    for (
      let current = el;
      current && current.nodeType === Node.ELEMENT_NODE;
      current = current.parentElement
    ) {
      const id = normalize(current.getAttribute?.("id"));
      if (id) ids.add(id);
      if (current === document.body || current === document.documentElement) break;
    }

    for (
      let current = el?.parentElement, depth = 0;
      current && depth < 4;
      current = current.parentElement, depth += 1
    ) {
      const tooltips = Array.from(
        current.querySelectorAll?.("[role='tooltip'], *") || [],
      ).filter((candidate: any) => explicitTooltipText(candidate) === normalizedName);
      for (const tooltip of tooltips as any[]) {
        const target = normalize(tooltip.getAttribute?.("for"));
        if (target && !ids.has(target)) continue;
        return true;
      }
    }

    return false;
  }

  function hasShadowRootContent(el: any): boolean {
    return Boolean(
      el?.shadowRoot ||
        Array.from(el?.children || []).some(
          (child: any) =>
            child.tagName?.toLowerCase() === "template" &&
            child.getAttribute("shadowrootmode"),
        ),
    );
  }

  function isLabeledIconActionButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (isSlideshowNavigationButton(el)) return false;
    if (isCarouselControlButton(el)) return false;
    if (!el.hasAttribute("aria-label")) return false;
    if (normalizedPopup(el) || el.hasAttribute("aria-expanded")) return false;
    if (isPositionedImageChoiceButton(el)) return false;

    const label = normalize(el.getAttribute("aria-label"));
    if (/^(previous|next) slide\b/i.test(label || "")) return false;
    if (isAriaLabelOnlyDecorativeIconButton(el)) return false;

    return Boolean(el.querySelector("svg, [role='img'], img"));
  }

  function isAriaLabelOnlyDecorativeIconButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (!el.hasAttribute("aria-label")) return false;
    if (readableText(el) || nestedImageLabel(el)) return false;
    if (hasNonTooltipDescendantText(el)) return false;
    return Boolean(
      el.querySelector("svg, [role='img'], img") ||
        Array.from(el.children).some(
          (child: any) =>
            isCustomElement(child) &&
            !readableText(child) &&
            !nestedImageLabel(child) &&
            !hasNonTooltipDescendantText(child) &&
            !child.querySelector?.(interactiveSelector),
        ),
    );
  }

  function isPositionedImageChoiceButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (!el.hasAttribute("aria-label")) return false;
    if (nestedImageLabel(el)) return false;
    if (readableText(el)) return false;
    if (!el.querySelector("svg, [role='img'], img")) return false;
    if (!hasOnlyInteractiveListItemContent(semanticListContext(el).listItem)) return false;
    const rect = el.getBoundingClientRect?.();
    if (rect && (rect.width > 80 || rect.height > 80)) return false;
    return Boolean(positionInSet(el, "button"));
  }

  function isCollapsedDialogPopupImageTextButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (el.tagName?.toLowerCase() !== "button") return false;
    if (!normalize(el.getAttribute("aria-label"))) return false;
    if (normalizedPopup(el) !== "dialog") return false;
    if (parseBooleanAttribute(el, "aria-expanded") !== false) return false;

    const directVisibleElements = Array.from(el.children || []).filter(
      (child: any) => !isHidden(child),
    );
    return (
      directVisibleElements.some((child: any) => child.tagName?.toLowerCase() === "img") &&
      directVisibleElements.some((child: any) => child.tagName?.toLowerCase() === "span")
    );
  }

  function isIconFirstTextButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (isNativeCardActionDisclosureButton(el)) return false;
    if (!readableText(el)) return false;
    if (normalizedPopup(el) || el.hasAttribute("aria-expanded")) return false;

    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (normalize(child.textContent)) return false;
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }
      const marker = renderedHiddenValue(child);
      const style = safeComputedStyle(child);
      if ((marker && marker !== "false") || style?.display === "none") continue;
      const selector = "svg, img, [role='img']";
      if (!(child.matches(selector) || Boolean(child.querySelector(selector)))) {
        return false;
      }
      const trailingNodes = Array.from(el.childNodes).slice(
        Array.from(el.childNodes).indexOf(child) + 1,
      );
      const hasTrailingTextElement = trailingNodes.some(
        (node: any) =>
          node.nodeType === Node.ELEMENT_NODE &&
          !isHidden(node) &&
          normalize(readableText(node) || node.textContent),
      );
      return hasTrailingTextElement;
    }

    return false;
  }

  function isTextWithTrailingIconButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    const label = normalize(accessibleName(el, "button") || readableText(el));
    if (!/^learn more$/i.test(label || "")) return false;
    if (normalizedPopup(el) || el.hasAttribute("aria-expanded")) return false;
    if (el.closest("form")) return false;
    if (isPositionedImageChoiceButton(el)) return false;
    if (semanticListContext(el).listItem && positionInSet(el, "button")) {
      return false;
    }
    return Boolean(el.querySelector("p, span") && el.querySelector("svg, img, [role='img']"));
  }

  function isTrailingDisclaimerButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (normalizedPopup(el) || el.hasAttribute("aria-expanded")) return false;
    if (el.querySelector("svg, [role='img'], img")) return false;
    const label = readableText(el) || accessibleName(el, "button");
    if (!label) return false;
    if (!/\blegals?\b/i.test(label)) return false;

    for (
      let current = el.parentElement, depth = 0;
      current && depth < 4;
      current = current.parentElement, depth += 1
    ) {
      if (current === document.body || current === document.documentElement) break;
      const textBeforeButton = normalize(textWithoutInteractive(current));
      if (!textBeforeButton) continue;
      const fullText = normalize(readableText(current));
      if (
        fullText.endsWith(label) &&
        (/[.!?]$/.test(textBeforeButton) || hasPreviousCardActionControls(current))
      ) {
        return true;
      }
    }

    return false;
  }

  function hasPreviousCardActionControls(el: any): boolean {
    const previous = previousVisibleElementSibling(el);
    if (!previous) return false;

    const actionControls = Array.from(
      previous.querySelectorAll(":scope > a[href], :scope > button"),
    ).filter((control: any) => !isHidden(control));
    if (
      actionControls.length === 2 &&
      actionControls[0].tagName?.toLowerCase() === "a" &&
      actionControls[1].tagName?.toLowerCase() === "button"
    ) {
      return true;
    }

    const actionWrappers = Array.from(previous.children || []).filter(
      (child: any) => !isHidden(child) && child.querySelector?.(interactiveSelector),
    );
    if (actionWrappers.length < 2) return false;
    const linkWrapper = actionWrappers[actionWrappers.length - 2] as any;
    const buttonWrapper = actionWrappers[actionWrappers.length - 1] as any;
    return hasOnlyNativeLinkControls(linkWrapper) &&
      Array.from(buttonWrapper.querySelectorAll(":scope > button, :scope > [role='button']")).filter(
        (button: any) => !isHidden(button),
      ).length === 1;
  }

  function isNativeCardActionDisclosureButton(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName.toLowerCase() !== "button") return false;
    if (el.getAttribute("role") || el.hasAttribute("tabindex")) return false;
    if (
      el.hasAttribute("aria-label") ||
      el.hasAttribute("aria-labelledby") ||
      el.hasAttribute("aria-expanded") ||
      el.hasAttribute("aria-controls") ||
      normalizedPopup(el)
    ) {
      return false;
    }
    if (!readableText(el)) return false;
    const media = Array.from(el.querySelectorAll("svg, img, [role='img']"));
    if (!media.length) return false;
    if (
      media.some(
        (candidate: any) =>
          candidate.getAttribute("aria-hidden") !== "true" &&
          normalize(candidate.getAttribute("alt")) !== "",
      )
    ) {
      return false;
    }

    function hasFollowingDetails(container: any): boolean {
      const following = nextVisibleElementSibling(container);
      return Boolean(
        following &&
          !following.matches?.(interactiveSelector) &&
          !following.closest?.(interactiveSelector) &&
          textWithoutInteractive(following),
      );
    }

    const actionRow = el.parentElement;
    if (!actionRow) return false;
    const visibleControls = Array.from(
      actionRow.querySelectorAll(":scope > a[href], :scope > button"),
    ).filter((control: any) => !isHidden(control));
    if (
      visibleControls.length === 2 &&
      visibleControls[1] === el &&
      visibleControls[0].tagName?.toLowerCase() === "a" &&
      hasFollowingDetails(actionRow)
    ) {
      return true;
    }

    const previous = previousVisibleElementSibling(actionRow);
    const parent = actionRow.parentElement;
    const wrapperControls = Array.from(
      actionRow.querySelectorAll(":scope > button, :scope > [role='button']"),
    ).filter((control: any) => !isHidden(control));
    return Boolean(
      parent &&
        wrapperControls.length === 1 &&
        wrapperControls[0] === el &&
        previous &&
        hasOnlyNativeLinkControls(previous) &&
        hasFollowingDetails(parent),
    );
  }

  function isCarouselControlButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    const controls = normalize(el.getAttribute("aria-controls"));
    if (!controls) return false;
    const controlled = resolveIdRef(controls);
    return Boolean(
      controlled?.closest?.(
        "[aria-roledescription='carousel'], [aria-roledescription='slideshow']",
      ),
    );
  }

  function isSlideshowNavigationButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (el.hasAttribute("aria-pressed")) return false;

    const label = normalize(
      el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        textWithoutInteractive(el) ||
        readableText(el),
    );
    if (!/^(previous|next)(\b|,)/i.test(label || "")) return false;
    if (/^(previous|next) slide\b/i.test(label || "")) return false;
    if (/^(previous|next) item, .+ gallery$/i.test(label || "")) return true;
    return Boolean(
      el.closest(
        "[aria-roledescription='slideshow'], [aria-roledescription='carousel']",
      ),
    );
  }

  function isImplicitDisabledPreviousSlideButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (el.disabled || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") {
      return false;
    }
    const label = normalize(
      el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        textWithoutInteractive(el) ||
        readableText(el),
    );
    if (label !== "Previous slide") return false;

    for (let current = el.parentElement, depth = 0; current && depth < 4; current = current.parentElement, depth += 1) {
      const buttons = Array.from(current.querySelectorAll("button, [role='button']")).filter(
        (button: any) => !isHidden(button),
      );
      const index = buttons.indexOf(el);
      if (index < 0) continue;
      const nextButton = buttons[index + 1];
      const nextLabel = normalize(
        nextButton?.getAttribute("aria-label") ||
          nextButton?.getAttribute("title") ||
          textWithoutInteractive(nextButton) ||
          readableText(nextButton),
      );
      if (nextLabel === "Next slide") {
        const hasFollowingFocusableListItems = Array.from(
          current.querySelectorAll("li[tabindex], [role='listitem'][tabindex]"),
        ).some(
          (item: any) =>
            !isHidden(item) &&
            Boolean(
              nextButton.compareDocumentPosition(item) &
                nextButton.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,
            ),
        );
        if (hasFollowingFocusableListItems) {
          return true;
        }
      }
    }

    return false;
  }

  function isMenuDisclosureGroupButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (!el.hasAttribute("aria-expanded")) return false;
    if (normalizedPopup(el)) return false;
    if (buttonSharesListItemWithLink(el)) return false;

    const label = normalize(
      el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        textWithoutInteractive(el) ||
        readableText(el),
    );

    return /^(show .+ menu|open menu|all .+ destinations menu)$/i.test(label || "");
  }

  function isExpandedNavigationListItemButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (el.tagName?.toLowerCase() !== "button") return false;
    if (parseBooleanAttribute(el, "aria-expanded") !== true) return false;
    if (normalizedPopup(el)) return false;
    if (!shadowInclusiveAncestor(el, "nav,[role='navigation']")) return false;
    if (buttonSharesListItemWithLink(el)) return false;
    if (isPlainUtilityDisclosureButton(el)) return false;

    const listItem = semanticListContext(el).listItem;
    if (!hasOnlyInteractiveListItemContent(listItem)) return false;

    const children = directSemanticChildren(listItem);
    return children.length === 1 && children[0] === el;
  }

  function buttonSharesListItemWithLink(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    const listItem = semanticListContext(el).listItem;
    if (!listItem) return false;
    return Array.from(listItem.querySelectorAll("a[href], [role='link']")).some(
      (link: any) => !isHidden(link) && !link.contains(el) && !el.contains(link),
    );
  }

  function isPlainUtilityDisclosureButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (!el.hasAttribute("aria-expanded")) return false;
    if (normalizedPopup(el)) return false;

    const label = normalize(
      el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        textWithoutInteractive(el) ||
        readableText(el),
    );

    return /^(open search|open alerts\b.*|open help menu|open all categories menu)$/i.test(
      label || "",
    );
  }

  function isSimpleNativeFooter(el: any): boolean {
    if (el?.tagName?.toLowerCase() !== "footer") return false;
    if (el.hasAttribute("role")) return false;

    if (
      el.querySelector("ul, ol, nav, [role='navigation']") ||
      el.querySelectorAll("a[href], [role='link']").length >= 3
    ) {
      return true;
    }

    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
      return false;
    }

    return !el.querySelector(
      "h1, h2, h3, h4, h5, h6, p, nav, [role='heading'], [role='navigation']",
    );
  }

  function isEmptyAlertBeforeDialog(el: any): boolean {
    if (implicitRole(el) !== "alert") return false;
    if (readableText(el)) return false;

    const rootHost = el.getRootNode?.().host;
    if (rootHost?.tagName?.toLowerCase() === "next-route-announcer") {
      for (let sibling = rootHost.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
        if (sibling.getAttribute("role") === "dialog") return true;
        if (isHidden(sibling)) continue;
        if (
          !sibling.getAttribute("role") &&
          !readableText(sibling) &&
          !hasVisibleInteractiveDescendant(sibling)
        ) {
          continue;
        }
        return false;
      }
    }

    if (el.id === "__next-route-announcer__") {
      return true;
    }

    for (let current = el.parentElement; current; current = current.parentElement) {
      for (let sibling = current.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
        if (sibling.getAttribute("role") === "dialog") return true;
        if (isHidden(sibling)) continue;
        if (
          !sibling.getAttribute("role") &&
          !readableText(sibling) &&
          !hasVisibleInteractiveDescendant(sibling)
        ) {
          continue;
        }
        return false;
      }
    }

    return false;
  }

  function isEmptyAlertLiveRegion(el: any, role = implicitRole(el)): boolean {
    if (role !== "alert") return false;
    if (isEmptyAlertBeforeDialog(el)) return false;
    if (accessibleName(el, role) || readableText(el)) return false;
    if (normalize(el.getAttribute("aria-description"))) return false;
    if (textFromIdRefs(el.getAttribute("aria-describedby"))) return false;

    if (accessibilityNodes.length) {
      const axNode = axNodeForElementRole(el, "alert");
      if (!axNode || normalize(axNode.name)) return false;
    }

    return true;
  }

  function isNamedAlertBoundary(el: any, role = implicitRole(el)): boolean {
    if (role !== "alert") return false;
    if (!accessibleName(el, role)) return false;
    if (isEmptyAlertBeforeDialog(el) || isEmptyAlertLiveRegion(el, role)) return false;

    return Array.from(el.children || []).some((child: any) => {
      if (isHidden(child)) return false;
      return (
        isStopElement(child) ||
        hasVisibleInteractiveDescendant(child) ||
        Boolean(readableText(child))
      );
    });
  }

  function isFooterCountrySelector(el: any): boolean {
    if (el?.tagName?.toLowerCase() !== "select") return false;
    const footer = el.closest("footer,[role='contentinfo']");
    if (!footer) return false;
    const label = labelForControl(el) || accessibleName(el, "combobox");
    if (!/^country:\s*$/i.test(label || "")) return false;
    const visibleModalDialog = el.ownerDocument.querySelector(
      "[role='dialog'][aria-modal='true']:not([data-sr-computed-hidden])",
    );
    if (visibleModalDialog) return false;
    return Boolean(
      Array.from(footer.querySelectorAll("a[href], [role='link']")).some((link: any) =>
        /back to top/i.test(accessibleName(link, "link") || readableText(link) || ""),
      ),
    );
  }

  function frameName(el: any): string | undefined {
    if (el?.tagName?.toLowerCase() !== "iframe") return undefined;
    return normalize(
      el.getAttribute("aria-label") ||
        textFromIdRefs(el.getAttribute("aria-labelledby")) ||
        el.getAttribute("title"),
    );
  }

  function directVisibleElementChildren(el: any): any[] {
    return Array.from(el?.children || []).filter((child: any) => !isHidden(child));
  }

  function soleDirectVisibleLink(el: any): any | undefined {
    const children = directVisibleElementChildren(el);
    if (children.length !== 1) return undefined;
    const link = children[0];
    return implicitRole(link) === "link" ? link : undefined;
  }

  function nextMeaningfulElementSibling(el: any): any | undefined {
    for (let sibling = el?.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
      if (isHidden(sibling)) continue;
      if (
        !sibling.getAttribute("role") &&
        !readableText(sibling) &&
        !hasVisibleInteractiveDescendant(sibling)
      ) {
        continue;
      }
      return sibling;
    }
    return undefined;
  }

  function previewFrameTablistAfter(wrapper: any): any | undefined {
    const candidate = nextMeaningfulElementSibling(wrapper);
    if (!candidate || implicitRole(candidate) !== "tablist") return undefined;
    if (candidate.getAttribute("role") !== "tablist") return undefined;
    const tabs = Array.from(candidate.querySelectorAll("[role='tab']")).filter(
      (tab: any) => !isHidden(tab),
    );
    if (tabs.length < 2) return undefined;
    if (tabs.some((tab: any) => !tab.hasAttribute("aria-expanded"))) return undefined;
    return candidate;
  }

  function previewFrameWrapperForLink(el: any): any | undefined {
    if (!el || implicitRole(el) !== "link") return undefined;
    const linkShell = el.parentElement;
    const wrapper = linkShell?.parentElement;
    if (!wrapper || wrapper.tagName?.toLowerCase() !== "div") return undefined;
    if (
      wrapper.getAttribute("role") ||
      wrapper.getAttribute("aria-label") ||
      wrapper.getAttribute("aria-labelledby") ||
      wrapper.hasAttribute("tabindex") ||
      wrapper.matches(interactiveSelector) ||
      directOwnText(wrapper)
    ) {
      return undefined;
    }

    const wrapperChildren = directVisibleElementChildren(wrapper);
    if (wrapperChildren.length !== 2 || wrapperChildren[0] !== linkShell) return undefined;
    if (soleDirectVisibleLink(linkShell) !== el) return undefined;

    const iframe = wrapperChildren[1];
    if (iframe.tagName?.toLowerCase() !== "iframe" || !frameName(iframe)) return undefined;
    if (
      iframe.hasAttribute("aria-live") ||
      iframe.hasAttribute("sandbox") ||
      iframe.hasAttribute("tabindex") ||
      iframe.hasAttribute("aria-controls") ||
      iframe.hasAttribute("aria-expanded")
    ) {
      return undefined;
    }

    return previewFrameTablistAfter(wrapper) ? wrapper : undefined;
  }

  function titleCaseInitial(value?: string): string | undefined {
    const text = normalize(value);
    return text ? `${text.charAt(0).toLocaleUpperCase("en-US")}${text.slice(1)}` : undefined;
  }

  function voiceOverExampleTitle(value?: string): string | undefined {
    return normalize(value)?.replace(/\s+[–—]\s+/g, " - ");
  }

  function voiceOverExampleFrameTitle(value?: string): string | undefined {
    const title = voiceOverExampleTitle(value);
    if (!title) return undefined;
    const match = title.match(/^(.*)\s+example$/i);
    if (!match) return title;
    const documentTitle = normalize(match[1].replace(/\s+second$/i, ""));
    return `${titleCaseInitial(documentTitle)} - Example - GOV.UK Design System`;
  }

  function previewFrameAnnouncementsForLink(el: any, role: string): string[] | undefined {
    if (role !== "link") return undefined;
    const wrapper = previewFrameWrapperForLink(el);
    if (!wrapper) return undefined;
    const iframe = directVisibleElementChildren(wrapper)[1];
    const groupName = voiceOverExampleTitle(frameName(iframe));
    const frameTitle = voiceOverExampleFrameTitle(frameName(iframe));
    if (!groupName || !frameTitle) return undefined;
    return [
      `${groupName}, group`,
      `${frameTitle}, frame`,
      `end of, ${groupName}, group`,
    ];
  }

  function isPreviewFrameTab(el: any, role: string): boolean {
    if (role !== "tab" || !el?.hasAttribute?.("aria-expanded")) return false;
    const tablist = el.closest("[role='tablist']");
    if (!tablist) return false;

    for (
      let sibling = tablist.previousElementSibling;
      sibling;
      sibling = sibling.previousElementSibling
    ) {
      if (isHidden(sibling)) continue;
      if (
        !sibling.getAttribute("role") &&
        !readableText(sibling) &&
        !hasVisibleInteractiveDescendant(sibling)
      ) {
        continue;
      }
      return previewFrameTablistAfter(sibling) === tablist;
    }
    return false;
  }

  function hasSingleTitledIframeRegionContext(el: any): boolean {
    const parent = el?.parentElement;
    if (!parent) return false;
    const role = implicitRole(parent);
    if (role !== "region") return false;
    if (!parent.hasAttribute("aria-labelledby")) return false;
    return Array.from(parent.children || []).filter((child: any) => !isHidden(child)).includes(el);
  }

  function singleTitledIframeChild(el: any): any | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName?.toLowerCase() !== "div") return undefined;
    if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
      return undefined;
    }
    if (el.hasAttribute("tabindex") || el.matches(interactiveSelector)) return undefined;
    if (directOwnText(el)) return undefined;

    const visibleChildren = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (visibleChildren.length !== 1) return undefined;

    const iframe = visibleChildren[0] as any;
    if (iframe.tagName?.toLowerCase() !== "iframe") return undefined;
    if (
      iframe.hasAttribute("aria-live") ||
      iframe.hasAttribute("sandbox") ||
      iframe.hasAttribute("tabindex") ||
      iframe.hasAttribute("aria-controls") ||
      iframe.hasAttribute("aria-expanded")
    ) {
      return undefined;
    }
    const name = frameName(iframe);
    if (!name) return undefined;
    if (!hasSingleTitledIframeRegionContext(el)) return undefined;

    const wrapperNode = axNodeForElement(el);
    const frameNode = axNodeForElementRole(iframe, "frame");
    if (accessibilityNodes.length) {
      if (!wrapperNode || normalizedAxRole(wrapperNode.role) !== "generic") return undefined;
      if (normalize(wrapperNode.name)) return undefined;
      if (!frameNode || normalize(frameNode.name) !== name) return undefined;
      if (wrapperNode.childIds?.length === 1 && wrapperNode.childIds[0] !== frameNode.nodeId) {
        return undefined;
      }
    }

    return iframe;
  }

  function isSingleTitledIframeWrapper(el: any): boolean {
    return Boolean(singleTitledIframeChild(el));
  }

  function hasOffscreenColonSuffix(el: any): boolean {
    return Array.from(el?.children || []).some((child: any) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return false;
      if (!normalize(readableText(child) || child.textContent)?.startsWith(":")) return false;
      return (
        child.getAttribute("data-sr-rendered-position") === "offscreen" ||
        Boolean(child.getAttribute("data-sr-computed-hidden")) ||
        /visually-hidden|sr-only/i.test(child.getAttribute("class") || "")
      );
    });
  }

  function axSpaceBeforeColonLinkName(
    el: any,
    role: string,
    name?: string,
  ): string | undefined {
    if (role !== "link" || !name || !accessibilityNodes.length) return undefined;
    if (!/^Open this example in a new tab:/i.test(name)) return undefined;
    if (!hasOffscreenColonSuffix(el)) return undefined;

    const axNode = axNodeForElementRole(el, "link");
    const axName = normalize(axNode?.name);
    return (
      axName &&
      /^Open this example in a new tab\s+:/i.test(axName) &&
      normalize(axName.replace(/\s+:/, ":")) === name
        ? axName
        : undefined
    );
  }

  function axWhitespaceOnlyLinkName(
    el: any,
    role: string,
    name?: string,
  ): string | undefined {
    if (role !== "link" || !name || !accessibilityNodes.length) return undefined;
    if (hasOffscreenColonSuffix(el)) return undefined;
    const axName = normalize(axNodeForElementRole(el, "link")?.name);
    if (!axName || axName === name) return undefined;
    if (postPunctuationWhitespaceCollapsedText(axName) === name) return undefined;
    const compact = (value: string) => normalize(value).replace(/\s+/g, "");
    return compact(axName) === compact(name) ? axName : undefined;
  }

  function differsOnlyByTerminalPunctuation(
    labelledName?: string,
    visibleName?: string,
  ): boolean {
    const normalizedLabel = normalize(labelledName);
    const normalizedVisible = normalize(visibleName);
    if (!normalizedLabel || !normalizedVisible || normalizedLabel === normalizedVisible) {
      return false;
    }
    return normalize(normalizedLabel.replace(/[.!?]$/u, "")) === normalizedVisible;
  }

  function hasOfferMetadataTail(labelledName?: string, visibleName?: string): boolean {
    const normalizedLabel = normalize(labelledName);
    const normalizedVisible = normalize(visibleName);
    if (!normalizedLabel || !normalizedVisible || normalizedLabel === normalizedVisible) {
      return false;
    }
    if (!normalizedLabel.startsWith(`${normalizedVisible}. `)) return false;

    const tail = normalizedLabel.slice(normalizedVisible.length + 2);
    return /^From\s+/u.test(tail) && /(?:[£$€]\s*\d|\b[A-Z]{3}\s*\d|\b\d+\s*(?:GBP|USD|EUR)\b)/u.test(tail);
  }

  function axConfirmedLinkedOfferHeadingName(el: any, role: string): string | undefined {
    if (role !== "heading" || !accessibilityNodes.length) return undefined;
    if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) {
      return undefined;
    }

    const links = Array.from(
      el.querySelectorAll("a[href], [role='link']"),
    ).filter((candidate: any) => !isHidden(candidate)) as any[];
    if (links.length !== 1) return undefined;

    const link = links[0];
    const ariaLabel = normalize(link.getAttribute("aria-label"));
    if (!ariaLabel) return undefined;

    const visibleName = normalize(linkContentName(link) || readableText(link) || readableText(el));
    if (!hasOfferMetadataTail(ariaLabel, visibleName)) {
      return undefined;
    }

    const axLinkName = normalize(axNodeForElementRole(link, "link")?.name);
    const axHeadingName = normalize(axNodeForElementRole(el, "heading")?.name);
    return axLinkName === ariaLabel && axHeadingName === ariaLabel ? ariaLabel : undefined;
  }

  function axConfirmedTerminalPunctuationLinkedHeadingName(
    el: any,
    role: string,
  ): string | undefined {
    if (role !== "heading" || !accessibilityNodes.length) return undefined;
    if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) {
      return undefined;
    }

    const links = Array.from(
      el.querySelectorAll("a[href], [role='link']"),
    ).filter((candidate: any) => !isHidden(candidate)) as any[];
    if (links.length !== 1) return undefined;

    const link = links[0];
    const ariaLabel = normalize(link.getAttribute("aria-label"));
    if (!ariaLabel) return undefined;

    const visibleName = normalize(linkContentName(link) || readableText(link) || readableText(el));
    if (!differsOnlyByTerminalPunctuation(ariaLabel, visibleName)) {
      return undefined;
    }

    const axName = normalize(axNodeForElementRole(link, "link")?.name);
    return axName === ariaLabel ? ariaLabel : undefined;
  }

  function axConfirmedAriaLabelHeadingStaticTextItemCount(
    el: any,
    role: string,
  ): number | undefined {
    if (role !== "heading" || !accessibilityNodes.length) return undefined;
    if (!el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) return undefined;
    if (el.querySelector("button, [role='button'], a[href], [role='link']")) return undefined;

    const ariaLabel = normalize(el.getAttribute("aria-label"));
    const axNode = axNodeForElementRole(el, "heading");
    const axName = normalize(axNode?.name);
    if (!ariaLabel || !axName || axName !== ariaLabel) return undefined;

    const axTextChildren = axChildNodes(axNode)
      .filter((node) => normalizedAxRole(node.role) === "statictext")
      .map((node) => node.name || "")
      .filter((name) => Boolean(normalize(name)));
    if (axTextChildren.length <= 1) return undefined;

    const combinedChildText = normalize(axTextChildren.join(""));
    const axNameWithoutTerminalPunctuation = normalize(axName.replace(/\s*[.!?]$/u, ""));
    return combinedChildText && combinedChildText === axNameWithoutTerminalPunctuation
      ? axTextChildren.length
      : undefined;
  }

  function axConfirmedAriaLabelHeadingVisibleTextItemCount(
    el: any,
    role: string,
  ): number | undefined {
    if (role !== "heading" || !accessibilityNodes.length) return undefined;
    if (!el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) return undefined;
    if (el.querySelector("button, [role='button'], a[href], [role='link']")) return undefined;

    const ariaLabel = normalize(el.getAttribute("aria-label"));
    const axNode = axNodeForElementRole(el, "heading");
    const axName = normalize(axNode?.name);
    if (!ariaLabel || !axName || axName !== ariaLabel) return undefined;

    const parts: Array<{ text: string; el?: any }> = [];
    for (const child of Array.from(el.childNodes || [])) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = normalize(child.textContent);
        if (text) parts.push({ text });
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) continue;
      const text = normalize(readableText(child));
      if (text) parts.push({ text, el: child });
    }
    if (parts.length <= 1) return undefined;

    const joined = normalize(parts.map((part) => part.text).join(" "));
    const joinedWithoutTerminalPunctuation = normalize(joined.replace(/\s*[.!?]$/u, ""));
    const axNameWithoutTerminalPunctuation = normalize(axName.replace(/\s*[.!?]$/u, ""));
    if (
      joined !== axName &&
      (!joinedWithoutTerminalPunctuation ||
        joinedWithoutTerminalPunctuation !== axNameWithoutTerminalPunctuation)
    ) {
      return undefined;
    }

    return parts.reduce(
      (total, part) => total + (part.el ? parenthesizedBoundaryPartCount(part.el) || 1 : 1),
      0,
    );
  }

  function axConfirmedSpaceBeforePunctuationHeadingName(
    el: any,
    role: string,
  ): string | undefined {
    if (role !== "heading" || !accessibilityNodes.length) return undefined;
    const ariaLabel = normalize(el.getAttribute("aria-label"));
    if (!ariaLabel || !/\s+[.!?]$/u.test(ariaLabel)) return undefined;

    const axName = normalize(axNodeForElementRole(el, "heading")?.name);
    return axName === ariaLabel ? ariaLabel : undefined;
  }

  function accessibleName(el: any, role: string): string | undefined {
    const tag = el.tagName.toLowerCase();
    const ariaLabel = normalize(el.getAttribute("aria-label"));
    const labelledBy = textFromIdRefs(el.getAttribute("aria-labelledby"));
    const nativeLabel = ["input", "select", "textarea", "meter", "progress"].includes(tag)
      ? labelForControl(el)
      : undefined;

    const axNativeSelectLabelName = axConfirmedNativeSelectLabelName(
      el,
      role,
      labelledBy || nativeLabel,
    );
    if (axNativeSelectLabelName) return axNativeSelectLabelName;

    if (ariaLabel !== undefined && role !== "searchbox" && ["input", "select"].includes(tag)) {
      return ariaLabel;
    }
    if (nativeLabel) return nativeLabel;
    if (ariaLabel !== undefined) return ariaLabel;
    if (labelledBy) {
      return (
        axConfirmedLabelledTabPanelName(el, role, labelledBy) ||
        axLabelBoundaryName(el, role, labelledBy) ||
        labelledBy
      );
    }

    if (
      [
        "banner",
        "navigation",
        "search",
        "main",
        "contentinfo",
        "complementary",
        "region",
        "list",
        "table",
        "grid",
        "tabpanel",
        "article",
      ].includes(role)
    ) {
      if ((role === "table" || role === "grid") && tag === "table") {
        const caption = Array.from(el.children || []).find(
          (child: any) => child.tagName?.toLowerCase() === "caption" && !isHidden(child),
        );
        const captionText = caption ? readableText(caption) : undefined;
        if (captionText) return captionText;
      }
      return normalize(el.getAttribute("title"));
    }

    if (role === "group" && !el.matches(interactiveSelector)) {
      if (tag === "fieldset") return checkboxFieldsetLegendText(el);
      if (tag === "map") return imageMapGroupName(el);
      const compactLabel = compactInputActionGroupLabel(el);
      if (compactLabel) return compactLabel;
      const iframe = singleTitledIframeChild(el);
      if (iframe) return frameName(iframe);
      if (isFocusableImageListItem(el)) return nestedImageLabel(el);
      if (isFocusableStructuredListItemGroup(el)) {
        return focusableStructuredListItemName(el);
      }
      return normalize(el.getAttribute("title"));
    }

    if (tag === "img") return normalize(el.getAttribute("alt"));
    if (tag === "area") return normalize(el.getAttribute("alt")) || areaHrefFallbackName(el);
    if (tag === "object" || tag === "embed") return normalize(el.getAttribute("title"));
    if (["input", "select", "textarea"].includes(tag) && role !== "button") {
      if (tag === "input" && nativeDatalistElement(el)) {
        return nativeLabel || normalize(el.getAttribute("placeholder"));
      }
      return nativeLabel;
    }

    if (role === "link") {
      const contentName = linkContentName(el);
      if (contentName) {
        return (
          axLinkedCardContentName(el, role, contentName) ||
          renderedCaseName(el, role, contentName) ||
          axParentheticalName(el, role, contentName) ||
          axWhitespaceOnlyLinkName(el, role, contentName) ||
          contentName
        );
      }
      const titleName = normalize(el.getAttribute("title"));
      if (titleName) return renderedCaseName(el, role, titleName) || titleName;
      return hrefSlugLabel(el);
    }

    if (role === "button") {
      const nativeInputButtonName = axConfirmedNativeInputButtonName(el, role);
      if (nativeInputButtonName) return nativeInputButtonName;
      const contentName = buttonContentName(el);
      if (contentName) {
        return (
          axGeneratedTrailingDisclosureButtonName(el, role, contentName) ||
          renderedCaseName(el, role, contentName) ||
          contentName
        );
      }
      return normalize(el.getAttribute("title"));
    }

    if (role === "term") {
      return readableText(el) || singleDescendantAbbrTitle(el) || normalize(el.getAttribute("title"));
    }

    if (role === "frame") {
      return frameName(el);
    }

    const textName = readableText(el) || normalize(el.getAttribute("title"));
    return renderedCaseName(el, role, textName) || textName;
  }

  function labelledNavigationHeaderStopText(
    el: any,
    role: string,
    name?: string,
  ): string | undefined {
    if (role !== "navigation") return undefined;
    if (!el?.hasAttribute?.("aria-labelledby")) return undefined;
    if (el.hasAttribute("aria-label")) return undefined;

    const refs = (el.getAttribute("aria-labelledby") || "")
      .split(/\s+/)
      .map((ref: string) => normalize(ref))
      .filter(Boolean);
    if (refs.length !== 1) return undefined;

    const label = resolveIdRef(refs[0]);
    if (!label || label.parentElement !== el || isHidden(label)) return undefined;
    if (label.matches?.(interactiveSelector)) return undefined;
    if (label.tagName?.toLowerCase() !== "header") return undefined;
    if (isStopElement(label)) return undefined;

    const labelText = readableText(label);
    if (!labelText || labelText !== normalize(name)) return undefined;
    if (!firstVisibleListAfterDirectLabel(el, label)) return undefined;

    return labelText;
  }

  function firstVisibleListAfterDirectLabel(container: any, label: any): any | undefined {
    let seenLabel = false;
    for (const child of Array.from(container?.children || [])) {
      if (isHidden(child)) continue;
      if (child === label) {
        seenLabel = true;
        continue;
      }
      if (!seenLabel) continue;
      const role = implicitRole(child);
      if (role === "list") return child;
      const childList = Array.from(child.querySelectorAll?.("ul, ol, dl, [role='list']") || [])
        .find((candidate: any) => !isHidden(candidate) && implicitRole(candidate) === "list");
      if (childList) return childList;
      if (isStopElement(child) || readableText(child) || hasVisibleInteractiveDescendant(child)) {
        return undefined;
      }
    }
    return undefined;
  }

  function singleDescendantAbbrTitle(el: any): string | undefined {
    const abbrs = Array.from(el.querySelectorAll("abbr[title]")).filter(
      (abbr: any) => !isHidden(abbr) && normalize(abbr.getAttribute("title")),
    );
    return abbrs.length === 1 ? normalize((abbrs[0] as any).getAttribute("title")) : undefined;
  }

  function leadingDescendantAbbrTitle(el: any): string | undefined {
    const abbr = Array.from(el.querySelectorAll("abbr[title]")).find(
      (candidate: any) => !isHidden(candidate) && normalize(candidate.getAttribute("title")),
    ) as any;
    return normalize(abbr?.getAttribute("title"));
  }

  function tableCellAbbrTitleButtonName(el: any, role: string): string | undefined {
    if (role !== "button") return undefined;
    if (!el.closest("td,th,[role='cell'],[role='gridcell'],[role='rowheader'],[role='columnheader']")) {
      return undefined;
    }
    if (!el.closest("table,[role='table'],[role='grid']")) return undefined;

    const title = leadingDescendantAbbrTitle(el);
    if (!title) return undefined;

    const label = buttonContentName(el);
    if (!label?.startsWith(title)) return undefined;

    const repeatedPrefix = normalize(title.split(/\s+[–-]\s+/u)[0]);
    let suffix = normalize(label.slice(title.length));
    if (repeatedPrefix && suffix?.startsWith(`${repeatedPrefix} `)) {
      suffix = normalize(suffix.slice(repeatedPrefix.length));
    }
    return normalize([title, suffix].filter(Boolean).join(" "));
  }

  function articleNameFromFirstHeading(el: any, role: string): string | undefined {
    if (role !== "article") return undefined;
    if (
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.getAttribute("title")
    ) {
      return undefined;
    }

    const firstVisibleChild = Array.from(el.children || []).find(
      (child: any) => !isHidden(child) && Boolean(readableText(child)),
    ) as any;
    if (!firstVisibleChild || implicitRole(firstVisibleChild) !== "heading") {
      return undefined;
    }

    return accessibleName(firstVisibleChild, "heading") || readableText(firstVisibleChild);
  }

  function directListArticleCardContextEndName(el: any, role: string): string | undefined {
    if (role !== "article") return undefined;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
      return undefined;
    }
    if (directListArticleCardFor(el) !== el) return undefined;

    const hasDateMetadata = Array.from(el.querySelectorAll("time")).some(
      (time: any) => !isHidden(time) && Boolean(readableText(time)),
    );
    if (!hasDateMetadata) return undefined;

    const heading = Array.from(
      el.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading']"),
    ).find(
      (candidate: any) =>
        !isHidden(candidate) &&
        candidate.closest("article,[role='article']") === el &&
        Boolean(readableText(candidate)),
    ) as any;
    if (!heading) return undefined;

    const headingLink = Array.from(
      heading.querySelectorAll("a[href], [role='link']"),
    ).find((candidate: any) => !isHidden(candidate) && Boolean(readableText(candidate))) as any;
    if (!headingLink) return undefined;

    return (
      accessibleName(headingLink, "link") ||
      accessibleName(heading, "heading") ||
      readableText(heading)
    );
  }

  function siblingArticleCardContextEndName(el: any, role: string): string | undefined {
    if (role !== "article") return undefined;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
      return undefined;
    }
    if (!isSiblingArticleCollectionItem(el)) return undefined;

    const hasDateMetadata = Array.from(el.querySelectorAll("time")).some(
      (time: any) => !isHidden(time) && Boolean(readableText(time)),
    );
    if (!hasDateMetadata) return undefined;

    const heading = Array.from(
      el.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading']"),
    ).find(
      (candidate: any) =>
        !isHidden(candidate) &&
        candidate.closest("article,[role='article']") === el &&
        Boolean(readableText(candidate)),
    ) as any;
    if (!heading) return undefined;

    const headingLink = Array.from(
      heading.querySelectorAll("a[href], [role='link']"),
    ).find((candidate: any) => !isHidden(candidate) && Boolean(readableText(candidate))) as any;
    if (!headingLink) return undefined;

    return (
      accessibleName(headingLink, "link") ||
      accessibleName(heading, "heading") ||
      readableText(heading)
    );
  }

  function isArticleInlineLinkCollectionContext(el: any, role: string): boolean {
    if (role !== "article") return false;
    if (!isSiblingArticleCollectionItem(el)) return false;
    return Array.from(el.children || []).some(
      (child: any) =>
        !isHidden(child) &&
        child.tagName?.toLowerCase() === "p" &&
        Boolean(articleInlineTextLinkFragments(child)),
    );
  }

  function isCompactStandaloneArticleContext(el: any, role: string): boolean {
    if (role !== "article") return false;
    if (isSiblingArticleCollectionItem(el)) return false;
    if (hasVisibleInteractiveDescendant(el)) return false;
    if (el.querySelector("h1,h2,h3,h4,h5,h6,[role='heading'],ul,ol,[role='list'],table,[role='table']")) {
      return false;
    }
    const text = readableText(el);
    return Boolean(text && text.length <= 240);
  }

  function shouldSuppressSingletonDocumentArticleEnd(el: any, role: string): boolean {
    if (role !== "article") return false;
    if (isSiblingArticleCollectionItem(el)) return false;
    if (isCompactStandaloneArticleContext(el, role)) return false;
    if (el.querySelector("h1,[role='heading'][aria-level='1']")) return true;

    const firstVisibleChild = Array.from(el.children || []).find(
      (child: any) => !isHidden(child) && Boolean(readableText(child) || hasVisibleInteractiveDescendant(child)),
    ) as any;
    return Boolean(firstVisibleChild && implicitRole(firstVisibleChild) === "navigation");
  }

  function isContextRole(el: any, role: string): boolean {
    if (role === "article") return true;
    if (role === "alert" && isNamedAlertBoundary(el, role)) return true;
    return contextRoles.has(role);
  }

  function hasPresentationRole(el: any): boolean {
    const role = normalize(el?.getAttribute?.("role"))?.toLowerCase();
    return role === "none" || role === "presentation";
  }

  function presentationAccordionGroupForItem(item: any): any | null {
    if (!item || item.nodeType !== Node.ELEMENT_NODE || isHidden(item)) return null;
    if (item.tagName?.toLowerCase() !== "li" || !hasPresentationRole(item)) return null;

    const visibleChildren = Array.from(item.children || []).filter(
      (child: any) => !isHidden(child),
    );
    if (visibleChildren.length !== 1) return null;

    const button = visibleChildren[0] as any;
    if (button.tagName?.toLowerCase() !== "button") return null;
    if (parseBooleanAttribute(button, "aria-expanded") !== false) return null;
    if (normalizedPopup(button)) return null;

    const label = normalize(accessibleName(button, "button") || readableText(button));
    if (!label) return null;

    const group = nextVisibleElementSibling(item);
    if (!group || group.parentElement !== item.parentElement) return null;
    const groupLabel = normalize(
      group.getAttribute?.("aria-label") || textFromIdRefs(group.getAttribute?.("aria-labelledby")),
    );
    if (groupLabel !== label) return null;

    const links = Array.from(group.querySelectorAll?.("a[href], [role='link']") || []).filter(
      (link: any) => !isHidden(link),
    );
    return links.length ? group : null;
  }

  function isPresentationCollapsedAccordionList(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (!["ul", "ol"].includes(el.tagName?.toLowerCase())) return false;
    if (!hasPresentationRole(el)) return false;

    const items = Array.from(el.children || []).filter(
      (child: any) =>
        !isHidden(child) &&
        child.tagName?.toLowerCase() === "li" &&
        hasPresentationRole(child),
    );
    return Boolean(
      items.length &&
        items.every((item: any) => Boolean(presentationAccordionGroupForItem(item))),
    );
  }

  function isPresentationCollapsedAccordionListItem(el: any): boolean {
    const parent = el?.parentElement;
    return Boolean(
      presentationAccordionGroupForItem(el) &&
        parent &&
        isPresentationCollapsedAccordionList(parent),
    );
  }

  function isPresentationCollapsedAccordionButton(el: any): boolean {
    const item = el?.parentElement;
    if (!item || presentationAccordionGroupForItem(item) === null) return false;
    return isPresentationCollapsedAccordionListItem(item);
  }

  function isSingleLinkPresentationListItem(item: any): boolean {
    if (!item || item.nodeType !== Node.ELEMENT_NODE || isHidden(item)) return false;
    if (item.tagName?.toLowerCase() !== "li" || !hasPresentationRole(item)) return false;
    if (directOwnText(item)) return false;

    const visibleChildren = Array.from(item.children || []).filter(
      (child: any) => !isHidden(child),
    );
    if (visibleChildren.length !== 1) return false;

    const link = visibleChildren[0] as any;
    if (link.tagName?.toLowerCase() !== "a" && link.getAttribute?.("role") !== "link") {
      return false;
    }
    if (!link.hasAttribute("href") && link.getAttribute?.("role") !== "link") return false;
    return Boolean(readableText(link) || normalize(link.getAttribute?.("aria-label")));
  }

  function presentationLinkListGroupLabel(el: any): string | undefined {
    const parent = el?.parentElement;
    if (!parent || isHidden(parent)) return undefined;
    if (!["div", "section"].includes(parent.tagName?.toLowerCase())) return undefined;

    const label = normalize(
      parent.getAttribute?.("aria-label") ||
        textFromIdRefs(parent.getAttribute?.("aria-labelledby")),
    );
    if (!label) return undefined;

    const visibleChildren = Array.from(parent.children || []).filter(
      (child: any) => !isHidden(child),
    );
    if (!visibleChildren.includes(el)) return undefined;
    if (visibleChildren.some((child: any) => child !== el && child.matches?.(interactiveSelector))) {
      return undefined;
    }

    const visibleTextChildren = visibleChildren.filter(
      (child: any) =>
        child !== el &&
        !child.matches?.("script, style, template") &&
        Boolean(readableText(child)),
    );
    if (visibleTextChildren.length !== 1) return undefined;
    return normalize(readableText(visibleTextChildren[0])) === label ? label : undefined;
  }

  function isPresentationLinkList(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (!["ul", "ol"].includes(el.tagName?.toLowerCase())) return false;
    if (!hasPresentationRole(el)) return false;
    if (directOwnText(el)) return false;
    if (!presentationLinkListGroupLabel(el)) return false;

    const items = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    return Boolean(
      items.length &&
        items.every((item: any) => isSingleLinkPresentationListItem(item)),
    );
  }

  function isPresentationLinkListItem(el: any): boolean {
    const parent = el?.parentElement;
    return Boolean(
      parent &&
        isPresentationLinkList(parent) &&
        isSingleLinkPresentationListItem(el),
    );
  }

  function isFocusableRichTextParagraphGroup(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName?.toLowerCase() !== "span") return false;
    if (el.getAttribute("role")) return false;
    if (el.getAttribute("tabindex") !== "0") return false;
    if (
      [
        "aria-label",
        "aria-labelledby",
        "aria-controls",
        "aria-describedby",
        "aria-expanded",
        "aria-haspopup",
      ].some((attribute) => el.hasAttribute(attribute))
    ) {
      return false;
    }

    const visibleChildren = Array.from(el.children || []).filter(
      (child: any) => !isHidden(child),
    );
    if (visibleChildren.length < 2) return false;
    if (visibleChildren.some((child: any) => child.tagName?.toLowerCase() !== "p")) {
      return false;
    }
    if (!readableText(el)) return false;

    return visibleChildren.some((child: any) =>
      Boolean(
        child.querySelector?.("a[href], [role='link'], b, strong, em, i") ||
          (directOwnText(child) && child.children?.length),
      ),
    );
  }

  function isFocusableHeadingRichTextNavigationGroup(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName?.toLowerCase() !== "div") return false;
    if (el.getAttribute("role")) return false;
    if (el.getAttribute("tabindex") !== "0") return false;
    if (
      [
        "aria-label",
        "aria-labelledby",
        "aria-controls",
        "aria-describedby",
        "aria-expanded",
        "aria-haspopup",
      ].some((attribute) => el.hasAttribute(attribute))
    ) {
      return false;
    }

    const visibleChildren = Array.from(el.children || []).filter(
      (child: any) => !isHidden(child),
    );
    const directHeadings = visibleChildren.filter((child: any) =>
      /^h[1-6]$/i.test(child.tagName || "") || child.getAttribute?.("role") === "heading",
    );
    if (directHeadings.length !== 1 || !readableText(directHeadings[0])) {
      return false;
    }

    const navigation = Array.from(el.querySelectorAll("nav, [role='navigation']")).filter(
      (candidate: any) => !isHidden(candidate),
    );
    if (navigation.length !== 1) return false;
    if (!accessibleName(navigation[0], "navigation")) return false;
    if (navigation[0].querySelector?.("a[href], button, [role='link'], [role='button']")) {
      return false;
    }

    const richTextContainers = visibleChildren.filter(
      (child: any) =>
        child !== directHeadings[0] &&
        child.contains?.(navigation[0]) &&
        child.querySelector?.("p"),
    );
    if (richTextContainers.length !== 1) return false;

    const paragraphs = Array.from(richTextContainers[0].querySelectorAll("p")).filter(
      (paragraph: any) => !isHidden(paragraph) && Boolean(readableText(paragraph)),
    );
    if (paragraphs.length < 2) return false;
    if (!paragraphs.some((paragraph: any) => paragraph.querySelector?.("a[href], [role='link']"))) {
      return false;
    }
    if (
      !paragraphs.some((paragraph: any) =>
        paragraph.querySelector?.("b, strong, em, i"),
      )
    ) {
      return false;
    }

    const controls = Array.from(el.querySelectorAll(interactiveSelector)).filter(
      (control: any) => !isHidden(control),
    );
    return controls.every((control: any) => {
      const role = implicitRole(control);
      return role === "link" && paragraphs.some((paragraph: any) => paragraph.contains(control));
    });
  }

  function focusableRichTextParagraphGroupText(el: any): string | undefined {
    if (isFocusableHeadingRichTextNavigationGroup(el)) {
      const navigation = Array.from(el.querySelectorAll("nav, [role='navigation']")).find(
        (candidate: any) => !isHidden(candidate),
      );
      const navigationLabel = accessibleName(navigation, "navigation");
      const directHeading = Array.from(el.children || []).find(
        (child: any) =>
          !isHidden(child) &&
          (/^h[1-6]$/i.test(child.tagName || "") ||
            child.getAttribute?.("role") === "heading"),
      );
      const paragraphs = Array.from(el.querySelectorAll("p")).filter(
        (paragraph: any) => !isHidden(paragraph) && Boolean(readableText(paragraph)),
      );
      return normalize(
        [
          readableText(directHeading),
          ...paragraphs.map((paragraph: any) => readableText(paragraph)),
          navigationLabel,
        ]
          .filter(Boolean)
          .join(" "),
      );
    }
    if (!isFocusableRichTextParagraphGroup(el)) return undefined;
    return normalize(
      Array.from(el.children || [])
        .filter((child: any) => !isHidden(child) && child.tagName?.toLowerCase() === "p")
        .map((child: any) => readableText(child))
        .filter(Boolean)
        .join(" "),
    );
  }

  function axConfirmedFocusableFeedbackGroupText(el: any): string | undefined {
    if (!accessibilityNodes.length) return undefined;
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName?.toLowerCase() !== "div") return undefined;
    if (el.getAttribute("tabindex") !== "-1") return undefined;
    if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
      return undefined;
    }

    const axNode = axNodeForElementRole(el, "generic");
    if (!axNode || axNode.properties?.focusable !== true || normalize(axNode.name)) {
      return undefined;
    }

    const headings = Array.from(el.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']"))
      .filter((candidate: any) => !isHidden(candidate) && Boolean(readableText(candidate)));
    if (headings.length !== 1) return undefined;

    const lists = Array.from(el.querySelectorAll("ul, ol, [role='list']"))
      .filter((candidate: any) => !isHidden(candidate));
    if (lists.length !== 1) return undefined;

    const list = lists[0] as any;
    const headingText = normalize(readableText(headings[0]));
    const headingNode = axNodeForElementRole(headings[0], "heading");
    const listNode = axNodeForElementRole(list, "list");
    if (
      !headingText ||
      !headingNode ||
      normalize(headingNode.name) !== headingText ||
      !listNode
    ) {
      return undefined;
    }

    const listItems = Array.from(list.children || [])
      .filter((candidate: any) => isListItem(candidate) && !isHidden(candidate));
    if (listItems.length !== 2) return undefined;

    const listControls = listItems.map((item: any) => {
      const controls = Array.from(item.querySelectorAll("button, [role='button'], a[href]"))
        .filter((candidate: any) => !isHidden(candidate));
      return controls.length === 1 ? controls[0] : undefined;
    });
    if (listControls.some((control) => !control)) return undefined;

    const visibleControls = Array.from(el.querySelectorAll("button, [role='button'], a[href]"))
      .filter((candidate: any) => !isHidden(candidate));
    if (visibleControls.length !== 3) return undefined;

    const trailingControls = visibleControls.filter((control: any) => !list.contains(control));
    if (trailingControls.length !== 1) return undefined;

    const allControls = [...listControls, trailingControls[0]] as any[];
    if (
      allControls.some((control: any) => {
        const role = implicitRole(control);
        const axControl = axNodeForElementRole(control, role);
        return (
          role !== "button" ||
          !axControl ||
          normalizedAxRole(axControl.role) !== "button" ||
          axControl.properties?.focusable !== true ||
          !normalize(axControl.name)
        );
      })
    ) {
      return undefined;
    }

    const controlText = allControls
      .map((control: any) => normalize(accessibleName(control, "button") || readableText(control)))
      .filter(Boolean);
    if (controlText.length !== 3) return undefined;

    return normalize([headingText, ...controlText].join(" "));
  }

  function isAxConfirmedFocusableFeedbackGroup(el: any): boolean {
    return Boolean(axConfirmedFocusableFeedbackGroupText(el));
  }

  function isSiblingArticleCollectionItem(el: any): boolean {
    const parent = el?.parentElement;
    if (!parent) return false;
    const siblingArticles = Array.from(parent.children || []).filter(
      (child: any) => !isHidden(child) && implicitRole(child) === "article",
    );
    return siblingArticles.length >= 2;
  }

  function implicitRole(el: any): string {
    const tag = el.tagName.toLowerCase();
    const explicit = el.getAttribute("role");
    if (explicit === "img") return "image";
    if (hasPresentationRole(el)) {
      if (isPresentationCollapsedAccordionList(el)) return "";
      if (isPresentationCollapsedAccordionListItem(el)) return "";
      if (isPresentationLinkList(el)) return "";
      if (isPresentationLinkListItem(el)) return "";
      if (tag === "li" && !hasPresentationRole(el.parentElement)) return "";
    }
    if (explicit === "region" && isControlledTablistDescriptionRegion(el)) {
      return "paragraph";
    }
    if (explicit && explicit !== "none" && explicit !== "presentation") {
      return explicit;
    }

    if (/^h[1-6]$/.test(tag)) return "heading";
    if (directNativeDetailsForSummary(el)) return "button";
    if (tag === "a" && el.hasAttribute("href")) return "link";
    if (tag === "button") return "button";
    if (isFocusableImageListItem(el)) return "group";
    if (isFocusableStructuredListItemGroup(el)) return "group";
    if (isFocusableRichTextParagraphGroup(el)) return "group";
    if (isFocusableHeadingRichTextNavigationGroup(el)) return "group";
    if (isAxConfirmedFocusableFeedbackGroup(el)) return "group";
    if (isSingleTitledIframeWrapper(el)) return "group";
    if (tag === "iframe" && singleTitledIframeChild(el.parentElement) === el) return "frame";
    if (tag === "select") return el.hasAttribute("multiple") ? "listbox" : "combobox";
    if (tag === "textarea") return "textbox";
    if (tag === "hr") return "separator";
    if (tag === "progress") return "progressbar";
    if (tag === "meter") return "meter";
    if (tag === "address") return "paragraph";
    if (tag === "object" || tag === "embed") return "object";
    if (tag === "canvas" && readableText(el)) return "text";
    if (tag === "area" && el.hasAttribute("href")) return "link";
    if (tag === "map" && imageMapGroupName(el)) return "group";
    if (tag === "input") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio";
      if (type === "search") return "searchbox";
      if (["button", "submit", "reset"].includes(type)) return "button";
      if (type === "number") return "spinbutton";
      if (type === "range") return "slider";
      if (nativeDatalistElement(el)) return "combobox";
      return "textbox";
    }
    if (tag === "header") {
      return hasSectioningHeaderFooterAncestor(el) ? "" : "banner";
    }
    if (tag === "nav") return "navigation";
    if (tag === "main") return "main";
    if (tag === "article") return "article";
    if (tag === "search") return "search";
    if (tag === "footer") {
      if (axConfirmedNamedSectionFooterName(el)) return "sectionfooter";
      return hasSectioningHeaderFooterAncestor(el) ? "" : "contentinfo";
    }
    if (tag === "aside") return "complementary";
    if (tag === "form" && explicit === "search") return "search";
    if (tag === "form" && isNamedSingleControlForm(el)) {
      return "form";
    }
    if (tag === "ul" || tag === "ol" || tag === "dl") return "list";
    if (tag === "li") return "listitem";
    if (tag === "portal" && directOwnText(el)) return "text";
    if (tag === "dt") return "term";
    if (tag === "dd") return isWrappedDefinitionListItem(el) ? "paragraph" : "";
    if (tag === "table") return "table";
    if (tag === "tr") return "row";
    if (tag === "th") {
      const scope = (el.getAttribute("scope") || "").toLowerCase();
      if (scope === "row" || scope === "rowgroup") return "rowheader";
      if (scope === "col" || scope === "colgroup") return "columnheader";
      if (el.closest("tbody, tfoot")) return "rowheader";
      return "columnheader";
    }
    if (tag === "td") return "cell";
    if (tag === "img" && isImageMapImage(el)) return "";
    if (tag === "img") return "image";
    if (tag === "svg") return "image";
    if (tag === "dialog") return "dialog";
    if (
      tag === "fieldset" &&
      (el.getAttribute("aria-label") ||
        el.getAttribute("aria-labelledby") ||
        fieldsetPromptText(el) ||
        checkboxFieldsetLegendText(el))
    ) {
      return "group";
    }
    if (tag === "blockquote") return el.closest("figure") ? "blockquote" : "paragraph";
    if (
      tag === "p" ||
      tag === "figcaption" ||
      tag === "time" ||
      (tag === "small" &&
        (inlineSemanticTextLinkFragments(el) || isDirectTextChildOfNamedSectionFooter(el))) ||
      isRichProductCardOfferBanner(el) ||
      isStructuredListBodyText(el) ||
      isInteractiveListBodyText(el) ||
      priceDisclosureFragments(el) ||
      inlinePhrasingBoundaryFragments(el)
    ) {
      return "paragraph";
    }
    if (joinedPriceDisclosureText(el)) return "text";
    if (groupedMetricCardText(el)) return "text";
    if (isCustomHeadedTextCardBody(el)) return "text";
    if (footerInlineBoundaryTextFragments(el)) return tag === "p" ? "paragraph" : "text";
    if (expandedRegionInlineLinkFragments(el)) return "paragraph";
    if (inlineTextLinkFragments(el)) return "paragraph";
    if (
      ["section", "div"].includes(tag) &&
      (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
    ) {
      return tag === "section" ? "region" : "group";
    }
    if (compactInputActionGroupLabel(el)) return "group";
    if (isButtonShellClusterGroup(el)) return "group";
    if (isButtonShellGroup(el)) return "group";
    if (tag === "div" && isDecorativeGenericGroupBeforeNativeLinks(el, "group")) return "group";
    if (
      isCustomElement(el) &&
      ((el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) ||
        hasShadowRootContent(el)) &&
      hasVisibleInteractiveDescendant(el)
    ) {
      return "group";
    }
    if (["span", "div"].includes(tag) &&
      directOwnText(el) &&
      !el.querySelector(interactiveSelector) &&
      !el.closest(interactiveSelector) &&
      (isSplitTextListItemBlock(el) ||
        isExpandedRegionBodyText(el) ||
        isCardDetailTextLeaf(el) ||
        isRichProductCardTextFragment(el) ||
        hasImageLinkWithCaptionListItemContent(el.closest("li,[role='listitem']")) ||
        !el.closest("p, li, h1, h2, h3, h4, h5, h6"))
    ) {
      return "text";
    }
    return "";
  }

  function hasSectioningHeaderFooterAncestor(el: any): boolean {
    return Boolean(
      el.closest(
        [
          "main",
          "article",
          "aside",
          "nav",
          "section",
          "[role='main']",
          "[role='article']",
          "[role='complementary']",
          "[role='navigation']",
          "[role='region']",
        ].join(","),
      ),
    );
  }

  function imageMapNameFromUseMap(el: any): string | undefined {
    const raw = normalize(el?.getAttribute?.("usemap"));
    if (!raw?.startsWith("#")) return undefined;
    return normalize(raw.slice(1));
  }

  function mapElementByName(name?: string): any | null {
    if (!name) return null;
    return document.querySelector(`map[name='${cssEscape(name)}']`);
  }

  function adjacentImageMapForImage(el: any): any | null {
    const next = el?.nextElementSibling;
    return next?.tagName?.toLowerCase?.() === "map" ? next : null;
  }

  function imageForMap(el: any): any | null {
    const name = normalize(el?.getAttribute?.("name"));
    if (!name) return null;
    return (
      document.querySelector(`img[usemap='#${cssEscape(name)}']`) ||
      (el.previousElementSibling?.tagName?.toLowerCase?.() === "img"
        ? el.previousElementSibling
        : null)
    );
  }

  function isImageMapImage(el: any): boolean {
    const map = mapElementByName(imageMapNameFromUseMap(el)) || adjacentImageMapForImage(el);
    return Boolean(map && map.querySelector("area[href]"));
  }

  function imageMapGroupName(el: any): string | undefined {
    if (el?.tagName?.toLowerCase?.() !== "map") return undefined;
    const image = imageForMap(el);
    return image && !isHidden(image) ? normalize(image.getAttribute("alt")) : undefined;
  }

  function nativeRangeValueText(el: any, role: string): string | undefined {
    const tag = el?.tagName?.toLowerCase?.();
    if (role !== "progressbar" && role !== "meter") return undefined;
    if (tag === "progress" && !el.hasAttribute("value")) return "indeterminate";

    const rawValue = Number.parseFloat(el.getAttribute("value") || "");
    if (!Number.isFinite(rawValue)) return undefined;

    const rawMin = tag === "meter" ? Number.parseFloat(el.getAttribute("min") || "0") : 0;
    const min = Number.isFinite(rawMin) ? rawMin : 0;
    if (!el.hasAttribute("max") && rawValue > 1) {
      return `${Math.round(Math.max(0, Math.min(100, rawValue)))}%`;
    }

    const rawMax = Number.parseFloat(el.getAttribute("max") || "1");
    const max = Number.isFinite(rawMax) && rawMax > min ? rawMax : 1;
    const percent = Math.max(0, Math.min(100, ((rawValue - min) / (max - min)) * 100));
    return `${Math.round(percent)}%`;
  }

  function nativeDatalistElement(el: any): any | null {
    if (el?.tagName?.toLowerCase?.() !== "input") return null;
    const listId = normalize(el.getAttribute("list"));
    if (!listId) return null;
    const list = document.getElementById(listId);
    return list?.tagName?.toLowerCase?.() === "datalist" ? list : null;
  }

  function urlBasename(value?: string): string | undefined {
    const normalized = normalize(value);
    if (!normalized) return undefined;
    const withoutQuery = normalized.split(/[?#]/u)[0];
    const basename = withoutQuery.split("/").filter(Boolean).pop();
    return normalize(basename);
  }

  function documentUrlBasename(): string | undefined {
    return urlBasename(document.location?.pathname || document.location?.href);
  }

  function areaHrefFallbackName(el: any): string | undefined {
    if (el?.tagName?.toLowerCase?.() !== "area") return undefined;
    if (normalize(el.getAttribute("alt"))) return undefined;
    const href = normalize(el.getAttribute("href"));
    if (!href) return undefined;
    if (href.startsWith("#")) return documentUrlBasename();
    return urlBasename(href);
  }

  function isListItem(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || "";
    return role === "listitem" || (tag === "li" && (!role || role === "listitem"));
  }

  function isSeparatorListItem(el: any): boolean {
    if (!isListItem(el)) return false;
    const text = normalize(textWithoutInteractive(el) || readableText(el));
    return Boolean(text && /^[|/\\•·]+$/.test(text));
  }

  function isHiddenConsentOnlyListItem(el: any): boolean {
    if (!isListItem(el)) return false;

    const visibleChildren = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (visibleChildren.length) return false;

    const hiddenConsentNodes = Array.from(
      el.querySelectorAll("[data-sr-voiceover-hidden-consent='true']"),
    ).filter(
      (node: any) =>
        node.closest("li,[role='listitem']") === el &&
        isHidden(node),
    );
    if (!hiddenConsentNodes.length) return false;

    const visibleText = normalize(textWithoutInteractive(el) || readableText(el));
    return !visibleText;
  }

  function slottedCarouselSlidesForList(list: any): any[] {
    const slot = walkChildren(list).find(
      (child: any) => child.tagName?.toLowerCase() === "slot",
    );
    if (!slot) return [];

    const assigned = assignedSlotChildren(slot).filter((child: any) => !isHidden(child));
    if (assigned.length) return assigned;

    const host = shadowContentHostByNode.get(slot) || shadowContentHostByNode.get(list);
    return Array.from(host?.children || []).filter((child: any) => {
      if (child.tagName?.toLowerCase() === "template" && child.getAttribute("shadowrootmode")) {
        return false;
      }
      return !isHidden(child) && !(child.getAttribute("slot") || "");
    });
  }

  function isFlattenedSlottedCarouselList(list: any): boolean {
    if (!list || list.nodeType !== Node.ELEMENT_NODE || isHidden(list)) return false;
    const tag = list.tagName.toLowerCase();
    if (tag !== "ul" && tag !== "ol") return false;
    if (!/\bcarousel\b/i.test(list.getAttribute("class") || "")) return false;

    const assignedSlides = slottedCarouselSlidesForList(list).filter(
      (child: any) => !isHidden(child) && isCustomElement(child),
    );
    if (assignedSlides.length < 2) return false;

    return assignedSlides.some((slide: any) =>
      Boolean(slide.getAttribute("class")?.match(/\bcarousel__panel\b|\bcarousel-panel\b/i)),
    );
  }

  function flattenedSlottedCarouselLists(root: any = document.body): any[] {
    if (root === document.body && flattenedSlottedCarouselListCache) {
      return flattenedSlottedCarouselListCache;
    }
    const lists: any[] = [];
    const visit = (node: any) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (isFlattenedSlottedCarouselList(node)) {
        lists.push(node);
        return;
      }
      for (const child of walkChildren(node)) visit(child);
    };
    visit(root);
    if (root === document.body) {
      flattenedSlottedCarouselListCache = lists;
    }
    return lists;
  }

  function flattenedSlottedCarouselAssignedSlides(list: any): any[] {
    if (!isFlattenedSlottedCarouselList(list)) return [];
    return slottedCarouselSlidesForList(list);
  }

  function flattenedSlottedCarouselStops(list: any): Array<{ el: any; counted: boolean }> {
    if (!isFlattenedSlottedCarouselList(list)) return [];
    const cached = flattenedSlottedCarouselStopCache.get(list);
    if (cached) return cached;

    const stops: Array<{ el: any; counted: boolean }> = [];

    for (const slide of flattenedSlottedCarouselAssignedSlides(list)) {
      let countedPrimaryLink = false;
      const visit = (node: any) => {
        if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
        const role = implicitRole(node);
        if (role === "heading" && readableText(node)) {
          stops.push({ el: node, counted: true });
          return;
        }
        if (role === "paragraph" && readableText(node) && !hasOnlyLinkContent(node)) {
          stops.push({ el: node, counted: true });
          return;
        }
        if (role === "text" && readableText(node)) {
          stops.push({ el: node, counted: true });
          return;
        }
        if (role === "link") {
          stops.push({ el: node, counted: !countedPrimaryLink });
          countedPrimaryLink = true;
          return;
        }
        if (role === "image" && accessibleName(node, role)) {
          stops.push({ el: node, counted: true });
          return;
        }

        for (const child of walkChildren(node)) visit(child);
      };

      for (const child of walkChildren(slide)) visit(child);
    }

    flattenedSlottedCarouselStopCache.set(list, stops);
    return stops;
  }

  function flattenedSlottedCarouselPosition(el: any) {
    for (const list of flattenedSlottedCarouselLists()) {
      let position = 0;
      const stops = flattenedSlottedCarouselStops(list);
      const setSize = stops.filter((item) => item.counted).length;
      for (const stop of stops) {
        if (stop.counted) position += 1;
        if (stop.el === el) {
          if (!stop.counted) return {};
          return {
            positionInSet: position,
            setSize,
          };
        }
      }
    }
    return {};
  }

  function flattenedSlottedCarouselImageInfo(el: any) {
    if (implicitRole(el) !== "image") return {};
    const imageName = normalize(accessibleName(el, "image"));
    if (imageName?.toLowerCase() !== "image") return {};
    const imagePosition = flattenedSlottedCarouselPosition(el).positionInSet;
    if (!imagePosition) return {};

    let firstImagePosition: number | undefined;
    for (const list of flattenedSlottedCarouselLists()) {
      let position = 0;
      for (const stop of flattenedSlottedCarouselStops(list)) {
        if (stop.counted) position += 1;
        if (implicitRole(stop.el) !== "image") continue;
        const stopName = normalize(accessibleName(stop.el, "image"));
        if (stopName?.toLowerCase() !== "image") continue;
        if (firstImagePosition === undefined || position < firstImagePosition) {
          firstImagePosition = position;
        }
      }
    }

    return {
      unlabeledImage: true,
      imageMissingDescriptionHint: imagePosition === firstImagePosition,
    };
  }

  function cmsMediaPathLabel(el: any): string | undefined {
    const src = normalize(el?.getAttribute?.("src"));
    if (!src) return undefined;
    const match = src.match(/\/cms\/delivery\/media\/([^?#/]+)/i);
    return match ? `/${match[1]}` : undefined;
  }

  function isInformativeUnlabeledCmsImage(el: any): boolean {
    if (el?.tagName?.toLowerCase() !== "img") return false;
    if (el.hasAttribute("alt") && !normalize(el.getAttribute("alt"))) return false;
    if (accessibleName(el, "image")) return false;
    if (!cmsMediaPathLabel(el)) return false;

    const host = closestCustomElement(el);
    if (!host) return false;
    const hostName = host.tagName.toLowerCase();
    if (!/(side-by-side|hero|banner|tile|card)/i.test(hostName)) return false;

    return Boolean(readableText(host));
  }

  function isAxConfirmedRegionIntroImage(el: any): boolean {
    if (el?.tagName?.toLowerCase() !== "svg") return false;
    if (accessibleName(el, "image")) return false;
    if (!hasAxRole(el, "image")) return false;

    const labelledRegion = el.closest("[aria-labelledby]");
    if (!labelledRegion) return false;

    for (
      let wrapper = el.parentElement;
      wrapper && wrapper !== labelledRegion;
      wrapper = wrapper.parentElement
    ) {
      if (readableText(wrapper)) continue;
      const next = Array.from(wrapper.parentElement?.children || [])
        .slice(Array.from(wrapper.parentElement?.children || []).indexOf(wrapper) + 1)
        .find((sibling: any) => !isHidden(sibling));
      if (next && implicitRole(next) === "heading") {
        return idRefsContain(labelledRegion.getAttribute("aria-labelledby"), next.id);
      }
    }

    return false;
  }

  function flattenedSlottedCarouselSetSize(list: any): number | undefined {
    if (!isFlattenedSlottedCarouselList(list)) return undefined;
    return flattenedSlottedCarouselStops(list).filter((stop) => stop.counted).length || undefined;
  }

  function isFlattenedSlottedCarouselGroupWrapper(el: any): boolean {
    if (!isCustomElement(el)) return false;
    if (accessibleName(el, "group")) return false;

    if (
      flattenedSlottedCarouselLists().some((list) =>
        flattenedSlottedCarouselAssignedSlides(list).includes(el),
      )
    ) {
      return true;
    }

    return flattenedSlottedCarouselLists(el).length > 0;
  }

  function listChildren(list: any): any[] {
    if (!list) return [];
    const tag = list.tagName.toLowerCase();
    if (tag === "dl") {
      return Array.from(list.children).flatMap((child: any) => {
        if (isHidden(child)) return [];
        const childTag = child.tagName.toLowerCase();
        if (childTag === "dt" || childTag === "dd") return [child];
        return definitionListWrapperItems(list, child);
      });
    }

    const children = walkChildren(list).flatMap((child: any) => {
      const wrapperItems = listWrapperItems(list, child);
      return wrapperItems.length ? wrapperItems : [child];
    });
    const hasNativeItems = children.some((child: any) => isListItem(child));
    return children.filter(
      (child: any) =>
        isListItem(child) ||
        (hasNativeItems &&
          child.parentElement === list &&
          isDirectInvalidListContentItem(list, child)),
    );
  }

  function announcedListChildren(list: any): any[] {
    return listChildren(list).filter((child: any) => !isSeparatorListItem(child));
  }

  function listSummaryChildren(list: any): any[] {
    const children = announcedListChildren(list);
    let end = children.length;
    while (end > 0 && isHiddenConsentOnlyListItem(children[end - 1])) {
      end -= 1;
    }
    return children.slice(0, end);
  }

  function isListContainer(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    const tag = el.tagName?.toLowerCase();
    if (tag === "dl") return false;
    return tag === "ul" || tag === "ol" || el.getAttribute?.("role") === "list";
  }

  function listWrapperItems(list: any, wrapper: any): any[] {
    if (!isListContainer(list)) return [];
    if (!wrapper || wrapper.parentElement !== list || isHidden(wrapper)) return [];
    const wrapperTag = wrapper.tagName?.toLowerCase();
    if (wrapperTag !== "div" && wrapperTag !== "span") return [];
    const wrapperRole = wrapper.getAttribute?.("role") || "";
    if (wrapperRole && wrapperRole !== "none" && wrapperRole !== "presentation") return [];
    if (directOwnText(wrapper)) return [];

    const children = walkChildren(wrapper).filter(
      (child: any) => !isHidden(child) && !child.matches?.("script, style, template"),
    );
    if (!children.length) return [];
    return children.every((child: any) => isListItem(child)) ? children : [];
  }

  function isNeutralListItemWrapper(el: any): boolean {
    return Boolean(el?.parentElement && listWrapperItems(el.parentElement, el).length);
  }

  function definitionListWrapperItems(list: any, wrapper: any): any[] {
    if (!list || list.tagName?.toLowerCase() !== "dl") return [];
    if (!wrapper || wrapper.parentElement !== list || isHidden(wrapper)) return [];
    const wrapperTag = wrapper.tagName?.toLowerCase();
    if (wrapperTag !== "div" && wrapperTag !== "span") return [];
    const wrapperRole = wrapper.getAttribute?.("role") || "";
    if (wrapperRole && wrapperRole !== "none" && wrapperRole !== "presentation") return [];
    if (directOwnText(wrapper)) return [];

    const children = walkChildren(wrapper).filter(
      (child: any) => !isHidden(child) && !child.matches?.("script, style, template"),
    );
    if (!children.length) return [];
    return children.every((child: any) => {
      const tag = child.tagName?.toLowerCase();
      return tag === "dt" || tag === "dd";
    })
      ? children
      : [];
  }

  function isDefinitionListItem(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    const tag = el.tagName?.toLowerCase();
    if (tag !== "dt" && tag !== "dd") return false;
    return Boolean(definitionListForItem(el));
  }

  function definitionListForItem(el: any): any | null {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;
    const parent = el.parentElement;
    if (!parent) return null;
    if (parent.tagName?.toLowerCase() === "dl") return parent;
    const grandparent = parent.parentElement;
    if (grandparent?.tagName?.toLowerCase() !== "dl") return null;
    return definitionListWrapperItems(grandparent, parent).includes(el) ? grandparent : null;
  }

  function listForItem(el: any): any | null {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || !isListItem(el)) return null;
    const parent = el.parentElement;
    if (!parent) return null;
    if (isListContainer(parent)) return parent;
    const grandparent = parent.parentElement;
    if (!isListContainer(grandparent)) return null;
    return listWrapperItems(grandparent, parent).includes(el) ? grandparent : null;
  }

  function isWrappedDefinitionListItem(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = el.tagName?.toLowerCase();
    if (tag !== "dt" && tag !== "dd") return false;
    const parent = el.parentElement;
    if (!parent || parent.tagName?.toLowerCase() === "dl") return false;
    const grandparent = parent.parentElement;
    if (grandparent?.tagName?.toLowerCase() !== "dl") return false;
    return definitionListWrapperItems(grandparent, parent).includes(el);
  }

  function isDirectListBackedDefinitionItem(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    const tag = el.tagName?.toLowerCase();
    if (tag !== "dt" && tag !== "dd") return false;
    const list = el.parentElement;
    if (list?.tagName?.toLowerCase() !== "dl") return false;

    const children = Array.from(list.children || []).filter((child: any) => !isHidden(child));
    if (children.length !== 2 || children[0] !== list.querySelector(":scope > dt")) {
      return false;
    }
    const [term, definition] = children as any[];
    if (term.tagName?.toLowerCase() !== "dt" || definition.tagName?.toLowerCase() !== "dd") {
      return false;
    }
    if (directOwnText(definition)) return false;

    const definitionChildren = walkChildren(definition).filter(
      (child: any) => !isHidden(child) && !child.matches?.("script, style, template"),
    );
    return (
      definitionChildren.length === 1 &&
      ["ul", "ol"].includes(definitionChildren[0].tagName?.toLowerCase())
    );
  }

  function definitionListDisclosureButton(el: any): any | undefined {
    if (!isDefinitionListItem(el) || el.tagName?.toLowerCase() !== "dt") {
      return undefined;
    }

    const directChildren = walkChildren(el).filter(
      (child: any) => !isHidden(child) && !child.matches?.("script, style, template"),
    );
    if (directChildren.length !== 1) return undefined;

    const button = directChildren[0] as any;
    if (implicitRole(button) !== "button" || !button.hasAttribute("aria-expanded")) {
      return undefined;
    }
    const buttonName = normalize(accessibleName(button, "button") || readableText(button));
    const termName = normalize(accessibleName(el, "term") || readableText(el));
    if (!buttonName || buttonName !== termName) return undefined;

    return button;
  }

  function previousDefinitionListItem(el: any): any | undefined {
    const list = definitionListForItem(el);
    if (!list) return undefined;
    const siblings = listChildren(list);
    const index = siblings.indexOf(el);
    return index > 0 ? siblings[index - 1] : undefined;
  }

  function isDisclosureDefinitionItem(el: any): boolean {
    if (!isDefinitionListItem(el) || el.tagName?.toLowerCase() !== "dd") {
      return false;
    }
    return Boolean(definitionListDisclosureButton(previousDefinitionListItem(el)));
  }

  function isFirstDisclosureDefinitionParagraph(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName?.toLowerCase() !== "p") return false;
    const definition = el.parentElement;
    if (!isDisclosureDefinitionItem(definition)) return false;
    const visibleChildren = walkChildren(definition).filter(
      (child: any) => !isHidden(child) && !child.matches?.("script, style, template"),
    );
    return visibleChildren[0] === el;
  }

  function isDisclosureDefinitionLink(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (implicitRole(el) !== "link") return false;
    const definition = el.closest?.("dd");
    return Boolean(definition && isDisclosureDefinitionItem(definition));
  }

  function wrappedDefinitionListTermChildAnnouncements(el: any): string[] | undefined {
    if (!isDefinitionListItem(el) || el.tagName?.toLowerCase() !== "dt") {
      return undefined;
    }

    const termName = normalize(accessibleName(el, "term") || readableText(el));
    if (!termName) return undefined;

    const disclosureButton = definitionListDisclosureButton(el);
    if (disclosureButton) {
      const buttonName = normalize(
        accessibleName(disclosureButton, "button") || readableText(disclosureButton),
      );
      return [
        generateAnnouncement({
          role: "button",
          name: buttonName,
          text: buttonName,
          expanded: parseBooleanAttribute(disclosureButton, "aria-expanded"),
          groupContext: true,
        }),
      ];
    }

    if (!isWrappedDefinitionListItem(el)) return undefined;

    const directChildren = walkChildren(el).filter(
      (child: any) => !isHidden(child) && !child.matches?.("script, style, template"),
    );
    if (!directChildren.length) return undefined;

    const announcements = directChildren.flatMap((child: any) => {
      const text = normalize(readableText(child));
      if (text && text === termName) return [text];

      const tag = child.tagName?.toLowerCase();
      const title = normalize(child.getAttribute?.("title"));
      if (tag === "abbr" && title && !text) return [`${title}, empty group`];

      return [];
    });

    return announcements.length ? announcements : undefined;
  }

  function selectedListboxOptions(el: any): any[] {
    if (implicitRole(el) !== "listbox") return [];
    return Array.from(el.querySelectorAll("[role='option']")).filter(
      (option: any) =>
        !isHidden(option) &&
        (option.getAttribute("aria-selected") === "true" ||
          option.getAttribute("aria-checked") === "true"),
    );
  }

  function singleSelectedListboxOption(el: any): any | undefined {
    if (el.getAttribute("aria-multiselectable") === "true") return undefined;
    const selected = selectedListboxOptions(el);
    return selected.length === 1 ? selected[0] : undefined;
  }

  function radioGroupOptions(el: any): any[] {
    if (implicitRole(el) !== "radio") return [];
    const tag = el.tagName?.toLowerCase();
    const name = normalize(el.getAttribute("name"));
    if (tag === "input" && name) {
      for (let current = el.parentElement; current; current = current.parentElement) {
        const localRadios = Array.from(
          current.querySelectorAll(`input[type='radio'][name='${cssEscape(name)}']`),
        ).filter((radio: any) => !isHidden(radio));
        if (localRadios.length > 1) return localRadios;
      }
      const root = el.closest("form") || document;
      return Array.from(
        root.querySelectorAll(`input[type='radio'][name='${cssEscape(name)}']`),
      ).filter((radio: any) => !isHidden(radio));
    }
    const container = el.closest("[role='radiogroup']");
    if (!container) return [];
    return Array.from(container.querySelectorAll("[role='radio']")).filter(
      (radio: any) => !isHidden(radio),
    );
  }

  function semanticListContext(el: any) {
    let listItem = el;
    while (listItem && !isListItem(listItem) && !isDefinitionListItem(listItem)) {
      listItem = listItem.parentElement;
    }

    const list = definitionListForItem(listItem) || listForItem(listItem) || listItem?.parentElement || null;
    const siblings = list ? listChildren(list) : [];
    return { listItem, list, siblings };
  }

  function generatedPseudoCollectionSide(el: any, side: "before" | "after"): boolean {
    const attr =
      el?.getAttribute?.(`data-sr-pseudo-${side}-layout-item`) ??
      el?.getAttribute?.(`data-sr-pseudo-${side}`);
    if (attr === "collection-item") return true;
    if (attr === "true") return true;
    if (attr === "none") return false;
    if (attr === "false") return false;

    if (typeof getComputedStyle !== "function") return false;
    if (/\bjsdom\b/i.test(el?.ownerDocument?.defaultView?.navigator?.userAgent || "")) {
      return false;
    }
    try {
      const pseudo = safeComputedStyle(el, `::${side}`);
      const content = normalize(pseudo?.content);
      if (!content || content === "none" || content === "normal") return false;
      if (
        pseudo.display === "none" ||
        pseudo.display === "contents" ||
        pseudo.visibility === "hidden" ||
        pseudo.position === "absolute" ||
        pseudo.position === "fixed"
      ) {
        return false;
      }

      const display = normalize(safeComputedStyle(el)?.display) || "";
      if (!/^(inline-)?(grid|flex)$/.test(display)) return false;

      return true;
    } catch {
      return false;
    }
  }

  function generatedPseudoText(el: any, side: "before" | "after"): string | undefined {
    const attr = el?.getAttribute?.(`data-sr-pseudo-${side}`);
    if (attr && !["true", "false", "none", "normal", "collection-item"].includes(attr)) {
      return normalize(attr.replace(/^['"]|['"]$/g, ""));
    }

    if (typeof getComputedStyle !== "function") return undefined;
    const view = el?.ownerDocument?.defaultView;
    if (!view || /jsdom/i.test(view.navigator?.userAgent || "")) {
      return undefined;
    }

    try {
      const pseudo = safeComputedStyle(el, `::${side}`);
      const content = normalize(pseudo?.content?.replace(/^['"]|['"]$/g, ""));
      if (!content || content === "none" || content === "normal") return undefined;
      if (
        pseudo.display === "none" ||
        pseudo.display === "contents" ||
        pseudo.visibility === "hidden" ||
        pseudo.position === "absolute" ||
        pseudo.position === "fixed"
      ) {
        return undefined;
      }
      return content;
    } catch {
      return undefined;
    }
  }

  function generatedPseudoName(el: any): string | undefined {
    const before = generatedPseudoText(el, "before");
    const own = embeddedControlContentName(el);
    const after = generatedPseudoText(el, "after");
    return normalize([before, own, after].filter(Boolean).join(" "));
  }

  function generatedPseudoCollectionPadding(list: any) {
    if (
      !list ||
      (!["ul", "ol"].includes(list.tagName?.toLowerCase()) &&
        !["list", "grid"].includes(implicitRole(list) || ""))
    ) {
      return { before: 0, after: 0 };
    }
    return {
      before: generatedPseudoCollectionSide(list, "before") ? 1 : 0,
      after: generatedPseudoCollectionSide(list, "after") ? 1 : 0,
    };
  }

  function shouldApplyGeneratedPseudoCollectionPadding(el: any, role: string): boolean {
    return role === "group" && isFocusableStructuredListItemGroup(el);
  }

  function adjustedListPosition(index: number, list: any, el: any, role: string): number {
    const padding = shouldApplyGeneratedPseudoCollectionPadding(el, role)
      ? generatedPseudoCollectionPadding(list)
      : { before: 0 };
    return index + 1 + padding.before;
  }

  function adjustedListSetSize(
    siblings: any[],
    list: any,
    el: any,
    role: string,
  ): number | undefined {
    if (!shouldApplyGeneratedPseudoCollectionPadding(el, role)) {
      return siblings.length || undefined;
    }
    const padding = generatedPseudoCollectionPadding(list);
    return siblings.length + padding.before + padding.after || undefined;
  }

  function listLevel(el: any): number | undefined {
    if (groupedListItemCardContainerFor(el)) return undefined;
    let depth = 1;
    for (let current = el.parentElement; current; current = current.parentElement) {
      if (implicitRole(current) === "list") depth += 1;
    }
    return depth > 1 ? depth : undefined;
  }

  function parentListPosition(el: any) {
    if (implicitRole(el) !== "list") {
      return {};
    }
    if (groupedListItemCardContainerFor(el)) {
      return {};
    }

    const definitionItem = el.parentElement;
    if (isDirectListBackedDefinitionItem(definitionItem)) {
      const list = definitionListForItem(definitionItem);
      const siblings = list ? listChildren(list) : [];
      const index = siblings.indexOf(definitionItem);
      return index >= 0
        ? {
            parentPositionInSet: index + 1,
            parentSetSize: siblings.length || undefined,
          }
        : {};
    }

    const parentItem = el.parentElement?.closest("li,[role='listitem']");
    if (!parentItem) {
      return {};
    }

    if (isNestedNavigationList(el, parentItem)) {
      return {};
    }

    if (hasPrecedingSectionHeadingInListItem(el, parentItem)) {
      return {};
    }

    if (hasPrecedingReadableCardContentInListItem(el, parentItem)) {
      return {};
    }

    const parentList = parentItem.parentElement;
    const siblings = listChildren(parentList);
    const index = siblings.indexOf(parentItem);
    const earlierNestedListInSameItem = Array.from(
      parentItem.querySelectorAll("ul, ol, dl, [role='list']"),
    ).some(
      (list: any) =>
        list !== el &&
        Boolean(
          list.compareDocumentPosition(el) &
            list.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,
        ),
    );
    if (earlierNestedListInSameItem) {
      return {};
    }
    const earlierSiblingHasNestedList = siblings
      .slice(0, Math.max(0, index))
      .some((sibling: any) =>
        Boolean(sibling.querySelector("ul, ol, dl, [role='list']")),
      );
    if (earlierSiblingHasNestedList) {
      return {};
    }
    return index >= 0
      ? {
          parentPositionInSet: index + 1,
          parentSetSize: siblings.length || undefined,
        }
        : {};
  }

  function isNestedNavigationList(list: any, parentItem: any): boolean {
    if (!list || !parentItem || !parentItem.contains(list)) {
      return false;
    }

    const navigation = parentItem.closest?.("nav,[role='navigation']");
    if (!navigation || !navigation.contains(list)) {
      return false;
    }

    if (list.closest?.("details")) {
      return false;
    }

    if (!hasDirectPrecedingNavigationListItemLabel(parentItem, list)) {
      return false;
    }

    const parentList = listForItem(parentItem);
    return Boolean(parentList && parentList !== list && navigation.contains(parentList));
  }

  function hasDirectPrecedingNavigationListItemLabel(listItem: any, list: any): boolean {
    for (const child of Array.from(listItem?.childNodes || [])) {
      if (child === list || child.contains?.(list)) {
        return false;
      }
      if (child.nodeType === Node.TEXT_NODE) {
        if (normalize(child.textContent)) return true;
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) {
        continue;
      }
      if (readableText(child) || child.matches?.(interactiveSelector)) {
        return true;
      }
    }
    return false;
  }

  function hasPrecedingSectionHeadingInListItem(list: any, listItem: any): boolean {
    if (!list || !listItem || !listItem.contains(list)) {
      return false;
    }

    const headings = Array.from(
      listItem.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']"),
    ).filter((heading: any) => {
      if (isHidden(heading) || list.contains(heading)) return false;
      if (heading.closest("li,[role='listitem']") !== listItem) return false;
      return Boolean(
        heading.compareDocumentPosition(list) &
          heading.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });

    return headings.length > 0;
  }

  function hasPrecedingReadableCardContentInListItem(list: any, listItem: any): boolean {
    if (!list || !listItem || !listItem.contains(list)) {
      return false;
    }
    if (!hasStructuredNewsCardListItemContent(listItem)) {
      return false;
    }

    return Array.from(listItem.querySelectorAll("*")).some((child: any) => {
      if (child === list || isHidden(child) || list.contains(child) || child.contains(list)) {
        return false;
      }
      if (
        !(
          child.compareDocumentPosition(list) &
          child.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING
        )
      ) {
        return false;
      }
      return Boolean(readableText(child) || child.querySelector?.(interactiveSelector));
    });
  }

  function isSimpleLinkedCardHeadingListStop(el: any, role: string): boolean {
    if (!["heading", "link"].includes(role)) return false;

    const heading =
      role === "heading"
        ? el
        : el.closest("h1,h2,h3,h4,h5,h6,[role='heading']");
    if (!heading || isHidden(heading)) return false;

    const listItem = heading.closest("li,[role='listitem']");
    if (!listItem || heading.closest("li,[role='listitem']") !== listItem) return false;
    if (!structuredListItemHasPreHeadingImage(listItem)) return false;
    if (isDescendantOfDirectListArticleCard(el)) return false;

    const headingLink = firstVisibleDescendant(heading, "a[href], [role='link']");
    if (!headingLink || !readableText(headingLink)) return false;
    if (role === "link" && el !== headingLink) return false;

    const interactiveChildren = Array.from(
      listItem.querySelectorAll(interactiveSelector),
    ).filter((candidate: any) => !isHidden(candidate));
    if (interactiveChildren.length !== 1 || interactiveChildren[0] !== headingLink) {
      return false;
    }

    return Array.from(listItem.children || []).some(
      (child: any) =>
        child !== heading &&
        !isHidden(child) &&
        child.tagName?.toLowerCase() === "p" &&
        Boolean(readableText(child)),
    );
  }

  function positionInSet(el: any, role: string): number | undefined {
    const explicit = Number.parseInt(el.getAttribute("aria-posinset") || "", 10);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;

    const flattenedCarouselPosition = flattenedSlottedCarouselPosition(el).positionInSet;
    if (flattenedCarouselPosition) return flattenedCarouselPosition;

    if (role === "option") {
      const options = Array.from(
        el.parentElement?.querySelectorAll("[role='option']") || [],
      ).filter((option: any) => !isHidden(option));
      const index = options.indexOf(el);
      return index >= 0 ? index + 1 : undefined;
    }

    if (role === "tab") {
      const tabs = Array.from(
        el.closest("[role='tablist']")?.querySelectorAll("[role='tab']") || [],
      ).filter((tab: any) => !isHidden(tab));
      const index = tabs.indexOf(el);
      return index >= 0 ? index + 1 : undefined;
    }

    if (role === "radio") {
      const radios = radioGroupOptions(el);
      const index = radios.indexOf(el);
      return index >= 0 ? index + 1 : undefined;
    }

    if (role === "image" && hasStructuredListItemContent(el.closest("li,[role='listitem']"))) {
      if (!shouldPositionStructuredListImage(el)) return undefined;
      const listItem = el.closest("li,[role='listitem']");
      const { siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? index + 1 : undefined;
    }

    if (
      role === "text" &&
      isFirstSplitTextListItemBlock(el) &&
      !el.closest("li,[role='listitem']")?.querySelector("img, [role='img'], svg[aria-label]")
    ) {
      const { listItem, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? index + 1 : undefined;
    }

    if (
      role === "text" &&
      isFirstRichProductCardTextFragment(el) &&
      !suppressGroupedListItemCardDescendantPosition(el, role)
    ) {
      const { listItem, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? index + 1 : undefined;
    }

    if (role === "link" && isPrimaryStructuredNewsCardLink(el)) {
      const { listItem, list, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? adjustedListPosition(index, list, el, role) : undefined;
    }

    if (isSimpleLinkedCardHeadingListStop(el, role)) {
      const { listItem, list, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? adjustedListPosition(index, list, el, role) : undefined;
    }

    if (
      ["heading", "link"].includes(role) &&
      structuredListItemHasPreHeadingImage(el.closest("li,[role='listitem']")) &&
      !(role === "link" && isOnlyInteractiveListItemChild(el))
    ) {
      return undefined;
    }

    if (
      role === "link" &&
      Array.from(el.closest("li,[role='listitem']")?.querySelectorAll("div") || []).some(
        (candidate: any) => isInteractiveListBodyText(candidate),
      )
    ) {
      return undefined;
    }

    if (role === "link" && isGenericDealCtaLink(el)) {
      return undefined;
    }

    if (role === "link" && isAxMarkerOnlyListItemChildContent(el, role)) {
      return undefined;
    }

    if (role === "link" && isAxMarkerPrefixedTextListItemChildContent(el, role)) {
      return undefined;
    }

    if (role === "link" && isAxStrongWrappedMarkerListItemChildContent(el, role)) {
      return undefined;
    }

    if (
      ["heading", "link"].includes(role) &&
      isDescendantOfDirectListArticleCard(el)
    ) {
      return undefined;
    }

    if (role === "button" && directNativeDetailsForSummary(el)) {
      const { listItem, list, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? adjustedListPosition(index, list, el, role) : undefined;
    }

    const buttonListItem = semanticListContext(el).listItem;
    if (
      role === "button" &&
      isAriaLabelOnlyDecorativeIconButton(el) &&
      !normalizedPopup(el) &&
      !el.hasAttribute("aria-expanded") &&
      buttonListItem &&
      !hasOnlyInteractiveListItemContent(buttonListItem) &&
      hasStructuredListItemContent(buttonListItem)
    ) {
      return undefined;
    }

    if (
      role === "button" &&
      hasRichProductCardListItemContent(el.closest("li,[role='listitem']"))
    ) {
      return undefined;
    }

    if (
      role === "paragraph" &&
      isFirstInteractiveListBodyText(el) &&
      !suppressGroupedListItemCardDescendantPosition(el, role)
    ) {
      const { listItem, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? index + 1 : undefined;
    }

    if (role === "paragraph" && isFirstTextBlockListItemParagraph(el)) {
      const { listItem, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? index + 1 : undefined;
    }

    if (
      role === "paragraph" &&
      isFirstRichProductCardParagraph(el) &&
      !suppressGroupedListItemCardDescendantPosition(el, role)
    ) {
      const { listItem, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? index + 1 : undefined;
    }

    if (
      role === "paragraph" &&
      isRichProductCardOfferBanner(el) &&
      !suppressGroupedListItemCardDescendantPosition(el, role)
    ) {
      const { listItem, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? index + 1 : undefined;
    }

    if (
      (role === "term" || role === "paragraph") &&
      isWrappedDefinitionListItem(el)
    ) {
      const { listItem, list, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? adjustedListPosition(index, list, el, role) : undefined;
    }

    if (
      (role === "term" && Boolean(definitionListDisclosureButton(el))) ||
      (role === "paragraph" && isFirstDisclosureDefinitionParagraph(el))
    ) {
      const { listItem, list, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? adjustedListPosition(index, list, el, role) : undefined;
    }

    if (role === "term" && isDirectListBackedDefinitionItem(el)) {
      const { listItem, list, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? adjustedListPosition(index, list, el, role) : undefined;
    }

    if (role === "link" && isDisclosureDefinitionLink(el)) {
      return undefined;
    }

    if (listPositionedRoles.has(role)) {
      const { listItem, list, siblings } = semanticListContext(el);
      if (
        role === "button" &&
        listItem &&
        Array.from(listItem.querySelectorAll("a[href], [role='link']")).some(
          (link: any) => !isHidden(link) && !link.contains(el) && !el.contains(link),
        )
      ) {
        return undefined;
      }
      const index = siblings.indexOf(listItem);
      return index >= 0 ? adjustedListPosition(index, list, el, role) : undefined;
    }

    return undefined;
  }

  function setSize(el: any, role: string): number | undefined {
    const explicit = Number.parseInt(el.getAttribute("aria-setsize") || "", 10);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;

    if (role === "list") {
      const flattenedSize = flattenedSlottedCarouselSetSize(el);
      return flattenedSize ?? (listSummaryChildren(el).length || undefined);
    }
    const flattenedCarouselSize = flattenedSlottedCarouselPosition(el).setSize;
    if (flattenedCarouselSize) return flattenedCarouselSize;

    if (role === "option") {
      return (
        Array.from(el.parentElement?.querySelectorAll("[role='option']") || []).filter(
          (option: any) => !isHidden(option),
        ).length || undefined
      );
    }
    if (role === "tab") {
      return (
        Array.from(
          el.closest("[role='tablist']")?.querySelectorAll("[role='tab']") || [],
        ).filter((tab: any) => !isHidden(tab)).length || undefined
      );
    }
    if (role === "radio") return radioGroupOptions(el).length || undefined;
    if (role === "image" && hasStructuredListItemContent(el.closest("li,[role='listitem']"))) {
      if (!shouldPositionStructuredListImage(el)) return undefined;
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    if (isSimpleLinkedCardHeadingListStop(el, role)) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    if (role === "link" && isGenericDealCtaLink(el)) {
      return undefined;
    }
    if (role === "link" && isAxMarkerPrefixedTextListItemChildContent(el, role)) {
      return undefined;
    }
    if (role === "link" && isAxStrongWrappedMarkerListItemChildContent(el, role)) {
      return undefined;
    }
    if (
      ["heading", "link"].includes(role) &&
      isDescendantOfDirectListArticleCard(el)
    ) {
      return undefined;
    }
    const buttonListItem = semanticListContext(el).listItem;
    if (
      role === "button" &&
      isAriaLabelOnlyDecorativeIconButton(el) &&
      !normalizedPopup(el) &&
      !el.hasAttribute("aria-expanded") &&
      buttonListItem &&
      !hasOnlyInteractiveListItemContent(buttonListItem) &&
      hasStructuredListItemContent(buttonListItem)
    ) {
      return undefined;
    }
    if (listPositionedRoles.has(role)) {
      const { list, siblings } = semanticListContext(el);
      return adjustedListSetSize(siblings, list, el, role);
    }
    if (
      role === "paragraph" &&
      isFirstInteractiveListBodyText(el) &&
      !suppressGroupedListItemCardDescendantPosition(el, role)
    ) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    if (role === "paragraph" && isFirstTextBlockListItemParagraph(el)) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    if (
      role === "paragraph" &&
      isFirstRichProductCardParagraph(el) &&
      !suppressGroupedListItemCardDescendantPosition(el, role)
    ) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    if (
      role === "paragraph" &&
      isRichProductCardOfferBanner(el) &&
      !suppressGroupedListItemCardDescendantPosition(el, role)
    ) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    if (
      role === "text" &&
      isFirstRichProductCardTextFragment(el) &&
      !suppressGroupedListItemCardDescendantPosition(el, role)
    ) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    if (
      (role === "term" || role === "paragraph") &&
      isWrappedDefinitionListItem(el)
    ) {
      const { list, siblings } = semanticListContext(el);
      return adjustedListSetSize(siblings, list, el, role);
    }
    if (
      (role === "term" && Boolean(definitionListDisclosureButton(el))) ||
      (role === "paragraph" && isFirstDisclosureDefinitionParagraph(el))
    ) {
      const { list, siblings } = semanticListContext(el);
      return adjustedListSetSize(siblings, list, el, role);
    }
    if (role === "term" && isDirectListBackedDefinitionItem(el)) {
      const { list, siblings } = semanticListContext(el);
      return adjustedListSetSize(siblings, list, el, role);
    }
    if (role === "link" && isDisclosureDefinitionLink(el)) {
      return undefined;
    }
    if (
      role === "button" &&
      hasRichProductCardListItemContent(el.closest("li,[role='listitem']"))
    ) {
      return undefined;
    }
    if (role === "link" && isPrimaryStructuredNewsCardLink(el)) {
      const { list, siblings } = semanticListContext(el);
      return adjustedListSetSize(siblings, list, el, role);
    }
    if (
      role === "text" &&
      isFirstSplitTextListItemBlock(el) &&
      !el.closest("li,[role='listitem']")?.querySelector("img, [role='img'], svg[aria-label]")
    ) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    return undefined;
  }

  function isLargePlainList(el: any, role = implicitRole(el)): boolean {
    if (role !== "list") return false;
    const items = listSummaryChildren(el).filter(
      (item: any) => !isHidden(item) && implicitRole(item) === "listitem",
    );
    if (items.length <= 100) return false;
    return items.every((item: any) => {
      if (!readableText(item)) return false;
      if (hasVisibleInteractiveDescendant(item)) return false;
      return !Array.from(item.children || []).some((child: any) => {
        if (isHidden(child)) return false;
        const childRole = implicitRole(child);
        return childRole && childRole !== "text";
      });
    });
  }

  function isLargePlainListItem(el: any, role = implicitRole(el)): boolean {
    if (role !== "listitem") return false;
    const { list } = semanticListContext(el);
    return Boolean(list && isLargePlainList(list, "list"));
  }

  function shouldPositionStructuredListImage(el: any): boolean {
    const listItem = el.closest("li,[role='listitem']");
    if (!listItem || !hasStructuredListItemContent(listItem)) return false;

    const images = Array.from(listItem.querySelectorAll("*")).filter(
      (image: any) => !isHidden(image) && implicitRole(image) === "image",
    );
    if (images.indexOf(el) > 0) return false;

    return !accessibleName(el, "image") || !listItem.querySelector(interactiveSelector);
  }

  function directSemanticChildren(el: any): any[] {
    return walkChildren(el).filter((child: any) => {
      if (isHidden(child)) return false;
      const role = implicitRole(child);
      return Boolean(role && role !== "none" && role !== "presentation");
    });
  }

  function hasDirectNonSemanticTextChild(el: any): boolean {
    return walkChildren(el).some((child: any) => {
      if (isHidden(child)) return false;
      const role = implicitRole(child);
      return !role && Boolean(readableText(child));
    });
  }

  function hasOnlyInteractiveListItemContent(el: any): boolean {
    if (!isListItem(el)) return false;
    if (!el.querySelector(interactiveSelector)) return false;
    return !textWithoutInteractive(el);
  }

  function hasLabeledNativeSelectListItemContent(el: any): boolean {
    if (!isListItem(el)) return false;
    if (el.querySelector("ul, ol, dl, [role='list']")) return false;

    const selects = Array.from(el.querySelectorAll("select")).filter(
      (select: any) => !isHidden(select) && implicitRole(select) === "combobox",
    );
    if (selects.length !== 1) return false;

    const select = selects[0];
    const otherInteractive = Array.from(el.querySelectorAll(interactiveSelector)).filter(
      (candidate: any) => !isHidden(candidate) && candidate !== select,
    );
    if (otherInteractive.length) return false;

    const label = labelForControl(select) || accessibleName(select, "combobox");
    if (!label) return false;

    const text = textWithoutInteractive(el);
    return !text || text === label;
  }

  function isOnlyInteractiveListItemChild(el: any): boolean {
    const listItem = el?.closest?.("li,[role='listitem']");
    if (!isListItem(listItem) || !hasOnlyInteractiveListItemContent(listItem)) {
      return false;
    }
    const children = directSemanticChildren(listItem);
    return (
      children.length === 1 &&
      children[0] === el &&
      Boolean(el.matches?.(interactiveSelector))
    );
  }

  function namedNavigationListItemGroupedLinkAnnouncements(el: any): string[] | undefined {
    if (!isListItem(el) || !el.hasAttribute?.("aria-labelledby")) return undefined;
    if (!accessibilityNodes.length) return undefined;
    if (el.querySelector("ul, ol, dl, [role='list']")) return undefined;

    const list = listForItem(el);
    if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase())) return undefined;

    const navigation = list.closest?.("nav,[role='navigation']");
    if (!navigation || !navigation.contains(el)) return undefined;

    const visibleChildren = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (visibleChildren.length !== 1) return undefined;

    const link = visibleChildren[0];
    if (implicitRole(link) !== "link") return undefined;
    if (!link.matches?.("a[href], [role='link']")) return undefined;
    if (normalize(link.getAttribute("aria-expanded")) || normalizedPopup(link)) return undefined;
    if (link.getAttribute("aria-current") && link.getAttribute("aria-current") !== "false") {
      return undefined;
    }

    const itemName = accessibleName(el, "listitem");
    const linkName = accessibleName(link, "link");
    if (!itemName || !linkName || itemName !== linkName) return undefined;

    const position = positionInSet(el, "listitem");
    const size = setSize(el, "listitem");
    if (!position || !size) return undefined;

    const axListItem = axNodeForElementRole(el, "listitem");
    const axLink = axNodeForElementRole(link, "link");
    if (!axListItem || !axLink) return undefined;
    if (normalize(axListItem.name) !== itemName || normalize(axLink.name) !== linkName) {
      return undefined;
    }
    if (axLink.properties?.focusable !== true) return undefined;

    const axChildren = axChildNodes(axListItem);
    if (
      axChildren.length !== 1 ||
      normalize(axChildren[0].nodeId) !== normalize(axLink.nodeId)
    ) {
      return undefined;
    }

    const groupedPosition = `(${position} of ${size})`;
    return [
      `${itemName}, group, ${groupedPosition}, ${position} of ${size}`,
      `link, ${linkName}`,
      `end of, ${itemName}, group, ${groupedPosition}`,
    ];
  }

  function elementPrecedes(left: any, right: any): boolean {
    if (!left || !right || typeof left.compareDocumentPosition !== "function") return false;
    return Boolean(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  function visibleInteractiveDescendants(el: any): any[] {
    return Array.from(el?.querySelectorAll?.(interactiveSelector) || []).filter(
      (candidate: any) => !isHidden(candidate),
    );
  }

  function hasVisibleHeadingBefore(container: any, before: any): boolean {
    return Array.from(
      container?.querySelectorAll?.("h1, h2, h3, h4, h5, h6, [role='heading']") || [],
    ).some((heading: any) => {
      if (isHidden(heading) || !elementPrecedes(heading, before)) return false;
      const role = implicitRole(heading);
      return role === "heading" && Boolean(accessibleName(heading, role) || readableText(heading));
    });
  }

  function hasEnabledButtonAfter(container: any, after: any): boolean {
    return Array.from(
      container?.querySelectorAll?.("button, input[type='button'], input[type='submit'], input[type='reset'], [role='button']") || [],
    ).some((button: any) => {
      if (button === after || isHidden(button) || !elementPrecedes(after, button)) return false;
      const role = implicitRole(button);
      if (role !== "button") return false;
      return !(
        button.disabled ||
        button.hasAttribute?.("disabled") ||
        button.getAttribute?.("aria-disabled") === "true"
      );
    });
  }

  function leadingGenericGroupStopCountBeforeDisabledControl(el: any, role: string): number | undefined {
    if (role !== "button" || !accessibilityNodes.length) return undefined;
    if (
      !(
        el.disabled ||
        el.hasAttribute?.("disabled") ||
        el.getAttribute?.("aria-disabled") === "true"
      )
    ) {
      return undefined;
    }

    const buttonNode = axNodeForElementRole(el, "button");
    if (!buttonNode || buttonNode.properties?.disabled !== true) return undefined;

    const form = el.closest?.("form");
    if (!form) return undefined;

    const genericAncestors: any[] = [];
    for (let current = el.parentElement; current && current !== form; current = current.parentElement) {
      if (isHidden(current)) continue;
      const axNode = axNodeForElementRole(current, "generic");
      if (!axNode || normalize(axNode.name)) continue;
      if (current.matches?.(interactiveSelector)) continue;
      genericAncestors.push(current);
    }

    if (genericAncestors.length !== 2) return undefined;

    const [innerGroup, outerGroup] = genericAncestors;
    const innerInteractive = visibleInteractiveDescendants(innerGroup);
    if (innerInteractive.length !== 1 || innerInteractive[0] !== el) return undefined;
    if (!hasVisibleHeadingBefore(outerGroup, innerGroup)) return undefined;
    if (!hasEnabledButtonAfter(outerGroup, el)) return undefined;

    return genericAncestors.length;
  }

  function isMarkerSeparatedLinkList(list: any): boolean {
    if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase())) {
      return false;
    }
    if (list.parentElement?.tagName?.toLowerCase() !== "section") return false;
    if (!list.parentElement.hasAttribute("aria-labelledby")) return false;

    const items = listChildren(list);
    if (!items.length) return false;
    return items.every((item: any) => {
      if (item.getAttribute("data-sr-marker-content") !== "normal") return false;
      if (item.getAttribute("data-sr-marker-display") !== "inline-block") return false;
      if (!normalize(item.getAttribute("data-sr-marker-list-style-type"))) return false;
      if (textWithoutInteractive(item)) return false;

      const children = directSemanticChildren(item);
      return (
        children.length === 1 &&
        children[0].tagName?.toLowerCase() === "a" &&
        children[0].hasAttribute("href")
      );
    });
  }

  function usesFocusedResourcesMarkerFormat(list: any): boolean {
    if (!isMarkerSeparatedLinkList(list)) return false;
    if (list.tagName?.toLowerCase() !== "ul") return false;
    const region = list.parentElement;
    if (!region || markerSeparatedListRegionHasInteractiveLabel(region)) return false;

    const items = listChildren(list);
    if (items.length !== 11) return false;
    return items.every(
      (item: any) =>
        normalize(item.getAttribute("data-sr-marker-list-style-type")) === "disc",
    );
  }

  function markerSeparatedListItemContext(el: any) {
    const listItem = el?.closest?.("li,[role='listitem']");
    const list = listItem?.parentElement;
    if (!isListItem(listItem) || !isMarkerSeparatedLinkList(list)) {
      return {};
    }
    const siblings = listChildren(list);
    const index = siblings.indexOf(listItem);
    return index >= 0
      ? {
          markerPositionInSet: index + 1,
          markerSetSize: siblings.length || undefined,
          focusedResourcesMarkerFormat:
            usesFocusedResourcesMarkerFormat(list) || undefined,
        }
      : {};
  }

  function isMarkerSeparatedListLink(el: any, role = implicitRole(el)): boolean {
    if (role !== "link") return false;
    const listItem = el?.closest?.("li,[role='listitem']");
    if (!isListItem(listItem)) return false;
    const children = directSemanticChildren(listItem);
    return children.length === 1 && children[0] === el && Boolean(markerSeparatedListItemContext(el).markerPositionInSet);
  }

  function axChildNodes(node?: AccessibilityTreeNode): AccessibilityTreeNode[] {
    return (node?.childIds || [])
      .map((childId) => accessibilityNodeById.get(normalize(childId) || ""))
      .filter((child): child is AccessibilityTreeNode => Boolean(child && !child.ignored));
  }

  function axMarkerOnlyListItemStopAnnouncement(el: any): string | undefined {
    if (!isListItem(el) || el.tagName?.toLowerCase() !== "li") return undefined;
    if (el.getAttribute("data-sr-marker-content") !== "normal") return undefined;
    const markerDisplay = normalize(el.getAttribute("data-sr-marker-display"));
    if (markerDisplay !== "inline" && markerDisplay !== "inline-block") return undefined;
    const markerStyle = normalize(el.getAttribute("data-sr-marker-list-style-type"));
    if (markerStyle !== "disc" && markerStyle !== "square") return undefined;

    const list = listForItem(el);
    if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase())) return undefined;
    if (isMarkerSeparatedLinkList(list)) return undefined;
    if (axInlineTwoLinkListItemAnnouncements(el)) return undefined;
    if (el.querySelector("ul, ol, dl, [role='list']")) return undefined;
    if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]")) return undefined;

    const axListItem = axNodeForElementRole(el, "listitem");
    if (normalize(axListItem?.name)) return undefined;
    const axChildren = axChildNodes(axListItem);
    if (axChildren.length < 2) return undefined;

    const [markerNode, ...contentNodes] = axChildren;
    if (normalizedAxRole(markerNode.role) !== "listmarker") return undefined;
    if (!normalize(markerNode.name)) return undefined;
    const linkTrailingTextAnnouncement =
      axMarkerLinkTrailingTextListItemAnnouncement(el);

    const axLinks = contentNodes.filter((node) => normalizedAxRole(node.role) === "link");
    const axStrong = contentNodes.filter((node) => normalizedAxRole(node.role) === "strong");
    if (axLinks.length && axStrong.length) return undefined;
    if (!axLinks.length && axStrong.length !== 1) return undefined;

    const domLinks = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) =>
        !isHidden(link) &&
        link.closest("li,[role='listitem']") === el &&
        link.closest("ul, ol, dl, [role='list']") === list,
    );
    if (axLinks.length !== domLinks.length) return undefined;

    let linkIndex = 0;
    for (const node of contentNodes) {
      const role = normalizedAxRole(node.role);
      if (role === "link") {
        const link = domLinks[linkIndex];
        if (!link || node.properties?.focusable !== true) return undefined;
        if (normalize(node.domNodeId) !== normalize(link.getAttribute("data-sr-dom-node-id"))) {
          return undefined;
        }
        linkIndex += 1;
        continue;
      }
      if (role === "statictext" && /^[,\s]+$/.test(node.name || "")) continue;
      if (
        role === "statictext" &&
        linkTrailingTextAnnouncement &&
        axLinks.length === 1 &&
        contentNodes.length === 2
      ) {
        continue;
      }
      if (role === "strong" && !axLinks.length && axStrong.length === 1) continue;
      return undefined;
    }

    const position = positionInSet(el, "listitem");
    const size = setSize(el, "listitem");
    return position && size ? `•, ${position} of ${size}` : undefined;
  }

  function axMarkerOnlyListItemInlineTextAnnouncement(el: any): string | undefined {
    if (!axMarkerOnlyListItemStopAnnouncement(el)) return undefined;
    const axListItem = axNodeForElementRole(el, "listitem");
    const [, ...contentNodes] = axChildNodes(axListItem);
    if (
      contentNodes.length !== 1 ||
      normalizedAxRole(contentNodes[0].role) !== "strong"
    ) {
      return undefined;
    }
    const strong = Array.from(el.children || []).find(
      (child: any) => !isHidden(child) && child.tagName?.toLowerCase() === "strong",
    );
    const axText = normalize(
      axChildNodes(contentNodes[0])
        .map((node) => node.name || "")
        .join(" "),
    );
    return axText || normalize(readableText(strong) || readableText(el));
  }

  function axMarkerLinkTrailingTextListItemAnnouncement(el: any): string | undefined {
    if (!isListItem(el) || el.tagName?.toLowerCase() !== "li") return undefined;
    if (el.getAttribute("data-sr-marker-content") !== "normal") return undefined;
    if (el.getAttribute("data-sr-marker-display") !== "inline-block") return undefined;
    if (normalize(el.getAttribute("data-sr-marker-list-style-type")) !== "disc") {
      return undefined;
    }

    const list = listForItem(el);
    if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase())) return undefined;
    if (isMarkerSeparatedLinkList(list)) return undefined;
    if (axInlineTwoLinkListItemAnnouncements(el)) return undefined;
    if (el.querySelector("ul, ol, dl, [role='list']")) return undefined;
    if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]")) return undefined;

    const children = directSemanticChildren(el);
    if (
      children.length !== 1 ||
      children[0].tagName?.toLowerCase() !== "a" ||
      !children[0].hasAttribute("href")
    ) {
      return undefined;
    }

    const trailingText = normalize(directOwnText(el));
    if (!trailingText) return undefined;

    const axListItem = axNodeForElementRole(el, "listitem");
    if (normalize(axListItem?.name)) return undefined;
    const axChildren = axChildNodes(axListItem);
    if (axChildren.length !== 3) return undefined;

    const [markerNode, linkNode, textNode] = axChildren;
    if (normalizedAxRole(markerNode.role) !== "listmarker") return undefined;
    if (normalizedAxRole(linkNode.role) !== "link") return undefined;
    if (normalizedAxRole(textNode.role) !== "statictext") return undefined;
    if (normalize(markerNode.name)?.replace(/\s+$/g, "") !== "•") return undefined;
    if (linkNode.properties?.focusable !== true) return undefined;
    if (
      normalize(linkNode.domNodeId) !==
      normalize(children[0].getAttribute("data-sr-dom-node-id"))
    ) {
      return undefined;
    }

    const axTrailingText = normalize(textNode.name);
    if (!axTrailingText || axTrailingText !== trailingText) return undefined;

    return `• ${axTrailingText}`;
  }

  function isAxMarkerOnlyListItemChildContent(el: any, role = implicitRole(el)): boolean {
    if (role !== "link") return false;
    const listItem = el?.closest?.("li,[role='listitem']");
    if (!listItem || !axMarkerOnlyListItemStopAnnouncement(listItem)) return false;
    return Array.from(listItem.querySelectorAll("a[href], [role='link']")).some(
      (link: any) => link === el,
    );
  }

  function isAxMarkerPrefixedTextListItemChildContent(
    el: any,
    role = implicitRole(el),
  ): boolean {
    if (role !== "link") return false;
    const listItem = el?.closest?.("li,[role='listitem']");
    if (!listItem || !axPlainTextMarkerListItemAnnouncement(listItem)) return false;
    return Array.from(listItem.querySelectorAll("a[href], [role='link']")).some(
      (link: any) => link === el,
    );
  }

  function isAxStrongWrappedMarkerListItemChildContent(
    el: any,
    role = implicitRole(el),
  ): boolean {
    if (role !== "link") return false;
    const listItem = el?.closest?.("li,[role='listitem']");
    if (!listItem || !axStrongWrappedMarkerListItemAnnouncements(listItem)) return false;
    return Array.from(listItem.querySelectorAll("a[href], [role='link']")).some(
      (link: any) => link === el,
    );
  }

  function axPublicationListItemBoundaryAnnouncements(el: any): string[] | undefined {
    if (!isListItem(el) || el.tagName?.toLowerCase() !== "li") return undefined;
    if (el.getAttribute("data-sr-marker-content") !== "normal") return undefined;
    if (el.getAttribute("data-sr-marker-display") !== "inline-block") return undefined;
    if (normalize(el.getAttribute("data-sr-marker-list-style-type")) !== "disc") {
      return undefined;
    }

    const list = listForItem(el);
    if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase())) return undefined;
    if (isMarkerSeparatedLinkList(list)) return undefined;
    if (el.querySelector("ul, ol, dl, [role='list']")) return undefined;
    if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]")) return undefined;

    const axListItem = axNodeForElementRole(el, "listitem");
    if (normalize(axListItem?.name)) return undefined;
    const axChildren = axChildNodes(axListItem);
    if (axChildren.length < 3) return undefined;

    const [markerNode, ...contentNodes] = axChildren;
    if (normalizedAxRole(markerNode.role) !== "listmarker") return undefined;
    if (normalize(markerNode.name)?.replace(/\s+$/g, "") !== "•") return undefined;

    const position = positionInSet(el, "listitem");
    const size = setSize(el, "listitem");
    if (!position || !size) return undefined;
    const markerAnnouncement = `•, ${position} of ${size}`;

    const visibleElementChildren = Array.from(el.children || []).filter(
      (child: any) => !isHidden(child),
    );

    function directLinks(): any[] {
      return Array.from(el.children || []).filter(
        (child: any) =>
          !isHidden(child) &&
          child.tagName?.toLowerCase() === "a" &&
          child.hasAttribute("href") &&
          child.closest("li,[role='listitem']") === el,
      );
    }

    function linkAnnouncement(node: AccessibilityTreeNode, link: any): string | undefined {
      if (normalizedAxRole(node.role) !== "link") return undefined;
      if (node.properties?.focusable !== true) return undefined;
      if (normalize(node.domNodeId) !== normalize(link.getAttribute("data-sr-dom-node-id"))) {
        return undefined;
      }
      const name = normalize(node.name) || accessibleName(link, "link");
      return name ? `link, ${name}` : undefined;
    }

    if (
      contentNodes.length === 4 &&
      normalizedAxRole(contentNodes[0].role) === "link" &&
      normalizedAxRole(contentNodes[1].role) === "statictext" &&
      normalizedAxRole(contentNodes[2].role) === "link" &&
      normalizedAxRole(contentNodes[3].role) === "statictext"
    ) {
      const links = directLinks();
      if (visibleElementChildren.length !== 2 || links.length !== 2) return undefined;
      if (visibleElementChildren.some((child: any) => !links.includes(child))) {
        return undefined;
      }

      const firstLink = linkAnnouncement(contentNodes[0], links[0]);
      const firstText = normalize(contentNodes[1].name);
      const secondLink = linkAnnouncement(contentNodes[2], links[1]);
      const trailingText = normalize(contentNodes[3].name);
      if (!firstLink || !firstText || !secondLink || !trailingText) return undefined;
      if (!/[\p{L}\p{N}]/u.test(firstText) || !/[\p{L}\p{N}]/u.test(trailingText)) {
        return undefined;
      }

      return [markerAnnouncement, firstLink, firstText, secondLink, trailingText];
    }

    if (
      contentNodes.length === 2 &&
      ["strong", "emphasis"].includes(normalizedAxRole(contentNodes[0].role) || "") &&
      normalizedAxRole(contentNodes[1].role) === "statictext"
    ) {
      if (visibleElementChildren.length !== 1) return undefined;
      const wrapper = visibleElementChildren[0] as any;
      if (!["strong", "b", "em", "i"].includes(wrapper.tagName?.toLowerCase())) {
        return undefined;
      }
      const wrapperLinks = Array.from(wrapper.querySelectorAll("a[href], [role='link']")).filter(
        (link: any) => !isHidden(link),
      );
      if (wrapperLinks.length !== 1) return undefined;
      if (directOwnText(wrapper)) return undefined;

      const wrappedAxChildren = axChildNodes(contentNodes[0]);
      if (wrappedAxChildren.length !== 1) return undefined;
      const link = wrapperLinks[0] as any;
      const linkStop = linkAnnouncement(wrappedAxChildren[0], link);
      const trailingText = normalize(contentNodes[1].name);
      if (!linkStop || !trailingText || !/[\p{L}\p{N}]/u.test(trailingText)) {
        return undefined;
      }

      return [markerAnnouncement, linkStop, `• ${trailingText}`];
    }

    return undefined;
  }

  function axMixedInlineListItemAnnouncements(el: any): string[] | undefined {
    if (!isListItem(el) || el.tagName?.toLowerCase() !== "li") return undefined;
    if (el.getAttribute("data-sr-marker-content") !== "normal") return undefined;
    if (el.getAttribute("data-sr-marker-display") !== "inline-block") return undefined;
    if (normalize(el.getAttribute("data-sr-marker-list-style-type")) !== "disc") {
      return undefined;
    }

    const list = listForItem(el);
    if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase())) return undefined;
    if (isMarkerSeparatedLinkList(list)) return undefined;
    if (el.querySelector("ul, ol, dl, [role='list']")) return undefined;
    if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]")) return undefined;

    const position = positionInSet(el, "listitem");
    const size = setSize(el, "listitem");
    if (!position || !size) return undefined;

    const visibleElementChildren = Array.from(el.children || []).filter(
      (child: any) => !isHidden(child) || isSerializedOffscreenCodeBoundary(child),
    );
    const directLinks = Array.from(el.children || []).filter(
      (child: any) =>
        !isHidden(child) &&
        child.tagName?.toLowerCase() === "a" &&
        child.hasAttribute("href"),
    );

    if (!directLinks.length) {
      if (!isGovukDesignSystemDocument()) return undefined;
      const codeChildren = visibleElementChildren.filter(
        (child: any) => child.tagName?.toLowerCase() === "code",
      );
      if (codeChildren.length !== 1 || visibleElementChildren.length !== 1) {
        return undefined;
      }

      const axListItem = axNodeForElementRole(el, "listitem");
      if (normalize(axListItem?.name)) return undefined;
      const axChildren = axChildNodes(axListItem);
      if (axChildren.length !== 2 && axChildren.length !== 3) return undefined;

      const [markerNode, codeNode, trailingNode] = axChildren;
      if (normalizedAxRole(markerNode.role) !== "listmarker") return undefined;
      if (normalize(markerNode.name)?.replace(/\s+$/g, "") !== "•") return undefined;
      if (normalizedAxRole(codeNode.role) !== "code") return undefined;

      const codeTextNode = axChildNodes(codeNode).find(
        (child) => normalizedAxRole(child.role) === "statictext",
      );
      const codeText = normalize(codeTextNode?.name || codeChildren[0].textContent);
      if (!codeText) return undefined;

      if (trailingNode && normalizedAxRole(trailingNode.role) !== "statictext") {
        return undefined;
      }
      const trailingText = normalize(trailingNode?.name);
      return [
        `•, ${position} of ${size}`,
        codeText,
        trailingText,
      ].filter((announcement): announcement is string => Boolean(announcement));
    }

    if (visibleElementChildren.some((child: any) => !directLinks.includes(child))) {
      return undefined;
    }

    const axListItem = axNodeForElementRole(el, "listitem");
    if (normalize(axListItem?.name)) return undefined;
    const axChildren = axChildNodes(axListItem);
    if (axChildren.length !== 4) return undefined;

    const [markerNode, firstNode, secondNode, thirdNode] = axChildren;
    if (normalizedAxRole(markerNode.role) !== "listmarker") return undefined;
    if (normalize(markerNode.name)?.replace(/\s+$/g, "") !== "•") return undefined;

    function directTextSegments(): string[] {
      return Array.from(el.childNodes || [])
        .filter((child: any) => child.nodeType === Node.TEXT_NODE)
        .map((child: any) => normalize(child.textContent || ""))
        .filter((text): text is string => Boolean(text));
    }

    function linkAnnouncement(
      node: AccessibilityTreeNode,
      link: any,
    ): string | undefined {
      if (normalizedAxRole(node.role) !== "link") return undefined;
      if (node.properties?.focusable !== true) return undefined;
      if (normalize(node.domNodeId) !== normalize(link.getAttribute("data-sr-dom-node-id"))) {
        return undefined;
      }
      const name = normalize(node.name) || accessibleName(link, "link");
      return name ? `link, ${name}` : undefined;
    }

    if (
      normalizedAxRole(firstNode.role) === "statictext" &&
      normalizedAxRole(secondNode.role) === "link" &&
      normalizedAxRole(thirdNode.role) === "statictext"
    ) {
      if (directLinks.length !== 1) return undefined;
      const [leadingText, trailingText] = directTextSegments();
      const axLeadingText = normalize(firstNode.name);
      const axTrailingText = normalize(thirdNode.name);
      if (
        !leadingText ||
        !trailingText ||
        leadingText !== axLeadingText ||
        trailingText !== axTrailingText ||
        !/[\p{L}\p{N}]/u.test(trailingText)
      ) {
        return undefined;
      }

      const linkStop = linkAnnouncement(secondNode, directLinks[0]);
      if (!linkStop) return undefined;
      return [`• ${axLeadingText}, ${position} of ${size}`, linkStop, axTrailingText];
    }

    if (
      normalizedAxRole(firstNode.role) === "link" &&
      normalizedAxRole(secondNode.role) === "statictext" &&
      normalizedAxRole(thirdNode.role) === "link"
    ) {
      if (directLinks.length !== 2) return undefined;
      const [separatorText] = directTextSegments();
      const axSeparatorText = normalize(secondNode.name);
      if (
        !separatorText ||
        separatorText !== axSeparatorText ||
        !/[\p{L}\p{N}]/u.test(separatorText)
      ) {
        return undefined;
      }

      const firstLink = linkAnnouncement(firstNode, directLinks[0]);
      const secondLink = linkAnnouncement(thirdNode, directLinks[1]);
      if (!firstLink || !secondLink) return undefined;
      return [`•, ${position} of ${size}`, firstLink, axSeparatorText, secondLink];
    }

    return undefined;
  }

  function axStrongWrappedMarkerListItemAnnouncements(el: any): string[] | undefined {
    if (!isListItem(el) || el.tagName?.toLowerCase() !== "li") return undefined;
    if (el.getAttribute("data-sr-marker-content") !== "normal") return undefined;
    if (el.getAttribute("data-sr-marker-display") !== "inline-block") return undefined;
    if (normalize(el.getAttribute("data-sr-marker-list-style-type")) !== "disc") {
      return undefined;
    }

    const list = listForItem(el);
    if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase())) return undefined;
    if (isMarkerSeparatedLinkList(list)) return undefined;
    if (el.querySelector("ul, ol, dl, [role='list']")) return undefined;
    if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]")) return undefined;

    const visibleElementChildren = Array.from(el.children || []).filter(
      (child: any) => !isHidden(child),
    );
    if (visibleElementChildren.length !== 1) return undefined;
    const wrapper = visibleElementChildren[0] as any;
    if (!["strong", "b", "em", "i"].includes(wrapper.tagName?.toLowerCase())) {
      return undefined;
    }

    const links = Array.from(wrapper.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) =>
        !isHidden(link) &&
        link.closest("li,[role='listitem']") === el &&
        link.closest("ul, ol, dl, [role='list']") === list,
    );
    if (links.length !== 1) return undefined;

    const axListItem = axNodeForElementRole(el, "listitem");
    if (normalize(axListItem?.name)) return undefined;
    const axChildren = axChildNodes(axListItem);
    if (axChildren.length !== 2) return undefined;

    const [markerNode, wrapperNode] = axChildren;
    if (normalizedAxRole(markerNode.role) !== "listmarker") return undefined;
    if (normalize(markerNode.name)?.replace(/\s+$/g, "") !== "•") return undefined;
    if (!["strong", "emphasis"].includes(normalizedAxRole(wrapperNode.role) || "")) {
      return undefined;
    }
    if (
      normalize(wrapperNode.domNodeId) !==
      normalize(wrapper.getAttribute("data-sr-dom-node-id"))
    ) {
      return undefined;
    }

    const wrappedAxChildren = axChildNodes(wrapperNode);
    if (wrappedAxChildren.length !== 2) return undefined;
    const [textNode, linkNode] = wrappedAxChildren;
    if (normalizedAxRole(textNode.role) !== "statictext") return undefined;
    if (normalizedAxRole(linkNode.role) !== "link") return undefined;
    if (linkNode.properties?.focusable !== true) return undefined;

    const link = links[0] as any;
    if (normalize(linkNode.domNodeId) !== normalize(link.getAttribute("data-sr-dom-node-id"))) {
      return undefined;
    }

    const staticText = normalize(textNode.name);
    const linkName = normalize(linkNode.name) || accessibleName(link, "link");
    const position = positionInSet(el, "listitem");
    const size = setSize(el, "listitem");
    if (!staticText || !linkName || !position || !size) return undefined;
    if (!/[\p{L}\p{N}]/u.test(staticText)) return undefined;

    return [`•, ${position} of ${size}`, staticText];
  }

  function axInlineTwoLinkListItemAnnouncements(el: any): string[] | undefined {
    if (!isListItem(el) || el.tagName?.toLowerCase() !== "li") return undefined;
    if (el.getAttribute("data-sr-marker-content") !== "normal") return undefined;
    if (el.getAttribute("data-sr-marker-display") !== "inline-block") return undefined;
    if (normalize(el.getAttribute("data-sr-marker-list-style-type")) !== "disc") {
      return undefined;
    }

    const list = listForItem(el);
    if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase())) return undefined;
    if (announcedListChildren(list).length !== 1) return undefined;
    if (el.querySelector("ul, ol, dl, [role='list']")) return undefined;
    if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]")) return undefined;

    const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) =>
        !isHidden(link) &&
        link.closest("li,[role='listitem']") === el &&
        link.closest("ul, ol, dl, [role='list']") === list,
    );
    if (links.length !== 2) return undefined;

    const axListItem = axNodeForElementRole(el, "listitem");
    const axChildren = axChildNodes(axListItem);
    if (axChildren.length !== 4) return undefined;

    const [markerNode, firstLinkNode, separatorNode, secondLinkNode] = axChildren;
    if (normalizedAxRole(markerNode.role) !== "listmarker") return undefined;
    if (normalizedAxRole(firstLinkNode.role) !== "link") return undefined;
    if (normalizedAxRole(separatorNode.role) !== "statictext") return undefined;
    if (normalizedAxRole(secondLinkNode.role) !== "link") return undefined;
    if (normalize(separatorNode.name) !== ",") return undefined;
    if (firstLinkNode.properties?.focusable !== true) return undefined;
    if (secondLinkNode.properties?.focusable !== true) return undefined;

    const [firstLink, secondLink] = links;
    if (
      normalize(firstLinkNode.domNodeId) !==
      normalize(firstLink.getAttribute("data-sr-dom-node-id"))
    ) {
      return undefined;
    }
    if (
      normalize(secondLinkNode.domNodeId) !==
      normalize(secondLink.getAttribute("data-sr-dom-node-id"))
    ) {
      return undefined;
    }

    const firstName = normalize(firstLinkNode.name) || accessibleName(firstLink, "link");
    const secondName = normalize(secondLinkNode.name) || accessibleName(secondLink, "link");
    if (!firstName || !secondName) return undefined;

    return [
      "You are currently on a AXListMarker.",
      `link, ${firstName}`,
      "You are currently on a selectable list item.",
      `link, ${secondName}`,
    ];
  }

  function axPlainTextMarkerListItemText(el: any): string | undefined {
    if (!isListItem(el) || el.tagName?.toLowerCase() !== "li") return undefined;
    if (el.getAttribute("data-sr-marker-content") !== "normal") return undefined;
    if (el.getAttribute("data-sr-marker-display") !== "inline-block") return undefined;
    if (normalize(el.getAttribute("data-sr-marker-list-style-type")) !== "disc") {
      return undefined;
    }

    const list = listForItem(el);
    if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase())) return undefined;
    if (el.querySelector("ul, ol, dl, [role='list']")) return undefined;
    if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]")) return undefined;

    const axListItem = axNodeForElementRole(el, "listitem");
    if (normalize(axListItem?.name)) return undefined;
    const axChildren = axChildNodes(axListItem);
    if (axChildren.length < 2) return undefined;

    const [markerNode, textNode, ...followingNodes] = axChildren;
    if (normalizedAxRole(markerNode.role) !== "listmarker") return undefined;
    if (normalizedAxRole(textNode.role) !== "statictext") return undefined;

    const marker = normalize(markerNode.name).replace(/\s+$/g, "");
    const text = normalize(textNode.name);
    if (!marker || !text) return undefined;
    if (marker !== "•") return undefined;

    const leadingText = directLeadingText(el);
    if (!leadingText || text !== leadingText) return undefined;

    const domLinks = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) =>
        !isHidden(link) &&
        link.closest("li,[role='listitem']") === el &&
        link.closest("ul, ol, dl, [role='list']") === list,
    );
    const semanticChildren = directSemanticChildren(el);
    if (
      semanticChildren.some((child: any) => !domLinks.includes(child)) ||
      !domLinks.every((link: any) => semanticChildren.includes(link))
    ) {
      return undefined;
    }

    let linkIndex = 0;
    for (const node of followingNodes) {
      const role = normalizedAxRole(node.role);
      if (role === "link") {
        const link = domLinks[linkIndex];
        if (!link || node.properties?.focusable !== true) return undefined;
        if (normalize(node.domNodeId) !== normalize(link.getAttribute("data-sr-dom-node-id"))) {
          return undefined;
        }
        linkIndex += 1;
        continue;
      }
      if (role === "statictext" && /^[\s.,;:!?]+$/.test(node.name || "")) continue;
      return undefined;
    }
    if (linkIndex !== domLinks.length) return undefined;

    return text;
  }

  function axPlainTextMarkerTextOnlyListItemText(el: any): string | undefined {
    if (!isListItem(el) || el.tagName?.toLowerCase() !== "li") return undefined;
    if (el.getAttribute("data-sr-marker-content") !== "normal") return undefined;
    if (el.getAttribute("data-sr-marker-display") !== "inline-block") return undefined;
    if (normalize(el.getAttribute("data-sr-marker-list-style-type")) !== "disc") {
      return undefined;
    }

    const list = listForItem(el);
    if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase())) return undefined;
    if (
      el.querySelector(
        "a[href], [role='link'], button, [role='button'], ul, ol, dl, [role='list']",
      )
    ) {
      return undefined;
    }
    if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]")) return undefined;

    const axListItem = axNodeForElementRole(el, "listitem");
    if (normalize(axListItem?.name)) return undefined;
    const axChildren = axChildNodes(axListItem);
    if (axChildren.length !== 2) return undefined;

    const [markerNode, textNode] = axChildren;
    if (normalizedAxRole(markerNode.role) !== "listmarker") return undefined;
    if (normalizedAxRole(textNode.role) !== "statictext") return undefined;
    if (normalize(markerNode.name)?.replace(/\s+$/g, "") !== "•") return undefined;

    const text = normalize(textNode.name);
    if (!text || text !== normalize(readableText(el))) return undefined;
    return text;
  }

  function axPlainTextMarkerListItemAnnouncement(el: any): string | undefined {
    const text =
      axPlainTextMarkerListItemText(el) ||
      axPlainTextMarkerTextOnlyListItemText(el);
    if (!text) return undefined;

    const list = listForItem(el);
    if (!list) return undefined;
    const siblings = announcedListChildren(list);
    const hasCompatibleMarkerSiblings = siblings.every(
      (item: any) =>
        axPlainTextMarkerListItemText(item) ||
        axPlainTextMarkerTextOnlyListItemText(item) ||
        axStrongWrappedMarkerListItemAnnouncements(item),
    );
    if (!siblings.length || !hasCompatibleMarkerSiblings) {
      return undefined;
    }

    const hasDirectLink = directSemanticChildren(el).some(
      (child: any) => child.tagName?.toLowerCase() === "a" && child.hasAttribute("href"),
    );
    const allSiblingsArePlainText = siblings.every((item: any) => {
      if (Array.from(item.children || []).some((child: any) => !isHidden(child))) {
        return false;
      }
      return !item.querySelector(interactiveSelector);
    });
    const hasTextLinkSibling = siblings.some(
      (item: any) =>
        item !== el &&
        directSemanticChildren(item).some(
          (child: any) => child.tagName?.toLowerCase() === "a" && child.hasAttribute("href"),
        ),
    );
    const hasStrongWrappedMarkerSibling = siblings.some(
      (item: any) => item !== el && axStrongWrappedMarkerListItemAnnouncements(item),
    );
    if (
      !hasDirectLink &&
      !allSiblingsArePlainText &&
      !hasTextLinkSibling &&
      !hasStrongWrappedMarkerSibling
    ) {
      return undefined;
    }

    const position = positionInSet(el, "listitem");
    const size = setSize(el, "listitem");
    const suffix = position && size ? `, ${position} of ${size}` : "";
    return `• ${text}${suffix}`;
  }

  function contributionListItemAnnouncements(el: any): string[] | undefined {
    if (!isListItem(el) || el.tagName?.toLowerCase() !== "li") return undefined;
    const list = listForItem(el);
    if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase())) return undefined;
    if (el.querySelector("ul, ol, dl, [role='list']")) return undefined;
    if (directOwnText(el)) return undefined;

    const children = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (children.length !== 3) return undefined;

    const [repoWrapper, timeEl, titleWrapper] = children as any[];
    if (timeEl.tagName?.toLowerCase() !== "time" || !readableText(timeEl)) return undefined;
    if (repoWrapper.matches?.(interactiveSelector) || titleWrapper.matches?.(interactiveSelector)) {
      return undefined;
    }

    const directRowLinks = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) =>
        !isHidden(link) &&
        link.closest("li,[role='listitem']") === el &&
        link.closest("ul, ol, dl, [role='list']") === list,
    );
    if (directRowLinks.length !== 2) return undefined;

    const [repoLink, titleLink] = directRowLinks as any[];
    if (!repoWrapper.contains(repoLink) || !titleWrapper.contains(titleLink)) return undefined;
    if (repoWrapper.querySelectorAll("a[href], [role='link']").length !== 1) return undefined;
    if (titleWrapper.querySelectorAll("a[href], [role='link']").length !== 1) return undefined;

    if (!axNodeForElementRole(el, "listitem")) return undefined;
    const repoNode = axNodeForElementRole(repoLink, "link");
    const timeNode = axNodeForElementRole(timeEl, "time");
    const titleNode = axNodeForElementRole(titleWrapper, "generic");
    if (!repoNode || !timeNode || !titleNode) return undefined;

    const titleNodeChildren = axChildNodes(titleNode);
    if (titleNodeChildren.length !== 1 || normalizedAxRole(titleNodeChildren[0].role) !== "link") {
      return undefined;
    }
    const titleLinkNode = titleNodeChildren[0];
    if (repoNode.properties?.focusable !== true || titleLinkNode.properties?.focusable !== true) {
      return undefined;
    }
    if (
      normalize(repoNode.domNodeId) !== normalize(repoLink.getAttribute("data-sr-dom-node-id")) ||
      normalize(timeNode.domNodeId) !== normalize(timeEl.getAttribute("data-sr-dom-node-id")) ||
      normalize(titleLinkNode.domNodeId) !== normalize(titleLink.getAttribute("data-sr-dom-node-id"))
    ) {
      return undefined;
    }

    const repoName = normalize(repoNode.name) || accessibleName(repoLink, "link");
    const timeText = normalize(readableText(timeEl) || axChildNodes(timeNode)[0]?.name);
    const titleName = normalize(titleLinkNode.name) || accessibleName(titleLink, "link");
    if (!repoName || !timeText || !titleName) return undefined;

    const position = positionInSet(el, "listitem");
    const size = setSize(el, "listitem");
    const repoPosition = position && size ? `, ${position} of ${size}` : "";

    return [
      `link, ${repoName}${repoPosition}`,
      timeText,
      `link, ${titleName}`,
    ];
  }

  function isMarkerSeparatedListRegion(el: any, role = implicitRole(el)): boolean {
    if (role !== "region") return false;
    if (el.tagName?.toLowerCase() !== "section") return false;
    if (!el.hasAttribute("aria-labelledby")) return false;
    return Array.from(el.children || []).some((child: any) =>
      isMarkerSeparatedLinkList(child),
    );
  }

  function markerSeparatedListRegionHasInteractiveLabel(el: any): boolean {
    if (!el?.hasAttribute?.("aria-labelledby")) return false;
    return (el.getAttribute("aria-labelledby") || "")
      .split(/\s+/)
      .some((id: string) => {
        const label = id ? document.getElementById(id) : null;
        return Boolean(label?.querySelector?.(interactiveSelector));
      });
  }

  function isDirectInvalidListContentItem(list: any, child: any): boolean {
    if (!list || !child || child.parentElement !== list || isHidden(child)) return false;
    if (!["ul", "ol"].includes(list.tagName?.toLowerCase())) return false;
    if (isListItem(child) || child.matches?.("script, style, template")) return false;
    if (child.getAttribute?.("role") === "none" || child.getAttribute?.("role") === "presentation") {
      return false;
    }
    return Boolean(readableText(child));
  }

  function hasStructuredNewsCardListItemContent(el: any): boolean {
    if (!isListItem(el)) return false;
    if (!el.querySelector("a[href], [role='link']")) return false;
    if (!el.querySelector("p")) return false;
    if (!el.querySelector("ul, ol, [role='list']")) return false;
    return true;
  }

  function directListArticleCardFor(el: any): any | null {
    const article = el?.closest?.("article,[role='article']");
    if (!article || isHidden(article)) return null;

    const listItem = article.parentElement;
    if (!isListItem(listItem)) return null;
    if (el.closest("li,[role='listitem']") !== listItem) return null;

    const list = listForItem(listItem);
    if (!list || list.tagName?.toLowerCase() === "dl") return null;
    if (announcedListChildren(list).length < 2) return null;

    const children = directSemanticChildren(listItem);
    if (children.length !== 1 || children[0] !== article) return null;

    const hasHeading = Boolean(
      article.querySelector("h1,h2,h3,h4,h5,h6,[role='heading']"),
    );
    const hasLink = Boolean(article.querySelector("a[href], [role='link']"));
    return hasHeading && hasLink ? article : null;
  }

  function isDescendantOfDirectListArticleCard(el: any): boolean {
    const article = directListArticleCardFor(el);
    return Boolean(article && article !== el);
  }

  function isPrimaryStructuredNewsCardLink(el: any): boolean {
    if (implicitRole(el) !== "link") return false;
    const listItem = el.closest("li,[role='listitem']");
    if (!hasStructuredNewsCardListItemContent(listItem)) return false;
    if (el.closest("ul, ol, dl, [role='list']") !== listForItem(listItem)) {
      return false;
    }
    const links = Array.from(listItem.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) =>
        !isHidden(link) &&
        link.closest("li,[role='listitem']") === listItem &&
        link.closest("ul, ol, dl, [role='list']") === listForItem(listItem),
    );
    return links[0] === el;
  }

  function metadataListItemValueAnnouncements(el: any): string[] | undefined {
    if (!isMetadataLabelValueListItem(el)) return undefined;
    const cells = visibleMetadataListItemCells(el);
    const valueCell = cells[1];
    const interactive = Array.from(
      valueCell.querySelectorAll("a[href], [role='link'], button, [role='button']"),
    ).filter((candidate: any) => !isHidden(candidate));

    if (interactive.length === 1) {
      const control = interactive[0] as any;
      const role = implicitRole(control);
      const name = accessibleName(control, role) || readableText(control);
      if (!name || (role !== "link" && role !== "button")) return undefined;
      return [role === "link" ? `link, ${name}` : `${name}, button`];
    }

    if (interactive.length) return undefined;
    const valueText = readableText(valueCell);
    return valueText ? [valueText] : undefined;
  }

  function isMetadataLabelValueListItem(el: any): boolean {
    if (!isListItem(el)) return false;
    const list = listForItem(el);
    if (!list || list.tagName?.toLowerCase() === "dl") return false;
    if (el.querySelector("ul, ol, dl, [role='list']")) return false;
    if (directOwnText(el)) return false;

    const cells = visibleMetadataListItemCells(el);
    if (cells.length !== 2) return false;
    const [labelCell, valueCell] = cells;
    if (labelCell.querySelector(interactiveSelector)) return false;
    const formControlSelector =
      "input, select, textarea, [role='combobox'], [role='textbox'], [role='searchbox'], [role='listbox']";
    if (
      valueCell.matches?.(formControlSelector) ||
      valueCell.querySelector(formControlSelector)
    ) {
      return false;
    }
    if (!readableText(labelCell) || !readableText(valueCell)) return false;
    return true;
  }

  function visibleMetadataListItemCells(el: any): any[] {
    return walkChildren(el).filter(
      (child: any) =>
        !isHidden(child) &&
        !child.matches?.("script, style, template") &&
        Boolean(readableText(child) || child.querySelector?.(interactiveSelector)),
    );
  }

  function isGenericDealCtaLink(el: any): boolean {
    if (implicitRole(el) !== "link") return false;
    const listItem = el.closest("li,[role='listitem']");
    if (!isListItem(listItem)) return false;
    if (!listItem.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']")) {
      return false;
    }
    const label = accessibleName(el, "link");
    const text = readableText(el);
    return /^View .+ deal$/i.test(label || "") && /^View deal$/i.test(text || "");
  }

  function isUnnamedCarouselRegion(el: any): boolean {
    if (implicitRole(el) !== "region") return false;
    if (accessibleName(el, "region")) return false;
    return /^(carousel|slideshow)$/i.test(normalize(el.getAttribute("aria-roledescription")) || "");
  }

  function explicitActiveCarouselSlide(el: any): any {
    const slide = el?.closest?.("[role='group'][tabindex='0']");
    if (!slide || isHidden(slide) || slide.getAttribute("aria-hidden") === "true") {
      return null;
    }
    const carousel = slide.closest(
      "[aria-roledescription='carousel'], [aria-roledescription='slideshow']",
    );
    return carousel ? slide : null;
  }

  function hasActiveCarouselSlide(carousel: any): boolean {
    return Boolean(
      carousel?.querySelector?.("[role='group'][tabindex='0'][aria-hidden='false']"),
    );
  }

  function isCarouselDescriptionOnlyControlContainer(el: any, role: string): boolean {
    if (role !== "group" || el.matches(interactiveSelector)) return false;
    const id = normalize(el.getAttribute("id"));
    if (!id) return false;
    const label = accessibleName(el, role) || readableText(el);
    if (!label) return false;
    const carousel = el.closest(
      "[aria-roledescription='carousel'], [aria-roledescription='slideshow']",
    );
    if (!carousel) return false;

    const children = walkChildren(el).filter(
      (child: any) =>
        child.nodeType === Node.ELEMENT_NODE &&
        !isHidden(child) &&
        !child.matches?.("script, style, template"),
    );
    if (!children.length) return false;
    if (children.some((child: any) => implicitRole(child) !== "button")) return false;

    const describedButtons = children.filter((child: any) =>
      normalize(child.getAttribute("aria-describedby"))
        ?.split(/\s+/)
        .includes(id),
    );
    if (describedButtons.length !== children.length) return false;

    if (accessibilityNodes.length) {
      const axNode = axNodeForElement(el);
      if (!axNode || normalize(axNode.name) !== label) return false;
      for (const button of describedButtons) {
        const buttonName = accessibleName(button, "button");
        const buttonNode = axNodeForElementRole(button, "button");
        if (!buttonNode || normalize(buttonNode.name) !== buttonName) return false;
        if (normalize(buttonNode.description) !== label) return false;
      }
    }

    return true;
  }

  function readableStopText(el: any, role: string): string | undefined {
    if (["button", "link", "image"].includes(role)) {
      return accessibleName(el, role);
    }
    return readableText(el);
  }

  function hasLaterReadableStopWithin(boundary: any, el: any): boolean {
    const walker = document.createTreeWalker(
      boundary,
      boundary.ownerDocument.defaultView.NodeFilter.SHOW_ELEMENT,
    );
    let seen = false;
    let node: any;
    while ((node = walker.nextNode())) {
      if (node === el) {
        seen = true;
        continue;
      }
      if (!seen) continue;
      if (el.contains(node) || isHidden(node)) continue;

      const role = implicitRole(node);
      if (
        [
          "heading",
          "paragraph",
          "text",
          "button",
          "link",
          "image",
          "textbox",
          "searchbox",
          "combobox",
        ].includes(role) &&
        readableStopText(node, role)
      ) {
        return true;
      }
    }
    return false;
  }

  function isFirstReadableStopWithin(boundary: any, el: any): boolean {
    const walker = document.createTreeWalker(
      boundary,
      boundary.ownerDocument.defaultView.NodeFilter.SHOW_ELEMENT,
    );
    let node: any;
    while ((node = walker.nextNode())) {
      if (isHidden(node)) continue;
      const role = implicitRole(node);
      if (
        [
          "heading",
          "paragraph",
          "text",
          "button",
          "link",
          "image",
          "textbox",
          "searchbox",
          "combobox",
        ].includes(role) &&
        readableStopText(node, role)
      ) {
        return node === el || node.contains(el) || el.contains(node);
      }
    }
    return false;
  }

  function isLeadingCarouselGroupStop(el: any, role: string): boolean {
    if (!["paragraph", "text"].includes(role)) return false;
    const carousel = el.closest(
      "[aria-roledescription='carousel'], [aria-roledescription='slideshow']",
    );
    if (!carousel || !isUnnamedCarouselRegion(carousel)) return false;
    if (!hasActiveCarouselSlide(carousel)) return false;
    if (explicitActiveCarouselSlide(el)) return false;
    return isFirstReadableStopWithin(carousel, el);
  }

  function isTrailingCarouselSlideGroupStop(el: any, role: string): boolean {
    if (!["heading", "paragraph", "text"].includes(role)) return false;
    const slide = explicitActiveCarouselSlide(el);
    if (!slide) return false;
    if (!readableStopText(el, role)) return false;
    return !hasLaterReadableStopWithin(slide, el);
  }

  function standaloneCardBodyTextElement(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.matches(interactiveSelector)) return false;
    if (el.closest(interactiveSelector)) return false;
    if (el.closest("h1, h2, h3, h4, h5, h6, [role='heading']")) return false;
    if (!directOwnText(el)) return false;
    return !el.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']");
  }

  function isDecorativeMediaOnlyContainer(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.matches(interactiveSelector) || el.querySelector(interactiveSelector)) return false;
    if (readableText(el)) return false;
    return Boolean(
      el.querySelector(
        "img[alt=''], img[role='presentation'], svg[aria-hidden='true'], [role='presentation']",
      ),
    );
  }

  function nextVisibleElementSibling(el: any): any | null {
    for (let sibling = el?.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
      if (!isHidden(sibling)) return sibling;
    }
    return null;
  }

  function previousVisibleElementSibling(el: any): any | null {
    for (let sibling = el?.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      if (!isHidden(sibling)) return sibling;
    }
    return null;
  }

  function terminalFooterElement(el: any): any | null {
    let current = el;
    while (current?.nodeType === Node.ELEMENT_NODE && !isHidden(current)) {
      if (implicitRole(current) === "contentinfo") {
        return current;
      }

      const visibleChildren = Array.from(current.children || []).filter(
        (child: any) => !isHidden(child),
      );
      if (!visibleChildren.length) {
        return null;
      }
      current = visibleChildren[visibleChildren.length - 1];
    }
    return null;
  }

  function isPostFooterTextStatus(el: any, role: string): boolean {
    if (role !== "status") return false;
    if (normalize(el.getAttribute("role"))?.toLowerCase() !== "status") return false;
    if (normalize(el.getAttribute("aria-label")) || normalize(el.getAttribute("aria-labelledby"))) {
      return false;
    }
    if (el.closest("footer,[role='contentinfo'],main,form,header,nav,aside,article,section")) {
      return false;
    }
    const text = directOwnText(el);
    if (!text || hasVisibleInteractiveDescendant(el)) return false;
    if (Array.from(el.children || []).some((child: any) => !isHidden(child))) {
      return false;
    }

    const previous = previousVisibleElementSibling(el);
    if (!previous || !terminalFooterElement(previous)) return false;

    if (accessibilityNodes.length) {
      const axNode = axNodeForElementRole(el, "status");
      if (!axNode) return false;
      const staticText = (axNode.childIds || [])
        .map((id) => accessibilityNodeById.get(normalize(id) || ""))
        .find((node) => normalizedAxRole(node?.role) === "statictext");
      if (normalize(staticText?.name) !== text) return false;
    }

    return true;
  }

  function hasOnlyNativeLinkControls(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    const controls = Array.from(el.querySelectorAll(interactiveSelector)).filter(
      (control: any) => !isHidden(control),
    );
    if (!controls.length) return false;
    return controls.every(
      (control: any) =>
        control.tagName?.toLowerCase() === "a" && control.hasAttribute("href"),
    );
  }

  function isDecorativeRoleGroupBeforeNativeLinks(el: any, role = implicitRole(el)): boolean {
    if (role !== "group") return false;
    if (el.getAttribute("role") !== "group") return false;
    if (accessibleName(el, role) || readableText(el)) return false;
    if (el.matches(interactiveSelector)) return false;
    const tabIndex = Number.parseInt(el.getAttribute("tabindex") || "", 10);
    if (Number.isFinite(tabIndex) && tabIndex >= 0) return false;
    if (!isDecorativeMediaOnlyContainer(el)) return false;

    const previous = previousVisibleElementSibling(el);
    if (!previous || !readableText(previous) || previous.querySelector(interactiveSelector)) {
      return false;
    }
    if (["heading", "button", "link"].includes(implicitRole(previous))) return false;

    return hasOnlyNativeLinkControls(nextVisibleElementSibling(el));
  }

  function isDecorativeGenericGroupBeforeNativeLinks(el: any, role = implicitRole(el)): boolean {
    if (role !== "group") return false;
    if (el.getAttribute("role")) return false;
    if (accessibleName(el, role) || readableText(el)) return false;
    if (el.matches(interactiveSelector)) return false;
    const tabIndex = Number.parseInt(el.getAttribute("tabindex") || "", 10);
    if (Number.isFinite(tabIndex) && tabIndex >= 0) return false;
    if (!isDecorativeMediaOnlyContainer(el)) return false;

    const previous = previousVisibleElementSibling(el);
    if (!previous || !readableText(previous) || previous.querySelector(interactiveSelector)) {
      return false;
    }
    if (["heading", "button", "link"].includes(implicitRole(previous))) return false;

    return hasOnlyNativeLinkControls(nextVisibleElementSibling(el));
  }

  function standaloneContentCardHeading(el: any, minimumLevel = 2): any {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (!["div", "article", "section"].includes(el.tagName.toLowerCase())) {
      return null;
    }
    if (el.getAttribute("role") || el.closest("li,[role='listitem']")) {
      return null;
    }
    if (el.querySelector("ul, ol, table, [role='list'], [role='table'], [role='grid']")) {
      return null;
    }

    const headings = Array.from(
      el.querySelectorAll("h2, h3, h4, h5, h6, [role='heading']"),
    ).filter((heading: any) => !isHidden(heading) && Boolean(readableText(heading)));
    if (headings.length !== 1) return null;
    const headingTag = headings[0].tagName?.toLowerCase();
    const level =
      Number.parseInt(headings[0].getAttribute("aria-level") || headingTag.slice(1), 10) || 2;
    if (level < minimumLevel) {
      return null;
    }

    return headings[0];
  }

  function isStandaloneContentCard(el: any): boolean {
    const heading = standaloneContentCardHeading(el, 3);
    if (!heading) {
      return false;
    }
    if (heading.querySelector(interactiveSelector) || heading.closest(interactiveSelector)) {
      return false;
    }

    const ctas = Array.from(
      el.querySelectorAll("a[href], button, [role='link'], [role='button']"),
    ).filter((cta: any) => !isHidden(cta) && Boolean(accessibleName(cta, implicitRole(cta))));
    if (ctas.length !== 1) return false;

    const bodyTextElements = Array.from(el.querySelectorAll("p, span, div")).filter(
      (candidate: any) => standaloneCardBodyTextElement(candidate),
    );
    return bodyTextElements.length >= 1 && bodyTextElements.length <= 2;
  }

  function standaloneContentCardFor(el: any): any {
    let card = null;
    for (
      let current = el?.parentElement, depth = 0;
      current && depth < 8;
      current = current.parentElement, depth += 1
    ) {
      if (current === document.body || current === document.documentElement) break;
      if (current.matches?.("main, footer, header, nav, aside")) break;
      if (isStandaloneContentCard(current)) card = current;
    }
    return card;
  }

  function h2CardWithDecorativeMediaBeforeBodyFor(el: any): any {
    for (
      let current = el?.parentElement, depth = 0;
      current && depth < 8;
      current = current.parentElement, depth += 1
    ) {
      if (current === document.body || current === document.documentElement) break;
      if (current.matches?.("main, footer, header, nav, aside")) break;

      const heading = standaloneContentCardHeading(current, 2);
      if (!heading) continue;

      const headingTag = heading.tagName?.toLowerCase();
      const level =
        Number.parseInt(heading.getAttribute("aria-level") || headingTag.slice(1), 10) || 2;
      if (level !== 2) continue;

      const directChild = Array.from(current.children || []).find((child: any) =>
        child.contains(el),
      ) as any;
      if (!directChild || directChild === heading || heading.contains(directChild)) continue;
      if (!isFirstReadableStopWithin(directChild, el)) continue;

      const earlierSiblings = Array.from(current.children || []).slice(
        0,
        Array.from(current.children || []).indexOf(directChild),
      );
      const headingIndex = earlierSiblings.findIndex(
        (sibling: any) => sibling === heading || sibling.contains(heading),
      );
      if (headingIndex === -1) continue;

      const mediaAfterHeading = earlierSiblings
        .slice(headingIndex + 1)
        .some((sibling: any) => isDecorativeMediaOnlyContainer(sibling));
      if (mediaAfterHeading) return current;
    }

    return null;
  }

  function customHeadedTextCardFor(el: any): any | null {
    if (!isCustomElement(el)) return null;
    if (isHidden(el) || el.matches(interactiveSelector) || el.closest(interactiveSelector)) {
      return null;
    }
    if (el.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']")) return null;
    if (!normalize(accessibleName(el, "text") || directOwnText(el))) return null;

    for (
      let current = el?.parentElement, depth = 0;
      current && depth < 8;
      current = current.parentElement, depth += 1
    ) {
      if (current === document.body || current === document.documentElement) break;
      if (current.matches?.("footer, header, nav, aside, li, [role='listitem']")) break;
      if (current.matches?.(interactiveSelector) || current.querySelector?.(interactiveSelector)) {
        continue;
      }
      if (current.querySelector?.("ul, ol, table, [role='list'], [role='table'], [role='grid']")) {
        continue;
      }

      const headings = Array.from(
        current.querySelectorAll("h2, h3, h4, h5, h6, [role='heading']"),
      ).filter((heading: any) => !isHidden(heading) && Boolean(readableText(heading)));
      if (headings.length !== 1) continue;

      const heading = headings[0] as any;
      if (
        !(
          heading.compareDocumentPosition(el) &
          heading.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING
        )
      ) {
        continue;
      }

      const textLeaves = Array.from(current.querySelectorAll("*")).filter((candidate: any) => {
        if (candidate === current || isHidden(candidate)) return false;
        if (candidate.matches?.("h1, h2, h3, h4, h5, h6, [role='heading']")) return false;
        if (candidate.closest?.("h1, h2, h3, h4, h5, h6, [role='heading']")) return false;
        if (candidate.matches?.(interactiveSelector) || candidate.closest?.(interactiveSelector)) {
          return false;
        }
        if (candidate.querySelector?.("h1, h2, h3, h4, h5, h6, [role='heading']")) return false;
        if (!normalize(accessibleName(candidate, "text") || directOwnText(candidate))) return false;
        return !Array.from(candidate.children || []).some((child: any) =>
          normalize(accessibleName(child, "text") || directOwnText(child)),
        );
      });
      if (textLeaves.length < 1 || textLeaves.length > 2 || textLeaves[0] !== el) continue;

      return current;
    }

    return null;
  }

  function isCustomHeadedTextCardBody(el: any): boolean {
    return Boolean(customHeadedTextCardFor(el));
  }

  function isLeadingStandaloneCardGroupStop(el: any, role: string): boolean {
    if (!["heading", "paragraph", "text"].includes(role)) return false;
    const card = standaloneContentCardFor(el);
    if (!card) return false;
    if (
      role === "heading" &&
      (isAxUnconfirmedStandaloneContentCardHeading(card, el) ||
        isFirstHeadingAfterDecorativeMedia(card, el) ||
        isFirstStandaloneH3AfterDecorativeMedia(card, el) ||
        isFirstLabelledInfoCardH3AfterDecorativeMedia(card, el))
    ) {
      return false;
    }
    return isFirstReadableStopWithin(card, el);
  }

  function isAxUnconfirmedStandaloneContentCardHeading(card: any, el: any): boolean {
    if (!accessibilityNodes.length) return false;
    if (implicitRole(el) !== "heading") return false;
    if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector)) return false;
    if (standaloneContentCardHeading(card, 3) !== el || !isFirstReadableStopWithin(card, el)) {
      return false;
    }
    if (hasPrecedingHeadingSiblingInAncestorPath(el, card)) return false;
    if (isInHeadingIntroducedCardCollection(card)) return false;

    const axNode = axUnconfirmedWrapperNodeBetween(el, card);
    if (!axNode) return false;
    return true;
  }

  function hasPrecedingHeadingSiblingInAncestorPath(el: any, boundary: any): boolean {
    for (
      let current = el;
      current && current !== document.body && current !== document.documentElement;
      current = current.parentElement
    ) {
      const previous = previousVisibleElementSibling(current);
      if (previous) {
        if (implicitRole(previous) === "heading") return true;
        const previousHeading = soleReadableHeadingWithin(previous);
        if (previousHeading) return true;
        if (readableText(previous)) return false;
      }
      if (current === boundary) break;
    }
    return false;
  }

  function soleReadableHeadingWithin(el: any): any | null {
    if (!el || isHidden(el)) return null;
    const headings = Array.from(
      el.querySelectorAll?.("h1, h2, h3, h4, h5, h6, [role='heading']") || [],
    ).filter((heading: any) => !isHidden(heading) && Boolean(readableText(heading)));
    if (headings.length !== 1) return null;
    const heading = headings[0] as any;
    const text = normalize(readableText(el));
    const headingText = normalize(readableText(heading));
    return text && text === headingText ? heading : null;
  }

  function isInHeadingIntroducedCardCollection(card: any): boolean {
    for (
      let current = card;
      current && current !== document.body && current !== document.documentElement;
      current = current.parentElement
    ) {
      const previous = previousVisibleElementSibling(current);
      if (previous && soleReadableHeadingWithin(previous)) {
        const headings = Array.from(
          current.querySelectorAll?.("h2, h3, h4, h5, h6, [role='heading']") || [],
        ).filter((heading: any) => !isHidden(heading) && Boolean(readableText(heading)));
        if (headings.length >= 2) return true;
      }
      if (current.matches?.("main, footer, header, nav, aside")) break;
    }
    return false;
  }

  function axUnconfirmedWrapperNodeBetween(el: any, boundary: any): AccessibilityTreeNode | undefined {
    for (
      let current = el?.parentElement, depth = 0;
      current &&
        depth < 6 &&
        current !== document.body &&
        current !== document.documentElement;
      current = current.parentElement, depth += 1
    ) {
      const axNode = axNodeAnyForElement(current);
      if (axNode) {
        const axRole = normalizedAxRole(axNode.role);
        if (
          (axNode.ignored || axRole === "generic" || axRole === "none") &&
          !normalize(axNode.name) &&
          axNode.properties?.focusable !== true
        ) {
          return axNode;
        }
      }
      if (current === boundary) break;
    }
    return undefined;
  }

  function isFirstHeadingAfterDecorativeMedia(card: any, el: any): boolean {
    if (implicitRole(el) !== "heading") return false;
    if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector)) return false;
    if (!isFirstReadableStopWithin(card, el)) return false;
    return hasPrecedingDecorativeMediaSiblingInAncestorPath(el);
  }

  function isFirstLabelledInfoCardH3AfterDecorativeMedia(card: any, el: any): boolean {
    if (implicitRole(el) !== "heading") return false;
    const tag = el.tagName?.toLowerCase();
    const level = Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2;
    if (level !== 3) return false;
    if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector)) return false;
    if (!isFirstReadableStopWithin(card, el)) return false;

    const region = el.closest(
      "section[aria-label], section[aria-labelledby], [role='region'][aria-label], [role='region'][aria-labelledby]",
    );
    if (!region || isHidden(region) || region.matches?.(interactiveSelector)) return false;
    if (implicitRole(region) !== "region" || !accessibleName(region, "region")) return false;
    if (!region.contains(card) && !card.contains(region)) return false;
    if (region.querySelector("ul, ol, table, form, [role='list'], [role='table'], [role='grid']")) {
      return false;
    }

    const headings = Array.from(
      region.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']"),
    ).filter((heading: any) => !isHidden(heading) && Boolean(readableText(heading)));
    if (headings.length !== 1 || headings[0] !== el) return false;

    const actions = Array.from(
      region.querySelectorAll("a[href], button, [role='link'], [role='button']"),
    ).filter((action: any) => !isHidden(action) && Boolean(accessibleName(action, implicitRole(action))));
    if (actions.length !== 1) return false;

    const bodyTextElements = Array.from(region.querySelectorAll("p, span, div")).filter(
      (candidate: any) => standaloneCardBodyTextElement(candidate),
    );
    if (bodyTextElements.length < 1 || bodyTextElements.length > 2) return false;

    return hasPrecedingDecorativeHiddenMediaSiblingInAncestorPath(el, region);
  }

  function isFirstStandaloneH3AfterDecorativeMedia(card: any, el: any): boolean {
    if (implicitRole(el) !== "heading") return false;
    const tag = el.tagName?.toLowerCase();
    const level = Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2;
    if (level !== 3) return false;
    if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector)) return false;
    if (!isFirstReadableStopWithin(card, el)) return false;

    return hasPrecedingDecorativeMediaSiblingInAncestorPath(el);
  }

  function hasPrecedingDecorativeHiddenMediaSiblingInAncestorPath(el: any, boundary: any): boolean {
    for (
      let current = el;
      current && current !== document.body && current !== document.documentElement;
      current = current.parentElement
    ) {
      const previous = previousVisibleElementSibling(current);
      if (previous && isDecorativeHiddenMediaOnlyContainer(previous)) return true;
      if (previous && readableText(previous)) return false;
      if (current === boundary) return false;
      if (current.matches?.("main, footer, header, nav, aside, li, [role='listitem']")) {
        return false;
      }
    }
    return false;
  }

  function hasPrecedingDecorativeMediaSiblingInAncestorPath(el: any): boolean {
    for (
      let current = el;
      current && current !== document.body && current !== document.documentElement;
      current = current.parentElement
    ) {
      const previous = previousVisibleElementSibling(current);
      if (previous && isDecorativeMediaOnlyContainer(previous)) return true;
      if (previous && readableText(previous)) return false;
      if (current.matches?.("main, footer, header, nav, aside, li, [role='listitem']")) {
        return false;
      }
    }
    return false;
  }

  function isDecorativeHiddenMediaOnlyContainer(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.matches(interactiveSelector) || el.querySelector(interactiveSelector)) return false;
    if (readableText(el)) return false;
    return Boolean(
      el.querySelector(
        "img[aria-hidden='true'], svg[aria-hidden='true'], [role='presentation'], [aria-hidden='true'][role='img']",
      ),
    );
  }

  function isPostHeadingMediaCardGroupStop(el: any, role: string): boolean {
    if (!["paragraph", "text"].includes(role)) return false;
    return Boolean(h2CardWithDecorativeMediaBeforeBodyFor(el));
  }

  function firstReadableStopWithin(el: any): any | null {
    const nodeFilter = el.ownerDocument?.defaultView?.NodeFilter || document.defaultView?.NodeFilter;
    if (!nodeFilter) return null;
    const walker = document.createTreeWalker(
      el,
      nodeFilter.SHOW_ELEMENT,
    );
    let node: any;
    while ((node = walker.nextNode())) {
      if (node === el || isHidden(node)) continue;
      const role = implicitRole(node);
      if (
        [
          "heading",
          "paragraph",
          "text",
          "button",
          "link",
          "image",
          "textbox",
          "searchbox",
          "combobox",
        ].includes(role) &&
        readableStopText(node, role)
      ) {
        return node;
      }
    }
    return null;
  }

  function genericDecorativeTextCardFor(el: any): any {
    for (
      let current = el?.parentElement, depth = 0;
      current && depth < 5;
      current = current.parentElement, depth += 1
    ) {
      if (current === document.body || current === document.documentElement) break;
      if (current.matches?.("main, footer, header, nav, aside, li, [role='listitem']")) break;
      if (current.getAttribute("role") || accessibleName(current, "group")) continue;
      if (current.querySelector(interactiveSelector)) continue;
      if (current.querySelector("h1, h2, h3, h4, h5, h6, [role='heading'], ul, ol, table, [role='list'], [role='table'], [role='grid']")) {
        continue;
      }

      const readableStops = Array.from(current.querySelectorAll("p, span, div")).filter(
        (candidate: any) => {
          if (candidate === current || isHidden(candidate)) return false;
          const role = implicitRole(candidate);
          return ["paragraph", "text"].includes(role) && Boolean(readableStopText(candidate, role));
        },
      );
      if (readableStops.length !== 1 || readableStops[0] !== el) continue;
      if (firstReadableStopWithin(current) !== el) continue;

      const decorativeMedia = Array.from(
        current.querySelectorAll("img[alt=''], img[role='presentation'], svg[aria-hidden='true'], [role='presentation']"),
      ).filter((candidate: any) => !isHidden(candidate));
      if (decorativeMedia.length < 1) continue;

      const parent = current.parentElement;
      const previousCollectionSibling = parent ? previousVisibleElementSibling(parent) : null;
      if (previousCollectionSibling && implicitRole(previousCollectionSibling) === "heading") {
        continue;
      }
      if (!hasPrecedingFeatureList(parent)) continue;
      const siblingCards = Array.from(parent?.children || []).filter((sibling: any) => {
        if (sibling === current || isHidden(sibling)) return false;
        if (sibling.getAttribute?.("role") || accessibleName(sibling, "group")) return false;
        if (sibling.querySelector?.(interactiveSelector)) return false;
        return Boolean(
          sibling.querySelector?.("img[alt=''], img[role='presentation'], svg[aria-hidden='true'], [role='presentation']") &&
            readableText(sibling),
        );
      });
      if (siblingCards.length < 2) continue;

      return current;
    }

    return null;
  }

  function hasPrecedingFeatureList(el: any): boolean {
    for (
      let current = el, depth = 0;
      current && depth < 5;
      current = current.parentElement, depth += 1
    ) {
      if (current === document.body || current === document.documentElement) break;
      const previous = previousVisibleElementSibling(current);
      if (!previous) continue;
      if (implicitRole(previous) === "list") return true;
      if (previous.querySelector?.("ul, ol, [role='list']")) return true;
    }
    return false;
  }

  function isLeadingDecorativeTextCardGroupStop(el: any, role: string): boolean {
    if (!["paragraph", "text"].includes(role)) return false;
    return Boolean(genericDecorativeTextCardFor(el));
  }

  function hasSingleSemanticListItemChild(el: any): boolean {
    if (!isListItem(el)) return false;
    if (directOwnText(el)) return false;
    if (hasDirectNonSemanticTextChild(el)) return false;
    const children = directSemanticChildren(el);
    if (children.length !== 1) return false;
    const role = implicitRole(children[0]);
    return isContextRole(children[0], role) || role === "group";
  }

  function hasNativeDetailsListItemContent(el: any): boolean {
    if (!isListItem(el)) return false;
    if (directOwnText(el)) return false;
    const visibleChildren = Array.from(el.children || []).filter(
      (child: any) => !isHidden(child),
    );
    return (
      visibleChildren.length === 1 &&
      visibleChildren[0].tagName?.toLowerCase() === "details" &&
      Boolean(directSummaryChild(visibleChildren[0]))
    );
  }

  function splitListItemTextBlocks(el: any): any[] {
    if (!isListItem(el) || el.querySelector(interactiveSelector)) return [];
    return Array.from(el.querySelectorAll("span, div, p")).filter((candidate: any) => {
      if (isHidden(candidate)) return false;
      if (candidate.querySelector(interactiveSelector)) return false;
      if (!directOwnText(candidate)) return false;
      return !Array.from(candidate.children || []).some(
        (child: any) => !isHidden(child) && Boolean(readableText(child)),
      );
    });
  }

  function hasSplitTextListItemContent(el: any): boolean {
    if (!isListItem(el)) return false;
    return splitListItemTextBlocks(el).length > 1;
  }

  function isSplitTextListItemBlock(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    const listItem = el.closest("li,[role='listitem']");
    return splitListItemTextBlocks(listItem).includes(el);
  }

  function isExpandedRegionBodyText(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (!["span", "div", "p", "strong", "em", "b", "i"].includes(el.tagName.toLowerCase())) {
      return false;
    }
    if (el.querySelector(interactiveSelector)) return false;
    if (!directOwnText(el)) return false;

    const region = el.closest("[role='region']");
    if (!region || region === el || isHidden(region)) return false;
    if (region.getAttribute("aria-hidden") === "true") return false;

    const labelledBy = region.getAttribute("aria-labelledby");
    const labelElement = labelledBy ? resolveIdRef(labelledBy) : null;
    const controller = labelElement?.matches?.("[aria-expanded]")
      ? labelElement
      : labelElement?.querySelector?.("[aria-expanded]");
    const controlsRegion =
      !region.id || controller?.getAttribute?.("aria-controls") === region.id;

    if (controller?.getAttribute?.("aria-expanded") !== "true" || !controlsRegion) {
      return false;
    }

    if (["strong", "em", "b", "i"].includes(el.tagName.toLowerCase())) {
      return true;
    }

    return !Array.from(el.children || []).some(
      (child: any) =>
        !isHidden(child) &&
        Boolean(readableText(child)) &&
        !child.matches?.(`${interactiveSelector}, strong, em, b, i`),
    );
  }

  function expandedControlledRegionFor(el: any): any | undefined {
    const region = el?.closest?.("[role='region']");
    if (!region || region === el || isHidden(region)) return undefined;
    if (region.getAttribute("aria-hidden") === "true") return undefined;

    const labelledBy = region.getAttribute("aria-labelledby");
    const labelElement = labelledBy ? resolveIdRef(labelledBy) : null;
    const controller = labelElement?.matches?.("[aria-expanded]")
      ? labelElement
      : labelElement?.querySelector?.("[aria-expanded]");
    const controlsRegion =
      !region.id || controller?.getAttribute?.("aria-controls") === region.id;

    if (controller?.getAttribute?.("aria-expanded") !== "true" || !controlsRegion) {
      return undefined;
    }

    return region;
  }

  function expandedRegionInlineLinkFragments(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (!["div", "p"].includes(el.tagName.toLowerCase())) return undefined;
    if (!expandedControlledRegionFor(el)) return undefined;

    const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) => !isHidden(link),
    );
    if (links.length !== 1) return undefined;
    const link = links[0] as any;

    const before: string[] = [];
    const after: string[] = [];
    let sawLink = false;

    function collect(node: any): void {
      if (!node) return;
      if (node === link) {
        sawLink = true;
        return;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const text = normalize(node.textContent);
        if (text) (sawLink ? after : before).push(text);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (node.matches(interactiveSelector)) return;
      for (const child of Array.from(node.childNodes)) collect(child);
    }

    for (const child of Array.from(el.childNodes)) collect(child);

    const beforeText = normalize(before.join(" "));
    const linkName = accessibleName(link, "link");
    const afterText = normalize(after.join(" "));
    if (!beforeText || !linkName || !afterText) return undefined;

    return [beforeText, `link, ${linkName}`, afterText];
  }

  function fieldsetPromptText(el: any): string | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName?.toLowerCase() !== "fieldset") return undefined;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return undefined;
    if (el.querySelector(":scope > legend")) return undefined;

    const label = Array.from(el.children || []).find(
      (child: any) =>
        child.tagName?.toLowerCase() === "label" &&
        !isHidden(child) &&
        Boolean(readableText(child)),
    ) as any;
    if (!label) return undefined;

    if (!hasInteractiveDescendantAcrossShadowContent(el)) return undefined;

    return readableText(label);
  }

  function fieldsetLegendText(el: any): string | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName?.toLowerCase() !== "fieldset") return undefined;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return undefined;
    const legend = Array.from(el.children || []).find(
      (child: any) => child.tagName?.toLowerCase() === "legend" && !isHidden(child),
    ) as any;
    return legend ? readableText(legend) : undefined;
  }

  function checkboxFieldsetLegendText(el: any): string | undefined {
    const legend = fieldsetLegendText(el);
    if (!legend) return undefined;
    const checkboxes = Array.from(
      el.querySelectorAll("input[type='checkbox'], [role='checkbox']"),
    ).filter((checkbox: any) => !isHidden(checkbox));
    return checkboxes.length ? legend : undefined;
  }

  function hasInteractiveDescendantAcrossShadowContent(el: any): boolean {
    function visit(node: any): boolean {
      if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return false;
      if (node !== el && node.matches?.(interactiveSelector)) return true;
      for (const child of Array.from(node.children || [])) {
        if (visit(child)) return true;
      }
      for (const child of shadowContentChildren(node)) {
        if (visit(child)) return true;
      }
      return false;
    }

    return visit(el);
  }

  function isAnonymousShadowPromptFieldsetHost(el: any): boolean {
    if (!isCustomElement(el)) return false;
    if (accessibleName(el, "group")) return false;
    const meaningfulChildren = shadowContentChildren(el).filter(
      (child: any) => !isHidden(child) && !["style", "script"].includes(child.tagName?.toLowerCase()),
    );
    return (
      meaningfulChildren.length === 1 &&
      Boolean(fieldsetPromptText(meaningfulChildren[0]))
    );
  }

  function inlineTextLinkFragments(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName.toLowerCase() !== "div") return undefined;
    if (
      el.getAttribute("role") ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.closest(interactiveSelector)
    ) {
      return undefined;
    }

    const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) => !isHidden(link),
    );
    if (links.length !== 1) return undefined;
    const link = links[0] as any;

    const elementChildren = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (
      elementChildren.some((child: any) => {
        if (child === link) return false;
        if (child.contains?.(link)) return false;
        if (child.matches?.(interactiveSelector)) return true;
        if (child.querySelector?.(interactiveSelector)) return true;
        return Boolean(implicitRole(child) || readableText(child));
      })
    ) {
      return undefined;
    }

    const before: string[] = [];
    const after: string[] = [];
    let sawLink = false;

    for (const child of Array.from(el.childNodes || [])) {
      if (child === link || (child.nodeType === Node.ELEMENT_NODE && child.contains?.(link))) {
        sawLink = true;
        continue;
      }
      if (child.nodeType !== Node.TEXT_NODE) continue;
      const text = normalize(child.textContent);
      if (text) (sawLink ? after : before).push(text);
    }

    const beforeText = normalize(before.join(" "));
    const linkName = accessibleName(link, "link");
    const afterText = normalize(after.join(" "));
    if (!beforeText || !linkName) return undefined;

    return [
      beforeText,
      `link, ${linkName}`,
      afterText && /[\p{L}\p{N}]/u.test(afterText) ? afterText : undefined,
    ].filter((fragment): fragment is string => Boolean(fragment));
  }

  function plainTextTrailingLinkParagraphFragments(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName.toLowerCase() !== "p") return undefined;
    if (
      el.getAttribute("role") ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.closest(interactiveSelector) ||
      el.closest("li,[role='listitem']") ||
      expandedControlledRegionFor(el)
    ) {
      return undefined;
    }

    const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) => !isHidden(link),
    );
    if (links.length !== 1) return undefined;
    const link = links[0] as any;
    if (link.parentElement !== el) return undefined;

    const elementChildren = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (elementChildren.some((child: any) => child !== link)) return undefined;

    const before: string[] = [];
    const after: string[] = [];
    let sawLink = false;
    for (const child of Array.from(el.childNodes || [])) {
      if (child === link) {
        sawLink = true;
        continue;
      }
      if (child.nodeType !== Node.TEXT_NODE) return undefined;
      const text = normalize(child.textContent);
      if (text) (sawLink ? after : before).push(text);
    }

    const beforeText = normalize(before.join(" "));
    const afterText = normalize(after.join(" "));
    const linkName = accessibleName(link, "link");
    if (!beforeText || !linkName) return undefined;
    if (afterText && /[\p{L}\p{N}]/u.test(afterText)) return undefined;

    return [beforeText, `link, ${linkName}`];
  }

  function directAxInlineAbbrSupParagraphFragments(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName.toLowerCase() !== "p") return undefined;
    if (
      el.getAttribute("role") ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.closest(interactiveSelector) ||
      el.closest("li,[role='listitem']") ||
      expandedControlledRegionFor(el) ||
      !accessibilityNodes.length
    ) {
      return undefined;
    }

    const directElements = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (!directElements.length) return undefined;
    if (
      directElements.some((child: any) => {
        const tag = child.tagName?.toLowerCase();
        if (tag === "a" && child.hasAttribute("href")) return false;
        if (tag === "abbr" && normalize(child.getAttribute("title"))) return false;
        if (tag === "sup") return false;
        if (tag === "br") return false;
        return true;
      })
    ) {
      return undefined;
    }

    const links = directElements.filter((child: any) => implicitRole(child) === "link");
    const abbrs = directElements.filter((child: any) => child.tagName?.toLowerCase() === "abbr");
    const superscripts = directElements.filter((child: any) => child.tagName?.toLowerCase() === "sup");
    const lineBreaks = directElements.filter((child: any) => child.tagName?.toLowerCase() === "br");
    if (links.length < 2 || abbrs.length !== 1 || superscripts.length !== 1 || !lineBreaks.length) {
      return undefined;
    }

    const paragraphAxNode = axNodeForElementRole(el, "paragraph");
    const axChildren = axChildNodes(paragraphAxNode);
    if (!paragraphAxNode || !axChildren.length) return undefined;
    const axRoles = axChildren.map((node) => normalizedAxRole(node.role));
    if (
      axRoles.filter((role) => role === "link").length < 2 ||
      !axRoles.includes("linebreak") ||
      !axRoles.includes("abbr") ||
      !axRoles.includes("superscript")
    ) {
      return undefined;
    }
    if (
      links.some((link: any) => !axNodeForElementRole(link, "link")) ||
      abbrs.some((abbr: any) => !axNodeForElementRole(abbr, "abbr")) ||
      superscripts.some((sup: any) => !axNodeForElementRole(sup, "superscript")) ||
      lineBreaks.some((br: any) => !axNodeForElementRole(br, "linebreak"))
    ) {
      return undefined;
    }

    const fragments: string[] = [];
    let sawLink = false;
    let sawAbbrGroup = false;
    let sawSuperscript = false;

    function pushText(value?: string): void {
      const text = normalize(value);
      if (text && /[\p{L}\p{N}]/u.test(text)) {
        fragments.push(text);
      }
    }

    for (const child of Array.from(el.childNodes || [])) {
      if (child.nodeType === Node.TEXT_NODE) {
        pushText(child.textContent || "");
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) {
        continue;
      }

      const tag = child.tagName?.toLowerCase();
      if (tag === "br") {
        continue;
      }
      if (tag === "a" && implicitRole(child) === "link") {
        const linkName = accessibleName(child, "link");
        if (!linkName) return undefined;
        fragments.push(`link, ${linkName}`);
        sawLink = true;
        continue;
      }
      if (tag === "abbr") {
        const abbrTitle =
          normalize(axNodeForElementRole(child, "abbr")?.name) ||
          normalize(child.getAttribute("title"));
        const abbrText = readableText(child);
        if (!abbrTitle || !abbrText) return undefined;
        fragments.push(`${abbrTitle}, group`, abbrText, `end of, ${abbrTitle}, group`);
        sawAbbrGroup = true;
        continue;
      }
      if (tag === "sup") {
        const supText = readableText(child);
        if (!supText) return undefined;
        fragments.push(supText);
        sawSuperscript = true;
        continue;
      }

      return undefined;
    }

    return sawLink && sawAbbrGroup && sawSuperscript && fragments.length >= 6
      ? fragments
      : undefined;
  }

  function directAxInlineTextLinkParagraphFragments(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName.toLowerCase() !== "p") return undefined;
    if (
      el.getAttribute("role") ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.closest(interactiveSelector) ||
      el.closest("li,[role='listitem']") ||
      expandedControlledRegionFor(el) ||
      !accessibilityNodes.length
    ) {
      return undefined;
    }

    const directElements = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (!directElements.length) return undefined;
    if (
      directElements.some((child: any) => {
        const tag = child.tagName?.toLowerCase();
        if (tag === "a" && child.hasAttribute("href")) return false;
        if (["strong", "b", "em", "i"].includes(tag)) {
          return Array.from(child.querySelectorAll(interactiveSelector)).some(
            (descendant: any) => implicitRole(descendant) !== "link",
          );
        }
        return true;
      })
    ) {
      return undefined;
    }

    const paragraphAxNode = axNodeForElementRole(el, "paragraph");
    const axChildren = axChildNodes(paragraphAxNode);
    if (!paragraphAxNode || !axChildren.length) return undefined;

    const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) => !isHidden(link),
    );
    if (links.length < 1) return undefined;
    if (links.length === 1 && el.closest("article,[role='article']")) return undefined;
    if (links.some((link: any) => !axNodeForElementRole(link, "link"))) {
      return undefined;
    }

    const axLinkCount = axChildren.filter(
      (node) => normalizedAxRole(node.role) === "link",
    ).length;

    function axDescendantLinkCount(node: AccessibilityTreeNode): number {
      const role = normalizedAxRole(node.role);
      if (role === "link") return 1;
      return axChildNodes(node).reduce(
        (count, child) => count + axDescendantLinkCount(child),
        0,
      );
    }

    const flattenedAxLinkCount = axChildren.reduce(
      (count, child) => count + axDescendantLinkCount(child),
      0,
    );
    if (flattenedAxLinkCount !== links.length) return undefined;

    function isPunctuationOnlyStaticText(node?: AccessibilityTreeNode): boolean {
      if (normalizedAxRole(node?.role) !== "statictext") return false;
      const text = normalize(node?.name);
      return Boolean(text && !/[\p{L}\p{N}]/u.test(text));
    }

    function isFocusableAxLink(node?: AccessibilityTreeNode): boolean {
      return normalizedAxRole(node?.role) === "link" && node?.properties?.focusable === true;
    }

    function isDirectAxOneLinkParagraphShape(): boolean {
      if (links.length !== 1 || directElements.length !== 1) return false;

      const onlyElement = directElements[0] as any;
      const onlyTag = onlyElement.tagName?.toLowerCase();
      const axRoles = axChildren.map((node) => normalizedAxRole(node.role));

      if (onlyElement === links[0]) {
        const linkIndex = axRoles.findIndex((role) => role === "link");
        if (linkIndex < 0 || !isFocusableAxLink(axChildren[linkIndex])) return false;
        if (axRoles.some((role) => role !== "statictext" && role !== "link")) return false;
        if (axRoles.filter((role) => role === "link").length !== 1) return false;

        return axChildren.some((node) => {
          if (normalizedAxRole(node.role) !== "statictext") return false;
          return /[\p{L}\p{N}]/u.test(normalize(node.name) || "");
        });
      }

      if (!["strong", "b", "em", "i"].includes(onlyTag)) return false;
      if (
        axRoles.length === 3 &&
        axRoles[0] === "statictext" &&
        ["strong", "emphasis"].includes(axRoles[1] || "") &&
        isPunctuationOnlyStaticText(axChildren[2])
      ) {
        const wrappedChildren = axChildNodes(axChildren[1]);
        return wrappedChildren.length === 1 && isFocusableAxLink(wrappedChildren[0]);
      }

      if (axRoles.length !== 2 || axRoles[0] !== "statictext") return false;
      if (!["strong", "emphasis"].includes(axRoles[1] || "")) return false;

      const wrappedChildren = axChildNodes(axChildren[1]);
      const wrappedRoles = wrappedChildren.map((node) => normalizedAxRole(node.role));
      return (
        wrappedRoles.length === 3 &&
        wrappedRoles[0] === "statictext" &&
        wrappedRoles[1] === "link" &&
        isPunctuationOnlyStaticText(wrappedChildren[2])
      );
    }

    if (links.length === 1) {
      if (!isDirectAxOneLinkParagraphShape()) return undefined;
    } else if (axLinkCount !== links.length) {
      return undefined;
    }

    if (
      axLinkCount === 2 &&
      axChildren.some((node, index) => {
        if (normalizedAxRole(node.role) !== "statictext") return false;
        if (normalize(node.name)?.toLowerCase() !== "or") return false;
        return (
          normalizedAxRole(axChildren[index - 1]?.role) === "link" &&
          normalizedAxRole(axChildren[index + 1]?.role) === "link"
        );
      })
    ) {
      return undefined;
    }

    function elementHeadingLevel(heading: any): number | undefined {
      const tag = heading?.tagName?.toLowerCase?.() || "";
      if (/^h[1-6]$/.test(tag)) {
        return Number.parseInt(tag.slice(1), 10);
      }
      if (heading?.getAttribute?.("role") === "heading") {
        const level = Number.parseInt(heading.getAttribute("aria-level") || "", 10);
        return Number.isFinite(level) ? level : undefined;
      }
      return undefined;
    }

    function axHeadingLevel(heading: any): number | undefined {
      const axNode = axNodeForElementRole(heading, "heading");
      const level = axNode?.properties?.level;
      if (typeof level === "number") return level;
      if (typeof level === "string") {
        const parsed = Number.parseInt(level, 10);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    }

    function previousVisibleElementSibling(node: any): any | undefined {
      for (let sibling = node?.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
        if (!isHidden(sibling)) return sibling;
      }
      return undefined;
    }

    function isLeadParagraphAfterLevelOneHeading(): boolean {
      if (directElements.length !== 3) return false;
      if (el.closest("article,[role='article'],aside,footer,nav")) return false;

      const previous = previousVisibleElementSibling(el);
      if (!previous) return false;
      if (elementHeadingLevel(previous) !== 1) return false;
      return axHeadingLevel(previous) === 1;
    }

    function shouldCompactLeadParagraphConjunction(
      index: number,
      text: string,
    ): boolean {
      if (text !== ", and") return false;
      if (!isLeadParagraphAfterLevelOneHeading()) return false;
      return (
        normalizedAxRole(axChildren[index - 1]?.role) === "link" &&
        normalizedAxRole(axChildren[index + 1]?.role) === "link"
      );
    }

    const fragments: string[] = [];
    let disallowedAxChild = false;

    const shortLeadingText = normalize(axChildren[0]?.name);
    const oneLinkName = normalize(axChildren[1]?.name);
    const oneLinkTrailingText = normalize(axChildren[2]?.name);
    const shouldJoinShortServiceActionStaticText =
      links.length === 1 &&
      directElements.length === 1 &&
      directElements[0] === links[0] &&
      shortLeadingText &&
      shortLeadingText.length < 12 &&
      normalizedAxRole(axChildren[0]?.role) === "statictext" &&
      normalizedAxRole(axChildren[1]?.role) === "link" &&
      normalizedAxRole(axChildren[2]?.role) === "statictext" &&
      Boolean(oneLinkName?.match(/^[a-z]/u)) &&
      Boolean(oneLinkName?.match(/\band\b/u)) &&
      Boolean(oneLinkTrailingText?.match(/^[\p{L}\p{N}]/u)) &&
      !oneLinkTrailingText?.endsWith(":");

    if (shouldJoinShortServiceActionStaticText) {
      const combinedText = normalize(`${shortLeadingText || ""} ${oneLinkTrailingText || ""}`);
      return [combinedText, oneLinkName ? `link, ${oneLinkName}` : undefined].filter(
        (fragment): fragment is string => Boolean(fragment),
      );
    }

    function pushAxChild(child: AccessibilityTreeNode, index: number): void {
      const role = normalizedAxRole(child.role);
      if (role === "link") {
        const linkName = normalizeAnnouncementLabel(child.name);
        if (!linkName) {
          disallowedAxChild = true;
          return;
        }
        fragments.push(`link, ${linkName}`);
        return;
      }
      if (role === "strong" || role === "emphasis") {
        for (const descendant of axChildNodes(child)) {
          pushAxChild(descendant, index);
          if (disallowedAxChild) return;
        }
        return;
      }
      if (role !== "statictext") {
        disallowedAxChild = true;
        return;
      }

      const text = normalize(child.name);
      if (!text || !/[\p{L}\p{N}]/u.test(text)) return;
      fragments.push(shouldCompactLeadParagraphConjunction(index, text) ? ",and" : text);
    }

    for (const [index, child] of axChildren.entries()) {
      pushAxChild(child, index);
      if (disallowedAxChild) return undefined;
    }

    return fragments.length > links.length ? fragments : undefined;
  }

  function footerInlineBoundaryParagraphFragments(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName.toLowerCase() !== "p") return undefined;
    if (
      el.getAttribute("role") ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.closest(interactiveSelector) ||
      el.closest("li,[role='listitem']") ||
      expandedControlledRegionFor(el) ||
      !el.closest("footer,[role='contentinfo']") ||
      !accessibilityNodes.length
    ) {
      return undefined;
    }

    const directElements = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (!directElements.length) return undefined;
    if (
      directElements.some((child: any) => {
        const tag = child.tagName?.toLowerCase();
        if (tag === "a" && child.hasAttribute("href")) return false;
        if (tag === "br") return false;
        if (["strong", "b", "em", "i"].includes(tag)) {
          return Boolean(child.querySelector?.(interactiveSelector));
        }
        return true;
      })
    ) {
      return undefined;
    }

    const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) => !isHidden(link),
    );
    if (!links.length) return undefined;
    if (links.some((link: any) => !axNodeForElementRole(link, "link"))) {
      return undefined;
    }

    const paragraphAxNode = axNodeForElementRole(el, "paragraph");
    const axChildren = axChildNodes(paragraphAxNode);
    if (!paragraphAxNode || !axChildren.length) return undefined;

    const hasBoundaryElement = directElements.some((child: any) =>
      ["br", "strong", "b", "em", "i"].includes(child.tagName?.toLowerCase()),
    );
    if (!hasBoundaryElement) return undefined;

    const axLinkCount = axChildren.filter(
      (node) => normalizedAxRole(node.role) === "link",
    ).length;
    if (axLinkCount !== links.length) return undefined;

    const axRoles = axChildren.map((node) => normalizedAxRole(node.role));
    if (
      axRoles.some(
        (role) =>
          !["statictext", "link", "linebreak", "strong", "emphasis"].includes(role || ""),
      )
    ) {
      return undefined;
    }

    function isPunctuationOnlyStaticText(node?: AccessibilityTreeNode): boolean {
      if (normalizedAxRole(node?.role) !== "statictext") return false;
      const text = normalize(node?.name);
      return Boolean(text && !/[\p{L}\p{N}]/u.test(text));
    }

    if (!axChildren.some((node) => isPunctuationOnlyStaticText(node))) {
      return undefined;
    }

    const fragments: string[] = [];
    let disallowedAxChild = false;
    let emittedLink = false;

    function pushStaticText(value?: string): void {
      const text = normalize(value);
      if (text && /[\p{L}\p{N}]/u.test(text)) {
        fragments.push(text);
      }
    }

    function pushAxChild(child: AccessibilityTreeNode): void {
      const role = normalizedAxRole(child.role);
      if (role === "linebreak") return;
      if (role === "link") {
        const linkName = normalizeAnnouncementLabel(child.name);
        if (!linkName) {
          disallowedAxChild = true;
          return;
        }
        fragments.push(`link, ${linkName}`);
        emittedLink = true;
        return;
      }
      if (role === "strong" || role === "emphasis") {
        const children = axChildNodes(child);
        if (
          !children.length ||
          children.some((descendant) => normalizedAxRole(descendant.role) !== "statictext")
        ) {
          disallowedAxChild = true;
          return;
        }
        for (const descendant of children) pushStaticText(descendant.name);
        return;
      }
      if (role !== "statictext") {
        disallowedAxChild = true;
        return;
      }
      pushStaticText(child.name);
    }

    for (const child of axChildren) {
      pushAxChild(child);
      if (disallowedAxChild) return undefined;
    }

    return emittedLink && fragments.length > links.length ? fragments : undefined;
  }

  function footerInlineBoundaryTextFragments(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    const tag = el.tagName.toLowerCase();
    if (!["span", "div", "small"].includes(tag)) return undefined;
    if (isFooterLicenseBoilerplateTextContainer(el)) return undefined;
    if (
      el.getAttribute("role") ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.closest(interactiveSelector) ||
      el.closest("li,[role='listitem']") ||
      expandedControlledRegionFor(el) ||
      !el.closest("footer,[role='contentinfo']") ||
      !accessibilityNodes.length
    ) {
      return undefined;
    }

    const axNode = axNodeForElement(el);
    const axChildren = axChildNodes(axNode);
    if (!axNode || !axChildren.length) return undefined;

    const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) => !isHidden(link),
    );
    if (!links.length) return undefined;
    if (links.some((link: any) => !axNodeForElementRole(link, "link"))) return undefined;

    const axLinkCount = axChildren.filter(
      (node) => normalizedAxRole(node.role) === "link",
    ).length;
    if (axLinkCount !== links.length) return undefined;
    if (
      axChildren.some((node) => {
        const role = normalizedAxRole(node.role);
        return role !== "statictext" && role !== "link";
      })
    ) {
      return undefined;
    }

    const fragments: string[] = [];
    let linkCount = 0;

    for (const child of Array.from(el.childNodes || [])) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = normalize(child.textContent || "");
        if (text && /[\p{L}\p{N}]/u.test(text)) fragments.push(text);
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) {
        continue;
      }

      const childTag = child.tagName?.toLowerCase();
      if (childTag === "br") continue;
      if (childTag === "a" && child.hasAttribute("href")) {
        const axLinkName = normalize(axNodeForElementRole(child, "link")?.name);
        const linkName = axLinkName || accessibleName(child, "link") || readableText(child);
        const normalizedLinkName = normalizeAnnouncementLabel(linkName);
        if (!normalizedLinkName) return undefined;
        fragments.push(`link, ${normalizedLinkName}`);
        linkCount += 1;
        continue;
      }

      return undefined;
    }

    if (!linkCount || fragments.length <= linkCount) return undefined;
    return fragments.some((fragment) => !fragment.startsWith("link, "))
      ? fragments
      : undefined;
  }

  function isFooterLicenseBoilerplateTextContainer(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    const footer = el.closest("footer,[role='contentinfo']");
    if (!footer) return false;
    if (footer.querySelector("[data-sr-marker-content]")) return false;
    const text = normalize(readableText(el));
    if (!/^All content is available under the Open Government Licence v3\.0, except where otherwise stated$/i.test(text || "")) {
      return false;
    }
    return Array.from(el.querySelectorAll("a[href], [role='link']")).some((link: any) =>
      /open-government-licence|open government licence/i.test(
        `${link.getAttribute?.("href") || ""} ${accessibleName(link, "link") || readableText(link) || ""}`,
      ),
    );
  }

  function articleInlineTextLinkFragments(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName.toLowerCase() !== "p") return undefined;
    if (
      el.getAttribute("role") ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.closest(interactiveSelector) ||
      el.closest("li,[role='listitem']") ||
      expandedControlledRegionFor(el)
    ) {
      return undefined;
    }

    const article = el.closest("article,[role='article']");
    if (!article || isHidden(article)) return undefined;
    if (!isSiblingArticleCollectionItem(article)) return undefined;

    const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) => !isHidden(link),
    );
    if (links.length < 2) return undefined;

    const inlineSemanticSelector = "strong, b, em, i, code, time";
    const fragments: string[] = [];
    let plainText = "";
    let disallowed = false;
    let sawLink = false;

    function flushPlainText(): void {
      const text = normalize(plainText);
      if (text) {
        if (/[\p{L}\p{N}]/u.test(text)) {
          fragments.push(text);
        }
      }
      plainText = "";
    }

    for (const child of Array.from(el.childNodes || [])) {
      if (child.nodeType === Node.TEXT_NODE) {
        plainText = `${plainText}${child.textContent || ""}`;
        continue;
      }

      if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) {
        continue;
      }

      if (child.matches?.("[aria-hidden='true']")) {
        continue;
      }

      if (child.matches?.(interactiveSelector)) {
        if (implicitRole(child) !== "link") {
          disallowed = true;
          break;
        }
        flushPlainText();
        const linkName = accessibleName(child, "link");
        if (!linkName) {
          disallowed = true;
          break;
        }
        fragments.push(`link, ${linkName}`);
        sawLink = true;
        continue;
      }

      if (child.matches?.(inlineSemanticSelector) && !child.querySelector?.(interactiveSelector)) {
        flushPlainText();
        const text = readableText(child);
        if (text) {
          fragments.push(text);
        }
        continue;
      }

      disallowed = true;
      break;
    }

    flushPlainText();

    if (disallowed || !sawLink || fragments.length < 3) {
      return undefined;
    }

    return fragments;
  }

  function inlineSemanticTextLinkFragments(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    const tag = el.tagName.toLowerCase();
    if (tag !== "p" && tag !== "small") return undefined;
    if (
      el.getAttribute("role") ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.closest(interactiveSelector) ||
      el.closest("li,[role='listitem']") ||
      expandedControlledRegionFor(el)
    ) {
      return undefined;
    }

    const inlineSemanticSelector = "code, strong, b, em, i, time";
    const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) => !isHidden(link),
    );
    const semanticBoundaries = Array.from(el.querySelectorAll(inlineSemanticSelector)).filter(
      (candidate: any) => !isHidden(candidate) && Boolean(readableText(candidate)),
    );
    if (!links.length || !semanticBoundaries.length) return undefined;

    const fragments: string[] = [];
    const comparableFragments: string[] = [];
    let sawLink = false;
    let sawSemanticBoundary = false;
    let disallowed = false;
    let plainText = "";

    function flushPlainText(): void {
      const text = normalize(plainText);
      if (text && /[\p{L}\p{N}]/u.test(text)) {
        fragments.push(text);
        comparableFragments.push(text);
      }
      plainText = "";
    }

    function collect(node: any): void {
      if (!node || disallowed) return;
      if (node.nodeType === Node.TEXT_NODE) {
        plainText = `${plainText}${node.textContent || ""}`;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (node.matches("[aria-hidden='true']")) return;

      if (node.matches(interactiveSelector)) {
        if (implicitRole(node) !== "link") {
          disallowed = true;
          return;
        }
        flushPlainText();
        const linkName = accessibleName(node, "link");
        if (!linkName) {
          disallowed = true;
          return;
        }
        fragments.push(`link, ${linkName}`);
        comparableFragments.push(linkName.replace(/\s+\([^)]+\)$/u, ""));
        sawLink = true;
        if (node.matches(inlineSemanticSelector) || node.querySelector?.(inlineSemanticSelector)) {
          sawSemanticBoundary = true;
        }
        return;
      }

      if (node !== el && node.matches(inlineSemanticSelector)) {
        flushPlainText();
        const text = readableText(node);
        if (text) {
          fragments.push(text);
          comparableFragments.push(text);
          sawSemanticBoundary = true;
        }
        return;
      }

      const role = node !== el ? implicitRole(node) : "";
      if (role && role !== "paragraph") {
        disallowed = true;
        return;
      }

      for (const child of Array.from(node.childNodes || [])) collect(child);
    }

    collect(el);
    flushPlainText();

    if (disallowed || !sawLink || !sawSemanticBoundary || fragments.length < 3) {
      return undefined;
    }

    const comparable = (value?: string) =>
      normalize(value)
        ?.replace(/\s+([.,;:!?])/g, "$1")
        .replace(/\s+(?=<)/g, "")
        .replace(/(?<=>)\s+/g, "")
        .replace(/[.。]$/u, "");
    if (comparable(comparableFragments.join(" ")) !== comparable(readableText(el))) {
      return undefined;
    }

    return fragments;
  }

  function inlinePhrasingBoundaryFragments(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    const tag = el.tagName?.toLowerCase();
    if (tag !== "p" && tag !== "small") return undefined;
    if (
      el.getAttribute("role") ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.closest(interactiveSelector) ||
      el.closest("li,[role='listitem']") ||
      expandedControlledRegionFor(el)
    ) {
      return undefined;
    }
    if (el.querySelector("a[href], [role='link'], button, input, select, textarea")) {
      return undefined;
    }

    const boundarySelector = "dfn, mark, del, ins, sub, sup, s, ruby, math, output";
    const directBoundaries = Array.from(el.children || []).filter(
      (child: any) =>
        !isHidden(child) &&
        child.matches?.(boundarySelector) &&
        !child.querySelector?.("a[href], [role='link'], button, input, select, textarea"),
    );
    if (!directBoundaries.length) return undefined;

    const fragments: string[] = [];
    const comparableFragments: string[] = [];
    let plainText = "";
    let sawBoundary = false;
    let disallowed = false;
    let sawSuppressedSubSup = false;

    function flushPlainText(): void {
      const text = normalize(plainText);
      if (text && !/^[.。]+$/u.test(text)) {
        fragments.push(text);
        comparableFragments.push(text);
      }
      plainText = "";
    }

    function collect(node: any): void {
      if (!node || disallowed) return;
      if (node.nodeType === Node.TEXT_NODE) {
        plainText = `${plainText}${node.textContent || ""}`;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (node.matches("[aria-hidden='true']")) return;

      if (node !== el && node.matches(boundarySelector)) {
        const nodeTag = node.tagName?.toLowerCase();
        if (nodeTag === "ins") {
          const leadingText = normalize(plainText);
          if (leadingText) {
            fragments.push(`• ${leadingText}`);
            comparableFragments.push(leadingText);
            plainText = "";
          } else {
            flushPlainText();
          }
        } else {
          flushPlainText();
        }
        if (nodeTag === "ruby") {
          const baseText = rubyBaseText(node);
          if (baseText) {
            fragments.push(baseText);
            comparableFragments.push(readableText(node) || baseText);
            sawBoundary = true;
            return;
          }
        }
        if (nodeTag === "math") {
          const mathText = mathAnnouncementText(node);
          if (mathText) {
            fragments.push(mathText);
            comparableFragments.push(readableText(node) || normalize(node.textContent || "") || mathText);
            sawBoundary = true;
            return;
          }
        }
        const text = readableText(node);
        if (text) {
          if (nodeTag === "sub" || nodeTag === "sup") {
            comparableFragments.push(text);
            sawSuppressedSubSup = true;
            sawBoundary = true;
            return;
          }
          const fragment =
            nodeTag === "dfn"
              ? `${text}, empty term`
              : text;
          fragments.push(fragment);
          comparableFragments.push(text);
          sawBoundary = true;
        }
        return;
      }

      const role = node !== el ? implicitRole(node) : "";
      if (role && role !== "paragraph") {
        disallowed = true;
        return;
      }

      for (const child of Array.from(node.childNodes || [])) collect(child);
    }

    collect(el);
    flushPlainText();

    if (disallowed || !sawBoundary || fragments.length < 2) return undefined;

    const comparable = (value?: string) =>
      normalize(value)
        ?.replace(/\s+([.,;:!?])/g, "$1")
        .replace(/\s+(?=<)/g, "")
        .replace(/(?<=>)\s+/g, "")
        .replace(/[.。]$/u, "");
    const fragmentComparable = comparable(comparableFragments.join(" "));
    const actualComparable = comparable(readableText(el));
    if (
      sawSuppressedSubSup
        ? fragmentComparable?.replace(/\s+/g, "") !== actualComparable?.replace(/\s+/g, "")
        : fragmentComparable !== actualComparable
    ) {
      return undefined;
    }

    return fragments;
  }

  function rubyBaseText(el: any): string | undefined {
    const parts: string[] = [];
    for (const child of Array.from(el.childNodes || [])) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = normalize(child.textContent || "");
        if (text) parts.push(text);
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) continue;
      const tag = child.tagName?.toLowerCase();
      if (tag === "rt" || tag === "rp") continue;
      const text = readableText(child);
      if (text) parts.push(text);
    }
    return normalize(parts.join(" "));
  }

  function mathAnnouncementText(el: any): string | undefined {
    const ariaLabel = normalize(el.getAttribute("aria-label"));
    const symbols = Array.from(el.querySelectorAll("mi, mn, mo"))
      .map((node: any) => normalize(node.textContent || ""))
      .filter((text: any): text is string => Boolean(text));
    const expression = symbols.length
      ? symbols.join("")
      : normalize(el.textContent || "");
    if (!expression) return ariaLabel;
    const itemCount = Array.from(el.querySelectorAll("*")).filter(
      (node: any) => !isHidden(node),
    ).length;
    return itemCount > 0 ? `${expression}, with ${itemCount} items, math` : expression;
  }

  function inlineCodeBreakTextFragments(el: any, role: string): string[] | undefined {
    if (!["paragraph", "text"].includes(role)) return undefined;
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    const tag = el.tagName?.toLowerCase();
    if (tag === "address") {
      const fragments: string[] = [];
      let line = "";

      function flushLine(): void {
        const text = normalize(line);
        if (text) fragments.push(text);
        line = "";
      }

      function collectAddressLine(node: any): void {
        if (!node) return;
        if (node.nodeType === Node.TEXT_NODE) {
          line = `${line}${node.textContent || ""}`;
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
        if (node.matches?.("[aria-hidden='true']")) return;
        if (node.tagName?.toLowerCase() === "br") {
          flushLine();
          return;
        }
        for (const child of Array.from(node.childNodes || [])) collectAddressLine(child);
      }

      collectAddressLine(el);
      flushLine();
      return fragments.length ? fragments : undefined;
    }
    if (tag !== "p" && tag !== "small") return undefined;
    if (
      el.getAttribute("role") ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.closest(interactiveSelector) ||
      el.closest("li,[role='listitem']") ||
      expandedControlledRegionFor(el)
    ) {
      return undefined;
    }
    if (accessibilityNodes.length && directAxInlineTextLinkParagraphFragments(el)) {
      return undefined;
    }

    const allowedSemanticSelector = "code, strong, b, em, i";
    const directElements = Array.from(el.children || []).filter(
      (child: any) => !isHidden(child) || isSerializedOffscreenCodeBoundary(child),
    );
    const hasCodeBoundary = directElements.some((child: any) =>
      child.matches?.("code") || Boolean(child.querySelector?.("code")),
    );
    const hasStrongOrEmphasisBoundary = directElements.some((child: any) =>
      child.matches?.("strong, b, em, i"),
    );
    const strongOrEmphasisBoundaries = directElements.filter((child: any) =>
      child.matches?.("strong, b, em, i"),
    );
    const strongOrEmphasisBoundaryCount = strongOrEmphasisBoundaries.length;
    const hasCodeLikeMultipleEmphasisBoundary =
      strongOrEmphasisBoundaryCount >= 2 &&
      strongOrEmphasisBoundaries.every((child: any) =>
        /^[a-z][a-z0-9_-]*$/u.test(normalize(readableText(child)) || ""),
      );
    const hasLink = directElements.some(
      (child: any) =>
        implicitRole(child) === "link" ||
        Boolean(child.querySelector?.("a[href], [role='link']")),
    );
    const lineBreakCount = directElements.filter(
      (child: any) => child.tagName?.toLowerCase() === "br",
    ).length;
    const isGovukValidationBreakShape = lineBreakCount >= 2;

    if (
      !hasCodeBoundary &&
      !isGovukValidationBreakShape &&
      !(hasStrongOrEmphasisBoundary && hasLink) &&
      !hasCodeLikeMultipleEmphasisBoundary
    ) {
      return undefined;
    }

    const fragments: string[] = [];
    const comparableFragments: string[] = [];
    let plainText = "";
    let sawCodeBoundary = false;
    let sawEmphasisBoundary = false;
    let sawSemanticLinkBoundary = false;
    let sawValidationBreakBoundary = false;
    let disallowed = false;

    function pushFragment(fragment?: string, comparable = fragment): void {
      const text = normalize(fragment);
      if (!text) return;
      const comparableText = normalize(comparable) || text;
      if (!/[\p{L}\p{N}<]/u.test(text)) {
        comparableFragments.push(comparableText);
        return;
      }
      fragments.push(text);
      comparableFragments.push(comparableText);
    }

    function flushPlainText(): void {
      pushFragment(plainText);
      plainText = "";
    }

    function collect(node: any): void {
      if (!node || disallowed) return;
      if (node.nodeType === Node.TEXT_NODE) {
        plainText = `${plainText}${node.textContent || ""}`;
        return;
      }
      if (
        node.nodeType !== Node.ELEMENT_NODE ||
        (isHidden(node) && !isSerializedOffscreenCodeBoundary(node))
      ) {
        return;
      }
      if (node.matches?.("[aria-hidden='true']")) return;

      const nodeTag = node.tagName?.toLowerCase();
      if (nodeTag === "br") {
        flushPlainText();
        if (isGovukValidationBreakShape) {
          sawValidationBreakBoundary = true;
        }
        return;
      }

      if (node.matches?.(interactiveSelector)) {
        if (implicitRole(node) !== "link") {
          disallowed = true;
          return;
        }
        flushPlainText();
        const linkName = accessibleName(node, "link");
        if (!linkName) {
          disallowed = true;
          return;
        }
        fragments.push(`link, ${linkName}`);
        comparableFragments.push(linkName.replace(/\s+\([^)]+\)$/u, ""));
        sawSemanticLinkBoundary = true;
        return;
      }

      if (node !== el && node.matches?.("code")) {
        flushPlainText();
        const text = readableText(node) || normalize(node.textContent);
        if (text) {
          pushFragment(text);
          sawCodeBoundary = true;
        }
        return;
      }

      if (
        node !== el &&
        node.matches?.(allowedSemanticSelector) &&
        !node.querySelector?.(interactiveSelector) &&
        !node.querySelector?.("code")
      ) {
        flushPlainText();
        const text = readableText(node);
        if (text) {
          pushFragment(text);
          sawEmphasisBoundary = true;
        }
        return;
      }

      const childRole = node !== el ? implicitRole(node) : "";
      if (
        childRole &&
        childRole !== "paragraph" &&
        !node.matches?.(allowedSemanticSelector)
      ) {
        disallowed = true;
        return;
      }

      for (const child of Array.from(node.childNodes || [])) collect(child);
    }

    collect(el);
    flushPlainText();

    if (disallowed || fragments.length < 2) return undefined;
    if (
      !sawCodeBoundary &&
      !sawEmphasisBoundary &&
      !sawSemanticLinkBoundary &&
      !sawValidationBreakBoundary
    ) {
      return undefined;
    }
    if (sawValidationBreakBoundary) {
      const hasSay = fragments.some((fragment) => /^Say\b/i.test(fragment));
      const hasExample = fragments.some((fragment) => /^For example\b/i.test(fragment));
      if (!hasSay || !hasExample) return undefined;
    }

    const comparable = (value?: string) =>
      normalize(value)
        ?.replace(/\s+([.,;:!?])/g, "$1")
        .replace(/\s+(?=<)/g, "")
        .replace(/(?<=>)\s+/g, "")
        .replace(/[.。]$/u, "");
    const actualComparable = comparable(readableText(el));
    const fragmentComparable = comparable(comparableFragments.join(" "));
    if (
      sawValidationBreakBoundary
        ? fragmentComparable?.replace(/\s+/g, "") !==
          actualComparable?.replace(/\s+/g, "")
        : fragmentComparable !== actualComparable
    ) {
      return undefined;
    }

    return fragments;
  }

  function isFirstSplitTextListItemBlock(el: any): boolean {
    if (!isSplitTextListItemBlock(el)) return false;
    const listItem = el.closest("li,[role='listitem']");
    return splitListItemTextBlocks(listItem)[0] === el;
  }

  function inlineEmphasisListItemFragments(el: any): string[] | undefined {
    if (!isListItem(el)) return undefined;
    if (el.querySelector(interactiveSelector)) return undefined;

    const emphasisSelector = "strong, b, em, i";
    const emphasisElements = Array.from(el.querySelectorAll(emphasisSelector)).filter(
      (candidate: any) => !isHidden(candidate) && Boolean(readableText(candidate)),
    );
    if (!emphasisElements.length) return undefined;

    const fragments: string[] = [];
    let plainText = "";

    function flushPlainText(): void {
      const normalized = normalize(plainText);
      if (normalized) fragments.push(normalized);
      plainText = "";
    }

    function collect(node: any): void {
      if (node.nodeType === Node.TEXT_NODE) {
        plainText = `${plainText} ${node.textContent || ""}`;
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (
        node.matches(
          `${interactiveSelector}, ul, ol, dl, [role='list'], [aria-hidden='true']`,
        )
      ) {
        return;
      }

      if (node.matches(emphasisSelector)) {
        flushPlainText();
        const emphasizedText = readableText(node);
        if (emphasizedText) fragments.push(emphasizedText);
        return;
      }

      for (const child of Array.from(node.childNodes)) collect(child);
    }

    collect(el);
    flushPlainText();

    const normalizedFullText = normalize(textWithoutInteractive(el));
    const normalizedFragments = fragments
      .map((fragment) => normalize(fragment))
      .filter((fragment): fragment is string => Boolean(fragment));
    if (normalizedFragments.length < 2) return undefined;
    if (normalizedFragments.join(" ") !== normalizedFullText) return undefined;

    if (
      emphasisElements.length === 1 &&
      normalizedFragments.length === 2 &&
      hasDecorativeMediaOnlyDescendant(el)
    ) {
      normalizedFragments[1] = `• ${normalizedFragments[1]}`;
    }

    return normalizedFragments;
  }

  function hasDecorativeMediaOnlyDescendant(el: any): boolean {
    return Array.from(
      el?.querySelectorAll?.(
        "svg[aria-hidden='true'], img[alt=''], img[role='presentation'], [role='presentation']",
      ) || [],
    ).some((candidate: any) => !isRenderedDisplayHidden(candidate));
  }

  function inlineEmphasisTextFragments(el: any, role: string): string[] | undefined {
    if (!["paragraph", "text"].includes(role)) return undefined;
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.querySelector(interactiveSelector)) return undefined;
    const expandedRegion = expandedControlledRegionFor(el);
    if (!expandedRegion && el.closest("li,[role='listitem']")) return undefined;

    const emphasisSelector = "strong, b, em, i";
    const emphasisElements = Array.from(el.querySelectorAll(emphasisSelector)).filter(
      (candidate: any) => !isHidden(candidate) && Boolean(readableText(candidate)),
    );
    if (!emphasisElements.length) return undefined;
    if (
      !expandedRegion &&
      emphasisElements.length > 1 &&
      !emphasisElements.every((candidate: any) =>
        /^[a-z0-9][a-z0-9_-]*$/u.test(normalize(readableText(candidate)) || ""),
      )
    ) {
      return undefined;
    }

    const fragments: string[] = [];
    let plainText = "";
    let suppressNextLeadingSpace = false;

    function flushPlainText(): void {
      const normalized = normalize(plainText);
      if (normalized) fragments.push(normalized);
      plainText = "";
    }

    function collect(node: any): void {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = suppressNextLeadingSpace
          ? (node.textContent || "").replace(/^\s+/u, "")
          : node.textContent || "";
        plainText = `${plainText}${text}`;
        suppressNextLeadingSpace = false;
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (node.matches("[aria-hidden='true']")) return;

      if (node.tagName?.toLowerCase() === "br" && expandedControlledRegionFor(el)) {
        plainText = plainText.replace(/\s+$/u, "");
        suppressNextLeadingSpace = true;
        return;
      }

      if (node.matches(emphasisSelector)) {
        flushPlainText();
        const emphasizedText = readableText(node);
        if (emphasizedText) fragments.push(emphasizedText);
        return;
      }

      if (node !== el && implicitRole(node) && !node.matches(emphasisSelector)) {
        return;
      }

      for (const child of Array.from(node.childNodes)) collect(child);
    }

    collect(el);
    flushPlainText();

    const normalizedFullText = normalize(textWithoutInteractive(el) || readableText(el));
    const normalizedFragments = fragments
      .map((fragment) => normalize(fragment))
      .filter((fragment): fragment is string => Boolean(fragment));
    if (!expandedRegion && normalizedFragments.length !== 2) {
      return undefined;
    }
    if (expandedRegion && normalizedFragments.length < 2) {
      return undefined;
    }
    if (!expandedRegion && normalizedFragments.join(" ") !== normalizedFullText) {
      return undefined;
    }

    return normalizedFragments;
  }

  function blockquoteInlineEmphasisFragments(el: any, role: string): string[] | undefined {
    if (role !== "blockquote") return undefined;
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName?.toLowerCase() !== "blockquote") return undefined;
    if (el.querySelector(interactiveSelector)) return undefined;

    const emphasisSelector = "strong, b, em, i";
    const emphasisElements = Array.from(el.querySelectorAll(emphasisSelector)).filter(
      (candidate: any) => !isHidden(candidate) && Boolean(readableText(candidate)),
    );
    if (emphasisElements.length !== 1) return undefined;

    const fragments: string[] = [];
    let plainText = "";

    function flushPlainText(): void {
      const normalized = normalize(plainText);
      if (normalized) fragments.push(normalized);
      plainText = "";
    }

    function collect(node: any): void {
      if (node.nodeType === Node.TEXT_NODE) {
        plainText = `${plainText}${node.textContent || ""}`;
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (node.matches("[aria-hidden='true']")) return;

      if (node.matches(emphasisSelector)) {
        flushPlainText();
        const emphasizedText = readableText(node);
        if (emphasizedText) fragments.push(emphasizedText);
        return;
      }

      const childRole = node !== el ? implicitRole(node) : "";
      if (
        childRole &&
        !["paragraph", "text"].includes(childRole) &&
        !node.matches(emphasisSelector)
      ) {
        return;
      }

      for (const child of Array.from(node.childNodes || [])) collect(child);
    }

    collect(el);
    flushPlainText();

    const normalizedFragments = fragments
      .map((fragment) => normalize(fragment))
      .filter((fragment): fragment is string => Boolean(fragment));
    const emphasizedText = normalize(readableText(emphasisElements[0]));
    const fullText = normalize(readableText(el));
    if (normalizedFragments.length !== 2) return undefined;
    if (normalizedFragments[0] !== emphasizedText) return undefined;
    if (normalizedFragments.join(" ") !== fullText) return undefined;

    return normalizedFragments;
  }

  function isPlainSpanOnlyBlockquote(el: any, role: string): boolean {
    if (role !== "blockquote") return false;
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName?.toLowerCase() !== "blockquote") return false;
    if (el.getAttribute("role") || hasExplicitAriaName(el)) return false;
    if (el.matches(interactiveSelector) || el.querySelector(interactiveSelector)) return false;

    const visibleChildren = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (visibleChildren.length !== 1) return false;
    const span = visibleChildren[0] as any;
    if (span.tagName?.toLowerCase() !== "span") return false;
    if (span.querySelector("*:not([aria-hidden='true'])")) return false;

    const text = normalize(readableText(span));
    return Boolean(text && text === normalize(readableText(el)));
  }

  function normalizedCodeLineText(value?: string | null): string | undefined {
    return normalize(
      (value || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " "),
    );
  }

  const upperCaseCodeLanguageLabels = new Set([
    "css",
    "html",
    "js",
    "jsx",
    "svg",
    "ts",
    "tsx",
    "xml",
  ]);

  function normalizedCodeLanguageLabel(value?: string | null): string | undefined {
    const label = normalize(value);
    if (!label) return undefined;
    const lower = label.toLowerCase();
    return upperCaseCodeLanguageLabels.has(lower) ? lower.toUpperCase() : label;
  }

  function isCodeLanguageLabel(el: any, role: string): boolean {
    if (role !== "text") return false;
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    const className = el.getAttribute("class") || "";
    if (!/\blanguage(?:[-_]?name)?\b/i.test(className)) return false;
    if (!normalizedCodeLanguageLabel(readableText(el))) return false;

    for (
      let current = el.parentElement, depth = 0;
      current && depth < 4;
      current = current.parentElement, depth += 1
    ) {
      if (current.querySelector?.("pre code")) return true;
    }
    return false;
  }

  function visibleComposedDescendants(el: any, limit = 250): any[] {
    const descendants: any[] = [];
    const visit = (node: any) => {
      if (descendants.length >= limit) return;
      for (const child of walkChildren(node)) {
        if (!child || child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) continue;
        descendants.push(child);
        visit(child);
      }
    };
    visit(el);
    return descendants;
  }

  function isCodeExampleCustomElementGroup(el: any): boolean {
    if (!isCustomElement(el)) return false;
    if (!hasShadowRootContent(el)) return false;
    if (accessibleName(el, "group")) return false;
    if (customElementContributesLabelRoleOrState(el)) return false;
    if (el.matches(interactiveSelector)) return false;

    const descendants = visibleComposedDescendants(el);
    const hasPreCode = descendants.some(
      (candidate: any) =>
        candidate.tagName?.toLowerCase() === "pre" &&
        Array.from(candidate.children || []).some(
          (child: any) => child.tagName?.toLowerCase() === "code" && !isHidden(child),
        ),
    );
    if (!hasPreCode) return false;

    const hasLanguageLabel = descendants.some((candidate: any) =>
      isCodeLanguageLabel(candidate, implicitRole(candidate)),
    );
    if (!hasLanguageLabel) return false;

    return descendants.some((candidate: any) =>
      ["button", "link"].includes(implicitRole(candidate)),
    );
  }

  function tokenizedPreCodeLines(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName.toLowerCase() !== "pre") return undefined;

    const code = Array.from(el.children || []).find(
      (child: any) => child.tagName?.toLowerCase() === "code" && !isHidden(child),
    ) as any;
    if (!code) return undefined;

    const hasTokenizedInlineMarkup = Array.from(code.querySelectorAll("span")).some(
      (span: any) => !isHidden(span) && Boolean(normalizedCodeLineText(span.textContent)),
    );
    if (!hasTokenizedInlineMarkup) return undefined;

    const lines = String(code.textContent || "")
      .split(/\r?\n/u)
      .map((line) => normalizedCodeLineText(line))
      .filter((line): line is string => Boolean(line));
    if (!/^<input$/i.test(lines[0] || "")) return undefined;
    if (
      !lines.slice(1).every((line) =>
        /^[a-z_:][-a-z0-9_:.]*=/i.test(line) ||
          /^\/?>$/u.test(line) ||
          /^\/?>$/u.test(line.replace(/\s+/g, "")),
      )
    ) {
      return undefined;
    }
    return lines.length ? lines : undefined;
  }

  function htmlTagFragmentTokens(line: string): string[] | undefined {
    const match = line.match(/^<\s*([a-z][a-z0-9:-]*)(\s[^<>]*)?\s*\/?>$/iu);
    if (!match) return undefined;
    const [, tagName, rawAttributes = ""] = match;
    const fragments = [tagName];
    const attributePattern =
      /([a-z_:][-a-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/giu;

    for (const attribute of rawAttributes.matchAll(attributePattern)) {
      const name = normalize(attribute[1]);
      if (!name) continue;
      const value = normalize(attribute[2] ?? attribute[3] ?? attribute[4]);
      if (name.toLowerCase() !== "id") {
        fragments.push(name);
      }
      if (value) fragments.push(value);
    }

    return fragments;
  }

  function standaloneHtmlTagCodeLine(line: string): string | undefined {
    if (!htmlTagFragmentTokens(line)?.length) return undefined;
    return normalizedCodeLineText(line)?.replace(/\/\*,\./gu, "/*.");
  }

  const mixedHtmlFormWrapperTags = new Set(["div", "p"]);
  const mixedHtmlFormContentTags = new Set(["button", "form", "input", "label"]);
  const mixedHtmlFormAllowedTags = new Set([
    ...mixedHtmlFormWrapperTags,
    ...mixedHtmlFormContentTags,
  ]);

  function htmlAttributeValueFragment(name: string, value?: string): string | undefined {
    const normalizedValue = normalize(value);
    if (!normalizedValue) return undefined;
    if (
      name.toLowerCase() === "accept" &&
      normalizedValue.includes(",") &&
      normalizedValue.split(",").every((part) => part.trim().startsWith("."))
    ) {
      return normalizedValue
        .split(",")
        .map((part) => part.trim().replace(/^\./u, ""))
        .filter(Boolean)
        .join(", ");
    }
    return normalizedValue;
  }

  function mixedHtmlTagFragments(rawTag: string): string[] | undefined {
    const closingMatch = rawTag.match(/^<\s*\/\s*([a-z][a-z0-9:-]*)\s*>$/iu);
    if (closingMatch) {
      const tagName = closingMatch[1].toLowerCase();
      if (!mixedHtmlFormAllowedTags.has(tagName)) return undefined;
      return mixedHtmlFormWrapperTags.has(tagName) ? [] : [tagName];
    }

    const openingMatch = rawTag.match(/^<\s*([a-z][a-z0-9:-]*)([^<>]*)>$/iu);
    if (!openingMatch) return undefined;
    const [, rawTagName, rawAttributes = ""] = openingMatch;
    const tagName = rawTagName.toLowerCase();
    if (!mixedHtmlFormAllowedTags.has(tagName)) return undefined;
    if (mixedHtmlFormWrapperTags.has(tagName) && !normalize(rawAttributes.replace(/\/\s*$/u, ""))) {
      return [];
    }

    const fragments = [tagName];
    const attributes = rawAttributes.replace(/\/\s*$/u, "");
    const attributePattern =
      /([a-z_:][-a-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/giu;

    for (const attribute of attributes.matchAll(attributePattern)) {
      const name = normalize(attribute[1]);
      if (!name) continue;
      const value = htmlAttributeValueFragment(
        name,
        attribute[2] ?? attribute[3] ?? attribute[4],
      );
      if (name.toLowerCase() !== "id") {
        fragments.push(name);
      }
      if (value) fragments.push(value);
    }

    if (normalize(attributes.replace(attributePattern, ""))) return undefined;
    return fragments;
  }

  function tokenizedMixedHtmlFormFragments(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName.toLowerCase() !== "pre") return undefined;

    const code = Array.from(el.children || []).find(
      (child: any) => child.tagName?.toLowerCase() === "code" && !isHidden(child),
    ) as any;
    if (!code) return undefined;

    const hasTokenizedInlineMarkup = Array.from(code.querySelectorAll("span")).some(
      (span: any) =>
        !isHidden(span) &&
        /\btoken\b/.test(span.getAttribute("class") || "") &&
        Boolean(normalizedCodeLineText(span.textContent)),
    );
    if (!hasTokenizedInlineMarkup) return undefined;

    const source = String(code.textContent || "");
    if (!/<\s*label\b/iu.test(source) && !/<\s*button\b/iu.test(source)) {
      return undefined;
    }
    if (!/<\s*(?:form|input)\b/iu.test(source)) return undefined;

    const fragments: string[] = [];
    let sawContentTag = false;
    let sawInlineText = false;
    const tokenPattern = /<\/?\s*[a-z][^<>]*>|[^<]+/giu;
    let offset = 0;

    for (const token of source.matchAll(tokenPattern)) {
      if (token.index !== offset) return undefined;
      offset = token.index + token[0].length;

      if (token[0].startsWith("<")) {
        const tagFragments = mixedHtmlTagFragments(token[0]);
        if (!tagFragments) return undefined;
        if (tagFragments.some((fragment) => mixedHtmlFormContentTags.has(fragment.toLowerCase()))) {
          sawContentTag = true;
        }
        fragments.push(...tagFragments);
        continue;
      }

      const text = normalizedCodeLineText(token[0]);
      if (text) {
        sawInlineText = true;
        fragments.push(text);
      }
    }

    if (offset !== source.length) return undefined;
    if (!sawContentTag || !sawInlineText || fragments.length < 4) return undefined;
    return fragments;
  }

  function tokenizedOneLineHtmlTagFragments(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName.toLowerCase() !== "pre") return undefined;

    const code = Array.from(el.children || []).find(
      (child: any) => child.tagName?.toLowerCase() === "code" && !isHidden(child),
    ) as any;
    if (!code) return undefined;

    const hasTokenizedInlineMarkup = Array.from(code.querySelectorAll("span")).some(
      (span: any) =>
        !isHidden(span) &&
        /\btoken\b/.test(span.getAttribute("class") || "") &&
        Boolean(normalizedCodeLineText(span.textContent)),
    );
    if (!hasTokenizedInlineMarkup) return undefined;

    const lines = String(code.textContent || "")
      .split(/\r?\n/u)
      .map((line) => normalizedCodeLineText(line))
      .filter((line): line is string => Boolean(line));
    if (!lines.length) return undefined;

    const lineFragments = lines.map((line) => htmlTagFragmentTokens(line));
    if (lineFragments.some((fragments) => !fragments?.length)) return undefined;

    const tagNames = new Set(lineFragments.map((fragments) => fragments?.[0]));
    if (tagNames.size !== 1) return undefined;

    return lineFragments.flatMap((fragments) => fragments || []);
  }

  function tokenizedStandaloneHtmlTagLine(el: any): string[] | undefined {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return undefined;
    if (el.tagName.toLowerCase() !== "pre") return undefined;

    const code = Array.from(el.children || []).find(
      (child: any) => child.tagName?.toLowerCase() === "code" && !isHidden(child),
    ) as any;
    if (!code) return undefined;

    const hasTokenizedInlineMarkup = Array.from(code.querySelectorAll("span")).some(
      (span: any) =>
        !isHidden(span) &&
        /\btoken\b/.test(span.getAttribute("class") || "") &&
        Boolean(normalizedCodeLineText(span.textContent)),
    );
    if (!hasTokenizedInlineMarkup) return undefined;

    const lines = String(code.textContent || "")
      .split(/\r?\n/u)
      .map((line) => normalizedCodeLineText(line))
      .filter((line): line is string => Boolean(line));
    if (lines.length !== 1) return undefined;

    const line = standaloneHtmlTagCodeLine(lines[0]);
    return line ? [line] : undefined;
  }

  function isCodeMirrorTextbox(el: any, role: string): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (role !== "textbox") return false;
    if (el.getAttribute("contenteditable") !== "true") return false;
    return Array.from(el.children || []).some(
      (child: any) =>
        !isHidden(child) &&
        /\bcm-line\b/.test(child.getAttribute?.("class") || ""),
    );
  }

  function codeMirrorTextEntryText(el: any, role: string): string | undefined {
    if (!isCodeMirrorTextbox(el, role)) return undefined;

    const lines = Array.from(el.children || [])
      .filter(
        (child: any) =>
          !isHidden(child) &&
          /\bcm-line\b/.test(child.getAttribute?.("class") || ""),
      )
      .map((line: any) => normalizedCodeLineText(line.textContent))
      .filter((line): line is string => Boolean(line));
    if (!lines.length) return undefined;

    return normalize(lines.slice(0, 2).join(" "));
  }

  function directPreCodeChild(pre: any): any | undefined {
    if (!pre || pre.nodeType !== Node.ELEMENT_NODE) return undefined;
    if (pre.tagName?.toLowerCase() !== "pre") return undefined;
    return Array.from(pre.children || []).find(
      (child: any) => child.tagName?.toLowerCase() === "code",
    ) as any;
  }

  function hasSyntaxHighlightedCodeDescendants(code: any): boolean {
    return Array.from(code?.querySelectorAll?.("span") || []).some((span: any) =>
      Boolean(normalize(span.textContent)),
    );
  }

  function isCopyCodeButtonElement(el: any, allowHidden = false): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (!allowHidden && isHidden(el)) return false;
    return implicitRole(el) === "button" && normalize(readableText(el) || el.textContent) === "Copy code";
  }

  function isLiveStatusElement(el: any, allowHidden = false): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (!allowHidden && isHidden(el)) return false;
    return Boolean(el.hasAttribute("aria-live"));
  }

  function codePanelWrapperForPre(pre: any, allowHidden = false): any | undefined {
    if (!pre || (!allowHidden && isHidden(pre))) return undefined;
    const code = directPreCodeChild(pre);
    if (!code || (!allowHidden && isHidden(code))) return undefined;
    if (!hasSyntaxHighlightedCodeDescendants(code)) return undefined;

    const wrapper = pre.parentElement;
    if (!wrapper || wrapper.matches?.(interactiveSelector)) return undefined;
    if (!allowHidden && isHidden(wrapper)) return undefined;

    const children = Array.from(wrapper.children || []);
    const preIndex = children.indexOf(pre);
    if (preIndex < 1) return undefined;
    if (!children.slice(0, preIndex).some((child: any) => isCopyCodeButtonElement(child, allowHidden))) {
      return undefined;
    }
    if (!children.slice(0, preIndex).some((child: any) => isLiveStatusElement(child, allowHidden))) {
      return undefined;
    }
    return wrapper;
  }

  function controlledTabForPanel(panel: any, expanded?: boolean): any | undefined {
    const panelId = normalize(panel?.id);
    if (!panelId) return undefined;
    const selector = `[aria-controls="${cssEscape(panelId)}"]`;
    return Array.from(document.querySelectorAll(selector)).find((candidate: any) => {
      if (isHidden(candidate)) return false;
      if (implicitRole(candidate) !== "tab") return false;
      if (!candidate.hasAttribute("aria-expanded")) return false;
      return expanded === undefined || parseBooleanAttribute(candidate, "aria-expanded") === expanded;
    }) as any;
  }

  function hasCodePanelPreContract(panel: any, allowHidden = false): boolean {
    if (!panel || panel.nodeType !== Node.ELEMENT_NODE) return false;
    if (implicitRole(panel) !== "tabpanel") return false;
    if (!allowHidden && isHidden(panel)) return false;
    return Array.from(panel.querySelectorAll("pre")).some((pre: any) =>
      Boolean(codePanelWrapperForPre(pre, allowHidden)),
    );
  }

  function isExpandedHtmlCodePanel(panel: any): boolean {
    if (!hasCodePanelPreContract(panel)) return false;
    const controller = controlledTabForPanel(panel, true);
    return normalize(accessibleName(controller, "tab") || readableText(controller)) === "HTML";
  }

  function codePanelControlledByTab(el: any): any | undefined {
    const controlledId = el?.getAttribute?.("aria-controls");
    const panel = controlledId ? resolveIdRef(controlledId) : null;
    if (panel && hasCodePanelPreContract(panel, true)) return panel;

    const tablist = el?.closest?.("[role='tablist']");
    return Array.from(tablist?.querySelectorAll?.("[role='tab'][aria-controls]") || [])
      .map((tab: any) => resolveIdRef(tab.getAttribute("aria-controls")))
      .find((candidate: any) => hasCodePanelPreContract(candidate, true)) as any;
  }

  function isCodePanelTab(el: any, role: string): boolean {
    if (role !== "tab" || !el?.hasAttribute?.("aria-expanded")) return false;
    return Boolean(codePanelControlledByTab(el));
  }

  function compactExpandedCodePanelText(pre: any): string | undefined {
    const wrapper = codePanelWrapperForPre(pre);
    if (!wrapper) return undefined;

    const panel = pre.closest?.("[role='tabpanel']");
    if (!isExpandedHtmlCodePanel(panel)) return undefined;

    const code = directPreCodeChild(pre);
    const text = normalize(readableText(code) || code?.textContent);
    if (!text || !/^</u.test(text)) return undefined;
    return text;
  }

  function leafTextFragments(el: any): string[] {
    const fragments: string[] = [];

    function collect(node: any): void {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = normalize(node.textContent);
        if (text) fragments.push(text);
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (node.matches("[aria-hidden='true']")) return;

      for (const child of Array.from(node.childNodes)) collect(child);
      for (const child of shadowContentChildren(node)) collect(child);
    }

    collect(el);
    return fragments;
  }

  function complexColumnHeaderFragments(el: any, role: string) {
    if (role !== "columnheader") return {};
    if (!el.closest("table")) return {};

    const fragments = leafTextFragments(el);
    if (fragments.length < 3) return {};

    const rawText = normalize(el.textContent || "");
    const readable = readableText(el);
    if (!rawText || !readable) return {};

    return {
      complexColumnHeaderFragments: complexColumnHeaderContextFragments(el),
      complexColumnHeaderRawText: rawText,
    };
  }

  function hasStructuredListItemContent(el: any): boolean {
    if (!isListItem(el)) return false;
    if (hasRichProductCardListItemContent(el)) return true;
    if (hasStructuredNewsCardListItemContent(el)) return true;

    const heading = el.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']");
    if (
      heading &&
      (el.querySelector("p, [role='group'], img, [role='img'], svg[aria-label]") ||
        el.querySelector("button, [role='button'], a[href], [role='link']") ||
        Array.from(el.children).some((child: any) => isStructuredListBodyText(child)))
    ) {
      return true;
    }

    if (
      el.querySelector(interactiveSelector) &&
      Array.from(el.querySelectorAll("div")).some((child: any) =>
        isInteractiveListBodyText(child),
      )
    ) {
      return true;
    }

    if (hasTextBlockListItemContent(el)) {
      return true;
    }

    if (hasSplitTextListItemContent(el)) {
      return true;
    }

    const linkedHeading = el.querySelector(
      "h1 a[href], h2 a[href], h3 a[href], h4 a[href], h5 a[href], h6 a[href]",
    );
    return Boolean(linkedHeading && textWithoutInteractive(el));
  }

  function hasRichProductCardListItemContent(el: any): boolean {
    if (!isListItem(el)) return false;
    if (!el.querySelector("button, [role='button'], a[href], [role='link']")) return false;

    const paragraphs = Array.from(el.querySelectorAll("p")).filter(
      (paragraph: any) => !isHidden(paragraph) && Boolean(readableText(paragraph)),
    );
    if (paragraphs.length < 5) return false;

    const labelledImages = Array.from(
      el.querySelectorAll("img[alt], [role='img'][aria-label], svg[aria-label]"),
    ).filter(
      (image: any) =>
        !isHidden(image) && Boolean(accessibleName(image, implicitRole(image))),
    );
    const featureRows = paragraphs.filter((paragraph: any) =>
      isRichProductCardFeatureRow(paragraph, true),
    );
    return labelledImages.length >= 3 && featureRows.length >= 2;
  }

  function groupedListItemCardContainerFor(el: any): any | undefined {
    const listItem = el?.closest?.("li,[role='listitem']");
    if (!isListItem(listItem)) return undefined;

    for (let current = el.parentElement; current && current !== listItem; current = current.parentElement) {
      if (
        current.parentElement === listItem &&
        implicitRole(current) === "group" &&
        accessibleName(current, "group") &&
        current.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']") &&
        current.querySelector("ul, ol, dl, [role='list']") &&
        current.querySelector(interactiveSelector) &&
        current.contains(el)
      ) {
        return current;
      }
    }

    return undefined;
  }

  function suppressGroupedListItemCardDescendantPosition(el: any, role: string): boolean {
    if (!["paragraph", "text"].includes(role)) return false;
    return Boolean(groupedListItemCardContainerFor(el));
  }

  function isRichProductCardFeatureRow(el: any, skipCardCheck = false): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName.toLowerCase() !== "p") return false;
    const listItem = el.closest("li,[role='listitem']");
    if (!skipCardCheck && !hasRichProductCardListItemContent(listItem)) return false;
    if (el.querySelector(interactiveSelector)) return false;
    return Boolean(
      Array.from(el.querySelectorAll("img, [role='img'], svg[aria-label]")).some(
        (image: any) =>
          !isHidden(image) &&
          implicitRole(image) === "image" &&
          Boolean(accessibleName(image, "image")),
      ) && textWithoutInteractive(el),
    );
  }

  function isFirstRichProductCardParagraph(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName.toLowerCase() !== "p") return false;
    const listItem = el.closest("li,[role='listitem']");
    if (!hasRichProductCardListItemContent(listItem)) return false;
    if (richProductCardOfferBanner(listItem)) return false;
    const paragraphs = Array.from(listItem.querySelectorAll("p")).filter(
      (paragraph: any) => !isHidden(paragraph) && Boolean(readableText(paragraph)),
    );
    return paragraphs[0] === el;
  }

  function richProductCardOfferBanner(listItem: any): any | undefined {
    if (!hasRichProductCardListItemContent(listItem)) return undefined;
    return Array.from(listItem.querySelectorAll("div, span")).find((candidate: any) => {
      if (isHidden(candidate) || !readableText(candidate)) return false;
      if (candidate.querySelector(interactiveSelector) || candidate.closest(interactiveSelector)) {
        return false;
      }
      const className = normalize(candidate.getAttribute("class")) || "";
      return /\boffer\b/i.test(className) && /\bbanner\b/i.test(className);
    });
  }

  function isRichProductCardOfferBanner(el: any): boolean {
    const listItem = el.closest("li,[role='listitem']");
    return richProductCardOfferBanner(listItem) === el;
  }

  function richProductCardFeatureRowFragments(el: any): string[] | undefined {
    if (!isRichProductCardFeatureRow(el)) return undefined;
    const image = Array.from(el.querySelectorAll("img, [role='img'], svg[aria-label]")).find(
      (candidate: any) =>
        !isHidden(candidate) &&
        implicitRole(candidate) === "image" &&
        Boolean(accessibleName(candidate, "image")),
    );
    const imageLabel = image ? accessibleName(image, "image") : undefined;
    const text = textWithoutInteractive(el);
    return [
      imageLabel ? `${imageLabel}, image` : undefined,
      text,
    ].filter((entry): entry is string => Boolean(entry));
  }

  function isFirstRichProductCardListItem(listItem: any): boolean {
    if (!hasRichProductCardListItemContent(listItem)) return false;
    const list = listItem.parentElement;
    if (!list || implicitRole(list) !== "list") return false;
    const richItems = Array.from(list.children || []).filter((child: any) =>
      hasRichProductCardListItemContent(child),
    );
    return richItems[0] === listItem;
  }

  function isRichProductCardFeatureHeading(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName.toLowerCase() !== "p") return false;
    if (el.querySelector(interactiveSelector)) return false;

    const listItem = el.closest("li,[role='listitem']");
    if (!isFirstRichProductCardListItem(listItem)) return false;

    const parent = el.parentElement;
    if (!parent) return false;
    const readableParagraphs = Array.from(parent.children || []).filter(
      (paragraph: any) =>
        paragraph.tagName?.toLowerCase() === "p" &&
        !isHidden(paragraph) &&
        Boolean(readableText(paragraph)),
    );
    if (readableParagraphs[0] !== el) return false;

    const headingText = readableText(el);
    if (!headingText || !/:$/.test(headingText)) return false;
    return readableParagraphs.slice(1).some((paragraph: any) =>
      isRichProductCardFeatureRow(paragraph),
    );
  }

  function richProductCardTextFragments(listItem: any): any[] {
    if (!hasRichProductCardListItemContent(listItem)) return [];
    return Array.from(listItem.querySelectorAll("span, div")).filter((candidate: any) =>
      isRichProductCardTextFragment(candidate),
    );
  }

  function isRichProductCardTextFragment(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (!["span", "div"].includes(el.tagName.toLowerCase())) return false;
    if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector)) return false;
    if (!directOwnText(el)) return false;
    if (
      Array.from(el.children || []).some(
        (child: any) => !isHidden(child) && Boolean(readableText(child)),
      )
    ) {
      return false;
    }
    const listItem = el.closest("li,[role='listitem']");
    if (!hasRichProductCardListItemContent(listItem)) return false;
    return Boolean(
      el.closest(".bos-offer-banner-box, p") ||
        /feature/i.test(normalize(el.getAttribute("class")) || ""),
    );
  }

  function isFirstRichProductCardTextFragment(el: any): boolean {
    const listItem = el.closest("li,[role='listitem']");
    return richProductCardTextFragments(listItem)[0] === el;
  }

  function hasTextBlockListItemContent(el: any): boolean {
    if (!isListItem(el)) return false;
    if (el.querySelector(interactiveSelector)) return false;
    const paragraphs = Array.from(el.querySelectorAll("p")).filter(
      (paragraph: any) => !isHidden(paragraph) && Boolean(readableText(paragraph)),
    );
    return paragraphs.length > 1;
  }

  function isFirstTextBlockListItemParagraph(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName.toLowerCase() !== "p") return false;
    const listItem = el.closest("li,[role='listitem']");
    if (!hasTextBlockListItemContent(listItem)) return false;
    const paragraphs = Array.from(listItem.querySelectorAll("p")).filter(
      (paragraph: any) => !isHidden(paragraph) && Boolean(readableText(paragraph)),
    );
    return paragraphs[0] === el;
  }

  function isStructuredListBodyText(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName.toLowerCase() !== "div") return false;
    if (el.querySelector(interactiveSelector)) return false;
    if (el.closest(interactiveSelector)) return false;
    if (
      el.querySelector(
        "h1, h2, h3, h4, h5, h6, [role='heading'], ul, ol, [role='list']",
      )
    ) {
      return false;
    }
    const listItem = el.parentElement;
    if (!isListItem(listItem)) return false;
    if (!listItem.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']")) {
      return false;
    }
    return Boolean(readableText(el));
  }

  function isInteractiveListBodyText(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName.toLowerCase() !== "div") return false;
    if (el.querySelector(interactiveSelector)) return false;
    if (
      el.querySelector(
        "h1, h2, h3, h4, h5, h6, [role='heading'], ul, ol, [role='list']",
      )
    ) {
      return false;
    }
    const listItem = el.closest("li,[role='listitem']");
    if (!isListItem(listItem) || !listItem.querySelector(interactiveSelector)) {
      return false;
    }
    const parent = el.parentElement;
    if (!parent || parent === listItem || !parent.querySelector(interactiveSelector)) {
      return false;
    }
    return Boolean(readableText(el));
  }

  function cardDetailTextWithTrailingDisclaimer(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName.toLowerCase() !== "div") return false;
    if (el.matches(interactiveSelector) || el.closest(interactiveSelector)) return false;
    if (el.querySelector("h1, h2, h3, h4, h5, h6, [role='heading'], ul, ol, [role='list'], table, [role='table'], [role='grid']")) {
      return false;
    }
    const text = textWithoutInteractive(el);
    if (!text) return false;

    const buttons = Array.from(el.querySelectorAll("button, [role='button']")).filter(
      (button: any) => !isHidden(button),
    );
    if (buttons.length !== 1 || !isTrailingDisclaimerButton(buttons[0])) return false;

    return hasPreviousCardActionControls(el);
  }

  function isCardDetailTextLeaf(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (!["span", "div"].includes(el.tagName.toLowerCase())) return false;
    if (!directOwnText(el)) return false;
    if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector)) return false;
    return cardDetailTextWithTrailingDisclaimer(el.parentElement);
  }

  function isInteractiveCardListButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (isNativeCardActionDisclosureButton(el)) return false;
    if (!el.querySelector("svg, img, [role='img']")) return false;
    const listItem = el.closest("li,[role='listitem']");
    if (!isListItem(listItem)) return false;
    return Array.from(listItem.querySelectorAll("div")).some((candidate: any) =>
      isInteractiveListBodyText(candidate),
    );
  }

  function isFirstInteractiveListBodyText(el: any): boolean {
    if (!isInteractiveListBodyText(el)) return false;
    const listItem = el.closest("li,[role='listitem']");
    if (
      listItem?.querySelector(
        "h1 a[href], h2 a[href], h3 a[href], h4 a[href], h5 a[href], h6 a[href]",
      )
    ) {
      return false;
    }
    const blocks = Array.from(listItem?.querySelectorAll("div") || []).filter(
      (candidate: any) => isInteractiveListBodyText(candidate),
    );
    return blocks[0] === el;
  }

  function structuredListItemHasPreHeadingImage(el: any): boolean {
    if (!hasStructuredListItemContent(el)) return false;
    const firstHeading = el.querySelector(
      "h1, h2, h3, h4, h5, h6, [role='heading']",
    );
    if (!firstHeading) return false;

    const firstImage = Array.from(
      el.querySelectorAll("img, svg, [role='img']"),
    ).find((image: any) => !isHidden(image));
    if (!firstImage) return false;

    return Boolean(
      firstImage.compareDocumentPosition(firstHeading) &
        firstImage.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,
    );
  }

  function isIconOnlyLink(el: any): boolean {
    if (implicitRole(el) !== "link") return false;
    if (!nestedImageLabel(el)) return false;
    const clone = el.cloneNode(true);
    for (const node of Array.from(
      clone.querySelectorAll("img, svg, [role='img'], [aria-hidden='true']"),
    )) {
      node.remove();
    }
    return !readableText(clone);
  }

  function isTextlessCarouselPaginatorLink(el: any): boolean {
    if (implicitRole(el) !== "link") return false;
    if (!el.closest(".carousel-paginator")) return false;
    if (normalize(accessibleName(el, "link")) || readableText(el)) return false;
    const listItem = el.closest("li,[role='listitem']");
    if (!listItem) return false;
    const list = listItem.parentElement;
    return Boolean(list && /\bcarousel-paginator\b/.test(list.getAttribute("class") || ""));
  }

  function isUnnamedCarouselNavigationButtonWrapper(el: any): boolean {
    if (!isCustomElement(el)) return false;
    if (!el.closest(".carousel-navigation")) return false;
    if (accessibleName(el, "group") || readableText(el)) return false;

    const buttons: any[] = [];
    const visit = (node: any) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (node !== el && implicitRole(node) === "button") {
        buttons.push(node);
        return;
      }
      for (const child of walkChildren(node)) visit(child);
    };
    visit(el);
    if (buttons.length !== 1) return false;

    const button = buttons[0] as any;
    return !normalize(accessibleName(button, "button") || readableText(button));
  }

  function isLwcLikeCustomElement(el: any): boolean {
    if (!isCustomElement(el)) return false;
    const tag = el.tagName.toLowerCase();
    if (
      tag.startsWith("lightning-") ||
      tag.startsWith("vlocity_cmt-") ||
      tag.startsWith("c-")
    ) {
      return true;
    }
    return Array.from(el.attributes || []).some((attr: any) =>
      /^lwc-|.+-host$/.test(attr.name),
    );
  }

  function customElementContributesLabelRoleOrState(el: any): boolean {
    if (!isCustomElement(el)) return false;
    if (el.getAttribute("role")) return true;
    if (el.hasAttribute("tabindex")) return true;
    if (normalize(el.getAttribute("aria-label"))) return true;
    if (textFromIdRefs(el.getAttribute("aria-labelledby"))) return true;
    if (normalize(el.getAttribute("title"))) return true;
    if (normalize(el.getAttribute("name"))) return true;

    return [
      "aria-expanded",
      "aria-haspopup",
      "aria-pressed",
      "aria-selected",
      "aria-checked",
      "aria-current",
      "aria-disabled",
      "aria-controls",
      "aria-describedby",
      "aria-description",
    ].some((attr) => el.hasAttribute(attr));
  }

  function isNativeExposedLinkButtonOrGroup(el: any, role = implicitRole(el)): boolean {
    const tag = el?.tagName?.toLowerCase();
    if (role === "link") return tag === "a" && el.hasAttribute("href");
    if (role === "button") {
      if (tag === "button") return true;
      if (tag !== "input") return false;
      return ["button", "submit", "reset"].includes(
        (el.getAttribute("type") || "text").toLowerCase(),
      );
    }
    if (role === "group") {
      return !isCustomElement(el) && Boolean(accessibleName(el, role));
    }
    return false;
  }

  function isNamedCustomShadowGroupStop(el: any, role = implicitRole(el)): boolean {
    if (role !== "group") return false;
    if (!isCustomElement(el) || !hasShadowRootContent(el)) return false;
    return Boolean(accessibleName(el, "group"));
  }

  function wrapsOnlyNativeExposedLinkButtonOrGroupStops(el: any): boolean {
    const exposedStops: any[] = [];
    let hasDisallowedStop = false;

    const visit = (node: any) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;

      if (node !== el) {
        const role = implicitRole(node);
        if (
          isNativeExposedLinkButtonOrGroup(node, role) ||
          isNamedCustomShadowGroupStop(node, role)
        ) {
          exposedStops.push(node);
          return;
        }
        if (isCustomElement(node) && role === "group") {
          if (customElementContributesLabelRoleOrState(node)) {
            hasDisallowedStop = true;
            return;
          }
        } else if (role && isStopElement(node)) {
          hasDisallowedStop = true;
          return;
        }
      }

      for (const child of walkChildren(node)) visit(child);
    };

    visit(el);
    if (hasDisallowedStop || !exposedStops.length) return false;

    const popupMenuButtons = exposedStops.filter(
      (stop) =>
        implicitRole(stop) === "button" &&
        normalizedPopup(stop) &&
        !stop.hasAttribute("aria-expanded"),
    );
    if (popupMenuButtons.length === exposedStops.length) return false;

    return true;
  }

  function isAnonymousStructuralCustomElementGroup(el: any): boolean {
    if (!isCustomElement(el)) return false;
    if (!hasShadowRootContent(el)) return false;
    if (accessibleName(el, "group")) return false;
    if (customElementContributesLabelRoleOrState(el)) return false;
    if (el.matches(interactiveSelector)) return false;
    if (compactInputActionGroupLabel(el)) return false;
    if (isFocusableImageListItem(el) || isFocusableStructuredListItemGroup(el)) {
      return false;
    }
    if (
      el.closest("[aria-roledescription='carousel'], [aria-roledescription='slideshow']") &&
      !isFlattenedSlottedCarouselGroupWrapper(el) &&
      !isUnnamedCarouselNavigationButtonWrapper(el)
    ) {
      return false;
    }

    return (
      isLwcLikeCustomElement(el) ||
      isCodeExampleCustomElementGroup(el) ||
      wrapsOnlyNativeExposedLinkButtonOrGroupStops(el)
    );
  }

  function closestAnonymousStructuralCustomElementGroup(el: any): any {
    for (let current = el?.parentElement; current; current = current.parentElement) {
      if (isAnonymousStructuralCustomElementGroup(current)) return current;
      const shadowHost = shadowContentHostByNode.get(current);
      if (isAnonymousStructuralCustomElementGroup(shadowHost)) return shadowHost;
    }
    const shadowHost = shadowContentHostByNode.get(el);
    if (isAnonymousStructuralCustomElementGroup(shadowHost)) return shadowHost;
    return null;
  }

  function isShadowHostWrappedNativeButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (el.tagName?.toLowerCase() !== "button") return false;
    if (normalizedPopup(el) || el.hasAttribute("aria-expanded")) return false;
    if (el.closest("li,[role='listitem'],td,th,[role='cell'],[role='gridcell']")) {
      return false;
    }
    if (!shadowInclusiveAncestor(el, "nav,[role='navigation']")) return false;
    if (readableText(el)) return false;

    const host = shadowContentHostByNode.get(el);
    if (!isAnonymousStructuralCustomElementGroup(host)) return false;

    const controls = nativeControlsAcrossShadow(host);
    return controls.length === 1 && controls[0] === el;
  }

  function nativeControlsAcrossShadow(root: any): any[] {
    const controls: any[] = [];
    const visit = (node: any) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (
        implicitRole(node) === "button" ||
        implicitRole(node) === "link" ||
        ["input", "select", "textarea"].includes(node.tagName?.toLowerCase())
      ) {
        controls.push(node);
        return;
      }
      for (const child of walkChildren(node)) visit(child);
    };
    for (const child of walkChildren(root)) visit(child);
    return controls;
  }

  function isAxConfirmedSingleButtonShadowWrapperGroup(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (el.tagName?.toLowerCase() !== "button") return false;
    if (normalizedPopup(el) || el.hasAttribute("aria-expanded")) return false;
    if (!readableText(el)) return false;
    if (
      el.closest(
        [
          "nav",
          "[role='navigation']",
          "form",
          "search",
          "[role='search']",
          "li",
          "[role='listitem']",
          "td",
          "th",
          "[role='cell']",
          "[role='gridcell']",
          "[aria-roledescription='carousel']",
          "[aria-roledescription='slideshow']",
        ].join(","),
      )
    ) {
      return false;
    }

    const host = shadowContentHostByNode.get(el);
    if (!isAnonymousStructuralCustomElementGroup(host)) return false;
    const controls = nativeControlsAcrossShadow(host);
    if (controls.length !== 1 || controls[0] !== el) return false;

    const wrapper = host?.parentElement;
    if (!wrapper || wrapper === document.body || wrapper === document.documentElement) {
      return false;
    }
    if (isHidden(wrapper) || wrapper.matches(interactiveSelector)) return false;
    if (wrapper.getAttribute("role") || wrapper.getAttribute("aria-label") || wrapper.getAttribute("aria-labelledby")) {
      return false;
    }
    if (directOwnText(wrapper)) return false;

    const visibleChildren = Array.from(wrapper.children || []).filter(
      (child: any) => !isHidden(child),
    );
    if (visibleChildren.length !== 1 || visibleChildren[0] !== host) return false;

    const wrapperNode = axNodeForElementRole(wrapper, "generic");
    if (!wrapperNode || normalize(wrapperNode.name)) return false;
    const axChildren = axChildNodes(wrapperNode);
    if (axChildren.length !== 1 || normalizedAxRole(axChildren[0].role) !== "button") {
      return false;
    }

    const buttonName = normalize(accessibleName(el, "button") || readableText(el));
    return Boolean(buttonName && normalize(axChildren[0].name) === buttonName);
  }

  function shadowInclusiveAncestor(el: any, selector: string): any | null {
    const seen = new Set<any>();
    for (
      let current = el?.parentElement || shadowContentHostByNode.get(el);
      current && !seen.has(current);
    ) {
      seen.add(current);
      if (current.matches?.(selector)) return current;
      current = current.parentElement || shadowContentHostByNode.get(current);
    }
    return null;
  }

  function parseBooleanAttribute(el: any, name: string): boolean | undefined {
    if (!el.hasAttribute(name)) return undefined;
    return el.getAttribute(name) === "true";
  }

  function normalizedPopup(el: any): string | undefined {
    const value = el.getAttribute("aria-haspopup");
    if (!value || value === "false") return undefined;
    return value === "true" ? "menu" : value;
  }

  function tableContext(el: any, role: string) {
    const table = el.closest("table,[role='table'],[role='grid']");
    if (!table) return {};

    const row = el.closest("tr,[role='row']");
    const cell = el.closest(
      "th,td,[role='cell'],[role='gridcell'],[role='rowheader'],[role='columnheader']",
    );
    const rows = tableRows(table);
    const columnCount = tableColumnCount(rows);
    const tableRole = isExpandedAutocompletePopupGrid(table) ? "table" : implicitRole(table);

    if (!row || !cell) {
      return {
        tableRole,
        tableLabel: accessibleName(table, implicitRole(table)),
        rowCount: rows.length || undefined,
        columnCount,
      };
    }

    const cells = Array.from(row.children).filter((child: any) => {
      const childRole = implicitRole(child);
      return ["cell", "gridcell", "rowheader", "columnheader"].includes(
        childRole,
      );
    });

    const rowIndex = rows.indexOf(row);
    const columnIndex = cells.indexOf(cell);
    const firstHeaderRow = rows.find((candidate: any) =>
      Array.from(candidate.children || []).some((child: any) => {
        const childRole = implicitRole(child);
        return ["columnheader", "rowheader"].includes(childRole);
      }),
    );
    const headerCells = Array.from(firstHeaderRow?.children || []).filter(
      (child: any) => {
        const childRole = implicitRole(child);
        return ["columnheader", "rowheader"].includes(childRole);
      },
    );
    const columnHeaderOffset =
      columnCount && headerCells.length === columnCount - 1 ? 1 : 0;
    const columnHeader =
      columnIndex >= columnHeaderOffset
        ? headerCells[columnIndex - columnHeaderOffset]
        : null;
    const tableHasComplexColumnHeaders = headerCells.some((header: any) =>
      isComplexColumnHeaderContext(header),
    );
    const columnHeaderFragments =
      role !== "columnheader" && columnHeader
        ? complexColumnHeaderContextFragments(columnHeader)
        : [];
    const complexColumnHeaderContextText =
      columnHeaderFragments.length >= 3
        ? formatConjunctiveList(columnHeaderFragments)
        : undefined;
    const cellRole = implicitRole(cell);
    const columnHeaderText =
      role !== "columnheader" && cellRole !== "columnheader" && columnHeader
        ? complexColumnHeaderContextText ||
          accessibleName(columnHeader, "columnheader")
        : undefined;
    const suppressColumnHeaderText = Boolean(tableCellAbbrTitleButtonName(el, role));
    const groupedHeaderNames = groupedTableHeaderNames(table);
    const tableGroupHeaderText =
      columnIndex === 0 && groupedHeaderNames.length > 1
        ? formatConjunctiveList(groupedHeaderNames)
        : undefined;
    const tableGroupedHeaderRow =
      Boolean(tableGroupHeaderText) &&
      Boolean(row.closest("thead")) &&
      Boolean(row.querySelector("button[aria-controls]"));
    const tableFirstGroupedHeaderRow =
      tableGroupedHeaderRow &&
      row === groupedTableHeaders(table)[0]?.querySelector("tr,[role='row']");
    const insideColumnHeaderContent =
      role !== "columnheader" &&
      cellRole === "columnheader" &&
      isComplexColumnHeaderContext(cell);
    const simpleNativeTwoColumnHeaderContext =
      isSimpleNativeTwoColumnHeaderTable(table, rows, headerCells, columnCount);
    const simpleNativeColumnHeaderContext =
      isSimpleNativeColumnHeaderTable(table, rows, headerCells, columnCount);
    const nativeUnheadedFirstColumnContext =
      isNativeUnheadedFirstColumnTable(table, rows, headerCells, columnCount);

    return {
      tableRole,
      tableLabel: accessibleName(table, implicitRole(table)),
      rowIndex:
        !insideColumnHeaderContent && rowIndex >= 0 ? rowIndex + 1 : undefined,
      rowCount: rows.length || undefined,
      columnIndex:
        !insideColumnHeaderContent && columnIndex >= 0
          ? columnIndex + 1
          : undefined,
      columnCount:
        !insideColumnHeaderContent ? columnCount || cells.length || undefined : undefined,
      columnHeaderText: suppressColumnHeaderText ? undefined : columnHeaderText,
      complexColumnHeaderContextText,
      tableGroupHeaderText,
      tableGroupedHeaderRow,
      tableFirstGroupedHeaderRow,
      tableHasComplexColumnHeaders,
      simpleNativeTwoColumnHeaderContext,
      simpleNativeColumnHeaderContext,
      nativeUnheadedFirstColumnContext,
    };
  }

  function tableHasInteractiveDescendant(table: any): boolean {
    return Boolean(
      table?.querySelector?.("a[href], button, input, select, textarea, [role='link'], [role='button']"),
    );
  }

  function isSimpleNativeColumnHeaderTable(
    table: any,
    rows: any[],
    headerCells: any[],
    columnCount?: number,
  ): boolean {
    if (table?.tagName?.toLowerCase() !== "table") return false;
    if (implicitRole(table) !== "table") return false;
    if (!columnCount || columnCount < 2 || !headerCells.length) return false;
    if (tableHasInteractiveDescendant(table)) return false;
    if (groupedTableHeaders(table).length) return false;
    const firstRow = rows[0];
    if (!firstRow?.closest?.("thead")) return false;
    const headerRows = rows.filter((row: any) => row.closest?.("thead"));
    if (headerRows.length !== 1) return false;
    if (headerCells.length !== columnCount) return false;
    return headerCells.every(
      (cell: any) =>
        cell.tagName?.toLowerCase() === "th" &&
        implicitRole(cell) === "columnheader" &&
        Boolean(accessibleName(cell, "columnheader") || readableText(cell)),
    );
  }

  function isNativeUnheadedFirstColumnTable(
    table: any,
    rows: any[],
    headerCells: any[],
    columnCount?: number,
  ): boolean {
    if (table?.tagName?.toLowerCase() !== "table") return false;
    if (implicitRole(table) !== "table") return false;
    if (!columnCount || columnCount < 2) return false;
    if (headerCells.length) return false;
    if (table.querySelector(":scope > thead")) return false;
    if (tableHasInteractiveDescendant(table)) return false;
    return rows.length > 0;
  }

  function isSimpleNativeTwoColumnHeaderTable(
    table: any,
    rows: any[],
    headerCells: any[],
    columnCount?: number,
  ): boolean {
    if (table?.tagName?.toLowerCase() !== "table") return false;
    if (implicitRole(table) !== "table") return false;
    if (rows.length !== 2 || columnCount !== 2 || headerCells.length !== 2) {
      return false;
    }

    const [headerRow, bodyRow] = rows;
    if (!headerRow?.closest?.("thead") || !bodyRow?.closest?.("tbody")) return false;
    if (
      !headerCells.every(
        (cell: any) =>
          cell.tagName?.toLowerCase() === "th" &&
          implicitRole(cell) === "columnheader" &&
          Boolean(accessibleName(cell, "columnheader") || readableText(cell)),
      )
    ) {
      return false;
    }

    const bodyCells = Array.from(bodyRow.children || []).filter((child: any) =>
      ["cell", "gridcell"].includes(implicitRole(child)),
    );
    return bodyCells.length === 2;
  }

  function isComplexColumnHeaderContext(el: any): boolean {
    return complexColumnHeaderContextFragments(el).length >= 3;
  }

  function complexColumnHeaderContextFragments(el: any): string[] {
    return leafTextFragments(el).filter((fragment) => {
      if (/^£/.test(fragment)) return false;
      if (/^Over a /i.test(fragment)) return false;
      if (/Requires streaming/i.test(fragment)) return false;
      return true;
    });
  }

  function closestComplexColumnHeader(el: any): any | null {
    const header = el?.closest?.(
      "th,[role='columnheader']",
    );
    if (!header || implicitRole(header) !== "columnheader") return null;
    return isComplexColumnHeaderContext(header) ? header : null;
  }

  function complexColumnHeaderColorFragments(header: any): string[] {
    const fragments = complexColumnHeaderContextFragments(header);
    const availableIndex = fragments.findIndex((fragment) =>
      /^Available in$/i.test(fragment),
    );
    if (availableIndex < 0) return [];

    const colors: string[] = [];
    for (const fragment of fragments.slice(availableIndex + 1)) {
      if (/^\d/.test(fragment) || /^TV Starting from$/i.test(fragment)) break;
      if (/^(Learn more|Learn More|Buy Now)$/i.test(fragment)) break;
      colors.push(fragment);
    }
    return colors;
  }

  function complexColumnHeaderColorGroupText(el: any, role: string): string | undefined {
    if (role !== "text" && role !== "paragraph") return undefined;
    const header = closestComplexColumnHeader(el);
    if (!header) return undefined;

    const text = normalize(readableText(el) || el.textContent || "");
    if (!text) return undefined;

    const colors = complexColumnHeaderColorFragments(header);
    return colors[0] === text && colors.length > 1 ? colors.join("") : undefined;
  }

  function isConsumedComplexColumnHeaderColorStop(el: any, role: string): boolean {
    if (role !== "text" && role !== "paragraph") return false;
    const header = closestComplexColumnHeader(el);
    if (!header) return false;

    const text = normalize(readableText(el) || el.textContent || "");
    if (!text) return false;

    const colors = complexColumnHeaderColorFragments(header);
    const index = colors.indexOf(text);
    return index > 0;
  }

  function isConsumedComplexColumnHeaderTitleStop(el: any, role: string): boolean {
    if (role !== "text" && role !== "paragraph") return false;
    const header = closestComplexColumnHeader(el);
    if (!header) return false;

    const fragments = complexColumnHeaderContextFragments(header);
    const title = fragments[0];
    if (!title) return false;

    const text = normalize(readableText(el) || el.textContent || "");
    return text === title;
  }

  function complexColumnHeaderTextFragments(el: any, role: string): string[] | undefined {
    if (role !== "text" && role !== "paragraph") return undefined;
    if (!closestComplexColumnHeader(el)) return undefined;
    if (complexColumnHeaderColorGroupText(el, role)) return undefined;

    const fragments = leafTextFragments(el);
    if (fragments.length < 2) return undefined;

    const label = normalize(textWithoutInteractive(el) || readableText(el));
    if (!label || normalize(fragments.join(" ")) !== label) return undefined;
    return fragments;
  }

  function complexColumnHeaderContextCellTextFragments(
    el: any,
    role: string,
    contextText?: string,
  ): string[] | undefined {
    if (!["cell", "gridcell"].includes(role) || !contextText) return undefined;
    const fragments = leafTextFragments(el);
    if (fragments.length < 2) return undefined;

    const label = normalize(textWithoutInteractive(el) || readableText(el));
    if (!label || normalize(fragments.join(" ")) !== label) return undefined;
    return fragments;
  }

  function complexColumnHeaderText(el: any): string | undefined {
    const fragments = complexColumnHeaderFragments(el, "columnheader")
      .complexColumnHeaderFragments;
    return fragments ? formatConjunctiveList(fragments) : undefined;
  }

  function tableRows(table: any): any[] {
    const usesGroupedSections = Boolean(
      table.querySelector(":scope > thead button[aria-controls]"),
    );
    const allRows = Array.from(table.querySelectorAll("tr,[role='row']")).filter(
      (candidate: any) => !isHidden(candidate),
    );
    if (!usesGroupedSections) return allRows;

    return allRows.filter((row: any) => !isInsideControlledTableGroupBody(row));
  }

  function groupedTableHeaderNames(table: any): string[] {
    return groupedTableHeaders(table)
      .flatMap((header: any) =>
        Array.from(header.querySelectorAll("button[aria-controls]")),
      )
      .filter((button: any) => !isHidden(button))
      .map((button: any) => accessibleName(button, implicitRole(button)))
      .filter((name: any): name is string => Boolean(name));
  }

  function groupedTableHeaders(table: any): any[] {
    return Array.from(table.children || []).filter(
      (child: any) =>
        child.tagName?.toLowerCase() === "thead" &&
        Boolean(child.querySelector("button[aria-controls]")),
    );
  }

  function tableColumnCount(rows: any[]): number | undefined {
    const counts = rows
      .map((row: any) =>
        Array.from(row.children || []).filter((child: any) => {
          const childRole = implicitRole(child);
          return ["cell", "gridcell", "rowheader", "columnheader"].includes(
            childRole,
          );
        }).length,
      )
      .filter(Boolean);
    return counts.length ? Math.max(...counts) : undefined;
  }

  function isInsideControlledTableGroupBody(el: any): boolean {
    const groupBody = el.closest("tbody[role='region'][aria-labelledby][id]");
    if (!groupBody) return false;

    const table = groupBody.closest("table,[role='table'],[role='grid']");
    if (!table) return false;

    const bodyId = groupBody.getAttribute("id");
    if (!bodyId) return false;

    return Boolean(
      table.querySelector(
        `:scope > thead button[aria-controls='${cssEscape(bodyId)}']`,
      ),
    );
  }

  function hasVisibleInteractiveDescendant(el: any): boolean {
    function collect(node: any): boolean {
      if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) {
        return false;
      }
      if (node !== el && node.matches(interactiveSelector)) {
        return true;
      }
      return walkChildren(node).some((child: any) => collect(child));
    }

    return collect(el);
  }

  function hasOnlyLinkContent(el: any): boolean {
    const interactiveDescendants = Array.from(
      el.querySelectorAll(interactiveSelector),
    ).filter((candidate: any) => !isHidden(candidate));
    return Boolean(
      interactiveDescendants.length > 0 &&
        interactiveDescendants.every((candidate: any) => implicitRole(candidate) === "link") &&
        !textWithoutInteractive(el),
    );
  }

  function classTokens(el: any): Set<string> {
    return new Set((normalize(el?.getAttribute?.("class")) || "").split(" ").filter(Boolean));
  }

  function sharesParagraphTextClassFamily(a: any, b: any): boolean {
    const aTokens = classTokens(a);
    const bTokens = classTokens(b);
    if (!aTokens.size || !bTokens.size) return false;
    return Array.from(aTokens).some(
      (token) =>
        bTokens.has(token) &&
        (/^(bos-text_|slds-text-align_|slds-align_|slds-size_|slds-medium-size_)/.test(token) ||
          token === "slds-align_absolute-center"),
    );
  }

  function adjacentParagraphValueText(el: any): string | undefined {
    if (el?.tagName?.toLowerCase() !== "p") return undefined;
    if (el.querySelector(interactiveSelector)) return undefined;
    if (el.closest("li,[role='listitem']")) return undefined;

    const label = normalize(textWithoutInteractive(el) || readableText(el));
    if (!label?.endsWith(":")) return undefined;
    if (label.length > 80) return undefined;

    const next = el.nextElementSibling;
    if (next?.tagName?.toLowerCase() !== "p" || isHidden(next)) return undefined;
    if (next.querySelector(interactiveSelector)) return undefined;
    if (next.querySelector("img, svg, [role='img']")) return undefined;
    if (!sharesParagraphTextClassFamily(el, next)) return undefined;

    return normalize(textWithoutInteractive(next) || readableText(next));
  }

  function isConsumedAdjacentParagraphValue(el: any): boolean {
    if (el?.tagName?.toLowerCase() !== "p") return false;
    const previous = el.previousElementSibling;
    return Boolean(previous && adjacentParagraphValueText(previous));
  }

  function tableCellShouldYieldToStructuredContent(el: any, role: string): boolean {
    if (!["cell", "gridcell", "rowheader", "columnheader"].includes(role)) {
      return false;
    }
    return Boolean(
      el.querySelector(
        "a[href], button, [role='button'], [role='link'], ul, ol, dl, [role='list']",
      ),
    );
  }

  function directHeadingFragments(el: any): string[] | undefined {
    if (implicitRole(el) !== "heading") return undefined;
    if (el.querySelector("button, [role='button'], a[href]")) return undefined;

    function axLeadingSpaceHeadingFragments(): string[] | undefined {
      const tag = el.tagName?.toLowerCase();
      const level = Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2;
      if (level <= 1) return undefined;

      const axNode = axNodeForElementRole(el, "heading");
      const axName = axNode?.name || "";
      if (!/^[\s\u00A0]/u.test(axName)) return undefined;
      const childIds = axNode?.childIds || [];
      if (childIds.length !== 2) return undefined;

      const [spaceNodeId, titleWrapperNodeId] = childIds;
      const spaceNode = accessibilityNodeById.get(spaceNodeId);
      const titleWrapperNode = accessibilityNodeById.get(titleWrapperNodeId);
      if (
        normalizedAxRole(spaceNode?.role) !== "statictext" ||
        !spaceNode?.name ||
        !/^[\s\u00A0]+$/u.test(spaceNode.name)
      ) {
        return undefined;
      }
      if (!titleWrapperNode?.ignored || !titleWrapperNode.childIds?.length) {
        return undefined;
      }

      const titleFragments = titleWrapperNode.childIds
        .map((childId) => accessibilityNodeById.get(childId))
        .filter((node) => normalizedAxRole(node?.role) === "statictext")
        .map((node) => normalize(node?.name))
        .filter((fragment): fragment is string => Boolean(fragment));
      if (titleFragments.length !== 1) return undefined;

      const title = titleFragments[0];
      if (normalize(axName) !== title || normalize(readableText(el)) !== title) {
        return undefined;
      }
      return ["space", title];
    }

    function lineBreakFragments(container: any): string[] | undefined {
      const fragments: string[] = [];
      let current = "";
      for (const child of Array.from(container.childNodes)) {
        if (
          child.nodeType === Node.ELEMENT_NODE &&
          child.tagName?.toLowerCase() === "br"
        ) {
          const fragment = normalize(current);
          if (fragment) fragments.push(fragment);
          current = "";
          continue;
        }
        if (child.nodeType === Node.TEXT_NODE) {
          current = `${current} ${child.textContent || ""}`;
        } else if (child.nodeType === Node.ELEMENT_NODE && !isHidden(child)) {
          current = `${current} ${readableText(child) || ""}`;
        }
      }
      const lastFragment = normalize(current);
      if (lastFragment) fragments.push(lastFragment);
      return fragments.length > 1 ? fragments : undefined;
    }

    function axTrailingLineBreakMarkerFragments(fragments?: string[]): string[] | undefined {
      if (!fragments?.length || level !== 1) return fragments;
      const axNode = axNodeForElementRole(el, "heading");
      const axName = normalize(axNode?.name);
      if (!axNode || !axName?.endsWith("_")) return fragments;

      const axChildren = axChildNodes(axNode);
      const hasLineBreakChild = axChildren.some(
        (child) => normalizedAxRole(child.role) === "linebreak",
      );
      if (!hasLineBreakChild) return fragments;

      const textBeforeMarker = normalize(axName.replace(/_+$/u, ""));
      if (textBeforeMarker !== normalize(fragments.join(" "))) return fragments;
      return [...fragments, "-"];
    }

    const visibleChildren = Array.from(el.children || []).filter(
      (child: any) => !isHidden(child),
    );
    const tag = el.tagName?.toLowerCase();
    const level = Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2;
    if (
      level === 1 &&
      visibleChildren.length === 1 &&
      !directOwnText(el) &&
      visibleChildren[0].querySelector("br") &&
      Array.from(visibleChildren[0].children || []).some(
        (child: any) => child.tagName?.toLowerCase() !== "br" && !isHidden(child),
      )
    ) {
      return axTrailingLineBreakMarkerFragments(lineBreakFragments(visibleChildren[0]));
    }

    const hasLineBreak = Array.from(el.childNodes).some(
      (child: any) =>
        child.nodeType === Node.ELEMENT_NODE &&
        child.tagName?.toLowerCase() === "br",
    );
    if (hasLineBreak) {
      return axTrailingLineBreakMarkerFragments(lineBreakFragments(el));
    }

    const axFragments = axLeadingSpaceHeadingFragments();
    if (axFragments) return axFragments;

    if (level === 1) {
      const inlineBoundaryFragments: string[] = [];
      let hasDirectText = false;
      let hasInlineBoundaryElement = false;
      let onlyInlineBoundaryElements = true;
      for (const child of Array.from(el.childNodes || [])) {
        if (child.nodeType === Node.TEXT_NODE) {
          const fragment = normalize(child.textContent);
          if (fragment) {
            inlineBoundaryFragments.push(fragment);
            hasDirectText = true;
          }
          continue;
        }
        if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) continue;
        if (!child.matches?.("code, strong, b, em, i")) {
          onlyInlineBoundaryElements = false;
          break;
        }
        const fragment = readableText(child);
        if (fragment) {
          inlineBoundaryFragments.push(fragment);
          hasInlineBoundaryElement = true;
        }
      }
      if (
        onlyInlineBoundaryElements &&
        hasDirectText &&
        hasInlineBoundaryElement &&
        inlineBoundaryFragments.length > 1 &&
        normalize(inlineBoundaryFragments.join(" ")) === normalize(readableText(el))
      ) {
        return inlineBoundaryFragments;
      }
    }

    const directText = Array.from(el.childNodes)
      .filter((child: any) => child.nodeType === Node.TEXT_NODE)
      .map((child: any) => normalize(child.textContent))
      .filter(Boolean);
    if (directText.length) return undefined;

    const fragments = Array.from(el.children)
      .filter((child: any) => !isHidden(child))
      .map((child: any) => readableText(child))
      .filter((fragment): fragment is string => Boolean(fragment));

    return fragments.length > 1 ? fragments : undefined;
  }

  function parenthesizedBoundaryPartCount(el: any): number | undefined {
    const text = normalize(readableText(el));
    if (!text || !/^\(.+\)$/.test(text)) return undefined;

    const visibleElementChildren = Array.from(el.children || []).filter(
      (child: any) => !isHidden(child) && Boolean(readableText(child)),
    );
    if (!directOwnText(el) && visibleElementChildren.length === 1) {
      const child = visibleElementChildren[0];
      const childText = normalize(readableText(child));
      if (childText === text) {
        return parenthesizedBoundaryPartCount(child) || 3;
      }
    }

    const parts: string[] = [];
    let hasBoundarySeparator = false;
    for (const child of Array.from(el.childNodes || [])) {
      if (child.nodeType === Node.COMMENT_NODE) {
        hasBoundarySeparator = true;
        continue;
      }
      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = normalize(child.textContent);
        if (fragment) parts.push(fragment);
        continue;
      }
      if (child.nodeType === Node.ELEMENT_NODE && !isHidden(child)) {
        const fragment = normalize(readableText(child));
        if (fragment) parts.push(fragment);
      }
    }

    if (parts.length < 3 || !hasBoundarySeparator) return undefined;
    return normalize(parts.join("")) === text ? parts.length : undefined;
  }

  function directHeadingFragmentCount(el: any, fragments?: string[]): number | undefined {
    if (!fragments || fragments.length < 2) return undefined;

    const visibleChildren = Array.from(el.children || []).filter(
      (child: any) => !isHidden(child) && Boolean(readableText(child)),
    );
    if (visibleChildren.length !== fragments.length) return undefined;

    const count = visibleChildren.reduce((total: number, child: any) => {
      return total + (parenthesizedBoundaryPartCount(child) || 1);
    }, 0);

    return count > fragments.length ? count : undefined;
  }

  function textBeforeFirstInlineInteractive(el: any): string | undefined {
    const fragments: string[] = [];

    function collect(node: any): boolean {
      if (!node) return false;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = normalize(node.textContent);
        if (text) fragments.push(text);
        return false;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) {
        return false;
      }
      if (node.matches(interactiveSelector)) {
        return true;
      }

      for (const child of Array.from(node.childNodes)) {
        if (collect(child)) {
          return true;
        }
      }
      return false;
    }

    collect(el);
    return normalize(fragments.join(" "));
  }

  function hasInlineInteractiveEmbeddedInText(el: any): boolean {
    if (implicitRole(el) !== "paragraph") return false;
    const interactiveDescendants = Array.from(
      el.querySelectorAll(interactiveSelector),
    ).filter((candidate: any) => !isHidden(candidate));
    if (interactiveDescendants.length !== 1) return false;

    const tokens: string[] = [];
    const textBeforeInteractive: string[] = [];
    let sawInteractive = false;

    function collectTokens(node: any): void {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = normalize(node.textContent);
        if (text) {
          tokens.push("text");
          if (!sawInteractive) {
            textBeforeInteractive.push(text);
          }
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (node.matches(interactiveSelector)) {
        tokens.push("interactive");
        sawInteractive = true;
        return;
      }

      for (const child of Array.from(node.childNodes)) {
        collectTokens(child);
      }
    }

    collectTokens(el);
    const interactiveIndex = tokens.indexOf("interactive");
    if (interactiveIndex < 0) return false;

    return (
      tokens.slice(0, interactiveIndex).includes("text") &&
      tokens.slice(interactiveIndex + 1).includes("text") &&
      /[.!?]/.test(textBeforeInteractive.join(" "))
    );
  }

  function shouldSplitDescribedAutocomplete(el: any, role: string): boolean {
    if (role !== "combobox") return false;
    if (el.tagName.toLowerCase() !== "input") return false;
    const autocomplete = normalize(el.getAttribute("aria-autocomplete"))?.toLowerCase();
    if (
      autocomplete !== "list" &&
      !(autocomplete === "both" && isLabelledHeaderSearchAutocompleteCombobox(el, role))
    ) {
      return false;
    }
    if (!el.hasAttribute("aria-describedby")) return false;
    if (el.hasAttribute("aria-description")) return false;
    return Boolean(accessibleName(el, role) && textFromIdRefs(el.getAttribute("aria-describedby")));
  }

  function carouselControlNameWithDescription(
    el: any,
    role: string,
    name?: string,
  ): string | undefined {
    const controlName = normalize(name);
    if (role !== "button" || !controlName) return undefined;
    if (!/^(previous|next) slide\b/i.test(controlName)) return undefined;
    if (!el.hasAttribute("aria-describedby") || el.hasAttribute("aria-description")) {
      return undefined;
    }

    const carousel = el.closest(
      "[aria-roledescription='carousel'], [aria-roledescription='slideshow']",
    );
    if (!carousel) return undefined;

    const describedBy = normalize(el.getAttribute("aria-describedby"));
    const describedIds = describedBy?.split(/\s+/).filter(Boolean) || [];
    if (!describedIds.length) return undefined;

    const describedElements = describedIds
      .map((id) => resolveIdRef(id))
      .filter((candidate: any): candidate is any => Boolean(candidate && !isHidden(candidate)));
    if (!describedElements.length || describedElements.some((candidate: any) => !carousel.contains(candidate))) {
      return undefined;
    }
    if (describedElements.some((candidate: any) => candidate.matches?.(interactiveSelector))) {
      return undefined;
    }

    const description = normalize(
      describedElements
        .map((candidate: any) => {
          const candidateRole = implicitRole(candidate);
          return accessibleName(candidate, candidateRole) || readableText(candidate);
        })
        .filter(Boolean)
        .join(" "),
    );
    if (!description) return undefined;

    if (accessibilityNodes.length) {
      const axNode = axNodeForElementRole(el, "button");
      if (!axNode || normalize(axNode.name) !== controlName) return undefined;
      if (normalize(axNode.description) !== description) return undefined;
    }

    return normalize(`${controlName} ${description}`);
  }

  function ariaRoleDescriptionForDescriptor(el: any, role: string): string | undefined {
    const roleDescription = normalize(el.getAttribute("aria-roledescription"));
    if (roleDescription === "slide" && role === "group") {
      return el.closest("[aria-roledescription='carousel']") ? roleDescription : undefined;
    }
    return roleDescription;
  }

  function isLabelledHeaderSearchAutocompleteCombobox(el: any, role: string): boolean {
    if (role !== "combobox") return false;
    if (el?.tagName?.toLowerCase() !== "input") return false;
    const type = (el.getAttribute("type") || "text").toLowerCase();
    if (!["text", "search"].includes(type)) return false;
    if (parseBooleanAttribute(el, "aria-expanded") !== false) return false;

    const label = associatedLabelForControl(el);
    const labelText = normalize(textWithoutInteractive(label) || readableText(label));
    const name = accessibleName(el, role);
    if (!labelText || !name || labelText !== name) return false;
    if (!/^search\b/i.test(labelText)) return false;
    if (!el.closest("header,[role='banner']")) return false;

    const controlledId = el.getAttribute("aria-controls") || el.getAttribute("aria-owns");
    const controlled = controlledId ? resolveIdRef(controlledId) : null;
    if (!controlled || implicitRole(controlled) !== "listbox" || !isHidden(controlled)) {
      return false;
    }

    return Boolean(textFromIdRefs(el.getAttribute("aria-describedby")));
  }

  function nativeSelectValue(el: any): string | undefined {
    if (el?.tagName?.toLowerCase() !== "select") return undefined;
    const selectedIndex =
      typeof el.selectedIndex === "number" && el.selectedIndex >= 0
        ? el.selectedIndex
        : undefined;
    return (
      normalize(el.selectedOptions?.[0]?.textContent) ||
      (selectedIndex !== undefined
        ? normalize(el.options?.[selectedIndex]?.textContent)
        : undefined) ||
      ("value" in el && el.value ? normalize(el.value) : undefined)
    );
  }

  function descendantLinkCardHeadingLevel(el: any): number | undefined {
    const heading = descendantLinkCardHeading(el);
    if (!heading) return undefined;
    const tag = heading.tagName?.toLowerCase() || "";
    const level = Number.parseInt(heading.getAttribute("aria-level") || tag.slice(1), 10) || 2;
    if (level >= 3) return level;
    const contentName = linkContentName(el);
    return level >= 2 && axLinkedCardContentName(el, "link", contentName)
      ? level
      : undefined;
  }

  function precedingControlLabelForButton(el: any): string | undefined {
    if (implicitRole(el) !== "button") return undefined;
    const label = normalize(el.getAttribute("aria-label") || accessibleName(el, "button"));
    if (!/^add\s+\d+\b/i.test(label || "")) return undefined;

    for (
      let current = el.parentElement, depth = 0;
      current && depth < 4;
      current = current.parentElement, depth += 1
    ) {
      const labels = Array.from(current.querySelectorAll("label")).filter(
        (candidate: any) => !isHidden(candidate) && !candidate.contains(el),
      );
      if (labels.length !== 1) continue;
      const text = normalize(readableText(labels[0]) || labels[0].textContent);
      if (/^quantity controls\b/i.test(text || "")) return text;
    }

    return undefined;
  }

  function isFieldsetRadioGroup(el: any, role: string): boolean {
    if (role !== "radio") return false;
    const group = el.closest(
      "fieldset, [role='radiogroup'][aria-label], .slds-radio_button-group",
    );
    if (!group) return false;

    const groupTag = group.tagName?.toLowerCase();
    if (groupTag === "fieldset") {
      const tag = el.tagName?.toLowerCase();
      const type = normalize(el.getAttribute("type"))?.toLowerCase();
      const name = normalize(el.getAttribute("name"));
      const hasExplicitGroupName = Boolean(
        group.getAttribute("aria-label") || group.getAttribute("aria-labelledby"),
      );
      if (tag !== "input" || type !== "radio") {
        if (!hasExplicitGroupName) return false;
      } else {
        const hasGroupName =
          hasExplicitGroupName ||
          Boolean(Array.from(group.children || []).find(
            (child: any) =>
              child.tagName?.toLowerCase() === "legend" &&
              !isHidden(child) &&
              readableText(child),
          ));
        if (!name) return false;

        const radios = Array.from(group.querySelectorAll("input[type='radio']")).filter(
          (radio: any) => !isHidden(radio) && normalize(radio.getAttribute("name")) === name,
        );
        if (radios.length <= 1 || !radios.includes(el)) return false;

        if (accessibilityNodes.length) {
          const axNode = axNodeForElementRole(el, "radio");
          if (!axNode) return false;
          if (normalize(axNode.name) !== accessibleName(el, role)) return false;
          const axChecked = axNode.properties?.checked;
          const axCheckedBoolean =
            typeof axChecked === "boolean"
              ? axChecked
              : axChecked === "true"
                ? true
                : axChecked === "false"
                  ? false
                  : undefined;
          if (typeof axCheckedBoolean === "boolean" && axCheckedBoolean !== Boolean(el.checked)) {
            return false;
          }
        } else if (!hasGroupName) {
          return false;
        }

        return true;
      }
    }

    const radios = Array.from(group.querySelectorAll("[role='radio'], input[type='radio']")).filter(
      (radio: any) => !isHidden(radio),
    );
    return radios.length > 1;
  }

  function isGeneratedPseudoPopupButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
    if (!generatedPseudoText(el, "before") && !generatedPseudoText(el, "after")) return false;
    if (!readableText(el)) return false;
    if (normalizedPopup(el) || el.hasAttribute("aria-expanded")) return false;

    const popupSelector = "[role='menu'], [role='listbox'], [role='dialog'], [role='tabpanel'], ul, ol";
    const controls = normalize(el.getAttribute("aria-controls"));
    if (controls) {
      const controlled = document.getElementById(controls);
      if (controlled?.matches?.(popupSelector) && isHidden(controlled)) return true;
    }

    for (
      let current = el.parentElement, depth = 0;
      current && depth < 3;
      current = current.parentElement, depth += 1
    ) {
      const siblings = Array.from(current.children || []).filter((child: any) => child !== el);
      if (
        siblings.some((sibling: any) =>
          sibling.matches?.(popupSelector) && isHidden(sibling),
        )
      ) {
        return true;
      }
    }

    return false;
  }

  function inferredSldsRadioChecked(el: any): boolean | undefined {
    if (implicitRole(el) !== "radio") return undefined;
    if (el.hasAttribute("aria-checked") || el.hasAttribute("checked") || el.checked) {
      return undefined;
    }

    const group = el.closest(".slds-radio_button-group");
    if (!group) return undefined;

    const radios = Array.from(group.querySelectorAll("[role='radio'], input[type='radio']")).filter(
      (radio: any) => !isHidden(radio),
    );
    if (!radios.includes(el)) return undefined;
    if (radios.some((radio: any) => radio !== el && (radio.checked || radio.hasAttribute("checked")))) {
      return undefined;
    }

    const wrapper = el.closest(".slds-radio_button");
    const label = wrapper?.querySelector?.("label");
    const labelClass = normalize(label?.getAttribute("class")) || "";
    const labelStyle = normalize(label?.getAttribute("style")) || "";
    if (/\bradioBkgColor\b/.test(labelClass) || /linear-gradient/i.test(labelStyle)) {
      return true;
    }

    return false;
  }

  function captureElement(el: any): CapturedElementDescriptor | null {
    if (!el || el === document.body || el === document.documentElement || isHidden(el)) {
      return null;
    }

    const role = implicitRole(el);
    if (!role) return null;

    const tag = el.tagName.toLowerCase();
    const nativeDetailsSummary = directNativeDetailsForSummary(el);
    const control =
      role === "combobox" && tag !== "input" && tag !== "select"
        ? el.querySelector("input, select, textarea, [role='textbox'], [role='searchbox']")
        : null;
    const stateEl = control || el;
    const axLinkedOfferHeadingName =
      role === "heading" ? axConfirmedLinkedOfferHeadingName(el, role) : undefined;
    const accessibleRoleName = accessibleName(el, role);
    const articleHeadingName = articleNameFromFirstHeading(el, role);
    const name =
      tableCellAbbrTitleButtonName(el, role) ||
      axLinkedOfferHeadingName ||
      axConfirmedTerminalPunctuationLinkedHeadingName(el, role) ||
      accessibleRoleName ||
      articleHeadingName;
    const axNativeButtonSymbolSpacingName =
      role === "button" ? axConfirmedNativeButtonSymbolSpacingName(el, role, name) : undefined;
    const nativeButtonSymbolSpacingName =
      axNativeButtonSymbolSpacingName ||
      (role === "button" ? nativeButtonStandaloneSymbolSpacingName(el, role, name) : undefined);
    const nativeSelectTitleName =
      tag === "select" && !name ? normalize(stateEl.getAttribute("title")) : undefined;
    const linkContentNameForSpacing =
      role === "link" ? linkContentName(el) : undefined;
    const announcementName =
      axNativeButtonSymbolSpacingName ||
      nativeButtonSymbolSpacingName ||
      (role === "link" &&
      linkContentNameForSpacing &&
      postPunctuationWhitespaceCollapsedText(name) === linkContentNameForSpacing
        ? linkContentNameForSpacing
        : shouldCollapseLinkedListCardPostPunctuationWhitespace(el, role, name)
          ? finalPostPunctuationWhitespaceCollapsedText(name)
        : name);
    const nativeButtonLabelStopText = axConfirmedNativeButtonLabelStopText(el, role, name);
    const nativeDescriptorLabel = ["input", "select", "textarea", "meter", "progress"].includes(tag)
      ? labelForControl(stateEl)
      : undefined;
    const nativeInputComboboxPlaceholderName =
      role === "combobox" &&
      tag === "input" &&
      Boolean(normalize(stateEl.getAttribute("placeholder"))) &&
      normalize(stateEl.getAttribute("placeholder")) === name &&
      !nativeDescriptorLabel &&
      !hasExplicitAriaName(stateEl);
    const nativeValueControlLabelStopText =
      nativeDescriptorLabel &&
      ["combobox", "spinbutton", "slider", "meter", "progressbar"].includes(role) &&
      !hasExplicitAriaName(stateEl) &&
      !nativeValueControlLabelStopIsHidden(stateEl) &&
      !nativeLabelAlreadyAnnouncedByListItem(stateEl, nativeDescriptorLabel)
        ? nativeDescriptorLabel
        : undefined;
    const nativeSubmitTabPanelGroup =
      isAxConfirmedNestedSubmitButtonInTabPanelGroup(el, role, name);
    const carouselControlName = carouselControlNameWithDescription(el, role, name);
    const nativeHiddenControlledCollapsedButton =
      isAxConfirmedNativeCollapsedButtonWithHiddenControlledRegions(el, role, name);
    const contextEndName =
      directListArticleCardContextEndName(el, role) ||
      siblingArticleCardContextEndName(el, role);
    const focusableFeedbackGroupText =
      role === "group" ? axConfirmedFocusableFeedbackGroupText(el) : undefined;
    const richTextGroupText = focusableRichTextParagraphGroupText(el);
    const rawText = focusableFeedbackGroupText || richTextGroupText || readableText(el);
    const text =
      role === "group" && isCustomElement(el) && hasShadowRootContent(el)
        ? undefined
        : rawText;
    const markerSeparatedListLink = isMarkerSeparatedListLink(el, role);
    const largePlainList = role === "list" && isLargePlainList(el, role);
    const largePlainListItem = role === "listitem" && isLargePlainListItem(el, role);
    const position =
      markerSeparatedListLink || largePlainListItem ? undefined : positionInSet(el, role);
    const size =
      markerSeparatedListLink || largePlainListItem ? undefined : setSize(el, role);
    const rect = el.getBoundingClientRect();
    const table = tableContext(el, role);
    const parentListMeta = parentListPosition(el);
    const headingButton = role === "heading"
      ? firstVisibleDescendant(el, "button, [role='button']")
      : null;
    const headingLink = role === "heading" ? firstVisibleDescendant(el, "a[href]") : null;
    const ariaLabelHeadingVisibleTextItemCount =
      role === "heading"
        ? axConfirmedAriaLabelHeadingVisibleTextItemCount(el, role)
        : undefined;
    const headingFragments =
      role === "heading" && !ariaLabelHeadingVisibleTextItemCount
        ? directHeadingFragments(el)
        : undefined;
    const headingFragmentCount =
      role === "heading"
        ? directHeadingFragmentCount(el, headingFragments) ??
          ariaLabelHeadingVisibleTextItemCount ??
          axConfirmedAriaLabelHeadingStaticTextItemCount(el, role)
        : undefined;
    const selectedListboxOption = singleSelectedListboxOption(el);
    const anonymousStructuralCustomElementHost =
      closestAnonymousStructuralCustomElementGroup(el);
    const suppressPositionedChoiceGroup =
      role === "button" &&
      Boolean(position) &&
      !el.hasAttribute("aria-expanded") &&
      !normalizedPopup(el) &&
      !isSlideshowNavigationButton(el) &&
      (isIconFirstTextButton(el) ||
        (el.hasAttribute("aria-label") && !rawText));
    const suppressNativeCardActionGroup =
      role === "button" && isNativeCardActionDisclosureButton(el);
    const suppressPaginationButtonGroup =
      role === "button" && isPaginationNavigationButton(el, role);
    const nativeRangeValue = nativeRangeValueText(stateEl, role);
    const value =
      tag === "select"
        ? nativeSelectValue(stateEl)
        : nativeRangeValue
          ? nativeRangeValue
        : selectedListboxOption
          ? accessibleName(selectedListboxOption, "option") ||
            readableText(selectedListboxOption)
        : "value" in stateEl && stateEl.value
          ? stateEl.value
          : undefined;
    const listboxSelectedCount =
      role === "listbox" ? selectedListboxOptions(el).length || undefined : undefined;
    const selectedListboxPosition = selectedListboxOption
      ? positionInSet(selectedListboxOption, "option")
      : undefined;
    const selectedListboxSize = selectedListboxOption
      ? setSize(selectedListboxOption, "option")
      : undefined;
    const leadingGenericGroupStops = leadingGenericGroupStopCountBeforeDisabledControl(el, role);

    const descriptor: CapturedElementDescriptor = {
      role,
      name:
        carouselControlName ||
        visibleTextEllipsisButtonName(el, role) ||
        (nativeInputComboboxPlaceholderName ? undefined : announcementName) ||
        nativeSelectTitleName ||
        focusableFeedbackGroupText,
      inferredArticleName: Boolean(
        role === "article" &&
          articleHeadingName &&
          !accessibleRoleName &&
          announcementName === articleHeadingName,
      ),
      contextEndName,
      text,
      description: normalize(
        stateEl.getAttribute("aria-description") ?? el.getAttribute("aria-description"),
      ),
      details: carouselControlName
        ? undefined
        : textFromIdRefs(
            stateEl.getAttribute("aria-describedby") ?? el.getAttribute("aria-describedby"),
          ),
      errorMessage: textFromIdRefs(
        stateEl.getAttribute("aria-errormessage") ?? el.getAttribute("aria-errormessage"),
      ),
      roleDescription:
        role === "list" && tag === "dl"
          ? "definition list"
          : role === "button" && nativeDetailsSummary
            ? "disclosure triangle"
          : role === "contentinfo" && isSimpleNativeFooter(el)
            ? "footer"
          : role === "alert" && isEmptyAlertBeforeDialog(el)
            ? "group"
          : role === "paragraph" &&
              el.getAttribute("tabindex") === "-1" &&
              hasStructuredListItemContent(el.closest("li,[role='listitem']"))
            ? "empty group"
          : ariaRoleDescriptionForDescriptor(el, role),
      level:
        role === "heading"
          ? Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2
          : role === "list"
            ? listLevel(el)
          : undefined,
      setSize: selectedListboxSize ?? size,
      positionInSet: selectedListboxPosition ?? position,
      largePlainList: largePlainList || undefined,
      largePlainListItem: largePlainListItem || undefined,
      ...parentListMeta,
      value,
      valueText: normalize(stateEl.getAttribute("aria-valuetext")),
      emptyObject:
        role === "object" &&
        ((tag === "object" && !el.hasAttribute("data")) ||
          (tag === "embed" && !el.hasAttribute("src")))
          ? true
          : undefined,
      placeholder: normalize(stateEl.getAttribute("placeholder")),
      required:
        stateEl.required || stateEl.getAttribute("aria-required") === "true" || undefined,
      invalid:
        stateEl.getAttribute("aria-invalid") &&
        stateEl.getAttribute("aria-invalid") !== "false"
          ? stateEl.getAttribute("aria-invalid") === "true"
            ? true
            : stateEl.getAttribute("aria-invalid")
          : undefined,
      checked:
        role === "checkbox" || role === "radio"
          ? el.getAttribute("aria-checked") === "mixed"
            ? "mixed"
            : el.getAttribute("aria-checked")
              ? el.getAttribute("aria-checked") === "true"
              : inferredSldsRadioChecked(el) ?? Boolean(el.checked)
          : undefined,
      expanded:
        parseBooleanAttribute(stateEl, "aria-expanded") ??
        (headingButton ? parseBooleanAttribute(headingButton, "aria-expanded") : undefined) ??
        (nativeDetailsSummary ? nativeDetailsSummary.hasAttribute("open") : undefined),
      selected:
        parseBooleanAttribute(el, "aria-selected") ??
        (isControlledTablistTab(el, role) ? true : undefined),
      pressed: el.hasAttribute("aria-pressed")
        ? el.getAttribute("aria-pressed") === "mixed"
          ? "mixed"
          : el.getAttribute("aria-pressed") === "true"
        : undefined,
      disabled:
        el.disabled ||
          el.hasAttribute("disabled") ||
          el.getAttribute("aria-disabled") === "true" ||
          isImplicitDisabledPreviousSlideButton(el) ||
          undefined,
      readOnly: el.readOnly || el.getAttribute("aria-readonly") === "true" || undefined,
      current: el.hasAttribute("aria-current")
        ? el.getAttribute("aria-current") === "false"
          ? undefined
          : el.getAttribute("aria-current") === "true"
          ? true
          : el.getAttribute("aria-current")
        : undefined,
      hasPopup: nativeDatalistElement(stateEl) ? "listbox" : normalizedPopup(stateEl) ?? normalizedPopup(el),
      popupLabelWithoutComma:
        role === "button" && hasVisibleTextEllipsisButtonName(el, role) ? true : undefined,
      autocomplete: normalize(stateEl.getAttribute("aria-autocomplete") ?? el.getAttribute("aria-autocomplete")),
      modal: el.getAttribute("aria-modal") === "true" || undefined,
      modalDialogSummaryItemCount:
        role === "dialog" &&
        el.getAttribute("aria-modal") === "true" &&
        hasExplicitDialogName(el)
          ? modalDialogSummaryItemCount(el)
          : undefined,
      sort: normalize(el.getAttribute("aria-sort")),
      selectedCount: listboxSelectedCount,
      nativeSelect: tag === "select" || undefined,
      nativeDatalistPlaceholderName:
        (role === "combobox" &&
          tag === "input" &&
          Boolean(nativeDatalistElement(stateEl)) &&
          nativeInputComboboxPlaceholderName) ||
        undefined,
      headingButton: Boolean(headingButton) || undefined,
      headingLink: (Boolean(headingLink) && !axLinkedOfferHeadingName) || undefined,
      linkHeadingLevel: role === "link" ? descendantLinkCardHeadingLevel(el) : undefined,
      headingFragments,
      headingFragmentCount,
      preserveSpaceBeforePunctuationName:
        role === "heading"
          ? axConfirmedSpaceBeforePunctuationHeadingName(el, role)
          : role === "button"
            ? nativeButtonSymbolSpacingName
            : undefined,
      iconOnlyLink: role === "link" && isIconOnlyLink(el) || undefined,
      textlessCarouselPaginatorLink:
        role === "link" && isTextlessCarouselPaginatorLink(el) || undefined,
      precedingControlLabel: role === "button" ? precedingControlLabelForButton(el) : undefined,
      fieldsetRadioGroup: isFieldsetRadioGroup(el, role) || undefined,
      compositeText:
        role === "button" &&
          Boolean(nestedImageLabel(el) && rawText) ||
        undefined,
      groupContext:
        (!leadingGenericGroupStops &&
          !suppressNativeCardActionGroup &&
          !suppressPaginationButtonGroup &&
          (Boolean(headingButton) ||
            (role === "tab" && isControlledTablistTab(el, role)) ||
            (role === "button" &&
              !suppressPositionedChoiceGroup &&
              !isPositionedImageChoiceButton(el) &&
              !isCollapsedDialogPopupImageTextButton(el) &&
              Boolean(nestedImageLabel(el))) ||
            (role === "button" &&
              Boolean(closestCustomElement(el)) &&
              !anonymousStructuralCustomElementHost &&
              !hasSameNameCustomGroupAncestor(el, name) &&
              !normalizedPopup(el) &&
              !hasAssociatedExplicitTooltip(el, name) &&
              !isAriaLabelOnlyDecorativeIconButton(el) &&
              !isPlainUtilityDisclosureButton(el) &&
              !suppressPositionedChoiceGroup &&
              el.hasAttribute("aria-label")) ||
            (role === "button" &&
              el.hasAttribute("aria-expanded") &&
              !nativeButtonLabelStopText &&
              !anonymousStructuralCustomElementHost &&
              !normalizedPopup(el) &&
              !isAxConfirmedEmptyCollapsedOffscreenButton(el, role, name) &&
              !nativeHiddenControlledCollapsedButton &&
              !isPresentationCollapsedAccordionButton(el) &&
              !position &&
              !buttonSharesListItemWithLink(el) &&
              !isPlainUtilityDisclosureButton(el) &&
              normalize(name) !== "Open navigation menu") ||
            (role === "button" && isLabeledIconActionButton(el)) ||
            (role === "button" &&
              !nativeHiddenControlledCollapsedButton &&
              isMenuDisclosureGroupButton(el)) ||
            (role === "button" && Boolean(nativeDetailsSummary)) ||
            (role === "button" && isSlideshowNavigationButton(el)) ||
            (role === "button" && isInteractiveCardListButton(el)) ||
            (role === "button" && isTrailingDisclaimerButton(el)) ||
            (role === "button" && isTextWithTrailingIconButton(el)) ||
            (role === "button" && isGeneratedPseudoPopupButton(el)) ||
            (role === "button" && isShadowHostWrappedNativeButton(el)) ||
            (role === "button" && isNativeButtonDirectSpanGroupButton(el)) ||
            (role === "button" && nativeSubmitTabPanelGroup) ||
            (role === "button" &&
              !suppressPositionedChoiceGroup &&
              isIconFirstTextButton(el)) ||
            (role === "button" && isExpandedNavigationListItemButton(el)) ||
            (role === "text" && isFocusableCustomTooltipTrigger(el)))) ||
        undefined,
      richTextGroup:
        role === "group" && Boolean(richTextGroupText) || undefined,
      groupedCollectionPosition:
        role === "button" &&
          Boolean(nativeDetailsSummary) ||
        role === "button" &&
          hasOnlyInteractiveListItemContent(semanticListContext(el).listItem) ||
        role === "group" && isFocusableStructuredListItemGroup(el) ||
        undefined,
      parenthesizedCollectionPosition:
        role === "term" &&
          (isWrappedDefinitionListItem(el) ||
            isDirectListBackedDefinitionItem(el) ||
            Boolean(definitionListDisclosureButton(el))) ||
        role === "group" &&
          (isFocusableStructuredListItemGroup(el) || isFocusableImageListItem(el)) ||
        undefined,
      duplicateCollectionPosition:
        role === "term" &&
          (isWrappedDefinitionListItem(el) ||
            isDirectListBackedDefinitionItem(el) ||
            Boolean(definitionListDisclosureButton(el))) ||
        role === "heading" &&
          Boolean(flattenedSlottedCarouselPosition(el).positionInSet) ||
        undefined,
      emptyTerm:
        role === "term" && isDirectListBackedDefinitionItem(el) ? true : undefined,
      unlabeledImage:
        role === "image" && isInformativeUnlabeledCmsImage(el) ? true : undefined,
      unlabeledImageSrcLabel:
        role === "image" && isInformativeUnlabeledCmsImage(el)
          ? cmsMediaPathLabel(el)
          : undefined,
      ...flattenedSlottedCarouselImageInfo(el),
      splitDescribedAutocomplete:
        shouldSplitDescribedAutocomplete(el, role) || undefined,
      searchInputGroup:
        (role === "combobox" &&
          tag === "input" &&
          (el.getAttribute("type") || "").toLowerCase() === "search") ||
          undefined,
      suppressAutocomplete:
        isNativeSearchFormLabelStopInput(el, role) || undefined,
      popupListboxContainer:
        role === "listbox" && isExpandedAutocompletePopupListbox(el) || undefined,
      compactInputActionGroup:
        role === "group" && compactInputActionGroupLabel(el) ? true : undefined,
      leadingCarouselGroup: isLeadingCarouselGroupStop(el, role) || undefined,
      trailingCarouselSlideGroups:
        isTrailingCarouselSlideGroupStop(el, role) || undefined,
      leadingStandaloneCardGroup:
        isLeadingStandaloneCardGroupStop(el, role) ||
        isPostHeadingMediaCardGroupStop(el, role) ||
        undefined,
      namedTextCardGroup:
        role === "text" && isCustomHeadedTextCardBody(el) || undefined,
      leadingDecorativeTextCardGroups:
        isLeadingDecorativeTextCardGroupStop(el, role) || undefined,
      leadingGenericGroupStops:
        leadingGenericGroupStops || undefined,
      trailingStandaloneGroup:
        role === "button" && isAxConfirmedSingleButtonShadowWrapperGroup(el) ||
        undefined,
      splitLabelStop:
        (["searchbox", "textbox"].includes(role) &&
          tag === "input" &&
          Boolean(
            name?.endsWith(":") ||
              (name && stateEl.getAttribute("aria-invalid") === "true" &&
                normalize(stateEl.getAttribute("placeholder")) === name),
          )) ||
        isNativeSearchFormLabelStopInput(el, role) ||
        isAutocompleteGridPopupLabelStopInput(el, role) ||
        isAxConfirmedNativeSearchFormTextInput(el, role) ||
        shouldSplitNamedSingleControlFormInput(el, role) ||
        (role === "combobox" &&
          tag === "select" &&
          Boolean(
            name?.endsWith(":") ||
              (value && name?.endsWith(value)),
          )) ||
        Boolean(nativeValueControlLabelStopText) ||
        shouldSplitNativeControlLabelStop(el, role) ||
        shouldSplitDirectVisibleTextInputLabelStop(el, role) ||
        shouldSplitVisibleRequiredPasswordLabelStop(el, role) ||
        Boolean(axConfirmedNativeControlLabelStopText(el, role)) ||
        Boolean(nativeButtonLabelStopText)
          ? true
          : undefined,
      nativeFormControlLabelStop:
        Boolean(nativeValueControlLabelStopText) ||
        shouldSplitNativeControlLabelStop(el, role) ||
        shouldSplitDirectVisibleTextInputLabelStop(el, role) ||
        shouldSplitVisibleRequiredPasswordLabelStop(el, role) ||
        Boolean(axConfirmedNativeControlLabelStopText(el, role))
          ? true
          : undefined,
      nativeControlLabelText:
        nativeButtonLabelStopText ||
        nativeValueControlLabelStopText ||
        axConfirmedNativeControlLabelStopText(el, role),
      nativeSearchFormInputStop:
        isAxConfirmedNativeSearchFormTextInput(el, role) ||
        shouldSplitNamedSingleControlFormInput(el, role)
          ? true
          : undefined,
      nativeFormInlineAlert:
        role === "alert" &&
        Boolean(el.closest("form[aria-label], form[aria-labelledby]"))
          ? true
          : undefined,
      namedAlertBoundary:
        role === "alert" && isNamedAlertBoundary(el, role) ? true : undefined,
      suppressStatusRolePrefix: isPostFooterTextStatus(el, role) || undefined,
      textEntryArea:
        role === "textbox" && tag === "textarea" ? true : undefined,
      emailTextField:
        role === "textbox" &&
        tag === "input" &&
        (el.getAttribute("type") || "text").toLowerCase() === "email"
          ? true
          : undefined,
      secureTextField:
        role === "textbox" &&
        tag === "input" &&
        (el.getAttribute("type") || "text").toLowerCase() === "password"
          ? true
          : undefined,
      textboxPlaceholderBeforeRole:
        textboxShouldPlacePlaceholderBeforeRole(el, stateEl, role, name, value) ||
        undefined,
      footerCountrySelector:
        role === "combobox" && isFooterCountrySelector(el) ? true : undefined,
      fieldsetPromptText:
        role === "group" ? fieldsetPromptText(el) : undefined,
      labelledNavigationHeaderText:
        role === "navigation"
          ? labelledNavigationHeaderStopText(el, role, name)
          : undefined,
      examplePreviewFrameAnnouncements:
        role === "link" ? previewFrameAnnouncementsForLink(el, role) : undefined,
      tabExpandedState:
        role === "tab" && (isPreviewFrameTab(el, role) || isCodePanelTab(el, role))
          ? true
          : undefined,
      axInlineTwoLinkListItemAnnouncements:
        role === "listitem" ? axInlineTwoLinkListItemAnnouncements(el) : undefined,
      namedNavigationListItemGroupedLinkAnnouncements:
        role === "listitem" ? namedNavigationListItemGroupedLinkAnnouncements(el) : undefined,
      axPublicationListItemBoundaryAnnouncements:
        role === "listitem" ? axPublicationListItemBoundaryAnnouncements(el) : undefined,
      axMixedInlineListItemAnnouncements:
        role === "listitem" ? axMixedInlineListItemAnnouncements(el) : undefined,
      axStrongWrappedMarkerListItemAnnouncements:
        role === "listitem" ? axStrongWrappedMarkerListItemAnnouncements(el) : undefined,
      axPlainTextMarkerListItemAnnouncement:
        role === "listitem" ? axPlainTextMarkerListItemAnnouncement(el) : undefined,
      axMarkerOnlyListItemStopAnnouncement:
        role === "listitem" ? axMarkerOnlyListItemStopAnnouncement(el) : undefined,
      axMarkerOnlyListItemInlineTextAnnouncement:
        role === "listitem" ? axMarkerOnlyListItemInlineTextAnnouncement(el) : undefined,
      axMarkerLinkTrailingTextListItemAnnouncement:
        role === "listitem" ? axMarkerLinkTrailingTextListItemAnnouncement(el) : undefined,
      contributionListItemAnnouncements:
        role === "listitem" ? contributionListItemAnnouncements(el) : undefined,
      wrappedDefinitionListTermChildAnnouncements:
        role === "term" ? wrappedDefinitionListTermChildAnnouncements(el) : undefined,
      metadataListItemValueAnnouncements:
        role === "listitem" ? metadataListItemValueAnnouncements(el) : undefined,
      markerSeparatedListLink: markerSeparatedListLink || undefined,
      markerSeparatedListRegion:
        isMarkerSeparatedListRegion(el, role) || undefined,
      markerSeparatedListRegionLeadingMarker:
        isMarkerSeparatedListRegion(el, role) &&
          markerSeparatedListRegionHasInteractiveLabel(el) ||
        undefined,
      ...markerSeparatedListItemContext(el),
      clusteredVisualButton:
        role === "button" && isClusteredVisualButton(el, role) ? true : undefined,
      richProductCardFeatureRowFragments:
        role === "paragraph" ? richProductCardFeatureRowFragments(el) : undefined,
      richProductCardFeatureHeading:
        role === "paragraph" ? isRichProductCardFeatureHeading(el) || undefined : undefined,
      complexColumnHeaderColorGroupText: complexColumnHeaderColorGroupText(el, role),
      complexColumnHeaderTextFragments: complexColumnHeaderTextFragments(el, role),
      complexColumnHeaderContextCellTextFragments:
        complexColumnHeaderContextCellTextFragments(
          el,
          role,
          table.complexColumnHeaderContextText,
        ),
      inlineEmphasisTextFragments: inlineEmphasisTextFragments(el, role),
      blockquoteInlineEmphasisFragments: blockquoteInlineEmphasisFragments(el, role),
      plainSpanOnlyBlockquote:
        role === "blockquote" && isPlainSpanOnlyBlockquote(el, role) ? true : undefined,
      inlineCodeBreakTextFragments: inlineCodeBreakTextFragments(el, role),
      footerInlineBoundaryTextFragments: footerInlineBoundaryTextFragments(el),
      figureMockupHeaderText: figureMockupHeaderText(el, role),
      inlineTextLinkFragments:
        role === "paragraph"
          ? footerInlineBoundaryParagraphFragments(el) ||
            footerInlineBoundaryTextFragments(el) ||
            directAxInlineTextLinkParagraphFragments(el) ||
            inlineCodeBreakTextFragments(el, role) ||
            inlineSemanticTextLinkFragments(el) ||
            plainTextTrailingLinkParagraphFragments(el) ||
            directAxInlineAbbrSupParagraphFragments(el) ||
            articleInlineTextLinkFragments(el) ||
            inlineTextLinkFragments(el)
          : undefined,
      inlinePhrasingBoundaryFragments:
        role === "paragraph" ? inlinePhrasingBoundaryFragments(el) : undefined,
      expandedRegionInlineLinkFragments:
        role === "paragraph" ? expandedRegionInlineLinkFragments(el) : undefined,
      priceDisclosureFragments: priceDisclosureFragments(el, role),
      codeMirrorTextEntryText: codeMirrorTextEntryText(el, role),
      preserveSpaceBeforeColonName: axSpaceBeforeColonLinkName(el, role, name),
      suppressContextEnd:
        (role === "banner" && isEmptyContextStop(el, role)) ||
        (role === "region" && isEmptyNamedRegionStop(el, role)) ||
        role === "tooltip" ||
        (role === "group" && Boolean(compactInputActionGroupLabel(el))) ||
        shouldSuppressSingletonDocumentArticleEnd(el, role) ||
        (role === "group" && isButtonShellClusterGroup(el)) ||
        (role === "group" && isButtonShellGroup(el)) ||
        (role === "group" && isFocusableImageListItem(el)) ||
        (role === "group" && isFocusableStructuredListItemGroup(el)) ||
        (role === "group" && isAxConfirmedFocusableFeedbackGroup(el)) ||
        (role === "group" && isFocusableRichTextParagraphGroup(el)) ||
        (role === "group" && isFocusableHeadingRichTextNavigationGroup(el)) ||
        (role === "group" && isDecorativeRoleGroupBeforeNativeLinks(el)) ||
        (role === "group" && isDecorativeGenericGroupBeforeNativeLinks(el)) ||
        (role === "group" && Boolean(fieldsetPromptText(el))) ||
        (role === "term" && isDirectListBackedDefinitionItem(el)) ||
        (role === "dialog" &&
          el.getAttribute("aria-modal") === "true" &&
          ((hasExplicitDialogName(el) && modalDialogSummaryItemCount(el)) ||
            (!hasExplicitDialogName(el) && !readableText(el)))) ||
        (role === "group" &&
          isCustomElement(el) &&
          hasShadowRootContent(el) &&
          !accessibleName(el, role))
          ? true
          : undefined,
      ...table,
      ...complexColumnHeaderFragments(el, role),
      boundingBox: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };

    if (role === "banner" && isEmptyContextStop(el, role)) {
      descriptor.emptyContext = true;
      descriptor.name = undefined;
      descriptor.text = undefined;
    }

    if (role === "listitem" && !descriptor.namedNavigationListItemGroupedLinkAnnouncements) {
      const listItemText = textWithoutInteractive(el);
      descriptor.name =
        axRenderedSingleChildTextCaseName(el, listItemText) ||
        listItemText;
      descriptor.text = descriptor.name;
      descriptor.inlineEmphasisListItemFragments =
        inlineEmphasisListItemFragments(el);
    }

    if (role === "paragraph") {
      const adjacentValue = adjacentParagraphValueText(el);
      const paragraphName = hasInlineInteractiveEmbeddedInText(el)
        ? textBeforeFirstInlineInteractive(el)
        : textWithoutInteractive(el) || text;
      descriptor.name = adjacentValue && paragraphName
        ? `${paragraphName}${adjacentValue}`
        : paragraphName;
      descriptor.text = descriptor.name;
    }

    if (descriptor.complexColumnHeaderColorGroupText) {
      descriptor.name = descriptor.complexColumnHeaderColorGroupText;
      descriptor.text = descriptor.complexColumnHeaderColorGroupText;
    }

    const codeLanguageLabel = isCodeLanguageLabel(el, role)
      ? normalizedCodeLanguageLabel(descriptor.name || descriptor.text)
      : undefined;
    if (codeLanguageLabel) {
      descriptor.name = codeLanguageLabel;
      descriptor.text = codeLanguageLabel;
    }

    const priceDisclosureText = role === "text" ? joinedPriceDisclosureText(el) : undefined;
    if (priceDisclosureText) {
      descriptor.name = priceDisclosureText;
      descriptor.text = priceDisclosureText;
    }

    const metricCardText = role === "text" ? groupedMetricCardText(el) : undefined;
    if (metricCardText) {
      descriptor.name = metricCardText;
      descriptor.text = metricCardText;
    }

    return descriptor;
  }

  function getScanRoot(el: any): any {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;

    const codeBlock = el.closest("pre, code");
    const pre =
      codeBlock?.tagName.toLowerCase() === "pre"
        ? codeBlock
        : codeBlock?.closest("pre");
    return pre || el;
  }

  function nextVisibleElementSibling(el: any): any | undefined {
    for (let sibling = el?.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
      if (!isHidden(sibling)) return sibling;
    }
    return undefined;
  }

  function previousVisibleElementSibling(el: any): any | undefined {
    for (let sibling = el?.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      if (!isHidden(sibling)) return sibling;
    }
    return undefined;
  }

  function hasFollowingHiddenElementSibling(el: any): boolean {
    for (let sibling = el?.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
      if (isHidden(sibling)) return true;
    }
    return false;
  }

  function closestFooterContext(el: any): any | undefined {
    return el?.closest?.("footer,[role='contentinfo']") || undefined;
  }

  function sharesFooterContext(left: any, right: any): boolean {
    const leftFooter = closestFooterContext(left);
    return Boolean(leftFooter && leftFooter === closestFooterContext(right));
  }

  function firstVisibleDescendantMatching(
    el: any,
    predicate: (candidate: any) => boolean,
  ): any | undefined {
    const queue = Array.from(walkChildren(el));
    while (queue.length) {
      const candidate = queue.shift() as any;
      if (!candidate || candidate.nodeType !== Node.ELEMENT_NODE || isHidden(candidate)) {
        continue;
      }
      if (predicate(candidate)) return candidate;
      queue.push(...walkChildren(candidate));
    }
    return undefined;
  }

  function hasRenderedListMarkers(list: any): boolean {
    return listChildren(list).some(
      (item: any) =>
        item.getAttribute("data-sr-marker-content") === "normal" &&
        item.getAttribute("data-sr-marker-display") === "inline-block" &&
        Boolean(normalize(item.getAttribute("data-sr-marker-list-style-type"))),
    );
  }

  function isHeadedUnmarkedListBlock(el: any): boolean {
    const heading = firstVisibleDescendantMatching(el, (candidate: any) => {
      return implicitRole(candidate) === "heading" && Boolean(readableText(candidate));
    });
    if (!heading) return false;

    const list = firstVisibleDescendantMatching(el, (candidate: any) => {
      if (implicitRole(candidate) !== "list") return false;
      if (!listSummaryChildren(candidate).length) return false;
      return Boolean(
        heading.compareDocumentPosition(candidate) &
          candidate.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
    return Boolean(list && !hasRenderedListMarkers(list));
  }

  function isFooterInlineLegalParagraph(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (implicitRole(el) !== "paragraph") return false;
    if (!el.closest("footer,[role='contentinfo']")) return false;
    if (!readableText(el)) return false;

    const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter(
      (link: any) => !isHidden(link),
    );
    if (!links.length) return false;

    const visibleChildren = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (!visibleChildren.length) return false;

    return visibleChildren.every((child: any) => {
      const tag = child.tagName?.toLowerCase();
      return ["a", "small", "span", "strong", "b", "em", "i", "br"].includes(tag);
    });
  }

  function isDecorativeSeparatorStop(el: any): boolean {
    if (implicitRole(el) !== "separator") return false;

    const nextVisible = nextVisibleElementSibling(el);
    if (!nextVisible) return hasFollowingHiddenElementSibling(el);
    if (sharesFooterContext(el, nextVisible) && isFooterInlineLegalParagraph(nextVisible)) {
      return true;
    }

    if (!previousVisibleElementSibling(el)) return false;
    return sharesFooterContext(el, nextVisible) && isHeadedUnmarkedListBlock(nextVisible);
  }

  function isPaginationNavigationButton(el: any, role = implicitRole(el)): boolean {
    if (role !== "button") return false;
    const tag = el?.tagName?.toLowerCase();
    if (tag !== "a" && tag !== "button") return false;

    const navigation = el.closest?.("nav,[role='navigation']");
    const navigationName = normalize(
      navigation
        ? accessibleName(navigation, "navigation") || readableText(navigation)
        : undefined,
    );
    if (!navigationName || !/\bpagination\b/i.test(navigationName)) return false;

    const buttonName = normalize(accessibleName(el, role));
    if (!buttonName) return false;

    if (accessibilityNodes.length) {
      const axNode = axNodeForElementRole(el, "button");
      if (!axNode || normalize(axNode.name) !== buttonName) return false;
    }

    return true;
  }

  function isEmptyContextStop(el: any, role = implicitRole(el)): boolean {
    if (role !== "banner") return false;
    if (accessibleName(el, role) || readableText(el) || hasVisibleInteractiveDescendant(el)) {
      return false;
    }
    if (!accessibilityNodes.length) return true;
    return hasAxRole(el, role);
  }

  function isEmptyNamedRegionStop(el: any, role = implicitRole(el)): boolean {
    if (role !== "region") return false;
    if (!accessibleName(el, role)) return false;
    if (readableText(el) || hasVisibleInteractiveDescendant(el)) return false;
    if (!accessibilityNodes.length) return true;
    return hasAxRole(el, role);
  }

  function figureMockupHeaderItems(el: any): any[] {
    const parent = el?.parentElement;
    if (!parent || !parent.closest?.("figure")) return [];
    if (parent.querySelector(interactiveSelector)) return [];

    const children = Array.from(parent.children || []).filter(
      (child: any) => !isHidden(child) && readableText(child),
    );
    if (children.length < 2 || children.length > 8) return [];
    if (!children.every((child: any) => child.tagName?.toLowerCase() === "span")) {
      return [];
    }
    if (!parent.closest("figure")?.querySelector("img, svg")) return [];
    return children;
  }

  function figureMockupHeaderText(el: any, role = implicitRole(el)): string | undefined {
    if (role !== "text") return undefined;
    const items = figureMockupHeaderItems(el);
    if (!items.length || items[0] !== el) return undefined;
    return normalize(items.map((item: any) => readableText(item)).join(" "));
  }

  function isTrailingFigureMockupHeaderText(el: any, role = implicitRole(el)): boolean {
    if (role !== "text") return false;
    const items = figureMockupHeaderItems(el);
    return Boolean(items.length && items[0] !== el && items.includes(el));
  }

  function isSimpleFigureMockupCaption(el: any, role = implicitRole(el)): boolean {
    if (el?.tagName?.toLowerCase() !== "figcaption") return false;
    if (hasVisibleInteractiveDescendant(el)) return false;
    const children = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (children.length !== 2) return false;
    return (
      implicitRole(children[0]) === "heading" &&
      implicitRole(children[1]) === "paragraph"
    );
  }

  function onlyNamedNativeButtonContent(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (directOwnText(el)) return false;

    const visibleChildren = Array.from(el.children || []).filter((child: any) => !isHidden(child));
    if (visibleChildren.length !== 1) return false;

    const button = visibleChildren[0] as any;
    if (button.tagName?.toLowerCase() !== "button") return false;
    if (button.getAttribute("role") && button.getAttribute("role") !== "button") return false;
    if (
      button.disabled ||
      button.hasAttribute("disabled") ||
      button.getAttribute("aria-disabled") === "true"
    ) {
      return false;
    }

    const buttonName = normalize(accessibleName(button, "button") || readableText(button));
    if (!buttonName || normalize(readableText(el)) !== buttonName) return false;

    if (accessibilityNodes.length) {
      const axNode = axNodeForElementRole(button, "button");
      if (!axNode || normalize(axNode.name) !== buttonName) return false;
      if (axNode.properties?.focusable !== true) return false;
    }

    return true;
  }

  function isStopElement(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;

    const role = implicitRole(el);
    const tag = el.tagName.toLowerCase();
    if (!role) return false;

    if (role === "separator" && isDecorativeSeparatorStop(el)) {
      return false;
    }

    if (isEmptyAlertLiveRegion(el, role)) {
      return false;
    }

    if (isDecorativeEmojiText(el, role)) {
      return false;
    }

    if (isInsideJoinedPriceDisclosure(el)) {
      return false;
    }

    if (isInsideGroupedMetricCard(el)) {
      return false;
    }

    if (isNeutralListItemWrapper(el)) {
      return false;
    }

    const decorativeRoleGroupBeforeNativeLinks =
      isDecorativeRoleGroupBeforeNativeLinks(el, role);
    const decorativeGenericGroupBeforeNativeLinks =
      isDecorativeGenericGroupBeforeNativeLinks(el, role);

    if (role === "listitem" && axMarkerOnlyListItemStopAnnouncement(el)) {
      return true;
    }

    if (role === "listitem" && namedNavigationListItemGroupedLinkAnnouncements(el)) {
      return true;
    }

    if (role === "listitem" && hasOnlyInteractiveListItemContent(el)) {
      return false;
    }

    if (role === "listitem" && hasImageLinkWithCaptionListItemContent(el)) {
      return false;
    }

    if (role === "listitem" && hasNamedImageListItemContent(el)) {
      return false;
    }

    if (role === "listitem" && hasStructuredListItemContent(el)) {
      return false;
    }

    if (role === "listitem" && hasNativeDetailsListItemContent(el)) {
      return false;
    }

    if (role === "listitem" && hasSingleSemanticListItemChild(el)) {
      return false;
    }

    if (
      isContextRole(el, role) &&
      !isUnnamedCarouselRegion(el) &&
      !isEmptyContextStop(el, role) &&
      !accessibleName(el, role) &&
      !readableText(el) &&
      !hasVisibleInteractiveDescendant(el) &&
      !decorativeRoleGroupBeforeNativeLinks &&
      !decorativeGenericGroupBeforeNativeLinks &&
      !(role === "dialog" && el.getAttribute("aria-modal") === "true") &&
      !(role === "list" && announcedListChildren(el).length)
    ) {
      return false;
    }

    if (
      role === "dialog" &&
      el.getAttribute("aria-modal") === "true" &&
      !hasExplicitDialogName(el) &&
      hasVisibleInteractiveDescendant(el)
    ) {
      return false;
    }

    if (isUnnamedCarouselRegion(el)) {
      return false;
    }

    if (role === "tabpanel" && isExpandedHtmlCodePanel(el)) {
      return false;
    }

    if (role === "group" && isFlattenedSlottedCarouselGroupWrapper(el)) {
      return false;
    }

    if (role === "group" && isUnnamedCarouselNavigationButtonWrapper(el)) {
      return false;
    }

    if (isCarouselDescriptionOnlyControlContainer(el, role)) {
      return false;
    }

    if (role === "group" && isAnonymousStructuralCustomElementGroup(el)) {
      return false;
    }

    if (isSingleLabeledTextInputWrapper(el, role)) {
      return false;
    }

    if (role === "row" && el.closest("table,[role='table'],[role='grid']")) {
      return false;
    }

    if (
      tableCellShouldYieldToStructuredContent(el, role) &&
      !(role === "columnheader" && isComplexColumnHeaderContext(el))
    ) {
      return false;
    }

    if (
      isConsumedComplexColumnHeaderTitleStop(el, role) ||
      isConsumedComplexColumnHeaderColorStop(el, role)
    ) {
      return false;
    }

    if (
      role === "paragraph" &&
      (!readableText(el) || hasOnlyLinkContent(el) || onlyNamedNativeButtonContent(el))
    ) {
      return false;
    }

    if (role === "paragraph" && isConsumedAdjacentParagraphValue(el)) {
      return false;
    }

    if (
      (role === "object" && !accessibleName(el, role)) ||
      (role === "link" && el.tagName?.toLowerCase() === "area" && !accessibleName(el, role))
    ) {
      return false;
    }

    if (
      role === "image" &&
      el.tagName?.toLowerCase() === "img" &&
      el.hasAttribute("alt") &&
      !normalize(el.getAttribute("alt"))
    ) {
      return false;
    }

    if (
      role === "image" &&
      !accessibleName(el, role) &&
      !isInformativeUnlabeledCmsImage(el) &&
      !isAxConfirmedRegionIntroImage(el) &&
      !hasStructuredListItemContent(el.closest("li,[role='listitem']"))
    ) {
      return false;
    }

    if (
      role === "group" &&
      !accessibleName(el, role) &&
      !el.matches(interactiveSelector) &&
      !isAxConfirmedFocusableFeedbackGroup(el) &&
      !isFocusableRichTextParagraphGroup(el) &&
      !isFocusableHeadingRichTextNavigationGroup(el) &&
      !isSingleTitledIframeWrapper(el) &&
      !isButtonShellClusterGroup(el) &&
      !isButtonShellGroup(el) &&
      !decorativeRoleGroupBeforeNativeLinks &&
      !decorativeGenericGroupBeforeNativeLinks &&
      !fieldsetPromptText(el) &&
      !(isCustomElement(el) && hasShadowRootContent(el)) ||
      (role === "group" && isAnonymousShadowPromptFieldsetHost(el))
    ) {
      return false;
    }

    if (role === "row" && isInsideExpandedAutocompletePopupGrid(el)) {
      return false;
    }

    if (isTrailingFigureMockupHeaderText(el, role)) {
      return false;
    }

    if (isSimpleFigureMockupCaption(el, role)) {
      return false;
    }

    return (
      isContextRole(el, role) ||
      [
        "heading",
        "button",
        "link",
        "textbox",
        "searchbox",
        "spinbutton",
        "combobox",
        "checkbox",
        "radio",
        "switch",
        "option",
        "tab",
        "progressbar",
        "meter",
        "slider",
        "object",
        "listitem",
        "term",
        "paragraph",
        "blockquote",
        "text",
        "image",
        "frame",
        "dialog",
        "tooltip",
        "alert",
        "status",
        "separator",
        "row",
        "cell",
        "gridcell",
        "rowheader",
        "columnheader",
      ].includes(role) ||
      ["caption", "figcaption"].includes(tag)
    );
  }

  function shouldDescendIntoStop(el: any): boolean {
    const role = implicitRole(el);
    if (role === "tooltip") {
      return false;
    }
    if (role === "listbox" && isExpandedAutocompletePopupListbox(el)) {
      return false;
    }
    if (role === "group" && isFocusableImageListItem(el)) {
      return false;
    }
    if (role === "group" && isFocusableStructuredListItemGroup(el)) {
      return false;
    }
    if (role === "group" && isAxConfirmedFocusableFeedbackGroup(el)) {
      return false;
    }
    if (role === "group" && isFocusableRichTextParagraphGroup(el)) {
      return false;
    }
    if (role === "group" && isFocusableHeadingRichTextNavigationGroup(el)) {
      return false;
    }
    if (role === "listbox" && singleSelectedListboxOption(el)) {
      return false;
    }
    if (
      role === "dialog" &&
      el.getAttribute("aria-modal") === "true" &&
      !hasExplicitDialogName(el) &&
      hasVisibleInteractiveDescendant(el)
    ) {
      return false;
    }
    if (
      role === "dialog" &&
      el.getAttribute("aria-modal") === "true" &&
      !hasExplicitDialogName(el) &&
      !readableText(el)
    ) {
      return false;
    }
    if (isContextRole(el, role)) return true;
    if (role === "columnheader" && isComplexColumnHeaderContext(el)) {
      return true;
    }
    if (role === "heading") {
      return false;
    }
    if (role === "alert" && isNamedAlertBoundary(el, role)) {
      return true;
    }
    if (role === "listitem") {
      if (namedNavigationListItemGroupedLinkAnnouncements(el)) return false;
      if (axMarkerOnlyListItemStopAnnouncement(el)) return true;
      if (axStrongWrappedMarkerListItemAnnouncements(el)) return true;
      if (
        axPlainTextMarkerListItemAnnouncement(el) &&
        el.querySelector("a[href], [role='link']")
      ) {
        return true;
      }

      return (
        hasOnlyInteractiveListItemContent(el) ||
        hasLabeledNativeSelectListItemContent(el) ||
        hasImageLinkWithCaptionListItemContent(el) ||
        hasNamedImageListItemContent(el) ||
        hasStructuredListItemContent(el) ||
        hasSingleSemanticListItemChild(el) ||
        Boolean(el.querySelector("ul, ol, dl, [role='list']"))
      );
    }
    if (role === "paragraph") {
      return (
        !expandedRegionInlineLinkFragments(el) &&
        !footerInlineBoundaryParagraphFragments(el) &&
        !footerInlineBoundaryTextFragments(el) &&
        !directAxInlineTextLinkParagraphFragments(el) &&
        !inlineCodeBreakTextFragments(el, role) &&
        !inlineSemanticTextLinkFragments(el) &&
        !plainTextTrailingLinkParagraphFragments(el) &&
        !directAxInlineAbbrSupParagraphFragments(el) &&
        !articleInlineTextLinkFragments(el) &&
        !inlineTextLinkFragments(el) &&
        !hasInlineInteractiveEmbeddedInText(el) &&
        Boolean(el.querySelector(interactiveSelector))
      );
    }
    return false;
  }

  function walkChildren(el: any): any[] {
    const assignedChildren = assignedSlotChildren(el);
    if (assignedChildren.length) return assignedChildren;
    const shadowChildren = shadowContentChildren(el);
    if (shadowChildren.length) return shadowChildren;
    return Array.from(el.children);
  }

  function firstVisibleDescendant(el: any, selector: string): any | null {
    return (
      Array.from(el?.querySelectorAll?.(selector) || []).find(
        (descendant: any) => !isHidden(descendant),
      ) || null
    );
  }

  function collapsedPopupController(container: any): any {
    if (!container?.id) return null;
    const controlledBy = Array.from(
      document.querySelectorAll(`[aria-controls="${cssEscape(container.id)}"]`),
    ).filter(
      (controller: any) => !container.contains(controller) && !isHidden(controller),
    );
    if (
      controlledBy.some(
        (controller: any) => controller.getAttribute("aria-expanded") === "true",
      )
    ) {
      return null;
    }

    return (
      controlledBy.find(
        (controller: any) => controller.getAttribute("aria-expanded") === "false",
      ) || null
    );
  }

  function isInsideCollapsedPopup(el: any): boolean {
    for (let current = el; current; current = current.parentElement) {
      if (collapsedPopupController(current)) return true;
    }
    return false;
  }

  function expandedAutocompletePopupController(container: any): any {
    if (!container?.id) return null;
    const selector = [
      `[aria-controls="${cssEscape(container.id)}"]`,
      `[aria-owns="${cssEscape(container.id)}"]`,
    ].join(",");
    return (
      Array.from(document.querySelectorAll(selector)).find((controller: any) => {
        if (container.contains(controller) || isHidden(controller)) return false;
        if (controller.getAttribute("aria-expanded") !== "true") return false;
        const role = implicitRole(controller);
        if (!["combobox", "searchbox", "textbox"].includes(role)) return false;
        return normalize(controller.getAttribute("aria-autocomplete")) === "list";
      }) || null
    );
  }

  function isExpandedAutocompletePopupListbox(el: any): boolean {
    return implicitRole(el) === "listbox" && Boolean(expandedAutocompletePopupController(el));
  }

  function isExpandedAutocompletePopupGrid(el: any): boolean {
    if (implicitRole(el) !== "grid") return false;
    const controller = expandedAutocompletePopupController(el);
    return Boolean(controller && normalizedPopup(controller) === "grid");
  }

  function isInsideExpandedAutocompletePopupGrid(el: any): boolean {
    const grid = el.closest?.("[role='grid']");
    return Boolean(grid && isExpandedAutocompletePopupGrid(grid));
  }

  function splitDescribedAutocompleteAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!descriptor.splitDescribedAutocomplete) return undefined;

    const label = normalize(descriptor.name || descriptor.text);
    const details = normalize(descriptor.details);
    const announcements = [label];
    if (descriptor.searchInputGroup) {
      announcements.push("group");
    }
    announcements.push(normalize([label, details].filter(Boolean).join(" ")));

    return announcements.filter((announcement): announcement is string =>
      Boolean(announcement),
    );
  }

  function splitLabelStopAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!descriptor.splitLabelStop) return undefined;

    const label = normalize(descriptor.nativeControlLabelText || descriptor.name || descriptor.text);
    if (descriptor.nativeSearchFormInputStop && descriptor.role === "textbox") {
      const roleText = descriptor.textEntryArea
        ? "text entry area"
        : descriptor.secureTextField
          ? "secure text field"
          : descriptor.emailTextField
            ? "email"
          : "edit text";
      const value = normalize(descriptor.placeholder);
      const announcement = normalize(
        `${[label, value].filter(Boolean).join(" ")}, ${roleText}`,
      );
      return [
        descriptor.emailTextField ? label : undefined,
        announcement,
      ].filter((entry): entry is string => Boolean(entry));
    }

    if (descriptor.nativeSearchFormInputStop && descriptor.role === "combobox") {
      const value = normalize(descriptor.placeholder);
      const controlLabel = normalize([label, value].filter(Boolean).join(" "));
      const announcement = generateAnnouncement({
        ...descriptor,
        name: controlLabel || label,
        text: controlLabel || label,
      });
      return [label, announcement].filter((entry): entry is string => Boolean(entry));
    }

    if (descriptor.nativeFormControlLabelStop && descriptor.role === "textbox") {
      const roleText = descriptor.textEntryArea
        ? "text entry area"
        : descriptor.secureTextField
          ? "secure text field"
        : descriptor.emailTextField
          ? "email"
          : "edit text";
      const value = normalize(descriptor.value || descriptor.placeholder);
      const details = normalize(descriptor.details || descriptor.errorMessage);
      const announcement = descriptor.invalid
        ? normalize(
            `${label || ""}${details ? ` ${details},` : ","} ${[
              descriptor.required ? "required" : undefined,
              descriptor.invalid
                ? `invalid ${descriptor.invalid === true ? "data" : descriptor.invalid}`
                : undefined,
            ].filter(Boolean).join(" ")}, ${roleText}`,
          )
        : normalize(`${[label, value].filter(Boolean).join(" ")}${[
            descriptor.required ? "required" : undefined,
            roleText,
          ].filter(Boolean).length ? `, ${[
            descriptor.required ? "required" : undefined,
            roleText,
          ].filter(Boolean).join(", ")}` : ""}`);

      return [label, announcement].filter((entry): entry is string => Boolean(entry));
    }

    const announcement = generateAnnouncement(descriptor);
    if (descriptor.nativeSelect && label && descriptor.value) {
      const value = normalize(descriptor.value);
      const labelPrefix = label.endsWith(value || "")
        ? normalize(label.slice(0, label.length - (value || "").length))
        : undefined;
      if (labelPrefix?.endsWith(":")) {
        return [labelPrefix, value, announcement].filter(
          (entry): entry is string => Boolean(entry),
        );
      }
    }
    return [label, announcement].filter((entry): entry is string => Boolean(entry));
  }

  function splitNativeFormInlineAlertAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!descriptor.nativeFormInlineAlert) return undefined;
    return [normalize(descriptor.name || descriptor.text)].filter(
      (entry): entry is string => Boolean(entry),
    );
  }

  function splitDialogDirectTextAnnouncements(
    descriptor: CapturedElementDescriptor,
    el: any,
  ): string[] | undefined {
    if (!["dialog", "tooltip"].includes(descriptor.role || "")) return undefined;
    if (descriptor.role === "tooltip") {
      if (isCustomElement(el)) return [generateAnnouncement(descriptor)];
      const visibleText = normalize(readableText(el));
      if (visibleText) return [`${visibleText}, empty tooltip`];
      const announcement = generateAnnouncement(descriptor);
      return [`${announcement}, empty tooltip`];
    }
    if (descriptor.role === "dialog" && descriptor.modalDialogSummaryItemCount) {
      return [generateAnnouncement(descriptor)];
    }
    const directText =
      descriptor.role === "tooltip"
        ? normalize(el.textContent || "")
        : normalize(
            Array.from(el.childNodes || [])
              .filter((child: any) => child.nodeType === Node.TEXT_NODE)
              .map((child: any) => child.textContent || "")
              .join(" "),
          );
    if (!directText) return undefined;
    return [generateAnnouncement(descriptor), directText];
  }

  function modalDialogSummaryItemCount(el: any): number | undefined {
    const count = walkChildren(el).filter((child: any) => !isHidden(child)).length;
    return count > 0 ? count : undefined;
  }

  function hasExplicitDialogName(el: any): boolean {
    return Boolean(
      normalize(el.getAttribute?.("aria-label")) ||
        textFromIdRefs(el.getAttribute?.("aria-labelledby")),
    );
  }

  function modalDialogSummaryAnnouncement(
    descriptor: CapturedElementDescriptor,
  ): string | undefined {
    if (!descriptor.modalDialogSummaryItemCount) return undefined;
    return `dialog, with ${descriptor.modalDialogSummaryItemCount} ${descriptor.modalDialogSummaryItemCount === 1 ? "item" : "items"}`;
  }

  function modalDialogHeadingChildren(el: any): any[] {
    return walkChildren(el).filter(
      (child: any) => !isHidden(child) && implicitRole(child) === "heading",
    );
  }

  function splitCompactInputActionGroupAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!descriptor.compactInputActionGroup) return undefined;
    const label = normalize(descriptor.name || descriptor.text);
    if (!label) return undefined;
    return [generateAnnouncement(descriptor), label, `end of, ${label}, group`];
  }

  function splitCarouselGroupAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const announcement = generateAnnouncement(descriptor);
    if (descriptor.leadingCarouselGroup) {
      return ["group", announcement].filter((entry): entry is string =>
        Boolean(entry),
      );
    }
    if (descriptor.leadingStandaloneCardGroup) {
      return ["group", announcement].filter((entry): entry is string =>
        Boolean(entry),
      );
    }
    if (descriptor.namedTextCardGroup) {
      const label = normalize(descriptor.name || descriptor.text);
      if (!label) return undefined;
      return [`${label}, group`, label, `end of, ${label}, group`];
    }
    if (descriptor.leadingDecorativeTextCardGroups) {
      return ["group", "group", announcement].filter((entry): entry is string =>
        Boolean(entry),
      );
    }
    if (descriptor.trailingCarouselSlideGroups) {
      return [announcement, "group", "group"].filter(
        (entry): entry is string => Boolean(entry),
      );
    }
    return undefined;
  }

  function splitLeadingGenericGroupStopAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!descriptor.leadingGenericGroupStops) return undefined;
    const announcement = generateAnnouncement(descriptor);
    return [
      ...Array.from({ length: descriptor.leadingGenericGroupStops }, () => "group"),
      announcement,
    ].filter((entry): entry is string => Boolean(entry));
  }

  function splitTrailingStandaloneGroupAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!descriptor.trailingStandaloneGroup) return undefined;
    return [generateAnnouncement(descriptor), "group"].filter((entry): entry is string =>
      Boolean(entry),
    );
  }

  function splitFooterCountrySelectorAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!descriptor.footerCountrySelector) return undefined;
    const label = normalize(descriptor.name || descriptor.text);
    const announcement = generateAnnouncement(descriptor);
    return [label, announcement, "group", "group"].filter((entry): entry is string =>
      Boolean(entry),
    );
  }

  function splitFieldsetPromptAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    return descriptor.role === "group" && descriptor.fieldsetPromptText
      ? [descriptor.fieldsetPromptText]
      : undefined;
  }

  function splitLabelledNavigationHeaderAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (descriptor.role !== "navigation" || !descriptor.labelledNavigationHeaderText) {
      return undefined;
    }
    return [
      generateAnnouncement(descriptor),
      descriptor.labelledNavigationHeaderText,
    ].filter((entry): entry is string => Boolean(entry));
  }

  function splitExamplePreviewFrameAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (
      descriptor.role !== "link" ||
      !descriptor.examplePreviewFrameAnnouncements?.length
    ) {
      return undefined;
    }
    return [
      generateAnnouncement(descriptor),
      ...descriptor.examplePreviewFrameAnnouncements,
    ].filter((entry): entry is string => Boolean(entry));
  }

  function splitWrappedDefinitionListTermAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (
      descriptor.role !== "term" ||
      !descriptor.wrappedDefinitionListTermChildAnnouncements?.length
    ) {
      return undefined;
    }

    return [
      generateAnnouncement(descriptor),
      ...descriptor.wrappedDefinitionListTermChildAnnouncements,
    ].filter((entry): entry is string => Boolean(entry));
  }

  function splitMetadataListItemAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (
      descriptor.role !== "listitem" ||
      !descriptor.metadataListItemValueAnnouncements?.length
    ) {
      return undefined;
    }

    return [
      generateAnnouncement(descriptor),
      ...descriptor.metadataListItemValueAnnouncements,
    ].filter((entry): entry is string => Boolean(entry));
  }

  function splitContributionListItemAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (
      descriptor.role !== "listitem" ||
      !descriptor.contributionListItemAnnouncements?.length
    ) {
      return undefined;
    }

    return descriptor.contributionListItemAnnouncements;
  }

  function splitAxInlineTwoLinkListItemAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (
      descriptor.role !== "listitem" ||
      !descriptor.axInlineTwoLinkListItemAnnouncements?.length
    ) {
      return undefined;
    }
    return descriptor.axInlineTwoLinkListItemAnnouncements;
  }

  function splitNamedNavigationListItemGroupedLinkAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (
      descriptor.role !== "listitem" ||
      !descriptor.namedNavigationListItemGroupedLinkAnnouncements?.length
    ) {
      return undefined;
    }
    return descriptor.namedNavigationListItemGroupedLinkAnnouncements;
  }

  function splitAxPublicationListItemBoundaryAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (
      descriptor.role !== "listitem" ||
      !descriptor.axPublicationListItemBoundaryAnnouncements?.length
    ) {
      return undefined;
    }
    return descriptor.axPublicationListItemBoundaryAnnouncements;
  }

  function splitAxMixedInlineListItemAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (
      descriptor.role !== "listitem" ||
      !descriptor.axMixedInlineListItemAnnouncements?.length
    ) {
      return undefined;
    }
    return descriptor.axMixedInlineListItemAnnouncements;
  }

  function splitAxStrongWrappedMarkerListItemAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (
      descriptor.role !== "listitem" ||
      !descriptor.axStrongWrappedMarkerListItemAnnouncements?.length
    ) {
      return undefined;
    }
    return descriptor.axStrongWrappedMarkerListItemAnnouncements;
  }

  function splitAxPlainTextMarkerListItemAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (
      descriptor.role !== "listitem" ||
      !descriptor.axPlainTextMarkerListItemAnnouncement
    ) {
      return undefined;
    }
    return [descriptor.axPlainTextMarkerListItemAnnouncement];
  }

  function splitAxMarkerOnlyListItemAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (
      descriptor.role !== "listitem" ||
      !descriptor.axMarkerOnlyListItemStopAnnouncement
    ) {
      return undefined;
    }
    return [
      descriptor.axMarkerOnlyListItemStopAnnouncement,
      descriptor.axMarkerOnlyListItemInlineTextAnnouncement,
    ].filter((entry): entry is string => Boolean(entry));
  }

  function splitMarkerSeparatedListRegionAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!descriptor.markerSeparatedListRegion) return undefined;
    const announcement = generateAnnouncement(descriptor);
    if (!announcement) return undefined;
    return descriptor.markerSeparatedListRegionLeadingMarker
      ? [`* ${announcement}`]
      : [announcement];
  }

  function splitMarkerSeparatedListLinkAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!descriptor.markerSeparatedListLink) return undefined;
    const position = descriptor.markerPositionInSet;
    const size = descriptor.markerSetSize;
    if (!position || !size) return undefined;
    const focusedResourcesMarkers = [
      "•,1 of11",
      "•,2 of11",
      "•,3 of 11",
      "•, 4 of11",
      "•,5 of 11",
      "., 6 of 11",
      ".,7 of 11",
      "•,8 of 11",
      "•, 9 of11",
      "•,10 of 11",
      "•, 11 of 11",
    ];
    const marker =
      descriptor.focusedResourcesMarkerFormat && size === 11
        ? focusedResourcesMarkers[position - 1]
        : position === 1 ? `.,${position}of${size}` : `.,${position} of${size}`;
    return [marker, generateAnnouncement(descriptor)].filter(
      (entry): entry is string => Boolean(entry),
    );
  }

  function splitClusteredVisualButtonAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!descriptor.clusteredVisualButton) return undefined;
    return [
      "group",
      generateAnnouncement({
        ...descriptor,
        groupContext: undefined,
      }),
    ].filter((entry): entry is string => Boolean(entry));
  }

  function splitCodeMirrorTextEntryAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const text = normalize(descriptor.codeMirrorTextEntryText);
    if (descriptor.role !== "textbox" || !text) return undefined;
    return [`text entry area ${text},`];
  }

  function splitPrecedingControlLabelAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!descriptor.precedingControlLabel) return undefined;
    return [descriptor.precedingControlLabel, generateAnnouncement(descriptor)].filter(
      (entry): entry is string => Boolean(entry),
    );
  }

  function splitCompactResultCountAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!["text", "paragraph"].includes(descriptor.role || "")) return undefined;
    const label = normalize(descriptor.name || descriptor.text);
    const match = label?.match(/^(\d+)(results?)$/i);
    if (!match) return undefined;
    return [match[1], match[2]];
  }

  function splitRichProductCardFeatureRowAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const fragments = descriptor.richProductCardFeatureRowFragments;
    return fragments?.length ? fragments : undefined;
  }

  function splitInlineEmphasisTextAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const fragments = descriptor.inlineEmphasisTextFragments;
    if (
      !["paragraph", "text"].includes(descriptor.role || "") ||
      !fragments ||
      fragments.length < 2
    ) {
      return undefined;
    }
    return fragments;
  }

  function splitBlockquoteInlineEmphasisAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const fragments = descriptor.blockquoteInlineEmphasisFragments;
    if (descriptor.role !== "blockquote" || !fragments || fragments.length !== 2) {
      return undefined;
    }
    const [firstFragment, quotedFragment] = fragments;
    const quotedAnnouncement = generateAnnouncement({
      ...descriptor,
      name: quotedFragment,
      text: quotedFragment,
    });
    return [firstFragment, quotedAnnouncement].filter(
      (announcement): announcement is string => Boolean(announcement),
    );
  }

  function splitPlainSpanOnlyBlockquoteAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (descriptor.role !== "blockquote" || !descriptor.plainSpanOnlyBlockquote) {
      return undefined;
    }
    return [normalize(descriptor.name || descriptor.text)].filter(
      (announcement): announcement is string => Boolean(announcement),
    );
  }

  function splitRichProductCardFeatureHeadingAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!descriptor.richProductCardFeatureHeading) return undefined;
    const announcement = generateAnnouncement(descriptor);
    return announcement ? ["list item", announcement] : ["list item"];
  }

  function formatConjunctiveList(
    fragments: string[],
    options: { oxfordComma?: boolean } = {},
  ): string {
    if (fragments.length <= 1) return fragments[0] || "";
    if (fragments.length === 2) return `${fragments[0]} and ${fragments[1]}`;
    const comma = options.oxfordComma === false ? "" : ",";
    return `${fragments.slice(0, -1).join(", ")}${comma} and ${fragments.at(-1)}`;
  }

  function splitComplexColumnHeaderAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const fragments = descriptor.complexColumnHeaderFragments;
    if (
      descriptor.role !== "columnheader" ||
      descriptor.tableRole !== "table" ||
      !fragments ||
      fragments.length < 3 ||
      !descriptor.columnIndex ||
      !descriptor.columnCount
    ) {
      return undefined;
    }

    const productName = normalize(fragments[0]);
    const context = formatConjunctiveList(fragments);
    const formattedHeader = `${context} ${productName}, column ${descriptor.columnIndex} of ${descriptor.columnCount}`;
    return [formattedHeader].filter(
      (announcement): announcement is string => Boolean(announcement),
    );
  }

  function splitComplexColumnHeaderContextCellAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (
      !["cell", "gridcell"].includes(descriptor.role || "") ||
      descriptor.tableRole !== "table" ||
      !descriptor.complexColumnHeaderContextText ||
      !descriptor.columnIndex ||
      !descriptor.columnCount
    ) {
      return undefined;
    }

    const fragments = descriptor.complexColumnHeaderContextCellTextFragments;
    const label = normalize(descriptor.name || descriptor.text);
    const header = `${descriptor.complexColumnHeaderContextText} group, column ${descriptor.columnIndex} of ${descriptor.columnCount}`;
    return [header, ...(fragments?.length ? fragments : [label])].filter((announcement): announcement is string =>
      Boolean(announcement),
    );
  }

  function splitComplexColumnHeaderTextAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!["paragraph", "text"].includes(descriptor.role || "")) {
      return undefined;
    }
    return descriptor.complexColumnHeaderTextFragments?.length
      ? descriptor.complexColumnHeaderTextFragments
      : undefined;
  }

  function splitInlineEmphasisTextAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const fragments = descriptor.inlineEmphasisTextFragments;
    if (!["paragraph", "text"].includes(descriptor.role || "") || !fragments?.length) {
      return undefined;
    }
    return fragments;
  }

  function splitInlineCodeBreakTextAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const fragments = descriptor.inlineCodeBreakTextFragments;
    if (!["paragraph", "text"].includes(descriptor.role || "") || !fragments?.length) {
      return undefined;
    }
    return fragments;
  }

  function splitFooterInlineBoundaryTextAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const fragments = descriptor.footerInlineBoundaryTextFragments;
    if (!["paragraph", "text"].includes(descriptor.role || "") || !fragments?.length) {
      return undefined;
    }
    return fragments;
  }

  function splitFigureMockupHeaderTextAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    return descriptor.figureMockupHeaderText
      ? [descriptor.figureMockupHeaderText]
      : undefined;
  }

  function splitInlineTextLinkAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const fragments = descriptor.inlineTextLinkFragments;
    if (descriptor.role !== "paragraph" || !fragments?.length) {
      return undefined;
    }
    return fragments;
  }

  function splitInlinePhrasingBoundaryAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const fragments = descriptor.inlinePhrasingBoundaryFragments;
    if (!["paragraph", "text"].includes(descriptor.role || "") || !fragments?.length) {
      return undefined;
    }
    return fragments;
  }

  function splitExpandedRegionInlineLinkAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const fragments = descriptor.expandedRegionInlineLinkFragments;
    if (descriptor.role !== "paragraph" || !fragments?.length) {
      return undefined;
    }
    return fragments;
  }

  function splitPriceDisclosureAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const fragments = descriptor.priceDisclosureFragments;
    if (!["paragraph", "text"].includes(descriptor.role || "") || !fragments?.length) {
      return undefined;
    }
    return fragments;
  }

  function splitInlineEmphasisListItemAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const fragments = descriptor.inlineEmphasisListItemFragments;
    if (descriptor.role !== "listitem" || !fragments || fragments.length < 2) {
      return undefined;
    }

    const [firstFragment, ...remainingFragments] = fragments;
    const firstAnnouncement = generateAnnouncement({
      ...descriptor,
      name: firstFragment,
      text: firstFragment,
    });

    return [firstAnnouncement, ...remainingFragments].filter(
      (announcement): announcement is string => Boolean(announcement),
    );
  }

  function isFocusableTerminalFooterGroup(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (implicitRole(el) !== "group") return false;
    if (
      !el.matches?.(interactiveSelector) &&
      el.getAttribute?.("tabindex") !== "0" &&
      !(typeof el.tabIndex === "number" && el.tabIndex >= 0)
    ) {
      return false;
    }
    return (
      isFocusableRichTextParagraphGroup(el) ||
      isFocusableHeadingRichTextNavigationGroup(el)
    );
  }

  function lastScannerStopInSubtree(el: any): any | undefined {
    let last: any | undefined;

    function visit(node: any): void {
      if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) return;
      if (isInsideCollapsedPopup(node)) return;
      if (isSeparatorListItem(node)) return;
      if (isInsideControlledTableGroupBody(node)) return;

      if (isStopElement(node)) {
        last = node;
        if (!shouldDescendIntoStop(node)) return;
      }

      for (const child of walkChildren(node)) visit(child);
    }

    visit(el);
    return last;
  }

  function hasVisibleFollowingContentBeforeBoundary(el: any, boundary: any): boolean {
    for (let current = el; current && current !== boundary; current = current.parentElement) {
      for (
        let sibling = current.nextElementSibling;
        sibling;
        sibling = sibling.nextElementSibling
      ) {
        if (isHidden(sibling)) continue;
        if (
          readableText(sibling) ||
          hasVisibleInteractiveDescendant(sibling) ||
          isStopElement(sibling)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  function shouldSuppressTerminalFooterEnd(
    root: any,
    el: any,
    descriptor: CapturedElementDescriptor,
  ): boolean {
    if (descriptor.role !== "contentinfo" || descriptor.roleDescription !== "footer") {
      return false;
    }

    const scanRoot = el.closest?.("[data-sr-scan-root]");
    if (!scanRoot || (scanRoot !== root && !root?.contains?.(scanRoot))) return false;
    if (hasVisibleFollowingContentBeforeBoundary(el, scanRoot)) return false;

    const lastStop = lastScannerStopInSubtree(el);
    return Boolean(lastStop && lastStop !== el && isFocusableTerminalFooterGroup(lastStop));
  }

  function isSuppressedScanRootMainBoundary(root: any, el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (el.tagName?.toLowerCase() !== "main") return false;
    if (!el.hasAttribute("data-sr-scan-root")) return false;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
    if (accessibleName(el, "main")) return false;
    return root === el || root?.contains?.(el);
  }

  function roundedBoundingBox(el: any): BoundingBox | undefined {
    if (!el?.getBoundingClientRect) return undefined;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }

  function scanSubtree(root: any): ScanLogEntry[] {
    const log: ScanLogEntry[] = [];
    let stopIndex = 0;

    function emitTraversalStop(srId: string, stop: TraversalStop): void {
      if (!stop.announcement) return;
      log.push({
        index: log.length,
        srId,
        announcement: stop.announcement,
        role: stop.role ?? stop.descriptor?.role,
        name: stop.name ?? stop.descriptor?.name,
        boundingBox: stop.boundingBox ?? roundedBoundingBox(stop.el),
        traversalDebug: includeTraversalDebug
          ? {
              stopKind: stop.kind,
              stopSource: stop.source,
              descriptorRole: stop.descriptor?.role,
              descriptorName: stop.descriptor?.name,
            }
          : undefined,
      });
    }

    function syntheticTextStop(
      source: string,
      el: any,
      announcement: string,
      role = "text",
      name = announcement,
    ): TraversalStop {
      return {
        kind: "synthetic",
        source,
        el,
        announcement,
        role,
        name,
      };
    }

    function descriptorAnnouncementStops(
      source: string,
      el: any,
      descriptor: CapturedElementDescriptor,
      announcements: string[],
    ): TraversalStop[] {
      return announcements
        .filter((announcement): announcement is string => Boolean(announcement))
        .map((announcement) => ({
          kind: "split",
          source,
          el,
          descriptor,
          announcement,
        }));
    }

    function descriptorAnnouncementResult(
      descriptor: CapturedElementDescriptor,
      el: any,
    ): { source: string; announcements: string[] } {
      const candidates = [
        {
          source: "split-described-autocomplete",
          announcements: splitDescribedAutocompleteAnnouncements(descriptor),
        },
        {
          source: "split-footer-country-selector",
          announcements: splitFooterCountrySelectorAnnouncements(descriptor),
        },
        {
          source: "split-fieldset-prompt",
          announcements: splitFieldsetPromptAnnouncements(descriptor),
        },
        {
          source: "split-labelled-navigation-header",
          announcements: splitLabelledNavigationHeaderAnnouncements(descriptor),
        },
        {
          source: "split-example-preview-frame",
          announcements: splitExamplePreviewFrameAnnouncements(descriptor),
        },
        {
          source: "split-wrapped-definition-list-term",
          announcements: splitWrappedDefinitionListTermAnnouncements(descriptor),
        },
        {
          source: "split-ax-inline-two-link-list-item",
          announcements: splitAxInlineTwoLinkListItemAnnouncements(descriptor),
        },
        {
          source: "split-named-navigation-listitem-grouped-link",
          announcements: splitNamedNavigationListItemGroupedLinkAnnouncements(descriptor),
        },
        {
          source: "split-ax-publication-listitem-boundary",
          announcements: splitAxPublicationListItemBoundaryAnnouncements(descriptor),
        },
        {
          source: "split-ax-mixed-inline-listitem",
          announcements: splitAxMixedInlineListItemAnnouncements(descriptor),
        },
        {
          source: "split-ax-strong-wrapped-marker-listitem",
          announcements: splitAxStrongWrappedMarkerListItemAnnouncements(descriptor),
        },
        {
          source: "split-ax-plain-text-marker-listitem",
          announcements: splitAxPlainTextMarkerListItemAnnouncements(descriptor),
        },
        {
          source: "split-ax-marker-only-listitem",
          announcements: splitAxMarkerOnlyListItemAnnouncements(descriptor),
        },
        {
          source: "split-contribution-listitem",
          announcements: splitContributionListItemAnnouncements(descriptor),
        },
        {
          source: "split-metadata-listitem",
          announcements: splitMetadataListItemAnnouncements(descriptor),
        },
        {
          source: "split-compact-input-action-group",
          announcements: splitCompactInputActionGroupAnnouncements(descriptor),
        },
        {
          source: "split-preceding-control-label",
          announcements: splitPrecedingControlLabelAnnouncements(descriptor),
        },
        {
          source: "split-marker-separated-list-region",
          announcements: splitMarkerSeparatedListRegionAnnouncements(descriptor),
        },
        {
          source: "split-marker-separated-list-link",
          announcements: splitMarkerSeparatedListLinkAnnouncements(descriptor),
        },
        {
          source: "split-carousel-group",
          announcements: splitCarouselGroupAnnouncements(descriptor),
        },
        {
          source: "split-leading-generic-group-stop",
          announcements: splitLeadingGenericGroupStopAnnouncements(descriptor),
        },
        {
          source: "split-trailing-standalone-group",
          announcements: splitTrailingStandaloneGroupAnnouncements(descriptor),
        },
        {
          source: "split-clustered-visual-button",
          announcements: splitClusteredVisualButtonAnnouncements(descriptor),
        },
        {
          source: "split-code-mirror-text-entry",
          announcements: splitCodeMirrorTextEntryAnnouncements(descriptor),
        },
        {
          source: "split-label-stop",
          announcements: splitLabelStopAnnouncements(descriptor),
        },
        {
          source: "split-native-form-inline-alert",
          announcements: splitNativeFormInlineAlertAnnouncements(descriptor),
        },
        {
          source: "split-compact-result-count",
          announcements: splitCompactResultCountAnnouncements(descriptor),
        },
        {
          source: "split-complex-column-header",
          announcements: splitComplexColumnHeaderAnnouncements(descriptor),
        },
        {
          source: "split-complex-column-header-context-cell",
          announcements: splitComplexColumnHeaderContextCellAnnouncements(descriptor),
        },
        {
          source: "split-complex-column-header-text",
          announcements: splitComplexColumnHeaderTextAnnouncements(descriptor),
        },
        {
          source: "split-rich-product-card-feature-heading",
          announcements: splitRichProductCardFeatureHeadingAnnouncements(descriptor),
        },
        {
          source: "split-rich-product-card-feature-row",
          announcements: splitRichProductCardFeatureRowAnnouncements(descriptor),
        },
        {
          source: "split-inline-code-break-text",
          announcements: splitInlineCodeBreakTextAnnouncements(descriptor),
        },
        {
          source: "split-footer-inline-boundary-text",
          announcements: splitFooterInlineBoundaryTextAnnouncements(descriptor),
        },
        {
          source: "split-figure-mockup-header-text",
          announcements: splitFigureMockupHeaderTextAnnouncements(descriptor),
        },
        {
          source: "split-inline-phrasing-boundary",
          announcements: splitInlinePhrasingBoundaryAnnouncements(descriptor),
        },
        {
          source: "split-inline-text-link",
          announcements: splitInlineTextLinkAnnouncements(descriptor),
        },
        {
          source: "split-expanded-region-inline-link",
          announcements: splitExpandedRegionInlineLinkAnnouncements(descriptor),
        },
        {
          source: "split-price-disclosure",
          announcements: splitPriceDisclosureAnnouncements(descriptor),
        },
        {
          source: "split-inline-emphasis-text",
          announcements: splitInlineEmphasisTextAnnouncements(descriptor),
        },
        {
          source: "split-blockquote-inline-emphasis",
          announcements: splitBlockquoteInlineEmphasisAnnouncements(descriptor),
        },
        {
          source: "split-plain-span-only-blockquote",
          announcements: splitPlainSpanOnlyBlockquoteAnnouncements(descriptor),
        },
        {
          source: "split-inline-emphasis-listitem",
          announcements: splitInlineEmphasisListItemAnnouncements(descriptor),
        },
        {
          source: "split-dialog-direct-text",
          announcements: splitDialogDirectTextAnnouncements(descriptor, el),
        },
      ];

      const match = candidates.find((candidate) => candidate.announcements);
      return match?.announcements
        ? { source: match.source, announcements: match.announcements }
        : {
            source: "descriptor-announcement",
            announcements: [generateAnnouncement(descriptor)],
          };
    }

    function walk(el: any): void {
      if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return;
      if (isInsideCollapsedPopup(el)) return;
      if (isSeparatorListItem(el)) return;
      if (isInsideControlledTableGroupBody(el)) return;
      if (isAxConfirmedNativeSearchFormLabel(el)) return;

      const ariaLabelledDescriptionTextInput =
        directVisibleAriaLabelledTextInputDescriptionSequence(el);
      if (ariaLabelledDescriptionTextInput) {
        const id = `__sr_el_${stopIndex}_${now()}`;
        stopIndex += 1;
        el.setAttribute("data-sr-id", id);
        const stops = [
          syntheticTextStop(
            "direct-visible-aria-labelled-text-input-description",
            ariaLabelledDescriptionTextInput.description,
            ariaLabelledDescriptionTextInput.descriptionText,
          ),
          syntheticTextStop(
            "direct-visible-aria-labelled-text-input-label",
            ariaLabelledDescriptionTextInput.label,
            ariaLabelledDescriptionTextInput.labelText,
          ),
          syntheticTextStop(
            "direct-visible-aria-labelled-text-input-control",
            ariaLabelledDescriptionTextInput.input,
            ariaLabelledDescriptionTextInput.inputAnnouncement,
            "textbox",
            ariaLabelledDescriptionTextInput.inputAnnouncement,
          ),
        ];
        for (const stop of stops) emitTraversalStop(id, stop);
        return;
      }

      const labelHintTextInput = directVisibleTextInputLabelHintSequence(el);
      if (labelHintTextInput) {
        const id = `__sr_el_${stopIndex}_${now()}`;
        stopIndex += 1;
        el.setAttribute("data-sr-id", id);
        const stops = [
          syntheticTextStop(
            "direct-visible-text-input-label",
            labelHintTextInput.label,
            labelHintTextInput.labelText,
          ),
          syntheticTextStop(
            "direct-visible-text-input-hint",
            labelHintTextInput.hint,
            labelHintTextInput.hintText,
          ),
          syntheticTextStop(
            "direct-visible-text-input-control",
            labelHintTextInput.input,
            labelHintTextInput.inputAnnouncement,
            "textbox",
            labelHintTextInput.labelText,
          ),
        ];
        for (const stop of stops) emitTraversalStop(id, stop);
        return;
      }

      const compactCodeText = compactExpandedCodePanelText(el);
      if (compactCodeText) {
        const id = `__sr_el_${stopIndex}_${now()}`;
        stopIndex += 1;
        el.setAttribute("data-sr-id", id);
        emitTraversalStop(
          id,
          syntheticTextStop("compact-expanded-code-panel", el, compactCodeText),
        );
        return;
      }

      const codeLines = tokenizedPreCodeLines(el);
      if (codeLines?.length) {
        const id = `__sr_el_${stopIndex}_${now()}`;
        stopIndex += 1;
        el.setAttribute("data-sr-id", id);
        for (const line of codeLines) {
          emitTraversalStop(id, syntheticTextStop("tokenized-pre-code-line", el, line));
        }
        return;
      }

      const mixedCodeFragments = tokenizedMixedHtmlFormFragments(el);
      if (mixedCodeFragments?.length) {
        const id = `__sr_el_${stopIndex}_${now()}`;
        stopIndex += 1;
        el.setAttribute("data-sr-id", id);
        for (const fragment of mixedCodeFragments) {
          emitTraversalStop(
            id,
            syntheticTextStop("tokenized-mixed-html-form-fragment", el, fragment),
          );
        }
        return;
      }

      const standaloneCodeLine = tokenizedStandaloneHtmlTagLine(el);
      if (standaloneCodeLine?.length) {
        const id = `__sr_el_${stopIndex}_${now()}`;
        stopIndex += 1;
        el.setAttribute("data-sr-id", id);
        for (const line of standaloneCodeLine) {
          emitTraversalStop(
            id,
            syntheticTextStop("tokenized-standalone-html-tag-line", el, line),
          );
        }
        return;
      }

      const codeFragments = tokenizedOneLineHtmlTagFragments(el);
      if (codeFragments?.length) {
        const id = `__sr_el_${stopIndex}_${now()}`;
        stopIndex += 1;
        el.setAttribute("data-sr-id", id);
        for (const fragment of codeFragments) {
          emitTraversalStop(
            id,
            syntheticTextStop("tokenized-one-line-html-tag-fragment", el, fragment),
          );
        }
        return;
      }

      if (isSuppressedScanRootMainBoundary(root, el)) {
        for (const child of walkChildren(el)) walk(child);
        return;
      }

      if (isStopElement(el)) {
        const id = `__sr_el_${stopIndex}_${now()}`;
        stopIndex += 1;
        el.setAttribute("data-sr-id", id);

        const descriptor = captureElement(el);
        if (descriptor) {
          const { source, announcements } = descriptorAnnouncementResult(descriptor, el);
          for (const stop of descriptorAnnouncementStops(
            source,
            el,
            descriptor,
            announcements,
          )) {
            emitTraversalStop(id, stop);
          }
        }

        if (shouldDescendIntoStop(el)) {
          const children = descriptor?.modalDialogSummaryItemCount
            ? modalDialogHeadingChildren(el)
            : walkChildren(el);
          for (const child of children) walk(child);
        }

        if (descriptor) {
          if (descriptor.axMarkerLinkTrailingTextListItemAnnouncement) {
            emitTraversalStop(id, {
              kind: "split",
              source: "ax-marker-link-trailing-text-list-item",
              el,
              descriptor,
              announcement: descriptor.axMarkerLinkTrailingTextListItemAnnouncement,
            });
          }

          const modalSummary = modalDialogSummaryAnnouncement(descriptor);
          if (modalSummary) {
            emitTraversalStop(id, {
              kind: "split",
              source: "modal-dialog-summary",
              el,
              descriptor,
              announcement: modalSummary,
            });
          }

          const endAnnouncement = shouldSuppressTerminalFooterEnd(root, el, descriptor)
            ? null
            : getContextEndAnnouncement(descriptor);
          if (endAnnouncement) {
            emitTraversalStop(id, {
              kind: "context-end",
              source: "context-end-announcement",
              descriptor,
              announcement: endAnnouncement,
              boundingBox: undefined,
            });
          }
        }
        return;
      }

      for (const child of walkChildren(el)) walk(child);
    }

    walk(root);
    return log;
  }

  return {
    getScanRoot,
    captureElement,
    isStopElement,
    shouldDescendIntoStop,
    scanSubtree,
  };
}
