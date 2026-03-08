import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/components/skeleton/CardSkeleton";
import { ListSkeleton } from "@/components/skeleton/ListSkeleton";
import { MetricSkeleton } from "@/components/skeleton/MetricSkeleton";

interface PageSkeletonProps {
  variant?: "dashboard" | "list" | "detail" | "simple";
  className?: string;
}

export function PageSkeleton({ variant = "dashboard", className }: PageSkeletonProps) {
  return (
    <div className={cn("animate-pulse px-4 py-5 space-y-6", className)}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/5" />
        <Skeleton className="h-4 w-1/3" />
      </div>

      {variant === "dashboard" && (
        <>
          <MetricSkeleton count={4} />
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/4" />
            <CardSkeleton lines={3} />
            <CardSkeleton lines={2} />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/5" />
            <ListSkeleton count={3} />
          </div>
        </>
      )}

      {variant === "list" && <ListSkeleton count={6} />}

      {variant === "detail" && (
        <>
          <CardSkeleton lines={4} showAvatar />
          <MetricSkeleton count={3} columns={3} />
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
