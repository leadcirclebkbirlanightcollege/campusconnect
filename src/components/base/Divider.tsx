/**
 * Divider — semantic section separator
 *
 * Usage:
 *   <Divider />
 *   <Divider label="or" />
 *   <Divider vertical className="h-4" />
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface DividerProps {
  /** Text label shown in center */
  label?:     string;
  /** Render as vertical divider */
  vertical?:  boolean;
  /** Extra spacing around divider */
  spacing?:   "none" | "sm" | "md" | "lg";
  className?: string;
}

const SPACING_CLASSES = {
  none: "",
  sm:   "my-2",
  md:   "my-3",
  lg:   "my-4",
} as const;

export function Divider({ label, vertical = false, spacing = "none", className }: DividerProps) {
  if (vertical) {
    return (
      <div
        className={cn("w-px bg-border-subtle self-stretch shrink-0", className)}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  if (!label) {
    return (
      <div
        role="separator"
        className={cn("h-px w-full bg-border-subtle", SPACING_CLASSES[spacing], className)}
      />
    );
  }

  return (
    <div
      role="separator"
      className={cn("flex items-center gap-3", SPACING_CLASSES[spacing], className)}
    >
      <div className="flex-1 h-px bg-border-subtle" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 select-none shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  );
}
