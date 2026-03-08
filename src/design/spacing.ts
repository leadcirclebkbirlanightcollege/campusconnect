/**
 * CAMPUS CONNECT — SPACING SCALE
 *
 * Strict 4px-base grid. Only these values are permitted.
 * Maps to Tailwind spacing scale.
 */

/** Raw pixel values */
export const SPACING_PX = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
} as const;

/** Tailwind spacing class tokens */
export const SPACING = {
  /** 4px — micro gap between icon + label */
  xs:    "gap-1",
  /** 8px — tight internal spacing */
  sm:    "gap-2",
  /** 12px — component gap */
  md:    "gap-3",
  /** 16px — standard card padding / side padding */
  base:  "gap-4",
  /** 20px — relaxed component spacing */
  lg:    "gap-5",
  /** 24px — section gap */
  xl:    "gap-6",
  /** 32px — page section spacing */
  "2xl": "gap-8",
  /** 40px — large section breaks */
  "3xl": "gap-10",
  /** 48px — minimum tap target height */
  "4xl": "gap-12",
} as const;

/** Padding tokens */
export const PADDING = {
  /** Standard side page padding: 16px */
  page:   "px-4",
  /** Card internal padding: 16px */
  card:   "p-4",
  /** Compact card: 12px */
  cardSm: "p-3",
  /** Relaxed card: 20px */
  cardLg: "p-5",
  /** Section vertical padding */
  section: "py-6",
} as const;

/** Minimum tap target */
export const TAP_TARGET = "min-h-[48px]" as const;

/** Layout widths */
export const WIDTHS = {
  /** Primary mobile target */
  mobileMax:  "max-w-[420px]",
  /** Tablet breakpoint */
  tabletMax:  "max-w-[768px]",
  /** Full desktop layout */
  desktopMax: "max-w-[1280px]",
} as const;
