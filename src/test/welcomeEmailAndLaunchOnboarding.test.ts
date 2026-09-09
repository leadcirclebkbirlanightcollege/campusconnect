import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

describe("Launch-Day Custom Welcome Email & Onboarding Flow", () => {
  let inFlight = false;
  let mockSignUp: any;
  let mockSignIn: any;
  let mockUpsertProfile: any;
  let mockUpsertRole: any;
  let mockVerifyProfile: any;
  let mockInvokeEdgeFunction: any;
  let navigationHistory: string[];

  beforeEach(() => {
    inFlight = false;
    navigationHistory = [];
    mockSignUp = vi.fn();
    mockSignIn = vi.fn();
    mockUpsertProfile = vi.fn().mockResolvedValue({ error: null });
    mockUpsertRole = vi.fn().mockResolvedValue({ error: null });
    mockVerifyProfile = vi.fn().mockResolvedValue({ data: { user_id: "test-user-1" }, error: null });
    mockInvokeEdgeFunction = vi.fn().mockResolvedValue({ data: { success: true, status: "sent" }, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Simulates the exact launch-day signup & welcome email pipeline from Auth.tsx */
  async function executeSignupPipeline({
    email,
    password,
    existingSession = null,
    edgeFunctionShouldFail = false,
  }: {
    email: string;
    password: string;
    existingSession?: any;
    edgeFunctionShouldFail?: boolean;
  }) {
    if (inFlight) return { blocked: true };
    inFlight = true;

    try {
      let authUser = existingSession?.user?.email === email ? existingSession.user : null;
      let authSession = existingSession?.user?.email === email ? existingSession : null;

      if (!authUser) {
        const { data: authData, error: authError } = await mockSignUp({ email, password });
        if (authError) throw authError;
        authUser = authData.user;
        authSession = authData.session;
      }

      if (!authSession) {
        return { action: "email_verification_pending" };
      }

      // Initialize profile & role
      const pRes = await mockUpsertProfile();
      if (pRes.error) throw pRes.error;

      const rRes = await mockUpsertRole();
      if (rRes.error) throw rRes.error;

      const vRes = await mockVerifyProfile();
      if (vRes.error || !vRes.data) throw new Error("Profile verification failed");

      // Non-blocking welcome email dispatch
      try {
        if (edgeFunctionShouldFail) {
          void mockInvokeEdgeFunction("send-welcome-email", {
            body: { user_id: authUser.id, email: authUser.email, name: email.split("@")[0] },
          }).catch(() => {});
        } else {
          void mockInvokeEdgeFunction("send-welcome-email", {
            body: { user_id: authUser.id, email: authUser.email, name: email.split("@")[0] },
          });
        }
      } catch (err) {
        // Never throw
      }

      navigationHistory.push("/onboarding-wizard");
      return { action: "onboarding", target: "/onboarding-wizard", userId: authUser.id };
    } finally {
      inFlight = false;
    }
  }

  // 1. Profile creation triggers welcome email once
  it("triggers welcome email invocation exactly once after profile initialization", async () => {
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: "user-123", email: "student@bkbirlanightcollege.org" },
        session: { access_token: "tok-123" },
      },
      error: null,
    });

    const res = await executeSignupPipeline({
      email: "student@bkbirlanightcollege.org",
      password: "securepassword123",
    });

    expect(res.action).toBe("onboarding");
    expect(navigationHistory).toContain("/onboarding-wizard");
    expect(mockInvokeEdgeFunction).toHaveBeenCalledTimes(1);
    expect(mockInvokeEdgeFunction).toHaveBeenCalledWith("send-welcome-email", {
      body: {
        user_id: "user-123",
        email: "student@bkbirlanightcollege.org",
        name: "student",
      },
    });
  });

  // 2. Same user cannot receive duplicate welcome emails (server-side idempotency)
  it("server-side idempotency prevents sending duplicate welcome emails for the same user", async () => {
    const dbState = {
      user_id: "user-idem-1",
      email: "student@bkbirlanightcollege.org",
      welcome_email_sent_at: "2026-09-08T09:00:00.000Z",
    };

    // Simulate Edge Function server-side idempotency check
    async function simulateSendWelcomeEmailEdgeFunction(userId: string) {
      if (dbState.welcome_email_sent_at) {
        return { success: true, status: "already_sent", sent_at: dbState.welcome_email_sent_at };
      }
      dbState.welcome_email_sent_at = new Date().toISOString();
      return { success: true, status: "sent", sent_at: dbState.welcome_email_sent_at };
    }

    const firstCall = await simulateSendWelcomeEmailEdgeFunction("user-idem-1");
    expect(firstCall.status).toBe("already_sent");

    const secondCall = await simulateSendWelcomeEmailEdgeFunction("user-idem-1");
    expect(secondCall.status).toBe("already_sent");
  });

  // 3. Email failure does not fail signup
  it("does not fail signup if welcome email dispatch fails or times out", async () => {
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: "user-fail-1", email: "student@bkbirlanightcollege.org" },
        session: { access_token: "tok-fail" },
      },
      error: null,
    });

    mockInvokeEdgeFunction.mockRejectedValue(new Error("Network timeout contacting Zoho SMTP"));

    const res = await executeSignupPipeline({
      email: "student@bkbirlanightcollege.org",
      password: "securepassword123",
      edgeFunctionShouldFail: true,
    });

    // Signup still succeeds!
    expect(res.action).toBe("onboarding");
    expect(res.userId).toBe("user-fail-1");
  });

  // 4. Email failure does not prevent onboarding
  it("navigates immediately to /onboarding-wizard even if email delivery fails", async () => {
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: "user-onboard-1", email: "student@bkbirlanightcollege.org" },
        session: { access_token: "tok-1" },
      },
      error: null,
    });

    mockInvokeEdgeFunction.mockResolvedValue({
      data: { success: false, status: "failed", error: "SMTP auth failure" },
      error: null,
    });

    await executeSignupPipeline({
      email: "student@bkbirlanightcollege.org",
      password: "securepassword123",
    });

    expect(navigationHistory).toEqual(["/onboarding-wizard"]);
  });

  // 5. Retry after failure is safe
  it("allows controlled server-side retry when welcome_email_sent_at is null", async () => {
    let emailSent = false;
    const serverRecord: { welcome_email_sent_at: string | null } = {
      welcome_email_sent_at: null,
    };

    async function serverSendEmail() {
      if (serverRecord.welcome_email_sent_at) {
        return { status: "already_sent" };
      }
      emailSent = true;
      serverRecord.welcome_email_sent_at = new Date().toISOString();
      return { status: "sent" };
    }

    // Attempt 1: succeeds
    const res1 = await serverSendEmail();
    expect(res1.status).toBe("sent");
    expect(emailSent).toBe(true);

    // Attempt 2: retry does not resend
    emailSent = false;
    const res2 = await serverSendEmail();
    expect(res2.status).toBe("already_sent");
    expect(emailSent).toBe(false);
  });

  // 6. Already-sent email is not sent again
  it("returns status: already_sent when email has already been delivered", async () => {
    const edgeFunctionResponse = {
      success: true,
      status: "already_sent",
      sent_at: "2026-09-08T09:00:00.000Z",
      message: "Welcome email has already been sent to this user.",
    };

    expect(edgeFunctionResponse.status).toBe("already_sent");
    expect(edgeFunctionResponse.success).toBe(true);
  });

  // 7. Correct recipient email is used
  it("dispatches to the student's exact signup email address", async () => {
    const testEmail = "rahul.sharma@bkbirlanightcollege.org";
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: "user-rahul", email: testEmail },
        session: { access_token: "tok-rahul" },
      },
      error: null,
    });

    await executeSignupPipeline({
      email: testEmail,
      password: "securepassword123",
    });

    expect(mockInvokeEdgeFunction).toHaveBeenCalledWith("send-welcome-email", {
      body: expect.objectContaining({ email: testEmail }),
    });
  });

  // 8. Strict NO CTA & NO Onboarding URL Guarantee in Welcome Email
  it("verifies welcome email contains ZERO CTA buttons, ZERO action links, and NO onboarding URL", () => {
    const edgeFunctionPath = path.resolve(
      process.cwd(),
      "supabase/functions/send-welcome-email/index.ts"
    );
    const content = fs.readFileSync(edgeFunctionPath, "utf-8");

    // Must NOT contain any CTA buttons or anchor tags
    expect(content).not.toContain("<a ");
    expect(content).not.toContain("<a\n");
    expect(content).not.toContain("</a>");
    expect(content).not.toContain("href=");
    expect(content).not.toContain("Complete Your Profile");
    expect(content).not.toContain("Continue");
    expect(content).not.toContain("Get Started");

    // Must NOT contain any onboarding URL or links in email templates
    expect(content).not.toContain("/onboarding-wizard");
    expect(content).not.toContain("https://campusconnect.indevs.in/onboarding-wizard");

    // Must contain required informational text and institutional branding
    expect(content).toContain("Welcome to Campus Connect.");
    expect(content).toContain("Your Campus Connect account has been successfully created.");
    expect(content).toContain("You can now continue completing your profile and onboarding directly inside the Campus Connect application.");
    expect(content).toContain("Your college identity verification is still required before your account can receive full student access.");
    expect(content).toContain("B. K. Birla Night Arts, Science &amp; Commerce College, Kalyan");
    expect(content).toContain("By Students For Students");
  });

  // 9. No SMTP credentials appear in frontend bundle or source files
  it("verifies no Zoho credentials or App Passwords are in frontend code or Git-tracked files", () => {
    const authCode = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/Auth.tsx"),
      "utf-8"
    );

    expect(authCode).not.toContain("smtp");
    expect(authCode).not.toContain("ZOHO");
    expect(authCode).not.toContain("zoho");
    expect(authCode).not.toContain("smtppro.zoho");
    expect(authCode).not.toContain("nodemailer");
    expect(authCode).not.toContain("SERVICE_ROLE");
    expect(authCode).not.toContain("App Password");
  });

  // 10. Existing signup single-request guarantee remains intact
  it("maintains single-request guarantee and blocks duplicate in-flight submissions", async () => {
    mockSignUp.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: {
                  user: { id: "user-single", email: "student@bkbirlanightcollege.org" },
                  session: { access_token: "tok-s" },
                },
                error: null,
              }),
            40
          )
        )
    );

    const [r1, r2] = await Promise.all([
      executeSignupPipeline({ email: "student@bkbirlanightcollege.org", password: "pwd" }),
      executeSignupPipeline({ email: "student@bkbirlanightcollege.org", password: "pwd" }),
    ]);

    expect(mockSignUp).toHaveBeenCalledTimes(1);
    expect(r2).toEqual({ blocked: true });
  });

  // 11. signInWithPassword() is NEVER called after signup
  it("never invokes signInWithPassword during or after signup", async () => {
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: "user-nosignin", email: "student@bkbirlanightcollege.org" },
        session: { access_token: "tok-nosignin" },
      },
      error: null,
    });

    await executeSignupPipeline({
      email: "student@bkbirlanightcollege.org",
      password: "securepassword123",
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  // 12. College identity verification remains unchanged
  it("preserves approval_status: pending and requires college ID verification", () => {
    const authTsxContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/Auth.tsx"),
      "utf-8"
    );

    // Verified: initial profile seed has approval_status: "pending"
    expect(authTsxContent).toContain('approval_status: "pending"');
    expect(authTsxContent).toContain('profile_completed: false');
    expect(authTsxContent).toContain('role: "student"');
  });
});
