import { generateSafariAnnouncement } from "./announcements";
import type {
  SafariCoverageCandidate,
  SafariDescriptor,
  SafariDomScanner,
  SafariDomScannerOptions,
  SafariScanResult,
  SafariTraversalStop,
} from "./types";

const SEMANTIC_TAG_ROLES: Record<string, string> = {
  A: "link",
  BUTTON: "button",
  H1: "heading",
  H2: "heading",
  H3: "heading",
  H4: "heading",
  H5: "heading",
  H6: "heading",
  IMG: "img",
  INPUT: "textbox",
  LI: "listitem",
  OL: "list",
  P: "text",
  SELECT: "combobox",
  TEXTAREA: "textbox",
  UL: "list",
};

const PRESENTATIONAL_ROLES = new Set(["none", "presentation"]);
const SOURCE_ONLY_TAGS = new Set(["LABEL"]);
const NON_DESCENDING_ROLES = new Set(["button", "checkbox", "combobox", "img", "link", "radio", "textbox"]);

interface ScanState {
  candidates: SafariCoverageCandidate[];
  candidateByNode: Map<Node, SafariCoverageCandidate>;
  referencedText: Map<Node, { source: "accessible-name" | "accessible-description"; owner: Element }>;
  stops: SafariTraversalStop[];
  candidateSequence: number;
  descriptorSequence: number;
  includeContextEndings: boolean;
}

interface ListPosition {
  position: number;
  setSize: number;
}

function clean(value: string | null | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function elementPath(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && parts.length < 8) {
    const tag = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`${tag}#${current.id}`);
      break;
    }
    const parentElement: Element | null = current.parentElement;
    const currentTagName = current.tagName;
    const siblings: Element[] = parentElement
      ? Array.from(parentElement.children).filter((child: Element) => child.tagName === currentTagName)
      : [];
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(current) + 1})` : tag);
    current = parentElement;
  }
  return parts.join(" > ");
}

function nodePath(node: Node): string {
  if (node.nodeType === 1) return elementPath(node as Element);
  const parent = node.parentElement;
  if (!parent) return "#text";
  const texts = Array.from(parent.childNodes).filter((child) => child.nodeType === 3);
  return `${elementPath(parent)} > #text[${texts.indexOf(node as ChildNode) + 1}]`;
}

function explicitRole(element: Element): string {
  const role = clean(element.getAttribute("role")).toLowerCase().split(/\s+/)[0] || "";
  return PRESENTATIONAL_ROLES.has(role) ? "" : role;
}

function implicitRole(element: Element): string {
  if (element.tagName === "A" && !element.hasAttribute("href")) return "";
  if (element.tagName === "INPUT") {
    const type = clean(element.getAttribute("type") || "text").toLowerCase();
    if (type === "hidden") return "";
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    if (["button", "submit", "reset"].includes(type)) return "button";
  }
  return SEMANTIC_TAG_ROLES[element.tagName] || "";
}

function roleOf(element: Element): string {
  return explicitRole(element) || implicitRole(element);
}

function isElementHidden(element: Element): boolean {
  if (element.hasAttribute("hidden") || element.hasAttribute("inert")) return true;
  if (clean(element.getAttribute("aria-hidden")).toLowerCase() === "true") return true;
  const style = clean(element.getAttribute("style")).toLowerCase();
  if (/(^|;)\s*display\s*:\s*none(?:;|$)/.test(style)) return true;
  if (/(^|;)\s*visibility\s*:\s*(hidden|collapse)(?:;|$)/.test(style)) return true;
  return element.parentElement ? isElementHidden(element.parentElement) : false;
}

function descendantTextNodes(element: Element): Text[] {
  const document = element.ownerDocument;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes.filter((node) => Boolean(clean(node.nodeValue)));
}

