/**
 * CAMPUS CONNECT — RADIUS SYSTEM
 *
 * Consistent corner radius across the entire platform.
 * Maps CSS variable --radius (12px base) to semantic tokens.
 */

/** Tailwind radius tokens */
export const RADIUS = {
  /** 8px — small elements: badges, tags, chips */
  small:      "rounded-lg",         // 8px (calc(var(--radius) - 4px))

  /** 10px — medium elements: inputs, buttons */
  medium:     "rounded-[10px]",

  /** 12px — cards, modals, panels */
  large:      "rounded-xl",         // calc(var(--radius) - 0px) = 12px

  /** 16px — hero cards, featured content */
  extraLarge: "rounded-2xl",        // calc(var(--radius) + 4px)

  /** 24px — page sections, large containers */
  huge:       "rounded-[24px]",

  /** 9999px — pills, circular buttons */
  pill:       "rounded-full",
} as const;

/** Raw pixel values for SVG or inline styles */
export const RADIUS_PX = {
  small:      8,
  medium:     10,
  large:      12,
  extraLarge: 16,
  huge:       24,
  pill:       9999,
} as const;

export type RadiusToken = keyof typeof RADIUS;
