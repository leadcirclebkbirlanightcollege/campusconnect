import React from "react";
import { cn } from "@/lib/utils";

interface ECellStatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accentColor?: string;
  className?: string;
}

export function ECellStatCard({
  label,
  value,
  subtext,
  icon: Icon,
  className,
}: ECellStatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[#E8D98A]/50 dark:border-[#3D3523] bg-card p-3.5 sm:p-4",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#C08634]/60 group",
        className
      )}
      style={{
        boxShadow: "0 2px 10px -2px rgba(192, 134, 52, 0.08)",
      }}
    >
      {/* Top subtle gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#FCE541] via-[#C08634] to-[#FAD943]" />

      {/* Ambient background bloom */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-[#FCE541]/10 blur-xl group-hover:bg-[#FCE541]/20 transition-all"
      />

      <div className="relative flex items-start justify-between gap-2">
        <span className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider text-[#593018] dark:text-[#D8C7A5]">
          {label}
        </span>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FCE541]/15 dark:bg-[#FCE541]/10 text-[#C08634] dark:text-[#FCE541]">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="relative mt-2">
        <p className="text-[22px] sm:text-[26px] font-extrabold tracking-tight text-black dark:text-white tabular-nums leading-none">
          {value}
        </p>
        {subtext && (
          <p className="text-[11px] text-[#593018]/80 dark:text-muted-foreground mt-1 truncate">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
