import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAuthRedirectUrl, PRODUCTION_ORIGIN } from "@/lib/auth-redirect";

describe("Auth Redirect and Verification Flow", () => {
  const originalWindow = global.window;

  afterEach(() => {
    global.window = originalWindow;
  });

  it("resolves to canonical production domain for email verification in production", () => {
    // Mock window.location in production
    vi.stubGlobal("window", {
      location: {
        origin: "https://campusconnect.indevs.in",
      },
    });

    const redirectUrl = getAuthRedirectUrl("/auth/verify");
    expect(redirectUrl).toBe("https://campusconnect.indevs.in/auth/verify");
    expect(redirectUrl).not.toContain("localhost");
    expect(redirectUrl).not.toContain("127.0.0.1");
  });

  it("handles paths without leading slashes cleanly", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "https://campusconnect.indevs.in",
      },
    });

    const redirectUrl = getAuthRedirectUrl("auth/verify");
    expect(redirectUrl).toBe("https://campusconnect.indevs.in/auth/verify");
  });

  it("defaults to canonical production domain when window is undefined or non-browser", () => {
    vi.stubGlobal("window", undefined);

    const redirectUrl = getAuthRedirectUrl("/auth/verify");
    expect(redirectUrl).toBe(`${PRODUCTION_ORIGIN}/auth/verify`);
  });

  it("preserves localhost only for local dev environments", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "http://localhost:5173",
      },
    });

    const redirectUrl = getAuthRedirectUrl("/auth/verify");
    expect(redirectUrl).toBe("http://localhost:5173/auth/verify");
  });
});
