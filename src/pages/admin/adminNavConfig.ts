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
      { title: "Overview", url: "/platform/admin/dashboard", icon: "LayoutDashboard" },
    ],
  },
  {
    label: "Academics",
    defaultOpen: true,
    items: [
      { title: "Students", url: "/platform/admin/students", icon: "Users" },
      { title: "Faculty", url: "/platform/admin/faculty", icon: "GraduationCap" },
      { title: "Departments", url: "/platform/admin/departments", icon: "Building2" },
      { title: "Programmes", url: "/platform/admin/programmes", icon: "Sparkles" },
      { title: "Classes", url: "/platform/admin/classes", icon: "School" },
      { title: "Allotments", url: "/platform/admin/allotments", icon: "UserCheck" },
      { title: "Verification", url: "/platform/admin/verification", icon: "ShieldCheck", badge: true },
    ],
  },
  {
    label: "Academic Operations",
    defaultOpen: true,
    items: [
      { title: "Lectures", url: "/platform/admin/lectures", icon: "BookOpen" },
      { title: "Timetable", url: "/platform/admin/timetable", icon: "CalendarDays" },
      { title: "Promotion", url: "/platform/admin/promotion", icon: "ArrowUpCircle" },
    ],
  },
  {
    label: "Attendance",
    defaultOpen: false,
    items: [
      { title: "Attendance Control", url: "/platform/admin/attendance", icon: "CheckSquare" },
      { title: "Monthly Report", url: "/platform/admin/attendance/monthly", icon: "BarChart3" },
      { title: "Corrections", url: "/platform/admin/attendance/corrections", icon: "FileEdit" },
    ],
  },
  {
    label: "Exams & Content",
    defaultOpen: false,
    items: [
      { title: "Exams & Marks", url: "/platform/admin/exams", icon: "ClipboardList" },
      { title: "Document Library", url: "/platform/admin/documents", icon: "FileText" },
      { title: "Verify Documents", url: "/platform/admin/verify", icon: "ShieldCheck" },
    ],
  },
  {
    label: "Campus",
    defaultOpen: false,
    items: [
      { title: "Announcements", url: "/platform/admin/announcements", icon: "Megaphone" },
      { title: "Events", url: "/platform/admin/events", icon: "CalendarDays" },
      { title: "Notifications", url: "/platform/admin/notifications", icon: "Bell" },
    ],
  },
  {
    label: "E-Cell",
    accent: "ecell",
    defaultOpen: true,
    items: [
      { title: "Committee", url: "/platform/admin/ecell?tab=committee", icon: "Users" },
      { title: "Stall Requests", url: "/platform/admin/stalls", icon: "Store" },
      { title: "E-Cell Events", url: "/platform/admin/events?ecell=1", icon: "CalendarDays" },
      { title: "Points Ledger", url: "/platform/admin/points", icon: "Coins" },
      { title: "Point Claims", url: "/platform/admin/point-claims", icon: "Coins" },
    ],
  },
  {
    label: "System",
    defaultOpen: false,
    items: [
      { title: "Support Tickets", url: "/platform/admin/tickets", icon: "LifeBuoy" },
      { title: "Permissions", url: "/platform/admin/permissions", icon: "SlidersHorizontal" },
      { title: "Export Data", url: "/platform/admin/reports/export", icon: "Download" },
      { title: "ID Scanner", url: "/platform/admin/scanner", icon: "ScanLine" },
      { title: "Settings", url: "/platform/admin/settings", icon: "SlidersHorizontal" },
    ],
  },
];

export interface PageMeta {
  title: string;
  description: string;
}

const ADMIN_PAGE_META: Record<string, PageMeta> = {
  "/platform/admin/dashboard": { title: "Command Center", description: "Overview & key metrics" },
  "/platform/admin/students": { title: "Students", description: "Manage student accounts" },
  "/platform/admin/students/create": { title: "Create Student", description: "Add a new student account" },
  "/platform/admin/verification": { title: "Student Verification", description: "Approve pending student registrations" },
  "/platform/admin/faculty": { title: "Faculty Management", description: "Manage college faculty directory, courses, and schedules" },
  "/platform/admin/lectures": { title: "Lectures", description: "Schedule & manage lectures" },
  "/platform/admin/timetable": { title: "Timetable", description: "Weekly class schedule" },
  "/platform/admin/promotion": { title: "Academic Promotion", description: "Promote students to the next academic year" },
  "/platform/admin/programmes": { title: "Programmes", description: "Learning circle & course management" },
  "/platform/admin/allotments": { title: "Allotments", description: "Student programme allotment" },
  "/platform/admin/departments": { title: "Departments", description: "Academic department structure" },
  "/platform/admin/classes": { title: "Classes", description: "Class sections & batches" },
  "/platform/admin/attendance": { title: "Attendance Control", description: "Live attendance management" },
  "/platform/admin/attendance/monthly": { title: "Monthly Report", description: "Monthly attendance export" },
  "/platform/admin/attendance/corrections": { title: "Corrections", description: "Edit attendance records" },
  "/platform/admin/exams": { title: "Exams & Results", description: "Manage exams and publish results" },
  "/platform/admin/documents": { title: "Document Library", description: "Study materials and resources" },
  "/platform/admin/verify": { title: "Document Verification", description: "Issue tamper-proof documents with QR verification" },
  "/platform/admin/announcements": { title: "Announcements", description: "Broadcast to students" },
  "/platform/admin/events": { title: "Events", description: "Campus events management" },
  "/platform/admin/notifications": { title: "Notifications", description: "Push notification center" },
  "/platform/admin/challenges": { title: "Achievements", description: "Engagement challenges & badges" },
  "/platform/admin/points": { title: "Points Ledger", description: "Points & adjustments" },
  "/platform/admin/point-claims": { title: "E-Cell · Point Claims", description: "Approve student point claims" },
  "/platform/admin/stalls": { title: "E-Cell · Stall Requests", description: "Approve event stall registrations" },
  "/platform/admin/ecell": { title: "E-Cell Committee", description: "Manage official committee positions and student contact actions" },
  "/platform/admin/scanner": { title: "ID Scanner", description: "Digital ID verification" },
  "/platform/admin/settings": { title: "Admin Settings", description: "Profile & system settings" },
  "/platform/admin/tickets": { title: "Support Tickets", description: "Triage and resolve student requests" },
  "/platform/admin/permissions": { title: "Permissions", description: "Role-based access control" },
  "/platform/admin/reports/export": { title: "Export Reports", description: "Download data as CSV" },
};

export function getAdminPageMeta(pathname: string): PageMeta {
  if (ADMIN_PAGE_META[pathname]) return ADMIN_PAGE_META[pathname];
  for (const [prefix, meta] of Object.entries(ADMIN_PAGE_META)) {
    if (pathname.startsWith(prefix + "/")) return meta;
  }
  return { title: "Admin", description: "" };
}
