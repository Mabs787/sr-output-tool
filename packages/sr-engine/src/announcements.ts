import { ElementDescriptor } from "./types";

function normalizeText(value?: string): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim();
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
    parts.push(`list box pop up ${el.expanded ? "expanded" : "collapsed"}`);
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

function pushSupplementalText(parts: string[], el: ElementDescriptor): void {
  pushIfPresent(parts, el.details);
  pushInvalidState(parts, el.invalid);
  pushIfPresent(parts, el.errorMessage);
  if (el.busy) {
    parts.push("busy");
  }
}

function formatHeadingFragments(level: number, fragments?: string[]): string | undefined {
  const normalizedFragments = fragments
    ?.map((fragment) => normalizeText(fragment))
    .filter((fragment): fragment is string => Boolean(fragment));

  if (!normalizedFragments?.length) {
    return undefined;
  }

  return `heading level ${level} ${normalizedFragments.join(" ")}, ${normalizedFragments.length} items`;
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

  switch (role) {
    case "heading": {
      const level = el.level ?? 2;
      const headingWithFragments =
        el.headingLink || el.headingButton
          ? formatInteractiveHeadingFragments(el.headingFragments)
          : formatHeadingFragments(level, el.headingFragments);
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
        pushCollectionPosition(parts, el);
      } else {
        pushIfPresent(parts, headingLabel);
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
      pushIfPresent(parts, label);
      const popupType = formatPopupType(el.hasPopup);
      const isToggleButton =
        el.roleDescription === "toggle button" || el.pressed !== undefined;

      if (popupType && !isToggleButton) {
        if (el.expanded !== undefined) {
          parts.push(`${popupType} ${el.expanded ? "expanded" : "collapsed"}`);
          parts.push("button");
        } else {
          parts.push(`${popupType} button`);
        }
      } else {
        if (el.expanded !== undefined) {
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
      if (popupType && el.expanded !== undefined) {
        parts.push(popupType);
        parts.push(el.expanded ? "expanded" : "collapsed");
      }
      if (!popupType && el.expanded !== undefined) {
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
        pushIfPresent(
          parts,
          [label, value ?? el.placeholder].filter(Boolean).join(" "),
        );
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
        if (popupType && el.expanded !== undefined) {
          parts.push(`${popupType} ${el.expanded ? "expanded" : "collapsed"}`);
        } else if (!popupType) {
          pushComboBoxAutocomplete(parts, el);
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
      const listSize = el.setSize
        ? `${el.setSize} ${el.setSize === 1 ? "item" : "items"}`
        : undefined;
      const listLevel = el.level && el.level > 1 ? `level ${el.level}` : undefined;
      const parentPosition =
        el.parentPositionInSet && el.parentSetSize
          ? `${el.parentPositionInSet} of ${el.parentSetSize}`
          : undefined;
      const listParts = [listLabel, listRole, listSize].filter(
        (part): part is string => Boolean(part),
      );
      const supplementalParts: string[] = [];
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
        parts.push(
          `${el.selectedCount} item${el.selectedCount === 1 ? "" : "s"} selected`,
        );
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
      const usesTableFormatting =
        el.tableRole === "table" &&
        el.columnIndex &&
        el.columnCount &&
        (role !== "columnheader" || (el.rowCount ?? 0) > 1);

      if (usesTableFormatting) {
        if (role === "columnheader") {
          parts.push(label ?? "blank");
          parts.push(`column ${el.columnIndex} of ${el.columnCount}`);
        } else {
          if (el.columnIndex === 1 && el.rowIndex) {
            parts.push(
              `row ${el.rowIndex}${el.rowCount ? ` of ${el.rowCount}` : ""}`,
            );
          }
          pushIfPresent(
            parts,
            [el.columnHeaderText, label].filter(Boolean).join(" "),
          );
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
    case "article":
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

  if (role === "banner") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, banner`
      : "end of, banner";
  }

  if (role === "contentinfo") {
    return descriptor?.name
      ? `end of ${descriptor.name} footer`
      : "end of, footer";
  }

  if (role === "navigation") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, navigation`
      : "end of, navigation";
  }

  if (role === "search") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, search`
      : "end of, search";
  }

  if (role === "complementary") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, complementary`
      : "end of, complementary";
  }

  if (role === "tabpanel") {
    return descriptor?.name
      ? `end of ${descriptor.name} tab panel`
      : "end of tab panel";
  }

  if (role === "table") {
    return "end of table";
  }

  if (role === "grid") {
    return "end of grid";
  }

  if (role === "region") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, region`
      : "end of region";
  }

  if (role === "group") {
    return descriptor?.name
      ? `end of, ${descriptor.name}, group`
      : "end of group";
  }

  return null;
}
