import { cn } from "@/lib/utils";

/**
 * Skeleton — shimmer loader used across every screen while data is fetching.
 * Uses a subtle gradient sweep so the loading state feels native, not "loading…".
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-surface-2",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-surface-3 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
