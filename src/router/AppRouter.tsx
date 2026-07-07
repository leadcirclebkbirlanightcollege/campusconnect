import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/router/ProtectedRoute";
import PublicRoute from "@/router/PublicRoute";
import RouteLoader from "@/router/RouteLoader";
import PlatformModeGuard from "@/components/platform/PlatformModeGuard";
import FeatureGate from "@/components/platform/FeatureGate";
import AppLayout from "@/components/layout/AppLayout";

import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import OnboardingGate from "@/components/auth/OnboardingGate";

const OnboardingWizard = lazy(() => import("@/pages/onboarding/OnboardingWizard"));
const PendingApproval  = lazy(() => import("@/pages/PendingApproval"));
const AdminStudentVerificationPage = lazy(() => import("@/pages/admin/verification/AdminStudentVerificationPage"));



// ── Faculty pages ──────────────────────────────────────────────────────────────
const FacultyLayout        = lazy(() => import("@/pages/faculty/FacultyLayout"));
const FacultyDashboard     = lazy(() => import("@/pages/faculty/FacultyDashboard"));
const FacultyMyLectures    = lazy(() => import("@/pages/faculty/FacultyMyLectures"));
const FacultyAttendance    = lazy(() => import("@/pages/faculty/FacultyAttendance"));
const FacultyStudents      = lazy(() => import("@/pages/faculty/FacultyStudents"));
const FacultyAnnouncements = lazy(() => import("@/pages/faculty/FacultyAnnouncements"));
const FacultySchedule      = lazy(() => import("@/pages/faculty/FacultySchedule"));
const FacultyProfile       = lazy(() => import("@/pages/faculty/FacultyProfile"));
const FacultyAnalytics     = lazy(() => import("@/pages/faculty/FacultyAnalytics"));
const FacultyAssignments   = lazy(() => import("@/pages/faculty/FacultyAssignments"));


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
const StudentAssignments   = lazy(() => import("@/pages/student/StudentAssignments"));
const StudentTimetable     = lazy(() => import("@/pages/student/StudentTimetable"));
const StudentDocuments     = lazy(() => import("@/pages/student/StudentDocuments"));
const StudentResults       = lazy(() => import("@/pages/student/StudentResults"));
const Leaderboard          = lazy(() => import("@/pages/Leaderboard"));
const PwaInstallPage       = lazy(() => import("@/pages/student/PwaInstallPage"));
const NotificationSettings = lazy(() => import("@/pages/student/NotificationSettings"));

const StudentPointsPage    = lazy(() => import("@/pages/student/points/StudentPointsPage"));
const StudentEcellHub      = lazy(() => import("@/pages/student/ecell/StudentEcellHub"));
const StudentEcellStalls   = lazy(() => import("@/pages/student/ecell/StudentEcellStalls"));
const AdminPointClaimsPage = lazy(() => import("@/pages/admin/pages/AdminPointClaimsPage"));
const AdminStallsPage      = lazy(() => import("@/pages/admin/pages/AdminStallsPage"));
const AdminTicketsPage     = lazy(() => import("@/pages/admin/pages/AdminTicketsPage"));
const StudentSupport       = lazy(() => import("@/pages/student/StudentSupport"));
const NotFound             = lazy(() => import("@/pages/NotFound"));
const HelpSupport          = lazy(() => import("@/pages/HelpSupport"));
const DemoPage             = lazy(() => import("@/pages/Demo"));
const BookDemoPage         = lazy(() => import("@/pages/BookDemo"));
const CollegeOnboarding    = lazy(() => import("@/pages/CollegeOnboarding"));
const AdminSetupWizard     = lazy(() => import("@/pages/admin/setup/AdminSetupWizard"));
const ContactPage          = lazy(() => import("@/pages/Contact"));
const PrivacyPage          = lazy(() => import("@/pages/Privacy"));
const TermsPage            = lazy(() => import("@/pages/Terms"));
const SALeadsPage          = lazy(() => import("@/pages/platform/pages/SALeadsPage"));

