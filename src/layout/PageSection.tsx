/**
 * PageSection — consistent vertical spacing block between UI sections
 *
 * Usage:
 *   <PageSection>
 *     <CardContainer>...</CardContainer>
 *   </PageSection>
 *
 *   <PageSection title="Recent Lectures" subtitle="This week">
 *     ...
 *   </PageSection>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageSectionProps {
  children:    React.ReactNode;
  /** Section label — renders as overline text */
  title?:      string;
  subtitle?:   string;
  /** Right-side action (e.g., "See all" link) */
  action?:     React.ReactNode;
  className?:  string;
  /** Gap between child elements */
  gap?:        "xs" | "sm" | "md" | "lg";
  /** Bottom margin between sections */
  spacing?:    "sm" | "md" | "lg" | "xl" | "none";
}

const GAP_CLASS = {
  xs: "space-y-2",
  sm: "space-y-3",
  md: "space-y-4",
  lg: "space-y-5",
} as const;

const SPACING_CLASS = {
  none: "",
  sm:   "mb-4",
  md:   "mb-6",
  lg:   "mb-8",
  xl:   "mb-10",
} as const;

export function PageSection({
  children,
  title,
  subtitle,
  action,
  className,
  gap     = "sm",
  spacing = "md",
}: PageSectionProps) {
  return (
    <section className={cn(SPACING_CLASS[spacing], className)}>
      {/* Section header row */}
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            {title && (
              <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground/65 leading-none">
                {title}
              </p>
            )}
            {subtitle && (
              <p className="text-[11px] text-muted-foreground/50 mt-0.5 leading-none">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="shrink-0">{action}</div>
          )}
        </div>
      )}

      {/* Section content */}
      <div className={GAP_CLASS[gap]}>{children}</div>
    </section>
  );
}
