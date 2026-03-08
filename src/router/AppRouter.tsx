import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/router/ProtectedRoute";
import PublicRoute from "@/router/PublicRoute";
import RouteLoader from "@/router/RouteLoader";
import PlatformModeGuard from "@/components/platform/PlatformModeGuard";
import AppLayout from "@/components/layout/AppLayout";

import Index from "@/pages/Index";
import Auth from "@/pages/Auth";

const StudentDashboard = lazy(() => import("@/pages/student/StudentDashboard"));
const StudentProfile = lazy(() => import("@/pages/student/StudentProfile"));
const StudentInbox = lazy(() => import("@/pages/student/StudentInbox"));
const StudentAttendanceHistory = lazy(() => import("@/pages/student/StudentAttendanceHistory"));
const StudentScanAttendance = lazy(() => import("@/pages/student/StudentScanAttendance"));
const StudentDigitalId = lazy(() => import("@/pages/student/StudentDigitalId"));
const LecturesList = lazy(() => import("@/pages/student/lectures/LecturesList"));
const LectureDetail = lazy(() => import("@/pages/student/lectures/LectureDetail"));
const ProgrammesList = lazy(() => import("@/pages/student/programmes/ProgrammesList"));
const ProgrammeDetail = lazy(() => import("@/pages/student/programmes/ProgrammeDetail"));
const StudentAnnouncementsFeed = lazy(() => import("@/pages/student/announcements/StudentAnnouncementsFeed"));
const StudentEventsList = lazy(() => import("@/pages/student/events/StudentEventsList"));
const StudentPollsList = lazy(() => import("@/pages/student/polls/StudentPollsList"));
const StudentDailyContent = lazy(() => import("@/pages/student/content/StudentDailyContent"));
const StudentAchievements = lazy(() => import("@/pages/student/StudentAchievements"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const SuperAdminDashboard = lazy(() => import("@/pages/platform/SuperAdminDashboard"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PwaInstallPage = lazy(() => import("@/pages/student/PwaInstallPage"));
const NotificationSettings = lazy(() => import("@/pages/student/NotificationSettings"));

export default function AppRouter() {
  return (
    <PlatformModeGuard>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />

          {/* Public auth routes */}
          <Route
            path="/auth"
            element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            }
          />
          <Route
            path="/auth/login"
            element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            }
          />
          <Route
            path="/auth/signup"
            element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            }
          />

          {/* Super Admin */}
          <Route
            path="/platform/admin"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Authenticated routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="inbox" element={<StudentInbox />} />
            <Route path="scan" element={<StudentScanAttendance />} />
            <Route path="id-card" element={<StudentDigitalId />} />
            <Route path="attendance" element={<StudentAttendanceHistory />} />
            <Route path="lectures" element={<LecturesList />} />
            <Route path="lectures/:id" element={<LectureDetail />} />
            <Route path="programmes" element={<ProgrammesList />} />
            <Route path="programmes/:id" element={<ProgrammeDetail />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="announcements" element={<StudentAnnouncementsFeed />} />
            <Route path="events" element={<StudentEventsList />} />
            <Route path="polls" element={<StudentPollsList />} />
            <Route path="daily" element={<StudentDailyContent />} />
            <Route path="achievements" element={<StudentAchievements />} />
            <Route path="settings/notifications" element={<NotificationSettings />} />
            <Route path="install" element={<PwaInstallPage />} />

            {/* Admin */}
            <Route
              path="admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Navigate to="/app/admin/dashboard" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/dashboard"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/lectures"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Navigate to="/app/admin/dashboard#lectures" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/attendance"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Navigate to="/app/admin/dashboard#attendance" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/attendance/corrections"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Navigate to="/app/admin/dashboard#corrections" replace />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Legacy redirects */}
          <Route path="/student" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/student/profile" element={<Navigate to="/app/profile" replace />} />
          <Route path="/student/inbox" element={<Navigate to="/app/inbox" replace />} />
          <Route path="/student/scan" element={<Navigate to="/app/scan" replace />} />
          <Route path="/attendance" element={<Navigate to="/app/attendance" replace />} />
          <Route path="/lectures" element={<Navigate to="/app/lectures" replace />} />
          <Route path="/leaderboard" element={<Navigate to="/app/leaderboard" replace />} />
          <Route path="/admin" element={<Navigate to="/app/admin/dashboard" replace />} />

          {/* SPA fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </PlatformModeGuard>
  );
}
