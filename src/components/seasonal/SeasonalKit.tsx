/**
 * SEASONAL KIT — reusable Independence Day visual primitives.
 *
 * Single source of truth for seasonal rendering. Every primitive returns
 * `null` when the campaign window in `src/config/seasonal.ts` is inactive,
 * so screens degrade back to the normal Campus Connect design automatically.
 *
 * Never hard-code dates in a screen — always use these primitives or `useSeasonal()`.
 */

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  TRICOLOUR,
  isIndependenceDayActive,
  isIndependenceDayItself,
} from "@/config/seasonal";
import AshokaChakra from "@/components/seasonal/AshokaChakra";

/* ── Tokens ─────────────────────────────────────────────── */

export const seasonalColors = TRICOLOUR;

export const seasonalGradient = `linear-gradient(90deg, ${TRICOLOUR.saffron} 0%, #FFFFFF 50%, ${TRICOLOUR.green} 100%)`;
export const seasonalGradientSoft = `linear-gradient(100deg, ${TRICOLOUR.saffron}33 0%, #FFFFFF22 50%, ${TRICOLOUR.green}33 100%)`;

/* ── Hook ───────────────────────────────────────────────── */

export function useSeasonal() {
  return React.useMemo(
    () => ({ active: isIndependenceDayActive(), isTheDay: isIndependenceDayItself() }),
    [],
  );
}

/* ── Accent line (headers, heroes, sheets, dialogs) ─────── */

interface AccentProps {
  /** "top" | "bottom" — where the hairline sits inside a relative parent */
  position?: "top" | "bottom";
  className?: string;
  /** Animate the gradient sweep (auto-disabled for reduced motion) */
  animated?: boolean;
}

export function SeasonalAccent({ position = "top", className, animated = true }: AccentProps) {
  const reduced = !!useReducedMotion();
  if (!isIndependenceDayActive()) return null;

  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 h-[3px] z-10",
        position === "top" ? "top-0" : "bottom-0",
        className,
      )}
      style={{ background: seasonalGradient, backgroundSize: "200% 100%" }}
      animate={animated && !reduced ? { backgroundPositionX: ["0%", "200%"] } : undefined}
      transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* ── Divider (between sections / list groups) ───────────── */

export function SeasonalDivider({ className }: { className?: string }) {
  if (!isIndependenceDayActive()) return null;
  return (
    <div
      aria-hidden="true"
      className={cn("h-px w-full rounded-full opacity-60", className)}
      style={{ background: seasonalGradient }}
    />
  );
}

/* ── Badge (hero chips, section tags) ───────────────────── */

export function SeasonalBadge({
  label = "Independence Day Edition",
  tone = "onDark",
  className,
}: {
  label?: string;
  tone?: "onDark" | "onLight";
  className?: string;
}) {
  if (!isIndependenceDayActive()) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-[10px] font-bold uppercase tracking-[0.12em]",
        tone === "onDark" ? "text-white" : "text-foreground",
        className,
      )}
      style={{
        borderColor: tone === "onDark" ? "rgba(255,255,255,0.25)" : `${TRICOLOUR.saffron}55`,
        background: seasonalGradientSoft,
      }}
    >
      🇮🇳 {label}
    </span>
  );
}

/* ── Background (hero lighting + Chakra watermark) ──────── */

export function SeasonalBackground({
  chakra = true,
  chakraSize = 160,
  chakraColor = "#FFFFFF",
  glow = true,
  className,
}: {
  chakra?: boolean;
  chakraSize?: number;
  chakraColor?: string;
  glow?: boolean;
  className?: string;
}) {
  const reduced = !!useReducedMotion();
  if (!isIndependenceDayActive()) return null;

  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {glow && (
        <>
          <div
            className="absolute -top-20 -left-16 h-48 w-48 rounded-full blur-3xl"
            style={{ background: `${TRICOLOUR.saffron}22` }}
          />
          <div
            className="absolute -bottom-24 -right-12 h-48 w-48 rounded-full blur-3xl"
            style={{ background: `${TRICOLOUR.green}22` }}
          />
        </>
      )}
      {chakra && (
        <motion.div
          className="absolute -bottom-8 -right-8 opacity-[0.08]"
          style={{ willChange: "transform" }}
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 140, repeat: Infinity, ease: "linear" }}
        >
          <AshokaChakra size={chakraSize} color={chakraColor} />
        </motion.div>
      )}
    </div>
  );
}

/* ── Card accent (thin tricolour edge on a card) ────────── */

export function SeasonalCardAccent({ className }: { className?: string }) {
  if (!isIndependenceDayActive()) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute left-4 right-4 top-0 h-[2px] rounded-full opacity-70",
        className,
      )}
      style={{ background: seasonalGradient }}
    />
  );
}

/* ── Greeting line ──────────────────────────────────────── */

export function SeasonalGreeting({
  className,
  tone = "onDark",
}: {
  className?: string;
  tone?: "onDark" | "onLight";
}) {
  if (!isIndependenceDayActive()) return null;
  return (
    <p
      className={cn(
        "text-[12px] font-semibold",
        tone === "onDark" ? "text-white/80" : "text-muted-foreground",
        className,
      )}
    >
      {isIndependenceDayItself()
        ? "Happy Independence Day — celebrating the spirit of freedom 🇮🇳"
        : "Celebrating the Spirit of Freedom 🇮🇳"}
    </p>
  );
}

/* ── Empty-state accent ─────────────────────────────────── */

export function SeasonalEmptyAccent({ className }: { className?: string }) {
  if (!isIndependenceDayActive()) return null;
  return (
    <div className={cn("pointer-events-none flex flex-col items-center gap-2", className)} aria-hidden="true">
      <AshokaChakra size={40} color={TRICOLOUR.saffron} opacity={0.25} />
      <span className="h-px w-16 rounded-full opacity-70" style={{ background: seasonalGradient }} />
    </div>
  );
}
