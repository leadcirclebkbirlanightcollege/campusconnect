import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/router/ProtectedRoute";
import PublicRoute from "@/router/PublicRoute";
import RouteLoader from "@/router/RouteLoader";
import PlatformModeGuard from "@/components/platform/PlatformModeGuard";
import AppLayout from "@/components/layout/AppLayout";

import Index from "@/pages/Index";
import Auth from "@/pages/Auth";

// ── Student pages ─────────────────────────────────────────────────────────────
const StudentDashboard    = lazy(() => import("@/pages/student/StudentDashboard"));
const StudentProfile      = lazy(() => import("@/pages/student/StudentProfile"));
const StudentInbox        = lazy(() => import("@/pages/student/StudentInbox"));
const StudentAttendanceHistory = lazy(() => import("@/pages/student/StudentAttendanceHistory"));
const StudentScanAttendance  = lazy(() => import("@/pages/student/StudentScanAttendance"));
const StudentDigitalId    = lazy(() => import("@/pages/student/StudentDigitalId"));
const LecturesList        = lazy(() => import("@/pages/student/lectures/LecturesList"));
const LectureDetail       = lazy(() => import("@/pages/student/lectures/LectureDetail"));
const ProgrammesList      = lazy(() => import("@/pages/student/programmes/ProgrammesList"));
const ProgrammeDetail     = lazy(() => import("@/pages/student/programmes/ProgrammeDetail"));
const StudentAnnouncementsFeed = lazy(() => import("@/pages/student/announcements/StudentAnnouncementsFeed"));
const StudentEventsList   = lazy(() => import("@/pages/student/events/StudentEventsList"));
const StudentPollsList    = lazy(() => import("@/pages/student/polls/StudentPollsList"));
const StudentDailyContent = lazy(() => import("@/pages/student/content/StudentDailyContent"));
const StudentAchievements = lazy(() => import("@/pages/student/StudentAchievements"));
const Leaderboard         = lazy(() => import("@/pages/Leaderboard"));
const PwaInstallPage      = lazy(() => import("@/pages/student/PwaInstallPage"));
const NotificationSettings = lazy(() => import("@/pages/student/NotificationSettings"));
const NotFound            = lazy(() => import("@/pages/NotFound"));

// ── Admin pages ───────────────────────────────────────────────────────────────
const AdminLayout                  = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminOverviewPage            = lazy(() => import("@/pages/admin/pages/AdminOverviewPage"));
const AdminStudentsPage            = lazy(() => import("@/pages/admin/pages/AdminStudentsPage"));
const AdminLecturesPage            = lazy(() => import("@/pages/admin/pages/AdminLecturesPage"));
const AdminProgrammesPage          = lazy(() => import("@/pages/admin/pages/AdminProgrammesPage"));
const AdminAllotmentsPage          = lazy(() => import("@/pages/admin/pages/AdminAllotmentsPage"));
const AdminAttendancePage          = lazy(() => import("@/pages/admin/pages/AdminAttendancePage"));
const AdminAttendanceMonthlyPage   = lazy(() => import("@/pages/admin/pages/AdminAttendanceMonthlyPage"));
const AdminAttendanceCorrectionsPage = lazy(() => import("@/pages/admin/pages/AdminAttendanceCorrectionsPage"));
const AdminAnnouncementsPage       = lazy(() => import("@/pages/admin/pages/AdminAnnouncementsPage"));
const AdminEventsPage              = lazy(() => import("@/pages/admin/pages/AdminEventsPage"));
const AdminPollsPage               = lazy(() => import("@/pages/admin/pages/AdminPollsPage"));
const AdminDailyContentPage        = lazy(() => import("@/pages/admin/pages/AdminDailyContentPage"));
const AdminNotificationsPage       = lazy(() => import("@/pages/admin/pages/AdminNotificationsPage"));
const AdminChallengesPage          = lazy(() => import("@/pages/admin/pages/AdminChallengesPage"));
const AdminPointsPage              = lazy(() => import("@/pages/admin/pages/AdminPointsPage"));
const AdminScannerPage             = lazy(() => import("@/pages/admin/pages/AdminScannerPage"));
const AdminAuditLogPage            = lazy(() => import("@/pages/admin/pages/AdminAuditLogPage"));
const AdminBrandingPage            = lazy(() => import("@/pages/admin/pages/AdminBrandingPage"));
const AdminCoreTeamPage            = lazy(() => import("@/pages/admin/pages/AdminCoreTeamPage"));
const AdminSystemControlPage       = lazy(() => import("@/pages/admin/pages/AdminSystemControlPage"));
const AdminSettingsPage            = lazy(() => import("@/pages/admin/pages/AdminSettingsPage"));
const AdminDepartmentsPage         = lazy(() => import("@/pages/admin/departments/AdminDepartmentsPage"));
const AdminClassesPage             = lazy(() => import("@/pages/admin/classes/AdminClassesPage"));

