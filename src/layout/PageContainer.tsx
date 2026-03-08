/**
 * PageContainer — universal mobile-first page wrapper
 *
 * Enforces 420px max-width, 16px side padding, centers on desktop.
 * Wrap every authenticated page's content inside this.
 *
 * Usage:
 *   <PageContainer>
 *     <PageHeader title="Dashboard" />
 *     <PageSection>…</PageSection>
 *   </PageContainer>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children:       React.ReactNode;
  className?:     string;
  /** Remove horizontal padding (full-bleed content) */
  noPadding?:     boolean;
  /** Add extra padding-bottom to clear fixed bottom nav */
  withBottomNav?: boolean;
  /** Controls max-width preset */
  size?:          "mobile" | "tablet" | "full";
}

const SIZE_CLASS = {
  mobile:  "max-w-[420px]",
  tablet:  "max-w-[768px]",
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
        "w-full mx-auto",
        SIZE_CLASS[size],
        !noPadding && "px-4",
        withBottomNav && "pb-[calc(80px+env(safe-area-inset-bottom,0px))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
