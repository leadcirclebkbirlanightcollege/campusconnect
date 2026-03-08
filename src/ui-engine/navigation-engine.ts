/**
 * NAVIGATION ENGINE — Route definitions & navigation helpers
 *
 * Single source of truth for:
 *   - Bottom nav items (mobile)
 *   - Page meta (title, description)
 *   - Route guards
 */

export interface NavItem {
  label: string;
  href: string;
  icon: string;   // lucide icon name — resolved in components
  badge?: boolean; // shows live badge (e.g., unread count)
}

export interface PageMeta {
  title: string;
  description: string;
}

/** Bottom navigation items (mobile) */
export const BOTTOM_NAV_ROUTES = [
  "/app/dashboard",
  "/app/attendance",
  "/app/lectures",
  "/app/leaderboard",
  "/app/profile",
] as const;

/** Page metadata registry */
export const PAGE_META: Record<string, PageMeta> = {
  "/app/dashboard":    { title: "Dashboard",       description: "Your academic overview" },
  "/app/attendance":   { title: "Attendance",       description: "Track your attendance" },
  "/app/lectures":     { title: "Lectures",         description: "Upcoming lecture sessions" },
  "/app/leaderboard":  { title: "Leaderboard",      description: "Student rankings" },
  "/app/achievements": { title: "Achievements",     description: "Your earned badges" },
  "/app/profile":      { title: "Profile",          description: "Your account settings" },
  "/app/inbox":        { title: "Inbox",            description: "Notifications & messages" },
  "/app/id-card":      { title: "Digital ID",       description: "Your student identity card" },
  "/app/programmes":   { title: "Learning Circles", description: "Enrolled programmes" },
  "/app/announcements":{ title: "Announcements",    description: "Important updates" },
  "/app/events":       { title: "Events",           description: "Campus events" },
  "/app/polls":        { title: "Polls",            description: "Active polls & surveys" },
  "/app/daily":        { title: "Daily",            description: "Daily content" },
  "/app/scan":         { title: "Scan Attendance",  description: "Mark your attendance" },
  "/app/admin/dashboard": { title: "Command Center", description: "Administration" },
  "/platform/admin":      { title: "Super Admin",    description: "Platform management" },
};

export function getPageMeta(pathname: string): PageMeta {
  // Exact match first
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  // Prefix match
  for (const [prefix, meta] of Object.entries(PAGE_META)) {
    if (pathname.startsWith(prefix + "/")) return meta;
  }
  return { title: "Campus Connect", description: "" };
}

/** Check if a route is active (exact or prefix) */
export function isRouteActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}
