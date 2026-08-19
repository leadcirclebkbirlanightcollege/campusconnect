/**
 * QueryErrorState — Reusable error state for failed React Query data fetches.
 * Shows retry button, error ref ID, and optional details.
 */

import { AlertTriangle, RefreshCw, WifiOff } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QueryErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  error?: Error | null;
  compact?: boolean;
  className?: string;
}

function isNetworkError(error?: Error | null): boolean {
  if (!error) return false;
  const msg = error.message?.toLowerCase() ?? "";
  return msg.includes("fetch") || msg.includes("network") || msg.includes("offline");
}

export function QueryErrorState({
  title,
  description,
  onRetry,
  isRetrying = false,
  error,
  compact = false,
  className,
}: QueryErrorStateProps) {
  const isOffline = isNetworkError(error);
  const Icon = isOffline ? WifiOff : AlertTriangle;
  const heading = title ?? (isOffline ? "Connection lost" : "Failed to load data");
  const body =
    description ??
    (isOffline
      ? "Check your internet connection and try again."
      : "Something went wrong while loading. Your data is safe.");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-14 px-6",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-danger/10 border border-danger/20",
          compact ? "h-11 w-11 mb-3" : "h-14 w-14 mb-4",
        )}
      >
        <Icon className={cn("text-danger", compact ? "h-5 w-5" : "h-6 w-6")} />
      </div>

      <h3 className={cn("font-semibold text-foreground", compact ? "text-[13px]" : "text-[15px]")}>
        {heading}
      </h3>
      <p className={cn("text-muted-foreground mt-1 max-w-xs leading-relaxed", compact ? "text-[11px]" : "text-[12px]")}>
        {body}
      </p>

      {onRetry && (
        <Button
          size={compact ? "sm" : "default"}
          variant="outline"
          onClick={onRetry}
          disabled={isRetrying}
          className={cn("gap-2 mt-4 press-scale", isRetrying && "opacity-60")}
        >
          <RefreshCw className={cn("h-4 w-4", isRetrying && "animate-spin")} />
          {isRetrying ? "Retrying…" : "Try Again"}
        </Button>
      )}
    </div>
  );
}
