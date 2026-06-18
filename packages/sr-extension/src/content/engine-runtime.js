// Bundled from packages/sr-engine via @sr-output/engine

(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // ../sr-engine/dist/announcements.js
  var require_announcements = __commonJS({
    "../sr-engine/dist/announcements.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.generateAnnouncement = generateAnnouncement2;
      exports.getContextEndAnnouncement = getContextEndAnnouncement2;
      function normalizeText(value) {
        const normalized = value?.replace(/\s+/g, " ").trim();
        return normalized || void 0;
      }
      function pushIfPresent(parts, value) {
        const normalized = normalizeText(value);
        if (normalized) {
          parts.push(normalized);
        }
      }
      function pushCollectionPosition(parts, el) {
        if (el.positionInSet && el.setSize) {
          parts.push(`${el.positionInSet} of ${el.setSize}`);
        }
      }
      function pushTableCoordinates(parts, el) {
        if (el.columnIndex) {
          parts.push(`column ${el.columnIndex}`);
        }
        if (el.rowIndex) {
          parts.push(`row ${el.rowIndex}`);
        }
      }
      function formatPopupType(hasPopup) {
        if (!hasPopup) {
          return void 0;
        }
        if (hasPopup === true || hasPopup === "true") {
          return "menu pop up";
        }
        switch (String(hasPopup)) {
          case "menu":
            return "menu pop up";
          case "listbox":
            return "list box pop up";
          case "tree":
            return "tree pop up";
          case "grid":
            return "grid pop up";
          case "dialog":
            return "dialog pop up";
          default:
            return "pop up";
        }
      }
      function pushInvalidState(parts, invalid) {
        if (!invalid || invalid === "false") {
          return;
        }
        if (typeof invalid === "string" && invalid !== "true") {
          parts.push(`invalid ${invalid}`);
          return;
        }
        parts.push("invalid");
      }
      function pushAutocomplete(parts, autocomplete) {
        const normalized = normalizeText(autocomplete);
        if (!normalized || normalized === "none") {
          return;
        }
        if (normalized === "list") {
          parts.push("auto complete available");
          return;
        }
        parts.push(`${normalized} auto complete`);
      }
      function pushSortState(parts, sort) {
        const normalized = normalizeText(sort);
        if (!normalized || normalized === "none") {
          return;
        }
        parts.push(`sorted ${normalized}`);
      }
      function pushSupplementalText(parts, el) {
        pushIfPresent(parts, el.details);
        pushInvalidState(parts, el.invalid);
        pushIfPresent(parts, el.errorMessage);
        if (el.busy) {
          parts.push("busy");
        }
      }
      function formatHeadingFragments(fragments) {
        const normalizedFragments = fragments?.map((fragment) => normalizeText(fragment)).filter((fragment) => Boolean(fragment));
        if (!normalizedFragments?.length) {
          return void 0;
        }
        const [firstFragment, ...nestedFragments] = normalizedFragments;
        return [
          firstFragment,
          ...nestedFragments.map((fragment) => `level 2 ${fragment}`),
          `level 2, ${normalizedFragments.length} items`
        ].join(", ");
      }
      function generateAnnouncement2(el) {
        const parts = [];
        const role = (el.role ?? "").toLowerCase();
        const label = normalizeText(el.name) ?? normalizeText(el.text) ?? normalizeText(el.description);
        const value = normalizeText(el.valueText ?? el.value);
        switch (role) {
          case "heading": {
            const level = el.level ?? 2;
            const headingLabel = formatHeadingFragments(el.headingFragments) ?? label;
            parts.push(`heading level ${level}`);
            if (el.headingLink) {
              parts.push("link");
              pushIfPresent(parts, headingLabel);
              pushCollectionPosition(parts, el);
            } else {
              pushIfPresent(parts, headingLabel);
            }
            if (el.headingButton) {
              if (el.expanded !== void 0) {
                parts.push(el.expanded ? "expanded" : "collapsed");
              }
              parts.push("button");
              if (el.groupContext) {
                parts.push("group");
              }
              pushCollectionPosition(parts, el);
            }
            pushSupplementalText(parts, el);
            break;
          }
          case "button": {
            pushIfPresent(parts, label);
            const popupType = formatPopupType(el.hasPopup);
            const isToggleButton = el.roleDescription === "toggle button";
            if (popupType && !isToggleButton) {
              if (el.expanded !== void 0) {
                parts.push(`${popupType} ${el.expanded ? "expanded" : "collapsed"}`);
                parts.push("button");
              } else {
                parts.push(`${popupType} button`);
              }
            } else {
              if (el.expanded !== void 0) {
                parts.push(el.expanded ? "expanded" : "collapsed");
              }
              if (isToggleButton && el.disabled) {
                parts.push("dimmed");
              }
              parts.push(el.roleDescription ?? "button");
            }
            if (el.groupContext) {
              parts.push("group");
            } else {
              pushCollectionPosition(parts, el);
            }
            if (el.pressed === true) {
              parts.push("pressed");
            } else if (el.pressed === "mixed") {
              parts.push("mixed");
            }
            if (el.disabled && !isToggleButton) {
              parts.push("dimmed");
            }
            pushSupplementalText(parts, el);
            break;
          }
          case "link": {
            const popupType = formatPopupType(el.hasPopup);
            if (el.disabled) {
              parts.push("dimmed");
            }
            if (popupType && el.expanded !== void 0) {
              parts.push(popupType);
              parts.push(el.expanded ? "expanded" : "collapsed");
            }
            if (el.disabled) {
              parts.push("link");
              if (el.iconOnlyLink) {
                parts.push("image");
              }
              pushIfPresent(parts, label);
            } else if (el.iconOnlyLink) {
              parts.push("link");
              parts.push("image");
              pushIfPresent(parts, label);
            } else {
              parts.push("link");
              pushIfPresent(parts, label);
            }
            if (el.current) {
              parts.push(el.current === true ? "current" : `current ${el.current}`);
            }
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "separator": {
            parts.push("horizontal splitter");
            pushSupplementalText(parts, el);
            break;
          }
          case "textbox":
          case "searchbox":
          case "spinbutton": {
            if (role === "searchbox") {
              pushIfPresent(parts, [label, value ?? el.placeholder].filter(Boolean).join(" "));
              if (el.required) {
                parts.push("required");
              }
              const popupType = formatPopupType(el.hasPopup);
              if (popupType) {
                parts.push(popupType);
              }
              parts.push("search text field");
              pushAutocomplete(parts, el.autocomplete);
            } else {
              pushIfPresent(parts, label);
              parts.push("text field");
              pushIfPresent(parts, value ?? el.placeholder);
              pushAutocomplete(parts, el.autocomplete);
              if (el.required) {
                parts.push("required");
              }
            }
            if (el.readOnly) {
              parts.push("read only");
            }
            pushSupplementalText(parts, el);
            break;
          }
          case "combobox": {
            if (el.nativeSelect) {
              const selectLabel = normalizeText(el.name);
              pushIfPresent(parts, value);
              if (selectLabel && selectLabel !== value) {
                pushIfPresent(parts, selectLabel);
              }
              parts.push("menu pop up");
              parts.push(el.expanded ? "expanded" : "collapsed");
              parts.push("button");
            } else {
              pushIfPresent(parts, label);
              const popupType = formatPopupType(el.hasPopup);
              if (popupType && el.expanded !== void 0) {
                parts.push(`${popupType} ${el.expanded ? "expanded" : "collapsed"}`);
              }
              parts.push("combo box");
              pushIfPresent(parts, value);
              if (!popupType) {
                pushAutocomplete(parts, el.autocomplete);
              }
              if (el.expanded !== void 0) {
                if (!popupType) {
                  parts.push(el.expanded ? "expanded" : "collapsed");
                }
              }
            }
            pushSupplementalText(parts, el);
            break;
          }
          case "checkbox": {
            pushIfPresent(parts, label);
            parts.push("check box");
            if (el.checked === true) {
              parts.push("checked");
            } else if (el.checked === "mixed") {
              parts.push("half checked");
            } else {
              parts.push("not checked");
            }
            pushSupplementalText(parts, el);
            break;
          }
          case "switch": {
            pushIfPresent(parts, label);
            parts.push(el.checked === true ? "on" : "off");
            parts.push("switch");
            if (el.disabled) {
              parts.push("dimmed");
            }
            pushSupplementalText(parts, el);
            break;
          }
          case "radio": {
            pushIfPresent(parts, label);
            parts.push("radio button");
            if (el.selected || el.checked === true) {
              parts.push("selected");
            } else {
              parts.push("not selected");
            }
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "progressbar": {
            pushIfPresent(parts, label);
            pushIfPresent(parts, value);
            parts.push("progress indicator");
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "listitem": {
            const listItemLabel = normalizeText(el.name);
            if (!listItemLabel) {
              return "";
            }
            parts.push(listItemLabel);
            if (!el.positionInSet || !el.setSize) {
              parts.push("list item");
            }
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "term": {
            pushIfPresent(parts, label);
            pushSupplementalText(parts, el);
            parts.push("term");
            pushCollectionPosition(parts, el);
            break;
          }
          case "paragraph": {
            pushIfPresent(parts, label);
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "text": {
            pushIfPresent(parts, label);
            pushSupplementalText(parts, el);
            break;
          }
          case "list": {
            const listLabel = normalizeText(el.name);
            const listRole = el.roleDescription ?? "list";
            const listSize = el.setSize ? `${el.setSize} items` : void 0;
            const listLevel = el.level && el.level > 1 ? `level ${el.level}` : void 0;
            const parentPosition = el.parentPositionInSet && el.parentSetSize ? `${el.parentPositionInSet} of ${el.parentSetSize}` : void 0;
            const listParts = [listLabel, listRole, listSize].filter((part) => Boolean(part));
            const supplementalParts = [];
            if (listLevel && parentPosition) {
              supplementalParts.push(`${listLevel} ${parentPosition}`);
            } else {
              if (listLevel) {
                supplementalParts.push(listLevel);
              }
              if (parentPosition) {
                supplementalParts.push(parentPosition);
              }
            }
            pushSupplementalText(supplementalParts, el);
            return [listParts.join(" "), ...supplementalParts].filter(Boolean).join(", ");
          }
          case "listbox": {
            pushIfPresent(parts, el.name);
            parts.push("list box");
            if (el.selectedCount) {
              parts.push(`${el.selectedCount} item${el.selectedCount === 1 ? "" : "s"} selected`);
            }
            if (value) {
              parts.push(value);
              parts.push("menu item");
              pushCollectionPosition(parts, el);
            }
            pushSupplementalText(parts, el);
            break;
          }
          case "tabpanel": {
            pushIfPresent(parts, label);
            parts.push("tab panel");
            pushSupplementalText(parts, el);
            break;
          }
          case "table":
          case "grid": {
            pushIfPresent(parts, el.name ?? el.tableLabel);
            parts.push(role === "grid" ? "grid" : "table");
            if (el.columnCount) {
              parts.push(`${el.columnCount} columns`);
            }
            if (el.rowCount) {
              parts.push(`${el.rowCount} rows`);
            }
            pushSupplementalText(parts, el);
            break;
          }
          case "row": {
            pushIfPresent(parts, label);
            parts.push("row");
            if (el.rowIndex) {
              parts.push(`${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""}`);
            }
            pushSupplementalText(parts, el);
            break;
          }
          case "cell":
          case "gridcell":
          case "rowheader":
          case "columnheader": {
            const usesTableFormatting = el.tableRole === "table" && el.columnIndex && el.columnCount && (role !== "columnheader" || (el.rowCount ?? 0) > 1);
            if (usesTableFormatting) {
              if (role === "columnheader") {
                parts.push(label ?? "blank");
                parts.push(`column ${el.columnIndex} of ${el.columnCount}`);
              } else {
                if (el.columnIndex === 1 && el.rowIndex) {
                  parts.push(`row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""}`);
                }
                pushIfPresent(parts, [el.columnHeaderText, label].filter(Boolean).join(" "));
                parts.push(`column ${el.columnIndex} of ${el.columnCount}`);
              }
            } else {
              pushIfPresent(parts, label);
              parts.push(role === "gridcell" ? "grid cell" : role.replace(/header$/, " header"));
              pushTableCoordinates(parts, el);
            }
            if (el.columnSpan && el.columnSpan > 1) {
              parts.push(`spans ${el.columnSpan} columns`);
            }
            if (el.rowSpan && el.rowSpan > 1) {
              parts.push(`spans ${el.rowSpan} rows`);
            }
            if (el.tableLabel && !usesTableFormatting) {
              parts.push(`in ${el.tableLabel}`);
            }
            pushSortState(parts, el.sort);
            pushSupplementalText(parts, el);
            break;
          }
          case "img":
          case "image": {
            pushIfPresent(parts, label);
            parts.push("image");
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "tab": {
            pushIfPresent(parts, label);
            if (el.selected) {
              parts.push("selected");
            }
            const popupType = formatPopupType(el.hasPopup);
            if (popupType) {
              parts.push(popupType.replace("pop up", "pop-up"));
            }
            parts.push("tab");
            if (popupType) {
              parts.push("group");
            }
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "group": {
            pushIfPresent(parts, label);
            parts.push("group");
            pushCollectionPosition(parts, el);
            break;
          }
          case "menuitem":
          case "option": {
            pushIfPresent(parts, label);
            parts.push("menu item");
            pushCollectionPosition(parts, el);
            break;
          }
          case "alert": {
            parts.push("alert");
            pushIfPresent(parts, label);
            pushSupplementalText(parts, el);
            break;
          }
          case "status": {
            if (!label && !el.details && !el.errorMessage && !el.busy) {
              break;
            }
            parts.push("status");
            pushIfPresent(parts, label);
            pushSupplementalText(parts, el);
            break;
          }
          case "dialog": {
            pushIfPresent(parts, label);
            parts.push("dialog");
            if (el.modal) {
              parts.push("modal");
            }
            pushSupplementalText(parts, el);
            break;
          }
          case "navigation": {
            pushIfPresent(parts, el.name);
            parts.push("navigation");
            pushSupplementalText(parts, el);
            break;
          }
          case "banner":
          case "main":
          case "complementary":
          case "region": {
            pushIfPresent(parts, el.name);
            parts.push(role);
            pushSupplementalText(parts, el);
            break;
          }
          case "contentinfo": {
            pushIfPresent(parts, el.name);
            parts.push("footer");
            pushSupplementalText(parts, el);
            break;
          }
          default: {
            pushIfPresent(parts, label);
            if (role && role !== "generic" && role !== "none" && role !== "presentation") {
              parts.push(el.roleDescription ?? role);
            }
            pushCollectionPosition(parts, el);
            pushTableCoordinates(parts, el);
            pushSortState(parts, el.sort);
            pushSupplementalText(parts, el);
            break;
          }
        }
        if (el.disabled && role !== "button" && role !== "link") {
          parts.push("dimmed");
        }
        return parts.filter(Boolean).join(", ");
      }
      function getContextEndAnnouncement2(descriptor) {
        if (descriptor?.suppressContextEnd) {
          return null;
        }
        const role = (descriptor?.role ?? "").toLowerCase();
        if (role === "list") {
          return descriptor?.roleDescription === "definition list" ? "end of definition list" : "end of list";
        }
        if (role === "banner") {
          return "end of, banner";
        }
        if (role === "contentinfo") {
          return descriptor?.name ? `end of ${descriptor.name} footer` : "end of, footer";
        }
        if (role === "navigation") {
          return descriptor?.name ? `end of, ${descriptor.name}, navigation` : "end of navigation";
        }
        if (role === "complementary") {
          return descriptor?.name ? `end of, ${descriptor.name}, complementary` : "end of, complementary";
        }
        if (role === "tabpanel") {
          return descriptor?.name ? `end of ${descriptor.name} tab panel` : "end of tab panel";
        }
        if (role === "table") {
          return "end of table";
        }
        if (role === "grid") {
          return "end of grid";
        }
        if (role === "region") {
          return descriptor?.name ? `end of, ${descriptor.name}, region` : "end of region";
        }
        if (role === "group") {
          return descriptor?.name ? `end of, ${descriptor.name}, group` : "end of group";
        }
        return null;
      }
    }
  });

  // ../sr-engine/dist/dom.js
  var require_dom = __commonJS({
    "../sr-engine/dist/dom.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.createDomScanner = createDomScanner2;
      function createDomScanner2(options) {
        const { generateAnnouncement: generateAnnouncement2, getContextEndAnnouncement: getContextEndAnnouncement2, now = () => Date.now() } = options;
        function getReadableText(el) {
          if (!el)
            return void 0;
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
            if (/[\p{N}]/u.test(leftChar) && /^pp\b/i.test(right)) {
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
          return text || void 0;
        }
        function hasRenderedHiddenMarker(el) {
          const hidden = el?.getAttribute?.("data-sr-computed-hidden");
          return Boolean(hidden && hidden !== "false");
        }
        function getReadableTextIgnoringAriaHidden(el) {
          if (!el) {
            return void 0;
          }
          const clone = el.cloneNode(true);
          for (const hiddenNode of Array.from(clone.querySelectorAll("[aria-hidden='true']"))) {
            hiddenNode.remove();
          }
          return getReadableText(clone);
        }
        function isParagraphOnlyLinkText(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE) {
            return false;
          }
          if (el.tagName.toLowerCase() !== "p") {
            return false;
          }
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
            return false;
          }
          const links = Array.from(el.querySelectorAll("a[href]")).filter((link) => link.getAttribute("aria-hidden") !== "true" && !link.closest("[aria-hidden='true']"));
          if (!links.length) {
            return false;
          }
          const paragraphText = getReadableTextIgnoringAriaHidden(el);
          const linkText = links.map((link) => getReadableTextIgnoringAriaHidden(link) || "").filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
          return Boolean(paragraphText && linkText && paragraphText === linkText);
        }
        function getStandaloneLabelText(el) {
          if (!el || el.tagName?.toLowerCase() !== "label") {
            return void 0;
          }
          const parts = [];
          for (const child of Array.from(el.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
              const text2 = child.textContent?.replace(/\s+/g, " ").trim();
              if (text2) {
                parts.push(text2);
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
            if (childTag === "label" || childTag === "input" || childTag === "select" || childTag === "textarea" || childTag === "button" || childTag === "a" && childEl.hasAttribute("href") || childRole === "button" || childRole === "link") {
              continue;
            }
            const text = getReadableText(childEl);
            if (text) {
              parts.push(text);
            }
          }
          return parts.join(" ").replace(/\s+/g, " ").trim() || void 0;
        }
        function hasStandaloneLabelStop(el) {
          if (!el || el.tagName?.toLowerCase() !== "label") {
            return false;
          }
          const labelText = getStandaloneLabelText(el) || getReadableText(el);
          if (!labelText) {
            return false;
          }
          if (el.querySelector("select") || el.parentElement?.closest("label")?.querySelector("select")) {
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
          if (controlTag === "select" || controlRole === "switch") {
            return true;
          }
          if (controlTag === "textarea") {
            return true;
          }
          if (controlTag === "input") {
            const inputType = (control.getAttribute("type") || "text").toLowerCase();
            return ![
              "button",
              "checkbox",
              "hidden",
              "image",
              "radio",
              "reset",
              "submit"
            ].includes(inputType);
          }
          return false;
        }
        function isStructuredTableStop(el) {
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute("role") || "";
          if (!(tag === "table" || role === "table" || role === "grid")) {
            return false;
          }
          return el.querySelectorAll("tr,[role='row']").length > 1;
        }
        function getFocusableTableGroupLabel(el) {
          if (!el || el.tabIndex < 0) {
            return void 0;
          }
          const tables = Array.from(el.querySelectorAll(":scope > table, :scope > [role='table'], :scope > [role='grid']")).filter((child) => child.getAttribute("aria-hidden") !== "true" && isStructuredTableStop(child));
          if (tables.length !== 1) {
            return void 0;
          }
          const nonTableContent = Array.from(el.children).filter((child) => child !== tables[0] && getReadableText(child));
          if (nonTableContent.length > 0) {
            return void 0;
          }
          return tables[0].getAttribute("aria-label") || getReadableText(tables[0].querySelector("caption")) || void 0;
        }
        function getScanRoot(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE) {
            return null;
          }
          const codeBlock = el.closest("pre, code");
          const pre = codeBlock?.tagName.toLowerCase() === "pre" ? codeBlock : codeBlock?.closest("pre");
          if (!pre) {
            return el;
          }
          let current = pre.parentElement;
          while (current && current !== document.body && current !== document.documentElement) {
            const relatedInteractiveDescendant = Array.from(current.querySelectorAll("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], clipboard-copy")).find((node) => !pre.contains(node) && node.getAttribute("aria-hidden") !== "true" && !node.closest("[aria-hidden='true']"));
            if (relatedInteractiveDescendant) {
              return current;
            }
            current = current.parentElement;
          }
          return pre;
        }
        function captureElement(el) {
          if (!el || el === document.body || el === document.documentElement) {
            return null;
          }
          const tag = el.tagName.toLowerCase();
          const rect = el.getBoundingClientRect();
          const closestTable = el.closest("table,[role='table'],[role='grid']");
          function parsePositiveInt(value2) {
            if (!value2)
              return void 0;
            const parsed = Number.parseInt(value2, 10);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : void 0;
          }
          function getElementText(node) {
            return getReadableText(node);
          }
          function getAccessibleText(node) {
            if (!node) {
              return void 0;
            }
            const clone = node.cloneNode(true);
            for (const hiddenNode of Array.from(clone.querySelectorAll("[aria-hidden='true']"))) {
              hiddenNode.remove();
            }
            return getReadableText(clone);
          }
          function getElementAccessibleName(node) {
            if (!node) {
              return void 0;
            }
            const nodeAriaLabel = node.getAttribute("aria-label");
            if (nodeAriaLabel) {
              return nodeAriaLabel;
            }
            const nodeAriaLabelledBy = node.getAttribute("aria-labelledby");
            if (nodeAriaLabelledBy) {
              const text2 = nodeAriaLabelledBy.split(/\s+/).map((id) => {
                const ref = resolveIdRef(id);
                return ref ? getAccessibleText(ref) || "" : "";
              }).filter(Boolean).join(" ");
              if (text2) {
                return text2;
              }
            }
            return getAccessibleText(node);
          }
          function getFormLabelText(labelEl) {
            if (!labelEl) {
              return void 0;
            }
            const clone = labelEl.cloneNode(true);
            for (const node of Array.from(clone.querySelectorAll("input, select, textarea, button, a[href], [role='button'], [role='link'], [aria-hidden='true']"))) {
              node.remove();
            }
            return getReadableText(clone);
          }
          function getNestedImageLabel(node) {
            if (!node) {
              return void 0;
            }
            const candidates = [
              ...node.querySelectorAll("img[alt], [role='img'][aria-label], svg[aria-label]")
            ];
            for (const candidate of candidates) {
              const candidateTag = candidate.tagName.toLowerCase();
              const label = candidate.getAttribute("aria-label") || (candidateTag === "img" ? candidate.getAttribute("alt") : "") || candidate.getAttribute("title");
              const normalized = label?.replace(/\s+/g, " ").trim();
              if (normalized) {
                return normalized;
              }
            }
            return void 0;
          }
          function getAwardsImageStripLinkLabel(node) {
            if (!node || node.tagName?.toLowerCase() !== "a" || !node.hasAttribute("href") || node.getAttribute("aria-label") !== "") {
              return void 0;
            }
            const list = node.querySelector("ul,ol");
            if (!list) {
              return void 0;
            }
            const urlText = Array.from(node.childNodes).filter((child) => child.nodeType === Node.ELEMENT_NODE).map((child) => {
              const childTag = child.tagName.toLowerCase();
              return childTag === "ul" || childTag === "ol" ? "" : getAccessibleText(child) || "";
            }).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
            if (!urlText) {
              return void 0;
            }
            const imageLabels = Array.from(list.querySelectorAll("li img[alt]")).slice(0, 2).map((image, index) => {
              const alt = image.getAttribute("alt")?.replace(/\s+/g, " ").trim();
              if (index === 1) {
                return alt?.replace(/\s+Recommended$/i, "");
              }
              return alt;
            }).filter(Boolean);
            if (!imageLabels.length) {
              return void 0;
            }
            return [urlText, ...imageLabels].join(" ");
          }
          let role = el.getAttribute("role") || "";
          function isIconOnlyLink() {
            if (role !== "link") {
              return false;
            }
            const directText = Array.from(el.childNodes).filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent?.replace(/\s+/g, " ").trim() || "").join(" ").trim();
            if (directText) {
              return false;
            }
            const clone = el.cloneNode(true);
            for (const node of Array.from(clone.querySelectorAll("img, svg, [role='img'], [aria-hidden='true']"))) {
              node.remove();
            }
            return !getReadableText(clone) && Boolean(getNestedImageLabel(el) || el.getAttribute("aria-label") && !isDecorativeGraphicOnlyLabelledLink());
          }
          function isDecorativeGraphicOnlyLabelledLink() {
            if (role !== "link" || !el.getAttribute("aria-label")) {
              return false;
            }
            if (getNestedImageLabel(el)) {
              return false;
            }
            const hasDecorativeGraphic = Boolean(el.querySelector("svg[aria-hidden='true'], img[aria-hidden='true'], [role='img'][aria-hidden='true']"));
            if (!hasDecorativeGraphic) {
              return false;
            }
            const clone = el.cloneNode(true);
            for (const node of Array.from(clone.querySelectorAll("img, svg, [role='img'], [aria-hidden='true']"))) {
              node.remove();
            }
            return !getReadableText(clone);
          }
          function getPriceGuideHeadingFragments() {
            if (!/^h[1-6]$/.test(tag)) {
              return void 0;
            }
            const text2 = getReadableText(el)?.replace(/\s+/g, " ").trim();
            const match = text2?.match(/^(£[\d,.]+(?:\.\d{2})?)\s+(Guide price)$/);
            if (!match) {
              return void 0;
            }
            return [match[1], "space", match[2]];
          }
          function getSemanticListContext(node) {
            let listItem = node?.nodeType === Node.ELEMENT_NODE ? node : null;
            while (listItem && !isSemanticListItemElement(listItem)) {
              listItem = listItem.parentElement;
            }
            if (!listItem) {
              return {
                listItem: null,
                list: null,
                siblings: [],
                usesExplicitRoleListItem: false
              };
            }
            const list = listItem.parentElement;
            const siblings = list ? Array.from(list.children).filter((child) => isSemanticListItemElement(child)) : [];
            return {
              listItem,
              list,
              siblings,
              usesExplicitRoleListItem: listItem.tagName.toLowerCase() !== "li"
            };
          }
          function getCollectionPosition() {
            if (role === "paragraph") {
              const { listItem, list, siblings, usesExplicitRoleListItem } = getSemanticListContext(el);
              if (listItem && list && !usesExplicitRoleListItem && !listItem.querySelector("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']")) {
                const leadParagraph = Array.from(listItem.querySelectorAll("p, blockquote")).find((child) => getReadableText(child));
                if (leadParagraph === el) {
                  const index = siblings.indexOf(listItem);
                  return index >= 0 ? index + 1 : void 0;
                }
              }
            }
            if (role === "term") {
              const definitionList = el.parentElement?.tagName.toLowerCase() === "dl" ? el.parentElement : null;
              if (definitionList) {
                const siblings = Array.from(definitionList.children).filter((child) => child.tagName.toLowerCase() === "dt");
                const index = siblings.indexOf(el);
                return index >= 0 ? index + 1 : void 0;
              }
            }
            if (role === "listitem" || role === "group") {
              const { listItem, siblings, usesExplicitRoleListItem } = getSemanticListContext(el);
              if (role === "group" && usesExplicitRoleListItem) {
                return void 0;
              }
              const index = siblings.indexOf(listItem);
              return index >= 0 ? index + 1 : void 0;
            }
            if (role === "listbox" && tag === "select") {
              return el.selectedIndex >= 0 ? el.selectedIndex + 1 : void 0;
            }
            if (role === "tab") {
              const tablist = el.closest("[role='tablist']");
              const siblings = Array.from(tablist?.querySelectorAll("[role='tab']") || []);
              const index = siblings.indexOf(el);
              return index >= 0 ? index + 1 : void 0;
            }
            if (role === "progressbar") {
              const siblings = Array.from(el.parentElement?.children || []).filter((child) => child.getAttribute("role") === "progressbar");
              const index = siblings.indexOf(el);
              return index >= 0 ? index + 1 : void 0;
            }
            if (role === "link") {
              const railCardPosition = getImageCardRailPosition();
              if (railCardPosition) {
                return railCardPosition.position;
              }
              const directListItem = el.parentElement?.tagName.toLowerCase() === "li" ? el.parentElement : null;
              const directList = directListItem?.parentElement;
              if (directListItem && directList) {
                const siblings = Array.from(directList.children).filter((child) => child.tagName.toLowerCase() === "li");
                const index = siblings.indexOf(directListItem);
                return index >= 0 ? index + 1 : void 0;
              }
            }
            if (role === "heading" && (headingButton || headingLink)) {
              const listItem = el.closest("li");
              const list = listItem?.parentElement;
              if (listItem && list) {
                const siblings = Array.from(list.children).filter((child) => child.tagName.toLowerCase() === "li");
                const index = siblings.indexOf(listItem);
                return index >= 0 ? index + 1 : void 0;
              }
            }
            if (role === "option") {
              const siblings = Array.from(el.parentElement?.children || []).filter((child) => (child.getAttribute("role") || "") === "option");
              const index = siblings.indexOf(el);
              return index >= 0 ? index + 1 : void 0;
            }
            if (role === "button" && isStandaloneListItemButton()) {
              const listItem = el.closest("li");
              const list = listItem?.parentElement;
              if (listItem && list) {
                const siblings = Array.from(list.children).filter((child) => child.tagName.toLowerCase() === "li");
                const index = siblings.indexOf(listItem);
                return index >= 0 ? index + 1 : void 0;
              }
            }
            if (role === "button") {
              const definitionList = el.closest("dl");
              const definitionDescription = el.closest("dd");
              if (definitionList && definitionDescription) {
                const siblings = Array.from(definitionList.children).filter((child) => {
                  if (!["dt", "dd"].includes(child.tagName.toLowerCase())) {
                    return false;
                  }
                  const style = getComputedStyle(child);
                  return style.display !== "none" && style.visibility !== "hidden";
                });
                const index = siblings.indexOf(definitionDescription);
                return index >= 0 ? index + 1 : void 0;
              }
            }
            if (role === "image" && tag === "img") {
              const { listItem, list, siblings, usesExplicitRoleListItem } = getSemanticListContext(el);
              if (listItem && list && !usesExplicitRoleListItem) {
                const index = siblings.indexOf(listItem);
                return index >= 0 ? index + 1 : void 0;
              }
            }
            return void 0;
          }
          function getTextExcludingInteractiveContent() {
            function isEmbeddedStop(node) {
              if (!node || node.nodeType !== Node.ELEMENT_NODE) {
                return false;
              }
              const nodeTag = node.tagName.toLowerCase();
              const nodeRole = node.getAttribute("role") || "";
              return nodeTag === "button" || nodeTag === "a" && node.hasAttribute("href") || nodeTag === "input" && node.type !== "hidden" || nodeTag === "select" || nodeTag === "textarea" || ["ul", "ol", "dl"].includes(nodeTag) || ["button", "link", "list"].includes(nodeRole);
            }
            function collectLeadingText(node) {
              if (!node) {
                return { parts: [], stopped: false };
              }
              if (node.nodeType === Node.TEXT_NODE) {
                const value2 = node.textContent?.replace(/\s+/g, " ").trim();
                return { parts: value2 ? [value2] : [], stopped: false };
              }
              if (node.nodeType !== Node.ELEMENT_NODE) {
                return { parts: [], stopped: false };
              }
              if (isEmbeddedStop(node)) {
                return { parts: [], stopped: true };
              }
              if (node.getAttribute("aria-hidden") === "true" || hasRenderedHiddenMarker(node)) {
                return { parts: [], stopped: false };
              }
              const parts = [];
              for (const child of Array.from(node.childNodes)) {
                const result = collectLeadingText(child);
                parts.push(...result.parts);
                if (result.stopped) {
                  return { parts, stopped: true };
                }
              }
              return { parts, stopped: false };
            }
            const text2 = collectLeadingText(el).parts.join(" ").replace(/\s+([.,;:!?])/g, "$1").replace(/\s+/g, " ").trim();
            return text2 || void 0;
          }
          function isStandaloneListItemButton() {
            if (role !== "button") {
              return false;
            }
            const listItem = el.closest("li");
            if (!listItem) {
              return false;
            }
            const interactiveDescendants = Array.from(listItem.querySelectorAll("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']")).filter((node) => node.getAttribute("aria-hidden") !== "true" && !node.closest("[aria-hidden='true']"));
            if (interactiveDescendants.length !== 1 || interactiveDescendants[0] !== el) {
              return false;
            }
            const clone = listItem.cloneNode(true);
            for (const node of Array.from(clone.querySelectorAll("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], [aria-hidden='true']"))) {
              node.remove();
            }
            return !getReadableText(clone);
          }
          function getImageCardRailPosition() {
            if (role !== "link") {
              return void 0;
            }
            if (!isImageCardRailListItem(el.closest("li"))) {
              return void 0;
            }
            const listItem = el.closest("li");
            const list = listItem?.parentElement;
            if (!list) {
              return void 0;
            }
            const siblings = Array.from(list.children).filter((child) => isSemanticListItemElement(child));
            const index = siblings.indexOf(listItem);
            if (index < 0) {
              return void 0;
            }
            return {
              position: index + 2,
              size: siblings.length + 2
            };
          }
          function hasInteractiveDescendants() {
            return Boolean(el.querySelector("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']"));
          }
          function getHeadingButton() {
            if (!/^h[1-6]$/.test(tag)) {
              return null;
            }
            const buttons = Array.from(el.querySelectorAll(":scope > button, :scope > [role='button'], :scope button, :scope [role='button']"));
            return buttons.length === 1 ? buttons[0] : null;
          }
          function getHeadingLink() {
            if (!/^h[1-6]$/.test(tag)) {
              return null;
            }
            const links = Array.from(el.querySelectorAll(":scope > a[href]"));
            return links.length === 1 ? links[0] : null;
          }
          function hasRawMarkupText(value2) {
            return /<\/?[a-z][\s\S]*>/i.test(value2 || "");
          }
          function hasGroupedVisibleLinkBody(node) {
            if (!node || node.tagName?.toLowerCase() !== "a") {
              return false;
            }
            return Array.from(node.children).some((child) => {
              if ((child.getAttribute("role") || "") !== "group") {
                return false;
              }
              if (child.getAttribute("aria-hidden") === "true" || child.closest("[aria-hidden='true']")) {
                return false;
              }
              return Boolean(getReadableText(child));
            });
          }
          function isGroupedLinkBody() {
            const parentLink = el.parentElement;
            if (!parentLink || parentLink.tagName.toLowerCase() !== "a" || !parentLink.hasAttribute("href")) {
              return false;
            }
            return (el.getAttribute("role") || "") === "group" && hasRawMarkupText(parentLink.getAttribute("aria-label")) && hasGroupedVisibleLinkBody(parentLink);
          }
          function getFragmentedHeadingText() {
            if (!/^h[1-6]$/.test(tag) || !el.querySelector("br")) {
              return void 0;
            }
            if (el.querySelector("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']")) {
              return void 0;
            }
            const fragments = [];
            let textBuffer = "";
            function pushText(value2) {
              const normalized = value2?.replace(/\s+/g, " ").trim();
              if (normalized) {
                fragments.push(normalized);
              }
            }
            function flushTextBuffer() {
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
            return fragments.length > 1 ? fragments : void 0;
          }
          function resolveIdRef(id) {
            if (!id) {
              return null;
            }
            const selectors = `#${CSS.escape(id)}`;
            const scopedContainers = [];
            for (let current2 = el.parentElement; current2; current2 = current2.parentElement) {
              scopedContainers.push(current2);
            }
            const prioritizedContainers = [
              el.closest("li"),
              el.closest("dd"),
              el.closest("dl"),
              el.closest("[role='region']"),
              ...scopedContainers
            ].filter(Boolean);
            const seenContainers = /* @__PURE__ */ new Set();
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
          function resolveIdRefs(attributeName) {
            const value2 = el.getAttribute(attributeName);
            if (!value2) {
              return void 0;
            }
            const text2 = value2.split(/\s+/).map((id) => {
              const ref = resolveIdRef(id);
              return ref ? getReadableText(ref) || "" : "";
            }).filter(Boolean).join(" ");
            return text2 || void 0;
          }
          function parseInvalidValue(value2) {
            if (!value2 || value2 === "false") {
              return void 0;
            }
            return value2 === "true" ? true : value2;
          }
          function normalizeHasPopup(value2) {
            if (!value2 || value2 === "false") {
              return void 0;
            }
            return value2 === "true" ? "menu" : value2;
          }
          function isAccessibleTableNode(node) {
            if (!node) {
              return false;
            }
            if (node.getAttribute("aria-hidden") === "true") {
              return false;
            }
            return !node.closest("[aria-hidden='true']");
          }
          function getRowIndex(row) {
            if (!row || !closestTable)
              return void 0;
            const rows = Array.from(closestTable.querySelectorAll("tr,[role='row']")).filter((child) => {
              const childRole = child.getAttribute("role");
              const childTag = child.tagName.toLowerCase();
              return (childRole === "row" || childTag === "tr") && isAccessibleTableNode(child);
            });
            const index = rows.indexOf(row);
            return index >= 0 ? index + 1 : void 0;
          }
          function getBodyRowIndex(row) {
            if (!row)
              return void 0;
            const rowGroup = row.closest("tbody");
            if (!rowGroup) {
              return void 0;
            }
            const rows = Array.from(rowGroup.querySelectorAll(":scope > tr,[role='row']")).filter((child) => isAccessibleTableNode(child));
            const index = rows.indexOf(row);
            return index >= 0 ? index + 1 : void 0;
          }
          function getColumnHeaderText(columnNumber) {
            if (!closestTable || !columnNumber) {
              return void 0;
            }
            const headerRow = closestTable.querySelector("thead:not([aria-hidden='true']) tr,[role='row'], tr:not([aria-hidden='true']),[role='row']");
            if (!headerRow) {
              return void 0;
            }
            const headerCells = Array.from(headerRow.children).filter((child) => {
              const childRole = child.getAttribute("role") || "";
              const childTag = child.tagName.toLowerCase();
              return childTag === "th" || ["columnheader", "rowheader"].includes(childRole);
            });
            const headerCell = headerCells[columnNumber - 1];
            return headerCell ? getAccessibleText(headerCell) || void 0 : void 0;
          }
          function getColumnIndex(row) {
            if (!row)
              return void 0;
            const cells = Array.from(row.children).filter((child) => {
              const childRole = child.getAttribute("role") || "";
              const childTag = child.tagName.toLowerCase();
              return childTag === "td" || childTag === "th" || ["cell", "gridcell", "rowheader", "columnheader"].includes(childRole);
            });
            const index = cells.indexOf(el);
            return index >= 0 ? index + 1 : void 0;
          }
          function getTableMetadata() {
            if (!closestTable) {
              return {
                rowCount: void 0,
                columnCount: void 0,
                tableLabel: void 0,
                tableRole: void 0
              };
            }
            const rows = Array.from(closestTable.querySelectorAll("tr,[role='row']")).filter((row) => isAccessibleTableNode(row));
            const firstRow = rows[0];
            const columns = firstRow ? firstRow.querySelectorAll("th,td,[role='cell'],[role='gridcell'],[role='columnheader'],[role='rowheader']").length : 0;
            return {
              rowCount: rows.length || void 0,
              columnCount: columns || void 0,
              tableLabel: closestTable.getAttribute("aria-label") || getElementText(closestTable.querySelector("caption")) || void 0,
              tableRole: closestTable.getAttribute("role") || (closestTable.tagName.toLowerCase() === "table" ? "table" : void 0)
            };
          }
          const focusableTableGroupLabel = getFocusableTableGroupLabel(el);
          if (role === "img") {
            role = "image";
          }
          if (!role) {
            if (/^h[1-6]$/.test(tag))
              role = "heading";
            else if (tag === "button" || tag === "input" && el.type === "submit")
              role = "button";
            else if (tag === "a" && el.hasAttribute("href"))
              role = "link";
            else if (tag === "select")
              role = "combobox";
            else if (tag === "input") {
              const t = el.type;
              if (t === "checkbox")
                role = "checkbox";
              else if (t === "radio")
                role = "radio";
              else if (t === "search")
                role = "searchbox";
              else
                role = "textbox";
            } else if (tag === "textarea")
              role = "textbox";
            else if (tag === "header")
              role = "banner";
            else if (tag === "nav")
              role = "navigation";
            else if (tag === "main")
              role = "main";
            else if (tag === "footer")
              role = "contentinfo";
            else if (tag === "aside")
              role = "complementary";
            else if (tag === "dl")
              role = "list";
            else if (tag === "dt")
              role = "term";
            else if (["div", "form"].includes(tag) && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")))
              role = "group";
            else if (hasImplicitTitledGroupRole(el))
              role = "group";
            else if (["div", "section"].includes(tag) && focusableTableGroupLabel)
              role = "group";
            else if (tag === "section" && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")))
              role = "region";
            else if (el.getAttribute("aria-live") === "assertive")
              role = "alert";
            else if (el.getAttribute("aria-live") === "polite")
              role = "status";
            else if (tag === "label" && hasStandaloneLabelStop(el))
              role = "paragraph";
            else if (tag === "p" || tag === "blockquote" || hasStandaloneTextStop(el))
              role = "paragraph";
            else if (tag === "li") {
              const childImage = el.querySelector("img[alt]");
              role = el.tabIndex >= 0 && childImage ? "group" : "listitem";
            } else if (tag === "ul" || tag === "ol")
              role = "list";
            else if (tag === "table")
              role = "table";
            else if (tag === "tr")
              role = "row";
            else if (tag === "th") {
              const scope = el.getAttribute("scope");
              const rowElement2 = el.closest("tr,[role='row']");
              const headerRowGroup = el.closest("thead,tbody,tfoot");
              const hasDataCellSibling = Boolean(rowElement2?.querySelector("td,[role='cell'],[role='gridcell']"));
              const hasExplicitHeaderSection = Boolean(closestTable?.querySelector("thead"));
              if (scope === "row") {
                role = "rowheader";
              } else if (scope === "col") {
                role = "columnheader";
              } else if (headerRowGroup?.tagName.toLowerCase() === "tbody" && (hasDataCellSibling || hasExplicitHeaderSection)) {
                role = "rowheader";
              } else {
                role = "columnheader";
              }
            } else if (tag === "td")
              role = "cell";
            else if (tag === "img")
              role = "image";
            else if (tag === "dialog")
              role = "dialog";
            else
              role = "";
          }
          let name;
          const ariaLabel = el.getAttribute("aria-label");
          const ariaLabelledBy = el.getAttribute("aria-labelledby");
          if (ariaLabel) {
            name = ariaLabel;
          } else if (ariaLabelledBy) {
            name = ariaLabelledBy.split(/\s+/).map((id) => {
              const ref = resolveIdRef(id);
              return ref ? getAccessibleText(ref) || "" : "";
            }).filter(Boolean).join(" ");
          } else if ("labels" in el && el.labels && el.labels.length) {
            name = getFormLabelText(el.labels[0]) || void 0;
          } else if (tag === "select" || tag === "textarea" || tag === "input") {
            const id = el.getAttribute("id");
            if (id) {
              const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
              if (lbl)
                name = getFormLabelText(lbl) || void 0;
            }
          }
          if (!name) {
            name = el.getAttribute("alt") || void 0;
            if (!name && role !== "button") {
              name = el.getAttribute("title") || void 0;
            }
          }
          if (!name && role === "link") {
            name = getAwardsImageStripLinkLabel(el) || getNestedImageLabel(el) || el.getAttribute("aria-label") || void 0;
          }
          if (!name && (role === "group" || role === "listitem")) {
            const childImage = el.querySelector("img[alt]");
            if (childImage) {
              name = childImage.getAttribute("alt") || void 0;
            }
          }
          if (!name && role === "paragraph" && tag === "label") {
            name = getStandaloneLabelText(el) || getReadableText(el);
          }
          if (!name && role === "group" && focusableTableGroupLabel) {
            name = focusableTableGroupLabel;
          }
          if (!name && ["paragraph", "listitem", "blockquote"].includes(role)) {
            name = getTextExcludingInteractiveContent() || getAccessibleText(el)?.slice(0, 200) || void 0;
          }
          if (!name && [
            "button",
            "link",
            "heading",
            "menuitem",
            "tab",
            "cell",
            "gridcell",
            "rowheader",
            "columnheader"
          ].includes(role)) {
            name = getAccessibleText(el)?.slice(0, 200) || void 0;
          }
          if (!name && role === "button") {
            name = el.getAttribute("title") || void 0;
          }
          if (role === "listitem") {
            name = getTextExcludingInteractiveContent();
          }
          const text = getReadableText(el);
          const description = el.getAttribute("aria-description") || void 0;
          const details = resolveIdRefs("aria-describedby");
          const errorMessage = resolveIdRefs("aria-errormessage");
          let roleDescription = el.getAttribute("aria-roledescription") || void 0;
          if (role === "list" && tag === "dl") {
            roleDescription = "definition list";
          }
          if (role === "button" && el.hasAttribute("aria-pressed")) {
            roleDescription = "toggle button";
          }
          let value;
          if ("value" in el) {
            const v = el.value;
            if (v)
              value = v;
          }
          if (role === "combobox" && tag === "select") {
            value = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : void 0;
          }
          if (role === "listbox" && tag === "select") {
            value = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : void 0;
          }
          let valueText = el.getAttribute("aria-valuetext") || void 0;
          if (role === "progressbar" && !valueText) {
            const valueNow = Number.parseFloat(el.getAttribute("aria-valuenow") || "");
            const valueMin = Number.parseFloat(el.getAttribute("aria-valuemin") || "0");
            const valueMax = Number.parseFloat(el.getAttribute("aria-valuemax") || "100");
            if (Number.isFinite(valueNow) && Number.isFinite(valueMin) && Number.isFinite(valueMax) && valueMax > valueMin) {
              const percent = Math.round((valueNow - valueMin) / (valueMax - valueMin) * 100);
              valueText = `${percent}%`;
            }
          }
          let level;
          if (/^h[1-6]$/.test(tag))
            level = parseInt(tag[1], 10);
          const ariaLevel = el.getAttribute("aria-level");
          if (ariaLevel)
            level = parseInt(ariaLevel, 10);
          if (role === "list" && !level) {
            let current2 = el.parentElement;
            let depth = 1;
            while (current2) {
              if (["ul", "ol", "dl"].includes(current2.tagName?.toLowerCase()) || current2.getAttribute?.("role") === "list") {
                depth += 1;
              }
              current2 = current2.parentElement;
            }
            level = depth > 1 ? depth : void 0;
          }
          const headingButton = getHeadingButton();
          const headingLink = getHeadingLink();
          const headingFragments = role === "heading" && !headingButton && !headingLink ? getFragmentedHeadingText() || getPriceGuideHeadingFragments() : void 0;
          const inferredSetSize = role === "list" ? (tag === "dl" ? Array.from(el.children).filter((child) => {
            const childTag = child.tagName.toLowerCase();
            if (!["dt", "dd"].includes(childTag)) {
              return false;
            }
            const style = getComputedStyle(child);
            return style.display !== "none" && style.visibility !== "hidden";
          }).length : Array.from(el.children).filter((child) => {
            const childTag = child.tagName.toLowerCase();
            const childRole = child.getAttribute("role") || "";
            return childRole === "listitem" || childTag === "li" && (!childRole || childRole === "listitem");
          }).length) || void 0 : role === "term" ? Array.from(el.parentElement?.children || []).filter((child) => child.tagName.toLowerCase() === "dt").length || void 0 : role === "tab" ? Array.from(el.closest("[role='tablist']")?.querySelectorAll("[role='tab']") || []).length || void 0 : role === "progressbar" ? Array.from(el.parentElement?.children || []).filter((child) => child.getAttribute("role") === "progressbar").length || void 0 : role === "listbox" && tag === "select" ? el.options?.length || void 0 : role === "listitem" ? Array.from(el.parentElement?.children || []).filter((child) => isSemanticListItemElement(child)).length || void 0 : role === "heading" && (headingButton || headingLink) ? Array.from(el.closest("li")?.parentElement?.children || []).filter((child) => child.tagName.toLowerCase() === "li").length || void 0 : role === "button" && isStandaloneListItemButton() ? Array.from(el.closest("li")?.parentElement?.children || []).filter((child) => child.tagName.toLowerCase() === "li").length || void 0 : role === "button" && el.closest("dd") && el.closest("dl") ? Array.from(el.closest("dl")?.children || []).filter((child) => {
            if (!["dt", "dd"].includes(child.tagName.toLowerCase())) {
              return false;
            }
            const style = getComputedStyle(child);
            return style.display !== "none" && style.visibility !== "hidden";
          }).length || void 0 : role === "option" ? Array.from(el.parentElement?.children || []).filter((child) => (child.getAttribute("role") || "") === "option").length || void 0 : role === "image" && tag === "img" ? (() => {
            const { siblings, usesExplicitRoleListItem } = getSemanticListContext(el);
            return usesExplicitRoleListItem ? void 0 : siblings.length || void 0;
          })() : role === "link" ? getImageCardRailPosition()?.size || Array.from(el.closest("li")?.parentElement?.children || []).filter((child) => child.tagName.toLowerCase() === "li").length || void 0 : role === "group" ? (() => {
            const { siblings, usesExplicitRoleListItem } = getSemanticListContext(el);
            return usesExplicitRoleListItem ? void 0 : siblings.length || void 0;
          })() : role === "paragraph" ? (() => {
            const { siblings, usesExplicitRoleListItem } = getSemanticListContext(el);
            return usesExplicitRoleListItem ? void 0 : siblings.length || void 0;
          })() : void 0;
          const setSize = parsePositiveInt(el.getAttribute("aria-setsize")) || inferredSetSize;
          const positionInSet = parsePositiveInt(el.getAttribute("aria-posinset")) || getCollectionPosition();
          const parentListItem = role === "list" ? el.parentElement?.closest("li,[role='listitem']") : null;
          const firstNestedListForParent = parentListItem ? Array.from(parentListItem.querySelectorAll("ul, ol, dl, [role='list']")).find((list) => list.closest("li,[role='listitem']") === parentListItem) : null;
          const parentListItemHasLeadingText = Boolean(parentListItem && Array.from(parentListItem.childNodes).some((child) => {
            if (child === el || child.contains?.(el)) {
              return false;
            }
            if (child.nodeType === Node.TEXT_NODE) {
              return Boolean(child.textContent?.replace(/\s+/g, " ").trim());
            }
            if (child.nodeType !== Node.ELEMENT_NODE) {
              return false;
            }
            if (child.getAttribute("aria-hidden") === "true" || hasRenderedHiddenMarker(child)) {
              return false;
            }
            const childTag = child.tagName.toLowerCase();
            const childRole = child.getAttribute("role") || "";
            if (childTag === "button" || childTag === "a" && child.hasAttribute("href") || ["button", "link"].includes(childRole)) {
              return false;
            }
            return Boolean(getReadableText(child));
          }));
          const parentList = parentListItem?.parentElement;
          const parentSiblings = parentListItem && parentList ? Array.from(parentList.children).filter((child) => isSemanticListItemElement(child)) : [];
          const parentPositionInSet = parentListItem && parentSiblings.length && !parentListItemHasLeadingText && firstNestedListForParent === el ? parentSiblings.indexOf(parentListItem) + 1 || void 0 : void 0;
          const parentSetSize = parentPositionInSet ? parentSiblings.length || void 0 : void 0;
          const rowElement = el.closest("tr,[role='row']");
          const rowIndex = parsePositiveInt(el.getAttribute("aria-rowindex")) || (role === "rowheader" && !getColumnHeaderText(1) ? getRowIndex(rowElement) : void 0) || (role === "rowheader" ? getBodyRowIndex(rowElement) : void 0) || getRowIndex(rowElement);
          const columnIndex = parsePositiveInt(el.getAttribute("aria-colindex")) || getColumnIndex(rowElement);
          const rowSpan = parsePositiveInt(el.getAttribute("aria-rowspan")) || parsePositiveInt(el.getAttribute("rowspan"));
          const columnSpan = parsePositiveInt(el.getAttribute("aria-colspan")) || parsePositiveInt(el.getAttribute("colspan"));
          const { rowCount, columnCount, tableLabel, tableRole } = getTableMetadata();
          const columnHeaderText = getColumnHeaderText(columnIndex);
          const placeholder = el.getAttribute("placeholder") || void 0;
          const required = el.getAttribute("aria-required") === "true" || el.required === true;
          const invalid = parseInvalidValue(el.getAttribute("aria-invalid"));
          let checked;
          if (role === "checkbox" || role === "radio" || role === "switch" || el.type === "checkbox" || el.type === "radio") {
            const ac = el.getAttribute("aria-checked");
            if (ac === "mixed")
              checked = "mixed";
            else
              checked = !!el.checked;
          }
          const expanded = el.hasAttribute("aria-expanded") ? el.getAttribute("aria-expanded") === "true" : void 0;
          const selected = el.hasAttribute("aria-selected") ? el.getAttribute("aria-selected") === "true" : void 0;
          const pressed = el.hasAttribute("aria-pressed") ? el.getAttribute("aria-pressed") === "mixed" ? "mixed" : el.getAttribute("aria-pressed") === "true" : void 0;
          const disabled = el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true";
          const readOnly = el.getAttribute("aria-readonly") === "true" || el.readOnly === true ? true : void 0;
          const current = el.hasAttribute("aria-current") ? el.getAttribute("aria-current") === "true" ? true : el.getAttribute("aria-current") || void 0 : void 0;
          const hasPopup = normalizeHasPopup(el.getAttribute("aria-haspopup"));
          const autocomplete = el.getAttribute("aria-autocomplete") || void 0;
          const live = el.getAttribute("aria-live") || void 0;
          const atomic = el.getAttribute("aria-atomic") === "true" ? true : void 0;
          const relevant = el.getAttribute("aria-relevant") || void 0;
          const busy = el.getAttribute("aria-busy") === "true" ? true : void 0;
          const controls = el.getAttribute("aria-controls") || void 0;
          const modal = el.getAttribute("aria-modal") === "true" ? true : void 0;
          const sort = el.getAttribute("aria-sort") || void 0;
          const selectedCount = role === "listbox" ? tag === "select" ? el.selectedOptions?.length || void 0 : Array.from(el.querySelectorAll("[role='option'][aria-selected='true']")).length || void 0 : void 0;
          const combinedExpanded = expanded ?? (headingButton?.hasAttribute("aria-expanded") ? headingButton.getAttribute("aria-expanded") === "true" : void 0);
          const combinedName = role === "heading" && headingLink ? getElementAccessibleName(headingLink)?.slice(0, 200) || name : name || (headingButton ? getAccessibleText(headingButton)?.slice(0, 200) || void 0 : headingLink ? getElementAccessibleName(headingLink)?.slice(0, 200) || void 0 : void 0);
          const effectiveRole = role === "region" && isCarouselContainer(el) ? "group" : role === "text" && isNamedInlineMetadataText(el) ? "group" : role === "group" && isSingleReadableTextGroup(el) ? "text" : role;
          const effectiveName = isCarouselContainer(el) || isFocusableCarouselSlideGroup(el) || isGroupedLinkBody() ? void 0 : effectiveRole === "text" ? text || combinedName : combinedName;
          const effectiveText = isCarouselContainer(el) || isFocusableCarouselSlideGroup(el) || isGroupedLinkBody() ? void 0 : text;
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
            parentSetSize,
            parentPositionInSet,
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
            required: required || void 0,
            invalid,
            checked,
            expanded: combinedExpanded,
            selected,
            pressed,
            disabled: disabled || void 0,
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
            nativeSelect: tag === "select" ? true : void 0,
            headingButton: Boolean(headingButton) || void 0,
            headingLink: Boolean(headingLink) || void 0,
            iconOnlyLink: isIconOnlyLink() || void 0,
            linkRoleFirst: role === "link" && (Boolean(getAwardsImageStripLinkLabel(el)) || isDecorativeGraphicOnlyLabelledLink() || hasRawMarkupText(ariaLabel) && hasGroupedVisibleLinkBody(el) || isParagraphOnlyLinkText(el.parentElement)) ? true : void 0,
            suppressContextEnd: isGroupedLinkBody() ? true : void 0,
            groupContext: role === "button" && el.parentElement?.tagName.toLowerCase() === "li" && !isStandaloneListItemButton() || Boolean(headingButton) ? true : void 0,
            boundingBox: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          };
        }
        const STOP_TAGS = /* @__PURE__ */ new Set([
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
          "caption"
        ]);
        const STOP_ROLES = /* @__PURE__ */ new Set([
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
          "separator"
        ]);
        const CONTEXT_ROLES = /* @__PURE__ */ new Set([
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
          "listbox"
        ]);
        const CONTEXT_TAGS = /* @__PURE__ */ new Set(["ul", "ol", "dl"]);
        const INLINE_TEXT_TAGS = /* @__PURE__ */ new Set([
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
          "br"
        ]);
        function hasProgressbarDescendants(node) {
          if (!node) {
            return false;
          }
          if (node.getAttribute?.("role") === "progressbar") {
            return true;
          }
          return Boolean(node.querySelector("[role='progressbar']"));
        }
        function isPresentationalRole(role) {
          return role === "presentation" || role === "none";
        }
        function isSemanticListItemElement(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE) {
            return false;
          }
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute("role") || "";
          return role === "listitem" || tag === "li" && (!role || role === "listitem");
        }
        function hasImplicitTitledGroupRole(el) {
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
          if (el.querySelector("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']")) {
            return false;
          }
          return Boolean(getReadableText(el));
        }
        function getSyntheticTextDescriptor(el, descriptor) {
          if (descriptor?.role === "group" && isNamedInlineMetadataText(el) && getReadableText(el)) {
            return {
              role: "text",
              name: getReadableText(el)
            };
          }
          if (!descriptor || descriptor.role !== "group" || !hasImplicitTitledGroupRole(el)) {
            return null;
          }
          if (Array.from(el.children).some((child) => isStopElement(child))) {
            return null;
          }
          const directText = Array.from(el.childNodes).filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent?.replace(/\s+/g, " ").trim() || "").filter(Boolean).join(" ").trim();
          if (!directText) {
            return null;
          }
          return {
            role: "paragraph",
            name: directText
          };
        }
        function hasStandaloneTextStop(el) {
          const tag = el.tagName.toLowerCase();
          if (!["div", "span", "pre"].includes(tag))
            return false;
          const blockingAncestor = el.closest("h1, h2, h3, h4, h5, h6, button, a, label, li, p, blockquote, td, th, caption");
          if (blockingAncestor) {
            const containingRegion = el.closest("[role='region']");
            const containingListItem = el.closest("li");
            const imageListItemAllowsText = blockingAncestor.tagName?.toLowerCase() === "li" && containingListItem && !containingListItem.querySelector("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']") && Boolean(containingListItem.querySelector("img[alt]"));
            const progressListItemAllowsText = blockingAncestor.tagName?.toLowerCase() === "li" && containingListItem && hasProgressbarDescendants(containingListItem);
            const imageCardRailAllowsText = blockingAncestor.tagName?.toLowerCase() === "li" && isImageCardRailListItem(containingListItem);
            const listItemAllowsText = imageListItemAllowsText || progressListItemAllowsText || imageCardRailAllowsText;
            const regionAllowsText = blockingAncestor.tagName?.toLowerCase() === "li" && containingRegion && containingRegion.contains(el);
            if (!regionAllowsText && !listItemAllowsText) {
              return false;
            }
            if (imageListItemAllowsText && tag === "div" && Array.from(el.children).some((child) => getReadableText(child) || child.children.length > 0)) {
              return false;
            }
          }
          const text = getReadableText(el);
          if (!text)
            return false;
          for (const child of Array.from(el.children)) {
            const childTag = child.tagName.toLowerCase();
            const childRole = child.getAttribute("role") || "";
            if (STOP_TAGS.has(childTag) || STOP_ROLES.has(childRole) || childTag === "a" && child.hasAttribute("href") || childTag === "input" && child.type !== "hidden" || childTag === "img" && child.getAttribute("alt")) {
              return false;
            }
            if (!INLINE_TEXT_TAGS.has(childTag)) {
              return false;
            }
          }
          if (tag === "div" && Array.from(el.children).filter((child) => getReadableText(child)).length > 1) {
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
        function isImageCardRailListItem(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE) {
            return false;
          }
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute("role") || "";
          if (!isSemanticListItemElement(el) || tag !== "li" && role !== "listitem") {
            return false;
          }
          const interactiveDescendants = Array.from(el.querySelectorAll("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']")).filter((node) => node.getAttribute("aria-hidden") !== "true" && !node.closest("[aria-hidden='true']"));
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
          for (const node of Array.from(clone.querySelectorAll("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], [aria-hidden='true']"))) {
            node.remove();
          }
          return Boolean(getReadableText(clone));
        }
        function isTransparentListWrapperGroup(el) {
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
          const listChildren = Array.from(el.children).filter((child) => {
            const childTag = child.tagName.toLowerCase();
            const childRole = child.getAttribute("role") || "";
            return childTag === "ul" || childTag === "ol" || childRole === "list";
          });
          if (listChildren.length !== 1) {
            return false;
          }
          const clone = el.cloneNode(true);
          for (const list of Array.from(clone.querySelectorAll(":scope > ul, :scope > ol, :scope > [role='list']"))) {
            list.remove();
          }
          return !getReadableText(clone);
        }
        function isInlineTextOnlyGroup(el) {
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
          const hasVisibleBlockingDescendant = Array.from(el.querySelectorAll("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], img[alt], [role='img'], table, [role='table'], [role='grid']")).some((node) => node.getAttribute("aria-hidden") !== "true" && !node.closest("[aria-hidden='true']"));
          if (hasVisibleBlockingDescendant) {
            return false;
          }
          const children = Array.from(el.children);
          if (!children.length) {
            return false;
          }
          const hasOnlyInlineTextChildren = children.every((child) => {
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
        function isSingleTextChildGroup(el) {
          if (!isInlineTextOnlyGroup(el)) {
            return false;
          }
          const visibleTextChildren = Array.from(el.children).filter((child) => child.getAttribute("aria-hidden") !== "true" && Boolean(getReadableText(child)));
          return visibleTextChildren.length === 1;
        }
        function isNamedInlineMetadataText(el) {
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
          return parent?.getAttribute("role") === "group" && !parent.getAttribute("aria-label") && !parent.getAttribute("aria-labelledby");
        }
        function isSingleReadableTextGroup(el) {
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
          const blockingDescendants = Array.from(el.querySelectorAll("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], img[alt], [role='img'], table, [role='table'], [role='grid']")).filter((node) => node.getAttribute("aria-hidden") !== "true" && !node.closest("[aria-hidden='true']"));
          if (blockingDescendants.length > 0) {
            return false;
          }
          const textContainers = Array.from(el.querySelectorAll("*")).filter((node) => {
            if (node.getAttribute("aria-hidden") === "true" || node.closest("[aria-hidden='true']")) {
              return false;
            }
            if (!getReadableText(node)) {
              return false;
            }
            return !Array.from(node.children).some((child) => getReadableText(child));
          });
          return textContainers.length === 1 && Boolean(getReadableText(el));
        }
        function isCarouselContainer(el) {
          return el?.nodeType === Node.ELEMENT_NODE && (el.getAttribute("aria-roledescription") || "").toLowerCase() === "carousel";
        }
        function isInsideCarousel(el) {
          for (let current = el?.parentElement; current; current = current.parentElement) {
            if (isCarouselContainer(current)) {
              return true;
            }
          }
          return false;
        }
        function isFocusableCarouselSlideGroup(el) {
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
        function removeCollapsedPopupContentFromClone(sourceEl, cloneEl) {
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
        function isStopElement(el) {
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute("role") || "";
          const hasImplicitGroupRole = !role && ["div", "form"].includes(tag) && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"));
          if (tag === "button" || role === "button") {
            const headingParent = el.closest("h1, h2, h3, h4, h5, h6");
            if (headingParent) {
              const headingButtons = headingParent.querySelectorAll(":scope > button, :scope > [role='button'], :scope button, :scope [role='button']");
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
            const accordionRegion = accordionRegionId ? el.querySelector(`#${CSS.escape(accordionRegionId)}`) || document.getElementById(accordionRegionId) : el.querySelector("[role='region']");
            if (heading && accordionButton && accordionRegion && accordionRegion.getAttribute("role") === "region") {
              return false;
            }
            const hasInteractiveDescendants = Boolean(el.querySelector("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']"));
            const hasImageDescendant = Boolean(el.querySelector("img[alt]"));
            if (!hasInteractiveDescendants && hasImageDescendant && el.tabIndex < 0 && !el.hasAttribute("tabindex")) {
              return false;
            }
            const interactiveDescendants = Array.from(el.querySelectorAll("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']")).filter((node) => node.getAttribute("aria-hidden") !== "true" && !node.closest("[aria-hidden='true']"));
            if (interactiveDescendants.length >= 1 && role !== "listitem") {
              const clone = el.cloneNode(true);
              for (const node of Array.from(clone.querySelectorAll("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], [aria-hidden='true']"))) {
                node.remove();
              }
              removeCollapsedPopupContentFromClone(el, clone);
              if (!getReadableText(clone)) {
                return false;
              }
            }
            if (el.querySelector("[aria-hidden='true']")) {
              const clone = el.cloneNode(true);
              for (const node of Array.from(clone.querySelectorAll("[aria-hidden='true']"))) {
                node.remove();
              }
              if (!getReadableText(clone)) {
                return false;
              }
            }
          }
          if (tag === "a" && el.hasAttribute("href"))
            return true;
          if (role === "link")
            return true;
          if (tag === "input" && el.type !== "hidden")
            return true;
          if (hasStandaloneLabelStop(el))
            return true;
          if (getFocusableTableGroupLabel(el))
            return true;
          if (hasImplicitGroupRole)
            return true;
          if (isStructuredTableStop(el))
            return true;
          if (hasImplicitTitledGroupRole(el))
            return true;
          if (isTransparentListWrapperGroup(el))
            return false;
          if (isNamedInlineMetadataText(el))
            return true;
          if (isSingleReadableTextGroup(el))
            return true;
          if (isInlineTextOnlyGroup(el))
            return false;
          if (role === "banner" && tag !== "header" && el.getAttribute("aria-label") === "" && !getReadableTextIgnoringAriaHidden(el)) {
            return false;
          }
          if (tag === "p" && isParagraphOnlyLinkText(el))
            return false;
          if (tag === "p" && el.querySelector("[aria-hidden='true']") && !getReadableTextIgnoringAriaHidden(el)) {
            return false;
          }
          if (CONTEXT_ROLES.has(role) || CONTEXT_TAGS.has(tag) && !isPresentationalRole(role))
            return true;
          if (STOP_TAGS.has(tag)) {
            if (tag === "nav" && role && role !== "navigation") {
              return false;
            }
            return true;
          }
          if (STOP_ROLES.has(role))
            return true;
          if (hasStandaloneTextStop(el))
            return true;
          if (el.getAttribute("aria-label") && ["section", "div", "form"].includes(tag))
            return true;
          if (tag === "img" && el.hasAttribute("alt") && el.getAttribute("alt") !== "")
            return true;
          return false;
        }
        function shouldDescendIntoStop(el) {
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute("role") || "";
          const hasImplicitGroupRole = !role && ["div", "form"].includes(tag) && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"));
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
          if (tag === "a" && el.hasAttribute("href") && /<\/?[a-z][\s\S]*>/i.test(el.getAttribute("aria-label") || "") && Array.from(el.children).some((child) => (child.getAttribute("role") || "") === "group" && child.getAttribute("aria-hidden") !== "true" && !child.closest("[aria-hidden='true']") && Boolean(getReadableText(child)))) {
            return true;
          }
          if (CONTEXT_ROLES.has(role) || CONTEXT_TAGS.has(tag) && !isPresentationalRole(role)) {
            return true;
          }
          if (["header", "nav", "main", "footer", "aside"].includes(tag) && (!role || [
            "banner",
            "navigation",
            "main",
            "contentinfo",
            "complementary"
          ].includes(role))) {
            return true;
          }
          if (/^h[1-6]$/.test(tag)) {
            return Boolean(el.querySelector(":scope > button, :scope > [role='button'], :scope button, :scope [role='button']"));
          }
          if (tag === "label" && hasStandaloneLabelStop(el)) {
            const htmlFor = el.getAttribute("for");
            if (htmlFor && !document.getElementById(htmlFor)) {
              return Boolean(el.parentElement?.querySelector("button"));
            }
            return Boolean(el.querySelector("label, select"));
          }
          if (tag === "p" || tag === "blockquote" || hasStandaloneTextStop(el)) {
            return Boolean(el.querySelector("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']"));
          }
          if (tag === "li" || role === "listitem") {
            return Boolean(el.querySelector("button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link']"));
          }
          return false;
        }
        function getHighlightTarget(el) {
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute("role") || "";
          if (tag === "li" || role === "listitem") {
            const summaryChild = Array.from(el.children).find((child) => {
              const childTag = child.tagName.toLowerCase();
              const childRole = child.getAttribute("role") || "";
              return !(childTag === "button" || childTag === "a" && child.hasAttribute("href") || childTag === "input" && child.type !== "hidden" || childTag === "select" || childTag === "textarea" || childRole === "button" || childRole === "link");
            });
            if (summaryChild) {
              return summaryChild;
            }
          }
          return el;
        }
        function getCollapsedPopupController(container) {
          if (!container || container.nodeType !== Node.ELEMENT_NODE || !container.id) {
            return null;
          }
          const controller = document.querySelector(`[aria-controls="${CSS.escape(container.id)}"][aria-expanded="false"][aria-haspopup]`);
          if (controller && !container.contains(controller)) {
            return controller;
          }
          return null;
        }
        function isInsideCollapsedPopupContainer(el) {
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
        function scanSubtree(root) {
          const log = [];
          let stopIndex = 0;
          function getWalkChildren(el) {
            if (el.shadowRoot) {
              return Array.from(el.shadowRoot.children);
            }
            const declarativeShadowRoot = Array.from(el.children).find((child) => child.tagName?.toLowerCase() === "template" && child.getAttribute("shadowrootmode"));
            if (declarativeShadowRoot) {
              return Array.from(declarativeShadowRoot.content?.children || []);
            }
            return Array.from(el.children);
          }
          function walk(el, allowRoot) {
            if (!el || el.nodeType !== Node.ELEMENT_NODE) {
              return;
            }
            if (el.getAttribute("aria-hidden") === "true" || hasRenderedHiddenMarker(el)) {
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
                const announcement = generateAnnouncement2(descriptor);
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
                      height: Math.round(highlightRect.height)
                    }
                  });
                }
              }
              if (!shouldDescendIntoStop(el)) {
                return;
              }
              const childrenToWalk = descriptor?.role === "listbox" ? getWalkChildren(el).filter((child) => (child.getAttribute("role") || "") === "option" && child.getAttribute("aria-selected") === "true") : getWalkChildren(el);
              for (const child of childrenToWalk) {
                walk(child, false);
              }
              const syntheticTextDescriptor = getSyntheticTextDescriptor(el, descriptor);
              if (syntheticTextDescriptor) {
                const syntheticAnnouncement = generateAnnouncement2(syntheticTextDescriptor);
                if (syntheticAnnouncement) {
                  log.push({
                    index: log.length,
                    srId: id,
                    announcement: syntheticAnnouncement,
                    role: syntheticTextDescriptor.role,
                    name: syntheticTextDescriptor.name,
                    boundingBox: void 0
                  });
                }
              }
              if (descriptor) {
                const endAnnouncement = getContextEndAnnouncement2(descriptor);
                if (endAnnouncement) {
                  log.push({
                    index: log.length,
                    srId: id,
                    announcement: endAnnouncement,
                    role: descriptor.role,
                    name: descriptor.name,
                    boundingBox: void 0
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
          scanSubtree
        };
      }
    }
  });

  // ../sr-engine/dist/event-tracker.js
  var require_event_tracker = __commonJS({
    "../sr-engine/dist/event-tracker.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.EventTracker = void 0;
      var EventTracker = class {
        events = [];
        startTime = Date.now();
        _url = "";
        _viewport = { width: 1280, height: 800 };
        _title;
        /** Reset the tracker for a new recording session. */
        start(options) {
          this.events = [];
          this.startTime = Date.now();
          this._url = options?.url ?? "";
          this._viewport = options?.viewport ?? { width: 1280, height: 800 };
          this._title = options?.title;
        }
        /** Add an event. Timestamp is computed relative to `start()`. */
        push(event) {
          const ts = event.timestamp ?? Date.now() - this.startTime;
          this.events.push({ ...event, timestamp: ts });
        }
        /** Return the number of recorded events. */
        get length() {
          return this.events.length;
        }
        /** Build and return the recording object. */
        toRecording() {
          return {
            url: this._url,
            viewport: this._viewport,
            title: this._title,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            events: [...this.events].sort((a, b) => a.timestamp - b.timestamp)
          };
        }
      };
      exports.EventTracker = EventTracker;
    }
  });

  // ../sr-engine/dist/ax-tree.js
  var require_ax_tree = __commonJS({
    "../sr-engine/dist/ax-tree.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.axNodeToDescriptor = axNodeToDescriptor;
      function axNodeToDescriptor(node) {
        const desc = {};
        if (node.role?.value)
          desc.role = node.role.value;
        if (node.name?.value)
          desc.name = node.name.value;
        if (node.description?.value)
          desc.description = node.description.value;
        if (node.value?.value)
          desc.value = String(node.value.value);
        for (const prop of node.properties ?? []) {
          switch (prop.name) {
            case "roledescription":
              desc.roleDescription = String(prop.value.value);
              break;
            case "valuetext":
              desc.valueText = String(prop.value.value);
              break;
            case "level":
              desc.level = Number(prop.value.value);
              break;
            case "setsize":
              desc.setSize = Number(prop.value.value);
              break;
            case "posinset":
              desc.positionInSet = Number(prop.value.value);
              break;
            case "rowindex":
              desc.rowIndex = Number(prop.value.value);
              break;
            case "rowcount":
              desc.rowCount = Number(prop.value.value);
              break;
            case "colindex":
              desc.columnIndex = Number(prop.value.value);
              break;
            case "colcount":
              desc.columnCount = Number(prop.value.value);
              break;
            case "rowspan":
              desc.rowSpan = Number(prop.value.value);
              break;
            case "colspan":
              desc.columnSpan = Number(prop.value.value);
              break;
            case "placeholder":
              desc.placeholder = String(prop.value.value);
              break;
            case "invalid":
              desc.invalid = typeof prop.value.value === "string" ? String(prop.value.value) : Boolean(prop.value.value);
              break;
            case "errormessage":
              desc.errorMessage = String(prop.value.value);
              break;
            case "required":
              desc.required = Boolean(prop.value.value);
              break;
            case "checked":
              desc.checked = prop.value.value === "mixed" ? "mixed" : Boolean(prop.value.value);
              break;
            case "pressed":
              desc.pressed = prop.value.value === "mixed" ? "mixed" : Boolean(prop.value.value);
              break;
            case "expanded":
              desc.expanded = Boolean(prop.value.value);
              break;
            case "selected":
              desc.selected = Boolean(prop.value.value);
              break;
            case "disabled":
              desc.disabled = Boolean(prop.value.value);
              break;
            case "readonly":
              desc.readOnly = Boolean(prop.value.value);
              break;
            case "current":
              desc.current = typeof prop.value.value === "string" ? String(prop.value.value) : Boolean(prop.value.value);
              break;
            case "haspopup":
              desc.hasPopup = typeof prop.value.value === "string" ? String(prop.value.value) : Boolean(prop.value.value);
              break;
            case "autocomplete":
              desc.autocomplete = String(prop.value.value);
              break;
            case "live":
              desc.live = String(prop.value.value);
              break;
            case "atomic":
              desc.atomic = Boolean(prop.value.value);
              break;
            case "relevant":
              desc.relevant = String(prop.value.value);
              break;
            case "busy":
              desc.busy = Boolean(prop.value.value);
              break;
            case "controls":
              desc.controls = String(prop.value.value);
              break;
            case "modal":
              desc.modal = Boolean(prop.value.value);
              break;
            case "sort":
              desc.sort = String(prop.value.value);
              break;
          }
        }
        return desc;
      }
    }
  });

  // ../sr-engine/dist/index.js
  var require_dist = __commonJS({
    "../sr-engine/dist/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.axNodeToDescriptor = exports.EventTracker = exports.createDomScanner = exports.getContextEndAnnouncement = exports.generateAnnouncement = void 0;
      var announcements_1 = require_announcements();
      Object.defineProperty(exports, "generateAnnouncement", { enumerable: true, get: function() {
        return announcements_1.generateAnnouncement;
      } });
      var announcements_2 = require_announcements();
      Object.defineProperty(exports, "getContextEndAnnouncement", { enumerable: true, get: function() {
        return announcements_2.getContextEndAnnouncement;
      } });
      var dom_1 = require_dom();
      Object.defineProperty(exports, "createDomScanner", { enumerable: true, get: function() {
        return dom_1.createDomScanner;
      } });
      var event_tracker_1 = require_event_tracker();
      Object.defineProperty(exports, "EventTracker", { enumerable: true, get: function() {
        return event_tracker_1.EventTracker;
      } });
      var ax_tree_1 = require_ax_tree();
      Object.defineProperty(exports, "axNodeToDescriptor", { enumerable: true, get: function() {
        return ax_tree_1.axNodeToDescriptor;
      } });
    }
  });

  // src/content/engine-runtime-entry.js
  var import_engine = __toESM(require_dist());
  window.__srEngineGenerateAnnouncement = import_engine.generateAnnouncement;
  window.__srEngineGetContextEndAnnouncement = import_engine.getContextEndAnnouncement;
  window.__srEngineCreateDomScanner = import_engine.createDomScanner;
})();
