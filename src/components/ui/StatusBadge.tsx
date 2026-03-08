import * as React from "react";
import { cn } from "@/lib/utils";

const statusVariants = {
  live: "bg-success/12 text-success border-success/30 shadow-[0_0_14px_hsl(var(--success)/0.28)]",
  upcoming: "bg-warning/12 text-warning border-warning/30",
  completed: "bg-muted text-muted-foreground border-border-subtle",
  active: "bg-primary/12 text-primary border-primary/30 shadow-[0_0_14px_hsl(var(--primary)/0.28)]",
  default: "bg-surface-3 text-foreground border-border-subtle",
} as const;

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: keyof typeof statusVariants;
}

const StatusBadge = React.memo(function StatusBadge({ status = "default", className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
        statusVariants[status],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
});

export { StatusBadge };
