import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import Auth from "@/pages/Auth";
import AuthCallbackPage from "@/pages/auth/AuthCallbackPage";
import AccountSecuritySettings from "@/pages/settings/AccountSecuritySettings";
import { ReauthenticationDialog } from "@/components/auth/ReauthenticationDialog";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  const mockSubscription = { unsubscribe: vi.fn() };
  return {
    supabase: {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(),
        signInWithPassword: vi.fn(),
        signInWithOtp: vi.fn(),
        verifyOtp: vi.fn(),
        updateUser: vi.fn(),
        reauthenticate: vi.fn(),
        signOut: vi.fn(),
        resend: vi.fn(),
        mfa: {
          enroll: vi.fn(),
          challenge: vi.fn(),
          verify: vi.fn(),
          challengeAndVerify: vi.fn(),
          unenroll: vi.fn(),
          listFactors: vi.fn(),
          getAuthenticatorAssuranceLevel: vi.fn(),
        },
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    },
  };
});

vi.mock("@/hooks/use-platform-branding", () => ({
  usePlatformBranding: () => ({
    branding: {
      brand_name: "Campus Connect",
      tagline: "Academic Operating System",
      logo_url: "https://campusconnect.indevs.in/icons/icon-192.png",
    },
    isLoading: false,
  }),
}));

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/providers/TenantProvider", () => ({
  useTenant: vi.fn(),
  useTenantRole: vi.fn().mockReturnValue("student"),
}));

import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

