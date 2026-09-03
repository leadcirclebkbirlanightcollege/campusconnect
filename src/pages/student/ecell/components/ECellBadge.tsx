import React from "react";
import { cn } from "@/lib/utils";

interface ECellBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "gold" | "outline" | "subtle";
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

export function ECellBadge({
  variant = "primary",
  icon: Icon,
  children,
  className,
  ...props
}: ECellBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase transition-colors select-none",
        variant === "primary" &&
          "bg-[#FCE541] text-[#000000] shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#E8D98A]",
        variant === "gold" &&
          "bg-[#C08634] text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]",
        variant === "outline" &&
          "bg-white dark:bg-[#1D1B17] text-[#593018] dark:text-[#E8D98A] border border-[#E8D98A] dark:border-[#3F3724]",
        variant === "subtle" &&
          "bg-[#FCE541]/20 dark:bg-[#FCE541]/10 text-[#593018] dark:text-[#FCE541] border border-[#FCE541]/30",
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {children}
    </span>
  );
}
