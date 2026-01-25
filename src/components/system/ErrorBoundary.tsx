import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Clear, actionable logging without crashing into UI loops.
    console.error("[ErrorBoundary] Uncaught render error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  private handleReload = () => {
    // Explicit user action only.
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-border/50 bg-card/70 backdrop-blur p-6 shadow-premium">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The app hit an unexpected error. Please try reloading. If the issue persists, contact your admin.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={this.handleReload} className="bg-gradient-premium hover:opacity-90">
              Reload
            </Button>
          </div>

          {import.meta.env.DEV && this.state.error ? (
            <pre className="mt-4 max-h-56 overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              {String(this.state.error.stack ?? this.state.error.message)}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}
