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

  function assignedSlotChildren(slot: any): any[] {
    if (slot?.tagName?.toLowerCase() !== "slot") return [];
    const assignedElements =
      typeof slot.assignedElements === "function"
        ? slot.assignedElements({ flatten: true })
        : [];
    if (assignedElements.length) return assignedElements;

    const host = shadowContentHostByNode.get(slot);
    if (!host) return [];
    const slotName = slot.getAttribute("name") || "";
    return Array.from(host.children || []).filter((child: any) => {
      if (child.tagName?.toLowerCase() === "template" && child.getAttribute("shadowrootmode")) {
        return false;
      }
      return (child.getAttribute("slot") || "") === slotName;
    });
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
      for (const child of shadowContentChildren(node)) {
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

  function embeddedControlContentName(el: any): string | undefined {
    if (!nestedImageLabels(el).length && !linkSharesListWithImageCardLinks(el)) {
      return readableText(el);
    }
    const fragments = embeddedControlLabelFragments(el);
    return fragments.length ? normalize(fragments.join(" ")) : readableText(el);
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
    return embeddedControlContentName(el);
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
    return embeddedControlContentName(el);
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

  function isFocusableCustomTooltipTrigger(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;
    if (!el.hasAttribute("tabindex") || el.getAttribute("tabindex") === "-1") return false;
    if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector)) return false;
    if (!directOwnText(el)) return false;

    const host = closestCustomElement(el);
    if (!host) return false;
    return /tooltip/i.test(host.tagName.toLowerCase());
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
      if (!textBeforeButton || !/[.!?]$/.test(textBeforeButton)) continue;
      const fullText = normalize(readableText(current));
      if (fullText.endsWith(label)) return true;
    }

    return false;
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

    if (
      el.querySelector("ul, ol, nav, [role='navigation']") ||
      el.querySelectorAll("a[href], [role='link']").length >= 3
    ) {
      return true;
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
      const compactLabel = compactInputActionGroupLabel(el);
      if (compactLabel) return compactLabel;
      if (isFocusableImageListItem(el)) return nestedImageLabel(el);
      if (isFocusableStructuredListItemGroup(el)) {
        return focusableStructuredListItemName(el);
      }
      return normalize(el.getAttribute("title"));
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
    if (isFocusableStructuredListItemGroup(el)) return "group";
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
    if (tag === "th") {
      const scope = (el.getAttribute("scope") || "").toLowerCase();
      if (scope === "row" || scope === "rowgroup") return "rowheader";
      if (scope === "col" || scope === "colgroup") return "columnheader";
      if (el.closest("tbody, tfoot")) return "rowheader";
      return "columnheader";
    }
    if (tag === "td") return "cell";
    if (tag === "img") return "image";
    if (tag === "svg") return "image";
    if (tag === "dialog") return "dialog";
    if (tag === "fieldset" && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))) {
      return "group";
    }
    if (tag === "blockquote") return el.closest("figure") ? "blockquote" : "paragraph";
    if (
      tag === "p" ||
      tag === "figcaption" ||
      tag === "time" ||
      isRichProductCardOfferBanner(el) ||
      isStructuredListBodyText(el) ||
      isInteractiveListBodyText(el)
    ) {
      return "paragraph";
    }
    if (joinedPriceDisclosureText(el)) return "text";
    if (groupedMetricCardText(el)) return "text";
    if (expandedRegionInlineLinkFragments(el)) return "paragraph";
    if (
      ["section", "div", "form"].includes(tag) &&
      (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
    ) {
      return tag === "section" ? "region" : "group";
    }
    if (compactInputActionGroupLabel(el)) return "group";
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
        isRichProductCardTextFragment(el) ||
        hasImageLinkWithCaptionListItemContent(el.closest("li,[role='listitem']")) ||
        !el.closest("p, li, h1, h2, h3, h4, h5, h6"))
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
      return Array.from(list.children).filter((child: any) => {
        const childTag = child.tagName.toLowerCase();
        return !isHidden(child) && (childTag === "dt" || childTag === "dd");
      });
    }

    const children = walkChildren(list);
    const hasNativeItems = children.some((child: any) => isListItem(child));
    return children.filter(
      (child: any) =>
        isListItem(child) ||
        (hasNativeItems && isDirectInvalidListContentItem(list, child)),
    );
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

    if (role === "text" && isFirstRichProductCardTextFragment(el)) {
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

    if (role === "link" && isGenericDealCtaLink(el)) {
      return undefined;
    }

    if (
      role === "button" &&
      hasRichProductCardListItemContent(el.closest("li,[role='listitem']"))
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

    if (role === "paragraph" && isFirstRichProductCardParagraph(el)) {
      const { listItem, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? index + 1 : undefined;
    }

    if (role === "paragraph" && isRichProductCardOfferBanner(el)) {
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

    if (role === "list") {
      const flattenedSize = flattenedSlottedCarouselSetSize(el);
      return flattenedSize ?? (announcedListChildren(el).length || undefined);
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
    if (role === "link" && isGenericDealCtaLink(el)) {
      return undefined;
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
    if (role === "paragraph" && isFirstRichProductCardParagraph(el)) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    if (role === "paragraph" && isRichProductCardOfferBanner(el)) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    if (role === "text" && isFirstRichProductCardTextFragment(el)) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    if (
      role === "button" &&
      hasRichProductCardListItemContent(el.closest("li,[role='listitem']"))
    ) {
      return undefined;
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

  function isDirectInvalidListContentItem(list: any, child: any): boolean {
    if (!list || !child || child.parentElement !== list || isHidden(child)) return false;
    if (!["ul", "ol"].includes(list.tagName?.toLowerCase())) return false;
    if (isListItem(child) || child.matches?.("script, style, template")) return false;
    if (child.getAttribute?.("role") === "none" || child.getAttribute?.("role") === "presentation") {
      return false;
    }
    return Boolean(readableText(child));
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
    if (!standaloneContentCardHeading(el, 3)) {
      return false;
    }

    const ctas = Array.from(
      el.querySelectorAll("a[href], button, [role='link'], [role='button']"),
    ).filter((cta: any) => !isHidden(cta) && Boolean(accessibleName(cta, implicitRole(cta))));
    if (ctas.length !== 1) return false;

    return Array.from(el.querySelectorAll("p, span, div")).some((candidate: any) =>
      standaloneCardBodyTextElement(candidate),
    );
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

  function isLeadingStandaloneCardGroupStop(el: any, role: string): boolean {
    if (!["heading", "paragraph", "text"].includes(role)) return false;
    const card = standaloneContentCardFor(el);
    if (!card) return false;
    return isFirstReadableStopWithin(card, el);
  }

  function isPostHeadingMediaCardGroupStop(el: any, role: string): boolean {
    if (!["paragraph", "text"].includes(role)) return false;
    return Boolean(h2CardWithDecorativeMediaBeforeBodyFor(el));
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

    if (emphasisElements.length === 1 && normalizedFragments.length === 2) {
      normalizedFragments[1] = `• ${normalizedFragments[1]}`;
    }

    return normalizedFragments;
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

  function isAnonymousStructuralCustomElementGroup(el: any): boolean {
    if (!isCustomElement(el)) return false;
    if (!hasShadowRootContent(el)) return false;
    if (accessibleName(el, "group")) return false;
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

    return isLwcLikeCustomElement(el);
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

    if (!row || !cell) {
      return {
        tableRole: implicitRole(table),
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
    const columnHeader = columnIndex >= 0 ? headerCells[columnIndex] : null;
    const tableHasComplexColumnHeaders = headerCells.some((header: any) =>
      isComplexColumnHeaderContext(header),
    );
    const columnHeaderFragments =
      role !== "columnheader" && columnHeader
        ? complexColumnHeaderContextFragments(columnHeader)
        : [];
    const complexColumnHeaderContextText =
      columnHeaderFragments.length >= 3
        ? formatConjunctiveList(columnHeaderFragments, { oxfordComma: false })
        : undefined;
    const cellRole = implicitRole(cell);
    const columnHeaderText =
      role !== "columnheader" && cellRole !== "columnheader" && columnHeader
        ? complexColumnHeaderContextText ||
          accessibleName(columnHeader, "columnheader")
        : undefined;
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

    return {
      tableRole: implicitRole(table),
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
      columnHeaderText,
      complexColumnHeaderContextText,
      tableGroupHeaderText,
      tableGroupedHeaderRow,
      tableFirstGroupedHeaderRow,
      tableHasComplexColumnHeaders,
    };
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
      return lineBreakFragments(visibleChildren[0]);
    }

    const hasLineBreak = Array.from(el.childNodes).some(
      (child: any) =>
        child.nodeType === Node.ELEMENT_NODE &&
        child.tagName?.toLowerCase() === "br",
    );
    if (hasLineBreak) {
      return lineBreakFragments(el);
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

  function descendantLinkCardHeadingLevel(el: any): number | undefined {
    const heading = Array.from(
      el?.querySelectorAll?.("h1, h2, h3, h4, h5, h6, [role='heading']") || [],
    ).find((candidate: any) => !isHidden(candidate) && Boolean(readableText(candidate)));
    if (!heading) return undefined;
    const tag = heading.tagName?.toLowerCase() || "";
    const level = Number.parseInt(heading.getAttribute("aria-level") || tag.slice(1), 10) || 2;
    return level >= 3 ? level : undefined;
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
      "fieldset[aria-label], [role='radiogroup'][aria-label], .slds-radio_button-group",
    );
    if (!group) return false;
    const radios = Array.from(group.querySelectorAll("[role='radio'], input[type='radio']")).filter(
      (radio: any) => !isHidden(radio),
    );
    return radios.length > 1;
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
    const control =
      role === "combobox" && tag !== "input" && tag !== "select"
        ? el.querySelector("input, select, textarea, [role='textbox'], [role='searchbox']")
        : null;
    const stateEl = control || el;
    const name = accessibleName(el, role);
    const rawText = readableText(el);
    const text =
      role === "group" && isCustomElement(el) && hasShadowRootContent(el)
        ? undefined
        : rawText;
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
        (el.hasAttribute("aria-label") && !rawText));
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
          : role === "alert" && isEmptyAlertBeforeDialog(el)
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
              : inferredSldsRadioChecked(el) ?? Boolean(el.checked)
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
      linkHeadingLevel: role === "link" ? descendantLinkCardHeadingLevel(el) : undefined,
      headingFragments: directHeadingFragments(el),
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
        (role === "button" && isTextWithTrailingIconButton(el)) ||
        (role === "button" &&
          !suppressPositionedChoiceGroup &&
          isIconFirstTextButton(el)) ||
        (role === "text" && isFocusableCustomTooltipTrigger(el)) ||
        undefined,
      groupedCollectionPosition:
        role === "button" &&
          hasOnlyInteractiveListItemContent(semanticListContext(el).listItem) ||
        role === "group" && isFocusableStructuredListItemGroup(el) ||
        undefined,
      parenthesizedCollectionPosition:
        role === "group" &&
          (isFocusableStructuredListItemGroup(el) || isFocusableImageListItem(el)) ||
        undefined,
      duplicateCollectionPosition:
        role === "heading" &&
          Boolean(flattenedSlottedCarouselPosition(el).positionInSet) ||
        undefined,
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
      compactInputActionGroup:
        role === "group" && compactInputActionGroupLabel(el) ? true : undefined,
      leadingCarouselGroup: isLeadingCarouselGroupStop(el, role) || undefined,
      trailingCarouselSlideGroups:
        isTrailingCarouselSlideGroupStop(el, role) || undefined,
      leadingStandaloneCardGroup:
        isPostHeadingMediaCardGroupStop(el, role) || undefined,
      splitLabelStop:
        (["searchbox", "textbox"].includes(role) &&
          tag === "input" &&
          Boolean(
            name?.endsWith(":") ||
              (name && stateEl.getAttribute("aria-invalid") === "true" &&
                normalize(stateEl.getAttribute("placeholder")) === name),
          )) ||
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
      expandedRegionInlineLinkFragments:
        role === "paragraph" ? expandedRegionInlineLinkFragments(el) : undefined,
      suppressContextEnd:
        (role === "group" && Boolean(compactInputActionGroupLabel(el))) ||
        (role === "group" && isFocusableImageListItem(el)) ||
        (role === "group" && isFocusableStructuredListItemGroup(el)) ||
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

    if (role === "listitem") {
      descriptor.name = textWithoutInteractive(el);
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

  function isStopElement(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return false;

    const role = implicitRole(el);
    const tag = el.tagName.toLowerCase();
    if (!role) return false;

    if (isDecorativeEmojiText(el, role)) {
      return false;
    }

    if (isInsideJoinedPriceDisclosure(el)) {
      return false;
    }

    if (isInsideGroupedMetricCard(el)) {
      return false;
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

    if (role === "listitem" && hasSingleSemanticListItemChild(el)) {
      return false;
    }

    if (
      contextRoles.has(role) &&
      !isUnnamedCarouselRegion(el) &&
      !accessibleName(el, role) &&
      !readableText(el) &&
      !hasVisibleInteractiveDescendant(el) &&
      !(role === "list" && announcedListChildren(el).length)
    ) {
      return false;
    }

    if (isUnnamedCarouselRegion(el)) {
      return false;
    }

    if (role === "group" && isFlattenedSlottedCarouselGroupWrapper(el)) {
      return false;
    }

    if (role === "group" && isUnnamedCarouselNavigationButtonWrapper(el)) {
      return false;
    }

    if (role === "group" && isAnonymousStructuralCustomElementGroup(el)) {
      return false;
    }

    if (role === "row" && el.closest("table")) {
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
      (!readableText(el) || hasOnlyLinkContent(el))
    ) {
      return false;
    }

    if (role === "paragraph" && isConsumedAdjacentParagraphValue(el)) {
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
        "blockquote",
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
    if (role === "group" && isFocusableStructuredListItemGroup(el)) {
      return false;
    }
    if (role === "listbox" && singleSelectedListboxOption(el)) {
      return false;
    }
    if (contextRoles.has(role)) return true;
    if (role === "columnheader" && isComplexColumnHeaderContext(el)) {
      return true;
    }
    if (role === "heading") {
      return false;
    }
    if (role === "listitem") {
      return (
        hasOnlyInteractiveListItemContent(el) ||
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
    if (descriptor.trailingCarouselSlideGroups) {
      return [announcement, "group", "group"].filter(
        (entry): entry is string => Boolean(entry),
      );
    }
    return undefined;
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
    const context = formatConjunctiveList(fragments, { oxfordComma: false });
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

  function splitExpandedRegionInlineLinkAnnouncements(
    descriptor: CapturedElementDescriptor,
  ): string[] | undefined {
    const fragments = descriptor.expandedRegionInlineLinkFragments;
    if (descriptor.role !== "paragraph" || !fragments?.length) {
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

  function scanSubtree(root: any): ScanLogEntry[] {
    const log: ScanLogEntry[] = [];
    let stopIndex = 0;

    function walk(el: any): void {
      if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return;
      if (isInsideCollapsedPopup(el)) return;
      if (isSeparatorListItem(el)) return;
      if (isInsideControlledTableGroupBody(el)) return;

      if (isStopElement(el)) {
        const id = `__sr_el_${stopIndex}_${now()}`;
        stopIndex += 1;
        el.setAttribute("data-sr-id", id);

        const descriptor = captureElement(el);
        if (descriptor) {
          const announcements =
            splitDescribedAutocompleteAnnouncements(descriptor) ||
            splitFooterCountrySelectorAnnouncements(descriptor) ||
            splitCompactInputActionGroupAnnouncements(descriptor) ||
            splitPrecedingControlLabelAnnouncements(descriptor) ||
            splitCarouselGroupAnnouncements(descriptor) ||
            splitLabelStopAnnouncements(descriptor) ||
            splitCompactResultCountAnnouncements(descriptor) ||
            splitComplexColumnHeaderAnnouncements(descriptor) ||
            splitComplexColumnHeaderContextCellAnnouncements(descriptor) ||
            splitComplexColumnHeaderTextAnnouncements(descriptor) ||
            splitRichProductCardFeatureHeadingAnnouncements(descriptor) ||
            splitRichProductCardFeatureRowAnnouncements(descriptor) ||
            splitExpandedRegionInlineLinkAnnouncements(descriptor) ||
            splitInlineEmphasisTextAnnouncements(descriptor) ||
            splitInlineEmphasisListItemAnnouncements(descriptor) ||
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
