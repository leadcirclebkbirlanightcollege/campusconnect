import React from "react";
import { cn } from "@/lib/utils";

interface ECellSectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function ECellSectionHeader({
  title,
  subtitle,
  badge,
  action,
  icon: Icon,
  className,
}: ECellSectionHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-1.5", className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FCE541]/20 dark:bg-[#FCE541]/10 border border-[#E8D98A]/40 text-[#593018] dark:text-[#FCE541]">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <h2 className="text-[17px] sm:text-[19px] font-bold tracking-tight text-foreground flex items-center gap-2">
            {title}
            {badge && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FCE541] text-[#000000] border border-[#E8D98A]">
                {badge}
              </span>
            )}
          </h2>
        </div>
        {subtitle && (
          <p className="text-[12.5px] sm:text-[13px] text-[#593018]/85 dark:text-muted-foreground leading-snug">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 pt-1 sm:pt-0">{action}</div>}
    </div>
  );
}
