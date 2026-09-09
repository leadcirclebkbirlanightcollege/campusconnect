export type AppRole = "super_admin" | "admin" | "faculty" | "student";

/**
 * Resolves the canonical dashboard URL for a given role.
 * SUPER ADMIN must always be routed to the platform control center: /platform/admin-control/dashboard
 * COLLEGE ADMIN must always be routed to the college command center: /platform/admin/dashboard
 * FACULTY must be routed to: /faculty/dashboard
 * STUDENT / unauthenticated / default must be routed to: /app/dashboard
 */
export function resolveRoleDashboard(role: string | null | undefined): string {
  if (role === "super_admin") return "/platform/admin-control/dashboard";
  if (role === "admin") return "/platform/admin/dashboard";
  if (role === "faculty") return "/faculty/dashboard";
  return "/app/dashboard";
}

/**
 * Validates whether a requested destination path is permissible for a given user role.
 * Prevents Super Admins from being directed to College Admin or Student consoles,
 * and prevents College Admins/Students from entering Super Admin consoles.
 */
export function isRouteAllowedForRole(role: string | null | undefined, path: string | null | undefined): boolean {
  if (!path) return false;

  // Clean path: strip origin if absolute, strip query params and hashes
  let cleanPath = path.trim();
  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    try {
      const url = new URL(cleanPath);
      cleanPath = url.pathname;
    } catch {
      return false;
    }
  }
  cleanPath = cleanPath.split("?")[0].split("#")[0];

  // Disallow double slash or open redirects
  if (!cleanPath.startsWith("/") || cleanPath.startsWith("//")) {
    return false;
  }

  // Public & utility routes allowed for everyone
  if (
    cleanPath === "/" ||
    cleanPath.startsWith("/auth") ||
    cleanPath.startsWith("/verify") ||
    cleanPath.startsWith("/demo") ||
    cleanPath.startsWith("/help") ||
    cleanPath.startsWith("/book-demo") ||
    cleanPath.startsWith("/onboarding") ||
    cleanPath.startsWith("/start") ||
    cleanPath.startsWith("/contact") ||
    cleanPath.startsWith("/privacy") ||
    cleanPath.startsWith("/terms")
  ) {
    return true;
  }

  // SUPER ADMIN: Strictly isolated to /platform/admin-control/*
  if (role === "super_admin") {
    return cleanPath.startsWith("/platform/admin-control");
  }

  // COLLEGE ADMIN: Allowed to /platform/admin/* (never /platform/admin-control/*)
  if (role === "admin") {
    return cleanPath.startsWith("/platform/admin") && !cleanPath.startsWith("/platform/admin-control");
  }

  // FACULTY: Allowed to /faculty/*
  if (role === "faculty") {
    return cleanPath.startsWith("/faculty");
  }

  // STUDENT / DEFAULT: Allowed to /app/* and onboarding flows
  return (
    cleanPath.startsWith("/app") ||
    cleanPath === "/onboarding-wizard" ||
    cleanPath === "/pending-approval" ||
    cleanPath.startsWith("/profile/create") ||
    cleanPath.startsWith("/verification")
  );
}
