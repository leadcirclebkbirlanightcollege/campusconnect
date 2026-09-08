import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import fs from "fs";
import path from "path";
import { MemoryRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import CommunityHub from "@/pages/student/hubs/CommunityHub";
import {
  STUDENT_TABS,
  resolveActiveTab,
  PAGE_META,
  TAB_ROOTS,
  getBackFallback,
} from "@/ui-engine/navigation-engine";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { BottomNavigation } from "@/layout/BottomNavigation";
import NotFound from "@/pages/NotFound";

// Mock AuthProvider and TenantProvider for route guard testing
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/providers/TenantProvider", () => ({
  useTenant: vi.fn(() => ({
    isLoading: false,
    collegeId: "col-123",
    college: { id: "col-123", name: "BK Birla College" },
    isSuperAdmin: false,
  })),
}));

describe("Community Page Route & Resolution Regression Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    sessionStorage.clear();
  });

  describe("1. AppRouter routing configuration", () => {
    const routerFilePath = path.resolve(__dirname, "../router/AppRouter.tsx");
    const routerContent = fs.readFileSync(routerFilePath, "utf-8");

    it("declares lazy import for CommunityHub in AppRouter", () => {
      expect(routerContent).toMatch(
        /const\s+CommunityHub\s*=\s*lazy\(\(\)\s*=>\s*import\(["']@\/pages\/student\/hubs\/CommunityHub["']\)\)/
      );
    });

    it("registers /app/community child route resolving to CommunityHub", () => {
      expect(routerContent).toMatch(
        /<Route\s+path="community"\s+element=\{<CommunityHub\s*\/>\}\s*\/>/
      );
    });

    it("registers legacy /community route redirecting to canonical /app/community", () => {
      expect(routerContent).toMatch(
        /<Route\s+path="\/community"\s+element=\{<Navigate\s+to="\/app\/community"\s+replace\s*\/>\}\s*\/>/
      );
    });

    it("registers deep link /community/posts/:id to /app/community", () => {
      expect(routerContent).toMatch(
        /<Route\s+path="\/community\/posts\/:id"\s+element=\{<DeepLink\s+to="\/app\/community"\s*\/>\}\s*\/>/
      );
    });
  });

  describe("2. Navigation Engine & Active Tab Resolution", () => {
    it("includes community tab in STUDENT_TABS with href /app/community", () => {
      const communityTab = STUDENT_TABS.find((t) => t.id === "community");
      expect(communityTab).toBeDefined();
      expect(communityTab?.href).toBe("/app/community");
      expect(communityTab?.label).toBe("Community");
      expect(communityTab?.match).toEqual(["/app/community", "/app/events", "/app/announcements"]);
    });

    it("resolves active tab for /app/community to community tab", () => {
      const tab = resolveActiveTab("/app/community");
      expect(tab?.id).toBe("community");
      expect(tab?.href).toBe("/app/community");
    });

    it("resolves sub-routes (/app/events, /app/announcements) to community tab family", () => {
      expect(resolveActiveTab("/app/events")?.id).toBe("community");
      expect(resolveActiveTab("/app/events/123")?.id).toBe("community");
      expect(resolveActiveTab("/app/announcements")?.id).toBe("community");
    });

    it("registers /app/community in PAGE_META with proper title and description", () => {
      const meta = PAGE_META["/app/community"];
      expect(meta).toBeDefined();
      expect(meta.title).toBe("Community");
      expect(meta.description).toContain("Events");
    });

    it("registers /app/community as a tab root to prevent dead-end back navigation", () => {
      expect(TAB_ROOTS.has("/app/community")).toBe(true);
    });

    it("handles getBackFallback from sub-routes back to community roots", () => {
      expect(getBackFallback("/app/events/123")).toBe("/app/events");
      expect(getBackFallback("/app/announcements/456")).toBe("/app/announcements");
    });
  });

  describe("3. CommunityHub Component Rendering", () => {
    it("renders CommunityHub with header and all primary hub navigation tiles", () => {
      render(
        <MemoryRouter>
          <CommunityHub />
        </MemoryRouter>
      );

      // Verify PageHeader
      expect(screen.getByRole("heading", { level: 1, name: "Community" })).toBeInTheDocument();
      expect(screen.getByText("Campus life, together")).toBeInTheDocument();

      // Verify all 6 Community Hub tiles
      expect(screen.getByText("Events")).toBeInTheDocument();
      expect(screen.getByText("Campus events & registrations")).toBeInTheDocument();

      expect(screen.getByText("Announcements")).toBeInTheDocument();
      expect(screen.getByText("Important campus updates")).toBeInTheDocument();

      expect(screen.getByText("Leaderboard")).toBeInTheDocument();
      expect(screen.getByText("Class & college rankings")).toBeInTheDocument();

      expect(screen.getByText("Learning Circles")).toBeInTheDocument();
      expect(screen.getByText("Communities you've joined")).toBeInTheDocument();

      expect(screen.getByText("Points")).toBeInTheDocument();
      expect(screen.getByText("Rewards & activity balance")).toBeInTheDocument();

      expect(screen.getByText("Help & Support")).toBeInTheDocument();
      expect(screen.getByText("Reach the campus team")).toBeInTheDocument();
    });

    it("contains links to /app/events, /app/announcements, /app/leaderboard, /app/programmes, /app/points, /app/support", () => {
      const { container } = render(
        <MemoryRouter>
          <CommunityHub />
        </MemoryRouter>
      );

      const links = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
      expect(links).toContain("/app/events");
      expect(links).toContain("/app/announcements");
      expect(links).toContain("/app/leaderboard");
      expect(links).toContain("/app/programmes");
      expect(links).toContain("/app/points");
      expect(links).toContain("/app/support");
    });
  });

  describe("4. Route Guard & Permission Safety", () => {
    it("blocks unauthenticated access and redirects to /auth with redirect query param", async () => {
      const { useAuth } = await import("@/providers/AuthProvider");
      (useAuth as any).mockReturnValue({
        isLoading: false,
        user: null,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/app/community"]}>
            <ProtectedRoute>
              <div data-testid="community-protected-content">Secret Community</div>
            </ProtectedRoute>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.queryByTestId("community-protected-content")).toBeNull();
      expect(sessionStorage.getItem("cc_redirect_after_login")).toBe("/app/community");
    });

    it("allows authenticated student users to view protected community content", async () => {
      const { useAuth } = await import("@/providers/AuthProvider");
      (useAuth as any).mockReturnValue({
        isLoading: false,
        user: { id: "student-user-1", email: "student@bkbirlanightcollege.org" },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/app/community"]}>
            <ProtectedRoute>
              <div data-testid="community-protected-content">Community Content Active</div>
            </ProtectedRoute>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId("community-protected-content")).toBeInTheDocument();
      expect(screen.getByText("Community Content Active")).toBeInTheDocument();
    });
  });

  describe("5. Navigation, Fallback, and Router Resolution Behavior", () => {
    function LocationInspector() {
      const loc = useLocation();
      return <div data-testid="current-pathname">{loc.pathname}</div>;
    }

    function TestAppShell() {
      return (
        <div>
          <LocationInspector />
          <BottomNavigation />
          <Outlet />
        </div>
      );
    }

    it("resolves /app/community directly and renders CommunityHub without hitting 404", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/app/community"]}>
            <Routes>
              <Route path="/app" element={<TestAppShell />}>
                <Route path="dashboard" element={<div>Dashboard Page</div>} />
                <Route path="community" element={<CommunityHub />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId("current-pathname").textContent).toBe("/app/community");
      expect(screen.getByRole("heading", { level: 1, name: "Community" })).toBeInTheDocument();
      expect(screen.queryByText(/Route Unresolved/i)).toBeNull();
      expect(screen.queryByText(/Page not found/i)).toBeNull();
    });

    it("redirects legacy /community to canonical /app/community", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/community"]}>
            <Routes>
              <Route path="/app" element={<TestAppShell />}>
                <Route path="community" element={<CommunityHub />} />
              </Route>
              <Route path="/community" element={<Navigate to="/app/community" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId("current-pathname").textContent).toBe("/app/community");
      expect(screen.getByRole("heading", { level: 1, name: "Community" })).toBeInTheDocument();
      expect(screen.queryByText(/Route Unresolved/i)).toBeNull();
    });

    it("navigates to /app/community when Community tab is clicked in UI navigation", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/app/dashboard"]}>
            <Routes>
              <Route path="/app" element={<TestAppShell />}>
                <Route path="dashboard" element={<div>Dashboard Page</div>} />
                <Route path="community" element={<CommunityHub />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId("current-pathname").textContent).toBe("/app/dashboard");

      // Click the Community tab button
      const communityTabButton = screen.getByRole("button", { name: /community/i });
      fireEvent.click(communityTabButton);

      expect(screen.getByTestId("current-pathname").textContent).toBe("/app/community");
      expect(screen.getByRole("heading", { level: 1, name: "Community" })).toBeInTheDocument();
    });

    it("correctly routes unresolved paths to 404 while leaving /app/community resolved", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/app/nonexistent-feature"]}>
            <Routes>
              <Route path="/app" element={<TestAppShell />}>
                <Route path="community" element={<CommunityHub />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText(/Route Unresolved/i)).toBeInTheDocument();
      expect(screen.getByText(/You were looking for:/i)).toBeInTheDocument();
      expect(screen.getByText(/\/app\/nonexistent-feature/i)).toBeInTheDocument();
    });
  });
});