function textForIds(element: Element, attribute: string, state: ScanState, source: "accessible-name" | "accessible-description"): string {
  const ids = clean(element.getAttribute(attribute)).split(/\s+/).filter(Boolean);
  const values: string[] = [];
  for (const id of ids) {
    const referenced = element.ownerDocument.getElementById(id);
    if (!referenced) continue;
    values.push(clean(referenced.textContent));
    for (const node of descendantTextNodes(referenced)) state.referencedText.set(node, { source, owner: element });
  }
  return clean(values.join(" "));
}

function associatedLabel(element: Element, state: ScanState): string {
  if (!(element instanceof HTMLElement)) return "";
  const id = element.id;
  const labels = Array.from(element.ownerDocument.querySelectorAll("label")).filter((label) =>
    (id && label.getAttribute("for") === id) || label.contains(element),
  );
  for (const label of labels) {
    for (const node of descendantTextNodes(label)) state.referencedText.set(node, { source: "accessible-name", owner: element });
  }
  return clean(labels.map((label) => label.textContent).join(" "));
}

function accessibleName(element: Element, state: ScanState): string {
  const labelledBy = textForIds(element, "aria-labelledby", state, "accessible-name");
  if (labelledBy) return labelledBy;
  const ariaLabel = clean(element.getAttribute("aria-label"));
  if (ariaLabel) return ariaLabel;
  const label = associatedLabel(element, state);
  if (label) return label;
  if (element.tagName === "IMG") return clean(element.getAttribute("alt"));
  if (element.tagName === "INPUT" && ["button", "submit", "reset"].includes(clean(element.getAttribute("type")).toLowerCase())) {
    return clean((element as HTMLInputElement).value);
  }
  return clean(element.textContent || element.getAttribute("title"));
}

function accessibleDescription(element: Element, state: ScanState): string {
  return textForIds(element, "aria-describedby", state, "accessible-description");
}

function booleanAttribute(element: Element, name: string): boolean | undefined {
  const value = clean(element.getAttribute(name)).toLowerCase();
  if (!value) return undefined;
  return value === "true";
}

function createCandidate(state: ScanState, node: Node, kind: "semantic" | "text", role: string, text: string): SafariCoverageCandidate {
  const candidate: SafariCoverageCandidate = {
    id: `candidate-${++state.candidateSequence}`,
    kind,
    domPath: nodePath(node),
    role,
    text: clean(text),
    disposition: "uncovered",
    reason: "not yet planned",
    consumingStopIndexes: [],
  };
  state.candidates.push(candidate);
  state.candidateByNode.set(node, candidate);
  return candidate;
}

function discoverCandidates(root: Element | Document, state: ScanState): void {
  const document = root.nodeType === 9 ? (root as Document) : root.ownerDocument!;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node: Node | null = root.nodeType === 1 ? root : walker.nextNode();
  while (node) {
    if (node.nodeType === 1) {
      const element = node as Element;
      const role = roleOf(element);
      if (role && role !== "listitem") createCandidate(state, element, "semantic", role, clean(element.textContent));
    } else if (node.nodeType === 3 && clean(node.nodeValue)) {
      createCandidate(state, node, "text", "text", clean(node.nodeValue));
    }
    node = walker.nextNode();
  }
}

function primeReferencedSources(root: Element | Document, state: ScanState): void {
  const elements = root.nodeType === 9
    ? Array.from((root as Document).querySelectorAll("*"))
    : [root as Element, ...Array.from((root as Element).querySelectorAll("*"))];
  for (const element of elements) {
    textForIds(element, "aria-labelledby", state, "accessible-name");
    textForIds(element, "aria-describedby", state, "accessible-description");
    associatedLabel(element, state);
  }
}

function suppressSubtree(element: Element, state: ScanState, reason: string): void {
  for (const [node, candidate] of state.candidateByNode) {
    if (node === element || element.contains(node)) {
      candidate.disposition = "suppressed";
      candidate.reason = reason;
    }
  }
}