// ── Super Admin pages ─────────────────────────────────────────────────────────
const SuperAdminLayout      = lazy(() => import("@/pages/platform/SuperAdminLayout"));
const SADashboardPage       = lazy(() => import("@/pages/platform/pages/SADashboardPage"));
const SASystemMapPage       = lazy(() => import("@/pages/platform/pages/SASystemMapPage"));
const SASystemHealthPage    = lazy(() => import("@/pages/platform/pages/SASystemHealthPage"));
const SACollegesPage        = lazy(() => import("@/pages/platform/pages/SACollegesPage"));
const SACreateCollegePage   = lazy(() => import("@/pages/platform/pages/SACreateCollegePage"));
const SAAdminsPage          = lazy(() => import("@/pages/platform/pages/SAAdminsPage"));
const SACreateAdminPage     = lazy(() => import("@/pages/platform/pages/SACreateAdminPage"));
const SAStudentsPage        = lazy(() => import("@/pages/platform/pages/SAStudentsPage"));
const SALectureMonitorPage  = lazy(() => import("@/pages/platform/pages/SALectureMonitorPage"));
const SAAttendancePage      = lazy(() => import("@/pages/platform/pages/SAAttendancePage"));
const SALeaderboardPage     = lazy(() => import("@/pages/platform/pages/SALeaderboardPage"));
const SAAchievementsPage    = lazy(() => import("@/pages/platform/pages/SAAchievementsPage"));
const SANotificationsPage   = lazy(() => import("@/pages/platform/pages/SANotificationsPage"));
const SAAnalyticsPage       = lazy(() => import("@/pages/platform/pages/SAAnalyticsPage"));
const SASecurityPage        = lazy(() => import("@/pages/platform/pages/SASecurityPage"));
const SAPlatformSettingsPage = lazy(() => import("@/pages/platform/pages/SAPlatformSettingsPage"));

