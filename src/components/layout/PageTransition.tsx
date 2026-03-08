/**
 * PAGE TRANSITION WRAPPER
 * Smooth fade + slight translateY transition between route changes.
 * Drop this around <Outlet /> to get SPA-quality page transitions.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ReactNode } from "react";
import {
  PAGE_TRANSITION,
  PAGE_TRANSITION_STYLE,
  PAGE_TRANSITION_VARIANTS,
} from "@/motion/pageTransitions";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={PAGE_TRANSITION_VARIANTS}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={PAGE_TRANSITION}
        style={PAGE_TRANSITION_STYLE}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