function createDescriptor(state: ScanState, element: Element, role: string, name: string, description: string, listPosition?: ListPosition): SafariDescriptor {
  const headingMatch = /^H([1-6])$/.exec(element.tagName);
  const input = element as HTMLInputElement;
  return {
    id: `safari-stop-${++state.descriptorSequence}`,
    kind: "element",
    role,
    name,
    description,
    value: role === "textbox" || role === "combobox" ? clean(input.value || element.getAttribute("value")) : "",
    text: clean(element.textContent),
    tagName: element.tagName.toLowerCase(),
    level: headingMatch ? Number(headingMatch[1]) : Number(element.getAttribute("aria-level")) || undefined,
    position: listPosition?.position,
    setSize: listPosition?.setSize,
    checked: role === "checkbox" || role === "radio" ? Boolean(input.checked || booleanAttribute(element, "aria-checked")) : undefined,
    disabled: element.hasAttribute("disabled") || booleanAttribute(element, "aria-disabled"),
    expanded: booleanAttribute(element, "aria-expanded"),
    required: element.hasAttribute("required") || booleanAttribute(element, "aria-required"),
    selected: element.hasAttribute("selected") || booleanAttribute(element, "aria-selected"),
    provenance: {
      candidateIds: [],
      domPath: elementPath(element),
      source: name ? "accessible-name" : "semantic",
    },
  };
}

function addStop(state: ScanState, descriptor: SafariDescriptor, candidates: SafariCoverageCandidate[]): number {
  const announcement = generateSafariAnnouncement(descriptor);
  if (!announcement) return -1;
  const duplicate = state.stops.find((stop) => stop.announcement.toLowerCase() === announcement.toLowerCase());
  if (duplicate && descriptor.kind === "text") {
    for (const candidate of candidates) {
      candidate.disposition = "duplicate";
      candidate.reason = `same normalized announcement as stop ${duplicate.index}`;
      candidate.consumingStopIndexes = [duplicate.index];
    }
    return duplicate.index;
  }
  const index = state.stops.length;
  descriptor.provenance.candidateIds = candidates.map((candidate) => candidate.id);
  state.stops.push({ index, descriptor, announcement });
  for (const candidate of candidates) {
    candidate.disposition = candidate.kind === "semantic" ? "announced" : "consumed";
    candidate.reason = candidate.kind === "semantic" ? "semantic traversal stop" : `owned by ${descriptor.role} stop`;
    candidate.consumingStopIndexes = [index];
  }
  return index;
}

function listItems(element: Element): Element[] {
  return Array.from(element.children).filter((child) => roleOf(child) === "listitem");
}

function planTextNode(node: Text, state: ScanState, owner: Element | null, listPosition?: ListPosition): void {
  const candidate = state.candidateByNode.get(node);
  if (!candidate || candidate.disposition !== "uncovered") return;
  const reference = state.referencedText.get(node);
  if (reference) {
    candidate.disposition = "consumed";
    candidate.reason = `${reference.source} for ${elementPath(reference.owner)}`;
    return;
  }
  if (owner) return;
  const descriptor: SafariDescriptor = {
    id: `safari-stop-${++state.descriptorSequence}`,
    kind: "text",
    role: "text",
    name: "",
    description: "",
    value: "",
    text: candidate.text,
    tagName: "#text",
    position: listPosition?.position,
    setSize: listPosition?.setSize,
    provenance: { candidateIds: [candidate.id], domPath: candidate.domPath, source: "dom-text" },
  };
  addStop(state, descriptor, [candidate]);
}

