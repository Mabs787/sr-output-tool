import type { SafariDescriptor } from "./types";

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function positionText(descriptor: SafariDescriptor): string {
  return descriptor.position && descriptor.setSize
    ? ` ${descriptor.position} of ${descriptor.setSize}`
    : "";
}

export function generateSafariAnnouncement(descriptor: SafariDescriptor): string {
  if (descriptor.kind === "context-start" && descriptor.role === "list") {
    const count = descriptor.setSize || 0;
    return `list ${count} ${count === 1 ? "item" : "items"}`;
  }
  if (descriptor.kind === "context-end" && descriptor.role === "list") {
    return "end of list";
  }

  const contextRole = descriptor.role === "contentinfo" ? "content information" : descriptor.role;
  if (descriptor.kind === "context-start") {
    return clean([descriptor.name, contextRole].filter(Boolean).join(" "));
  }
  if (descriptor.kind === "context-end") {
    return clean(`end of ${[descriptor.name, contextRole].filter(Boolean).join(" ")}`);
  }

  const name = clean(descriptor.name || descriptor.text || descriptor.value);
  const states: string[] = [];
  if (descriptor.required) states.push("required");
  if (descriptor.disabled) states.push("dimmed");
  if (descriptor.expanded !== undefined) states.push(descriptor.expanded ? "expanded" : "collapsed");
  if (descriptor.selected) states.push("selected");
  const stateText = states.length ? ` ${states.join(" ")}` : "";
  const position = positionText(descriptor);
  const description = descriptor.description ? ` ${clean(descriptor.description)}` : "";

  switch (descriptor.role) {
    case "heading":
      return clean(`heading level ${descriptor.level || 1} ${name}${position}`);
    case "link":
      return clean(`link${descriptor.hasImage ? " image" : ""} ${name}${stateText}${position}${description}`);
    case "button":
      return clean(`${name}${stateText} button${position}${description}`);
    case "checkbox":
    case "radio":
      return clean(`${name} ${descriptor.checked ? "checked" : "not checked"} ${descriptor.role}${stateText}${position}${description}`);
    case "textbox":
      return clean(`${name}${description}${descriptor.value ? ` ${clean(descriptor.value)}` : ""} edit text${stateText}${position}`);
    case "combobox":
      return clean(`${name}${descriptor.value ? ` ${clean(descriptor.value)}` : ""}${stateText} pop up button${position}${description}`);
    case "img":
      return clean(`${name} image${position}${description}`);
    case "separator":
      return "horizontal separator";
    default:
      return clean(`${name}${stateText}${position}${description}`);
  }
}
