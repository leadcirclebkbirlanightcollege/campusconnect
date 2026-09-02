import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, RotateCcw } from "@/components/icons";
import { normalizeError, logTechnicalError } from "@/lib/error-handling";

interface Props {
  children: ReactNode;
  context?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  isRetrying: boolean;
  retryCount: number;
  remountKey: number;
}

function generateErrorId() {
  return `ERR-${Date.now().toString(36).toUpperCase()}`;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorId: null,
    isRetrying: false,
    retryCount: 0,
    remountKey: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      // Retain existing errorId during the same error session so it does not cycle unnecessarily
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, info: unknown) {
    const appError = normalizeError(error, this.props.context || "react-error-boundary");
    logTechnicalError(appError);
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary caught component error]:", error, info);
    }
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });

    try {
      // 1. Revalidate active Supabase auth session
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.auth.getSession();
      } catch (authErr) {
        console.warn("[ErrorBoundary] Auth session revalidation notice:", authErr);
      }

      // 2. Reset and refetch React Query cache
      try {
        const { queryClient } = await import("@/providers/QueryProvider");
        queryClient.invalidateQueries();
        await queryClient.refetchQueries({ type: "active" });
      } catch (queryErr) {
        console.warn("[ErrorBoundary] Query cache invalidation notice:", queryErr);
      }

      // 3. Trigger custom onReset callback if provided
      if (this.props.onReset) {
        this.props.onReset();
      }
    } finally {
      // 4. Increment remountKey to force React to mount fresh component tree
      this.setState((prev) => ({
        hasError: false,
        error: null,
        isRetrying: false,
        retryCount: prev.retryCount + 1,
        remountKey: prev.remountKey + 1,
      }));
    }
  };

  handleNavigateDashboard = () => {
    const path = window.location.pathname;
    let target = "/";
    if (path.startsWith("/faculty")) {
      target = "/faculty/dashboard";
    } else if (path.startsWith("/platform/admin-control")) {
      target = "/platform/admin-control/dashboard";
    } else if (path.startsWith("/platform/admin")) {
      target = "/platform/admin/dashboard";
    } else if (path.startsWith("/app")) {
      target = "/app/dashboard";
    }
    window.location.href = target;
  };

  render() {
    if (!this.state.hasError) {
      return (
        <div key={this.state.remountKey} className="contents">
          {this.props.children}
        </div>
      );
    }

    const isFrequentRetry = this.state.retryCount >= 2;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 bg-background text-center">
        {/* Icon */}
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        {/* Copy */}
        <div className="space-y-1.5 max-w-sm">
          <h1 className="text-[19px] font-bold text-foreground tracking-tight">
            Something went wrong
          </h1>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            We couldn't load this part of Campus Connect. Your data is safe — please try again or return to the main dashboard.
          </p>
        </div>

        {/* Error Reference for Support */}
        {this.state.errorId && (
          <p className="text-[11px] text-muted-foreground/60 font-mono">
            Reference ID: {this.state.errorId}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={this.state.isRetrying}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold shadow-xs hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            onClick={this.handleRetry}
          >
            <RefreshCw className={`h-4 w-4 ${this.state.isRetrying ? "animate-spin" : ""}`} />
            {this.state.isRetrying ? "Retrying..." : "Try Again"}
          </button>

          {isFrequentRetry && (
            <button
              type="button"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-[13px] font-medium hover:bg-destructive/20 transition-colors cursor-pointer"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="h-4 w-4" />
              Reload Page
            </button>
          )}

          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-foreground text-[13px] font-medium hover:bg-muted transition-colors cursor-pointer"
            onClick={this.handleNavigateDashboard}
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
}
