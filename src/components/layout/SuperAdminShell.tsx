import { ReactNode } from "react";

/**
 * Minimal shell wrapper for the /platform/admin route.
 * Super admin dashboard is self-contained with its own header.
 */
export default function SuperAdminShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
