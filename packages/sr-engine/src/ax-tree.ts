// ──────────────────────────────────────────────
// AX Tree helpers
//
// Utilities for working with the Chrome DevTools
// Protocol accessibility tree.
// ──────────────────────────────────────────────

import { ElementDescriptor } from "./types";

/** Minimal CDPNode shape we care about (subset of Protocol.Accessibility.AXNode). */
export interface CDPAXNode {
  nodeId: string;
  role?: { value: string };
  name?: { value: string };
  description?: { value: string };
  value?: { value: string };
  properties?: Array<{ name: string; value: { value: unknown } }>;
  childIds?: string[];
}

/** Convert a CDP AX node into our lightweight ElementDescriptor. */
export function axNodeToDescriptor(node: CDPAXNode): ElementDescriptor {
  const desc: ElementDescriptor = {};

  if (node.role?.value) desc.role = node.role.value;
  if (node.name?.value) desc.name = node.name.value;
  if (node.description?.value) desc.description = node.description.value;
  if (node.value?.value) desc.value = String(node.value.value);

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
        desc.invalid =
          typeof prop.value.value === "string"
            ? String(prop.value.value)
            : Boolean(prop.value.value);
        break;
      case "errormessage":
        desc.errorMessage = String(prop.value.value);
        break;
      case "required":
        desc.required = Boolean(prop.value.value);
        break;
      case "checked":
        desc.checked =
          prop.value.value === "mixed" ? "mixed" : Boolean(prop.value.value);
        break;
      case "pressed":
        desc.pressed =
          prop.value.value === "mixed" ? "mixed" : Boolean(prop.value.value);
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
        desc.current =
          typeof prop.value.value === "string"
            ? String(prop.value.value)
            : Boolean(prop.value.value);
        break;
      case "haspopup":
        desc.hasPopup =
          typeof prop.value.value === "string"
            ? String(prop.value.value)
            : Boolean(prop.value.value);
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
