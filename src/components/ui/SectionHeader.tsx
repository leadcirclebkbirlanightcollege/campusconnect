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
    <header className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1.5">
        <h2 className="font-heading text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground truncate">
          {title}
        </h2>
        {subtitle ? (
          <p className="font-heading text-[17px] font-bold leading-tight text-foreground truncate">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
});

export { SectionHeader };
