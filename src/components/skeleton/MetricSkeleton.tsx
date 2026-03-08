import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function MetricSkeleton({ count = 4, columns = 2, className }: MetricSkeletonProps) {
  const gridClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  }[columns];

  return (
    <div className={cn("grid gap-3", gridClass, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border-subtle rounded-xl p-4 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-2.5 w-2/5" />
        </div>
      ))}
    </div>
  );
}
