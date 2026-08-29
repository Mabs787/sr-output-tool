export type SafariCandidateDisposition =
  | "announced"
  | "consumed"
  | "suppressed"
  | "uncovered"
  | "duplicate";

export type SafariDescriptorKind =
  | "context-start"
  | "context-end"
  | "element"
  | "text";

export interface SafariSourceProvenance {
  candidateIds: string[];
  domPath: string;
  source: "dom-text" | "accessible-name" | "accessible-description" | "semantic";
}

export interface SafariDescriptor {
  id: string;
  kind: SafariDescriptorKind;
  role: string;
  name: string;
  description: string;
  value: string;
  text: string;
  tagName: string;
  level?: number;
  position?: number;
  setSize?: number;
  checked?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  required?: boolean;
  selected?: boolean;
  hasImage?: boolean;
  provenance: SafariSourceProvenance;
}

export interface SafariCoverageCandidate {
  id: string;
  kind: "semantic" | "text";
  domPath: string;
  role: string;
  text: string;
  disposition: SafariCandidateDisposition;
  reason: string;
  consumingStopIndexes: number[];
}

export interface SafariTraversalStop {
  index: number;
  descriptor: SafariDescriptor;
  announcement: string;
}

export interface SafariScanResult {
  stops: SafariTraversalStop[];
  candidates: SafariCoverageCandidate[];
  announcements: string[];
}

export interface SafariDomScannerOptions {
  root?: Element | Document;
  includeContextEndings?: boolean;
}

export interface SafariDomScanner {
  scan(options?: SafariDomScannerOptions): SafariScanResult;
}
