/**
 * SectionHeader — standardized section title + optional action
 *
 * Usage:
 *   <SectionHeader title="Recent Activity" />
 *   <SectionHeader title="Lectures" subtitle="This week" action={<Link>See all</Link>} />
 *   <SectionHeader title="STATS" variant="overline" />
 */

import * as React from "react";
import { cn } from "@/lib/utils";

type SectionHeaderVariant = "default" | "overline" | "large" | "display";

interface SectionHeaderProps {
  title:        string;
  subtitle?:    string;
  action?:      React.ReactNode;
  variant?:     SectionHeaderVariant;
  className?:   string;
  /** Reduce bottom margin */
  tight?:       boolean;
}

const VARIANTS: Record<SectionHeaderVariant, { title: string; sub: string }> = {
  overline: {
    title: "text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground/70",
    sub:   "text-[11px] text-muted-foreground/50",
  },
  default: {
    title: "text-[15px] font-semibold text-foreground leading-tight",
    sub:   "text-[12px] text-muted-foreground mt-0.5",
  },
  large: {
    title: "text-[18px] font-semibold text-foreground leading-tight tracking-[-0.01em]",
    sub:   "text-[13px] text-muted-foreground mt-1",
  },
  display: {
    title: "text-[22px] font-bold text-foreground leading-tight tracking-[-0.02em]",
    sub:   "text-[14px] text-muted-foreground mt-1",
  },
};

export function SectionHeader({
  title,
  subtitle,
  action,
  variant  = "default",
  className,
  tight    = false,
}: SectionHeaderProps) {
  const v = VARIANTS[variant];

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3",
        tight ? "mb-3" : "mb-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className={cn(v.title, "truncate")}>{title}</h2>
        {subtitle && <p className={v.sub}>{subtitle}</p>}
      </div>
      {action && (
        <div className="shrink-0 flex items-center">{action}</div>
      )}
    </div>
  );
}
