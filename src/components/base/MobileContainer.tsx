/**
 * MobileContainer — universal mobile-first page wrapper
 *
 * Enforces max-width 420px, side padding 16px, centers on desktop.
 * Every page/screen must be wrapped inside MobileContainer.
 *
 * Usage:
 *   <MobileContainer>
 *     <PageHeader title="Dashboard" />
 *     <SectionContainer>...</SectionContainer>
 *   </MobileContainer>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface MobileContainerProps {
  children:       React.ReactNode;
  className?:     string;
  /** Remove side padding (for full-bleed content) */
  noPadding?:     boolean;
  /** Add safe-area bottom padding for fixed bottom nav */
  withBottomNav?: boolean;
  /** Top padding */
  topPadding?:    "none" | "sm" | "md" | "lg";
  /** Max width (defaults to 420px mobile target) */
  maxWidth?:      "mobile" | "tablet" | "content" | "full";
}

const TOP_PADDING = {
  none: "",
  sm:   "pt-3",
  md:   "pt-5",
  lg:   "pt-6",
} as const;

const MAX_WIDTH = {
  mobile:  "max-w-[420px]",
  tablet:  "max-w-[768px]",
  content: "max-w-[960px]",
  full:    "max-w-none",
} as const;

export function MobileContainer({
  children,
  className,
  noPadding      = false,
  withBottomNav  = true,
  topPadding     = "md",
  maxWidth       = "mobile",
}: MobileContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto animate-fade-in",
        MAX_WIDTH[maxWidth],
        !noPadding && "px-4",
        TOP_PADDING[topPadding],
        withBottomNav && "pb-[calc(80px+env(safe-area-inset-bottom,0px))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * MobileSection — vertical stack with standard gap
 *
 * Usage:
 *   <MobileSection title="Recent Activity">
 *     <Card />
 *   </MobileSection>
 */
interface MobileSectionProps {
  children:   React.ReactNode;
  title?:     string;
  subtitle?:  string;
  action?:    React.ReactNode;
  className?: string;
  gap?:       "sm" | "md" | "lg";
}

const SECTION_GAP = {
  sm: "space-y-2",
  md: "space-y-3",
  lg: "space-y-4",
} as const;

export function MobileSection({
  children,
  title,
  subtitle,
  action,
  className,
  gap = "md",
}: MobileSectionProps) {
  return (
    <section className={cn("w-full", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground/70 leading-none">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={SECTION_GAP[gap]}>{children}</div>
    </section>
  );
}
