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
import { ChevronLeft } from "@/components/icons";

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
  default: "font-heading text-[20px] font-bold leading-tight tracking-[-0.015em]",
  large:   "font-heading text-[26px] font-black leading-tight tracking-[-0.025em]",
  compact: "font-heading text-[16px] font-bold leading-tight",
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
  sticky   = false,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "relative flex items-start justify-between gap-3 pt-1 mb-4",
        sticky
          ? [
              "sticky z-30 top-[calc(52px+env(safe-area-inset-top,0px))]",
              "-mx-4 border-b border-border-subtle bg-surface-1/95 px-4 py-2.5",
              "backdrop-blur-md shadow-sm",
            ]
          : variant === "compact" ? "mb-3" : "mb-5",
        className,
      )}
    >
      {/* Left: back + title */}
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        {back && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className={cn(
              "tap-ripple shrink-0 flex items-center justify-center",
              "h-9 w-9 rounded-xl",
              "bg-surface-2 border border-border-subtle",
              "text-muted-foreground hover:text-foreground hover:bg-surface-3",
              "transition-all duration-[120ms] active:scale-95",
              "mt-0.5",
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
