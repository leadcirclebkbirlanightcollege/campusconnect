/**
 * Chip — pill-shaped selectable filter used in list toolbars, tag filters, and
 * category rows across student/faculty/admin. Consistent with the Native Classic
 * design language (soft surface, 999px radius, deep indigo when active).
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "@/components/icons";

interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  active?: boolean;
  icon?: React.ReactNode;
  showCheck?: boolean;
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, active, icon, showCheck, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold tracking-tight",
        "border transition-all duration-150 ease-out select-none",
        "active:scale-[0.97]",
        active
          ? "bg-primary text-primary-foreground border-transparent shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.5)]"
          : "bg-surface-1 text-foreground/80 border-border-subtle hover:border-border-strong hover:bg-surface-2",
        className,
      )}
      {...props}
    >
      {showCheck && active && <Check className="h-3.5 w-3.5" strokeWidth={2.75} />}
      {icon}
      {children}
    </button>
  ),
);
Chip.displayName = "Chip";

interface ChipGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Enables horizontal scroll with edge-fade on overflow. */
  scroll?: boolean;
}

export const ChipGroup = React.forwardRef<HTMLDivElement, ChipGroupProps>(
  ({ className, scroll = true, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2",
        scroll && "overflow-x-auto no-scrollbar -mx-4 px-4 snap-x snap-mandatory",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
ChipGroup.displayName = "ChipGroup";