// ── Admin pages ───────────────────────────────────────────────────────────────
const AdminLayout                  = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminOverviewPage            = lazy(() => import("@/pages/admin/pages/AdminOverviewPage"));
const AdminStudentsPage            = lazy(() => import("@/pages/admin/pages/AdminStudentsPage"));
const AdminCreateStudentPage       = lazy(() => import("@/pages/admin/students/AdminCreateStudentPage"));
const AdminLecturesPage            = lazy(() => import("@/pages/admin/pages/AdminLecturesPage"));
const AdminProgrammesPage          = lazy(() => import("@/pages/admin/pages/AdminProgrammesPage"));
const AdminAllotmentsPage          = lazy(() => import("@/pages/admin/pages/AdminAllotmentsPage"));
const AdminAttendancePage          = lazy(() => import("@/pages/admin/pages/AdminAttendancePage"));
const AdminAttendanceMonthlyPage   = lazy(() => import("@/pages/admin/pages/AdminAttendanceMonthlyPage"));
const AdminAttendanceCorrectionsPage = lazy(() => import("@/pages/admin/pages/AdminAttendanceCorrectionsPage"));
const AdminAnnouncementsPage       = lazy(() => import("@/pages/admin/pages/AdminAnnouncementsPage"));
const AdminEventsPage              = lazy(() => import("@/pages/admin/pages/AdminEventsPage"));
const AdminNotificationsPage       = lazy(() => import("@/pages/admin/pages/AdminNotificationsPage"));
const AdminChallengesPage          = lazy(() => import("@/pages/admin/pages/AdminChallengesPage"));
const AdminPointsPage              = lazy(() => import("@/pages/admin/pages/AdminPointsPage"));
const AdminScannerPage             = lazy(() => import("@/pages/admin/pages/AdminScannerPage"));
const AdminSettingsPage            = lazy(() => import("@/pages/admin/pages/AdminSettingsPage"));
const AdminDepartmentsPage         = lazy(() => import("@/pages/admin/departments/AdminDepartmentsPage"));
const AdminClassesPage             = lazy(() => import("@/pages/admin/classes/AdminClassesPage"));
const AdminFacultyPage             = lazy(() => import("@/pages/admin/pages/AdminFacultyPage"));
const AdminReportsPage             = lazy(() => import("@/pages/admin/reports/AdminReportsPage"));
const AdminExportPage              = lazy(() => import("@/pages/admin/reports/AdminExportPage"));

