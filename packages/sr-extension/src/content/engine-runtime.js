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
        const normalized = value?.replace(/[\u200B-\u200F\uFEFF]/g, "").replace(/\s+/g, " ").replace(/\s+([,!?;:]|\.(?![\p{L}\p{N}]))/gu, "$1").trim();
        return normalized || void 0;
      }
      function normalizeTextPreservingSpaceBeforeColon(value) {
        const normalized = value?.replace(/[\u200B-\u200F\uFEFF]/g, "").replace(/\s+/g, " ").replace(/\s+([,!?;]|\.(?![\p{L}\p{N}]))/gu, "$1").trim();
        return normalized || void 0;
      }
      function normalizeTextPreservingSpaceBeforePunctuation(value) {
        const normalized = value?.replace(/[\u200B-\u200F\uFEFF]/g, "").replace(/\s+/g, " ").trim();
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
        if (roleDescription === "empty group") {
          return "empty group";
        }
        return roleDescription === "carousel" || roleDescription === "slideshow" || roleDescription === "slide" || roleDescription === "tab group" ? roleDescription : "group";
      }
      function pushTableColumnContext(parts, el) {
        if (!hasTableColumnContext(el)) {
          return;
        }
        if (el.columnIndex === 1 && el.rowIndex && el.rowIndex > 1 && el.columnHeaderText && el.name && parts.length > 0) {
          parts[0] = `${el.name} ${el.columnHeaderText} ${parts[0]}`;
        } else {
          mergeTableColumnHeaderContext(parts, el);
        }
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
          const rowLabel = `row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""}`;
          if (parts.length > 0) {
            parts[0] = `${rowLabel} ${parts[0]}`;
          } else {
            parts.unshift(rowLabel);
          }
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
          const popupState = `list box pop up ${el.expanded ? "expanded" : "collapsed"}`;
          parts.push(el.required ? `required ${popupState}` : popupState);
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
      function pushSupplementalText(parts, el, options = {}) {
        if (!options.skipDetails) {
          pushIfPresent(parts, el.details);
        }
        pushInvalidState(parts, el.invalid);
        pushIfPresent(parts, el.errorMessage);
        if (el.busy) {
          parts.push("busy");
        }
      }
      function appendInlineDetails(label, details) {
        const normalizedDetails = normalizeText(details);
        if (!normalizedDetails) {
          return label;
        }
        const normalizedLabel = normalizeText(label);
        if (!normalizedLabel) {
          return normalizedDetails;
        }
        return normalizeText(`${normalizedLabel} ${normalizedDetails}`);
      }
      function formatHeadingFragments(level, fragments, fragmentCount) {
        const normalizedFragments = fragments?.map((fragment) => normalizeText(fragment)).filter((fragment) => Boolean(fragment));
        if (!normalizedFragments?.length) {
          return void 0;
        }
        const itemCount = fragmentCount && fragmentCount > normalizedFragments.length ? fragmentCount : normalizedFragments.length;
        if (level === 1) {
          return `heading level ${level} ${normalizedFragments.join(" ")}, ${itemCount} items`;
        }
        const [firstFragment, ...nestedFragments] = normalizedFragments;
        const nestedLevel = Math.max(1, level - 1);
        const shouldExpandBoundaryFragments = Boolean(fragmentCount && fragmentCount > normalizedFragments.length);
        const nestedAnnouncements = nestedFragments.flatMap((fragment) => {
          const parenthesized = shouldExpandBoundaryFragments ? fragment.match(/^\((.+)\)$/) : void 0;
          if (!parenthesized) {
            return [`level ${nestedLevel} ${fragment}`];
          }
          return [
            `level ${nestedLevel} (`,
            `level ${nestedLevel} ${parenthesized[1]}`,
            `level ${nestedLevel})`
          ];
        });
        return [
          `heading level ${level} ${firstFragment}`,
          ...nestedAnnouncements,
          `level ${nestedLevel}, ${itemCount} items`
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
            const headingWithFragments = el.headingLink || el.headingButton ? formatInteractiveHeadingFragments(el.headingFragments) : formatHeadingFragments(level, el.headingFragments, el.headingFragmentCount);
            const headingLabel = headingWithFragments ?? (el.preserveSpaceBeforePunctuationName ? normalizeTextPreservingSpaceBeforePunctuation(el.preserveSpaceBeforePunctuationName) : label);
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
              if (el.preserveSpaceBeforePunctuationName && headingLabel) {
                parts.push(headingLabel);
              } else {
                pushIfPresent(parts, headingLabel);
              }
              if (!el.headingButton) {
                if (!headingWithFragments && el.headingFragmentCount && el.headingFragmentCount > 1) {
                  parts.push(`${el.headingFragmentCount} items`);
                }
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
            const buttonLabel = el.preserveSpaceBeforePunctuationName ? normalizeTextPreservingSpaceBeforePunctuation(el.preserveSpaceBeforePunctuationName) : label;
            const announcedButtonLabel = appendInlineDetails(buttonLabel, el.details);
            const buttonDetailsAreInline = Boolean(normalizeText(el.details));
            if (announcedButtonLabel) {
              parts.push(announcedButtonLabel);
            }
            if (el.checkboxRoleButtonAccordion) {
              if (el.disabled && el.expanded !== void 0) {
                parts.push(`dimmed ${el.expanded ? "expanded" : "collapsed"}`);
              } else if (el.disabled) {
                parts.push("dimmed");
              } else if (el.expanded !== void 0) {
                parts.push(el.expanded ? "expanded" : "collapsed");
              }
              parts.push("button");
              pushCollectionPosition(parts, el);
              pushSupplementalText(parts, el, { skipDetails: buttonDetailsAreInline });
              break;
            }
            const popupType = formatPopupType(el.hasPopup);
            const isToggleButton = el.roleDescription === "toggle button" || el.pressed !== void 0;
            if (popupType && !isToggleButton) {
              if (el.popupLabelWithoutComma && label) {
                parts[parts.length - 1] = `${label} ${popupType}`;
                parts.push("button");
              } else if (el.expanded !== void 0) {
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
              if (el.current === "page") {
                parts.push("current page");
              } else if (el.current) {
                parts.push(el.current === true ? "current item" : `current ${el.current}`);
              }
              parts.push(isToggleButton ? "toggle button" : el.roleDescription ?? "button");
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
                const roleIndex = parts.lastIndexOf("toggle button");
                if (roleIndex >= 0) {
                  parts.splice(roleIndex, 0, "selected");
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
            pushSupplementalText(parts, el, { skipDetails: buttonDetailsAreInline });
            break;
          }
          case "link": {
            const linkLabel = el.preserveSpaceBeforeColonName ? normalizeTextPreservingSpaceBeforeColon(el.preserveSpaceBeforeColonName) : label;
            const announcedLinkLabel = appendInlineDetails(linkLabel, el.details);
            const linkDetailsAreInline = Boolean(normalizeText(el.details));
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
              parts.push(`${popupType} ${el.expanded ? "expanded" : "collapsed"}`);
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
              pushIfPresent(parts, announcedLinkLabel);
            } else if (el.iconOnlyLink) {
              parts.push("link");
              parts.push("image");
              pushIfPresent(parts, announcedLinkLabel);
            } else {
              parts.push("link");
              if (el.linkHeadingLevel) {
                parts.push(`heading level ${el.linkHeadingLevel}`);
              }
              if (el.preserveSpaceBeforeColonName && announcedLinkLabel) {
                parts.push(announcedLinkLabel);
              } else {
                pushIfPresent(parts, announcedLinkLabel);
              }
            }
            pushCollectionPosition(parts, el);
            pushTableColumnContext(parts, el);
            pushSupplementalText(parts, el, { skipDetails: linkDetailsAreInline });
            break;
          }
          case "separator": {
            parts.push("horizontal splitter");
            pushSupplementalText(parts, el);
            break;
          }
          case "textbox":
          case "searchbox": {
            if (role === "searchbox") {
              const searchPlaceholder = placeholder !== label ? placeholder : void 0;
              pushIfPresent(parts, [label, value ?? searchPlaceholder].filter(Boolean).join(" "));
              const popupType = formatPopupType(el.hasPopup);
              if (el.required && popupType) {
                parts.push(`required ${popupType}`);
              } else if (el.required) {
                parts.push("required");
              } else if (popupType) {
                parts.push(popupType);
              }
              parts.push("search text field");
              if (!el.suppressAutocomplete && popupType !== "list box pop up" && popupType !== "grid pop up") {
                pushAutocomplete(parts, el.autocomplete);
              }
            } else {
              const placeholderText = placeholder !== label ? placeholder : void 0;
              const inlineEmailDetails = el.emailTextField && el.details ? normalizeText(el.details) : void 0;
              if (inlineEmailDetails) {
                pushIfPresent(parts, [label, inlineEmailDetails].filter(Boolean).join(" "));
                if (el.required) {
                  parts.push("required");
                }
                parts.push("email");
                pushSupplementalText(parts, el, { skipDetails: true });
                break;
              }
              if (el.placeholderOnlyTextboxName && !value) {
                const placeholderLabel = placeholderText ?? label;
                pushIfPresent(parts, placeholderLabel ? `${placeholderLabel} edit text` : "edit text");
                parts.push("blank");
                pushAutocomplete(parts, el.autocomplete);
                pushSupplementalText(parts, el);
                break;
              }
              pushIfPresent(parts, el.textboxPlaceholderBeforeRole && !value ? [label, placeholderText].filter(Boolean).join(" ") : label);
              if (el.invalid) {
                pushInvalidState(parts, el.invalid === true ? "data" : el.invalid);
              }
              if (el.secureTextField && el.required) {
                parts.push("required");
              }
              parts.push(el.textEntryArea ? "text entry area" : el.secureTextField ? "secure text field" : el.emailTextField ? "email" : "edit text");
              if (!el.invalid && !el.textboxPlaceholderBeforeRole) {
                pushIfPresent(parts, value ?? placeholderText);
              }
              pushAutocomplete(parts, el.autocomplete);
              if (el.required && !el.secureTextField) {
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
          case "spinbutton": {
            pushIfPresent(parts, [value, label].filter(Boolean).join(", "));
            parts.push("stepper");
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "slider": {
            pushIfPresent(parts, [value, label].filter(Boolean).join(", "));
            parts.push("slider");
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "combobox": {
            let detailsAreInline = false;
            if (el.nativeSelect) {
              const selectLabel = normalizeText(el.name);
              const selectDetails = normalizeText(el.details);
              pushIfPresent(parts, value);
              if (selectLabel && selectLabel !== value) {
                pushIfPresent(parts, [selectLabel, selectDetails].filter(Boolean).join(" "));
                detailsAreInline = Boolean(selectDetails);
              }
              parts.push(`menu pop up ${el.expanded ? "expanded" : "collapsed"}`);
              parts.push("button");
            } else {
              const popupType = formatPopupType(el.hasPopup);
              const comboLabel = label ?? placeholder;
              const comboLabelFromPlaceholder = !label && Boolean(placeholder) || Boolean(label && placeholder && normalizeText(label) === normalizeText(placeholder) && !normalizeText(el.description) && !normalizeText(el.details));
              if (el.nativeDatalistPlaceholderName && comboLabel && popupType) {
                parts.push(`${comboLabel} ${popupType}`);
              } else if (comboLabelFromPlaceholder && comboLabel && popupType) {
                if (el.expanded !== void 0) {
                  parts.push(popupType === "grid pop up" ? `${comboLabel}, ${popupType} ${el.expanded ? "expanded" : "collapsed"}` : `${comboLabel} ${popupType} ${el.expanded ? "expanded" : "collapsed"}`);
                } else {
                  parts.push(`${comboLabel} ${popupType}`);
                }
              } else {
                if (comboLabelFromPlaceholder && comboLabel && !popupType && normalizeText(el.autocomplete) === "list" && el.expanded !== void 0) {
                  const popupState = `list box pop up ${el.expanded ? "expanded" : "collapsed"}`;
                  parts.push(`${comboLabel} ${el.required ? `required ${popupState}` : popupState}`);
                } else {
                  pushIfPresent(parts, comboLabel);
                }
                if (popupType && el.expanded !== void 0) {
                  parts.push(`${popupType} ${el.expanded ? "expanded" : "collapsed"}`);
                } else if (popupType) {
                  parts.push(popupType);
                } else if (!popupType && !(comboLabelFromPlaceholder && comboLabel && normalizeText(el.autocomplete) === "list" && el.expanded !== void 0)) {
                  pushComboBoxAutocomplete(parts, el);
                }
              }
              if (popupType && el.expanded !== void 0 && el.nativeDatalistPlaceholderName && comboLabel) {
                parts.push(`${popupType} ${el.expanded ? "expanded" : "collapsed"}`);
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
            pushSupplementalText(parts, el, { skipDetails: detailsAreInline });
            break;
          }
          case "checkbox": {
            pushIfPresent(parts, label);
            if (el.checked === true) {
              parts.push("checked");
            } else if (el.checked === "mixed") {
              parts.push("half checked");
            } else {
              parts.push("unchecked");
            }
            parts.push("checkbox");
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
          case "meter": {
            pushIfPresent(parts, value);
            pushIfPresent(parts, label);
            parts.push("level indicator");
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "object": {
            pushIfPresent(parts, label);
            parts.push(el.emptyObject ? "empty object" : "object");
            pushSupplementalText(parts, el);
            break;
          }
          case "listitem": {
            const listItemLabel = normalizeText(el.name);
            if (!listItemLabel) {
              return "";
            }
            parts.push(listItemLabel);
            if (!el.largePlainListItem && (!el.positionInSet || !el.setSize)) {
              parts.push("list item");
            }
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "term": {
            pushIfPresent(parts, label);
            pushSupplementalText(parts, el);
            parts.push(el.emptyTerm ? "empty term" : "term");
            pushCollectionPosition(parts, el);
            if (el.duplicateCollectionPosition && el.positionInSet && el.setSize) {
              parts.push(`${el.positionInSet} of ${el.setSize}`);
            }
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
          case "timer": {
            pushIfPresent(parts, label?.replace(/\s+(?=\d{1,2}:\d{2}(?::\d{2})?$)/u, ""));
            pushSupplementalText(parts, el);
            break;
          }
          case "list": {
            const listLabel = normalizeText(el.name);
            const listRole = el.roleDescription ?? "list";
            const listSize = el.largePlainList ? void 0 : el.setSize ? `${el.setSize} ${el.setSize === 1 ? "item" : "items"}` : void 0;
            const listLevel = el.level && el.level > 1 ? `level ${el.level}` : void 0;
            const parentPosition = el.parentPositionInSet && el.parentSetSize ? `${el.parentPositionInSet} of ${el.parentSetSize}` : void 0;
            const listParts = listLabel && (listRole === "list" || listRole === "definition list") ? [listRole, listLabel, listSize] : [listLabel, listRole, listSize];
            const normalizedListParts = listParts.filter((part) => Boolean(part));
            const supplementalParts = [];
            if (el.largePlainList) {
              supplementalParts.push("more than 100 items");
            }
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
            if (!el.popupListboxContainer) {
              pushIfPresent(parts, el.name);
            }
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
            parts.push(role === "grid" && el.tableRole !== "table" ? "grid" : "table");
            if (el.columnCount) {
              parts.push(`${el.columnCount} ${el.columnCount === 1 ? "column" : "columns"}`);
            }
            if (el.rowCount) {
              parts.push(`${el.rowCount} ${el.rowCount === 1 ? "row" : "rows"}`);
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
                parts.push((el.simpleNativeTwoColumnHeaderContext || el.simpleNativeColumnHeaderContext) && el.columnIndex && el.columnIndex > 1 && label ? `${label} ${label}` : label ?? "blank");
                parts.push(`column ${el.columnIndex} of ${el.columnCount}`);
              } else {
                if (role === "rowheader" && el.columnIndex === 1 && el.rowIndex && label && el.tableGroupHeaderText) {
                  parts.push(`row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""} ${label}, ${el.tableGroupHeaderText} ${label}`);
                } else if (role === "rowheader" && el.columnIndex === 1 && el.rowIndex && label && el.columnHeaderText && el.simpleNativeColumnHeaderContext) {
                  const columnSpanContext = el.columnSpan && el.columnSpan > 1 ? `${el.columnHeaderText} spans ${el.columnSpan} columns` : el.tableHasRowgroupSpanHeaders ? void 0 : el.columnHeaderText;
                  parts.push(`row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""} ${label} ${columnSpanContext ? `${columnSpanContext} ` : ""}${label}`);
                } else if (role === "rowheader" && el.columnIndex === 1 && el.rowIndex && label && el.tableHasComplexColumnHeaders) {
                  parts.push(`row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""} ${label} ${label}`);
                } else if (el.columnIndex === 1 && el.rowIndex) {
                  const rowLabel = `row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""}`;
                  const cellContext = normalizeText([el.columnHeaderText, label ?? "blank"].filter(Boolean).join(" "));
                  if (el.rowIndex === 1 && label) {
                    parts.push(label);
                  } else if (el.simpleNativeTwoColumnHeaderContext && cellContext) {
                    parts.push(`${rowLabel} ${cellContext}`);
                  } else if (el.nativeUnheadedFirstColumnContext && cellContext) {
                    parts.push(`${rowLabel} ${cellContext}`);
                  } else if (cellContext) {
                    parts.push(`${rowLabel} ${cellContext}`);
                  } else {
                    parts.push(rowLabel);
                  }
                } else {
                  pushIfPresent(parts, [el.columnHeaderText, label ?? "blank"].filter(Boolean).join(" "));
                }
                parts.push(`column ${el.columnIndex} of ${el.columnCount}`);
              }
            } else {
              pushIfPresent(parts, label);
              parts.push(role === "gridcell" ? "grid cell" : role.replace(/header$/, " header"));
              pushTableCoordinates(parts, el);
            }
            if (el.columnSpan && el.columnSpan > 1 && !(role === "rowheader" && el.columnIndex === 1 && el.rowIndex && label && el.columnHeaderText && el.simpleNativeColumnHeaderContext)) {
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
            if (el.tabExpandedState && el.expanded !== void 0) {
              parts.push(el.expanded ? "expanded" : "collapsed");
            }
            const popupType = formatPopupType(el.hasPopup);
            if (popupType) {
              parts.push(popupType.replace("pop up", "pop-up"));
            }
            parts.push("tab");
            if (popupType || el.groupContext) {
              parts.push("group");
            }
            pushCollectionPosition(parts, el);
            pushSupplementalText(parts, el);
            break;
          }
          case "group": {
            if (el.richTextGroup && label) {
              parts.push(`${label} group`);
              break;
            }
            pushIfPresent(parts, label);
            parts.push(genericGroupRoleLabel(el));
            pushCollectionPosition(parts, el);
            break;
          }
          case "frame": {
            pushIfPresent(parts, label);
            parts.push("frame");
            pushSupplementalText(parts, el);
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
            if (el.namedAlertBoundary) {
              pushIfPresent(parts, label);
              parts.push("alert");
              break;
            }
            parts.push(el.roleDescription === "group" ? "group" : "alert");
            pushIfPresent(parts, label);
            pushSupplementalText(parts, el);
            break;
          }
          case "status": {
            if (!label && !el.details && !el.errorMessage && !el.busy) {
              break;
            }
            if (el.suppressStatusRolePrefix && label) {
              pushIfPresent(parts, label);
              pushSupplementalText(parts, el);
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
            pushSupplementalText(parts, el);
            break;
          }
          case "tooltip": {
            parts.push("tooltip");
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
          case "form": {
            pushIfPresent(parts, el.name);
            parts.push("form");
            pushSupplementalText(parts, el);
            break;
          }
          case "banner":
          case "main":
          case "complementary":
          case "article":
          case "region": {
            if (el.emptyContext && role === "banner") {
              parts.push("empty banner");
              break;
            }
            pushIfPresent(parts, el.name);
            parts.push(el.roleDescription ?? role);
            if (role === "article") {
              pushCollectionPosition(parts, el);
            }
            pushSupplementalText(parts, el);
            break;
          }
          case "sectionfooter": {
            pushIfPresent(parts, el.name);
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
        if (role === "term") {
          const name = normalizeText(descriptor?.name);
          if (!name)
            return "end of term";
          const position = descriptor?.parenthesizedCollectionPosition && descriptor.positionInSet && descriptor.setSize ? `, (${descriptor.positionInSet} of ${descriptor.setSize})` : "";
          return `end of, ${name}, term${position}`;
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
        if (role === "sectionfooter") {
          return descriptor?.name ? `end of, ${descriptor.name}` : "end of";
        }
        if (role === "main") {
          return descriptor?.name ? `end of, ${descriptor.name}, main` : "end of, main";
        }
        if (role === "navigation") {
          return descriptor?.name ? `end of, ${descriptor.name}, navigation` : "end of, navigation";
        }
        if (role === "region" && descriptor?.roleDescription === "carousel") {
          return descriptor.name ? `end of, ${descriptor.name}, ${descriptor.roleDescription}` : `end of, ${descriptor.roleDescription}`;
        }
        if (role === "search") {
          return descriptor?.name ? `end of, ${descriptor.name}, search` : "end of, search";
        }
        if (role === "form") {
          return descriptor?.name ? `end of, ${descriptor.name}, form` : "end of, form";
        }
        if (role === "radiogroup") {
          const roleName = descriptor?.roleDescription ?? "radio group";
          return descriptor?.name ? `end of, ${descriptor.name}, ${roleName}` : `end of, ${roleName}`;
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
          if (descriptor?.tableRole === "table") {
            return "end of table";
          }
          return "end of grid";
        }
        if (role === "region") {
          return descriptor?.name ? `end of, ${descriptor.name}, region` : "end of region";
        }
        if (role === "article") {
          const name = descriptor?.contextEndName || (descriptor?.inferredArticleName ? void 0 : descriptor?.name);
          return name ? `end of, ${name}, article` : "end of, article";
        }
        if (role === "dialog") {
          return descriptor?.name ? `end of, ${descriptor.name}, dialog` : "end of, dialog";
        }
        if (role === "alert" && descriptor?.namedAlertBoundary) {
          return descriptor.name ? `end of, ${descriptor.name}, alert` : "end of, alert";
        }
        if (role === "tooltip") {
          return "end of, tooltip";
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
        const { generateAnnouncement: generateAnnouncement2, getContextEndAnnouncement: getContextEndAnnouncement2, accessibilityTree, includeTraversalDebug = false, now = () => Date.now() } = options;
        const interactiveSelector = "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], [role='combobox'], [role='searchbox'], [role='textbox']";
        const contextRoles = /* @__PURE__ */ new Set([
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
          "radiogroup",
          "list",
          "listbox",
          "table",
          "grid",
          "tabpanel",
          "article",
          "dialog",
          "tooltip"
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
        function normalizeAnnouncementLabel(value) {
          const normalized = normalize(value)?.replace(/\s+([,!?;]|\.(?![\p{L}\p{N}]))/gu, "$1");
          return normalized || void 0;
        }
        function isOptionalComputedStyleElement(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return false;
          if (el.namespaceURI === "http://www.w3.org/1998/Math/MathML")
            return true;
          if (el.tagName?.toLowerCase?.() === "math" || el.closest?.("math"))
            return true;
          return false;
        }
        function safeComputedStyle(el, pseudoElt) {
          if (typeof getComputedStyle !== "function")
            return void 0;
          try {
            return getComputedStyle(el, pseudoElt);
          } catch (error) {
            if (!isOptionalComputedStyleElement(el))
              throw error;
            return void 0;
          }
        }
        const accessibilityNodes = Array.isArray(accessibilityTree?.nodes) ? accessibilityTree.nodes : [];
        const accessibilityNodeById = new Map(accessibilityNodes.map((node) => [normalize(node.nodeId), node]).filter((entry) => Boolean(entry[0])));
        function normalizedAxRole(role) {
          const lower = normalize(role)?.toLowerCase();
          if (!lower)
            return void 0;
          if (lower === "axlink")
            return "link";
          if (lower === "iframe")
            return "frame";
          return lower;
        }
        function urlPathAndSearch(value) {
          const normalized = normalize(value);
          if (!normalized)
            return void 0;
          try {
            const url = new URL(normalized, "https://sr-output.local");
            return `${url.pathname}${url.search}`;
          } catch {
            return void 0;
          }
        }
        function linkMatchesAxUrl(el, node) {
          const hrefPath = urlPathAndSearch(el?.getAttribute?.("href"));
          const axUrl = node.properties?.url;
          const axPath = typeof axUrl === "string" ? urlPathAndSearch(axUrl) : void 0;
          return Boolean(hrefPath && axPath && hrefPath === axPath);
        }
        function sameNameDifferentCase(left, right) {
          const normalizedLeft = normalize(left);
          const normalizedRight = normalize(right);
          return Boolean(normalizedLeft && normalizedRight && normalizedLeft !== normalizedRight && normalizedLeft.toLocaleLowerCase("en-US") === normalizedRight.toLocaleLowerCase("en-US"));
        }
        function sameNameIgnoringCase(left, right) {
          const normalizedLeft = normalize(left);
          const normalizedRight = normalize(right);
          return Boolean(normalizedLeft && normalizedRight && normalizedLeft.toLocaleLowerCase("en-US") === normalizedRight.toLocaleLowerCase("en-US"));
        }
        function allowsRenderedCaseName(role) {
          return [
            "button",
            "heading",
            "link",
            "paragraph",
            "statictext",
            "text"
          ].includes(role);
        }
        function cssRenderedCaseName(el, role, name) {
          if (!allowsRenderedCaseName(role) || !name)
            return void 0;
          const textTransform = normalize(safeComputedStyle(el)?.textTransform)?.toLowerCase();
          if (textTransform === "uppercase" && /[a-z]/.test(name)) {
            return name.toLocaleUpperCase("en-US");
          }
          return void 0;
        }
        function axRenderedCaseName(el, role, name) {
          if (!allowsRenderedCaseName(role) || !name || !accessibilityNodes.length)
            return void 0;
          const domNodeId = normalize(el?.getAttribute?.("data-sr-dom-node-id"));
          const normalizedRoles = role === "text" || role === "paragraph" ? /* @__PURE__ */ new Set(["statictext", role]) : /* @__PURE__ */ new Set([role]);
          const roleNodes = accessibilityNodes.filter((node) => {
            if (node.ignored)
              return false;
            if (!normalizedRoles.has(normalizedAxRole(node.role) || ""))
              return false;
            return sameNameIgnoringCase(node.name, name);
          });
          const exactNodeCandidates = domNodeId ? roleNodes.filter((node) => normalize(node.domNodeId) === domNodeId) : [];
          const candidates = exactNodeCandidates.length ? exactNodeCandidates.filter((node) => sameNameDifferentCase(node.name, name)) : role === "link" ? roleNodes.filter((node) => sameNameDifferentCase(node.name, name) && linkMatchesAxUrl(el, node)) : [];
          if (!exactNodeCandidates.length) {
            const urlMatchedNames = new Set(roleNodes.filter((node) => linkMatchesAxUrl(el, node)).map((node) => normalize(node.name)).filter((candidate) => Boolean(candidate)));
            if (urlMatchedNames.size > 1)
              return void 0;
          }
          const names = new Set(candidates.map((node) => normalize(node.name)).filter((candidate) => Boolean(candidate)));
          return names.size === 1 ? Array.from(names)[0] : void 0;
        }
        function axRenderedDescendantTextCaseName(el, name) {
          if (!name || !accessibilityNodes.length)
            return void 0;
          const root = axNodeAnyForElement(el);
          if (!root)
            return void 0;
          const rootRole = normalizedAxRole(root.role);
          if (!root.ignored && !["figcaption", "paragraph", "time"].includes(rootRole || ""))
            return void 0;
          const candidates = axDescendants(root).filter((node) => {
            if (node.ignored)
              return false;
            if (!["generic", "statictext", "inlinetextbox"].includes(normalizedAxRole(node.role) || "")) {
              return false;
            }
            if (!sameNameDifferentCase(node.name, name))
              return false;
            return true;
          });
          const names = new Set(candidates.map((node) => normalize(node.name)).filter((candidate) => Boolean(candidate)));
          return names.size === 1 ? Array.from(names)[0] : void 0;
        }
        function axRenderedSingleChildTextCaseName(el, name) {
          if (!name || !accessibilityNodes.length)
            return void 0;
          const visibleTextChildren = Array.from(el?.children || []).filter((child2) => {
            if (isHidden(child2))
              return false;
            if (child2.matches?.(interactiveSelector))
              return false;
            if (Array.from(child2.children || []).some((grandchild) => !isHidden(grandchild))) {
              return false;
            }
            return sameNameIgnoringCase(readableText(child2), name);
          });
          if (visibleTextChildren.length !== 1)
            return void 0;
          const child = visibleTextChildren[0];
          return cssRenderedCaseName(child, "text", name) || axRenderedCaseName(child, "text", name) || axRenderedDescendantTextCaseName(child, name);
        }
        function axParentheticalName(el, role, name) {
          if (role !== "link" || !name || !accessibilityNodes.length)
            return void 0;
          const domNodeId = normalize(el?.getAttribute?.("data-sr-dom-node-id"));
          const candidates = accessibilityNodes.filter((node) => {
            if (node.ignored)
              return false;
            if (normalizedAxRole(node.role) !== role)
              return false;
            const axName = normalize(node.name);
            if (!axName || axName === name || !axName.startsWith(`${name} (`))
              return false;
            if (!/\([^)]+\)$/.test(axName))
              return false;
            if (domNodeId && normalize(node.domNodeId) === domNodeId)
              return true;
            return linkMatchesAxUrl(el, node);
          });
          const names = new Set(candidates.map((node) => normalize(node.name)).filter((candidate) => Boolean(candidate)));
          return names.size === 1 ? Array.from(names)[0] : void 0;
        }
        function hasAxRole(el, role) {
          if (!accessibilityNodes.length)
            return false;
          const domNodeId = normalize(el?.getAttribute?.("data-sr-dom-node-id"));
          if (!domNodeId)
            return false;
          return accessibilityNodes.some((node) => !node.ignored && normalize(node.domNodeId) === domNodeId && normalizedAxRole(node.role) === role);
        }
        function axNodeForElementRole(el, role) {
          if (!accessibilityNodes.length)
            return void 0;
          const domNodeId = normalize(el?.getAttribute?.("data-sr-dom-node-id"));
          if (!domNodeId)
            return void 0;
          const candidates = accessibilityNodes.filter((node) => !node.ignored && normalize(node.domNodeId) === domNodeId && normalizedAxRole(node.role) === role);
          return candidates.length === 1 ? candidates[0] : void 0;
        }
        function axNodeForElement(el) {
          if (!accessibilityNodes.length)
            return void 0;
          const domNodeId = normalize(el?.getAttribute?.("data-sr-dom-node-id"));
          if (!domNodeId)
            return void 0;
          const candidates = accessibilityNodes.filter((node) => !node.ignored && normalize(node.domNodeId) === domNodeId);
          return candidates.length === 1 ? candidates[0] : void 0;
        }
        function axNodeAnyForElement(el) {
          if (!accessibilityNodes.length)
            return void 0;
          const domNodeId = normalize(el?.getAttribute?.("data-sr-dom-node-id"));
          if (!domNodeId)
            return void 0;
          const candidates = accessibilityNodes.filter((node) => normalize(node.domNodeId) === domNodeId);
          return candidates.length === 1 ? candidates[0] : void 0;
        }
        function axStaticTextRunFragments(el, role) {
          if (!["paragraph", "text"].includes(role))
            return void 0;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (!accessibilityNodes.length)
            return void 0;
          if (el.closest(interactiveSelector) || el.querySelector(interactiveSelector))
            return void 0;
          const visibleElementChildren2 = Array.from(el.children || []).filter((child) => !isHidden(child));
          const hasOnlyInlinePhrasingChildren = visibleElementChildren2.length > 0 && visibleElementChildren2.every((child) => ["span", "strong", "b", "em", "i"].includes(child.tagName?.toLowerCase()));
          if (visibleElementChildren2.length && !hasOnlyInlinePhrasingChildren) {
            return void 0;
          }
          const text = normalize(readableText(el) || el.textContent);
          if (!text)
            return void 0;
          const axNode = axNodeAnyForElement(el);
          const axChildren = axChildNodes(axNode).filter((child) => !child.ignored);
          if (axChildren.length < 2)
            return void 0;
          const inlineFragments = axInlinePhrasingStaticTextRunFragments(axChildren, Boolean(visibleElementChildren2.length), text);
          if (inlineFragments)
            return inlineFragments;
          if (visibleElementChildren2.length)
            return void 0;
          if (axChildren.some((child) => normalizedAxRole(child.role) !== "statictext")) {
            return void 0;
          }
          const fragments = axChildren.map((child) => normalize(child.name)).filter((fragment) => Boolean(fragment && /[\p{L}\p{N}]/u.test(fragment)));
          if (fragments.length < 2)
            return void 0;
          if (normalize(fragments.join(" ")) !== text)
            return void 0;
          if (!fragments.some((fragment) => /^\p{N}+(?:[.,]\p{N}+)?(?:\s*[\p{L}%]{1,4})?$/u.test(fragment)))
            return void 0;
          if (/^\S+\s+\p{N}+\s*[–-]\s*\p{N}+\s+of\s+\p{N}+$/iu.test(text))
            return void 0;
          if (/^Showing\s+\p{N}+\s+of\s+\p{N}+\b/iu.test(text))
            return void 0;
          return fragments;
        }
        function axInlinePhrasingStaticTextRunFragments(axChildren, hasVisibleElementChildren, text) {
          if (!hasVisibleElementChildren)
            return void 0;
          const fragments = [];
          const boundaryFragments = [];
          for (const child of axChildren) {
            const role = normalizedAxRole(child.role);
            if (role === "statictext") {
              const fragment = normalize(child.name);
              if (fragment && !isIgnorableInlineBoundaryStaticText(fragment)) {
                fragments.push(fragment);
              }
              continue;
            }
            if (!["strong", "emphasis", "generic"].includes(role)) {
              return void 0;
            }
            const childFragments = axDescendantStaticTextFragments(child);
            if (!childFragments.length)
              return void 0;
            for (const fragment of childFragments) {
              fragments.push(fragment);
              boundaryFragments.push({ role, text: fragment });
            }
          }
          if (fragments.length < 2 || !boundaryFragments.length)
            return void 0;
          if (!fragmentsAppearInTextOrder(fragments, text))
            return void 0;
          const strongBoundaryCount = boundaryFragments.filter((fragment) => ["strong", "emphasis"].includes(fragment.role)).length;
          const hasScalarBoundary = boundaryFragments.some((fragment) => isScalarInlineBoundaryText(fragment.text));
          const hasRepeatedEmphasisBoundary = strongBoundaryCount >= 2;
          if (!hasScalarBoundary && !hasRepeatedEmphasisBoundary)
            return void 0;
          return fragments;
        }
        function axDescendantStaticTextFragments(node) {
          const fragments = [];
          function visit(current) {
            if (!current || current.ignored)
              return;
            const role = normalizedAxRole(current.role);
            if (role === "statictext") {
              const fragment = normalize(current.name);
              if (fragment && /[\p{L}\p{N}£$€]/u.test(fragment)) {
                fragments.push(fragment);
              }
              return;
            }
            if (!["strong", "emphasis", "generic"].includes(role))
              return;
            for (const child of axChildNodes(current))
              visit(child);
          }
          visit(node);
          return fragments;
        }
        function isIgnorableInlineBoundaryStaticText(fragment) {
          const normalized = normalize(fragment)?.toLowerCase();
          return !normalized || /^[,.;:!?]+$/u.test(normalized) || normalized === "or";
        }
        function isScalarInlineBoundaryText(fragment) {
          const normalized = normalize(fragment);
          if (!normalized)
            return false;
          if (/[£$€]\s*\p{N}/u.test(normalized))
            return true;
          if (/\p{N}/u.test(normalized))
            return true;
          return /^(?:midnight|noon|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:\b|\s)/iu.test(normalized);
        }
        function fragmentsAppearInTextOrder(fragments, text) {
          const normalizedText = normalize(text)?.toLowerCase();
          if (!normalizedText)
            return false;
          let offset = 0;
          for (const fragment of fragments) {
            const normalizedFragment = normalize(fragment)?.toLowerCase();
            if (!normalizedFragment)
              continue;
            const index = normalizedText.indexOf(normalizedFragment, offset);
            if (index < 0)
              return false;
            offset = index + normalizedFragment.length;
          }
          return true;
        }
        function nativeTableCellTextFragments(el, role) {
          if (!["cell", "gridcell"].includes(role))
            return void 0;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName?.toLowerCase() !== "td")
            return void 0;
          if (!accessibilityNodes.length)
            return void 0;
          if (el.matches(interactiveSelector) || el.querySelector(interactiveSelector))
            return void 0;
          const table = el.closest("table");
          if (!table || implicitRole(table) !== "table")
            return void 0;
          if (tableHasInteractiveDescendant(table))
            return void 0;
          const visibleElementChildren2 = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (!visibleElementChildren2.length)
            return void 0;
          if (visibleElementChildren2.some((child) => {
            if (child.tagName?.toLowerCase() !== "p")
              return true;
            return child.querySelector(interactiveSelector);
          })) {
            return void 0;
          }
          const hasRichParagraphBoundary = visibleElementChildren2.some((child) => Boolean(child.querySelector?.("strong,b,em,i")));
          if (!hasRichParagraphBoundary)
            return void 0;
          const text = normalize(readableText(el));
          if (!text)
            return void 0;
          const axNode = axNodeForElementRole(el, role);
          const axChildren = axChildNodes(axNode).filter((child) => !child.ignored);
          if (!axChildren.length)
            return void 0;
          const fragments = [];
          let hasAxRichBoundary = false;
          function visitAxCellText(current) {
            const currentRole = normalizedAxRole(current.role);
            if (currentRole === "statictext") {
              const fragment = normalize(current.name);
              if (fragment && /[\p{L}\p{N}£$€]/u.test(fragment)) {
                fragments.push(fragment);
              }
              return true;
            }
            if (!["paragraph", "strong", "emphasis", "generic"].includes(currentRole || "")) {
              return false;
            }
            if (["strong", "emphasis"].includes(currentRole || "")) {
              hasAxRichBoundary = true;
            }
            for (const child of axChildNodes(current).filter((child2) => !child2.ignored)) {
              if (!visitAxCellText(child))
                return false;
            }
            return true;
          }
          if (axChildren.some((child) => !visitAxCellText(child)))
            return void 0;
          if (fragments.length < 2)
            return void 0;
          if (!hasAxRichBoundary)
            return void 0;
          if (!fragmentsAppearInTextOrder(fragments, text))
            return void 0;
          if (!fragments.some((fragment) => isScalarInlineBoundaryText(fragment))) {
            return void 0;
          }
          return fragments;
        }
        function axLineBreakTextFragments(el, role) {
          if (!["paragraph", "text"].includes(role))
            return void 0;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.closest(interactiveSelector) || el.querySelector(interactiveSelector))
            return void 0;
          const tag = el.tagName?.toLowerCase();
          if (!["span", "small", "p", "figcaption"].includes(tag))
            return void 0;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (!visibleChildren.length || visibleChildren.some((child) => child.tagName?.toLowerCase() !== "br")) {
            return void 0;
          }
          const text = normalize(readableText(el) || el.textContent);
          if (!text)
            return void 0;
          const axNode = axNodeAnyForElement(el);
          const axChildren = axChildNodes(axNode);
          if (axChildren.length < 3)
            return void 0;
          if (!axChildren.some((child) => normalizedAxRole(child.role) === "linebreak")) {
            return void 0;
          }
          if (axChildren.some((child) => {
            const role2 = normalizedAxRole(child.role);
            return role2 !== "statictext" && role2 !== "linebreak";
          })) {
            return void 0;
          }
          const fragments = axChildren.filter((child) => normalizedAxRole(child.role) === "statictext").map((child) => normalize(child.name)).filter((fragment) => Boolean(fragment && /[\p{L}\p{N}$£€]/u.test(fragment)));
          if (fragments.length < 2)
            return void 0;
          if (normalize(fragments.join(" ")) !== text)
            return void 0;
          return fragments;
        }
        function axAdjacentVersionTitleText(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (!accessibilityNodes.length)
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
            return void 0;
          }
          if (el.closest(interactiveSelector) || el.querySelector(interactiveSelector))
            return void 0;
          const tag = el.tagName?.toLowerCase();
          if (!["span", "div"].includes(tag))
            return void 0;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 2)
            return void 0;
          if (visibleChildren.some((child) => {
            const childTag = child.tagName?.toLowerCase();
            return childTag !== "span" || child.children?.length || !normalize(child.textContent);
          })) {
            return void 0;
          }
          const axNode = axNodeAnyForElement(el);
          if (!axNode || !axNode.ignored)
            return void 0;
          const fragments = visibleChildren.map((child) => normalize(child.textContent)).filter((fragment) => Boolean(fragment));
          if (!/^\d+(?:\.\d+)+$/u.test(fragments[0] || ""))
            return void 0;
          if (!/^[\p{L}][\p{L}\p{N} &-]{1,40}$/u.test(fragments[1] || ""))
            return void 0;
          return fragments.join(" ");
        }
        function visibleElementChildren(el) {
          return Array.from(el?.children || []).filter((child) => !isHidden(child));
        }
        function axAdjacentVersionTitleTextForFirstChild(el, role) {
          if (role !== "text")
            return void 0;
          const parent = el?.parentElement;
          if (!parent)
            return void 0;
          const children = visibleElementChildren(parent);
          if (children[0] !== el)
            return void 0;
          return axAdjacentVersionTitleText(parent);
        }
        function isTrailingAxAdjacentVersionTitleTextChild(el, role) {
          if (role !== "text")
            return false;
          const parent = el?.parentElement;
          if (!parent || !axAdjacentVersionTitleText(parent))
            return false;
          const children = visibleElementChildren(parent);
          return children.includes(el) && children[0] !== el;
        }
        function axDescendants(node) {
          if (!node?.childIds?.length)
            return [];
          const descendants = [];
          for (const childId of node.childIds) {
            const child = accessibilityNodeById.get(normalize(childId) || "");
            if (!child)
              continue;
            descendants.push(child);
            descendants.push(...axDescendants(child));
          }
          return descendants;
        }
        function axConfirmedNamedSectionFooterName(el) {
          if (!accessibilityNodes.length)
            return void 0;
          if (el?.tagName?.toLowerCase() !== "footer")
            return void 0;
          if (!hasSectioningHeaderFooterAncestor(el))
            return void 0;
          const axNode = axNodeForElementRole(el, "sectionfooter");
          const axName = normalize(axNode?.name);
          if (!axNode || !axName)
            return void 0;
          const domName = normalize(el.getAttribute("aria-label") || textFromIdRefs(el.getAttribute("aria-labelledby")) || readableText(el));
          return domName === axName ? axName : void 0;
        }
        function isDirectTextChildOfNamedSectionFooter(el) {
          if (!accessibilityNodes.length)
            return false;
          if (el?.tagName?.toLowerCase() !== "small")
            return false;
          const footer = el.parentElement;
          const sectionFooterName = axConfirmedNamedSectionFooterName(footer);
          if (!sectionFooterName)
            return false;
          if (normalize(readableText(el)) !== sectionFooterName)
            return false;
          const axNode = axNodeForElement(el);
          if (!axNode || normalizedAxRole(axNode.role) !== "generic")
            return false;
          const axChildren = axChildNodes(axNode);
          return axChildren.some((child) => normalizedAxRole(child.role) === "statictext" && normalize(child.name) === sectionFooterName);
        }
        function axGeneratedTrailingDisclosureButtonName(el, role, name) {
          if (role !== "button" || !name || !el?.hasAttribute?.("aria-expanded")) {
            return void 0;
          }
          const axNode = axNodeForElementRole(el, "button");
          const axName = normalize(axNode?.name);
          if (!axNode || !axName || !axName.startsWith(`${name} `))
            return void 0;
          const suffix = normalize(axName.slice(name.length));
          if (suffix !== "\u2013")
            return void 0;
          const domExpanded = parseBooleanAttribute(el, "aria-expanded");
          if (domExpanded !== void 0 && typeof axNode.properties?.expanded === "boolean" && axNode.properties.expanded !== domExpanded) {
            return void 0;
          }
          return axName;
        }
        function isAxConfirmedEmptyCollapsedOffscreenButton(el, role, name) {
          if (role !== "button")
            return false;
          if (parseBooleanAttribute(el, "aria-expanded") !== false)
            return false;
          if (!el.hasAttribute("aria-controls"))
            return false;
          if (normalize(name) || normalize(readableText(el)))
            return false;
          if (normalize(el.getAttribute("data-sr-rendered-position")) !== "offscreen") {
            return false;
          }
          const axNode = axNodeForElementRole(el, "button");
          if (!axNode || normalize(axNode.name))
            return false;
          return axNode.properties?.expanded === false;
        }
        function isAxConfirmedNativeCollapsedButtonWithHiddenControlledRegions(el, role, name) {
          if (role !== "button")
            return false;
          if (el?.tagName?.toLowerCase() !== "button")
            return false;
          if (parseBooleanAttribute(el, "aria-expanded") !== false)
            return false;
          if (normalizedPopup(el))
            return false;
          const buttonName = normalize(name || accessibleName(el, role));
          if (!buttonName)
            return false;
          const controls = normalize(el.getAttribute("aria-controls"));
          if (!controls)
            return false;
          const controlledRegions = controls.split(/\s+/).map((id) => resolveIdRef(id)).filter(Boolean);
          if (!controlledRegions.length)
            return false;
          if (controlledRegions.some((region) => !isHidden(region)))
            return false;
          if (controlledRegions.some((region) => !isRenderedDisplayHidden(region)))
            return false;
          const axNode = axNodeForElementRole(el, "button");
          if (!axNode || axNode.properties?.focusable !== true)
            return false;
          if (axNode.properties?.expanded !== false)
            return false;
          return normalize(axNode.name) === buttonName;
        }
        function isAxConfirmedCollapsedAnchorButtonWithoutGroup(el, role, name) {
          if (role !== "button")
            return false;
          if (el?.tagName?.toLowerCase() !== "a")
            return false;
          if (el.getAttribute("role") !== "button")
            return false;
          if (el.hasAttribute("href"))
            return false;
          if (parseBooleanAttribute(el, "aria-expanded") !== false)
            return false;
          if (normalizedPopup(el))
            return false;
          const axNode = axNodeForElementRole(el, "button");
          if (!axNode || axNode.properties?.expanded !== false)
            return false;
          const buttonName = normalize(axNode.name);
          if (!buttonName)
            return false;
          const descriptorName = normalize(name || accessibleName(el, role));
          if (descriptorName && descriptorName !== buttonName && !descriptorName.includes(buttonName)) {
            return false;
          }
          const children = Array.from(el.children || []);
          if (!children.length)
            return false;
          let hiddenTextChildCount = 0;
          for (const child of children) {
            if (isHidden(child)) {
              const childText = normalize(child.textContent);
              if (childText)
                hiddenTextChildCount += 1;
            }
          }
          return hiddenTextChildCount >= 1;
        }
        function axConfirmedNativeInputButtonName(el, role) {
          if (role !== "button")
            return void 0;
          if (el?.tagName?.toLowerCase() !== "input")
            return void 0;
          const type = (el.getAttribute("type") || "text").toLowerCase();
          if (!["button", "submit", "reset"].includes(type))
            return void 0;
          if (!el.closest?.("form"))
            return void 0;
          const value = normalize(el.getAttribute("value"));
          if (!value)
            return void 0;
          const axNode = axNodeForElementRole(el, "button");
          if (!axNode || axNode.properties?.focusable !== true)
            return void 0;
          return normalize(axNode.name) === value ? value : void 0;
        }
        function explicitAriaName(el) {
          return normalize(el.getAttribute?.("aria-label") || textFromIdRefs(el.getAttribute?.("aria-labelledby")));
        }
        function sameNameExceptEllipsis(left, right) {
          const normalizeEllipsis = (value) => normalize(value)?.replace(/\u2026/g, "...");
          const normalizedLeft = normalize(left);
          const normalizedRight = normalize(right);
          return Boolean(normalizedLeft && normalizedRight && normalizedLeft !== normalizedRight && normalizeEllipsis(normalizedLeft) === normalizeEllipsis(normalizedRight));
        }
        function visibleTextEllipsisButtonName(el, role) {
          if (role !== "button")
            return void 0;
          if (!explicitAriaName(el))
            return void 0;
          const visibleText = normalize(readableText(el) || el.getAttribute("placeholder"));
          const ariaName = explicitAriaName(el);
          if (!sameNameExceptEllipsis(visibleText, ariaName))
            return void 0;
          const axNode = axNodeForElementRole(el, "button");
          if (axNode && normalize(axNode.name) !== ariaName)
            return void 0;
          return visibleText;
        }
        function hasVisibleTextEllipsisButtonName(el, role) {
          return Boolean(visibleTextEllipsisButtonName(el, role));
        }
        function idRefsContain(refs, id) {
          const normalizedId = normalize(id);
          if (!normalizedId)
            return false;
          return (refs || "").split(/\s+/).some((ref) => normalize(ref) === normalizedId);
        }
        function renderedCaseName(el, role, name) {
          return cssRenderedCaseName(el, role, name) || axRenderedCaseName(el, role, name) || axRenderedDescendantTextCaseName(el, name);
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
        function isRenderedDisplayHidden(el) {
          const marker = renderedHiddenValue(el);
          if (marker && /\bdisplay\s*:\s*none\b/i.test(marker))
            return true;
          if (el?.hasAttribute?.("hidden"))
            return true;
          return safeComputedStyle(el)?.display === "none";
        }
        function isFocusableOpacityHiddenControl(el) {
          return Boolean(el?.matches?.(interactiveSelector)) && isOpacityHiddenOnly(el);
        }
        function directSummaryChild(details) {
          return Array.from(details?.children || []).find((child) => child.tagName?.toLowerCase() === "summary") || null;
        }
        function directNativeDetailsForSummary(el) {
          const details = el?.parentElement;
          if (el?.tagName?.toLowerCase() !== "summary")
            return null;
          if (details?.tagName?.toLowerCase() !== "details")
            return null;
          return directSummaryChild(details) === el ? details : null;
        }
        function isInsideClosedNativeDetailsBody(el) {
          for (let details = el?.closest?.("details"); details; details = details.parentElement?.closest?.("details")) {
            if (details === el || details.hasAttribute("open"))
              continue;
            const summary = directSummaryChild(details);
            if (!summary || el !== summary && !summary.contains(el)) {
              return true;
            }
          }
          return false;
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
          const hiddenAncestor = el.closest("[data-sr-computed-hidden]:not([data-sr-computed-hidden='false'])");
          if (el.closest("[aria-hidden='true']") || hiddenAncestor && hiddenAncestor !== el) {
            return true;
          }
          const style = safeComputedStyle(el);
          if (!style)
            return false;
          return style.display === "none" || style.visibility === "hidden";
        }
        function isGovukDesignSystemDocument() {
          const bodyText = document?.body?.textContent || "";
          return bodyText.includes("GOV.UK Design System") || Boolean(document?.querySelector?.("a[href*='design-system.service.gov.uk']"));
        }
        function isSerializedOffscreenCodeBoundary(el) {
          return Boolean(isGovukDesignSystemDocument() && el?.tagName?.toLowerCase?.() === "code" && el.getAttribute("data-sr-rendered-position") === "offscreen" && !el.getAttribute("data-sr-computed-hidden") && normalize(el.textContent));
        }
        function needsBoundary(left, right) {
          const leftChar = left.slice(-1);
          const rightChar = right[0];
          if (!leftChar || !rightChar)
            return false;
          if (/\s/.test(leftChar) || /\s/.test(rightChar))
            return false;
          if (rightChar === "." && /^\.[\p{L}\p{N}]/u.test(right))
            return true;
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
        function assignedSlotNodes(slot) {
          if (slot?.tagName?.toLowerCase() !== "slot")
            return [];
          const assignedNodes = typeof slot.assignedNodes === "function" ? slot.assignedNodes({ flatten: true }) : [];
          if (assignedNodes.length)
            return assignedNodes;
          const host = shadowContentHostByNode.get(slot);
          if (!host)
            return [];
          const slotName = slot.getAttribute("name") || "";
          const namedSlotChildren = Array.from(host.childNodes || []).filter((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
              return !slotName && Boolean(normalize(child.textContent));
            }
            if (child.nodeType !== Node.ELEMENT_NODE)
              return false;
            if (child.tagName?.toLowerCase() === "template" && child.getAttribute("shadowrootmode")) {
              return false;
            }
            return (child.getAttribute("slot") || "") === slotName;
          });
          if (namedSlotChildren.length || !slotName)
            return namedSlotChildren;
          const semanticSelectorBySlotName = {
            button: "button, [role='button']",
            link: "a[href], [role='link']"
          };
          const semanticSelector = semanticSelectorBySlotName[slotName.toLowerCase()];
          if (!semanticSelector)
            return [];
          return Array.from(host.children || []).filter((child) => {
            if (child.tagName?.toLowerCase() === "template" && child.getAttribute("shadowrootmode")) {
              return false;
            }
            if (child.hasAttribute("slot"))
              return false;
            if (isHidden(child))
              return false;
            return child.matches(semanticSelector);
          });
        }
        function assignedSlotChildren(slot) {
          return assignedSlotNodes(slot).filter((child) => child.nodeType === Node.ELEMENT_NODE);
        }
        function readableText(el, options2 = {}) {
          function collect(node) {
            if (!node)
              return "";
            if (node.nodeType === Node.TEXT_NODE)
              return node.textContent || "";
            if (node.nodeType !== Node.ELEMENT_NODE)
              return "";
            if (isHidden(node))
              return "";
            if (node.tagName?.toLowerCase() === "br")
              return " ";
            if (node.tagName?.toLowerCase() === "wbr") {
              return options2.preserveWbrBoundary ? " " : "";
            }
            if (node.tagName?.toLowerCase() === "slot") {
              return assignedSlotNodes(node).map((child) => collect(child)).filter(Boolean).join(" ");
            }
            if (node.tagName?.toLowerCase() === "q") {
              const quoteText = collectElementText(node);
              return quoteText ? `\u201C${quoteText}\u201D` : "''''";
            }
            let text = "";
            const shadowChildren = shadowContentChildren(node);
            const children = shadowChildren.length ? shadowChildren : Array.from(node.childNodes);
            for (const child of children) {
              const part = collect(child);
              if (!part)
                continue;
              if (text && needsBoundary(text, part))
                text += " ";
              text += part;
            }
            return text;
          }
          function collectElementText(node) {
            let text = "";
            const shadowChildren = shadowContentChildren(node);
            const children = shadowChildren.length ? shadowChildren : Array.from(node.childNodes);
            for (const child of children) {
              const part = collect(child);
              if (!part)
                continue;
              if (text && needsBoundary(text, part))
                text += " ";
              text += part;
            }
            return normalize(text) || "";
          }
          return normalize(collect(el))?.replace(/''''\s+/g, "''''");
        }
        function directOwnText(el) {
          return normalize(Array.from(el?.childNodes || []).filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent || "").join(" "));
        }
        function directLeadingText(el) {
          const fragments = [];
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
          const directMatch = document.getElementById(id);
          if (directMatch)
            return directMatch;
          try {
            return document.querySelector(`#${cssEscape(id)}`);
          } catch {
            return null;
          }
        }
        function textFromIdRefs(value) {
          if (!value)
            return void 0;
          return normalize(value.split(/\s+/).map((id) => normalize(resolveIdRef(id)?.textContent) || "").filter(Boolean).join(" "));
        }
        function controlNameFromIdRef(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return void 0;
          const tag = el.tagName?.toLowerCase();
          const role = normalize(el.getAttribute("role"))?.toLowerCase();
          if (!["input", "select", "textarea", "button"].includes(tag) && role !== "button") {
            return void 0;
          }
          return normalize(el.getAttribute("aria-label")) || textFromIdRefs(el.getAttribute("aria-labelledby")) || labelForControl(el) || readableText(el);
        }
        function textFromIdRefsOrControlNames(value) {
          if (!value)
            return void 0;
          return normalize(value.split(/\s+/).map((id) => {
            const ref = resolveIdRef(id);
            return normalize(ref?.textContent) || controlNameFromIdRef(ref) || "";
          }).filter(Boolean).join(" "));
        }
        function labelForControl(el) {
          function labelText(label2) {
            return normalize((normalize(label2.getAttribute("aria-label")) || textFromIdRefs(label2.getAttribute("aria-labelledby")) || textWithoutInteractive(label2) || readableText(label2))?.replace(/:\s*/g, ": "));
          }
          if ("labels" in el && el.labels?.length) {
            for (const label2 of Array.from(el.labels)) {
              const text = labelText(label2);
              if (text)
                return text;
            }
            return void 0;
          }
          const id = el.getAttribute("id");
          if (!id)
            return void 0;
          const label = document.querySelector(`label[for="${cssEscape(id)}"]`);
          return label ? labelText(label) : void 0;
        }
        function hasExplicitAriaName(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return false;
          return Boolean(normalize(el.getAttribute("aria-label")) || textFromIdRefs(el.getAttribute("aria-labelledby")));
        }
        function nativeLabelAlreadyAnnouncedByListItem(el, label) {
          if (!label || !el || el.nodeType !== Node.ELEMENT_NODE)
            return false;
          const listItem = el.closest("li,[role='listitem']");
          if (!isListItem(listItem) || !listItem.contains(el))
            return false;
          if (!positionInSet(listItem, "listitem") || !setSize(listItem, "listitem"))
            return false;
          const listItemText = textWithoutInteractive(listItem) || directLeadingText(listItem);
          return normalize(listItemText) === label;
        }
        function nativeValueControlLabelStopIsHidden(el) {
          const label = associatedLabelForControl(el);
          if (!label)
            return false;
          return Boolean(normalize(label.getAttribute("data-sr-computed-hidden")) || normalize(label.getAttribute("data-sr-rendered-position")) === "offscreen");
        }
        function associatedLabelForControl(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return void 0;
          if ("labels" in el && el.labels?.length) {
            return Array.from(el.labels).find((label) => !isHidden(label));
          }
          const id = el.getAttribute("id");
          if (!id)
            return void 0;
          const selector = `label[for="${cssEscape(id)}"]`;
          const root = typeof el.getRootNode === "function" ? el.getRootNode() : null;
          const rootLabel = Array.from(root?.querySelectorAll?.(selector) || []).find((label) => !isHidden(label));
          if (rootLabel)
            return rootLabel;
          return Array.from(document.querySelectorAll(selector)).find((label) => !isHidden(label));
        }
        function hasAssociatedLabelText(el) {
          const label = associatedLabelForControl(el);
          return Boolean(label && (textWithoutInteractive(label) || readableText(label)));
        }
        function isZeroPriceTextInFreeHeadingGroup(el, role) {
          if (role !== "text")
            return false;
          const text = normalize(readableText(el) || el.textContent);
          if (!text || !/^[£$€]\s*0(?:[.,]00)?$/u.test(text))
            return false;
          const headingGroup = el.closest("hgroup");
          if (!headingGroup || !headingGroup.contains(el))
            return false;
          const heading = Array.from(headingGroup.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading']")).find((candidate) => !isHidden(candidate));
          const headingText = normalize(heading ? readableText(heading) || heading.textContent : "");
          return Boolean(headingText && /\bfree\b/i.test(headingText));
        }
        function shouldSplitNativeControlLabelStop(el, role) {
          const tag = el?.tagName?.toLowerCase();
          if (!["input", "select", "textarea"].includes(tag))
            return false;
          if (!["textbox", "combobox"].includes(role))
            return false;
          if (tag === "input" && (el.getAttribute("type") || "text").toLowerCase() === "hidden") {
            return false;
          }
          if (el.getAttribute("aria-label"))
            return false;
          const form = el.closest("form");
          if (!form || !(form.getAttribute("aria-label") || form.getAttribute("aria-labelledby"))) {
            return false;
          }
          const label = associatedLabelForControl(el);
          if (!label)
            return false;
          const labelText = normalize(textWithoutInteractive(label) || readableText(label));
          if (!labelText)
            return false;
          const parent = el.parentElement;
          if (parent && compactInputActionGroupLabel(parent))
            return false;
          return true;
        }
        function shouldSplitCompositeNativeControlLabelStop(el, role) {
          const tag = el?.tagName?.toLowerCase();
          if (!["input", "select", "textarea"].includes(tag))
            return false;
          if (!["textbox", "combobox"].includes(role))
            return false;
          if (tag === "input" && (el.getAttribute("type") || "text").toLowerCase() === "hidden") {
            return false;
          }
          if (el.disabled || el.getAttribute("aria-hidden") === "true")
            return false;
          const label = associatedLabelForControl(el);
          const labelText = directAssociatedLabelText(el);
          if (!label || !labelText)
            return false;
          const parent = el.parentElement;
          if (!parent || label.nextElementSibling !== parent)
            return false;
          if (compactInputActionGroupLabel(parent))
            return false;
          const hasSiblingControl = Array.from(parent.children || []).some((child) => {
            if (child === el || isHidden(child))
              return false;
            return child.matches?.("button, [role='button'], a[href], [role='link']");
          });
          if (!hasSiblingControl)
            return false;
          return Boolean(el.readOnly || el.getAttribute("aria-readonly") === "true" || normalize(el.getAttribute("tabindex")) === "-1");
        }
        function readonlyOverlayTextControl(el, role) {
          if (role !== "textbox")
            return false;
          if (el?.tagName?.toLowerCase() !== "input")
            return false;
          const type = (el.getAttribute("type") || "text").toLowerCase();
          if (type !== "text" && type !== "search")
            return false;
          if (!el.readOnly && el.getAttribute("aria-readonly") !== "true")
            return false;
          if (!shouldSplitCompositeNativeControlLabelStop(el, role))
            return false;
          return Boolean(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"));
        }
        function isCompositeNativeControlLabel(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName?.toLowerCase() !== "label")
            return false;
          const controlId = normalize(el.getAttribute("for"));
          if (!controlId)
            return false;
          const root = typeof el.getRootNode === "function" ? el.getRootNode() : null;
          const control = root?.getElementById?.(controlId) || root?.querySelector?.(`#${cssEscape(controlId)}`) || resolveIdRef(controlId);
          if (!control || associatedLabelForControl(control) !== el)
            return false;
          const role = implicitRole(control);
          return shouldSplitCompositeNativeControlLabelStop(control, role);
        }
        function shouldSplitDirectVisibleTextInputLabelStop(el, role) {
          if (role !== "textbox")
            return false;
          if (el?.tagName?.toLowerCase() !== "input")
            return false;
          if ((el.getAttribute("type") || "text").toLowerCase() !== "text")
            return false;
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
            return false;
          if (el.disabled || el.getAttribute("aria-hidden") === "true")
            return false;
          const label = associatedLabelForControl(el);
          if (!label || label.tagName?.toLowerCase() !== "label" || isHidden(label))
            return false;
          if (el.hasAttribute("list") && !nativeDatalistElement(el) && el.previousElementSibling === label) {
            const labelText2 = normalize(textWithoutInteractive(label) || readableText(label));
            const controlName2 = accessibleName(el, role);
            return Boolean(labelText2 && controlName2 === labelText2);
          }
          if (label.parentElement !== el.parentElement || el.previousElementSibling !== label) {
            return false;
          }
          const parent = el.parentElement;
          if (!parent || compactInputActionGroupLabel(parent))
            return false;
          const visibleChildren = Array.from(parent.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 2 || visibleChildren[0] !== label || visibleChildren[1] !== el) {
            return false;
          }
          const labelText = normalize(textWithoutInteractive(label) || readableText(label));
          const controlName = accessibleName(el, role);
          if (!labelText || controlName !== labelText)
            return false;
          if (accessibilityNodes.length) {
            const labelNode = axNodeForElementRole(label, "labeltext");
            const inputNode = axNodeForElementRole(el, "textbox");
            if (!labelNode || !inputNode)
              return false;
            const staticText = (labelNode.childIds || []).map((id) => accessibilityNodeById.get(normalize(id) || "")).find((node) => normalizedAxRole(node?.role) === "statictext");
            if (normalize(staticText?.name) !== labelText)
              return false;
            if (normalize(inputNode.name) !== labelText || inputNode.properties?.focusable !== true) {
              return false;
            }
          }
          return true;
        }
        function shouldSplitVisibleRequiredPasswordLabelStop(el, role) {
          if (role !== "textbox")
            return false;
          if (el?.tagName?.toLowerCase() !== "input")
            return false;
          if ((el.getAttribute("type") || "text").toLowerCase() !== "password")
            return false;
          if (!el.required && !el.hasAttribute("required") && el.getAttribute("aria-required") !== "true") {
            return false;
          }
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
            return false;
          if (el.disabled || el.getAttribute("aria-hidden") === "true")
            return false;
          const label = associatedLabelForControl(el);
          if (!label || label.tagName?.toLowerCase() !== "label" || isHidden(label))
            return false;
          const labelText = normalize(textWithoutInteractive(label) || readableText(label));
          if (!labelText || accessibleName(el, role) !== labelText)
            return false;
          const parent = el.parentElement;
          if (!parent || compactInputActionGroupLabel(parent))
            return false;
          if (label.parentElement !== parent || label.nextElementSibling !== el)
            return false;
          if (accessibilityNodes.length) {
            const inputNode = axNodeForElementRole(el, "textbox");
            if (!inputNode)
              return false;
            if (normalize(inputNode.name) !== labelText || inputNode.properties?.focusable !== true) {
              return false;
            }
          }
          return true;
        }
        function isNamedSingleControlForm(form) {
          if (!form || form.nodeType !== Node.ELEMENT_NODE || isHidden(form))
            return false;
          const tag = form.tagName?.toLowerCase();
          const role = normalize(form.getAttribute?.("role"))?.toLowerCase();
          if (tag !== "form" && role !== "form")
            return false;
          if (!(form.getAttribute("aria-label") || form.getAttribute("aria-labelledby")))
            return false;
          const controls = Array.from(form.querySelectorAll("input:not([type='hidden']), textarea, select, button, [role='button'], [role='combobox'], [role='searchbox'], [role='textbox']")).filter((control) => !isHidden(control));
          const textControls = controls.filter((control) => {
            const tag2 = control.tagName?.toLowerCase();
            const controlRole = implicitRole(control);
            if (tag2 === "textarea")
              return true;
            if (["combobox", "searchbox", "textbox"].includes(controlRole))
              return true;
            if (tag2 !== "input")
              return false;
            const type = (control.getAttribute("type") || "text").toLowerCase();
            return ["email", "search", "text"].includes(type);
          });
          if (textControls.length !== 1)
            return false;
          const submitControls = controls.filter((control) => {
            if (textControls.includes(control))
              return false;
            const tag2 = control.tagName?.toLowerCase();
            const controlRole = implicitRole(control);
            if (tag2 === "button" || controlRole === "button")
              return true;
            if (tag2 !== "input")
              return false;
            return ["button", "submit", "reset"].includes((control.getAttribute("type") || "text").toLowerCase());
          });
          return submitControls.length === 1;
        }
        function isNamedNativeForm(form) {
          if (!form || form.nodeType !== Node.ELEMENT_NODE || isHidden(form))
            return false;
          if (form.tagName?.toLowerCase() !== "form")
            return false;
          if (!closestCustomElement(form))
            return false;
          return Boolean(form.getAttribute("aria-label") || form.getAttribute("aria-labelledby"));
        }
        function shouldSplitNamedSingleControlFormInput(el, role) {
          if (!["combobox", "searchbox", "textbox"].includes(role))
            return false;
          if (el?.tagName?.toLowerCase() !== "input")
            return false;
          if (!isNamedSingleControlForm(el.closest?.("form,[role='form']")))
            return false;
          const label = associatedLabelForControl(el);
          return Boolean(label && normalize(textWithoutInteractive(label) || readableText(label)));
        }
        function isControlledTablistTab(el, role = implicitRole(el)) {
          if (role !== "tab")
            return false;
          const tablist = el.closest?.("[role='tablist']");
          if (!tablist || isHidden(tablist))
            return false;
          if (!tablist.hasAttribute("aria-controls"))
            return false;
          const controlled = resolveIdRef(tablist.getAttribute("aria-controls"));
          if (!controlled || isHidden(controlled))
            return false;
          const tabs = Array.from(tablist.querySelectorAll("[role='tab']")).filter((tab) => !isHidden(tab));
          if (tabs.length < 2 || !tabs.includes(el))
            return false;
          return tabs.every((tab) => !tab.hasAttribute("aria-selected"));
        }
        function isLabelledAriaTabGroup(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.getAttribute("role") !== "tablist")
            return false;
          const name = accessibleName(el, "group");
          if (!name)
            return false;
          const tabs = Array.from(el.querySelectorAll("[role='tab']")).filter((tab) => !isHidden(tab) && tab.closest("[role='tablist']") === el);
          if (tabs.length < 2)
            return false;
          if (accessibilityNodes.length) {
            const axNode = axNodeForElementRole(el, "tablist");
            if (!axNode || normalize(axNode.name) !== name)
              return false;
          }
          return true;
        }
        function isControlledTablistDescriptionRegion(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName?.toLowerCase() !== "p")
            return false;
          if (el.getAttribute("role") !== "region")
            return false;
          if (!el.id || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
            return false;
          if (!readableText(el) || el.querySelector(interactiveSelector))
            return false;
          const tablist = document.querySelector(`[role='tablist'][aria-controls='${cssEscape(el.id)}']`);
          if (!tablist || isHidden(tablist))
            return false;
          const tabs = Array.from(tablist.querySelectorAll("[role='tab']")).filter((tab) => !isHidden(tab));
          return tabs.length >= 2;
        }
        function directVisibleTextInputLabelHintSequence(wrapper) {
          if (!wrapper || wrapper.nodeType !== Node.ELEMENT_NODE || isHidden(wrapper)) {
            return void 0;
          }
          if (compactInputActionGroupLabel(wrapper))
            return void 0;
          const visibleChildren = Array.from(wrapper.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 3)
            return void 0;
          const [label, hint, input] = visibleChildren;
          if (label?.tagName?.toLowerCase() !== "label")
            return void 0;
          if (input?.tagName?.toLowerCase() !== "input")
            return void 0;
          if ((input.getAttribute("type") || "text").toLowerCase() !== "text") {
            return void 0;
          }
          if (input.disabled || input.getAttribute("aria-hidden") === "true")
            return void 0;
          if (input.getAttribute("aria-label") || input.getAttribute("aria-labelledby")) {
            return void 0;
          }
          if ("value" in input && input.value)
            return void 0;
          if (normalize(input.getAttribute("placeholder")))
            return void 0;
          const describedBy = normalize(input.getAttribute("aria-describedby"));
          if (!describedBy || hint.getAttribute("aria-hidden") === "true")
            return void 0;
          const describedIds = describedBy.split(/\s+/).filter(Boolean);
          if (!hint.id || !describedIds.includes(hint.id))
            return void 0;
          if (associatedLabelForControl(input) !== label)
            return void 0;
          if (hint.querySelector(interactiveSelector))
            return void 0;
          const labelText = normalize(textWithoutInteractive(label) || readableText(label));
          const hintText = normalize(textWithoutInteractive(hint) || readableText(hint));
          if (!labelText || !hintText)
            return void 0;
          if (accessibleName(input, "textbox") !== labelText)
            return void 0;
          if (textFromIdRefs(input.getAttribute("aria-describedby")) !== hintText) {
            return void 0;
          }
          if (accessibilityNodes.length) {
            const inputNode = axNodeForElementRole(input, "textbox");
            if (!inputNode)
              return void 0;
            if (normalize(inputNode.name) !== labelText)
              return void 0;
            if (normalize(inputNode.description) !== hintText)
              return void 0;
            if (inputNode.properties?.focusable !== true)
              return void 0;
          }
          return {
            label,
            hint,
            input,
            labelText,
            hintText,
            inputAnnouncement: normalize(`${labelText} ${hintText}, edit text`) || ""
          };
        }
        function directVisibleAriaLabelledTextInputDescriptionSequence(wrapper) {
          if (!wrapper || wrapper.nodeType !== Node.ELEMENT_NODE || isHidden(wrapper)) {
            return void 0;
          }
          if (compactInputActionGroupLabel(wrapper))
            return void 0;
          const visibleChildren = Array.from(wrapper.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 3)
            return void 0;
          const [description, label, inputWrapper] = visibleChildren;
          if (label?.tagName?.toLowerCase() !== "label")
            return void 0;
          if (description?.matches?.(interactiveSelector))
            return void 0;
          if (description?.querySelector?.(interactiveSelector))
            return void 0;
          if (normalize(description.getAttribute?.("role")))
            return void 0;
          if (!description.id || !description.hasAttribute("aria-live"))
            return void 0;
          const wrapperChildren = Array.from(inputWrapper?.children || []).filter((child) => !isHidden(child));
          if (wrapperChildren.length !== 1)
            return void 0;
          const input = wrapperChildren[0];
          if (input?.tagName?.toLowerCase() !== "input")
            return void 0;
          if ((input.getAttribute("type") || "text").toLowerCase() !== "text")
            return void 0;
          if (input.disabled || input.getAttribute("aria-hidden") === "true")
            return void 0;
          if (input.getAttribute("aria-labelledby"))
            return void 0;
          const ariaLabel = normalize(input.getAttribute("aria-label"));
          if (!ariaLabel)
            return void 0;
          if ("value" in input && input.value)
            return void 0;
          const describedBy = normalize(input.getAttribute("aria-describedby"));
          if (!describedBy)
            return void 0;
          const describedIds = describedBy.split(/\s+/).filter(Boolean);
          if (!describedIds.includes(description.id))
            return void 0;
          const descriptionText = normalize(textWithoutInteractive(description) || readableText(description));
          const labelText = normalize(textWithoutInteractive(label) || readableText(label));
          if (!descriptionText || !labelText || descriptionText !== labelText)
            return void 0;
          if (accessibilityNodes.length) {
            const inputNode = axNodeForElementRole(input, "textbox");
            if (!inputNode)
              return void 0;
            if (normalize(inputNode.name) !== ariaLabel)
              return void 0;
            if (normalize(inputNode.description) !== labelText)
              return void 0;
            if (inputNode.properties?.focusable !== true)
              return void 0;
          } else {
            return void 0;
          }
          return {
            description,
            label,
            input,
            descriptionText,
            labelText,
            inputAnnouncement: normalize(`${ariaLabel} ${labelText}, edit text`) || ""
          };
        }
        function textboxShouldPlacePlaceholderBeforeRole(el, stateEl, role, name, value) {
          if (role !== "textbox")
            return false;
          if (el?.tagName?.toLowerCase() !== "input")
            return false;
          if ((el.getAttribute("type") || "text").toLowerCase() !== "text")
            return false;
          if (value)
            return false;
          const placeholder = normalize(stateEl?.getAttribute?.("placeholder"));
          if (!placeholder || placeholder === name)
            return false;
          return hasAssociatedLabelText(el);
        }
        function isAxConfirmedPlaceholderOnlyTextboxName(el, stateEl, role, name, value) {
          if (role !== "textbox")
            return false;
          if (el?.tagName?.toLowerCase() !== "input")
            return false;
          const type = (el.getAttribute("type") || "text").toLowerCase();
          if (type !== "text" && type !== "search")
            return false;
          if (value)
            return false;
          if (name || hasAssociatedLabelText(el))
            return false;
          if (normalize(el.getAttribute("aria-label")) || normalize(el.getAttribute("aria-labelledby")) || normalize(el.getAttribute("title")) || normalize(el.getAttribute("aria-describedby")) || stateEl.required || stateEl.getAttribute("aria-required") === "true" || stateEl.getAttribute("aria-invalid") && stateEl.getAttribute("aria-invalid") !== "false") {
            return false;
          }
          const placeholder = normalize(stateEl?.getAttribute?.("placeholder"));
          if (!placeholder)
            return false;
          const axNode = axNodeForElementRole(el, "textbox");
          return Boolean(axNode && axNode.properties?.focusable === true && normalize(axNode.name) === placeholder);
        }
        function nativeSearchFormTextInputContract(el, role) {
          if (role !== "textbox" && role !== "searchbox")
            return false;
          if (el?.tagName?.toLowerCase() !== "input")
            return false;
          const type = (el.getAttribute("type") || "text").toLowerCase();
          if (type !== "text" && type !== "search")
            return false;
          const placeholder = normalize(el.getAttribute("placeholder"));
          if (!placeholder)
            return false;
          const label = associatedLabelForControl(el);
          if (!label)
            return false;
          const labelText = normalize(textWithoutInteractive(label) || readableText(label));
          if (!labelText || !placeholder.toLowerCase().includes(labelText.toLowerCase())) {
            return false;
          }
          const form = el.closest?.("form");
          if (!form)
            return false;
          const textControls = Array.from(form.querySelectorAll("input:not([type='hidden']), textarea, [role='textbox'], [role='searchbox']")).filter((control) => {
            if (isHidden(control))
              return false;
            const controlTag = control.tagName?.toLowerCase();
            if (controlTag === "textarea")
              return true;
            if (control.getAttribute?.("role") === "textbox" || control.getAttribute?.("role") === "searchbox") {
              return true;
            }
            if (controlTag !== "input")
              return false;
            const controlType = (control.getAttribute("type") || "text").toLowerCase();
            return controlType === "text" || controlType === "search";
          });
          if (textControls.length !== 1 || textControls[0] !== el)
            return false;
          const submitControls = Array.from(form.querySelectorAll("input[type='submit'], input[type='button'], input[type='reset'], button:not([type]), button[type='submit'], button[type='button'], button[type='reset'], [role='button']")).filter((control) => !isHidden(control));
          if (submitControls.length !== 1)
            return false;
          const submitName = axConfirmedNativeInputButtonName(submitControls[0], "button") || accessibleName(submitControls[0], "button") || normalize(submitControls[0].getAttribute("value") || submitControls[0].getAttribute("name"));
          if (submitName !== labelText)
            return false;
          let axName;
          if (accessibilityNodes.length) {
            const inputNode = axNodeForElementRole(el, role === "searchbox" ? "searchbox" : "textbox");
            axName = normalize(inputNode?.name);
            const duplicatedLabelName = normalize(`${labelText} ${labelText}`);
            if (!inputNode || inputNode.properties?.focusable !== true || !axName || ![labelText, placeholder, duplicatedLabelName].includes(axName)) {
              return false;
            }
          }
          return { labelText, placeholder, axName };
        }
        function isAxConfirmedNativeSearchFormTextInput(el, role) {
          return Boolean(nativeSearchFormTextInputContract(el, role));
        }
        function isNativeSearchFormLabelStopInput(el, role) {
          if (role !== "searchbox")
            return false;
          if (el?.tagName?.toLowerCase() !== "input")
            return false;
          if ((el.getAttribute("type") || "text").toLowerCase() !== "search")
            return false;
          const label = associatedLabelForControl(el);
          if (!label)
            return false;
          const labelText = normalize(textWithoutInteractive(label) || readableText(label));
          if (!labelText)
            return false;
          const searchContext = el.closest?.("form[role='search'], search, [role='search']");
          if (!searchContext)
            return false;
          const selectControls = Array.from(searchContext.querySelectorAll("select")).filter((control) => !isHidden(control));
          if (selectControls.length)
            return false;
          const textControls = Array.from(searchContext.querySelectorAll("input:not([type='hidden']), textarea, [role='textbox'], [role='searchbox'], [role='combobox']")).filter((control) => !isHidden(control));
          if (textControls.length !== 1 || textControls[0] !== el)
            return false;
          return true;
        }
        function isAutocompleteGridPopupLabelStopInput(el, role) {
          if (role !== "combobox" && role !== "searchbox")
            return false;
          if (el?.tagName?.toLowerCase() !== "input")
            return false;
          if (normalize(el.getAttribute("aria-autocomplete")) !== "list")
            return false;
          if (el.getAttribute("aria-expanded") !== "true")
            return false;
          if (normalizedPopup(el) !== "grid")
            return false;
          return hasAssociatedLabelText(el);
        }
        function isAxConfirmedNativeSearchFormLabel(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName?.toLowerCase() !== "label")
            return false;
          const controlId = normalize(el.getAttribute("for"));
          if (!controlId)
            return false;
          const control = resolveIdRef(controlId);
          if (!control || associatedLabelForControl(control) !== el)
            return false;
          const role = implicitRole(control);
          return isAxConfirmedNativeSearchFormTextInput(control, role);
        }
        function directAssociatedLabelText(el) {
          const label = associatedLabelForControl(el);
          if (!label || isHidden(label))
            return void 0;
          const labelText = normalize(textWithoutInteractive(label) || readableText(label));
          if (!labelText)
            return void 0;
          const parent = el.parentElement;
          if (label.parentElement === parent && label.nextElementSibling === el) {
            return labelText;
          }
          if (parent && label.parentElement === parent.parentElement && label.nextElementSibling === parent) {
            return labelText;
          }
          if (label.nextElementSibling === parent)
            return labelText;
          return void 0;
        }
        function axConfirmedNativeControlLabelStopText(el, role) {
          const tag = el?.tagName?.toLowerCase();
          if (!["input", "select", "textarea"].includes(tag))
            return void 0;
          if (!["textbox", "combobox"].includes(role))
            return void 0;
          if (tag === "input" && (el.getAttribute("type") || "text").toLowerCase() === "hidden") {
            return void 0;
          }
          if (el.disabled || el.getAttribute("aria-hidden") === "true")
            return void 0;
          const labelText = directAssociatedLabelText(el);
          if (!labelText)
            return void 0;
          const axNode = axNodeForElementRole(el, role);
          const axName = normalize(axNode?.name);
          if (!axNode || axNode.properties?.focusable !== true || !axName)
            return void 0;
          const ariaLabel = normalize(el.getAttribute("aria-label"));
          if (axName !== labelText && (!ariaLabel || axName !== ariaLabel))
            return void 0;
          return labelText;
        }
        function axConfirmedNativeButtonLabelStopText(el, role, name) {
          if (role !== "button" || el?.tagName?.toLowerCase() !== "button")
            return void 0;
          if (parseBooleanAttribute(el, "aria-expanded") !== false)
            return void 0;
          if (normalizedPopup(el))
            return void 0;
          if (el.disabled || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") {
            return void 0;
          }
          const label = previousVisibleElementSibling(el);
          if (!label || label.tagName?.toLowerCase() !== "label")
            return void 0;
          if (label.parentElement !== el.parentElement)
            return void 0;
          const labelText = normalize(textWithoutInteractive(label) || readableText(label));
          const buttonName = normalize(name || accessibleName(el, role));
          if (!labelText || !buttonName || labelText === buttonName)
            return void 0;
          const ariaLabel = normalize(el.getAttribute("aria-label"));
          if (!ariaLabel || ariaLabel !== buttonName)
            return void 0;
          if (!accessibilityNodes.length)
            return void 0;
          const labelNode = axNodeForElementRole(label, "labeltext");
          const buttonNode = axNodeForElementRole(el, "button");
          if (!labelNode || !buttonNode)
            return void 0;
          if (normalize(buttonNode.name) !== buttonName || buttonNode.properties?.focusable !== true) {
            return void 0;
          }
          if (buttonNode.properties?.expanded !== false)
            return void 0;
          const labelHasMatchingStaticText = axChildNodes(labelNode).some((child) => normalizedAxRole(child.role) === "statictext" && normalize(child.name) === labelText);
          return labelHasMatchingStaticText ? labelText : void 0;
        }
        function axConfirmedNativeSelectLabelName(el, role, label) {
          if (role !== "combobox" || el?.tagName?.toLowerCase() !== "select")
            return void 0;
          const labelText = normalize(label);
          if (!labelText)
            return void 0;
          const axNode = axNodeForElementRole(el, "combobox");
          if (!axNode || axNode.properties?.focusable !== true)
            return void 0;
          const axName = normalize(axNode.name);
          return axName === labelText ? axName : void 0;
        }
        function axConfirmedLabelledTabPanelName(el, role, label) {
          if (role !== "tabpanel" || !label || !el.hasAttribute("aria-labelledby"))
            return void 0;
          const ids = normalize(el.getAttribute("aria-labelledby"))?.split(/\s+/).filter(Boolean) || [];
          if (ids.length !== 1)
            return void 0;
          const controller = resolveIdRef(ids[0]);
          if (!controller || isHidden(controller))
            return void 0;
          const controllerRole = implicitRole(controller);
          if (controllerRole !== "tab" && controllerRole !== "button")
            return void 0;
          const controllerAriaLabel = normalize(controller.getAttribute("aria-label"));
          if (!controllerAriaLabel)
            return void 0;
          const panelNode = axNodeForElementRole(el, "tabpanel");
          const axName = normalize(panelNode?.name);
          if (!axName || axName !== controllerAriaLabel || axName === label)
            return void 0;
          return axName;
        }
        function descendantElementsAcrossShadow(el) {
          const descendants = [];
          const visit = (node) => {
            if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            descendants.push(node);
            for (const child of walkChildren(node))
              visit(child);
          };
          for (const child of walkChildren(el))
            visit(child);
          return descendants;
        }
        function isSingleLabeledTextInputWrapper(el, role) {
          if (role !== "group")
            return false;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.matches(interactiveSelector))
            return false;
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
            return false;
          if (directOwnText(el))
            return false;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          const hasShadowInputHostShape = hasShadowRootContent(el) || visibleChildren.length === 1 && isCustomElement(visibleChildren[0]) && hasShadowRootContent(visibleChildren[0]);
          if (!hasShadowInputHostShape)
            return false;
          const descendants = descendantElementsAcrossShadow(el);
          const textboxes = descendants.filter((descendant) => {
            if (implicitRole(descendant) !== "textbox")
              return false;
            if (descendant.tagName?.toLowerCase() !== "input")
              return false;
            return (descendant.getAttribute("type") || "text").toLowerCase() === "text";
          });
          if (textboxes.length !== 1)
            return false;
          const textbox = textboxes[0];
          if (!hasAssociatedLabelText(textbox))
            return false;
          const controls = descendants.filter((descendant) => descendant.matches?.(interactiveSelector));
          return controls.every((control) => {
            if (control === textbox)
              return true;
            return implicitRole(control) === "button";
          });
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
          if (isNativeSearchControlWrapper(el, control))
            return void 0;
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
        function isNativeSearchControlWrapper(el, control) {
          if (control?.tagName?.toLowerCase() !== "input")
            return false;
          if ((control.getAttribute("type") || "text").toLowerCase() !== "search")
            return false;
          return Boolean(el.closest("form[role='search'], search, [role='search']"));
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
          if (visualButtons.length >= 3 && visualButtons.includes(el)) {
            if (isMediaPlayerControlRow(parent)) {
              return visualButtons[0] === el;
            }
            return true;
          }
          return visualButtons.includes(el) && Array.from(parent.children || []).some((sibling) => sibling !== el && isButtonShellClusterGroup(sibling));
        }
        function isMediaPlayerControlRow(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          const region = el.closest?.("[role='region']");
          if (normalize(region?.getAttribute?.("aria-label"))?.toLowerCase() !== "media player") {
            return false;
          }
          return Boolean(el.querySelector?.("[role='slider'][aria-label], select[aria-label], button[aria-keyshortcuts]"));
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
        function nestedImageLabelContributesToName(el, name) {
          const normalizedName = normalize(name)?.toLowerCase();
          if (!normalizedName)
            return false;
          const nameTokens = new Set(accessibleNameMatchTokens(normalizedName));
          return nestedImageLabels(el).some((label) => {
            const normalizedLabel = normalize(label)?.toLowerCase();
            if (!normalizedLabel)
              return false;
            if (normalizedName.includes(normalizedLabel))
              return true;
            const labelTokens = accessibleNameMatchTokens(normalizedLabel).filter((token) => !genericImageNameTokens.has(token));
            if (labelTokens.length < 2)
              return false;
            return labelTokens.slice(0, 2).every((token) => nameTokens.has(token));
          });
        }
        const genericImageNameTokens = /* @__PURE__ */ new Set([
          "colour",
          "color",
          "dark",
          "icon",
          "image",
          "logo",
          "negative"
        ]);
        function accessibleNameMatchTokens(value) {
          return value.split(/[^\p{L}\p{N}]+/u).map((token) => token.trim()).filter(Boolean);
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
        function embeddedControlContentName(el, options2 = {}) {
          if (!nestedImageLabels(el).length && !linkSharesListWithImageCardLinks(el)) {
            return readableText(el, options2);
          }
          const fragments = embeddedControlLabelFragments(el);
          return fragments.length ? normalize(fragments.join(" ")) : readableText(el, options2);
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
          return embeddedControlContentName(el, { preserveWbrBoundary: true });
        }
        function comparableLinkedCardText(value) {
          return normalize(value)?.replace(/\s+([.,;:!?])/g, "$1").replace(/([.,;:!?])\s+/g, "$1").toLocaleLowerCase("en-US");
        }
        function postPunctuationWhitespaceCollapsedText(value) {
          return normalize(value)?.replace(/([.!?])\s+(?=[\p{L}\p{N}])/gu, "$1");
        }
        function finalPostPunctuationWhitespaceCollapsedText(value) {
          return normalize(value)?.replace(/([.!?])\s+(?=[\p{L}\p{N}][^.!?]*$)/u, "$1");
        }
        function shouldCollapseLinkedListCardPostPunctuationWhitespace(el, role, name) {
          if (role !== "link" || !name)
            return false;
          if (!el?.closest?.("li,[role='listitem']"))
            return false;
          if (postPunctuationWhitespaceCollapsedText(name) === name)
            return false;
          if (!el.querySelector?.("p + div, p + span, p + p + div, p + p + span")) {
            return false;
          }
          const paragraphs = Array.from(el.querySelectorAll("p")).filter((paragraph) => !isHidden(paragraph) && readableText(paragraph));
          const lastParagraph = paragraphs[paragraphs.length - 1];
          const punctuationCount = readableText(lastParagraph)?.match(/[.!?]/gu)?.length || 0;
          return punctuationCount >= 2;
        }
        function descendantLinkCardHeading(el) {
          return Array.from(el?.querySelectorAll?.("h1, h2, h3, h4, h5, h6, [role='heading']") || []).find((candidate) => !isHidden(candidate) && Boolean(readableText(candidate)));
        }
        function axLinkedCardMediaGroupName(el, axNode, axName, heading, headingText, contentName) {
          const group = Array.from(el?.querySelectorAll?.("[role='group']") || []).find((candidate) => {
            if (isHidden(candidate))
              return false;
            const groupName2 = normalize(accessibleName(candidate, "group"));
            if (!groupName2)
              return false;
            if (!nestedImageLabels(candidate).length)
              return false;
            return Boolean(candidate.compareDocumentPosition(heading) & candidate.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
          });
          if (!group)
            return void 0;
          const groupName = normalize(accessibleName(group, "group"));
          if (!groupName)
            return void 0;
          const imageLabel = nestedImageLabel(group);
          if (!imageLabel || !contentName.startsWith(`${imageLabel} ${headingText}`)) {
            return void 0;
          }
          if (!axName.startsWith(`${groupName} ${headingText}`))
            return void 0;
          const axDescendantNodes = axDescendants(axNode);
          const hasAxGroup = axDescendantNodes.some((node) => normalizedAxRole(node.role) === "group" && normalize(node.name) === groupName);
          const hasAxHeading = axDescendantNodes.some((node) => normalizedAxRole(node.role) === "heading" && normalize(node.name) === headingText);
          return hasAxGroup && hasAxHeading ? groupName : void 0;
        }
        function axLinkedCardContentName(el, role, contentName) {
          if (role !== "link" || !contentName)
            return void 0;
          if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby"))
            return void 0;
          if (!hasLabelledLinkedCardRegionContext(el))
            return void 0;
          const axNode = axNodeForElementRole(el, "link");
          const axName = normalize(axNode?.name);
          if (!axName || axName === contentName)
            return void 0;
          if (axNode?.properties?.focusable !== true)
            return void 0;
          const heading = descendantLinkCardHeading(el);
          const headingText = normalize(readableText(heading));
          if (!headingText)
            return void 0;
          if (axLinkedCardMediaGroupName(el, axNode, axName, heading, headingText, contentName)) {
            return axName;
          }
          if (!contentName.startsWith(headingText))
            return void 0;
          const bodyText = normalize(contentName.slice(headingText.length));
          if (comparableLinkedCardText(bodyText) !== comparableLinkedCardText(axName)) {
            return void 0;
          }
          if (postPunctuationWhitespaceCollapsedText(axName) === contentName) {
            return contentName;
          }
          return axName;
        }
        function axLabelBoundaryName(el, role, label) {
          if (!label || !el.hasAttribute("aria-labelledby"))
            return void 0;
          if (![
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
            return void 0;
          }
          const axNode = axNodeForElementRole(el, role);
          const axName = normalize(axNode?.name);
          if (!axName || axName === label)
            return void 0;
          return comparableLinkedCardText(axName) === comparableLinkedCardText(label) ? axName : void 0;
        }
        function hasLabelledLinkedCardRegionContext(el) {
          for (let current = el?.parentElement; current; current = current.parentElement) {
            const explicit = current.getAttribute("role");
            const tag = current.tagName?.toLowerCase();
            const role = explicit && explicit !== "none" && explicit !== "presentation" ? explicit : tag === "section" && current.hasAttribute("aria-labelledby") ? "region" : tag === "article" ? "article" : void 0;
            if (!role)
              continue;
            if (!["region", "article"].includes(role))
              continue;
            const labelledBy = current.getAttribute("aria-labelledby");
            const label = textFromIdRefs(labelledBy);
            if (!label)
              continue;
            const labelElement = labelledBy?.split(/\s+/).map((id) => resolveIdRef(id)).find(Boolean);
            if (!labelElement || !el.contains(labelElement))
              continue;
            const axNode = axNodeForElementRole(current, role);
            const axName = normalize(axNode?.name);
            if (!axName)
              continue;
            if (axLabelBoundaryName(current, role, label) || comparableLinkedCardText(axName) === comparableLinkedCardText(label)) {
              return true;
            }
          }
          return false;
        }
        function labelFromHttpUrl(url) {
          if (!["http:", "https:"].includes(url.protocol))
            return void 0;
          const segments = url.pathname.split("/").map((segment) => segment.trim()).filter(Boolean);
          const lastSegment = segments.at(-1);
          if (!lastSegment)
            return void 0;
          const decoded = decodeURIComponent(lastSegment).replace(/\.[a-z0-9]+$/i, "").replace(/_+/g, " ");
          const acronymWords = /* @__PURE__ */ new Set([
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
            "wcag"
          ]);
          return normalize(decoded.split(/\s+/).map((word) => {
            if (word.includes("-"))
              return word;
            const lower = word.toLowerCase();
            if (acronymWords.has(lower))
              return lower.toUpperCase();
            return word;
          }).join(" "));
        }
        function hrefSlugLabel(el) {
          if (el?.tagName?.toLowerCase() !== "a")
            return void 0;
          const href = normalize(el.getAttribute("href"));
          if (!href || href.startsWith("#"))
            return void 0;
          const emptyNameAxUrl = () => {
            const axNode = axNodeForElementRole(el, "link");
            const axUrl2 = axNode?.properties?.url;
            if (!axNode || normalize(axNode.name) || axNode.properties?.focusable !== true || typeof axUrl2 !== "string") {
              return void 0;
            }
            try {
              const url2 = new URL(axUrl2);
              if (!["http:", "https:"].includes(url2.protocol))
                return void 0;
              return linkMatchesAxUrl(el, axNode) ? url2 : void 0;
            } catch {
              return void 0;
            }
          };
          let url;
          try {
            url = new URL(href, document.baseURI);
          } catch {
            const axUrl2 = emptyNameAxUrl();
            if (!axUrl2 || !hasOnlyEmptyImageRoleLinkContent(el))
              return void 0;
            return labelFromHttpUrl(axUrl2) || axUrl2.href;
          }
          const slugLabel = labelFromHttpUrl(url);
          if (slugLabel)
            return slugLabel;
          const axUrl = emptyNameAxUrl();
          if (!axUrl || !hasOnlyEmptyImageRoleLinkContent(el))
            return void 0;
          return labelFromHttpUrl(axUrl) || axUrl.href;
        }
        function hasOnlyEmptyAltImageLinkContent(el) {
          const visibleChildren = Array.from(el?.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 1)
            return false;
          const image = visibleChildren[0];
          if (image?.tagName?.toLowerCase() !== "img")
            return false;
          if (normalize(image.getAttribute("alt")) !== void 0)
            return false;
          return !normalize(readableText(el));
        }
        function hasOnlyEmptySvgImageLinkContent(el) {
          const visibleChildren = Array.from(el?.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 1)
            return false;
          const image = visibleChildren[0];
          if (image?.tagName?.toLowerCase() !== "svg")
            return false;
          if (normalize(image.getAttribute("aria-label")) || normalize(image.getAttribute("title"))) {
            return false;
          }
          return !normalize(readableText(el));
        }
        function hasOnlyEmptyImageRoleLinkContent(el) {
          return hasOnlyEmptyAltImageLinkContent(el) || hasOnlyEmptySvgImageLinkContent(el);
        }
        function hasEmptySvgAxImageChild(axNode) {
          const children = (axNode.childIds || []).map((id) => accessibilityNodeById.get(normalize(id) || "")).filter((child2) => Boolean(child2) && !child2.ignored);
          if (children.length !== 1)
            return false;
          const child = children[0];
          return normalizedAxRole(child.role) === "image" && normalize(child.name) === void 0 && normalize(child.tagName)?.toLowerCase() === "svg";
        }
        function isEmptySvgImageOnlyAxUrlFallbackLink(el, role, name) {
          if (role !== "link" || !name || !hasOnlyEmptySvgImageLinkContent(el))
            return false;
          const axNode = axNodeForElementRole(el, "link");
          const axUrl = axNode?.properties?.url;
          if (!axNode || normalize(axNode.name) || axNode.properties?.focusable !== true || typeof axUrl !== "string" || !linkMatchesAxUrl(el, axNode) || !hasEmptySvgAxImageChild(axNode)) {
            return false;
          }
          try {
            const url = new URL(axUrl);
            if (!["http:", "https:"].includes(url.protocol))
              return false;
            return name === (labelFromHttpUrl(url) || url.href);
          } catch {
            return false;
          }
        }
        function isSuppressedEmptyNonHttpImageLink(el, role) {
          if (role !== "link" || el?.tagName?.toLowerCase() !== "a")
            return false;
          if (accessibleName(el, role) || readableText(el))
            return false;
          if (!hasOnlyEmptyAltImageLinkContent(el))
            return false;
          const axNode = axNodeForElementRole(el, "link");
          const axUrl = axNode?.properties?.url;
          if (!axNode || normalize(axNode.name) || axNode.properties?.focusable !== true || typeof axUrl !== "string") {
            return false;
          }
          try {
            const href = normalize(el.getAttribute("href"));
            if (!href)
              return false;
            if (new URL(href, document.baseURI).href !== new URL(axUrl, document.baseURI).href) {
              return false;
            }
            const url = new URL(axUrl, document.baseURI);
            return !["http:", "https:"].includes(url.protocol);
          } catch {
            return false;
          }
        }
        function buttonContentName(el) {
          return nativeButtonDirectSpanTextName(el) || generatedPseudoName(el) || embeddedControlContentName(el);
        }
        function hasDecorativeMediaOnlyElement(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return false;
          const tag = el.tagName?.toLowerCase();
          if (tag === "svg")
            return el.getAttribute("aria-hidden") === "true" || !nestedImageLabel(el);
          if (tag === "img")
            return normalize(el.getAttribute("alt")) === "";
          if (el.getAttribute("role") === "presentation" || el.getAttribute("aria-hidden") === "true") {
            return true;
          }
          if (isHidden(el))
            return false;
          return false;
        }
        function isPlainNativeButton(el, role = implicitRole(el)) {
          if (role !== "button")
            return false;
          if (el?.tagName?.toLowerCase() !== "button")
            return false;
          if (el.disabled || el.hasAttribute?.("disabled") || el.getAttribute("aria-disabled") === "true") {
            return false;
          }
          if (normalizedPopup(el) || el.hasAttribute("aria-expanded") || el.hasAttribute("aria-pressed")) {
            return false;
          }
          return true;
        }
        function collapsedControlInNamedGroup(el, role, nativeDetailsSummary) {
          if (role !== "button")
            return false;
          const expanded = parseBooleanAttribute(el, "aria-expanded") ?? (nativeDetailsSummary ? nativeDetailsSummary.hasAttribute("open") : void 0);
          if (expanded !== false)
            return false;
          const group = el.closest?.("[role='group'][aria-label], [role='group'][aria-labelledby]");
          if (!group || isHidden(group) || !accessibleName(group, "group"))
            return false;
          for (let current = el.parentElement, depth = 0; current && current !== group; current = current.parentElement, depth += 1) {
            if (depth > 2)
              return false;
            const currentRole = current.getAttribute?.("role");
            if (currentRole && currentRole !== "none" && currentRole !== "presentation") {
              return false;
            }
          }
          return group.contains(el);
        }
        function collapsedAriaRoleButtonInGroupedContext(el, role) {
          if (role !== "button")
            return false;
          if (el?.getAttribute?.("role") !== "button")
            return false;
          if (parseBooleanAttribute(el, "aria-expanded") !== false)
            return false;
          if (normalizedPopup(el))
            return false;
          const tag = el.tagName?.toLowerCase();
          if (tag === "button" || tag === "a")
            return false;
          const namedGroup = el.closest?.("[role='group'][aria-label], [role='group'][aria-labelledby]");
          if (namedGroup && !isHidden(namedGroup) && accessibleName(namedGroup, "group")) {
            return true;
          }
          const footer = el.closest?.("footer, [role='contentinfo']");
          return Boolean(footer && !isHidden(footer));
        }
        function isTrailingNativeButtonInFormArticleCluster(el, role) {
          if (!isPlainNativeButton(el, role))
            return false;
          const form = el.closest?.("form");
          if (!form || isHidden(form))
            return false;
          const article = form.closest?.("article, [role='article']");
          if (!article || isHidden(article))
            return false;
          const parent = el.parentElement;
          if (!parent || !form.contains(parent))
            return false;
          const previousInteractive = Array.from(parent.children || []).some((sibling) => {
            if (sibling === el)
              return false;
            if (!(sibling.compareDocumentPosition(el) & sibling.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING)) {
              return false;
            }
            return visibleInteractiveDescendants(sibling).some((control) => control !== el);
          });
          if (!previousInteractive)
            return false;
          const laterSubstantiveSibling = Array.from(parent.children || []).some((sibling) => {
            if (sibling === el)
              return false;
            if (!(el.compareDocumentPosition(sibling) & el.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING)) {
              return false;
            }
            return !isHidden(sibling) && Boolean(readableText(sibling));
          });
          return !laterSubstantiveSibling;
        }
        function isAxConfirmedEmptyGenericTextNativeButtonGroup(el, role, name) {
          if (!isTrailingNativeButtonInFormArticleCluster(el, role))
            return false;
          if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby"))
            return false;
          if (el.hasAttribute("aria-controls"))
            return false;
          const buttonName = normalize(name || accessibleName(el, role));
          if (!buttonName || normalize(readableText(el)) !== buttonName)
            return false;
          const axNode = axNodeForElementRole(el, "button");
          if (!axNode || axNode.properties?.focusable !== true)
            return false;
          if (normalize(axNode.name) !== buttonName)
            return false;
          if (axNode.properties?.expanded !== void 0 || axNode.properties?.pressed !== void 0 || axNode.properties?.haspopup !== void 0) {
            return false;
          }
          const axChildren = axChildNodes(axNode);
          if (axChildren.length !== 2)
            return false;
          const [genericChild, staticTextChild] = axChildren;
          if (normalizedAxRole(genericChild.role) !== "generic" || normalize(genericChild.name)) {
            return false;
          }
          if (normalizedAxRole(staticTextChild.role) !== "statictext")
            return false;
          if (normalize(staticTextChild.name) !== buttonName)
            return false;
          const staticTextChildren = axChildNodes(staticTextChild);
          return staticTextChildren.length === 1 && normalizedAxRole(staticTextChildren[0].role) === "inlinetextbox" && normalize(staticTextChildren[0].name) === buttonName;
        }
        function nativeButtonSingleTextAndDecorativeMedia(el, role = implicitRole(el)) {
          if (!isPlainNativeButton(el, role))
            return void 0;
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
            return void 0;
          if (directOwnText(el))
            return void 0;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          const textChildren = visibleChildren.filter((child) => {
            if (child.matches?.(interactiveSelector))
              return false;
            if (hasDecorativeMediaOnlyElement(child))
              return false;
            return Boolean(normalize(readableText(child)));
          });
          if (textChildren.length !== 1)
            return void 0;
          if (!visibleChildren.every((child) => textChildren.includes(child) || hasDecorativeMediaOnlyElement(child))) {
            return void 0;
          }
          const label = normalize(readableText(textChildren[0]));
          const buttonName = normalize(accessibleName(el, role) || readableText(el));
          return label && label === buttonName ? label : void 0;
        }
        function hasOnlyDecorativeMediaDescendants(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return false;
          const children = Array.from(el.children || []);
          if (!children.length)
            return false;
          return children.every((child) => {
            if (hasDecorativeMediaOnlyElement(child))
              return true;
            if (child.matches?.(interactiveSelector))
              return false;
            if (normalize(readableText(child) || child.textContent))
              return false;
            return hasOnlyDecorativeMediaDescendants(child);
          });
        }
        function hasPreviousCodeExampleBlock(el) {
          for (let current = el?.parentElement, depth = 0; current && depth < 5; current = current.parentElement, depth += 1) {
            const pres = Array.from(current.querySelectorAll?.("pre") || []).filter((pre) => !isHidden(pre) && Boolean(directPreCodeChild(pre)) && Boolean(hasSyntaxHighlightedCodeDescendants(directPreCodeChild(pre))) && Boolean(pre.compareDocumentPosition(el) & pre.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING));
            if (pres.length)
              return true;
          }
          return false;
        }
        function isCodeExampleActionGroupButton(el, role = implicitRole(el)) {
          if (!isPlainNativeButton(el, role))
            return false;
          if (!hasPreviousCodeExampleBlock(el))
            return false;
          const name = normalize(accessibleName(el, role) || readableText(el));
          if (!name)
            return false;
          if (el.hasAttribute("aria-label") && hasOnlyDecorativeMediaDescendants(el)) {
            return true;
          }
          if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby"))
            return false;
          if (el.querySelector("p, code") && normalize(readableText(el)) === name) {
            return true;
          }
          return false;
        }
        function isFilterRowGroupButton(el, role = implicitRole(el)) {
          if (!nativeButtonSingleTextAndDecorativeMedia(el, role))
            return false;
          if (isFooterLegalActionButton(el, role))
            return false;
          const wrapper = el.parentElement;
          const row = wrapper?.parentElement;
          if (!wrapper || !row || wrapper === document.body || row === document.body)
            return false;
          if (wrapper.matches?.(interactiveSelector) || row.matches?.(interactiveSelector))
            return false;
          const rowButtons = Array.from(row.querySelectorAll(":scope > * > button")).filter((button) => !isHidden(button) && Boolean(nativeButtonSingleTextAndDecorativeMedia(button)));
          if (rowButtons.length < 3 || !rowButtons.includes(el))
            return false;
          const labelCandidates = [
            ...Array.from(row.children || []),
            ...Array.from(row.parentElement?.children || [])
          ];
          return labelCandidates.some((child) => {
            if (isHidden(child) || child === wrapper || child === row)
              return false;
            if (!["p", "span", "div"].includes(child.tagName?.toLowerCase()))
              return false;
            const text = normalize(readableText(child));
            return Boolean(text && /:\s*$/u.test(text) && !child.querySelector?.(interactiveSelector));
          });
        }
        function axConfirmedNativeButtonSymbolSpacingName(el, role, name) {
          if (role !== "button" || el?.tagName?.toLowerCase() !== "button")
            return void 0;
          if (!accessibilityNodes.length)
            return void 0;
          const domName = normalize(name || accessibleName(el, role));
          if (!domName)
            return void 0;
          const axNode = axNodeForElementRole(el, "button");
          const axName = normalize(axNode?.name);
          if (!axNode || axNode.properties?.focusable !== true || !axName || axName === domName) {
            return void 0;
          }
          const compactSymbolSpacing = (value) => (normalize(value) ?? "").replace(/\s+([+→↗×])/g, "$1").replace(/([+→↗×])\s+/g, "$1");
          const compactWhitespace = (value) => (normalize(value) ?? "").replace(/\s+/g, "");
          if (compactSymbolSpacing(axName) !== compactSymbolSpacing(domName) && compactWhitespace(axName) !== compactWhitespace(domName)) {
            return void 0;
          }
          if (!/\s[+→↗×](?:\s|$)/.test(axName) && !/\d(?:\.\d+)+\s+\p{L}/u.test(axName)) {
            return void 0;
          }
          return axName;
        }
        function nativeButtonStandaloneSymbolSpacingName(el, role, name) {
          if (role !== "button" || el?.tagName?.toLowerCase() !== "button")
            return void 0;
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
            return void 0;
          if (el.disabled || el.hasAttribute?.("disabled"))
            return void 0;
          if (nativeButtonDirectSpanTextName(el))
            return void 0;
          const domName = normalize(name || accessibleName(el, role));
          if (!domName)
            return void 0;
          const fragments = [];
          const collectTextFragments = (node) => {
            for (const child of Array.from(node?.childNodes || [])) {
              if (child.nodeType === Node.TEXT_NODE) {
                const text = normalize(child.textContent || "");
                if (text)
                  fragments.push(text);
                continue;
              }
              if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child))
                continue;
              if (child.matches?.(interactiveSelector))
                return;
              collectTextFragments(child);
            }
          };
          collectTextFragments(el);
          if (fragments.length < 2)
            return void 0;
          if (!/^[+→↗×]$/.test(fragments[fragments.length - 1]))
            return void 0;
          const spacedName = normalize(fragments.join(" "));
          if (!spacedName || spacedName === domName)
            return void 0;
          const compactSymbolSpacing = (value) => (normalize(value) ?? "").replace(/\s+([+→↗×])/g, "$1").replace(/([+→↗×])\s+/g, "$1");
          if (compactSymbolSpacing(spacedName) !== compactSymbolSpacing(domName))
            return void 0;
          return spacedName;
        }
        function nativeButtonDirectSpanTextName(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName?.toLowerCase() !== "button")
            return void 0;
          if (el.getAttribute("role") && el.getAttribute("role") !== "button")
            return void 0;
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
            return void 0;
          if (el.hasAttribute("data-sr-pseudo-before") || el.hasAttribute("data-sr-pseudo-after")) {
            return void 0;
          }
          if (el.querySelector(interactiveSelector))
            return void 0;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length === 1 && ["div", "span"].includes(visibleChildren[0].tagName?.toLowerCase()) && !directOwnText(el) && !visibleChildren[0].getAttribute("role") && !visibleChildren[0].getAttribute("aria-label") && !visibleChildren[0].getAttribute("aria-labelledby")) {
            return nativeButtonAdjacentSpanText(visibleChildren[0]);
          }
          return nativeButtonAdjacentSpanText(el);
        }
        function nativeButtonAdjacentSpanText(el) {
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
            if (child.tagName?.toLowerCase() !== "span")
              return void 0;
            if (child.querySelector(interactiveSelector))
              return void 0;
            const childText = readableText(child);
            if (!childText)
              continue;
            if (previousWasTextSpan && interveningText === "") {
              sawAdjacentTextSpans = true;
            }
            text += childText;
            spanCount += 1;
            previousWasTextSpan = true;
            interveningText = "";
          }
          if (spanCount < 2 || !sawAdjacentTextSpans)
            return void 0;
          return normalize(text);
        }
        function isStructuredArticleCardStandaloneButtonAction(el, role) {
          if (role !== "button")
            return false;
          if (el?.tagName?.toLowerCase() !== "button")
            return false;
          if (el.disabled || el.hasAttribute?.("disabled") || el.getAttribute("aria-disabled") === "true") {
            return false;
          }
          if (normalizedPopup(el) || el.hasAttribute("aria-expanded"))
            return false;
          if (!nativeButtonDirectSpanTextName(el))
            return false;
          const article = el.closest("article,[role='article']");
          if (!hasStructuredInferredArticleCardContent(article))
            return false;
          return !el.closest("p,li,h1,h2,h3,h4,h5,h6,[role='heading']");
        }
        function isNativeButtonDirectSpanGroupButton(el) {
          if (!nativeButtonDirectSpanTextName(el))
            return false;
          if (el.disabled || el.hasAttribute?.("disabled"))
            return false;
          return ![
            "aria-checked",
            "aria-controls",
            "aria-current",
            "aria-describedby",
            "aria-disabled",
            "aria-expanded",
            "aria-haspopup",
            "aria-pressed",
            "aria-selected"
          ].some((attribute) => el.hasAttribute?.(attribute));
        }
        function isAxConfirmedNestedSubmitButtonInTabPanelGroup(el, role, name) {
          if (role !== "button" || el?.tagName?.toLowerCase() !== "button")
            return false;
          if ((el.getAttribute("type") || "submit").toLowerCase() !== "submit")
            return false;
          if (!el.closest("form"))
            return false;
          if (!el.closest("[role='tabpanel']"))
            return false;
          if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby") || el.hasAttribute("aria-expanded") || normalizedPopup(el)) {
            return false;
          }
          if (el.disabled || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") {
            return false;
          }
          if (directOwnText(el))
            return false;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 1)
            return false;
          const wrapper = visibleChildren[0];
          if (!["div", "span"].includes(wrapper.tagName?.toLowerCase()))
            return false;
          if (wrapper.matches?.(interactiveSelector) || wrapper.querySelector?.(interactiveSelector)) {
            return false;
          }
          const buttonName = normalize(name || accessibleName(el, role));
          const wrapperText = normalize(readableText(wrapper));
          if (!buttonName || wrapperText !== buttonName)
            return false;
          const axNode = axNodeForElementRole(el, "button");
          return Boolean(axNode && normalize(axNode.name) === buttonName && axNode.properties?.focusable === true);
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
        function isPunctuationOnlyBetweenInlineEmphasis(el, role) {
          if (role !== "text")
            return false;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!["span", "small"].includes(el.tagName?.toLowerCase()))
            return false;
          const text = normalize(readableText(el) || el.textContent);
          if (!text || /[\p{L}\p{N}]/u.test(text))
            return false;
          const emphasisSelector = "strong, b, em, i";
          const previous = previousVisibleElementSibling(el);
          const next = nextVisibleElementSibling(el);
          return Boolean(previous?.matches?.(emphasisSelector) && next?.matches?.(emphasisSelector) && normalize(readableText(previous)) && normalize(readableText(next)));
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
        function visibleLeafTextFragments(el) {
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
            if (["script", "style", "svg"].includes(node.tagName?.toLowerCase()))
              return;
            const visibleChildren = Array.from(node.childNodes || []).filter((child) => {
              if (child.nodeType === Node.TEXT_NODE)
                return Boolean(normalize(child.textContent));
              return child.nodeType === Node.ELEMENT_NODE && !isHidden(child) && !child.matches("[aria-hidden='true']");
            });
            if (visibleChildren.length === 1 && visibleChildren[0].nodeType === Node.TEXT_NODE) {
              push(visibleChildren[0].textContent || "");
              return;
            }
            for (const child of Array.from(node.childNodes || []))
              collect(child);
            for (const child of shadowContentChildren(node))
              collect(child);
          }
          collect(el);
          return fragments;
        }
        function priceDisclosureFragments(el, role) {
          if (role && !["paragraph", "text"].includes(role))
            return void 0;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName.toLowerCase() !== "div")
            return void 0;
          if (el.matches(interactiveSelector) || el.closest(interactiveSelector))
            return void 0;
          const text = normalize(readableText(el));
          if (!text)
            return void 0;
          if (!/(?:from\s+)?[£$€]\s?\d+(?:[.,]\d+)?\s*\/\s*(?:month|mo|mth)/i.test(text)) {
            return void 0;
          }
          if (!/\bprices?\s+may\s+change\b/i.test(text))
            return void 0;
          const ariaHiddenDuplicate = Array.from(el.querySelectorAll("[aria-hidden='true']")).some((candidate) => normalize(candidate.textContent || "") !== void 0);
          if (!ariaHiddenDuplicate)
            return void 0;
          const fragments = visibleLeafTextFragments(el);
          if (fragments.length < 2)
            return void 0;
          if (!/^(from\s+)?[£$€]\s?\d+(?:[.,]\d+)?\s*\/\s*(?:month|mo|mth)$/i.test(fragments[0])) {
            return void 0;
          }
          if (!fragments.some((fragment) => /\bprices?\s+may\s+change\b/i.test(fragment))) {
            return void 0;
          }
          if (!fragments.some((fragment) => /\bno\s+upfront\s+fees?\b/i.test(fragment)) && !fragments.some((fragment) => /\bswitching\s+credit\b/i.test(fragment))) {
            return void 0;
          }
          return fragments;
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
        function focusableGenericListItemDescendantGroupText(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (!["span", "div"].includes(el.tagName?.toLowerCase()))
            return void 0;
          if (el.getAttribute("role"))
            return void 0;
          if (el.getAttribute("tabindex") !== "0")
            return void 0;
          if (parseBooleanAttribute(el, "aria-expanded") === void 0)
            return void 0;
          if (normalizedPopup(el))
            return void 0;
          if (hasExplicitAriaName(el))
            return void 0;
          if (normalize(el.getAttribute("aria-describedby")) || normalize(el.getAttribute("aria-controls"))) {
            return void 0;
          }
          if (el.querySelector(interactiveSelector))
            return void 0;
          const listItem = el.closest("li,[role='listitem']");
          if (!isListItem(listItem) || listItem.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.closest("li,[role='listitem']") !== listItem)
            return void 0;
          const list = listForItem(listItem);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (list.closest("nav,[role='navigation']"))
            return void 0;
          const text = normalize(readableText(el));
          if (!text)
            return void 0;
          const listItemText = normalize(textWithoutInteractive(listItem) || readableText(listItem));
          if (!listItemText || listItemText !== text)
            return void 0;
          const controls = Array.from(listItem.querySelectorAll("[tabindex]")).filter((candidate) => !isHidden(candidate) && candidate.getAttribute("tabindex") === "0");
          if (controls.length !== 1 || controls[0] !== el)
            return void 0;
          return text;
        }
        function isFocusableGenericListItemDescendantGroup(el) {
          return Boolean(focusableGenericListItemDescendantGroupText(el));
        }
        function hasFocusableGenericListItemDescendantGroup(el) {
          if (!isListItem(el))
            return false;
          return Array.from(el.querySelectorAll("span, div")).some((candidate) => isFocusableGenericListItemDescendantGroup(candidate));
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
        function hasSameNameCustomGroupAncestor(el, name) {
          const normalizedName = normalize(name);
          if (!normalizedName)
            return false;
          const seen = /* @__PURE__ */ new Set();
          for (let current = el?.parentElement; current; current = current.parentElement) {
            const candidates = [current, shadowContentHostByNode.get(current)].filter(Boolean);
            for (const candidate of candidates) {
              if (seen.has(candidate) || !isCustomElement(candidate))
                continue;
              seen.add(candidate);
              if (normalize(accessibleName(candidate, "group")) === normalizedName) {
                return true;
              }
            }
          }
          const shadowHost = shadowContentHostByNode.get(el);
          return Boolean(shadowHost && isCustomElement(shadowHost) && normalize(accessibleName(shadowHost, "group")) === normalizedName);
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
        function explicitTooltipText(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          const role = normalize(el.getAttribute("role"))?.toLowerCase();
          const tag = el.tagName?.toLowerCase?.() || "";
          if (role !== "tooltip" && !/tooltip/i.test(tag))
            return void 0;
          return normalize(el.textContent || "");
        }
        function isTooltipElementLike(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return false;
          const role = normalize(el.getAttribute("role"))?.toLowerCase();
          const tag = el.tagName?.toLowerCase?.() || "";
          return role === "tooltip" || /tooltip/i.test(tag);
        }
        function hasNonTooltipDescendantText(el) {
          for (const child of Array.from(el?.childNodes || [])) {
            if (child.nodeType === Node.TEXT_NODE) {
              if (normalize(child.textContent || ""))
                return true;
              continue;
            }
            if (child.nodeType !== Node.ELEMENT_NODE)
              continue;
            if (isTooltipElementLike(child))
              continue;
            if (hasNonTooltipDescendantText(child))
              return true;
          }
          return false;
        }
        function hasAssociatedExplicitTooltip(el, name) {
          const normalizedName = normalize(name);
          if (!normalizedName)
            return false;
          const ids = /* @__PURE__ */ new Set();
          for (let current = el; current && current.nodeType === Node.ELEMENT_NODE; current = current.parentElement) {
            const id = normalize(current.getAttribute?.("id"));
            if (id)
              ids.add(id);
            if (current === document.body || current === document.documentElement)
              break;
          }
          for (let current = el?.parentElement, depth = 0; current && depth < 4; current = current.parentElement, depth += 1) {
            const tooltips = Array.from(current.querySelectorAll?.("[role='tooltip'], *") || []).filter((candidate) => explicitTooltipText(candidate) === normalizedName);
            for (const tooltip of tooltips) {
              const target = normalize(tooltip.getAttribute?.("for"));
              if (target && !ids.has(target))
                continue;
              return true;
            }
          }
          return false;
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
          if (isAriaLabelOnlyDecorativeIconButton(el))
            return false;
          return Boolean(el.querySelector("svg, [role='img'], img"));
        }
        function isAriaLabelOnlyDecorativeIconButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (!el.hasAttribute("aria-label"))
            return false;
          if (readableText(el) || nestedImageLabel(el))
            return false;
          if (hasNonTooltipDescendantText(el))
            return false;
          return Boolean(el.querySelector("svg, [role='img'], img") || Array.from(el.children).some((child) => isCustomElement(child) && !readableText(child) && !nestedImageLabel(child) && !hasNonTooltipDescendantText(child) && !child.querySelector?.(interactiveSelector)));
        }
        function isAxConfirmedToolbarIconButton(el, role = implicitRole(el)) {
          if (role !== "button")
            return false;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!el.hasAttribute("aria-label"))
            return false;
          if (normalize(el.getAttribute("tabindex")) !== "-1")
            return false;
          if (!isAriaLabelOnlyDecorativeIconButton(el))
            return false;
          const axNode = axNodeForElementRole(el, "button");
          if (!axNode || axNode.properties?.focusable !== true)
            return false;
          function isSimilarToolbarButton(candidate) {
            return candidate !== el && candidate?.nodeType === Node.ELEMENT_NODE && !isHidden(candidate) && implicitRole(candidate) === "button" && normalize(candidate.getAttribute("tabindex")) === "-1" && isAriaLabelOnlyDecorativeIconButton(candidate);
          }
          for (let scope = el.parentElement, depth = 0; scope && depth < 4; scope = scope.parentElement, depth += 1) {
            const similarButtons = Array.from(scope.querySelectorAll("button,[role='button']")).filter(isSimilarToolbarButton);
            if (similarButtons.length >= 2)
              return true;
          }
          return false;
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
        function isCollapsedDialogPopupImageTextButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (el.tagName?.toLowerCase() !== "button")
            return false;
          if (!normalize(el.getAttribute("aria-label")))
            return false;
          if (normalizedPopup(el) !== "dialog")
            return false;
          if (parseBooleanAttribute(el, "aria-expanded") !== false)
            return false;
          const directVisibleElements = Array.from(el.children || []).filter((child) => !isHidden(child));
          return directVisibleElements.some((child) => child.tagName?.toLowerCase() === "img") && directVisibleElements.some((child) => child.tagName?.toLowerCase() === "span");
        }
        function isIconFirstTextButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (isNativeCardActionDisclosureButton(el))
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
            const style = safeComputedStyle(child);
            if (marker && marker !== "false" || style?.display === "none")
              continue;
            const selector = "svg, img, [role='img']";
            if (!(child.matches(selector) || Boolean(child.querySelector(selector)))) {
              return false;
            }
            const trailingNodes = Array.from(el.childNodes).slice(Array.from(el.childNodes).indexOf(child) + 1);
            const hasTrailingTextElement = trailingNodes.some((node) => node.nodeType === Node.ELEMENT_NODE && !isHidden(node) && normalize(readableText(node) || node.textContent));
            return hasTrailingTextElement;
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
            if (!textBeforeButton)
              continue;
            const fullText = normalize(readableText(current));
            if (fullText.endsWith(label) && (/[.!?]$/.test(textBeforeButton) || hasPreviousCardActionControls(current))) {
              return true;
            }
          }
          return false;
        }
        function hasPreviousCardActionControls(el) {
          const previous = previousVisibleElementSibling(el);
          if (!previous)
            return false;
          const actionControls = Array.from(previous.querySelectorAll(":scope > a[href], :scope > button")).filter((control) => !isHidden(control));
          if (actionControls.length === 2 && actionControls[0].tagName?.toLowerCase() === "a" && actionControls[1].tagName?.toLowerCase() === "button") {
            return true;
          }
          const actionWrappers = Array.from(previous.children || []).filter((child) => !isHidden(child) && child.querySelector?.(interactiveSelector));
          if (actionWrappers.length < 2)
            return false;
          const linkWrapper = actionWrappers[actionWrappers.length - 2];
          const buttonWrapper = actionWrappers[actionWrappers.length - 1];
          return hasOnlyNativeLinkControls(linkWrapper) && Array.from(buttonWrapper.querySelectorAll(":scope > button, :scope > [role='button']")).filter((button) => !isHidden(button)).length === 1;
        }
        function isNativeCardActionDisclosureButton(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName.toLowerCase() !== "button")
            return false;
          if (el.getAttribute("role") || el.hasAttribute("tabindex"))
            return false;
          if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby") || el.hasAttribute("aria-expanded") || el.hasAttribute("aria-controls") || normalizedPopup(el)) {
            return false;
          }
          if (!readableText(el))
            return false;
          const media = Array.from(el.querySelectorAll("svg, img, [role='img']"));
          if (!media.length)
            return false;
          if (media.some((candidate) => candidate.getAttribute("aria-hidden") !== "true" && normalize(candidate.getAttribute("alt")) !== "")) {
            return false;
          }
          function hasFollowingDetails(container) {
            const following = nextVisibleElementSibling(container);
            return Boolean(following && !following.matches?.(interactiveSelector) && !following.closest?.(interactiveSelector) && textWithoutInteractive(following));
          }
          const actionRow = el.parentElement;
          if (!actionRow)
            return false;
          const visibleControls = Array.from(actionRow.querySelectorAll(":scope > a[href], :scope > button")).filter((control) => !isHidden(control));
          if (visibleControls.length === 2 && visibleControls[1] === el && visibleControls[0].tagName?.toLowerCase() === "a" && hasFollowingDetails(actionRow)) {
            return true;
          }
          const previous = previousVisibleElementSibling(actionRow);
          const parent = actionRow.parentElement;
          const wrapperControls = Array.from(actionRow.querySelectorAll(":scope > button, :scope > [role='button']")).filter((control) => !isHidden(control));
          return Boolean(parent && wrapperControls.length === 1 && wrapperControls[0] === el && previous && hasOnlyNativeLinkControls(previous) && hasFollowingDetails(parent));
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
        function isExpandedNavigationListItemButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (el.tagName?.toLowerCase() !== "button")
            return false;
          if (parseBooleanAttribute(el, "aria-expanded") !== true)
            return false;
          if (normalizedPopup(el))
            return false;
          if (!shadowInclusiveAncestor(el, "nav,[role='navigation']"))
            return false;
          if (buttonSharesListItemWithLink(el))
            return false;
          if (isPlainUtilityDisclosureButton(el))
            return false;
          const listItem = semanticListContext(el).listItem;
          if (!hasOnlyInteractiveListItemContent(listItem))
            return false;
          const children = directSemanticChildren(listItem);
          return children.length === 1 && children[0] === el;
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
          return /^(open search|open alerts\b.*|open help menu|open all categories menu)$/i.test(label || "");
        }
        function isSimpleNativeFooter(el) {
          if (el?.tagName?.toLowerCase() !== "footer")
            return false;
          if (el.hasAttribute("role"))
            return false;
          if (el.querySelector("ul, ol, nav, [role='navigation']") || el.querySelectorAll("a[href], [role='link']").length >= 3) {
            return true;
          }
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
            return false;
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
        function isEmptyAlertLiveRegion(el, role = implicitRole(el)) {
          if (role !== "alert")
            return false;
          if (isEmptyAlertBeforeDialog(el))
            return false;
          if (accessibleName(el, role) || readableText(el))
            return false;
          if (normalize(el.getAttribute("aria-description")))
            return false;
          if (textFromIdRefs(el.getAttribute("aria-describedby")))
            return false;
          if (accessibilityNodes.length) {
            const axNode = axNodeForElementRole(el, "alert");
            if (!axNode || normalize(axNode.name))
              return false;
          }
          return true;
        }
        function isNamedAlertBoundary(el, role = implicitRole(el)) {
          if (role !== "alert")
            return false;
          if (!el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby"))
            return false;
          if (!accessibleName(el, role))
            return false;
          if (isEmptyAlertBeforeDialog(el) || isEmptyAlertLiveRegion(el, role))
            return false;
          return Array.from(el.children || []).some((child) => {
            if (isHidden(child))
              return false;
            return isStopElement(child) || hasVisibleInteractiveDescendant(child) || Boolean(readableText(child));
          });
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
        function frameName(el) {
          if (el?.tagName?.toLowerCase() !== "iframe")
            return void 0;
          return normalize(el.getAttribute("aria-label") || textFromIdRefs(el.getAttribute("aria-labelledby")) || el.getAttribute("title"));
        }
        function isFocusableFrame(el) {
          if (el?.tagName?.toLowerCase() !== "iframe")
            return false;
          const tabIndex = Number.parseInt(el.getAttribute("tabindex") || "", 10);
          if (Number.isFinite(tabIndex))
            return tabIndex >= 0;
          if (typeof el.tabIndex === "number" && el.tabIndex >= 0)
            return true;
          const axNode = axNodeForElementRole(el, "frame");
          return axNode?.properties?.focusable === true;
        }
        function isIgnorableLeadingScanRootElement(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return true;
          const tag = el.tagName?.toLowerCase();
          return tag === "script" || tag === "style" || tag === "template" || tag === "title";
        }
        function scannerRootForLeadingStop(el) {
          const explicitRoot = el?.closest?.("[data-sr-scan-root]");
          if (explicitRoot && el.parentElement === explicitRoot)
            return explicitRoot;
          return el?.parentElement === document?.body ? document.body : void 0;
        }
        function isScanRootLeadingFocusableIframeStop(el) {
          if (el?.tagName?.toLowerCase() !== "iframe")
            return false;
          if (!frameName(el) || !isFocusableFrame(el))
            return false;
          const scanRoot = scannerRootForLeadingStop(el);
          if (!scanRoot)
            return false;
          for (const child of Array.from(scanRoot.children || [])) {
            if (child === el)
              return true;
            if (isIgnorableLeadingScanRootElement(child))
              continue;
            return false;
          }
          return false;
        }
        function isCheckboxRoleButtonAccordionControl(el, role = implicitRole(el)) {
          if (role !== "button")
            return false;
          if (el?.tagName?.toLowerCase() !== "input")
            return false;
          if ((el.getAttribute("type") || "text").toLowerCase() !== "checkbox")
            return false;
          if (normalize(el.getAttribute("role"))?.toLowerCase() !== "button")
            return false;
          if (parseBooleanAttribute(el, "aria-expanded") === void 0)
            return false;
          if (!normalize(el.getAttribute("aria-controls")))
            return false;
          return Boolean(controlNameFromIdRef(el) || accessibleName(el, role));
        }
        function directVisibleElementChildren(el) {
          return Array.from(el?.children || []).filter((child) => !isHidden(child));
        }
        function soleDirectVisibleLink(el) {
          const children = directVisibleElementChildren(el);
          if (children.length !== 1)
            return void 0;
          const link = children[0];
          return implicitRole(link) === "link" ? link : void 0;
        }
        function nextMeaningfulElementSibling(el) {
          for (let sibling = el?.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
            if (isHidden(sibling))
              continue;
            if (!sibling.getAttribute("role") && !readableText(sibling) && !hasVisibleInteractiveDescendant(sibling)) {
              continue;
            }
            return sibling;
          }
          return void 0;
        }
        function previewFrameTablistAfter(wrapper) {
          const candidate = nextMeaningfulElementSibling(wrapper);
          if (!candidate || implicitRole(candidate) !== "tablist")
            return void 0;
          if (candidate.getAttribute("role") !== "tablist")
            return void 0;
          const tabs = Array.from(candidate.querySelectorAll("[role='tab']")).filter((tab) => !isHidden(tab));
          if (tabs.length < 2)
            return void 0;
          if (tabs.some((tab) => !tab.hasAttribute("aria-expanded")))
            return void 0;
          return candidate;
        }
        function previewFrameWrapperForLink(el) {
          if (!el || implicitRole(el) !== "link")
            return void 0;
          const linkShell = el.parentElement;
          const wrapper = linkShell?.parentElement;
          if (!wrapper || wrapper.tagName?.toLowerCase() !== "div")
            return void 0;
          if (wrapper.getAttribute("role") || wrapper.getAttribute("aria-label") || wrapper.getAttribute("aria-labelledby") || wrapper.hasAttribute("tabindex") || wrapper.matches(interactiveSelector) || directOwnText(wrapper)) {
            return void 0;
          }
          const wrapperChildren = directVisibleElementChildren(wrapper);
          if (wrapperChildren.length !== 2 || wrapperChildren[0] !== linkShell)
            return void 0;
          if (soleDirectVisibleLink(linkShell) !== el)
            return void 0;
          const iframe = wrapperChildren[1];
          if (iframe.tagName?.toLowerCase() !== "iframe" || !frameName(iframe))
            return void 0;
          if (iframe.hasAttribute("aria-live") || iframe.hasAttribute("sandbox") || iframe.hasAttribute("tabindex") || iframe.hasAttribute("aria-controls") || iframe.hasAttribute("aria-expanded")) {
            return void 0;
          }
          return previewFrameTablistAfter(wrapper) ? wrapper : void 0;
        }
        function titleCaseInitial(value) {
          const text = normalize(value);
          return text ? `${text.charAt(0).toLocaleUpperCase("en-US")}${text.slice(1)}` : void 0;
        }
        function voiceOverExampleTitle(value) {
          return normalize(value)?.replace(/\s+[–—]\s+/g, " - ");
        }
        function voiceOverExampleFrameTitle(value) {
          const title = voiceOverExampleTitle(value);
          if (!title)
            return void 0;
          const match = title.match(/^(.*)\s+example$/i);
          if (!match)
            return title;
          const documentTitle = normalize(match[1].replace(/\s+second$/i, ""));
          return `${titleCaseInitial(documentTitle)} - Example - GOV.UK Design System`;
        }
        function previewFrameAnnouncementsForLink(el, role) {
          if (role !== "link")
            return void 0;
          const wrapper = previewFrameWrapperForLink(el);
          if (!wrapper)
            return void 0;
          const iframe = directVisibleElementChildren(wrapper)[1];
          const groupName = voiceOverExampleTitle(frameName(iframe));
          const frameTitle = voiceOverExampleFrameTitle(frameName(iframe));
          if (!groupName || !frameTitle)
            return void 0;
          return [
            `${groupName}, group`,
            `${frameTitle}, frame`,
            `end of, ${groupName}, group`
          ];
        }
        function isPreviewFrameTab(el, role) {
          if (role !== "tab" || !el?.hasAttribute?.("aria-expanded"))
            return false;
          const tablist = el.closest("[role='tablist']");
          if (!tablist)
            return false;
          for (let sibling = tablist.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
            if (isHidden(sibling))
              continue;
            if (!sibling.getAttribute("role") && !readableText(sibling) && !hasVisibleInteractiveDescendant(sibling)) {
              continue;
            }
            return previewFrameTablistAfter(sibling) === tablist;
          }
          return false;
        }
        function hasSingleTitledIframeRegionContext(el) {
          const parent = el?.parentElement;
          if (!parent)
            return false;
          const role = implicitRole(parent);
          if (role !== "region")
            return false;
          if (!parent.hasAttribute("aria-labelledby"))
            return false;
          return Array.from(parent.children || []).filter((child) => !isHidden(child)).includes(el);
        }
        function singleTitledIframeChild(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName?.toLowerCase() !== "div")
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
            return void 0;
          }
          if (el.hasAttribute("tabindex") || el.matches(interactiveSelector))
            return void 0;
          if (directOwnText(el))
            return void 0;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 1)
            return void 0;
          const iframe = visibleChildren[0];
          if (iframe.tagName?.toLowerCase() !== "iframe")
            return void 0;
          if (iframe.hasAttribute("aria-live") || iframe.hasAttribute("sandbox") || iframe.hasAttribute("tabindex") || iframe.hasAttribute("aria-controls") || iframe.hasAttribute("aria-expanded")) {
            return void 0;
          }
          const name = frameName(iframe);
          if (!name)
            return void 0;
          if (!hasSingleTitledIframeRegionContext(el))
            return void 0;
          const wrapperNode = axNodeForElement(el);
          const frameNode = axNodeForElementRole(iframe, "frame");
          if (accessibilityNodes.length) {
            if (!wrapperNode || normalizedAxRole(wrapperNode.role) !== "generic")
              return void 0;
            if (normalize(wrapperNode.name))
              return void 0;
            if (!frameNode || normalize(frameNode.name) !== name)
              return void 0;
            if (wrapperNode.childIds?.length === 1 && wrapperNode.childIds[0] !== frameNode.nodeId) {
              return void 0;
            }
          }
          return iframe;
        }
        function isSingleTitledIframeWrapper(el) {
          return Boolean(singleTitledIframeChild(el));
        }
        function hasOffscreenColonSuffix(el) {
          return Array.from(el?.children || []).some((child) => {
            if (child.nodeType !== Node.ELEMENT_NODE)
              return false;
            if (!normalize(readableText(child) || child.textContent)?.startsWith(":"))
              return false;
            return child.getAttribute("data-sr-rendered-position") === "offscreen" || Boolean(child.getAttribute("data-sr-computed-hidden")) || /visually-hidden|sr-only/i.test(child.getAttribute("class") || "");
          });
        }
        function axSpaceBeforeColonLinkName(el, role, name) {
          if (role !== "link" || !name || !accessibilityNodes.length)
            return void 0;
          if (!/^Open this example in a new tab:/i.test(name))
            return void 0;
          if (!hasOffscreenColonSuffix(el))
            return void 0;
          const axNode = axNodeForElementRole(el, "link");
          const axName = normalize(axNode?.name);
          return axName && /^Open this example in a new tab\s+:/i.test(axName) && normalize(axName.replace(/\s+:/, ":")) === name ? axName : void 0;
        }
        function axWhitespaceOnlyLinkName(el, role, name) {
          if (role !== "link" || !name || !accessibilityNodes.length)
            return void 0;
          if (hasOffscreenColonSuffix(el))
            return void 0;
          const axName = normalize(axNodeForElementRole(el, "link")?.name);
          if (!axName || axName === name)
            return void 0;
          if (postPunctuationWhitespaceCollapsedText(axName) === name)
            return void 0;
          const compact = (value) => normalize(value).replace(/\s+/g, "");
          return compact(axName) === compact(name) ? axName : void 0;
        }
        function differsOnlyByTerminalPunctuation(labelledName, visibleName) {
          const normalizedLabel = normalize(labelledName);
          const normalizedVisible = normalize(visibleName);
          if (!normalizedLabel || !normalizedVisible || normalizedLabel === normalizedVisible) {
            return false;
          }
          return normalize(normalizedLabel.replace(/[.!?]$/u, "")) === normalizedVisible;
        }
        function hasOfferMetadataTail(labelledName, visibleName) {
          const normalizedLabel = normalize(labelledName);
          const normalizedVisible = normalize(visibleName);
          if (!normalizedLabel || !normalizedVisible || normalizedLabel === normalizedVisible) {
            return false;
          }
          if (!normalizedLabel.startsWith(`${normalizedVisible}. `))
            return false;
          const tail = normalizedLabel.slice(normalizedVisible.length + 2);
          return /^From\s+/u.test(tail) && /(?:[£$€]\s*\d|\b[A-Z]{3}\s*\d|\b\d+\s*(?:GBP|USD|EUR)\b)/u.test(tail);
        }
        function axConfirmedLinkedOfferHeadingName(el, role) {
          if (role !== "heading" || !accessibilityNodes.length)
            return void 0;
          if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) {
            return void 0;
          }
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((candidate) => !isHidden(candidate));
          if (links.length !== 1)
            return void 0;
          const link = links[0];
          const ariaLabel = normalize(link.getAttribute("aria-label"));
          if (!ariaLabel)
            return void 0;
          const visibleName = normalize(linkContentName(link) || readableText(link) || readableText(el));
          if (!hasOfferMetadataTail(ariaLabel, visibleName)) {
            return void 0;
          }
          const axLinkName = normalize(axNodeForElementRole(link, "link")?.name);
          const axHeadingName = normalize(axNodeForElementRole(el, "heading")?.name);
          return axLinkName === ariaLabel && axHeadingName === ariaLabel ? ariaLabel : void 0;
        }
        function axConfirmedTerminalPunctuationLinkedHeadingName(el, role) {
          if (role !== "heading" || !accessibilityNodes.length)
            return void 0;
          if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) {
            return void 0;
          }
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((candidate) => !isHidden(candidate));
          if (links.length !== 1)
            return void 0;
          const link = links[0];
          const ariaLabel = normalize(link.getAttribute("aria-label"));
          if (!ariaLabel)
            return void 0;
          const visibleName = normalize(linkContentName(link) || readableText(link) || readableText(el));
          if (!differsOnlyByTerminalPunctuation(ariaLabel, visibleName)) {
            return void 0;
          }
          const axName = normalize(axNodeForElementRole(link, "link")?.name);
          return axName === ariaLabel ? ariaLabel : void 0;
        }
        function axConfirmedAriaLabelHeadingStaticTextItemCount(el, role) {
          if (role !== "heading" || !accessibilityNodes.length)
            return void 0;
          if (!el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby"))
            return void 0;
          if (el.querySelector("button, [role='button'], a[href], [role='link']"))
            return void 0;
          const ariaLabel = normalize(el.getAttribute("aria-label"));
          const axNode = axNodeForElementRole(el, "heading");
          const axName = normalize(axNode?.name);
          if (!ariaLabel || !axName || axName !== ariaLabel)
            return void 0;
          const axTextChildren = axChildNodes(axNode).filter((node) => normalizedAxRole(node.role) === "statictext").map((node) => node.name || "").filter((name) => Boolean(normalize(name)));
          if (axTextChildren.length <= 1)
            return void 0;
          const combinedChildText = normalize(axTextChildren.join(""));
          const axNameWithoutTerminalPunctuation = normalize(axName.replace(/\s*[.!?]$/u, ""));
          return combinedChildText && combinedChildText === axNameWithoutTerminalPunctuation ? axTextChildren.length : void 0;
        }
        function axConfirmedAriaLabelHeadingVisibleTextItemCount(el, role) {
          if (role !== "heading" || !accessibilityNodes.length)
            return void 0;
          if (!el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby"))
            return void 0;
          if (el.querySelector("button, [role='button'], a[href], [role='link']"))
            return void 0;
          const ariaLabel = normalize(el.getAttribute("aria-label"));
          const axNode = axNodeForElementRole(el, "heading");
          const axName = normalize(axNode?.name);
          if (!ariaLabel || !axName || axName !== ariaLabel)
            return void 0;
          const parts = [];
          for (const child of Array.from(el.childNodes || [])) {
            if (child.nodeType === Node.TEXT_NODE) {
              const text2 = normalize(child.textContent);
              if (text2)
                parts.push({ text: text2 });
              continue;
            }
            if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child))
              continue;
            const text = normalize(readableText(child));
            if (text)
              parts.push({ text, el: child });
          }
          if (parts.length <= 1)
            return void 0;
          const joined = normalize(parts.map((part) => part.text).join(" "));
          const joinedWithoutTerminalPunctuation = normalize(joined.replace(/\s*[.!?]$/u, ""));
          const axNameWithoutTerminalPunctuation = normalize(axName.replace(/\s*[.!?]$/u, ""));
          if (joined !== axName && (!joinedWithoutTerminalPunctuation || joinedWithoutTerminalPunctuation !== axNameWithoutTerminalPunctuation)) {
            return void 0;
          }
          return parts.reduce((total, part) => total + (part.el ? parenthesizedBoundaryPartCount(part.el) || 1 : 1), 0);
        }
        function axConfirmedSpaceBeforePunctuationHeadingName(el, role) {
          if (role !== "heading" || !accessibilityNodes.length)
            return void 0;
          const ariaLabel = normalize(el.getAttribute("aria-label"));
          if (!ariaLabel || !/\s+[.!?]$/u.test(ariaLabel))
            return void 0;
          const axName = normalize(axNodeForElementRole(el, "heading")?.name);
          return axName === ariaLabel ? ariaLabel : void 0;
        }
        function accessibleName(el, role) {
          const tag = el.tagName.toLowerCase();
          const ariaLabel = normalize(el.getAttribute("aria-label"));
          const labelledBy = textFromIdRefs(el.getAttribute("aria-labelledby"));
          const labelledByWithControlNames = role === "region" && !labelledBy ? textFromIdRefsOrControlNames(el.getAttribute("aria-labelledby")) : void 0;
          const nativeLabel = ["input", "select", "textarea", "meter", "progress"].includes(tag) ? labelForControl(el) : void 0;
          const axNativeSelectLabelName = axConfirmedNativeSelectLabelName(el, role, labelledBy || nativeLabel);
          if (axNativeSelectLabelName)
            return axNativeSelectLabelName;
          if (ariaLabel !== void 0 && role !== "searchbox" && ["input", "select"].includes(tag)) {
            return ariaLabel;
          }
          if (nativeLabel)
            return nativeLabel;
          if (ariaLabel !== void 0)
            return ariaLabel;
          if (labelledBy || labelledByWithControlNames) {
            const resolvedLabelledBy = labelledBy || labelledByWithControlNames;
            return axConfirmedLabelledTabPanelName(el, role, resolvedLabelledBy) || axLabelBoundaryName(el, role, resolvedLabelledBy) || resolvedLabelledBy;
          }
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
            if ((role === "table" || role === "grid") && tag === "table") {
              const caption = Array.from(el.children || []).find((child) => child.tagName?.toLowerCase() === "caption" && !isHidden(child));
              const captionText = caption ? readableText(caption) : void 0;
              if (captionText)
                return captionText;
            }
            return normalize(el.getAttribute("title"));
          }
          if (role === "group" && !el.matches(interactiveSelector)) {
            if (tag === "fieldset")
              return fieldsetLegendText(el);
            if (tag === "map")
              return imageMapGroupName(el);
            const compactLabel = compactInputActionGroupLabel(el);
            if (compactLabel)
              return compactLabel;
            const iframe = singleTitledIframeChild(el);
            if (iframe)
              return frameName(iframe);
            if (isFocusableImageListItem(el))
              return nestedImageLabel(el);
            if (isFocusableStructuredListItemGroup(el)) {
              return focusableStructuredListItemName(el);
            }
            const listItemDescendantGroupText = focusableGenericListItemDescendantGroupText(el);
            if (listItemDescendantGroupText)
              return listItemDescendantGroupText;
            return normalize(el.getAttribute("title"));
          }
          if (tag === "img")
            return normalize(el.getAttribute("alt"));
          if (tag === "area")
            return normalize(el.getAttribute("alt")) || areaHrefFallbackName(el);
          if (tag === "object" || tag === "embed")
            return normalize(el.getAttribute("title"));
          if (["input", "select", "textarea"].includes(tag) && role !== "button") {
            if (tag === "input" && nativeDatalistElement(el)) {
              return nativeLabel || normalize(el.getAttribute("placeholder"));
            }
            return nativeLabel;
          }
          if (role === "link") {
            const contentName = linkContentName(el);
            if (contentName) {
              return axLinkedCardContentName(el, role, contentName) || renderedCaseName(el, role, contentName) || axParentheticalName(el, role, contentName) || axWhitespaceOnlyLinkName(el, role, contentName) || contentName;
            }
            const titleName = normalize(el.getAttribute("title"));
            if (titleName)
              return renderedCaseName(el, role, titleName) || titleName;
            return hrefSlugLabel(el);
          }
          if (role === "button") {
            const nativeInputButtonName = axConfirmedNativeInputButtonName(el, role);
            if (nativeInputButtonName)
              return nativeInputButtonName;
            const contentName = buttonContentName(el);
            if (contentName) {
              return axGeneratedTrailingDisclosureButtonName(el, role, contentName) || renderedCaseName(el, role, contentName) || contentName;
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
        function labelledNavigationHeaderStopText(el, role, name) {
          if (role !== "navigation")
            return void 0;
          if (!el?.hasAttribute?.("aria-labelledby"))
            return void 0;
          if (el.hasAttribute("aria-label"))
            return void 0;
          const refs = (el.getAttribute("aria-labelledby") || "").split(/\s+/).map((ref) => normalize(ref)).filter(Boolean);
          if (refs.length !== 1)
            return void 0;
          const label = resolveIdRef(refs[0]);
          if (!label || label.parentElement !== el || isHidden(label))
            return void 0;
          if (label.matches?.(interactiveSelector))
            return void 0;
          if (label.tagName?.toLowerCase() !== "header")
            return void 0;
          if (isStopElement(label))
            return void 0;
          const labelText = readableText(label);
          if (!labelText || labelText !== normalize(name))
            return void 0;
          if (!firstVisibleListAfterDirectLabel(el, label))
            return void 0;
          return labelText;
        }
        function firstVisibleListAfterDirectLabel(container, label) {
          let seenLabel = false;
          for (const child of Array.from(container?.children || [])) {
            if (isHidden(child))
              continue;
            if (child === label) {
              seenLabel = true;
              continue;
            }
            if (!seenLabel)
              continue;
            const role = implicitRole(child);
            if (role === "list")
              return child;
            const childList = Array.from(child.querySelectorAll?.("ul, ol, dl, [role='list']") || []).find((candidate) => !isHidden(candidate) && implicitRole(candidate) === "list");
            if (childList)
              return childList;
            if (isStopElement(child) || readableText(child) || hasVisibleInteractiveDescendant(child)) {
              return void 0;
            }
          }
          return void 0;
        }
        function singleDescendantAbbrTitle(el) {
          const abbrs = Array.from(el.querySelectorAll("abbr[title]")).filter((abbr) => !isHidden(abbr) && normalize(abbr.getAttribute("title")));
          return abbrs.length === 1 ? normalize(abbrs[0].getAttribute("title")) : void 0;
        }
        function leadingDescendantAbbrTitle(el) {
          const abbr = Array.from(el.querySelectorAll("abbr[title]")).find((candidate) => !isHidden(candidate) && normalize(candidate.getAttribute("title")));
          return normalize(abbr?.getAttribute("title"));
        }
        function tableCellAbbrTitleButtonName(el, role) {
          if (role !== "button")
            return void 0;
          if (!el.closest("td,th,[role='cell'],[role='gridcell'],[role='rowheader'],[role='columnheader']")) {
            return void 0;
          }
          if (!el.closest("table,[role='table'],[role='grid']"))
            return void 0;
          const title = leadingDescendantAbbrTitle(el);
          if (!title)
            return void 0;
          const label = buttonContentName(el);
          if (!label?.startsWith(title))
            return void 0;
          const repeatedPrefix = normalize(title.split(/\s+[–-]\s+/u)[0]);
          let suffix = normalize(label.slice(title.length));
          if (repeatedPrefix && suffix?.startsWith(`${repeatedPrefix} `)) {
            suffix = normalize(suffix.slice(repeatedPrefix.length));
          }
          return normalize([title, suffix].filter(Boolean).join(" "));
        }
        function articleNameFromFirstHeading(el, role) {
          if (role !== "article")
            return void 0;
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title")) {
            return void 0;
          }
          const firstVisibleChild = Array.from(el.children || []).find((child) => !isHidden(child) && Boolean(readableText(child)));
          if (!firstVisibleChild || implicitRole(firstVisibleChild) !== "heading") {
            return void 0;
          }
          return accessibleName(firstVisibleChild, "heading") || readableText(firstVisibleChild);
        }
        function unnamedAxArticleHasLinkedLevelTwoHeading(el) {
          const axArticle = axNodeForElementRole(el, "article");
          if (!axArticle || normalize(axArticle.name))
            return false;
          const heading = Array.from(el.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading']")).find((candidate) => !isHidden(candidate) && candidate.closest("article,[role='article']") === el && Boolean(readableText(candidate)));
          if (!heading)
            return false;
          const tag = heading.tagName?.toLowerCase() || "";
          const level = Number.parseInt(heading.getAttribute("aria-level") || tag.slice(1), 10) || 2;
          if (level !== 2)
            return false;
          return Boolean(heading.closest("a[href],[role='link']"));
        }
        function directListArticleCardContextEndName(el, role) {
          if (role !== "article")
            return void 0;
          if (unnamedAxArticleHasLinkedLevelTwoHeading(el))
            return void 0;
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
            return void 0;
          }
          if (directListArticleCardFor(el) !== el)
            return void 0;
          if (!hasArticleDateMetadata(el))
            return void 0;
          const heading = Array.from(el.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading']")).find((candidate) => !isHidden(candidate) && candidate.closest("article,[role='article']") === el && Boolean(readableText(candidate)));
          if (!heading)
            return void 0;
          const headingLink = Array.from(heading.querySelectorAll("a[href], [role='link']")).find((candidate) => !isHidden(candidate) && Boolean(readableText(candidate)));
          return (headingLink ? accessibleName(headingLink, "link") : void 0) || accessibleName(heading, "heading") || readableText(heading);
        }
        function siblingArticleCardContextEndName(el, role) {
          if (role !== "article")
            return void 0;
          if (unnamedAxArticleHasLinkedLevelTwoHeading(el))
            return void 0;
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
            return void 0;
          }
          if (!isSiblingArticleCollectionItem(el))
            return void 0;
          if (!hasArticleDateMetadata(el))
            return void 0;
          const heading = Array.from(el.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading']")).find((candidate) => !isHidden(candidate) && candidate.closest("article,[role='article']") === el && Boolean(readableText(candidate)));
          if (!heading)
            return void 0;
          const headingLink = Array.from(heading.querySelectorAll("a[href], [role='link']")).find((candidate) => !isHidden(candidate) && Boolean(readableText(candidate)));
          return (headingLink ? accessibleName(headingLink, "link") : void 0) || accessibleName(heading, "heading") || readableText(heading);
        }
        function hasStructuredInferredArticleCardContent(article) {
          if (!article || implicitRole(article) !== "article")
            return false;
          const heading = Array.from(article.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading']")).find((candidate) => !isHidden(candidate) && candidate.closest("article,[role='article']") === article && Boolean(readableText(candidate)));
          if (!heading)
            return false;
          const standaloneAction = Array.from(article.querySelectorAll("a[href], button, [role='link'], [role='button']")).some((candidate) => !isHidden(candidate) && candidate.closest("article,[role='article']") === article && !candidate.closest("p,li,h1,h2,h3,h4,h5,h6,[role='heading']") && Boolean(readableText(candidate) || accessibleName(candidate, implicitRole(candidate))));
          return Boolean(standaloneAction);
        }
        function inferredStructuredArticleCardContextEndName(el, role, articleHeadingName, accessibleRoleName, announcementName) {
          if (role !== "article")
            return void 0;
          if (!articleHeadingName || accessibleRoleName || announcementName !== articleHeadingName) {
            return void 0;
          }
          return hasStructuredInferredArticleCardContent(el) ? articleHeadingName : void 0;
        }
        function isStructuredArticleCardNamingHeading(el, role) {
          if (role !== "heading")
            return false;
          const article = el.closest("article,[role='article']");
          if (!hasStructuredInferredArticleCardContent(article))
            return false;
          const articleHeadingName = articleNameFromFirstHeading(article, "article");
          const headingName = accessibleName(el, role) || readableText(el);
          return Boolean(articleHeadingName && headingName && articleHeadingName === headingName);
        }
        function isStandaloneTextLabelBeforeStructuredArticleCard(el, role) {
          if (role !== "text")
            return false;
          const label = normalize(textWithoutInteractive(el) || readableText(el));
          if (!label || label.length > 80)
            return false;
          if (el.closest("article,[role='article']"))
            return false;
          if (el.querySelector?.(interactiveSelector))
            return false;
          for (let current = el; current?.parentElement; current = current.parentElement) {
            const next = nextMeaningfulElementSibling(current);
            if (!next)
              continue;
            const article = implicitRole(next) === "article" ? next : Array.from(next.querySelectorAll?.("article,[role='article']") || []).find((candidate) => !isHidden(candidate));
            if (hasStructuredInferredArticleCardContent(article))
              return true;
            if (readableText(next) || hasVisibleInteractiveDescendant(next))
              return false;
          }
          return false;
        }
        function isArticleInlineLinkCollectionContext(el, role) {
          if (role !== "article")
            return false;
          if (!isSiblingArticleCollectionItem(el))
            return false;
          return Array.from(el.children || []).some((child) => !isHidden(child) && child.tagName?.toLowerCase() === "p" && Boolean(articleInlineTextLinkFragments(child)));
        }
        function hasArticleDateMetadata(el) {
          const hasTime = Array.from(el.querySelectorAll("time")).some((time) => !isHidden(time) && Boolean(readableText(time)));
          if (hasTime)
            return true;
          return Array.from(el.querySelectorAll("small")).some((small) => {
            if (isHidden(small))
              return false;
            return /^\(?\d{4}[-–—][A-Za-z]{3}[-–—]\d{2}\)?$/.test(readableText(small) || "");
          });
        }
        function isCompactStandaloneArticleContext(el, role) {
          if (role !== "article")
            return false;
          if (isSiblingArticleCollectionItem(el))
            return false;
          if (hasVisibleInteractiveDescendant(el))
            return false;
          if (el.querySelector("h1,h2,h3,h4,h5,h6,[role='heading'],ul,ol,[role='list'],table,[role='table']")) {
            return false;
          }
          const text = readableText(el);
          return Boolean(text && text.length <= 240);
        }
        function shouldSuppressSingletonDocumentArticleEnd(el, role) {
          if (role !== "article")
            return false;
          if (isSiblingArticleCollectionItem(el))
            return false;
          if (isCompactStandaloneArticleContext(el, role))
            return false;
          if (el.querySelector("h1,[role='heading'][aria-level='1']"))
            return true;
          const firstVisibleChild = Array.from(el.children || []).find((child) => !isHidden(child) && Boolean(readableText(child) || hasVisibleInteractiveDescendant(child)));
          return Boolean(firstVisibleChild && implicitRole(firstVisibleChild) === "navigation");
        }
        function isContextRole(el, role) {
          if (role === "article")
            return true;
          if (role === "alert" && isNamedAlertBoundary(el, role))
            return true;
          return contextRoles.has(role);
        }
        function hasPresentationRole(el) {
          const role = normalize(el?.getAttribute?.("role"))?.toLowerCase();
          return role === "none" || role === "presentation";
        }
        function presentationAccordionGroupForItem(item) {
          if (!item || item.nodeType !== Node.ELEMENT_NODE || isHidden(item))
            return null;
          if (item.tagName?.toLowerCase() !== "li" || !hasPresentationRole(item))
            return null;
          const visibleChildren = Array.from(item.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 1)
            return null;
          const button = visibleChildren[0];
          if (button.tagName?.toLowerCase() !== "button")
            return null;
          if (parseBooleanAttribute(button, "aria-expanded") !== false)
            return null;
          if (normalizedPopup(button))
            return null;
          const label = normalize(accessibleName(button, "button") || readableText(button));
          if (!label)
            return null;
          const group = nextVisibleElementSibling(item);
          if (!group || group.parentElement !== item.parentElement)
            return null;
          const groupLabel = normalize(group.getAttribute?.("aria-label") || textFromIdRefs(group.getAttribute?.("aria-labelledby")));
          if (groupLabel !== label)
            return null;
          const links = Array.from(group.querySelectorAll?.("a[href], [role='link']") || []).filter((link) => !isHidden(link));
          return links.length ? group : null;
        }
        function isPresentationCollapsedAccordionList(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!["ul", "ol"].includes(el.tagName?.toLowerCase()))
            return false;
          if (!hasPresentationRole(el))
            return false;
          const items = Array.from(el.children || []).filter((child) => !isHidden(child) && child.tagName?.toLowerCase() === "li" && hasPresentationRole(child));
          return Boolean(items.length && items.every((item) => Boolean(presentationAccordionGroupForItem(item))));
        }
        function isPresentationCollapsedAccordionListItem(el) {
          const parent = el?.parentElement;
          return Boolean(presentationAccordionGroupForItem(el) && parent && isPresentationCollapsedAccordionList(parent));
        }
        function isPresentationCollapsedAccordionButton(el) {
          const item = el?.parentElement;
          if (!item || presentationAccordionGroupForItem(item) === null)
            return false;
          return isPresentationCollapsedAccordionListItem(item);
        }
        function isSingleLinkPresentationListItem(item) {
          if (!item || item.nodeType !== Node.ELEMENT_NODE || isHidden(item))
            return false;
          if (item.tagName?.toLowerCase() !== "li" || !hasPresentationRole(item))
            return false;
          if (directOwnText(item))
            return false;
          const visibleChildren = Array.from(item.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 1)
            return false;
          const link = visibleChildren[0];
          if (link.tagName?.toLowerCase() !== "a" && link.getAttribute?.("role") !== "link") {
            return false;
          }
          if (!link.hasAttribute("href") && link.getAttribute?.("role") !== "link")
            return false;
          return Boolean(readableText(link) || normalize(link.getAttribute?.("aria-label")));
        }
        function presentationLinkListGroupLabel(el) {
          const parent = el?.parentElement;
          if (!parent || isHidden(parent))
            return void 0;
          if (!["div", "section"].includes(parent.tagName?.toLowerCase()))
            return void 0;
          const label = normalize(parent.getAttribute?.("aria-label") || textFromIdRefs(parent.getAttribute?.("aria-labelledby")));
          if (!label)
            return void 0;
          const visibleChildren = Array.from(parent.children || []).filter((child) => !isHidden(child));
          if (!visibleChildren.includes(el))
            return void 0;
          if (visibleChildren.some((child) => child !== el && child.matches?.(interactiveSelector))) {
            return void 0;
          }
          const visibleTextChildren = visibleChildren.filter((child) => child !== el && !child.matches?.("script, style, template") && Boolean(readableText(child)));
          if (visibleTextChildren.length !== 1)
            return void 0;
          return normalize(readableText(visibleTextChildren[0])) === label ? label : void 0;
        }
        function isPresentationLinkList(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!["ul", "ol"].includes(el.tagName?.toLowerCase()))
            return false;
          if (!hasPresentationRole(el))
            return false;
          if (directOwnText(el))
            return false;
          if (!presentationLinkListGroupLabel(el))
            return false;
          const items = Array.from(el.children || []).filter((child) => !isHidden(child));
          return Boolean(items.length && items.every((item) => isSingleLinkPresentationListItem(item)));
        }
        function isPresentationLinkListItem(el) {
          const parent = el?.parentElement;
          return Boolean(parent && isPresentationLinkList(parent) && isSingleLinkPresentationListItem(el));
        }
        function isFocusableRichTextParagraphGroup(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName?.toLowerCase() !== "span")
            return false;
          if (el.getAttribute("role"))
            return false;
          if (el.getAttribute("tabindex") !== "0")
            return false;
          if ([
            "aria-label",
            "aria-labelledby",
            "aria-controls",
            "aria-describedby",
            "aria-expanded",
            "aria-haspopup"
          ].some((attribute) => el.hasAttribute(attribute))) {
            return false;
          }
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length < 2)
            return false;
          if (visibleChildren.some((child) => child.tagName?.toLowerCase() !== "p")) {
            return false;
          }
          if (!readableText(el))
            return false;
          return visibleChildren.some((child) => Boolean(child.querySelector?.("a[href], [role='link'], b, strong, em, i") || directOwnText(child) && child.children?.length));
        }
        function isFocusableHeadingRichTextNavigationGroup(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName?.toLowerCase() !== "div")
            return false;
          if (el.getAttribute("role"))
            return false;
          if (el.getAttribute("tabindex") !== "0")
            return false;
          if ([
            "aria-label",
            "aria-labelledby",
            "aria-controls",
            "aria-describedby",
            "aria-expanded",
            "aria-haspopup"
          ].some((attribute) => el.hasAttribute(attribute))) {
            return false;
          }
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          const directHeadings = visibleChildren.filter((child) => /^h[1-6]$/i.test(child.tagName || "") || child.getAttribute?.("role") === "heading");
          if (directHeadings.length !== 1 || !readableText(directHeadings[0])) {
            return false;
          }
          const navigation = Array.from(el.querySelectorAll("nav, [role='navigation']")).filter((candidate) => !isHidden(candidate));
          if (navigation.length !== 1)
            return false;
          if (!accessibleName(navigation[0], "navigation"))
            return false;
          if (navigation[0].querySelector?.("a[href], button, [role='link'], [role='button']")) {
            return false;
          }
          const richTextContainers = visibleChildren.filter((child) => child !== directHeadings[0] && child.contains?.(navigation[0]) && child.querySelector?.("p"));
          if (richTextContainers.length !== 1)
            return false;
          const paragraphs = Array.from(richTextContainers[0].querySelectorAll("p")).filter((paragraph) => !isHidden(paragraph) && Boolean(readableText(paragraph)));
          if (paragraphs.length < 2)
            return false;
          if (!paragraphs.some((paragraph) => paragraph.querySelector?.("a[href], [role='link']"))) {
            return false;
          }
          if (!paragraphs.some((paragraph) => paragraph.querySelector?.("b, strong, em, i"))) {
            return false;
          }
          const controls = Array.from(el.querySelectorAll(interactiveSelector)).filter((control) => !isHidden(control));
          return controls.every((control) => {
            const role = implicitRole(control);
            return role === "link" && paragraphs.some((paragraph) => paragraph.contains(control));
          });
        }
        function focusableRichTextParagraphGroupText(el) {
          if (isFocusableHeadingRichTextNavigationGroup(el)) {
            const navigation = Array.from(el.querySelectorAll("nav, [role='navigation']")).find((candidate) => !isHidden(candidate));
            const navigationLabel = accessibleName(navigation, "navigation");
            const directHeading = Array.from(el.children || []).find((child) => !isHidden(child) && (/^h[1-6]$/i.test(child.tagName || "") || child.getAttribute?.("role") === "heading"));
            const paragraphs = Array.from(el.querySelectorAll("p")).filter((paragraph) => !isHidden(paragraph) && Boolean(readableText(paragraph)));
            return normalize([
              readableText(directHeading),
              ...paragraphs.map((paragraph) => readableText(paragraph)),
              navigationLabel
            ].filter(Boolean).join(" "));
          }
          if (!isFocusableRichTextParagraphGroup(el))
            return void 0;
          return normalize(Array.from(el.children || []).filter((child) => !isHidden(child) && child.tagName?.toLowerCase() === "p").map((child) => readableText(child)).filter(Boolean).join(" "));
        }
        function axConfirmedFocusableFeedbackGroupText(el) {
          if (!accessibilityNodes.length)
            return void 0;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName?.toLowerCase() !== "div")
            return void 0;
          if (el.getAttribute("tabindex") !== "-1")
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
            return void 0;
          }
          const axNode = axNodeForElementRole(el, "generic");
          if (!axNode || axNode.properties?.focusable !== true || normalize(axNode.name)) {
            return void 0;
          }
          const headings = Array.from(el.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']")).filter((candidate) => !isHidden(candidate) && Boolean(readableText(candidate)));
          if (headings.length !== 1)
            return void 0;
          const lists = Array.from(el.querySelectorAll("ul, ol, [role='list']")).filter((candidate) => !isHidden(candidate));
          if (lists.length !== 1)
            return void 0;
          const list = lists[0];
          const headingText = normalize(readableText(headings[0]));
          const headingNode = axNodeForElementRole(headings[0], "heading");
          const listNode = axNodeForElementRole(list, "list");
          if (!headingText || !headingNode || normalize(headingNode.name) !== headingText || !listNode) {
            return void 0;
          }
          const listItems = Array.from(list.children || []).filter((candidate) => isListItem(candidate) && !isHidden(candidate));
          if (listItems.length !== 2)
            return void 0;
          const listControls = listItems.map((item) => {
            const controls = Array.from(item.querySelectorAll("button, [role='button'], a[href]")).filter((candidate) => !isHidden(candidate));
            return controls.length === 1 ? controls[0] : void 0;
          });
          if (listControls.some((control) => !control))
            return void 0;
          const visibleControls = Array.from(el.querySelectorAll("button, [role='button'], a[href]")).filter((candidate) => !isHidden(candidate));
          if (visibleControls.length !== 3)
            return void 0;
          const trailingControls = visibleControls.filter((control) => !list.contains(control));
          if (trailingControls.length !== 1)
            return void 0;
          const allControls = [...listControls, trailingControls[0]];
          if (allControls.some((control) => {
            const role = implicitRole(control);
            const axControl = axNodeForElementRole(control, role);
            return role !== "button" || !axControl || normalizedAxRole(axControl.role) !== "button" || axControl.properties?.focusable !== true || !normalize(axControl.name);
          })) {
            return void 0;
          }
          const controlText = allControls.map((control) => normalize(accessibleName(control, "button") || readableText(control))).filter(Boolean);
          if (controlText.length !== 3)
            return void 0;
          return normalize([headingText, ...controlText].join(" "));
        }
        function isAxConfirmedFocusableFeedbackGroup(el) {
          return Boolean(axConfirmedFocusableFeedbackGroupText(el));
        }
        function isSiblingArticleCollectionItem(el) {
          const parent = el?.parentElement;
          if (!parent)
            return false;
          const siblingArticles = Array.from(parent.children || []).filter((child) => !isHidden(child) && implicitRole(child) === "article");
          return siblingArticles.length >= 2;
        }
        function implicitRole(el) {
          const tag = el.tagName.toLowerCase();
          const explicit = el.getAttribute("role");
          if (explicit === "img")
            return "image";
          if (hasPresentationRole(el)) {
            if (isPresentationCollapsedAccordionList(el))
              return "";
            if (isPresentationCollapsedAccordionListItem(el))
              return "";
            if (isPresentationLinkList(el))
              return "";
            if (isPresentationLinkListItem(el))
              return "";
            if (tag === "li" && !hasPresentationRole(el.parentElement))
              return "";
          }
          if (explicit === "region" && isControlledTablistDescriptionRegion(el)) {
            return "paragraph";
          }
          if (explicit === "tablist" && isLabelledAriaTabGroup(el)) {
            return "group";
          }
          if (explicit && explicit !== "none" && explicit !== "presentation") {
            return explicit;
          }
          if (/^h[1-6]$/.test(tag))
            return "heading";
          if (directNativeDetailsForSummary(el))
            return "button";
          if (tag === "a" && el.hasAttribute("href"))
            return "link";
          if (tag === "button")
            return "button";
          if (isFocusableImageListItem(el))
            return "group";
          if (isFocusableStructuredListItemGroup(el))
            return "group";
          if (isFocusableRichTextParagraphGroup(el))
            return "group";
          if (isFocusableHeadingRichTextNavigationGroup(el))
            return "group";
          if (isFocusableGenericListItemDescendantGroup(el))
            return "group";
          if (isAxConfirmedFocusableFeedbackGroup(el))
            return "group";
          if (isFocusableSummaryPanelGroup(el, "group"))
            return "group";
          if (isScanRootLeadingFocusableIframeStop(el))
            return "group";
          if (isSingleTitledIframeWrapper(el))
            return "group";
          if (tag === "iframe" && singleTitledIframeChild(el.parentElement) === el)
            return "frame";
          if (tag === "select")
            return el.hasAttribute("multiple") ? "listbox" : "combobox";
          if (tag === "textarea")
            return "textbox";
          if (tag === "hr")
            return "separator";
          if (tag === "progress")
            return "progressbar";
          if (tag === "meter")
            return "meter";
          if (tag === "address")
            return "paragraph";
          if (tag === "object" || tag === "embed")
            return "object";
          if (tag === "canvas" && readableText(el))
            return "text";
          if (tag === "area" && el.hasAttribute("href"))
            return "link";
          if (tag === "map" && imageMapGroupName(el))
            return "group";
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
            if (type === "number")
              return "spinbutton";
            if (type === "range")
              return "slider";
            if (nativeDatalistElement(el))
              return "combobox";
            return "textbox";
          }
          if (tag === "header") {
            return hasSectioningHeaderFooterAncestor(el) ? "" : "banner";
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
            if (axConfirmedNamedSectionFooterName(el))
              return "sectionfooter";
            return hasSectioningHeaderFooterAncestor(el) ? "" : "contentinfo";
          }
          if (tag === "aside")
            return "complementary";
          if (tag === "form" && explicit === "search")
            return "search";
          if (tag === "form" && (isNamedNativeForm(el) || isNamedSingleControlForm(el))) {
            return "form";
          }
          if (tag === "ul" || tag === "ol" || tag === "dl")
            return "list";
          if (tag === "li")
            return "listitem";
          if (tag === "portal" && directOwnText(el))
            return "text";
          if (tag === "dt")
            return "term";
          if (tag === "dd") {
            return isDefinitionListItem(el) && !hasVisibleInteractiveDescendant(el) ? "paragraph" : "";
          }
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
          if (tag === "img" && isImageMapImage(el))
            return "";
          if (tag === "img")
            return "image";
          if (tag === "svg")
            return "image";
          if (tag === "dialog")
            return "dialog";
          if (tag === "fieldset" && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || fieldsetPromptText(el) || controlFieldsetLegendText(el) || visuallyHiddenFieldsetLegendText(el))) {
            return "group";
          }
          if (tag === "label" && isCompositeNativeControlLabel(el))
            return "text";
          if (tag === "label" && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) && hasVisibleInteractiveDescendant(el)) {
            return "group";
          }
          if (tag === "blockquote")
            return el.closest("figure") ? "blockquote" : "paragraph";
          if (tag === "code" && !el.closest("pre, p, li, h1, h2, h3, h4, h5, h6, [role='heading'], [role='button'], button, a[href]") && !el.querySelector("*") && normalize(readableText(el) || el.textContent)) {
            return "text";
          }
          if (tag === "p" || tag === "figcaption" || tag === "time" || tag === "small" && (inlineSemanticTextLinkFragments(el) || isDirectTextChildOfNamedSectionFooter(el) || !el.closest(interactiveSelector) && !el.querySelector(interactiveSelector) && /^Showing\s+\p{N}+\s+of\s+\p{N}+\b/iu.test(normalize(readableText(el) || el.textContent) || "") && Boolean(normalize(readableText(el) || el.textContent))) || isRichProductCardOfferBanner(el) || isStructuredListBodyText(el) || isInteractiveListBodyText(el) || priceDisclosureFragments(el) || inlinePhrasingBoundaryFragments(el)) {
            return "paragraph";
          }
          if (["strong", "b", "em", "i"].includes(tag) && !el.closest(interactiveSelector) && !el.closest("li,[role='listitem']") && !el.querySelector(interactiveSelector) && Boolean(normalize(readableText(el) || el.textContent))) {
            return "text";
          }
          if (joinedPriceDisclosureText(el))
            return "text";
          if (groupedMetricCardText(el))
            return "text";
          if (isCustomHeadedTextCardBody(el))
            return "text";
          if (footerInlineBoundaryTextFragments(el))
            return tag === "p" ? "paragraph" : "text";
          if (expandedRegionInlineLinkFragments(el))
            return "paragraph";
          if (inlineTextLinkFragments(el))
            return "paragraph";
          if (["section", "div"].includes(tag) && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))) {
            return tag === "section" ? "region" : "group";
          }
          if (compactInputActionGroupLabel(el))
            return "group";
          if (isButtonShellClusterGroup(el))
            return "group";
          if (isButtonShellGroup(el))
            return "group";
          if (tag === "div" && isDecorativeGenericGroupBeforeNativeLinks(el, "group"))
            return "group";
          if (isCustomElement(el) && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || hasShadowRootContent(el)) && hasVisibleInteractiveDescendant(el)) {
            return "group";
          }
          if (isSplitHeaderListItemHeaderContent(el)) {
            return "";
          }
          if (["span", "div"].includes(tag) && directOwnText(el) && !el.querySelector(interactiveSelector) && !el.closest(interactiveSelector) && (isSplitTextListItemBlock(el) || isExpandedRegionBodyText(el) || isCardDetailTextLeaf(el) || isRichProductCardTextFragment(el) || hasImageLinkWithCaptionListItemContent(el.closest("li,[role='listitem']")) || !el.closest("p, li, h1, h2, h3, h4, h5, h6"))) {
            return "text";
          }
          return "";
        }
        function hasSectioningHeaderFooterAncestor(el) {
          return Boolean(el.closest([
            "main",
            "article",
            "aside",
            "nav",
            "section",
            "[role='main']",
            "[role='article']",
            "[role='complementary']",
            "[role='navigation']",
            "[role='region']"
          ].join(",")));
        }
        function imageMapNameFromUseMap(el) {
          const raw = normalize(el?.getAttribute?.("usemap"));
          if (!raw?.startsWith("#"))
            return void 0;
          return normalize(raw.slice(1));
        }
        function mapElementByName(name) {
          if (!name)
            return null;
          return document.querySelector(`map[name='${cssEscape(name)}']`);
        }
        function adjacentImageMapForImage(el) {
          const next = el?.nextElementSibling;
          return next?.tagName?.toLowerCase?.() === "map" ? next : null;
        }
        function imageForMap(el) {
          const name = normalize(el?.getAttribute?.("name"));
          if (!name)
            return null;
          return document.querySelector(`img[usemap='#${cssEscape(name)}']`) || (el.previousElementSibling?.tagName?.toLowerCase?.() === "img" ? el.previousElementSibling : null);
        }
        function isImageMapImage(el) {
          const map = mapElementByName(imageMapNameFromUseMap(el)) || adjacentImageMapForImage(el);
          return Boolean(map && map.querySelector("area[href]"));
        }
        function imageMapGroupName(el) {
          if (el?.tagName?.toLowerCase?.() !== "map")
            return void 0;
          const image = imageForMap(el);
          return image && !isHidden(image) ? normalize(image.getAttribute("alt")) : void 0;
        }
        function nativeRangeValueText(el, role) {
          const tag = el?.tagName?.toLowerCase?.();
          if (role !== "progressbar" && role !== "meter")
            return void 0;
          if (tag === "progress" && !el.hasAttribute("value"))
            return "indeterminate";
          const rawValue = Number.parseFloat(el.getAttribute("value") || "");
          if (!Number.isFinite(rawValue))
            return void 0;
          const rawMin = tag === "meter" ? Number.parseFloat(el.getAttribute("min") || "0") : 0;
          const min = Number.isFinite(rawMin) ? rawMin : 0;
          if (!el.hasAttribute("max") && rawValue > 1) {
            return `${Math.round(Math.max(0, Math.min(100, rawValue)))}%`;
          }
          const rawMax = Number.parseFloat(el.getAttribute("max") || "1");
          const max = Number.isFinite(rawMax) && rawMax > min ? rawMax : 1;
          const percent = Math.max(0, Math.min(100, (rawValue - min) / (max - min) * 100));
          return `${Math.round(percent)}%`;
        }
        function nativeDatalistElement(el) {
          if (el?.tagName?.toLowerCase?.() !== "input")
            return null;
          const listId = normalize(el.getAttribute("list"));
          if (!listId)
            return null;
          const list = document.getElementById(listId);
          return list?.tagName?.toLowerCase?.() === "datalist" ? list : null;
        }
        function urlBasename(value) {
          const normalized = normalize(value);
          if (!normalized)
            return void 0;
          const withoutQuery = normalized.split(/[?#]/u)[0];
          const basename = withoutQuery.split("/").filter(Boolean).pop();
          return normalize(basename);
        }
        function documentUrlBasename() {
          return urlBasename(document.location?.pathname || document.location?.href);
        }
        function areaHrefFallbackName(el) {
          if (el?.tagName?.toLowerCase?.() !== "area")
            return void 0;
          if (normalize(el.getAttribute("alt")))
            return void 0;
          const href = normalize(el.getAttribute("href"));
          if (!href)
            return void 0;
          if (href.startsWith("#"))
            return documentUrlBasename();
          return urlBasename(href);
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
        function isHiddenConsentOnlyListItem(el) {
          if (!isListItem(el))
            return false;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length)
            return false;
          const hiddenConsentNodes = Array.from(el.querySelectorAll("[data-sr-voiceover-hidden-consent='true']")).filter((node) => node.closest("li,[role='listitem']") === el && isHidden(node));
          if (!hiddenConsentNodes.length)
            return false;
          const visibleText = normalize(textWithoutInteractive(el) || readableText(el));
          return !visibleText;
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
        function isAxConfirmedRegionIntroImage(el) {
          if (el?.tagName?.toLowerCase() !== "svg")
            return false;
          if (accessibleName(el, "image"))
            return false;
          if (!hasAxRole(el, "image"))
            return false;
          const labelledRegion = el.closest("[aria-labelledby]");
          if (!labelledRegion)
            return false;
          for (let wrapper = el.parentElement; wrapper && wrapper !== labelledRegion; wrapper = wrapper.parentElement) {
            if (readableText(wrapper))
              continue;
            const next = Array.from(wrapper.parentElement?.children || []).slice(Array.from(wrapper.parentElement?.children || []).indexOf(wrapper) + 1).find((sibling) => !isHidden(sibling));
            if (next && implicitRole(next) === "heading") {
              return idRefsContain(labelledRegion.getAttribute("aria-labelledby"), next.id);
            }
          }
          return false;
        }
        function isAxConfirmedHeadingIntroImage(el) {
          if (el?.tagName?.toLowerCase() !== "svg")
            return false;
          if (accessibleName(el, "image"))
            return false;
          if (!hasAxRole(el, "image"))
            return false;
          for (let wrapper = el.parentElement; wrapper; wrapper = wrapper.parentElement) {
            if (readableText(wrapper))
              return false;
            const parent = wrapper.parentElement;
            if (!parent)
              return false;
            const siblings = Array.from(parent.children || []);
            const next = siblings.slice(siblings.indexOf(wrapper) + 1).find((sibling) => !isHidden(sibling));
            if (next) {
              const heading = firstVisibleDescendantMatching(next, (candidate) => implicitRole(candidate) === "heading");
              return Boolean(heading && readableText(heading));
            }
            const parentRole = implicitRole(parent);
            if (["main", "banner", "navigation", "contentinfo"].includes(parentRole || "")) {
              return false;
            }
          }
          return false;
        }
        function isAxConfirmedCardIntroImage(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (accessibleName(el, "image"))
            return false;
          if (!hasAxRole(el, "image"))
            return false;
          if (el.closest(interactiveSelector))
            return false;
          if (el.closest("[aria-roledescription='carousel'], [aria-roledescription='slideshow']")) {
            return false;
          }
          const tag = el.tagName?.toLowerCase();
          if (tag !== "svg" && el.getAttribute("role") !== "img")
            return false;
          for (let wrapper = el.parentElement, depth = 0; wrapper && depth < 4; wrapper = wrapper.parentElement, depth += 1) {
            if (wrapper === document.body || wrapper.matches?.("main, [role='main']"))
              return false;
            if (readableText(wrapper))
              return false;
            const parent = wrapper.parentElement;
            if (!parent || parent.matches?.("main, [role='main'], body"))
              return false;
            const siblings = Array.from(parent.children || []);
            const next = siblings.slice(siblings.indexOf(wrapper) + 1).find((sibling) => !isHidden(sibling));
            if (!next)
              continue;
            if (hasVisibleInteractiveDescendant(next))
              return false;
            const text = normalize(readableText(next) || next.textContent);
            if (!text)
              return false;
            if (firstVisibleDescendantMatching(next, (candidate) => ["heading", "paragraph"].includes(implicitRole(candidate)) || ["strong", "b"].includes(candidate.tagName?.toLowerCase()))) {
              return true;
            }
          }
          return false;
        }
        function isLeadingUnnamedTabPanelImage(el, role) {
          if (role !== "image")
            return false;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (accessibleName(el, "image"))
            return false;
          const panel = el.closest?.("[role='tabpanel']");
          if (!panel || isHidden(panel))
            return false;
          if (!panel.getAttribute("aria-label") && !panel.getAttribute("aria-labelledby")) {
            return false;
          }
          const walker = document.createTreeWalker(panel, panel.ownerDocument.defaultView.NodeFilter.SHOW_ELEMENT);
          let node;
          while (node = walker.nextNode()) {
            if (isHidden(node))
              continue;
            if (node !== el && el.contains(node))
              continue;
            const nodeRole = implicitRole(node);
            if (nodeRole === "image" && !accessibleName(node, "image")) {
              return node === el;
            }
            if (["heading", "paragraph", "text", "button", "link", "textbox", "searchbox", "combobox"].includes(nodeRole) && readableStopText(node, nodeRole)) {
              return false;
            }
          }
          return false;
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
            return Array.from(list.children).flatMap((child) => {
              if (isHidden(child))
                return [];
              const childTag = child.tagName.toLowerCase();
              if (childTag === "dt" || childTag === "dd")
                return [child];
              return definitionListWrapperItems(list, child);
            });
          }
          const children = walkChildren(list).flatMap((child) => {
            const wrapperItems = listWrapperItems(list, child);
            return wrapperItems.length ? wrapperItems : [child];
          });
          const hasNativeItems = children.some((child) => isListItem(child));
          return children.filter((child) => isListItem(child) || hasNativeItems && child.parentElement === list && isDirectInvalidListContentItem(list, child));
        }
        function announcedListChildren(list) {
          return listChildren(list).filter((child) => !isSeparatorListItem(child));
        }
        function listSummaryChildren(list) {
          const children = announcedListChildren(list);
          let end = children.length;
          while (end > 0 && isHiddenConsentOnlyListItem(children[end - 1])) {
            end -= 1;
          }
          return children.slice(0, end);
        }
        function isListContainer(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          const tag = el.tagName?.toLowerCase();
          if (tag === "dl")
            return false;
          return tag === "ul" || tag === "ol" || el.getAttribute?.("role") === "list";
        }
        function listWrapperItems(list, wrapper) {
          if (!isListContainer(list))
            return [];
          if (!wrapper || wrapper.parentElement !== list || isHidden(wrapper))
            return [];
          const wrapperTag = wrapper.tagName?.toLowerCase();
          if (wrapperTag !== "div" && wrapperTag !== "span")
            return [];
          const wrapperRole = wrapper.getAttribute?.("role") || "";
          if (wrapperRole && wrapperRole !== "none" && wrapperRole !== "presentation")
            return [];
          if (directOwnText(wrapper))
            return [];
          const children = walkChildren(wrapper).filter((child) => !isHidden(child) && !child.matches?.("script, style, template"));
          if (!children.length)
            return [];
          return children.every((child) => isListItem(child)) ? children : [];
        }
        function isNeutralListItemWrapper(el) {
          return Boolean(el?.parentElement && listWrapperItems(el.parentElement, el).length);
        }
        function definitionListWrapperItems(list, wrapper) {
          if (!list || list.tagName?.toLowerCase() !== "dl")
            return [];
          if (!wrapper || wrapper.parentElement !== list || isHidden(wrapper))
            return [];
          const wrapperTag = wrapper.tagName?.toLowerCase();
          if (wrapperTag !== "div" && wrapperTag !== "span")
            return [];
          const wrapperRole = wrapper.getAttribute?.("role") || "";
          if (wrapperRole && wrapperRole !== "none" && wrapperRole !== "presentation")
            return [];
          if (directOwnText(wrapper))
            return [];
          const children = walkChildren(wrapper).filter((child) => !isHidden(child) && !child.matches?.("script, style, template"));
          if (!children.length)
            return [];
          return children.every((child) => {
            const tag = child.tagName?.toLowerCase();
            return tag === "dt" || tag === "dd";
          }) ? children : [];
        }
        function isDefinitionListItem(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          const tag = el.tagName?.toLowerCase();
          if (tag !== "dt" && tag !== "dd")
            return false;
          return Boolean(definitionListForItem(el));
        }
        function definitionListForItem(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return null;
          const parent = el.parentElement;
          if (!parent)
            return null;
          if (parent.tagName?.toLowerCase() === "dl")
            return parent;
          const grandparent = parent.parentElement;
          if (grandparent?.tagName?.toLowerCase() !== "dl")
            return null;
          return definitionListWrapperItems(grandparent, parent).includes(el) ? grandparent : null;
        }
        function listForItem(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || !isListItem(el))
            return null;
          const parent = el.parentElement;
          if (!parent)
            return null;
          if (isListContainer(parent))
            return parent;
          const grandparent = parent.parentElement;
          if (!isListContainer(grandparent))
            return null;
          return listWrapperItems(grandparent, parent).includes(el) ? grandparent : null;
        }
        function isWrappedDefinitionListItem(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return false;
          const tag = el.tagName?.toLowerCase();
          if (tag !== "dt" && tag !== "dd")
            return false;
          const parent = el.parentElement;
          if (!parent || parent.tagName?.toLowerCase() === "dl")
            return false;
          const grandparent = parent.parentElement;
          if (grandparent?.tagName?.toLowerCase() !== "dl")
            return false;
          return definitionListWrapperItems(grandparent, parent).includes(el);
        }
        function isDirectListBackedDefinitionItem(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          const tag = el.tagName?.toLowerCase();
          if (tag !== "dt" && tag !== "dd")
            return false;
          const list = el.parentElement;
          if (list?.tagName?.toLowerCase() !== "dl")
            return false;
          const children = Array.from(list.children || []).filter((child) => !isHidden(child));
          if (children.length !== 2 || children[0] !== list.querySelector(":scope > dt")) {
            return false;
          }
          const [term, definition] = children;
          if (term.tagName?.toLowerCase() !== "dt" || definition.tagName?.toLowerCase() !== "dd") {
            return false;
          }
          if (directOwnText(definition))
            return false;
          const definitionChildren = walkChildren(definition).filter((child) => !isHidden(child) && !child.matches?.("script, style, template"));
          return definitionChildren.length === 1 && ["ul", "ol"].includes(definitionChildren[0].tagName?.toLowerCase());
        }
        function isSimpleDirectDefinitionListItem(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          const tag = el.tagName?.toLowerCase();
          if (tag !== "dt" && tag !== "dd")
            return false;
          const list = el.parentElement;
          if (list?.tagName?.toLowerCase() !== "dl")
            return false;
          if (tag === "dt" && definitionListDisclosureButton(el))
            return false;
          if (isDirectListBackedDefinitionItem(el))
            return false;
          return true;
        }
        function definitionListDisclosureButton(el) {
          if (!isDefinitionListItem(el) || el.tagName?.toLowerCase() !== "dt") {
            return void 0;
          }
          const directChildren = walkChildren(el).filter((child) => !isHidden(child) && !child.matches?.("script, style, template"));
          if (directChildren.length !== 1)
            return void 0;
          const button = directChildren[0];
          if (implicitRole(button) !== "button" || !button.hasAttribute("aria-expanded")) {
            return void 0;
          }
          const buttonName = normalize(accessibleName(button, "button") || readableText(button));
          const termName = normalize(accessibleName(el, "term") || readableText(el));
          if (!buttonName || buttonName !== termName)
            return void 0;
          return button;
        }
        function previousDefinitionListItem(el) {
          const list = definitionListForItem(el);
          if (!list)
            return void 0;
          const siblings = listChildren(list);
          const index = siblings.indexOf(el);
          return index > 0 ? siblings[index - 1] : void 0;
        }
        function isDisclosureDefinitionItem(el) {
          if (!isDefinitionListItem(el) || el.tagName?.toLowerCase() !== "dd") {
            return false;
          }
          return Boolean(definitionListDisclosureButton(previousDefinitionListItem(el)));
        }
        function isFirstDisclosureDefinitionParagraph(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName?.toLowerCase() !== "p")
            return false;
          const definition = el.parentElement;
          if (!isDisclosureDefinitionItem(definition))
            return false;
          const visibleChildren = walkChildren(definition).filter((child) => !isHidden(child) && !child.matches?.("script, style, template"));
          return visibleChildren[0] === el;
        }
        function isDisclosureDefinitionLink(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (implicitRole(el) !== "link")
            return false;
          const definition = el.closest?.("dd");
          return Boolean(definition && isDisclosureDefinitionItem(definition));
        }
        function wrappedDefinitionListTermChildAnnouncements(el) {
          if (!isDefinitionListItem(el) || el.tagName?.toLowerCase() !== "dt") {
            return void 0;
          }
          const termName = normalize(accessibleName(el, "term") || readableText(el));
          if (!termName)
            return void 0;
          const disclosureButton = definitionListDisclosureButton(el);
          if (disclosureButton) {
            const buttonName = normalize(accessibleName(disclosureButton, "button") || readableText(disclosureButton));
            return [
              generateAnnouncement2({
                role: "button",
                name: buttonName,
                text: buttonName,
                expanded: parseBooleanAttribute(disclosureButton, "aria-expanded"),
                groupContext: true
              })
            ];
          }
          if (!isWrappedDefinitionListItem(el))
            return void 0;
          const directChildren = walkChildren(el).filter((child) => !isHidden(child) && !child.matches?.("script, style, template"));
          if (!directChildren.length)
            return void 0;
          const announcements = directChildren.flatMap((child) => {
            const text = normalize(readableText(child));
            if (text && text === termName)
              return [text];
            const tag = child.tagName?.toLowerCase();
            const title = normalize(child.getAttribute?.("title"));
            if (tag === "abbr" && title && !text)
              return [`${title}, empty group`];
            return [];
          });
          return announcements.length ? announcements : void 0;
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
          while (listItem && !isListItem(listItem) && !isDefinitionListItem(listItem)) {
            listItem = listItem.parentElement;
          }
          const list = definitionListForItem(listItem) || listForItem(listItem) || listItem?.parentElement || null;
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
            const pseudo = safeComputedStyle(el, `::${side}`);
            const content = normalize(pseudo?.content);
            if (!content || content === "none" || content === "normal")
              return false;
            if (pseudo.display === "none" || pseudo.display === "contents" || pseudo.visibility === "hidden" || pseudo.position === "absolute" || pseudo.position === "fixed") {
              return false;
            }
            const display = normalize(safeComputedStyle(el)?.display) || "";
            if (!/^(inline-)?(grid|flex)$/.test(display))
              return false;
            return true;
          } catch {
            return false;
          }
        }
        function generatedPseudoText(el, side) {
          const attr = el?.getAttribute?.(`data-sr-pseudo-${side}`);
          if (attr && !["true", "false", "none", "normal", "collection-item"].includes(attr)) {
            return normalize(attr.replace(/^['"]|['"]$/g, ""));
          }
          if (typeof getComputedStyle !== "function")
            return void 0;
          const view = el?.ownerDocument?.defaultView;
          if (!view || /jsdom/i.test(view.navigator?.userAgent || "")) {
            return void 0;
          }
          try {
            const pseudo = safeComputedStyle(el, `::${side}`);
            const content = normalize(pseudo?.content?.replace(/^['"]|['"]$/g, ""));
            if (!content || content === "none" || content === "normal")
              return void 0;
            if (pseudo.display === "none" || pseudo.display === "contents" || pseudo.visibility === "hidden" || pseudo.position === "absolute" || pseudo.position === "fixed") {
              return void 0;
            }
            return content;
          } catch {
            return void 0;
          }
        }
        function generatedPseudoName(el) {
          const before = generatedPseudoText(el, "before");
          const own = embeddedControlContentName(el);
          const after = generatedPseudoText(el, "after");
          return normalize([before, own, after].filter(Boolean).join(" "));
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
          if (groupedListItemCardContainerFor(el))
            return void 0;
          if (isInsideVisibleAxControlledRegion(el))
            return void 0;
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
          if (groupedListItemCardContainerFor(el)) {
            return {};
          }
          const definitionItem = el.parentElement;
          if (isDirectListBackedDefinitionItem(definitionItem)) {
            const list = definitionListForItem(definitionItem);
            const siblings2 = list ? listChildren(list) : [];
            const index2 = siblings2.indexOf(definitionItem);
            return index2 >= 0 ? {
              parentPositionInSet: index2 + 1,
              parentSetSize: siblings2.length || void 0
            } : {};
          }
          const parentItem = el.parentElement?.closest("li,[role='listitem']");
          if (!parentItem) {
            return {};
          }
          if (isNestedNavigationList(el, parentItem)) {
            return {};
          }
          if (nativeMarkerListItemAnnouncements(parentItem) || axOrderedParentNestedListItemAnnouncements(parentItem)) {
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
        function isNestedNavigationList(list, parentItem) {
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
        function hasDirectPrecedingNavigationListItemLabel(listItem, list) {
          for (const child of Array.from(listItem?.childNodes || [])) {
            if (child === list || child.contains?.(list)) {
              return false;
            }
            if (child.nodeType === Node.TEXT_NODE) {
              if (normalize(child.textContent))
                return true;
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
        function hasPrecedingSectionHeadingInListItem(list, listItem) {
          if (!list || !listItem || !listItem.contains(list)) {
            return false;
          }
          const headings = Array.from(listItem.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']")).filter((heading) => {
            if (isHidden(heading) || list.contains(heading))
              return false;
            if (heading.closest("li,[role='listitem']") !== listItem)
              return false;
            return Boolean(heading.compareDocumentPosition(list) & heading.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
          });
          return headings.length > 0;
        }
        function hasPrecedingReadableCardContentInListItem(list, listItem) {
          if (!list || !listItem || !listItem.contains(list)) {
            return false;
          }
          if (!hasStructuredNewsCardListItemContent(listItem)) {
            return false;
          }
          return Array.from(listItem.querySelectorAll("*")).some((child) => {
            if (child === list || isHidden(child) || list.contains(child) || child.contains(list)) {
              return false;
            }
            if (!(child.compareDocumentPosition(list) & child.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING)) {
              return false;
            }
            return Boolean(readableText(child) || child.querySelector?.(interactiveSelector));
          });
        }
        function isSimpleLinkedCardHeadingListStop(el, role) {
          if (!["heading", "link"].includes(role))
            return false;
          const heading = role === "heading" ? el : el.closest("h1,h2,h3,h4,h5,h6,[role='heading']");
          if (!heading || isHidden(heading))
            return false;
          const listItem = heading.closest("li,[role='listitem']");
          if (!listItem || heading.closest("li,[role='listitem']") !== listItem)
            return false;
          if (!structuredListItemHasPreHeadingImage(listItem))
            return false;
          if (isDescendantOfDirectListArticleCard(el))
            return false;
          const headingLink = firstVisibleDescendant(heading, "a[href], [role='link']");
          if (!headingLink || !readableText(headingLink))
            return false;
          if (role === "link" && el !== headingLink)
            return false;
          const interactiveChildren = Array.from(listItem.querySelectorAll(interactiveSelector)).filter((candidate) => !isHidden(candidate));
          if (interactiveChildren.length !== 1 || interactiveChildren[0] !== headingLink) {
            return false;
          }
          return Array.from(listItem.children || []).some((child) => child !== heading && !isHidden(child) && child.tagName?.toLowerCase() === "p" && Boolean(readableText(child)));
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
          if (role === "text" && isFirstRichProductCardTextFragment(el) && !suppressGroupedListItemCardDescendantPosition(el, role)) {
            const { listItem, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : void 0;
          }
          if (role === "link" && isPrimaryStructuredNewsCardLink(el)) {
            const { listItem, list, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? adjustedListPosition(index, list, el, role) : void 0;
          }
          if (isSimpleLinkedCardHeadingListStop(el, role)) {
            const { listItem, list, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? adjustedListPosition(index, list, el, role) : void 0;
          }
          if (["heading", "link"].includes(role) && structuredListItemHasPreHeadingImage(el.closest("li,[role='listitem']")) && !(role === "link" && isOnlyInteractiveListItemChild(el))) {
            return void 0;
          }
          if (role === "link" && Array.from(el.closest("li,[role='listitem']")?.querySelectorAll("div") || []).some((candidate) => isInteractiveListBodyText(candidate))) {
            return void 0;
          }
          if (role === "link" && isGenericDealCtaLink(el)) {
            return void 0;
          }
          if (role === "link" && isCategorizedListItemBodyLink(el, role)) {
            return void 0;
          }
          if (role === "link" && isAxMarkerOnlyListItemChildContent(el, role)) {
            return void 0;
          }
          if (role === "link" && isAxMarkerPrefixedTextListItemChildContent(el, role)) {
            return void 0;
          }
          if (role === "link" && isAxStrongWrappedMarkerListItemChildContent(el, role)) {
            return void 0;
          }
          if (["heading", "link"].includes(role) && isDescendantOfDirectListArticleCard(el)) {
            return void 0;
          }
          if (role === "button" && directNativeDetailsForSummary(el)) {
            const { listItem, list, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? adjustedListPosition(index, list, el, role) : void 0;
          }
          const buttonListItem = semanticListContext(el).listItem;
          if (role === "button" && isAriaLabelOnlyDecorativeIconButton(el) && !normalizedPopup(el) && !el.hasAttribute("aria-expanded") && buttonListItem && !hasOnlyInteractiveListItemContent(buttonListItem) && hasStructuredListItemContent(buttonListItem)) {
            return void 0;
          }
          if (role === "button" && hasRichProductCardListItemContent(el.closest("li,[role='listitem']"))) {
            return void 0;
          }
          if (role === "paragraph" && isFirstInteractiveListBodyText(el) && !suppressGroupedListItemCardDescendantPosition(el, role)) {
            const { listItem, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : void 0;
          }
          if (role === "paragraph" && isFirstTextBlockListItemParagraph(el)) {
            const { listItem, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : void 0;
          }
          if (role === "paragraph" && isFirstRichProductCardParagraph(el) && !suppressGroupedListItemCardDescendantPosition(el, role)) {
            const { listItem, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : void 0;
          }
          if (role === "paragraph" && isRichProductCardOfferBanner(el) && !suppressGroupedListItemCardDescendantPosition(el, role)) {
            const { listItem, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? index + 1 : void 0;
          }
          if (role === "term" && Boolean(definitionListDisclosureButton(el)) || role === "paragraph" && isFirstDisclosureDefinitionParagraph(el)) {
            const { listItem, list, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? adjustedListPosition(index, list, el, role) : void 0;
          }
          if ((role === "term" || role === "paragraph") && (isWrappedDefinitionListItem(el) || isSimpleDirectDefinitionListItem(el) || role === "term" && isDirectListBackedDefinitionItem(el))) {
            const { listItem, list, siblings } = semanticListContext(el);
            const index = siblings.indexOf(listItem);
            return index >= 0 ? adjustedListPosition(index, list, el, role) : void 0;
          }
          if (role === "link" && isDisclosureDefinitionLink(el)) {
            return void 0;
          }
          if (role === "group" && isFocusableGenericListItemDescendantGroup(el)) {
            return void 0;
          }
          if (listPositionedRoles.has(role)) {
            const { listItem, list, siblings } = semanticListContext(el);
            if (role === "button" && listItem && !isDisclosureButtonForNestedListPanel(el, listItem) && Array.from(listItem.querySelectorAll("a[href], [role='link']")).some((link) => !isHidden(link) && !link.contains(el) && !el.contains(link))) {
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
            return flattenedSize ?? (listSummaryChildren(el).length || void 0);
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
          if (isSimpleLinkedCardHeadingListStop(el, role)) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          if (role === "link" && isGenericDealCtaLink(el)) {
            return void 0;
          }
          if (role === "link" && isCategorizedListItemBodyLink(el, role)) {
            return void 0;
          }
          if (role === "link" && isAxMarkerPrefixedTextListItemChildContent(el, role)) {
            return void 0;
          }
          if (role === "link" && isAxStrongWrappedMarkerListItemChildContent(el, role)) {
            return void 0;
          }
          if (["heading", "link"].includes(role) && isDescendantOfDirectListArticleCard(el)) {
            return void 0;
          }
          const buttonListItem = semanticListContext(el).listItem;
          if (role === "button" && isAriaLabelOnlyDecorativeIconButton(el) && !normalizedPopup(el) && !el.hasAttribute("aria-expanded") && buttonListItem && !hasOnlyInteractiveListItemContent(buttonListItem) && hasStructuredListItemContent(buttonListItem)) {
            return void 0;
          }
          if (listPositionedRoles.has(role)) {
            const { list, siblings } = semanticListContext(el);
            return adjustedListSetSize(siblings, list, el, role);
          }
          if (role === "paragraph" && isFirstInteractiveListBodyText(el) && !suppressGroupedListItemCardDescendantPosition(el, role)) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          if (role === "paragraph" && isFirstTextBlockListItemParagraph(el)) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          if (role === "paragraph" && isFirstRichProductCardParagraph(el) && !suppressGroupedListItemCardDescendantPosition(el, role)) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          if (role === "paragraph" && isRichProductCardOfferBanner(el) && !suppressGroupedListItemCardDescendantPosition(el, role)) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          if (role === "text" && isFirstRichProductCardTextFragment(el) && !suppressGroupedListItemCardDescendantPosition(el, role)) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          if (role === "term" && Boolean(definitionListDisclosureButton(el)) || role === "paragraph" && isFirstDisclosureDefinitionParagraph(el)) {
            const { list, siblings } = semanticListContext(el);
            return adjustedListSetSize(siblings, list, el, role);
          }
          if ((role === "term" || role === "paragraph") && (isWrappedDefinitionListItem(el) || isSimpleDirectDefinitionListItem(el) || role === "term" && isDirectListBackedDefinitionItem(el))) {
            const { list, siblings } = semanticListContext(el);
            return adjustedListSetSize(siblings, list, el, role);
          }
          if (role === "link" && isDisclosureDefinitionLink(el)) {
            return void 0;
          }
          if (role === "group" && isFocusableGenericListItemDescendantGroup(el)) {
            return void 0;
          }
          if (role === "button" && hasRichProductCardListItemContent(el.closest("li,[role='listitem']"))) {
            return void 0;
          }
          if (role === "link" && isPrimaryStructuredNewsCardLink(el)) {
            const { list, siblings } = semanticListContext(el);
            return adjustedListSetSize(siblings, list, el, role);
          }
          if (role === "text" && isFirstSplitTextListItemBlock(el) && !el.closest("li,[role='listitem']")?.querySelector("img, [role='img'], svg[aria-label]")) {
            const { siblings } = semanticListContext(el);
            return siblings.length || void 0;
          }
          return void 0;
        }
        function isLargePlainList(el, role = implicitRole(el)) {
          if (role !== "list")
            return false;
          const items = listSummaryChildren(el).filter((item) => !isHidden(item) && implicitRole(item) === "listitem");
          if (items.length <= 100)
            return false;
          return items.every((item) => {
            if (!readableText(item))
              return false;
            if (hasVisibleInteractiveDescendant(item))
              return false;
            return !Array.from(item.children || []).some((child) => {
              if (isHidden(child))
                return false;
              const childRole = implicitRole(child);
              return childRole && childRole !== "text";
            });
          });
        }
        function isLargePlainListItem(el, role = implicitRole(el)) {
          if (role !== "listitem")
            return false;
          const { list } = semanticListContext(el);
          return Boolean(list && isLargePlainList(list, "list"));
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
        function hasLabeledNativeSelectListItemContent(el) {
          if (!isListItem(el))
            return false;
          if (el.querySelector("ul, ol, dl, [role='list']"))
            return false;
          const selects = Array.from(el.querySelectorAll("select")).filter((select2) => !isHidden(select2) && implicitRole(select2) === "combobox");
          if (selects.length !== 1)
            return false;
          const select = selects[0];
          const otherInteractive = Array.from(el.querySelectorAll(interactiveSelector)).filter((candidate) => !isHidden(candidate) && candidate !== select);
          if (otherInteractive.length)
            return false;
          const label = labelForControl(select) || accessibleName(select, "combobox");
          if (!label)
            return false;
          const text = textWithoutInteractive(el);
          return !text || text === label;
        }
        function isOnlyInteractiveListItemChild(el) {
          const listItem = el?.closest?.("li,[role='listitem']");
          if (!isListItem(listItem) || !hasOnlyInteractiveListItemContent(listItem)) {
            return false;
          }
          const children = directSemanticChildren(listItem);
          return children.length === 1 && children[0] === el && Boolean(el.matches?.(interactiveSelector));
        }
        function nativeMarkerPositionAnnouncement(position, size) {
          if (!position || !size || size <= 1)
            return void 0;
          return position === 1 ? `.,1of${size}` : `.,${position} of${size}`;
        }
        function nativeMarkerListItemContext(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.getAttribute("data-sr-marker-content"))
            return void 0;
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (list.closest("nav,[role='navigation']"))
            return void 0;
          if (list.getAttribute("role") && list.getAttribute("role") !== "list")
            return void 0;
          if (accessibilityNodes.length)
            return void 0;
          const siblings = listChildren(list);
          const index = siblings.indexOf(el);
          return index >= 0 ? {
            list,
            siblings,
            position: index + 1,
            size: siblings.length || void 0,
            markerVisible: nativeListItemMarkerVisible(el, list)
          } : void 0;
        }
        function nativeListItemMarkerVisible(item, list) {
          const itemStyle = safeComputedStyle(item);
          const listStyle = safeComputedStyle(list);
          const listStyleType = normalize(itemStyle?.listStyleType || listStyle?.listStyleType || item.getAttribute("data-sr-marker-list-style-type") || list.getAttribute("data-sr-marker-list-style-type"));
          return Boolean(listStyleType) && listStyleType !== "none";
        }
        function renderedNativeListMarkerGlyph(item, list) {
          if (item.getAttribute("data-sr-marker-content") !== "normal")
            return void 0;
          const markerDisplay = normalize(item.getAttribute("data-sr-marker-display"));
          if (markerDisplay !== "inline" && markerDisplay !== "inline-block")
            return void 0;
          const markerStyle = normalize(item.getAttribute("data-sr-marker-list-style-type") || list.getAttribute("data-sr-marker-list-style-type"));
          if (!markerStyle || markerStyle === "none")
            return void 0;
          const unquoted = markerStyle.replace(/^['"]|['"]$/g, "").trim();
          if (unquoted.startsWith("\u2022"))
            return "\u2022";
          return void 0;
        }
        function savedRenderedPlainTextMarkerListItemAnnouncement(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]"))
            return void 0;
          if (el.querySelector("a[href], [role='link'], button, [role='button'], ul, ol, dl, [role='list']")) {
            return void 0;
          }
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (list.closest("nav,[role='navigation']"))
            return void 0;
          const glyph = renderedNativeListMarkerGlyph(el, list);
          if (!glyph)
            return void 0;
          const siblings = announcedListChildren(list);
          if (siblings.length !== 3 || siblings[0] !== el || siblings.some((item) => !renderedNativeListMarkerGlyph(item, list))) {
            return void 0;
          }
          if (siblings.some((item) => Boolean(item.querySelector("a[href], [role='link'], button, [role='button'], ul, ol, dl, [role='list']")))) {
            return void 0;
          }
          const text = normalize(readableText(el));
          if (!text)
            return void 0;
          const position = positionInSet(el, "listitem");
          const size = setSize(el, "listitem");
          return position && size && size > 1 ? `${glyph} ${text}, ${position} of ${size}` : void 0;
        }
        function containsNestedList(el) {
          return Boolean(Array.from(el.children || []).some((child) => !isHidden(child) && (implicitRole(child) === "list" || containsNestedList(child))));
        }
        function nativeMarkerListItemDirectText(el) {
          const fragments = [];
          const ownText = normalize(directOwnText(el));
          if (ownText)
            fragments.push(ownText);
          for (const child of Array.from(el.children || [])) {
            if (isHidden(child))
              continue;
            const childRole = implicitRole(child);
            if (child.matches?.(interactiveSelector))
              continue;
            if (childRole === "list")
              continue;
            if (containsNestedList(child))
              continue;
            const text = normalize(readableText(child));
            if (text)
              fragments.push(text);
          }
          return normalize(fragments.join(" "));
        }
        function nativeMarkerChildControlAnnouncement(el) {
          const role = implicitRole(el);
          const name = accessibleName(el, role) || readableText(el);
          if (!name)
            return void 0;
          if (role === "link")
            return `link, ${name}`;
          if (role === "button") {
            const expanded = parseBooleanAttribute(el, "aria-expanded");
            return [
              name,
              expanded === true ? "expanded" : expanded === false ? "collapsed" : void 0,
              "button"
            ].filter(Boolean).join(", ");
          }
          return void 0;
        }
        function isNativeMarkerNestedChildList(list) {
          const parentItem = list.parentElement;
          if (parentItem && isListItem(parentItem)) {
            const directNestedLists = Array.from(parentItem.children || []).filter((child) => !isHidden(child) && implicitRole(child) === "list");
            if (directNestedLists.includes(list) && Boolean(nativeMarkerListItemAnnouncements(parentItem)?.length)) {
              return true;
            }
          }
          return Boolean(disclosureButtonForNestedListPanel(list));
        }
        function disclosureButtonForNestedListPanel(list) {
          let ancestor = list.parentElement;
          while (ancestor && !isListItem(ancestor))
            ancestor = ancestor.parentElement;
          if (!ancestor)
            return void 0;
          const buttons = Array.from(ancestor.children || []).filter((child) => {
            return !isHidden(child) && implicitRole(child) === "button" && parseBooleanAttribute(child, "aria-expanded") !== void 0;
          });
          for (const button of buttons) {
            const controls = normalize(button.getAttribute("aria-controls"));
            if (!controls)
              return button;
            const controlled = document.getElementById(controls);
            if (controlled && (controlled === list || controlled.contains?.(list)))
              return button;
          }
          return void 0;
        }
        function isDisclosureButtonForNestedListPanel(button, listItem) {
          if (!button || !listItem || !listItem.contains(button))
            return false;
          if (implicitRole(button) !== "button")
            return false;
          if (parseBooleanAttribute(button, "aria-expanded") === void 0)
            return false;
          const nestedLists = Array.from(listItem.querySelectorAll("ul, ol, dl, [role='list']")).filter((list) => !isHidden(list));
          if (!nestedLists.length)
            return false;
          const controls = normalize(button.getAttribute("aria-controls"));
          if (!controls) {
            return nestedLists.some((list) => Boolean(button.compareDocumentPosition(list) & button.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING));
          }
          const controlled = document.getElementById(controls);
          return Boolean(controlled && nestedLists.some((list) => controlled === list || controlled.contains?.(list)));
        }
        function nativeMarkerListItemAnnouncements(el) {
          const context = nativeMarkerListItemContext(el);
          if (!context)
            return void 0;
          if (axMarkerOnlyListItemStopAnnouncement(el))
            return void 0;
          if (axPlainTextMarkerListItemAnnouncement(el))
            return void 0;
          if (axStrongWrappedMarkerListItemAnnouncements(el))
            return void 0;
          if (namedNavigationListItemGroupedLinkAnnouncements(el))
            return void 0;
          const directChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          const directNestedLists = directChildren.filter((child) => implicitRole(child) === "list");
          const directControls = directChildren.filter((child) => {
            const role = implicitRole(child);
            return role === "link" || role === "button";
          });
          const markerPosition = nativeMarkerPositionAnnouncement(context.position, context.size);
          if (!context.markerVisible)
            return void 0;
          if (directNestedLists.length === 1 && !directControls.length) {
            const text = normalize(directOwnText(el));
            return text ? [`. ${text}`] : markerPosition ? [markerPosition] : void 0;
          }
          if (!directNestedLists.length && directControls.length === 1) {
            const directControl = directControls[0];
            const directControlRole = implicitRole(directControl);
            if (directControlRole === "link" && !isNativeMarkerNestedChildList(context.list)) {
              return void 0;
            }
            if (directControlRole === "button" && parseBooleanAttribute(directControl, "aria-expanded") === void 0) {
              return void 0;
            }
            const controlAnnouncement = nativeMarkerChildControlAnnouncement(directControls[0]);
            if (!controlAnnouncement)
              return void 0;
            const controlName = accessibleName(directControls[0], implicitRole(directControls[0]));
            const text = nativeMarkerListItemDirectText(el);
            return [
              markerPosition,
              controlAnnouncement,
              text && text !== controlName ? text : void 0
            ].filter((entry) => Boolean(entry));
          }
          return void 0;
        }
        function nativeMarkerListItemShouldDescend(el) {
          if (!nativeMarkerListItemAnnouncements(el)?.length)
            return false;
          return containsNestedList(el);
        }
        function nativeMarkerListItemDescendantLists(el) {
          const lists = [];
          const visit = (node) => {
            for (const child of Array.from(node.children || [])) {
              if (isHidden(child))
                continue;
              if (implicitRole(child) === "list") {
                lists.push(child);
                continue;
              }
              visit(child);
            }
          };
          visit(el);
          return lists;
        }
        function shouldSuppressNativeMarkerNestedSingletonListEnd(el, role) {
          if (role !== "list")
            return false;
          if (!["ul", "ol"].includes(el.tagName?.toLowerCase()))
            return false;
          if (el.closest("nav,[role='navigation']"))
            return false;
          if (el.getAttribute("role") && el.getAttribute("role") !== "list")
            return false;
          if (accessibilityNodes.length)
            return false;
          const items = listChildren(el);
          if (items.length !== 1)
            return false;
          const item = items[0];
          if (!nativeMarkerListItemAnnouncements(item)?.length)
            return false;
          if (!normalize(directOwnText(item)))
            return false;
          const directChildren = Array.from(item.children || []).filter((child) => !isHidden(child));
          const directNestedLists = directChildren.filter((child) => implicitRole(child) === "list");
          const directControls = directChildren.filter((child) => {
            const childRole = implicitRole(child);
            return childRole === "link" || childRole === "button";
          });
          return directNestedLists.length === 1 && directControls.length === 0;
        }
        function namedNavigationListItemGroupedLinkAnnouncements(el) {
          if (!isListItem(el) || !el.hasAttribute?.("aria-labelledby"))
            return void 0;
          if (!accessibilityNodes.length)
            return void 0;
          if (el.querySelector("ul, ol, dl, [role='list']"))
            return void 0;
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          const navigation = list.closest?.("nav,[role='navigation']");
          if (!navigation || !navigation.contains(el))
            return void 0;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 1)
            return void 0;
          const link = visibleChildren[0];
          if (implicitRole(link) !== "link")
            return void 0;
          if (!link.matches?.("a[href], [role='link']"))
            return void 0;
          if (normalize(link.getAttribute("aria-expanded")) || normalizedPopup(link))
            return void 0;
          if (link.getAttribute("aria-current") && link.getAttribute("aria-current") !== "false") {
            return void 0;
          }
          const itemName = accessibleName(el, "listitem");
          const linkName = accessibleName(link, "link");
          if (!itemName || !linkName || itemName !== linkName)
            return void 0;
          const position = positionInSet(el, "listitem");
          const size = setSize(el, "listitem");
          if (!position || !size)
            return void 0;
          const axListItem = axNodeForElementRole(el, "listitem");
          const axLink = axNodeForElementRole(link, "link");
          if (!axListItem || !axLink)
            return void 0;
          if (normalize(axListItem.name) !== itemName || normalize(axLink.name) !== linkName) {
            return void 0;
          }
          if (axLink.properties?.focusable !== true)
            return void 0;
          const axChildren = axChildNodes(axListItem);
          if (axChildren.length !== 1 || normalize(axChildren[0].nodeId) !== normalize(axLink.nodeId)) {
            return void 0;
          }
          const groupedPosition = `(${position} of ${size})`;
          return [
            `${itemName}, group, ${groupedPosition}, ${position} of ${size}`,
            `link, ${linkName}`,
            `end of, ${itemName}, group, ${groupedPosition}`
          ];
        }
        function elementPrecedes(left, right) {
          if (!left || !right || typeof left.compareDocumentPosition !== "function")
            return false;
          return Boolean(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING);
        }
        function visibleInteractiveDescendants(el) {
          return Array.from(el?.querySelectorAll?.(interactiveSelector) || []).filter((candidate) => !isHidden(candidate));
        }
        function hasVisibleHeadingBefore(container, before) {
          return Array.from(container?.querySelectorAll?.("h1, h2, h3, h4, h5, h6, [role='heading']") || []).some((heading) => {
            if (isHidden(heading) || !elementPrecedes(heading, before))
              return false;
            const role = implicitRole(heading);
            return role === "heading" && Boolean(accessibleName(heading, role) || readableText(heading));
          });
        }
        function hasEnabledButtonAfter(container, after) {
          return Array.from(container?.querySelectorAll?.("button, input[type='button'], input[type='submit'], input[type='reset'], [role='button']") || []).some((button) => {
            if (button === after || isHidden(button) || !elementPrecedes(after, button))
              return false;
            const role = implicitRole(button);
            if (role !== "button")
              return false;
            return !(button.disabled || button.hasAttribute?.("disabled") || button.getAttribute?.("aria-disabled") === "true");
          });
        }
        function leadingGenericGroupStopCountBeforeDisabledControl(el, role) {
          if (role !== "button" || !accessibilityNodes.length)
            return void 0;
          if (!(el.disabled || el.hasAttribute?.("disabled") || el.getAttribute?.("aria-disabled") === "true")) {
            return void 0;
          }
          const buttonNode = axNodeForElementRole(el, "button");
          if (!buttonNode || buttonNode.properties?.disabled !== true)
            return void 0;
          const form = el.closest?.("form");
          if (!form)
            return void 0;
          const genericAncestors = [];
          for (let current = el.parentElement; current && current !== form; current = current.parentElement) {
            if (isHidden(current))
              continue;
            const axNode = axNodeForElementRole(current, "generic");
            if (!axNode || normalize(axNode.name))
              continue;
            if (current.matches?.(interactiveSelector))
              continue;
            genericAncestors.push(current);
          }
          if (genericAncestors.length !== 2)
            return void 0;
          const [innerGroup, outerGroup] = genericAncestors;
          const innerInteractive = visibleInteractiveDescendants(innerGroup);
          if (innerInteractive.length !== 1 || innerInteractive[0] !== el)
            return void 0;
          if (!hasVisibleHeadingBefore(outerGroup, innerGroup))
            return void 0;
          if (!hasEnabledButtonAfter(outerGroup, el))
            return void 0;
          return genericAncestors.length;
        }
        function isMarkerSeparatedLinkList(list) {
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase())) {
            return false;
          }
          if (list.parentElement?.tagName?.toLowerCase() !== "section")
            return false;
          if (!list.parentElement.hasAttribute("aria-labelledby"))
            return false;
          const items = listChildren(list);
          if (!items.length)
            return false;
          return items.every((item) => {
            if (item.getAttribute("data-sr-marker-content") !== "normal")
              return false;
            if (item.getAttribute("data-sr-marker-display") !== "inline-block")
              return false;
            if (!normalize(item.getAttribute("data-sr-marker-list-style-type")))
              return false;
            if (textWithoutInteractive(item))
              return false;
            const children = directSemanticChildren(item);
            return children.length === 1 && children[0].tagName?.toLowerCase() === "a" && children[0].hasAttribute("href");
          });
        }
        function usesFocusedResourcesMarkerFormat(list) {
          if (!isMarkerSeparatedLinkList(list))
            return false;
          if (list.tagName?.toLowerCase() !== "ul")
            return false;
          const region = list.parentElement;
          if (!region || markerSeparatedListRegionHasInteractiveLabel(region))
            return false;
          const items = listChildren(list);
          if (items.length !== 11)
            return false;
          return items.every((item) => normalize(item.getAttribute("data-sr-marker-list-style-type")) === "disc");
        }
        function markerSeparatedListItemContext(el) {
          const listItem = el?.closest?.("li,[role='listitem']");
          const list = listItem?.parentElement;
          if (!isListItem(listItem) || !isMarkerSeparatedLinkList(list)) {
            return {};
          }
          const siblings = listChildren(list);
          const index = siblings.indexOf(listItem);
          return index >= 0 ? {
            markerPositionInSet: index + 1,
            markerSetSize: siblings.length || void 0,
            focusedResourcesMarkerFormat: usesFocusedResourcesMarkerFormat(list) || void 0
          } : {};
        }
        function isMarkerSeparatedListLink(el, role = implicitRole(el)) {
          if (role !== "link")
            return false;
          const listItem = el?.closest?.("li,[role='listitem']");
          if (!isListItem(listItem))
            return false;
          const children = directSemanticChildren(listItem);
          return children.length === 1 && children[0] === el && Boolean(markerSeparatedListItemContext(el).markerPositionInSet);
        }
        function axChildNodes(node) {
          return (node?.childIds || []).map((childId) => accessibilityNodeById.get(normalize(childId) || "")).filter((child) => Boolean(child && !child.ignored));
        }
        function nativeAxListMarkerRawText(markerNode) {
          if (normalizedAxRole(markerNode?.role) !== "listmarker")
            return void 0;
          const marker = normalize(markerNode?.name)?.replace(/\s+$/u, "");
          if (!marker)
            return void 0;
          return marker;
        }
        function nativeAxListMarkerText(markerNode) {
          const marker = nativeAxListMarkerRawText(markerNode);
          if (!marker)
            return void 0;
          if (/^\d+[.)]$/u.test(marker))
            return marker;
          return "\u2022";
        }
        function nativeAxNestedListMarkerText(markerNode) {
          const marker = nativeAxListMarkerRawText(markerNode);
          if (!marker)
            return void 0;
          if (/^\d+[.)]$/u.test(marker))
            return marker;
          return marker === "\u25E6" ? "." : "\u2022";
        }
        function nativeAxMarkerAnnouncement(markerNode, position, size) {
          const marker = nativeAxListMarkerText(markerNode);
          if (!marker)
            return void 0;
          if (/^\d+[.)]$/u.test(marker))
            return marker;
          return position && size ? `${marker}, ${position} of ${size}` : marker;
        }
        function axNativeMarkerListItemFragmentAnnouncements(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.getAttribute("data-sr-marker-content") !== "normal")
            return void 0;
          const markerDisplay = normalize(el.getAttribute("data-sr-marker-display"));
          if (markerDisplay !== "inline" && markerDisplay !== "inline-block")
            return void 0;
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (list.closest("nav,[role='navigation']"))
            return void 0;
          if (isMarkerSeparatedLinkList(list))
            return void 0;
          if (el.querySelector("ul, ol, dl, [role='list']"))
            return void 0;
          if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]"))
            return void 0;
          const axListItem = axNodeForElementRole(el, "listitem");
          if (normalize(axListItem?.name))
            return void 0;
          const axChildren = axChildNodes(axListItem);
          if (axChildren.length < 2)
            return void 0;
          const [markerNode, ...contentNodes] = axChildren;
          const markerAnnouncement = nativeAxMarkerAnnouncement(markerNode, positionInSet(el, "listitem"), setSize(el, "listitem"));
          if (!markerAnnouncement)
            return void 0;
          const domLinks = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link) && link.closest("li,[role='listitem']") === el && link.closest("ul, ol, dl, [role='list']") === list);
          if (Array.from(el.querySelectorAll("button, [role='button'], input, select, textarea")).some((control) => !isHidden(control) && control.closest("li,[role='listitem']") === el && control.closest("ul, ol, dl, [role='list']") === list)) {
            return void 0;
          }
          let linkIndex = 0;
          let linkCount = 0;
          let textCount = 0;
          let disallowed = false;
          const fragments = [];
          function pushText(value) {
            const text = normalize(value);
            if (!text || !/[\p{L}\p{N}]/u.test(text))
              return;
            fragments.push(text);
            textCount += 1;
          }
          function pushAxContent(node) {
            const role = normalizedAxRole(node.role);
            if (role === "link") {
              const link = domLinks[linkIndex];
              const linkName = normalizeAnnouncementLabel(node.name);
              if (!link || !linkName || node.properties?.focusable !== true || normalize(node.domNodeId) !== normalize(link.getAttribute("data-sr-dom-node-id"))) {
                disallowed = true;
                return;
              }
              fragments.push(`link, ${linkName}`);
              linkIndex += 1;
              linkCount += 1;
              return;
            }
            if (role === "strong" || role === "emphasis") {
              const children = axChildNodes(node);
              if (!children.length) {
                disallowed = true;
                return;
              }
              for (const child of children) {
                pushAxContent(child);
                if (disallowed)
                  return;
              }
              return;
            }
            if (role !== "statictext") {
              disallowed = true;
              return;
            }
            pushText(node.name);
          }
          for (const node of contentNodes) {
            pushAxContent(node);
            if (disallowed)
              return void 0;
          }
          if (linkIndex !== domLinks.length)
            return void 0;
          if (!fragments.length)
            return void 0;
          const marker = nativeAxListMarkerText(markerNode);
          const isOrderedMarker = Boolean(marker && /^\d+[.)]$/u.test(marker));
          if (!isOrderedMarker || !linkCount || textCount > 0)
            return void 0;
          return [markerAnnouncement, ...fragments];
        }
        function axOrderedParentNestedListItemAnnouncements(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.getAttribute("data-sr-marker-content") !== "normal")
            return void 0;
          const markerDisplay = normalize(el.getAttribute("data-sr-marker-display"));
          if (markerDisplay !== "inline" && markerDisplay !== "inline-block")
            return void 0;
          if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]"))
            return void 0;
          const list = listForItem(el);
          if (!list || list.tagName?.toLowerCase() !== "ol")
            return void 0;
          if (list.closest("nav,[role='navigation']"))
            return void 0;
          if (isMarkerSeparatedLinkList(list))
            return void 0;
          const directChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          const directNestedLists = directChildren.filter((child) => implicitRole(child) === "list");
          if (directNestedLists.length !== 1 || directChildren.length !== 1)
            return void 0;
          if (el.querySelector("a[href], [role='link'], button, [role='button']"))
            return void 0;
          const text = normalize(directOwnText(el));
          if (!text)
            return void 0;
          const axListItem = axNodeForElementRole(el, "listitem");
          if (normalize(axListItem?.name))
            return void 0;
          const axChildren = axChildNodes(axListItem);
          if (axChildren.length !== 3)
            return void 0;
          const [markerNode, textNode, listNode] = axChildren;
          const marker = nativeAxListMarkerText(markerNode);
          if (!marker || !/^\d+[.)]$/u.test(marker))
            return void 0;
          if (normalizedAxRole(textNode.role) !== "statictext")
            return void 0;
          if (normalize(textNode.name) !== text)
            return void 0;
          if (normalizedAxRole(listNode.role) !== "list")
            return void 0;
          if (normalize(listNode.domNodeId) !== normalize(directNestedLists[0].getAttribute("data-sr-dom-node-id"))) {
            return void 0;
          }
          return [`${marker} ${text}`];
        }
        function axOrderedNestedListItemMarkerAnnouncement(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.getAttribute("data-sr-marker-content") !== "normal")
            return void 0;
          const markerDisplay = normalize(el.getAttribute("data-sr-marker-display"));
          if (markerDisplay !== "inline" && markerDisplay !== "inline-block")
            return void 0;
          if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]"))
            return void 0;
          if (el.querySelector("a[href], [role='link'], button, [role='button'], ul, ol, dl, [role='list']")) {
            return void 0;
          }
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          const parentItem = list.parentElement;
          if (!parentItem || !axOrderedParentNestedListItemAnnouncements(parentItem)) {
            return void 0;
          }
          const text = normalize(readableText(el));
          if (!text)
            return void 0;
          const axListItem = axNodeForElementRole(el, "listitem");
          if (normalize(axListItem?.name))
            return void 0;
          const axChildren = axChildNodes(axListItem);
          if (axChildren.length !== 2)
            return void 0;
          const [markerNode, textNode] = axChildren;
          const marker = nativeAxNestedListMarkerText(markerNode);
          if (!marker)
            return void 0;
          if (normalizedAxRole(textNode.role) !== "statictext")
            return void 0;
          const axText = normalize(textNode.name);
          if (!axText || axText !== text)
            return void 0;
          const position = positionInSet(el, "listitem");
          const size = setSize(el, "listitem");
          if (!position || !size)
            return void 0;
          return `${marker} ${axText}, ${position} of ${size}`;
        }
        function axMarkerOnlyListItemStopAnnouncement(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.getAttribute("data-sr-marker-content") !== "normal")
            return void 0;
          const markerDisplay = normalize(el.getAttribute("data-sr-marker-display"));
          if (markerDisplay !== "inline" && markerDisplay !== "inline-block")
            return void 0;
          const markerStyle = normalize(el.getAttribute("data-sr-marker-list-style-type"));
          if (markerStyle !== "disc" && markerStyle !== "square")
            return void 0;
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (isMarkerSeparatedLinkList(list))
            return void 0;
          if (axInlineTwoLinkListItemAnnouncements(el))
            return void 0;
          if (el.querySelector("ul, ol, dl, [role='list']"))
            return void 0;
          if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]"))
            return void 0;
          const axListItem = axNodeForElementRole(el, "listitem");
          if (normalize(axListItem?.name))
            return void 0;
          const axChildren = axChildNodes(axListItem);
          if (axChildren.length < 2)
            return void 0;
          const [markerNode, ...contentNodes] = axChildren;
          if (!nativeAxListMarkerText(markerNode))
            return void 0;
          const linkTrailingTextAnnouncement = axMarkerLinkTrailingTextListItemAnnouncement(el);
          const axLinks = contentNodes.filter((node) => normalizedAxRole(node.role) === "link");
          const axStrong = contentNodes.filter((node) => normalizedAxRole(node.role) === "strong");
          if (axLinks.length && axStrong.length)
            return void 0;
          if (!axLinks.length && axStrong.length !== 1)
            return void 0;
          const domLinks = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link) && link.closest("li,[role='listitem']") === el && link.closest("ul, ol, dl, [role='list']") === list);
          if (axLinks.length !== domLinks.length)
            return void 0;
          let linkIndex = 0;
          for (const node of contentNodes) {
            const role = normalizedAxRole(node.role);
            if (role === "link") {
              const link = domLinks[linkIndex];
              if (!link || node.properties?.focusable !== true)
                return void 0;
              if (normalize(node.domNodeId) !== normalize(link.getAttribute("data-sr-dom-node-id"))) {
                return void 0;
              }
              linkIndex += 1;
              continue;
            }
            if (role === "statictext" && /^[,\s]+$/.test(node.name || ""))
              continue;
            if (role === "statictext" && linkTrailingTextAnnouncement && axLinks.length === 1 && contentNodes.length === 2) {
              continue;
            }
            if (role === "strong" && !axLinks.length && axStrong.length === 1)
              continue;
            return void 0;
          }
          return nativeAxMarkerAnnouncement(markerNode, positionInSet(el, "listitem"), setSize(el, "listitem"));
        }
        function axMarkerOnlyListItemInlineTextAnnouncement(el) {
          if (!axMarkerOnlyListItemStopAnnouncement(el))
            return void 0;
          const axListItem = axNodeForElementRole(el, "listitem");
          const [, ...contentNodes] = axChildNodes(axListItem);
          if (contentNodes.length !== 1 || normalizedAxRole(contentNodes[0].role) !== "strong") {
            return void 0;
          }
          const strong = Array.from(el.children || []).find((child) => !isHidden(child) && child.tagName?.toLowerCase() === "strong");
          const axText = normalize(axChildNodes(contentNodes[0]).map((node) => node.name || "").join(" "));
          return axText || normalize(readableText(strong) || readableText(el));
        }
        function axMarkerLinkTrailingTextListItemAnnouncement(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.getAttribute("data-sr-marker-content") !== "normal")
            return void 0;
          if (el.getAttribute("data-sr-marker-display") !== "inline-block")
            return void 0;
          if (normalize(el.getAttribute("data-sr-marker-list-style-type")) !== "disc") {
            return void 0;
          }
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (isMarkerSeparatedLinkList(list))
            return void 0;
          if (axInlineTwoLinkListItemAnnouncements(el))
            return void 0;
          if (el.querySelector("ul, ol, dl, [role='list']"))
            return void 0;
          if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]"))
            return void 0;
          const children = directSemanticChildren(el);
          if (children.length !== 1 || children[0].tagName?.toLowerCase() !== "a" || !children[0].hasAttribute("href")) {
            return void 0;
          }
          const trailingText = normalize(directOwnText(el));
          if (!trailingText)
            return void 0;
          const axListItem = axNodeForElementRole(el, "listitem");
          if (normalize(axListItem?.name))
            return void 0;
          const axChildren = axChildNodes(axListItem);
          if (axChildren.length !== 3)
            return void 0;
          const [markerNode, linkNode, textNode] = axChildren;
          if (normalizedAxRole(markerNode.role) !== "listmarker")
            return void 0;
          if (normalizedAxRole(linkNode.role) !== "link")
            return void 0;
          if (normalizedAxRole(textNode.role) !== "statictext")
            return void 0;
          if (nativeAxListMarkerText(markerNode) !== "\u2022")
            return void 0;
          if (linkNode.properties?.focusable !== true)
            return void 0;
          if (normalize(linkNode.domNodeId) !== normalize(children[0].getAttribute("data-sr-dom-node-id"))) {
            return void 0;
          }
          const axTrailingText = normalize(textNode.name);
          if (!axTrailingText || axTrailingText !== trailingText)
            return void 0;
          return `\u2022 ${axTrailingText}`;
        }
        function isAxMarkerOnlyListItemChildContent(el, role = implicitRole(el)) {
          if (role !== "link")
            return false;
          const listItem = el?.closest?.("li,[role='listitem']");
          if (!listItem || !axMarkerOnlyListItemStopAnnouncement(listItem))
            return false;
          return Array.from(listItem.querySelectorAll("a[href], [role='link']")).some((link) => link === el);
        }
        function isAxMarkerPrefixedTextListItemChildContent(el, role = implicitRole(el)) {
          if (role !== "link")
            return false;
          const listItem = el?.closest?.("li,[role='listitem']");
          if (!listItem || !axPlainTextMarkerListItemAnnouncement(listItem))
            return false;
          return Array.from(listItem.querySelectorAll("a[href], [role='link']")).some((link) => link === el);
        }
        function isAxStrongWrappedMarkerListItemChildContent(el, role = implicitRole(el)) {
          if (role !== "link")
            return false;
          const listItem = el?.closest?.("li,[role='listitem']");
          if (!listItem || !axStrongWrappedMarkerListItemAnnouncements(listItem))
            return false;
          return Array.from(listItem.querySelectorAll("a[href], [role='link']")).some((link) => link === el);
        }
        function isCategorizedListItemBodyLink(el, role = implicitRole(el)) {
          if (role !== "link")
            return false;
          const listItem = el?.closest?.("li,[role='listitem']");
          if (!listItem || el.parentElement !== listItem)
            return false;
          const list = listForItem(listItem);
          if (!list || listItem.querySelector("ul, ol, dl, [role='list']"))
            return false;
          const visibleChildren = Array.from(listItem.children || []).filter((child) => !isHidden(child));
          const directLinks = visibleChildren.filter((child) => child.tagName?.toLowerCase() === "a" && child.hasAttribute("href") && !isHidden(child));
          if (!directLinks.includes(el))
            return false;
          const headerLinks = Array.from(listItem.querySelectorAll("a[href], [role='link']")).filter((link) => !directLinks.includes(link) && !isHidden(link) && link.closest("li,[role='listitem']") === listItem);
          if (!headerLinks.length)
            return false;
          const firstDirectLinkIndex = visibleChildren.indexOf(directLinks[0]);
          const headerChild = visibleChildren.find((child) => headerLinks.some((link) => child !== link && child.contains(link)));
          if (!headerChild)
            return false;
          const headerIndex = visibleChildren.indexOf(headerChild);
          return headerIndex >= 0 && firstDirectLinkIndex >= 0 && headerIndex < firstDirectLinkIndex;
        }
        function axPublicationListItemBoundaryAnnouncements(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.getAttribute("data-sr-marker-content") !== "normal")
            return void 0;
          if (el.getAttribute("data-sr-marker-display") !== "inline-block")
            return void 0;
          if (normalize(el.getAttribute("data-sr-marker-list-style-type")) !== "disc") {
            return void 0;
          }
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (isMarkerSeparatedLinkList(list))
            return void 0;
          if (el.querySelector("ul, ol, dl, [role='list']"))
            return void 0;
          if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]"))
            return void 0;
          const axListItem = axNodeForElementRole(el, "listitem");
          if (normalize(axListItem?.name))
            return void 0;
          const axChildren = axChildNodes(axListItem);
          if (axChildren.length < 3)
            return void 0;
          const [markerNode, ...contentNodes] = axChildren;
          if (normalizedAxRole(markerNode.role) !== "listmarker")
            return void 0;
          if (normalize(markerNode.name)?.replace(/\s+$/g, "") !== "\u2022")
            return void 0;
          const position = positionInSet(el, "listitem");
          const size = setSize(el, "listitem");
          if (!position || !size)
            return void 0;
          const markerAnnouncement = `\u2022, ${position} of ${size}`;
          const visibleElementChildren2 = Array.from(el.children || []).filter((child) => !isHidden(child));
          function directLinks() {
            return Array.from(el.children || []).filter((child) => !isHidden(child) && child.tagName?.toLowerCase() === "a" && child.hasAttribute("href") && child.closest("li,[role='listitem']") === el);
          }
          function linkAnnouncement(node, link) {
            if (normalizedAxRole(node.role) !== "link")
              return void 0;
            if (node.properties?.focusable !== true)
              return void 0;
            if (normalize(node.domNodeId) !== normalize(link.getAttribute("data-sr-dom-node-id"))) {
              return void 0;
            }
            const name = normalize(node.name) || accessibleName(link, "link");
            return name ? `link, ${name}` : void 0;
          }
          if (contentNodes.length === 4 && normalizedAxRole(contentNodes[0].role) === "link" && normalizedAxRole(contentNodes[1].role) === "statictext" && normalizedAxRole(contentNodes[2].role) === "link" && normalizedAxRole(contentNodes[3].role) === "statictext") {
            const links = directLinks();
            if (visibleElementChildren2.length !== 2 || links.length !== 2)
              return void 0;
            if (visibleElementChildren2.some((child) => !links.includes(child))) {
              return void 0;
            }
            const firstLink = linkAnnouncement(contentNodes[0], links[0]);
            const firstText = normalize(contentNodes[1].name);
            const secondLink = linkAnnouncement(contentNodes[2], links[1]);
            const trailingText = normalize(contentNodes[3].name);
            if (!firstLink || !firstText || !secondLink || !trailingText)
              return void 0;
            if (!/[\p{L}\p{N}]/u.test(firstText) || !/[\p{L}\p{N}]/u.test(trailingText)) {
              return void 0;
            }
            return [markerAnnouncement, firstLink, firstText, secondLink, trailingText];
          }
          if (contentNodes.length === 2 && ["strong", "emphasis"].includes(normalizedAxRole(contentNodes[0].role) || "") && normalizedAxRole(contentNodes[1].role) === "statictext") {
            if (visibleElementChildren2.length !== 1)
              return void 0;
            const wrapper = visibleElementChildren2[0];
            if (!["strong", "b", "em", "i"].includes(wrapper.tagName?.toLowerCase())) {
              return void 0;
            }
            const wrapperLinks = Array.from(wrapper.querySelectorAll("a[href], [role='link']")).filter((link2) => !isHidden(link2));
            if (wrapperLinks.length !== 1)
              return void 0;
            if (directOwnText(wrapper))
              return void 0;
            const wrappedAxChildren = axChildNodes(contentNodes[0]);
            if (wrappedAxChildren.length !== 1)
              return void 0;
            const link = wrapperLinks[0];
            const linkStop = linkAnnouncement(wrappedAxChildren[0], link);
            const trailingText = normalize(contentNodes[1].name);
            if (!linkStop || !trailingText || !/[\p{L}\p{N}]/u.test(trailingText)) {
              return void 0;
            }
            return [markerAnnouncement, linkStop, `\u2022 ${trailingText}`];
          }
          return void 0;
        }
        function axMixedInlineListItemAnnouncements(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.getAttribute("data-sr-marker-content") !== "normal")
            return void 0;
          if (el.getAttribute("data-sr-marker-display") !== "inline-block")
            return void 0;
          if (normalize(el.getAttribute("data-sr-marker-list-style-type")) !== "disc") {
            return void 0;
          }
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (isMarkerSeparatedLinkList(list))
            return void 0;
          if (el.querySelector("ul, ol, dl, [role='list']"))
            return void 0;
          if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]"))
            return void 0;
          const position = positionInSet(el, "listitem");
          const size = setSize(el, "listitem");
          if (!position || !size)
            return void 0;
          const visibleElementChildren2 = Array.from(el.children || []).filter((child) => !isHidden(child) || isSerializedOffscreenCodeBoundary(child));
          const directLinks = Array.from(el.children || []).filter((child) => !isHidden(child) && child.tagName?.toLowerCase() === "a" && child.hasAttribute("href"));
          if (!directLinks.length) {
            if (!isGovukDesignSystemDocument())
              return void 0;
            const codeChildren = visibleElementChildren2.filter((child) => child.tagName?.toLowerCase() === "code");
            if (codeChildren.length !== 1 || visibleElementChildren2.length !== 1) {
              return void 0;
            }
            const axListItem2 = axNodeForElementRole(el, "listitem");
            if (normalize(axListItem2?.name))
              return void 0;
            const axChildren2 = axChildNodes(axListItem2);
            if (axChildren2.length !== 2 && axChildren2.length !== 3)
              return void 0;
            const [markerNode2, codeNode, trailingNode] = axChildren2;
            if (normalizedAxRole(markerNode2.role) !== "listmarker")
              return void 0;
            if (normalize(markerNode2.name)?.replace(/\s+$/g, "") !== "\u2022")
              return void 0;
            if (normalizedAxRole(codeNode.role) !== "code")
              return void 0;
            const codeTextNode = axChildNodes(codeNode).find((child) => normalizedAxRole(child.role) === "statictext");
            const codeText = normalize(codeTextNode?.name || codeChildren[0].textContent);
            if (!codeText)
              return void 0;
            if (trailingNode && normalizedAxRole(trailingNode.role) !== "statictext") {
              return void 0;
            }
            const trailingText = normalize(trailingNode?.name);
            return [
              `\u2022, ${position} of ${size}`,
              codeText,
              trailingText
            ].filter((announcement) => Boolean(announcement));
          }
          if (visibleElementChildren2.some((child) => !directLinks.includes(child))) {
            return void 0;
          }
          const axListItem = axNodeForElementRole(el, "listitem");
          if (normalize(axListItem?.name))
            return void 0;
          const axChildren = axChildNodes(axListItem);
          if (axChildren.length !== 4)
            return void 0;
          const [markerNode, firstNode, secondNode, thirdNode] = axChildren;
          if (normalizedAxRole(markerNode.role) !== "listmarker")
            return void 0;
          if (normalize(markerNode.name)?.replace(/\s+$/g, "") !== "\u2022")
            return void 0;
          function directTextSegments() {
            return Array.from(el.childNodes || []).filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => normalize(child.textContent || "")).filter((text) => Boolean(text));
          }
          function linkAnnouncement(node, link) {
            if (normalizedAxRole(node.role) !== "link")
              return void 0;
            if (node.properties?.focusable !== true)
              return void 0;
            if (normalize(node.domNodeId) !== normalize(link.getAttribute("data-sr-dom-node-id"))) {
              return void 0;
            }
            const name = normalize(node.name) || accessibleName(link, "link");
            return name ? `link, ${name}` : void 0;
          }
          if (normalizedAxRole(firstNode.role) === "statictext" && normalizedAxRole(secondNode.role) === "link" && normalizedAxRole(thirdNode.role) === "statictext") {
            if (directLinks.length !== 1)
              return void 0;
            const [leadingText, trailingText] = directTextSegments();
            const axLeadingText = normalize(firstNode.name);
            const axTrailingText = normalize(thirdNode.name);
            if (!leadingText || !trailingText || leadingText !== axLeadingText || trailingText !== axTrailingText || !/[\p{L}\p{N}]/u.test(trailingText)) {
              return void 0;
            }
            const linkStop = linkAnnouncement(secondNode, directLinks[0]);
            if (!linkStop)
              return void 0;
            return [`\u2022 ${axLeadingText}, ${position} of ${size}`, linkStop, axTrailingText];
          }
          if (normalizedAxRole(firstNode.role) === "link" && normalizedAxRole(secondNode.role) === "statictext" && normalizedAxRole(thirdNode.role) === "link") {
            if (directLinks.length !== 2)
              return void 0;
            const [separatorText] = directTextSegments();
            const axSeparatorText = normalize(secondNode.name);
            if (!separatorText || separatorText !== axSeparatorText || !/[\p{L}\p{N}]/u.test(separatorText)) {
              return void 0;
            }
            const firstLink = linkAnnouncement(firstNode, directLinks[0]);
            const secondLink = linkAnnouncement(thirdNode, directLinks[1]);
            if (!firstLink || !secondLink)
              return void 0;
            return [`\u2022, ${position} of ${size}`, firstLink, axSeparatorText, secondLink];
          }
          return void 0;
        }
        function axStrongWrappedMarkerListItemAnnouncements(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.getAttribute("data-sr-marker-content") !== "normal")
            return void 0;
          if (el.getAttribute("data-sr-marker-display") !== "inline-block")
            return void 0;
          if (normalize(el.getAttribute("data-sr-marker-list-style-type")) !== "disc") {
            return void 0;
          }
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (isMarkerSeparatedLinkList(list))
            return void 0;
          if (el.querySelector("ul, ol, dl, [role='list']"))
            return void 0;
          if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]"))
            return void 0;
          const visibleElementChildren2 = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (visibleElementChildren2.length !== 1)
            return void 0;
          const wrapper = visibleElementChildren2[0];
          if (!["strong", "b", "em", "i"].includes(wrapper.tagName?.toLowerCase())) {
            return void 0;
          }
          const links = Array.from(wrapper.querySelectorAll("a[href], [role='link']")).filter((link2) => !isHidden(link2) && link2.closest("li,[role='listitem']") === el && link2.closest("ul, ol, dl, [role='list']") === list);
          if (links.length !== 1)
            return void 0;
          const axListItem = axNodeForElementRole(el, "listitem");
          if (normalize(axListItem?.name))
            return void 0;
          const axChildren = axChildNodes(axListItem);
          if (axChildren.length !== 2)
            return void 0;
          const [markerNode, wrapperNode] = axChildren;
          if (normalizedAxRole(markerNode.role) !== "listmarker")
            return void 0;
          if (normalize(markerNode.name)?.replace(/\s+$/g, "") !== "\u2022")
            return void 0;
          if (!["strong", "emphasis"].includes(normalizedAxRole(wrapperNode.role) || "")) {
            return void 0;
          }
          if (normalize(wrapperNode.domNodeId) !== normalize(wrapper.getAttribute("data-sr-dom-node-id"))) {
            return void 0;
          }
          const wrappedAxChildren = axChildNodes(wrapperNode);
          if (wrappedAxChildren.length !== 2)
            return void 0;
          const [textNode, linkNode] = wrappedAxChildren;
          if (normalizedAxRole(textNode.role) !== "statictext")
            return void 0;
          if (normalizedAxRole(linkNode.role) !== "link")
            return void 0;
          if (linkNode.properties?.focusable !== true)
            return void 0;
          const link = links[0];
          if (normalize(linkNode.domNodeId) !== normalize(link.getAttribute("data-sr-dom-node-id"))) {
            return void 0;
          }
          const staticText = normalize(textNode.name);
          const linkName = normalize(linkNode.name) || accessibleName(link, "link");
          const position = positionInSet(el, "listitem");
          const size = setSize(el, "listitem");
          if (!staticText || !linkName || !position || !size)
            return void 0;
          if (!/[\p{L}\p{N}]/u.test(staticText))
            return void 0;
          return [`\u2022, ${position} of ${size}`, staticText];
        }
        function axInlineTwoLinkListItemAnnouncements(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.getAttribute("data-sr-marker-content") !== "normal")
            return void 0;
          if (el.getAttribute("data-sr-marker-display") !== "inline-block")
            return void 0;
          if (normalize(el.getAttribute("data-sr-marker-list-style-type")) !== "disc") {
            return void 0;
          }
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (announcedListChildren(list).length !== 1)
            return void 0;
          if (el.querySelector("ul, ol, dl, [role='list']"))
            return void 0;
          if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]"))
            return void 0;
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link) && link.closest("li,[role='listitem']") === el && link.closest("ul, ol, dl, [role='list']") === list);
          if (links.length !== 2)
            return void 0;
          const axListItem = axNodeForElementRole(el, "listitem");
          const axChildren = axChildNodes(axListItem);
          if (axChildren.length !== 4)
            return void 0;
          const [markerNode, firstLinkNode, separatorNode, secondLinkNode] = axChildren;
          if (normalizedAxRole(markerNode.role) !== "listmarker")
            return void 0;
          if (normalizedAxRole(firstLinkNode.role) !== "link")
            return void 0;
          if (normalizedAxRole(separatorNode.role) !== "statictext")
            return void 0;
          if (normalizedAxRole(secondLinkNode.role) !== "link")
            return void 0;
          if (normalize(separatorNode.name) !== ",")
            return void 0;
          if (firstLinkNode.properties?.focusable !== true)
            return void 0;
          if (secondLinkNode.properties?.focusable !== true)
            return void 0;
          const [firstLink, secondLink] = links;
          if (normalize(firstLinkNode.domNodeId) !== normalize(firstLink.getAttribute("data-sr-dom-node-id"))) {
            return void 0;
          }
          if (normalize(secondLinkNode.domNodeId) !== normalize(secondLink.getAttribute("data-sr-dom-node-id"))) {
            return void 0;
          }
          const firstName = normalize(firstLinkNode.name) || accessibleName(firstLink, "link");
          const secondName = normalize(secondLinkNode.name) || accessibleName(secondLink, "link");
          if (!firstName || !secondName)
            return void 0;
          return [
            "You are currently on a AXListMarker.",
            `link, ${firstName}`,
            "You are currently on a selectable list item.",
            `link, ${secondName}`
          ];
        }
        function axPlainTextMarkerListItemText(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.getAttribute("data-sr-marker-content") !== "normal")
            return void 0;
          if (el.getAttribute("data-sr-marker-display") !== "inline-block")
            return void 0;
          if (normalize(el.getAttribute("data-sr-marker-list-style-type")) === "none") {
            return void 0;
          }
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (el.querySelector("ul, ol, dl, [role='list']"))
            return void 0;
          if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]"))
            return void 0;
          const axListItem = axNodeForElementRole(el, "listitem");
          if (normalize(axListItem?.name))
            return void 0;
          const axChildren = axChildNodes(axListItem);
          if (axChildren.length < 2)
            return void 0;
          const [markerNode, textNode, ...followingNodes] = axChildren;
          if (normalizedAxRole(markerNode.role) !== "listmarker")
            return void 0;
          if (normalizedAxRole(textNode.role) !== "statictext")
            return void 0;
          const marker = nativeAxListMarkerText(markerNode);
          const text = normalize(textNode.name);
          if (!marker || !text)
            return void 0;
          if (marker !== "\u2022" && !/^\d+[.)]$/u.test(marker))
            return void 0;
          const leadingText = directLeadingText(el);
          if (!leadingText || text !== leadingText)
            return void 0;
          const domLinks = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link) && link.closest("li,[role='listitem']") === el && link.closest("ul, ol, dl, [role='list']") === list);
          const semanticChildren = directSemanticChildren(el);
          if (semanticChildren.some((child) => !domLinks.includes(child)) || !domLinks.every((link) => semanticChildren.includes(link))) {
            return void 0;
          }
          let linkIndex = 0;
          for (const node of followingNodes) {
            const role = normalizedAxRole(node.role);
            if (role === "link") {
              const link = domLinks[linkIndex];
              if (!link || node.properties?.focusable !== true)
                return void 0;
              if (normalize(node.domNodeId) !== normalize(link.getAttribute("data-sr-dom-node-id"))) {
                return void 0;
              }
              linkIndex += 1;
              continue;
            }
            if (role === "statictext" && /^[\s.,;:!?]+$/.test(node.name || ""))
              continue;
            return void 0;
          }
          if (linkIndex !== domLinks.length)
            return void 0;
          return text;
        }
        function axPlainTextMarkerTextOnlyListItemText(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          if (el.getAttribute("data-sr-marker-content") !== "normal")
            return void 0;
          if (el.getAttribute("data-sr-marker-display") !== "inline-block")
            return void 0;
          if (normalize(el.getAttribute("data-sr-marker-list-style-type")) !== "disc") {
            return void 0;
          }
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (el.querySelector("a[href], [role='link'], button, [role='button'], ul, ol, dl, [role='list']")) {
            return void 0;
          }
          if (el.matches?.("[aria-live], [aria-disabled='true'], [hidden]"))
            return void 0;
          const axListItem = axNodeForElementRole(el, "listitem");
          if (normalize(axListItem?.name))
            return void 0;
          const axChildren = axChildNodes(axListItem);
          if (axChildren.length !== 2)
            return void 0;
          const [markerNode, textNode] = axChildren;
          if (normalizedAxRole(markerNode.role) !== "listmarker")
            return void 0;
          if (normalizedAxRole(textNode.role) !== "statictext")
            return void 0;
          const marker = nativeAxListMarkerText(markerNode);
          if (!marker || marker !== "\u2022" && !/^\d+[.)]$/u.test(marker))
            return void 0;
          const text = normalize(textNode.name);
          if (!text || text !== normalize(readableText(el)))
            return void 0;
          return text;
        }
        function axPlainTextMarkerListItemAnnouncement(el) {
          const text = axPlainTextMarkerListItemText(el) || axPlainTextMarkerTextOnlyListItemText(el);
          if (!text)
            return void 0;
          const list = listForItem(el);
          if (!list)
            return void 0;
          const siblings = announcedListChildren(list);
          const hasCompatibleMarkerSiblings = siblings.every((item) => axPlainTextMarkerListItemText(item) || axPlainTextMarkerTextOnlyListItemText(item) || axStrongWrappedMarkerListItemAnnouncements(item));
          if (!siblings.length || !hasCompatibleMarkerSiblings) {
            return void 0;
          }
          const hasDirectLink = directSemanticChildren(el).some((child) => child.tagName?.toLowerCase() === "a" && child.hasAttribute("href"));
          const allSiblingsArePlainText = siblings.every((item) => {
            if (Array.from(item.children || []).some((child) => !isHidden(child))) {
              return false;
            }
            return !item.querySelector(interactiveSelector);
          });
          const hasTextLinkSibling = siblings.some((item) => item !== el && directSemanticChildren(item).some((child) => child.tagName?.toLowerCase() === "a" && child.hasAttribute("href")));
          const hasStrongWrappedMarkerSibling = siblings.some((item) => item !== el && axStrongWrappedMarkerListItemAnnouncements(item));
          if (!hasDirectLink && !allSiblingsArePlainText && !hasTextLinkSibling && !hasStrongWrappedMarkerSibling) {
            return void 0;
          }
          const position = positionInSet(el, "listitem");
          const size = setSize(el, "listitem");
          const suffix = position && size ? `, ${position} of ${size}` : "";
          const axListItem = axNodeForElementRole(el, "listitem");
          const marker = nativeAxListMarkerText(axChildNodes(axListItem)[0]);
          if (!marker)
            return void 0;
          return `${marker} ${text}${suffix}`;
        }
        function splitHeaderListItemParts(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (el.querySelector("a[href], [role='link'], button, [role='button'], ul, ol, dl, [role='list']")) {
            return void 0;
          }
          if (directOwnText(el))
            return void 0;
          const children = Array.from(el.children || []).filter((child) => !isHidden(child) && Boolean(readableText(child)));
          if (children.length < 2)
            return void 0;
          const [header, ...bodyChildren] = children;
          if (!["div", "span"].includes(header.tagName?.toLowerCase()))
            return void 0;
          if (directOwnText(header))
            return void 0;
          if (!bodyChildren.some((child) => readableText(child)))
            return void 0;
          const headerChildren = Array.from(header.children || []).filter((child) => !isHidden(child) && Boolean(readableText(child)));
          if (headerChildren.length !== 2)
            return void 0;
          const [prefixEl, titleEl] = headerChildren;
          if (prefixEl.querySelector?.(interactiveSelector) || titleEl.querySelector?.(interactiveSelector)) {
            return void 0;
          }
          const prefix = normalize(readableText(prefixEl));
          const title = normalize(readableText(titleEl));
          if (!prefix || !/^\d{1,3}\.$/.test(prefix))
            return void 0;
          if (!title || title === prefix)
            return void 0;
          const axListItem = axNodeForElementRole(el, "listitem");
          if (!axListItem || normalize(axListItem.name))
            return void 0;
          return { header, prefixEl, titleEl, prefix, title };
        }
        function axSplitHeaderListItemAnnouncement(el) {
          const parts = splitHeaderListItemParts(el);
          if (!parts)
            return void 0;
          const list = listForItem(el);
          if (!list)
            return void 0;
          const siblings = announcedListChildren(list);
          if (siblings.length < 2 || !siblings.every((item) => Boolean(splitHeaderListItemParts(item)))) {
            return void 0;
          }
          const position = positionInSet(el, "listitem");
          const size = setSize(el, "listitem");
          const suffix = position && size ? `, ${position} of ${size}` : "";
          return `${parts.prefix} ${parts.title}${suffix}`;
        }
        function isSplitHeaderListItemHeaderContent(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          const listItem = el.closest?.("li,[role='listitem']");
          const parts = splitHeaderListItemParts(listItem);
          if (!parts || !axSplitHeaderListItemAnnouncement(listItem))
            return false;
          return el === parts.header || parts.header.contains(el);
        }
        function contributionListItemAnnouncements(el) {
          if (!isListItem(el) || el.tagName?.toLowerCase() !== "li")
            return void 0;
          const list = listForItem(el);
          if (!list || !["ul", "ol"].includes(list.tagName?.toLowerCase()))
            return void 0;
          if (el.querySelector("ul, ol, dl, [role='list']"))
            return void 0;
          if (directOwnText(el))
            return void 0;
          const children = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (children.length !== 3)
            return void 0;
          const [repoWrapper, timeEl, titleWrapper] = children;
          if (timeEl.tagName?.toLowerCase() !== "time" || !readableText(timeEl))
            return void 0;
          if (repoWrapper.matches?.(interactiveSelector) || titleWrapper.matches?.(interactiveSelector)) {
            return void 0;
          }
          const directRowLinks = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link) && link.closest("li,[role='listitem']") === el && link.closest("ul, ol, dl, [role='list']") === list);
          if (directRowLinks.length !== 2)
            return void 0;
          const [repoLink, titleLink] = directRowLinks;
          if (!repoWrapper.contains(repoLink) || !titleWrapper.contains(titleLink))
            return void 0;
          if (repoWrapper.querySelectorAll("a[href], [role='link']").length !== 1)
            return void 0;
          if (titleWrapper.querySelectorAll("a[href], [role='link']").length !== 1)
            return void 0;
          if (!axNodeForElementRole(el, "listitem"))
            return void 0;
          const repoNode = axNodeForElementRole(repoLink, "link");
          const timeNode = axNodeForElementRole(timeEl, "time");
          const titleNode = axNodeForElementRole(titleWrapper, "generic");
          if (!repoNode || !timeNode || !titleNode)
            return void 0;
          const titleNodeChildren = axChildNodes(titleNode);
          if (titleNodeChildren.length !== 1 || normalizedAxRole(titleNodeChildren[0].role) !== "link") {
            return void 0;
          }
          const titleLinkNode = titleNodeChildren[0];
          if (repoNode.properties?.focusable !== true || titleLinkNode.properties?.focusable !== true) {
            return void 0;
          }
          if (normalize(repoNode.domNodeId) !== normalize(repoLink.getAttribute("data-sr-dom-node-id")) || normalize(timeNode.domNodeId) !== normalize(timeEl.getAttribute("data-sr-dom-node-id")) || normalize(titleLinkNode.domNodeId) !== normalize(titleLink.getAttribute("data-sr-dom-node-id"))) {
            return void 0;
          }
          const repoName = normalize(repoNode.name) || accessibleName(repoLink, "link");
          const timeText = normalize(readableText(timeEl) || axChildNodes(timeNode)[0]?.name);
          const titleName = normalize(titleLinkNode.name) || accessibleName(titleLink, "link");
          if (!repoName || !timeText || !titleName)
            return void 0;
          const position = positionInSet(el, "listitem");
          const size = setSize(el, "listitem");
          const repoPosition = position && size ? `, ${position} of ${size}` : "";
          return [
            `link, ${repoName}${repoPosition}`,
            timeText,
            `link, ${titleName}`
          ];
        }
        function isMarkerSeparatedListRegion(el, role = implicitRole(el)) {
          if (role !== "region")
            return false;
          if (el.tagName?.toLowerCase() !== "section")
            return false;
          if (!el.hasAttribute("aria-labelledby"))
            return false;
          return Array.from(el.children || []).some((child) => isMarkerSeparatedLinkList(child));
        }
        function markerSeparatedListRegionHasInteractiveLabel(el) {
          if (!el?.hasAttribute?.("aria-labelledby"))
            return false;
          return (el.getAttribute("aria-labelledby") || "").split(/\s+/).some((id) => {
            const label = id ? document.getElementById(id) : null;
            return Boolean(label?.querySelector?.(interactiveSelector));
          });
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
        function hasStructuredNewsCardListItemContent(el) {
          if (!isListItem(el))
            return false;
          if (!el.querySelector("a[href], [role='link']"))
            return false;
          if (!el.querySelector("p"))
            return false;
          if (!el.querySelector("ul, ol, [role='list']"))
            return false;
          return true;
        }
        function directListArticleCardFor(el) {
          const article = el?.closest?.("article,[role='article']");
          if (!article || isHidden(article))
            return null;
          const listItem = article.parentElement;
          if (!isListItem(listItem))
            return null;
          if (el.closest("li,[role='listitem']") !== listItem)
            return null;
          const list = listForItem(listItem);
          if (!list || list.tagName?.toLowerCase() === "dl")
            return null;
          if (announcedListChildren(list).length < 2)
            return null;
          const children = directSemanticChildren(listItem);
          if (children.length !== 1 || children[0] !== article)
            return null;
          const hasHeading = Boolean(article.querySelector("h1,h2,h3,h4,h5,h6,[role='heading']"));
          const hasLink = Boolean(article.querySelector("a[href], [role='link']"));
          if (!hasLink)
            return null;
          if (hasHeading)
            return article;
          const articleChildren = directSemanticChildren(article);
          return articleChildren.length === 1 && implicitRole(articleChildren[0]) === "link" && Boolean(readableText(articleChildren[0])) ? article : null;
        }
        function isDescendantOfDirectListArticleCard(el) {
          const article = directListArticleCardFor(el);
          return Boolean(article && article !== el);
        }
        function isPrimaryStructuredNewsCardLink(el) {
          if (implicitRole(el) !== "link")
            return false;
          const listItem = el.closest("li,[role='listitem']");
          if (!hasStructuredNewsCardListItemContent(listItem))
            return false;
          if (el.closest("ul, ol, dl, [role='list']") !== listForItem(listItem)) {
            return false;
          }
          const links = Array.from(listItem.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link) && link.closest("li,[role='listitem']") === listItem && link.closest("ul, ol, dl, [role='list']") === listForItem(listItem));
          return links[0] === el;
        }
        function metadataListItemValueAnnouncements(el) {
          if (!isMetadataLabelValueListItem(el))
            return void 0;
          const cells = visibleMetadataListItemCells(el);
          const valueCell = cells[1];
          const interactive = Array.from(valueCell.querySelectorAll("a[href], [role='link'], button, [role='button']")).filter((candidate) => !isHidden(candidate));
          if (interactive.length === 1) {
            const control = interactive[0];
            const role = implicitRole(control);
            const name = accessibleName(control, role) || readableText(control);
            if (!name || role !== "link" && role !== "button")
              return void 0;
            return [role === "link" ? `link, ${name}` : `${name}, button`];
          }
          if (interactive.length)
            return void 0;
          const valueText = readableText(valueCell);
          return valueText ? [valueText] : void 0;
        }
        function isMetadataLabelValueListItem(el) {
          if (!isListItem(el))
            return false;
          const list = listForItem(el);
          if (!list || list.tagName?.toLowerCase() === "dl")
            return false;
          if (el.querySelector("ul, ol, dl, [role='list']"))
            return false;
          if (directOwnText(el))
            return false;
          const cells = visibleMetadataListItemCells(el);
          if (cells.length !== 2)
            return false;
          const [labelCell, valueCell] = cells;
          if (labelCell.querySelector(interactiveSelector))
            return false;
          const formControlSelector = "input, select, textarea, [role='combobox'], [role='textbox'], [role='searchbox'], [role='listbox']";
          if (valueCell.matches?.(formControlSelector) || valueCell.querySelector(formControlSelector)) {
            return false;
          }
          if (!readableText(labelCell) || !readableText(valueCell))
            return false;
          return true;
        }
        function visibleMetadataListItemCells(el) {
          return walkChildren(el).filter((child) => !isHidden(child) && !child.matches?.("script, style, template") && Boolean(readableText(child) || child.querySelector?.(interactiveSelector)));
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
        function isCarouselDescriptionOnlyControlContainer(el, role) {
          if (role !== "group" || el.matches(interactiveSelector))
            return false;
          const id = normalize(el.getAttribute("id"));
          if (!id)
            return false;
          const label = accessibleName(el, role) || readableText(el);
          if (!label)
            return false;
          const carousel = el.closest("[aria-roledescription='carousel'], [aria-roledescription='slideshow']");
          if (!carousel)
            return false;
          const children = walkChildren(el).filter((child) => child.nodeType === Node.ELEMENT_NODE && !isHidden(child) && !child.matches?.("script, style, template"));
          if (!children.length)
            return false;
          if (children.some((child) => implicitRole(child) !== "button"))
            return false;
          const describedButtons = children.filter((child) => normalize(child.getAttribute("aria-describedby"))?.split(/\s+/).includes(id));
          if (describedButtons.length !== children.length)
            return false;
          if (accessibilityNodes.length) {
            const axNode = axNodeForElement(el);
            if (!axNode || normalize(axNode.name) !== label)
              return false;
            for (const button of describedButtons) {
              const buttonName = accessibleName(button, "button");
              const buttonNode = axNodeForElementRole(button, "button");
              if (!buttonNode || normalize(buttonNode.name) !== buttonName)
                return false;
              if (normalize(buttonNode.description) !== label)
                return false;
            }
          }
          return true;
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
        function nextVisibleElementSibling(el) {
          for (let sibling = el?.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
            if (!isHidden(sibling))
              return sibling;
          }
          return null;
        }
        function previousVisibleElementSibling(el) {
          for (let sibling = el?.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
            if (!isHidden(sibling))
              return sibling;
          }
          return null;
        }
        function terminalFooterElement(el) {
          let current = el;
          while (current?.nodeType === Node.ELEMENT_NODE && !isHidden(current)) {
            if (implicitRole(current) === "contentinfo") {
              return current;
            }
            const visibleChildren = Array.from(current.children || []).filter((child) => !isHidden(child));
            if (!visibleChildren.length) {
              return null;
            }
            current = visibleChildren[visibleChildren.length - 1];
          }
          return null;
        }
        function isPostFooterTextStatus(el, role) {
          if (role !== "status")
            return false;
          if (normalize(el.getAttribute("role"))?.toLowerCase() !== "status")
            return false;
          if (normalize(el.getAttribute("aria-label")) || normalize(el.getAttribute("aria-labelledby"))) {
            return false;
          }
          if (el.closest("footer,[role='contentinfo'],main,form,header,nav,aside,article,section")) {
            return false;
          }
          const text = directOwnText(el);
          if (!text || hasVisibleInteractiveDescendant(el))
            return false;
          if (Array.from(el.children || []).some((child) => !isHidden(child))) {
            return false;
          }
          const previous = previousVisibleElementSibling(el);
          if (!previous || !terminalFooterElement(previous))
            return false;
          if (accessibilityNodes.length) {
            const axNode = axNodeForElementRole(el, "status");
            if (!axNode)
              return false;
            const staticText = (axNode.childIds || []).map((id) => accessibilityNodeById.get(normalize(id) || "")).find((node) => normalizedAxRole(node?.role) === "statictext");
            if (normalize(staticText?.name) !== text)
              return false;
          }
          return true;
        }
        function hasOnlyNativeLinkControls(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          const controls = Array.from(el.querySelectorAll(interactiveSelector)).filter((control) => !isHidden(control));
          if (!controls.length)
            return false;
          return controls.every((control) => control.tagName?.toLowerCase() === "a" && control.hasAttribute("href"));
        }
        function isDecorativeRoleGroupBeforeNativeLinks(el, role = implicitRole(el)) {
          if (role !== "group")
            return false;
          if (el.getAttribute("role") !== "group")
            return false;
          if (accessibleName(el, role) || readableText(el))
            return false;
          if (el.matches(interactiveSelector))
            return false;
          const tabIndex = Number.parseInt(el.getAttribute("tabindex") || "", 10);
          if (Number.isFinite(tabIndex) && tabIndex >= 0)
            return false;
          if (!isDecorativeMediaOnlyContainer(el))
            return false;
          const previous = previousVisibleElementSibling(el);
          if (!previous || !readableText(previous) || previous.querySelector(interactiveSelector)) {
            return false;
          }
          if (["heading", "button", "link"].includes(implicitRole(previous)))
            return false;
          return hasOnlyNativeLinkControls(nextVisibleElementSibling(el));
        }
        function isDecorativeGenericGroupBeforeNativeLinks(el, role = implicitRole(el)) {
          if (role !== "group")
            return false;
          if (el.getAttribute("role"))
            return false;
          if (accessibleName(el, role) || readableText(el))
            return false;
          if (el.matches(interactiveSelector))
            return false;
          const tabIndex = Number.parseInt(el.getAttribute("tabindex") || "", 10);
          if (Number.isFinite(tabIndex) && tabIndex >= 0)
            return false;
          if (!isDecorativeMediaOnlyContainer(el))
            return false;
          const previous = previousVisibleElementSibling(el);
          if (!previous || !readableText(previous) || previous.querySelector(interactiveSelector)) {
            return false;
          }
          if (["heading", "button", "link"].includes(implicitRole(previous)))
            return false;
          return hasOnlyNativeLinkControls(nextVisibleElementSibling(el));
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
        function customHeadedTextCardFor(el) {
          if (!isCustomElement(el))
            return null;
          if (isHidden(el) || el.matches(interactiveSelector) || el.closest(interactiveSelector)) {
            return null;
          }
          if (el.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']"))
            return null;
          if (!normalize(accessibleName(el, "text") || directOwnText(el)))
            return null;
          for (let current = el?.parentElement, depth = 0; current && depth < 8; current = current.parentElement, depth += 1) {
            if (current === document.body || current === document.documentElement)
              break;
            if (current.matches?.("footer, header, nav, aside, li, [role='listitem']"))
              break;
            if (current.matches?.(interactiveSelector) || current.querySelector?.(interactiveSelector)) {
              continue;
            }
            if (current.querySelector?.("ul, ol, table, [role='list'], [role='table'], [role='grid']")) {
              continue;
            }
            const headings = Array.from(current.querySelectorAll("h2, h3, h4, h5, h6, [role='heading']")).filter((heading2) => !isHidden(heading2) && Boolean(readableText(heading2)));
            if (headings.length !== 1)
              continue;
            const heading = headings[0];
            if (!(heading.compareDocumentPosition(el) & heading.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING)) {
              continue;
            }
            const textLeaves = Array.from(current.querySelectorAll("*")).filter((candidate) => {
              if (candidate === current || isHidden(candidate))
                return false;
              if (candidate.matches?.("h1, h2, h3, h4, h5, h6, [role='heading']"))
                return false;
              if (candidate.closest?.("h1, h2, h3, h4, h5, h6, [role='heading']"))
                return false;
              if (candidate.matches?.(interactiveSelector) || candidate.closest?.(interactiveSelector)) {
                return false;
              }
              if (candidate.querySelector?.("h1, h2, h3, h4, h5, h6, [role='heading']"))
                return false;
              if (!normalize(accessibleName(candidate, "text") || directOwnText(candidate)))
                return false;
              return !Array.from(candidate.children || []).some((child) => normalize(accessibleName(child, "text") || directOwnText(child)));
            });
            if (textLeaves.length < 1 || textLeaves.length > 2 || textLeaves[0] !== el)
              continue;
            return current;
          }
          return null;
        }
        function isCustomHeadedTextCardBody(el) {
          return Boolean(customHeadedTextCardFor(el));
        }
        function isLeadingStandaloneCardGroupStop(el, role) {
          if (!["heading", "paragraph", "text"].includes(role))
            return false;
          const card = standaloneContentCardFor(el);
          if (!card)
            return false;
          if (role === "heading" && (isAxUnconfirmedStandaloneContentCardHeading(card, el) || isFirstHeadingAfterDecorativeMedia(card, el) || isFirstStandaloneH3AfterDecorativeMedia(card, el) || isFirstLabelledInfoCardH3AfterDecorativeMedia(card, el))) {
            return false;
          }
          return isFirstReadableStopWithin(card, el);
        }
        function isAxUnconfirmedStandaloneContentCardHeading(card, el) {
          if (!accessibilityNodes.length)
            return false;
          if (implicitRole(el) !== "heading")
            return false;
          if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector))
            return false;
          if (standaloneContentCardHeading(card, 3) !== el || !isFirstReadableStopWithin(card, el)) {
            return false;
          }
          if (hasPrecedingHeadingSiblingInAncestorPath(el, card))
            return false;
          if (isInHeadingIntroducedCardCollection(card))
            return false;
          const axNode = axUnconfirmedWrapperNodeBetween(el, card);
          if (!axNode)
            return false;
          return true;
        }
        function hasPrecedingHeadingSiblingInAncestorPath(el, boundary) {
          for (let current = el; current && current !== document.body && current !== document.documentElement; current = current.parentElement) {
            const previous = previousVisibleElementSibling(current);
            if (previous) {
              if (implicitRole(previous) === "heading")
                return true;
              const previousHeading = soleReadableHeadingWithin(previous);
              if (previousHeading)
                return true;
              if (readableText(previous))
                return false;
            }
            if (current === boundary)
              break;
          }
          return false;
        }
        function soleReadableHeadingWithin(el) {
          if (!el || isHidden(el))
            return null;
          const headings = Array.from(el.querySelectorAll?.("h1, h2, h3, h4, h5, h6, [role='heading']") || []).filter((heading2) => !isHidden(heading2) && Boolean(readableText(heading2)));
          if (headings.length !== 1)
            return null;
          const heading = headings[0];
          const text = normalize(readableText(el));
          const headingText = normalize(readableText(heading));
          return text && text === headingText ? heading : null;
        }
        function isInHeadingIntroducedCardCollection(card) {
          for (let current = card; current && current !== document.body && current !== document.documentElement; current = current.parentElement) {
            const previous = previousVisibleElementSibling(current);
            if (previous && soleReadableHeadingWithin(previous)) {
              const headings = Array.from(current.querySelectorAll?.("h2, h3, h4, h5, h6, [role='heading']") || []).filter((heading) => !isHidden(heading) && Boolean(readableText(heading)));
              if (headings.length >= 2)
                return true;
            }
            if (current.matches?.("main, footer, header, nav, aside"))
              break;
          }
          return false;
        }
        function axUnconfirmedWrapperNodeBetween(el, boundary) {
          for (let current = el?.parentElement, depth = 0; current && depth < 6 && current !== document.body && current !== document.documentElement; current = current.parentElement, depth += 1) {
            const axNode = axNodeAnyForElement(current);
            if (axNode) {
              const axRole = normalizedAxRole(axNode.role);
              if ((axNode.ignored || axRole === "generic" || axRole === "none") && !normalize(axNode.name) && axNode.properties?.focusable !== true) {
                return axNode;
              }
            }
            if (current === boundary)
              break;
          }
          return void 0;
        }
        function isFirstHeadingAfterDecorativeMedia(card, el) {
          if (implicitRole(el) !== "heading")
            return false;
          if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector))
            return false;
          if (!isFirstReadableStopWithin(card, el))
            return false;
          return hasPrecedingDecorativeMediaSiblingInAncestorPath(el);
        }
        function isFirstLabelledInfoCardH3AfterDecorativeMedia(card, el) {
          if (implicitRole(el) !== "heading")
            return false;
          const tag = el.tagName?.toLowerCase();
          const level = Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2;
          if (level !== 3)
            return false;
          if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector))
            return false;
          if (!isFirstReadableStopWithin(card, el))
            return false;
          const region = el.closest("section[aria-label], section[aria-labelledby], [role='region'][aria-label], [role='region'][aria-labelledby]");
          if (!region || isHidden(region) || region.matches?.(interactiveSelector))
            return false;
          if (implicitRole(region) !== "region" || !accessibleName(region, "region"))
            return false;
          if (!region.contains(card) && !card.contains(region))
            return false;
          if (region.querySelector("ul, ol, table, form, [role='list'], [role='table'], [role='grid']")) {
            return false;
          }
          const headings = Array.from(region.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']")).filter((heading) => !isHidden(heading) && Boolean(readableText(heading)));
          if (headings.length !== 1 || headings[0] !== el)
            return false;
          const actions = Array.from(region.querySelectorAll("a[href], button, [role='link'], [role='button']")).filter((action) => !isHidden(action) && Boolean(accessibleName(action, implicitRole(action))));
          if (actions.length !== 1)
            return false;
          const bodyTextElements = Array.from(region.querySelectorAll("p, span, div")).filter((candidate) => standaloneCardBodyTextElement(candidate));
          if (bodyTextElements.length < 1 || bodyTextElements.length > 2)
            return false;
          return hasPrecedingDecorativeHiddenMediaSiblingInAncestorPath(el, region);
        }
        function isFirstStandaloneH3AfterDecorativeMedia(card, el) {
          if (implicitRole(el) !== "heading")
            return false;
          const tag = el.tagName?.toLowerCase();
          const level = Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2;
          if (level !== 3)
            return false;
          if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector))
            return false;
          if (!isFirstReadableStopWithin(card, el))
            return false;
          return hasPrecedingDecorativeMediaSiblingInAncestorPath(el);
        }
        function hasPrecedingDecorativeHiddenMediaSiblingInAncestorPath(el, boundary) {
          for (let current = el; current && current !== document.body && current !== document.documentElement; current = current.parentElement) {
            const previous = previousVisibleElementSibling(current);
            if (previous && isDecorativeHiddenMediaOnlyContainer(previous))
              return true;
            if (previous && readableText(previous))
              return false;
            if (current === boundary)
              return false;
            if (current.matches?.("main, footer, header, nav, aside, li, [role='listitem']")) {
              return false;
            }
          }
          return false;
        }
        function hasPrecedingDecorativeMediaSiblingInAncestorPath(el) {
          for (let current = el; current && current !== document.body && current !== document.documentElement; current = current.parentElement) {
            const previous = previousVisibleElementSibling(current);
            if (previous && isDecorativeMediaOnlyContainer(previous))
              return true;
            if (previous && readableText(previous))
              return false;
            if (current.matches?.("main, footer, header, nav, aside, li, [role='listitem']")) {
              return false;
            }
          }
          return false;
        }
        function isDecorativeHiddenMediaOnlyContainer(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.matches(interactiveSelector) || el.querySelector(interactiveSelector))
            return false;
          if (readableText(el))
            return false;
          return Boolean(el.querySelector("img[aria-hidden='true'], svg[aria-hidden='true'], [role='presentation'], [aria-hidden='true'][role='img']"));
        }
        function isPostHeadingMediaCardGroupStop(el, role) {
          if (!["paragraph", "text"].includes(role))
            return false;
          return Boolean(h2CardWithDecorativeMediaBeforeBodyFor(el));
        }
        function firstReadableStopWithin(el) {
          const nodeFilter = el.ownerDocument?.defaultView?.NodeFilter || document.defaultView?.NodeFilter;
          if (!nodeFilter)
            return null;
          const walker = document.createTreeWalker(el, nodeFilter.SHOW_ELEMENT);
          let node;
          while (node = walker.nextNode()) {
            if (node === el || isHidden(node))
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
              return node;
            }
          }
          return null;
        }
        function genericDecorativeTextCardFor(el) {
          for (let current = el?.parentElement, depth = 0; current && depth < 5; current = current.parentElement, depth += 1) {
            if (current === document.body || current === document.documentElement)
              break;
            if (current.matches?.("main, footer, header, nav, aside, li, [role='listitem']"))
              break;
            if (current.getAttribute("role") || accessibleName(current, "group"))
              continue;
            if (current.querySelector(interactiveSelector))
              continue;
            if (current.querySelector("h1, h2, h3, h4, h5, h6, [role='heading'], ul, ol, table, [role='list'], [role='table'], [role='grid']")) {
              continue;
            }
            const readableStops = Array.from(current.querySelectorAll("p, span, div")).filter((candidate) => {
              if (candidate === current || isHidden(candidate))
                return false;
              const role = implicitRole(candidate);
              return ["paragraph", "text"].includes(role) && Boolean(readableStopText(candidate, role));
            });
            if (readableStops.length !== 1 || readableStops[0] !== el)
              continue;
            if (firstReadableStopWithin(current) !== el)
              continue;
            const decorativeMedia = Array.from(current.querySelectorAll("img[alt=''], img[role='presentation'], svg[aria-hidden='true'], [role='presentation']")).filter((candidate) => !isHidden(candidate));
            if (decorativeMedia.length < 1)
              continue;
            const parent = current.parentElement;
            const previousCollectionSibling = parent ? previousVisibleElementSibling(parent) : null;
            if (previousCollectionSibling && implicitRole(previousCollectionSibling) === "heading") {
              continue;
            }
            if (!hasPrecedingFeatureList(parent))
              continue;
            const siblingCards = Array.from(parent?.children || []).filter((sibling) => {
              if (sibling === current || isHidden(sibling))
                return false;
              if (sibling.getAttribute?.("role") || accessibleName(sibling, "group"))
                return false;
              if (sibling.querySelector?.(interactiveSelector))
                return false;
              return Boolean(sibling.querySelector?.("img[alt=''], img[role='presentation'], svg[aria-hidden='true'], [role='presentation']") && readableText(sibling));
            });
            if (siblingCards.length < 2)
              continue;
            return current;
          }
          return null;
        }
        function hasPrecedingFeatureList(el) {
          for (let current = el, depth = 0; current && depth < 5; current = current.parentElement, depth += 1) {
            if (current === document.body || current === document.documentElement)
              break;
            const previous = previousVisibleElementSibling(current);
            if (!previous)
              continue;
            if (implicitRole(previous) === "list")
              return true;
            if (previous.querySelector?.("ul, ol, [role='list']"))
              return true;
          }
          return false;
        }
        function isLeadingDecorativeTextCardGroupStop(el, role) {
          if (!["paragraph", "text"].includes(role))
            return false;
          return Boolean(genericDecorativeTextCardFor(el));
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
          return isContextRole(children[0], role) || role === "group";
        }
        function hasNativeDetailsListItemContent(el) {
          if (!isListItem(el))
            return false;
          if (directOwnText(el))
            return false;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          return visibleChildren.length === 1 && visibleChildren[0].tagName?.toLowerCase() === "details" && Boolean(directSummaryChild(visibleChildren[0]));
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
        function fieldsetPromptText(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName?.toLowerCase() !== "fieldset")
            return void 0;
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
            return void 0;
          if (el.querySelector(":scope > legend"))
            return void 0;
          const label = Array.from(el.children || []).find((child) => child.tagName?.toLowerCase() === "label" && !isHidden(child) && Boolean(readableText(child)));
          if (!label)
            return void 0;
          if (!hasInteractiveDescendantAcrossShadowContent(el))
            return void 0;
          return readableText(label);
        }
        function fieldsetLegendText(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName?.toLowerCase() !== "fieldset")
            return void 0;
          const legend = Array.from(el.children || []).find((child) => child.tagName?.toLowerCase() === "legend" && !isHidden(child));
          return legend ? readableText(legend) : void 0;
        }
        function hasRadioImageLabels(el) {
          const radios = Array.from(el.querySelectorAll("input[type='radio'], [role='radio']")).filter((radio) => !isHidden(radio));
          if (!radios.length)
            return false;
          return radios.some((radio) => {
            const label = "labels" in radio && radio.labels?.length ? radio.labels[0] : void 0;
            if (!label || isHidden(label))
              return false;
            return Boolean(label.querySelector("img, svg, [role='img'], picture, canvas"));
          });
        }
        function controlFieldsetLegendText(el) {
          const legend = fieldsetLegendText(el);
          if (!legend)
            return void 0;
          const checkboxes = Array.from(el.querySelectorAll("input[type='checkbox'], [role='checkbox']")).filter((checkbox) => !isHidden(checkbox));
          if (checkboxes.length)
            return legend;
          return hasRadioImageLabels(el) ? legend : void 0;
        }
        function visuallyHiddenFieldsetLegendText(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName?.toLowerCase() !== "fieldset")
            return void 0;
          const legend = Array.from(el.children || []).find((child) => {
            if (child.tagName?.toLowerCase() !== "legend")
              return false;
            if (child.getAttribute("aria-hidden") === "true")
              return false;
            const className = child.getAttribute("class") || "";
            const style = child.getAttribute("style") || "";
            return /visually-hidden|sr-only/i.test(className) || normalize(child.getAttribute("data-sr-rendered-position")) === "offscreen" || Boolean(normalize(child.getAttribute("data-sr-computed-hidden"))) || /clip\\s*:|clip-path\\s*:|position\\s*:\\s*absolute/i.test(style);
          });
          return legend ? readableText(legend) : void 0;
        }
        function radioImageFieldsetLegendText(el) {
          const legend = fieldsetLegendText(el);
          return legend && hasRadioImageLabels(el) ? legend : void 0;
        }
        function hasInteractiveDescendantAcrossShadowContent(el) {
          function visit(node) {
            if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return false;
            if (node !== el && node.matches?.(interactiveSelector))
              return true;
            for (const child of Array.from(node.children || [])) {
              if (visit(child))
                return true;
            }
            for (const child of shadowContentChildren(node)) {
              if (visit(child))
                return true;
            }
            return false;
          }
          return visit(el);
        }
        function isAnonymousShadowPromptFieldsetHost(el) {
          if (!isCustomElement(el))
            return false;
          if (accessibleName(el, "group"))
            return false;
          const meaningfulChildren = shadowContentChildren(el).filter((child) => !isHidden(child) && !["style", "script"].includes(child.tagName?.toLowerCase()));
          return meaningfulChildren.length === 1 && Boolean(fieldsetPromptText(meaningfulChildren[0]));
        }
        function isTrailingInlineLinkPunctuationStop(el, role) {
          if (!["text", "paragraph"].includes(role))
            return false;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!["span", "small", "div"].includes(el.tagName?.toLowerCase()))
            return false;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) {
            return false;
          }
          if (el.querySelector(interactiveSelector))
            return false;
          const text = normalize(readableText(el));
          if (!text || /[\p{L}\p{N}]/u.test(text) || !/^[\p{P}\p{S}]+$/u.test(text)) {
            return false;
          }
          const parent = el.parentElement;
          if (!parent || !["p", "span", "small", "div"].includes(parent.tagName?.toLowerCase()) && !isCustomElement(parent)) {
            return false;
          }
          const links = Array.from(parent.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link));
          if (links.length !== 1)
            return false;
          const siblings = Array.from(parent.children || []).filter((sibling) => !isHidden(sibling));
          const index = siblings.indexOf(el);
          if (index <= 0)
            return false;
          const previous = siblings[index - 1];
          if (previous !== links[0] && !previous.contains?.(links[0]))
            return false;
          return !siblings.slice(index + 1).some((sibling) => {
            const siblingText = normalize(readableText(sibling));
            return Boolean(siblingText && /[\p{L}\p{N}]/u.test(siblingText));
          });
        }
        function isInlineLinkPunctuationWrapper(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!["span", "div"].includes(el.tagName?.toLowerCase()) && !isCustomElement(el)) {
            return false;
          }
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
            return false;
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link));
          if (links.length !== 1)
            return false;
          return Array.from(el.children || []).some((child) => isTrailingInlineLinkPunctuationStop(child, implicitRole(child)));
        }
        function isInlineLinkPunctuationWrapperGroup(el, role) {
          return role === "group" && isInlineLinkPunctuationWrapper(el);
        }
        function hasInlineLinkPunctuationWrapperAncestor(el) {
          for (let current = el?.parentElement, depth = 0; current && depth < 3; current = current.parentElement, depth += 1) {
            if (isInlineLinkPunctuationWrapper(current))
              return true;
          }
          return false;
        }
        function inlineTextLinkFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          const tag = el.tagName.toLowerCase();
          if (!["div", "span"].includes(tag))
            return void 0;
          if (tag === "span" && (["a", "button", "label", "li", "p", "small"].includes(el.parentElement?.tagName?.toLowerCase?.() || "") || el.closest("footer,[role='contentinfo']"))) {
            return void 0;
          }
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest(interactiveSelector)) {
            return void 0;
          }
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link2) => !isHidden(link2));
          if (links.length !== 1)
            return void 0;
          const link = links[0];
          const elementChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (elementChildren.some((child) => {
            if (child === link)
              return false;
            if (child.contains?.(link))
              return false;
            if (child.matches?.(interactiveSelector))
              return true;
            if (child.querySelector?.(interactiveSelector))
              return true;
            return Boolean(implicitRole(child) || readableText(child));
          })) {
            return void 0;
          }
          const before = [];
          const after = [];
          let sawLink = false;
          for (const child of Array.from(el.childNodes || [])) {
            if (child === link || child.nodeType === Node.ELEMENT_NODE && child.contains?.(link)) {
              sawLink = true;
              continue;
            }
            if (child.nodeType !== Node.TEXT_NODE)
              continue;
            const text = normalize(child.textContent);
            if (text)
              (sawLink ? after : before).push(text);
          }
          const beforeText = normalize(before.join(" "));
          const linkName = accessibleName(link, "link");
          const afterText = normalize(after.join(" "));
          if (!beforeText || !linkName)
            return void 0;
          return [
            beforeText,
            `link, ${linkName}`,
            afterText && /[\p{L}\p{N}]/u.test(afterText) ? afterText : void 0
          ].filter((fragment) => Boolean(fragment));
        }
        function plainTextTrailingLinkParagraphFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName.toLowerCase() !== "p")
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest(interactiveSelector) || el.closest("li,[role='listitem']") || expandedControlledRegionFor(el)) {
            return void 0;
          }
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link2) => !isHidden(link2));
          if (links.length !== 1)
            return void 0;
          const link = links[0];
          if (link.parentElement !== el)
            return void 0;
          const elementChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (elementChildren.some((child) => child !== link))
            return void 0;
          const before = [];
          const after = [];
          let sawLink = false;
          for (const child of Array.from(el.childNodes || [])) {
            if (child === link) {
              sawLink = true;
              continue;
            }
            if (child.nodeType !== Node.TEXT_NODE)
              return void 0;
            const text = normalize(child.textContent);
            if (text)
              (sawLink ? after : before).push(text);
          }
          const beforeText = normalize(before.join(" "));
          const afterText = normalize(after.join(" "));
          const linkName = accessibleName(link, "link");
          if (!beforeText || !linkName)
            return void 0;
          if (afterText && /[\p{L}\p{N}]/u.test(afterText))
            return void 0;
          return [beforeText, `link, ${linkName}`];
        }
        function directAxInlineAbbrSupParagraphFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName.toLowerCase() !== "p")
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest(interactiveSelector) || el.closest("li,[role='listitem']") || expandedControlledRegionFor(el) || !accessibilityNodes.length) {
            return void 0;
          }
          const directElements = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (!directElements.length)
            return void 0;
          if (directElements.some((child) => {
            const tag = child.tagName?.toLowerCase();
            if (tag === "a" && child.hasAttribute("href"))
              return false;
            if (tag === "abbr" && normalize(child.getAttribute("title")))
              return false;
            if (tag === "sup")
              return false;
            if (tag === "br")
              return false;
            return true;
          })) {
            return void 0;
          }
          const links = directElements.filter((child) => implicitRole(child) === "link");
          const abbrs = directElements.filter((child) => child.tagName?.toLowerCase() === "abbr");
          const superscripts = directElements.filter((child) => child.tagName?.toLowerCase() === "sup");
          const lineBreaks = directElements.filter((child) => child.tagName?.toLowerCase() === "br");
          if (links.length < 2 || abbrs.length !== 1 || superscripts.length !== 1 || !lineBreaks.length) {
            return void 0;
          }
          const paragraphAxNode = axNodeForElementRole(el, "paragraph");
          const axChildren = axChildNodes(paragraphAxNode);
          if (!paragraphAxNode || !axChildren.length)
            return void 0;
          const axRoles = axChildren.map((node) => normalizedAxRole(node.role));
          if (axRoles.filter((role) => role === "link").length < 2 || !axRoles.includes("linebreak") || !axRoles.includes("abbr") || !axRoles.includes("superscript")) {
            return void 0;
          }
          if (links.some((link) => !axNodeForElementRole(link, "link")) || abbrs.some((abbr) => !axNodeForElementRole(abbr, "abbr")) || superscripts.some((sup) => !axNodeForElementRole(sup, "superscript")) || lineBreaks.some((br) => !axNodeForElementRole(br, "linebreak"))) {
            return void 0;
          }
          const fragments = [];
          let sawLink = false;
          let sawAbbrGroup = false;
          let sawSuperscript = false;
          function pushText(value) {
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
              if (!linkName)
                return void 0;
              fragments.push(`link, ${linkName}`);
              sawLink = true;
              continue;
            }
            if (tag === "abbr") {
              const abbrTitle = normalize(axNodeForElementRole(child, "abbr")?.name) || normalize(child.getAttribute("title"));
              const abbrText = readableText(child);
              if (!abbrTitle || !abbrText)
                return void 0;
              fragments.push(`${abbrTitle}, group`, abbrText, `end of, ${abbrTitle}, group`);
              sawAbbrGroup = true;
              continue;
            }
            if (tag === "sup") {
              const supText = readableText(child);
              if (!supText)
                return void 0;
              fragments.push(supText);
              sawSuperscript = true;
              continue;
            }
            return void 0;
          }
          return sawLink && sawAbbrGroup && sawSuperscript && fragments.length >= 6 ? fragments : void 0;
        }
        function directAxInlineTextLinkParagraphFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName.toLowerCase() !== "p")
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest(interactiveSelector) || el.closest("li,[role='listitem']") || expandedControlledRegionFor(el) || !accessibilityNodes.length) {
            return void 0;
          }
          const directElements = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (!directElements.length)
            return void 0;
          if (directElements.some((child) => {
            const tag = child.tagName?.toLowerCase();
            if (tag === "a" && child.hasAttribute("href"))
              return false;
            if (["strong", "b", "em", "i"].includes(tag)) {
              return Array.from(child.querySelectorAll(interactiveSelector)).some((descendant) => implicitRole(descendant) !== "link");
            }
            return true;
          })) {
            return void 0;
          }
          const paragraphAxNode = axNodeForElementRole(el, "paragraph");
          const axChildren = axChildNodes(paragraphAxNode);
          if (!paragraphAxNode || !axChildren.length)
            return void 0;
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link));
          if (links.length < 1)
            return void 0;
          if (links.length === 1 && el.closest("article,[role='article']") && (directElements[0] !== links[0] || normalizedAxRole(axChildren[0]?.role) !== "link")) {
            return void 0;
          }
          if (links.some((link) => !axNodeForElementRole(link, "link"))) {
            return void 0;
          }
          const axLinkCount = axChildren.filter((node) => normalizedAxRole(node.role) === "link").length;
          function axDescendantLinkCount(node) {
            const role = normalizedAxRole(node.role);
            if (role === "link")
              return 1;
            return axChildNodes(node).reduce((count, child) => count + axDescendantLinkCount(child), 0);
          }
          const flattenedAxLinkCount = axChildren.reduce((count, child) => count + axDescendantLinkCount(child), 0);
          if (flattenedAxLinkCount !== links.length)
            return void 0;
          function isPunctuationOnlyStaticText(node) {
            if (normalizedAxRole(node?.role) !== "statictext")
              return false;
            const text = normalize(node?.name);
            return Boolean(text && !/[\p{L}\p{N}]/u.test(text));
          }
          function isFocusableAxLink(node) {
            return normalizedAxRole(node?.role) === "link" && node?.properties?.focusable === true;
          }
          function isDirectAxOneLinkParagraphShape() {
            if (links.length !== 1 || directElements.length !== 1)
              return false;
            const onlyElement = directElements[0];
            const onlyTag = onlyElement.tagName?.toLowerCase();
            const axRoles = axChildren.map((node) => normalizedAxRole(node.role));
            if (onlyElement === links[0]) {
              const linkIndex = axRoles.findIndex((role) => role === "link");
              if (linkIndex < 0 || !isFocusableAxLink(axChildren[linkIndex]))
                return false;
              if (axRoles.some((role) => role !== "statictext" && role !== "link"))
                return false;
              if (axRoles.filter((role) => role === "link").length !== 1)
                return false;
              return axChildren.some((node) => {
                if (normalizedAxRole(node.role) !== "statictext")
                  return false;
                return /[\p{L}\p{N}]/u.test(normalize(node.name) || "");
              });
            }
            if (!["strong", "b", "em", "i"].includes(onlyTag))
              return false;
            if (axRoles.length === 3 && axRoles[0] === "statictext" && ["strong", "emphasis"].includes(axRoles[1] || "") && isPunctuationOnlyStaticText(axChildren[2])) {
              const wrappedChildren2 = axChildNodes(axChildren[1]);
              return wrappedChildren2.length === 1 && isFocusableAxLink(wrappedChildren2[0]);
            }
            if (axRoles.length !== 2 || axRoles[0] !== "statictext")
              return false;
            if (!["strong", "emphasis"].includes(axRoles[1] || ""))
              return false;
            const wrappedChildren = axChildNodes(axChildren[1]);
            const wrappedRoles = wrappedChildren.map((node) => normalizedAxRole(node.role));
            return wrappedRoles.length === 3 && wrappedRoles[0] === "statictext" && wrappedRoles[1] === "link" && isPunctuationOnlyStaticText(wrappedChildren[2]);
          }
          if (links.length === 1) {
            if (!isDirectAxOneLinkParagraphShape())
              return void 0;
          } else if (axLinkCount !== links.length) {
            return void 0;
          }
          if (axLinkCount === 2 && axChildren.some((node, index) => {
            if (normalizedAxRole(node.role) !== "statictext")
              return false;
            if (normalize(node.name)?.toLowerCase() !== "or")
              return false;
            return normalizedAxRole(axChildren[index - 1]?.role) === "link" && normalizedAxRole(axChildren[index + 1]?.role) === "link";
          })) {
            return void 0;
          }
          function elementHeadingLevel(heading) {
            const tag = heading?.tagName?.toLowerCase?.() || "";
            if (/^h[1-6]$/.test(tag)) {
              return Number.parseInt(tag.slice(1), 10);
            }
            if (heading?.getAttribute?.("role") === "heading") {
              const level = Number.parseInt(heading.getAttribute("aria-level") || "", 10);
              return Number.isFinite(level) ? level : void 0;
            }
            return void 0;
          }
          function axHeadingLevel(heading) {
            const axNode = axNodeForElementRole(heading, "heading");
            const level = axNode?.properties?.level;
            if (typeof level === "number")
              return level;
            if (typeof level === "string") {
              const parsed = Number.parseInt(level, 10);
              return Number.isFinite(parsed) ? parsed : void 0;
            }
            return void 0;
          }
          function previousVisibleElementSibling2(node) {
            for (let sibling = node?.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
              if (!isHidden(sibling))
                return sibling;
            }
            return void 0;
          }
          function isLeadParagraphAfterLevelOneHeading() {
            if (directElements.length !== 3)
              return false;
            if (el.closest("article,[role='article'],aside,footer,nav"))
              return false;
            const previous = previousVisibleElementSibling2(el);
            if (!previous)
              return false;
            if (elementHeadingLevel(previous) !== 1)
              return false;
            return axHeadingLevel(previous) === 1;
          }
          function shouldCompactLeadParagraphConjunction(index, text) {
            if (text !== ", and")
              return false;
            if (!isLeadParagraphAfterLevelOneHeading())
              return false;
            return normalizedAxRole(axChildren[index - 1]?.role) === "link" && normalizedAxRole(axChildren[index + 1]?.role) === "link";
          }
          const fragments = [];
          let disallowedAxChild = false;
          const shortLeadingText = normalize(axChildren[0]?.name);
          const oneLinkName = normalize(axChildren[1]?.name);
          const oneLinkTrailingText = normalize(axChildren[2]?.name);
          const shouldJoinShortServiceActionStaticText = links.length === 1 && directElements.length === 1 && directElements[0] === links[0] && shortLeadingText && shortLeadingText.length < 12 && normalizedAxRole(axChildren[0]?.role) === "statictext" && normalizedAxRole(axChildren[1]?.role) === "link" && normalizedAxRole(axChildren[2]?.role) === "statictext" && Boolean(oneLinkName?.match(/^[a-z]/u)) && Boolean(oneLinkName?.match(/\band\b/u)) && Boolean(oneLinkTrailingText?.match(/^[\p{L}\p{N}]/u)) && !oneLinkTrailingText?.endsWith(":");
          if (shouldJoinShortServiceActionStaticText) {
            const combinedText = normalize(`${shortLeadingText || ""} ${oneLinkTrailingText || ""}`);
            return [combinedText, oneLinkName ? `link, ${oneLinkName}` : void 0].filter((fragment) => Boolean(fragment));
          }
          function pushAxChild(child, index) {
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
                if (disallowedAxChild)
                  return;
              }
              return;
            }
            if (role !== "statictext") {
              disallowedAxChild = true;
              return;
            }
            const text = normalize(child.name);
            if (!text || !/[\p{L}\p{N}]/u.test(text))
              return;
            fragments.push(shouldCompactLeadParagraphConjunction(index, text) ? ",and" : text);
          }
          for (const [index, child] of axChildren.entries()) {
            pushAxChild(child, index);
            if (disallowedAxChild)
              return void 0;
          }
          return fragments.length > links.length ? fragments : void 0;
        }
        function footerInlineBoundaryParagraphFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName.toLowerCase() !== "p")
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest(interactiveSelector) || el.closest("li,[role='listitem']") || expandedControlledRegionFor(el) || !el.closest("footer,[role='contentinfo']") || !accessibilityNodes.length) {
            return void 0;
          }
          const directElements = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (!directElements.length)
            return void 0;
          if (directElements.some((child) => {
            const tag = child.tagName?.toLowerCase();
            if (tag === "a" && child.hasAttribute("href"))
              return false;
            if (tag === "br")
              return false;
            if (["strong", "b", "em", "i"].includes(tag)) {
              return Boolean(child.querySelector?.(interactiveSelector));
            }
            return true;
          })) {
            return void 0;
          }
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link));
          if (!links.length)
            return void 0;
          if (links.some((link) => !axNodeForElementRole(link, "link"))) {
            return void 0;
          }
          const paragraphAxNode = axNodeForElementRole(el, "paragraph");
          const axChildren = axChildNodes(paragraphAxNode);
          if (!paragraphAxNode || !axChildren.length)
            return void 0;
          const hasBoundaryElement = directElements.some((child) => ["br", "strong", "b", "em", "i"].includes(child.tagName?.toLowerCase()));
          if (!hasBoundaryElement)
            return void 0;
          const axLinkCount = axChildren.filter((node) => normalizedAxRole(node.role) === "link").length;
          if (axLinkCount !== links.length)
            return void 0;
          const axRoles = axChildren.map((node) => normalizedAxRole(node.role));
          if (axRoles.some((role) => !["statictext", "link", "linebreak", "strong", "emphasis"].includes(role || ""))) {
            return void 0;
          }
          function isPunctuationOnlyStaticText(node) {
            if (normalizedAxRole(node?.role) !== "statictext")
              return false;
            const text = normalize(node?.name);
            return Boolean(text && !/[\p{L}\p{N}]/u.test(text));
          }
          if (!axChildren.some((node) => isPunctuationOnlyStaticText(node))) {
            return void 0;
          }
          const fragments = [];
          let disallowedAxChild = false;
          let emittedLink = false;
          function pushStaticText(value) {
            const text = normalize(value);
            if (text && /[\p{L}\p{N}]/u.test(text)) {
              fragments.push(text);
            }
          }
          function pushAxChild(child) {
            const role = normalizedAxRole(child.role);
            if (role === "linebreak")
              return;
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
              if (!children.length || children.some((descendant) => normalizedAxRole(descendant.role) !== "statictext")) {
                disallowedAxChild = true;
                return;
              }
              for (const descendant of children)
                pushStaticText(descendant.name);
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
            if (disallowedAxChild)
              return void 0;
          }
          return emittedLink && fragments.length > links.length ? fragments : void 0;
        }
        function footerInlineBoundaryTextFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          const tag = el.tagName.toLowerCase();
          if (!["span", "div", "small"].includes(tag))
            return void 0;
          if (isFooterLicenseBoilerplateTextContainer(el))
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest(interactiveSelector) || el.closest("li,[role='listitem']") || expandedControlledRegionFor(el) || !el.closest("footer,[role='contentinfo']") || !accessibilityNodes.length) {
            return void 0;
          }
          const axNode = axNodeForElement(el);
          const axChildren = axChildNodes(axNode);
          if (!axNode || !axChildren.length)
            return void 0;
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link));
          if (!links.length)
            return void 0;
          if (links.some((link) => !axNodeForElementRole(link, "link")))
            return void 0;
          const axLinkCount = axChildren.filter((node) => normalizedAxRole(node.role) === "link").length;
          if (axLinkCount !== links.length)
            return void 0;
          if (axChildren.some((node) => {
            const role = normalizedAxRole(node.role);
            return role !== "statictext" && role !== "link";
          })) {
            return void 0;
          }
          const fragments = [];
          let linkCount = 0;
          for (const child of Array.from(el.childNodes || [])) {
            if (child.nodeType === Node.TEXT_NODE) {
              const text = normalize(child.textContent || "");
              if (text && /[\p{L}\p{N}]/u.test(text))
                fragments.push(text);
              continue;
            }
            if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) {
              continue;
            }
            const childTag = child.tagName?.toLowerCase();
            if (childTag === "br")
              continue;
            if (childTag === "a" && child.hasAttribute("href")) {
              const axLinkName = normalize(axNodeForElementRole(child, "link")?.name);
              const linkName = axLinkName || accessibleName(child, "link") || readableText(child);
              const normalizedLinkName = normalizeAnnouncementLabel(linkName);
              if (!normalizedLinkName)
                return void 0;
              fragments.push(`link, ${normalizedLinkName}`);
              linkCount += 1;
              continue;
            }
            return void 0;
          }
          if (!linkCount || fragments.length <= linkCount)
            return void 0;
          return fragments.some((fragment) => !fragment.startsWith("link, ")) ? fragments : void 0;
        }
        function isFooterLicenseBoilerplateTextContainer(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          const footer = el.closest("footer,[role='contentinfo']");
          if (!footer)
            return false;
          if (footer.querySelector("[data-sr-marker-content]"))
            return false;
          const text = normalize(readableText(el));
          if (!/^All content is available under the Open Government Licence v3\.0, except where otherwise stated$/i.test(text || "")) {
            return false;
          }
          return Array.from(el.querySelectorAll("a[href], [role='link']")).some((link) => /open-government-licence|open government licence/i.test(`${link.getAttribute?.("href") || ""} ${accessibleName(link, "link") || readableText(link) || ""}`));
        }
        function articleInlineTextLinkFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName.toLowerCase() !== "p")
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest(interactiveSelector) || el.closest("li,[role='listitem']") || expandedControlledRegionFor(el)) {
            return void 0;
          }
          const article = el.closest("article,[role='article']");
          if (!article || isHidden(article))
            return void 0;
          if (!isSiblingArticleCollectionItem(article))
            return void 0;
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link));
          if (links.length < 2)
            return void 0;
          const inlineSemanticSelector = "strong, b, em, i, code, time";
          const fragments = [];
          let plainText = "";
          let disallowed = false;
          let sawLink = false;
          function flushPlainText() {
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
            return void 0;
          }
          return fragments;
        }
        function articleBylineAuthorListFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName.toLowerCase() !== "p")
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest(interactiveSelector) || el.closest("li,[role='listitem']") || expandedControlledRegionFor(el)) {
            return void 0;
          }
          const article = el.closest("article,[role='article']");
          if (!article || isHidden(article))
            return void 0;
          if (Array.from(el.childNodes || []).some((child) => child.nodeType === Node.TEXT_NODE && normalize(child.textContent))) {
            return void 0;
          }
          const directChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (directChildren.length < 3)
            return void 0;
          if (directChildren.some((child) => child.tagName?.toLowerCase() !== "span")) {
            return void 0;
          }
          function textExcludingDescendant(root, excluded) {
            function collect(node) {
              if (!node || node === excluded)
                return "";
              if (node.nodeType === Node.TEXT_NODE)
                return node.textContent || "";
              if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
                return "";
              if (node.contains?.(excluded) && node !== root)
                return "";
              let text = "";
              for (const child of Array.from(node.childNodes || [])) {
                const part = collect(child);
                if (!part)
                  continue;
                if (text && needsBoundary(text, part))
                  text += " ";
                text += part;
              }
              return text;
            }
            return normalize(collect(root));
          }
          function isAuthorLink(link, name) {
            if (implicitRole(link) !== "link")
              return false;
            if (!link.hasAttribute("href") && link.getAttribute("role") !== "link")
              return false;
            const bdi = Array.from(link.querySelectorAll("bdi")).find((candidate) => !isHidden(candidate) && normalize(readableText(candidate)));
            return Boolean(bdi && normalize(readableText(bdi)) === name);
          }
          function separatorKind(value) {
            const text = normalize(value);
            if (!text)
              return void 0;
            if (/^[,;]+$/u.test(text))
              return "comma";
            if (/^(?:[,;]\s*)?(?:and|&)(?:\s*[,;])?$/iu.test(text))
              return "conjunction";
            return void 0;
          }
          const entries = [];
          let disallowed = false;
          for (const child of directChildren) {
            const links = Array.from(child.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link));
            const interactiveDescendants = Array.from(child.querySelectorAll(interactiveSelector)).filter((candidate) => !isHidden(candidate));
            if (links.length > 1 || interactiveDescendants.some((candidate) => !links.includes(candidate))) {
              disallowed = true;
              break;
            }
            if (links.length === 1) {
              const link = links[0];
              const linkName = normalizeAnnouncementLabel(accessibleName(link, "link"));
              if (!linkName || !isAuthorLink(link, linkName)) {
                disallowed = true;
                break;
              }
              const outsideText = textExcludingDescendant(child, link);
              if (outsideText) {
                const kind2 = separatorKind(outsideText);
                if (!kind2) {
                  disallowed = true;
                  break;
                }
                entries.push({
                  kind: "separator",
                  text: kind2 === "conjunction" ? "and" : outsideText,
                  separatorKind: kind2
                });
              }
              entries.push({ kind: "link", announcement: `link, ${linkName}` });
              continue;
            }
            const separatorText = normalize(readableText(child) || child.textContent);
            if (!separatorText)
              continue;
            const kind = separatorKind(separatorText);
            if (!kind) {
              disallowed = true;
              break;
            }
            entries.push({
              kind: "separator",
              text: kind === "conjunction" ? "and" : separatorText,
              separatorKind: kind
            });
          }
          if (disallowed)
            return void 0;
          const linkAnnouncements = entries.filter((entry) => entry.kind === "link").map((entry) => entry.announcement);
          if (linkAnnouncements.length < 2)
            return void 0;
          const conjunctions = entries.filter((entry) => entry.kind === "separator" && entry.separatorKind === "conjunction");
          if (conjunctions.length !== 1)
            return void 0;
          return [
            ...linkAnnouncements.slice(0, -1),
            conjunctions[0].text,
            linkAnnouncements[linkAnnouncements.length - 1]
          ];
        }
        function inlineSemanticTextLinkFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          const tag = el.tagName.toLowerCase();
          if (tag !== "p" && tag !== "small")
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest(interactiveSelector) || el.closest("li,[role='listitem']") || expandedControlledRegionFor(el)) {
            return void 0;
          }
          const inlineSemanticSelector = "code, strong, b, em, i, time";
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link));
          const semanticBoundaries = Array.from(el.querySelectorAll(inlineSemanticSelector)).filter((candidate) => !isHidden(candidate) && Boolean(readableText(candidate)));
          if (!links.length || !semanticBoundaries.length)
            return void 0;
          const fragments = [];
          const comparableFragments = [];
          let sawLink = false;
          let sawSemanticBoundary = false;
          let disallowed = false;
          let plainText = "";
          function flushPlainText() {
            const text = normalize(plainText);
            if (text && /[\p{L}\p{N}]/u.test(text)) {
              fragments.push(text);
              comparableFragments.push(text);
            }
            plainText = "";
          }
          function collect(node) {
            if (!node || disallowed)
              return;
            if (node.nodeType === Node.TEXT_NODE) {
              plainText = `${plainText}${node.textContent || ""}`;
              return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            if (node.matches("[aria-hidden='true']"))
              return;
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
            for (const child of Array.from(node.childNodes || []))
              collect(child);
          }
          collect(el);
          flushPlainText();
          if (disallowed || !sawLink || !sawSemanticBoundary || fragments.length < 3) {
            return void 0;
          }
          const comparable = (value) => normalize(value)?.replace(/\s+([.,;:!?])/g, "$1").replace(/\s+(?=<)/g, "").replace(/(?<=>)\s+/g, "").replace(/[.。]$/u, "");
          if (comparable(comparableFragments.join(" ")) !== comparable(readableText(el))) {
            return void 0;
          }
          return fragments;
        }
        function directLinkGeneratedMetadataFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          const tag = el.tagName.toLowerCase();
          if (tag !== "p" && tag !== "small")
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest(interactiveSelector) || el.closest("li,[role='listitem']") || expandedControlledRegionFor(el)) {
            return void 0;
          }
          const fragments = [];
          let plainText = "";
          let metadataText = "";
          let sawLink = false;
          let sawGeneratedMetadataAfterLink = false;
          let disallowed = false;
          function flushPlainText() {
            const text = normalize(plainText);
            if (text && /[\p{L}\p{N}]/u.test(text)) {
              fragments.push(text);
            }
            plainText = "";
          }
          function flushMetadataText() {
            const text = normalize(metadataText);
            if (text && /[\p{L}\p{N}]/u.test(text)) {
              fragments.push(text);
            }
            metadataText = "";
          }
          function appendToMetadata(value) {
            if (!value)
              return;
            const text = normalize(value);
            if (!text)
              return;
            metadataText = metadataText && needsBoundary(metadataText, text) ? `${metadataText} ${text}` : `${metadataText}${metadataText ? " " : ""}${text}`;
          }
          function generatedMetadataText(node) {
            if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return void 0;
            if (node.matches(interactiveSelector) || node.querySelector(interactiveSelector)) {
              return void 0;
            }
            if (node.getAttribute("role") || node.getAttribute("aria-label") || node.getAttribute("aria-labelledby")) {
              return void 0;
            }
            const before = generatedPseudoText(node, "before");
            const after = generatedPseudoText(node, "after");
            if (before !== "(" || after !== ")")
              return void 0;
            const text = normalize(readableText(node));
            if (!text || text.length > 80 || !/[\p{L}\p{N}]/u.test(text))
              return void 0;
            return `(${text})`;
          }
          for (const child of Array.from(el.childNodes || [])) {
            if (child.nodeType === Node.TEXT_NODE) {
              if (metadataText) {
                appendToMetadata(child.textContent || "");
              } else {
                plainText = `${plainText}${child.textContent || ""}`;
              }
              continue;
            }
            if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child)) {
              continue;
            }
            if (child.matches("[aria-hidden='true']")) {
              continue;
            }
            if (child.matches("br")) {
              continue;
            }
            const metadata = generatedMetadataText(child);
            if (metadata) {
              if (!sawLink) {
                disallowed = true;
                break;
              }
              flushPlainText();
              appendToMetadata(metadata);
              sawGeneratedMetadataAfterLink = true;
              continue;
            }
            if (child.matches(interactiveSelector)) {
              if (implicitRole(child) !== "link") {
                disallowed = true;
                break;
              }
              flushMetadataText();
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
            if (child.matches("strong, b, em, i, time") && !child.querySelector(interactiveSelector)) {
              flushMetadataText();
              flushPlainText();
              const text = readableText(child);
              if (text)
                fragments.push(text);
              continue;
            }
            disallowed = true;
            break;
          }
          flushMetadataText();
          flushPlainText();
          if (disallowed || !sawGeneratedMetadataAfterLink || fragments.length < 2) {
            return void 0;
          }
          return fragments;
        }
        function inlinePhrasingBoundaryFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          const tag = el.tagName?.toLowerCase();
          if (tag !== "p" && tag !== "small")
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest(interactiveSelector) || el.closest("li,[role='listitem']") || expandedControlledRegionFor(el)) {
            return void 0;
          }
          if (el.querySelector("a[href], [role='link'], button, input, select, textarea")) {
            return void 0;
          }
          const boundarySelector = "dfn, mark, del, ins, sub, sup, s, ruby, math, output";
          const directBoundaries = Array.from(el.children || []).filter((child) => !isHidden(child) && child.matches?.(boundarySelector) && !child.querySelector?.("a[href], [role='link'], button, input, select, textarea"));
          if (!directBoundaries.length)
            return void 0;
          const fragments = [];
          const comparableFragments = [];
          let plainText = "";
          let sawBoundary = false;
          let disallowed = false;
          let sawSuppressedSubSup = false;
          function flushPlainText() {
            const text = normalize(plainText);
            if (text && !/^[.。]+$/u.test(text)) {
              fragments.push(text);
              comparableFragments.push(text);
            }
            plainText = "";
          }
          function collect(node) {
            if (!node || disallowed)
              return;
            if (node.nodeType === Node.TEXT_NODE) {
              plainText = `${plainText}${node.textContent || ""}`;
              return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            if (node.matches("[aria-hidden='true']"))
              return;
            if (node !== el && node.matches(boundarySelector)) {
              const nodeTag = node.tagName?.toLowerCase();
              if (nodeTag === "ins") {
                const leadingText = normalize(plainText);
                if (leadingText) {
                  fragments.push(`\u2022 ${leadingText}`);
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
                const fragment = nodeTag === "dfn" ? `${text}, empty term` : text;
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
            for (const child of Array.from(node.childNodes || []))
              collect(child);
          }
          collect(el);
          flushPlainText();
          if (disallowed || !sawBoundary || fragments.length < 2)
            return void 0;
          const comparable = (value) => normalize(value)?.replace(/\s+([.,;:!?])/g, "$1").replace(/\s+(?=<)/g, "").replace(/(?<=>)\s+/g, "").replace(/[.。]$/u, "");
          const fragmentComparable = comparable(comparableFragments.join(" "));
          const actualComparable = comparable(readableText(el));
          if (sawSuppressedSubSup ? fragmentComparable?.replace(/\s+/g, "") !== actualComparable?.replace(/\s+/g, "") : fragmentComparable !== actualComparable) {
            return void 0;
          }
          return fragments;
        }
        function rubyBaseText(el) {
          const parts = [];
          for (const child of Array.from(el.childNodes || [])) {
            if (child.nodeType === Node.TEXT_NODE) {
              const text2 = normalize(child.textContent || "");
              if (text2)
                parts.push(text2);
              continue;
            }
            if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child))
              continue;
            const tag = child.tagName?.toLowerCase();
            if (tag === "rt" || tag === "rp")
              continue;
            const text = readableText(child);
            if (text)
              parts.push(text);
          }
          return normalize(parts.join(" "));
        }
        function mathAnnouncementText(el) {
          const ariaLabel = normalize(el.getAttribute("aria-label"));
          const symbols = Array.from(el.querySelectorAll("mi, mn, mo")).map((node) => normalize(node.textContent || "")).filter((text) => Boolean(text));
          const expression = symbols.length ? symbols.join("") : normalize(el.textContent || "");
          if (!expression)
            return ariaLabel;
          const itemCount = Array.from(el.querySelectorAll("*")).filter((node) => !isHidden(node)).length;
          return itemCount > 0 ? `${expression}, with ${itemCount} items, math` : expression;
        }
        function inlineCodeBreakTextFragments(el, role) {
          if (!["paragraph", "text"].includes(role))
            return void 0;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          const tag = el.tagName?.toLowerCase();
          if (tag === "address") {
            let flushLine = function() {
              const text = normalize(line);
              if (text)
                fragments2.push(text);
              line = "";
            }, collectAddressLine = function(node) {
              if (!node)
                return;
              if (node.nodeType === Node.TEXT_NODE) {
                line = `${line}${node.textContent || ""}`;
                return;
              }
              if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
                return;
              if (node.matches?.("[aria-hidden='true']"))
                return;
              if (node.tagName?.toLowerCase() === "br") {
                flushLine();
                return;
              }
              for (const child of Array.from(node.childNodes || []))
                collectAddressLine(child);
            };
            const fragments2 = [];
            let line = "";
            collectAddressLine(el);
            flushLine();
            return fragments2.length ? fragments2 : void 0;
          }
          if (tag !== "p" && tag !== "small")
            return void 0;
          if (el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest(interactiveSelector) || el.closest("li,[role='listitem']") || expandedControlledRegionFor(el)) {
            return void 0;
          }
          if (accessibilityNodes.length && directAxInlineTextLinkParagraphFragments(el)) {
            return void 0;
          }
          const allowedSemanticSelector = "code, strong, b, em, i";
          const directElements = Array.from(el.children || []).filter((child) => !isHidden(child) || isSerializedOffscreenCodeBoundary(child));
          const hasCodeBoundary = directElements.some((child) => child.matches?.("code") || Boolean(child.querySelector?.("code")));
          const hasStrongOrEmphasisBoundary = directElements.some((child) => child.matches?.("strong, b, em, i"));
          const strongOrEmphasisBoundaries = directElements.filter((child) => child.matches?.("strong, b, em, i"));
          const strongOrEmphasisBoundaryCount = strongOrEmphasisBoundaries.length;
          const hasCodeLikeMultipleEmphasisBoundary = strongOrEmphasisBoundaryCount >= 2 && strongOrEmphasisBoundaries.every((child) => /^[a-z][a-z0-9_-]*$/u.test(normalize(readableText(child)) || ""));
          const hasLink = directElements.some((child) => implicitRole(child) === "link" || Boolean(child.querySelector?.("a[href], [role='link']")));
          const lineBreakCount = directElements.filter((child) => child.tagName?.toLowerCase() === "br").length;
          const isGovukValidationBreakShape = lineBreakCount >= 2;
          if (!hasCodeBoundary && !isGovukValidationBreakShape && !(hasStrongOrEmphasisBoundary && hasLink) && !hasCodeLikeMultipleEmphasisBoundary) {
            return void 0;
          }
          const fragments = [];
          const comparableFragments = [];
          let plainText = "";
          let sawCodeBoundary = false;
          let sawEmphasisBoundary = false;
          let sawSemanticLinkBoundary = false;
          let sawValidationBreakBoundary = false;
          let disallowed = false;
          function pushFragment(fragment, comparable2 = fragment) {
            const text = normalize(fragment);
            if (!text)
              return;
            const comparableText = normalize(comparable2) || text;
            if (!/[\p{L}\p{N}<]/u.test(text)) {
              comparableFragments.push(comparableText);
              return;
            }
            fragments.push(text);
            comparableFragments.push(comparableText);
          }
          function flushPlainText() {
            pushFragment(plainText);
            plainText = "";
          }
          function collect(node) {
            if (!node || disallowed)
              return;
            if (node.nodeType === Node.TEXT_NODE) {
              plainText = `${plainText}${node.textContent || ""}`;
              return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node) && !isSerializedOffscreenCodeBoundary(node)) {
              return;
            }
            if (node.matches?.("[aria-hidden='true']"))
              return;
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
            if (node !== el && node.matches?.(allowedSemanticSelector) && !node.querySelector?.(interactiveSelector) && !node.querySelector?.("code")) {
              flushPlainText();
              const text = readableText(node);
              if (text) {
                pushFragment(text);
                sawEmphasisBoundary = true;
              }
              return;
            }
            const childRole = node !== el ? implicitRole(node) : "";
            if (childRole && childRole !== "paragraph" && !node.matches?.(allowedSemanticSelector)) {
              disallowed = true;
              return;
            }
            for (const child of Array.from(node.childNodes || []))
              collect(child);
          }
          collect(el);
          flushPlainText();
          if (disallowed || fragments.length < 2)
            return void 0;
          if (!sawCodeBoundary && !sawEmphasisBoundary && !sawSemanticLinkBoundary && !sawValidationBreakBoundary) {
            return void 0;
          }
          if (sawValidationBreakBoundary) {
            const hasSay = fragments.some((fragment) => /^Say\b/i.test(fragment));
            const hasExample = fragments.some((fragment) => /^For example\b/i.test(fragment));
            if (!hasSay || !hasExample)
              return void 0;
          }
          const comparable = (value) => normalize(value)?.replace(/\s+([.,;:!?])/g, "$1").replace(/\s+(?=<)/g, "").replace(/(?<=>)\s+/g, "").replace(/[.。]$/u, "");
          const actualComparable = comparable(readableText(el));
          const fragmentComparable = comparable(comparableFragments.join(" "));
          if (sawValidationBreakBoundary ? fragmentComparable?.replace(/\s+/g, "") !== actualComparable?.replace(/\s+/g, "") : fragmentComparable !== actualComparable) {
            return void 0;
          }
          return fragments;
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
          if (emphasisElements.length === 1 && normalizedFragments.length === 2 && hasDecorativeMediaOnlyDescendant(el)) {
            normalizedFragments[1] = `\u2022 ${normalizedFragments[1]}`;
          }
          return normalizedFragments;
        }
        function hasDecorativeMediaOnlyDescendant(el) {
          return Array.from(el?.querySelectorAll?.("svg[aria-hidden='true'], img[alt=''], img[role='presentation'], [role='presentation']") || []).some((candidate) => !isRenderedDisplayHidden(candidate));
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
          if (!expandedRegion && emphasisElements.length > 1 && !emphasisElements.every((candidate) => /^[a-z0-9][a-z0-9_-]*$/u.test(normalize(readableText(candidate)) || ""))) {
            return void 0;
          }
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
          const comparable = (value) => normalize(value)?.replace(/\s+([,;:!?]|\.(?![\p{L}\p{N}]))/gu, "$1");
          if (!expandedRegion && comparable(normalizedFragments.join(" ")) !== comparable(normalizedFullText)) {
            return void 0;
          }
          return normalizedFragments;
        }
        function blockquoteInlineEmphasisFragments(el, role) {
          if (role !== "blockquote")
            return void 0;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName?.toLowerCase() !== "blockquote")
            return void 0;
          if (el.querySelector(interactiveSelector))
            return void 0;
          const emphasisSelector = "strong, b, em, i";
          const emphasisElements = Array.from(el.querySelectorAll(emphasisSelector)).filter((candidate) => !isHidden(candidate) && Boolean(readableText(candidate)));
          if (emphasisElements.length !== 1)
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
              plainText = `${plainText}${node.textContent || ""}`;
              return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            if (node.matches("[aria-hidden='true']"))
              return;
            if (node.matches(emphasisSelector)) {
              flushPlainText();
              const emphasizedText2 = readableText(node);
              if (emphasizedText2)
                fragments.push(emphasizedText2);
              return;
            }
            const childRole = node !== el ? implicitRole(node) : "";
            if (childRole && !["paragraph", "text"].includes(childRole) && !node.matches(emphasisSelector)) {
              return;
            }
            for (const child of Array.from(node.childNodes || []))
              collect(child);
          }
          collect(el);
          flushPlainText();
          const normalizedFragments = fragments.map((fragment) => normalize(fragment)).filter((fragment) => Boolean(fragment));
          const emphasizedText = normalize(readableText(emphasisElements[0]));
          const fullText = normalize(readableText(el));
          if (normalizedFragments.length !== 2)
            return void 0;
          if (normalizedFragments[0] !== emphasizedText)
            return void 0;
          if (normalizedFragments.join(" ") !== fullText)
            return void 0;
          return normalizedFragments;
        }
        function isPlainSpanOnlyBlockquote(el, role) {
          if (role !== "blockquote")
            return false;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName?.toLowerCase() !== "blockquote")
            return false;
          if (el.getAttribute("role") || hasExplicitAriaName(el))
            return false;
          if (el.matches(interactiveSelector) || el.querySelector(interactiveSelector))
            return false;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 1)
            return false;
          const span = visibleChildren[0];
          if (span.tagName?.toLowerCase() !== "span")
            return false;
          if (span.querySelector("*:not([aria-hidden='true'])"))
            return false;
          const text = normalize(readableText(span));
          return Boolean(text && text === normalize(readableText(el)));
        }
        function normalizedCodeLineText(value) {
          return normalize((value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " "));
        }
        const upperCaseCodeLanguageLabels = /* @__PURE__ */ new Set([
          "css",
          "html",
          "js",
          "jsx",
          "svg",
          "ts",
          "tsx",
          "xml"
        ]);
        function normalizedCodeLanguageLabel(value) {
          const label = normalize(value);
          if (!label)
            return void 0;
          const lower = label.toLowerCase();
          return upperCaseCodeLanguageLabels.has(lower) ? lower.toUpperCase() : label;
        }
        function isCodeLanguageLabel(el, role) {
          if (role !== "text")
            return false;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          const className = el.getAttribute("class") || "";
          if (!/\blanguage(?:[-_]?name)?\b/i.test(className))
            return false;
          if (!normalizedCodeLanguageLabel(readableText(el)))
            return false;
          for (let current = el.parentElement, depth = 0; current && depth < 4; current = current.parentElement, depth += 1) {
            if (current.querySelector?.("pre code"))
              return true;
          }
          return false;
        }
        function visibleComposedDescendants(el, limit = 250) {
          const descendants = [];
          const visit = (node) => {
            if (descendants.length >= limit)
              return;
            for (const child of walkChildren(node)) {
              if (!child || child.nodeType !== Node.ELEMENT_NODE || isHidden(child))
                continue;
              descendants.push(child);
              visit(child);
            }
          };
          visit(el);
          return descendants;
        }
        function isCodeExampleCustomElementGroup(el) {
          if (!isCustomElement(el))
            return false;
          if (!hasShadowRootContent(el))
            return false;
          if (accessibleName(el, "group"))
            return false;
          if (customElementContributesLabelRoleOrState(el))
            return false;
          if (el.matches(interactiveSelector))
            return false;
          const descendants = visibleComposedDescendants(el);
          const hasPreCode = descendants.some((candidate) => candidate.tagName?.toLowerCase() === "pre" && Array.from(candidate.children || []).some((child) => child.tagName?.toLowerCase() === "code" && !isHidden(child)));
          if (!hasPreCode)
            return false;
          const hasLanguageLabel = descendants.some((candidate) => isCodeLanguageLabel(candidate, implicitRole(candidate)));
          if (!hasLanguageLabel)
            return false;
          return descendants.some((candidate) => ["button", "link"].includes(implicitRole(candidate)));
        }
        function tokenizedPreCodeLines(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName.toLowerCase() !== "pre")
            return void 0;
          const code = Array.from(el.children || []).find((child) => child.tagName?.toLowerCase() === "code" && !isHidden(child));
          if (!code)
            return void 0;
          const hasTokenizedInlineMarkup = Array.from(code.querySelectorAll("span")).some((span) => !isHidden(span) && Boolean(normalizedCodeLineText(span.textContent)));
          if (!hasTokenizedInlineMarkup)
            return void 0;
          const lines = String(code.textContent || "").split(/\r?\n/u).map((line) => normalizedCodeLineText(line)).filter((line) => Boolean(line));
          if (!/^<input$/i.test(lines[0] || ""))
            return void 0;
          if (!lines.slice(1).every((line) => /^[a-z_:][-a-z0-9_:.]*=/i.test(line) || /^\/?>$/u.test(line) || /^\/?>$/u.test(line.replace(/\s+/g, "")))) {
            return void 0;
          }
          return lines.length ? lines : void 0;
        }
        function htmlTagFragmentTokens(line) {
          const match = line.match(/^<\s*([a-z][a-z0-9:-]*)(\s[^<>]*)?\s*\/?>$/iu);
          if (!match)
            return void 0;
          const [, tagName, rawAttributes = ""] = match;
          const fragments = [tagName];
          const attributePattern = /([a-z_:][-a-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/giu;
          for (const attribute of rawAttributes.matchAll(attributePattern)) {
            const name = normalize(attribute[1]);
            if (!name)
              continue;
            const value = normalize(attribute[2] ?? attribute[3] ?? attribute[4]);
            if (name.toLowerCase() !== "id") {
              fragments.push(name);
            }
            if (value)
              fragments.push(value);
          }
          return fragments;
        }
        function standaloneHtmlTagCodeLine(line) {
          if (!htmlTagFragmentTokens(line)?.length)
            return void 0;
          return normalizedCodeLineText(line)?.replace(/\/\*,\./gu, "/*.");
        }
        const mixedHtmlFormWrapperTags = /* @__PURE__ */ new Set(["div", "p"]);
        const mixedHtmlFormContentTags = /* @__PURE__ */ new Set(["button", "form", "input", "label"]);
        const mixedHtmlFormAllowedTags = /* @__PURE__ */ new Set([
          ...mixedHtmlFormWrapperTags,
          ...mixedHtmlFormContentTags
        ]);
        function htmlAttributeValueFragment(name, value) {
          const normalizedValue = normalize(value);
          if (!normalizedValue)
            return void 0;
          if (name.toLowerCase() === "accept" && normalizedValue.includes(",") && normalizedValue.split(",").every((part) => part.trim().startsWith("."))) {
            return normalizedValue.split(",").map((part) => part.trim().replace(/^\./u, "")).filter(Boolean).join(", ");
          }
          return normalizedValue;
        }
        function mixedHtmlTagFragments(rawTag) {
          const closingMatch = rawTag.match(/^<\s*\/\s*([a-z][a-z0-9:-]*)\s*>$/iu);
          if (closingMatch) {
            const tagName2 = closingMatch[1].toLowerCase();
            if (!mixedHtmlFormAllowedTags.has(tagName2))
              return void 0;
            return mixedHtmlFormWrapperTags.has(tagName2) ? [] : [tagName2];
          }
          const openingMatch = rawTag.match(/^<\s*([a-z][a-z0-9:-]*)([^<>]*)>$/iu);
          if (!openingMatch)
            return void 0;
          const [, rawTagName, rawAttributes = ""] = openingMatch;
          const tagName = rawTagName.toLowerCase();
          if (!mixedHtmlFormAllowedTags.has(tagName))
            return void 0;
          if (mixedHtmlFormWrapperTags.has(tagName) && !normalize(rawAttributes.replace(/\/\s*$/u, ""))) {
            return [];
          }
          const fragments = [tagName];
          const attributes = rawAttributes.replace(/\/\s*$/u, "");
          const attributePattern = /([a-z_:][-a-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/giu;
          for (const attribute of attributes.matchAll(attributePattern)) {
            const name = normalize(attribute[1]);
            if (!name)
              continue;
            const value = htmlAttributeValueFragment(name, attribute[2] ?? attribute[3] ?? attribute[4]);
            if (name.toLowerCase() !== "id") {
              fragments.push(name);
            }
            if (value)
              fragments.push(value);
          }
          if (normalize(attributes.replace(attributePattern, "")))
            return void 0;
          return fragments;
        }
        function tokenizedMixedHtmlFormFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName.toLowerCase() !== "pre")
            return void 0;
          const code = Array.from(el.children || []).find((child) => child.tagName?.toLowerCase() === "code" && !isHidden(child));
          if (!code)
            return void 0;
          const hasTokenizedInlineMarkup = Array.from(code.querySelectorAll("span")).some((span) => !isHidden(span) && /\btoken\b/.test(span.getAttribute("class") || "") && Boolean(normalizedCodeLineText(span.textContent)));
          if (!hasTokenizedInlineMarkup)
            return void 0;
          const source = String(code.textContent || "");
          if (!/<\s*label\b/iu.test(source) && !/<\s*button\b/iu.test(source)) {
            return void 0;
          }
          if (!/<\s*(?:form|input)\b/iu.test(source))
            return void 0;
          const fragments = [];
          let sawContentTag = false;
          let sawInlineText = false;
          const tokenPattern = /<\/?\s*[a-z][^<>]*>|[^<]+/giu;
          let offset = 0;
          for (const token of source.matchAll(tokenPattern)) {
            if (token.index !== offset)
              return void 0;
            offset = token.index + token[0].length;
            if (token[0].startsWith("<")) {
              const tagFragments = mixedHtmlTagFragments(token[0]);
              if (!tagFragments)
                return void 0;
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
          if (offset !== source.length)
            return void 0;
          if (!sawContentTag || !sawInlineText || fragments.length < 4)
            return void 0;
          return fragments;
        }
        function tokenizedOneLineHtmlTagFragments(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName.toLowerCase() !== "pre")
            return void 0;
          const code = Array.from(el.children || []).find((child) => child.tagName?.toLowerCase() === "code" && !isHidden(child));
          if (!code)
            return void 0;
          const hasTokenizedInlineMarkup = Array.from(code.querySelectorAll("span")).some((span) => !isHidden(span) && /\btoken\b/.test(span.getAttribute("class") || "") && Boolean(normalizedCodeLineText(span.textContent)));
          if (!hasTokenizedInlineMarkup)
            return void 0;
          const lines = String(code.textContent || "").split(/\r?\n/u).map((line) => normalizedCodeLineText(line)).filter((line) => Boolean(line));
          if (!lines.length)
            return void 0;
          const lineFragments = lines.map((line) => htmlTagFragmentTokens(line));
          if (lineFragments.some((fragments) => !fragments?.length))
            return void 0;
          const tagNames = new Set(lineFragments.map((fragments) => fragments?.[0]));
          if (tagNames.size !== 1)
            return void 0;
          return lineFragments.flatMap((fragments) => fragments || []);
        }
        function tokenizedStandaloneHtmlTagLine(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return void 0;
          if (el.tagName.toLowerCase() !== "pre")
            return void 0;
          const code = Array.from(el.children || []).find((child) => child.tagName?.toLowerCase() === "code" && !isHidden(child));
          if (!code)
            return void 0;
          const hasTokenizedInlineMarkup = Array.from(code.querySelectorAll("span")).some((span) => !isHidden(span) && /\btoken\b/.test(span.getAttribute("class") || "") && Boolean(normalizedCodeLineText(span.textContent)));
          if (!hasTokenizedInlineMarkup)
            return void 0;
          const lines = String(code.textContent || "").split(/\r?\n/u).map((line2) => normalizedCodeLineText(line2)).filter((line2) => Boolean(line2));
          if (lines.length !== 1)
            return void 0;
          const line = standaloneHtmlTagCodeLine(lines[0]);
          return line ? [line] : void 0;
        }
        function isCodeMirrorTextbox(el, role) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (role !== "textbox")
            return false;
          if (el.getAttribute("contenteditable") !== "true")
            return false;
          return Array.from(el.children || []).some((child) => !isHidden(child) && /\bcm-line\b/.test(child.getAttribute?.("class") || ""));
        }
        function codeMirrorTextEntryText(el, role) {
          if (!isCodeMirrorTextbox(el, role))
            return void 0;
          const lines = Array.from(el.children || []).filter((child) => !isHidden(child) && /\bcm-line\b/.test(child.getAttribute?.("class") || "")).map((line) => normalizedCodeLineText(line.textContent)).filter((line) => Boolean(line));
          if (!lines.length)
            return void 0;
          return normalize(lines.slice(0, 2).join(" "));
        }
        function directPreCodeChild(pre) {
          if (!pre || pre.nodeType !== Node.ELEMENT_NODE)
            return void 0;
          if (pre.tagName?.toLowerCase() !== "pre")
            return void 0;
          return Array.from(pre.children || []).find((child) => child.tagName?.toLowerCase() === "code");
        }
        function hasSyntaxHighlightedCodeDescendants(code) {
          return Array.from(code?.querySelectorAll?.("span") || []).some((span) => Boolean(normalize(span.textContent)));
        }
        function isCopyCodeButtonElement(el, allowHidden = false) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return false;
          if (!allowHidden && isHidden(el))
            return false;
          return implicitRole(el) === "button" && normalize(readableText(el) || el.textContent) === "Copy code";
        }
        function isLiveStatusElement(el, allowHidden = false) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE)
            return false;
          if (!allowHidden && isHidden(el))
            return false;
          return Boolean(el.hasAttribute("aria-live"));
        }
        function codePanelWrapperForPre(pre, allowHidden = false) {
          if (!pre || !allowHidden && isHidden(pre))
            return void 0;
          const code = directPreCodeChild(pre);
          if (!code || !allowHidden && isHidden(code))
            return void 0;
          if (!hasSyntaxHighlightedCodeDescendants(code))
            return void 0;
          const wrapper = pre.parentElement;
          if (!wrapper || wrapper.matches?.(interactiveSelector))
            return void 0;
          if (!allowHidden && isHidden(wrapper))
            return void 0;
          const children = Array.from(wrapper.children || []);
          const preIndex = children.indexOf(pre);
          if (preIndex < 1)
            return void 0;
          if (!children.slice(0, preIndex).some((child) => isCopyCodeButtonElement(child, allowHidden))) {
            return void 0;
          }
          if (!children.slice(0, preIndex).some((child) => isLiveStatusElement(child, allowHidden))) {
            return void 0;
          }
          return wrapper;
        }
        function controlledTabForPanel(panel, expanded) {
          const panelId = normalize(panel?.id);
          if (!panelId)
            return void 0;
          const selector = `[aria-controls="${cssEscape(panelId)}"]`;
          return Array.from(document.querySelectorAll(selector)).find((candidate) => {
            if (isHidden(candidate))
              return false;
            if (implicitRole(candidate) !== "tab")
              return false;
            if (!candidate.hasAttribute("aria-expanded"))
              return false;
            return expanded === void 0 || parseBooleanAttribute(candidate, "aria-expanded") === expanded;
          });
        }
        function hasCodePanelPreContract(panel, allowHidden = false) {
          if (!panel || panel.nodeType !== Node.ELEMENT_NODE)
            return false;
          if (implicitRole(panel) !== "tabpanel")
            return false;
          if (!allowHidden && isHidden(panel))
            return false;
          return Array.from(panel.querySelectorAll("pre")).some((pre) => Boolean(codePanelWrapperForPre(pre, allowHidden)));
        }
        function isExpandedHtmlCodePanel(panel) {
          if (!hasCodePanelPreContract(panel))
            return false;
          const controller = controlledTabForPanel(panel, true);
          return normalize(accessibleName(controller, "tab") || readableText(controller)) === "HTML";
        }
        function codePanelControlledByTab(el) {
          const controlledId = el?.getAttribute?.("aria-controls");
          const panel = controlledId ? resolveIdRef(controlledId) : null;
          if (panel && hasCodePanelPreContract(panel, true))
            return panel;
          const tablist = el?.closest?.("[role='tablist']");
          return Array.from(tablist?.querySelectorAll?.("[role='tab'][aria-controls]") || []).map((tab) => resolveIdRef(tab.getAttribute("aria-controls"))).find((candidate) => hasCodePanelPreContract(candidate, true));
        }
        function isCodePanelTab(el, role) {
          if (role !== "tab" || !el?.hasAttribute?.("aria-expanded"))
            return false;
          return Boolean(codePanelControlledByTab(el));
        }
        function compactExpandedCodePanelText(pre) {
          const wrapper = codePanelWrapperForPre(pre);
          if (!wrapper)
            return void 0;
          const panel = pre.closest?.("[role='tabpanel']");
          if (!isExpandedHtmlCodePanel(panel))
            return void 0;
          const code = directPreCodeChild(pre);
          const text = normalize(readableText(code) || code?.textContent);
          if (!text || !/^</u.test(text))
            return void 0;
          return text;
        }
        function compactFocusableTokenizedPreCodeText(pre) {
          if (!pre || pre.nodeType !== Node.ELEMENT_NODE || isHidden(pre))
            return void 0;
          if (pre.tagName?.toLowerCase() !== "pre")
            return void 0;
          const tabindex = normalize(pre.getAttribute("tabindex"));
          if (tabindex === void 0 || tabindex === "-1")
            return void 0;
          const code = directPreCodeChild(pre);
          if (!code || isHidden(code) || !hasSyntaxHighlightedCodeDescendants(code))
            return void 0;
          if (tokenizedPreCodeLines(pre) || tokenizedMixedHtmlFormFragments(pre))
            return void 0;
          const text = normalize(readableText(code) || code.textContent)?.replace(/([^\s{])\}/gu, "$1 }");
          if (!text || text.length < 8 || /^</u.test(text))
            return void 0;
          return `${text} group`;
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
          if (hasStructuredNewsCardListItemContent(el))
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
        function groupedListItemCardContainerFor(el) {
          const listItem = el?.closest?.("li,[role='listitem']");
          if (!isListItem(listItem))
            return void 0;
          for (let current = el.parentElement; current && current !== listItem; current = current.parentElement) {
            if (current.parentElement === listItem && implicitRole(current) === "group" && accessibleName(current, "group") && current.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']") && current.querySelector("ul, ol, dl, [role='list']") && current.querySelector(interactiveSelector) && current.contains(el)) {
              return current;
            }
          }
          return void 0;
        }
        function suppressGroupedListItemCardDescendantPosition(el, role) {
          if (!["paragraph", "text"].includes(role))
            return false;
          return Boolean(groupedListItemCardContainerFor(el));
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
        function cardDetailTextWithTrailingDisclaimer(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName.toLowerCase() !== "div")
            return false;
          if (el.matches(interactiveSelector) || el.closest(interactiveSelector))
            return false;
          if (el.querySelector("h1, h2, h3, h4, h5, h6, [role='heading'], ul, ol, [role='list'], table, [role='table'], [role='grid']")) {
            return false;
          }
          const text = textWithoutInteractive(el);
          if (!text)
            return false;
          const buttons = Array.from(el.querySelectorAll("button, [role='button']")).filter((button) => !isHidden(button));
          if (buttons.length !== 1 || !isTrailingDisclaimerButton(buttons[0]))
            return false;
          return hasPreviousCardActionControls(el);
        }
        function isCardDetailTextLeaf(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!["span", "div"].includes(el.tagName.toLowerCase()))
            return false;
          if (!directOwnText(el))
            return false;
          if (el.querySelector(interactiveSelector) || el.closest(interactiveSelector))
            return false;
          return cardDetailTextWithTrailingDisclaimer(el.parentElement);
        }
        function isInteractiveCardListButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (isNativeCardActionDisclosureButton(el))
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
          const linkName = normalize(accessibleName(el, "link"));
          const axNode = axNodeForElementRole(el, "link");
          if (linkName && axNode && normalize(axNode.name) === linkName && axNode.properties?.focusable === true && hasExplicitAriaName(el) && !nestedImageLabelContributesToName(el, linkName)) {
            return false;
          }
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
        function customElementContributesLabelRoleOrState(el) {
          if (!isCustomElement(el))
            return false;
          if (el.getAttribute("role"))
            return true;
          if (el.hasAttribute("tabindex"))
            return true;
          if (normalize(el.getAttribute("aria-label")))
            return true;
          if (textFromIdRefs(el.getAttribute("aria-labelledby")))
            return true;
          if (normalize(el.getAttribute("title")))
            return true;
          if (normalize(el.getAttribute("name")))
            return true;
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
            "aria-description"
          ].some((attr) => el.hasAttribute(attr));
        }
        function isNativeExposedLinkButtonOrGroup(el, role = implicitRole(el)) {
          const tag = el?.tagName?.toLowerCase();
          if (role === "link")
            return tag === "a" && el.hasAttribute("href");
          if (role === "button") {
            if (tag === "button")
              return true;
            if (tag !== "input")
              return false;
            return ["button", "submit", "reset"].includes((el.getAttribute("type") || "text").toLowerCase());
          }
          if (role === "group") {
            return !isCustomElement(el) && Boolean(accessibleName(el, role));
          }
          if (role === "form") {
            return !isCustomElement(el) && Boolean(accessibleName(el, role));
          }
          if (role === "radiogroup") {
            return Boolean(accessibleName(el, role));
          }
          if (isContextRole(el, role) && role !== "group") {
            return !isCustomElement(el) && Boolean(accessibleName(el, role));
          }
          return false;
        }
        function isNamedCustomShadowGroupStop(el, role = implicitRole(el)) {
          if (role !== "group")
            return false;
          if (!isCustomElement(el) || !hasShadowRootContent(el))
            return false;
          return Boolean(accessibleName(el, "group"));
        }
        function wrapsOnlyNativeExposedLinkButtonOrGroupStops(el) {
          const exposedStops = [];
          let hasDisallowedStop = false;
          const visit = (node) => {
            if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            if (node !== el) {
              const role = implicitRole(node);
              if (isNativeExposedLinkButtonOrGroup(node, role) || isNamedCustomShadowGroupStop(node, role)) {
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
            for (const child of walkChildren(node))
              visit(child);
          };
          visit(el);
          if (hasDisallowedStop || !exposedStops.length)
            return false;
          const popupMenuButtons = exposedStops.filter((stop) => implicitRole(stop) === "button" && normalizedPopup(stop) && !stop.hasAttribute("aria-expanded"));
          if (popupMenuButtons.length === exposedStops.length)
            return false;
          return true;
        }
        function isAnonymousStructuralCustomElementGroup(el) {
          if (!isCustomElement(el))
            return false;
          if (!hasShadowRootContent(el))
            return false;
          if (accessibleName(el, "group"))
            return false;
          if (customElementContributesLabelRoleOrState(el))
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
          return isLwcLikeCustomElement(el) || isCodeExampleCustomElementGroup(el) || wrapsOnlyNativeExposedLinkButtonOrGroupStops(el);
        }
        function closestAnonymousStructuralCustomElementGroup(el) {
          for (let current = el?.parentElement; current; current = current.parentElement) {
            if (isAnonymousStructuralCustomElementGroup(current))
              return current;
            const shadowHost2 = shadowContentHostByNode.get(current);
            if (isAnonymousStructuralCustomElementGroup(shadowHost2))
              return shadowHost2;
          }
          const shadowHost = shadowContentHostByNode.get(el);
          if (isAnonymousStructuralCustomElementGroup(shadowHost))
            return shadowHost;
          return null;
        }
        function isShadowHostWrappedNativeButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (el.tagName?.toLowerCase() !== "button")
            return false;
          if (normalizedPopup(el) || el.hasAttribute("aria-expanded"))
            return false;
          if (el.closest("li,[role='listitem'],td,th,[role='cell'],[role='gridcell']")) {
            return false;
          }
          if (!shadowInclusiveAncestor(el, "nav,[role='navigation']"))
            return false;
          if (readableText(el))
            return false;
          const host = shadowContentHostByNode.get(el);
          if (!isAnonymousStructuralCustomElementGroup(host))
            return false;
          const controls = nativeControlsAcrossShadow(host);
          return controls.length === 1 && controls[0] === el;
        }
        function nativeControlsAcrossShadow(root) {
          const controls = [];
          const visit = (node) => {
            if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            if (implicitRole(node) === "button" || implicitRole(node) === "link" || ["input", "select", "textarea"].includes(node.tagName?.toLowerCase())) {
              controls.push(node);
              return;
            }
            for (const child of walkChildren(node))
              visit(child);
          };
          for (const child of walkChildren(root))
            visit(child);
          return controls;
        }
        function isAxConfirmedSingleButtonShadowWrapperGroup(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (el.tagName?.toLowerCase() !== "button")
            return false;
          if (normalizedPopup(el) || el.hasAttribute("aria-expanded"))
            return false;
          if (!readableText(el))
            return false;
          if (shadowInclusiveAncestor(el, [
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
            "[aria-roledescription='slideshow']"
          ].join(","))) {
            return false;
          }
          const host = shadowContentHostByNode.get(el);
          if (!isAnonymousStructuralCustomElementGroup(host))
            return false;
          const controls = nativeControlsAcrossShadow(host);
          if (controls.length !== 1 || controls[0] !== el)
            return false;
          const wrapper = host?.parentElement;
          if (!wrapper || wrapper === document.body || wrapper === document.documentElement) {
            return false;
          }
          if (isHidden(wrapper) || wrapper.matches(interactiveSelector))
            return false;
          if (wrapper.getAttribute("role") || wrapper.getAttribute("aria-label") || wrapper.getAttribute("aria-labelledby")) {
            return false;
          }
          if (directOwnText(wrapper))
            return false;
          const visibleChildren = Array.from(wrapper.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 1 || visibleChildren[0] !== host)
            return false;
          const wrapperNode = axNodeForElementRole(wrapper, "generic");
          if (!wrapperNode || normalize(wrapperNode.name))
            return false;
          const axChildren = axChildNodes(wrapperNode);
          if (axChildren.length !== 1 || normalizedAxRole(axChildren[0].role) !== "button") {
            return false;
          }
          const buttonName = normalize(accessibleName(el, "button") || readableText(el));
          return Boolean(buttonName && normalize(axChildren[0].name) === buttonName);
        }
        function shadowInclusiveAncestor(el, selector) {
          const seen = /* @__PURE__ */ new Set();
          for (let current = el?.parentElement || shadowContentHostByNode.get(el); current && !seen.has(current); ) {
            seen.add(current);
            if (current.matches?.(selector))
              return current;
            current = current.parentElement || shadowContentHostByNode.get(current);
          }
          return null;
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
          const tableRole = isExpandedAutocompletePopupGrid(table) ? "table" : implicitRole(table);
          if (!row || !cell) {
            return {
              tableRole,
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
          const columnHeaderOffset = columnCount && headerCells.length === columnCount - 1 ? 1 : 0;
          const columnHeader = columnIndex >= columnHeaderOffset ? headerCells[columnIndex - columnHeaderOffset] : null;
          const tableHasComplexColumnHeaders = headerCells.some((header) => isComplexColumnHeaderContext(header));
          const columnHeaderFragments = role !== "columnheader" && columnHeader ? complexColumnHeaderContextFragments(columnHeader) : [];
          const complexColumnHeaderContextText = columnHeaderFragments.length >= 3 ? formatConjunctiveList(columnHeaderFragments) : void 0;
          const cellRole = implicitRole(cell);
          const parsedColumnSpan = Number.parseInt(cell.getAttribute?.("colspan") || "", 10);
          const parsedRowSpan = Number.parseInt(cell.getAttribute?.("rowspan") || "", 10);
          const columnHeaderText = role !== "columnheader" && cellRole !== "columnheader" && columnHeader ? complexColumnHeaderContextText || accessibleName(columnHeader, "columnheader") : void 0;
          const suppressColumnHeaderText = Boolean(tableCellAbbrTitleButtonName(el, role));
          const groupedHeaderNames = groupedTableHeaderNames(table);
          const tableGroupHeaderText = columnIndex === 0 && groupedHeaderNames.length > 1 ? formatConjunctiveList(groupedHeaderNames) : void 0;
          const tableGroupedHeaderRow = Boolean(tableGroupHeaderText) && Boolean(row.closest("thead")) && Boolean(row.querySelector("button[aria-controls]"));
          const tableHasRowgroupSpanHeaders = rows.some((candidate) => Array.from(candidate.children || []).some((child) => {
            if (implicitRole(child) !== "rowheader")
              return false;
            if ((child.getAttribute("scope") || "").toLowerCase() !== "rowgroup")
              return false;
            const span = Number.parseInt(child.getAttribute("colspan") || "", 10);
            return span > 1;
          }));
          const tableFirstGroupedHeaderRow = tableGroupedHeaderRow && row === groupedTableHeaders(table)[0]?.querySelector("tr,[role='row']");
          const insideColumnHeaderContent = role !== "columnheader" && cellRole === "columnheader" && isComplexColumnHeaderContext(cell);
          const simpleNativeTwoColumnHeaderContext = isSimpleNativeTwoColumnHeaderTable(table, rows, headerCells, columnCount);
          const simpleNativeColumnHeaderContext = isSimpleNativeColumnHeaderTable(table, rows, headerCells, columnCount);
          const nativeUnheadedFirstColumnContext = isNativeUnheadedFirstColumnTable(table, rows, headerCells, columnCount);
          return {
            tableRole,
            tableLabel: accessibleName(table, implicitRole(table)),
            rowIndex: !insideColumnHeaderContent && rowIndex >= 0 ? rowIndex + 1 : void 0,
            rowCount: rows.length || void 0,
            columnIndex: !insideColumnHeaderContent && columnIndex >= 0 ? columnIndex + 1 : void 0,
            columnCount: !insideColumnHeaderContent ? columnCount || cells.length || void 0 : void 0,
            columnHeaderText: suppressColumnHeaderText ? void 0 : columnHeaderText,
            complexColumnHeaderContextText,
            tableGroupHeaderText,
            tableGroupedHeaderRow,
            tableFirstGroupedHeaderRow,
            tableHasComplexColumnHeaders,
            tableHasRowgroupSpanHeaders,
            simpleNativeTwoColumnHeaderContext,
            simpleNativeColumnHeaderContext,
            nativeUnheadedFirstColumnContext,
            columnSpan: parsedColumnSpan > 1 ? parsedColumnSpan : void 0,
            rowSpan: parsedRowSpan > 1 ? parsedRowSpan : void 0
          };
        }
        function tableHasInteractiveDescendant(table) {
          return Boolean(table?.querySelector?.("a[href], button, input, select, textarea, [role='link'], [role='button']"));
        }
        function isSimpleNativeColumnHeaderTable(table, rows, headerCells, columnCount) {
          if (table?.tagName?.toLowerCase() !== "table")
            return false;
          if (implicitRole(table) !== "table")
            return false;
          if (!columnCount || columnCount < 2 || !headerCells.length)
            return false;
          if (tableHasInteractiveDescendant(table))
            return false;
          if (groupedTableHeaders(table).length)
            return false;
          const firstRow = rows[0];
          if (!firstRow?.closest?.("thead"))
            return false;
          const headerRows = rows.filter((row) => row.closest?.("thead"));
          if (headerRows.length !== 1)
            return false;
          if (headerCells.length !== columnCount)
            return false;
          return headerCells.every((cell) => cell.tagName?.toLowerCase() === "th" && implicitRole(cell) === "columnheader" && Boolean(accessibleName(cell, "columnheader") || readableText(cell)));
        }
        function isNativeUnheadedFirstColumnTable(table, rows, headerCells, columnCount) {
          if (table?.tagName?.toLowerCase() !== "table")
            return false;
          if (implicitRole(table) !== "table")
            return false;
          if (!columnCount || columnCount < 2)
            return false;
          if (headerCells.length)
            return false;
          if (table.querySelector(":scope > thead"))
            return false;
          if (tableHasInteractiveDescendant(table))
            return false;
          return rows.length > 0;
        }
        function isSimpleNativeTwoColumnHeaderTable(table, rows, headerCells, columnCount) {
          if (table?.tagName?.toLowerCase() !== "table")
            return false;
          if (implicitRole(table) !== "table")
            return false;
          if (rows.length !== 2 || columnCount !== 2 || headerCells.length !== 2) {
            return false;
          }
          const [headerRow, bodyRow] = rows;
          if (!headerRow?.closest?.("thead") || !bodyRow?.closest?.("tbody"))
            return false;
          if (!headerCells.every((cell) => cell.tagName?.toLowerCase() === "th" && implicitRole(cell) === "columnheader" && Boolean(accessibleName(cell, "columnheader") || readableText(cell)))) {
            return false;
          }
          const bodyCells = Array.from(bodyRow.children || []).filter((child) => ["cell", "gridcell"].includes(implicitRole(child)));
          return bodyCells.length === 2;
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
          function axHeadingStaticTextBoundaryFragments() {
            if (!accessibilityNodes.length)
              return void 0;
            const axNode = axNodeForElementRole(el, "heading");
            if (!axNode || normalizedAxRole(axNode.role) !== "heading")
              return void 0;
            const axName = normalize(axNode.name);
            const renderedText = normalize(readableText(el));
            if (!axName || !renderedText || axName !== renderedText)
              return void 0;
            const fragments2 = [];
            let sawBoundary = false;
            function collectStaticText(node) {
              if (!node)
                return false;
              const role = normalizedAxRole(node.role);
              if (role === "statictext") {
                const fragment = normalize(node.name);
                if (fragment && /[\p{L}\p{N}$£€]/u.test(fragment)) {
                  fragments2.push(fragment);
                  sawBoundary = true;
                }
                return true;
              }
              if (role === "linebreak") {
                sawBoundary = true;
                return true;
              }
              if (role && !["generic", "strong", "emphasis", "none"].includes(role)) {
                return false;
              }
              if (!node.childIds?.length)
                return true;
              return node.childIds.every((childId) => collectStaticText(accessibilityNodeById.get(normalize(childId) || "")));
            }
            const childIds = axNode.childIds || [];
            if (childIds.length < 2)
              return void 0;
            if (!childIds.every((childId) => collectStaticText(accessibilityNodeById.get(normalize(childId) || "")))) {
              return void 0;
            }
            if (!sawBoundary || fragments2.length < 2)
              return void 0;
            if (!fragmentsAppearInTextOrder(fragments2, axName))
              return void 0;
            if (normalize(fragments2.join(" ")) !== axName)
              return void 0;
            return fragments2;
          }
          function axLeadingSpaceHeadingFragments() {
            const tag2 = el.tagName?.toLowerCase();
            const level2 = Number.parseInt(el.getAttribute("aria-level") || tag2.slice(1), 10) || 2;
            if (level2 <= 1)
              return void 0;
            const axNode = axNodeForElementRole(el, "heading");
            const axName = axNode?.name || "";
            if (!/^[\s\u00A0]/u.test(axName))
              return void 0;
            const childIds = axNode?.childIds || [];
            if (childIds.length !== 2)
              return void 0;
            const [spaceNodeId, titleWrapperNodeId] = childIds;
            const spaceNode = accessibilityNodeById.get(spaceNodeId);
            const titleWrapperNode = accessibilityNodeById.get(titleWrapperNodeId);
            if (normalizedAxRole(spaceNode?.role) !== "statictext" || !spaceNode?.name || !/^[\s\u00A0]+$/u.test(spaceNode.name)) {
              return void 0;
            }
            if (!titleWrapperNode?.ignored || !titleWrapperNode.childIds?.length) {
              return void 0;
            }
            const titleFragments = titleWrapperNode.childIds.map((childId) => accessibilityNodeById.get(childId)).filter((node) => normalizedAxRole(node?.role) === "statictext").map((node) => normalize(node?.name)).filter((fragment) => Boolean(fragment));
            if (titleFragments.length !== 1)
              return void 0;
            const title = titleFragments[0];
            if (normalize(axName) !== title || normalize(readableText(el)) !== title) {
              return void 0;
            }
            return ["space", title];
          }
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
          function axTrailingLineBreakMarkerFragments(fragments2) {
            if (!fragments2?.length || level !== 1)
              return fragments2;
            const axNode = axNodeForElementRole(el, "heading");
            const axName = normalize(axNode?.name);
            if (!axNode || !axName?.endsWith("_"))
              return fragments2;
            const axChildren = axChildNodes(axNode);
            const hasLineBreakChild = axChildren.some((child) => normalizedAxRole(child.role) === "linebreak");
            if (!hasLineBreakChild)
              return fragments2;
            const textBeforeMarker = normalize(axName.replace(/_+$/u, ""));
            if (textBeforeMarker !== normalize(fragments2.join(" ")))
              return fragments2;
            return [...fragments2, "-"];
          }
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          const tag = el.tagName?.toLowerCase();
          const level = Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2;
          if (level === 1 && visibleChildren.length === 1 && !directOwnText(el) && visibleChildren[0].querySelector("br") && Array.from(visibleChildren[0].children || []).some((child) => child.tagName?.toLowerCase() !== "br" && !isHidden(child))) {
            const fragments2 = axTrailingLineBreakMarkerFragments(lineBreakFragments(visibleChildren[0]));
            if (fragments2)
              return fragments2;
          }
          const hasLineBreak = Array.from(el.childNodes).some((child) => child.nodeType === Node.ELEMENT_NODE && child.tagName?.toLowerCase() === "br");
          if (hasLineBreak) {
            const fragments2 = axTrailingLineBreakMarkerFragments(lineBreakFragments(el));
            if (fragments2)
              return fragments2;
          }
          const axBoundaryFragments = axHeadingStaticTextBoundaryFragments();
          if (axBoundaryFragments)
            return axBoundaryFragments;
          const axFragments = axLeadingSpaceHeadingFragments();
          if (axFragments)
            return axFragments;
          if (level === 1) {
            const inlineBoundaryFragments = [];
            let hasDirectText = false;
            let hasInlineBoundaryElement = false;
            let onlyInlineBoundaryElements = true;
            for (const child of Array.from(el.childNodes || [])) {
              if (child.nodeType === Node.TEXT_NODE) {
                const fragment2 = normalize(child.textContent);
                if (fragment2) {
                  inlineBoundaryFragments.push(fragment2);
                  hasDirectText = true;
                }
                continue;
              }
              if (child.nodeType !== Node.ELEMENT_NODE || isHidden(child))
                continue;
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
            if (onlyInlineBoundaryElements && hasDirectText && hasInlineBoundaryElement && inlineBoundaryFragments.length > 1 && normalize(inlineBoundaryFragments.join(" ")) === normalize(readableText(el))) {
              return inlineBoundaryFragments;
            }
          }
          const directText = Array.from(el.childNodes).filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => normalize(child.textContent)).filter(Boolean);
          if (directText.length)
            return void 0;
          const fragments = Array.from(el.children).filter((child) => !isHidden(child)).map((child) => readableText(child)).filter((fragment) => Boolean(fragment));
          return fragments.length > 1 ? fragments : void 0;
        }
        function parenthesizedBoundaryPartCount(el) {
          const text = normalize(readableText(el));
          if (!text || !/^\(.+\)$/.test(text))
            return void 0;
          const visibleElementChildren2 = Array.from(el.children || []).filter((child) => !isHidden(child) && Boolean(readableText(child)));
          if (!directOwnText(el) && visibleElementChildren2.length === 1) {
            const child = visibleElementChildren2[0];
            const childText = normalize(readableText(child));
            if (childText === text) {
              return parenthesizedBoundaryPartCount(child) || 3;
            }
          }
          const parts = [];
          let hasBoundarySeparator = false;
          for (const child of Array.from(el.childNodes || [])) {
            if (child.nodeType === Node.COMMENT_NODE) {
              hasBoundarySeparator = true;
              continue;
            }
            if (child.nodeType === Node.TEXT_NODE) {
              const fragment = normalize(child.textContent);
              if (fragment)
                parts.push(fragment);
              continue;
            }
            if (child.nodeType === Node.ELEMENT_NODE && !isHidden(child)) {
              const fragment = normalize(readableText(child));
              if (fragment)
                parts.push(fragment);
            }
          }
          if (parts.length < 3 || !hasBoundarySeparator)
            return void 0;
          return normalize(parts.join("")) === text ? parts.length : void 0;
        }
        function directHeadingFragmentCount(el, fragments) {
          if (!fragments || fragments.length < 2)
            return void 0;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child) && Boolean(readableText(child)));
          if (visibleChildren.length !== fragments.length)
            return void 0;
          const count = visibleChildren.reduce((total, child) => {
            return total + (parenthesizedBoundaryPartCount(child) || 1);
          }, 0);
          return count > fragments.length ? count : void 0;
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
          const autocomplete = normalize(el.getAttribute("aria-autocomplete"))?.toLowerCase();
          if (autocomplete !== "list" && !(autocomplete === "both" && isLabelledHeaderSearchAutocompleteCombobox(el, role))) {
            return false;
          }
          if (!el.hasAttribute("aria-describedby"))
            return false;
          if (el.hasAttribute("aria-description"))
            return false;
          return Boolean(accessibleName(el, role) && textFromIdRefs(el.getAttribute("aria-describedby")));
        }
        function carouselControlNameWithDescription(el, role, name) {
          const controlName = normalize(name);
          if (role !== "button" || !controlName)
            return void 0;
          if (!/^(previous|next) slide\b/i.test(controlName))
            return void 0;
          if (!el.hasAttribute("aria-describedby") || el.hasAttribute("aria-description")) {
            return void 0;
          }
          const carousel = el.closest("[aria-roledescription='carousel'], [aria-roledescription='slideshow']");
          if (!carousel)
            return void 0;
          const describedBy = normalize(el.getAttribute("aria-describedby"));
          const describedIds = describedBy?.split(/\s+/).filter(Boolean) || [];
          if (!describedIds.length)
            return void 0;
          const describedElements = describedIds.map((id) => resolveIdRef(id)).filter((candidate) => Boolean(candidate && !isHidden(candidate)));
          if (!describedElements.length || describedElements.some((candidate) => !carousel.contains(candidate))) {
            return void 0;
          }
          if (describedElements.some((candidate) => candidate.matches?.(interactiveSelector))) {
            return void 0;
          }
          const description = normalize(describedElements.map((candidate) => {
            const candidateRole = implicitRole(candidate);
            return accessibleName(candidate, candidateRole) || readableText(candidate);
          }).filter(Boolean).join(" "));
          if (!description)
            return void 0;
          if (accessibilityNodes.length) {
            const axNode = axNodeForElementRole(el, "button");
            if (!axNode || normalize(axNode.name) !== controlName)
              return void 0;
            if (normalize(axNode.description) !== description)
              return void 0;
          }
          return normalize(`${controlName} ${description}`);
        }
        function ariaRoleDescriptionForDescriptor(el, role) {
          const roleDescription = normalize(el.getAttribute("aria-roledescription"));
          if (roleDescription === "slide" && role === "group") {
            return el.closest("[aria-roledescription='carousel']") ? roleDescription : void 0;
          }
          return roleDescription;
        }
        function isLabelledHeaderSearchAutocompleteCombobox(el, role) {
          if (role !== "combobox")
            return false;
          if (el?.tagName?.toLowerCase() !== "input")
            return false;
          const type = (el.getAttribute("type") || "text").toLowerCase();
          if (!["text", "search"].includes(type))
            return false;
          if (parseBooleanAttribute(el, "aria-expanded") !== false)
            return false;
          const label = associatedLabelForControl(el);
          const labelText = normalize(textWithoutInteractive(label) || readableText(label));
          const name = accessibleName(el, role);
          if (!labelText || !name || labelText !== name)
            return false;
          if (!/^search\b/i.test(labelText))
            return false;
          if (!el.closest("header,[role='banner']"))
            return false;
          const controlledId = el.getAttribute("aria-controls") || el.getAttribute("aria-owns");
          const controlled = controlledId ? resolveIdRef(controlledId) : null;
          if (!controlled || implicitRole(controlled) !== "listbox" || !isHidden(controlled)) {
            return false;
          }
          return Boolean(textFromIdRefs(el.getAttribute("aria-describedby")));
        }
        function nativeSelectValue(el) {
          if (el?.tagName?.toLowerCase() !== "select")
            return void 0;
          const selectedIndex = typeof el.selectedIndex === "number" && el.selectedIndex >= 0 ? el.selectedIndex : void 0;
          return normalize(el.selectedOptions?.[0]?.textContent) || (selectedIndex !== void 0 ? normalize(el.options?.[selectedIndex]?.textContent) : void 0) || ("value" in el && el.value ? normalize(el.value) : void 0);
        }
        function descendantLinkCardHeadingLevel(el) {
          const heading = descendantLinkCardHeading(el);
          if (!heading)
            return void 0;
          const tag = heading.tagName?.toLowerCase() || "";
          const level = Number.parseInt(heading.getAttribute("aria-level") || tag.slice(1), 10) || 2;
          const headingText = normalize(readableText(heading));
          const linkName = normalize(accessibleName(el, "link") || linkContentName(el));
          if (level >= 2 && headingText && linkName === headingText && axNodeForElementRole(el, "link")?.properties?.focusable === true && axDescendants(axNodeForElementRole(el, "link")).some((node) => {
            if (normalizedAxRole(node.role) !== "heading")
              return false;
            const axLevel = Number(node.properties?.level);
            return axLevel === level && normalize(node.name) === headingText;
          })) {
            return level;
          }
          if (level >= 3)
            return level;
          const contentName = linkContentName(el);
          return level >= 2 && axLinkedCardContentName(el, "link", contentName) ? level : void 0;
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
          const group = el.closest("fieldset, [role='radiogroup'][aria-label], .slds-radio_button-group");
          if (!group)
            return false;
          const groupTag = group.tagName?.toLowerCase();
          if (groupTag === "fieldset") {
            const tag = el.tagName?.toLowerCase();
            const type = normalize(el.getAttribute("type"))?.toLowerCase();
            const name = normalize(el.getAttribute("name"));
            const hasExplicitGroupName = Boolean(group.getAttribute("aria-label") || group.getAttribute("aria-labelledby"));
            if (tag !== "input" || type !== "radio") {
              if (!hasExplicitGroupName)
                return false;
            } else {
              const hasGroupName = hasExplicitGroupName || Boolean(Array.from(group.children || []).find((child) => child.tagName?.toLowerCase() === "legend" && !isHidden(child) && readableText(child)));
              if (!name)
                return false;
              const radios2 = Array.from(group.querySelectorAll("input[type='radio']")).filter((radio) => !isHidden(radio) && normalize(radio.getAttribute("name")) === name);
              if (radios2.length <= 1 || !radios2.includes(el))
                return false;
              if (accessibilityNodes.length) {
                const axNode = axNodeForElementRole(el, "radio");
                if (!axNode)
                  return false;
                if (normalize(axNode.name) !== accessibleName(el, role))
                  return false;
                const axChecked = axNode.properties?.checked;
                const axCheckedBoolean = typeof axChecked === "boolean" ? axChecked : axChecked === "true" ? true : axChecked === "false" ? false : void 0;
                if (typeof axCheckedBoolean === "boolean" && axCheckedBoolean !== Boolean(el.checked)) {
                  return false;
                }
              } else if (!hasGroupName) {
                return false;
              }
              return true;
            }
          }
          const radios = Array.from(group.querySelectorAll("[role='radio'], input[type='radio']")).filter((radio) => !isHidden(radio));
          return radios.length > 1;
        }
        function radioTrailingLabelText(el, role, name) {
          if (role !== "radio" || !isFieldsetRadioGroup(el, role))
            return void 0;
          if (accessibilityNodes.length)
            return void 0;
          const label = "labels" in el && el.labels?.length ? el.labels[0] : void 0;
          if (!label || isHidden(label))
            return void 0;
          if (label.getAttribute("aria-label") || label.getAttribute("aria-labelledby"))
            return void 0;
          if (!label.querySelector("img, svg, [role='img'], picture, canvas"))
            return void 0;
          const text = normalize(textWithoutInteractive(label) || readableText(label));
          return text && text === normalize(name) ? text : void 0;
        }
        function isGeneratedPseudoPopupButton(el) {
          if (implicitRole(el) !== "button")
            return false;
          if (!generatedPseudoText(el, "before") && !generatedPseudoText(el, "after"))
            return false;
          if (!readableText(el))
            return false;
          if (normalizedPopup(el) || el.hasAttribute("aria-expanded"))
            return false;
          const popupSelector = "[role='menu'], [role='listbox'], [role='dialog'], [role='tabpanel'], ul, ol";
          const controls = normalize(el.getAttribute("aria-controls"));
          if (controls) {
            const controlled = document.getElementById(controls);
            if (controlled?.matches?.(popupSelector) && isHidden(controlled))
              return true;
          }
          for (let current = el.parentElement, depth = 0; current && depth < 3; current = current.parentElement, depth += 1) {
            const siblings = Array.from(current.children || []).filter((child) => child !== el);
            if (siblings.some((sibling) => sibling.matches?.(popupSelector) && isHidden(sibling))) {
              return true;
            }
          }
          return false;
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
          if (isZeroPriceTextInFreeHeadingGroup(el, role))
            return null;
          const tag = el.tagName.toLowerCase();
          const nativeDetailsSummary = directNativeDetailsForSummary(el);
          const control = role === "combobox" && tag !== "input" && tag !== "select" ? el.querySelector("input, select, textarea, [role='textbox'], [role='searchbox']") : null;
          const stateEl = control || el;
          const axLinkedOfferHeadingName = role === "heading" ? axConfirmedLinkedOfferHeadingName(el, role) : void 0;
          const accessibleRoleName = accessibleName(el, role);
          const linkContentNameForSpacing = role === "link" ? linkContentName(el) : void 0;
          const axLinkedCardName = role === "link" ? axLinkedCardContentName(el, role, linkContentNameForSpacing) : void 0;
          const articleHeadingName = articleNameFromFirstHeading(el, role);
          const adjacentVersionTitleText = axAdjacentVersionTitleTextForFirstChild(el, role);
          const name = adjacentVersionTitleText || tableCellAbbrTitleButtonName(el, role) || axLinkedOfferHeadingName || axConfirmedTerminalPunctuationLinkedHeadingName(el, role) || axLinkedCardName || accessibleRoleName || articleHeadingName;
          const axNativeButtonSymbolSpacingName = role === "button" ? axConfirmedNativeButtonSymbolSpacingName(el, role, name) : void 0;
          const axNativeInputButtonName = role === "button" ? axConfirmedNativeInputButtonName(el, role) : void 0;
          const nativeButtonSymbolSpacingName = axNativeButtonSymbolSpacingName || (role === "button" ? nativeButtonStandaloneSymbolSpacingName(el, role, name) : void 0);
          const nativeSelectTitleName = tag === "select" && !name ? normalize(stateEl.getAttribute("title")) : void 0;
          const announcementName = axNativeButtonSymbolSpacingName || nativeButtonSymbolSpacingName || (role === "link" && linkContentNameForSpacing && postPunctuationWhitespaceCollapsedText(name) === linkContentNameForSpacing ? linkContentNameForSpacing : shouldCollapseLinkedListCardPostPunctuationWhitespace(el, role, name) ? finalPostPunctuationWhitespaceCollapsedText(name) : name);
          const nativeButtonLabelStopText = axConfirmedNativeButtonLabelStopText(el, role, name);
          const nativeDescriptorLabel = ["input", "select", "textarea", "meter", "progress"].includes(tag) ? labelForControl(stateEl) : void 0;
          const nativeInputComboboxPlaceholderName = role === "combobox" && tag === "input" && Boolean(normalize(stateEl.getAttribute("placeholder"))) && normalize(stateEl.getAttribute("placeholder")) === name && !nativeDescriptorLabel && !hasExplicitAriaName(stateEl);
          const nativeValueControlLabelStopText = nativeDescriptorLabel && ["combobox", "spinbutton", "slider", "meter", "progressbar"].includes(role) && !hasExplicitAriaName(stateEl) && !nativeValueControlLabelStopIsHidden(stateEl) && !nativeLabelAlreadyAnnouncedByListItem(stateEl, nativeDescriptorLabel) ? nativeDescriptorLabel : void 0;
          const nativeSubmitTabPanelGroup = isAxConfirmedNestedSubmitButtonInTabPanelGroup(el, role, name);
          const carouselControlName = carouselControlNameWithDescription(el, role, name);
          const nativeHiddenControlledCollapsedButton = isAxConfirmedNativeCollapsedButtonWithHiddenControlledRegions(el, role, name);
          const contextEndName = directListArticleCardContextEndName(el, role) || siblingArticleCardContextEndName(el, role) || inferredStructuredArticleCardContextEndName(el, role, articleHeadingName, accessibleRoleName, announcementName);
          const focusableFeedbackGroupText = role === "group" ? axConfirmedFocusableFeedbackGroupText(el) : void 0;
          const richTextGroupText = focusableRichTextParagraphGroupText(el);
          const rawText = focusableFeedbackGroupText || richTextGroupText || readableText(el);
          const text = role === "group" && isCustomElement(el) && hasShadowRootContent(el) ? void 0 : rawText;
          const markerSeparatedListLink = isMarkerSeparatedListLink(el, role);
          const largePlainList = role === "list" && isLargePlainList(el, role);
          const largePlainListItem = role === "listitem" && isLargePlainListItem(el, role);
          const position = markerSeparatedListLink || largePlainListItem ? void 0 : positionInSet(el, role);
          const size = markerSeparatedListLink || largePlainListItem ? void 0 : setSize(el, role);
          const rect = el.getBoundingClientRect();
          const table = tableContext(el, role);
          const parentListMeta = parentListPosition(el);
          const headingButton = role === "heading" ? firstVisibleDescendant(el, "button, [role='button']") : null;
          const headingLink = role === "heading" ? firstVisibleDescendant(el, "a[href]") : null;
          const ariaLabelHeadingVisibleTextItemCount = role === "heading" ? axConfirmedAriaLabelHeadingVisibleTextItemCount(el, role) : void 0;
          const headingFragments = role === "heading" && !ariaLabelHeadingVisibleTextItemCount ? directHeadingFragments(el) : void 0;
          const headingFragmentCount = role === "heading" ? directHeadingFragmentCount(el, headingFragments) ?? ariaLabelHeadingVisibleTextItemCount ?? axConfirmedAriaLabelHeadingStaticTextItemCount(el, role) : void 0;
          const selectedListboxOption = singleSelectedListboxOption(el);
          const anonymousStructuralCustomElementHost = closestAnonymousStructuralCustomElementGroup(el);
          const suppressPositionedChoiceGroup = role === "button" && Boolean(position) && !el.hasAttribute("aria-expanded") && !normalizedPopup(el) && !isSlideshowNavigationButton(el) && (isIconFirstTextButton(el) || el.hasAttribute("aria-label") && !rawText);
          const suppressNativeCardActionGroup = role === "button" && isNativeCardActionDisclosureButton(el);
          const suppressPaginationButtonGroup = role === "button" && isPaginationNavigationButton(el, role);
          const suppressFooterLegalActionButtonGroup = role === "button" && isFooterLegalActionButton(el, role);
          const suppressNamedGroupCollapsedControlGroup = collapsedControlInNamedGroup(el, role, nativeDetailsSummary);
          const suppressGroupedCollapsedAriaRoleButtonGroup = collapsedAriaRoleButtonInGroupedContext(el, role);
          const suppressCollapsedAnchorButtonGroup = isAxConfirmedCollapsedAnchorButtonWithoutGroup(el, role, name);
          const collapsedVisibleControlledRegionButton = controlsVisibleAxRegion(el, role);
          const emptyGenericTextNativeButtonGroup = isAxConfirmedEmptyGenericTextNativeButtonGroup(el, role, name);
          const nativeRangeValue = nativeRangeValueText(stateEl, role);
          const value = tag === "select" ? nativeSelectValue(stateEl) : nativeRangeValue ? nativeRangeValue : selectedListboxOption ? accessibleName(selectedListboxOption, "option") || readableText(selectedListboxOption) : "value" in stateEl && stateEl.value ? stateEl.value : void 0;
          const listboxSelectedCount = role === "listbox" ? selectedListboxOptions(el).length || void 0 : void 0;
          const selectedListboxPosition = selectedListboxOption ? positionInSet(selectedListboxOption, "option") : void 0;
          const selectedListboxSize = selectedListboxOption ? setSize(selectedListboxOption, "option") : void 0;
          const leadingGenericGroupStops = leadingGenericGroupStopCountBeforeDisabledControl(el, role);
          const checkboxRoleButtonAccordionControl = isCheckboxRoleButtonAccordionControl(el, role);
          const nativeSearchFormInputContract = nativeSearchFormTextInputContract(el, role);
          const descriptor = {
            role,
            name: carouselControlName || visibleTextEllipsisButtonName(el, role) || axNativeInputButtonName || (nativeInputComboboxPlaceholderName ? void 0 : announcementName) || nativeSelectTitleName || focusableFeedbackGroupText,
            inferredArticleName: Boolean(role === "article" && articleHeadingName && !accessibleRoleName && announcementName === articleHeadingName),
            contextEndName,
            text,
            description: normalize(stateEl.getAttribute("aria-description") ?? el.getAttribute("aria-description")),
            details: carouselControlName ? void 0 : textFromIdRefs(stateEl.getAttribute("aria-describedby") ?? el.getAttribute("aria-describedby")),
            errorMessage: textFromIdRefs(stateEl.getAttribute("aria-errormessage") ?? el.getAttribute("aria-errormessage")),
            roleDescription: role === "list" && tag === "dl" ? "definition list" : role === "radiogroup" ? "radio group" : role === "group" && isLabelledAriaTabGroup(el) ? "tab group" : role === "button" && nativeDetailsSummary ? "disclosure triangle" : role === "contentinfo" && isSimpleNativeFooter(el) ? "footer" : role === "alert" && isEmptyAlertBeforeDialog(el) ? "group" : role === "paragraph" && el.getAttribute("tabindex") === "-1" && hasStructuredListItemContent(el.closest("li,[role='listitem']")) ? "empty group" : role === "group" && isNamedEmptyDecorativeMediaGroup(el, role) ? "empty group" : role === "group" && isScanRootLeadingFocusableIframeStop(el) ? "empty group" : ariaRoleDescriptionForDescriptor(el, role),
            level: role === "heading" ? Number.parseInt(el.getAttribute("aria-level") || tag.slice(1), 10) || 2 : role === "list" ? listLevel(el) : void 0,
            setSize: selectedListboxSize ?? size,
            positionInSet: selectedListboxPosition ?? position,
            largePlainList: largePlainList || void 0,
            largePlainListItem: largePlainListItem || void 0,
            ...parentListMeta,
            value,
            valueText: normalize(stateEl.getAttribute("aria-valuetext")),
            emptyObject: role === "object" && (tag === "object" && !el.hasAttribute("data") || tag === "embed" && !el.hasAttribute("src")) ? true : void 0,
            placeholder: normalize(stateEl.getAttribute("placeholder")),
            required: stateEl.required || stateEl.getAttribute("aria-required") === "true" || void 0,
            invalid: stateEl.getAttribute("aria-invalid") && stateEl.getAttribute("aria-invalid") !== "false" ? stateEl.getAttribute("aria-invalid") === "true" ? true : stateEl.getAttribute("aria-invalid") : void 0,
            checked: role === "checkbox" || role === "radio" || checkboxRoleButtonAccordionControl ? el.getAttribute("aria-checked") === "mixed" ? "mixed" : el.getAttribute("aria-checked") ? el.getAttribute("aria-checked") === "true" : inferredSldsRadioChecked(el) ?? Boolean(el.checked) : void 0,
            expanded: parseBooleanAttribute(stateEl, "aria-expanded") ?? (headingButton ? parseBooleanAttribute(headingButton, "aria-expanded") : void 0) ?? (nativeDetailsSummary ? nativeDetailsSummary.hasAttribute("open") : void 0),
            selected: parseBooleanAttribute(el, "aria-selected") ?? (isControlledTablistTab(el, role) ? true : void 0),
            pressed: el.hasAttribute("aria-pressed") ? el.getAttribute("aria-pressed") === "mixed" ? "mixed" : el.getAttribute("aria-pressed") === "true" : void 0,
            disabled: el.disabled || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true" || isImplicitDisabledPreviousSlideButton(el) || void 0,
            readOnly: (el.readOnly || el.getAttribute("aria-readonly") === "true") && !readonlyOverlayTextControl(el, role) || void 0,
            current: el.hasAttribute("aria-current") ? el.getAttribute("aria-current") === "false" ? void 0 : el.getAttribute("aria-current") === "true" ? true : el.getAttribute("aria-current") : void 0,
            hasPopup: nativeDatalistElement(stateEl) ? "listbox" : normalizedPopup(stateEl) ?? normalizedPopup(el),
            popupLabelWithoutComma: role === "button" && hasVisibleTextEllipsisButtonName(el, role) ? true : void 0,
            checkboxRoleButtonAccordion: checkboxRoleButtonAccordionControl || void 0,
            autocomplete: normalize(stateEl.getAttribute("aria-autocomplete") ?? el.getAttribute("aria-autocomplete")),
            modal: el.getAttribute("aria-modal") === "true" || void 0,
            modalDialogSummaryItemCount: role === "dialog" && el.getAttribute("aria-modal") === "true" && hasExplicitDialogName(el) ? modalDialogSummaryItemCount(el) : void 0,
            sort: normalize(el.getAttribute("aria-sort")),
            selectedCount: listboxSelectedCount,
            nativeSelect: tag === "select" || void 0,
            nativeDatalistPlaceholderName: role === "combobox" && tag === "input" && Boolean(nativeDatalistElement(stateEl)) && nativeInputComboboxPlaceholderName || void 0,
            headingButton: Boolean(headingButton) || void 0,
            headingLink: Boolean(headingLink) && !axLinkedOfferHeadingName || void 0,
            linkHeadingLevel: role === "link" ? descendantLinkCardHeadingLevel(el) : void 0,
            headingFragments,
            headingFragmentCount,
            preserveSpaceBeforePunctuationName: role === "heading" ? axConfirmedSpaceBeforePunctuationHeadingName(el, role) : role === "button" ? nativeButtonSymbolSpacingName : void 0,
            iconOnlyLink: role === "link" && (isIconOnlyLink(el) || isEmptySvgImageOnlyAxUrlFallbackLink(el, role, name)) || void 0,
            textlessCarouselPaginatorLink: role === "link" && isTextlessCarouselPaginatorLink(el) || void 0,
            precedingControlLabel: role === "button" ? precedingControlLabelForButton(el) : void 0,
            fieldsetRadioGroup: isFieldsetRadioGroup(el, role) || void 0,
            radioTrailingLabelText: role === "radio" ? radioTrailingLabelText(el, role, announcementName) : void 0,
            compositeText: role === "button" && Boolean(nestedImageLabel(el) && rawText) || void 0,
            groupContext: !leadingGenericGroupStops && !suppressNativeCardActionGroup && !suppressPaginationButtonGroup && !suppressFooterLegalActionButtonGroup && !suppressNamedGroupCollapsedControlGroup && !suppressGroupedCollapsedAriaRoleButtonGroup && !suppressCollapsedAnchorButtonGroup && !(role === "button" && el.hasAttribute("aria-pressed")) && (Boolean(headingButton) || role === "tab" && isControlledTablistTab(el, role) || role === "button" && !suppressPositionedChoiceGroup && !isPositionedImageChoiceButton(el) && !isCollapsedDialogPopupImageTextButton(el) && !el.hasAttribute("aria-pressed") && Boolean(nestedImageLabel(el)) || role === "button" && Boolean(closestCustomElement(el)) && !anonymousStructuralCustomElementHost && !hasSameNameCustomGroupAncestor(el, name) && !normalizedPopup(el) && !hasAssociatedExplicitTooltip(el, name) && !isAriaLabelOnlyDecorativeIconButton(el) && !isPlainUtilityDisclosureButton(el) && !suppressPositionedChoiceGroup && el.hasAttribute("aria-label") || role === "button" && collapsedVisibleControlledRegionButton || role === "button" && el.hasAttribute("aria-expanded") && !checkboxRoleButtonAccordionControl && !nativeButtonLabelStopText && !anonymousStructuralCustomElementHost && !normalizedPopup(el) && !isAxConfirmedEmptyCollapsedOffscreenButton(el, role, name) && !nativeHiddenControlledCollapsedButton && !isPresentationCollapsedAccordionButton(el) && !position && !buttonSharesListItemWithLink(el) && !isPlainUtilityDisclosureButton(el) && normalize(name) !== "Open navigation menu" || role === "button" && isLabeledIconActionButton(el) || role === "button" && isAxConfirmedToolbarIconButton(el, role) || role === "button" && !nativeHiddenControlledCollapsedButton && isMenuDisclosureGroupButton(el) || role === "button" && Boolean(nativeDetailsSummary) || role === "button" && isSlideshowNavigationButton(el) || role === "button" && isInteractiveCardListButton(el) || role === "button" && isTrailingDisclaimerButton(el) || role === "button" && isTextWithTrailingIconButton(el) || role === "button" && isGeneratedPseudoPopupButton(el) || role === "button" && isShadowHostWrappedNativeButton(el) || role === "button" && isNativeButtonDirectSpanGroupButton(el) || role === "button" && emptyGenericTextNativeButtonGroup || role === "button" && isFilterRowGroupButton(el, role) || role === "button" && isCodeExampleActionGroupButton(el, role) || role === "button" && isStructuredArticleCardStandaloneButtonAction(el, role) || role === "button" && nativeSubmitTabPanelGroup || role === "button" && !suppressPositionedChoiceGroup && isIconFirstTextButton(el) || role === "button" && isExpandedNavigationListItemButton(el) || role === "text" && isFocusableCustomTooltipTrigger(el)) || void 0,
            richTextGroup: role === "group" && Boolean(richTextGroupText) || void 0,
            groupedCollectionPosition: role === "button" && collapsedVisibleControlledRegionButton || role === "button" && Boolean(nativeDetailsSummary) || role === "button" && hasOnlyInteractiveListItemContent(semanticListContext(el).listItem) || role === "group" && isFocusableStructuredListItemGroup(el) || void 0,
            parenthesizedCollectionPosition: role === "term" && (isWrappedDefinitionListItem(el) || isSimpleDirectDefinitionListItem(el) || isDirectListBackedDefinitionItem(el) || Boolean(definitionListDisclosureButton(el))) || role === "group" && (isFocusableStructuredListItemGroup(el) || isFocusableImageListItem(el)) || void 0,
            duplicateCollectionPosition: role === "term" && (isWrappedDefinitionListItem(el) || isSimpleDirectDefinitionListItem(el) || isDirectListBackedDefinitionItem(el) || Boolean(definitionListDisclosureButton(el))) || role === "heading" && Boolean(flattenedSlottedCarouselPosition(el).positionInSet) || void 0,
            emptyTerm: role === "term" && (isSimpleDirectDefinitionListItem(el) || isDirectListBackedDefinitionItem(el)) ? true : void 0,
            unlabeledImage: role === "image" && isInformativeUnlabeledCmsImage(el) ? true : void 0,
            unlabeledImageSrcLabel: role === "image" && isInformativeUnlabeledCmsImage(el) ? cmsMediaPathLabel(el) : void 0,
            ...flattenedSlottedCarouselImageInfo(el),
            splitDescribedAutocomplete: shouldSplitDescribedAutocomplete(el, role) || void 0,
            searchInputGroup: role === "combobox" && tag === "input" && (el.getAttribute("type") || "").toLowerCase() === "search" || void 0,
            suppressAutocomplete: isNativeSearchFormLabelStopInput(el, role) || void 0,
            popupListboxContainer: role === "listbox" && isExpandedAutocompletePopupListbox(el) || void 0,
            compactInputActionGroup: role === "group" && compactInputActionGroupLabel(el) ? true : void 0,
            leadingCarouselGroup: !isStructuredArticleCardNamingHeading(el, role) && isLeadingCarouselGroupStop(el, role) || void 0,
            trailingCarouselSlideGroups: isTrailingCarouselSlideGroupStop(el, role) || void 0,
            leadingStandaloneCardGroup: !isStructuredArticleCardNamingHeading(el, role) && !isStandaloneTextLabelBeforeStructuredArticleCard(el, role) && !hasInlineLinkPunctuationWrapperAncestor(el) && (isLeadingStandaloneCardGroupStop(el, role) || isPostHeadingMediaCardGroupStop(el, role)) || void 0,
            namedTextCardGroup: role === "text" && isCustomHeadedTextCardBody(el) || void 0,
            leadingDecorativeTextCardGroups: isLeadingDecorativeTextCardGroupStop(el, role) || void 0,
            leadingGenericGroupStops: leadingGenericGroupStops || void 0,
            trailingStandaloneGroup: role === "button" && isAxConfirmedSingleButtonShadowWrapperGroup(el) || void 0,
            readonlyOverlayTextControl: readonlyOverlayTextControl(el, role) || void 0,
            splitLabelStop: ["searchbox", "textbox"].includes(role) && tag === "input" && Boolean(name?.endsWith(":") || name && stateEl.getAttribute("aria-invalid") === "true" && normalize(stateEl.getAttribute("placeholder")) === name) || isNativeSearchFormLabelStopInput(el, role) || isAutocompleteGridPopupLabelStopInput(el, role) || isAxConfirmedNativeSearchFormTextInput(el, role) || shouldSplitNamedSingleControlFormInput(el, role) || shouldSplitCompositeNativeControlLabelStop(el, role) || role === "combobox" && tag === "select" && Boolean(name?.endsWith(":") || value && name?.endsWith(value)) || Boolean(nativeValueControlLabelStopText) || shouldSplitNativeControlLabelStop(el, role) || shouldSplitCompositeNativeControlLabelStop(el, role) || shouldSplitDirectVisibleTextInputLabelStop(el, role) || shouldSplitVisibleRequiredPasswordLabelStop(el, role) || Boolean(axConfirmedNativeControlLabelStopText(el, role)) || Boolean(nativeButtonLabelStopText) ? true : void 0,
            nativeFormControlLabelStop: Boolean(nativeValueControlLabelStopText) || shouldSplitNativeControlLabelStop(el, role) || shouldSplitCompositeNativeControlLabelStop(el, role) || shouldSplitDirectVisibleTextInputLabelStop(el, role) || shouldSplitVisibleRequiredPasswordLabelStop(el, role) || Boolean(axConfirmedNativeControlLabelStopText(el, role)) ? true : void 0,
            nativeControlLabelText: nativeButtonLabelStopText || nativeValueControlLabelStopText || axConfirmedNativeControlLabelStopText(el, role) || (shouldSplitCompositeNativeControlLabelStop(el, role) ? directAssociatedLabelText(el) : void 0),
            nativeSearchFormInputStop: Boolean(nativeSearchFormInputContract) || shouldSplitNamedSingleControlFormInput(el, role) ? true : void 0,
            nativeSearchFormInputLabelStop: accessibilityNodes.length && Boolean(nativeSearchFormInputContract) ? true : void 0,
            nativeSearchFormInputLabelText: nativeSearchFormInputContract?.labelText,
            nativeSearchFormInputAxName: nativeSearchFormInputContract?.axName,
            nativeFormInlineAlert: role === "alert" && Boolean(el.closest("form[aria-label], form[aria-labelledby]")) ? true : void 0,
            namedAlertBoundary: role === "alert" && isNamedAlertBoundary(el, role) ? true : void 0,
            suppressStatusRolePrefix: isPostFooterTextStatus(el, role) || void 0,
            textEntryArea: role === "textbox" && tag === "textarea" ? true : void 0,
            emailTextField: role === "textbox" && tag === "input" && (el.getAttribute("type") || "text").toLowerCase() === "email" ? true : void 0,
            secureTextField: role === "textbox" && tag === "input" && (el.getAttribute("type") || "text").toLowerCase() === "password" ? true : void 0,
            textboxPlaceholderBeforeRole: textboxShouldPlacePlaceholderBeforeRole(el, stateEl, role, name, value) || isAxConfirmedPlaceholderOnlyTextboxName(el, stateEl, role, name, value) || void 0,
            placeholderOnlyTextboxName: isAxConfirmedPlaceholderOnlyTextboxName(el, stateEl, role, name, value) || void 0,
            footerCountrySelector: role === "combobox" && isFooterCountrySelector(el) ? true : void 0,
            fieldsetPromptText: role === "group" ? fieldsetPromptText(el) : void 0,
            fieldsetLegendText: role === "group" ? radioImageFieldsetLegendText(el) || visuallyHiddenFieldsetLegendText(el) : void 0,
            labelledNavigationHeaderText: role === "navigation" ? labelledNavigationHeaderStopText(el, role, name) : void 0,
            examplePreviewFrameAnnouncements: role === "link" ? previewFrameAnnouncementsForLink(el, role) : void 0,
            tabExpandedState: role === "tab" && (isPreviewFrameTab(el, role) || isCodePanelTab(el, role)) ? true : void 0,
            axInlineTwoLinkListItemAnnouncements: role === "listitem" ? axInlineTwoLinkListItemAnnouncements(el) : void 0,
            axOrderedParentNestedListItemAnnouncements: role === "listitem" ? axOrderedParentNestedListItemAnnouncements(el) : void 0,
            axOrderedNestedListItemMarkerAnnouncement: role === "listitem" ? axOrderedNestedListItemMarkerAnnouncement(el) : void 0,
            axNativeMarkerListItemFragmentAnnouncements: role === "listitem" ? axNativeMarkerListItemFragmentAnnouncements(el) : void 0,
            namedNavigationListItemGroupedLinkAnnouncements: role === "listitem" ? namedNavigationListItemGroupedLinkAnnouncements(el) : void 0,
            axPublicationListItemBoundaryAnnouncements: role === "listitem" ? axPublicationListItemBoundaryAnnouncements(el) : void 0,
            axMixedInlineListItemAnnouncements: role === "listitem" ? axMixedInlineListItemAnnouncements(el) : void 0,
            axStrongWrappedMarkerListItemAnnouncements: role === "listitem" ? axStrongWrappedMarkerListItemAnnouncements(el) : void 0,
            axSplitHeaderListItemAnnouncement: role === "listitem" ? axSplitHeaderListItemAnnouncement(el) : void 0,
            axPlainTextMarkerListItemAnnouncement: role === "listitem" ? axPlainTextMarkerListItemAnnouncement(el) : void 0,
            axMarkerOnlyListItemStopAnnouncement: role === "listitem" ? axMarkerOnlyListItemStopAnnouncement(el) : void 0,
            axMarkerOnlyListItemInlineTextAnnouncement: role === "listitem" ? axMarkerOnlyListItemInlineTextAnnouncement(el) : void 0,
            axMarkerLinkTrailingTextListItemAnnouncement: role === "listitem" ? axMarkerLinkTrailingTextListItemAnnouncement(el) : void 0,
            savedRenderedPlainTextMarkerListItemAnnouncement: role === "listitem" ? savedRenderedPlainTextMarkerListItemAnnouncement(el) : void 0,
            contributionListItemAnnouncements: role === "listitem" ? contributionListItemAnnouncements(el) : void 0,
            wrappedDefinitionListTermChildAnnouncements: role === "term" ? wrappedDefinitionListTermChildAnnouncements(el) : void 0,
            metadataListItemValueAnnouncements: role === "listitem" ? metadataListItemValueAnnouncements(el) : void 0,
            nativeMarkerListItemAnnouncements: role === "listitem" ? nativeMarkerListItemAnnouncements(el) : void 0,
            markerSeparatedListLink: markerSeparatedListLink || void 0,
            markerSeparatedListRegion: isMarkerSeparatedListRegion(el, role) || void 0,
            markerSeparatedListRegionLeadingMarker: isMarkerSeparatedListRegion(el, role) && markerSeparatedListRegionHasInteractiveLabel(el) || void 0,
            ...markerSeparatedListItemContext(el),
            clusteredVisualButton: role === "button" && isClusteredVisualButton(el, role) ? true : void 0,
            richProductCardFeatureRowFragments: role === "paragraph" ? richProductCardFeatureRowFragments(el) : void 0,
            richProductCardFeatureHeading: role === "paragraph" ? isRichProductCardFeatureHeading(el) || void 0 : void 0,
            complexColumnHeaderColorGroupText: complexColumnHeaderColorGroupText(el, role),
            complexColumnHeaderTextFragments: complexColumnHeaderTextFragments(el, role),
            complexColumnHeaderContextCellTextFragments: complexColumnHeaderContextCellTextFragments(el, role, table.complexColumnHeaderContextText),
            nativeTableCellTextFragments: nativeTableCellTextFragments(el, role),
            inlineEmphasisTextFragments: inlineEmphasisTextFragments(el, role),
            blockquoteInlineEmphasisFragments: blockquoteInlineEmphasisFragments(el, role),
            plainSpanOnlyBlockquote: role === "blockquote" && isPlainSpanOnlyBlockquote(el, role) ? true : void 0,
            inlineCodeBreakTextFragments: inlineCodeBreakTextFragments(el, role),
            footerInlineBoundaryTextFragments: footerInlineBoundaryTextFragments(el),
            figureMockupHeaderText: figureMockupHeaderText(el, role),
            axStaticTextRunFragments: axStaticTextRunFragments(el, role),
            axLineBreakTextFragments: axLineBreakTextFragments(el, role),
            inlineTextLinkFragments: role === "paragraph" ? footerInlineBoundaryParagraphFragments(el) || footerInlineBoundaryTextFragments(el) || articleBylineAuthorListFragments(el) || directAxInlineTextLinkParagraphFragments(el) || directLinkGeneratedMetadataFragments(el) || inlineCodeBreakTextFragments(el, role) || inlineSemanticTextLinkFragments(el) || plainTextTrailingLinkParagraphFragments(el) || directAxInlineAbbrSupParagraphFragments(el) || articleInlineTextLinkFragments(el) || inlineTextLinkFragments(el) : void 0,
            inlinePhrasingBoundaryFragments: role === "paragraph" ? inlinePhrasingBoundaryFragments(el) : void 0,
            expandedRegionInlineLinkFragments: role === "paragraph" ? expandedRegionInlineLinkFragments(el) : void 0,
            priceDisclosureFragments: priceDisclosureFragments(el, role),
            codeMirrorTextEntryText: codeMirrorTextEntryText(el, role),
            preserveSpaceBeforeColonName: axSpaceBeforeColonLinkName(el, role, name),
            suppressContextEnd: role === "banner" && isEmptyContextStop(el, role) || role === "region" && isEmptyNamedRegionStop(el, role) || role === "tooltip" || role === "group" && isNamedEmptyDecorativeMediaGroup(el, role) || role === "group" && isScanRootLeadingFocusableIframeStop(el) || role === "group" && Boolean(compactInputActionGroupLabel(el)) || shouldSuppressSingletonDocumentArticleEnd(el, role) || role === "group" && isButtonShellClusterGroup(el) || role === "group" && isButtonShellGroup(el) || role === "group" && isFocusableImageListItem(el) || role === "group" && isFocusableStructuredListItemGroup(el) || role === "group" && isAxConfirmedFocusableFeedbackGroup(el) || role === "group" && isFocusableRichTextParagraphGroup(el) || role === "group" && isFocusableHeadingRichTextNavigationGroup(el) || role === "group" && isFocusableGenericListItemDescendantGroup(el) || role === "group" && isFocusableSummaryPanelGroup(el, role) || role === "group" && isDecorativeRoleGroupBeforeNativeLinks(el) || role === "group" && isDecorativeGenericGroupBeforeNativeLinks(el) || role === "group" && Boolean(fieldsetPromptText(el)) || role === "term" && (isSimpleDirectDefinitionListItem(el) || isDirectListBackedDefinitionItem(el)) || shouldSuppressNativeMarkerNestedSingletonListEnd(el, role) || role === "dialog" && el.getAttribute("aria-modal") === "true" && (hasExplicitDialogName(el) && modalDialogSummaryItemCount(el) || !hasExplicitDialogName(el) && !readableText(el)) || role === "group" && isCustomElement(el) && hasShadowRootContent(el) && !accessibleName(el, role) ? true : void 0,
            ...table,
            ...complexColumnHeaderFragments(el, role),
            boundingBox: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          };
          if (role === "banner" && isEmptyContextStop(el, role)) {
            descriptor.emptyContext = true;
            descriptor.name = void 0;
            descriptor.text = void 0;
          }
          if (role === "listitem" && !descriptor.namedNavigationListItemGroupedLinkAnnouncements) {
            const listItemText = textWithoutInteractive(el);
            descriptor.name = axRenderedSingleChildTextCaseName(el, listItemText) || listItemText;
            descriptor.text = descriptor.name;
            descriptor.inlineEmphasisListItemFragments = inlineEmphasisListItemFragments(el);
          }
          if (role === "paragraph") {
            const adjacentValue = adjacentParagraphValueText(el);
            const paragraphName = hasInlineInteractiveEmbeddedInText(el) ? textBeforeFirstInlineInteractive(el) : textWithoutInteractive(el) || text;
            descriptor.name = adjacentValue && paragraphName ? `${paragraphName}${adjacentValue}` : renderedCaseName(el, role, paragraphName) || paragraphName;
            descriptor.text = descriptor.name;
          }
          if (descriptor.complexColumnHeaderColorGroupText) {
            descriptor.name = descriptor.complexColumnHeaderColorGroupText;
            descriptor.text = descriptor.complexColumnHeaderColorGroupText;
          }
          const codeLanguageLabel = isCodeLanguageLabel(el, role) ? normalizedCodeLanguageLabel(descriptor.name || descriptor.text) : void 0;
          if (codeLanguageLabel) {
            descriptor.name = codeLanguageLabel;
            descriptor.text = codeLanguageLabel;
          }
          const priceDisclosureText = role === "text" ? joinedPriceDisclosureText(el) : void 0;
          if (priceDisclosureText) {
            descriptor.name = priceDisclosureText;
            descriptor.text = priceDisclosureText;
          }
          if (adjacentVersionTitleText) {
            descriptor.name = adjacentVersionTitleText;
            descriptor.text = adjacentVersionTitleText;
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
        function nextVisibleElementSibling(el) {
          for (let sibling = el?.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
            if (!isHidden(sibling))
              return sibling;
          }
          return void 0;
        }
        function previousVisibleElementSibling(el) {
          for (let sibling = el?.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
            if (!isHidden(sibling))
              return sibling;
          }
          return void 0;
        }
        function hasFollowingHiddenElementSibling(el) {
          for (let sibling = el?.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
            if (isHidden(sibling))
              return true;
          }
          return false;
        }
        function closestFooterContext(el) {
          return el?.closest?.("footer,[role='contentinfo']") || void 0;
        }
        function sharesFooterContext(left, right) {
          const leftFooter = closestFooterContext(left);
          return Boolean(leftFooter && leftFooter === closestFooterContext(right));
        }
        function firstVisibleDescendantMatching(el, predicate) {
          const queue = Array.from(walkChildren(el));
          while (queue.length) {
            const candidate = queue.shift();
            if (!candidate || candidate.nodeType !== Node.ELEMENT_NODE || isHidden(candidate)) {
              continue;
            }
            if (predicate(candidate))
              return candidate;
            queue.push(...walkChildren(candidate));
          }
          return void 0;
        }
        function hasRenderedListMarkers(list) {
          return listChildren(list).some((item) => item.getAttribute("data-sr-marker-content") === "normal" && item.getAttribute("data-sr-marker-display") === "inline-block" && Boolean(normalize(item.getAttribute("data-sr-marker-list-style-type"))));
        }
        function isHeadedUnmarkedListBlock(el) {
          const heading = firstVisibleDescendantMatching(el, (candidate) => {
            return implicitRole(candidate) === "heading" && Boolean(readableText(candidate));
          });
          if (!heading)
            return false;
          const list = firstVisibleDescendantMatching(el, (candidate) => {
            if (implicitRole(candidate) !== "list")
              return false;
            if (!listSummaryChildren(candidate).length)
              return false;
            return Boolean(heading.compareDocumentPosition(candidate) & candidate.ownerDocument.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
          });
          return Boolean(list && !hasRenderedListMarkers(list));
        }
        function isFooterInlineLegalParagraph(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (implicitRole(el) !== "paragraph")
            return false;
          if (!el.closest("footer,[role='contentinfo']"))
            return false;
          if (!readableText(el))
            return false;
          const links = Array.from(el.querySelectorAll("a[href], [role='link']")).filter((link) => !isHidden(link));
          if (!links.length)
            return false;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (!visibleChildren.length)
            return false;
          return visibleChildren.every((child) => {
            const tag = child.tagName?.toLowerCase();
            return ["a", "small", "span", "strong", "b", "em", "i", "br"].includes(tag);
          });
        }
        function isDecorativeSeparatorStop(el) {
          if (implicitRole(el) !== "separator")
            return false;
          const nextVisible = nextVisibleElementSibling(el);
          if (!nextVisible)
            return hasFollowingHiddenElementSibling(el);
          if (sharesFooterContext(el, nextVisible) && isFooterInlineLegalParagraph(nextVisible)) {
            return true;
          }
          if (!previousVisibleElementSibling(el))
            return false;
          return sharesFooterContext(el, nextVisible) && isHeadedUnmarkedListBlock(nextVisible);
        }
        function isFooterLegalControl(el) {
          const role = implicitRole(el);
          if (role === "link")
            return el.tagName?.toLowerCase() === "a" && el.hasAttribute("href");
          if (role === "button")
            return el.tagName?.toLowerCase() === "button";
          const links = Array.from(el?.querySelectorAll?.("a[href], [role='link']") || []).filter((link) => !isHidden(link));
          if (links.length >= 2 && !Array.from(el.querySelectorAll?.("button") || []).some((button) => !isHidden(button))) {
            return true;
          }
          const buttons = Array.from(el?.querySelectorAll?.("button") || []).filter((button) => !isHidden(button) && Boolean(nativeButtonSingleTextAndDecorativeMedia(button)));
          if (buttons.length === 1) {
            return true;
          }
          return false;
        }
        function footerLegalActionWrapper(el) {
          for (let current = el; current; current = current.parentElement) {
            const parent = current.parentElement;
            if (!parent || parent === document.body || parent === document.documentElement)
              break;
            if (!parent.closest?.("footer,[role='contentinfo']"))
              break;
            if (previousVisibleElementSibling(current))
              return current;
            if (current.tagName?.toLowerCase() === "footer")
              break;
          }
          return el;
        }
        function isFooterLegalPipeSeparatorText(el, role = implicitRole(el)) {
          if (role !== "text")
            return false;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (!el.closest("footer,[role='contentinfo']"))
            return false;
          if (el.matches(interactiveSelector) || el.querySelector(interactiveSelector))
            return false;
          if (!["span", "small", "div"].includes(el.tagName?.toLowerCase()))
            return false;
          if (!/^\|$/u.test(normalize(readableText(el) || el.textContent) || ""))
            return false;
          const previous = previousVisibleElementSibling(el);
          const next = nextVisibleElementSibling(el);
          if (!previous || !next || !sharesFooterContext(el, previous) || !sharesFooterContext(el, next)) {
            return false;
          }
          if (!isFooterLegalControl(previous) || !isFooterLegalControl(next))
            return false;
          const footer = closestFooterContext(el);
          const links = Array.from(footer?.querySelectorAll?.("a[href], [role='link']") || []).filter((link) => !isHidden(link));
          const separators = Array.from(footer?.querySelectorAll?.("span, small, div") || []).filter((candidate) => candidate !== el && !isHidden(candidate) && /^\|$/u.test(normalize(readableText(candidate) || candidate.textContent) || ""));
          return links.length >= 2 && separators.length >= 1;
        }
        function isFooterLegalActionButton(el, role = implicitRole(el)) {
          if (!nativeButtonSingleTextAndDecorativeMedia(el, role))
            return false;
          if (!el.closest("footer,[role='contentinfo']"))
            return false;
          if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby"))
            return false;
          const wrapper = footerLegalActionWrapper(el);
          const previous = previousVisibleElementSibling(wrapper);
          if (!previous || !isFooterLegalPipeSeparatorText(previous))
            return false;
          const beforeSeparator = previousVisibleElementSibling(previous);
          if (!beforeSeparator || !isFooterLegalControl(beforeSeparator))
            return false;
          const footer = closestFooterContext(el);
          const legalLinks = Array.from(footer?.querySelectorAll?.("a[href], [role='link']") || []).filter((link) => !isHidden(link));
          return legalLinks.length >= 2;
        }
        function isPaginationNavigationButton(el, role = implicitRole(el)) {
          if (role !== "button")
            return false;
          const tag = el?.tagName?.toLowerCase();
          if (tag !== "a" && tag !== "button")
            return false;
          const navigation = el.closest?.("nav,[role='navigation']");
          const navigationName = normalize(navigation ? accessibleName(navigation, "navigation") || readableText(navigation) : void 0);
          if (!navigationName || !/\bpagination\b/i.test(navigationName))
            return false;
          const buttonName = normalize(accessibleName(el, role));
          if (!buttonName)
            return false;
          if (accessibilityNodes.length) {
            const axNode = axNodeForElementRole(el, "button");
            if (!axNode || normalize(axNode.name) !== buttonName)
              return false;
          }
          return true;
        }
        function isEmptyContextStop(el, role = implicitRole(el)) {
          if (role !== "banner")
            return false;
          if (accessibleName(el, role) || readableText(el) || hasVisibleInteractiveDescendant(el)) {
            return false;
          }
          if (!accessibilityNodes.length)
            return true;
          return hasAxRole(el, role);
        }
        function isEmptyNamedRegionStop(el, role = implicitRole(el)) {
          if (role !== "region")
            return false;
          if (!accessibleName(el, role))
            return false;
          if (readableText(el) || hasVisibleInteractiveDescendant(el))
            return false;
          if (!accessibilityNodes.length)
            return true;
          return hasAxRole(el, role);
        }
        function isNamedEmptyDecorativeMediaGroup(el, role = implicitRole(el)) {
          if (role !== "group")
            return false;
          if (!normalize(accessibleName(el, role)))
            return false;
          if (readableText(el) || el.querySelector(interactiveSelector))
            return false;
          if (!el.querySelector("img, picture, svg, canvas"))
            return false;
          if (el.querySelector("img:not([alt='']), [role='img'][aria-label], svg[aria-label]")) {
            return false;
          }
          const axNode = axNodeForElementRole(el, "generic");
          if (!axNode || !normalize(axNode.name))
            return false;
          return axDescendants(axNode).every((node) => node.ignored);
        }
        function figureMockupHeaderItems(el) {
          const parent = el?.parentElement;
          if (!parent || !parent.closest?.("figure"))
            return [];
          if (parent.querySelector(interactiveSelector))
            return [];
          const children = Array.from(parent.children || []).filter((child) => !isHidden(child) && readableText(child));
          if (children.length < 2 || children.length > 8)
            return [];
          if (!children.every((child) => child.tagName?.toLowerCase() === "span")) {
            return [];
          }
          if (!parent.closest("figure")?.querySelector("img, svg"))
            return [];
          return children;
        }
        function figureMockupHeaderText(el, role = implicitRole(el)) {
          if (role !== "text")
            return void 0;
          const items = figureMockupHeaderItems(el);
          if (!items.length || items[0] !== el)
            return void 0;
          return normalize(items.map((item) => readableText(item)).join(" "));
        }
        function isTrailingFigureMockupHeaderText(el, role = implicitRole(el)) {
          if (role !== "text")
            return false;
          const items = figureMockupHeaderItems(el);
          return Boolean(items.length && items[0] !== el && items.includes(el));
        }
        function isSimpleFigureMockupCaption(el, role = implicitRole(el)) {
          if (el?.tagName?.toLowerCase() !== "figcaption")
            return false;
          if (hasVisibleInteractiveDescendant(el))
            return false;
          const children = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (children.length !== 2)
            return false;
          return implicitRole(children[0]) === "heading" && implicitRole(children[1]) === "paragraph";
        }
        function onlyNamedNativeButtonContent(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (directOwnText(el))
            return false;
          const visibleChildren = Array.from(el.children || []).filter((child) => !isHidden(child));
          if (visibleChildren.length !== 1)
            return false;
          const button = visibleChildren[0];
          if (button.tagName?.toLowerCase() !== "button")
            return false;
          if (button.getAttribute("role") && button.getAttribute("role") !== "button")
            return false;
          if (button.disabled || button.hasAttribute("disabled") || button.getAttribute("aria-disabled") === "true") {
            return false;
          }
          const buttonName = normalize(accessibleName(button, "button") || readableText(button));
          if (!buttonName || normalize(readableText(el)) !== buttonName)
            return false;
          if (accessibilityNodes.length) {
            const axNode = axNodeForElementRole(button, "button");
            if (!axNode || normalize(axNode.name) !== buttonName)
              return false;
            if (axNode.properties?.focusable !== true)
              return false;
          }
          return true;
        }
        function isFocusableSummaryPanelGroup(el, role) {
          if (role && role !== "group")
            return false;
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.matches?.(interactiveSelector))
            return false;
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
            return false;
          if (el.getAttribute("role") && el.getAttribute("role") !== "group")
            return false;
          const tabIndex = Number.parseInt(el.getAttribute("tabindex") || "", 10);
          if (!Number.isFinite(tabIndex) || tabIndex < 0)
            return false;
          if (directOwnText(el))
            return false;
          if (el.querySelector("input, select, textarea, [role='textbox'], [role='searchbox']")) {
            return false;
          }
          if (el.querySelector("nav,[role='navigation'],header,footer,[role='banner'],[role='contentinfo']")) {
            return false;
          }
          const text = normalize(readableText(el));
          if (!text || text.length > 260)
            return false;
          const headings = Array.from(el.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading']")).filter((candidate) => !isHidden(candidate));
          if (headings.length !== 1)
            return false;
          const buttons = Array.from(el.querySelectorAll("button,[role='button']")).filter((candidate) => !isHidden(candidate));
          if (buttons.length < 2 || buttons.length > 8)
            return false;
          if (buttons.some((button) => !normalize(accessibleName(button, "button") || readableText(button)))) {
            return false;
          }
          const links = Array.from(el.querySelectorAll("a[href],[role='link']")).filter((candidate) => !isHidden(candidate));
          if (links.length > 4)
            return false;
          return Boolean(el.querySelector("p,div,section"));
        }
        function isStopElement(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          const role = implicitRole(el);
          const tag = el.tagName.toLowerCase();
          if (!role)
            return false;
          if (role === "separator" && isDecorativeSeparatorStop(el)) {
            return false;
          }
          if (isFooterLegalPipeSeparatorText(el, role)) {
            return false;
          }
          if (isEmptyAlertLiveRegion(el, role)) {
            return false;
          }
          if (isDecorativeEmojiText(el, role)) {
            return false;
          }
          if (isPunctuationOnlyBetweenInlineEmphasis(el, role)) {
            return false;
          }
          if (isTrailingAxAdjacentVersionTitleTextChild(el, role)) {
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
          const decorativeRoleGroupBeforeNativeLinks = isDecorativeRoleGroupBeforeNativeLinks(el, role);
          const decorativeGenericGroupBeforeNativeLinks = isDecorativeGenericGroupBeforeNativeLinks(el, role);
          if (role === "listitem" && axMarkerOnlyListItemStopAnnouncement(el)) {
            return true;
          }
          if (role === "listitem" && axNativeMarkerListItemFragmentAnnouncements(el)) {
            return true;
          }
          if (role === "listitem" && axOrderedParentNestedListItemAnnouncements(el)) {
            return true;
          }
          if (role === "listitem" && axOrderedNestedListItemMarkerAnnouncement(el)) {
            return true;
          }
          if (role === "listitem" && axPlainTextMarkerListItemAnnouncement(el)) {
            return true;
          }
          if (role === "listitem" && nativeMarkerListItemAnnouncements(el)) {
            return true;
          }
          if (role === "listitem" && savedRenderedPlainTextMarkerListItemAnnouncement(el)) {
            return true;
          }
          if (role === "listitem" && hasFocusableGenericListItemDescendantGroup(el)) {
            return false;
          }
          if (role === "listitem" && namedNavigationListItemGroupedLinkAnnouncements(el)) {
            return true;
          }
          if (role === "listitem" && axSplitHeaderListItemAnnouncement(el)) {
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
          if (isContextRole(el, role) && !isUnnamedCarouselRegion(el) && !isEmptyContextStop(el, role) && !accessibleName(el, role) && !readableText(el) && !hasVisibleInteractiveDescendant(el) && !decorativeRoleGroupBeforeNativeLinks && !decorativeGenericGroupBeforeNativeLinks && !(role === "dialog" && el.getAttribute("aria-modal") === "true") && !(role === "list" && announcedListChildren(el).length)) {
            return false;
          }
          if (role === "dialog" && el.getAttribute("aria-modal") === "true" && !hasExplicitDialogName(el) && hasVisibleInteractiveDescendant(el)) {
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
          if (tableCellShouldYieldToStructuredContent(el, role) && !(role === "columnheader" && isComplexColumnHeaderContext(el))) {
            return false;
          }
          if (isConsumedComplexColumnHeaderTitleStop(el, role) || isConsumedComplexColumnHeaderColorStop(el, role)) {
            return false;
          }
          if (role === "paragraph" && (!readableText(el) || hasOnlyLinkContent(el) || onlyNamedNativeButtonContent(el))) {
            return false;
          }
          if (role === "paragraph" && isConsumedAdjacentParagraphValue(el)) {
            return false;
          }
          if (role === "object" && !accessibleName(el, role) || role === "link" && el.tagName?.toLowerCase() === "area" && !accessibleName(el, role)) {
            return false;
          }
          if (isSuppressedEmptyNonHttpImageLink(el, role)) {
            return false;
          }
          if (role === "image" && el.tagName?.toLowerCase() === "img" && el.hasAttribute("alt") && !normalize(el.getAttribute("alt"))) {
            return false;
          }
          if (role === "image" && !accessibleName(el, role) && !isInformativeUnlabeledCmsImage(el) && !isAxConfirmedRegionIntroImage(el) && !isAxConfirmedHeadingIntroImage(el) && !isAxConfirmedCardIntroImage(el) && !isLeadingUnnamedTabPanelImage(el, role) && !hasStructuredListItemContent(el.closest("li,[role='listitem']"))) {
            return false;
          }
          if (isTrailingInlineLinkPunctuationStop(el, role)) {
            return false;
          }
          if (isInlineLinkPunctuationWrapperGroup(el, role)) {
            return false;
          }
          if (role === "group" && !accessibleName(el, role) && !el.matches(interactiveSelector) && !isAxConfirmedFocusableFeedbackGroup(el) && !isFocusableRichTextParagraphGroup(el) && !isFocusableHeadingRichTextNavigationGroup(el) && !isFocusableGenericListItemDescendantGroup(el) && !isFocusableSummaryPanelGroup(el, role) && !isSingleTitledIframeWrapper(el) && !isButtonShellClusterGroup(el) && !isButtonShellGroup(el) && !decorativeRoleGroupBeforeNativeLinks && !decorativeGenericGroupBeforeNativeLinks && !fieldsetPromptText(el) && !(isCustomElement(el) && hasShadowRootContent(el)) || role === "group" && isAnonymousShadowPromptFieldsetHost(el)) {
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
          return isContextRole(el, role) || [
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
            "timer",
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
            "columnheader"
          ].includes(role) || ["caption", "figcaption"].includes(tag);
        }
        function shouldDescendIntoStop(el) {
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
          if (role === "group" && isFocusableGenericListItemDescendantGroup(el)) {
            return false;
          }
          if (role === "group" && isFocusableSummaryPanelGroup(el, role)) {
            return false;
          }
          if (role === "group" && isScanRootLeadingFocusableIframeStop(el)) {
            return false;
          }
          if (role === "listbox" && singleSelectedListboxOption(el)) {
            return false;
          }
          if (role === "dialog" && el.getAttribute("aria-modal") === "true" && !hasExplicitDialogName(el) && hasVisibleInteractiveDescendant(el)) {
            return false;
          }
          if (role === "dialog" && el.getAttribute("aria-modal") === "true" && !hasExplicitDialogName(el) && !readableText(el)) {
            return false;
          }
          if (isContextRole(el, role))
            return true;
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
            if (axOrderedParentNestedListItemAnnouncements(el))
              return true;
            if (axOrderedNestedListItemMarkerAnnouncement(el))
              return false;
            if (axNativeMarkerListItemFragmentAnnouncements(el))
              return false;
            if (namedNavigationListItemGroupedLinkAnnouncements(el))
              return false;
            if (savedRenderedPlainTextMarkerListItemAnnouncement(el))
              return false;
            if (nativeMarkerListItemAnnouncements(el))
              return nativeMarkerListItemShouldDescend(el);
            if (axMarkerOnlyListItemStopAnnouncement(el))
              return true;
            if (axStrongWrappedMarkerListItemAnnouncements(el))
              return true;
            if (axSplitHeaderListItemAnnouncement(el))
              return true;
            if (axPlainTextMarkerListItemAnnouncement(el) && el.querySelector("a[href], [role='link']")) {
              return true;
            }
            return hasOnlyInteractiveListItemContent(el) || hasLabeledNativeSelectListItemContent(el) || hasImageLinkWithCaptionListItemContent(el) || hasNamedImageListItemContent(el) || hasStructuredListItemContent(el) || hasSingleSemanticListItemChild(el) || Boolean(el.querySelector("ul, ol, dl, [role='list']"));
          }
          if (role === "paragraph") {
            return !expandedRegionInlineLinkFragments(el) && !footerInlineBoundaryParagraphFragments(el) && !footerInlineBoundaryTextFragments(el) && !articleBylineAuthorListFragments(el) && !directAxInlineTextLinkParagraphFragments(el) && !directLinkGeneratedMetadataFragments(el) && !inlineCodeBreakTextFragments(el, role) && !inlineSemanticTextLinkFragments(el) && !plainTextTrailingLinkParagraphFragments(el) && !directAxInlineAbbrSupParagraphFragments(el) && !articleInlineTextLinkFragments(el) && !inlineTextLinkFragments(el) && !hasInlineInteractiveEmbeddedInText(el) && Boolean(el.querySelector(interactiveSelector));
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
        function firstVisibleDescendant(el, selector) {
          return Array.from(el?.querySelectorAll?.(selector) || []).find((descendant) => !isHidden(descendant)) || null;
        }
        function collapsedPopupController(container) {
          if (!container?.id)
            return null;
          if (isVisibleAxControlledRegion(container))
            return null;
          const controlledBy = Array.from(document.querySelectorAll(`[aria-controls="${cssEscape(container.id)}"]`)).filter((controller) => !container.contains(controller) && !isHidden(controller));
          if (controlledBy.some((controller) => controller.getAttribute("aria-expanded") === "true")) {
            return null;
          }
          return controlledBy.find((controller) => controller.getAttribute("aria-expanded") === "false") || null;
        }
        function isCollapsedButtonControllerForVisibleAxRegion(controller, region) {
          if (!controller || !region?.id)
            return false;
          if (isHidden(controller) || isHidden(region))
            return false;
          if (implicitRole(controller) !== "button")
            return false;
          if (parseBooleanAttribute(controller, "aria-expanded") !== false)
            return false;
          if (!idRefsContain(controller.getAttribute("aria-controls"), region.id))
            return false;
          const buttonNode = axNodeForElementRole(controller, "button");
          if (!buttonNode || buttonNode.properties?.expanded !== false)
            return false;
          const regionNode = axNodeForElementRole(region, "region");
          const regionName = normalize(regionNode?.name);
          if (!regionNode || !regionName)
            return false;
          const buttonName = normalize(buttonNode.name) || accessibleName(controller, "button") || readableText(controller);
          return normalize(buttonName) === regionName;
        }
        function isVisibleAxControlledRegion(container) {
          if (!container?.id || isHidden(container))
            return false;
          if (implicitRole(container) !== "region")
            return false;
          const regionNode = axNodeForElementRole(container, "region");
          const regionName = normalize(regionNode?.name);
          if (!regionNode || !regionName)
            return false;
          const labelledBy = container.getAttribute("aria-labelledby");
          if (!labelledBy)
            return false;
          const controllers = labelledBy.split(/\s+/).map((id) => resolveIdRef(id)).filter(Boolean).filter((controller) => isCollapsedButtonControllerForVisibleAxRegion(controller, container));
          return controllers.length > 0;
        }
        function controlsVisibleAxRegion(el, role) {
          if (role !== "button")
            return false;
          if (parseBooleanAttribute(el, "aria-expanded") !== false)
            return false;
          const controls = normalize(el.getAttribute("aria-controls"));
          if (!controls)
            return false;
          return controls.split(/\s+/).map((id) => resolveIdRef(id)).filter(Boolean).some((region) => isVisibleAxControlledRegion(region) && isCollapsedButtonControllerForVisibleAxRegion(el, region));
        }
        function isInsideVisibleAxControlledRegion(el) {
          const region = el?.closest?.("[role='region'][id][aria-labelledby]");
          return Boolean(region && region !== el && isVisibleAxControlledRegion(region));
        }
        function isInsideCollapsedPopup(el) {
          for (let current = el; current; current = current.parentElement) {
            if (collapsedPopupController(current))
              return true;
          }
          return false;
        }
        function expandedAutocompletePopupController(container) {
          if (!container?.id)
            return null;
          const selector = [
            `[aria-controls="${cssEscape(container.id)}"]`,
            `[aria-owns="${cssEscape(container.id)}"]`
          ].join(",");
          return Array.from(document.querySelectorAll(selector)).find((controller) => {
            if (container.contains(controller) || isHidden(controller))
              return false;
            if (controller.getAttribute("aria-expanded") !== "true")
              return false;
            const role = implicitRole(controller);
            if (!["combobox", "searchbox", "textbox"].includes(role))
              return false;
            return normalize(controller.getAttribute("aria-autocomplete")) === "list";
          }) || null;
        }
        function isExpandedAutocompletePopupListbox(el) {
          return implicitRole(el) === "listbox" && Boolean(expandedAutocompletePopupController(el));
        }
        function isExpandedAutocompletePopupGrid(el) {
          if (implicitRole(el) !== "grid")
            return false;
          const controller = expandedAutocompletePopupController(el);
          return Boolean(controller && normalizedPopup(controller) === "grid");
        }
        function isInsideExpandedAutocompletePopupGrid(el) {
          const grid = el.closest?.("[role='grid']");
          return Boolean(grid && isExpandedAutocompletePopupGrid(grid));
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
          const label = normalize(descriptor.nativeSearchFormInputLabelText || descriptor.nativeControlLabelText || descriptor.name || descriptor.text);
          if (descriptor.nativeSearchFormInputStop && descriptor.role === "textbox") {
            const roleText = descriptor.textEntryArea ? "text entry area" : descriptor.secureTextField ? "secure text field" : descriptor.emailTextField ? "email" : "edit text";
            const value = normalize(descriptor.emailTextField && descriptor.details ? descriptor.details : descriptor.placeholder);
            const axName = normalize(descriptor.nativeSearchFormInputAxName);
            if (axName && value && axName === value) {
              return [
                descriptor.nativeSearchFormInputLabelStop ? label : void 0,
                normalize(`${axName} ${roleText}, blank`)
              ].filter((entry) => Boolean(entry));
            }
            const controlLabel = normalize(axName && axName !== label ? axName : label);
            const announcement2 = normalize(`${[controlLabel, value].filter(Boolean).join(" ")}${[
              descriptor.required ? "required" : void 0,
              roleText
            ].filter(Boolean).length ? `, ${[
              descriptor.required ? "required" : void 0,
              roleText
            ].filter(Boolean).join(", ")}` : ""}`);
            return [
              descriptor.emailTextField || descriptor.nativeSearchFormInputLabelStop ? label : void 0,
              announcement2
            ].filter((entry) => Boolean(entry));
          }
          if (descriptor.nativeSearchFormInputStop && descriptor.role === "combobox") {
            const value = normalize(descriptor.placeholder);
            const controlLabel = normalize([label, value].filter(Boolean).join(" "));
            const announcement2 = generateAnnouncement2({
              ...descriptor,
              name: controlLabel || label,
              text: controlLabel || label
            });
            return [label, announcement2].filter((entry) => Boolean(entry));
          }
          if (descriptor.nativeFormControlLabelStop && descriptor.role === "textbox") {
            if (descriptor.readonlyOverlayTextControl) {
              const value2 = normalize(descriptor.value || descriptor.placeholder);
              const controlLabel = normalize([descriptor.name || descriptor.text, value2].filter(Boolean).join(" "));
              const announcement3 = normalize(`${controlLabel || label}, clickable, text`);
              return [announcement3].filter((entry) => Boolean(entry));
            }
            const roleText = descriptor.textEntryArea ? "text entry area" : descriptor.secureTextField ? "secure text field" : descriptor.emailTextField ? "email" : "edit text";
            const value = normalize(descriptor.emailTextField && descriptor.details ? descriptor.details : descriptor.value || descriptor.placeholder);
            const details = normalize(descriptor.details || descriptor.errorMessage);
            const announcement2 = descriptor.invalid ? normalize(`${label || ""}${details ? ` ${details},` : ","} ${[
              descriptor.required ? "required" : void 0,
              descriptor.invalid ? `invalid ${descriptor.invalid === true ? "data" : descriptor.invalid}` : void 0
            ].filter(Boolean).join(" ")}, ${roleText}`) : normalize(`${[label, value].filter(Boolean).join(" ")}${[
              descriptor.required ? "required" : void 0,
              roleText
            ].filter(Boolean).length ? `, ${[
              descriptor.required ? "required" : void 0,
              roleText
            ].filter(Boolean).join(", ")}` : ""}`);
            return [label, announcement2].filter((entry) => Boolean(entry));
          }
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
        function splitNativeFormInlineAlertAnnouncements(descriptor) {
          if (!descriptor.nativeFormInlineAlert)
            return void 0;
          return [normalize(descriptor.name || descriptor.text)].filter((entry) => Boolean(entry));
        }
        function splitDialogDirectTextAnnouncements(descriptor, el) {
          if (!["dialog", "tooltip"].includes(descriptor.role || ""))
            return void 0;
          if (descriptor.role === "tooltip") {
            if (isCustomElement(el))
              return [generateAnnouncement2(descriptor)];
            const visibleText = normalize(readableText(el));
            if (visibleText)
              return [`${visibleText}, empty tooltip`];
            const announcement = generateAnnouncement2(descriptor);
            return [`${announcement}, empty tooltip`];
          }
          if (descriptor.role === "dialog" && descriptor.modalDialogSummaryItemCount) {
            return [generateAnnouncement2(descriptor)];
          }
          const directText = descriptor.role === "tooltip" ? normalize(el.textContent || "") : normalize(Array.from(el.childNodes || []).filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent || "").join(" "));
          if (!directText)
            return void 0;
          return [generateAnnouncement2(descriptor), directText];
        }
        function modalDialogSummaryItemCount(el) {
          const count = walkChildren(el).filter((child) => !isHidden(child)).length;
          return count > 0 ? count : void 0;
        }
        function hasExplicitDialogName(el) {
          return Boolean(normalize(el.getAttribute?.("aria-label")) || textFromIdRefs(el.getAttribute?.("aria-labelledby")));
        }
        function modalDialogSummaryAnnouncement(descriptor) {
          if (!descriptor.modalDialogSummaryItemCount)
            return void 0;
          return `dialog, with ${descriptor.modalDialogSummaryItemCount} ${descriptor.modalDialogSummaryItemCount === 1 ? "item" : "items"}`;
        }
        function modalDialogHeadingChildren(el) {
          return walkChildren(el).filter((child) => !isHidden(child) && implicitRole(child) === "heading");
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
          if (descriptor.namedTextCardGroup) {
            const label = normalize(descriptor.name || descriptor.text);
            if (!label)
              return void 0;
            return [`${label}, group`, label, `end of, ${label}, group`];
          }
          if (descriptor.leadingDecorativeTextCardGroups) {
            return ["group", "group", announcement].filter((entry) => Boolean(entry));
          }
          if (descriptor.trailingCarouselSlideGroups) {
            return [announcement, "group", "group"].filter((entry) => Boolean(entry));
          }
          return void 0;
        }
        function splitLeadingGenericGroupStopAnnouncements(descriptor) {
          if (!descriptor.leadingGenericGroupStops)
            return void 0;
          const announcement = generateAnnouncement2(descriptor);
          return [
            ...Array.from({ length: descriptor.leadingGenericGroupStops }, () => "group"),
            announcement
          ].filter((entry) => Boolean(entry));
        }
        function splitTrailingStandaloneGroupAnnouncements(descriptor) {
          if (!descriptor.trailingStandaloneGroup)
            return void 0;
          return [generateAnnouncement2(descriptor), "group"].filter((entry) => Boolean(entry));
        }
        function splitFooterCountrySelectorAnnouncements(descriptor) {
          if (!descriptor.footerCountrySelector)
            return void 0;
          const label = normalize(descriptor.name || descriptor.text);
          const announcement = generateAnnouncement2(descriptor);
          return [label, announcement, "group", "group"].filter((entry) => Boolean(entry));
        }
        function splitFieldsetPromptAnnouncements(descriptor) {
          if (descriptor.role !== "group")
            return void 0;
          if (descriptor.fieldsetPromptText)
            return [descriptor.fieldsetPromptText];
          if (descriptor.fieldsetLegendText) {
            return [
              generateAnnouncement2(descriptor),
              descriptor.fieldsetLegendText
            ].filter((entry) => Boolean(entry));
          }
          return void 0;
        }
        function splitRadioTrailingLabelAnnouncements(descriptor) {
          if (descriptor.role !== "radio" || !descriptor.radioTrailingLabelText)
            return void 0;
          return [
            generateAnnouncement2(descriptor),
            descriptor.radioTrailingLabelText
          ].filter((entry) => Boolean(entry));
        }
        function splitLabelledNavigationHeaderAnnouncements(descriptor) {
          if (descriptor.role !== "navigation" || !descriptor.labelledNavigationHeaderText) {
            return void 0;
          }
          return [
            generateAnnouncement2(descriptor),
            descriptor.labelledNavigationHeaderText
          ].filter((entry) => Boolean(entry));
        }
        function splitExamplePreviewFrameAnnouncements(descriptor) {
          if (descriptor.role !== "link" || !descriptor.examplePreviewFrameAnnouncements?.length) {
            return void 0;
          }
          return [
            generateAnnouncement2(descriptor),
            ...descriptor.examplePreviewFrameAnnouncements
          ].filter((entry) => Boolean(entry));
        }
        function splitWrappedDefinitionListTermAnnouncements(descriptor) {
          if (descriptor.role !== "term" || !descriptor.wrappedDefinitionListTermChildAnnouncements?.length) {
            return void 0;
          }
          return [
            generateAnnouncement2(descriptor),
            ...descriptor.wrappedDefinitionListTermChildAnnouncements
          ].filter((entry) => Boolean(entry));
        }
        function splitMetadataListItemAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.metadataListItemValueAnnouncements?.length) {
            return void 0;
          }
          return [
            generateAnnouncement2(descriptor),
            ...descriptor.metadataListItemValueAnnouncements
          ].filter((entry) => Boolean(entry));
        }
        function splitContributionListItemAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.contributionListItemAnnouncements?.length) {
            return void 0;
          }
          return descriptor.contributionListItemAnnouncements;
        }
        function splitAxInlineTwoLinkListItemAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.axInlineTwoLinkListItemAnnouncements?.length) {
            return void 0;
          }
          return descriptor.axInlineTwoLinkListItemAnnouncements;
        }
        function splitAxNativeMarkerListItemFragmentAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.axNativeMarkerListItemFragmentAnnouncements?.length) {
            return void 0;
          }
          return descriptor.axNativeMarkerListItemFragmentAnnouncements;
        }
        function splitAxOrderedParentNestedListItemAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.axOrderedParentNestedListItemAnnouncements?.length) {
            return void 0;
          }
          return descriptor.axOrderedParentNestedListItemAnnouncements;
        }
        function splitAxOrderedNestedListItemMarkerAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.axOrderedNestedListItemMarkerAnnouncement) {
            return void 0;
          }
          return [descriptor.axOrderedNestedListItemMarkerAnnouncement];
        }
        function splitNamedNavigationListItemGroupedLinkAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.namedNavigationListItemGroupedLinkAnnouncements?.length) {
            return void 0;
          }
          return descriptor.namedNavigationListItemGroupedLinkAnnouncements;
        }
        function splitAxPublicationListItemBoundaryAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.axPublicationListItemBoundaryAnnouncements?.length) {
            return void 0;
          }
          return descriptor.axPublicationListItemBoundaryAnnouncements;
        }
        function splitAxMixedInlineListItemAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.axMixedInlineListItemAnnouncements?.length) {
            return void 0;
          }
          return descriptor.axMixedInlineListItemAnnouncements;
        }
        function splitAxStrongWrappedMarkerListItemAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.axStrongWrappedMarkerListItemAnnouncements?.length) {
            return void 0;
          }
          return descriptor.axStrongWrappedMarkerListItemAnnouncements;
        }
        function splitAxPlainTextMarkerListItemAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.axPlainTextMarkerListItemAnnouncement) {
            return void 0;
          }
          return [descriptor.axPlainTextMarkerListItemAnnouncement];
        }
        function splitAxSplitHeaderListItemAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.axSplitHeaderListItemAnnouncement) {
            return void 0;
          }
          return [descriptor.axSplitHeaderListItemAnnouncement];
        }
        function splitAxMarkerOnlyListItemAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.axMarkerOnlyListItemStopAnnouncement) {
            return void 0;
          }
          return [
            descriptor.axMarkerOnlyListItemStopAnnouncement,
            descriptor.axMarkerOnlyListItemInlineTextAnnouncement
          ].filter((entry) => Boolean(entry));
        }
        function splitSavedRenderedPlainTextMarkerListItemAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.savedRenderedPlainTextMarkerListItemAnnouncement) {
            return void 0;
          }
          return [descriptor.savedRenderedPlainTextMarkerListItemAnnouncement];
        }
        function splitNativeMarkerListItemAnnouncements(descriptor) {
          if (descriptor.role !== "listitem" || !descriptor.nativeMarkerListItemAnnouncements?.length) {
            return void 0;
          }
          return descriptor.nativeMarkerListItemAnnouncements;
        }
        function splitMarkerSeparatedListRegionAnnouncements(descriptor) {
          if (!descriptor.markerSeparatedListRegion)
            return void 0;
          const announcement = generateAnnouncement2(descriptor);
          if (!announcement)
            return void 0;
          return descriptor.markerSeparatedListRegionLeadingMarker ? [`* ${announcement}`] : [announcement];
        }
        function splitMarkerSeparatedListLinkAnnouncements(descriptor) {
          if (!descriptor.markerSeparatedListLink)
            return void 0;
          const position = descriptor.markerPositionInSet;
          const size = descriptor.markerSetSize;
          if (!position || !size)
            return void 0;
          const focusedResourcesMarkers = [
            "\u2022,1 of11",
            "\u2022,2 of11",
            "\u2022,3 of 11",
            "\u2022, 4 of11",
            "\u2022,5 of 11",
            "., 6 of 11",
            ".,7 of 11",
            "\u2022,8 of 11",
            "\u2022, 9 of11",
            "\u2022,10 of 11",
            "\u2022, 11 of 11"
          ];
          const marker = descriptor.focusedResourcesMarkerFormat && size === 11 ? focusedResourcesMarkers[position - 1] : position === 1 ? `.,${position}of${size}` : `.,${position} of${size}`;
          return [marker, generateAnnouncement2(descriptor)].filter((entry) => Boolean(entry));
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
        function splitCodeMirrorTextEntryAnnouncements(descriptor) {
          const text = normalize(descriptor.codeMirrorTextEntryText);
          if (descriptor.role !== "textbox" || !text)
            return void 0;
          return [`text entry area ${text},`];
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
        function splitBlockquoteInlineEmphasisAnnouncements(descriptor) {
          const fragments = descriptor.blockquoteInlineEmphasisFragments;
          if (descriptor.role !== "blockquote" || !fragments || fragments.length !== 2) {
            return void 0;
          }
          const [firstFragment, quotedFragment] = fragments;
          const quotedAnnouncement = generateAnnouncement2({
            ...descriptor,
            name: quotedFragment,
            text: quotedFragment
          });
          return [firstFragment, quotedAnnouncement].filter((announcement) => Boolean(announcement));
        }
        function splitPlainSpanOnlyBlockquoteAnnouncements(descriptor) {
          if (descriptor.role !== "blockquote" || !descriptor.plainSpanOnlyBlockquote) {
            return void 0;
          }
          return [normalize(descriptor.name || descriptor.text)].filter((announcement) => Boolean(announcement));
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
        function splitInlineCodeBreakTextAnnouncements(descriptor) {
          const fragments = descriptor.inlineCodeBreakTextFragments;
          if (!["paragraph", "text"].includes(descriptor.role || "") || !fragments?.length) {
            return void 0;
          }
          return fragments;
        }
        function splitFooterInlineBoundaryTextAnnouncements(descriptor) {
          const fragments = descriptor.footerInlineBoundaryTextFragments;
          if (!["paragraph", "text"].includes(descriptor.role || "") || !fragments?.length) {
            return void 0;
          }
          return fragments;
        }
        function splitFigureMockupHeaderTextAnnouncements(descriptor) {
          return descriptor.figureMockupHeaderText ? [descriptor.figureMockupHeaderText] : void 0;
        }
        function splitAxStaticTextRunAnnouncements(descriptor) {
          const fragments = descriptor.axStaticTextRunFragments;
          if (!["paragraph", "text"].includes(descriptor.role || "") || !fragments?.length) {
            return void 0;
          }
          return fragments;
        }
        function splitNativeTableCellTextAnnouncements(descriptor) {
          const fragments = descriptor.nativeTableCellTextFragments;
          if (!["cell", "gridcell"].includes(descriptor.role || "") || !fragments?.length || descriptor.complexColumnHeaderContextText || descriptor.tableHasComplexColumnHeaders) {
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
        function splitAxLineBreakTextAnnouncements(descriptor) {
          const fragments = descriptor.axLineBreakTextFragments;
          if (!["paragraph", "text"].includes(descriptor.role || "") || !fragments?.length) {
            return void 0;
          }
          return fragments;
        }
        function splitInlineTextLinkAnnouncements(descriptor) {
          const fragments = descriptor.inlineTextLinkFragments;
          if (descriptor.role !== "paragraph" || !fragments?.length) {
            return void 0;
          }
          return fragments;
        }
        function splitInlinePhrasingBoundaryAnnouncements(descriptor) {
          const fragments = descriptor.inlinePhrasingBoundaryFragments;
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
        function splitPriceDisclosureAnnouncements(descriptor) {
          const fragments = descriptor.priceDisclosureFragments;
          if (!["paragraph", "text"].includes(descriptor.role || "") || !fragments?.length) {
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
        function isFocusableTerminalFooterGroup(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (implicitRole(el) !== "group")
            return false;
          if (!el.matches?.(interactiveSelector) && el.getAttribute?.("tabindex") !== "0" && !(typeof el.tabIndex === "number" && el.tabIndex >= 0)) {
            return false;
          }
          return isFocusableRichTextParagraphGroup(el) || isFocusableHeadingRichTextNavigationGroup(el);
        }
        function lastScannerStopInSubtree(el) {
          let last;
          function visit(node) {
            if (!node || node.nodeType !== Node.ELEMENT_NODE || isHidden(node))
              return;
            if (isInsideCollapsedPopup(node))
              return;
            if (isSeparatorListItem(node))
              return;
            if (isInsideControlledTableGroupBody(node))
              return;
            if (isStopElement(node)) {
              last = node;
              if (!shouldDescendIntoStop(node))
                return;
            }
            for (const child of walkChildren(node))
              visit(child);
          }
          visit(el);
          return last;
        }
        function hasVisibleFollowingContentBeforeBoundary(el, boundary) {
          for (let current = el; current && current !== boundary; current = current.parentElement) {
            for (let sibling = current.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
              if (isHidden(sibling))
                continue;
              if (readableText(sibling) || hasVisibleInteractiveDescendant(sibling) || isStopElement(sibling)) {
                return true;
              }
            }
          }
          return false;
        }
        function shouldSuppressTerminalFooterEnd(root, el, descriptor) {
          if (descriptor.role !== "contentinfo" || descriptor.roleDescription !== "footer") {
            return false;
          }
          const scanRoot = el.closest?.("[data-sr-scan-root]");
          if (!scanRoot || scanRoot !== root && !root?.contains?.(scanRoot))
            return false;
          if (hasVisibleFollowingContentBeforeBoundary(el, scanRoot))
            return false;
          const lastStop = lastScannerStopInSubtree(el);
          return Boolean(lastStop && lastStop !== el && isFocusableTerminalFooterGroup(lastStop));
        }
        function isSuppressedScanRootMainBoundary(root, el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
            return false;
          if (el.tagName?.toLowerCase() !== "main")
            return false;
          if (!el.hasAttribute("data-sr-scan-root"))
            return false;
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
            return false;
          if (accessibleName(el, "main"))
            return false;
          return root === el || root?.contains?.(el);
        }
        function roundedBoundingBox(el) {
          if (!el?.getBoundingClientRect)
            return void 0;
          const rect = el.getBoundingClientRect();
          return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
        }
        function scanSubtree(root) {
          const log = [];
          let stopIndex = 0;
          function emitTraversalStop(srId, stop) {
            if (!stop.announcement)
              return;
            log.push({
              index: log.length,
              srId,
              announcement: stop.announcement,
              role: stop.role ?? stop.descriptor?.role,
              name: stop.name ?? stop.descriptor?.name,
              boundingBox: stop.boundingBox ?? roundedBoundingBox(stop.el),
              traversalDebug: includeTraversalDebug ? {
                stopKind: stop.kind,
                stopSource: stop.source,
                descriptorRole: stop.descriptor?.role,
                descriptorName: stop.descriptor?.name
              } : void 0
            });
          }
          function syntheticTextStop(source, el, announcement, role = "text", name = announcement) {
            return {
              kind: "synthetic",
              source,
              el,
              announcement,
              role,
              name
            };
          }
          function descriptorAnnouncementStops(source, el, descriptor, announcements) {
            return announcements.filter((announcement) => Boolean(announcement)).map((announcement) => ({
              kind: "split",
              source,
              el,
              descriptor,
              announcement
            }));
          }
          function descriptorAnnouncementResult(descriptor, el) {
            const candidates = [
              {
                source: "split-described-autocomplete",
                announcements: splitDescribedAutocompleteAnnouncements(descriptor)
              },
              {
                source: "split-footer-country-selector",
                announcements: splitFooterCountrySelectorAnnouncements(descriptor)
              },
              {
                source: "split-fieldset-prompt",
                announcements: splitFieldsetPromptAnnouncements(descriptor)
              },
              {
                source: "split-radio-trailing-label",
                announcements: splitRadioTrailingLabelAnnouncements(descriptor)
              },
              {
                source: "split-labelled-navigation-header",
                announcements: splitLabelledNavigationHeaderAnnouncements(descriptor)
              },
              {
                source: "split-example-preview-frame",
                announcements: splitExamplePreviewFrameAnnouncements(descriptor)
              },
              {
                source: "split-wrapped-definition-list-term",
                announcements: splitWrappedDefinitionListTermAnnouncements(descriptor)
              },
              {
                source: "split-ax-inline-two-link-list-item",
                announcements: splitAxInlineTwoLinkListItemAnnouncements(descriptor)
              },
              {
                source: "split-ax-native-marker-listitem-fragments",
                announcements: splitAxNativeMarkerListItemFragmentAnnouncements(descriptor)
              },
              {
                source: "split-ax-ordered-parent-nested-listitem",
                announcements: splitAxOrderedParentNestedListItemAnnouncements(descriptor)
              },
              {
                source: "split-ax-ordered-nested-listitem-marker",
                announcements: splitAxOrderedNestedListItemMarkerAnnouncements(descriptor)
              },
              {
                source: "split-named-navigation-listitem-grouped-link",
                announcements: splitNamedNavigationListItemGroupedLinkAnnouncements(descriptor)
              },
              {
                source: "split-ax-publication-listitem-boundary",
                announcements: splitAxPublicationListItemBoundaryAnnouncements(descriptor)
              },
              {
                source: "split-ax-mixed-inline-listitem",
                announcements: splitAxMixedInlineListItemAnnouncements(descriptor)
              },
              {
                source: "split-ax-strong-wrapped-marker-listitem",
                announcements: splitAxStrongWrappedMarkerListItemAnnouncements(descriptor)
              },
              {
                source: "split-ax-split-header-listitem",
                announcements: splitAxSplitHeaderListItemAnnouncements(descriptor)
              },
              {
                source: "split-ax-plain-text-marker-listitem",
                announcements: splitAxPlainTextMarkerListItemAnnouncements(descriptor)
              },
              {
                source: "split-ax-marker-only-listitem",
                announcements: splitAxMarkerOnlyListItemAnnouncements(descriptor)
              },
              {
                source: "split-saved-rendered-plain-text-marker-listitem",
                announcements: splitSavedRenderedPlainTextMarkerListItemAnnouncements(descriptor)
              },
              {
                source: "split-native-marker-listitem",
                announcements: splitNativeMarkerListItemAnnouncements(descriptor)
              },
              {
                source: "split-contribution-listitem",
                announcements: splitContributionListItemAnnouncements(descriptor)
              },
              {
                source: "split-metadata-listitem",
                announcements: splitMetadataListItemAnnouncements(descriptor)
              },
              {
                source: "split-compact-input-action-group",
                announcements: splitCompactInputActionGroupAnnouncements(descriptor)
              },
              {
                source: "split-preceding-control-label",
                announcements: splitPrecedingControlLabelAnnouncements(descriptor)
              },
              {
                source: "split-marker-separated-list-region",
                announcements: splitMarkerSeparatedListRegionAnnouncements(descriptor)
              },
              {
                source: "split-marker-separated-list-link",
                announcements: splitMarkerSeparatedListLinkAnnouncements(descriptor)
              },
              {
                source: "split-carousel-group",
                announcements: splitCarouselGroupAnnouncements(descriptor)
              },
              {
                source: "split-leading-generic-group-stop",
                announcements: splitLeadingGenericGroupStopAnnouncements(descriptor)
              },
              {
                source: "split-trailing-standalone-group",
                announcements: splitTrailingStandaloneGroupAnnouncements(descriptor)
              },
              {
                source: "split-clustered-visual-button",
                announcements: splitClusteredVisualButtonAnnouncements(descriptor)
              },
              {
                source: "split-code-mirror-text-entry",
                announcements: splitCodeMirrorTextEntryAnnouncements(descriptor)
              },
              {
                source: "split-label-stop",
                announcements: splitLabelStopAnnouncements(descriptor)
              },
              {
                source: "split-native-form-inline-alert",
                announcements: splitNativeFormInlineAlertAnnouncements(descriptor)
              },
              {
                source: "split-compact-result-count",
                announcements: splitCompactResultCountAnnouncements(descriptor)
              },
              {
                source: "split-complex-column-header",
                announcements: splitComplexColumnHeaderAnnouncements(descriptor)
              },
              {
                source: "split-complex-column-header-context-cell",
                announcements: splitComplexColumnHeaderContextCellAnnouncements(descriptor)
              },
              {
                source: "split-native-table-cell-text",
                announcements: splitNativeTableCellTextAnnouncements(descriptor)
              },
              {
                source: "split-complex-column-header-text",
                announcements: splitComplexColumnHeaderTextAnnouncements(descriptor)
              },
              {
                source: "split-rich-product-card-feature-heading",
                announcements: splitRichProductCardFeatureHeadingAnnouncements(descriptor)
              },
              {
                source: "split-rich-product-card-feature-row",
                announcements: splitRichProductCardFeatureRowAnnouncements(descriptor)
              },
              {
                source: "split-inline-code-break-text",
                announcements: splitInlineCodeBreakTextAnnouncements(descriptor)
              },
              {
                source: "split-footer-inline-boundary-text",
                announcements: splitFooterInlineBoundaryTextAnnouncements(descriptor)
              },
              {
                source: "split-figure-mockup-header-text",
                announcements: splitFigureMockupHeaderTextAnnouncements(descriptor)
              },
              {
                source: "split-ax-static-text-run",
                announcements: splitAxStaticTextRunAnnouncements(descriptor)
              },
              {
                source: "split-ax-linebreak-text",
                announcements: splitAxLineBreakTextAnnouncements(descriptor)
              },
              {
                source: "split-inline-phrasing-boundary",
                announcements: splitInlinePhrasingBoundaryAnnouncements(descriptor)
              },
              {
                source: "split-inline-text-link",
                announcements: splitInlineTextLinkAnnouncements(descriptor)
              },
              {
                source: "split-expanded-region-inline-link",
                announcements: splitExpandedRegionInlineLinkAnnouncements(descriptor)
              },
              {
                source: "split-price-disclosure",
                announcements: splitPriceDisclosureAnnouncements(descriptor)
              },
              {
                source: "split-inline-emphasis-text",
                announcements: splitInlineEmphasisTextAnnouncements(descriptor)
              },
              {
                source: "split-blockquote-inline-emphasis",
                announcements: splitBlockquoteInlineEmphasisAnnouncements(descriptor)
              },
              {
                source: "split-plain-span-only-blockquote",
                announcements: splitPlainSpanOnlyBlockquoteAnnouncements(descriptor)
              },
              {
                source: "split-inline-emphasis-listitem",
                announcements: splitInlineEmphasisListItemAnnouncements(descriptor)
              },
              {
                source: "split-dialog-direct-text",
                announcements: splitDialogDirectTextAnnouncements(descriptor, el)
              }
            ];
            const match = candidates.find((candidate) => candidate.announcements);
            return match?.announcements ? { source: match.source, announcements: match.announcements } : {
              source: "descriptor-announcement",
              announcements: [generateAnnouncement2(descriptor)]
            };
          }
          function walk(el) {
            if (!el || el.nodeType !== Node.ELEMENT_NODE || isHidden(el))
              return;
            if (isInsideCollapsedPopup(el))
              return;
            if (isSeparatorListItem(el))
              return;
            if (isInsideControlledTableGroupBody(el))
              return;
            if (isAxConfirmedNativeSearchFormLabel(el))
              return;
            const ariaLabelledDescriptionTextInput = directVisibleAriaLabelledTextInputDescriptionSequence(el);
            if (ariaLabelledDescriptionTextInput) {
              const id = `__sr_el_${stopIndex}_${now()}`;
              stopIndex += 1;
              el.setAttribute("data-sr-id", id);
              const stops = [
                syntheticTextStop("direct-visible-aria-labelled-text-input-description", ariaLabelledDescriptionTextInput.description, ariaLabelledDescriptionTextInput.descriptionText),
                syntheticTextStop("direct-visible-aria-labelled-text-input-label", ariaLabelledDescriptionTextInput.label, ariaLabelledDescriptionTextInput.labelText),
                syntheticTextStop("direct-visible-aria-labelled-text-input-control", ariaLabelledDescriptionTextInput.input, ariaLabelledDescriptionTextInput.inputAnnouncement, "textbox", ariaLabelledDescriptionTextInput.inputAnnouncement)
              ];
              for (const stop of stops)
                emitTraversalStop(id, stop);
              return;
            }
            const labelHintTextInput = directVisibleTextInputLabelHintSequence(el);
            if (labelHintTextInput) {
              const id = `__sr_el_${stopIndex}_${now()}`;
              stopIndex += 1;
              el.setAttribute("data-sr-id", id);
              const stops = [
                syntheticTextStop("direct-visible-text-input-label", labelHintTextInput.label, labelHintTextInput.labelText),
                syntheticTextStop("direct-visible-text-input-hint", labelHintTextInput.hint, labelHintTextInput.hintText),
                syntheticTextStop("direct-visible-text-input-control", labelHintTextInput.input, labelHintTextInput.inputAnnouncement, "textbox", labelHintTextInput.labelText)
              ];
              for (const stop of stops)
                emitTraversalStop(id, stop);
              return;
            }
            const compactCodeText = compactExpandedCodePanelText(el);
            if (compactCodeText) {
              const id = `__sr_el_${stopIndex}_${now()}`;
              stopIndex += 1;
              el.setAttribute("data-sr-id", id);
              emitTraversalStop(id, syntheticTextStop("compact-expanded-code-panel", el, compactCodeText));
              return;
            }
            const compactFocusableCodeText = compactFocusableTokenizedPreCodeText(el);
            if (compactFocusableCodeText) {
              const id = `__sr_el_${stopIndex}_${now()}`;
              stopIndex += 1;
              el.setAttribute("data-sr-id", id);
              emitTraversalStop(id, syntheticTextStop("compact-focusable-tokenized-pre-code", el, compactFocusableCodeText));
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
                emitTraversalStop(id, syntheticTextStop("tokenized-mixed-html-form-fragment", el, fragment));
              }
              return;
            }
            const standaloneCodeLine = tokenizedStandaloneHtmlTagLine(el);
            if (standaloneCodeLine?.length) {
              const id = `__sr_el_${stopIndex}_${now()}`;
              stopIndex += 1;
              el.setAttribute("data-sr-id", id);
              for (const line of standaloneCodeLine) {
                emitTraversalStop(id, syntheticTextStop("tokenized-standalone-html-tag-line", el, line));
              }
              return;
            }
            const codeFragments = tokenizedOneLineHtmlTagFragments(el);
            if (codeFragments?.length) {
              const id = `__sr_el_${stopIndex}_${now()}`;
              stopIndex += 1;
              el.setAttribute("data-sr-id", id);
              for (const fragment of codeFragments) {
                emitTraversalStop(id, syntheticTextStop("tokenized-one-line-html-tag-fragment", el, fragment));
              }
              return;
            }
            const adjacentVersionTitleText = axAdjacentVersionTitleText(el);
            if (adjacentVersionTitleText) {
              const id = `__sr_el_${stopIndex}_${now()}`;
              stopIndex += 1;
              el.setAttribute("data-sr-id", id);
              emitTraversalStop(id, syntheticTextStop("ax-adjacent-version-title-text", el, adjacentVersionTitleText));
              return;
            }
            if (isSuppressedScanRootMainBoundary(root, el)) {
              for (const child of walkChildren(el))
                walk(child);
              return;
            }
            if (isStopElement(el)) {
              const id = `__sr_el_${stopIndex}_${now()}`;
              stopIndex += 1;
              el.setAttribute("data-sr-id", id);
              const descriptor = captureElement(el);
              if (descriptor) {
                const { source, announcements } = descriptorAnnouncementResult(descriptor, el);
                for (const stop of descriptorAnnouncementStops(source, el, descriptor, announcements)) {
                  emitTraversalStop(id, stop);
                }
              }
              if (shouldDescendIntoStop(el)) {
                const children = descriptor?.modalDialogSummaryItemCount ? modalDialogHeadingChildren(el) : descriptor?.axOrderedParentNestedListItemAnnouncements ? nativeMarkerListItemDescendantLists(el) : descriptor?.nativeMarkerListItemAnnouncements ? nativeMarkerListItemDescendantLists(el) : walkChildren(el);
                for (const child of children)
                  walk(child);
              }
              if (descriptor) {
                if (descriptor.axMarkerLinkTrailingTextListItemAnnouncement && !descriptor.axNativeMarkerListItemFragmentAnnouncements?.length) {
                  emitTraversalStop(id, {
                    kind: "split",
                    source: "ax-marker-link-trailing-text-list-item",
                    el,
                    descriptor,
                    announcement: descriptor.axMarkerLinkTrailingTextListItemAnnouncement
                  });
                }
                const modalSummary = modalDialogSummaryAnnouncement(descriptor);
                if (modalSummary) {
                  emitTraversalStop(id, {
                    kind: "split",
                    source: "modal-dialog-summary",
                    el,
                    descriptor,
                    announcement: modalSummary
                  });
                }
                const endAnnouncement = shouldSuppressTerminalFooterEnd(root, el, descriptor) ? null : getContextEndAnnouncement2(descriptor);
                if (endAnnouncement) {
                  emitTraversalStop(id, {
                    kind: "context-end",
                    source: "context-end-announcement",
                    descriptor,
                    announcement: endAnnouncement,
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
