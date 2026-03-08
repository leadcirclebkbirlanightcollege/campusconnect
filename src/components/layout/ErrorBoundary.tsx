import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props  { children: ReactNode; context?: string; }
interface State  { hasError: boolean; error: Error | null; errorId: string | null; }

/** Structured error reporter — sanitises stack traces before logging */
function reportError(error: Error, context?: string, errorId?: string) {
  const sanitised = {
    errorId,
    context,
    message: error.message,
    // Never expose full file paths in production
    name: error.name,
    timestamp: new Date().toISOString(),
  };
  console.error("[ErrorBoundary]", sanitised);
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
    reportError(error, this.props.context, this.state.errorId ?? undefined);
    // Could POST to an error-tracking edge function here
    // supabase.functions.invoke("log-client-error", { body: { ... } })
    void info;
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isProd = import.meta.env.PROD;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 bg-background text-center">
        {/* Icon */}
        <div className="h-16 w-16 rounded-2xl bg-danger/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-danger" />
        </div>

        {/* Copy */}
        <div className="space-y-1 max-w-sm">
          <h1 className="text-[18px] font-bold text-foreground">Something went wrong</h1>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            An unexpected error occurred. Your data is safe — please refresh the page.
          </p>
          {!isProd && this.state.error && (
            <pre className="mt-3 text-left text-[11px] text-danger bg-danger/5 rounded-xl p-3 overflow-auto max-h-32 border border-danger/20">
              {this.state.error.message}
            </pre>
          )}
        </div>

        {/* Error ID for support */}
        {this.state.errorId && (
          <p className="text-[10px] text-muted-foreground/50 font-mono">
            Ref: {this.state.errorId}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold shadow-sm hover:opacity-90 transition-opacity"
            onClick={this.handleRetry}
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-foreground text-[13px] font-medium hover:bg-surface-2 transition-colors"
            onClick={() => { window.location.href = "/"; }}
          >
            <Home className="h-4 w-4" />
            Go Home
          </button>
        </div>
      </div>
    );
  }
}
