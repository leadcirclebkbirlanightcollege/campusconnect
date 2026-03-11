/**
 * Super Admin navigation configuration — single source of truth.
 */

export interface SANavItem {
  title: string;
  url: string;
  icon: string;
}

export interface SANavSection {
  label: string;
  items: SANavItem[];
}

export const SA_NAV_SECTIONS: SANavSection[] = [
  {
    label: "Command",
    items: [
      { title: "Dashboard",          url: "/platform/admin-control/dashboard",         icon: "LayoutDashboard" },
      { title: "System Map",         url: "/platform/admin-control/system-map",        icon: "Network" },
    ],
  },
  {
    label: "Institutions",
    items: [
      { title: "Colleges",           url: "/platform/admin-control/colleges",           icon: "Building2" },
      { title: "Admins",             url: "/platform/admin-control/admins",             icon: "UserCog" },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Students",           url: "/platform/admin-control/students",           icon: "Users" },
    ],
  },
  {
    label: "Academic Monitor",
    items: [
      { title: "Lectures",           url: "/platform/admin-control/lectures",           icon: "BookOpen" },
      { title: "Attendance",         url: "/platform/admin-control/attendance",         icon: "CheckSquare" },
      { title: "Leaderboard",        url: "/platform/admin-control/leaderboard",        icon: "Trophy" },
      { title: "Achievements",       url: "/platform/admin-control/achievements",       icon: "Award" },
    ],
  },
  {
    label: "Platform",
    items: [
      { title: "Notifications",      url: "/platform/admin-control/notifications",      icon: "Bell" },
      { title: "Analytics",          url: "/platform/admin-control/analytics",          icon: "BarChart3" },
      { title: "Security",           url: "/platform/admin-control/security",           icon: "Shield" },
      { title: "Platform Settings",  url: "/platform/admin-control/platform-settings",  icon: "Settings" },
    ],
  },
];

export interface PageMeta { title: string; description: string }

const SA_PAGE_META: Record<string, PageMeta> = {
  "/platform/admin-control/dashboard":        { title: "Platform Command",   description: "Global platform overview" },
  "/platform/admin-control/colleges":         { title: "Colleges",           description: "Manage all colleges" },
  "/platform/admin-control/create-college":   { title: "Create College",     description: "Register a new college" },
  "/platform/admin-control/admins":           { title: "Admins",             description: "Admin role management" },
  "/platform/admin-control/create-admin":     { title: "Create Admin",       description: "Provision a new admin" },
  "/platform/admin-control/students":         { title: "Students",           description: "Global student directory" },
  "/platform/admin-control/lectures":         { title: "Lecture Monitor",    description: "Live lecture monitoring" },
  "/platform/admin-control/attendance":       { title: "Attendance Control", description: "Global attendance view" },
  "/platform/admin-control/leaderboard":      { title: "Leaderboard",        description: "Platform-wide rankings" },
  "/platform/admin-control/achievements":     { title: "Achievements",       description: "Achievement system" },
  "/platform/admin-control/notifications":    { title: "Notifications",      description: "Platform broadcast" },
  "/platform/admin-control/analytics":        { title: "Analytics",          description: "Cross-college insights" },
  "/platform/admin-control/security":         { title: "Security",           description: "Audit logs & alerts" },
  "/platform/admin-control/platform-settings":{ title: "Platform Settings",  description: "Global configuration" },
};

export function getSAPageMeta(pathname: string): PageMeta {
  if (SA_PAGE_META[pathname]) return SA_PAGE_META[pathname];
  for (const [prefix, meta] of Object.entries(SA_PAGE_META)) {
    if (pathname.startsWith(prefix + "/")) return meta;
  }
  return { title: "Super Admin", description: "" };
}
