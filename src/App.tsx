import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppSplash from "@/components/pwa/AppSplash";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfile from "./pages/student/StudentProfile";
import StudentInbox from "./pages/student/StudentInbox";
import StudentAttendanceHistory from "./pages/student/StudentAttendanceHistory";
import StudentScanAttendance from "./pages/student/StudentScanAttendance";
import LecturesList from "./pages/student/lectures/LecturesList";
import LectureDetail from "./pages/student/lectures/LectureDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppSplash />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />

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
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="inbox" element={<StudentInbox />} />
            <Route path="scan" element={<StudentScanAttendance />} />
            <Route path="attendance" element={<StudentAttendanceHistory />} />
            <Route path="lectures" element={<LecturesList />} />
            <Route path="lectures/:id" element={<LectureDetail />} />
            <Route path="leaderboard" element={<Leaderboard />} />

            <Route
              path="admin/dashboard"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Legacy routes kept as redirects */}
          <Route path="/student" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/student/profile" element={<Navigate to="/app/profile" replace />} />
          <Route path="/student/inbox" element={<Navigate to="/app/inbox" replace />} />
          <Route path="/student/scan" element={<Navigate to="/app/scan" replace />} />
          <Route path="/attendance" element={<Navigate to="/app/attendance" replace />} />
          <Route path="/lectures" element={<Navigate to="/app/lectures" replace />} />
          <Route path="/lectures/:id" element={<Navigate to="/app/lectures/:id" replace />} />
          <Route path="/admin" element={<Navigate to="/app/admin/dashboard" replace />} />
          <Route path="/leaderboard" element={<Navigate to="/app/leaderboard" replace />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
