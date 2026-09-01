import React from "react";
import { AlertTriangle, RefreshCw } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DataErrorStateProps {
  /** Main title (e.g. "Unable to load students") */
  title?: string;
  /** Secondary explanation */
  description?: string;
  /** Callback triggered when user clicks Retry */
  onRetry?: () => void;
  /** Custom icon component */
  icon?: React.ReactNode;
  /** Custom CSS classes */
  className?: string;
  /** Render compact layout for small card widgets */
  compact?: boolean;
}

export function DataErrorState({
  title = "Unable to load data",
  description = "Please check your network connection and try again.",
  onRetry,
  icon,
  className,
  compact = false,
}: DataErrorStateProps) {
  if (compact) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className={cn(
          "flex items-center justify-between gap-3 p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-xs text-foreground",
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 rounded-lg bg-destructive/10 text-destructive shrink-0">
            {icon || <AlertTriangle className="h-4 w-4" />}
          </div>
          <div className="min-w-0 truncate">
            <p className="font-semibold text-foreground truncate">{title}</p>
            {description && (
              <p className="text-[11px] text-muted-foreground truncate">{description}</p>
            )}
          </div>
        </div>
        {onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-7 px-2.5 text-[11px] font-semibold text-destructive hover:bg-destructive/10 shrink-0 gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-border/60 bg-card/60 shadow-xs",
        className
      )}
    >
      <div className="h-12 w-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-3.5">
        {icon || <AlertTriangle className="h-6 w-6" />}
      </div>
      <h3 className="text-[15px] font-bold text-foreground mb-1">{title}</h3>
      <p className="text-[12.5px] text-muted-foreground max-w-sm mb-4 leading-relaxed">
        {description}
      </p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="h-8.5 px-4 text-xs font-semibold gap-1.5 shadow-2xs hover:bg-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try Again
        </Button>
      )}
    </div>
  );
}

export default DataErrorState;
