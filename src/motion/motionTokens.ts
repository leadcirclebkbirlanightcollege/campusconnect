import type { Transition } from "framer-motion";

export const MOTION_MS = {
  fast: 120,
  medium: 180,
  slow: 240,
} as const;

export const MOTION_SPECIAL_MS = {
  metricCount: 800,
  progressRing: 700,
  sectionStagger: 60,
} as const;

export const MOTION_EASING = [0, 0, 0.2, 1] as const;

export const GPU_MOTION_STYLE = {
  willChange: "transform, opacity",
  transform: "translate3d(0, 0, 0)",
} as const;

export const SAFE_MOTION_PROPERTIES = ["transform", "opacity"] as const;

export const msToSeconds = (ms: number): number => ms / 1000;

export const buildTransition = (durationMs: number): Transition => ({
  duration: msToSeconds(durationMs),
  ease: MOTION_EASING,
});
