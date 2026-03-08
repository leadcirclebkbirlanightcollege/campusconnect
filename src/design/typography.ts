/**
 * CAMPUS CONNECT — TYPOGRAPHY SYSTEM
 *
 * Locked type scale — do not introduce new font sizes outside this system.
 * All text in the application must use one of these tokens.
 */

/** Tailwind class combinations for each type token */
export const TYPE = {
  /** Hero display — page banners, splash screens */
  displayLarge:  "text-[32px] font-bold   leading-[1.15] tracking-[-0.03em]",

  /** Section display — dashboard greetings, modal titles */
  displayMedium: "text-[26px] font-bold   leading-[1.2]  tracking-[-0.025em]",

  /** Page headings — H1 equivalent */
  headingLarge:  "text-[22px] font-semibold leading-[1.25] tracking-[-0.02em]",

  /** Sub-page headings — H2 equivalent */
  headingMedium: "text-[18px] font-semibold leading-[1.3]  tracking-[-0.015em]",

  /** Section headings — H3 equivalent */
  headingSmall:  "text-[15px] font-semibold leading-[1.4]",

  /** Primary readable body text */
  bodyLarge:  "text-[16px] font-normal leading-[1.6]",

  /** Default body text */
  bodyMedium: "text-[14px] font-normal leading-[1.6]",

  /** Small body / secondary info */
  bodySmall:  "text-[13px] font-normal leading-[1.55]",

  /** Caption / timestamps / metadata */
  caption:    "text-[12px] font-medium leading-[1.5]  text-muted-foreground",

  /** Overline / category labels */
  label:      "text-[11px] font-semibold leading-[1.4] uppercase tracking-[0.08em] text-muted-foreground",

  /** Numeric metrics — tabular, bold */
  metric:     "text-[28px] font-bold   leading-[1.1]  tabular-nums tracking-[-0.02em]",
  metricSm:   "text-[20px] font-bold   leading-[1.1]  tabular-nums",
  metricLg:   "text-[38px] font-extrabold leading-[1.0] tabular-nums tracking-[-0.03em]",
} as const;

export type TypeToken = keyof typeof TYPE;
