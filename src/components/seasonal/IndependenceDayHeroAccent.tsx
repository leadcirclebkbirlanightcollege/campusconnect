/**
 * Subtle Independence Day treatment for the dashboard hero.
 * Renders nothing outside the campaign window.
 */

import { motion, useReducedMotion } from "framer-motion";
import { TRICOLOUR, isIndependenceDayActive, isIndependenceDayItself } from "@/config/seasonal";
import AshokaChakra from "@/components/seasonal/AshokaChakra";

export function useIndependenceDay() {
  return { active: isIndependenceDayActive(), isTheDay: isIndependenceDayItself() };
}

/** Animated tricolour line + faint chakra, absolutely positioned inside a relative hero */
export function IndependenceDayHeroAccent({ rounded = true }: { rounded?: boolean }) {
  const reduced = !!useReducedMotion();
  if (!isIndependenceDayActive()) return null;

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${TRICOLOUR.saffron}, #ffffff, ${TRICOLOUR.green})`,
          backgroundSize: "200% 100%",
        }}
        animate={reduced ? undefined : { backgroundPositionX: ["0%", "200%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-6 -right-6 opacity-[0.09]"
        style={{ willChange: "transform" }}
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
      >
        <AshokaChakra size={140} color="#FFFFFF" />
      </motion.div>
      {rounded && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] opacity-70"
          style={{
            background: `linear-gradient(90deg, ${TRICOLOUR.green}, #ffffff, ${TRICOLOUR.saffron})`,
          }}
        />
      )}
    </>
  );
}

/** Small seasonal chip — safe copy, no invented anniversary number */
export function IndependenceDayBadge({ className }: { className?: string }) {
  if (!isIndependenceDayActive()) return null;
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white " +
        (className ?? "")
      }
      style={{
        borderColor: "rgba(255,255,255,0.25)",
        background: `linear-gradient(100deg, ${TRICOLOUR.saffron}33, #ffffff22, ${TRICOLOUR.green}33)`,
      }}
    >
      🇮🇳 Independence Day Edition
    </span>
  );
}

/** One-line patriotic greeting for the hero */
export function IndependenceDayGreeting({ className }: { className?: string }) {
  if (!isIndependenceDayActive()) return null;
  return (
    <p className={"text-[12px] font-semibold text-white/80 " + (className ?? "")}>
      {isIndependenceDayItself()
        ? "Happy Independence Day — celebrating the spirit of freedom 🇮🇳"
        : "Celebrating the Spirit of Freedom 🇮🇳"}
    </p>
  );
}
