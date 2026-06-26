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
}

export interface DomScannerOptions {
  generateAnnouncement: (descriptor: ElementDescriptor) => string;
  getContextEndAnnouncement: (
    descriptor: ElementDescriptor,
  ) => string | undefined;
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
    now = () => Date.now(),
  } = options;

  const interactiveSelector =
    "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], [role='combobox'], [role='searchbox'], [role='textbox']";

  const contextRoles = new Set([
    "banner",
    "navigation",
    "search",
    "main",
    "contentinfo",
    "complementary",
    "region",
    "group",
    "list",
    "listbox",
    "table",
    "grid",
    "tabpanel",
    "article",
  ]);

  const listPositionedRoles = new Set([
    "link",
    "button",
    "heading",
    "listitem",
    "image",
    "group",
    "search",
    "navigation",
    "region",
    "article",
  ]);

  function normalize(value?: string | null): string | undefined {
    const normalized = value?.replace(/\s+/g, " ").trim();
    return normalized || undefined;
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

  function isFocusableOpacityHiddenControl(el: any): boolean {
    return Boolean(el?.matches?.(interactiveSelector)) && isOpacityHiddenOnly(el);
  }

  function isHidden(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    if (el.getAttribute("aria-hidden") === "true") {
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

    const style = getComputedStyle(el);
    return style.display === "none" || style.visibility === "hidden";
  }

  function needsBoundary(left: string, right: string): boolean {
    const leftChar = left.slice(-1);
    const rightChar = right[0];
    if (!leftChar || !rightChar) return false;
    if (/\s/.test(leftChar) || /\s/.test(rightChar)) return false;
    if (/[.,;:!?)]/.test(rightChar) || /[(]/.test(leftChar)) return false;
    return /[\p{L}\p{N}%]/u.test(leftChar) && /[\p{L}\p{N}£$€]/u.test(rightChar);
  }

  function readableText(el: any): string | undefined {
    function collect(node: any): string {
      if (!node) return "";
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      if (isHidden(node)) return "";

      let text = "";
      for (const child of Array.from(node.childNodes)) {
        const part = collect(child);
        if (!part) continue;
        if (text && needsBoundary(text, part)) text += " ";
        text += part;
      }
      return text;
    }

    return normalize(collect(el));
  }

  function directOwnText(el: any): string | undefined {
    return normalize(
      Array.from(el?.childNodes || [])
        .filter((child: any) => child.nodeType === Node.TEXT_NODE)
        .map((child: any) => child.textContent || "")
        .join(" "),
    );
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
    return document.getElementById(id) || document.querySelector(`#${cssEscape(id)}`);
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

  function nestedImageLabel(el: any): string | undefined {
    const image = Array.from(
      el.querySelectorAll("img[alt], [role='img'][aria-label], svg[aria-label]"),
    ).find((node: any) => !isHidden(node));

    if (!image) return undefined;
    const tag = image.tagName.toLowerCase();
    return normalize(
      image.getAttribute("aria-label") ||
        (tag === "img" ? image.getAttribute("alt") : "") ||
        image.getAttribute("title"),
    );
  }

  function linkContentName(el: any): string | undefined {
    const imageLabel = nestedImageLabel(el);
    const text = readableText(el);
    return normalize([imageLabel, text].filter(Boolean).join(" "));
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
      .replace(/[-_]+/g, " ");
    const acronymWords = new Set([
      "ai",
      "api",
      "apis",
      "css",
      "dom",
      "html",
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
          const lower = word.toLowerCase();
          if (acronymWords.has(lower)) return lower.toUpperCase();
          return word;
        })
        .join(" "),
    );
  }

  function buttonContentName(el: any): string | undefined {
    const imageLabel = nestedImageLabel(el);
    const text = readableText(el);
    return normalize([imageLabel, text].filter(Boolean).join(" "));
  }

  function isFocusableImageListItem(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el.tagName.toLowerCase() !== "li") return false;
    if (!el.hasAttribute("tabindex")) return false;
    if (el.querySelector(interactiveSelector)) return false;
    if (!nestedImageLabel(el)) return false;
    return !textWithoutInteractive(el);
  }

  function isCustomElement(el: any): boolean {
    return Boolean(el?.tagName?.toLowerCase().includes("-"));
  }

  function closestCustomElement(el: any): any {
    for (let current = el?.parentElement; current; current = current.parentElement) {
      if (isCustomElement(current)) return current;
    }
    return null;
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
    if (!el.hasAttribute("aria-label")) return false;
    if (normalizedPopup(el) || el.hasAttribute("aria-expanded")) return false;
    if (isPositionedImageChoiceButton(el)) return false;

    const label = normalize(el.getAttribute("aria-label"));
    if (/^(previous|next) slide$/i.test(label || "")) return false;

    return Boolean(el.querySelector("svg, [role='img'], img"));
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

  function isIconFirstTextButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
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
      const style = getComputedStyle(child);
      if ((marker && marker !== "false") || style.display === "none") continue;
      const selector = "svg, img, [role='img']";
      return child.matches(selector) || Boolean(child.querySelector(selector));
    }

    return false;
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
      if (!textBeforeButton || !/[.!?]$/.test(textBeforeButton)) continue;
      const fullText = normalize(readableText(current));
      if (fullText.endsWith(label)) return true;
    }

    return false;
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
    if (/^(previous|next) slide$/i.test(label || "")) return false;
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
        return true;
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

    return /^(open search|open alerts\b.*|open help menu)$/i.test(label || "");
  }

  function isSimpleNativeFooter(el: any): boolean {
    if (el?.tagName?.toLowerCase() !== "footer") return false;
    if (el.hasAttribute("role")) return false;
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

    for (let current = el.parentElement; current; current = current.parentElement) {
      for (let sibling = current.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
        if (isHidden(sibling)) continue;
        return implicitRole(sibling) === "dialog";
      }
    }

    return false;
  }

  function isFooterCountrySelector(el: any): boolean {
    if (el?.tagName?.toLowerCase() !== "select") return false;
    const footer = el.closest("footer,[role='contentinfo']");
    if (!footer) return false;
    const label = labelForControl(el) || accessibleName(el, "combobox");
    if (!/^country:\s*$/i.test(label || "")) return false;
    return Boolean(
      Array.from(footer.querySelectorAll("a[href], [role='link']")).some((link: any) =>
        /back to top/i.test(accessibleName(link, "link") || readableText(link) || ""),
      ),
    );
  }

  function accessibleName(el: any, role: string): string | undefined {
    const tag = el.tagName.toLowerCase();
    const ariaLabel = normalize(el.getAttribute("aria-label"));
    const labelledBy = textFromIdRefs(el.getAttribute("aria-labelledby"));
    const nativeLabel = ["input", "select", "textarea"].includes(tag)
      ? labelForControl(el)
      : undefined;

    if (nativeLabel) return nativeLabel;
    if (ariaLabel !== undefined) return ariaLabel;
    if (labelledBy) return labelledBy;

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
      return normalize(el.getAttribute("title"));
    }

    if (role === "group" && !el.matches(interactiveSelector)) {
      return isFocusableImageListItem(el)
        ? nestedImageLabel(el)
        : normalize(el.getAttribute("title"));
    }

    if (tag === "img") return normalize(el.getAttribute("alt"));
    if (["input", "select", "textarea"].includes(tag)) return nativeLabel;

    if (role === "link") {
      return (
        linkContentName(el) ||
        normalize(el.getAttribute("title")) ||
        hrefSlugLabel(el)
      );
    }

    if (role === "button") {
      return buttonContentName(el) || normalize(el.getAttribute("title"));
    }

    return readableText(el) || normalize(el.getAttribute("title"));
  }

  function implicitRole(el: any): string {
    const tag = el.tagName.toLowerCase();
    const explicit = el.getAttribute("role");
    if (explicit === "img") return "image";
    if (explicit && explicit !== "none" && explicit !== "presentation") {
      return explicit;
    }

    if (/^h[1-6]$/.test(tag)) return "heading";
    if (tag === "a" && el.hasAttribute("href")) return "link";
    if (tag === "button") return "button";
    if (isFocusableImageListItem(el)) return "group";
    if (tag === "select") return el.hasAttribute("multiple") ? "listbox" : "combobox";
    if (tag === "textarea") return "textbox";
    if (tag === "input") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio";
      if (type === "search") return "searchbox";
      if (["button", "submit", "reset"].includes(type)) return "button";
      return "textbox";
    }
    if (tag === "header") {
      return el.closest("main, article, aside, nav, section") ? "" : "banner";
    }
    if (tag === "nav") return "navigation";
    if (tag === "main") return "main";
    if (tag === "article") return "article";
    if (tag === "search") return "search";
    if (tag === "footer") {
      return el.closest("main, article, aside, nav, section") ? "" : "contentinfo";
    }
    if (tag === "aside") return "complementary";
    if (tag === "form" && explicit === "search") return "search";
    if (tag === "ul" || tag === "ol" || tag === "dl") return "list";
    if (tag === "li") return "listitem";
    if (tag === "dt") return "term";
    if (tag === "table") return "table";
    if (tag === "tr") return "row";
    if (tag === "th") return "columnheader";
    if (tag === "td") return "cell";
    if (tag === "img") return "image";
    if (tag === "svg") return "image";
    if (tag === "dialog") return "dialog";
    if (
      tag === "p" ||
      tag === "blockquote" ||
      tag === "figcaption" ||
      tag === "time" ||
      isStructuredListBodyText(el) ||
      isInteractiveListBodyText(el)
    ) {
      return "paragraph";
    }
    if (
      ["section", "div", "form"].includes(tag) &&
      (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
    ) {
      return tag === "section" ? "region" : "group";
    }
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
      (isSplitTextListItemBlock(el) || !el.closest("p, li, h1, h2, h3, h4, h5, h6"))
    ) {
      return "text";
    }
    return "";
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

  function listChildren(list: any): any[] {
    if (!list) return [];
    const tag = list.tagName.toLowerCase();
    if (tag === "dl") {
      return Array.from(list.children).filter((child: any) => {
        const childTag = child.tagName.toLowerCase();
        return !isHidden(child) && (childTag === "dt" || childTag === "dd");
      });
    }

    return Array.from(list.children).filter((child: any) => isListItem(child));
  }

  function announcedListChildren(list: any): any[] {
    return listChildren(list).filter((child: any) => !isSeparatorListItem(child));
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

  function semanticListContext(el: any) {
    let listItem = el;
    while (listItem && !isListItem(listItem)) {
      listItem = listItem.parentElement;
    }

    const list = listItem?.parentElement || null;
    const siblings = list ? listChildren(list) : [];
    return { listItem, list, siblings };
  }

  function listLevel(el: any): number | undefined {
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

    const parentItem = el.parentElement?.closest("li,[role='listitem']");
    if (!parentItem) {
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

  function positionInSet(el: any, role: string): number | undefined {
    const explicit = Number.parseInt(el.getAttribute("aria-posinset") || "", 10);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;

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

    if (role === "image" && hasStructuredListItemContent(el.closest("li,[role='listitem']"))) {
      const listItem = el.closest("li,[role='listitem']");
      const firstHeading = listItem?.querySelector(
        "h1, h2, h3, h4, h5, h6, [role='heading']",
      );
      if (
        !firstHeading ||
        Boolean(
          el.compareDocumentPosition(firstHeading) &
            el.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,
        )
      ) {
        const { siblings } = semanticListContext(el);
        const index = siblings.indexOf(listItem);
        return index >= 0 ? index + 1 : undefined;
      }
      return undefined;
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
      ["heading", "link"].includes(role) &&
      structuredListItemHasPreHeadingImage(el.closest("li,[role='listitem']"))
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

    if (role === "paragraph" && isFirstInteractiveListBodyText(el)) {
      const { listItem, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? index + 1 : undefined;
    }

    if (role === "paragraph" && isFirstTextBlockListItemParagraph(el)) {
      const { listItem, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? index + 1 : undefined;
    }

    if (listPositionedRoles.has(role)) {
      const { listItem, siblings } = semanticListContext(el);
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
      return index >= 0 ? index + 1 : undefined;
    }

    return undefined;
  }

  function setSize(el: any, role: string): number | undefined {
    const explicit = Number.parseInt(el.getAttribute("aria-setsize") || "", 10);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;

    if (role === "list") return announcedListChildren(el).length || undefined;
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
    if (listPositionedRoles.has(role)) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    if (role === "paragraph" && isFirstInteractiveListBodyText(el)) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    if (role === "paragraph" && isFirstTextBlockListItemParagraph(el)) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
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

  function hasSingleSemanticListItemChild(el: any): boolean {
    if (!isListItem(el)) return false;
    if (directOwnText(el)) return false;
    if (hasDirectNonSemanticTextChild(el)) return false;
    const children = directSemanticChildren(el);
    if (children.length !== 1) return false;
    const role = implicitRole(children[0]);
    return contextRoles.has(role) || role === "group";
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

  function isFirstSplitTextListItemBlock(el: any): boolean {
    if (!isSplitTextListItemBlock(el)) return false;
    const listItem = el.closest("li,[role='listitem']");
    return splitListItemTextBlocks(listItem)[0] === el;
  }

  function hasStructuredListItemContent(el: any): boolean {
    if (!isListItem(el)) return false;
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

  function isInteractiveCardListButton(el: any): boolean {
    if (implicitRole(el) !== "button") return false;
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
    const row = el.closest("tr,[role='row']");
    if (!table || !row) return {};

    const rows = Array.from(table.querySelectorAll("tr,[role='row']")).filter(
      (candidate: any) => !isHidden(candidate),
    );
    const cells = Array.from(row.children).filter((child: any) => {
      const childRole = implicitRole(child);
      return ["cell", "gridcell", "rowheader", "columnheader"].includes(childRole);
    });

    const rowIndex = rows.indexOf(row);
    const columnIndex = cells.indexOf(el);
    const firstRow = rows[0];
    const headerCells = Array.from(firstRow?.children || []).filter((child: any) => {
      const childRole = implicitRole(child);
      return ["columnheader", "rowheader"].includes(childRole);
    });
    const columnHeader = columnIndex >= 0 ? headerCells[columnIndex] : null;

    return {
      tableRole: implicitRole(table),
      tableLabel: accessibleName(table, implicitRole(table)),
      rowIndex: rowIndex >= 0 ? rowIndex + 1 : undefined,
      rowCount: rows.length || undefined,
      columnIndex: columnIndex >= 0 ? columnIndex + 1 : undefined,
      columnCount: cells.length || undefined,
      columnHeaderText:
        role !== "columnheader" && columnHeader ? accessibleName(columnHeader, "columnheader") : undefined,
    };
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

  function directHeadingFragments(el: any): string[] | undefined {
    if (implicitRole(el) !== "heading") return undefined;
    if (el.querySelector("button, [role='button'], a[href]")) return undefined;

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
    if (el.getAttribute("aria-autocomplete") !== "list") return false;
    if (!el.hasAttribute("aria-describedby")) return false;
    if (el.hasAttribute("aria-description")) return false;
    return Boolean(accessibleName(el, role) && textFromIdRefs(el.getAttribute("aria-describedby")));
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

  function captureElement(el: any): CapturedElementDescriptor | null {
    if (!el || el === document.body || el === document.documentElement || isHidden(el)) {
      return null;
    }

    const role = implicitRole(el);
    if (!role) return null;

    const tag = el.tagName.toLowerCase();
    const control =
      role === "combobox" && tag !== "input" && tag !== "select"
        ? el.querySelector("input, select, textarea, [role='textbox'], [role='searchbox']")
        : null;
    const stateEl = control || el;
    const name = accessibleName(el, role);
    const text = readableText(el);
    const position = positionInSet(el, role);
    const size = setSize(el, role);
    const rect = el.getBoundingClientRect();
    const table = tableContext(el, role);
    const parentListMeta = parentListPosition(el);
    const headingButton = role === "heading"
      ? el.querySelector("button, [role='button']")
      : null;
    const headingLink = role === "heading" ? el.querySelector("a[href]") : null;
    const selectedListboxOption = singleSelectedListboxOption(el);
    const suppressPositionedChoiceGroup =
      role === "button" &&
      Boolean(position) &&
      !el.hasAttribute("aria-expanded") &&
      !normalizedPopup(el) &&
      !isSlideshowNavigationButton(el) &&
      (isIconFirstTextButton(el) ||
        (el.hasAttribute("aria-label") && !readableText(el)));
    const value =
      tag === "select"
        ? nativeSelectValue(stateEl)
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

    const descriptor: CapturedElementDescriptor = {
      role,
      name,
      text,
      description: normalize(
        stateEl.getAttribute("aria-description") ?? el.getAttribute("aria-description"),
      ),
      details: textFromIdRefs(
        stateEl.getAttribute("aria-describedby") ?? el.getAttribute("aria-describedby"),
      ),
      errorMessage: textFromIdRefs(
        stateEl.getAttribute("aria-errormessage") ?? el.getAttribute("aria-errormessage"),
      ),
      roleDescription:
        role === "list" && tag === "dl"
          ? "definition list"
          : role === "contentinfo" && isSimpleNativeFooter(el)
            ? "footer"
          : role === "alert" && (!readableText(el) || isEmptyAlertBeforeDialog(el))
            ? "group"
          : role === "paragraph" &&
              el.getAttribute("tabindex") === "-1" &&
              hasStructuredListItemContent(el.closest("li,[role='listitem']"))
            ? "empty group"
            : normalize(el.getAttribute("aria-roledescription")),
      level:
        role === "heading"
          ? Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2
          : role === "list"
            ? listLevel(el)
          : undefined,
      setSize: selectedListboxSize ?? size,
      positionInSet: selectedListboxPosition ?? position,
      ...parentListMeta,
      value,
      valueText: normalize(stateEl.getAttribute("aria-valuetext")),
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
              : Boolean(el.checked)
          : undefined,
      expanded:
        parseBooleanAttribute(stateEl, "aria-expanded") ??
        (headingButton ? parseBooleanAttribute(headingButton, "aria-expanded") : undefined),
      selected: parseBooleanAttribute(el, "aria-selected"),
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
      hasPopup: normalizedPopup(stateEl) ?? normalizedPopup(el),
      autocomplete: normalize(stateEl.getAttribute("aria-autocomplete") ?? el.getAttribute("aria-autocomplete")),
      modal: el.getAttribute("aria-modal") === "true" || undefined,
      sort: normalize(el.getAttribute("aria-sort")),
      selectedCount: listboxSelectedCount,
      nativeSelect: tag === "select" || undefined,
      headingButton: Boolean(headingButton) || undefined,
      headingLink: Boolean(headingLink) || undefined,
      headingFragments: directHeadingFragments(el),
      iconOnlyLink: role === "link" && isIconOnlyLink(el) || undefined,
      compositeText:
        role === "button" &&
        Boolean(nestedImageLabel(el) && readableText(el)) ||
        undefined,
      groupContext:
        Boolean(headingButton) ||
        (role === "button" &&
          !suppressPositionedChoiceGroup &&
          !isPositionedImageChoiceButton(el) &&
          Boolean(nestedImageLabel(el))) ||
        (role === "button" &&
          Boolean(closestCustomElement(el)) &&
          !normalizedPopup(el) &&
          !isPlainUtilityDisclosureButton(el) &&
          !suppressPositionedChoiceGroup &&
          el.hasAttribute("aria-label")) ||
        (role === "button" &&
          el.hasAttribute("aria-expanded") &&
          !normalizedPopup(el) &&
          !position &&
          !buttonSharesListItemWithLink(el) &&
          !isPlainUtilityDisclosureButton(el) &&
          normalize(name) !== "Open navigation menu") ||
        (role === "button" && isLabeledIconActionButton(el)) ||
        (role === "button" && isMenuDisclosureGroupButton(el)) ||
        (role === "button" && isSlideshowNavigationButton(el)) ||
        (role === "button" && isInteractiveCardListButton(el)) ||
        (role === "button" && isTrailingDisclaimerButton(el)) ||
        (role === "button" &&
          !suppressPositionedChoiceGroup &&
          isIconFirstTextButton(el)) ||
        undefined,
      groupedCollectionPosition:
        role === "button" &&
          hasOnlyInteractiveListItemContent(semanticListContext(el).listItem) ||
        undefined,
      splitDescribedAutocomplete:
        shouldSplitDescribedAutocomplete(el, role) || undefined,
      searchInputGroup:
        (role === "combobox" &&
          tag === "input" &&
          (el.getAttribute("type") || "").toLowerCase() === "search") ||
          undefined,
      splitLabelStop:
        (["searchbox", "textbox"].includes(role) &&
          tag === "input" &&
          Boolean(name?.endsWith(":"))) ||
        (role === "combobox" &&
          tag === "select" &&
          Boolean(
            name?.endsWith(":") ||
              (value && name?.endsWith(value)),
          ))
          ? true
          : undefined,
      footerCountrySelector:
        role === "combobox" && isFooterCountrySelector(el) ? true : undefined,
      suppressContextEnd:
        (role === "group" && isFocusableImageListItem(el)) ||
        (role === "group" &&
          isCustomElement(el) &&
          hasShadowRootContent(el) &&
          !accessibleName(el, role))
          ? true
          : undefined,
      ...table,
      boundingBox: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };

    if (role === "listitem") {
      descriptor.name = textWithoutInteractive(el);
      descriptor.text = descriptor.name;
    }

    if (role === "paragraph") {
      descriptor.name = hasInlineInteractiveEmbeddedInText(el)
        ? textBeforeFirstInlineInteractive(el)
        : textWithoutInteractive(el) || text;
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

  function isStopElement(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;

    const role = implicitRole(el);
    const tag = el.tagName.toLowerCase();
    if (!role) return false;

    if (role === "listitem" && hasOnlyInteractiveListItemContent(el)) {
      return false;
    }

    if (role === "listitem" && hasStructuredListItemContent(el)) {
      return false;
    }

    if (role === "listitem" && hasSingleSemanticListItemChild(el)) {
      return false;
    }

    if (
      contextRoles.has(role) &&
      !accessibleName(el, role) &&
      !readableText(el) &&
      !hasVisibleInteractiveDescendant(el) &&
      !(role === "list" && announcedListChildren(el).length)
    ) {
      return false;
    }

    if (
      role === "paragraph" &&
      (!readableText(el) || hasOnlyLinkContent(el))
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
      !hasStructuredListItemContent(el.closest("li,[role='listitem']"))
    ) {
      return false;
    }

    if (
      role === "group" &&
      !accessibleName(el, role) &&
      !el.matches(interactiveSelector) &&
      !(isCustomElement(el) && hasShadowRootContent(el))
    ) {
      return false;
    }

    return (
      contextRoles.has(role) ||
      [
        "heading",
        "button",
        "link",
        "textbox",
        "searchbox",
        "combobox",
        "checkbox",
        "radio",
        "switch",
        "option",
        "tab",
        "progressbar",
        "listitem",
        "term",
        "paragraph",
        "text",
        "image",
        "dialog",
        "alert",
        "status",
        "separator",
        "row",
        "cell",
        "gridcell",
        "rowheader",
        "columnheader",
        "article",
      ].includes(role) ||
      ["caption", "figcaption"].includes(tag)
    );
  }

  function shouldDescendIntoStop(el: any): boolean {
    const role = implicitRole(el);
    if (role === "group" && isFocusableImageListItem(el)) {
      return false;
    }
    if (role === "listbox" && singleSelectedListboxOption(el)) {
      return false;
    }
    if (contextRoles.has(role)) return true;
    if (role === "heading") {
      return false;
    }
    if (role === "listitem") {
      return (
        hasOnlyInteractiveListItemContent(el) ||
        hasStructuredListItemContent(el) ||
        hasSingleSemanticListItemChild(el) ||
        Boolean(el.querySelector("ul, ol, dl, [role='list']"))
      );
    }
    if (role === "paragraph") {
      return (
        !hasInlineInteractiveEmbeddedInText(el) &&
        Boolean(el.querySelector(interactiveSelector))
      );
    }
    return false;
  }

  function walkChildren(el: any): any[] {
    if (el.shadowRoot) return Array.from(el.shadowRoot.children);
    const template = Array.from(el.children).find(
      (child: any) =>
        child.tagName?.toLowerCase() === "template" &&
        child.getAttribute("shadowrootmode"),
    );
    if (template) return Array.from(template.content?.children || []);
    return Array.from(el.children);
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

    const label = normalize(descriptor.name || descriptor.text);
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

  function splitCompactResultCountAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    if (!["text", "paragraph"].includes(descriptor.role || "")) return undefined;
    const label = normalize(descriptor.name || descriptor.text);
    const match = label?.match(/^(\d+)(results?)$/i);
    if (!match) return undefined;
    return [match[1], match[2]];
  }

  function scanSubtree(root: any): ScanLogEntry[] {
    const log: ScanLogEntry[] = [];
    let stopIndex = 0;

    function walk(el: any): void {
      if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return;
      if (isInsideCollapsedPopup(el)) return;
      if (isSeparatorListItem(el)) return;

      if (isStopElement(el)) {
        const id = `__sr_el_${stopIndex}_${now()}`;
        stopIndex += 1;
        el.setAttribute("data-sr-id", id);

        const descriptor = captureElement(el);
        if (descriptor) {
          const announcements =
            splitDescribedAutocompleteAnnouncements(descriptor) ||
            splitFooterCountrySelectorAnnouncements(descriptor) ||
            splitLabelStopAnnouncements(descriptor) ||
            splitCompactResultCountAnnouncements(descriptor) ||
            [generateAnnouncement(descriptor)];
          for (const announcement of announcements) {
            if (!announcement) continue;
            const rect = el.getBoundingClientRect();
            log.push({
              index: log.length,
              srId: id,
              announcement,
              role: descriptor.role,
              name: descriptor.name,
              boundingBox: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
            });
          }
        }

        if (shouldDescendIntoStop(el)) {
          for (const child of walkChildren(el)) walk(child);
        }

        if (descriptor) {
          const endAnnouncement = getContextEndAnnouncement(descriptor);
          if (endAnnouncement) {
            log.push({
              index: log.length,
              srId: id,
              announcement: endAnnouncement,
              role: descriptor.role,
              name: descriptor.name,
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
