/**
 * PageHeader — compact, mobile-optimized page header
 *
 * Supports: title, subtitle, back button, right action slot.
 *
 * Usage:
 *   <PageHeader title="Dashboard" subtitle="Welcome back, Atharv" />
 *   <PageHeader title="Lecture Detail" back onBack={() => navigate(-1)} />
 *   <PageHeader title="Settings" action={<IconButton ... />} />
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title:       string;
  subtitle?:   string;
  /** Show a back chevron button */
  back?:       boolean;
  onBack?:     () => void;
  /** Right-side action slot */
  action?:     React.ReactNode;
  className?:  string;
  /** Size variant */
  variant?:    "default" | "large" | "compact";
  /** Gradient title text */
  gradient?:   boolean;
  /** Keep header visible while scrolling */
  sticky?:     boolean;
}

const TITLE_CLASSES = {
  default: "text-[20px] font-semibold leading-tight tracking-[-0.015em]",
  large:   "text-[26px] font-bold   leading-tight tracking-[-0.025em]",
  compact: "text-[16px] font-semibold leading-tight",
} as const;

const SUBTITLE_CLASSES = {
  default: "text-[13px] text-muted-foreground mt-0.5",
  large:   "text-[14px] text-muted-foreground mt-1",
  compact: "text-[12px] text-muted-foreground mt-0.5",
} as const;

export function PageHeader({
  title,
  subtitle,
  back     = false,
  onBack,
  action,
  className,
  variant  = "default",
  gradient = false,
  sticky   = true,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-3 pt-1",
        sticky
          ? [
              "sticky z-30 top-[calc(52px+env(safe-area-inset-top,0px))]",
              "-mx-4 mb-4 border-b border-border-subtle/70 bg-background/80 px-4 py-2",
              "backdrop-blur-md shadow-[0_8px_24px_-18px_hsl(var(--foreground)/0.35)]",
            ]
          : ["mb-6", variant === "compact" && "mb-4"],
        className,
      )}
    >
      {/* Left: back + title */}
      <div className="flex items-start gap-2 min-w-0 flex-1">
        {back && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className={cn(
              "tap-ripple shrink-0 flex items-center justify-center",
              "h-10 w-10 rounded-xl",
              "bg-surface-2 border border-border-subtle",
              "text-muted-foreground hover:text-foreground hover:bg-surface-3",
              "transition-all duration-[120ms] active:scale-95",
              "mt-0.5", // align with title baseline
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div className="min-w-0">
          <h1
            className={cn(
              TITLE_CLASSES[variant],
              gradient
                ? "gradient-primary-text"
                : "text-foreground",
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p className={cn(SUBTITLE_CLASSES[variant], "leading-snug")}> 
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: action slot */}
      {action && (
        <div className="shrink-0 flex items-center gap-2 mt-0.5">
          {action}
        </div>
      )}
    </header>
  );
}
