/**
 * PremiumEmpty — module-specific empty states.
 *
 * Each module gets its own hand-drawn SVG illustration + copy so no two
 * empty screens in the app look alike.
 */

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type EmptyArt =
  | "events"
  | "announcements"
  | "results"
  | "attendance"
  | "assignments"
  | "documents"
  | "circles"
  | "leaderboard"
  | "polls"
  | "messages"
  | "achievements"
  | "timetable"
  | "generic";

const stroke = "currentColor";

const ART: Record<EmptyArt, React.ReactNode> = {
  events: (
    <>
      <rect x="14" y="22" width="68" height="58" rx="12" stroke={stroke} strokeWidth="3" />
      <path d="M14 38h68" stroke={stroke} strokeWidth="3" />
      <path d="M32 14v14M64 14v14" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="59" r="11" stroke={stroke} strokeWidth="3" />
      <path d="M48 53v7l5 3" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  announcements: (
    <>
      <path d="M20 40v16a6 6 0 0 0 6 6h6l26 16V18L32 34h-6a6 6 0 0 0-6 6Z" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
      <path d="M70 36a16 16 0 0 1 0 24" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <path d="M78 28a28 28 0 0 1 0 40" stroke={stroke} strokeWidth="3" strokeLinecap="round" opacity=".5" />
    </>
  ),
  results: (
    <>
      <rect x="16" y="18" width="64" height="62" rx="12" stroke={stroke} strokeWidth="3" />
      <path d="M30 62V46M46 62V34M62 62V52" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <path d="M28 72h40" stroke={stroke} strokeWidth="3" strokeLinecap="round" opacity=".45" />
    </>
  ),
  attendance: (
    <>
      <circle cx="48" cy="48" r="30" stroke={stroke} strokeWidth="3" opacity=".35" />
      <path d="M48 18a30 30 0 0 1 26 15" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <path d="M36 49l9 9 17-19" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  assignments: (
    <>
      <path d="M26 16h30l16 16v48a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V22a6 6 0 0 1 6-6Z" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
      <path d="M56 16v16h16" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 50h28M32 62h18" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  documents: (
    <>
      <rect x="18" y="26" width="46" height="54" rx="8" stroke={stroke} strokeWidth="3" />
      <rect x="32" y="14" width="46" height="54" rx="8" stroke={stroke} strokeWidth="3" opacity=".45" />
      <path d="M28 46h26M28 58h16" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  circles: (
    <>
      <circle cx="36" cy="38" r="12" stroke={stroke} strokeWidth="3" />
      <circle cx="62" cy="38" r="12" stroke={stroke} strokeWidth="3" opacity=".5" />
      <path d="M18 76c0-11 8-18 18-18s18 7 18 18" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <path d="M62 58c10 0 16 7 16 18" stroke={stroke} strokeWidth="3" strokeLinecap="round" opacity=".5" />
    </>
  ),
  leaderboard: (
    <>
      <rect x="18" y="52" width="18" height="28" rx="4" stroke={stroke} strokeWidth="3" />
      <rect x="39" y="34" width="18" height="46" rx="4" stroke={stroke} strokeWidth="3" />
      <rect x="60" y="60" width="18" height="20" rx="4" stroke={stroke} strokeWidth="3" opacity=".55" />
      <path d="m48 14 4 8 9 1-6.5 6 1.6 9L48 34l-8.1 4 1.6-9L35 23l9-1 4-8Z" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
    </>
  ),
  polls: (
    <>
      <rect x="16" y="24" width="64" height="14" rx="7" stroke={stroke} strokeWidth="3" />
      <rect x="16" y="44" width="46" height="14" rx="7" stroke={stroke} strokeWidth="3" />
      <rect x="16" y="64" width="30" height="14" rx="7" stroke={stroke} strokeWidth="3" opacity=".5" />
    </>
  ),
  messages: (
    <>
      <path d="M18 28a8 8 0 0 1 8-8h34a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8H38L24 66V56a8 8 0 0 1-6-8V28Z" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
      <path d="M74 40a8 8 0 0 1 6 8v18a8 8 0 0 1-6 8" stroke={stroke} strokeWidth="3" strokeLinecap="round" opacity=".45" />
    </>
  ),
  achievements: (
    <>
      <circle cx="48" cy="38" r="20" stroke={stroke} strokeWidth="3" />
      <path d="M40 55 34 82l14-8 14 8-6-27" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
      <path d="m48 28 3.4 6.9 7.6 1.1-5.5 5.3 1.3 7.6L48 45.3 41.2 49l1.3-7.6-5.5-5.3 7.6-1.1L48 28Z" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" opacity=".6" />
    </>
  ),
  timetable: (
    <>
      <rect x="14" y="22" width="68" height="58" rx="12" stroke={stroke} strokeWidth="3" />
      <path d="M14 38h68M38 38v42M62 38v42" stroke={stroke} strokeWidth="3" opacity=".5" />
      <circle cx="26" cy="50" r="3.5" fill={stroke} />
      <circle cx="50" cy="62" r="3.5" fill={stroke} />
    </>
  ),
  generic: (
    <>
      <rect x="16" y="24" width="64" height="52" rx="12" stroke={stroke} strokeWidth="3" />
      <path d="M28 44h26M28 58h18" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
};

export type EmptyTone = "primary" | "success" | "warning" | "danger" | "premium";

const TONE: Record<EmptyTone, { text: string; ring: string; glow: string }> = {
  primary: { text: "text-primary", ring: "border-primary/20", glow: "from-primary/15" },
  success: { text: "text-success", ring: "border-success/20", glow: "from-success/15" },
  warning: { text: "text-warning", ring: "border-warning/25", glow: "from-warning/15" },
  danger: { text: "text-danger", ring: "border-danger/20", glow: "from-danger/15" },
  premium: { text: "text-premium", ring: "border-premium/25", glow: "from-premium/15" },
};

interface PremiumEmptyProps {
  art?: EmptyArt;
  tone?: EmptyTone;
  title: string;
  description?: string;
  hint?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
  compact?: boolean;
}

export function PremiumEmpty({
  art = "generic",
  tone = "primary",
  title,
  description,
  hint,
  action,
  className,
  compact,
}: PremiumEmptyProps) {
  const t = TONE[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0, 0, 0.2, 1] }}
      className={cn(
        "relative overflow-hidden rounded-[22px] border border-border-subtle bg-surface-1 text-center shadow-card",
        compact ? "px-5 py-7" : "px-6 py-10",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent",
          t.glow,
        )}
      />
      <div className="relative mx-auto flex flex-col items-center">
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-3xl border bg-surface-2/70 backdrop-blur-sm",
            t.ring,
            compact ? "h-16 w-16" : "h-20 w-20",
          )}
        >
          <svg
            viewBox="0 0 96 96"
            className={cn(t.text, compact ? "h-9 w-9" : "h-11 w-11")}
            fill="none"
            strokeLinecap="round"
            aria-hidden
          >
            {ART[art]}
          </svg>
        </div>

        <h3 className="font-heading text-[16px] font-bold tracking-tight text-foreground">{title}</h3>
        {description && (
          <p className="mt-1.5 max-w-[280px] text-[12.5px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {hint && (
          <p className="mt-3 rounded-full border border-border-subtle bg-surface-2 px-3 py-1 text-[11px] font-medium text-muted-foreground">
            {hint}
          </p>
        )}
        {action && (
          <Button
            size="sm"
            className="mt-5 press-scale rounded-xl"
            onClick={action.onClick}
            asChild={!!action.href}
          >
            {action.href ? <a href={action.href}>{action.label}</a> : action.label}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
