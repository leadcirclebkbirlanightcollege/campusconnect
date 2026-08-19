/**
 * ModuleHero — premium curved gradient hero with per-module colour identity.
 *
 * Each module gets its own accent so navigating the app feels like moving
 * between rooms of the same building, not between different websites.
 */

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "@/components/icons";
import { cn } from "@/lib/utils";
import { SeasonalHeroAtmosphere, SeasonalLightLine } from "@/components/seasonal/SeasonalKit";

export type ModuleTone = "academics" | "community" | "ecell" | "profile" | "brand";

const TONE_VAR: Record<ModuleTone, string> = {
  academics: "var(--module-academics)",
  community: "var(--module-community)",
  ecell: "var(--module-ecell)",
  profile: "var(--module-profile)",
  brand: "var(--module-brand)",
};

export interface HeroStat {
  label: string;
  value: React.ReactNode;
  hint?: string;
}

interface ModuleHeroProps {
  tone?: ModuleTone;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  stats?: HeroStat[];
  back?: boolean;
  onBack?: () => void;
  action?: React.ReactNode;
  /** Extra content rendered under the title (chips, search, etc.) */
  children?: React.ReactNode;
  className?: string;
}

export function ModuleHero({
  tone = "brand",
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  stats,
  back,
  onBack,
  action,
  children,
  className,
}: ModuleHeroProps) {
  const accent = TONE_VAR[tone];

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0, 0, 0.2, 1] }}
      style={
        {
          "--hero": accent,
          backgroundImage: `linear-gradient(145deg, hsl(${accent}) 0%, hsl(${accent} / 0.92) 45%, hsl(${accent} / 0.72) 100%)`,
        } as React.CSSProperties
      }
      className={cn(
        "relative overflow-hidden rounded-b-[28px] px-5 pt-5 text-white",
        stats?.length ? "pb-14" : "pb-8",
        className,
      )}
    >
      {/* light bloom + grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(120%_90%_at_15%_0%,rgba(255,255,255,0.32),transparent_58%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl"
      />

      {/* Seasonal layer (auto-disabled outside the campaign window) */}
      <SeasonalHeroAtmosphere chakraSize={220} particles={8} />
      <SeasonalLightLine position="top" />


      <div className="relative">
        <div className="flex items-start gap-3">
          {back && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm transition active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/75">
                {eyebrow}
              </p>
            )}
            <div className="flex items-center gap-2">
              {Icon && (
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/12">
                  <Icon className="h-4 w-4" />
                </span>
              )}
              <h1 className="font-heading text-[25px] font-black leading-tight tracking-[-0.03em]">
                {title}
              </h1>
            </div>
            {subtitle && (
              <p className="mt-1 text-[12.5px] leading-snug text-white/80">{subtitle}</p>
            )}
          </div>

          {action && <div className="shrink-0">{action}</div>}
        </div>

        {children && <div className="mt-4">{children}</div>}
      </div>

      {/* Inline stat rail */}
      {!!stats?.length && (
        <div className="relative mt-5 grid grid-flow-col auto-cols-fr gap-2">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.05, duration: 0.22 }}
              className="rounded-2xl border border-white/15 bg-white/12 px-2.5 py-2 backdrop-blur-sm"
            >
              <p className="font-heading text-[17px] font-bold leading-none tabular-nums">
                {s.value}
              </p>
              <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-wide text-white/70">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.header>
  );
}

/** Content that visually tucks under a ModuleHero's curve. */
export function HeroOverlap({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("relative -mt-8 px-4", className)}>{children}</div>;
}
