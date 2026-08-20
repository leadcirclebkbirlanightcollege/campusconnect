/**
 * ModuleHero — premium Deep Navy hero card per design specification.
 *
 * Provides a rich, commanding header with deep navy background,
 * crisp white typography, and optional stat rail.
 */

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "@/components/icons";
import { cn } from "@/lib/utils";

export type ModuleTone = "academics" | "community" | "ecell" | "profile" | "brand";

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
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl md:rounded-3xl",
        "bg-gradient-to-br from-navy-deep via-navy-card to-navy-light text-white p-5 md:p-6 shadow-md",
        stats?.length ? "pb-6" : "pb-5",
        className,
      )}
    >
      {/* Subtle abstract geometric glow circles */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/20 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-1/3 -bottom-10 h-32 w-32 rounded-full bg-white/5 blur-xl"
      />

      <div className="relative z-10">
        <div className="flex items-start gap-3">
          {back && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm transition active:scale-95 hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4 text-white" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/70">
                {eyebrow}
              </p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              {Icon && (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
              )}
              <h1 className="font-heading text-xl sm:text-2xl font-black leading-tight tracking-tight text-white">
                {title}
              </h1>
            </div>
            {subtitle && (
              <p className="mt-1 text-xs sm:text-sm leading-snug text-white/80">{subtitle}</p>
            )}
          </div>

          {action && <div className="shrink-0">{action}</div>}
        </div>

        {children && <div className="mt-3.5">{children}</div>}
      </div>

      {/* Inline stat rail */}
      {!!stats?.length && (
        <div className="relative z-10 mt-4 grid grid-flow-col auto-cols-fr gap-2 sm:gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 + i * 0.04, duration: 0.2 }}
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm"
            >
              <p className="font-heading text-base sm:text-lg font-black leading-none tabular-nums text-white">
                {s.value}
              </p>
              <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wider text-white/70">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.header>
  );
}

/** Content that visually tucks under a ModuleHero */
export function HeroOverlap({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("relative -mt-4 px-1", className)}>{children}</div>;
}