const AdminTimetablePage           = lazy(() => import("@/pages/admin/timetable/AdminTimetablePage"));
const AdminPromotionPage           = lazy(() => import("@/pages/admin/promotion/AdminPromotionPage"));
const AdminDocumentsPage           = lazy(() => import("@/pages/admin/documents/AdminDocumentsPage"));
const AdminExamsPage               = lazy(() => import("@/pages/admin/exams/AdminExamsPage"));
const AdminPermissionsPage         = lazy(() => import("@/pages/admin/permissions/AdminPermissionsPage"));
const OnboardingFlow               = lazy(() => import("@/pages/student/onboarding/OnboardingFlow"));

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
const SALandingEditorPage   = lazy(() => import("@/pages/platform/components/LandingContentEditor"));

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

          {/* Onboarding & approval gate (signed-in but not yet approved) */}
          <Route path="/onboarding-wizard" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />
          <Route path="/pending-approval"  element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />

          {/* Demo, Help & Public (public) */}
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/help" element={<HelpSupport />} />
          <Route path="/book-demo" element={<BookDemoPage />} />
          <Route path="/onboarding" element={<CollegeOnboarding />} />
          <Route path="/start" element={<CollegeOnboarding />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />

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
            <Route path="dashboard"          element={<SADashboardPage />} />
            <Route path="system-map"         element={<SASystemMapPage />} />
            <Route path="system-health"      element={<SASystemHealthPage />} />
            <Route path="colleges"           element={<SACollegesPage />} />
            <Route path="create-college"     element={<SACreateCollegePage />} />
            <Route path="edit-college/:collegeId" element={<SACollegesPage />} />
            <Route path="admins"             element={<SAAdminsPage />} />
            <Route path="create-admin"       element={<SACreateAdminPage />} />
            <Route path="edit-admin/:adminId" element={<SAAdminsPage />} />
            <Route path="students"           element={<SAStudentsPage />} />
            <Route path="student/:studentId" element={<SAStudentsPage />} />
            <Route path="lectures"           element={<SALectureMonitorPage />} />
            <Route path="lecture/:lectureId" element={<SALectureMonitorPage />} />
            <Route path="attendance"         element={<SAAttendancePage />} />
            <Route path="leaderboard"        element={<SALeaderboardPage />} />
            <Route path="achievements"       element={<SAAchievementsPage />} />
            <Route path="notifications"      element={<SANotificationsPage />} />
            <Route path="send-notification"  element={<SANotificationsPage />} />
            <Route path="analytics"          element={<SAAnalyticsPage />} />
            <Route path="security"           element={<SASecurityPage />} />
            <Route path="platform-settings"  element={<SAPlatformSettingsPage />} />
            <Route path="landing-editor"     element={<SALandingEditorPage />} />
            <Route path="leads"              element={<SALeadsPage />} />
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
            <Route path="setup"                    element={<AdminSetupWizard />} />
            <Route path="students"                 element={<AdminStudentsPage />} />
            <Route path="verification"             element={<AdminStudentVerificationPage />} />
            <Route path="lectures"                 element={<AdminLecturesPage />} />
            <Route path="timetable"                element={<AdminTimetablePage />} />
            <Route path="promotion"                element={<AdminPromotionPage />} />
            <Route path="programmes"               element={<AdminProgrammesPage />} />
            <Route path="allotments"               element={<AdminAllotmentsPage />} />
            <Route path="faculty"                  element={<AdminFacultyPage />} />
            <Route path="departments"              element={<AdminDepartmentsPage />} />
            <Route path="classes"                  element={<AdminClassesPage />} />
            <Route path="attendance"               element={<AdminAttendancePage />} />
            <Route path="attendance/monthly"       element={<AdminAttendanceMonthlyPage />} />
            <Route path="attendance/corrections"   element={<AdminAttendanceCorrectionsPage />} />
            <Route path="exams"                    element={<AdminExamsPage />} />
            <Route path="documents"                element={<AdminDocumentsPage />} />
            <Route path="announcements"            element={<AdminAnnouncementsPage />} />
            <Route path="events"                   element={<AdminEventsPage />} />
            <Route path="notifications"            element={<AdminNotificationsPage />} />
            <Route path="challenges"               element={<AdminChallengesPage />} />
            <Route path="points"                   element={<AdminPointsPage />} />
            <Route path="point-claims"             element={<AdminPointClaimsPage />} />
            <Route path="stalls"                   element={<AdminStallsPage />} />
            <Route path="scanner"                  element={<AdminScannerPage />} />
            <Route path="settings"                 element={<AdminSettingsPage />} />
            <Route path="tickets"                  element={<AdminTicketsPage />} />
            <Route path="reports"                  element={<AdminReportsPage />} />
            <Route path="reports/export"           element={<AdminExportPage />} />
            <Route path="permissions"              element={<AdminPermissionsPage />} />
            <Route path="erp-sync"                 element={<Navigate to="/platform/admin/students" replace />} />
            {/* Legacy redirects (removed modules) */}
            <Route path="polls"          element={<Navigate to="/platform/admin/dashboard" replace />} />
            <Route path="daily-content"  element={<Navigate to="/platform/admin/dashboard" replace />} />
            <Route path="channels"       element={<Navigate to="/platform/admin/dashboard" replace />} />
            <Route path="audit-log"      element={<Navigate to="/platform/admin-control/security" replace />} />
            <Route path="audit"          element={<Navigate to="/platform/admin-control/security" replace />} />
            <Route path="branding"       element={<Navigate to="/platform/admin-control/platform-settings" replace />} />
            <Route path="core-team"      element={<Navigate to="/platform/admin-control/platform-settings" replace />} />
            <Route path="system-control" element={<Navigate to="/platform/admin-control/platform-settings" replace />} />
          </Route>


          {/* ── Student (/app/*) ──────────────────────────────────────────────── */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <OnboardingGate>
                  <AppLayout />
                </OnboardingGate>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="onboarding"             element={<OnboardingFlow />} />
            <Route path="dashboard"              element={<StudentDashboard />} />
            <Route path="profile"                element={<StudentProfile />} />
            <Route path="settings"               element={<StudentProfile />} />
            <Route path="settings/notifications" element={<NotificationSettings />} />
            <Route path="settings/security"      element={<StudentProfile />} />
            <Route path="notifications"          element={<NotificationSettings />} />
            <Route path="inbox"                  element={<StudentInbox />} />
            <Route path="scan"                   element={<StudentScanAttendance />} />
            <Route path="id-card"                element={<StudentDigitalId />} />
            <Route path="assignments"            element={<StudentAssignments />} />
            <Route path="support"                element={<StudentSupport />} />
            <Route path="timetable"              element={<StudentTimetable />} />
            <Route path="documents"              element={<StudentDocuments />} />
            <Route path="results"                element={<StudentResults />} />
            <Route path="attendance"             element={<FeatureGate feature="attendance"><StudentAttendanceHistory /></FeatureGate>} />
            <Route path="attendance/history"     element={<FeatureGate feature="attendance"><StudentAttendanceHistory /></FeatureGate>} />
            <Route path="lectures"               element={<FeatureGate feature="lectures"><LecturesList /></FeatureGate>} />
            <Route path="lectures/:id"           element={<FeatureGate feature="lectures"><LectureDetail /></FeatureGate>} />
            <Route path="programmes"             element={<FeatureGate feature="programmes"><ProgrammesList /></FeatureGate>} />
            <Route path="programmes/:id"         element={<FeatureGate feature="programmes"><ProgrammeDetail /></FeatureGate>} />
            <Route path="leaderboard"            element={<FeatureGate feature="leaderboard"><Leaderboard /></FeatureGate>} />
            <Route path="announcements"          element={<FeatureGate feature="announcements"><StudentAnnouncementsFeed /></FeatureGate>} />
            <Route path="events"                 element={<FeatureGate feature="events"><StudentEventsList /></FeatureGate>} />
            <Route path="points"                 element={<StudentPointsPage />} />
            <Route path="ecell"                  element={<StudentEcellHub />} />
            <Route path="ecell/stalls"           element={<StudentEcellStalls />} />
            <Route path="install"                element={<PwaInstallPage />} />
            {/* Removed modules — redirect to dashboard */}
            <Route path="analytics"     element={<Navigate to="/app/dashboard" replace />} />
            <Route path="polls"         element={<Navigate to="/app/dashboard" replace />} />
            <Route path="daily"         element={<Navigate to="/app/dashboard" replace />} />
            <Route path="achievements"  element={<Navigate to="/app/dashboard" replace />} />
            <Route path="checkin"       element={<Navigate to="/app/dashboard" replace />} />
            <Route path="messages"      element={<Navigate to="/app/dashboard" replace />} />
            <Route path="messages/*"    element={<Navigate to="/app/dashboard" replace />} />
          </Route>


          {/* ── Faculty (/faculty/*) ──────────────────────────────────────────── */}
          <Route
            path="/faculty"
            element={
              <ProtectedRoute requiredRole="faculty">
                <FacultyLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/faculty/dashboard" replace />} />
            <Route path="dashboard"     element={<FacultyDashboard />} />
            <Route path="my-lectures"   element={<FacultyMyLectures />} />
            <Route path="attendance"    element={<FacultyAttendance />} />
            <Route path="students"      element={<FacultyStudents />} />
            <Route path="announcements" element={<FacultyAnnouncements />} />
            <Route path="schedule"      element={<FacultySchedule />} />
            <Route path="analytics"     element={<FacultyAnalytics />} />
            <Route path="assignments"   element={<FacultyAssignments />} />
            <Route path="profile"       element={<FacultyProfile />} />
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
