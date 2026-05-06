/**
 * Admin navigation configuration — single source of truth
 * for sidebar links and page metadata.
 *
 * Groups are role-aware; visual hierarchy is handled by the sidebar.
 * The "E-Cell" group is visually distinct (purple accent) and must
 * stay separated from the main Campus / Engagement modules.
 */

export interface AdminNavItem {
  title: string;
  url: string;
  icon: string;
  badge?: boolean;
}

export interface AdminNavSection {
  /** Section heading (uppercase pill in sidebar) */
  label: string;
  /** Optional accent: "ecell" → purple highlight */
  accent?: "ecell";
  /** Default open state for collapsible groups (default true) */
  defaultOpen?: boolean;
  items: AdminNavItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: "Command",
    defaultOpen: true,
    items: [
      { title: "Overview",       url: "/platform/admin/dashboard",      icon: "LayoutDashboard" },
    ],
  },
  {
    label: "Academics",
    defaultOpen: true,
    items: [
      { title: "Students",       url: "/platform/admin/students",       icon: "Users" },
      { title: "Faculty",        url: "/platform/admin/faculty",        icon: "GraduationCap" },
      { title: "Lectures",       url: "/platform/admin/lectures",       icon: "BookOpen" },
      { title: "Timetable",      url: "/platform/admin/timetable",      icon: "CalendarDays" },
      { title: "Programmes",     url: "/platform/admin/programmes",     icon: "Sparkles" },
      { title: "Departments",    url: "/platform/admin/departments",    icon: "Building2" },
      { title: "Classes",        url: "/platform/admin/classes",        icon: "School" },
      { title: "Allotments",     url: "/platform/admin/allotments",     icon: "UserCheck" },
    ],
  },
  {
    label: "Attendance",
    defaultOpen: false,
    items: [
      { title: "Control",        url: "/platform/admin/attendance",             icon: "CheckSquare" },
      { title: "Monthly Report", url: "/platform/admin/attendance/monthly",     icon: "BarChart3" },
      { title: "Corrections",    url: "/platform/admin/attendance/corrections", icon: "FileEdit" },
    ],
  },
  {
    label: "Exams & Content",
    defaultOpen: false,
    items: [
      { title: "Exams & Results", url: "/platform/admin/exams",         icon: "ClipboardList" },
      { title: "Documents",       url: "/platform/admin/documents",     icon: "FileText" },
    ],
  },
  {
    label: "Campus",
    defaultOpen: false,
    items: [
      { title: "Announcements",  url: "/platform/admin/announcements",  icon: "Megaphone" },
      { title: "Events",         url: "/platform/admin/events",         icon: "CalendarDays" },
      { title: "Channels",       url: "/platform/admin/channels",       icon: "Hash" },
      { title: "Notifications",  url: "/platform/admin/notifications",  icon: "Bell" },
    ],
  },
  {
    label: "E-Cell",
    accent: "ecell",
    defaultOpen: true,
    items: [
      { title: "E-Cell Events",   url: "/platform/admin/events?ecell=1",  icon: "CalendarDays" },
      { title: "Stall Requests",  url: "/platform/admin/stalls",          icon: "Store" },
      { title: "Points",          url: "/platform/admin/points",          icon: "Coins" },
      { title: "Point Claims",    url: "/platform/admin/point-claims",    icon: "Coins" },
    ],
  },
  {
    label: "Engagement",
    defaultOpen: false,
    items: [
      { title: "Polls",          url: "/platform/admin/polls",                 icon: "BarChart3" },
      { title: "Challenges",     url: "/platform/admin/challenges",            icon: "Trophy" },
      { title: "Leaderboard",    url: "/platform/admin/dashboard#leaderboard", icon: "Trophy" },
      { title: "Achievements",   url: "/platform/admin/challenges",            icon: "Trophy" },
      { title: "Daily Content",  url: "/platform/admin/daily-content",         icon: "Sparkles" },
    ],
  },
  {
    label: "System",
    defaultOpen: false,
    items: [
      { title: "Permissions",    url: "/platform/admin/permissions",    icon: "SlidersHorizontal" },
      { title: "Reports",        url: "/platform/admin/reports",        icon: "BarChart2" },
      { title: "Export Data",    url: "/platform/admin/reports/export", icon: "Download" },
      { title: "ID Scanner",     url: "/platform/admin/scanner",        icon: "ScanLine" },
      { title: "Settings",       url: "/platform/admin/settings",       icon: "SlidersHorizontal" },
    ],
  },
];

