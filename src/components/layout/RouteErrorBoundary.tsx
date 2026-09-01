/**
 * RouteErrorBoundary — Lightweight error boundary for individual routes.
 * Shows a compact, graceful recovery card instead of a raw crash.
 */
import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "@/components/icons";
import { normalizeError, logTechnicalError } from "@/lib/error-handling";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    const appError = normalizeError(error, this.props.context || "route-error");
    logTechnicalError(appError);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const appError = this.state.error
      ? normalizeError(this.state.error, this.props.context, this.props.fallbackMessage)
      : null;

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 px-6 text-center">
        <div className="h-12 w-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1 max-w-sm">
          <p className="text-[15px] font-bold text-foreground tracking-tight">
            {this.props.fallbackMessage ?? "Failed to load this section"}
          </p>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            {appError?.userMessage ?? "An unexpected error occurred while loading this view."}
          </p>
        </div>
        <button
          type="button"
          onClick={this.handleRetry}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold shadow-xs hover:opacity-90 transition-opacity cursor-pointer mt-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try Again
        </button>
      </div>
    );
  }
}
