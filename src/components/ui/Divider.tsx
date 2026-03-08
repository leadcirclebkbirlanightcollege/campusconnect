import * as React from "react";
import { cn } from "@/lib/utils";

interface DividerProps {
  label?: string;
  className?: string;
}

const Divider = React.memo(function Divider({ label, className }: DividerProps) {
  return (
    <div className={cn("relative flex items-center", className)} role="separator" aria-orientation="horizontal">
      <div className="h-px w-full bg-border-subtle" />
      {label ? (
        <span className="mx-3 shrink-0 rounded-full border border-border-subtle bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      {label ? <div className="h-px w-full bg-border-subtle" /> : null}
    </div>
  );
});

export { Divider };
