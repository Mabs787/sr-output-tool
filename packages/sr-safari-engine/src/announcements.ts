import type { SafariDescriptor } from "./types";

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function appendPosition(parts: string[], descriptor: SafariDescriptor): void {
  if (descriptor.position && descriptor.setSize) {
    parts.push(`${descriptor.position} of ${descriptor.setSize}`);
  }
}

export function generateSafariAnnouncement(descriptor: SafariDescriptor): string {
  if (descriptor.kind === "context-start" && descriptor.role === "list") {
    return `list ${descriptor.setSize || 0} items`;
  }
  if (descriptor.kind === "context-end" && descriptor.role === "list") {
    return "end of list";
  }

  const name = clean(descriptor.name || descriptor.text || descriptor.value);
  const parts: string[] = [];

  switch (descriptor.role) {
    case "heading":
      parts.push(`heading level ${descriptor.level || 1}`);
      if (name) parts.push(name);
      break;
    case "link":
      parts.push("link");
      if (name) parts.push(name);
      break;
    case "button":
      parts.push("button");
      if (name) parts.push(name);
      break;
    case "checkbox":
    case "radio":
      parts.push(descriptor.checked ? "checked" : "not checked", descriptor.role);
      if (name) parts.push(name);
      break;
    case "textbox":
      parts.push("text field");
      if (name) parts.push(name);
      if (descriptor.value && clean(descriptor.value) !== name) parts.push(clean(descriptor.value));
      break;
    case "combobox":
      parts.push("pop up button");
      if (name) parts.push(name);
      if (descriptor.value && clean(descriptor.value) !== name) parts.push(clean(descriptor.value));
      break;
    case "img":
      if (name) parts.push(name);
      parts.push("image");
      break;
    default:
      if (name) parts.push(name);
      break;
  }

  if (descriptor.required) parts.push("required");
  if (descriptor.disabled) parts.push("dimmed");
  if (descriptor.expanded !== undefined) parts.push(descriptor.expanded ? "expanded" : "collapsed");
  if (descriptor.selected) parts.push("selected");
  if (descriptor.description) parts.push(clean(descriptor.description));
  appendPosition(parts, descriptor);
  return parts.filter(Boolean).join(", ");
}
