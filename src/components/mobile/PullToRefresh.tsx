import { useCallback, useRef, useState } from "react";
import { Loader2 } from "@/components/icons";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<unknown>;
  className?: string;
  threshold?: number;
}

export function PullToRefresh({
  children,
  onRefresh,
  className,
  threshold = 72,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);

  const resetPull = useCallback(() => {
    startYRef.current = null;
    pullingRef.current = false;
    setPullDistance(0);
  }, []);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (isRefreshing || window.scrollY > 0 || event.touches.length !== 1) return;
    startYRef.current = event.touches[0].clientY;
  }, [isRefreshing]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (isRefreshing || startYRef.current === null || event.touches.length !== 1) return;

    const deltaY = event.touches[0].clientY - startYRef.current;
    if (deltaY <= 0) return;

    pullingRef.current = true;
    setPullDistance(Math.min(88, deltaY * 0.45));
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshing || !pullingRef.current) {
      resetPull();
      return;
    }

    const shouldRefresh = pullDistance >= threshold;

    if (!shouldRefresh) {
      resetPull();
      return;
    }

    setIsRefreshing(true);
    setPullDistance(56);

    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      resetPull();
    }
  }, [isRefreshing, onRefresh, pullDistance, resetPull, threshold]);

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetPull}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2"
        style={{
          opacity: pullDistance > 2 || isRefreshing ? 1 : 0,
          transform: `translate3d(-50%, ${Math.max(4, pullDistance - 24)}px, 0)`,
          transition: isRefreshing ? "none" : "opacity 120ms ease, transform 120ms ease",
        }}
        aria-hidden
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-surface-1 shadow-sm">
          <Loader2 className={cn("h-4 w-4 text-primary", (isRefreshing || pullDistance >= threshold) && "animate-spin")} />
        </div>
      </div>

      <div
        style={{
          transform: `translate3d(0, ${isRefreshing ? 40 : pullDistance}px, 0)`,
          transition: isRefreshing ? "transform 120ms ease" : "transform 180ms ease",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
