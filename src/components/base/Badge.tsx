/**
 * Badge — semantic status / label chip
 *
 * Usage:
 *   <Badge variant="success">Verified</Badge>
 *   <Badge variant="live" dot>Live</Badge>
 *   <Badge variant="gold" size="lg">Gold Tier</Badge>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "gold"
  | "live"
  | "muted"
  | "outline";

type BadgeSize = "xs" | "sm" | "md";

interface BadgeProps {
  children:   React.ReactNode;
  variant?:   BadgeVariant;
  size?:      BadgeSize;
  /** Animated dot on left side */
  dot?:       boolean;
  /** Icon on left */
  icon?:      React.ReactNode;
  className?: string;
}

const VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-surface-3 text-foreground border-border-subtle",
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger:  "bg-danger/10  text-danger  border-danger/20",
  gold:    "bg-gold/10    text-gold    border-gold/25",
  live:    "bg-success/10 text-success border-success/20",
  muted:   "bg-muted      text-muted-foreground border-border-subtle",
  outline: "bg-transparent text-foreground border-border-strong",
};

const SIZES: Record<BadgeSize, string> = {
  xs: "px-1.5 py-0   text-[9px]  h-4 gap-0.5",
  sm: "px-2   py-0.5 text-[11px] gap-1",
  md: "px-2.5 py-1   text-[12px] gap-1.5",
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  default: "bg-foreground/60",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-danger",
  gold:    "bg-gold",
  live:    "bg-success",
  muted:   "bg-muted-foreground",
  outline: "bg-foreground/60",
};

export function Badge({
  children,
  variant   = "default",
  size      = "sm",
  dot       = false,
  icon,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold border rounded-full",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "rounded-full shrink-0",
            size === "xs" ? "h-1 w-1" : "h-1.5 w-1.5",
            DOT_COLORS[variant],
            variant === "live" && "animate-live-pulse",
          )}
        />
      )}
      {icon && !dot && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
