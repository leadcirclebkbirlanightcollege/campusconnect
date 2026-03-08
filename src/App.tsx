import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import AppSplash from "@/components/pwa/AppSplash";
import WhatsNewModal from "@/components/whats-new/WhatsNewModal";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import OfflineBanner from "@/components/layout/OfflineBanner";
import NetworkHealthDot from "@/components/layout/NetworkHealthDot";
import SwUpdateManager from "@/components/pwa/SwUpdateManager";
import InstallPromptBanner from "@/components/pwa/InstallPromptBanner";
import PlatformModeGuard from "@/components/platform/PlatformModeGuard";
import { AppProviders } from "@/providers/AppProviders";
import { RouteSkeleton } from "@/ui-engine/skeletons";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import { useWebVitals } from "@/hooks/use-web-vitals";

/* ── Eager (critical path) ───────────────────────────────────── */
import Index from "./pages/Index";
import Auth  from "./pages/Auth";

/* ── Lazy (route-split) ──────────────────────────────────────── */
const StudentDashboard         = lazy(() => import("./pages/student/StudentDashboard"));
const StudentProfile           = lazy(() => import("./pages/student/StudentProfile"));
const StudentInbox             = lazy(() => import("./pages/student/StudentInbox"));
const StudentAttendanceHistory = lazy(() => import("./pages/student/StudentAttendanceHistory"));
const StudentScanAttendance    = lazy(() => import("./pages/student/StudentScanAttendance"));
const StudentDigitalId         = lazy(() => import("./pages/student/StudentDigitalId"));
const LecturesList             = lazy(() => import("./pages/student/lectures/LecturesList"));
const LectureDetail            = lazy(() => import("./pages/student/lectures/LectureDetail"));
const ProgrammesList           = lazy(() => import("./pages/student/programmes/ProgrammesList"));
const ProgrammeDetail          = lazy(() => import("./pages/student/programmes/ProgrammeDetail"));
const StudentAnnouncementsFeed = lazy(() => import("./pages/student/announcements/StudentAnnouncementsFeed"));
const StudentEventsList        = lazy(() => import("./pages/student/events/StudentEventsList"));
const StudentPollsList         = lazy(() => import("./pages/student/polls/StudentPollsList"));
const StudentDailyContent      = lazy(() => import("./pages/student/content/StudentDailyContent"));
const StudentAchievements      = lazy(() => import("./pages/student/StudentAchievements"));
const Leaderboard              = lazy(() => import("./pages/Leaderboard"));
const AdminDashboard           = lazy(() => import("./pages/admin/AdminDashboard"));
const SuperAdminDashboard      = lazy(() => import("./pages/platform/SuperAdminDashboard"));
const NotFound                 = lazy(() => import("./pages/NotFound"));
const PwaInstallPage           = lazy(() => import("./pages/student/PwaInstallPage"));
const NotificationSettings     = lazy(() => import("./pages/student/NotificationSettings"));

/* ── Inner app (needs BrowserRouter context) ─────────────────── */
function AppInner() {
  useWebVitals(); // passive Web Vitals monitoring — no render impact
  return (
    <>
      <OfflineBanner />
      <SwUpdateManager />
      <AppSplash />
      <WhatsNewModal />
      <NetworkHealthDot />
      <InstallPromptBanner />
      <Toaster />
      <Sonner />

      <PlatformModeGuard>
        <Suspense fallback={<RouteSkeleton />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* Super Admin */}
            <Route
              path="/platform/admin"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Canonical authenticated routes */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard"      element={<StudentDashboard />} />
              <Route path="profile"        element={<StudentProfile />} />
              <Route path="inbox"          element={<StudentInbox />} />
              <Route path="scan"           element={<StudentScanAttendance />} />
              <Route path="id-card"        element={<StudentDigitalId />} />
              <Route path="attendance"     element={<StudentAttendanceHistory />} />
              <Route path="lectures"       element={<LecturesList />} />
              <Route path="lectures/:id"   element={<LectureDetail />} />
              <Route path="programmes"     element={<ProgrammesList />} />
              <Route path="programmes/:id" element={<ProgrammeDetail />} />
              <Route path="leaderboard"    element={<Leaderboard />} />
              <Route path="announcements"  element={<StudentAnnouncementsFeed />} />
              <Route path="events"         element={<StudentEventsList />} />
              <Route path="polls"          element={<StudentPollsList />} />
              <Route path="daily"          element={<StudentDailyContent />} />
              <Route path="achievements"   element={<StudentAchievements />} />
              <Route path="settings/notifications" element={<NotificationSettings />} />
              <Route path="install"        element={<PwaInstallPage />} />

              <Route
                path="admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
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
            <Route path="/student"          element={<Navigate to="/app/dashboard" replace />} />
            <Route path="/student/profile"  element={<Navigate to="/app/profile" replace />} />
            <Route path="/student/inbox"    element={<Navigate to="/app/inbox" replace />} />
            <Route path="/student/scan"     element={<Navigate to="/app/scan" replace />} />
            <Route path="/attendance"       element={<Navigate to="/app/attendance" replace />} />
            <Route path="/lectures"         element={<Navigate to="/app/lectures" replace />} />
            <Route path="/lectures/:id"     element={<Navigate to="/app/lectures/:id" replace />} />
            <Route path="/admin"            element={<Navigate to="/app/admin/dashboard" replace />} />
            <Route path="/leaderboard"      element={<Navigate to="/app/leaderboard" replace />} />

            {/* SPA fallback — prevents 404 on hard refresh */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </PlatformModeGuard>
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <AppProviders>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </AppProviders>
  </ErrorBoundary>
);

export default App;
