import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirectUrl, PRODUCTION_ORIGIN } from "@/lib/auth-redirect";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import Auth from "@/pages/Auth";
import PublicRoute from "@/router/PublicRoute";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  const mockSubscription = { unsubscribe: vi.fn() };
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: mockSubscription } }),
        resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
        updateUser: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null }),
      },
    },
  };
});

vi.mock("@/hooks/use-platform-branding", () => ({
  usePlatformBranding: () => ({
    branding: {
      brand_name: "Campus Connect",
      tagline: "By Students For Students",
      logo_url: "https://campusconnect.indevs.in/icons/icon-192.png",
    },
    isLoading: false,
  }),
}));

// Mock AuthProvider and TenantProvider for testing PublicRoute integration
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: vi.fn().mockReturnValue({ user: null, session: null, isLoading: false }),
}));

vi.mock("@/providers/TenantProvider", () => ({
  useTenant: vi.fn().mockReturnValue({ role: "student", collegeId: null, isLoading: false }),
  useTenantRole: vi.fn().mockReturnValue("student"),
}));

import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

describe("Production Password Reset Flow Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    sessionStorage.clear();
    window.location.hash = "";
    vi.clearAllMocks();

    // Re-establish default Supabase Auth mocks after clearAllMocks
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any);
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null } as any);
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: { user: {} }, error: null } as any);
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as any);

    // Re-establish Auth and Tenant provider defaults
    vi.mocked(useAuth).mockReturnValue({ user: null, session: null, isLoading: false } as any);
    vi.mocked(useTenant).mockReturnValue({ role: "student", collegeId: null, isLoading: false } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Sign In page renders "Forgot password?"
  it("1. Sign In page renders 'Forgot password?' near password input", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const forgotBtn = screen.getByRole("button", { name: /forgot password\?/i });
    expect(forgotBtn).toBeInTheDocument();
  });

  // 2. Clicking "Forgot password?" navigates to /forgot-password
  it("2. Clicking 'Forgot password?' navigates to /forgot-password", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/auth"]}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const forgotBtn = screen.getByRole("button", { name: /forgot password\?/i });
    fireEvent.click(forgotBtn);

    expect(screen.getByTestId("location-display").textContent).toBe("/forgot-password");
  });

  // 3. Forgot password form validates email
  it("3. Forgot password form validates email before submission", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <ForgotPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const submitBtn = screen.getByRole("button", { name: /send reset link/i });
    const input = screen.getByLabelText(/registered email address/i);

    // Empty submission
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(submitBtn);
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();

    // Invalid email format (missing domain)
    fireEvent.change(input, { target: { value: "invalid-email" } });
    fireEvent.click(submitBtn);
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  // 4. resetPasswordForEmail() is called with correct redirectTo
  it("4. resetPasswordForEmail() is called with canonical redirectTo", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: {} as any,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <ForgotPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const input = screen.getByLabelText(/registered email address/i);
    fireEvent.change(input, { target: { value: "student@bkbirlanightcollege.ac.in" } });

    const submitBtn = screen.getByRole("button", { name: /send reset link/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "student@bkbirlanightcollege.ac.in",
        {
          redirectTo: getAuthRedirectUrl("/reset-password"),
        }
      );
    });

    // Check that redirect URL targets /reset-password
    const calledRedirect = vi.mocked(supabase.auth.resetPasswordForEmail).mock.calls[0][1]?.redirectTo;
    expect(calledRedirect).toContain("/reset-password");
  });

  // 5. Success message does not reveal whether email exists
  it("5. Neutral success message is displayed without revealing user existence", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: {} as any,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <ForgotPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const input = screen.getByLabelText(/registered email address/i);
    fireEvent.change(input, { target: { value: "unknown@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
    });
  });

  // 6. Duplicate reset submissions are prevented
  it("6. Prevents duplicate reset submissions while request is in flight", async () => {
    let resolvePromise: (val: any) => void;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(supabase.auth.resetPasswordForEmail).mockReturnValueOnce(slowPromise as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <ForgotPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const input = screen.getByLabelText(/registered email address/i);
    fireEvent.change(input, { target: { value: "test@example.com" } });
    const submitBtn = screen.getByRole("button", { name: /send reset link/i });

    // Click twice rapidly
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolvePromise!({ data: {}, error: null });
    });
  });

  // 7. /reset-password is accessible during recovery without being redirected to dashboard
  it("7. PublicRoute does NOT redirect away when type=recovery is in hash or sessionStorage", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "test-user-id", email: "test@example.com" } as any,
      session: { user: { id: "test-user-id" } } as any,
      isLoading: false,
    });

    // Simulate recovery hash
    window.location.hash = "#type=recovery&access_token=xyz";

    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <PublicRoute>
          <div data-testid="recovery-page">Reset Password Content</div>
        </PublicRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId("recovery-page")).toBeInTheDocument();
    window.location.hash = "";
  });

  // 8. PASSWORD_RECOVERY event transitions ResetPasswordPage to ready
  it("8. Handles PASSWORD_RECOVERY auth event to display password update form", async () => {
    let authCallback: (event: string, session: any) => void;
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementationOnce((callback: any) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } } as any;
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reset-password"]}>
          <ResetPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initial state shows checking/verifying
    expect(screen.getByText(/verifying recovery session/i)).toBeInTheDocument();

    // Trigger PASSWORD_RECOVERY
    await act(async () => {
      authCallback!("PASSWORD_RECOVERY", { user: { id: "u-1" } });
    });

    await waitFor(() => {
      expect(screen.getByText(/create new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    });
  });

  // 9. New password validation requires minimum length of 6 characters
  it("9. Rejects passwords shorter than 6 characters", async () => {
    // Start directly in recovery state
    sessionStorage.setItem("cc_password_recovery_active", "true");
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { user: { id: "u-1" } } as any },
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reset-password"]}>
          <ResetPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/create new password/i)).toBeInTheDocument();
    });

    const newPass = screen.getByLabelText(/^new password$/i);
    const confirmPass = screen.getByLabelText(/confirm new password/i);
    const submitBtn = screen.getByRole("button", { name: /update password/i });

    fireEvent.change(newPass, { target: { value: "12345" } });
    fireEvent.change(confirmPass, { target: { value: "12345" } });
    fireEvent.click(submitBtn);

    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  // 10. Password mismatch is rejected
  it("10. Rejects mismatched passwords", async () => {
    sessionStorage.setItem("cc_password_recovery_active", "true");
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { user: { id: "u-1" } } as any },
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reset-password"]}>
          <ResetPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/create new password/i)).toBeInTheDocument();
    });

    const newPass = screen.getByLabelText(/^new password$/i);
    const confirmPass = screen.getByLabelText(/confirm new password/i);
    const submitBtn = screen.getByRole("button", { name: /update password/i });

    fireEvent.change(newPass, { target: { value: "SecurePassword123" } });
    fireEvent.change(confirmPass, { target: { value: "DifferentPassword123" } });
    fireEvent.click(submitBtn);

    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  // 11. updateUser({ password }) is called with valid input
  it("11. Calls supabase.auth.updateUser({ password }) with new password", async () => {
    sessionStorage.setItem("cc_password_recovery_active", "true");
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { user: { id: "u-1" } } as any },
      error: null,
    });
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: { id: "u-1" } } as any,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reset-password"]}>
          <ResetPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/create new password/i)).toBeInTheDocument();
    });

    const newPass = screen.getByLabelText(/^new password$/i);
    const confirmPass = screen.getByLabelText(/confirm new password/i);
    const submitBtn = screen.getByRole("button", { name: /update password/i });

    fireEvent.change(newPass, { target: { value: "NewValidPassword2026" } });
    fireEvent.change(confirmPass, { target: { value: "NewValidPassword2026" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: "NewValidPassword2026",
      });
    });
  });

  // 12. Successful reset shows success state and signs out the recovery session
  it("12. Successful reset shows success state and signs out recovery session", async () => {
    sessionStorage.setItem("cc_password_recovery_active", "true");
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { user: { id: "u-1" } } as any },
      error: null,
    });
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: { id: "u-1" } } as any,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reset-password"]}>
          <ResetPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/create new password/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "CorrectNewPass123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "CorrectNewPass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  // 13. Expired/invalid recovery link shows error state and link to /forgot-password
  it("13. Expired recovery link in URL parameters renders expired state with request link", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reset-password?error=access_denied&error_code=otp_expired"]}>
          <ResetPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/reset link expired or invalid/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /request a new reset link/i })).toBeInTheDocument();
    });
  });

  // 14. User can return to Sign In from both pages
  it("14. Both pages provide clear navigation back to Sign In", async () => {
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <ForgotPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole("link", { name: /back to sign in/i })).toHaveAttribute("href", "/auth");
    unmount();

    sessionStorage.setItem("cc_password_recovery_active", "true");
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { user: { id: "u-1" } } as any },
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reset-password"]}>
          <ResetPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /back to sign in/i })).toHaveAttribute("href", "/auth");
    });
  });
});
