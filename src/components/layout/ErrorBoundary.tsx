import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "@/components/icons";
import { normalizeError, logTechnicalError } from "@/lib/error-handling";

interface Props {
  children: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

function generateErrorId() {
  return `ERR-${Date.now().toString(36).toUpperCase()}`;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorId: null };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, info: unknown) {
    const appError = normalizeError(error, this.props.context || "react-error-boundary");
    logTechnicalError(appError);
    void info;
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

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
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
            onClick={this.handleRetry}
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-foreground text-[13px] font-medium hover:bg-muted transition-colors cursor-pointer"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
}
