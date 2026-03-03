/**
 * CAMPUS CONNECT 3.0 — DESIGN SYSTEM COMPONENTS
 *
 * PrimaryCard    — Elevated primary card (surface-1, shadow-sm)
 * SurfaceCard    — Nested secondary block (surface-2, shadow-xs)
 * MetricCard     — KPI stat card with icon, trend, count-up
 * SectionHeader  — Consistent section heading with optional action
 * StatusChip     — Compact status/badge chip
 * LiveIndicator  — Pulsing live dot + label
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useMetricCountUp } from "@/components/ui/motion";

/* ─────────────────────────────────────────────
   PrimaryCard — sits on bg-base
───────────────────────────────────────────── */
interface PrimaryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPad?: boolean;
  hover?: boolean;
}

export const PrimaryCard = React.forwardRef<HTMLDivElement, PrimaryCardProps>(
  ({ className, noPad, hover, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border-subtle bg-surface-1 shadow-card",
        !noPad && "p-card",
        hover && "hover-lift cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
PrimaryCard.displayName = "PrimaryCard";

/* ─────────────────────────────────────────────
   SurfaceCard — nested inside PrimaryCard
───────────────────────────────────────────── */
interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPad?: boolean;
}

export const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>(
  ({ className, noPad, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-md border border-border-subtle bg-surface-2",
        !noPad && "p-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
SurfaceCard.displayName = "SurfaceCard";

/* ─────────────────────────────────────────────
   MetricCard — KPI block
───────────────────────────────────────────── */
type TrendDirection = "up" | "down" | "neutral";

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: number | string;
  subtext?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  trend?: TrendDirection;
  /** If numeric, count-up animation plays */
  animate?: boolean;
}

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, label, value, subtext, icon, iconClassName, trend, animate, ...props }, ref) => {
    const isNumeric = typeof value === "number";
    const counted = useMetricCountUp(isNumeric && animate ? (value as number) : 0, 900);
    const display = isNumeric && animate ? counted : value;

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-border-subtle bg-surface-1 shadow-card p-card",
          "transition-shadow duration-base hover:shadow-card-hover",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-label uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <p className="text-[28px] font-semibold leading-none tracking-tight text-foreground tabular-nums animate-count-up">
              {display}
            </p>
            {subtext && (
              <p className="text-caption text-muted-foreground">{subtext}</p>
            )}
          </div>

          {icon && (
            <div
              className={cn(
                "flex-shrink-0 rounded-xl p-2.5",
                iconClassName ?? "bg-primary/10 text-primary",
              )}
            >
              {icon}
            </div>
          )}
        </div>

        {trend && (
          <div
            className={cn(
              "mt-3 h-0.5 w-full rounded-full",
              trend === "up"      && "bg-success/40",
              trend === "down"    && "bg-danger/40",
              trend === "neutral" && "bg-border-subtle",
            )}
          />
        )}
      </div>
    );
  },
);
MetricCard.displayName = "MetricCard";

/* ─────────────────────────────────────────────
   SectionHeader — consistent heading block
───────────────────────────────────────────── */
interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  className,
  titleClassName,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0 space-y-0.5">
        <h2
          className={cn(
            "text-subhead font-semibold text-foreground leading-snug",
            titleClassName,
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="text-body text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 flex items-center gap-2">{action}</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   StatusChip — compact status indicator
───────────────────────────────────────────── */
type StatusVariant = "live" | "scheduled" | "ended" | "success" | "warning" | "danger" | "neutral" | "premium";

interface StatusChipProps {
  variant: StatusVariant;
  label: string;
  className?: string;
}

const STATUS_STYLES: Record<StatusVariant, string> = {
  live:      "bg-success-soft text-success border-success/20",
  scheduled: "bg-primary/8 text-primary border-primary/20",
  ended:     "bg-surface-3 text-muted-foreground border-border-subtle",
  success:   "bg-success-soft text-success border-success/20",
  warning:   "bg-warning-soft text-warning border-warning/20",
  danger:    "bg-danger-soft text-danger border-danger/20",
  neutral:   "bg-surface-3 text-muted-foreground border-border-subtle",
  premium:   "bg-gold/10 text-gold border-gold/25",
};

export function StatusChip({ variant, label, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        STATUS_STYLES[variant],
        className,
      )}
    >
      {variant === "live" && (
        <span className="h-1.5 w-1.5 rounded-full bg-success live-dot shrink-0" />
      )}
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   LiveIndicator — pulsing live badge
───────────────────────────────────────────── */
export function LiveIndicator({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-success-soft border border-success/20 px-2.5 py-1 text-[11px] font-semibold text-success",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-success live-dot" />
      LIVE
    </span>
  );
}

/* ─────────────────────────────────────────────
   IntelligenceBar — scored progress bar
───────────────────────────────────────────── */
interface IntelligenceBarProps {
  value: number;
  label: string;
  className?: string;
}

export function IntelligenceBar({ value, label, className }: IntelligenceBarProps) {
  const color =
    value >= 70 ? "bg-success" : value >= 40 ? "bg-warning" : "bg-danger";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-caption text-muted-foreground">{label}</p>
        <span className="text-caption font-semibold tabular-nums text-foreground">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-slow", color)}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
