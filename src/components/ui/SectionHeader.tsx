import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

const SectionHeader = React.memo(function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <header className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1">
        {subtitle ? (
          <p className="font-heading text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground truncate">
            {subtitle}
          </p>
        ) : null}
        <h2 className="font-heading text-[18px] font-bold leading-tight text-foreground truncate">{title}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
});

export { SectionHeader };
