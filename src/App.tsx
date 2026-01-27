import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppSplash from "@/components/pwa/AppSplash";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import FullPageLoader from "@/components/system/FullPageLoader";
import SidebarLayout from "@/components/layout/SidebarLayout";

const queryClient = new QueryClient();

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { status } = useAuth();
  if (status === "loading") return <FullPageLoader label="Checking session…" />;
  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppSplash />
          <Toaster />
          <Sonner />
          <AuthGate>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />

                <Route
                  path="/student"
                  element={
                    <ProtectedRoute requiredRole="student">
                      <SidebarLayout>
                        <StudentDashboard />
                      </SidebarLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/profile"
                  element={
                    <ProtectedRoute requiredRole="student">
                      <SidebarLayout>
                        <StudentProfile />
                      </SidebarLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/inbox"
                  element={
                    <ProtectedRoute requiredRole="student">
                      <SidebarLayout>
                        <StudentInbox />
                      </SidebarLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/scan"
                  element={
                    <ProtectedRoute requiredRole="student">
                      <SidebarLayout>
                        <StudentScanAttendance />
                      </SidebarLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/attendance"
                  element={
                    <ProtectedRoute requiredRole="student">
                      <SidebarLayout>
                        <StudentAttendanceHistory />
                      </SidebarLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/lectures"
                  element={
                    <ProtectedRoute requiredRole="student">
                      <SidebarLayout>
                        <LecturesList />
                      </SidebarLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/lectures/:id"
                  element={
                    <ProtectedRoute requiredRole="student">
                      <SidebarLayout>
                        <LectureDetail />
                      </SidebarLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <SidebarLayout>
                        <AdminDashboard />
                      </SidebarLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/leaderboard"
                  element={
                    <ProtectedRoute>
                      <SidebarLayout>
                        <Leaderboard />
                      </SidebarLayout>
                    </ProtectedRoute>
                  }
                />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthGate>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
