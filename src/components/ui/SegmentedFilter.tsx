import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedFilterProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  size?: "sm" | "md";
  scrollable?: boolean;
}

/**
 * Premium pill-style segmented control used across module headers.
 * Mobile-friendly, scrollable when needed, animated active state.
 */
export function SegmentedFilter<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
  scrollable = true,
}: SegmentedFilterProps<T>) {
  const sz = size === "sm" ? "h-8 text-[11px] px-3" : "h-9 text-[12px] px-3.5";
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-2xl border border-border-subtle bg-surface-2/70 p-1 backdrop-blur-sm",
        scrollable && "max-w-full overflow-x-auto scrollbar-hide",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative shrink-0 inline-flex items-center gap-1.5 rounded-xl font-medium transition-all duration-180",
              sz,
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-3/60",
            )}
          >
            <span>{opt.label}</span>
            {typeof opt.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  active ? "bg-background/20 text-background" : "bg-surface-3 text-muted-foreground",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
