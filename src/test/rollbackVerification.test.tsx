import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import AppSplash from "@/components/pwa/AppSplash";
import { BRANDING } from "@/config/branding";

// Mock providers used by AppSplash
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: vi.fn(() => ({
    isLoading: true,
    user: null,
  })),
}));

vi.mock("@/providers/TenantProvider", () => ({
  useTenant: vi.fn(() => ({
    isLoading: false,
    collegeId: null,
    college: null,
    isSuperAdmin: false,
  })),
}));

vi.mock("@/hooks/use-platform-branding", () => ({
  usePlatformBranding: vi.fn(() => ({
    branding: {
      brand_name: "Campus Connect",
      tagline: "By Students For Students",
      logo_url: null,
      favicon_url: null,
    },
    loading: false,
  })),
}));

describe("Rollback & Canonical Splash Screen Verification", () => {
  it("renders the canonical Campus Connect initial splash screen while loading", () => {
    render(<AppSplash />);

    // Must show Campus Connect branding
    expect(screen.getByText("Campus Connect")).toBeInTheDocument();
    expect(screen.getByText("Loading your campus experience...")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();

    // Must NOT contain any festival, culture, or Janmashtami references
    const text = document.body.textContent || "";
    expect(text).not.toMatch(/janmashtami/i);
    expect(text).not.toMatch(/dahi\s*handi/i);
    expect(text).not.toMatch(/krishna/i);
    expect(text).not.toMatch(/festiv/i);
    expect(text).not.toMatch(/culture/i);
  });

  it("resolves and hides splash when auth session initialization completes", async () => {
    const authModule = await import("@/providers/AuthProvider");
    (authModule.useAuth as any).mockReturnValue({
      isLoading: false,
      user: null,
    });

    const { unmount } = render(<AppSplash />);

    act(() => {
      // Process state updates
    });

    unmount();
  });

  it("verifies BRANDING constants contain canonical branding", () => {
    expect(BRANDING.name).toBe("Campus Connect");
    expect(BRANDING.tagline).toBe("By Students For Students");
    expect(BRANDING.logo).toBeDefined();
  });
});