export default function AppRouter() {
  return (
    <PlatformModeGuard>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          {/* Landing */}
          <Route path="/" element={<Index />} />

          {/* Auth */}
          <Route path="/auth"        element={<PublicRoute><Auth /></PublicRoute>} />
          <Route path="/auth/login"  element={<PublicRoute><Auth /></PublicRoute>} />
          <Route path="/auth/signup" element={<PublicRoute><Auth /></PublicRoute>} />

          {/* ── Super Admin (/platform/admin-control/*) ──────────────────────── */}
          <Route
            path="/platform/admin-control"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <SuperAdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/platform/admin-control/dashboard" replace />} />
            <Route path="dashboard"         element={<SADashboardPage />} />
            <Route path="system-map"        element={<SASystemMapPage />} />
            <Route path="colleges"          element={<SACollegesPage />} />
            <Route path="admins"            element={<SAAdminsPage />} />
            <Route path="students"          element={<SAStudentsPage />} />
            <Route path="lectures"          element={<SALectureMonitorPage />} />
            <Route path="attendance"        element={<SAAttendancePage />} />
            <Route path="leaderboard"       element={<SALeaderboardPage />} />
            <Route path="achievements"      element={<SAAchievementsPage />} />
            <Route path="notifications"     element={<SANotificationsPage />} />
            <Route path="analytics"         element={<SAAnalyticsPage />} />
            <Route path="security"          element={<SASecurityPage />} />
            <Route path="platform-settings" element={<SAPlatformSettingsPage />} />
          </Route>

          {/* ── Admin (/platform/admin/*) ─────────────────────────────────────── */}
          <Route
            path="/platform/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/platform/admin/dashboard" replace />} />
            <Route path="dashboard"                element={<AdminOverviewPage />} />
            <Route path="students"                 element={<AdminStudentsPage />} />
            <Route path="lectures"                 element={<AdminLecturesPage />} />
            <Route path="programmes"               element={<AdminProgrammesPage />} />
            <Route path="allotments"               element={<AdminAllotmentsPage />} />
            <Route path="departments"              element={<AdminDepartmentsPage />} />
            <Route path="classes"                  element={<AdminClassesPage />} />
            <Route path="attendance"               element={<AdminAttendancePage />} />
            <Route path="attendance/monthly"       element={<AdminAttendanceMonthlyPage />} />
            <Route path="attendance/corrections"   element={<AdminAttendanceCorrectionsPage />} />
            <Route path="announcements"            element={<AdminAnnouncementsPage />} />
            <Route path="events"                   element={<AdminEventsPage />} />
            <Route path="polls"                    element={<AdminPollsPage />} />
            <Route path="daily-content"            element={<AdminDailyContentPage />} />
            <Route path="notifications"            element={<AdminNotificationsPage />} />
            <Route path="challenges"               element={<AdminChallengesPage />} />
            <Route path="points"                   element={<AdminPointsPage />} />
            <Route path="scanner"                  element={<AdminScannerPage />} />
            <Route path="audit-log"                element={<AdminAuditLogPage />} />
            <Route path="branding"                 element={<AdminBrandingPage />} />
            <Route path="core-team"                element={<AdminCoreTeamPage />} />
            <Route path="system-control"           element={<AdminSystemControlPage />} />
            <Route path="settings"                 element={<AdminSettingsPage />} />
          </Route>

          {/* ── Student (/app/*) ──────────────────────────────────────────────── */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard"              element={<StudentDashboard />} />
            <Route path="profile"                element={<StudentProfile />} />
            <Route path="settings"               element={<StudentProfile />} />
            <Route path="settings/notifications" element={<NotificationSettings />} />
            <Route path="settings/security"      element={<StudentProfile />} />
            <Route path="inbox"                  element={<StudentInbox />} />
            <Route path="scan"                   element={<StudentScanAttendance />} />
            <Route path="id-card"                element={<StudentDigitalId />} />
            <Route path="attendance"             element={<StudentAttendanceHistory />} />
            <Route path="attendance/history"     element={<StudentAttendanceHistory />} />
            <Route path="lectures"               element={<LecturesList />} />
            <Route path="lectures/:id"           element={<LectureDetail />} />
            <Route path="programmes"             element={<ProgrammesList />} />
            <Route path="programmes/:id"         element={<ProgrammeDetail />} />
            <Route path="leaderboard"            element={<Leaderboard />} />
            <Route path="leaderboard/weekly"     element={<Leaderboard />} />
            <Route path="leaderboard/all-time"   element={<Leaderboard />} />
            <Route path="announcements"          element={<StudentAnnouncementsFeed />} />
            <Route path="events"                 element={<StudentEventsList />} />
            <Route path="polls"                  element={<StudentPollsList />} />
            <Route path="daily"                  element={<StudentDailyContent />} />
            <Route path="achievements"           element={<StudentAchievements />} />
            <Route path="install"                element={<PwaInstallPage />} />
          </Route>

          {/* ── Legacy redirects ──────────────────────────────────────────────── */}
          {/* Old super admin path → new control center */}
          <Route path="/platform/admin/super"    element={<Navigate to="/platform/admin-control/dashboard" replace />} />

          {/* Old app/admin paths → new /platform/admin paths */}
          <Route path="/app/admin"                 element={<Navigate to="/platform/admin/dashboard" replace />} />
          <Route path="/app/admin/dashboard"       element={<Navigate to="/platform/admin/dashboard" replace />} />
          <Route path="/app/admin/lectures"        element={<Navigate to="/platform/admin/lectures" replace />} />
          <Route path="/app/admin/attendance"      element={<Navigate to="/platform/admin/attendance" replace />} />
          <Route path="/app/admin/attendance/corrections" element={<Navigate to="/platform/admin/attendance/corrections" replace />} />

          {/* Other legacy routes */}
          <Route path="/student"          element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/student/profile"  element={<Navigate to="/app/settings" replace />} />
          <Route path="/student/inbox"    element={<Navigate to="/app/inbox" replace />} />
          <Route path="/student/scan"     element={<Navigate to="/app/scan" replace />} />
          <Route path="/attendance"       element={<Navigate to="/app/attendance" replace />} />
          <Route path="/lectures"         element={<Navigate to="/app/lectures" replace />} />
          <Route path="/leaderboard"      element={<Navigate to="/app/leaderboard" replace />} />
          <Route path="/admin"            element={<Navigate to="/platform/admin/dashboard" replace />} />

          {/* SPA fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </PlatformModeGuard>
  );
}
