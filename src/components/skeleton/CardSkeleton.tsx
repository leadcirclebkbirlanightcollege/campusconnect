import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CardSkeletonProps {
  lines?: number;
  showAvatar?: boolean;
  className?: string;
}

export function CardSkeleton({ lines = 2, showAvatar = false, className }: CardSkeletonProps) {
  return (
    <div className={cn("bg-card border border-border-subtle rounded-xl p-4 space-y-3", className)}>
      <div className="flex items-center gap-3">
        {showAvatar && <Skeleton className="h-10 w-10 rounded-full shrink-0" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-3/5" : "w-full")} />
      ))}
    </div>
  );
}
