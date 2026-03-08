/**
 * CardContainer — semantic surface card with elevation levels
 *
 * Usage:
 *   <CardContainer>content</CardContainer>
 *   <CardContainer interactive onClick={...}>clickable card</CardContainer>
 *   <CardContainer level={2} gradient>featured card</CardContainer>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

type ElevationLevel = 1 | 2 | 3;
type PaddingSize    = "none" | "sm" | "md" | "lg";

interface CardContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Surface depth level */
  level?: ElevationLevel;
  /** Padding preset */
  padding?: PaddingSize;
  /** Allows hover/press interactions */
  interactive?: boolean;
  /** Subtle primary gradient tint on the card */
  gradient?: boolean;
  /** Glow border on hover */
  glow?: boolean;
  onClick?: () => void;
  /** HTML role for a11y */
  role?: string;
}

const ELEVATION: Record<ElevationLevel, string> = {
  1: "bg-card border border-border-subtle shadow-xs",
  2: "bg-surface-1 border border-border-subtle shadow-sm",
  3: "bg-surface-2 border border-border-strong shadow-md",
};

const PADDING: Record<PaddingSize, string> = {
  none: "",
  sm:   "p-3",
  md:   "p-4",
  lg:   "p-5",
};

export function CardContainer({
  children,
  className,
  level = 1,
  padding = "md",
  interactive = false,
  gradient = false,
  glow = false,
  onClick,
  role,
}: CardContainerProps) {
  return (
    <div
      role={role ?? (onClick ? "button" : undefined)}
      onClick={onClick}
      className={cn(
        "rounded-xl",
        ELEVATION[level],
        PADDING[padding],
        gradient && [
          "before:absolute before:inset-0 before:rounded-xl before:opacity-[0.04]",
          "before:bg-gradient-to-br before:from-primary before:to-accent-glow",
          "relative overflow-hidden",
        ],
        interactive && [
          "cursor-pointer select-none",
          "transition-all duration-[150ms] ease-[cubic-bezier(0,0,0.2,1)]",
          "hover:-translate-y-[2px] hover:shadow-md",
          "active:scale-[0.98] active:shadow-xs",
          glow && "hover:card-glow-border",
        ],
        !interactive && glow && "card-glow-border",
        className,
      )}
    >
      {children}
    </div>
  );
}
