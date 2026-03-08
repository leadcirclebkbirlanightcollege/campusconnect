/**
 * CAMPUS CONNECT — SHADOW & DEPTH SYSTEM
 *
 * Layered elevation model — each level implies a higher z-index.
 * Glass surfaces use backdrop-blur + border, not heavy drop shadows.
 *
 * Glow shadows are reserved for primary action elements.
 */

/** Tailwind shadow class tokens */
export const SHADOW = {
  /** Hairline — barely there, for flat cards on light bg */
  none:     "shadow-none",

  /** Soft — default card elevation */
  soft:     "shadow-xs",

  /** Card — standard interactive card */
  card:     "shadow-sm",

  /** Elevated — modals, dropdowns, popovers */
  elevated: "shadow-md",

  /** Lifted — hero cards, featured panels */
  lifted:   "shadow-lg",

  /** Glow — primary CTA buttons, active states */
  glow:     "shadow-primary",

  /** Success glow */
  glowSuccess: "[box-shadow:0_4px_20px_-4px_hsl(var(--success)/0.40)]",

  /** Warning glow */
  glowWarning: "[box-shadow:0_4px_20px_-4px_hsl(var(--warning)/0.40)]",

  /** Gold glow — premium / tier indicators */
  glowGold: "[box-shadow:0_4px_20px_-4px_hsl(var(--gold)/0.45)]",

  /** Accent glow — futuristic highlight */
  glowAccent: "[box-shadow:0_0_28px_-6px_hsl(var(--accent-glow)/0.55),0_4px_12px_-4px_hsl(var(--primary)/0.30)]",
} as const;

/** CSS variable references for inline usage */
export const SHADOW_VARS = {
  xs:      "var(--shadow-xs)",
  sm:      "var(--shadow-sm)",
  md:      "var(--shadow-md)",
  lg:      "var(--shadow-lg)",
  primary: "var(--shadow-primary)",
  glow:    "var(--shadow-glow)",
} as const;

export type ShadowToken = keyof typeof SHADOW;
