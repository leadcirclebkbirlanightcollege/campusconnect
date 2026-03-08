/**
 * CAMPUS CONNECT — DESIGN TOKENS (Master Barrel)
 *
 * Single import for all design system constants.
 *
 * Usage:
 *   import { T } from "@/design/tokens"
 *   className={T.type.bodyMedium}
 *   className={T.radius.large}
 */

export { COLORS, COLOR_CLASSES }        from "./colors";
export { SPACING, SPACING_PX, PADDING, TAP_TARGET, WIDTHS } from "./spacing";
export { TYPE }                          from "./typography";
export { RADIUS, RADIUS_PX }            from "./radius";
export { SHADOW, SHADOW_VARS }          from "./shadows";

import { COLORS, COLOR_CLASSES }        from "./colors";
import { SPACING, SPACING_PX, PADDING, TAP_TARGET, WIDTHS } from "./spacing";
import { TYPE }                          from "./typography";
import { RADIUS, RADIUS_PX }            from "./radius";
import { SHADOW, SHADOW_VARS }          from "./shadows";

/**
 * Shorthand namespace — use T.type, T.radius, T.shadow, T.spacing, T.color
 */
export const T = {
  color:   COLOR_CLASSES,
  spacing: SPACING,
  pad:     PADDING,
  type:    TYPE,
  radius:  RADIUS,
  shadow:  SHADOW,
  tap:     TAP_TARGET,
  width:   WIDTHS,
} as const;

/** Motion duration tokens (ms) */
export const MOTION = {
  fast:   120,
  medium: 180,
  slow:   240,
} as const;

/** Easing functions */
export const EASING = {
  out:    "cubic-bezier(0.0, 0, 0.2, 1)",
  inOut:  "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;
