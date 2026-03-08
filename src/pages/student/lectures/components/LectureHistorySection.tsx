import { Clock3, Loader2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { HistoryLectureRecord } from "../types";

type LectureHistorySectionProps = {
  rows: HistoryLectureRecord[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

function historyBadge(row: HistoryLectureRecord) {
  if (row.attendance_status === "attended") {
    return {
      status: "active" as const,
      label: "Attended",
      className: "",
    };
  }

  if (row.attendance_status === "late") {
    return {
      status: "upcoming" as const,
      label: "Late",
      className: "",
    };
  }

  return {
    status: "default" as const,
    label: "Missed",
    className: "border-danger/30 bg-danger/12 text-danger",
  };
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function LectureHistorySection({
  rows,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: LectureHistorySectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <GlassCard hover={false}>
        <p className="text-sm text-muted-foreground">No lecture history yet.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const badge = historyBadge(row);

        return (
          <Link key={row.id} to={`/app/lectures/${row.id}`}>
            <GlassCard hover className="space-y-3" style={{ animationDelay: `${Math.min(index * 30, 180)}ms` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{row.topic}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(row.lecture_date)}</p>
                </div>
                <StatusBadge status={badge.status} className={cn("shrink-0", badge.className)}>
                  {badge.label}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate">{row.venue}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 text-primary" />
                  {row.start_time}
                </span>
              </div>
            </GlassCard>
          </Link>
        );
      })}

      {hasNextPage ? (
        <GlowButton onClick={onLoadMore} disabled={isFetchingNextPage} className="w-full">
          {isFetchingNextPage ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more
            </>
          ) : (
            "Load more history"
          )}
        </GlowButton>
      ) : null}
    </div>
  );
}
