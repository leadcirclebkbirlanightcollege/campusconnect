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
  const reduced = !!useReducedMotion();
  if (!isIndependenceDayActive()) return null;
  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-[5px]",
        "text-[9.5px] font-bold uppercase tracking-[0.16em] backdrop-blur-md",
        tone === "onDark" ? "text-white/95" : "text-foreground",
        className,
      )}
      style={{
        borderColor: tone === "onDark" ? "rgba(255,255,255,0.22)" : `${TRICOLOUR.saffron}44`,
        background:
          tone === "onDark"
            ? "linear-gradient(100deg, rgba(255,153,51,0.20) 0%, rgba(255,255,255,0.12) 50%, rgba(19,136,8,0.20) 100%)"
            : seasonalGradientSoft,
        boxShadow:
          tone === "onDark"
            ? "0 0 0 1px rgba(255,255,255,0.04), 0 6px 18px -10px rgba(255,153,51,0.55)"
            : undefined,
      }}
    >
      {!reduced && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-1/3"
          style={{
            background:
              "linear-gradient(100deg, transparent, rgba(255,255,255,0.35), transparent)",
          }}
          initial={{ x: "-140%" }}
          animate={{ x: ["-140%", "340%"] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.2 }}
        />
      )}
      <span className="relative">🇮🇳 {label}</span>
    </span>
  );
}

/* ── Hero atmosphere (light beams + chakra + particles) ─── */

function SeasonalParticles({ count = 12, reduced }: { count?: number; reduced: boolean }) {
  const dots = React.useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: (i * 41) % 96,
        delay: (i % 6) * 0.7,
        duration: 9 + (i % 5) * 2,
        size: 2 + (i % 3),
        color:
          i % 3 === 0 ? TRICOLOUR.saffron : i % 3 === 1 ? TRICOLOUR.green : "#FFFFFF",
      })),
    [count],
  );
  if (reduced) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {dots.map((d) => (
        <motion.span
          key={d.id}
          className="absolute rounded-full"
          style={{
            left: `${d.left}%`,
            width: d.size,
            height: d.size,
            background: d.color,
            filter: "blur(0.3px)",
            willChange: "transform, opacity",
          }}
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: "-20%", opacity: [0, 0.45, 0] }}
          transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

/**
 * Cinematic hero layer: three soft tricolour light beams, a cropped rotating
 * Chakra and drifting particles. Drop inside any `relative overflow-hidden` hero.
 */
export function SeasonalHeroAtmosphere({
  chakraSize = 300,
  particles = 12,
  className,
}: {
  chakraSize?: number;
  particles?: number;
  className?: string;
}) {
  const reduced = !!useReducedMotion();
  if (!isIndependenceDayActive()) return null;

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {/* Soft tricolour light beams */}
      <div
        className="absolute inset-0"
        style={{
          background:
            `radial-gradient(58% 46% at 4% 8%, ${TRICOLOUR.saffron}30 0%, transparent 62%),` +
            `radial-gradient(52% 42% at 50% 0%, rgba(255,255,255,0.16) 0%, transparent 60%),` +
            `radial-gradient(58% 46% at 98% 92%, ${TRICOLOUR.green}30 0%, transparent 62%)`,
        }}
      />
      <motion.div
        className="absolute -inset-x-10 top-0 h-full"
        style={{
          background:
            `linear-gradient(112deg, transparent 12%, ${TRICOLOUR.saffron}22 24%, rgba(255,255,255,0.14) 34%, ${TRICOLOUR.green}22 44%, transparent 58%)`,
          filter: "blur(22px)",
          willChange: "transform",
        }}
        animate={reduced ? undefined : { x: ["-12%", "12%", "-12%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Cropped chakra with radial glow */}
      <motion.div
        className="absolute -right-16 -bottom-24"
        style={{ willChange: "transform" }}
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 160, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute inset-0 rounded-full blur-3xl"
          style={{ background: `${TRICOLOUR.saffron}18` }}
        />
        <AshokaChakra size={chakraSize} color="#FFFFFF" opacity={0.07} />
      </motion.div>

      <SeasonalParticles count={particles} reduced={reduced} />
    </div>
  );
}

/* ── Light beam hairline (replaces the flat 3px line) ───── */

export function SeasonalLightLine({
  position = "top",
  className,
}: {
  position?: "top" | "bottom";
  className?: string;
}) {
  if (!isIndependenceDayActive()) return null;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 h-8 z-10",
        position === "top" ? "top-0" : "bottom-0",
        className,
      )}
    >
      <div className="absolute inset-x-0 h-[2px] opacity-80" style={{ top: position === "top" ? 0 : "auto", bottom: position === "top" ? "auto" : 0, background: seasonalGradient }} />
      <div
        className="absolute inset-x-0 h-8 opacity-40"
        style={{ background: seasonalGradient, filter: "blur(14px)" }}
      />
    </div>
  );
}

/* ── Avatar / icon tricolour ring ───────────────────────── */

export function SeasonalRing({ className }: { className?: string }) {
  if (!isIndependenceDayActive()) return null;
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute -inset-[2px] rounded-full", className)}
      style={{
        padding: 1.5,
        background: seasonalGradient,
        opacity: 0.75,
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }}
    />
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
