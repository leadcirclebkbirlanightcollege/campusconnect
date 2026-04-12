/**
 * AppGuard — Global auth + routing guard.
 *
 * Responsibilities:
 *  1. Shows a full-screen spinner while the auth session is initialising.
 *  2. On public routes (/  /auth/*) → renders children immediately, no overlay.
 *  3. On protected routes → waits for auth before rendering, preventing blank screens.
 *  4. Gate-keeps global overlays (WhatsNew, AppSplash, InstallPrompt) so they
 *     only appear for authenticated users on protected routes.
 *
 * This component is the single source of truth for "is the app ready to render?".
 */

import { useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/** Routes that must NEVER be blocked by auth loading */
const PUBLIC_PREFIXES = ["/auth", "/demo", "/help", "/book-demo", "/onboarding", "/start", "/contact", "/privacy", "/terms"];

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"));
}

interface AppGuardProps {
  /** Overlays (WhatsNew, AppSplash, InstallPrompt) — only rendered when authenticated */
  overlays?: ReactNode;
  children: ReactNode;
}

export default function AppGuard({ overlays, children }: AppGuardProps) {
  const { isLoading } = useAuth();
  const { pathname } = useLocation();

  const onPublicRoute = isPublicPath(pathname);

  // Public routes always render immediately — never block with a loader
  if (onPublicRoute) {
    return <>{children}</>;
  }

  // Protected routes: wait for auth session to resolve before rendering
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="relative">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground tracking-wide">Loading Campus Connect…</p>
      </div>
    );
  }

  // Authenticated + protected route → show overlays + page content
  return (
    <>
      {overlays}
      {children}
    </>
  );
}
