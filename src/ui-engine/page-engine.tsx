/**
 * PAGE ENGINE — Universal page wrapper components
 *
 * Provides consistent spacing, safe-area support, and layout structure.
 * Every screen SHOULD render inside <PageEngine>.
 *
 * Structure:
 *   <PageEngine>
 *     <PageHeader />
 *     <PageContent>
 *       <SectionContainer>...</SectionContainer>
 *     </PageContent>
 *   </PageEngine>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Types ──────────────────────────────────────────────────────── */
interface PageEngineProps {
  children: React.ReactNode;
  className?: string;
  /** Applies mobile-centered max-width (420px) */
  mobileCentered?: boolean;
  /** Removes default horizontal padding */
  noPadding?: boolean;
  /** Adds extra bottom padding for fixed bottom nav */
  safeBottom?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  tight?: boolean;
}

interface SectionContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  tight?: boolean;
}

/* ── PageEngine (root wrapper) ──────────────────────────────────── */
export function PageEngine({
  children,
  className,
  mobileCentered = false,
  noPadding = false,
  safeBottom = false,
}: PageEngineProps) {
  return (
    <div
      className={cn(
        "w-full animate-fade-in",
        !noPadding && "px-4",
        mobileCentered && "max-w-[420px] mx-auto",
        safeBottom && "pb-[calc(72px+env(safe-area-inset-bottom,0px))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── PageHeader ─────────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 mb-6", className)}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold text-foreground leading-tight tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── PageContent ────────────────────────────────────────────────── */
export function PageContent({ children, className, tight = false }: PageContentProps) {
  return (
    <div className={cn(tight ? "space-y-4" : "space-y-6", className)}>
      {children}
    </div>
  );
}

/* ── SectionContainer ───────────────────────────────────────────── */
export function SectionContainer({
  children,
  title,
  subtitle,
  action,
  className,
  tight = false,
}: SectionContainerProps) {
  return (
    <section className={cn("w-full", tight ? "space-y-3" : "space-y-4", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 leading-none">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(tight ? "space-y-2" : "space-y-3")}>
        {children}
      </div>
    </section>
  );
}
