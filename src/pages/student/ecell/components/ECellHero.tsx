import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Store, CalendarDays, Coins, Sparkles } from "@/components/icons";
import { ECELL_ASSETS } from "../ecell-tokens";
import { cn } from "@/lib/utils";

interface ECellHeroProps {
  onExploreClick?: () => void;
  stallCount?: number;
}

const LIFECYCLE_STEPS = [
  { label: "Ideas", desc: "Ignite & validate" },
  { label: "Innovation", desc: "Prototype & build" },
  { label: "Entrepreneurship", desc: "Launch & scale" },
  { label: "Impact", desc: "Community & growth" },
];

export function ECellHero({ onExploreClick, stallCount = 0 }: ECellHeroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#E8D98A] dark:border-[#3D3523] bg-[#FAF9F7] dark:bg-[#151410] p-5 sm:p-7 md:p-8"
      style={{
        boxShadow: "0 10px 40px -15px rgba(192, 134, 52, 0.16)",
      }}
    >
      {/* Subtle radial sunflower background highlight inspired by official logo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#FCE541]/20 dark:bg-[#FCE541]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#FAD943]/15 dark:bg-[#FAD943]/05 blur-3xl"
      />

      <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
        {/* Official E-Cell Logo Container - With generous whitespace & pristine surface */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative shrink-0"
        >
          <div className="relative flex h-28 w-28 sm:h-36 sm:w-36 md:h-40 md:w-40 items-center justify-center rounded-full bg-white dark:bg-[#1D1B17] p-2 sm:p-2.5 shadow-[0_8px_30px_-6px_rgba(192,134,52,0.30)] border-2 border-[#E8D98A] dark:border-[#C08634]/60">
            <img
              src={ECELL_ASSETS.logo}
              alt="Official E-Cell Logo - Vision to Venture - BKBNC"
              className="h-full w-full object-contain rounded-full select-none"
              loading="eager"
            />
          </div>
          {/* Subtle sunflower badge pill */}
          <div className="absolute -bottom-2 inset-x-0 mx-auto w-fit">
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider bg-[#FCE541] text-[#000000] border border-[#C08634]/40 shadow-sm">
              <Sparkles className="h-2.5 w-2.5" /> BKBNC
            </span>
          </div>
        </motion.div>

        {/* Hero Content Hierarchy */}
        <div className="min-w-0 flex-1 text-center md:text-left space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.20em] text-[#C08634] dark:text-[#FAD943]">
              {ECELL_ASSETS.college}
            </p>
            <h1 className="text-[26px] sm:text-[34px] md:text-[38px] font-black tracking-tight text-[#000000] dark:text-white leading-[1.12]">
              {ECELL_ASSETS.organization}
            </h1>
            <p className="text-[15px] sm:text-[17px] font-semibold italic text-[#593018] dark:text-[#D8C7A5]">
              &ldquo;{ECELL_ASSETS.tagline}&rdquo;
            </p>
          </div>

          <p className="text-[13px] sm:text-[14px] text-[#593018]/90 dark:text-muted-foreground leading-relaxed max-w-xl mx-auto md:mx-0">
            Fostering entrepreneurial mindsets, nurturing student-led ventures,
            and providing hands-on platforms for innovation, stall hosting, and pitch competitions.
          </p>

          {/* Philosophy Lifecycle Ribbon: IDEAS → INNOVATION → ENTREPRENEURSHIP → IMPACT */}
          <div className="pt-2">
            <div className="inline-flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2 rounded-xl border border-[#E8D98A]/60 dark:border-[#3D3523] bg-white/80 dark:bg-[#1D1B17]/80 backdrop-blur-sm p-1.5 sm:p-2">
              {LIFECYCLE_STEPS.map((step, idx) => (
                <React.Fragment key={step.label}>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C08634]" />
                    <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-[#000000] dark:text-white">
                      {step.label}
                    </span>
                  </div>
                  {idx < LIFECYCLE_STEPS.length - 1 && (
                    <span className="text-[11px] font-bold text-[#C08634] select-none">
                      →
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3">
            <Link
              to="/app/ecell/stalls"
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] sm:text-[13.5px] font-bold text-[#000000]",
                "bg-[#FCE541] hover:bg-[#FAD943] active:bg-[#C08634] active:text-white",
                "border border-[#C08634]/40 shadow-[0_4px_14px_-3px_rgba(192,134,52,0.40)]",
                "transition-all duration-200 active:scale-95"
              )}
            >
              <Store className="h-4 w-4" />
              Register a Stall
              {stallCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#000000] text-[#FCE541]">
                  {stallCount}
                </span>
              )}
            </Link>

            <Link
              to="/app/events"
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] sm:text-[13.5px] font-bold",
                "bg-white dark:bg-[#1D1B17] text-[#000000] dark:text-white",
                "border border-[#E8D98A] dark:border-[#3D3523] hover:border-[#C08634]",
                "hover:bg-[#FAF9F7] dark:hover:bg-[#23201B] shadow-sm",
                "transition-all duration-200 active:scale-95"
              )}
            >
              <CalendarDays className="h-4 w-4 text-[#C08634]" />
              Explore Events
              <ArrowRight className="h-3.5 w-3.5 ml-0.5 text-[#593018] dark:text-muted-foreground" />
            </Link>

            <Link
              to="/app/points"
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] sm:text-[12.5px] font-semibold",
                "text-[#593018] dark:text-[#D8C7A5] hover:text-[#000000] dark:hover:text-white",
                "hover:bg-[#FCE541]/15 transition-colors"
              )}
            >
              <Coins className="h-3.5 w-3.5 text-[#C08634]" />
              Submit Idea & Claim Points
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
