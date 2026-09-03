/**
 * ECellJourneySection — The Vision to Venture Journey
 *
 * 4 connected progressive stages:
 * STEP 01: Ideas & Ideation
 * STEP 02: Hands-on Workshops
 * STEP 03: Campus Stalls
 * STEP 04: Impact & Awards
 *
 * Features continuous connecting timeline lines on both desktop and mobile,
 * numbered step badges, official brand palette (#FCE541, #C08634, #000000, #593018),
 * and clear actionable CTAs with zero horizontal overflow.
 */
import React from "react";
import { Link } from "react-router-dom";
import {
  Lightbulb,
  GraduationCap,
  Store,
  Trophy,
  ArrowRight,
  Rocket,
} from "@/components/icons";
import { ECellSectionHeader } from "./ECellSectionHeader";
import { cn } from "@/lib/utils";

interface JourneyStage {
  step: string;
  title: string;
  tagline: string;
  description: string;
  ctaText: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const JOURNEY_STAGES: JourneyStage[] = [
  {
    step: "01",
    title: "Ideas & Ideation",
    tagline: "Ignite & Validate",
    description:
      "Transform raw concepts into validated problem statements with peer feedback and venture mentorship.",
    ctaText: "Submit Idea",
    href: "/app/points",
    icon: Lightbulb,
  },
  {
    step: "02",
    title: "Hands-on Workshops",
    tagline: "Build & Prototype",
    description:
      "Master business models, unit economics, legal basics, and pitch deck preparation with startup founders.",
    ctaText: "View Schedule",
    href: "/app/events",
    icon: GraduationCap,
  },
  {
    step: "03",
    title: "Campus Stalls",
    tagline: "Test & Commercialize",
    description:
      "Launch your product or culinary venture at high-footfall college exhibitions with real transaction volume.",
    ctaText: "Register Stall",
    href: "/app/ecell/stalls",
    icon: Store,
  },
  {
    step: "04",
    title: "Impact & Awards",
    tagline: "Scale & Incubation",
    description:
      "Compete for seed grants, earn certified academic points, and pitch to regional incubator networks.",
    ctaText: "Leaderboard",
    href: "/app/leaderboard",
    icon: Trophy,
  },
];

export function ECellJourneySection() {
  return (
    <section className="space-y-4">
      <ECellSectionHeader
        title="The Vision to Venture Journey"
        subtitle="From initial concept to full-scale entrepreneurial impact"
        icon={Rocket}
        badge="4-Stage Pathway"
      />

      {/* ── Desktop Journey (Horizontal Connected Stepper) ──────────── */}
      <div className="hidden lg:block">
        <div className="relative rounded-2xl sm:rounded-3xl border border-[#E8D98A]/60 dark:border-[#3D3523] bg-card p-6 shadow-xs overflow-hidden">
          {/* Continuous Connecting Line Behind Step Nodes */}
          <div
            aria-hidden
            className="absolute top-[52px] left-[10%] right-[10%] h-[2.5px] -z-0 bg-gradient-to-r from-[#E8D98A]/40 via-[#C08634]/60 to-[#E8D98A]/40"
          />

          <div className="relative z-10 grid grid-cols-4 gap-4">
            {JOURNEY_STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.step}
                  className="group flex flex-col justify-between rounded-2xl border border-transparent p-4 transition-all duration-200 hover:border-[#E8D98A] hover:bg-[#FAF9F7]/70 dark:hover:bg-[#1C1A16] hover:shadow-md"
                >
                  <div className="space-y-3 text-center sm:text-left">
                    {/* Step Number + Icon Node */}
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FCE541] text-[#000000] font-black text-[13px] border-2 border-[#C08634] shadow-sm transition-transform duration-200 group-hover:scale-105">
                        {stage.step}
                      </div>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-[#23201B] text-[#C08634] dark:text-[#FCE541] border border-[#E8D98A]/70 shadow-xs">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#C08634] dark:text-[#FAD943]">
                        {stage.tagline}
                      </p>
                      <h4 className="text-[15px] font-bold text-[#000000] dark:text-white leading-snug">
                        {stage.title}
                      </h4>
                      <p className="text-[12px] text-[#593018]/85 dark:text-muted-foreground leading-relaxed">
                        {stage.description}
                      </p>
                    </div>
                  </div>

                  {/* Stage CTA Button */}
                  <div className="mt-4 pt-3 border-t border-[#E8D98A]/40">
                    <Link
                      to={stage.href}
                      className={cn(
                        "w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11.5px] font-bold text-[#000000]",
                        "bg-[#FAF9F7] dark:bg-[#23201B] hover:bg-[#FCE541] dark:hover:bg-[#FCE541] dark:hover:text-[#000000]",
                        "border border-[#E8D98A] hover:border-[#C08634] shadow-xs transition-all duration-150 active:scale-95"
                      )}
                    >
                      <span>{stage.ctaText}</span>
                      <ArrowRight className="h-3 w-3 text-[#C08634] group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Mobile & Tablet Journey (Vertical Continuous Timeline) ──── */}
      <div className="lg:hidden relative">
        <div className="relative pl-6 sm:pl-8 space-y-4">
          {/* Vertical Connecting Line */}
          <div
            aria-hidden
            className="absolute top-4 bottom-4 left-[15px] sm:left-[19px] w-[2px] bg-gradient-to-b from-[#C08634] via-[#E8D98A] to-[#C08634]/40"
          />

          {JOURNEY_STAGES.map((stage) => {
            const Icon = stage.icon;
            return (
              <div key={stage.step} className="relative group">
                {/* Timeline Step Indicator Circle */}
                <div className="absolute -left-[24px] sm:-left-[32px] top-4.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#FCE541] text-[#000000] font-black text-[11px] sm:text-[12px] border-2 border-[#C08634] shadow-sm z-10">
                  {stage.step}
                </div>

                {/* Card Body */}
                <div
                  className={cn(
                    "rounded-2xl border border-[#E8D98A]/60 dark:border-[#3D3523] bg-card p-4 sm:p-5",
                    "transition-all duration-200 hover:border-[#C08634] hover:shadow-md"
                  )}
                  style={{
                    boxShadow: "0 2px 10px -2px rgba(192, 134, 52, 0.05)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#C08634] dark:text-[#FAD943]">
                          STAGE {stage.step} • {stage.tagline}
                        </span>
                      </div>
                      <h4 className="text-[15px] font-bold text-[#000000] dark:text-white">
                        {stage.title}
                      </h4>
                      <p className="text-[12px] text-[#593018]/85 dark:text-muted-foreground leading-relaxed pt-0.5">
                        {stage.description}
                      </p>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FAF9F7] dark:bg-[#1E1C18] text-[#C08634] dark:text-[#FCE541] border border-[#E8D98A]/60">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-[#E8D98A]/30 flex items-center justify-between">
                    <span className="text-[10.5px] text-[#593018]/70 dark:text-muted-foreground font-medium">
                      Official E-Cell Milestone
                    </span>
                    <Link
                      to={stage.href}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-bold text-[#000000]",
                        "bg-[#FCE541] hover:bg-[#FAD943] active:bg-[#C08634] active:text-white",
                        "border border-[#C08634]/50 shadow-xs transition-all active:scale-95"
                      )}
                    >
                      <span>{stage.ctaText}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
