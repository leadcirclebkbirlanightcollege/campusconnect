/**
 * IconButton — circular/square icon-only action button
 *
 * Usage:
 *   <IconButton icon={<Bell />} label="Notifications" />
 *   <IconButton icon={<X />} variant="ghost" size="sm" label="Close" />
 */

import * as React from "react";
import { cn } from "@/lib/utils";

type IconButtonVariant = "default" | "ghost" | "outline" | "primary" | "danger";
type IconButtonSize    = "xs" | "sm" | "md" | "lg";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon:      React.ReactNode;
  /** Accessible label (required — replaces visible text) */
  label:     string;
  variant?:  IconButtonVariant;
  size?:     IconButtonSize;
  /** Badge count to show */
  badge?:    number;
  /** Show as pill/circle instead of square */
  round?:    boolean;
}

const VARIANTS: Record<IconButtonVariant, string> = {
  default: "bg-action-secondary text-action-secondary-foreground border border-border-subtle hover:bg-action-secondary-hover",
  ghost:   "bg-transparent text-control-text border border-transparent hover:bg-control-hover hover:text-control-text",
  outline: "bg-action-secondary text-action-secondary-foreground border border-border-strong hover:bg-action-secondary-hover",
  primary: "bg-action-primary text-action-primary-foreground border border-action-primary hover:bg-action-primary-hover",
  danger:  "bg-action-danger text-action-danger-foreground border border-action-danger hover:bg-action-danger-hover",
};

const SIZES: Record<IconButtonSize, { btn: string; icon: string }> = {
  xs: { btn: "h-7  w-7",  icon: "h-3.5 w-3.5" },
  sm: { btn: "h-8  w-8",  icon: "h-4 w-4" },
  md: { btn: "h-10 w-10 min-h-[40px]", icon: "h-4.5 w-4.5" },
  lg: { btn: "h-12 w-12 min-h-[48px]", icon: "h-5 w-5" },
};

export function IconButton({
  icon,
  label,
  variant = "default",
  size    = "md",
  badge,
  round   = false,
  className,
  ...props
}: IconButtonProps) {
  const sz = SIZES[size];

  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        "transition-all duration-[120ms] ease-[cubic-bezier(0,0,0.2,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "active:scale-[0.93] disabled:opacity-100 disabled:pointer-events-none disabled:bg-action-disabled disabled:text-action-disabled-foreground disabled:border-action-disabled",
        round ? "rounded-full" : "rounded-xl",
        VARIANTS[variant],
        sz.btn,
        className,
      )}
    >
      <span className={cn("shrink-0", sz.icon, "flex items-center justify-center")}>
        {icon}
      </span>
      {typeof badge === "number" && badge > 0 && (
        <span
          aria-label={`${badge} unread`}
          className={cn(
            "absolute -top-1 -right-1",
            "h-4 min-w-4 px-0.5 rounded-full",
            "bg-danger text-danger-foreground text-[9px] font-black",
            "flex items-center justify-center leading-none",
            "animate-scale-in",
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}
