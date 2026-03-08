import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  count?: number;
  showAvatar?: boolean;
  className?: string;
}

export function ListSkeleton({ count = 4, showAvatar = true, className }: ListSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-card border border-border-subtle rounded-xl px-4 py-3">
          {showAvatar && <Skeleton className="h-9 w-9 rounded-full shrink-0" />}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-6 w-14 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}
