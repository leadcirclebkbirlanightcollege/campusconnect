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
      { title: "Faculty",        url: "/platform/admin/faculty",        icon: "GraduationCap" },
      { title: "Lectures",       url: "/platform/admin/lectures",       icon: "BookOpen" },
      { title: "Timetable",      url: "/platform/admin/timetable",      icon: "CalendarDays" },
      { title: "Programmes",     url: "/platform/admin/programmes",     icon: "GraduationCap" },
      { title: "Allotments",     url: "/platform/admin/allotments",     icon: "UserCheck" },
      { title: "Departments",    url: "/platform/admin/departments",    icon: "Building2" },
      { title: "Classes",        url: "/platform/admin/classes",        icon: "School" },
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
    label: "Exams & Content",
    items: [
      { title: "Exams & Results", url: "/platform/admin/exams",         icon: "ClipboardList" },
      { title: "Documents",      url: "/platform/admin/documents",      icon: "FileText" },
      { title: "Announcements",  url: "/platform/admin/announcements",  icon: "Megaphone" },
      { title: "Events",         url: "/platform/admin/events",         icon: "CalendarDays" },
      { title: "Polls",          url: "/platform/admin/polls",          icon: "BarChart3" },
      { title: "Daily Content",  url: "/platform/admin/daily-content",  icon: "Sparkles" },
      { title: "Notifications",  url: "/platform/admin/notifications",  icon: "Bell" },
      { title: "Challenges",     url: "/platform/admin/challenges",     icon: "Trophy" },
    ],
  },
  {
    label: "Communication",
    items: [
      { title: "Channels",   url: "/platform/admin/channels", icon: "Hash" },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Reports",       url: "/platform/admin/reports",        icon: "BarChart2" },
      { title: "Export Data",   url: "/platform/admin/reports/export", icon: "Download" },
      { title: "Points",        url: "/platform/admin/points",         icon: "Coins" },
      { title: "ID Scanner",    url: "/platform/admin/scanner",        icon: "ScanLine" },
      { title: "Settings",      url: "/platform/admin/settings",       icon: "SlidersHorizontal" },
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
  "/platform/admin/classes":               { title: "Classes",            description: "Class sections & batches" },
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
  "/platform/admin/challenges":             { title: "Challenges",         description: "Engagement challenges" },
  "/platform/admin/points":                 { title: "Points",             description: "Points & adjustments" },
  "/platform/admin/scanner":               { title: "ID Scanner",         description: "Digital ID verification" },
  "/platform/admin/settings":              { title: "Admin Settings",     description: "Profile & system settings" },
  "/platform/admin/channels":              { title: "Channels",           description: "Manage messaging channels" },
  "/platform/admin/reports/export":        { title: "Export Reports",     description: "Download data as CSV" },
};

export function getAdminPageMeta(pathname: string): PageMeta {
  if (ADMIN_PAGE_META[pathname]) return ADMIN_PAGE_META[pathname];
  for (const [prefix, meta] of Object.entries(ADMIN_PAGE_META)) {
    if (pathname.startsWith(prefix + "/")) return meta;
  }
  return { title: "Admin", description: "" };
}
