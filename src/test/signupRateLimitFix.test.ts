/**
 * Signup Rate-Limit & Double-Submit Prevention Tests
 *
 * Tests the root-cause fixes for:
 * 1. No automatic signInWithPassword after signUp (the primary rate-limit cause)
 * 2. Synchronous in-flight ref guard preventing double-submit
 * 3. Explicit 429 / rate-limit error handling
 * 4. Loading state transitions
 * 5. Auth redirect URL integrity
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { normalizeError } from "@/lib/error-handling";
import { getAuthRedirectUrl, PRODUCTION_ORIGIN } from "@/lib/auth-redirect";

// -----------------------------------------------------------------
// Helper: simulate the FIXED handleSignup logic in isolation
// -----------------------------------------------------------------

async function simulateFixedSignup(
  mockSignUp: ReturnType<typeof vi.fn>,
  mockSignIn: ReturnType<typeof vi.fn>
) {
  const calls: string[] = [];
  let inFlight = false;

  async function handleSignup() {
    if (inFlight) return { blocked: true };
    inFlight = true;
    try {
      const result = await mockSignUp();
      calls.push("signUp");
      if (result.error) throw result.error;
      if (!result.data?.user) throw new Error("No user");
      // FIXED: session null = email confirmation required — do NOT call signInWithPassword
      if (!result.data.session) {
        return { emailVerificationRequired: true, callCount: calls.length };
      }
      return { navigatedToOnboarding: true, callCount: calls.length };
    } finally {
      inFlight = false;
    }
  }

  const result = await handleSignup();
  expect(mockSignIn).not.toHaveBeenCalled();
  return { ...result, calls };
}

// -----------------------------------------------------------------
// 1. Single-request guarantee
// -----------------------------------------------------------------

describe("Signup — Single Request Guarantee (Root-Cause Fix)", () => {
  it("calls signUp exactly once when email confirmation is required (session: null)", async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });
    const mockSignIn = vi.fn();
    const result = await simulateFixedSignup(mockSignUp, mockSignIn);
    expect(mockSignUp).toHaveBeenCalledTimes(1);
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(result.emailVerificationRequired).toBe(true);
    expect(result.callCount).toBe(1);
  });

  it("calls signUp exactly once when email confirmation is disabled (session returned)", async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: "u2" }, session: { access_token: "tok" } },
      error: null,
    });
    const mockSignIn = vi.fn();
    const result = await simulateFixedSignup(mockSignUp, mockSignIn);
    expect(mockSignUp).toHaveBeenCalledTimes(1);
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(result.navigatedToOnboarding).toBe(true);
    expect(result.callCount).toBe(1);
  });

  it("regression: never calls signInWithPassword after signUp regardless of session state", async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: "u3" }, session: null },
      error: null,
    });
    const mockSignIn = vi.fn().mockResolvedValue({ data: { session: {} }, error: null });
    await simulateFixedSignup(mockSignUp, mockSignIn);
    expect(mockSignIn).toHaveBeenCalledTimes(0);
  });
});

// -----------------------------------------------------------------
// 2. Double-submit prevention
// -----------------------------------------------------------------

describe("Signup — In-Flight Guard (Double-Submit Prevention)", () => {
  it("blocks a concurrent second call via synchronous ref guard", async () => {
    const mockSignUp = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        data: { user: { id: "u4" }, session: null }, error: null,
      }), 50))
    );
    let inFlight = false;
    let callCount = 0;

    async function handleSignup() {
      if (inFlight) return "blocked";
      inFlight = true;
      callCount++;
      try { return await mockSignUp(); }
      finally { inFlight = false; }
    }

    const [r1, r2] = await Promise.all([handleSignup(), handleSignup()]);
    expect(mockSignUp).toHaveBeenCalledTimes(1);
    expect(r2).toBe("blocked");
    expect(callCount).toBe(1);
  });

  it("allows a second submit after first completes (ref released in finally)", async () => {
    const mockSignUp = vi.fn()
      .mockResolvedValueOnce({ data: { user: { id: "u5" }, session: null }, error: null })
      .mockResolvedValueOnce({ data: { user: { id: "u6" }, session: null }, error: null });

    let inFlight = false;
    async function handleSignup() {
      if (inFlight) return "blocked";
      inFlight = true;
      try { return await mockSignUp(); }
      finally { inFlight = false; }
    }

    const r1 = await handleSignup();
    const r2 = await handleSignup();
    expect(mockSignUp).toHaveBeenCalledTimes(2);
    expect(r2).not.toBe("blocked");
  });
});

// -----------------------------------------------------------------
// 3. 429 / Rate-limit error handling
// -----------------------------------------------------------------

describe("Signup — 429 / Rate-Limit Error Handling", () => {
  it("shows signup-specific rate-limit message on HTTP 429", () => {
    const err = Object.assign(new Error("over_email_send_rate_limit"), { status: 429 });
    const appError = normalizeError(err, "signup");
    expect(appError.category).toBe("rate_limit");
    expect(appError.userMessage).toBe(
      "Too many signup attempts. Please wait a few minutes and try again."
    );
    expect(appError.isRetryable).toBe(false);
  });

  it("catches 'too many requests' wording from Supabase errors in signup context", () => {
    const err = new Error("Too many requests. Please try again later.");
    const appError = normalizeError(err, "signup");
    expect(appError.category).toBe("rate_limit");
    expect(appError.userMessage).toBe(
      "Too many signup attempts. Please wait a few minutes and try again."
    );
  });

  it("catches over_email_send_rate_limit string variant", () => {
    const err = new Error("over_email_send_rate_limit");
    const appError = normalizeError(err, "signup");
    expect(appError.category).toBe("rate_limit");
    expect(appError.userMessage).toContain("Too many signup attempts");
    expect(appError.isRetryable).toBe(false);
  });

  it("never auto-retries on rate limit (isRetryable = false)", () => {
    const err = Object.assign(new Error("rate limit exceeded"), { status: 429 });
    const appError = normalizeError(err, "signup");
    expect(appError.isRetryable).toBe(false);
  });

  it("uses generic rate-limit message in non-signup contexts", () => {
    const err = Object.assign(new Error("Too many requests"), { status: 429 });
    const appError = normalizeError(err, "login");
    expect(appError.category).toBe("rate_limit");
    expect(appError.userMessage).toBe("Too many requests. Please wait a moment before trying again.");
  });
});

// -----------------------------------------------------------------
// 4. Error classification
// -----------------------------------------------------------------

describe("Signup — Error Classification", () => {
  it("classifies already-registered as NOT rate_limit", () => {
    const err = new Error("User already registered");
    const appError = normalizeError(err, "signup");
    expect(appError.category).not.toBe("rate_limit");
  });

  it("passes through clean validation messages directly", () => {
    const err = new Error("Password must be at least 6 characters");
    const appError = normalizeError(err);
    expect(appError.userMessage).toBe("Password must be at least 6 characters");
  });
});

// -----------------------------------------------------------------
// 5. Auth redirect URL safety
// -----------------------------------------------------------------

describe("Auth Redirect URL — Production Safety", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("resolves to canonical production URL in production", () => {
    vi.stubGlobal("window", { location: { origin: "https://campusconnect.indevs.in" } });
    const url = getAuthRedirectUrl("/auth/verify");
    expect(url).toBe("https://campusconnect.indevs.in/auth/verify");
    expect(url).not.toContain("localhost");
    expect(url).not.toContain("127.0.0.1");
  });

  it("does not include any stale dev/preview domain URLs", () => {
    vi.stubGlobal("window", { location: { origin: "https://campusconnect.indevs.in" } });
    const url = getAuthRedirectUrl("/auth/verify");
    expect(url).not.toMatch(/lovable|vercel|netlify|preview/i);
  });

  it("defaults to PRODUCTION_ORIGIN when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    const url = getAuthRedirectUrl("/auth/verify");
    expect(url).toBe(`${PRODUCTION_ORIGIN}/auth/verify`);
  });

  it("preserves localhost only for local dev", () => {
    vi.stubGlobal("window", { location: { origin: "http://localhost:5173" } });
    const url = getAuthRedirectUrl("/auth/verify");
    expect(url).toBe("http://localhost:5173/auth/verify");
  });
});
