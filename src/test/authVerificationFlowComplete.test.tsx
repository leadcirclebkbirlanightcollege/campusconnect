import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EmailVerificationPage from "@/pages/auth/EmailVerificationPage";
import { supabase } from "@/integrations/supabase/client";
import { resolveStudentOnboardingDestination } from "@/lib/onboardingRouting";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      verifyOtp: vi.fn(),
      resend: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

function renderWithRouter(initialEntry = "/auth/verify") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/auth/verify" element={<EmailVerificationPage />} />
          <Route path="/onboarding-wizard" element={<div>ONBOARDING_WIZARD_PAGE</div>} />
          <Route path="/pending-approval" element={<div>PENDING_APPROVAL_PAGE</div>} />
          <Route path="/app/dashboard" element={<div>STUDENT_DASHBOARD_PAGE</div>} />
          <Route path="/platform/admin/dashboard" element={<div>ADMIN_DASHBOARD_PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Complete Authentication & Verification Flow Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.location.hash = "";

    // Default mock behavior
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any);
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });
  });

  describe("1. Verification Code Length & Manual Entry (Bug 1 Fix)", () => {
    it("renders the 8-digit verification code input view when no URL token is present", async () => {
      renderWithRouter("/auth/verify?email=student%40bkbc.edu.in");

      // Waiting for the brief initial check to settle
      await waitFor(() => {
        expect(screen.getByLabelText(/8-digit verification code/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue("student@bkbc.edu.in")).toBeInTheDocument();

      const codeInput = screen.getByLabelText(/8-digit verification code/i);
      expect(codeInput).toHaveAttribute("maxLength", "8");
      expect(codeInput).toHaveAttribute("inputMode", "numeric");
      expect(codeInput).toHaveAttribute("placeholder", "31305366");
    });

    it("disables the submit button until a full 8-digit code is entered", async () => {
      renderWithRouter("/auth/verify?email=student%40bkbc.edu.in");

      await waitFor(() => {
        expect(screen.getByLabelText(/8-digit verification code/i)).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole("button", { name: /verify code & continue/i });
      expect(submitBtn).toBeDisabled();

      const codeInput = screen.getByLabelText(/8-digit verification code/i);

      // Enter only 6 digits
      fireEvent.change(codeInput, { target: { value: "313053" } });
      expect(submitBtn).toBeDisabled();

      // Enter only 7 digits
      fireEvent.change(codeInput, { target: { value: "3130536" } });
      expect(submitBtn).toBeDisabled();

      // Enter full 8 digits
      fireEvent.change(codeInput, { target: { value: "31305366" } });
      expect(submitBtn).not.toBeDisabled();
    });

    it("supports pasting an 8-digit code and cleans non-digit characters", async () => {
      renderWithRouter("/auth/verify?email=student%40bkbc.edu.in");

      await waitFor(() => {
        expect(screen.getByLabelText(/8-digit verification code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/8-digit verification code/i);

      // Simulate pasting code with spaces or dashes
      fireEvent.paste(codeInput, {
        clipboardData: {
          getData: () => " 3130-5366 ",
        },
      });

      expect(codeInput).toHaveValue("31305366");
    });

    it("submits 8-digit code via verifyOtp and routes un-onboarded student to /onboarding-wizard", async () => {
      vi.mocked(supabase.auth.verifyOtp).mockResolvedValueOnce({
        data: {
          user: { id: "user-new-student", email: "student@bkbc.edu.in" } as any,
          session: { access_token: "mock-token" } as any,
        },
        error: null,
      });

      // Mock database profile check: profile not completed
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { role: "student" } }),
              }),
            }),
          } as any;
        }
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { profile_completed: false, approval_status: "pending" },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      renderWithRouter("/auth/verify?email=student%40bkbc.edu.in");

      await waitFor(() => {
        expect(screen.getByLabelText(/8-digit verification code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/8-digit verification code/i);
      fireEvent.change(codeInput, { target: { value: "31305366" } });

      const submitBtn = screen.getByRole("button", { name: /verify code & continue/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
          email: "student@bkbc.edu.in",
          token: "31305366",
          type: "signup",
        });
      });

      // User must NOT be signed out
      expect(supabase.auth.signOut).not.toHaveBeenCalled();

      // Navigates to onboarding wizard
      await waitFor(() => {
        expect(screen.getByText("ONBOARDING_WIZARD_PAGE")).toBeInTheDocument();
      });
    });

    it("displays a clear error message when incorrect code is submitted", async () => {
      vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Token is invalid", code: "validation_failed" } as any,
      });

      renderWithRouter("/auth/verify?email=student%40bkbc.edu.in");

      await waitFor(() => {
        expect(screen.getByLabelText(/8-digit verification code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/8-digit verification code/i);
      fireEvent.change(codeInput, { target: { value: "00000000" } });

      const submitBtn = screen.getByRole("button", { name: /verify code & continue/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/incorrect 8-digit verification code/i)
        ).toBeInTheDocument();
      });
    });

    it("resend code calls supabase.auth.resend with correct options and starts cooldown", async () => {
      vi.mocked(supabase.auth.resend).mockResolvedValueOnce({
        data: {} as any,
        error: null,
      });

      renderWithRouter("/auth/verify?email=student%40bkbc.edu.in");

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /resend code/i })).toBeInTheDocument();
      });

      const resendBtn = screen.getByRole("button", { name: /resend code/i });
      fireEvent.click(resendBtn);

      await waitFor(() => {
        expect(supabase.auth.resend).toHaveBeenCalledWith({
          type: "signup",
          email: "student@bkbc.edu.in",
          options: expect.objectContaining({
            emailRedirectTo: expect.stringContaining("/auth/verify"),
          }),
        });
      });

      // Button should now show cooldown
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /resend code \(\d+s\)/i })).toBeDisabled();
      });
    });
  });

  describe("2. Email Link Verification & Session Flow (Bug 2 Fix)", () => {
    it("preserves authenticated session and routes un-onboarded student directly to /onboarding-wizard", async () => {
      const mockUser = {
        id: "student-user-1",
        email: "verified@bkbc.edu.in",
        email_confirmed_at: new Date().toISOString(),
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: { user: mockUser } as any },
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { role: "student" } }),
              }),
            }),
          } as any;
        }
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { profile_completed: false, approval_status: "pending" },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      renderWithRouter("/auth/verify#access_token=valid_token&type=signup");

      // Check that signOut is never called
      expect(supabase.auth.signOut).not.toHaveBeenCalled();

      // Resolves to onboarding wizard
      await waitFor(() => {
        expect(screen.getByText("ONBOARDING_WIZARD_PAGE")).toBeInTheDocument();
      });
    });

    it("preserves session and routes already submitted student directly to /pending-approval (Under Review)", async () => {
      const mockUser = {
        id: "student-user-submitted",
        email: "submitted@bkbc.edu.in",
        email_confirmed_at: new Date().toISOString(),
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: { user: mockUser } as any },
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { role: "student" } }),
              }),
            }),
          } as any;
        }
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    profile_completed: true,
                    approval_status: "pending",
                    college_assigned: false,
                  },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      renderWithRouter("/auth/verify#access_token=valid_token&type=signup");

      expect(supabase.auth.signOut).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByText("PENDING_APPROVAL_PAGE")).toBeInTheDocument();
      });
    });

    it("preserves session and routes approved student directly to /app/dashboard", async () => {
      const mockUser = {
        id: "student-user-approved",
        email: "approved@bkbc.edu.in",
        email_confirmed_at: new Date().toISOString(),
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: { user: mockUser } as any },
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { role: "student" } }),
              }),
            }),
          } as any;
        }
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    profile_completed: true,
                    approval_status: "approved",
                    college_assigned: true,
                  },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      renderWithRouter("/auth/verify#access_token=valid_token&type=signup");

      expect(supabase.auth.signOut).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByText("STUDENT_DASHBOARD_PAGE")).toBeInTheDocument();
      });
    });
  });

  describe("3. Onboarding Destination Resolution Logic", () => {
    it("routes uncompleted student profile to /onboarding-wizard", () => {
      expect(
        resolveStudentOnboardingDestination(
          { profile_completed: false, approval_status: "pending" },
          "student"
        )
      ).toBe("/onboarding-wizard");

      expect(resolveStudentOnboardingDestination(null, "student")).toBe("/onboarding-wizard");
    });

    it("routes completed pending student profile to /pending-approval", () => {
      expect(
        resolveStudentOnboardingDestination(
          { profile_completed: true, approval_status: "pending", college_assigned: false },
          "student"
        )
      ).toBe("/pending-approval");
    });

    it("routes approved student with college to /app/dashboard", () => {
      expect(
        resolveStudentOnboardingDestination(
          { profile_completed: true, approval_status: "approved", college_assigned: true },
          "student"
        )
      ).toBe("/app/dashboard");
    });

    it("routes admin directly to admin dashboard", () => {
      expect(resolveStudentOnboardingDestination(null, "admin")).toBe(
        "/platform/admin/dashboard"
      );
    });

    it("routes super_admin directly to control center", () => {
      expect(resolveStudentOnboardingDestination(null, "super_admin")).toBe(
        "/platform/admin-control/dashboard"
      );
    });
  });
});
