import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import AppShell from "@/components/layout/AppShell";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <AppShell>
      <main className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-xl rounded-3xl border border-border/40 bg-card/50 p-10 text-center shadow-sm">
          <h1 className="mb-3 text-4xl font-bold">404</h1>
          <p className="mb-6 text-muted-foreground">Oops! Page not found</p>
          <a href="/" className="text-primary underline hover:text-primary/90">
            Return to Home
          </a>
        </div>
      </main>
    </AppShell>
  );
};

export default NotFound;
