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
      function pushComboBoxAutocomplete(parts, el) {
        const autocomplete = normalizeText(el.autocomplete);
        if (autocomplete === "list" && el.expanded !== void 0) {
          parts.push(`list box pop up ${el.expanded ? "expanded" : "collapsed"}`);
          return;
        }
        pushAutocomplete(parts, autocomplete);
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
      function formatHeadingFragments(level, fragments) {
        const normalizedFragments = fragments?.map((fragment) => normalizeText(fragment)).filter((fragment) => Boolean(fragment));
        if (!normalizedFragments?.length) {
          return void 0;
        }
        return `heading level ${level} ${normalizedFragments.join(" ")}, ${normalizedFragments.length} items`;
      }
      function formatInteractiveHeadingFragments(fragments) {
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
            const headingWithFragments = el.headingLink || el.headingButton ? formatInteractiveHeadingFragments(el.headingFragments) : formatHeadingFragments(level, el.headingFragments);
            const headingLabel = headingWithFragments ?? label;
            if (headingWithFragments && !el.headingLink && !el.headingButton) {
              parts.push(headingWithFragments);
              pushSupplementalText(parts, el);
              break;
            }
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
            if (!popupType && el.expanded !== void 0) {
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
              } else if (!popupType) {
                pushComboBoxAutocomplete(parts, el);
              }
              parts.push("combo box");
              pushIfPresent(parts, value);
              if (el.expanded !== void 0) {
                if (!popupType) {
                  if (normalizeText(el.autocomplete) !== "list") {
                    parts.push(el.expanded ? "expanded" : "collapsed");
                  }
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
          case "search": {
            pushIfPresent(parts, el.name);
            parts.push("search");
            pushSupplementalText(parts, el);
            break;
          }
          case "banner":
          case "main":
          case "complementary":
          case "region": {
            pushIfPresent(parts, el.name);
            parts.push(el.roleDescription ?? role);
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
          return descriptor?.name ? `end of, ${descriptor.name}, banner` : "end of, banner";
        }
        if (role === "contentinfo") {
          return descriptor?.name ? `end of ${descriptor.name} footer` : "end of, footer";
        }
        if (role === "navigation") {
          return descriptor?.name ? `end of, ${descriptor.name}, navigation` : "end of, navigation";
        }
        if (role === "search") {
          return descriptor?.name ? `end of, ${descriptor.name}, search` : "end of, search";
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
        const interactiveSelector = "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], [role='combobox'], [role='searchbox'], [role='textbox']";
        const contextRoles = /* @__PURE__ */ new Set([
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
          "tabpanel"
        ]);
        function normalize(value) {
          const normalized = value?.replace(/\s+/g, " ").trim();
          return normalized || void 0;
        }
        function cssEscape(value) {
          return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => {
            const hex = character.codePointAt(0).toString(16);
            return `\\${hex} `;
          });
        }
        function renderedHiddenValue(el) {
          return el?.getAttribute?.("data-sr-computed-hidden") || void 0;
        }
        function isHidden(el) {
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
          if (el.closest("[aria-hidden='true']") || el.closest("[data-sr-computed-hidden]:not([data-sr-computed-hidden='false'])")) {
            return true;
          }
          const style = getComputedStyle(el);
          return style.display === "none" || style.visibility === "hidden";
        }
        function needsBoundary(left, right) {
          const leftChar = left.slice(-1);
          const rightChar = right[0];
          if (!leftChar || !rightChar)
            return false;
          if (/\s/.test(leftChar) || /\s/.test(rightChar))
            return false;
          if (/[.,;:!?)]/.test(rightChar) || /[(]/.test(leftChar))
            return false;
          return /[\p{L}\p{N}%]/u.test(leftChar) && /[\p{L}\p{N}]/u.test(rightChar);
        }
        function readableText(el) {
          function collect(node) {
            if (!node)
              return "";
            if (node.nodeType === Node.TEXT_NODE)
              return node.textContent || "";
            if (node.nodeType !== Node.ELEMENT_NODE)
              return "";
            if (isHidden(node))
              return "";
            let text = "";
            for (const child of Array.from(node.childNodes)) {
              const part = collect(child);
              if (!part)
                continue;
              if (text && needsBoundary(text, part))
                text += " ";
              text += part;
            }
            return text;
          }
          return normalize(collect(el));
        }
        function directOwnText(el) {
          return normalize(Array.from(el?.childNodes || []).filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent || "").join(" "));
        }
        function textWithoutInteractive(el) {
          const hadInteractive = Boolean(el.querySelector(interactiveSelector));
          const clone = el.cloneNode(true);
          for (const node of Array.from(clone.querySelectorAll(`${interactiveSelector}, ul, ol, dl, [role='list'], [aria-hidden='true']`))) {
            node.remove();
          }
          const text = readableText(clone);
          if (!hadInteractive || !text) {
            return text;
          }
          return normalize(text.replace(/\s+[.,;:!?]$/u, ""));
        }
        function resolveIdRef(id) {
          if (!id)
            return null;
          return document.getElementById(id) || document.querySelector(`#${cssEscape(id)}`);
        }
        function textFromIdRefs(value) {
          if (!value)
            return void 0;
          return normalize(value.split(/\s+/).map((id) => readableText(resolveIdRef(id)) || "").filter(Boolean).join(" "));
        }
        function labelForControl(el) {
          if ("labels" in el && el.labels?.length) {
            return textWithoutInteractive(el.labels[0]) || readableText(el.labels[0]);
          }
          const id = el.getAttribute("id");
          if (!id)
            return void 0;
          const label = document.querySelector(`label[for="${cssEscape(id)}"]`);
          return label ? textWithoutInteractive(label) || readableText(label) : void 0;
        }
        function nestedImageLabel(el) {
          const image = Array.from(el.querySelectorAll("img[alt], [role='img'][aria-label], svg[aria-label]")).find((node) => !isHidden(node));
          if (!image)
            return void 0;
          const tag = image.tagName.toLowerCase();
          return normalize(image.getAttribute("aria-label") || (tag === "img" ? image.getAttribute("alt") : "") || image.getAttribute("title"));
        }
        function linkContentName(el) {
          const imageLabel = nestedImageLabel(el);
          const text = readableText(el);
          return normalize([imageLabel, text].filter(Boolean).join(" "));
        }
        function buttonContentName(el) {
          const imageLabel = nestedImageLabel(el);
          const text = readableText(el);
          return normalize([imageLabel, text].filter(Boolean).join(" "));
        }
        function isCustomElement(el) {
          return Boolean(el?.tagName?.toLowerCase().includes("-"));
        }
        function closestCustomElement(el) {
          for (let current = el?.parentElement; current; current = current.parentElement) {
            if (isCustomElement(current))
              return current;
          }
          return null;
        }
        function accessibleName(el, role) {
          const ariaLabel = normalize(el.getAttribute("aria-label"));
          if (ariaLabel !== void 0)
            return ariaLabel;
          const labelledBy = textFromIdRefs(el.getAttribute("aria-labelledby"));
          if (labelledBy)
            return labelledBy;
          const tag = el.tagName.toLowerCase();
          if ([
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
            "tabpanel"
          ].includes(role)) {
            return normalize(el.getAttribute("title"));
          }
          if (role === "group" && !el.matches(interactiveSelector)) {
            return normalize(el.getAttribute("title"));
          }
          if (tag === "img")
            return normalize(el.getAttribute("alt"));
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
        function implicitRole(el) {
          const tag = el.tagName.toLowerCase();
          const explicit = el.getAttribute("role");
          if (explicit === "img")
            return "image";
          if (explicit && explicit !== "none" && explicit !== "presentation") {
            return explicit;
          }
          if (/^h[1-6]$/.test(tag))
            return "heading";
          if (tag === "a" && el.hasAttribute("href"))
            return "link";
          if (tag === "button")
            return "button";
          if (tag === "select")
            return el.hasAttribute("multiple") ? "listbox" : "combobox";
          if (tag === "textarea")
            return "textbox";
          if (tag === "input") {
            const type = (el.getAttribute("type") || "text").toLowerCase();
            if (type === "checkbox")
              return "checkbox";
            if (type === "radio")
              return "radio";
            if (type === "search")
              return "searchbox";
            if (["button", "submit", "reset"].includes(type))
              return "button";
            return "textbox";
          }
          if (tag === "header")
            return "banner";
          if (tag === "nav")
            return "navigation";
          if (tag === "main")
            return "main";
          if (tag === "search")
            return "search";
          if (tag === "footer")
            return "contentinfo";
          if (tag === "aside")
            return "complementary";
          if (tag === "form" && explicit === "search")
            return "search";
          if (tag === "ul" || tag === "ol" || tag === "dl")
            return "list";
          if (tag === "li")
            return "listitem";
          if (tag === "dt")
            return "term";
          if (tag === "table")
            return "table";
          if (tag === "tr")
            return "row";
          if (tag === "th")
            return "columnheader";
          if (tag === "td")
            return "cell";
          if (tag === "img")
            return "image";
          if (tag === "dialog")
            return "dialog";
          if (tag === "p" || tag === "blockquote" || tag === "figcaption") {
            return "paragraph";
          }
          if (["section", "div", "form"].includes(tag) && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))) {
            return tag === "section" ? "region" : "group";
          }
          if (["span", "div"].includes(tag) && directOwnText(el) && !el.querySelector(interactiveSelector) && !el.closest(interactiveSelector) && !el.closest("p, li, h1, h2, h3, h4, h5, h6")) {
            return "text";
          }
          return "";
        }
        function isListItem(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute("role") || "";
          return role === "listitem" || tag === "li" && (!role || role === "listitem");
        }
        function listChildren(list) {
          if (!list)
            return [];
          const tag = list.tagName.toLowerCase();
          if (tag === "dl") {
            return Array.from(list.children).filter((child) => {
              const childTag = child.tagName.toLowerCase();
              return !isHidden(child) && (childTag === "dt" || childTag === "dd");
            });
          }
          return Array.from(list.children).filter((child) => isListItem(child));
        }
        function semanticListContext(el) {
          let listItem = el;
          while (listItem && !isListItem(listItem)) {
            listItem = listItem.parentElement;
          }
          const list = listItem?.parentElement || null;
          const siblings = list ? listChildren(list) : [];
          return { listItem, list, siblings };
        }
        function listLevel(el) {
          let depth = 1;
          for (let current = el.parentElement; current; current = current.parentElement) {
            if (implicitRole(current) === "list")
              depth += 1;
          }
          return depth > 1 ? depth : void 0;
        }
        function parentListPosition(el) {
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
          return index >= 0 ? {
            parentPositionInSet: index + 1,
            parentSetSize: siblings.length || void 0
          } : {};
        }
        function positionInSet(el, role) {
          const explicit = Number.parseInt(el.getAttribute("aria-posinset") || "", 10);
          if (Number.isFinite(explicit) && explicit > 0)
            return explicit;
          if (role === "option") {
            const options2 = Array.from(el.parentElement?.querySelectorAll("[role='option']") || []).filter((option) => !isHidden(option));
            const index = options2.indexOf(el);
            return index >= 0 ? index + 1 : void 0;
          }
          if (role === "tab") {
            const tabs = Array.from(el.closest("[role='tablist']")?.querySelectorAll("[role='tab']") || []).filter((tab) => !isHidden(tab));
            const index = tabs.indexOf(el);
            return index >= 0 ? index + 1 : void 0;
          }
          if (["link", "button", "heading", "paragraph", "listitem", "image", "group"].includes(role)) {
            const { listItem, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : void 0;
          }
          return void 0;
        }
        function setSize(el, role) {
          const explicit = Number.parseInt(el.getAttribute("aria-setsize") || "", 10);
          if (Number.isFinite(explicit) && explicit > 0)
            return explicit;
          if (role === "list")
            return listChildren(el).length || void 0;
          if (role === "option") {
            return Array.from(el.parentElement?.querySelectorAll("[role='option']") || []).filter((option) => !isHidden(option)).length || void 0;
          }
          if (role === "tab") {
            return Array.from(el.closest("[role='tablist']")?.querySelectorAll("[role='tab']") || []).filter((tab) => !isHidden(tab)).length || void 0;
          }
          if (["link", "button", "heading", "paragraph", "listitem", "image", "group"].includes(role)) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          return void 0;
        }
        function hasOnlyInteractiveListItemContent(el) {
          if (!isListItem(el))
            return false;
          if (!el.querySelector(interactiveSelector))
            return false;
          return !textWithoutInteractive(el);
        }
        function isIconOnlyLink(el) {
          if (implicitRole(el) !== "link")
            return false;
          if (!nestedImageLabel(el))
            return false;
          const clone = el.cloneNode(true);
          for (const node of Array.from(clone.querySelectorAll("img, svg, [role='img'], [aria-hidden='true']"))) {
            node.remove();
          }
          return !readableText(clone);
        }
        function parseBooleanAttribute(el, name) {
          if (!el.hasAttribute(name))
            return void 0;
          return el.getAttribute(name) === "true";
        }
        function normalizedPopup(el) {
          const value = el.getAttribute("aria-haspopup");
          if (!value || value === "false")
            return void 0;
          return value === "true" ? "menu" : value;
        }
        function tableContext(el, role) {
          const table = el.closest("table,[role='table'],[role='grid']");
          const row = el.closest("tr,[role='row']");
          if (!table || !row)
            return {};
          const rows = Array.from(table.querySelectorAll("tr,[role='row']")).filter((candidate) => !isHidden(candidate));
          const cells = Array.from(row.children).filter((child) => {
            const childRole = implicitRole(child);
            return ["cell", "gridcell", "rowheader", "columnheader"].includes(childRole);
          });
          const rowIndex = rows.indexOf(row);
          const columnIndex = cells.indexOf(el);
          const firstRow = rows[0];
          const headerCells = Array.from(firstRow?.children || []).filter((child) => {
            const childRole = implicitRole(child);
            return ["columnheader", "rowheader"].includes(childRole);
          });
          const columnHeader = columnIndex >= 0 ? headerCells[columnIndex] : null;
          return {
            tableRole: implicitRole(table),
            tableLabel: accessibleName(table, implicitRole(table)),
            rowIndex: rowIndex >= 0 ? rowIndex + 1 : void 0,
            rowCount: rows.length || void 0,
            columnIndex: columnIndex >= 0 ? columnIndex + 1 : void 0,
            columnCount: cells.length || void 0,
            columnHeaderText: role !== "columnheader" && columnHeader ? accessibleName(columnHeader, "columnheader") : void 0
          };
        }
        function directHeadingFragments(el) {
          if (implicitRole(el) !== "heading")
            return void 0;
          if (el.querySelector("button, [role='button'], a[href]"))
            return void 0;
          const directText = Array.from(el.childNodes).filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => normalize(child.textContent)).filter(Boolean);
          if (directText.length)
            return void 0;
          const fragments = Array.from(el.children).filter((child) => !isHidden(child)).map((child) => readableText(child)).filter((fragment) => Boolean(fragment));
          return fragments.length > 1 ? fragments : void 0;
        }
        function govUkCookiePreferenceParagraph(el) {
          if (implicitRole(el) !== "paragraph")
            return false;
          const region = el.closest("[role='region'][aria-label='Cookies on GOV.UK']");
          if (!region)
            return false;
          const text = readableText(el) || "";
          return /^You have (accepted|rejected) additional cookies\./.test(text);
        }
        function govUkCookiePreferenceText(el) {
          const fragments = [];
          for (const child of Array.from(el.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
              const text = normalize(child.textContent);
              if (text)
                fragments.push(text);
              continue;
            }
            if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child))
              continue;
            if (child.matches(interactiveSelector))
              break;
            for (const nested of Array.from(child.childNodes)) {
              if (nested.nodeType === Node.TEXT_NODE) {
                const text = normalize(nested.textContent);
                if (text)
                  fragments.push(text);
              } else if (nested.nodeType === Node.ELEMENT_NODE && nested.matches?.(interactiveSelector)) {
                break;
              }
            }
          }
          return normalize(fragments.join(" "));
        }
        function captureElement(el) {
          if (!el || el === document.body || el === document.documentElement || isHidden(el)) {
            return null;
          }
          const role = implicitRole(el);
          if (!role)
            return null;
          const tag = el.tagName.toLowerCase();
          const control = role === "combobox" && tag !== "input" && tag !== "select" ? el.querySelector("input, select, textarea, [role='textbox'], [role='searchbox']") : null;
          const stateEl = control || el;
          const name = accessibleName(el, role);
          const text = readableText(el);
          const position = positionInSet(el, role);
          const size = setSize(el, role);
          const rect = el.getBoundingClientRect();
          const table = tableContext(el, role);
          const parentListMeta = parentListPosition(el);
          const headingButton = role === "heading" ? el.querySelector("button, [role='button']") : null;
          const headingLink = role === "heading" ? el.querySelector("a[href]") : null;
          const descriptor = {
            role,
            name,
            text,
            description: normalize(stateEl.getAttribute("aria-description") ?? el.getAttribute("aria-description")),
            details: textFromIdRefs(stateEl.getAttribute("aria-describedby") ?? el.getAttribute("aria-describedby")),
            errorMessage: textFromIdRefs(stateEl.getAttribute("aria-errormessage") ?? el.getAttribute("aria-errormessage")),
            roleDescription: role === "list" && tag === "dl" ? "definition list" : normalize(el.getAttribute("aria-roledescription")),
            level: role === "heading" ? Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2 : role === "list" ? listLevel(el) : void 0,
            setSize: size,
            positionInSet: position,
            ...parentListMeta,
            value: "value" in stateEl && stateEl.value ? stateEl.value : void 0,
            valueText: normalize(stateEl.getAttribute("aria-valuetext")),
            placeholder: normalize(stateEl.getAttribute("placeholder")),
            required: stateEl.required || stateEl.getAttribute("aria-required") === "true" || void 0,
            invalid: stateEl.getAttribute("aria-invalid") && stateEl.getAttribute("aria-invalid") !== "false" ? stateEl.getAttribute("aria-invalid") === "true" ? true : stateEl.getAttribute("aria-invalid") : void 0,
            checked: role === "checkbox" || role === "radio" ? el.getAttribute("aria-checked") === "mixed" ? "mixed" : el.getAttribute("aria-checked") ? el.getAttribute("aria-checked") === "true" : Boolean(el.checked) : void 0,
            expanded: parseBooleanAttribute(stateEl, "aria-expanded"),
            selected: parseBooleanAttribute(el, "aria-selected"),
            pressed: el.hasAttribute("aria-pressed") ? el.getAttribute("aria-pressed") === "mixed" ? "mixed" : el.getAttribute("aria-pressed") === "true" : void 0,
            disabled: el.disabled || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true" || void 0,
            readOnly: el.readOnly || el.getAttribute("aria-readonly") === "true" || void 0,
            current: el.hasAttribute("aria-current") ? el.getAttribute("aria-current") === "true" ? true : el.getAttribute("aria-current") : void 0,
            hasPopup: normalizedPopup(stateEl) ?? normalizedPopup(el),
            autocomplete: normalize(stateEl.getAttribute("aria-autocomplete") ?? el.getAttribute("aria-autocomplete")),
            modal: el.getAttribute("aria-modal") === "true" || void 0,
            sort: normalize(el.getAttribute("aria-sort")),
            nativeSelect: tag === "select" || void 0,
            headingButton: Boolean(headingButton) || void 0,
            headingLink: Boolean(headingLink) || void 0,
            headingFragments: directHeadingFragments(el),
            iconOnlyLink: role === "link" && isIconOnlyLink(el) || void 0,
            compositeText: role === "button" && Boolean(nestedImageLabel(el) && readableText(el)) || void 0,
            groupContext: Boolean(headingButton) || role === "button" && Boolean(nestedImageLabel(el)) || role === "button" && Boolean(closestCustomElement(el)) && !normalizedPopup(el) && el.hasAttribute("aria-label") || role === "button" && el.hasAttribute("aria-expanded") && !normalizedPopup(el) && !position || void 0,
            ...table,
            boundingBox: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          };
          if (role === "listitem") {
            descriptor.name = textWithoutInteractive(el);
            descriptor.text = descriptor.name;
          }
          if (role === "paragraph") {
            descriptor.name = govUkCookiePreferenceParagraph(el) ? govUkCookiePreferenceText(el) : textWithoutInteractive(el) || text;
          }
          return descriptor;
        }
        function getScanRoot(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return null;
          const codeBlock = el.closest("pre, code");
          const pre = codeBlock?.tagName.toLowerCase() === "pre" ? codeBlock : codeBlock?.closest("pre");
          return pre || el;
        }
        function isStopElement(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          const role = implicitRole(el);
          const tag = el.tagName.toLowerCase();
          if (!role)
            return false;
          if (role === "listitem" && hasOnlyInteractiveListItemContent(el)) {
            return false;
          }
          if (contextRoles.has(role) && !accessibleName(el, role) && !readableText(el) && !el.querySelector(interactiveSelector)) {
            return false;
          }
          if (role === "paragraph" && !readableText(el)) {
            return false;
          }
          if (role === "image" && !accessibleName(el, role)) {
            return false;
          }
          if (role === "group" && !accessibleName(el, role) && !el.matches(interactiveSelector)) {
            return false;
          }
          return contextRoles.has(role) || [
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
            "columnheader"
          ].includes(role) || ["caption", "figcaption"].includes(tag);
        }
        function shouldDescendIntoStop(el) {
          const role = implicitRole(el);
          if (contextRoles.has(role))
            return true;
          if (role === "heading") {
            return Boolean(el.querySelector("button, [role='button'], a[href]"));
          }
          if (role === "listitem") {
            return hasOnlyInteractiveListItemContent(el) || Boolean(el.querySelector("ul, ol, dl, [role='list']"));
          }
          if (role === "paragraph") {
            return !govUkCookiePreferenceParagraph(el) && Boolean(el.querySelector(interactiveSelector));
          }
          return false;
        }
        function walkChildren(el) {
          if (el.shadowRoot)
            return Array.from(el.shadowRoot.children);
          const template = Array.from(el.children).find((child) => child.tagName?.toLowerCase() === "template" && child.getAttribute("shadowrootmode"));
          if (template)
            return Array.from(template.content?.children || []);
          return Array.from(el.children);
        }
        function collapsedPopupController(container) {
          if (!container?.id)
            return null;
          const controller = document.querySelector(`[aria-controls="${cssEscape(container.id)}"][aria-expanded="false"]`);
          return controller && !container.contains(controller) ? controller : null;
        }
        function isInsideCollapsedPopup(el) {
          for (let current = el; current; current = current.parentElement) {
            if (collapsedPopupController(current))
              return true;
          }
          return false;
        }
        function scanSubtree(root) {
          const log = [];
          let stopIndex = 0;
          function walk(el) {
            if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
              return;
            if (isInsideCollapsedPopup(el))
              return;
            if (isStopElement(el)) {
              const id = `__sr_el_${stopIndex}_${now()}`;
              stopIndex += 1;
              el.setAttribute("data-sr-id", id);
              const descriptor = captureElement(el);
              if (descriptor) {
                const announcement = generateAnnouncement2(descriptor);
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
                      height: Math.round(rect.height)
                    }
                  });
                }
              }
              if (shouldDescendIntoStop(el)) {
                for (const child of walkChildren(el))
                  walk(child);
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
            for (const child of walkChildren(el))
              walk(child);
          }
          walk(root);
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
