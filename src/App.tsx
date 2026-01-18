import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentInbox from "./pages/student/StudentInbox";
import StudentAttendanceHistory from "./pages/student/StudentAttendanceHistory";
import LecturesList from "./pages/student/lectures/LecturesList";
import LectureDetail from "./pages/student/lectures/LectureDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import AdminShell from "./components/layout/AdminShell";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />

          <Route
            path="/student"
            element={
              <ProtectedRoute requiredRole="student">
                <AppShell>
                  <StudentDashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/inbox"
            element={
              <ProtectedRoute requiredRole="student">
                <AppShell>
                  <StudentInbox />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance"
            element={
              <ProtectedRoute requiredRole="student">
                <AppShell>
                  <StudentAttendanceHistory />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/lectures"
            element={
              <ProtectedRoute requiredRole="student">
                <AppShell>
                  <LecturesList />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/lectures/:id"
            element={
              <ProtectedRoute requiredRole="student">
                <AppShell>
                  <LectureDetail />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminShell>
                  <AdminDashboard />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
