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
      { title: "Overview",           url: "/platform/admin-control/dashboard",         icon: "LayoutDashboard" },
      { title: "System Health",      url: "/platform/admin-control/system-health",     icon: "Activity" },
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
    label: "Platform",
    items: [
      { title: "Leads & CRM",       url: "/platform/admin-control/leads",              icon: "Target" },
      { title: "Notifications",      url: "/platform/admin-control/notifications",      icon: "Bell" },
      { title: "Security",           url: "/platform/admin-control/security",           icon: "Shield" },
      { title: "Platform Settings",  url: "/platform/admin-control/platform-settings",  icon: "Settings" },
    ],
  },
];


export interface PageMeta { title: string; description: string }

const SA_PAGE_META: Record<string, PageMeta> = {
  "/platform/admin-control/dashboard":        { title: "Platform Overview",  description: "Global platform metrics & quick actions" },
  "/platform/admin-control/system-map":       { title: "System Map",         description: "Live ecosystem hierarchy & attendance heatmap" },
  "/platform/admin-control/system-health":    { title: "System Health",      description: "Infrastructure diagnostics & service latency" },
  "/platform/admin-control/colleges":         { title: "Colleges",           description: "Manage all institutions" },
  "/platform/admin-control/create-college":   { title: "Create College",     description: "Register a new institution" },
  "/platform/admin-control/admins":           { title: "Admins",             description: "Admin role management across colleges" },
  "/platform/admin-control/create-admin":     { title: "Create Admin",       description: "Provision a new administrator" },
  "/platform/admin-control/students":         { title: "Students",           description: "Global student directory" },
  "/platform/admin-control/lectures":         { title: "Lecture Monitor",    description: "Live & upcoming lecture monitoring" },
  "/platform/admin-control/attendance":       { title: "Attendance Control", description: "Global attendance view & corrections" },
  "/platform/admin-control/leaderboard":      { title: "Leaderboard",        description: "Platform-wide rankings & points" },
  "/platform/admin-control/achievements":     { title: "Achievements",       description: "Achievement system management" },
  "/platform/admin-control/notifications":    { title: "Notification Center",description: "Platform-wide broadcast & targeting" },
  "/platform/admin-control/analytics":        { title: "Analytics",          description: "Cross-college insights & trends" },
  "/platform/admin-control/security":         { title: "Security Monitor",   description: "Audit logs, alerts & login activity" },
  "/platform/admin-control/platform-settings":{ title: "Platform Settings",  description: "Global configuration & branding" },
};

export function getSAPageMeta(pathname: string): PageMeta {
  if (SA_PAGE_META[pathname]) return SA_PAGE_META[pathname];
  for (const [prefix, meta] of Object.entries(SA_PAGE_META)) {
    if (pathname.startsWith(prefix + "/")) return meta;
  }
  return { title: "Super Admin", description: "" };
}