function planElement(element: Element, state: ScanState, inheritedOwner: Element | null, listPosition?: ListPosition): void {
  if (isElementHidden(element)) {
    suppressSubtree(element, state, "accessibility-hidden subtree");
    return;
  }

  const role = roleOf(element);
  const semanticCandidate = state.candidateByNode.get(element);
  if (SOURCE_ONLY_TAGS.has(element.tagName)) {
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 3) planTextNode(child as Text, state, inheritedOwner, listPosition);
      else if (child.nodeType === 1) planElement(child as Element, state, inheritedOwner, listPosition);
    }
    return;
  }

  if (role === "list") {
    const items = listItems(element);
    const descriptor: SafariDescriptor = {
      id: `safari-stop-${++state.descriptorSequence}`,
      kind: "context-start",
      role: "list",
      name: "",
      description: "",
      value: "",
      text: "",
      tagName: element.tagName.toLowerCase(),
      setSize: items.length,
      provenance: { candidateIds: semanticCandidate ? [semanticCandidate.id] : [], domPath: elementPath(element), source: "semantic" },
    };
    addStop(state, descriptor, semanticCandidate ? [semanticCandidate] : []);
    items.forEach((item, index) => planElement(item, state, null, { position: index + 1, setSize: items.length }));
    if (state.includeContextEndings) {
      addStop(state, { ...descriptor, id: `safari-stop-${++state.descriptorSequence}`, kind: "context-end", provenance: { ...descriptor.provenance, candidateIds: [] } }, []);
    }
    return;
  }

  if (role === "listitem") {
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 3) planTextNode(child as Text, state, null, listPosition);
      else if (child.nodeType === 1) planElement(child as Element, state, null, listPosition);
    }
    return;
  }

  const isSemantic = Boolean(role);
  const ownsText = isSemantic && role !== "listitem";
  let semanticStop = -1;
  if (isSemantic && semanticCandidate) {
    const name = accessibleName(element, state);
    const description = accessibleDescription(element, state);
    const descriptor = createDescriptor(state, element, role, name, description, listPosition);
    semanticStop = addStop(state, descriptor, [semanticCandidate]);
    for (const node of descendantTextNodes(element)) {
      const textCandidate = state.candidateByNode.get(node);
      if (!textCandidate || textCandidate.disposition !== "uncovered") continue;
      textCandidate.disposition = "consumed";
      textCandidate.reason = `${role} accessible content`;
      textCandidate.consumingStopIndexes = semanticStop >= 0 ? [semanticStop] : [];
    }
  }

  if (isSemantic && NON_DESCENDING_ROLES.has(role)) {
    for (const child of Array.from(element.children)) {
      const childCandidate = state.candidateByNode.get(child);
      if (childCandidate && childCandidate.disposition === "uncovered") {
        childCandidate.disposition = "consumed";
        childCandidate.reason = `inside non-descending ${role} stop`;
        childCandidate.consumingStopIndexes = semanticStop >= 0 ? [semanticStop] : [];
      }
    }
    return;
  }

  const nextOwner = ownsText ? element : inheritedOwner;
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === 3) planTextNode(child as Text, state, nextOwner, listPosition);
    else if (child.nodeType === 1) planElement(child as Element, state, nextOwner, listPosition);
  }
}

function finalizeCandidates(state: ScanState): void {
  for (const candidate of state.candidates) {
    if (candidate.disposition === "uncovered" && candidate.text) {
      candidate.reason = "readable candidate was not assigned by traversal planner";
    } else if (candidate.disposition === "uncovered") {
      candidate.disposition = "suppressed";
      candidate.reason = "empty semantic candidate";
    }
  }
}

export function scanSafariDom(options: SafariDomScannerOptions = {}): SafariScanResult {
  const root = options.root || document;
  const state: ScanState = {
    candidates: [],
    candidateByNode: new Map(),
    referencedText: new Map(),
    stops: [],
    candidateSequence: 0,
    descriptorSequence: 0,
    includeContextEndings: options.includeContextEndings !== false,
  };
  discoverCandidates(root, state);
  primeReferencedSources(root, state);
  const rootElement = root.nodeType === 9 ? (root as Document).documentElement : (root as Element);
  planElement(rootElement, state, null);
  finalizeCandidates(state);
  return { stops: state.stops, candidates: state.candidates, announcements: state.stops.map((stop) => stop.announcement) };
}

export function createSafariDomScanner(defaultOptions: SafariDomScannerOptions = {}): SafariDomScanner {
  return {
    scan(options = {}) {
      return scanSafariDom({ ...defaultOptions, ...options });
    },
  };
}