export interface PageMeta { title: string; description: string }

const ADMIN_PAGE_META: Record<string, PageMeta> = {
  "/platform/admin/dashboard":              { title: "Command Center",     description: "Overview & key metrics" },
  "/platform/admin/students":               { title: "Students",           description: "Manage student accounts" },
  "/platform/admin/faculty":                { title: "Faculty",            description: "Manage faculty members" },
  "/platform/admin/create-student":         { title: "Create Student",     description: "Add a new student" },
  "/platform/admin/lectures":               { title: "Lectures",           description: "Schedule & manage lectures" },
  "/platform/admin/create-lecture":         { title: "Create Lecture",     description: "Schedule a new lecture" },
  "/platform/admin/timetable":              { title: "Timetable",          description: "Weekly class schedule" },
  "/platform/admin/programmes":             { title: "Programmes",         description: "Learning circle management" },
  "/platform/admin/allotments":             { title: "Allotments",         description: "Student programme allotment" },
  "/platform/admin/departments":            { title: "Departments",        description: "Academic department structure" },
  "/platform/admin/classes":                { title: "Classes",            description: "Class sections & batches" },
  "/platform/admin/attendance":             { title: "Attendance Control", description: "Live attendance management" },
  "/platform/admin/attendance/monthly":     { title: "Monthly Report",     description: "Monthly attendance export" },
  "/platform/admin/attendance/corrections": { title: "Corrections",        description: "Edit attendance records" },
  "/platform/admin/exams":                  { title: "Exams & Results",    description: "Manage exams and publish results" },
  "/platform/admin/documents":              { title: "Document Library",   description: "Study materials and resources" },
  "/platform/admin/announcements":          { title: "Announcements",      description: "Broadcast to students" },
  "/platform/admin/events":                 { title: "Events",             description: "Campus events management" },
  "/platform/admin/polls":                  { title: "Polls",              description: "Poll & survey management" },
  "/platform/admin/daily-content":          { title: "Daily Content",      description: "Content of the day" },
  "/platform/admin/notifications":          { title: "Notifications",      description: "Push notification center" },
  "/platform/admin/challenges":             { title: "Achievements",       description: "Engagement challenges & badges" },
  "/platform/admin/points":                 { title: "Points Ledger",      description: "Points & adjustments" },
  "/platform/admin/point-claims":           { title: "E-Cell · Point Claims", description: "Approve student point claims" },
  "/platform/admin/stalls":                 { title: "E-Cell · Stall Requests", description: "Approve event stall registrations" },
  "/platform/admin/scanner":                { title: "ID Scanner",         description: "Digital ID verification" },
  "/platform/admin/settings":               { title: "Admin Settings",     description: "Profile & system settings" },
  "/platform/admin/channels":               { title: "Channels",           description: "Manage messaging channels" },
  "/platform/admin/permissions":            { title: "Permissions",        description: "Role-based access control" },
  "/platform/admin/reports/export":         { title: "Export Reports",     description: "Download data as CSV" },
};

export function getAdminPageMeta(pathname: string): PageMeta {
  if (ADMIN_PAGE_META[pathname]) return ADMIN_PAGE_META[pathname];
  for (const [prefix, meta] of Object.entries(ADMIN_PAGE_META)) {
    if (pathname.startsWith(prefix + "/")) return meta;
  }
  return { title: "Admin", description: "" };
}
