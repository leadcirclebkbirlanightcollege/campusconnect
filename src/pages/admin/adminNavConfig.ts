/**
 * Admin navigation configuration — single source of truth
 * for sidebar links and page metadata.
 */

export interface AdminNavItem {
  title: string;
  url: string;
  icon: string;
  badge?: boolean;
}

export interface AdminNavSection {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: "Command",
    items: [
      { title: "Overview",       url: "/platform/admin/dashboard",     icon: "LayoutDashboard" },
    ],
  },
  {
    label: "Academics",
    items: [
      { title: "Students",       url: "/platform/admin/students",       icon: "Users" },
      { title: "Lectures",       url: "/platform/admin/lectures",       icon: "BookOpen" },
      { title: "Programmes",     url: "/platform/admin/programmes",     icon: "GraduationCap" },
      { title: "Allotments",     url: "/platform/admin/allotments",     icon: "UserCheck" },
    ],
  },
  {
    label: "Attendance",
    items: [
      { title: "Control",        url: "/platform/admin/attendance",     icon: "CheckSquare" },
      { title: "Monthly Report", url: "/platform/admin/attendance/monthly",   icon: "BarChart3" },
      { title: "Corrections",    url: "/platform/admin/attendance/corrections", icon: "FileEdit" },
    ],
  },
  {
    label: "Engagement",
    items: [
      { title: "Announcements",  url: "/platform/admin/announcements",  icon: "Megaphone" },
      { title: "Events",         url: "/platform/admin/events",         icon: "CalendarDays" },
      { title: "Polls",          url: "/platform/admin/polls",          icon: "BarChart3" },
      { title: "Daily Content",  url: "/platform/admin/daily-content",  icon: "Sparkles" },
      { title: "Notifications",  url: "/platform/admin/notifications",  icon: "Bell" },
      { title: "Challenges",     url: "/platform/admin/challenges",     icon: "Trophy" },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Points",         url: "/platform/admin/points",         icon: "Coins" },
      { title: "ID Scanner",     url: "/platform/admin/scanner",        icon: "ScanLine" },
      { title: "Audit Log",      url: "/platform/admin/audit-log",      icon: "FileText" },
      { title: "Branding",       url: "/platform/admin/branding",       icon: "Palette" },
      { title: "Core Team",      url: "/platform/admin/core-team",      icon: "UserCog" },
      { title: "Platform Ctrl",  url: "/platform/admin/system-control", icon: "Settings" },
      { title: "Settings",       url: "/platform/admin/settings",       icon: "SlidersHorizontal" },
    ],
  },
];

export interface PageMeta { title: string; description: string }

const ADMIN_PAGE_META: Record<string, PageMeta> = {
  "/platform/admin/dashboard":              { title: "Command Center",     description: "Overview & key metrics" },
  "/platform/admin/students":               { title: "Students",           description: "Manage student accounts" },
  "/platform/admin/create-student":         { title: "Create Student",     description: "Add a new student" },
  "/platform/admin/lectures":               { title: "Lectures",           description: "Schedule & manage lectures" },
  "/platform/admin/create-lecture":         { title: "Create Lecture",     description: "Schedule a new lecture" },
  "/platform/admin/programmes":             { title: "Programmes",         description: "Learning circle management" },
  "/platform/admin/allotments":             { title: "Allotments",         description: "Student programme allotment" },
  "/platform/admin/attendance":             { title: "Attendance Control", description: "Live attendance management" },
  "/platform/admin/attendance/monthly":     { title: "Monthly Report",     description: "Monthly attendance export" },
  "/platform/admin/attendance/corrections": { title: "Corrections",        description: "Edit attendance records" },
  "/platform/admin/announcements":          { title: "Announcements",      description: "Broadcast to students" },
  "/platform/admin/events":                 { title: "Events",             description: "Campus events management" },
  "/platform/admin/polls":                  { title: "Polls",              description: "Poll & survey management" },
  "/platform/admin/daily-content":          { title: "Daily Content",      description: "Content of the day" },
  "/platform/admin/notifications":          { title: "Notifications",      description: "Push notification center" },
  "/platform/admin/challenges":             { title: "Challenges",         description: "Engagement challenges" },
  "/platform/admin/points":                 { title: "Points",             description: "Points & adjustments" },
  "/platform/admin/scanner":               { title: "ID Scanner",         description: "Digital ID verification" },
  "/platform/admin/audit-log":              { title: "Audit Log",          description: "Action history" },
  "/platform/admin/branding":              { title: "Branding",           description: "College branding settings" },
  "/platform/admin/core-team":              { title: "Core Team",          description: "Core team members" },
  "/platform/admin/system-control":        { title: "Platform Control",   description: "System-level settings" },
  "/platform/admin/settings":              { title: "Admin Settings",     description: "Profile & system settings" },
};

export function getAdminPageMeta(pathname: string): PageMeta {
  if (ADMIN_PAGE_META[pathname]) return ADMIN_PAGE_META[pathname];
  for (const [prefix, meta] of Object.entries(ADMIN_PAGE_META)) {
    if (pathname.startsWith(prefix + "/")) return meta;
  }
  return { title: "Admin", description: "" };
}
