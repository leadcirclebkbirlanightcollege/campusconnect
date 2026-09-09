import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { resolveRoleDashboard, isRouteAllowedForRole } from "@/lib/roleRouting";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Mock AuthProvider and TenantProvider
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/providers/TenantProvider", () => ({
  useTenant: vi.fn(),
  useTenantRole: vi.fn(),
}));

import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";

// Test helper component to inspect current location
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

describe("Super Admin Routing & Console Isolation Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe("1. Canonical resolveRoleDashboard Mapping", () => {
    it("routes super_admin strictly to /platform/admin-control/dashboard", () => {
      expect(resolveRoleDashboard("super_admin")).toBe("/platform/admin-control/dashboard");
    });

    it("routes admin strictly to /platform/admin/dashboard", () => {
      expect(resolveRoleDashboard("admin")).toBe("/platform/admin/dashboard");
    });

    it("routes faculty strictly to /faculty/dashboard", () => {
      expect(resolveRoleDashboard("faculty")).toBe("/faculty/dashboard");
    });

    it("routes student and undefined roles to /app/dashboard", () => {
      expect(resolveRoleDashboard("student")).toBe("/app/dashboard");
      expect(resolveRoleDashboard(undefined)).toBe("/app/dashboard");
      expect(resolveRoleDashboard(null)).toBe("/app/dashboard");
    });
  });

  describe("2. Deep-Link & Route Permission Validation (isRouteAllowedForRole)", () => {
    it("permits super_admin only on platform control routes and public routes", () => {
      expect(isRouteAllowedForRole("super_admin", "/platform/admin-control/dashboard")).toBe(true);
      expect(isRouteAllowedForRole("super_admin", "/platform/admin-control/colleges")).toBe(true);
      expect(isRouteAllowedForRole("super_admin", "/auth")).toBe(true);

      // Rejects College Admin console and student console
      expect(isRouteAllowedForRole("super_admin", "/platform/admin/dashboard")).toBe(false);
      expect(isRouteAllowedForRole("super_admin", "/platform/admin/attendance")).toBe(false);
      expect(isRouteAllowedForRole("super_admin", "/app/dashboard")).toBe(false);
      expect(isRouteAllowedForRole("super_admin", "/faculty/dashboard")).toBe(false);
    });

    it("permits admin only on college admin routes and public routes", () => {
      expect(isRouteAllowedForRole("admin", "/platform/admin/dashboard")).toBe(true);
      expect(isRouteAllowedForRole("admin", "/platform/admin/students")).toBe(true);

      // Rejects Super Admin platform console
      expect(isRouteAllowedForRole("admin", "/platform/admin-control/dashboard")).toBe(false);
      expect(isRouteAllowedForRole("admin", "/app/dashboard")).toBe(false);
    });

    it("permits faculty only on faculty routes and public routes", () => {
      expect(isRouteAllowedForRole("faculty", "/faculty/dashboard")).toBe(true);
      expect(isRouteAllowedForRole("faculty", "/platform/admin-control/dashboard")).toBe(false);
      expect(isRouteAllowedForRole("faculty", "/platform/admin/dashboard")).toBe(false);
      expect(isRouteAllowedForRole("faculty", "/app/dashboard")).toBe(false);
    });

    it("permits student only on /app routes and onboarding", () => {
      expect(isRouteAllowedForRole("student", "/app/dashboard")).toBe(true);
      expect(isRouteAllowedForRole("student", "/onboarding-wizard")).toBe(true);
      expect(isRouteAllowedForRole("student", "/platform/admin-control/dashboard")).toBe(false);
      expect(isRouteAllowedForRole("student", "/platform/admin/dashboard")).toBe(false);
    });

    it("rejects invalid, open-redirect, or empty paths", () => {
      expect(isRouteAllowedForRole("super_admin", "")).toBe(false);
      expect(isRouteAllowedForRole("super_admin", null)).toBe(false);
      expect(isRouteAllowedForRole("super_admin", "//attacker.com")).toBe(false);
    });
  });

  describe("3. Route Guard Isolation (ProtectedRoute component)", () => {
    it("redirects super_admin away from college admin (/platform/admin) to /platform/admin-control/dashboard", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "sa-1", email: "superadmin@campusconnect.com" } as any,
        isLoading: false,
      } as any);

      vi.mocked(useTenant).mockReturnValue({
        isLoading: false,
        collegeId: null,
        college: null,
        isSuperAdmin: true,
        role: "super_admin",
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/platform/admin/dashboard"]}>
            <Routes>
              <Route
                path="/platform/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <div data-testid="college-admin-panel">College Admin Panel</div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platform/admin-control/dashboard"
                element={<div data-testid="super-admin-panel">Super Admin Platform Control</div>}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Super admin must NOT mount the College Admin panel
      expect(screen.queryByTestId("college-admin-panel")).toBeNull();
      // Super admin must land on Super Admin platform control
      expect(screen.getByTestId("super-admin-panel")).toBeDefined();
    });

    it("allows college admin into /platform/admin/dashboard", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "admin-1", email: "admin@bkbirlacollege.edu" } as any,
        isLoading: false,
      } as any);

      vi.mocked(useTenant).mockReturnValue({
        isLoading: false,
        collegeId: "col-123",
        college: { id: "col-123", name: "BK Birla College" } as any,
        isSuperAdmin: false,
        role: "admin",
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/platform/admin/dashboard"]}>
            <Routes>
              <Route
                path="/platform/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <div data-testid="college-admin-panel">College Admin Panel</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId("college-admin-panel")).toBeDefined();
    });

    it("redirects college admin away from /platform/admin-control/dashboard to /platform/admin/dashboard", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "admin-1", email: "admin@bkbirlacollege.edu" } as any,
        isLoading: false,
      } as any);

      vi.mocked(useTenant).mockReturnValue({
        isLoading: false,
        collegeId: "col-123",
        college: { id: "col-123", name: "BK Birla College" } as any,
        isSuperAdmin: false,
        role: "admin",
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/platform/admin-control/dashboard"]}>
            <Routes>
              <Route
                path="/platform/admin-control/dashboard"
                element={
                  <ProtectedRoute requiredRole="super_admin">
                    <div data-testid="super-admin-panel">Super Admin Platform Control</div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platform/admin/dashboard"
                element={<div data-testid="college-admin-panel">College Admin Panel</div>}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.queryByTestId("super-admin-panel")).toBeNull();
      expect(screen.getByTestId("college-admin-panel")).toBeDefined();
    });

    it("redirects student away from /platform/admin/dashboard to /app/dashboard", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "student-1", email: "student@example.com" } as any,
        isLoading: false,
      } as any);

      vi.mocked(useTenant).mockReturnValue({
        isLoading: false,
        collegeId: "col-123",
        college: null,
        isSuperAdmin: false,
        role: "student",
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/platform/admin/dashboard"]}>
            <Routes>
              <Route
                path="/platform/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <div data-testid="college-admin-panel">College Admin Panel</div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/dashboard"
                element={<div data-testid="student-dashboard">Student Dashboard</div>}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.queryByTestId("college-admin-panel")).toBeNull();
      expect(screen.getByTestId("student-dashboard")).toBeDefined();
    });

    it("redirects super_admin on generic protected route to /platform/admin-control/dashboard", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "sa-1", email: "superadmin@campusconnect.com" } as any,
        isLoading: false,
      } as any);

      vi.mocked(useTenant).mockReturnValue({
        isLoading: false,
        collegeId: null,
        college: null,
        isSuperAdmin: true,
        role: "super_admin",
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/app/generic-entry"]}>
            <Routes>
              <Route
                path="/app/generic-entry"
                element={
                  <ProtectedRoute>
                    <div data-testid="generic-content">Generic Content</div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platform/admin-control/dashboard"
                element={<div data-testid="super-admin-panel">Super Admin Platform Control</div>}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.queryByTestId("generic-content")).toBeNull();
      expect(screen.getByTestId("super-admin-panel")).toBeDefined();
    });

    it("redirects super_admin on student-only route to /platform/admin-control/dashboard", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "sa-1", email: "superadmin@campusconnect.com" } as any,
        isLoading: false,
      } as any);

      vi.mocked(useTenant).mockReturnValue({
        isLoading: false,
        collegeId: null,
        college: null,
        isSuperAdmin: true,
        role: "super_admin",
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/app/student-feature"]}>
            <Routes>
              <Route
                path="/app/student-feature"
                element={
                  <ProtectedRoute requiredRole="student">
                    <div data-testid="student-feature">Student Feature</div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platform/admin-control/dashboard"
                element={<div data-testid="super-admin-panel">Super Admin Platform Control</div>}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.queryByTestId("student-feature")).toBeNull();
      expect(screen.getByTestId("super-admin-panel")).toBeDefined();
    });

    it("waits for tenant and auth loading to complete before redirecting", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "sa-1", email: "superadmin@campusconnect.com" } as any,
        isLoading: false,
      } as any);

      vi.mocked(useTenant).mockReturnValue({
        isLoading: true, // Still resolving
        collegeId: null,
        college: null,
        isSuperAdmin: false,
        role: null,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/platform/admin/dashboard"]}>
            <Routes>
              <Route
                path="/platform/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <div data-testid="college-admin-panel">College Admin Panel</div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platform/admin-control/dashboard"
                element={<div data-testid="super-admin-panel">Super Admin Platform Control</div>}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Neither panel nor redirect should render while loading
      expect(screen.queryByTestId("college-admin-panel")).toBeNull();
      expect(screen.queryByTestId("super-admin-panel")).toBeNull();
    });
  });

  describe("4. PublicRoute Canonical Dashboard Routing", () => {
    it("redirects logged-in super_admin from /auth to /platform/admin-control/dashboard", async () => {
      const PublicRoute = (await import("@/router/PublicRoute")).default;

      vi.mocked(useAuth).mockReturnValue({
        user: { id: "sa-1" } as any,
        isLoading: false,
      } as any);

      vi.mocked(useTenant).mockReturnValue({
        isLoading: false,
        collegeId: null,
        college: null,
        isSuperAdmin: true,
        role: "super_admin",
      });

      render(
        <MemoryRouter initialEntries={["/auth"]}>
          <Routes>
            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <div data-testid="auth-page">Auth Page</div>
                </PublicRoute>
              }
            />
            <Route
              path="/platform/admin-control/dashboard"
              element={<div data-testid="sa-dashboard">SA Dashboard</div>}
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByTestId("auth-page")).toBeNull();
      expect(screen.getByTestId("sa-dashboard")).toBeDefined();
    });

    it("redirects logged-in college admin from /auth to /platform/admin/dashboard", async () => {
      const PublicRoute = (await import("@/router/PublicRoute")).default;

      vi.mocked(useAuth).mockReturnValue({
        user: { id: "admin-1" } as any,
        isLoading: false,
      } as any);

      vi.mocked(useTenant).mockReturnValue({
        isLoading: false,
        collegeId: "c-1",
        college: null,
        isSuperAdmin: false,
        role: "admin",
      });

      render(
        <MemoryRouter initialEntries={["/auth"]}>
          <Routes>
            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <div data-testid="auth-page">Auth Page</div>
                </PublicRoute>
              }
            />
            <Route
              path="/platform/admin/dashboard"
              element={<div data-testid="admin-dashboard">Admin Dashboard</div>}
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByTestId("auth-page")).toBeNull();
      expect(screen.getByTestId("admin-dashboard")).toBeDefined();
    });
  });
});