describe("Production Authentication & Account Security System Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    sessionStorage.clear();
    window.location.hash = "";
    vi.clearAllMocks();

    // Default mock returns
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any);
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
      data: {} as any,
      error: null,
    });
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
      data: { user: { id: "user-123" }, session: {} } as any,
      error: null,
    });
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: { id: "user-123" } } as any,
      error: null,
    });
    vi.mocked(supabase.auth.reauthenticate).mockResolvedValue({
      data: {},
      error: null,
    } as any);
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    } as any);

    // MFA defaults
    vi.mocked(supabase.auth.mfa.getAuthenticatorAssuranceLevel).mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal1", currentAuthenticationMethods: [] },
      error: null,
    } as any);
    vi.mocked(supabase.auth.mfa.listFactors).mockResolvedValue({
      data: { totp: [], all: [] },
      error: null,
    } as any);
    vi.mocked(supabase.auth.mfa.enroll).mockResolvedValue({
      data: {
        id: "factor-test-id",
        type: "totp",
        totp: {
          qr_code: "data:image/svg+xml;utf8,...",
          secret: "JBSWY3DPEHPK3PXP",
          uri: "otpauth://totp/Campus%20Connect:test@example.com?secret=JBSWY3DPEHPK3PXP",
        },
      },
      error: null,
    } as any);
    vi.mocked(supabase.auth.mfa.challengeAndVerify).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    } as any);
    vi.mocked(supabase.auth.mfa.unenroll).mockResolvedValue({
      data: { id: "factor-test-id" },
      error: null,
    } as any);

    // Providers
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "student@example.com" } as any,
      session: { user: { id: "user-123" } } as any,
      isLoading: false,
    });
    vi.mocked(useTenant).mockReturnValue({
      role: "student",
      collegeId: "col-1",
      isLoading: false,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Magic Link / OTP Authentication ──────────────────────────────────
  it("1. Sign In page provides 'Sign in with Magic Link' option", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, session: null, isLoading: false });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const magicBtn = screen.getByRole("button", { name: /sign in with magic link/i });
    expect(magicBtn).toBeInTheDocument();
  });

  it("2. Clicking 'Sign in with Magic Link' displays email field and calls signInWithOtp", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, session: null, isLoading: false });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Click magic link switch
    fireEvent.click(screen.getByRole("button", { name: /sign in with magic link/i }));

    expect(screen.getByText(/passwordless sign in/i)).toBeInTheDocument();
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "student@bkbirlanightcollege.ac.in" } });

    const sendBtn = screen.getByRole("button", { name: /send magic link \/ otp/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: "student@bkbirlanightcollege.ac.in",
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    });
  });

  it("3. Magic Link flow prompts for 6-digit OTP code and calls verifyOtp", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, session: null, isLoading: false });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Switch to magic link
    fireEvent.click(screen.getByRole("button", { name: /sign in with magic link/i }));
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "student@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send magic link \/ otp/i }));

    // OTP form appears
    await waitFor(() => {
      expect(screen.getByLabelText(/6-digit otp code/i)).toBeInTheDocument();
    });

    const otpInput = screen.getByLabelText(/6-digit otp code/i);
    fireEvent.change(otpInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verify & sign in/i }));

    await waitFor(() => {
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: "student@example.com",
        token: "123456",
        type: "email",
      });
    });
  });

  // ── 2. MFA Login Challenge ──────────────────────────────────────────────
  it("4. Intercepts sign in when AAL2 is required and renders MFA challenge", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, session: null, isLoading: false });

    // Mock that user has MFA enabled: currentLevel aal1 -> nextLevel aal2
    vi.mocked(supabase.auth.mfa.getAuthenticatorAssuranceLevel).mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2", currentAuthenticationMethods: ["password"] },
      error: null,
    } as any);
    vi.mocked(supabase.auth.mfa.listFactors).mockResolvedValue({
      data: {
        totp: [{ id: "factor-totp-1", status: "verified", factor_type: "totp" }],
        all: [{ id: "factor-totp-1", status: "verified", factor_type: "totp" }],
      },
      error: null,
    } as any);
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: "user-with-mfa" }, session: {} } as any,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Sign in with password
    fireEvent.change(screen.getByLabelText(/email or student id/i), {
      target: { value: "mfauser@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "StrongPass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    // MFA challenge form is rendered
    await waitFor(() => {
      expect(screen.getByText(/two-factor authentication required/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/authenticator security code/i)).toBeInTheDocument();
    });

    // Enter 6-digit TOTP code
    fireEvent.change(screen.getByLabelText(/authenticator security code/i), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verify code/i }));

    await waitFor(() => {
      expect(supabase.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
        factorId: "factor-totp-1",
        code: "654321",
      });
    });
  });

  // ── 3. Account Settings: Change Email ───────────────────────────────────
  it("5. Account Settings validates email change and calls updateUser({ email })", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AccountSecuritySettings initialTab="email" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const input = screen.getByLabelText(/new email address/i);
    const button = screen.getByRole("button", { name: /change email address/i });

    // Submit invalid/empty email
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(button);
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();

    // Submit new valid email
    fireEvent.change(input, { target: { value: "new.email@example.com" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith(
        { email: "new.email@example.com" },
        { emailRedirectTo: `${window.location.origin}/auth/callback` }
      );
    });
  });

  // ── 4. Account Settings: Change Password ────────────────────────────────
  it("6. Account Settings validates password length and match before updateUser({ password })", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AccountSecuritySettings initialTab="password" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const newPass = screen.getByLabelText(/^new password$/i);
    const confirmPass = screen.getByLabelText(/confirm new password/i);
    const updateBtn = screen.getByRole("button", { name: /update password/i });

    // Too short
    fireEvent.change(newPass, { target: { value: "123" } });
    fireEvent.change(confirmPass, { target: { value: "123" } });
    fireEvent.click(updateBtn);
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();

    // Mismatched
    fireEvent.change(newPass, { target: { value: "PasswordOne" } });
    fireEvent.change(confirmPass, { target: { value: "PasswordTwo" } });
    fireEvent.click(updateBtn);
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();

    // Valid matching
    fireEvent.change(newPass, { target: { value: "SecurePass2026" } });
    fireEvent.change(confirmPass, { target: { value: "SecurePass2026" } });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: "SecurePass2026",
      });
    });
  });

  // ── 5. Account Settings: Two-Factor Authentication (MFA) ─────────────────
  it("7. Enables 2FA: calls mfa.enroll, displays secret, and activates factor on verification", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AccountSecuritySettings initialTab="security" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const enableBtn = screen.getByRole("button", { name: /enable 2fa/i });
    fireEvent.click(enableBtn);

    // Calls mfa.enroll
    await waitFor(() => {
      expect(supabase.auth.mfa.enroll).toHaveBeenCalledWith({
        factorType: "totp",
        friendlyName: "Campus Connect Authenticator",
      });
      // Displays secret key
      expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();
    });

    // Enter verification code
    const codeInput = screen.getByLabelText(/enter the 6-digit code/i);
    fireEvent.change(codeInput, { target: { value: "987654" } });
    fireEvent.click(screen.getByRole("button", { name: /verify & enable 2fa/i }));

    await waitFor(() => {
      expect(supabase.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
        factorId: "factor-test-id",
        code: "987654",
      });
    });
  });

  it("8. Disables 2FA: prompts confirmation and calls mfa.unenroll", async () => {
    // Mock existing verified factor
    vi.mocked(supabase.auth.mfa.listFactors).mockResolvedValue({
      data: {
        totp: [{ id: "factor-active-1", status: "verified", factor_type: "totp" }],
        all: [{ id: "factor-active-1", status: "verified", factor_type: "totp" }],
      },
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AccountSecuritySettings initialTab="security" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/two-factor authentication is active/i)).toBeInTheDocument();
    });

    // Click Disable
    const disableBtn = screen.getByRole("button", { name: /disable two-factor authentication/i });
    fireEvent.click(disableBtn);

    // Reauth / confirmation modal appears
    await waitFor(() => {
      expect(screen.getByText(/verify your identity/i)).toBeInTheDocument();
    });

    // Enter password in reauth dialog
    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: "MyCorrectPassword" },
    });
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    } as any);
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    // Confirmation dialog opens
    await waitFor(() => {
      expect(screen.getByText(/disable two-factor authentication\?/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /yes, disable 2fa/i }));

    await waitFor(() => {
      expect(supabase.auth.mfa.unenroll).toHaveBeenCalledWith({
        factorId: "factor-active-1",
      });
    });
  });

  // ── 6. Reauthentication Component ───────────────────────────────────────
  it("9. ReauthenticationDialog verifies credentials and triggers onSuccess callback", async () => {
    const onSuccess = vi.fn();

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    } as any);

    render(
      <ReauthenticationDialog
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByText(/verify your identity/i)).toBeInTheDocument();
    const passInput = screen.getByLabelText(/current password/i);
    fireEvent.change(passInput, { target: { value: "Pass123" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "student@example.com",
        password: "Pass123",
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  // ── 7. Auth Callback Handling ───────────────────────────────────────────
  it("10. AuthCallbackPage forwards recovery links to /reset-password", async () => {
    window.location.hash = "#type=recovery&access_token=test-token";

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/auth/callback"]}>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/reset-password" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("location-display").textContent).toBe("/reset-password");
    });
    window.location.hash = "";
  });

  it("11. AuthCallbackPage resolves active session and navigates to role dashboard", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { user: { id: "student-user-1" } } as any },
      error: null,
    });

    // Mock role query
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockImplementation(() =>
            Promise.resolve({
              data: { role: "student", profile_completed: true, approval_status: "approved", college_assigned: true },
              error: null,
            })
          ),
        }),
      }),
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/auth/callback"]}>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/app/dashboard" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("location-display").textContent).toBe("/app/dashboard");
    });
  });

  // ── 8. Active Sessions Sign Out ─────────────────────────────────────────
  it("12. Account Settings allows signing out of other sessions", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AccountSecuritySettings initialTab="security" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const signoutBtn = screen.getByRole("button", { name: /sign out of other sessions/i });
    fireEvent.click(signoutBtn);

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "others" });
    });
  });
});
