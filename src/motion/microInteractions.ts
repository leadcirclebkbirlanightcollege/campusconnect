import { useEffect, useRef, useState } from "react";
import type { Transition, Variants } from "framer-motion";
import {
  buildTransition,
  MOTION_EASING,
  MOTION_MS,
  MOTION_SPECIAL_MS,
  msToSeconds,
} from "@/motion/motionTokens";

export const PROGRESS_RING_TRANSITION: Transition = buildTransition(MOTION_SPECIAL_MS.progressRing);

export const NOTIFICATION_BELL_VARIANTS: Variants = {
  idle: { scale: 1, y: 0, translateZ: 0 },
  alert: {
    scale: [1, 1.06, 1],
    y: [0, -2, 0],
    translateZ: 0,
    transition: buildTransition(MOTION_MS.fast),
  },
};

export const SECTION_REVEAL_PARENT: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: msToSeconds(MOTION_SPECIAL_MS.sectionStagger),
    },
  },
};

export const SECTION_REVEAL_ITEM: Variants = {
  hidden: { opacity: 0, y: 10, translateZ: 0 },
  show: {
    opacity: 1,
    y: 0,
    translateZ: 0,
    transition: buildTransition(MOTION_MS.medium),
  },
};

export const BELL_GLOW_TRANSITION: Transition = {
  duration: msToSeconds(MOTION_MS.slow),
  ease: MOTION_EASING,
};

export function useCountUp(target: number, duration: number = MOTION_SPECIAL_MS.metricCount): number {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return count;
}
