/**
 * CAMPUS CONNECT 2.0 — DESIGN SYSTEM COMPONENTS
 *
 * PrimaryCard    — Elevated card (surface-1, shadow-sm)
 * SurfaceCard    — Nested card  (surface-2, no shadow)
 * MetricCard     — KPI / stats card with icon slot
 * SectionHeader  — Page / section heading with optional action
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   PrimaryCard
   Primary content container. Sits on bg-base.
   Use for main dashboard cards, panels, tables.
───────────────────────────────────────────── */
interface PrimaryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remove the default padding */
  noPad?: boolean;
}

export const PrimaryCard = React.forwardRef<HTMLDivElement, PrimaryCardProps>(
  ({ className, noPad, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border-subtle bg-surface-1 shadow-sm",
        !noPad && "p-card",
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
   SurfaceCard
   Nested / secondary content block.
   Use inside PrimaryCard for inner groupings.
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
   MetricCard
   KPI block: icon + label + value + subtext.
───────────────────────────────────────────── */
interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  trend?: "up" | "down" | "neutral";
}

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  (
    {
      className,
      label,
      value,
      subtext,
      icon,
      iconClassName,
      trend,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border-subtle bg-surface-1 shadow-sm p-card",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-label uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="text-[28px] font-semibold leading-none tracking-tight text-foreground">
            {value}
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
            "mt-3 h-px w-full rounded-full",
            trend === "up" && "bg-success/40",
            trend === "down" && "bg-danger/40",
            trend === "neutral" && "bg-border-subtle",
          )}
        />
      )}
    </div>
  ),
);
MetricCard.displayName = "MetricCard";

/* ─────────────────────────────────────────────
   SectionHeader
   Consistent heading block for page sections.
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
