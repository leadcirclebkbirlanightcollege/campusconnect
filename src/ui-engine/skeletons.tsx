/**
 * GLOBAL LOADING SYSTEM — Skeleton components
 *
 * PageSkeleton   — full page loading state
 * CardSkeleton   — card loading state
 * ListSkeleton   — list items loading state
 * StatsSkeleton  — KPI metrics loading state
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Base Shimmer ─────────────────────────────────────────────── */
function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("shimmer rounded-lg", className)} style={style} />;
}

/* ── CardSkeleton ─────────────────────────────────────────────── */
interface CardSkeletonProps {
  lines?: number;
  showAvatar?: boolean;
  className?: string;
}

export function CardSkeleton({ lines = 2, showAvatar = false, className }: CardSkeletonProps) {
  return (
    <div className={cn("bg-card border border-border-subtle rounded-xl p-4 space-y-3", className)}>
      <div className="flex items-center gap-3">
        {showAvatar && <Shimmer className="h-10 w-10 rounded-full shrink-0" />}
        <div className="flex-1 space-y-2">
          <Shimmer className="h-4 w-2/3" />
          <Shimmer className="h-3 w-1/3" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer key={i} className={cn("h-3", i === lines - 1 ? "w-3/5" : "w-full")} />
      ))}
    </div>
  );
}

/* ── ListSkeleton ─────────────────────────────────────────────── */
interface ListSkeletonProps {
  count?: number;
  showAvatar?: boolean;
  className?: string;
}

export function ListSkeleton({ count = 4, showAvatar = true, className }: ListSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 bg-card border border-border-subtle rounded-xl px-4 py-3"
        >
          {showAvatar && <Shimmer className="h-9 w-9 rounded-full shrink-0" />}
          <div className="flex-1 space-y-1.5">
            <Shimmer className="h-3.5" style={{ width: `${60 + (i % 3) * 10}%` } as React.CSSProperties} />
            <Shimmer className="h-3" style={{ width: `${35 + (i % 2) * 15}%` } as React.CSSProperties} />
          </div>
          <Shimmer className="h-6 w-14 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ── StatsSkeleton ────────────────────────────────────────────── */
interface StatsSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsSkeleton({ count = 4, columns = 2, className }: StatsSkeletonProps) {
  const gridClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  }[columns];

  return (
    <div className={cn("grid gap-3", gridClass, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border-subtle rounded-xl p-4 space-y-2">
          <Shimmer className="h-3 w-1/2" />
          <Shimmer className="h-7 w-3/4" />
          <Shimmer className="h-2.5 w-2/5" />
        </div>
      ))}
    </div>
  );
}

/* ── PageSkeleton ─────────────────────────────────────────────── */
interface PageSkeletonProps {
  variant?: "dashboard" | "list" | "detail" | "simple";
  className?: string;
}

export function PageSkeleton({ variant = "dashboard", className }: PageSkeletonProps) {
  return (
    <div className={cn("animate-pulse px-4 py-5 space-y-6", className)}>
      {/* Page header */}
      <div className="space-y-2">
        <Shimmer className="h-7 w-2/5" />
        <Shimmer className="h-4 w-1/3" />
      </div>

      {variant === "dashboard" && (
        <>
          <StatsSkeleton count={4} />
          <div className="space-y-3">
            <Shimmer className="h-4 w-1/4" />
            <CardSkeleton lines={3} />
            <CardSkeleton lines={2} />
          </div>
          <div className="space-y-3">
            <Shimmer className="h-4 w-1/5" />
            <ListSkeleton count={3} />
          </div>
        </>
      )}

      {variant === "list" && (
        <>
          <ListSkeleton count={6} />
        </>
      )}

      {variant === "detail" && (
        <>
          <CardSkeleton lines={4} showAvatar />
          <StatsSkeleton count={3} columns={3} />
          <CardSkeleton lines={5} />
        </>
      )}

      {variant === "simple" && (
        <>
          <CardSkeleton lines={3} />
          <CardSkeleton lines={2} />
        </>
      )}
    </div>
  );
}

/* ── RouteSkeleton (used in App.tsx Suspense) ─────────────────── */
export function RouteSkeleton() {
  return <PageSkeleton variant="dashboard" />;
}
