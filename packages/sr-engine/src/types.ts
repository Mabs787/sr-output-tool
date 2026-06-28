// ──────────────────────────────────────────────
// Core types for the Screen Reader Outcome Engine
// ──────────────────────────────────────────────

/** Bounding box of an element in viewport coordinates. */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Minimal element descriptor captured at event time. */
export interface ElementDescriptor {
  role?: string;
  name?: string;
  text?: string;
  description?: string;
  details?: string;
  errorMessage?: string;
  roleDescription?: string;
  value?: string;
  valueText?: string;
  level?: number;
  headingFragments?: string[];
  setSize?: number;
  positionInSet?: number;
  parentSetSize?: number;
  parentPositionInSet?: number;
  rowIndex?: number;
  rowCount?: number;
  columnIndex?: number;
  columnCount?: number;
  columnHeaderText?: string;
  tableGroupHeaderText?: string;
  tableGroupedHeaderRow?: boolean;
  tableFirstGroupedHeaderRow?: boolean;
  rowSpan?: number;
  columnSpan?: number;
  tableLabel?: string;
  tableRole?: string;
  placeholder?: string;
  required?: boolean;
  invalid?: boolean | string;
  checked?: boolean | "mixed";
  expanded?: boolean;
  selected?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  pressed?: boolean | "mixed";
  current?: string | boolean;
  hasPopup?: boolean | string;
  autocomplete?: string;
  live?: string;
  atomic?: boolean;
  relevant?: string;
  busy?: boolean;
  controls?: string;
  modal?: boolean;
  sort?: string;
  selectedCount?: number;
  nativeSelect?: boolean;
  headingButton?: boolean;
  headingLink?: boolean;
  linkHeadingLevel?: number;
  iconOnlyLink?: boolean;
  compositeText?: boolean;
  precedingControlLabel?: string;
  fieldsetRadioGroup?: boolean;
  linkRoleFirst?: boolean;
  suppressContextEnd?: boolean;
  groupContext?: boolean;
  groupedCollectionPosition?: boolean;
  splitDescribedAutocomplete?: boolean;
  searchInputGroup?: boolean;
  compactInputActionGroup?: boolean;
  leadingCarouselGroup?: boolean;
  trailingCarouselSlideGroups?: boolean;
  leadingStandaloneCardGroup?: boolean;
  splitLabelStop?: boolean;
  footerCountrySelector?: boolean;
  inlineEmphasisListItemFragments?: string[];
  complexColumnHeaderFragments?: string[];
  complexColumnHeaderRawText?: string;
}

/** Types of screen reader events. */
export type SREventType = "focus" | "announcement" | "action";

/** A single screen-reader event captured during a test. */
export interface SREvent {
  /** Milliseconds since recording started. */
  timestamp: number;
  /** Category of event. */
  type: SREventType;
  /** What the screen reader would announce. */
  announcement?: string;
  /** Relative path to the snapshot image. */
  snapshot: string;
  /** Bounding box of the focused / interacted element (viewport‑relative). */
  boundingBox?: BoundingBox;
  /** Element metadata. */
  element?: ElementDescriptor;
  /** Optional sub-type for actions (click, keypress, submit …). */
  actionType?: string;
}

/** Viewport dimensions. */
export interface Viewport {
  width: number;
  height: number;
}

/** A single test recording within a report. */
export interface SRRecording {
  /** Title / label for this recording. */
  title?: string;
  /** URL under test. */
  url: string;
  /** Viewport size during recording. */
  viewport: Viewport;
  /** ISO-8601 timestamp when the recording was created. */
  createdAt: string;
  /** Ordered list of captured events. */
  events: SREvent[];
}

/** Full report written to disk (may contain multiple recordings). */
export interface SRReport {
  recordings: SRRecording[];
}
