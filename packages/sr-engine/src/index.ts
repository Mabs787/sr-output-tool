// Public API
export { generateAnnouncement } from "./announcements";
export { getContextEndAnnouncement } from "./announcements";
export { createDomScanner } from "./dom";
export { EventTracker } from "./event-tracker";
export { axNodeToDescriptor } from "./ax-tree";
export type { CDPAXNode } from "./ax-tree";
export type {
  CapturedElementDescriptor,
  DomScanner,
  DomScannerOptions,
  ScanLogEntry,
} from "./dom";
export type {
  BoundingBox,
  ElementDescriptor,
  SREvent,
  SREventType,
  SRRecording,
  SRReport,
  Viewport,
} from "./types";
