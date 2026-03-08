import type { Transition, Variants } from "framer-motion";
import { buildTransition, GPU_MOTION_STYLE, MOTION_MS } from "@/motion/motionTokens";

export const PAGE_TRANSITION: Transition = buildTransition(MOTION_MS.medium);

export const PAGE_TRANSITION_VARIANTS: Variants = {
  initial: { opacity: 0, y: 10, translateZ: 0 },
  animate: { opacity: 1, y: 0, translateZ: 0 },
  exit: { opacity: 0, y: -6, translateZ: 0 },
};

export const PAGE_TRANSITION_STYLE = {
  width: "100%",
  ...GPU_MOTION_STYLE,
} as const;
