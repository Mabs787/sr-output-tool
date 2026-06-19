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

  function isHidden(el: any): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    if (el.getAttribute("aria-hidden") === "true") {
      return true;
    }

    const marker = renderedHiddenValue(el);
    if (marker && marker !== "false") {
      return true;
    }

    if (
      el.closest("[aria-hidden='true']") ||
      el.closest(
        "[data-sr-computed-hidden]:not([data-sr-computed-hidden='false'])",
      )
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
    return /[\p{L}\p{N}%]/u.test(leftChar) && /[\p{L}\p{N}]/u.test(rightChar);
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
        .map((id) => readableText(resolveIdRef(id)) || "")
        .filter(Boolean)
        .join(" "),
    );
  }

  function labelForControl(el: any): string | undefined {
    if ("labels" in el && el.labels?.length) {
      return textWithoutInteractive(el.labels[0]) || readableText(el.labels[0]);
    }

    const id = el.getAttribute("id");
    if (!id) return undefined;
    const label = document.querySelector(`label[for="${cssEscape(id)}"]`);
    return label ? textWithoutInteractive(label) || readableText(label) : undefined;
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

  function buttonContentName(el: any): string | undefined {
    const imageLabel = nestedImageLabel(el);
    const text = readableText(el);
    return normalize([imageLabel, text].filter(Boolean).join(" "));
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

  function accessibleName(el: any, role: string): string | undefined {
    const ariaLabel = normalize(el.getAttribute("aria-label"));
    if (ariaLabel !== undefined) return ariaLabel;

    const labelledBy = textFromIdRefs(el.getAttribute("aria-labelledby"));
    if (labelledBy) return labelledBy;

    const tag = el.tagName.toLowerCase();
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
      return normalize(el.getAttribute("title"));
    }

    if (tag === "img") return normalize(el.getAttribute("alt"));
    if (["input", "select", "textarea"].includes(tag)) {
      return labelForControl(el);
    }

    if (role === "link") {
      return linkContentName(el) || normalize(el.getAttribute("title"));
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
    if (tag === "header") return "banner";
    if (tag === "nav") return "navigation";
    if (tag === "main") return "main";
    if (tag === "article") return "article";
    if (tag === "search") return "search";
    if (tag === "footer") return "contentinfo";
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
    if (tag === "dialog") return "dialog";
    if (tag === "p" || tag === "blockquote" || tag === "figcaption") {
      return "paragraph";
    }
    if (
      ["section", "div", "form"].includes(tag) &&
      (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
    ) {
      return tag === "section" ? "region" : "group";
    }
    if (["span", "div"].includes(tag) &&
      directOwnText(el) &&
      !el.querySelector(interactiveSelector) &&
      !el.closest(interactiveSelector) &&
      !el.closest("p, li, h1, h2, h3, h4, h5, h6")
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

    if (["link", "button", "heading", "paragraph", "listitem", "image", "group"].includes(role)) {
      const { listItem, siblings } = semanticListContext(el);
      const index = siblings.indexOf(listItem);
      return index >= 0 ? index + 1 : undefined;
    }

    return undefined;
  }

  function setSize(el: any, role: string): number | undefined {
    const explicit = Number.parseInt(el.getAttribute("aria-setsize") || "", 10);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;

    if (role === "list") return listChildren(el).length || undefined;
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
    if (["link", "button", "heading", "paragraph", "listitem", "image", "group"].includes(role)) {
      const { siblings } = semanticListContext(el);
      return siblings.length || undefined;
    }
    return undefined;
  }

  function hasOnlyInteractiveListItemContent(el: any): boolean {
    if (!isListItem(el)) return false;
    if (!el.querySelector(interactiveSelector)) return false;
    return !textWithoutInteractive(el);
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
    return Array.from(el.querySelectorAll(interactiveSelector)).some(
      (candidate: any) => !isHidden(candidate),
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

  function govUkCookiePreferenceParagraph(el: any): boolean {
    if (implicitRole(el) !== "paragraph") return false;
    const region = el.closest("[role='region'][aria-label='Cookies on GOV.UK']");
    if (!region) return false;
    const text = readableText(el) || "";
    return /^You have (accepted|rejected) additional cookies\./.test(text);
  }

  function govUkCookiePreferenceText(el: any): string | undefined {
    const fragments: string[] = [];
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = normalize(child.textContent);
        if (text) fragments.push(text);
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) continue;
      if (child.matches(interactiveSelector)) break;
      for (const nested of Array.from(child.childNodes)) {
        if (nested.nodeType === Node.TEXT_NODE) {
          const text = normalize(nested.textContent);
          if (text) fragments.push(text);
        } else if (
          nested.nodeType === Node.ELEMENT_NODE &&
          nested.matches?.(interactiveSelector)
        ) {
          break;
        }
      }
    }
    return normalize(fragments.join(" "));
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
          : normalize(el.getAttribute("aria-roledescription")),
      level:
        role === "heading"
          ? Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2
          : role === "list"
            ? listLevel(el)
          : undefined,
      setSize: size,
      positionInSet: position,
      ...parentListMeta,
      value: "value" in stateEl && stateEl.value ? stateEl.value : undefined,
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
      expanded: parseBooleanAttribute(stateEl, "aria-expanded"),
      selected: parseBooleanAttribute(el, "aria-selected"),
      pressed: el.hasAttribute("aria-pressed")
        ? el.getAttribute("aria-pressed") === "mixed"
          ? "mixed"
          : el.getAttribute("aria-pressed") === "true"
        : undefined,
      disabled:
        el.disabled || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true" || undefined,
      readOnly: el.readOnly || el.getAttribute("aria-readonly") === "true" || undefined,
      current: el.hasAttribute("aria-current")
        ? el.getAttribute("aria-current") === "true"
          ? true
          : el.getAttribute("aria-current")
        : undefined,
      hasPopup: normalizedPopup(stateEl) ?? normalizedPopup(el),
      autocomplete: normalize(stateEl.getAttribute("aria-autocomplete") ?? el.getAttribute("aria-autocomplete")),
      modal: el.getAttribute("aria-modal") === "true" || undefined,
      sort: normalize(el.getAttribute("aria-sort")),
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
        (role === "button" && Boolean(nestedImageLabel(el))) ||
        (role === "button" &&
          Boolean(closestCustomElement(el)) &&
          !normalizedPopup(el) &&
          el.hasAttribute("aria-label")) ||
        (role === "button" &&
          el.hasAttribute("aria-expanded") &&
          !normalizedPopup(el) &&
          !position) ||
        undefined,
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
      descriptor.name = govUkCookiePreferenceParagraph(el)
        ? govUkCookiePreferenceText(el)
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

    if (
      contextRoles.has(role) &&
      !accessibleName(el, role) &&
      !readableText(el) &&
      !hasVisibleInteractiveDescendant(el)
    ) {
      return false;
    }

    if (role === "paragraph" && !readableText(el)) {
      return false;
    }

    if (role === "image" && !accessibleName(el, role)) {
      return false;
    }

    if (
      role === "group" &&
      !accessibleName(el, role) &&
      !el.matches(interactiveSelector)
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
    if (contextRoles.has(role)) return true;
    if (role === "heading") {
      return Boolean(el.querySelector("button, [role='button'], a[href]"));
    }
    if (role === "listitem") {
      return (
        hasOnlyInteractiveListItemContent(el) ||
        Boolean(el.querySelector("ul, ol, dl, [role='list']"))
      );
    }
    if (role === "paragraph") {
      return (
        !govUkCookiePreferenceParagraph(el) &&
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
    const controller = document.querySelector(
      `[aria-controls="${cssEscape(container.id)}"][aria-expanded="false"]`,
    );
    return controller && !container.contains(controller) ? controller : null;
  }

  function isInsideCollapsedPopup(el: any): boolean {
    for (let current = el; current; current = current.parentElement) {
      if (collapsedPopupController(current)) return true;
    }
    return false;
  }

  function scanSubtree(root: any): ScanLogEntry[] {
    const log: ScanLogEntry[] = [];
    let stopIndex = 0;

    function walk(el: any): void {
      if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el)) return;
      if (isInsideCollapsedPopup(el)) return;

      if (isStopElement(el)) {
        const id = `__sr_el_${stopIndex}_${now()}`;
        stopIndex += 1;
        el.setAttribute("data-sr-id", id);

        const descriptor = captureElement(el);
        if (descriptor) {
          const announcement = generateAnnouncement(descriptor);
          if (announcement) {
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
