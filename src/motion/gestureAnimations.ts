import type { TargetAndTransition, Transition } from "framer-motion";
import { buildTransition, MOTION_MS } from "@/motion/motionTokens";

export const BUTTON_TAP_ANIMATION: TargetAndTransition = {
  scale: 0.96,
};

export const CARD_TAP_ANIMATION: TargetAndTransition = {
  scale: 0.97,
};

export const PRESS_TRANSITION: Transition = buildTransition(MOTION_MS.fast);
