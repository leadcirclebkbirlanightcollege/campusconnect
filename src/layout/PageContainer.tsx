/**
 * PageContainer — universal responsive, mobile-first page wrapper
 *
 * Automatically scales from small mobile (360px) to tablet and desktop,
 * maintaining comfortable reading margins and ergonomic spacing.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children:       React.ReactNode;
  className?:     string;
  /** Remove horizontal padding (full-bleed content) */
  noPadding?:     boolean;
  /** Add extra padding-bottom to clear fixed mobile bottom nav */
  withBottomNav?: boolean;
  /** Controls max-width preset */
  size?:          "mobile" | "compact" | "tablet" | "full" | "wide";
}

const SIZE_CLASS = {
  mobile:  "max-w-xl md:max-w-4xl lg:max-w-5xl",
  compact: "max-w-md sm:max-w-lg md:max-w-2xl",
  tablet:  "max-w-2xl md:max-w-4xl lg:max-w-5xl",
  wide:    "max-w-3xl md:max-w-5xl lg:max-w-6xl",
  full:    "max-w-none",
} as const;

export function PageContainer({
  children,
  className,
  noPadding      = false,
  withBottomNav  = true,
  size           = "mobile",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto transition-all",
        SIZE_CLASS[size],
        !noPadding && "px-3.5 sm:px-5 md:px-6",
        withBottomNav && "pb-6 md:pb-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
