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
  contextEndName?: string;
  text?: string;
  description?: string;
  details?: string;
  errorMessage?: string;
  roleDescription?: string;
  value?: string;
  valueText?: string;
  emptyObject?: boolean;
  level?: number;
  headingFragments?: string[];
  headingFragmentCount?: number;
  preserveSpaceBeforePunctuationName?: string;
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
  tableHasComplexColumnHeaders?: boolean;
  simpleNativeTwoColumnHeaderContext?: boolean;
  simpleNativeColumnHeaderContext?: boolean;
  nativeUnheadedFirstColumnContext?: boolean;
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
  nativeDatalistPlaceholderName?: boolean;
  headingButton?: boolean;
  headingLink?: boolean;
  linkHeadingLevel?: number;
  iconOnlyLink?: boolean;
  textlessCarouselPaginatorLink?: boolean;
  compositeText?: boolean;
  precedingControlLabel?: string;
  fieldsetRadioGroup?: boolean;
  linkRoleFirst?: boolean;
  suppressContextEnd?: boolean;
  groupContext?: boolean;
  richTextGroup?: boolean;
  groupedCollectionPosition?: boolean;
  parenthesizedCollectionPosition?: boolean;
  duplicateCollectionPosition?: boolean;
  emptyTerm?: boolean;
  unlabeledImage?: boolean;
  unlabeledImageSrcLabel?: string;
  imageMissingDescriptionHint?: boolean;
  splitDescribedAutocomplete?: boolean;
  searchInputGroup?: boolean;
  compactInputActionGroup?: boolean;
  leadingCarouselGroup?: boolean;
  trailingCarouselSlideGroups?: boolean;
  leadingStandaloneCardGroup?: boolean;
  leadingDecorativeTextCardGroups?: boolean;
  trailingStandaloneGroup?: boolean;
  splitLabelStop?: boolean;
  nativeFormControlLabelStop?: boolean;
  nativeFormInlineAlert?: boolean;
  suppressStatusRolePrefix?: boolean;
  textEntryArea?: boolean;
  emailTextField?: boolean;
  textboxPlaceholderBeforeRole?: boolean;
  footerCountrySelector?: boolean;
  fieldsetPromptText?: string;
  labelledNavigationHeaderText?: string;
  examplePreviewFrameAnnouncements?: string[];
  tabExpandedState?: boolean;
  axInlineTwoLinkListItemAnnouncements?: string[];
  axMixedInlineListItemAnnouncements?: string[];
  contributionListItemAnnouncements?: string[];
  metadataListItemValueAnnouncements?: string[];
  wrappedDefinitionListTermChildAnnouncements?: string[];
  inlineEmphasisListItemFragments?: string[];
  inlineEmphasisTextFragments?: string[];
  inlineCodeBreakTextFragments?: string[];
  footerInlineBoundaryTextFragments?: string[];
  inlineTextLinkFragments?: string[];
  inlinePhrasingBoundaryFragments?: string[];
  expandedRegionInlineLinkFragments?: string[];
  priceDisclosureFragments?: string[];
  richProductCardFeatureRowFragments?: string[];
  complexColumnHeaderContextText?: string;
  complexColumnHeaderColorGroupText?: string;
  complexColumnHeaderTextFragments?: string[];
  complexColumnHeaderContextCellTextFragments?: string[];
  complexColumnHeaderFragments?: string[];
  complexColumnHeaderRawText?: string;
  codeMirrorTextEntryText?: string;
  preserveSpaceBeforeColonName?: string;
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
