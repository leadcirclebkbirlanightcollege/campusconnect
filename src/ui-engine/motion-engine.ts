/**
 * MOTION ENGINE — GPU-safe animation primitives
 * Only animate: transform, opacity
 * Never animate: width, height, blur, background
 *
 * Durations: 120ms (micro), 180ms (entry), 240ms (complex)
 */

export type AnimationVariant = "fade" | "slide" | "scale" | "none";

export interface MotionConfig {
  variant?: AnimationVariant;
  duration?: 120 | 180 | 240;
  delay?: number;
  stagger?: number;
}

/** CSS animation class map */
export const ANIMATION_MAP: Record<AnimationVariant, string> = {
  fade:  "animate-fade-in",
  slide: "animate-slide-up",
  scale: "animate-scale-in",
  none:  "",
};

/** Get inline style for animation timing */
export function getMotionStyle(
  duration: number = 150,
  delay: number = 0
): React.CSSProperties {
  return {
    animationDuration: `${duration}ms`,
    animationDelay: delay > 0 ? `${delay}ms` : undefined,
    animationFillMode: "both",
  };
}

/** Stagger delay calculator for list items */
export function staggerDelay(index: number, base = 0, step = 40): number {
  return base + index * step;
}

/** Permitted CSS transition properties (GPU-safe only) */
export const SAFE_TRANSITIONS = [
  "opacity",
  "transform",
] as const;

export type SafeTransitionProp = typeof SAFE_TRANSITIONS[number];
