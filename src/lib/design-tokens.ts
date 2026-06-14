/* Design tokens for NextTrainCard — avoids magic numbers in inline styles
   while keeping styles inspectable in unit tests (jsdom does not apply CSS modules). */

/** Primary text color — #1a1a1a on white = 16.1:1 contrast ratio (WCAG AAA) */
export const COLOR_TEXT_PRIMARY = "#1a1a1a" as const;

/** ETA minutes display — dominant typographic element on the screen */
export const FONT_SIZE_ETA = "48px" as const;

/** "min" unit label next to ETA */
export const FONT_SIZE_ETA_UNIT = "20px" as const;

/** Platform label */
export const FONT_SIZE_PLATFORM = "16px" as const;

/** Destination label */
export const FONT_SIZE_DESTINATION = "18px" as const;

/** Secondary / error text */
export const FONT_SIZE_SMALL = "14px" as const;
