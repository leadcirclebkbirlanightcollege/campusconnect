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
import type { ReactNode } from "react";

/** Routes that must NEVER be blocked by auth loading */
const PUBLIC_PREFIXES = ["/auth", "/demo", "/help", "/book-demo", "/onboarding", "/start", "/contact", "/privacy", "/terms", "/verify"];

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

  // Protected routes: wait for auth session to resolve before rendering (AppSplash provides the canonical initial loader)
  if (isLoading) {
    return null;
  }

  // Authenticated + protected route → show overlays + page content
  return (
    <>
      {overlays}
      {children}
    </>
  );
}
