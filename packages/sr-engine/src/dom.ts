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

  function getReadableText(el: any): string | undefined {
    if (!el) return undefined;

    function needsTextBoundary(left: string, right: string): boolean {
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

      if (/[\p{N}]/u.test(leftChar) && /^pp\b/i.test(right)) {
        return false;
      }

      return /[\p{L}\p{N}%]/u.test(leftChar) && /[\p{L}\p{N}]/u.test(rightChar);
    }

    function collectReadableText(node: any): string {
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

  function getReadableTextIgnoringAriaHidden(el: any): string | undefined {
    if (!el) {
      return undefined;
    }

    const clone = el.cloneNode(true);
    for (const hiddenNode of Array.from(
      clone.querySelectorAll("[aria-hidden='true']"),
    )) {
      hiddenNode.remove();
    }

    return getReadableText(clone);
  }

  function isParagraphOnlyLinkText(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    if (el.tagName.toLowerCase() !== "p") {
      return false;
    }

    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
      return false;
    }

    const links = Array.from(el.querySelectorAll("a[href]")).filter(
      (link: any) =>
        link.getAttribute("aria-hidden") !== "true" &&
        !link.closest("[aria-hidden='true']"),
    );

    if (!links.length) {
      return false;
    }

    const paragraphText = getReadableTextIgnoringAriaHidden(el);
    const linkText = links
      .map((link: any) => getReadableTextIgnoringAriaHidden(link) || "")
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return Boolean(paragraphText && linkText && paragraphText === linkText);
  }

  function getStandaloneLabelText(el: any): string | undefined {
    if (!el || el.tagName?.toLowerCase() !== "label") {
      return undefined;
    }

    const parts: string[] = [];
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

      const childEl = child as any;
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

  function hasStandaloneLabelStop(el: any): boolean {
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

  function isStructuredTableStop(el: any): boolean {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || "";
    if (!(tag === "table" || role === "table" || role === "grid")) {
      return false;
    }

    return el.querySelectorAll("tr,[role='row']").length > 1;
  }

  function getFocusableTableGroupLabel(el: any): string | undefined {
    if (!el || el.tabIndex < 0) {
      return undefined;
    }

    const tables = Array.from(
      el.querySelectorAll(
        ":scope > table, :scope > [role='table'], :scope > [role='grid']",
      ),
    ).filter(
      (child: any) =>
        child.getAttribute("aria-hidden") !== "true" &&
        isStructuredTableStop(child),
    );

    if (tables.length !== 1) {
      return undefined;
    }

    const nonTableContent = Array.from(el.children).filter(
      (child: any) => child !== tables[0] && getReadableText(child),
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

  function getScanRoot(el: any): any {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const codeBlock = el.closest("pre, code");
    const pre =
      codeBlock?.tagName.toLowerCase() === "pre"
        ? codeBlock
        : codeBlock?.closest("pre");

    if (!pre) {
      return el;
    }

    let current = pre.parentElement;
    while (
      current &&
      current !== document.body &&
      current !== document.documentElement
    ) {
      const relatedInteractiveDescendant = Array.from(
        current.querySelectorAll(
          "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], clipboard-copy",
        ),
      ).find(
        (node: any) =>
          !pre.contains(node) &&
          node.getAttribute("aria-hidden") !== "true" &&
          !node.closest("[aria-hidden='true']"),
      );

      if (relatedInteractiveDescendant) {
        return current;
      }

      current = current.parentElement;
    }

    return pre;
  }

  function captureElement(el: any): CapturedElementDescriptor | null {
    if (!el || el === document.body || el === document.documentElement) {
      return null;
    }
    const tag = el.tagName.toLowerCase();
    const rect = el.getBoundingClientRect();
    const closestTable = el.closest("table,[role='table'],[role='grid']");

    function parsePositiveInt(
      value: string | null | undefined,
    ): number | undefined {
      if (!value) return undefined;
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    }

    function getElementText(node: any): string | undefined {
      return getReadableText(node);
    }

    function getAccessibleText(node: any): string | undefined {
      if (!node) {
        return undefined;
      }

      const clone = node.cloneNode(true);
      for (const hiddenNode of Array.from(
        clone.querySelectorAll("[aria-hidden='true']"),
      )) {
        hiddenNode.remove();
      }

      return getReadableText(clone);
    }

    function getElementAccessibleName(node: any): string | undefined {
      if (!node) {
        return undefined;
      }

      const nodeAriaLabel = node.getAttribute("aria-label");
      if (nodeAriaLabel) {
        return nodeAriaLabel;
      }

      const nodeAriaLabelledBy = node.getAttribute("aria-labelledby");
      if (nodeAriaLabelledBy) {
        const text = nodeAriaLabelledBy
          .split(/\s+/)
          .map((id: string) => {
            const ref = resolveIdRef(id);
            return ref ? getAccessibleText(ref) || "" : "";
          })
          .filter(Boolean)
          .join(" ");

        if (text) {
          return text;
        }
      }

      return getAccessibleText(node);
    }

    function getFormLabelText(labelEl: any): string | undefined {
      if (!labelEl) {
        return undefined;
      }

      const clone = labelEl.cloneNode(true);
      for (const node of Array.from(
        clone.querySelectorAll(
          "input, select, textarea, button, a[href], [role='button'], [role='link'], [aria-hidden='true']",
        ),
      )) {
        node.remove();
      }

      return getReadableText(clone);
    }

    function getNestedImageLabel(node: any): string | undefined {
      if (!node) {
        return undefined;
      }

      const candidates = [
        ...node.querySelectorAll(
          "img[alt], [role='img'][aria-label], svg[aria-label]",
        ),
      ];

      for (const candidate of candidates) {
        const candidateTag = candidate.tagName.toLowerCase();
        const label =
          candidate.getAttribute("aria-label") ||
          (candidateTag === "img" ? candidate.getAttribute("alt") : "") ||
          candidate.getAttribute("title");
        const normalized = label?.replace(/\s+/g, " ").trim();
        if (normalized) {
          return normalized;
        }
      }

      return undefined;
    }

    function getAwardsImageStripLinkLabel(node: any): string | undefined {
      if (
        !node ||
        node.tagName?.toLowerCase() !== "a" ||
        !node.hasAttribute("href") ||
        node.getAttribute("aria-label") !== ""
      ) {
        return undefined;
      }

      const list = node.querySelector("ul,ol");
      if (!list) {
        return undefined;
      }

      const urlText = Array.from(node.childNodes)
        .filter((child: any) => child.nodeType === Node.ELEMENT_NODE)
        .map((child: any) => {
          const childTag = child.tagName.toLowerCase();
          return childTag === "ul" || childTag === "ol"
            ? ""
            : getAccessibleText(child) || "";
        })
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (!urlText) {
        return undefined;
      }

      const imageLabels = Array.from(list.querySelectorAll("li img[alt]"))
        .slice(0, 2)
        .map((image: any, index) => {
          const alt = image.getAttribute("alt")?.replace(/\s+/g, " ").trim();
          if (index === 1) {
            return alt?.replace(/\s+Recommended$/i, "");
          }
          return alt;
        })
        .filter(Boolean);

      if (!imageLabels.length) {
        return undefined;
      }

      return [urlText, ...imageLabels].join(" ");
    }

    let role = el.getAttribute("role") || "";

    function isIconOnlyLink(): boolean {
      if (role !== "link") {
        return false;
      }

      const directText = Array.from(el.childNodes)
        .filter((child: any) => child.nodeType === Node.TEXT_NODE)
        .map(
          (child: any) => child.textContent?.replace(/\s+/g, " ").trim() || "",
        )
        .join(" ")
        .trim();

      if (directText) {
        return false;
      }

      const clone = el.cloneNode(true);
      for (const node of Array.from(
        clone.querySelectorAll("img, svg, [role='img'], [aria-hidden='true']"),
      )) {
        node.remove();
      }

      return (
        !getReadableText(clone) &&
        Boolean(
          getNestedImageLabel(el) ||
            (el.getAttribute("aria-label") &&
              !isDecorativeGraphicOnlyLabelledLink()),
        )
      );
    }

    function isDecorativeGraphicOnlyLabelledLink(): boolean {
      if (role !== "link" || !el.getAttribute("aria-label")) {
        return false;
      }

      if (getNestedImageLabel(el)) {
        return false;
      }

      const hasDecorativeGraphic = Boolean(
        el.querySelector(
          "svg[aria-hidden='true'], img[aria-hidden='true'], [role='img'][aria-hidden='true']",
        ),
      );
      if (!hasDecorativeGraphic) {
        return false;
      }

      const clone = el.cloneNode(true);
      for (const node of Array.from(
        clone.querySelectorAll("img, svg, [role='img'], [aria-hidden='true']"),
      )) {
        node.remove();
      }

      return !getReadableText(clone);
    }

    function getPriceGuideHeadingFragments(): string[] | undefined {
      if (!/^h[1-6]$/.test(tag)) {
        return undefined;
      }

      const text = getReadableText(el)?.replace(/\s+/g, " ").trim();
      const match = text?.match(/^(£[\d,.]+(?:\.\d{2})?)\s+(Guide price)$/);
      if (!match) {
        return undefined;
      }

      return [match[1], "space", match[2]];
    }

    function getSemanticListContext(node: any) {
      let listItem = node?.nodeType === Node.ELEMENT_NODE ? node : null;

      while (listItem && !isSemanticListItemElement(listItem)) {
        listItem = listItem.parentElement;
      }

      if (!listItem) {
        return {
          listItem: null,
          list: null,
          siblings: [] as any[],
          usesExplicitRoleListItem: false,
        };
      }

      const list = listItem.parentElement;
      const siblings = list
        ? Array.from(list.children).filter((child: any) =>
            isSemanticListItemElement(child),
          )
        : [];

      return {
        listItem,
        list,
        siblings,
        usesExplicitRoleListItem: listItem.tagName.toLowerCase() !== "li",
      };
    }

    function getCollectionPosition(): number | undefined {
      if (role === "paragraph") {
        const { listItem, list, siblings, usesExplicitRoleListItem } =
          getSemanticListContext(el);
        if (
          listItem &&
          list &&
          !usesExplicitRoleListItem &&
          !listItem.querySelector(
            "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']",
          )
        ) {
          const leadParagraph = Array.from(
            listItem.querySelectorAll("p, blockquote"),
          ).find((child: any) => getReadableText(child));
          if (leadParagraph === el) {
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : undefined;
          }
        }
      }

      if (role === "term") {
        const definitionList =
          el.parentElement?.tagName.toLowerCase() === "dl"
            ? el.parentElement
            : null;
        if (definitionList) {
          const siblings = Array.from(definitionList.children).filter(
            (child: any) => child.tagName.toLowerCase() === "dt",
          );
          const index = siblings.indexOf(el);
          return index >= 0 ? index + 1 : undefined;
        }
      }

      if (role === "listitem" || role === "group") {
        const { listItem, siblings, usesExplicitRoleListItem } =
          getSemanticListContext(el);
        if (role === "group" && usesExplicitRoleListItem) {
          return undefined;
        }
        const index = siblings.indexOf(listItem);
        return index >= 0 ? index + 1 : undefined;
      }

      if (role === "listbox" && tag === "select") {
        return el.selectedIndex >= 0 ? el.selectedIndex + 1 : undefined;
      }

      if (role === "tab") {
        const tablist = el.closest("[role='tablist']");
        const siblings = Array.from(
          tablist?.querySelectorAll("[role='tab']") || [],
        );
        const index = siblings.indexOf(el);
        return index >= 0 ? index + 1 : undefined;
      }

      if (role === "progressbar") {
        const siblings = Array.from(el.parentElement?.children || []).filter(
          (child: any) => child.getAttribute("role") === "progressbar",
        );
        const index = siblings.indexOf(el);
        return index >= 0 ? index + 1 : undefined;
      }

      if (role === "link") {
        const railCardPosition = getImageCardRailPosition();
        if (railCardPosition) {
          return railCardPosition.position;
        }

        const directListItem =
          el.parentElement?.tagName.toLowerCase() === "li"
            ? el.parentElement
            : null;
        const directList = directListItem?.parentElement;
        if (directListItem && directList) {
          const siblings = Array.from(directList.children).filter(
            (child: any) => child.tagName.toLowerCase() === "li",
          );
          const index = siblings.indexOf(directListItem);
          return index >= 0 ? index + 1 : undefined;
        }
      }

      if (role === "heading" && (headingButton || headingLink)) {
        const listItem = el.closest("li");
        const list = listItem?.parentElement;
        if (listItem && list) {
          const siblings = Array.from(list.children).filter(
            (child: any) => child.tagName.toLowerCase() === "li",
          );
          const index = siblings.indexOf(listItem);
          return index >= 0 ? index + 1 : undefined;
        }
      }

      if (role === "option") {
        const siblings = Array.from(el.parentElement?.children || []).filter(
          (child: any) => (child.getAttribute("role") || "") === "option",
        );
        const index = siblings.indexOf(el);
        return index >= 0 ? index + 1 : undefined;
      }

      if (role === "button" && isStandaloneListItemButton()) {
        const listItem = el.closest("li");
        const list = listItem?.parentElement;
        if (listItem && list) {
          const siblings = Array.from(list.children).filter(
            (child: any) => child.tagName.toLowerCase() === "li",
          );
          const index = siblings.indexOf(listItem);
          return index >= 0 ? index + 1 : undefined;
        }
      }

      if (role === "button") {
        const definitionList = el.closest("dl");
        const definitionDescription = el.closest("dd");
        if (definitionList && definitionDescription) {
          const siblings = Array.from(definitionList.children).filter(
            (child: any) => {
              if (!["dt", "dd"].includes(child.tagName.toLowerCase())) {
                return false;
              }

              const style = getComputedStyle(child);
              return style.display !== "none" && style.visibility !== "hidden";
            },
          );
          const index = siblings.indexOf(definitionDescription);
          return index >= 0 ? index + 1 : undefined;
        }
      }

      if (role === "image" && tag === "img") {
        const { listItem, list, siblings, usesExplicitRoleListItem } =
          getSemanticListContext(el);
        if (listItem && list && !usesExplicitRoleListItem) {
          const index = siblings.indexOf(listItem);
          return index >= 0 ? index + 1 : undefined;
        }
      }

      return undefined;
    }

    function getTextExcludingInteractiveContent(): string | undefined {
      const clone = el.cloneNode(true);
      for (const node of Array.from(
        clone.querySelectorAll(
          "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']",
        ),
      )) {
        node.remove();
      }

      for (const node of Array.from(
        clone.querySelectorAll("[aria-hidden='true']"),
      )) {
        node.remove();
      }

      function collectText(node: any): string[] {
        if (!node) {
          return [];
        }

        if (node.nodeType === Node.TEXT_NODE) {
          const value = node.textContent?.replace(/\s+/g, " ").trim();
          return value ? [value] : [];
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
          return [];
        }

        if (node.getAttribute("aria-hidden") === "true") {
          return [];
        }

        const parts: string[] = [];
        for (const child of Array.from(node.childNodes)) {
          parts.push(...collectText(child));
        }
        return parts;
      }

      const text = collectText(clone).join(" ").replace(/\s+/g, " ").trim();
      return text || undefined;
    }

    function isStandaloneListItemButton(): boolean {
      if (role !== "button") {
        return false;
      }

      const listItem = el.closest("li");
      if (!listItem) {
        return false;
      }

      const interactiveDescendants = Array.from(
        listItem.querySelectorAll(
          "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']",
        ),
      ).filter(
        (node: any) =>
          node.getAttribute("aria-hidden") !== "true" &&
          !node.closest("[aria-hidden='true']"),
      );

      if (
        interactiveDescendants.length !== 1 ||
        interactiveDescendants[0] !== el
      ) {
        return false;
      }

      const clone = listItem.cloneNode(true);
      for (const node of Array.from(
        clone.querySelectorAll(
          "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], [aria-hidden='true']",
        ),
      )) {
        node.remove();
      }

      return !getReadableText(clone);
    }

    function getImageCardRailPosition():
      | { position: number; size: number }
      | undefined {
      if (role !== "link") {
        return undefined;
      }

      if (!isImageCardRailListItem(el.closest("li"))) {
        return undefined;
      }

      const listItem = el.closest("li");
      const list = listItem?.parentElement;
      if (!list) {
        return undefined;
      }

      const siblings = Array.from(list.children).filter((child: any) =>
        isSemanticListItemElement(child),
      );
      const index = siblings.indexOf(listItem);
      if (index < 0) {
        return undefined;
      }

      return {
        position: index + 2,
        size: siblings.length + 2,
      };
    }

    function hasInteractiveDescendants(): boolean {
      return Boolean(
        el.querySelector(
          "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']",
        ),
      );
    }

    function getHeadingButton(): any {
      if (!/^h[1-6]$/.test(tag)) {
        return null;
      }

      const buttons = Array.from(
        el.querySelectorAll(
          ":scope > button, :scope > [role='button'], :scope button, :scope [role='button']",
        ),
      );

      return buttons.length === 1 ? buttons[0] : null;
    }

    function getHeadingLink(): any {
      if (!/^h[1-6]$/.test(tag)) {
        return null;
      }

      const links = Array.from(el.querySelectorAll(":scope > a[href]"));
      return links.length === 1 ? links[0] : null;
    }

    function hasRawMarkupText(value?: string | null): boolean {
      return /<\/?[a-z][\s\S]*>/i.test(value || "");
    }

    function hasGroupedVisibleLinkBody(node: any): boolean {
      if (!node || node.tagName?.toLowerCase() !== "a") {
        return false;
      }

      return Array.from(node.children).some((child: any) => {
        if ((child.getAttribute("role") || "") !== "group") {
          return false;
        }

        if (
          child.getAttribute("aria-hidden") === "true" ||
          child.closest("[aria-hidden='true']")
        ) {
          return false;
        }

        return Boolean(getReadableText(child));
      });
    }

    function isGroupedLinkBody(): boolean {
      const parentLink = el.parentElement;
      if (
        !parentLink ||
        parentLink.tagName.toLowerCase() !== "a" ||
        !parentLink.hasAttribute("href")
      ) {
        return false;
      }

      return (
        (el.getAttribute("role") || "") === "group" &&
        hasRawMarkupText(parentLink.getAttribute("aria-label")) &&
        hasGroupedVisibleLinkBody(parentLink)
      );
    }

    function getFragmentedHeadingText(): string[] | undefined {
      if (!/^h[1-6]$/.test(tag) || !el.querySelector("br")) {
        return undefined;
      }

      if (
        el.querySelector(
          "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']",
        )
      ) {
        return undefined;
      }

      const fragments: string[] = [];
      let textBuffer = "";

      function pushText(value?: string | null): void {
        const normalized = value?.replace(/\s+/g, " ").trim();
        if (normalized) {
          fragments.push(normalized);
        }
      }

      function flushTextBuffer(): void {
        pushText(textBuffer);
        textBuffer = "";
      }

      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          textBuffer += child.textContent || "";
          continue;
        }

        if (child.nodeType !== Node.ELEMENT_NODE) {
          continue;
        }

        if (child.getAttribute("aria-hidden") === "true") {
          continue;
        }

        const childTag = child.tagName.toLowerCase();
        if (childTag === "br") {
          flushTextBuffer();
          continue;
        }

        flushTextBuffer();
        pushText(getAccessibleText(child));
      }

      flushTextBuffer();

      return fragments.length > 1 ? fragments : undefined;
    }

    function resolveIdRef(id: string | null | undefined): any {
      if (!id) {
        return null;
      }

      const selectors = `#${CSS.escape(id)}`;
      const scopedContainers: any[] = [];
      for (
        let current = el.parentElement;
        current;
        current = current.parentElement
      ) {
        scopedContainers.push(current);
      }

      const prioritizedContainers = [
        el.closest("li"),
        el.closest("dd"),
        el.closest("dl"),
        el.closest("[role='region']"),
        ...scopedContainers,
      ].filter(Boolean);
      const seenContainers = new Set();

      for (const container of prioritizedContainers) {
        if (seenContainers.has(container)) {
          continue;
        }
        seenContainers.add(container);
        const matches = Array.from(container.querySelectorAll(selectors));
        if (matches.length > 0) {
          return matches[0];
        }
      }

      return document.getElementById(id);
    }

    function resolveIdRefs(attributeName: string): string | undefined {
      const value = el.getAttribute(attributeName);
      if (!value) {
        return undefined;
      }

      const text = value
        .split(/\s+/)
        .map((id: string) => {
          const ref = resolveIdRef(id);
          return ref ? getReadableText(ref) || "" : "";
        })
        .filter(Boolean)
        .join(" ");

      return text || undefined;
    }

    function parseInvalidValue(value: string | null | undefined) {
      if (!value || value === "false") {
        return undefined;
      }

      return value === "true" ? true : value;
    }

    function normalizeHasPopup(value: string | null | undefined) {
      if (!value || value === "false") {
        return undefined;
      }

      return value === "true" ? "menu" : value;
    }

    function isAccessibleTableNode(node: any): boolean {
      if (!node) {
        return false;
      }

      if (node.getAttribute("aria-hidden") === "true") {
        return false;
      }

      return !node.closest("[aria-hidden='true']");
    }

    function getRowIndex(row: any): number | undefined {
      if (!row || !closestTable) return undefined;
      const rows = Array.from(
        closestTable.querySelectorAll("tr,[role='row']"),
      ).filter((child: any) => {
        const childRole = child.getAttribute("role");
        const childTag = child.tagName.toLowerCase();
        return (
          (childRole === "row" || childTag === "tr") &&
          isAccessibleTableNode(child)
        );
      });
      const index = rows.indexOf(row);
      return index >= 0 ? index + 1 : undefined;
    }

    function getBodyRowIndex(row: any): number | undefined {
      if (!row) return undefined;
      const rowGroup = row.closest("tbody");
      if (!rowGroup) {
        return undefined;
      }

      const rows = Array.from(
        rowGroup.querySelectorAll(":scope > tr,[role='row']"),
      ).filter((child: any) => isAccessibleTableNode(child));
      const index = rows.indexOf(row);
      return index >= 0 ? index + 1 : undefined;
    }

    function getColumnHeaderText(
      columnNumber: number | undefined,
    ): string | undefined {
      if (!closestTable || !columnNumber) {
        return undefined;
      }

      const headerRow = closestTable.querySelector(
        "thead:not([aria-hidden='true']) tr,[role='row'], tr:not([aria-hidden='true']),[role='row']",
      );
      if (!headerRow) {
        return undefined;
      }

      const headerCells = Array.from(headerRow.children).filter(
        (child: any) => {
          const childRole = child.getAttribute("role") || "";
          const childTag = child.tagName.toLowerCase();
          return (
            childTag === "th" ||
            ["columnheader", "rowheader"].includes(childRole)
          );
        },
      );
      const headerCell = headerCells[columnNumber - 1];
      return headerCell
        ? getAccessibleText(headerCell) || undefined
        : undefined;
    }

    function getColumnIndex(row: any): number | undefined {
      if (!row) return undefined;
      const cells = Array.from(row.children).filter((child: any) => {
        const childRole = child.getAttribute("role") || "";
        const childTag = child.tagName.toLowerCase();
        return (
          childTag === "td" ||
          childTag === "th" ||
          ["cell", "gridcell", "rowheader", "columnheader"].includes(childRole)
        );
      });
      const index = cells.indexOf(el);
      return index >= 0 ? index + 1 : undefined;
    }

    function getTableMetadata() {
      if (!closestTable) {
        return {
          rowCount: undefined,
          columnCount: undefined,
          tableLabel: undefined,
          tableRole: undefined,
        };
      }

      const rows = Array.from(
        closestTable.querySelectorAll("tr,[role='row']"),
      ).filter((row: any) => isAccessibleTableNode(row));
      const firstRow = rows[0];
      const columns = firstRow
        ? firstRow.querySelectorAll(
            "th,td,[role='cell'],[role='gridcell'],[role='columnheader'],[role='rowheader']",
          ).length
        : 0;

      return {
        rowCount: rows.length || undefined,
        columnCount: columns || undefined,
        tableLabel:
          closestTable.getAttribute("aria-label") ||
          getElementText(closestTable.querySelector("caption")) ||
          undefined,
        tableRole:
          closestTable.getAttribute("role") ||
          (closestTable.tagName.toLowerCase() === "table"
            ? "table"
            : undefined),
      };
    }

    const focusableTableGroupLabel = getFocusableTableGroupLabel(el);
    if (role === "img") {
      role = "image";
    }
    if (!role) {
      if (/^h[1-6]$/.test(tag)) role = "heading";
      else if (tag === "button" || (tag === "input" && el.type === "submit"))
        role = "button";
      else if (tag === "a" && el.hasAttribute("href")) role = "link";
      else if (tag === "select") role = "combobox";
      else if (tag === "input") {
        const t = el.type;
        if (t === "checkbox") role = "checkbox";
        else if (t === "radio") role = "radio";
        else if (t === "search") role = "searchbox";
        else role = "textbox";
      } else if (tag === "textarea") role = "textbox";
      else if (tag === "header") role = "banner";
      else if (tag === "nav") role = "navigation";
      else if (tag === "main") role = "main";
      else if (tag === "footer") role = "contentinfo";
      else if (tag === "aside") role = "complementary";
      else if (tag === "dl") role = "list";
      else if (tag === "dt") role = "term";
      else if (
        ["div", "form"].includes(tag) &&
        (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
      )
        role = "group";
      else if (hasImplicitTitledGroupRole(el)) role = "group";
      else if (["div", "section"].includes(tag) && focusableTableGroupLabel)
        role = "group";
      else if (
        tag === "section" &&
        (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
      )
        role = "region";
      else if (el.getAttribute("aria-live") === "assertive") role = "alert";
      else if (el.getAttribute("aria-live") === "polite") role = "status";
      else if (tag === "label" && hasStandaloneLabelStop(el))
        role = "paragraph";
      else if (tag === "p" || tag === "blockquote" || hasStandaloneTextStop(el))
        role = "paragraph";
      else if (tag === "li") {
        const childImage = el.querySelector("img[alt]");
        role = el.tabIndex >= 0 && childImage ? "group" : "listitem";
      } else if (tag === "ul" || tag === "ol") role = "list";
      else if (tag === "table") role = "table";
      else if (tag === "tr") role = "row";
      else if (tag === "th") {
        const scope = el.getAttribute("scope");
        const rowElement = el.closest("tr,[role='row']");
        const headerRowGroup = el.closest("thead,tbody,tfoot");
        const hasDataCellSibling = Boolean(
          rowElement?.querySelector("td,[role='cell'],[role='gridcell']"),
        );
        const hasExplicitHeaderSection = Boolean(
          closestTable?.querySelector("thead"),
        );
        if (scope === "row") {
          role = "rowheader";
        } else if (scope === "col") {
          role = "columnheader";
        } else if (
          headerRowGroup?.tagName.toLowerCase() === "tbody" &&
          (hasDataCellSibling || hasExplicitHeaderSection)
        ) {
          role = "rowheader";
        } else {
          role = "columnheader";
        }
      } else if (tag === "td") role = "cell";
      else if (tag === "img") role = "image";
      else if (tag === "dialog") role = "dialog";
      else role = "";
    }

    let name: string | undefined;
    const ariaLabel = el.getAttribute("aria-label");
    const ariaLabelledBy = el.getAttribute("aria-labelledby");
    if (ariaLabel) {
      name = ariaLabel;
    } else if (ariaLabelledBy) {
      name = ariaLabelledBy
        .split(/\s+/)
        .map((id: string) => {
          const ref = resolveIdRef(id);
          return ref ? getAccessibleText(ref) || "" : "";
        })
        .filter(Boolean)
        .join(" ");
    } else if ("labels" in el && el.labels && el.labels.length) {
      name = getFormLabelText(el.labels[0]) || undefined;
    } else if (tag === "select" || tag === "textarea" || tag === "input") {
      const id = el.getAttribute("id");
      if (id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (lbl) name = getFormLabelText(lbl) || undefined;
      }
    }
    if (!name) {
      name = el.getAttribute("alt") || undefined;
      if (!name && role !== "button") {
        name = el.getAttribute("title") || undefined;
      }
    }
    if (!name && role === "link") {
      name =
        getAwardsImageStripLinkLabel(el) ||
        getNestedImageLabel(el) ||
        el.getAttribute("aria-label") ||
        undefined;
    }
    if (!name && (role === "group" || role === "listitem")) {
      const childImage = el.querySelector("img[alt]");
      if (childImage) {
        name = childImage.getAttribute("alt") || undefined;
      }
    }
    if (!name && role === "paragraph" && tag === "label") {
      name = getStandaloneLabelText(el) || getReadableText(el);
    }
    if (!name && role === "group" && focusableTableGroupLabel) {
      name = focusableTableGroupLabel;
    }

    if (
      !name &&
      [
        "button",
        "link",
        "heading",
        "menuitem",
        "tab",
        "paragraph",
        "listitem",
        "blockquote",
        "cell",
        "gridcell",
        "rowheader",
        "columnheader",
      ].includes(role)
    ) {
      name = getAccessibleText(el)?.slice(0, 200) || undefined;
    }

    if (!name && role === "button") {
      name = el.getAttribute("title") || undefined;
    }

    if (role === "listitem" && hasInteractiveDescendants()) {
      name = getTextExcludingInteractiveContent();
    }

    const text = getReadableText(el);

    const description = el.getAttribute("aria-description") || undefined;
    const details = resolveIdRefs("aria-describedby");
    const errorMessage = resolveIdRefs("aria-errormessage");
    let roleDescription = el.getAttribute("aria-roledescription") || undefined;

    if (role === "list" && tag === "dl") {
      roleDescription = "definition list";
    }

    if (role === "button" && el.hasAttribute("aria-pressed")) {
      roleDescription = "toggle button";
    }

    let value: string | undefined;
    if ("value" in el) {
      const v = el.value;
      if (v) value = v;
    }
    if (role === "combobox" && tag === "select") {
      value = el.options[el.selectedIndex]
        ? el.options[el.selectedIndex].text
        : undefined;
    }
    if (role === "listbox" && tag === "select") {
      value = el.options[el.selectedIndex]
        ? el.options[el.selectedIndex].text
        : undefined;
    }
    let valueText = el.getAttribute("aria-valuetext") || undefined;
    if (role === "progressbar" && !valueText) {
      const valueNow = Number.parseFloat(
        el.getAttribute("aria-valuenow") || "",
      );
      const valueMin = Number.parseFloat(
        el.getAttribute("aria-valuemin") || "0",
      );
      const valueMax = Number.parseFloat(
        el.getAttribute("aria-valuemax") || "100",
      );
      if (
        Number.isFinite(valueNow) &&
        Number.isFinite(valueMin) &&
        Number.isFinite(valueMax) &&
        valueMax > valueMin
      ) {
        const percent = Math.round(
          ((valueNow - valueMin) / (valueMax - valueMin)) * 100,
        );
        valueText = `${percent}%`;
      }
    }

    let level: number | undefined;
    if (/^h[1-6]$/.test(tag)) level = parseInt(tag[1], 10);
    const ariaLevel = el.getAttribute("aria-level");
    if (ariaLevel) level = parseInt(ariaLevel, 10);

    const headingButton = getHeadingButton();
    const headingLink = getHeadingLink();
    const headingFragments =
      role === "heading" && !headingButton && !headingLink
        ? getFragmentedHeadingText() || getPriceGuideHeadingFragments()
        : undefined;

    const inferredSetSize =
      role === "list"
        ? (tag === "dl"
            ? Array.from(el.children).filter((child: any) => {
                const childTag = child.tagName.toLowerCase();
                if (!["dt", "dd"].includes(childTag)) {
                  return false;
                }

                const style = getComputedStyle(child);
                return (
                  style.display !== "none" && style.visibility !== "hidden"
                );
              }).length
            : Array.from(el.children).filter((child: any) => {
                const childTag = child.tagName.toLowerCase();
                const childRole = child.getAttribute("role") || "";
                return (
                  childRole === "listitem" ||
                  (childTag === "li" &&
                    (!childRole || childRole === "listitem"))
                );
              }).length) || undefined
        : role === "term"
          ? Array.from(el.parentElement?.children || []).filter(
              (child: any) => child.tagName.toLowerCase() === "dt",
            ).length || undefined
          : role === "tab"
            ? Array.from(
                el
                  .closest("[role='tablist']")
                  ?.querySelectorAll("[role='tab']") || [],
              ).length || undefined
            : role === "progressbar"
              ? Array.from(el.parentElement?.children || []).filter(
                  (child: any) => child.getAttribute("role") === "progressbar",
                ).length || undefined
              : role === "listbox" && tag === "select"
                ? el.options?.length || undefined
              : role === "listitem"
                ? Array.from(el.parentElement?.children || []).filter(
                    (child: any) => isSemanticListItemElement(child),
                  ).length || undefined
                : role === "heading" && (headingButton || headingLink)
                  ? Array.from(
                      el.closest("li")?.parentElement?.children || [],
                    ).filter(
                      (child: any) => child.tagName.toLowerCase() === "li",
                    ).length || undefined
                  : role === "button" && isStandaloneListItemButton()
                    ? Array.from(
                        el.closest("li")?.parentElement?.children || [],
                      ).filter(
                        (child: any) => child.tagName.toLowerCase() === "li",
                      ).length || undefined
                    : role === "button" && el.closest("dd") && el.closest("dl")
                      ? Array.from(el.closest("dl")?.children || []).filter(
                          (child: any) => {
                            if (
                              !["dt", "dd"].includes(
                                child.tagName.toLowerCase(),
                              )
                            ) {
                              return false;
                            }

                            const style = getComputedStyle(child);
                            return (
                              style.display !== "none" &&
                              style.visibility !== "hidden"
                            );
                          },
                        ).length || undefined
                      : role === "option"
                        ? Array.from(el.parentElement?.children || []).filter(
                            (child: any) =>
                              (child.getAttribute("role") || "") === "option",
                          ).length || undefined
                        : role === "image" && tag === "img"
                          ? (() => {
                              const { siblings, usesExplicitRoleListItem } =
                                getSemanticListContext(el);
                              return usesExplicitRoleListItem
                                ? undefined
                                : siblings.length || undefined;
                            })()
                          : role === "link"
                            ? getImageCardRailPosition()?.size ||
                              Array.from(
                                el.closest("li")?.parentElement?.children ||
                                  [],
                              ).filter(
                                (child: any) =>
                                  child.tagName.toLowerCase() === "li",
                              ).length ||
                              undefined
                            : role === "group"
                              ? (() => {
                                  const { siblings, usesExplicitRoleListItem } =
                                    getSemanticListContext(el);
                                  return usesExplicitRoleListItem
                                    ? undefined
                                    : siblings.length || undefined;
                                })()
                              : role === "paragraph"
                                ? (() => {
                                    const {
                                      siblings,
                                      usesExplicitRoleListItem,
                                    } = getSemanticListContext(el);
                                    return usesExplicitRoleListItem
                                      ? undefined
                                      : siblings.length || undefined;
                                  })()
                                : undefined;
    const setSize =
      parsePositiveInt(el.getAttribute("aria-setsize")) || inferredSetSize;
    const positionInSet =
      parsePositiveInt(el.getAttribute("aria-posinset")) ||
      getCollectionPosition();
    const rowElement = el.closest("tr,[role='row']");
    const rowIndex =
      parsePositiveInt(el.getAttribute("aria-rowindex")) ||
      (role === "rowheader" && !getColumnHeaderText(1)
        ? getRowIndex(rowElement)
        : undefined) ||
      (role === "rowheader" ? getBodyRowIndex(rowElement) : undefined) ||
      getRowIndex(rowElement);
    const columnIndex =
      parsePositiveInt(el.getAttribute("aria-colindex")) ||
      getColumnIndex(rowElement);
    const rowSpan =
      parsePositiveInt(el.getAttribute("aria-rowspan")) ||
      parsePositiveInt(el.getAttribute("rowspan"));
    const columnSpan =
      parsePositiveInt(el.getAttribute("aria-colspan")) ||
      parsePositiveInt(el.getAttribute("colspan"));
    const { rowCount, columnCount, tableLabel, tableRole } = getTableMetadata();
    const columnHeaderText = getColumnHeaderText(columnIndex);
    const placeholder = el.getAttribute("placeholder") || undefined;

    const required =
      el.getAttribute("aria-required") === "true" || el.required === true;
    const invalid = parseInvalidValue(el.getAttribute("aria-invalid"));
    let checked;
    if (
      role === "checkbox" ||
      role === "radio" ||
      role === "switch" ||
      el.type === "checkbox" ||
      el.type === "radio"
    ) {
      const ac = el.getAttribute("aria-checked");
      if (ac === "mixed") checked = "mixed";
      else checked = !!el.checked;
    }
    const expanded = el.hasAttribute("aria-expanded")
      ? el.getAttribute("aria-expanded") === "true"
      : undefined;
    const selected = el.hasAttribute("aria-selected")
      ? el.getAttribute("aria-selected") === "true"
      : undefined;
    const pressed = el.hasAttribute("aria-pressed")
      ? el.getAttribute("aria-pressed") === "mixed"
        ? "mixed"
        : el.getAttribute("aria-pressed") === "true"
      : undefined;
    const disabled =
      el.hasAttribute("disabled") ||
      el.getAttribute("aria-disabled") === "true";
    const readOnly =
      el.getAttribute("aria-readonly") === "true" || el.readOnly === true
        ? true
        : undefined;
    const current = el.hasAttribute("aria-current")
      ? el.getAttribute("aria-current") === "true"
        ? true
        : el.getAttribute("aria-current") || undefined
      : undefined;
    const hasPopup = normalizeHasPopup(el.getAttribute("aria-haspopup"));
    const autocomplete = el.getAttribute("aria-autocomplete") || undefined;
    const live = el.getAttribute("aria-live") || undefined;
    const atomic = el.getAttribute("aria-atomic") === "true" ? true : undefined;
    const relevant = el.getAttribute("aria-relevant") || undefined;
    const busy = el.getAttribute("aria-busy") === "true" ? true : undefined;
    const controls = el.getAttribute("aria-controls") || undefined;
    const modal = el.getAttribute("aria-modal") === "true" ? true : undefined;
    const sort = el.getAttribute("aria-sort") || undefined;
    const selectedCount =
      role === "listbox"
        ? tag === "select"
          ? el.selectedOptions?.length || undefined
          : Array.from(
              el.querySelectorAll("[role='option'][aria-selected='true']"),
            ).length || undefined
        : undefined;

    const combinedExpanded =
      expanded ??
      (headingButton?.hasAttribute("aria-expanded")
        ? headingButton.getAttribute("aria-expanded") === "true"
        : undefined);

    const combinedName =
      role === "heading" && headingLink
        ? getElementAccessibleName(headingLink)?.slice(0, 200) || name
        : name ||
          (headingButton
            ? getAccessibleText(headingButton)?.slice(0, 200) || undefined
            : headingLink
              ? getElementAccessibleName(headingLink)?.slice(0, 200) ||
                undefined
              : undefined);

    const effectiveRole =
      role === "region" && isCarouselContainer(el)
        ? "group"
        : role === "text" && isNamedInlineMetadataText(el)
        ? "group"
        : role === "group" && isSingleReadableTextGroup(el)
          ? "text"
          : role;
    const effectiveName =
      isCarouselContainer(el) ||
      isFocusableCarouselSlideGroup(el) ||
      isGroupedLinkBody()
        ? undefined
        : effectiveRole === "text"
          ? text || combinedName
          : combinedName;
    const effectiveText =
      isCarouselContainer(el) ||
      isFocusableCarouselSlideGroup(el) ||
      isGroupedLinkBody()
        ? undefined
        : text;

    return {
      role: effectiveRole,
      name: effectiveName,
      text: effectiveText,
      description,
      details,
      errorMessage,
      roleDescription,
      value,
      valueText,
      level,
      headingFragments,
      setSize,
      positionInSet,
      rowIndex,
      rowCount,
      columnIndex,
      columnCount,
      columnHeaderText,
      rowSpan,
      columnSpan,
      tableLabel,
      tableRole,
      placeholder,
      required: required || undefined,
      invalid,
      checked,
      expanded: combinedExpanded,
      selected,
      pressed,
      disabled: disabled || undefined,
      readOnly,
      current,
      hasPopup,
      autocomplete,
      live,
      atomic,
      relevant,
      busy,
      controls,
      modal,
      sort,
      selectedCount,
      nativeSelect: tag === "select" ? true : undefined,
      headingButton: Boolean(headingButton) || undefined,
      headingLink: Boolean(headingLink) || undefined,
      iconOnlyLink: isIconOnlyLink() || undefined,
      linkRoleFirst:
        role === "link" &&
        (Boolean(getAwardsImageStripLinkLabel(el)) ||
          isDecorativeGraphicOnlyLabelledLink() ||
          (hasRawMarkupText(ariaLabel) && hasGroupedVisibleLinkBody(el)) ||
          isParagraphOnlyLinkText(el.parentElement))
          ? true
          : undefined,
      suppressContextEnd: isGroupedLinkBody() ? true : undefined,
      groupContext:
        (role === "button" &&
          el.parentElement?.tagName.toLowerCase() === "li" &&
          !isStandaloneListItemButton()) ||
        Boolean(headingButton)
          ? true
          : undefined,
      boundingBox: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  }

  const STOP_TAGS = new Set([
    "header",
    "nav",
    "main",
    "footer",
    "aside",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "button",
    "select",
    "textarea",
    "p",
    "li",
    "blockquote",
    "figcaption",
    "dt",
    "td",
    "th",
    "caption",
  ]);

  const STOP_ROLES = new Set([
    "button",
    "progressbar",
    "listitem",
    "img",
    "alert",
    "status",
    "log",
    "dialog",
    "banner",
    "navigation",
    "main",
    "contentinfo",
    "complementary",
    "region",
    "search",
    "separator",
  ]);

  const CONTEXT_ROLES = new Set([
    "table",
    "grid",
    "tabpanel",
    "banner",
    "navigation",
    "main",
    "contentinfo",
    "complementary",
    "region",
    "group",
    "listbox",
  ]);
  const CONTEXT_TAGS = new Set(["ul", "ol", "dl"]);

  const INLINE_TEXT_TAGS = new Set([
    "span",
    "strong",
    "em",
    "b",
    "i",
    "small",
    "mark",
    "abbr",
    "code",
    "sub",
    "sup",
    "u",
    "s",
    "br",
  ]);

  function hasProgressbarDescendants(node: any): boolean {
    if (!node) {
      return false;
    }

    if (node.getAttribute?.("role") === "progressbar") {
      return true;
    }

    return Boolean(node.querySelector("[role='progressbar']"));
  }

  function isPresentationalRole(role: string): boolean {
    return role === "presentation" || role === "none";
  }

  function isSemanticListItemElement(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || "";
    return (
      role === "listitem" || (tag === "li" && (!role || role === "listitem"))
    );
  }

  function hasImplicitTitledGroupRole(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || "";
    if (role || !tag.includes("-")) {
      return false;
    }

    const title = el.getAttribute("title")?.trim();
    if (!title) {
      return false;
    }

    if (
      el.querySelector(
        "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']",
      )
    ) {
      return false;
    }

    return Boolean(getReadableText(el));
  }

  function getSyntheticTextDescriptor(
    el: any,
    descriptor: ElementDescriptor | null,
  ): ElementDescriptor | null {
    if (
      descriptor?.role === "group" &&
      isNamedInlineMetadataText(el) &&
      getReadableText(el)
    ) {
      return {
        role: "text",
        name: getReadableText(el),
      };
    }

    if (
      !descriptor ||
      descriptor.role !== "group" ||
      !hasImplicitTitledGroupRole(el)
    ) {
      return null;
    }

    if (Array.from(el.children).some((child: any) => isStopElement(child))) {
      return null;
    }

    const directText = Array.from(el.childNodes)
      .filter((child: any) => child.nodeType === Node.TEXT_NODE)
      .map((child: any) => child.textContent?.replace(/\s+/g, " ").trim() || "")
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!directText) {
      return null;
    }

    return {
      role: "paragraph",
      name: directText,
    };
  }

  function hasStandaloneTextStop(el: any): boolean {
    const tag = el.tagName.toLowerCase();
    if (!["div", "span", "pre"].includes(tag)) return false;
    const blockingAncestor = el.closest(
      "h1, h2, h3, h4, h5, h6, button, a, label, li, p, blockquote, td, th, caption",
    );
    if (blockingAncestor) {
      const containingRegion = el.closest("[role='region']");
      const containingListItem = el.closest("li");
      const imageListItemAllowsText =
        blockingAncestor.tagName?.toLowerCase() === "li" &&
        containingListItem &&
        !containingListItem.querySelector(
          "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']",
        ) &&
        Boolean(containingListItem.querySelector("img[alt]"));
      const progressListItemAllowsText =
        blockingAncestor.tagName?.toLowerCase() === "li" &&
        containingListItem &&
        hasProgressbarDescendants(containingListItem);
      const imageCardRailAllowsText =
        blockingAncestor.tagName?.toLowerCase() === "li" &&
        isImageCardRailListItem(containingListItem);
      const listItemAllowsText =
        imageListItemAllowsText ||
        progressListItemAllowsText ||
        imageCardRailAllowsText;
      const regionAllowsText =
        blockingAncestor.tagName?.toLowerCase() === "li" &&
        containingRegion &&
        containingRegion.contains(el);
      if (!regionAllowsText && !listItemAllowsText) {
        return false;
      }

      if (
        imageListItemAllowsText &&
        tag === "div" &&
        Array.from(el.children).some(
          (child: any) => getReadableText(child) || child.children.length > 0,
        )
      ) {
        return false;
      }
    }

    const text = getReadableText(el);
    if (!text) return false;

    for (const child of Array.from(el.children)) {
      const childTag = child.tagName.toLowerCase();
      const childRole = child.getAttribute("role") || "";
      if (
        STOP_TAGS.has(childTag) ||
        STOP_ROLES.has(childRole) ||
        (childTag === "a" && child.hasAttribute("href")) ||
        (childTag === "input" && child.type !== "hidden") ||
        (childTag === "img" && child.getAttribute("alt"))
      ) {
        return false;
      }

      if (!INLINE_TEXT_TAGS.has(childTag)) {
        return false;
      }
    }

    if (
      tag === "div" &&
      Array.from(el.children).filter((child: any) => getReadableText(child))
        .length > 1
    ) {
      return false;
    }

    if (tag === "span") {
      const parent = el.parentElement;
      if (parent && hasStandaloneTextStop(parent)) {
        return false;
      }
    }

    return true;
  }

  function isImageCardRailListItem(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || "";
    if (!isSemanticListItemElement(el) || (tag !== "li" && role !== "listitem")) {
      return false;
    }

    const interactiveDescendants = Array.from(
      el.querySelectorAll(
        "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']",
      ),
    ).filter(
      (node: any) =>
        node.getAttribute("aria-hidden") !== "true" &&
        !node.closest("[aria-hidden='true']"),
    );
    if (interactiveDescendants.length !== 1) {
      return false;
    }

    const link = interactiveDescendants[0];
    const linkTag = link.tagName.toLowerCase();
    const linkRole = link.getAttribute("role") || "";
    if (!(linkTag === "a" || linkRole === "link")) {
      return false;
    }

    if (!link.querySelector("img[alt]:not([alt='']), [role='img'][aria-label]")) {
      return false;
    }

    const clone = el.cloneNode(true);
    for (const node of Array.from(
      clone.querySelectorAll(
        "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], [aria-hidden='true']",
      ),
    )) {
      node.remove();
    }

    return Boolean(getReadableText(clone));
  }

  function isTransparentListWrapperGroup(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    if ((el.getAttribute("role") || "") !== "group") {
      return false;
    }

    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
      return false;
    }

    if (el.tabIndex >= 0 || el.hasAttribute("tabindex")) {
      return false;
    }

    const listChildren = Array.from(el.children).filter((child: any) => {
      const childTag = child.tagName.toLowerCase();
      const childRole = child.getAttribute("role") || "";
      return (
        childTag === "ul" ||
        childTag === "ol" ||
        childRole === "list"
      );
    });
    if (listChildren.length !== 1) {
      return false;
    }

    const clone = el.cloneNode(true);
    for (const list of Array.from(
      clone.querySelectorAll(":scope > ul, :scope > ol, :scope > [role='list']"),
    )) {
      list.remove();
    }

    return !getReadableText(clone);
  }

  function isInlineTextOnlyGroup(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    if ((el.getAttribute("role") || "") !== "group") {
      return false;
    }

    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
      return false;
    }

    if (el.tabIndex >= 0 || el.hasAttribute("tabindex")) {
      return false;
    }

    const hasVisibleBlockingDescendant = Array.from(
      el.querySelectorAll(
        "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], img[alt], [role='img'], table, [role='table'], [role='grid']",
      ),
    ).some(
      (node: any) =>
        node.getAttribute("aria-hidden") !== "true" &&
        !node.closest("[aria-hidden='true']"),
    );

    if (hasVisibleBlockingDescendant) {
      return false;
    }

    const children = Array.from(el.children);
    if (!children.length) {
      return false;
    }

    const hasOnlyInlineTextChildren = children.every((child: any) => {
      if (child.getAttribute("aria-hidden") === "true") {
        return true;
      }

      const childRole = child.getAttribute("role") || "";
      if (childRole === "text") {
        return Boolean(getReadableText(child));
      }

      const childTag = child.tagName.toLowerCase();
      return INLINE_TEXT_TAGS.has(childTag) && Boolean(getReadableText(child));
    });

    return hasOnlyInlineTextChildren && Boolean(getReadableText(el));
  }

  function isSingleTextChildGroup(el: any): boolean {
    if (!isInlineTextOnlyGroup(el)) {
      return false;
    }

    const visibleTextChildren = Array.from(el.children).filter(
      (child: any) =>
        child.getAttribute("aria-hidden") !== "true" &&
        Boolean(getReadableText(child)),
    );

    return visibleTextChildren.length === 1;
  }

  function isNamedInlineMetadataText(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    if ((el.getAttribute("role") || "") !== "text") {
      return false;
    }

    if (!el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby")) {
      return false;
    }

    if (el.tabIndex >= 0 || el.hasAttribute("tabindex")) {
      return false;
    }

    const parent = el.parentElement;
    return (
      parent?.getAttribute("role") === "group" &&
      !parent.getAttribute("aria-label") &&
      !parent.getAttribute("aria-labelledby")
    );
  }

  function isSingleReadableTextGroup(el: any): boolean {
    if (isSingleTextChildGroup(el)) {
      return true;
    }

    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    if ((el.getAttribute("role") || "") !== "group") {
      return false;
    }

    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
      return false;
    }

    if (el.tabIndex >= 0 || el.hasAttribute("tabindex")) {
      return false;
    }

    const blockingDescendants = Array.from(
      el.querySelectorAll(
        "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], img[alt], [role='img'], table, [role='table'], [role='grid']",
      ),
    ).filter(
      (node: any) =>
        node.getAttribute("aria-hidden") !== "true" &&
        !node.closest("[aria-hidden='true']"),
    );
    if (blockingDescendants.length > 0) {
      return false;
    }

    const textContainers = Array.from(el.querySelectorAll("*")).filter(
      (node: any) => {
        if (
          node.getAttribute("aria-hidden") === "true" ||
          node.closest("[aria-hidden='true']")
        ) {
          return false;
        }

        if (!getReadableText(node)) {
          return false;
        }

        return !Array.from(node.children).some((child: any) =>
          getReadableText(child),
        );
      },
    );

    return textContainers.length === 1 && Boolean(getReadableText(el));
  }

  function isCarouselContainer(el: any): boolean {
    return (
      el?.nodeType === Node.ELEMENT_NODE &&
      (el.getAttribute("aria-roledescription") || "").toLowerCase() ===
        "carousel"
    );
  }

  function isInsideCarousel(el: any): boolean {
    for (let current = el?.parentElement; current; current = current.parentElement) {
      if (isCarouselContainer(current)) {
        return true;
      }
    }

    return false;
  }

  function isFocusableCarouselSlideGroup(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    if ((el.getAttribute("role") || "") !== "group") {
      return false;
    }

    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
      return false;
    }

    if (el.tabIndex < 0) {
      return false;
    }

    return isInsideCarousel(el);
  }

  function removeCollapsedPopupContentFromClone(
    sourceEl: any,
    cloneEl: any,
  ): void {
    if (!sourceEl || !cloneEl) {
      return;
    }

    for (const sourceNode of Array.from(sourceEl.querySelectorAll("[id]"))) {
      if (!getCollapsedPopupController(sourceNode)) {
        continue;
      }

      cloneEl.querySelector(`#${CSS.escape(sourceNode.id)}`)?.remove();
    }
  }

  function isStopElement(el: any): boolean {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || "";
    const hasImplicitGroupRole =
      !role &&
      ["div", "form"].includes(tag) &&
      (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"));

    if (tag === "button" || role === "button") {
      const headingParent = el.closest("h1, h2, h3, h4, h5, h6");
      if (headingParent) {
        const headingButtons = headingParent.querySelectorAll(
          ":scope > button, :scope > [role='button'], :scope button, :scope [role='button']",
        );
        if (headingButtons.length === 1 && headingButtons[0] === el) {
          return false;
        }
      }
    }

    if (tag === "li" || role === "listitem") {
      if (isImageCardRailListItem(el)) {
        return false;
      }

      if (hasProgressbarDescendants(el)) {
        return false;
      }

      const heading = el.querySelector("h1, h2, h3, h4, h5, h6");
      const accordionButton = heading?.querySelector("button, [role='button']");
      const accordionRegionId = accordionButton?.getAttribute("aria-controls");
      const accordionRegion = accordionRegionId
        ? el.querySelector(`#${CSS.escape(accordionRegionId)}`) ||
          document.getElementById(accordionRegionId)
        : el.querySelector("[role='region']");

      if (
        heading &&
        accordionButton &&
        accordionRegion &&
        accordionRegion.getAttribute("role") === "region"
      ) {
        return false;
      }

      const hasInteractiveDescendants = Boolean(
        el.querySelector(
          "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']",
        ),
      );
      const hasImageDescendant = Boolean(el.querySelector("img[alt]"));
      if (
        !hasInteractiveDescendants &&
        hasImageDescendant &&
        el.tabIndex < 0 &&
        !el.hasAttribute("tabindex")
      ) {
        return false;
      }

      const interactiveDescendants = Array.from(
        el.querySelectorAll(
          "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']",
        ),
      ).filter(
        (node: any) =>
          node.getAttribute("aria-hidden") !== "true" &&
          !node.closest("[aria-hidden='true']"),
      );

      if (interactiveDescendants.length >= 1 && role !== "listitem") {
        const clone = el.cloneNode(true);
        for (const node of Array.from(
          clone.querySelectorAll(
            "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], [aria-hidden='true']",
          ),
        )) {
          node.remove();
        }

        removeCollapsedPopupContentFromClone(el, clone);

        if (!getReadableText(clone)) {
          return false;
        }
      }

      if (el.querySelector("[aria-hidden='true']")) {
        const clone = el.cloneNode(true);
        for (const node of Array.from(
          clone.querySelectorAll("[aria-hidden='true']"),
        )) {
          node.remove();
        }

        if (!getReadableText(clone)) {
          return false;
        }
      }
    }

    if (tag === "a" && el.hasAttribute("href")) return true;
    if (role === "link") return true;
    if (tag === "input" && el.type !== "hidden") return true;
    if (hasStandaloneLabelStop(el)) return true;
    if (getFocusableTableGroupLabel(el)) return true;
    if (hasImplicitGroupRole) return true;
    if (isStructuredTableStop(el)) return true;
    if (hasImplicitTitledGroupRole(el)) return true;
    if (isTransparentListWrapperGroup(el)) return false;
    if (isNamedInlineMetadataText(el)) return true;
    if (isSingleReadableTextGroup(el)) return true;
    if (isInlineTextOnlyGroup(el)) return false;
    if (
      role === "banner" &&
      tag !== "header" &&
      el.getAttribute("aria-label") === "" &&
      !getReadableTextIgnoringAriaHidden(el)
    ) {
      return false;
    }
    if (tag === "p" && isParagraphOnlyLinkText(el)) return false;
    if (
      tag === "p" &&
      el.querySelector("[aria-hidden='true']") &&
      !getReadableTextIgnoringAriaHidden(el)
    ) {
      return false;
    }
    if (
      CONTEXT_ROLES.has(role) ||
      (CONTEXT_TAGS.has(tag) && !isPresentationalRole(role))
    )
      return true;
    if (STOP_TAGS.has(tag)) {
      if (tag === "nav" && role && role !== "navigation") {
        return false;
      }
      return true;
    }
    if (STOP_ROLES.has(role)) return true;
    if (hasStandaloneTextStop(el)) return true;
    if (
      el.getAttribute("aria-label") &&
      ["section", "div", "form"].includes(tag)
    )
      return true;
    if (
      tag === "img" &&
      el.hasAttribute("alt") &&
      el.getAttribute("alt") !== ""
    )
      return true;
    return false;
  }

  function shouldDescendIntoStop(el: any): boolean {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || "";
    const hasImplicitGroupRole =
      !role &&
      ["div", "form"].includes(tag) &&
      (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"));
    if (hasImplicitGroupRole) {
      return true;
    }
    if (hasImplicitTitledGroupRole(el)) {
      return true;
    }
    if (getFocusableTableGroupLabel(el)) {
      return true;
    }
    if (isStructuredTableStop(el)) {
      return true;
    }
    if (isNamedInlineMetadataText(el)) {
      return true;
    }
    if (isSingleReadableTextGroup(el)) {
      return false;
    }
    if (isInlineTextOnlyGroup(el)) {
      return false;
    }
    if (
      tag === "a" &&
      el.hasAttribute("href") &&
      /<\/?[a-z][\s\S]*>/i.test(el.getAttribute("aria-label") || "") &&
      Array.from(el.children).some(
        (child: any) =>
          (child.getAttribute("role") || "") === "group" &&
          child.getAttribute("aria-hidden") !== "true" &&
          !child.closest("[aria-hidden='true']") &&
          Boolean(getReadableText(child)),
      )
    ) {
      return true;
    }
    if (
      CONTEXT_ROLES.has(role) ||
      (CONTEXT_TAGS.has(tag) && !isPresentationalRole(role))
    ) {
      return true;
    }

    if (
      ["header", "nav", "main", "footer", "aside"].includes(tag) &&
      (!role ||
        [
          "banner",
          "navigation",
          "main",
          "contentinfo",
          "complementary",
        ].includes(role))
    ) {
      return true;
    }

    if (/^h[1-6]$/.test(tag)) {
      return Boolean(
        el.querySelector(
          ":scope > button, :scope > [role='button'], :scope button, :scope [role='button']",
        ),
      );
    }

    if (tag === "label" && hasStandaloneLabelStop(el)) {
      const htmlFor = el.getAttribute("for");
      if (htmlFor && !document.getElementById(htmlFor)) {
        return Boolean(el.parentElement?.querySelector("button"));
      }
      return Boolean(el.querySelector("label, select"));
    }

    if (tag === "li" || role === "listitem") {
      return Boolean(
        el.querySelector(
          "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']",
        ),
      );
    }

    return false;
  }

  function getHighlightTarget(el: any): any {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || "";

    if (tag === "li" || role === "listitem") {
      const summaryChild = Array.from(el.children).find((child: any) => {
        const childTag = child.tagName.toLowerCase();
        const childRole = child.getAttribute("role") || "";
        return !(
          childTag === "button" ||
          (childTag === "a" && child.hasAttribute("href")) ||
          (childTag === "input" && child.type !== "hidden") ||
          childTag === "select" ||
          childTag === "textarea" ||
          childRole === "button" ||
          childRole === "link"
        );
      });

      if (summaryChild) {
        return summaryChild;
      }
    }

    return el;
  }

  function getCollapsedPopupController(container: any): any {
    if (
      !container ||
      container.nodeType !== Node.ELEMENT_NODE ||
      !container.id
    ) {
      return null;
    }

    const controller = document.querySelector(
      `[aria-controls="${CSS.escape(container.id)}"][aria-expanded="false"][aria-haspopup]`,
    );

    if (controller && !container.contains(controller)) {
      return controller;
    }

    return null;
  }

  function isInsideCollapsedPopupContainer(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    for (let current = el; current; current = current.parentElement) {
      if (getCollapsedPopupController(current)) {
        return true;
      }
    }

    return false;
  }

  function scanSubtree(root: any): ScanLogEntry[] {
    const log: ScanLogEntry[] = [];
    let stopIndex = 0;

    function getWalkChildren(el: any): any[] {
      if (el.shadowRoot) {
        return Array.from(el.shadowRoot.children);
      }

      const declarativeShadowRoot = Array.from(el.children).find(
        (child: any) =>
          child.tagName?.toLowerCase() === "template" &&
          child.getAttribute("shadowrootmode"),
      );
      if (declarativeShadowRoot) {
        return Array.from(declarativeShadowRoot.content?.children || []);
      }

      return Array.from(el.children);
    }

    function walk(el: any, allowRoot: boolean): void {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      if (el.getAttribute("aria-hidden") === "true") {
        return;
      }

      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") {
        return;
      }

      if (isInsideCollapsedPopupContainer(el)) {
        return;
      }

      if (allowRoot ? isStopElement(el) : isStopElement(el)) {
        const highlightTarget = getHighlightTarget(el);
        const id = `__sr_el_${stopIndex}_${now()}`;
        stopIndex += 1;
        highlightTarget.setAttribute("data-sr-id", id);

        const descriptor = captureElement(el);
        if (descriptor) {
          const announcement = generateAnnouncement(descriptor);
          if (announcement) {
            const highlightRect = highlightTarget.getBoundingClientRect();
            log.push({
              index: log.length,
              srId: id,
              announcement,
              role: descriptor.role,
              name: descriptor.name,
              boundingBox: {
                x: Math.round(highlightRect.x),
                y: Math.round(highlightRect.y),
                width: Math.round(highlightRect.width),
                height: Math.round(highlightRect.height),
              },
            });
          }
        }

        if (!shouldDescendIntoStop(el)) {
          return;
        }

        const childrenToWalk =
          descriptor?.role === "listbox"
            ? getWalkChildren(el).filter(
                (child: any) =>
                  (child.getAttribute("role") || "") === "option" &&
                  child.getAttribute("aria-selected") === "true",
              )
            : getWalkChildren(el);

        for (const child of childrenToWalk) {
          walk(child, false);
        }

        const syntheticTextDescriptor = getSyntheticTextDescriptor(
          el,
          descriptor,
        );
        if (syntheticTextDescriptor) {
          const syntheticAnnouncement = generateAnnouncement(
            syntheticTextDescriptor,
          );
          if (syntheticAnnouncement) {
            log.push({
              index: log.length,
              srId: id,
              announcement: syntheticAnnouncement,
              role: syntheticTextDescriptor.role,
              name: syntheticTextDescriptor.name,
              boundingBox: undefined,
            });
          }
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

      for (const child of getWalkChildren(el)) {
        walk(child, false);
      }
    }

    walk(root, true);

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
