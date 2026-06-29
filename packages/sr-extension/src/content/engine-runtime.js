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
        const normalized = value?.replace(/[\u200B-\u200F\uFEFF]/g, "").replace(/\s+/g, " ").replace(/\s+([.,!?;:])/g, "$1").trim();
        return normalized || void 0;
      }
      function pushIfPresent(parts, value) {
        const normalized = normalizeText(value);
        if (normalized) {
          parts.push(normalized);
        }
      }
      function pushCollectionPosition(parts, el) {
        if (el.setSize === 1) {
          return;
        }
        if (el.positionInSet && el.setSize) {
          if (el.parenthesizedCollectionPosition) {
            parts.push(`(${el.positionInSet} of ${el.setSize})`);
            return;
          }
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
      function hasTableColumnContext(el) {
        return Boolean(el.tableRole === "table" && el.columnIndex && el.columnCount && !(el.role === "link" && el.tableHasComplexColumnHeaders && el.rowIndex === 1) && !["cell", "gridcell", "rowheader", "columnheader"].includes(el.role || ""));
      }
      function mergeTableColumnHeaderContext(parts, el) {
        if (!el.columnHeaderText)
          return;
        if (parts.length > 0) {
          parts[0] = `${el.columnHeaderText} ${parts[0]}`;
        } else {
          parts.unshift(el.columnHeaderText);
        }
      }
      function tableColumnPosition(el) {
        if (!hasTableColumnContext(el))
          return void 0;
        return `column ${el.columnIndex} of ${el.columnCount}`;
      }
      function genericGroupRoleLabel(el) {
        const roleDescription = normalizeText(el?.roleDescription)?.toLowerCase();
        return roleDescription === "carousel" || roleDescription === "slideshow" ? roleDescription : "group";
      }
      function pushTableColumnContext(parts, el) {
        if (!hasTableColumnContext(el)) {
          return;
        }
        mergeTableColumnHeaderContext(parts, el);
        if (el.columnIndex === 1 && el.rowIndex) {
          if (el.tableGroupedHeaderRow && !el.tableFirstGroupedHeaderRow && parts.length > 0) {
            parts[0] = `row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""} ${parts[0]}`;
            const columnPosition2 = tableColumnPosition(el);
            if (columnPosition2)
              parts.push(columnPosition2);
            return;
          }
          if (el.tableFirstGroupedHeaderRow && el.tableGroupHeaderText && parts.length > 0) {
            parts[0] = `${el.tableGroupHeaderText} ${parts[0]}`;
          }
          parts.unshift(`row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""}`);
        }
        const columnPosition = tableColumnPosition(el);
        if (columnPosition)
          parts.push(columnPosition);
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
        if (level === 1) {
          return `heading level ${level} ${normalizedFragments.join(" ")}, ${normalizedFragments.length} items`;
        }
        const [firstFragment, ...nestedFragments] = normalizedFragments;
        const nestedLevel = Math.max(1, level - 1);
        return [
          `heading level ${level} ${firstFragment}`,
          ...nestedFragments.map((fragment) => `level ${nestedLevel} ${fragment}`),
          `level ${nestedLevel}, ${normalizedFragments.length} items`
        ].join(", ");
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
        const placeholder = normalizeText(el.placeholder);
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
              if (!headingWithFragments && level > 1) {
                parts.push(`level ${level - 1}`);
              }
              parts.push("link");
              pushIfPresent(parts, headingLabel);
              if (el.duplicateCollectionPosition && el.positionInSet && el.setSize) {
                parts.push(`(${el.positionInSet} of ${el.setSize})`);
              }
              pushCollectionPosition(parts, el);
            } else {
              pushIfPresent(parts, headingLabel);
              if (!el.headingButton) {
                if (el.duplicateCollectionPosition && el.positionInSet && el.setSize) {
                  parts.push(`(${el.positionInSet} of ${el.setSize})`);
                }
                pushCollectionPosition(parts, el);
              }
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
            const isToggleButton = el.roleDescription === "toggle button" || el.pressed !== void 0;
            if (popupType && !isToggleButton) {
              if (el.expanded !== void 0) {
                parts.push(`${popupType} ${el.expanded ? "expanded" : "collapsed"}`);
                parts.push("button");
              } else {
                parts.push(popupType);
                parts.push("button");
              }
            } else {
              if (el.expanded !== void 0) {
                parts.push(el.expanded ? "expanded" : "collapsed");
              }
              if (isToggleButton && el.disabled) {
                parts.push("dimmed");
              }
              if (el.disabled && !isToggleButton) {
                parts.push("dimmed");
              }
              parts.push(el.roleDescription ?? "button");
            }
            if (el.groupContext) {
              parts.push("group");
              if (el.groupedCollectionPosition) {
                pushCollectionPosition(parts, el);
              }
            } else {
              pushCollectionPosition(parts, el);
            }
            if (el.pressed === true) {
              if (isToggleButton) {
                const roleIndex = parts.lastIndexOf("button");
                if (roleIndex >= 0) {
                  parts.splice(roleIndex, 1, "selected", "toggle button");
                } else {
                  parts.push("selected");
                }
              } else {
                parts.push("pressed");
              }
            } else if (el.pressed === "mixed") {
              parts.push("mixed");
            }
            pushTableColumnContext(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "link": {
            const popupType = formatPopupType(el.hasPopup);
            if (el.disabled && el.current) {
              parts.push(`dimmed ${el.current === true ? "current item" : `current ${el.current}`}`);
            } else {
              if (el.disabled) {
                parts.push("dimmed");
              }
              if (el.current) {
                parts.push(el.current === true ? "current item" : `current ${el.current}`);
              }
            }
            if (popupType && el.expanded !== void 0) {
              parts.push(popupType);
              parts.push(el.expanded ? "expanded" : "collapsed");
            }
            if (!popupType && el.expanded !== void 0) {
              parts.push(el.expanded ? "expanded" : "collapsed");
            }
            if (el.textlessCarouselPaginatorLink) {
              parts.push("link s");
              pushCollectionPosition(parts, el);
              pushTableColumnContext(parts, el);
              pushSupplementalText(parts, el);
              break;
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
              if (el.linkHeadingLevel) {
                parts.push(`heading level ${el.linkHeadingLevel}`);
              }
              pushIfPresent(parts, label);
            }
            pushCollectionPosition(parts, el);
            pushTableColumnContext(parts, el);
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
              const popupType = formatPopupType(el.hasPopup);
              if (el.required && popupType) {
                parts.push(`required ${popupType}`);
              } else if (el.required) {
                parts.push("required");
              } else if (popupType) {
                parts.push(popupType);
              }
              parts.push("search text field");
              if (popupType !== "list box pop up") {
                pushAutocomplete(parts, el.autocomplete);
              }
            } else {
              pushIfPresent(parts, label);
              if (el.invalid) {
                pushInvalidState(parts, el.invalid === true ? "data" : el.invalid);
              }
              parts.push("edit text");
              if (!el.invalid) {
                const placeholderText = placeholder !== label ? placeholder : void 0;
                pushIfPresent(parts, value ?? placeholderText);
              }
              pushAutocomplete(parts, el.autocomplete);
              if (el.required) {
                parts.push("required");
              }
            }
            if (el.readOnly) {
              parts.push("read only");
            }
            if (role === "searchbox" || !el.invalid) {
              pushSupplementalText(parts, el);
            } else {
              pushIfPresent(parts, el.details);
              pushIfPresent(parts, el.errorMessage);
              if (el.busy) {
                parts.push("busy");
              }
            }
            break;
          }
          case "combobox": {
            if (el.nativeSelect) {
              const selectLabel = normalizeText(el.name);
              pushIfPresent(parts, value);
              if (selectLabel && selectLabel !== value) {
                pushIfPresent(parts, selectLabel);
              }
              parts.push(`menu pop up ${el.expanded ? "expanded" : "collapsed"}`);
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
            if (el.fieldsetRadioGroup) {
              if (el.selected || el.checked === true) {
                parts.push("selected");
              }
              parts.push("radio button");
              pushCollectionPosition(parts, el);
              pushSupplementalText(parts, el);
              break;
            }
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
            if (el.roleDescription === "empty group") {
              parts.push("empty group");
            }
            break;
          }
          case "blockquote": {
            pushIfPresent(parts, label);
            parts.push("block quote level 1");
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "text": {
            pushIfPresent(parts, label);
            if (el.groupContext) {
              parts.push("group");
            }
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "list": {
            const listLabel = normalizeText(el.name);
            const listRole = el.roleDescription ?? "list";
            const listSize = el.setSize ? `${el.setSize} ${el.setSize === 1 ? "item" : "items"}` : void 0;
            const listLevel = el.level && el.level > 1 ? `level ${el.level}` : void 0;
            const parentPosition = el.parentPositionInSet && el.parentSetSize ? `${el.parentPositionInSet} of ${el.parentSetSize}` : void 0;
            const listParts = listLabel && listRole === "list" ? [listRole, listLabel, listSize] : [listLabel, listRole, listSize];
            const normalizedListParts = listParts.filter((part) => Boolean(part));
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
            if (hasTableColumnContext(el)) {
              mergeTableColumnHeaderContext(normalizedListParts, el);
              const columnPosition = tableColumnPosition(el);
              if (columnPosition)
                supplementalParts.push(columnPosition);
            }
            pushSupplementalText(supplementalParts, el);
            return [normalizedListParts.join(" "), ...supplementalParts].filter(Boolean).join(", ");
          }
          case "listbox": {
            if (value) {
              const selectedParts = [];
              pushIfPresent(selectedParts, el.name);
              selectedParts.push("list box");
              if (el.selectedCount) {
                selectedParts.push(`${el.selectedCount} item${el.selectedCount === 1 ? "" : "s"} selected. ${value}`);
              } else {
                selectedParts.push(value);
              }
              selectedParts.push("menu item");
              if (el.positionInSet && el.setSize) {
                selectedParts.push(`(${el.positionInSet} of ${el.setSize})`);
              }
              pushSupplementalText(selectedParts, el);
              return selectedParts.join(", ");
            }
            pushIfPresent(parts, el.name);
            parts.push("list box");
            if (el.selectedCount) {
              parts.push(`${el.selectedCount} item${el.selectedCount === 1 ? "" : "s"} selected`);
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
                if (role === "rowheader" && el.columnIndex === 1 && el.rowIndex && label && el.tableGroupHeaderText) {
                  parts.push(`row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""} ${label}, ${el.tableGroupHeaderText} ${label}`);
                } else if (role === "rowheader" && el.columnIndex === 1 && el.rowIndex && label && el.tableHasComplexColumnHeaders) {
                  parts.push(`row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""} ${label} ${label}`);
                } else if (el.columnIndex === 1 && el.rowIndex) {
                  parts.push(`row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""}`);
                  pushIfPresent(parts, [el.columnHeaderText, label].filter(Boolean).join(" "));
                } else {
                  pushIfPresent(parts, [el.columnHeaderText, label].filter(Boolean).join(" "));
                }
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
            if (el.unlabeledImage) {
              if (el.unlabeledImageSrcLabel) {
                parts.push(el.unlabeledImageSrcLabel);
                parts.push("Unlabeled image");
                pushCollectionPosition(parts, el);
                pushSupplementalText(parts, el);
                break;
              }
              parts.push(el.imageMissingDescriptionHint ? "image. To get missing image descriptions, open the context menu." : "image");
              parts.push("Unlabeled image");
              pushCollectionPosition(parts, el);
              pushSupplementalText(parts, el);
              break;
            }
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
            parts.push(genericGroupRoleLabel(el));
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
            parts.push(el.roleDescription === "group" ? "group" : "alert");
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
            if (el.modal && label) {
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
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "banner":
          case "main":
          case "complementary":
          case "article":
          case "region": {
            pushIfPresent(parts, el.name);
            parts.push(el.roleDescription ?? role);
            pushSupplementalText(parts, el);
            break;
          }
          case "contentinfo": {
            pushIfPresent(parts, el.name);
            parts.push(el.roleDescription ?? "content information");
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
          if (descriptor?.roleDescription === "footer") {
            return descriptor?.name ? `end of, ${descriptor.name}, footer` : "end of, footer";
          }
          return descriptor?.name ? `end of, ${descriptor.name}, content information` : "end of, content information";
        }
        if (role === "main") {
          return descriptor?.name ? `end of, ${descriptor.name}, main` : "end of, main";
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
          return descriptor?.name ? `end of, ${descriptor.name}, tab panel` : "end of, tab panel";
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
        if (role === "article") {
          return descriptor?.name ? `end of, ${descriptor.name}, article` : "end of, article";
        }
        if (role === "group") {
          return descriptor?.name ? `end of, ${descriptor.name}, ${genericGroupRoleLabel(descriptor)}` : `end of ${genericGroupRoleLabel(descriptor)}`;
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
          "tabpanel",
          "article"
        ]);
        const listPositionedRoles = /* @__PURE__ */ new Set([
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
          "article"
        ]);
        function normalize(value) {
          const normalized = value?.replace(/[\u200B-\u200F\uFEFF]/g, "").replace(/\s+/g, " ").trim();
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
        function isOpacityHiddenOnly(el) {
          return renderedHiddenValue(el) === "opacity:0";
        }
        function isFocusableOpacityHiddenControl(el) {
          return Boolean(el?.matches?.(interactiveSelector)) && isOpacityHiddenOnly(el);
        }
        function isSldsDesktopHidden(el) {
          return Boolean(el?.classList?.contains?.("slds-hide_medium"));
        }
        function isHidden(el) {
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
          const hiddenAncestor = el.closest("[data-sr-computed-hidden]:not([data-sr-computed-hidden='false'])");
          if (el.closest("[aria-hidden='true']") || hiddenAncestor && hiddenAncestor !== el) {
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
          return /[\p{L}\p{N}%]/u.test(leftChar) && /[\p{L}\p{N}£$€]/u.test(rightChar);
        }
        const shadowContentHostByNode = /* @__PURE__ */ new WeakMap();
        let flattenedSlottedCarouselListCache;
        const flattenedSlottedCarouselStopCache = /* @__PURE__ */ new WeakMap();
        function rememberShadowContentHost(nodes, host) {
          const visit = (node) => {
            if (!node || node.nodeType !== Node.ELEMENT_NODE)
              return;
            shadowContentHostByNode.set(node, host);
            for (const child of Array.from(node.children || []))
              visit(child);
          };
          for (const node of nodes)
            visit(node);
        }
        function shadowContentChildren(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return [];
          if (el.shadowRoot) {
            const children2 = Array.from(el.shadowRoot.children);
            rememberShadowContentHost(children2, el);
            return children2;
          }
          const template = Array.from(el.children || []).find((child) => child.tagName?.toLowerCase() === "template" && child.getAttribute("shadowrootmode"));
          if (!template)
            return [];
          const children = Array.from(template.content?.children || []);
          rememberShadowContentHost(children, el);
          return children;
        }
        function assignedSlotChildren(slot) {
          if (slot?.tagName?.toLowerCase() !== "slot")
            return [];
          const assignedElements = typeof slot.assignedElements === "function" ? slot.assignedElements({ flatten: true }) : [];
          if (assignedElements.length)
            return assignedElements;
          const host = shadowContentHostByNode.get(slot);
          if (!host)
            return [];
          const slotName = slot.getAttribute("name") || "";
          return Array.from(host.children || []).filter((child) => {
            if (child.tagName?.toLowerCase() === "template" && child.getAttribute("shadowrootmode")) {
              return false;
            }
            return (child.getAttribute("slot") || "") === slotName;
          });
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
            for (const child of shadowContentChildren(node)) {
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
          return normalize(value.split(/\s+/).map((id) => normalize(resolveIdRef(id)?.textContent) || "").filter(Boolean).join(" "));
        }
        function labelForControl(el) {
          if ("labels" in el && el.labels?.length) {
            return normalize((textWithoutInteractive(el.labels[0]) || readableText(el.labels[0]))?.replace(/:\s*/g, ": "));
          }
          const id = el.getAttribute("id");
          if (!id)
            return void 0;
          const label = document.querySelector(`label[for="${cssEscape(id)}"]`);
          return label ? normalize((textWithoutInteractive(label) || readableText(label))?.replace(/:\s*/g, ": ")) : void 0;
        }
        function compactInputActionGroupLabel(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          const tag = el.tagName.toLowerCase();
          if (!["div", "form"].includes(tag))
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
            return void 0;
          }
          const directLabels = Array.from(el.children).filter((child) => child.tagName?.toLowerCase() === "label" && !isHidden(child));
          if (directLabels.length !== 1)
            return void 0;
          const label = directLabels[0];
          const controls = Array.from(el.querySelectorAll("input:not([type='hidden']), textarea, [role='textbox'], [role='searchbox']")).filter((control2) => !isHidden(control2));
          const buttons = Array.from(el.querySelectorAll("button, [role='button']")).filter((button) => !isHidden(button));
          if (controls.length !== 1 || buttons.length !== 1)
            return void 0;
          const control = controls[0];
          if (control.getAttribute("role") === "combobox" || control.getAttribute("aria-autocomplete") || control.getAttribute("aria-controls") || control.getAttribute("aria-expanded")) {
            return void 0;
          }
          const labelText = normalize(label.getAttribute("aria-label") || textWithoutInteractive(label) || readableText(label));
          if (!labelText)
            return void 0;
          const labelFor = normalize(label.getAttribute("for"));
          const controlId = normalize(control.getAttribute("id"));
          const controlName = accessibleName(control, implicitRole(control));
          const controlPlaceholder = normalize(control.getAttribute("placeholder"));
          if (labelFor && controlId && labelFor !== controlId && normalize(control.getAttribute("aria-label")) !== labelText) {
            return void 0;
          }
          if (controlName && controlName !== labelText && controlPlaceholder !== labelText) {
            return void 0;
          }
          return labelText;
        }
        function buttonShellControl(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!["div", "span"].includes(el.tagName.toLowerCase()))
            return false;
          const children = Array.from(el.children || []);
          if (children.length < 1 || children.length > 3)
            return void 0;
          if (el.matches(interactiveSelector))
            return false;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
            return void 0;
          }
          if (directOwnText(el))
            return void 0;
          const visibleChildren = children.filter((child) => !isHidden(child));
          const controls = visibleChildren.filter((child) => child.tagName?.toLowerCase() === "button" || child.getAttribute?.("role") === "button");
          if (controls.length !== 1)
            return void 0;
          const control = controls[0];
          if (!accessibleName(control, "button"))
            return void 0;
          if (readableText(control))
            return void 0;
          const decorativeOnly = visibleChildren.every((child) => {
            if (child === control)
              return true;
            if (child.matches?.(interactiveSelector))
              return false;
            return !directOwnText(child) && !child.querySelector?.(interactiveSelector);
          });
          return decorativeOnly ? control : void 0;
        }
        function buttonShellSiblings(el) {
          const parent = el?.parentElement;
          if (!parent)
            return [];
          return Array.from(parent.children || []).filter((sibling) => Boolean(buttonShellControl(sibling)));
        }
        function isButtonShellGroup(el) {
          if (!buttonShellControl(el))
            return false;
          return buttonShellSiblings(el).length >= 2;
        }
        function isButtonShellClusterGroup(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!["div", "span"].includes(el.tagName.toLowerCase()))
            return false;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length < 2 || visibleChildren.length > 6)
            return false;
          if (el.matches(interactiveSelector))
            return false;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
            return false;
          }
          if (directOwnText(el))
            return false;
          const shellChildren = visibleChildren.filter((child) => isButtonShellGroup(child));
          if (shellChildren.length < 2)
            return false;
          return visibleChildren.every((child) => {
            if (shellChildren.includes(child))
              return true;
            if (child.matches?.(interactiveSelector))
              return false;
            return !directOwnText(child) && !child.querySelector?.(interactiveSelector);
          });
        }
        function isClusteredVisualButton(el, role) {
          if (role !== "button")
            return false;
          if (!el.hasAttribute("aria-label"))
            return false;
          if (readableText(el))
            return false;
          const parent = el.parentElement;
          if (!parent)
            return false;
          const visualButtons = Array.from(parent.children || []).filter((sibling) => {
            if (!sibling || isHidden(sibling))
              return false;
            if (implicitRole(sibling) !== "button")
              return false;
            if (!sibling.hasAttribute("aria-label"))
              return false;
            if (readableText(sibling))
              return false;
            return Boolean(sibling.querySelector?.("span[aria-hidden='true'], svg[aria-hidden='true'], img[alt='']"));
          });
          if (visualButtons.length >= 3 && visualButtons.includes(el))
            return true;
          return visualButtons.includes(el) && Array.from(parent.children || []).some((sibling) => sibling !== el && isButtonShellClusterGroup(sibling));
        }
        function nestedImageLabels(el) {
          return Array.from(el.querySelectorAll("img[alt], [role='img'][aria-label], svg[aria-label]")).filter((node) => !isHidden(node)).map((image) => {
            const tag = image.tagName.toLowerCase();
            return normalize(image.getAttribute("aria-label") || (tag === "img" ? image.getAttribute("alt") : "") || image.getAttribute("title"));
          }).filter((label) => Boolean(label));
        }
        function nestedImageLabel(el) {
          return nestedImageLabels(el)[0];
        }
        function embeddedControlLabelFragments(el) {
          const fragments = [];
          function push(fragment) {
            const normalized = normalize(fragment);
            if (normalized)
              fragments.push(normalized);
          }
          function collect(node) {
            if (!node)
              return;
            if (node.nodeType === Node.TEXT_NODE) {
              push(node.textContent || "");
              return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            if (node.matches("[aria-hidden='true']"))
              return;
            const role = implicitRole(node);
            if (role === "image") {
              push(accessibleName(node, "image"));
              return;
            }
            for (const child of Array.from(node.childNodes))
              collect(child);
            for (const child of shadowContentChildren(node))
              collect(child);
          }
          for (const child of Array.from(el.childNodes || []))
            collect(child);
          for (const child of shadowContentChildren(el))
            collect(child);
          return fragments;
        }
        function embeddedControlContentName(el) {
          if (!nestedImageLabels(el).length && !linkSharesListWithImageCardLinks(el)) {
            return readableText(el);
          }
          const fragments = embeddedControlLabelFragments(el);
          return fragments.length ? normalize(fragments.join(" ")) : readableText(el);
        }
        function linkSharesListWithImageCardLinks(el) {
          if (el?.tagName?.toLowerCase() !== "a" && el?.getAttribute?.("role") !== "link") {
            return false;
          }
          const listItem = el.closest("li,[role='listitem']");
          const list = listItem?.parentElement;
          if (!list || implicitRole(list) !== "list")
            return false;
          return Array.from(list.querySelectorAll("a[href], [role='link']")).some((link) => link !== el && !isHidden(link) && nestedImageLabels(link).length > 0);
        }
        function linkContentName(el) {
          return embeddedControlContentName(el);
        }
        function hrefSlugLabel(el) {
          if (el?.tagName?.toLowerCase() !== "a")
            return void 0;
          const href = normalize(el.getAttribute("href"));
          if (!href || href.startsWith("#"))
            return void 0;
          let url;
          try {
            url = new URL(href, document.baseURI);
          } catch {
            return void 0;
          }
          if (!["http:", "https:"].includes(url.protocol))
            return void 0;
          const segments = url.pathname.split("/").map((segment) => segment.trim()).filter(Boolean);
          const lastSegment = segments.at(-1);
          if (!lastSegment)
            return void 0;
          const decoded = decodeURIComponent(lastSegment).replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ");
          const acronymWords = /* @__PURE__ */ new Set([
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
            "wcag"
          ]);
          return normalize(decoded.split(/\s+/).map((word) => {
            const lower = word.toLowerCase();
            if (acronymWords.has(lower))
              return lower.toUpperCase();
            return word;
          }).join(" "));
        }
        function buttonContentName(el) {
          return embeddedControlContentName(el);
        }
        function isFocusableImageListItem(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return false;
          if (el.tagName.toLowerCase() !== "li")
            return false;
          if (!el.hasAttribute("tabindex"))
            return false;
          if (el.querySelector(interactiveSelector))
            return false;
          if (!nestedImageLabel(el))
            return false;
          return !textWithoutInteractive(el);
        }
        function hasImageLinkWithCaptionListItemContent(el) {
          if (!isListItem(el))
            return false;
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link));
          if (links.length !== 1 || !isIconOnlyLink(links[0]))
            return false;
          return Boolean(textWithoutInteractive(el));
        }
        function hasNamedImageListItemContent(el) {
          if (!isListItem(el))
            return false;
          if (el.querySelector(interactiveSelector))
            return false;
          return Array.from(el.querySelectorAll("img, [role='img']")).some((image) => !isHidden(image) && implicitRole(image) === "image" && Boolean(accessibleName(image, "image")));
        }
        function isDecorativeEmojiText(el, role) {
          if (role !== "text")
            return false;
          const text = normalize(directOwnText(el) || readableText(el));
          if (!text)
            return false;
          return /^[\p{Extended_Pictographic}\uFE0F\s]+$/u.test(text);
        }
        function joinedPriceDisclosureText(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName.toLowerCase() !== "div")
            return void 0;
          if (el.matches(interactiveSelector) || el.closest(interactiveSelector))
            return void 0;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 2)
            return void 0;
          const [priceWrapper, note] = visibleChildren;
          if (note.tagName?.toLowerCase() !== "span")
            return void 0;
          if (note.querySelector(interactiveSelector))
            return void 0;
          const priceText = normalize(readableText(priceWrapper));
          const noteText = normalize(readableText(note));
          if (!priceText || !noteText)
            return void 0;
          if (!/^(from\s+)?[£$€]\s?\d+(?:[.,]\d+)?\s*\/\s*(?:month|mo|mth)$/i.test(priceText)) {
            return void 0;
          }
          if (!/\bprices?\s+may\s+change\b/i.test(noteText) || !/\bminimum\s+term\b/i.test(noteText)) {
            return void 0;
          }
          const ariaHiddenDuplicate = Array.from(priceWrapper.querySelectorAll("[aria-hidden='true']")).some((candidate) => normalize(candidate.textContent || "") !== void 0);
          if (!ariaHiddenDuplicate)
            return void 0;
          return normalize(`${priceText} ${noteText}`);
        }
        function groupedMetricCardText(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName.toLowerCase() !== "div")
            return void 0;
          if (el.matches(interactiveSelector) || el.closest(interactiveSelector))
            return void 0;
          const children = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (children.length !== 2)
            return void 0;
          const [headingRow, body] = children;
          if (headingRow.tagName?.toLowerCase() !== "div" || body.tagName?.toLowerCase() !== "span") {
            return void 0;
          }
          const headingParts = Array.from(headingRow.children || []).filter((child) => !isHidden(child));
          if (headingParts.length !== 2 || headingParts.some((child) => child.tagName?.toLowerCase() !== "span")) {
            return void 0;
          }
          const title = normalize(readableText(headingParts[0]));
          const metric = normalize(readableText(headingParts[1]));
          const bodyText = normalize(readableText(body));
          if (!title || !metric || !bodyText)
            return void 0;
          if (title.length > 80 || /[.!?]$/.test(title))
            return void 0;
          if (!/\b\d+(?:\.\d+)?\s*(?:M|G|K)?bps\b/i.test(metric))
            return void 0;
          if (!/[.!?]$/.test(bodyText))
            return void 0;
          return normalize(`${title} ${metric} ${bodyText}`);
        }
        function isInsideJoinedPriceDisclosure(el) {
          for (let current = el?.parentElement; current; current = current.parentElement) {
            if (joinedPriceDisclosureText(current))
              return true;
          }
          return false;
        }
        function isInsideGroupedMetricCard(el) {
          for (let current = el?.parentElement; current; current = current.parentElement) {
            if (groupedMetricCardText(current))
              return true;
          }
          return false;
        }
        function isFocusableStructuredListItemGroup(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return false;
          if (el.tagName.toLowerCase() !== "li")
            return false;
          if (!el.hasAttribute("tabindex"))
            return false;
          if (isFocusableImageListItem(el))
            return false;
          if (!hasStructuredListItemContent(el))
            return false;
          if (!readableText(el))
            return false;
          const hasHeadingCardContent = Boolean(el.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']") && el.querySelector("p, button, [role='button'], a[href], [role='link']"));
          const hasImageTextCardContent = Boolean(!el.querySelector(interactiveSelector) && el.querySelector("img, [role='img'], svg[aria-label]") && el.querySelectorAll("p").length > 1);
          return hasHeadingCardContent || hasImageTextCardContent;
        }
        function focusableStructuredListItemName(el) {
          return normalize(readableText(el)?.replace(/\+(?=\p{L})/gu, "+ "));
        }
        function isCustomElement(el) {
          return Boolean(el?.tagName?.toLowerCase().includes("-"));
        }
        function closestCustomElement(el) {
          for (let current = el?.parentElement; current; current = current.parentElement) {
            if (isCustomElement(current))
              return current;
            const shadowHost2 = shadowContentHostByNode.get(current);
            if (isCustomElement(shadowHost2))
              return shadowHost2;
          }
          const shadowHost = shadowContentHostByNode.get(el);
          if (isCustomElement(shadowHost))
            return shadowHost;
          return null;
        }
        function isFocusableCustomTooltipTrigger(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!el.hasAttribute("tabindex") || el.getAttribute("tabindex") === "-1")
            return false;
          if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector))
            return false;
          if (!directOwnText(el))
            return false;
          const host = closestCustomElement(el);
          if (!host)
            return false;
          return /tooltip/i.test(host.tagName.toLowerCase());
        }
        function hasShadowRootContent(el) {
          return Boolean(el?.shadowRoot || Array.from(el?.children || []).some((child) => child.tagName?.toLowerCase() === "template" && child.getAttribute("shadowrootmode")));
        }
        function isLabeledIconActionButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (isSlideshowNavigationButton(el))
            return false;
          if (isCarouselControlButton(el))
            return false;
          if (!el.hasAttribute("aria-label"))
            return false;
          if (normalizedPopup(el) || el.hasAttribute("aria-expanded"))
            return false;
          if (isPositionedImageChoiceButton(el))
            return false;
          const label = normalize(el.getAttribute("aria-label"));
          if (/^(previous|next) slide\b/i.test(label || ""))
            return false;
          return Boolean(el.querySelector("svg, [role='img'], img"));
        }
        function isPositionedImageChoiceButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (!el.hasAttribute("aria-label"))
            return false;
          if (nestedImageLabel(el))
            return false;
          if (readableText(el))
            return false;
          if (!el.querySelector("svg, [role='img'], img"))
            return false;
          if (!hasOnlyInteractiveListItemContent(semanticListContext(el).listItem))
            return false;
          const rect = el.getBoundingClientRect?.();
          if (rect && (rect.width > 80 || rect.height > 80))
            return false;
          return Boolean(positionInSet(el, "button"));
        }
        function isIconFirstTextButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (!readableText(el))
            return false;
          if (normalizedPopup(el) || el.hasAttribute("aria-expanded"))
            return false;
          for (const child of Array.from(el.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
              if (normalize(child.textContent))
                return false;
              continue;
            }
            if (child.nodeType !== Node.ELEMENT_NODE) {
              continue;
            }
            const marker = renderedHiddenValue(child);
            const style = getComputedStyle(child);
            if (marker && marker !== "false" || style.display === "none")
              continue;
            const selector = "svg, img, [role='img']";
            return child.matches(selector) || Boolean(child.querySelector(selector));
          }
          return false;
        }
        function isTextWithTrailingIconButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          const label = normalize(accessibleName(el, "button") || readableText(el));
          if (!/^learn more$/i.test(label || ""))
            return false;
          if (normalizedPopup(el) || el.hasAttribute("aria-expanded"))
            return false;
          if (el.closest("form"))
            return false;
          if (isPositionedImageChoiceButton(el))
            return false;
          if (semanticListContext(el).listItem && positionInSet(el, "button")) {
            return false;
          }
          return Boolean(el.querySelector("p, span") && el.querySelector("svg, img, [role='img']"));
        }
        function isTrailingDisclaimerButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (normalizedPopup(el) || el.hasAttribute("aria-expanded"))
            return false;
          if (el.querySelector("svg, [role='img'], img"))
            return false;
          const label = readableText(el) || accessibleName(el, "button");
          if (!label)
            return false;
          if (!/\blegals?\b/i.test(label))
            return false;
          for (let current = el.parentElement, depth = 0; current && depth < 4; current = current.parentElement, depth += 1) {
            if (current === document.body || current === document.documentElement)
              break;
            const textBeforeButton = normalize(textWithoutInteractive(current));
            if (!textBeforeButton || !/[.!?]$/.test(textBeforeButton))
              continue;
            const fullText = normalize(readableText(current));
            if (fullText.endsWith(label))
              return true;
          }
          return false;
        }
        function isCarouselControlButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          const controls = normalize(el.getAttribute("aria-controls"));
          if (!controls)
            return false;
          const controlled = resolveIdRef(controls);
          return Boolean(controlled?.closest?.("[aria-roledescription='carousel'], [aria-roledescription='slideshow']"));
        }
        function isSlideshowNavigationButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (el.hasAttribute("aria-pressed"))
            return false;
          const label = normalize(el.getAttribute("aria-label") || el.getAttribute("title") || textWithoutInteractive(el) || readableText(el));
          if (!/^(previous|next)(\b|,)/i.test(label || ""))
            return false;
          if (/^(previous|next) slide\b/i.test(label || ""))
            return false;
          if (/^(previous|next) item, .+ gallery$/i.test(label || ""))
            return true;
          return Boolean(el.closest("[aria-roledescription='slideshow'], [aria-roledescription='carousel']"));
        }
        function isImplicitDisabledPreviousSlideButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (el.disabled || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") {
            return false;
          }
          const label = normalize(el.getAttribute("aria-label") || el.getAttribute("title") || textWithoutInteractive(el) || readableText(el));
          if (label !== "Previous slide")
            return false;
          for (let current = el.parentElement, depth = 0; current && depth < 4; current = current.parentElement, depth += 1) {
            const buttons = Array.from(current.querySelectorAll("button, [role='button']")).filter((button) => !isHidden(button));
            const index = buttons.indexOf(el);
            if (index < 0)
              continue;
            const nextButton = buttons[index + 1];
            const nextLabel = normalize(nextButton?.getAttribute("aria-label") || nextButton?.getAttribute("title") || textWithoutInteractive(nextButton) || readableText(nextButton));
            if (nextLabel === "Next slide") {
              const hasFollowingFocusableListItems = Array.from(current.querySelectorAll("li[tabindex], [role='listitem'][tabindex]")).some((item) => !isHidden(item) && Boolean(nextButton.compareDocumentPosition(item) & nextButton.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING));
              if (hasFollowingFocusableListItems) {
                return true;
              }
            }
          }
          return false;
        }
        function isMenuDisclosureGroupButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (!el.hasAttribute("aria-expanded"))
            return false;
          if (normalizedPopup(el))
            return false;
          if (buttonSharesListItemWithLink(el))
            return false;
          const label = normalize(el.getAttribute("aria-label") || el.getAttribute("title") || textWithoutInteractive(el) || readableText(el));
          return /^(show .+ menu|open menu|all .+ destinations menu)$/i.test(label || "");
        }
        function buttonSharesListItemWithLink(el) {
          if (implicitRole(el) !== "button")
            return false;
          const listItem = semanticListContext(el).listItem;
          if (!listItem)
            return false;
          return Array.from(listItem.querySelectorAll("a[href], [role='link']")).some((link) => !isHidden(link) && !link.contains(el) && !el.contains(link));
        }
        function isPlainUtilityDisclosureButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (!el.hasAttribute("aria-expanded"))
            return false;
          if (normalizedPopup(el))
            return false;
          const label = normalize(el.getAttribute("aria-label") || el.getAttribute("title") || textWithoutInteractive(el) || readableText(el));
          return /^(open search|open alerts\b.*|open help menu)$/i.test(label || "");
        }
        function isSimpleNativeFooter(el) {
          if (el?.tagName?.toLowerCase() !== "footer")
            return false;
          if (el.hasAttribute("role"))
            return false;
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
            return false;
          }
          if (el.querySelector("ul, ol, nav, [role='navigation']") || el.querySelectorAll("a[href], [role='link']").length >= 3) {
            return true;
          }
          return !el.querySelector("h1, h2, h3, h4, h5, h6, p, nav, [role='heading'], [role='navigation']");
        }
        function isEmptyAlertBeforeDialog(el) {
          if (implicitRole(el) !== "alert")
            return false;
          if (readableText(el))
            return false;
          const rootHost = el.getRootNode?.().host;
          if (rootHost?.tagName?.toLowerCase() === "next-route-announcer") {
            for (let sibling = rootHost.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
              if (sibling.getAttribute("role") === "dialog")
                return true;
              if (isHidden(sibling))
                continue;
              if (!sibling.getAttribute("role") && !readableText(sibling) && !hasVisibleInteractiveDescendant(sibling)) {
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
              if (sibling.getAttribute("role") === "dialog")
                return true;
              if (isHidden(sibling))
                continue;
              if (!sibling.getAttribute("role") && !readableText(sibling) && !hasVisibleInteractiveDescendant(sibling)) {
                continue;
              }
              return false;
            }
          }
          return false;
        }
        function isFooterCountrySelector(el) {
          if (el?.tagName?.toLowerCase() !== "select")
            return false;
          const footer = el.closest("footer,[role='contentinfo']");
          if (!footer)
            return false;
          const label = labelForControl(el) || accessibleName(el, "combobox");
          if (!/^country:\s*$/i.test(label || ""))
            return false;
          const visibleModalDialog = el.ownerDocument.querySelector("[role='dialog'][aria-modal='true']:not([data-sr-computed-hidden])");
          if (visibleModalDialog)
            return false;
          return Boolean(Array.from(footer.querySelectorAll("a[href], [role='link']")).some((link) => /back to top/i.test(accessibleName(link, "link") || readableText(link) || "")));
        }
        function accessibleName(el, role) {
          const tag = el.tagName.toLowerCase();
          const ariaLabel = normalize(el.getAttribute("aria-label"));
          const labelledBy = textFromIdRefs(el.getAttribute("aria-labelledby"));
          const nativeLabel = ["input", "select", "textarea"].includes(tag) ? labelForControl(el) : void 0;
          if (nativeLabel)
            return nativeLabel;
          if (ariaLabel !== void 0)
            return ariaLabel;
          if (labelledBy)
            return labelledBy;
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
            "tabpanel",
            "article"
          ].includes(role)) {
            return normalize(el.getAttribute("title"));
          }
          if (role === "group" && !el.matches(interactiveSelector)) {
            const compactLabel = compactInputActionGroupLabel(el);
            if (compactLabel)
              return compactLabel;
            if (isFocusableImageListItem(el))
              return nestedImageLabel(el);
            if (isFocusableStructuredListItemGroup(el)) {
              return focusableStructuredListItemName(el);
            }
            return normalize(el.getAttribute("title"));
          }
          if (tag === "img")
            return normalize(el.getAttribute("alt"));
          if (["input", "select", "textarea"].includes(tag))
            return nativeLabel;
          if (role === "link") {
            return linkContentName(el) || normalize(el.getAttribute("title")) || hrefSlugLabel(el);
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
          if (isFocusableImageListItem(el))
            return "group";
          if (isFocusableStructuredListItemGroup(el))
            return "group";
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
          if (tag === "header") {
            return el.closest("main, article, aside, nav, section") ? "" : "banner";
          }
          if (tag === "nav")
            return "navigation";
          if (tag === "main")
            return "main";
          if (tag === "article")
            return "article";
          if (tag === "search")
            return "search";
          if (tag === "footer") {
            return el.closest("main, article, aside, nav, section") ? "" : "contentinfo";
          }
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
          if (tag === "th") {
            const scope = (el.getAttribute("scope") || "").toLowerCase();
            if (scope === "row" || scope === "rowgroup")
              return "rowheader";
            if (scope === "col" || scope === "colgroup")
              return "columnheader";
            if (el.closest("tbody, tfoot"))
              return "rowheader";
            return "columnheader";
          }
          if (tag === "td")
            return "cell";
          if (tag === "img")
            return "image";
          if (tag === "svg")
            return "image";
          if (tag === "dialog")
            return "dialog";
          if (tag === "fieldset" && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))) {
            return "group";
          }
          if (tag === "blockquote")
            return el.closest("figure") ? "blockquote" : "paragraph";
          if (tag === "p" || tag === "figcaption" || tag === "time" || isRichProductCardOfferBanner(el) || isStructuredListBodyText(el) || isInteractiveListBodyText(el)) {
            return "paragraph";
          }
          if (joinedPriceDisclosureText(el))
            return "text";
          if (groupedMetricCardText(el))
            return "text";
          if (expandedRegionInlineLinkFragments(el))
            return "paragraph";
          if (["section", "div", "form"].includes(tag) && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))) {
            return tag === "section" ? "region" : "group";
          }
          if (compactInputActionGroupLabel(el))
            return "group";
          if (isButtonShellClusterGroup(el))
            return "group";
          if (isButtonShellGroup(el))
            return "group";
          if (isCustomElement(el) && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || hasShadowRootContent(el)) && hasVisibleInteractiveDescendant(el)) {
            return "group";
          }
          if (["span", "div"].includes(tag) && directOwnText(el) && !el.querySelector(interactiveSelector) && !el.closest(interactiveSelector) && (isSplitTextListItemBlock(el) || isExpandedRegionBodyText(el) || isRichProductCardTextFragment(el) || hasImageLinkWithCaptionListItemContent(el.closest("li,[role='listitem']")) || !el.closest("p, li, h1, h2, h3, h4, h5, h6"))) {
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
        function isSeparatorListItem(el) {
          if (!isListItem(el))
            return false;
          const text = normalize(textWithoutInteractive(el) || readableText(el));
          return Boolean(text && /^[|/\\•·]+$/.test(text));
        }
        function slottedCarouselSlidesForList(list) {
          const slot = walkChildren(list).find((child) => child.tagName?.toLowerCase() === "slot");
          if (!slot)
            return [];
          const assigned = assignedSlotChildren(slot).filter((child) => !isHidden(child));
          if (assigned.length)
            return assigned;
          const host = shadowContentHostByNode.get(slot) || shadowContentHostByNode.get(list);
          return Array.from(host?.children || []).filter((child) => {
            if (child.tagName?.toLowerCase() === "template" && child.getAttribute("shadowrootmode")) {
              return false;
            }
            return !isHidden(child) && !(child.getAttribute("slot") || "");
          });
        }
        function isFlattenedSlottedCarouselList(list) {
          if (!list || list.nodeType !== Node.ELEMENT_NODE || isHidden(list))
            return false;
          const tag = list.tagName.toLowerCase();
          if (tag !== "ul" && tag !== "ol")
            return false;
          if (!/\bcarousel\b/i.test(list.getAttribute("class") || ""))
            return false;
          const assignedSlides = slottedCarouselSlidesForList(list).filter((child) => !isHidden(child) && isCustomElement(child));
          if (assignedSlides.length < 2)
            return false;
          return assignedSlides.some((slide) => Boolean(slide.getAttribute("class")?.match(/\bcarousel__panel\b|\bcarousel-panel\b/i)));
        }
        function flattenedSlottedCarouselLists(root = document.body) {
          if (root === document.body && flattenedSlottedCarouselListCache) {
            return flattenedSlottedCarouselListCache;
          }
          const lists = [];
          const visit = (node) => {
            if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            if (isFlattenedSlottedCarouselList(node)) {
              lists.push(node);
              return;
            }
            for (const child of walkChildren(node))
              visit(child);
          };
          visit(root);
          if (root === document.body) {
            flattenedSlottedCarouselListCache = lists;
          }
          return lists;
        }
        function flattenedSlottedCarouselAssignedSlides(list) {
          if (!isFlattenedSlottedCarouselList(list))
            return [];
          return slottedCarouselSlidesForList(list);
        }
        function flattenedSlottedCarouselStops(list) {
          if (!isFlattenedSlottedCarouselList(list))
            return [];
          const cached = flattenedSlottedCarouselStopCache.get(list);
          if (cached)
            return cached;
          const stops = [];
          for (const slide of flattenedSlottedCarouselAssignedSlides(list)) {
            let countedPrimaryLink = false;
            const visit = (node) => {
              if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
                return;
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
              for (const child of walkChildren(node))
                visit(child);
            };
            for (const child of walkChildren(slide))
              visit(child);
          }
          flattenedSlottedCarouselStopCache.set(list, stops);
          return stops;
        }
        function flattenedSlottedCarouselPosition(el) {
          for (const list of flattenedSlottedCarouselLists()) {
            let position = 0;
            const stops = flattenedSlottedCarouselStops(list);
            const setSize2 = stops.filter((item) => item.counted).length;
            for (const stop of stops) {
              if (stop.counted)
                position += 1;
              if (stop.el === el) {
                if (!stop.counted)
                  return {};
                return {
                  positionInSet: position,
                  setSize: setSize2
                };
              }
            }
          }
          return {};
        }
        function flattenedSlottedCarouselImageInfo(el) {
          if (implicitRole(el) !== "image")
            return {};
          const imageName = normalize(accessibleName(el, "image"));
          if (imageName?.toLowerCase() !== "image")
            return {};
          const imagePosition = flattenedSlottedCarouselPosition(el).positionInSet;
          if (!imagePosition)
            return {};
          let firstImagePosition;
          for (const list of flattenedSlottedCarouselLists()) {
            let position = 0;
            for (const stop of flattenedSlottedCarouselStops(list)) {
              if (stop.counted)
                position += 1;
              if (implicitRole(stop.el) !== "image")
                continue;
              const stopName = normalize(accessibleName(stop.el, "image"));
              if (stopName?.toLowerCase() !== "image")
                continue;
              if (firstImagePosition === void 0 || position < firstImagePosition) {
                firstImagePosition = position;
              }
            }
          }
          return {
            unlabeledImage: true,
            imageMissingDescriptionHint: imagePosition === firstImagePosition
          };
        }
        function cmsMediaPathLabel(el) {
          const src = normalize(el?.getAttribute?.("src"));
          if (!src)
            return void 0;
          const match = src.match(/\/cms\/delivery\/media\/([^?#/]+)/i);
          return match ? `/${match[1]}` : void 0;
        }
        function isInformativeUnlabeledCmsImage(el) {
          if (el?.tagName?.toLowerCase() !== "img")
            return false;
          if (el.hasAttribute("alt") && !normalize(el.getAttribute("alt")))
            return false;
          if (accessibleName(el, "image"))
            return false;
          if (!cmsMediaPathLabel(el))
            return false;
          const host = closestCustomElement(el);
          if (!host)
            return false;
          const hostName = host.tagName.toLowerCase();
          if (!/(side-by-side|hero|banner|tile|card)/i.test(hostName))
            return false;
          return Boolean(readableText(host));
        }
        function flattenedSlottedCarouselSetSize(list) {
          if (!isFlattenedSlottedCarouselList(list))
            return void 0;
          return flattenedSlottedCarouselStops(list).filter((stop) => stop.counted).length || void 0;
        }
        function isFlattenedSlottedCarouselGroupWrapper(el) {
          if (!isCustomElement(el))
            return false;
          if (accessibleName(el, "group"))
            return false;
          if (flattenedSlottedCarouselLists().some((list) => flattenedSlottedCarouselAssignedSlides(list).includes(el))) {
            return true;
          }
          return flattenedSlottedCarouselLists(el).length > 0;
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
          const children = walkChildren(list);
          const hasNativeItems = children.some((child) => isListItem(child));
          return children.filter((child) => isListItem(child) || hasNativeItems && isDirectInvalidListContentItem(list, child));
        }
        function announcedListChildren(list) {
          return listChildren(list).filter((child) => !isSeparatorListItem(child));
        }
        function selectedListboxOptions(el) {
          if (implicitRole(el) !== "listbox")
            return [];
          return Array.from(el.querySelectorAll("[role='option']")).filter((option) => !isHidden(option) && (option.getAttribute("aria-selected") === "true" || option.getAttribute("aria-checked") === "true"));
        }
        function singleSelectedListboxOption(el) {
          if (el.getAttribute("aria-multiselectable") === "true")
            return void 0;
          const selected = selectedListboxOptions(el);
          return selected.length === 1 ? selected[0] : void 0;
        }
        function radioGroupOptions(el) {
          if (implicitRole(el) !== "radio")
            return [];
          const tag = el.tagName?.toLowerCase();
          const name = normalize(el.getAttribute("name"));
          if (tag === "input" && name) {
            for (let current = el.parentElement; current; current = current.parentElement) {
              const localRadios = Array.from(current.querySelectorAll(`input[type='radio'][name='${cssEscape(name)}']`)).filter((radio) => !isHidden(radio));
              if (localRadios.length > 1)
                return localRadios;
            }
            const root = el.closest("form") || document;
            return Array.from(root.querySelectorAll(`input[type='radio'][name='${cssEscape(name)}']`)).filter((radio) => !isHidden(radio));
          }
          const container = el.closest("[role='radiogroup']");
          if (!container)
            return [];
          return Array.from(container.querySelectorAll("[role='radio']")).filter((radio) => !isHidden(radio));
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
        function generatedPseudoCollectionSide(el, side) {
          const attr = el?.getAttribute?.(`data-sr-pseudo-${side}-layout-item`) ?? el?.getAttribute?.(`data-sr-pseudo-${side}`);
          if (attr === "collection-item")
            return true;
          if (attr === "true")
            return true;
          if (attr === "none")
            return false;
          if (attr === "false")
            return false;
          if (typeof getComputedStyle !== "function")
            return false;
          if (/\bjsdom\b/i.test(el?.ownerDocument?.defaultView?.navigator?.userAgent || "")) {
            return false;
          }
          try {
            const pseudo = getComputedStyle(el, `::${side}`);
            const content = normalize(pseudo?.content);
            if (!content || content === "none" || content === "normal")
              return false;
            if (pseudo.display === "none" || pseudo.display === "contents" || pseudo.visibility === "hidden" || pseudo.position === "absolute" || pseudo.position === "fixed") {
              return false;
            }
            const display = normalize(getComputedStyle(el).display) || "";
            if (!/^(inline-)?(grid|flex)$/.test(display))
              return false;
            return true;
          } catch {
            return false;
          }
        }
        function generatedPseudoCollectionPadding(list) {
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()) && !["list", "grid"].includes(implicitRole(list) || "")) {
            return { before: 0, after: 0 };
          }
          return {
            before: generatedPseudoCollectionSide(list, "before") ? 1 : 0,
            after: generatedPseudoCollectionSide(list, "after") ? 1 : 0
          };
        }
        function shouldApplyGeneratedPseudoCollectionPadding(el, role) {
          return role === "group" && isFocusableStructuredListItemGroup(el);
        }
        function adjustedListPosition(index, list, el, role) {
          const padding = shouldApplyGeneratedPseudoCollectionPadding(el, role) ? generatedPseudoCollectionPadding(list) : { before: 0 };
          return index + 1 + padding.before;
        }
        function adjustedListSetSize(siblings, list, el, role) {
          if (!shouldApplyGeneratedPseudoCollectionPadding(el, role)) {
            return siblings.length || void 0;
          }
          const padding = generatedPseudoCollectionPadding(list);
          return siblings.length + padding.before + padding.after || void 0;
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
          const earlierNestedListInSameItem = Array.from(parentItem.querySelectorAll("ul, ol, dl, [role='list']")).some((list) => list !== el && Boolean(list.compareDocumentPosition(el) & list.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING));
          if (earlierNestedListInSameItem) {
            return {};
          }
          const earlierSiblingHasNestedList = siblings.slice(0, Math.max(0, index)).some((sibling) => Boolean(sibling.querySelector("ul, ol, dl, [role='list']")));
          if (earlierSiblingHasNestedList) {
            return {};
          }
          return index >= 0 ? {
            parentPositionInSet: index + 1,
            parentSetSize: siblings.length || void 0
          } : {};
        }
        function positionInSet(el, role) {
          const explicit = Number.parseInt(el.getAttribute("aria-posinset") || "", 10);
          if (Number.isFinite(explicit) && explicit > 0)
            return explicit;
          const flattenedCarouselPosition = flattenedSlottedCarouselPosition(el).positionInSet;
          if (flattenedCarouselPosition)
            return flattenedCarouselPosition;
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
          if (role === "radio") {
            const radios = radioGroupOptions(el);
            const index = radios.indexOf(el);
            return index >= 0 ? index + 1 : void 0;
          }
          if (role === "image" && hasStructuredListItemContent(el.closest("li,[role='listitem']"))) {
            if (!shouldPositionStructuredListImage(el))
              return void 0;
            const listItem = el.closest("li,[role='listitem']");
            const { siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : void 0;
          }
          if (role === "text" && isFirstSplitTextListItemBlock(el) && !el.closest("li,[role='listitem']")?.querySelector("img, [role='img'], svg[aria-label]")) {
            const { listItem, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : void 0;
          }
          if (role === "text" && isFirstRichProductCardTextFragment(el)) {
            const { listItem, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : void 0;
          }
          if (["heading", "link"].includes(role) && structuredListItemHasPreHeadingImage(el.closest("li,[role='listitem']"))) {
            return void 0;
          }
          if (role === "link" && Array.from(el.closest("li,[role='listitem']")?.querySelectorAll("div") || []).some((candidate) => isInteractiveListBodyText(candidate))) {
            return void 0;
          }
          if (role === "link" && isGenericDealCtaLink(el)) {
            return void 0;
          }
          if (role === "button" && hasRichProductCardListItemContent(el.closest("li,[role='listitem']"))) {
            return void 0;
          }
          if (role === "paragraph" && isFirstInteractiveListBodyText(el)) {
            const { listItem, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : void 0;
          }
          if (role === "paragraph" && isFirstTextBlockListItemParagraph(el)) {
            const { listItem, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : void 0;
          }
          if (role === "paragraph" && isFirstRichProductCardParagraph(el)) {
            const { listItem, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : void 0;
          }
          if (role === "paragraph" && isRichProductCardOfferBanner(el)) {
            const { listItem, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : void 0;
          }
          if (listPositionedRoles.has(role)) {
            const { listItem, list, siblings } = semanticListContext(el);
            if (role === "button" && listItem && Array.from(listItem.querySelectorAll("a[href], [role='link']")).some((link) => !isHidden(link) && !link.contains(el) && !el.contains(link))) {
              return void 0;
            }
            const index = siblings.indexOf(listItem);
            return index >= 0 ? adjustedListPosition(index, list, el, role) : void 0;
          }
          return void 0;
        }
        function setSize(el, role) {
          const explicit = Number.parseInt(el.getAttribute("aria-setsize") || "", 10);
          if (Number.isFinite(explicit) && explicit > 0)
            return explicit;
          if (role === "list") {
            const flattenedSize = flattenedSlottedCarouselSetSize(el);
            return flattenedSize ?? (announcedListChildren(el).length || void 0);
          }
          const flattenedCarouselSize = flattenedSlottedCarouselPosition(el).setSize;
          if (flattenedCarouselSize)
            return flattenedCarouselSize;
          if (role === "option") {
            return Array.from(el.parentElement?.querySelectorAll("[role='option']") || []).filter((option) => !isHidden(option)).length || void 0;
          }
          if (role === "tab") {
            return Array.from(el.closest("[role='tablist']")?.querySelectorAll("[role='tab']") || []).filter((tab) => !isHidden(tab)).length || void 0;
          }
          if (role === "radio")
            return radioGroupOptions(el).length || void 0;
          if (role === "image" && hasStructuredListItemContent(el.closest("li,[role='listitem']"))) {
            if (!shouldPositionStructuredListImage(el))
              return void 0;
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          if (role === "link" && isGenericDealCtaLink(el)) {
            return void 0;
          }
          if (listPositionedRoles.has(role)) {
            const { list, siblings } = semanticListContext(el);
            return adjustedListSetSize(siblings, list, el, role);
          }
          if (role === "paragraph" && isFirstInteractiveListBodyText(el)) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          if (role === "paragraph" && isFirstTextBlockListItemParagraph(el)) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          if (role === "paragraph" && isFirstRichProductCardParagraph(el)) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          if (role === "paragraph" && isRichProductCardOfferBanner(el)) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          if (role === "text" && isFirstRichProductCardTextFragment(el)) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          if (role === "button" && hasRichProductCardListItemContent(el.closest("li,[role='listitem']"))) {
            return void 0;
          }
          if (role === "text" && isFirstSplitTextListItemBlock(el) && !el.closest("li,[role='listitem']")?.querySelector("img, [role='img'], svg[aria-label]")) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          return void 0;
        }
        function shouldPositionStructuredListImage(el) {
          const listItem = el.closest("li,[role='listitem']");
          if (!listItem || !hasStructuredListItemContent(listItem))
            return false;
          const images = Array.from(listItem.querySelectorAll("*")).filter((image) => !isHidden(image) && implicitRole(image) === "image");
          if (images.indexOf(el) > 0)
            return false;
          return !accessibleName(el, "image") || !listItem.querySelector(interactiveSelector);
        }
        function directSemanticChildren(el) {
          return walkChildren(el).filter((child) => {
            if (isHidden(child))
              return false;
            const role = implicitRole(child);
            return Boolean(role && role !== "none" && role !== "presentation");
          });
        }
        function hasDirectNonSemanticTextChild(el) {
          return walkChildren(el).some((child) => {
            if (isHidden(child))
              return false;
            const role = implicitRole(child);
            return !role && Boolean(readableText(child));
          });
        }
        function hasOnlyInteractiveListItemContent(el) {
          if (!isListItem(el))
            return false;
          if (!el.querySelector(interactiveSelector))
            return false;
          return !textWithoutInteractive(el);
        }
        function isDirectInvalidListContentItem(list, child) {
          if (!list || !child || child.parentElement !== list || isHidden(child))
            return false;
          if (!["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return false;
          if (isListItem(child) || child.matches?.("script, style, template"))
            return false;
          if (child.getAttribute?.("role") === "none" || child.getAttribute?.("role") === "presentation") {
            return false;
          }
          return Boolean(readableText(child));
        }
        function isGenericDealCtaLink(el) {
          if (implicitRole(el) !== "link")
            return false;
          const listItem = el.closest("li,[role='listitem']");
          if (!isListItem(listItem))
            return false;
          if (!listItem.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']")) {
            return false;
          }
          const label = accessibleName(el, "link");
          const text = readableText(el);
          return /^View .+ deal$/i.test(label || "") && /^View deal$/i.test(text || "");
        }
        function isUnnamedCarouselRegion(el) {
          if (implicitRole(el) !== "region")
            return false;
          if (accessibleName(el, "region"))
            return false;
          return /^(carousel|slideshow)$/i.test(normalize(el.getAttribute("aria-roledescription")) || "");
        }
        function explicitActiveCarouselSlide(el) {
          const slide = el?.closest?.("[role='group'][tabindex='0']");
          if (!slide || isHidden(slide) || slide.getAttribute("aria-hidden") === "true") {
            return null;
          }
          const carousel = slide.closest("[aria-roledescription='carousel'], [aria-roledescription='slideshow']");
          return carousel ? slide : null;
        }
        function hasActiveCarouselSlide(carousel) {
          return Boolean(carousel?.querySelector?.("[role='group'][tabindex='0'][aria-hidden='false']"));
        }
        function readableStopText(el, role) {
          if (["button", "link", "image"].includes(role)) {
            return accessibleName(el, role);
          }
          return readableText(el);
        }
        function hasLaterReadableStopWithin(boundary, el) {
          const walker = document.createTreeWalker(boundary, boundary.ownerDocument.defaultView.NodeFilter.SHOW_ELEMENT);
          let seen = false;
          let node;
          while (node = walker.nextNode()) {
            if (node === el) {
              seen = true;
              continue;
            }
            if (!seen)
              continue;
            if (el.contains(node) || isHidden(node))
              continue;
            const role = implicitRole(node);
            if ([
              "heading",
              "paragraph",
              "text",
              "button",
              "link",
              "image",
              "textbox",
              "searchbox",
              "combobox"
            ].includes(role) && readableStopText(node, role)) {
              return true;
            }
          }
          return false;
        }
        function isFirstReadableStopWithin(boundary, el) {
          const walker = document.createTreeWalker(boundary, boundary.ownerDocument.defaultView.NodeFilter.SHOW_ELEMENT);
          let node;
          while (node = walker.nextNode()) {
            if (isHidden(node))
              continue;
            const role = implicitRole(node);
            if ([
              "heading",
              "paragraph",
              "text",
              "button",
              "link",
              "image",
              "textbox",
              "searchbox",
              "combobox"
            ].includes(role) && readableStopText(node, role)) {
              return node === el || node.contains(el) || el.contains(node);
            }
          }
          return false;
        }
        function isLeadingCarouselGroupStop(el, role) {
          if (!["paragraph", "text"].includes(role))
            return false;
          const carousel = el.closest("[aria-roledescription='carousel'], [aria-roledescription='slideshow']");
          if (!carousel || !isUnnamedCarouselRegion(carousel))
            return false;
          if (!hasActiveCarouselSlide(carousel))
            return false;
          if (explicitActiveCarouselSlide(el))
            return false;
          return isFirstReadableStopWithin(carousel, el);
        }
        function isTrailingCarouselSlideGroupStop(el, role) {
          if (!["heading", "paragraph", "text"].includes(role))
            return false;
          const slide = explicitActiveCarouselSlide(el);
          if (!slide)
            return false;
          if (!readableStopText(el, role))
            return false;
          return !hasLaterReadableStopWithin(slide, el);
        }
        function standaloneCardBodyTextElement(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.matches(interactiveSelector))
            return false;
          if (el.closest(interactiveSelector))
            return false;
          if (el.closest("h1, h2, h3, h4, h5, h6, [role='heading']"))
            return false;
          if (!directOwnText(el))
            return false;
          return !el.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']");
        }
        function isDecorativeMediaOnlyContainer(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.matches(interactiveSelector) || el.querySelector(interactiveSelector))
            return false;
          if (readableText(el))
            return false;
          return Boolean(el.querySelector("img[alt=''], img[role='presentation'], svg[aria-hidden='true'], [role='presentation']"));
        }
        function standaloneContentCardHeading(el, minimumLevel = 2) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!["div", "article", "section"].includes(el.tagName.toLowerCase())) {
            return null;
          }
          if (el.getAttribute("role") || el.closest("li,[role='listitem']")) {
            return null;
          }
          if (el.querySelector("ul, ol, table, [role='list'], [role='table'], [role='grid']")) {
            return null;
          }
          const headings = Array.from(el.querySelectorAll("h2, h3, h4, h5, h6, [role='heading']")).filter((heading) => !isHidden(heading) && Boolean(readableText(heading)));
          if (headings.length !== 1)
            return null;
          const headingTag = headings[0].tagName?.toLowerCase();
          const level = Number.parseInt(headings[0].getAttribute("aria-level") || headingTag.slice(1), 10) || 2;
          if (level < minimumLevel) {
            return null;
          }
          return headings[0];
        }
        function isStandaloneContentCard(el) {
          const heading = standaloneContentCardHeading(el, 3);
          if (!heading) {
            return false;
          }
          if (heading.querySelector(interactiveSelector) || heading.closest(interactiveSelector)) {
            return false;
          }
          const ctas = Array.from(el.querySelectorAll("a[href], button, [role='link'], [role='button']")).filter((cta) => !isHidden(cta) && Boolean(accessibleName(cta, implicitRole(cta))));
          if (ctas.length !== 1)
            return false;
          const bodyTextElements = Array.from(el.querySelectorAll("p, span, div")).filter((candidate) => standaloneCardBodyTextElement(candidate));
          return bodyTextElements.length >= 1 && bodyTextElements.length <= 2;
        }
        function standaloneContentCardFor(el) {
          let card = null;
          for (let current = el?.parentElement, depth = 0; current && depth < 8; current = current.parentElement, depth += 1) {
            if (current === document.body || current === document.documentElement)
              break;
            if (current.matches?.("main, footer, header, nav, aside"))
              break;
            if (isStandaloneContentCard(current))
              card = current;
          }
          return card;
        }
        function h2CardWithDecorativeMediaBeforeBodyFor(el) {
          for (let current = el?.parentElement, depth = 0; current && depth < 8; current = current.parentElement, depth += 1) {
            if (current === document.body || current === document.documentElement)
              break;
            if (current.matches?.("main, footer, header, nav, aside"))
              break;
            const heading = standaloneContentCardHeading(current, 2);
            if (!heading)
              continue;
            const headingTag = heading.tagName?.toLowerCase();
            const level = Number.parseInt(heading.getAttribute("aria-level") || headingTag.slice(1), 10) || 2;
            if (level !== 2)
              continue;
            const directChild = Array.from(current.children || []).find((child) => child.contains(el));
            if (!directChild || directChild === heading || heading.contains(directChild))
              continue;
            if (!isFirstReadableStopWithin(directChild, el))
              continue;
            const earlierSiblings = Array.from(current.children || []).slice(0, Array.from(current.children || []).indexOf(directChild));
            const headingIndex = earlierSiblings.findIndex((sibling) => sibling === heading || sibling.contains(heading));
            if (headingIndex === -1)
              continue;
            const mediaAfterHeading = earlierSiblings.slice(headingIndex + 1).some((sibling) => isDecorativeMediaOnlyContainer(sibling));
            if (mediaAfterHeading)
              return current;
          }
          return null;
        }
        function isLeadingStandaloneCardGroupStop(el, role) {
          if (!["heading", "paragraph", "text"].includes(role))
            return false;
          const card = standaloneContentCardFor(el);
          if (!card)
            return false;
          return isFirstReadableStopWithin(card, el);
        }
        function isPostHeadingMediaCardGroupStop(el, role) {
          if (!["paragraph", "text"].includes(role))
            return false;
          return Boolean(h2CardWithDecorativeMediaBeforeBodyFor(el));
        }
        function hasSingleSemanticListItemChild(el) {
          if (!isListItem(el))
            return false;
          if (directOwnText(el))
            return false;
          if (hasDirectNonSemanticTextChild(el))
            return false;
          const children = directSemanticChildren(el);
          if (children.length !== 1)
            return false;
          const role = implicitRole(children[0]);
          return contextRoles.has(role) || role === "group";
        }
        function splitListItemTextBlocks(el) {
          if (!isListItem(el) || el.querySelector(interactiveSelector))
            return [];
          return Array.from(el.querySelectorAll("span, div, p")).filter((candidate) => {
            if (isHidden(candidate))
              return false;
            if (candidate.querySelector(interactiveSelector))
              return false;
            if (!directOwnText(candidate))
              return false;
            return !Array.from(candidate.children || []).some((child) => !isHidden(child) && Boolean(readableText(child)));
          });
        }
        function hasSplitTextListItemContent(el) {
          if (!isListItem(el))
            return false;
          return splitListItemTextBlocks(el).length > 1;
        }
        function isSplitTextListItemBlock(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          const listItem = el.closest("li,[role='listitem']");
          return splitListItemTextBlocks(listItem).includes(el);
        }
        function isExpandedRegionBodyText(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!["span", "div", "p", "strong", "em", "b", "i"].includes(el.tagName.toLowerCase())) {
            return false;
          }
          if (el.querySelector(interactiveSelector))
            return false;
          if (!directOwnText(el))
            return false;
          const region = el.closest("[role='region']");
          if (!region || region === el || isHidden(region))
            return false;
          if (region.getAttribute("aria-hidden") === "true")
            return false;
          const labelledBy = region.getAttribute("aria-labelledby");
          const labelElement = labelledBy ? resolveIdRef(labelledBy) : null;
          const controller = labelElement?.matches?.("[aria-expanded]") ? labelElement : labelElement?.querySelector?.("[aria-expanded]");
          const controlsRegion = !region.id || controller?.getAttribute?.("aria-controls") === region.id;
          if (controller?.getAttribute?.("aria-expanded") !== "true" || !controlsRegion) {
            return false;
          }
          if (["strong", "em", "b", "i"].includes(el.tagName.toLowerCase())) {
            return true;
          }
          return !Array.from(el.children || []).some((child) => !isHidden(child) && Boolean(readableText(child)) && !child.matches?.(`${interactiveSelector}, strong, em, b, i`));
        }
        function expandedControlledRegionFor(el) {
          const region = el?.closest?.("[role='region']");
          if (!region || region === el || isHidden(region))
            return void 0;
          if (region.getAttribute("aria-hidden") === "true")
            return void 0;
          const labelledBy = region.getAttribute("aria-labelledby");
          const labelElement = labelledBy ? resolveIdRef(labelledBy) : null;
          const controller = labelElement?.matches?.("[aria-expanded]") ? labelElement : labelElement?.querySelector?.("[aria-expanded]");
          const controlsRegion = !region.id || controller?.getAttribute?.("aria-controls") === region.id;
          if (controller?.getAttribute?.("aria-expanded") !== "true" || !controlsRegion) {
            return void 0;
          }
          return region;
        }
        function expandedRegionInlineLinkFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (!["div", "p"].includes(el.tagName.toLowerCase()))
            return void 0;
          if (!expandedControlledRegionFor(el))
            return void 0;
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link2) => !isHidden(link2));
          if (links.length !== 1)
            return void 0;
          const link = links[0];
          const before = [];
          const after = [];
          let sawLink = false;
          function collect(node) {
            if (!node)
              return;
            if (node === link) {
              sawLink = true;
              return;
            }
            if (node.nodeType === Node.TEXT_NODE) {
              const text = normalize(node.textContent);
              if (text)
                (sawLink ? after : before).push(text);
              return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            if (node.matches(interactiveSelector))
              return;
            for (const child of Array.from(node.childNodes))
              collect(child);
          }
          for (const child of Array.from(el.childNodes))
            collect(child);
          const beforeText = normalize(before.join(" "));
          const linkName = accessibleName(link, "link");
          const afterText = normalize(after.join(" "));
          if (!beforeText || !linkName || !afterText)
            return void 0;
          return [beforeText, `link, ${linkName}`, afterText];
        }
        function isFirstSplitTextListItemBlock(el) {
          if (!isSplitTextListItemBlock(el))
            return false;
          const listItem = el.closest("li,[role='listitem']");
          return splitListItemTextBlocks(listItem)[0] === el;
        }
        function inlineEmphasisListItemFragments(el) {
          if (!isListItem(el))
            return void 0;
          if (el.querySelector(interactiveSelector))
            return void 0;
          const emphasisSelector = "strong, b, em, i";
          const emphasisElements = Array.from(el.querySelectorAll(emphasisSelector)).filter((candidate) => !isHidden(candidate) && Boolean(readableText(candidate)));
          if (!emphasisElements.length)
            return void 0;
          const fragments = [];
          let plainText = "";
          function flushPlainText() {
            const normalized = normalize(plainText);
            if (normalized)
              fragments.push(normalized);
            plainText = "";
          }
          function collect(node) {
            if (node.nodeType === Node.TEXT_NODE) {
              plainText = `${plainText} ${node.textContent || ""}`;
              return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            if (node.matches(`${interactiveSelector}, ul, ol, dl, [role='list'], [aria-hidden='true']`)) {
              return;
            }
            if (node.matches(emphasisSelector)) {
              flushPlainText();
              const emphasizedText = readableText(node);
              if (emphasizedText)
                fragments.push(emphasizedText);
              return;
            }
            for (const child of Array.from(node.childNodes))
              collect(child);
          }
          collect(el);
          flushPlainText();
          const normalizedFullText = normalize(textWithoutInteractive(el));
          const normalizedFragments = fragments.map((fragment) => normalize(fragment)).filter((fragment) => Boolean(fragment));
          if (normalizedFragments.length < 2)
            return void 0;
          if (normalizedFragments.join(" ") !== normalizedFullText)
            return void 0;
          if (emphasisElements.length === 1 && normalizedFragments.length === 2) {
            normalizedFragments[1] = `\u2022 ${normalizedFragments[1]}`;
          }
          return normalizedFragments;
        }
        function inlineEmphasisTextFragments(el, role) {
          if (!["paragraph", "text"].includes(role))
            return void 0;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.querySelector(interactiveSelector))
            return void 0;
          const expandedRegion = expandedControlledRegionFor(el);
          if (!expandedRegion && el.closest("li,[role='listitem']"))
            return void 0;
          const emphasisSelector = "strong, b, em, i";
          const emphasisElements = Array.from(el.querySelectorAll(emphasisSelector)).filter((candidate) => !isHidden(candidate) && Boolean(readableText(candidate)));
          if (!emphasisElements.length)
            return void 0;
          const fragments = [];
          let plainText = "";
          let suppressNextLeadingSpace = false;
          function flushPlainText() {
            const normalized = normalize(plainText);
            if (normalized)
              fragments.push(normalized);
            plainText = "";
          }
          function collect(node) {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = suppressNextLeadingSpace ? (node.textContent || "").replace(/^\s+/u, "") : node.textContent || "";
              plainText = `${plainText}${text}`;
              suppressNextLeadingSpace = false;
              return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            if (node.matches("[aria-hidden='true']"))
              return;
            if (node.tagName?.toLowerCase() === "br" && expandedControlledRegionFor(el)) {
              plainText = plainText.replace(/\s+$/u, "");
              suppressNextLeadingSpace = true;
              return;
            }
            if (node.matches(emphasisSelector)) {
              flushPlainText();
              const emphasizedText = readableText(node);
              if (emphasizedText)
                fragments.push(emphasizedText);
              return;
            }
            if (node !== el && implicitRole(node) && !node.matches(emphasisSelector)) {
              return;
            }
            for (const child of Array.from(node.childNodes))
              collect(child);
          }
          collect(el);
          flushPlainText();
          const normalizedFullText = normalize(textWithoutInteractive(el) || readableText(el));
          const normalizedFragments = fragments.map((fragment) => normalize(fragment)).filter((fragment) => Boolean(fragment));
          if (!expandedRegion && normalizedFragments.length !== 2) {
            return void 0;
          }
          if (expandedRegion && normalizedFragments.length < 2) {
            return void 0;
          }
          if (!expandedRegion && normalizedFragments.join(" ") !== normalizedFullText) {
            return void 0;
          }
          return normalizedFragments;
        }
        function leafTextFragments(el) {
          const fragments = [];
          function collect(node) {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = normalize(node.textContent);
              if (text)
                fragments.push(text);
              return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            if (node.matches("[aria-hidden='true']"))
              return;
            for (const child of Array.from(node.childNodes))
              collect(child);
            for (const child of shadowContentChildren(node))
              collect(child);
          }
          collect(el);
          return fragments;
        }
        function complexColumnHeaderFragments(el, role) {
          if (role !== "columnheader")
            return {};
          if (!el.closest("table"))
            return {};
          const fragments = leafTextFragments(el);
          if (fragments.length < 3)
            return {};
          const rawText = normalize(el.textContent || "");
          const readable = readableText(el);
          if (!rawText || !readable)
            return {};
          return {
            complexColumnHeaderFragments: complexColumnHeaderContextFragments(el),
            complexColumnHeaderRawText: rawText
          };
        }
        function hasStructuredListItemContent(el) {
          if (!isListItem(el))
            return false;
          if (hasRichProductCardListItemContent(el))
            return true;
          const heading = el.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']");
          if (heading && (el.querySelector("p, [role='group'], img, [role='img'], svg[aria-label]") || el.querySelector("button, [role='button'], a[href], [role='link']") || Array.from(el.children).some((child) => isStructuredListBodyText(child)))) {
            return true;
          }
          if (el.querySelector(interactiveSelector) && Array.from(el.querySelectorAll("div")).some((child) => isInteractiveListBodyText(child))) {
            return true;
          }
          if (hasTextBlockListItemContent(el)) {
            return true;
          }
          if (hasSplitTextListItemContent(el)) {
            return true;
          }
          const linkedHeading = el.querySelector("h1 a[href], h2 a[href], h3 a[href], h4 a[href], h5 a[href], h6 a[href]");
          return Boolean(linkedHeading && textWithoutInteractive(el));
        }
        function hasRichProductCardListItemContent(el) {
          if (!isListItem(el))
            return false;
          if (!el.querySelector("button, [role='button'], a[href], [role='link']"))
            return false;
          const paragraphs = Array.from(el.querySelectorAll("p")).filter((paragraph) => !isHidden(paragraph) && Boolean(readableText(paragraph)));
          if (paragraphs.length < 5)
            return false;
          const labelledImages = Array.from(el.querySelectorAll("img[alt], [role='img'][aria-label], svg[aria-label]")).filter((image) => !isHidden(image) && Boolean(accessibleName(image, implicitRole(image))));
          const featureRows = paragraphs.filter((paragraph) => isRichProductCardFeatureRow(paragraph, true));
          return labelledImages.length >= 3 && featureRows.length >= 2;
        }
        function isRichProductCardFeatureRow(el, skipCardCheck = false) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName.toLowerCase() !== "p")
            return false;
          const listItem = el.closest("li,[role='listitem']");
          if (!skipCardCheck && !hasRichProductCardListItemContent(listItem))
            return false;
          if (el.querySelector(interactiveSelector))
            return false;
          return Boolean(Array.from(el.querySelectorAll("img, [role='img'], svg[aria-label]")).some((image) => !isHidden(image) && implicitRole(image) === "image" && Boolean(accessibleName(image, "image"))) && textWithoutInteractive(el));
        }
        function isFirstRichProductCardParagraph(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName.toLowerCase() !== "p")
            return false;
          const listItem = el.closest("li,[role='listitem']");
          if (!hasRichProductCardListItemContent(listItem))
            return false;
          if (richProductCardOfferBanner(listItem))
            return false;
          const paragraphs = Array.from(listItem.querySelectorAll("p")).filter((paragraph) => !isHidden(paragraph) && Boolean(readableText(paragraph)));
          return paragraphs[0] === el;
        }
        function richProductCardOfferBanner(listItem) {
          if (!hasRichProductCardListItemContent(listItem))
            return void 0;
          return Array.from(listItem.querySelectorAll("div, span")).find((candidate) => {
            if (isHidden(candidate) || !readableText(candidate))
              return false;
            if (candidate.querySelector(interactiveSelector) || candidate.closest(interactiveSelector)) {
              return false;
            }
            const className = normalize(candidate.getAttribute("class")) || "";
            return /\boffer\b/i.test(className) && /\bbanner\b/i.test(className);
          });
        }
        function isRichProductCardOfferBanner(el) {
          const listItem = el.closest("li,[role='listitem']");
          return richProductCardOfferBanner(listItem) === el;
        }
        function richProductCardFeatureRowFragments(el) {
          if (!isRichProductCardFeatureRow(el))
            return void 0;
          const image = Array.from(el.querySelectorAll("img, [role='img'], svg[aria-label]")).find((candidate) => !isHidden(candidate) && implicitRole(candidate) === "image" && Boolean(accessibleName(candidate, "image")));
          const imageLabel = image ? accessibleName(image, "image") : void 0;
          const text = textWithoutInteractive(el);
          return [
            imageLabel ? `${imageLabel}, image` : void 0,
            text
          ].filter((entry) => Boolean(entry));
        }
        function isFirstRichProductCardListItem(listItem) {
          if (!hasRichProductCardListItemContent(listItem))
            return false;
          const list = listItem.parentElement;
          if (!list || implicitRole(list) !== "list")
            return false;
          const richItems = Array.from(list.children || []).filter((child) => hasRichProductCardListItemContent(child));
          return richItems[0] === listItem;
        }
        function isRichProductCardFeatureHeading(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName.toLowerCase() !== "p")
            return false;
          if (el.querySelector(interactiveSelector))
            return false;
          const listItem = el.closest("li,[role='listitem']");
          if (!isFirstRichProductCardListItem(listItem))
            return false;
          const parent = el.parentElement;
          if (!parent)
            return false;
          const readableParagraphs = Array.from(parent.children || []).filter((paragraph) => paragraph.tagName?.toLowerCase() === "p" && !isHidden(paragraph) && Boolean(readableText(paragraph)));
          if (readableParagraphs[0] !== el)
            return false;
          const headingText = readableText(el);
          if (!headingText || !/:$/.test(headingText))
            return false;
          return readableParagraphs.slice(1).some((paragraph) => isRichProductCardFeatureRow(paragraph));
        }
        function richProductCardTextFragments(listItem) {
          if (!hasRichProductCardListItemContent(listItem))
            return [];
          return Array.from(listItem.querySelectorAll("span, div")).filter((candidate) => isRichProductCardTextFragment(candidate));
        }
        function isRichProductCardTextFragment(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!["span", "div"].includes(el.tagName.toLowerCase()))
            return false;
          if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector))
            return false;
          if (!directOwnText(el))
            return false;
          if (Array.from(el.children || []).some((child) => !isHidden(child) && Boolean(readableText(child)))) {
            return false;
          }
          const listItem = el.closest("li,[role='listitem']");
          if (!hasRichProductCardListItemContent(listItem))
            return false;
          return Boolean(el.closest(".bos-offer-banner-box, p") || /feature/i.test(normalize(el.getAttribute("class")) || ""));
        }
        function isFirstRichProductCardTextFragment(el) {
          const listItem = el.closest("li,[role='listitem']");
          return richProductCardTextFragments(listItem)[0] === el;
        }
        function hasTextBlockListItemContent(el) {
          if (!isListItem(el))
            return false;
          if (el.querySelector(interactiveSelector))
            return false;
          const paragraphs = Array.from(el.querySelectorAll("p")).filter((paragraph) => !isHidden(paragraph) && Boolean(readableText(paragraph)));
          return paragraphs.length > 1;
        }
        function isFirstTextBlockListItemParagraph(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName.toLowerCase() !== "p")
            return false;
          const listItem = el.closest("li,[role='listitem']");
          if (!hasTextBlockListItemContent(listItem))
            return false;
          const paragraphs = Array.from(listItem.querySelectorAll("p")).filter((paragraph) => !isHidden(paragraph) && Boolean(readableText(paragraph)));
          return paragraphs[0] === el;
        }
        function isStructuredListBodyText(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName.toLowerCase() !== "div")
            return false;
          if (el.querySelector(interactiveSelector))
            return false;
          if (el.closest(interactiveSelector))
            return false;
          if (el.querySelector("h1, h2, h3, h4, h5, h6, [role='heading'], ul, ol, [role='list']")) {
            return false;
          }
          const listItem = el.parentElement;
          if (!isListItem(listItem))
            return false;
          if (!listItem.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']")) {
            return false;
          }
          return Boolean(readableText(el));
        }
        function isInteractiveListBodyText(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName.toLowerCase() !== "div")
            return false;
          if (el.querySelector(interactiveSelector))
            return false;
          if (el.querySelector("h1, h2, h3, h4, h5, h6, [role='heading'], ul, ol, [role='list']")) {
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
        function isInteractiveCardListButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (!el.querySelector("svg, img, [role='img']"))
            return false;
          const listItem = el.closest("li,[role='listitem']");
          if (!isListItem(listItem))
            return false;
          return Array.from(listItem.querySelectorAll("div")).some((candidate) => isInteractiveListBodyText(candidate));
        }
        function isFirstInteractiveListBodyText(el) {
          if (!isInteractiveListBodyText(el))
            return false;
          const listItem = el.closest("li,[role='listitem']");
          if (listItem?.querySelector("h1 a[href], h2 a[href], h3 a[href], h4 a[href], h5 a[href], h6 a[href]")) {
            return false;
          }
          const blocks = Array.from(listItem?.querySelectorAll("div") || []).filter((candidate) => isInteractiveListBodyText(candidate));
          return blocks[0] === el;
        }
        function structuredListItemHasPreHeadingImage(el) {
          if (!hasStructuredListItemContent(el))
            return false;
          const firstHeading = el.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']");
          if (!firstHeading)
            return false;
          const firstImage = Array.from(el.querySelectorAll("img, svg, [role='img']")).find((image) => !isHidden(image));
          if (!firstImage)
            return false;
          return Boolean(firstImage.compareDocumentPosition(firstHeading) & firstImage.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
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
        function isTextlessCarouselPaginatorLink(el) {
          if (implicitRole(el) !== "link")
            return false;
          if (!el.closest(".carousel-paginator"))
            return false;
          if (normalize(accessibleName(el, "link")) || readableText(el))
            return false;
          const listItem = el.closest("li,[role='listitem']");
          if (!listItem)
            return false;
          const list = listItem.parentElement;
          return Boolean(list && /\bcarousel-paginator\b/.test(list.getAttribute("class") || ""));
        }
        function isUnnamedCarouselNavigationButtonWrapper(el) {
          if (!isCustomElement(el))
            return false;
          if (!el.closest(".carousel-navigation"))
            return false;
          if (accessibleName(el, "group") || readableText(el))
            return false;
          const buttons = [];
          const visit = (node) => {
            if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            if (node !== el && implicitRole(node) === "button") {
              buttons.push(node);
              return;
            }
            for (const child of walkChildren(node))
              visit(child);
          };
          visit(el);
          if (buttons.length !== 1)
            return false;
          const button = buttons[0];
          return !normalize(accessibleName(button, "button") || readableText(button));
        }
        function isLwcLikeCustomElement(el) {
          if (!isCustomElement(el))
            return false;
          const tag = el.tagName.toLowerCase();
          if (tag.startsWith("lightning-") || tag.startsWith("vlocity_cmt-") || tag.startsWith("c-")) {
            return true;
          }
          return Array.from(el.attributes || []).some((attr) => /^lwc-|.+-host$/.test(attr.name));
        }
        function isAnonymousStructuralCustomElementGroup(el) {
          if (!isCustomElement(el))
            return false;
          if (!hasShadowRootContent(el))
            return false;
          if (accessibleName(el, "group"))
            return false;
          if (el.matches(interactiveSelector))
            return false;
          if (compactInputActionGroupLabel(el))
            return false;
          if (isFocusableImageListItem(el) || isFocusableStructuredListItemGroup(el)) {
            return false;
          }
          if (el.closest("[aria-roledescription='carousel'], [aria-roledescription='slideshow']") && !isFlattenedSlottedCarouselGroupWrapper(el) && !isUnnamedCarouselNavigationButtonWrapper(el)) {
            return false;
          }
          return isLwcLikeCustomElement(el);
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
          if (!table)
            return {};
          const row = el.closest("tr,[role='row']");
          const cell = el.closest("th,td,[role='cell'],[role='gridcell'],[role='rowheader'],[role='columnheader']");
          const rows = tableRows(table);
          const columnCount = tableColumnCount(rows);
          if (!row || !cell) {
            return {
              tableRole: implicitRole(table),
              tableLabel: accessibleName(table, implicitRole(table)),
              rowCount: rows.length || void 0,
              columnCount
            };
          }
          const cells = Array.from(row.children).filter((child) => {
            const childRole = implicitRole(child);
            return ["cell", "gridcell", "rowheader", "columnheader"].includes(childRole);
          });
          const rowIndex = rows.indexOf(row);
          const columnIndex = cells.indexOf(cell);
          const firstHeaderRow = rows.find((candidate) => Array.from(candidate.children || []).some((child) => {
            const childRole = implicitRole(child);
            return ["columnheader", "rowheader"].includes(childRole);
          }));
          const headerCells = Array.from(firstHeaderRow?.children || []).filter((child) => {
            const childRole = implicitRole(child);
            return ["columnheader", "rowheader"].includes(childRole);
          });
          const columnHeader = columnIndex >= 0 ? headerCells[columnIndex] : null;
          const tableHasComplexColumnHeaders = headerCells.some((header) => isComplexColumnHeaderContext(header));
          const columnHeaderFragments = role !== "columnheader" && columnHeader ? complexColumnHeaderContextFragments(columnHeader) : [];
          const complexColumnHeaderContextText = columnHeaderFragments.length >= 3 ? formatConjunctiveList(columnHeaderFragments) : void 0;
          const cellRole = implicitRole(cell);
          const columnHeaderText = role !== "columnheader" && cellRole !== "columnheader" && columnHeader ? complexColumnHeaderContextText || accessibleName(columnHeader, "columnheader") : void 0;
          const groupedHeaderNames = groupedTableHeaderNames(table);
          const tableGroupHeaderText = columnIndex === 0 && groupedHeaderNames.length > 1 ? formatConjunctiveList(groupedHeaderNames) : void 0;
          const tableGroupedHeaderRow = Boolean(tableGroupHeaderText) && Boolean(row.closest("thead")) && Boolean(row.querySelector("button[aria-controls]"));
          const tableFirstGroupedHeaderRow = tableGroupedHeaderRow && row === groupedTableHeaders(table)[0]?.querySelector("tr,[role='row']");
          const insideColumnHeaderContent = role !== "columnheader" && cellRole === "columnheader" && isComplexColumnHeaderContext(cell);
          return {
            tableRole: implicitRole(table),
            tableLabel: accessibleName(table, implicitRole(table)),
            rowIndex: !insideColumnHeaderContent && rowIndex >= 0 ? rowIndex + 1 : void 0,
            rowCount: rows.length || void 0,
            columnIndex: !insideColumnHeaderContent && columnIndex >= 0 ? columnIndex + 1 : void 0,
            columnCount: !insideColumnHeaderContent ? columnCount || cells.length || void 0 : void 0,
            columnHeaderText,
            complexColumnHeaderContextText,
            tableGroupHeaderText,
            tableGroupedHeaderRow,
            tableFirstGroupedHeaderRow,
            tableHasComplexColumnHeaders
          };
        }
        function isComplexColumnHeaderContext(el) {
          return complexColumnHeaderContextFragments(el).length >= 3;
        }
        function complexColumnHeaderContextFragments(el) {
          return leafTextFragments(el).filter((fragment) => {
            if (/^£/.test(fragment))
              return false;
            if (/^Over a /i.test(fragment))
              return false;
            if (/Requires streaming/i.test(fragment))
              return false;
            return true;
          });
        }
        function closestComplexColumnHeader(el) {
          const header = el?.closest?.("th,[role='columnheader']");
          if (!header || implicitRole(header) !== "columnheader")
            return null;
          return isComplexColumnHeaderContext(header) ? header : null;
        }
        function complexColumnHeaderColorFragments(header) {
          const fragments = complexColumnHeaderContextFragments(header);
          const availableIndex = fragments.findIndex((fragment) => /^Available in$/i.test(fragment));
          if (availableIndex < 0)
            return [];
          const colors = [];
          for (const fragment of fragments.slice(availableIndex + 1)) {
            if (/^\d/.test(fragment) || /^TV Starting from$/i.test(fragment))
              break;
            if (/^(Learn more|Learn More|Buy Now)$/i.test(fragment))
              break;
            colors.push(fragment);
          }
          return colors;
        }
        function complexColumnHeaderColorGroupText(el, role) {
          if (role !== "text" && role !== "paragraph")
            return void 0;
          const header = closestComplexColumnHeader(el);
          if (!header)
            return void 0;
          const text = normalize(readableText(el) || el.textContent || "");
          if (!text)
            return void 0;
          const colors = complexColumnHeaderColorFragments(header);
          return colors[0] === text && colors.length > 1 ? colors.join("") : void 0;
        }
        function isConsumedComplexColumnHeaderColorStop(el, role) {
          if (role !== "text" && role !== "paragraph")
            return false;
          const header = closestComplexColumnHeader(el);
          if (!header)
            return false;
          const text = normalize(readableText(el) || el.textContent || "");
          if (!text)
            return false;
          const colors = complexColumnHeaderColorFragments(header);
          const index = colors.indexOf(text);
          return index > 0;
        }
        function isConsumedComplexColumnHeaderTitleStop(el, role) {
          if (role !== "text" && role !== "paragraph")
            return false;
          const header = closestComplexColumnHeader(el);
          if (!header)
            return false;
          const fragments = complexColumnHeaderContextFragments(header);
          const title = fragments[0];
          if (!title)
            return false;
          const text = normalize(readableText(el) || el.textContent || "");
          return text === title;
        }
        function complexColumnHeaderTextFragments(el, role) {
          if (role !== "text" && role !== "paragraph")
            return void 0;
          if (!closestComplexColumnHeader(el))
            return void 0;
          if (complexColumnHeaderColorGroupText(el, role))
            return void 0;
          const fragments = leafTextFragments(el);
          if (fragments.length < 2)
            return void 0;
          const label = normalize(textWithoutInteractive(el) || readableText(el));
          if (!label || normalize(fragments.join(" ")) !== label)
            return void 0;
          return fragments;
        }
        function complexColumnHeaderContextCellTextFragments(el, role, contextText) {
          if (!["cell", "gridcell"].includes(role) || !contextText)
            return void 0;
          const fragments = leafTextFragments(el);
          if (fragments.length < 2)
            return void 0;
          const label = normalize(textWithoutInteractive(el) || readableText(el));
          if (!label || normalize(fragments.join(" ")) !== label)
            return void 0;
          return fragments;
        }
        function complexColumnHeaderText(el) {
          const fragments = complexColumnHeaderFragments(el, "columnheader").complexColumnHeaderFragments;
          return fragments ? formatConjunctiveList(fragments) : void 0;
        }
        function tableRows(table) {
          const usesGroupedSections = Boolean(table.querySelector(":scope > thead button[aria-controls]"));
          const allRows = Array.from(table.querySelectorAll("tr,[role='row']")).filter((candidate) => !isHidden(candidate));
          if (!usesGroupedSections)
            return allRows;
          return allRows.filter((row) => !isInsideControlledTableGroupBody(row));
        }
        function groupedTableHeaderNames(table) {
          return groupedTableHeaders(table).flatMap((header) => Array.from(header.querySelectorAll("button[aria-controls]"))).filter((button) => !isHidden(button)).map((button) => accessibleName(button, implicitRole(button))).filter((name) => Boolean(name));
        }
        function groupedTableHeaders(table) {
          return Array.from(table.children || []).filter((child) => child.tagName?.toLowerCase() === "thead" && Boolean(child.querySelector("button[aria-controls]")));
        }
        function tableColumnCount(rows) {
          const counts = rows.map((row) => Array.from(row.children || []).filter((child) => {
            const childRole = implicitRole(child);
            return ["cell", "gridcell", "rowheader", "columnheader"].includes(childRole);
          }).length).filter(Boolean);
          return counts.length ? Math.max(...counts) : void 0;
        }
        function isInsideControlledTableGroupBody(el) {
          const groupBody = el.closest("tbody[role='region'][aria-labelledby][id]");
          if (!groupBody)
            return false;
          const table = groupBody.closest("table,[role='table'],[role='grid']");
          if (!table)
            return false;
          const bodyId = groupBody.getAttribute("id");
          if (!bodyId)
            return false;
          return Boolean(table.querySelector(`:scope > thead button[aria-controls='${cssEscape(bodyId)}']`));
        }
        function hasVisibleInteractiveDescendant(el) {
          function collect(node) {
            if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node)) {
              return false;
            }
            if (node !== el && node.matches(interactiveSelector)) {
              return true;
            }
            return walkChildren(node).some((child) => collect(child));
          }
          return collect(el);
        }
        function hasOnlyLinkContent(el) {
          const interactiveDescendants = Array.from(el.querySelectorAll(interactiveSelector)).filter((candidate) => !isHidden(candidate));
          return Boolean(interactiveDescendants.length > 0 && interactiveDescendants.every((candidate) => implicitRole(candidate) === "link") && !textWithoutInteractive(el));
        }
        function classTokens(el) {
          return new Set((normalize(el?.getAttribute?.("class")) || "").split(" ").filter(Boolean));
        }
        function sharesParagraphTextClassFamily(a, b) {
          const aTokens = classTokens(a);
          const bTokens = classTokens(b);
          if (!aTokens.size || !bTokens.size)
            return false;
          return Array.from(aTokens).some((token) => bTokens.has(token) && (/^(bos-text_|slds-text-align_|slds-align_|slds-size_|slds-medium-size_)/.test(token) || token === "slds-align_absolute-center"));
        }
        function adjacentParagraphValueText(el) {
          if (el?.tagName?.toLowerCase() !== "p")
            return void 0;
          if (el.querySelector(interactiveSelector))
            return void 0;
          if (el.closest("li,[role='listitem']"))
            return void 0;
          const label = normalize(textWithoutInteractive(el) || readableText(el));
          if (!label?.endsWith(":"))
            return void 0;
          if (label.length > 80)
            return void 0;
          const next = el.nextElementSibling;
          if (next?.tagName?.toLowerCase() !== "p" || isHidden(next))
            return void 0;
          if (next.querySelector(interactiveSelector))
            return void 0;
          if (next.querySelector("img, svg, [role='img']"))
            return void 0;
          if (!sharesParagraphTextClassFamily(el, next))
            return void 0;
          return normalize(textWithoutInteractive(next) || readableText(next));
        }
        function isConsumedAdjacentParagraphValue(el) {
          if (el?.tagName?.toLowerCase() !== "p")
            return false;
          const previous = el.previousElementSibling;
          return Boolean(previous && adjacentParagraphValueText(previous));
        }
        function tableCellShouldYieldToStructuredContent(el, role) {
          if (!["cell", "gridcell", "rowheader", "columnheader"].includes(role)) {
            return false;
          }
          return Boolean(el.querySelector("a[href], button, [role='button'], [role='link'], ul, ol, dl, [role='list']"));
        }
        function directHeadingFragments(el) {
          if (implicitRole(el) !== "heading")
            return void 0;
          if (el.querySelector("button, [role='button'], a[href]"))
            return void 0;
          function lineBreakFragments(container) {
            const fragments2 = [];
            let current = "";
            for (const child of Array.from(container.childNodes)) {
              if (child.nodeType === Node.ELEMENT_NODE && child.tagName?.toLowerCase() === "br") {
                const fragment = normalize(current);
                if (fragment)
                  fragments2.push(fragment);
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
            if (lastFragment)
              fragments2.push(lastFragment);
            return fragments2.length > 1 ? fragments2 : void 0;
          }
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          const tag = el.tagName?.toLowerCase();
          const level = Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2;
          if (level === 1 && visibleChildren.length === 1 && !directOwnText(el) && visibleChildren[0].querySelector("br") && Array.from(visibleChildren[0].children || []).some((child) => child.tagName?.toLowerCase() !== "br" && !isHidden(child))) {
            return lineBreakFragments(visibleChildren[0]);
          }
          const hasLineBreak = Array.from(el.childNodes).some((child) => child.nodeType === Node.ELEMENT_NODE && child.tagName?.toLowerCase() === "br");
          if (hasLineBreak) {
            return lineBreakFragments(el);
          }
          const directText = Array.from(el.childNodes).filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => normalize(child.textContent)).filter(Boolean);
          if (directText.length)
            return void 0;
          const fragments = Array.from(el.children).filter((child) => !isHidden(child)).map((child) => readableText(child)).filter((fragment) => Boolean(fragment));
          return fragments.length > 1 ? fragments : void 0;
        }
        function textBeforeFirstInlineInteractive(el) {
          const fragments = [];
          function collect(node) {
            if (!node)
              return false;
            if (node.nodeType === Node.TEXT_NODE) {
              const text = normalize(node.textContent);
              if (text)
                fragments.push(text);
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
        function hasInlineInteractiveEmbeddedInText(el) {
          if (implicitRole(el) !== "paragraph")
            return false;
          const interactiveDescendants = Array.from(el.querySelectorAll(interactiveSelector)).filter((candidate) => !isHidden(candidate));
          if (interactiveDescendants.length !== 1)
            return false;
          const tokens = [];
          const textBeforeInteractive = [];
          let sawInteractive = false;
          function collectTokens(node) {
            if (!node)
              return;
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
            if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
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
          if (interactiveIndex < 0)
            return false;
          return tokens.slice(0, interactiveIndex).includes("text") && tokens.slice(interactiveIndex + 1).includes("text") && /[.!?]/.test(textBeforeInteractive.join(" "));
        }
        function shouldSplitDescribedAutocomplete(el, role) {
          if (role !== "combobox")
            return false;
          if (el.tagName.toLowerCase() !== "input")
            return false;
          if (el.getAttribute("aria-autocomplete") !== "list")
            return false;
          if (!el.hasAttribute("aria-describedby"))
            return false;
          if (el.hasAttribute("aria-description"))
            return false;
          return Boolean(accessibleName(el, role) && textFromIdRefs(el.getAttribute("aria-describedby")));
        }
        function nativeSelectValue(el) {
          if (el?.tagName?.toLowerCase() !== "select")
            return void 0;
          const selectedIndex = typeof el.selectedIndex === "number" && el.selectedIndex >= 0 ? el.selectedIndex : void 0;
          return normalize(el.selectedOptions?.[0]?.textContent) || (selectedIndex !== void 0 ? normalize(el.options?.[selectedIndex]?.textContent) : void 0) || ("value" in el && el.value ? normalize(el.value) : void 0);
        }
        function descendantLinkCardHeadingLevel(el) {
          const heading = Array.from(el?.querySelectorAll?.("h1, h2, h3, h4, h5, h6, [role='heading']") || []).find((candidate) => !isHidden(candidate) && Boolean(readableText(candidate)));
          if (!heading)
            return void 0;
          const tag = heading.tagName?.toLowerCase() || "";
          const level = Number.parseInt(heading.getAttribute("aria-level") || tag.slice(1), 10) || 2;
          return level >= 3 ? level : void 0;
        }
        function precedingControlLabelForButton(el) {
          if (implicitRole(el) !== "button")
            return void 0;
          const label = normalize(el.getAttribute("aria-label") || accessibleName(el, "button"));
          if (!/^add\s+\d+\b/i.test(label || ""))
            return void 0;
          for (let current = el.parentElement, depth = 0; current && depth < 4; current = current.parentElement, depth += 1) {
            const labels = Array.from(current.querySelectorAll("label")).filter((candidate) => !isHidden(candidate) && !candidate.contains(el));
            if (labels.length !== 1)
              continue;
            const text = normalize(readableText(labels[0]) || labels[0].textContent);
            if (/^quantity controls\b/i.test(text || ""))
              return text;
          }
          return void 0;
        }
        function isFieldsetRadioGroup(el, role) {
          if (role !== "radio")
            return false;
          const group = el.closest("fieldset[aria-label], [role='radiogroup'][aria-label], .slds-radio_button-group");
          if (!group)
            return false;
          const radios = Array.from(group.querySelectorAll("[role='radio'], input[type='radio']")).filter((radio) => !isHidden(radio));
          return radios.length > 1;
        }
        function inferredSldsRadioChecked(el) {
          if (implicitRole(el) !== "radio")
            return void 0;
          if (el.hasAttribute("aria-checked") || el.hasAttribute("checked") || el.checked) {
            return void 0;
          }
          const group = el.closest(".slds-radio_button-group");
          if (!group)
            return void 0;
          const radios = Array.from(group.querySelectorAll("[role='radio'], input[type='radio']")).filter((radio) => !isHidden(radio));
          if (!radios.includes(el))
            return void 0;
          if (radios.some((radio) => radio !== el && (radio.checked || radio.hasAttribute("checked")))) {
            return void 0;
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
          const rawText = readableText(el);
          const text = role === "group" && isCustomElement(el) && hasShadowRootContent(el) ? void 0 : rawText;
          const position = positionInSet(el, role);
          const size = setSize(el, role);
          const rect = el.getBoundingClientRect();
          const table = tableContext(el, role);
          const parentListMeta = parentListPosition(el);
          const headingButton = role === "heading" ? el.querySelector("button, [role='button']") : null;
          const headingLink = role === "heading" ? el.querySelector("a[href]") : null;
          const selectedListboxOption = singleSelectedListboxOption(el);
          const suppressPositionedChoiceGroup = role === "button" && Boolean(position) && !el.hasAttribute("aria-expanded") && !normalizedPopup(el) && !isSlideshowNavigationButton(el) && (isIconFirstTextButton(el) || el.hasAttribute("aria-label") && !rawText);
          const value = tag === "select" ? nativeSelectValue(stateEl) : selectedListboxOption ? accessibleName(selectedListboxOption, "option") || readableText(selectedListboxOption) : "value" in stateEl && stateEl.value ? stateEl.value : void 0;
          const listboxSelectedCount = role === "listbox" ? selectedListboxOptions(el).length || void 0 : void 0;
          const selectedListboxPosition = selectedListboxOption ? positionInSet(selectedListboxOption, "option") : void 0;
          const selectedListboxSize = selectedListboxOption ? setSize(selectedListboxOption, "option") : void 0;
          const descriptor = {
            role,
            name,
            text,
            description: normalize(stateEl.getAttribute("aria-description") ?? el.getAttribute("aria-description")),
            details: textFromIdRefs(stateEl.getAttribute("aria-describedby") ?? el.getAttribute("aria-describedby")),
            errorMessage: textFromIdRefs(stateEl.getAttribute("aria-errormessage") ?? el.getAttribute("aria-errormessage")),
            roleDescription: role === "list" && tag === "dl" ? "definition list" : role === "contentinfo" && isSimpleNativeFooter(el) ? "footer" : role === "alert" && isEmptyAlertBeforeDialog(el) ? "group" : role === "paragraph" && el.getAttribute("tabindex") === "-1" && hasStructuredListItemContent(el.closest("li,[role='listitem']")) ? "empty group" : normalize(el.getAttribute("aria-roledescription")),
            level: role === "heading" ? Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2 : role === "list" ? listLevel(el) : void 0,
            setSize: selectedListboxSize ?? size,
            positionInSet: selectedListboxPosition ?? position,
            ...parentListMeta,
            value,
            valueText: normalize(stateEl.getAttribute("aria-valuetext")),
            placeholder: normalize(stateEl.getAttribute("placeholder")),
            required: stateEl.required || stateEl.getAttribute("aria-required") === "true" || void 0,
            invalid: stateEl.getAttribute("aria-invalid") && stateEl.getAttribute("aria-invalid") !== "false" ? stateEl.getAttribute("aria-invalid") === "true" ? true : stateEl.getAttribute("aria-invalid") : void 0,
            checked: role === "checkbox" || role === "radio" ? el.getAttribute("aria-checked") === "mixed" ? "mixed" : el.getAttribute("aria-checked") ? el.getAttribute("aria-checked") === "true" : inferredSldsRadioChecked(el) ?? Boolean(el.checked) : void 0,
            expanded: parseBooleanAttribute(stateEl, "aria-expanded") ?? (headingButton ? parseBooleanAttribute(headingButton, "aria-expanded") : void 0),
            selected: parseBooleanAttribute(el, "aria-selected"),
            pressed: el.hasAttribute("aria-pressed") ? el.getAttribute("aria-pressed") === "mixed" ? "mixed" : el.getAttribute("aria-pressed") === "true" : void 0,
            disabled: el.disabled || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true" || isImplicitDisabledPreviousSlideButton(el) || void 0,
            readOnly: el.readOnly || el.getAttribute("aria-readonly") === "true" || void 0,
            current: el.hasAttribute("aria-current") ? el.getAttribute("aria-current") === "false" ? void 0 : el.getAttribute("aria-current") === "true" ? true : el.getAttribute("aria-current") : void 0,
            hasPopup: normalizedPopup(stateEl) ?? normalizedPopup(el),
            autocomplete: normalize(stateEl.getAttribute("aria-autocomplete") ?? el.getAttribute("aria-autocomplete")),
            modal: el.getAttribute("aria-modal") === "true" || void 0,
            sort: normalize(el.getAttribute("aria-sort")),
            selectedCount: listboxSelectedCount,
            nativeSelect: tag === "select" || void 0,
            headingButton: Boolean(headingButton) || void 0,
            headingLink: Boolean(headingLink) || void 0,
            linkHeadingLevel: role === "link" ? descendantLinkCardHeadingLevel(el) : void 0,
            headingFragments: directHeadingFragments(el),
            iconOnlyLink: role === "link" && isIconOnlyLink(el) || void 0,
            textlessCarouselPaginatorLink: role === "link" && isTextlessCarouselPaginatorLink(el) || void 0,
            precedingControlLabel: role === "button" ? precedingControlLabelForButton(el) : void 0,
            fieldsetRadioGroup: isFieldsetRadioGroup(el, role) || void 0,
            compositeText: role === "button" && Boolean(nestedImageLabel(el) && rawText) || void 0,
            groupContext: Boolean(headingButton) || role === "button" && !suppressPositionedChoiceGroup && !isPositionedImageChoiceButton(el) && Boolean(nestedImageLabel(el)) || role === "button" && Boolean(closestCustomElement(el)) && !normalizedPopup(el) && !isPlainUtilityDisclosureButton(el) && !suppressPositionedChoiceGroup && el.hasAttribute("aria-label") || role === "button" && el.hasAttribute("aria-expanded") && !normalizedPopup(el) && !position && !buttonSharesListItemWithLink(el) && !isPlainUtilityDisclosureButton(el) && normalize(name) !== "Open navigation menu" || role === "button" && isLabeledIconActionButton(el) || role === "button" && isMenuDisclosureGroupButton(el) || role === "button" && isSlideshowNavigationButton(el) || role === "button" && isInteractiveCardListButton(el) || role === "button" && isTrailingDisclaimerButton(el) || role === "button" && isTextWithTrailingIconButton(el) || role === "button" && !suppressPositionedChoiceGroup && isIconFirstTextButton(el) || role === "text" && isFocusableCustomTooltipTrigger(el) || void 0,
            groupedCollectionPosition: role === "button" && hasOnlyInteractiveListItemContent(semanticListContext(el).listItem) || role === "group" && isFocusableStructuredListItemGroup(el) || void 0,
            parenthesizedCollectionPosition: role === "group" && (isFocusableStructuredListItemGroup(el) || isFocusableImageListItem(el)) || void 0,
            duplicateCollectionPosition: role === "heading" && Boolean(flattenedSlottedCarouselPosition(el).positionInSet) || void 0,
            unlabeledImage: role === "image" && isInformativeUnlabeledCmsImage(el) ? true : void 0,
            unlabeledImageSrcLabel: role === "image" && isInformativeUnlabeledCmsImage(el) ? cmsMediaPathLabel(el) : void 0,
            ...flattenedSlottedCarouselImageInfo(el),
            splitDescribedAutocomplete: shouldSplitDescribedAutocomplete(el, role) || void 0,
            searchInputGroup: role === "combobox" && tag === "input" && (el.getAttribute("type") || "").toLowerCase() === "search" || void 0,
            compactInputActionGroup: role === "group" && compactInputActionGroupLabel(el) ? true : void 0,
            leadingCarouselGroup: isLeadingCarouselGroupStop(el, role) || void 0,
            trailingCarouselSlideGroups: isTrailingCarouselSlideGroupStop(el, role) || void 0,
            leadingStandaloneCardGroup: isLeadingStandaloneCardGroupStop(el, role) || isPostHeadingMediaCardGroupStop(el, role) || void 0,
            splitLabelStop: ["searchbox", "textbox"].includes(role) && tag === "input" && Boolean(name?.endsWith(":") || name && stateEl.getAttribute("aria-invalid") === "true" && normalize(stateEl.getAttribute("placeholder")) === name) || role === "combobox" && tag === "select" && Boolean(name?.endsWith(":") || value && name?.endsWith(value)) ? true : void 0,
            footerCountrySelector: role === "combobox" && isFooterCountrySelector(el) ? true : void 0,
            clusteredVisualButton: role === "button" && isClusteredVisualButton(el, role) ? true : void 0,
            richProductCardFeatureRowFragments: role === "paragraph" ? richProductCardFeatureRowFragments(el) : void 0,
            richProductCardFeatureHeading: role === "paragraph" ? isRichProductCardFeatureHeading(el) || void 0 : void 0,
            complexColumnHeaderColorGroupText: complexColumnHeaderColorGroupText(el, role),
            complexColumnHeaderTextFragments: complexColumnHeaderTextFragments(el, role),
            complexColumnHeaderContextCellTextFragments: complexColumnHeaderContextCellTextFragments(el, role, table.complexColumnHeaderContextText),
            inlineEmphasisTextFragments: inlineEmphasisTextFragments(el, role),
            expandedRegionInlineLinkFragments: role === "paragraph" ? expandedRegionInlineLinkFragments(el) : void 0,
            suppressContextEnd: role === "group" && Boolean(compactInputActionGroupLabel(el)) || role === "group" && isButtonShellClusterGroup(el) || role === "group" && isButtonShellGroup(el) || role === "group" && isFocusableImageListItem(el) || role === "group" && isFocusableStructuredListItemGroup(el) || role === "group" && isCustomElement(el) && hasShadowRootContent(el) && !accessibleName(el, role) ? true : void 0,
            ...table,
            ...complexColumnHeaderFragments(el, role),
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
            descriptor.inlineEmphasisListItemFragments = inlineEmphasisListItemFragments(el);
          }
          if (role === "paragraph") {
            const adjacentValue = adjacentParagraphValueText(el);
            const paragraphName = hasInlineInteractiveEmbeddedInText(el) ? textBeforeFirstInlineInteractive(el) : textWithoutInteractive(el) || text;
            descriptor.name = adjacentValue && paragraphName ? `${paragraphName}${adjacentValue}` : paragraphName;
            descriptor.text = descriptor.name;
          }
          if (descriptor.complexColumnHeaderColorGroupText) {
            descriptor.name = descriptor.complexColumnHeaderColorGroupText;
            descriptor.text = descriptor.complexColumnHeaderColorGroupText;
          }
          const priceDisclosureText = role === "text" ? joinedPriceDisclosureText(el) : void 0;
          if (priceDisclosureText) {
            descriptor.name = priceDisclosureText;
            descriptor.text = priceDisclosureText;
          }
          const metricCardText = role === "text" ? groupedMetricCardText(el) : void 0;
          if (metricCardText) {
            descriptor.name = metricCardText;
            descriptor.text = metricCardText;
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
          if (contextRoles.has(role) && !isUnnamedCarouselRegion(el) && !accessibleName(el, role) && !readableText(el) && !hasVisibleInteractiveDescendant(el) && !(role === "list" && announcedListChildren(el).length)) {
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
          if (tableCellShouldYieldToStructuredContent(el, role) && !(role === "columnheader" && isComplexColumnHeaderContext(el))) {
            return false;
          }
          if (isConsumedComplexColumnHeaderTitleStop(el, role) || isConsumedComplexColumnHeaderColorStop(el, role)) {
            return false;
          }
          if (role === "paragraph" && (!readableText(el) || hasOnlyLinkContent(el))) {
            return false;
          }
          if (role === "paragraph" && isConsumedAdjacentParagraphValue(el)) {
            return false;
          }
          if (role === "image" && el.tagName?.toLowerCase() === "img" && el.hasAttribute("alt") && !normalize(el.getAttribute("alt"))) {
            return false;
          }
          if (role === "image" && !accessibleName(el, role) && !isInformativeUnlabeledCmsImage(el) && !hasStructuredListItemContent(el.closest("li,[role='listitem']"))) {
            return false;
          }
          if (role === "group" && !accessibleName(el, role) && !el.matches(interactiveSelector) && !isButtonShellClusterGroup(el) && !isButtonShellGroup(el) && !(isCustomElement(el) && hasShadowRootContent(el))) {
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
            "article"
          ].includes(role) || ["caption", "figcaption"].includes(tag);
        }
        function shouldDescendIntoStop(el) {
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
          if (contextRoles.has(role))
            return true;
          if (role === "columnheader" && isComplexColumnHeaderContext(el)) {
            return true;
          }
          if (role === "heading") {
            return false;
          }
          if (role === "listitem") {
            return hasOnlyInteractiveListItemContent(el) || hasImageLinkWithCaptionListItemContent(el) || hasNamedImageListItemContent(el) || hasStructuredListItemContent(el) || hasSingleSemanticListItemChild(el) || Boolean(el.querySelector("ul, ol, dl, [role='list']"));
          }
          if (role === "paragraph") {
            return !expandedRegionInlineLinkFragments(el) && !hasInlineInteractiveEmbeddedInText(el) && Boolean(el.querySelector(interactiveSelector));
          }
          return false;
        }
        function walkChildren(el) {
          const assignedChildren = assignedSlotChildren(el);
          if (assignedChildren.length)
            return assignedChildren;
          const shadowChildren = shadowContentChildren(el);
          if (shadowChildren.length)
            return shadowChildren;
          return Array.from(el.children);
        }
        function collapsedPopupController(container) {
          if (!container?.id)
            return null;
          const controlledBy = Array.from(document.querySelectorAll(`[aria-controls="${cssEscape(container.id)}"]`)).filter((controller) => !container.contains(controller) && !isHidden(controller));
          if (controlledBy.some((controller) => controller.getAttribute("aria-expanded") === "true")) {
            return null;
          }
          return controlledBy.find((controller) => controller.getAttribute("aria-expanded") === "false") || null;
        }
        function isInsideCollapsedPopup(el) {
          for (let current = el; current; current = current.parentElement) {
            if (collapsedPopupController(current))
              return true;
          }
          return false;
        }
        function splitDescribedAutocompleteAnnouncements(descriptor) {
          if (!descriptor.splitDescribedAutocomplete)
            return void 0;
          const label = normalize(descriptor.name || descriptor.text);
          const details = normalize(descriptor.details);
          const announcements = [label];
          if (descriptor.searchInputGroup) {
            announcements.push("group");
          }
          announcements.push(normalize([label, details].filter(Boolean).join(" ")));
          return announcements.filter((announcement) => Boolean(announcement));
        }
        function splitLabelStopAnnouncements(descriptor) {
          if (!descriptor.splitLabelStop)
            return void 0;
          const label = normalize(descriptor.name || descriptor.text);
          const announcement = generateAnnouncement2(descriptor);
          if (descriptor.nativeSelect && label && descriptor.value) {
            const value = normalize(descriptor.value);
            const labelPrefix = label.endsWith(value || "") ? normalize(label.slice(0, label.length - (value || "").length)) : void 0;
            if (labelPrefix?.endsWith(":")) {
              return [labelPrefix, value, announcement].filter((entry) => Boolean(entry));
            }
          }
          return [label, announcement].filter((entry) => Boolean(entry));
        }
        function splitCompactInputActionGroupAnnouncements(descriptor) {
          if (!descriptor.compactInputActionGroup)
            return void 0;
          const label = normalize(descriptor.name || descriptor.text);
          if (!label)
            return void 0;
          return [generateAnnouncement2(descriptor), label, `end of, ${label}, group`];
        }
        function splitCarouselGroupAnnouncements(descriptor) {
          const announcement = generateAnnouncement2(descriptor);
          if (descriptor.leadingCarouselGroup) {
            return ["group", announcement].filter((entry) => Boolean(entry));
          }
          if (descriptor.leadingStandaloneCardGroup) {
            return ["group", announcement].filter((entry) => Boolean(entry));
          }
          if (descriptor.trailingCarouselSlideGroups) {
            return [announcement, "group", "group"].filter((entry) => Boolean(entry));
          }
          return void 0;
        }
        function splitFooterCountrySelectorAnnouncements(descriptor) {
          if (!descriptor.footerCountrySelector)
            return void 0;
          const label = normalize(descriptor.name || descriptor.text);
          const announcement = generateAnnouncement2(descriptor);
          return [label, announcement, "group", "group"].filter((entry) => Boolean(entry));
        }
        function splitClusteredVisualButtonAnnouncements(descriptor) {
          if (!descriptor.clusteredVisualButton)
            return void 0;
          return [
            "group",
            generateAnnouncement2({
              ...descriptor,
              groupContext: void 0
            })
          ].filter((entry) => Boolean(entry));
        }
        function splitPrecedingControlLabelAnnouncements(descriptor) {
          if (!descriptor.precedingControlLabel)
            return void 0;
          return [descriptor.precedingControlLabel, generateAnnouncement2(descriptor)].filter((entry) => Boolean(entry));
        }
        function splitCompactResultCountAnnouncements(descriptor) {
          if (!["text", "paragraph"].includes(descriptor.role || ""))
            return void 0;
          const label = normalize(descriptor.name || descriptor.text);
          const match = label?.match(/^(\d+)(results?)$/i);
          if (!match)
            return void 0;
          return [match[1], match[2]];
        }
        function splitRichProductCardFeatureRowAnnouncements(descriptor) {
          const fragments = descriptor.richProductCardFeatureRowFragments;
          return fragments?.length ? fragments : void 0;
        }
        function splitInlineEmphasisTextAnnouncements(descriptor) {
          const fragments = descriptor.inlineEmphasisTextFragments;
          if (!["paragraph", "text"].includes(descriptor.role || "") || !fragments || fragments.length < 2) {
            return void 0;
          }
          return fragments;
        }
        function splitRichProductCardFeatureHeadingAnnouncements(descriptor) {
          if (!descriptor.richProductCardFeatureHeading)
            return void 0;
          const announcement = generateAnnouncement2(descriptor);
          return announcement ? ["list item", announcement] : ["list item"];
        }
        function formatConjunctiveList(fragments, options2 = {}) {
          if (fragments.length <= 1)
            return fragments[0] || "";
          if (fragments.length === 2)
            return `${fragments[0]} and ${fragments[1]}`;
          const comma = options2.oxfordComma === false ? "" : ",";
          return `${fragments.slice(0, -1).join(", ")}${comma} and ${fragments.at(-1)}`;
        }
        function splitComplexColumnHeaderAnnouncements(descriptor) {
          const fragments = descriptor.complexColumnHeaderFragments;
          if (descriptor.role !== "columnheader" || descriptor.tableRole !== "table" || !fragments || fragments.length < 3 || !descriptor.columnIndex || !descriptor.columnCount) {
            return void 0;
          }
          const productName = normalize(fragments[0]);
          const context = formatConjunctiveList(fragments);
          const formattedHeader = `${context} ${productName}, column ${descriptor.columnIndex} of ${descriptor.columnCount}`;
          return [formattedHeader].filter((announcement) => Boolean(announcement));
        }
        function splitComplexColumnHeaderContextCellAnnouncements(descriptor) {
          if (!["cell", "gridcell"].includes(descriptor.role || "") || descriptor.tableRole !== "table" || !descriptor.complexColumnHeaderContextText || !descriptor.columnIndex || !descriptor.columnCount) {
            return void 0;
          }
          const fragments = descriptor.complexColumnHeaderContextCellTextFragments;
          const label = normalize(descriptor.name || descriptor.text);
          const header = `${descriptor.complexColumnHeaderContextText} group, column ${descriptor.columnIndex} of ${descriptor.columnCount}`;
          return [header, ...fragments?.length ? fragments : [label]].filter((announcement) => Boolean(announcement));
        }
        function splitComplexColumnHeaderTextAnnouncements(descriptor) {
          if (!["paragraph", "text"].includes(descriptor.role || "")) {
            return void 0;
          }
          return descriptor.complexColumnHeaderTextFragments?.length ? descriptor.complexColumnHeaderTextFragments : void 0;
        }
        function splitInlineEmphasisTextAnnouncements(descriptor) {
          const fragments = descriptor.inlineEmphasisTextFragments;
          if (!["paragraph", "text"].includes(descriptor.role || "") || !fragments?.length) {
            return void 0;
          }
          return fragments;
        }
        function splitExpandedRegionInlineLinkAnnouncements(descriptor) {
          const fragments = descriptor.expandedRegionInlineLinkFragments;
          if (descriptor.role !== "paragraph" || !fragments?.length) {
            return void 0;
          }
          return fragments;
        }
        function splitInlineEmphasisListItemAnnouncements(descriptor) {
          const fragments = descriptor.inlineEmphasisListItemFragments;
          if (descriptor.role !== "listitem" || !fragments || fragments.length < 2) {
            return void 0;
          }
          const [firstFragment, ...remainingFragments] = fragments;
          const firstAnnouncement = generateAnnouncement2({
            ...descriptor,
            name: firstFragment,
            text: firstFragment
          });
          return [firstAnnouncement, ...remainingFragments].filter((announcement) => Boolean(announcement));
        }
        function scanSubtree(root) {
          const log = [];
          let stopIndex = 0;
          function walk(el) {
            if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
              return;
            if (isInsideCollapsedPopup(el))
              return;
            if (isSeparatorListItem(el))
              return;
            if (isInsideControlledTableGroupBody(el))
              return;
            if (isStopElement(el)) {
              const id = `__sr_el_${stopIndex}_${now()}`;
              stopIndex += 1;
              el.setAttribute("data-sr-id", id);
              const descriptor = captureElement(el);
              if (descriptor) {
                const announcements = splitDescribedAutocompleteAnnouncements(descriptor) || splitFooterCountrySelectorAnnouncements(descriptor) || splitCompactInputActionGroupAnnouncements(descriptor) || splitPrecedingControlLabelAnnouncements(descriptor) || splitCarouselGroupAnnouncements(descriptor) || splitClusteredVisualButtonAnnouncements(descriptor) || splitLabelStopAnnouncements(descriptor) || splitCompactResultCountAnnouncements(descriptor) || splitComplexColumnHeaderAnnouncements(descriptor) || splitComplexColumnHeaderContextCellAnnouncements(descriptor) || splitComplexColumnHeaderTextAnnouncements(descriptor) || splitRichProductCardFeatureHeadingAnnouncements(descriptor) || splitRichProductCardFeatureRowAnnouncements(descriptor) || splitExpandedRegionInlineLinkAnnouncements(descriptor) || splitInlineEmphasisTextAnnouncements(descriptor) || splitInlineEmphasisListItemAnnouncements(descriptor) || [generateAnnouncement2(descriptor)];
                for (const announcement of announcements) {
                  if (!announcement)
                    continue;
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
