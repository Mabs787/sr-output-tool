export const ADDON_ID = "sr-output/storybook-addon";
export const PANEL_ID = `${ADDON_ID}/panel`;
export const PANEL_TITLE = "SR Output";
export const FEEDBACK_URL = "https://github.com/Mabs787/sr-output-tool/issues";

export const EVENTS = {
  /** Preview → Manager: scan results ready */
  RESULT: `${ADDON_ID}/result`,
  /** Manager → Preview: hover started on a log row */
  HIGHLIGHT: `${ADDON_ID}/highlight`,
  /** Manager → Preview: hover ended, remove highlight */
  CLEAR_HIGHLIGHT: `${ADDON_ID}/clear-highlight`,
  /** Manager → Preview: manually re-run the scan */
  RESCAN: `${ADDON_ID}/rescan`,
} as const;
