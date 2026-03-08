/**
 * GlassSurface — frosted glass morphism panel
 *
 * Usage:
 *   <GlassSurface>content</GlassSurface>
 *   <GlassSurface elevated>modal content</GlassSurface>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassSurfaceProps {
  children: React.ReactNode;
  className?: string;
  /** Stronger blur + deeper background for modals/sheets */
  elevated?: boolean;
  /** Add glow border from primary color */
  glow?: boolean;
  /** HTML tag to render as */
  as?: keyof React.JSX.IntrinsicElements;
  onClick?: () => void;
}

export function GlassSurface({
  children,
  className,
  elevated = false,
  glow = false,
  as: Tag = "div",
  onClick,
}: GlassSurfaceProps) {
  return (
    // @ts-ignore — dynamic tag
    <Tag
      onClick={onClick}
      className={cn(
        "rounded-xl",
        elevated ? "glass-elevated" : "glass-surface",
        glow && "card-glow-border",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
