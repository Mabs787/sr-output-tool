import { ElementDescriptor } from "./types";

function normalizeText(value?: string): string | undefined {
  const normalized = value
    ?.replace(/[\u200B-\u200F\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,!?;:]|\.(?![\p{L}\p{N}]))/gu, "$1")
    .trim();
  return normalized || undefined;
}

function normalizeTextPreservingSpaceBeforeColon(value?: string): string | undefined {
  const normalized = value
    ?.replace(/[\u200B-\u200F\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,!?;]|\.(?![\p{L}\p{N}]))/gu, "$1")
    .trim();
  return normalized || undefined;
}

function normalizeTextPreservingSpaceBeforePunctuation(value?: string): string | undefined {
  const normalized = value
    ?.replace(/[\u200B-\u200F\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || undefined;
}

function pushIfPresent(parts: string[], value?: string): void {
  const normalized = normalizeText(value);
  if (normalized) {
    parts.push(normalized);
  }
}

function pushCollectionPosition(parts: string[], el: ElementDescriptor): void {
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

function pushTableCoordinates(parts: string[], el: ElementDescriptor): void {
  if (el.columnIndex) {
    parts.push(`column ${el.columnIndex}`);
  }

  if (el.rowIndex) {
    parts.push(`row ${el.rowIndex}`);
  }
}

function hasTableColumnContext(el: ElementDescriptor): boolean {
  return Boolean(
    el.tableRole === "table" &&
      el.columnIndex &&
      el.columnCount &&
      !(el.role === "link" && el.tableHasComplexColumnHeaders && el.rowIndex === 1) &&
      !["cell", "gridcell", "rowheader", "columnheader"].includes(el.role || ""),
  );
}

function mergeTableColumnHeaderContext(
  parts: string[],
  el: ElementDescriptor,
): void {
  if (!el.columnHeaderText) return;

  if (parts.length > 0) {
    parts[0] = `${el.columnHeaderText} ${parts[0]}`;
  } else {
    parts.unshift(el.columnHeaderText);
  }
}

function tableColumnPosition(el: ElementDescriptor): string | undefined {
  if (!hasTableColumnContext(el)) return undefined;
  return `column ${el.columnIndex} of ${el.columnCount}`;
}

function genericGroupRoleLabel(el?: ElementDescriptor): string {
  const roleDescription = normalizeText(el?.roleDescription)?.toLowerCase();
  if (roleDescription === "empty group") {
    return "empty group";
  }
  return roleDescription === "carousel" ||
    roleDescription === "slideshow" ||
    roleDescription === "slide"
    ? roleDescription
    : "group";
}

function pushTableColumnContext(parts: string[], el: ElementDescriptor): void {
  if (
    !hasTableColumnContext(el)
  ) {
    return;
  }

  if (
    el.columnIndex === 1 &&
    el.rowIndex &&
    el.rowIndex > 1 &&
    el.columnHeaderText &&
    el.name &&
    parts.length > 0
  ) {
    parts[0] = `${el.name} ${el.columnHeaderText} ${parts[0]}`;
  } else {
    mergeTableColumnHeaderContext(parts, el);
  }
  if (el.columnIndex === 1 && el.rowIndex) {
    if (
      el.tableGroupedHeaderRow &&
      !el.tableFirstGroupedHeaderRow &&
      parts.length > 0
    ) {
      parts[0] =
        `row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""} ${parts[0]}`;
      const columnPosition = tableColumnPosition(el);
      if (columnPosition) parts.push(columnPosition);
      return;
    }
    if (
      el.tableFirstGroupedHeaderRow &&
      el.tableGroupHeaderText &&
      parts.length > 0
    ) {
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
  if (columnPosition) parts.push(columnPosition);
}

function formatPopupType(hasPopup?: string | boolean): string | undefined {
  if (!hasPopup) {
    return undefined;
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

function pushInvalidState(parts: string[], invalid?: boolean | string): void {
  if (!invalid || invalid === "false") {
    return;
  }

  if (typeof invalid === "string" && invalid !== "true") {
    parts.push(`invalid ${invalid}`);
    return;
  }

  parts.push("invalid");
}

function pushAutocomplete(parts: string[], autocomplete?: string): void {
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

function pushComboBoxAutocomplete(parts: string[], el: ElementDescriptor): void {
  const autocomplete = normalizeText(el.autocomplete);
  if (autocomplete === "list" && el.expanded !== undefined) {
    const popupState = `list box pop up ${el.expanded ? "expanded" : "collapsed"}`;
    parts.push(el.required ? `required ${popupState}` : popupState);
    return;
  }

  pushAutocomplete(parts, autocomplete);
}

function pushSortState(parts: string[], sort?: string): void {
  const normalized = normalizeText(sort);
  if (!normalized || normalized === "none") {
    return;
  }

  parts.push(`sorted ${normalized}`);
}

function pushSupplementalText(
  parts: string[],
  el: ElementDescriptor,
  options: { skipDetails?: boolean } = {},
): void {
  if (!options.skipDetails) {
    pushIfPresent(parts, el.details);
  }
  pushInvalidState(parts, el.invalid);
  pushIfPresent(parts, el.errorMessage);
  if (el.busy) {
    parts.push("busy");
  }
}

function appendInlineDetails(label: string | undefined, details: string | undefined): string | undefined {
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

function formatHeadingFragments(
  level: number,
  fragments?: string[],
  fragmentCount?: number,
): string | undefined {
  const normalizedFragments = fragments
    ?.map((fragment) => normalizeText(fragment))
    .filter((fragment): fragment is string => Boolean(fragment));

  if (!normalizedFragments?.length) {
    return undefined;
  }

  const itemCount = fragmentCount && fragmentCount > normalizedFragments.length
    ? fragmentCount
    : normalizedFragments.length;

  if (level === 1) {
    return `heading level ${level} ${normalizedFragments.join(" ")}, ${itemCount} items`;
  }

  const [firstFragment, ...nestedFragments] = normalizedFragments;
  const nestedLevel = Math.max(1, level - 1);
  const shouldExpandBoundaryFragments =
    Boolean(fragmentCount && fragmentCount > normalizedFragments.length);
  const nestedAnnouncements = nestedFragments.flatMap((fragment) => {
    const parenthesized = shouldExpandBoundaryFragments
      ? fragment.match(/^\((.+)\)$/)
      : undefined;
    if (!parenthesized) {
      return [`level ${nestedLevel} ${fragment}`];
    }
    return [
      `level ${nestedLevel} (`,
      `level ${nestedLevel} ${parenthesized[1]}`,
      `level ${nestedLevel})`,
    ];
  });
  return [
    `heading level ${level} ${firstFragment}`,
    ...nestedAnnouncements,
    `level ${nestedLevel}, ${itemCount} items`,
  ].join(", ");
}

function formatInteractiveHeadingFragments(fragments?: string[]): string | undefined {
  const normalizedFragments = fragments
    ?.map((fragment) => normalizeText(fragment))
    .filter((fragment): fragment is string => Boolean(fragment));

  if (!normalizedFragments?.length) {
    return undefined;
  }

  const [firstFragment, ...nestedFragments] = normalizedFragments;
  return [
    firstFragment,
    ...nestedFragments.map((fragment) => `level 2 ${fragment}`),
    `level 2, ${normalizedFragments.length} items`,
  ].join(", ");
}

export function generateAnnouncement(el: ElementDescriptor): string {
  const parts: string[] = [];
  const role = (el.role ?? "").toLowerCase();
  const label =
    normalizeText(el.name) ??
    normalizeText(el.text) ??
    normalizeText(el.description);
  const value = normalizeText(el.valueText ?? el.value);
  const placeholder = normalizeText(el.placeholder);

  switch (role) {
    case "heading": {
      const level = el.level ?? 2;
      const headingWithFragments =
        el.headingLink || el.headingButton
          ? formatInteractiveHeadingFragments(el.headingFragments)
          : formatHeadingFragments(level, el.headingFragments, el.headingFragmentCount);
      const headingLabel = headingWithFragments ??
        (el.preserveSpaceBeforePunctuationName
          ? normalizeTextPreservingSpaceBeforePunctuation(el.preserveSpaceBeforePunctuationName)
          : label);
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
        if (el.expanded !== undefined) {
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
      const buttonLabel = el.preserveSpaceBeforePunctuationName
        ? normalizeTextPreservingSpaceBeforePunctuation(el.preserveSpaceBeforePunctuationName)
        : label;
      const announcedButtonLabel = appendInlineDetails(buttonLabel, el.details);
      const buttonDetailsAreInline = Boolean(normalizeText(el.details));
      if (announcedButtonLabel) {
        parts.push(announcedButtonLabel);
      }
      const popupType = formatPopupType(el.hasPopup);
      const isToggleButton =
        el.roleDescription === "toggle button" || el.pressed !== undefined;

      if (popupType && !isToggleButton) {
        if (el.popupLabelWithoutComma && label) {
          parts[parts.length - 1] = `${label} ${popupType}`;
          parts.push("button");
        } else if (el.expanded !== undefined) {
          parts.push(`${popupType} ${el.expanded ? "expanded" : "collapsed"}`);
          parts.push("button");
        } else {
          parts.push(popupType);
          parts.push("button");
        }
      } else {
        if (el.expanded !== undefined) {
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
      const linkLabel = el.preserveSpaceBeforeColonName
        ? normalizeTextPreservingSpaceBeforeColon(el.preserveSpaceBeforeColonName)
        : label;
      const announcedLinkLabel = appendInlineDetails(linkLabel, el.details);
      const linkDetailsAreInline = Boolean(normalizeText(el.details));
      const popupType = formatPopupType(el.hasPopup);
      if (el.disabled && el.current) {
        parts.push(
          `dimmed ${el.current === true ? "current item" : `current ${el.current}`}`,
        );
      } else {
        if (el.disabled) {
          parts.push("dimmed");
        }
        if (el.current) {
          parts.push(el.current === true ? "current item" : `current ${el.current}`);
        }
      }
      if (popupType && el.expanded !== undefined) {
        parts.push(popupType);
        parts.push(el.expanded ? "expanded" : "collapsed");
      }
      if (!popupType && el.expanded !== undefined) {
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
        const searchPlaceholder = placeholder !== label ? placeholder : undefined;
        pushIfPresent(
          parts,
          [label, value ?? searchPlaceholder].filter(Boolean).join(" "),
        );
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
        const placeholderText = placeholder !== label ? placeholder : undefined;
        pushIfPresent(
          parts,
          el.textboxPlaceholderBeforeRole && !value
            ? [label, placeholderText].filter(Boolean).join(" ")
            : label,
        );
        if (el.invalid) {
          pushInvalidState(parts, el.invalid === true ? "data" : el.invalid);
        }
        if (el.secureTextField && el.required) {
          parts.push("required");
        }
        parts.push(
          el.textEntryArea
            ? "text entry area"
            : el.secureTextField
              ? "secure text field"
              : el.emailTextField
                ? "email"
                : "edit text",
        );
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
        const comboLabelFromPlaceholder =
          !label && Boolean(placeholder) ||
          Boolean(
            label &&
              placeholder &&
              normalizeText(label) === normalizeText(placeholder) &&
              !normalizeText(el.description) &&
              !normalizeText(el.details),
          );
        if (el.nativeDatalistPlaceholderName && comboLabel && popupType) {
          parts.push(`${comboLabel} ${popupType}`);
        } else if (comboLabelFromPlaceholder && comboLabel && popupType) {
          if (el.expanded !== undefined) {
            parts.push(
              popupType === "grid pop up"
                ? `${comboLabel}, ${popupType} ${el.expanded ? "expanded" : "collapsed"}`
                : `${comboLabel} ${popupType} ${el.expanded ? "expanded" : "collapsed"}`,
            );
          } else {
            parts.push(`${comboLabel} ${popupType}`);
          }
        } else {
          if (
            comboLabelFromPlaceholder &&
            comboLabel &&
            !popupType &&
            normalizeText(el.autocomplete) === "list" &&
            el.expanded !== undefined
          ) {
            const popupState = `list box pop up ${el.expanded ? "expanded" : "collapsed"}`;
            parts.push(`${comboLabel} ${el.required ? `required ${popupState}` : popupState}`);
          } else {
            pushIfPresent(parts, comboLabel);
          }
          if (popupType && el.expanded !== undefined) {
            parts.push(`${popupType} ${el.expanded ? "expanded" : "collapsed"}`);
          } else if (popupType) {
            parts.push(popupType);
          } else if (
            !popupType &&
            !(
              comboLabelFromPlaceholder &&
              comboLabel &&
              normalizeText(el.autocomplete) === "list" &&
              el.expanded !== undefined
            )
          ) {
            pushComboBoxAutocomplete(parts, el);
          }
        }
        if (popupType && el.expanded !== undefined && el.nativeDatalistPlaceholderName && comboLabel) {
          parts.push(`${popupType} ${el.expanded ? "expanded" : "collapsed"}`);
        }
        parts.push("combo box");
        pushIfPresent(parts, value);
        if (el.expanded !== undefined) {
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
      const listSize = el.largePlainList
        ? undefined
        : el.setSize
        ? `${el.setSize} ${el.setSize === 1 ? "item" : "items"}`
        : undefined;
      const listLevel = el.level && el.level > 1 ? `level ${el.level}` : undefined;
      const parentPosition =
        el.parentPositionInSet && el.parentSetSize
          ? `${el.parentPositionInSet} of ${el.parentSetSize}`
          : undefined;
      const listParts =
        listLabel && (listRole === "list" || listRole === "definition list")
          ? [listRole, listLabel, listSize]
          : [listLabel, listRole, listSize];
      const normalizedListParts = listParts.filter(
        (part): part is string => Boolean(part),
      );
      const supplementalParts: string[] = [];
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
        if (columnPosition) supplementalParts.push(columnPosition);
      }
      pushSupplementalText(supplementalParts, el);
      return [normalizedListParts.join(" "), ...supplementalParts]
        .filter(Boolean)
        .join(", ");
    }

    case "listbox": {
      if (value) {
        const selectedParts: string[] = [];
        pushIfPresent(selectedParts, el.name);
        selectedParts.push("list box");
        if (el.selectedCount) {
          selectedParts.push(
            `${el.selectedCount} item${el.selectedCount === 1 ? "" : "s"} selected. ${value}`,
          );
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
        parts.push(
          `${el.selectedCount} item${el.selectedCount === 1 ? "" : "s"} selected`,
        );
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
      const usesTableFormatting =
        el.tableRole === "table" &&
        el.columnIndex &&
        el.columnCount &&
        (role !== "columnheader" || (el.rowCount ?? 0) > 1);

      if (usesTableFormatting) {
        if (role === "columnheader") {
          parts.push(
            (el.simpleNativeTwoColumnHeaderContext ||
              el.simpleNativeColumnHeaderContext) &&
              el.columnIndex &&
              el.columnIndex > 1 &&
              label
              ? `${label} ${label}`
              : label ?? "blank",
          );
          parts.push(`column ${el.columnIndex} of ${el.columnCount}`);
        } else {
          if (
            role === "rowheader" &&
            el.columnIndex === 1 &&
            el.rowIndex &&
            label &&
            el.tableGroupHeaderText
          ) {
            parts.push(
              `row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""} ${label}, ${el.tableGroupHeaderText} ${label}`,
            );
          } else if (
            role === "rowheader" &&
            el.columnIndex === 1 &&
            el.rowIndex &&
            label &&
            el.columnHeaderText &&
            el.simpleNativeColumnHeaderContext
          ) {
            const columnSpanContext =
              el.columnSpan && el.columnSpan > 1
                ? `${el.columnHeaderText} spans ${el.columnSpan} columns`
                : el.tableHasRowgroupSpanHeaders
                  ? undefined
                  : el.columnHeaderText;
            parts.push(
              `row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""} ${label} ${columnSpanContext ? `${columnSpanContext} ` : ""}${label}`,
            );
          } else if (
            role === "rowheader" &&
            el.columnIndex === 1 &&
            el.rowIndex &&
            label &&
            el.tableHasComplexColumnHeaders
          ) {
            parts.push(
              `row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""} ${label} ${label}`,
            );
          } else if (el.columnIndex === 1 && el.rowIndex) {
            const rowLabel = `row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""}`;
            const cellContext = normalizeText(
              [el.columnHeaderText, label ?? "blank"].filter(Boolean).join(" "),
            );
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
            pushIfPresent(
              parts,
              [el.columnHeaderText, label ?? "blank"].filter(Boolean).join(" "),
            );
          }
          parts.push(`column ${el.columnIndex} of ${el.columnCount}`);
        }
      } else {
        pushIfPresent(parts, label);
        parts.push(
          role === "gridcell"
            ? "grid cell"
            : role.replace(/header$/, " header"),
        );
        pushTableCoordinates(parts, el);
      }
      if (
        el.columnSpan &&
        el.columnSpan > 1 &&
        !(
          role === "rowheader" &&
          el.columnIndex === 1 &&
          el.rowIndex &&
          label &&
          el.columnHeaderText &&
          el.simpleNativeColumnHeaderContext
        )
      ) {
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
        parts.push(
          el.imageMissingDescriptionHint
            ? "image. To get missing image descriptions, open the context menu."
            : "image",
        );
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
      if (el.tabExpandedState && el.expanded !== undefined) {
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
      if (
        role &&
        role !== "generic" &&
        role !== "none" &&
        role !== "presentation"
      ) {
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

export function getContextEndAnnouncement(
  descriptor?: ElementDescriptor,
): string | null {
  if (descriptor?.suppressContextEnd) {
    return null;
  }

  const role = (descriptor?.role ?? "").toLowerCase();
  if (role === "list") {
    return descriptor?.roleDescription === "definition list"
      ? "end of definition list"
      : "end of list";
  }

  if (role === "term") {
    const name = normalizeText(descriptor?.name);
    if (!name) return "end of term";
    const position =
      descriptor?.parenthesizedCollectionPosition &&
      descriptor.positionInSet &&
      descriptor.setSize
        ? `, (${descriptor.positionInSet} of ${descriptor.setSize})`
        : "";
    return `end of, ${name}, term${position}`;
  }

  if (role === "banner") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, banner`
      : "end of, banner";
  }

  if (role === "contentinfo") {
    if (descriptor?.roleDescription === "footer") {
      return descriptor?.name ? `end of, ${descriptor.name}, footer` : "end of, footer";
    }
    return descriptor?.name
      ? `end of, ${descriptor.name}, content information`
      : "end of, content information";
  }

  if (role === "sectionfooter") {
    return descriptor?.name ? `end of, ${descriptor.name}` : "end of";
  }

  if (role === "main") {
    return descriptor?.name ? `end of, ${descriptor.name}, main` : "end of, main";
  }

  if (role === "navigation") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, navigation`
      : "end of, navigation";
  }

  if (role === "region" && descriptor?.roleDescription === "carousel") {
    return descriptor.name
      ? `end of, ${descriptor.name}, ${descriptor.roleDescription}`
      : `end of, ${descriptor.roleDescription}`;
  }

  if (role === "search") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, search`
      : "end of, search";
  }

  if (role === "form") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, form`
      : "end of, form";
  }

  if (role === "complementary") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, complementary`
      : "end of, complementary";
  }

  if (role === "tabpanel") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, tab panel`
      : "end of, tab panel";
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
    return descriptor?.name
      ? `end of, ${descriptor.name}, region`
      : "end of region";
  }

  if (role === "article") {
    const name =
      descriptor?.contextEndName ||
      (descriptor?.inferredArticleName ? undefined : descriptor?.name);
    return name ? `end of, ${name}, article` : "end of, article";
  }

  if (role === "dialog") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, dialog`
      : "end of, dialog";
  }

  if (role === "alert" && descriptor?.namedAlertBoundary) {
    return descriptor.name
      ? `end of, ${descriptor.name}, alert`
      : "end of, alert";
  }

  if (role === "tooltip") {
    return "end of, tooltip";
  }

  if (role === "group") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, ${genericGroupRoleLabel(descriptor)}`
      : `end of ${genericGroupRoleLabel(descriptor)}`;
  }

  return null;
}
