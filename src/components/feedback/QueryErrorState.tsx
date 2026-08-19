/**
 * QueryErrorState — surfaced when a data query actually FAILS.
 * This is deliberately distinct from an empty state: empty means
 * "the database has no records", this means "we could not read them".
 */
import { AlertTriangle, RefreshCw } from "@/components/icons";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function QueryErrorState({
  title = "Couldn't load this data",
  error,
  onRetry,
  isRetrying,
  className,
}: Props) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unexpected error";

  return (
    <div
      role="alert"
      className={cn(
        "rounded-[20px] border border-danger/30 bg-danger/5 p-5 text-center",
        className,
      )}
    >
      <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-danger/10">
        <AlertTriangle className="h-5 w-5 text-danger" />
      </span>
      <p className="font-heading text-[14px] font-bold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[11.5px] leading-snug text-muted-foreground break-words">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-1",
            "px-3.5 py-1.5 text-[12px] font-semibold text-foreground",
            "transition-colors hover:border-primary/40 disabled:opacity-60",
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")} />
          Try again
        </button>
      )}
    </div>
  );
}

export default QueryErrorState;
