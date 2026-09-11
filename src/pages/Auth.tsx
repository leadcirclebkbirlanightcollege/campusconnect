import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showErrorToast, showSuccessToast } from "@/lib/error-handling";
import { toast } from "sonner";
import {
  Loader2, Eye, EyeOff,
  ArrowRight, CheckCircle2, BookOpen, Trophy, Zap, ShieldCheck, QrCode,
  Mail, KeyRound, ShieldAlert, Sparkles
} from "@/components/icons";
import { User } from "@supabase/supabase-js";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { BRANDING } from "@/config/branding";
import { APP_VERSION } from "@/config/version";
import { motion } from "framer-motion";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { resolveRoleDashboard, isRouteAllowedForRole } from "@/lib/roleRouting";

/* ── Feature chips for left hero panel ── */
const HIGHLIGHTS = [
  { icon: QrCode, label: "Tamper-Proof QR Attendance", desc: "Instant GPS-fenced check-ins" },
  { icon: BookOpen, label: "Live Timetable & Tasks", desc: "Always in sync with professors" },
  { icon: Trophy, label: "Gamified Academic Tiers", desc: "Earn points, streaks & prestige" },
  { icon: ShieldCheck, label: "Official Verified ID", desc: "Secure digital student credentials" },
];

/* ── Input wrapper with show/hide ── */
function PasswordInput({
  id, placeholder, value, onChange, label, rightAction,
}: {
  id: string; placeholder: string;
  value: string; onChange: (v: string) => void; label: string;
  rightAction?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-[13px] font-semibold text-foreground">{label}</Label>
        {rightAction}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10 h-11 bg-surface-2/80 border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/30 text-[14px] rounded-xl transition-all"
          required
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* ── Auth page ── */
const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { branding } = usePlatformBranding();
  const logoSrc = branding.logo_url || BRANDING.logo;
  const brandName = branding.brand_name || BRANDING.name;
  const tagline = branding.tagline || BRANDING.tagline;
  // Separate loading states so login and signup don't share a single flag
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  // Synchronous in-flight guard — blocks re-entry before React re-renders
  const signupInFlight = useRef(false);
  const [user, setUser] = useState<User | null>(null);

  // Login form
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Magic Link / OTP state
  const [loginMode, setLoginMode] = useState<"password" | "magic_link">("password");
  const [magicEmail, setMagicEmail] = useState("");
  const [magicOtpCode, setMagicOtpCode] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  // MFA Challenge state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Signup form
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  const checkMfaAndProceed = async (userId: string): Promise<boolean> => {
    try {
      if (typeof supabase.auth?.mfa?.getAuthenticatorAssuranceLevel === "function") {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const verified =
            factors?.totp?.find((f) => f.status === "verified") ||
            (factors as any)?.all?.find((f: any) => f.status === "verified");
          if (verified) {
            setPendingUserId(userId);
            setMfaFactorId(verified.id);
            setMfaRequired(true);
            return false;
          }
        }
      }
    } catch {
      // MFA check not required or error; proceed
    }
    return true;
  };

  useEffect(() => {
    // If arriving with password recovery parameters in hash, route directly to /reset-password
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      navigate("/reset-password" + window.location.hash, { replace: true });
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const canProceed = await checkMfaAndProceed(session.user.id);
        if (canProceed) {
          setUser(session.user);
          redirectToDashboard(session.user.id);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_event === "PASSWORD_RECOVERY") {
        navigate("/reset-password", { replace: true });
        return;
      }
      // If signup is currently in flight, handleSignup manages profile initialization and direct navigation
      if (signupInFlight.current) return;
      if (session?.user) {
        const canProceed = await checkMfaAndProceed(session.user.id);
        if (canProceed) {
          setUser(session.user);
          redirectToDashboard(session.user.id);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const getSafeRedirectUrl = (): string | null => {
    try {
      const paramRedirect = searchParams.get("redirect");
      const storedRedirect = sessionStorage.getItem("cc_redirect_after_login");
      const target = paramRedirect || storedRedirect;
      if (target) {
        sessionStorage.removeItem("cc_redirect_after_login");
        // Ensure safe relative target (no open redirects, no auth loop)
        if (target.startsWith("/") && !target.startsWith("//") && !target.startsWith("/auth")) {
          return target;
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const redirectToDashboard = async (userId: string) => {
    try {
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
      const r = role?.role;
      const safeRedirect = getSafeRedirectUrl();

      // Student onboarding & approval checks
      if (r !== "super_admin" && r !== "admin" && r !== "faculty") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_completed, approval_status, college_assigned")
          .eq("user_id", userId)
          .maybeSingle();
        if (!profile || !profile.profile_completed) {
          return navigate("/onboarding-wizard", { replace: true });
        }
        if (profile.approval_status !== "approved" || !profile.college_assigned) {
          return navigate("/pending-approval", { replace: true });
        }
      }

      // If user came via an authorized deep link, honor it only if permitted for this role!
      if (safeRedirect && isRouteAllowedForRole(r, safeRedirect)) {
        return navigate(safeRedirect, { replace: true });
      }

      // Otherwise fall back to canonical role-specific dashboard (Super Admin -> /platform/admin-control/dashboard)
      return navigate(resolveRoleDashboard(r), { replace: true });
    } catch {
      navigate("/onboarding-wizard", { replace: true });
    }
    // Fire-and-forget: log login activity + retention
    setTimeout(() => {
      try {
        const fromObj = supabase.from?.("login_activity");
        if (fromObj && typeof fromObj.insert === "function") {
          void fromObj.insert({
            user_id: userId,
            user_agent: navigator.userAgent?.slice?.(0, 255) ?? "",
          });
        }
        supabase.functions?.invoke?.("retention-on-login", { body: {} })?.catch?.(() => {});
      } catch {
        // Defensive: ignore in tests or mock environments
      }
    }, 1500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const identifier = loginIdentifier.trim();
      if (!identifier) throw new Error("Please enter Email or Student ID");

      let email = identifier.toLowerCase();
      if (!identifier.includes("@")) {
        const { data: resolved, error: resolveError } = await supabase.functions.invoke(
          "auth-resolve-identifier", { body: { identifier } },
        );
        if (resolveError || !resolved?.email) throw new Error("Invalid credentials");
        email = String(resolved.email).trim().toLowerCase();
      }

      const loginTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Login timed out. Please try again.")), 12000)
      );
      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password: loginPassword }),
        loginTimeout,
      ]);
      if (error) throw error;
      
      if (data.user) {
        const canProceed = await checkMfaAndProceed(data.user.id);
        if (canProceed) {
          showSuccessToast("Welcome back! 👋");
          redirectToDashboard(data.user.id);
        }
      }
    } catch (error: any) {
      showErrorToast(error, { context: "login" });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = magicEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setMagicLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setMagicLinkSent(true);
      showSuccessToast(
        "Sign-in link sent!",
        "Check your email for a sign-in link or enter the 6-digit code below."
      );
    } catch (err: any) {
      showErrorToast(err, { context: "login" });
    } finally {
      setMagicLoading(false);
    }
  };

  const handleVerifyMagicOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = magicEmail.trim().toLowerCase();
    const token = magicOtpCode.trim();
    if (!token || token.length < 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    setMagicLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;

      if (data.user) {
        const canProceed = await checkMfaAndProceed(data.user.id);
        if (canProceed) {
          showSuccessToast("Signed in successfully! 👋");
          redirectToDashboard(data.user.id);
        }
      }
    } catch (err: any) {
      showErrorToast(err, { context: "login" });
    } finally {
      setMagicLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = mfaCode.trim();
    if (!code || code.length < 6) {
      toast.error("Please enter the 6-digit code from your authenticator app");
      return;
    }

    setMfaLoading(true);
    try {
      let verifyError = null;
      if (typeof (supabase.auth.mfa as any).challengeAndVerify === "function") {
        const res = await (supabase.auth.mfa as any).challengeAndVerify({
          factorId: mfaFactorId,
          code,
        });
        verifyError = res.error;
      } else {
        const challengeRes = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
        if (challengeRes.error) throw challengeRes.error;
        const res = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: challengeRes.data.id,
          code,
        });
        verifyError = res.error;
      }

      if (verifyError) {
        throw new Error(
          verifyError.message.toLowerCase().includes("invalid")
            ? "Invalid authentication code. Please try again."
            : verifyError.message
        );
      }

      showSuccessToast("Identity verified! 👋");
      setMfaRequired(false);
      if (pendingUserId) {
        redirectToDashboard(pendingUserId);
      }
    } catch (err: any) {
      showErrorToast(err, { context: "login" });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCancelMfa = async () => {
    setMfaRequired(false);
    setPendingUserId(null);
    setMfaCode("");
    await supabase.auth.signOut().catch(() => {});
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Synchronous in-flight guard — prevents double-submit before React re-renders
    if (signupInFlight.current) return;
    signupInFlight.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("cc_signup_in_progress", "true");
    }
    setSignupLoading(true);

    try {
      const email = signupEmail.trim().toLowerCase();
      const password = signupPassword;
      if (!email) throw new Error("Email is required");
      if (!password || password.length < 6) throw new Error("Password must be at least 6 characters");
      if (password !== signupConfirm) throw new Error("Passwords do not match");

      // Check if an active session already exists for this email
      // (e.g. controlled retry if profile/role creation failed on previous attempt)
      const { data: currentSessionData } = await supabase.auth.getSession();
      const existingUser = currentSessionData?.session?.user;
      let authUser = existingUser?.email?.toLowerCase() === email ? existingUser : null;
      let authSession = existingUser?.email?.toLowerCase() === email ? currentSessionData?.session : null;

      // ── Single signup request. No automatic signInWithPassword after this. ──
      // When email confirmation is enabled, Supabase returns session=null.
      // We do NOT call signInWithPassword here — that would consume an extra
      // rate-limit slot and always fail (email not yet confirmed).
      if (!authUser) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl("/auth/verify"),
          },
        });

        if (authError) {
          const lower = (authError.message || "").toLowerCase();
          const status = (authError as any).status ?? 0;

          // Explicit 429 / rate-limit handling
          if (
            status === 429 ||
            lower.includes("too many requests") ||
            lower.includes("rate limit") ||
            lower.includes("over_email_send_rate_limit")
          ) {
            throw new Error(
              "Too many signup attempts. Please wait a few minutes and try again."
            );
          }

          // Already-registered detection
          if (
            lower.includes("already registered") ||
            lower.includes("already been registered") ||
            lower.includes("user already registered")
          ) {
            throw new Error("This email is already registered. Please sign in instead.");
          }

          throw authError;
        }

        if (!authData.user) throw new Error("Failed to create account. Please try again.");

        authUser = authData.user;
        authSession = authData.session;
      }

      // Email confirmation is required — session will be null. This is expected.
      // Do NOT attempt signInWithPassword here.
      if (!authSession) {
        // Account created; email confirmation pending.
        // Seed the profile row now so onboarding can proceed after verification.
        await supabase.from("profiles").upsert(
          [{ user_id: authUser.id, email, name: email.split("@")[0], profile_completed: false, approval_status: "pending" }],
          { onConflict: "user_id" }
        );
        await supabase.from("user_roles").upsert(
          [{ user_id: authUser.id, role: "student" }],
          { onConflict: "user_id" }
        );
        showSuccessToast(
          "Check Your Email",
          "We've sent a verification link to your inbox. Click it to activate your account."
        );
        return;
      }

      // Session returned immediately (email confirmation disabled for launch)
      // 1. Initialize user profile record
      const { error: profileError } = await supabase.from("profiles").upsert(
        [{
          user_id: authUser.id,
          email,
          name: email.split("@")[0],
          profile_completed: false,
          approval_status: "pending",
        }],
        { onConflict: "user_id" }
      );

      if (profileError) {
        console.error("Profile initialization error:", profileError);
        throw new Error("Account created, but profile setup failed. Click Create Account again to retry.");
      }

      // 2. Initialize student role record
      const { error: roleError } = await supabase.from("user_roles").upsert(
        [{ user_id: authUser.id, role: "student" }],
        { onConflict: "user_id" }
      );

      if (roleError) {
        console.warn("user_roles initialization notice:", roleError.message);
      }

      // 3. Verify profile record actually exists before navigating
      const { data: verifiedProfile, error: verifyError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (verifyError || !verifiedProfile) {
        throw new Error("Unable to verify profile record. Click Create Account again to retry.");
      }

      // 4. Asynchronously dispatch custom Welcome / Profile Created email (non-blocking)
      // Must NEVER block navigation, throw errors, or delay onboarding.
      try {
        void supabase.functions
          .invoke("send-welcome-email", {
            body: {
              user_id: authUser.id,
              email: authUser.email ?? email,
              name: email.split("@")[0],
            },
          })
          .then(({ data, error }) => {
            if (error) {
              console.warn("[WelcomeEmail] Non-blocking delivery notice:", error.message);
            } else if (data?.status === "sent") {
              console.log("[WelcomeEmail] Sent successfully to:", authUser.email ?? email);
            } else {
              console.log("[WelcomeEmail] Status:", data?.status);
            }
          })
          .catch((err) => {
            console.warn("[WelcomeEmail] Non-blocking dispatch caught error:", err?.message);
          });
      } catch (invokeErr: any) {
        console.warn("[WelcomeEmail] Failed to initiate email dispatch:", invokeErr?.message);
      }

      // 5. Direct navigation to existing Onboarding Wizard without intermediate screens
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("cc_signup_in_progress");
      }
      showSuccessToast("Account created — let's set up your profile");
      navigate("/onboarding-wizard", { replace: true });
    } catch (error: any) {
      showErrorToast(error, { context: "signup" });
    } finally {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("cc_signup_in_progress");
      }
      setSignupLoading(false);
      signupInFlight.current = false;
    }
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <p className="text-[13px] font-medium text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* ── Left Hero Panel (Desktop Showcase) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] bg-surface-1 border-r border-border-subtle flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle mesh background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_20%_20%,hsl(var(--primary)/0.15),transparent_60%)]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-accent/10 blur-[100px] pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 shadow-sm p-1.5 shrink-0">
            <img
              src={logoSrc}
              alt={brandName}
              className="h-8 w-8 object-contain"
            />
          </div>
          <div>
            <p className="text-base font-black tracking-tight text-foreground leading-tight">{brandName}</p>
            <p className="text-[11px] font-medium text-muted-foreground">{tagline}</p>
          </div>
        </div>

        {/* Main Value Proposition Content */}
        <div className="relative z-10 space-y-8 my-auto py-10">
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Academic Operating System</span>
            <h2 className="font-heading text-3xl sm:text-4xl font-black text-foreground tracking-tight leading-[1.08]">
              One login for your entire college experience.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              From GPS-verified QR attendance to automated timetable sync and departmental leaderboards.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 gap-3">
            {HIGHLIGHTS.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-start gap-3.5 rounded-2xl border border-border-subtle bg-surface-2/60 p-3.5 transition-all hover:border-primary/30 hover:bg-surface-2"
              >
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-muted-foreground/60 border-t border-border-subtle/60 pt-4">
          <span>Enterprise Campus Security</span>
          <span>© {new Date().getFullYear()} Campus Connect · Version {APP_VERSION}</span>
        </div>
      </div>

      {/* ── Right Auth Form Panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        {/* Ambient Top Glow for Mobile */}
        <div className="lg:hidden absolute top-0 inset-x-0 h-40 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,hsl(var(--primary)/0.15),transparent_70%)] pointer-events-none" />

        {/* Focused Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-[420px] space-y-6"
        >
          {/* Campus Connect Brand Header — Official Logo & Name */}
          <div className="flex items-center gap-3 select-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 shadow-sm p-1.5 shrink-0">
              <img
                src={logoSrc}
                alt={brandName}
                className="h-9 w-9 object-contain"
              />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight text-foreground leading-tight">{brandName}</p>
              <p className="text-[11px] font-medium text-muted-foreground">{tagline}</p>
            </div>
          </div>

          {/* Welcome Heading */}
          <div className="space-y-1 text-left">
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Welcome to Campus Connect
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Sign in to continue to your campus experience.
            </p>
          </div>

          {/* Form Tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11 p-1 rounded-xl bg-surface-2 border border-border-subtle">
              <TabsTrigger
                value="login"
                className="h-full rounded-lg text-[13px] font-bold text-muted-foreground data-[state=active]:bg-surface-1 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="h-full rounded-lg text-[13px] font-bold text-muted-foreground data-[state=active]:bg-surface-1 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                New Account
              </TabsTrigger>
            </TabsList>

            {/* ── Login Tab ── */}
            <TabsContent value="login" className="mt-5 space-y-4">
              {mfaRequired ? (
                /* ── Two-Factor Authentication Challenge Form ── */
                <form onSubmit={handleVerifyMfa} className="space-y-4">
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-center space-y-2">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <p className="text-[14px] font-bold text-foreground">Two-Factor Authentication Required</p>
                    <p className="text-[12px] text-muted-foreground">
                      Enter the 6-digit security code generated by your authenticator app.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mfa-code" className="text-[13px] font-semibold text-foreground">
                      Authenticator Security Code
                    </Label>
                    <Input
                      id="mfa-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                      className="bg-surface-2/80 border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/30 text-center font-mono tracking-widest text-lg h-11 rounded-xl"
                      autoFocus
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl gap-2 shadow-md shadow-primary/25 text-[14px] font-bold"
                    disabled={mfaLoading || mfaCode.length < 6}
                  >
                    {mfaLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Verify Code <ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancelMfa}
                    className="w-full h-10 text-[13px] text-muted-foreground hover:text-foreground"
                  >
                    Cancel & Return to Sign In
                  </Button>
                </form>
              ) : loginMode === "magic_link" ? (
                /* ── Magic Link / OTP Sign-in Form ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Mail className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[13px] font-bold text-foreground">Passwordless Sign In</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setLoginMode("password"); setMagicLinkSent(false); }}
                      className="text-[12px] font-semibold text-primary hover:underline transition-colors"
                    >
                      Use Password
                    </button>
                  </div>

                  {!magicLinkSent ? (
                    <form onSubmit={handleSendMagicLink} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="magic-email" className="text-[13px] font-semibold text-foreground">
                          Email Address
                        </Label>
                        <Input
                          id="magic-email"
                          type="email"
                          placeholder="student@college.edu"
                          value={magicEmail}
                          onChange={(e) => setMagicEmail(e.target.value)}
                          className="bg-surface-2/80 border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/30 text-[14px] h-11 rounded-xl"
                          required
                          autoFocus
                        />
                      </div>

                      <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                        We'll send a secure one-click link and a 6-digit login code to your registered email address.
                      </p>

                      <Button
                        type="submit"
                        className="w-full h-11 rounded-xl gap-2 shadow-md shadow-primary/25 text-[14px] font-bold"
                        disabled={magicLoading}
                      >
                        {magicLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>Send Magic Link / OTP <ArrowRight className="h-4 w-4" /></>
                        )}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyMagicOtp} className="space-y-4">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center space-y-1">
                        <p className="text-[12.5px] font-semibold text-foreground">Check your inbox</p>
                        <p className="text-[11px] text-muted-foreground">
                          Sent to <strong>{magicEmail}</strong>. Click the email link or enter the 6-digit OTP code below:
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="magic-otp" className="text-[13px] font-semibold text-foreground">
                          6-Digit OTP Code
                        </Label>
                        <Input
                          id="magic-otp"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="123456"
                          value={magicOtpCode}
                          onChange={(e) => setMagicOtpCode(e.target.value.replace(/\D/g, ""))}
                          className="bg-surface-2/80 border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/30 text-center font-mono tracking-widest text-lg h-11 rounded-xl"
                          autoFocus
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-11 rounded-xl gap-2 shadow-md shadow-primary/25 text-[14px] font-bold"
                        disabled={magicLoading || magicOtpCode.length < 6}
                      >
                        {magicLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>Verify & Sign In <ArrowRight className="h-4 w-4" /></>
                        )}
                      </Button>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <button
                          type="button"
                          onClick={handleSendMagicLink}
                          disabled={magicLoading}
                          className="text-primary hover:underline"
                        >
                          Resend code
                        </button>
                        <button
                          type="button"
                          onClick={() => setMagicLinkSent(false)}
                          className="hover:underline"
                        >
                          Change email
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* ── Standard Email + Password Sign-in Form ── */
                <>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-identifier" className="text-[13px] font-semibold text-foreground">
                        Email or Student ID
                      </Label>
                      <Input
                        id="login-identifier"
                        placeholder="student@college.edu or CS-2024-001"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="bg-surface-2/80 border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/30 text-[14px] h-11 rounded-xl"
                        required
                      />
                    </div>

                    <PasswordInput
                      id="login-password"
                      label="Password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={setLoginPassword}
                      rightAction={
                        <button
                          type="button"
                          onClick={() => navigate("/forgot-password")}
                          className="text-[12px] font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
                        >
                          Forgot password?
                        </button>
                      }
                    />

                    <Button
                      type="submit"
                      id="login-submit-btn"
                      className="w-full h-11 rounded-xl gap-2 shadow-md shadow-primary/25 text-[14px] font-bold mt-2"
                      disabled={loginLoading}
                    >
                      {loginLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>Sign In <ArrowRight className="h-4 w-4" /></>
                      )}
                    </Button>
                  </form>

                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border-subtle" />
                    </div>
                    <div className="relative flex justify-center text-[11px] uppercase">
                      <span className="bg-surface-1 px-2.5 text-muted-foreground font-semibold">Or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setLoginMode("magic_link");
                      setMagicLinkSent(false);
                      if (loginIdentifier.includes("@")) setMagicEmail(loginIdentifier);
                    }}
                    className="w-full h-11 rounded-xl gap-2 font-semibold text-[13px] border-border-subtle bg-surface-2/60 hover:bg-surface-2 text-foreground"
                  >
                    <Mail className="h-4 w-4 text-primary" /> Sign in with Magic Link
                  </Button>
                </>
              )}
            </TabsContent>

            {/* ── Signup Tab ── */}
            <TabsContent value="signup" className="mt-5 space-y-4">
              <form onSubmit={handleSignup} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-[13px] font-semibold text-foreground">
                    Email Address <span className="text-danger">*</span>
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="student@college.edu"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="bg-surface-2/80 border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/30 text-[14px] h-11 rounded-xl"
                    required
                  />
                </div>

                <PasswordInput
                  id="signup-password"
                  label="Create Password *"
                  placeholder="At least 6 characters"
                  value={signupPassword}
                  onChange={setSignupPassword}
                />

                <PasswordInput
                  id="signup-confirm"
                  label="Confirm Password *"
                  placeholder="Re-enter password"
                  value={signupConfirm}
                  onChange={setSignupConfirm}
                />

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Academic details (course, semester, roll number) will be configured in the next onboarding step.
                </p>

                <Button
                  type="submit"
                  id="signup-submit-btn"
                  className="w-full h-11 rounded-xl gap-2 shadow-md shadow-primary/25 text-[14px] font-bold mt-1"
                  disabled={signupLoading}
                  aria-busy={signupLoading}
                >
                  {signupLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating Account…</>
                  ) : (
                    <>Create Account <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-[12px] text-muted-foreground pt-2">
            By signing in you agree to institutional academic guidelines.
          </p>
          <p className="text-center text-[10.5px] text-muted-foreground/50 font-mono pt-1">
            Version {APP_VERSION}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
