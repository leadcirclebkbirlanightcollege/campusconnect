/**
 * NAVIGATION ENGINE — single source of truth for the student app shell.
 *
 *   - 5-tab bottom navigation model (Home · Academics · Community · E-Cell · Profile)
 *   - Route → tab resolution (so detail screens keep their parent tab active)
 *   - Page meta (title, description) for the top app bar
 *   - Smart back targets so no screen is a dead end
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

export interface StudentTab {
  id: "home" | "academics" | "community" | "ecell" | "profile";
  label: string;
  href: string;
  /** Route prefixes owned by this tab */
  match: string[];
  /** Warm the chunk on hover / touch-start */
  prefetch: () => void;
}

export const STUDENT_TABS: StudentTab[] = [
  {
    id: "home",
    label: "Home",
    href: "/app/dashboard",
    match: ["/app/dashboard", "/app/scan", "/app/inbox", "/app/notifications", "/app/points", "/app/leaderboard"],
    prefetch: () => { void import("@/pages/student/StudentDashboard"); },
  },
  {
    id: "academics",
    label: "Academics",
    href: "/app/academics",
    match: [
      "/app/academics",
      "/app/lectures",
      "/app/timetable",
      "/app/attendance",
      "/app/assignments",
      "/app/documents",
      "/app/results",
      "/app/programmes",
    ],
    prefetch: () => { void import("@/pages/student/hubs/AcademicsHub"); },
  },
  {
    id: "community",
    label: "Community",
    href: "/app/community",
    match: ["/app/community", "/app/events", "/app/announcements"],
    prefetch: () => { void import("@/pages/student/hubs/CommunityHub"); },
  },
  {
    id: "ecell",
    label: "E-Cell",
    href: "/app/ecell",
    match: ["/app/ecell"],
    prefetch: () => { void import("@/pages/student/ecell/StudentEcellHub"); },
  },
  {
    id: "profile",
    label: "Profile",
    href: "/app/settings",
    match: ["/app/settings", "/app/profile", "/app/id-card", "/app/support", "/app/install"],
    prefetch: () => { void import("@/pages/student/StudentProfile"); },
  },
];

/** Legacy export kept for compatibility */
export const BOTTOM_NAV_ROUTES = STUDENT_TABS.map((t) => t.href);

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/** Which tab owns the current route (most specific match wins) */
export function resolveActiveTab(pathname: string): StudentTab | null {
  let best: { tab: StudentTab; len: number } | null = null;
  for (const tab of STUDENT_TABS) {
    for (const m of tab.match) {
      if (matchesPrefix(pathname, m) && (!best || m.length > best.len)) {
        best = { tab, len: m.length };
      }
    }
  }
  return best?.tab ?? null;
}

/** Root screens of each tab — never show a back button on these */
export const TAB_ROOTS = new Set(STUDENT_TABS.map((t) => t.href));

/**
 * Fallback parent route used when there is no in-app history to pop
 * (deep link, hard refresh, PWA cold start). Guarantees smart back never
 * dead-ends the user.
 */
const BACK_FALLBACKS: Array<[string, string]> = [
  ["/app/lectures/", "/app/lectures"],
  ["/app/programmes/", "/app/programmes"],
  ["/app/attendance/", "/app/attendance"],
  ["/app/settings/", "/app/settings"],
  ["/app/ecell/", "/app/ecell"],
  ["/app/events/", "/app/events"],
  ["/app/announcements/", "/app/announcements"],
];

export function getBackFallback(pathname: string): string {
  for (const [prefix, parent] of BACK_FALLBACKS) {
    if (pathname.startsWith(prefix)) return parent;
  }
  const tab = resolveActiveTab(pathname);
  if (tab && pathname !== tab.href) return tab.href;
  return "/app/dashboard";
}

/** Page metadata registry */
export const PAGE_META: Record<string, PageMeta> = {
  "/app/dashboard":    { title: "Dashboard",       description: "Your academic overview" },
  "/app/academics":    { title: "Academics",       description: "Lectures, attendance & study material" },
  "/app/community":    { title: "Community",       description: "Events, announcements & circles" },
  "/app/attendance":   { title: "Attendance",       description: "Track your attendance" },
  "/app/lectures":     { title: "Lectures",         description: "Upcoming lecture sessions" },
  "/app/timetable":    { title: "Timetable",        description: "Your weekly schedule" },
  "/app/assignments":  { title: "Assignments",      description: "Tasks & submissions" },
  "/app/documents":    { title: "Documents",        description: "Notes & study material" },
  "/app/results":      { title: "Results",          description: "Exam performance" },
  "/app/leaderboard":  { title: "Leaderboard",      description: "Student rankings" },
  "/app/points":       { title: "Points",           description: "Your reward balance" },
  "/app/achievements": { title: "Achievements",     description: "Your earned badges" },
  "/app/profile":      { title: "Settings",         description: "Your account control center" },
  "/app/settings":     { title: "Settings",         description: "Your account control center" },
  "/app/inbox":        { title: "Inbox",            description: "Notifications & messages" },
  "/app/id-card":      { title: "Digital ID",       description: "Your student identity card" },
  "/app/programmes":   { title: "Learning Circles", description: "Enrolled programmes" },
  "/app/announcements":{ title: "Announcements",    description: "Important updates" },
  "/app/events":       { title: "Events",           description: "Campus events" },
  "/app/ecell":        { title: "E-Cell",           description: "Entrepreneurship Cell • BKBNC" },
  "/app/ecell/committee": { title: "E-Cell Committee", description: "Connect with the E-Cell team" },
  "/app/ecell/stalls": { title: "Stalls Marketplace", description: "Campus vendor applications" },
  "/app/polls":        { title: "Polls",            description: "Active polls & surveys" },
  "/app/daily":        { title: "Daily",            description: "Daily content" },
  "/app/support":      { title: "Help & Support",   description: "We're here to help" },
  "/app/scan":         { title: "Scan Attendance",  description: "Mark your attendance" },
  "/platform/admin/dashboard":              { title: "Command Center",   description: "Administration" },
  "/platform/admin/ecell":                  { title: "E-Cell Management", description: "Core Team & Stalls" },
  "/platform/admin-control/dashboard":     { title: "Platform Command", description: "Super Admin" },
};

export function getPageMeta(pathname: string): PageMeta {
  // Exact match first
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  // Prefix match (longest wins)
  let best: { meta: PageMeta; len: number } | null = null;
  for (const [prefix, meta] of Object.entries(PAGE_META)) {
    if (pathname.startsWith(prefix + "/") && (!best || prefix.length > best.len)) {
      best = { meta, len: prefix.length };
    }
  }
  return best?.meta ?? { title: "Campus Connect", description: "" };
}

/** Check if a route is active (exact or prefix) */
export function isRouteActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  return matchesPrefix(pathname, href);
}
