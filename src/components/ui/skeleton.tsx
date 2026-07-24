import { cn } from "@/lib/utils";

/**
 * Skeleton — shimmer loader used across every screen while data is fetching.
 * Uses a gradient background sweep so the loading state feels native.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-[linear-gradient(90deg,hsl(var(--surface-2))_0%,hsl(var(--surface-3))_50%,hsl(var(--surface-2))_100%)]",
        "bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
