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
  default: "bg-surface-2 text-foreground border border-border-subtle hover:bg-surface-3",
  ghost:   "bg-transparent text-muted-foreground hover:bg-surface-2 hover:text-foreground",
  outline: "bg-transparent text-foreground border border-border-strong hover:bg-surface-2",
  primary: "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15",
  danger:  "bg-danger/10  text-danger  border border-danger/20  hover:bg-danger/15",
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
        "active:scale-[0.93] disabled:opacity-50 disabled:pointer-events-none",
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
            "bg-danger text-white text-[9px] font-black",
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
