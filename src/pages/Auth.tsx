import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showErrorToast, showSuccessToast } from "@/lib/error-handling";
import { cn } from "@/lib/utils";
import {
  Loader2, Eye, EyeOff,
  ArrowRight, CheckCircle2, BookOpen, Trophy, Zap, GraduationCap, ShieldCheck, QrCode
} from "@/components/icons";
import { User } from "@supabase/supabase-js";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { BRANDING } from "@/config/branding";
import { APP_VERSION } from "@/config/version";
import { motion } from "framer-motion";
import { useFestivalTheme } from "@/contexts/FestivalThemeContext";
import { FestiveBadge, PeacockFeatherIcon } from "@/components/festive/FestiveDecorations";

/* ── Feature chips for left hero panel ── */
const HIGHLIGHTS = [
  { icon: QrCode, label: "Tamper-Proof QR Attendance", desc: "Instant GPS-fenced check-ins" },
  { icon: BookOpen, label: "Live Timetable & Tasks", desc: "Always in sync with professors" },
  { icon: Trophy, label: "Gamified Academic Tiers", desc: "Earn points, streaks & prestige" },
  { icon: ShieldCheck, label: "Official Verified ID", desc: "Secure digital student credentials" },
];

/* ── Input wrapper with show/hide ── */
function PasswordInput({
  id, placeholder, value, onChange, label,
}: {
  id: string; placeholder: string;
  value: string; onChange: (v: string) => void; label: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-semibold text-foreground">{label}</Label>
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
  const { branding } = usePlatformBranding();
  const { isFestive, isDahiHandi } = useFestivalTheme();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Login form
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); redirectToDashboard(session.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setUser(session.user); redirectToDashboard(session.user.id); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const redirectToDashboard = async (userId: string) => {
    try {
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
      const r = role?.role;
      if (r === "super_admin") return navigate("/platform/admin-control/dashboard", { replace: true });
      if (r === "admin")       return navigate("/platform/admin/dashboard", { replace: true });
      if (r === "faculty")     return navigate("/faculty/dashboard", { replace: true });

      // Student: route based on onboarding/approval state
      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_completed, approval_status, college_assigned")
        .eq("user_id", userId)
        .maybeSingle();
      if (!profile || !profile.profile_completed) {
        navigate("/onboarding-wizard", { replace: true });
      } else if (profile.approval_status !== "approved" || !profile.college_assigned) {
        navigate("/pending-approval", { replace: true });
      } else {
        navigate("/app/dashboard", { replace: true });
      }
    } catch {
      navigate("/onboarding-wizard", { replace: true });
    }
    // Fire-and-forget: log login activity + retention
    setTimeout(() => {
      void supabase.from("login_activity").insert({
        user_id: userId,
        user_agent: navigator.userAgent.slice(0, 255),
      });
      supabase.functions.invoke("retention-on-login", { body: {} }).catch(() => {});
    }, 1500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
      showSuccessToast("Welcome back! 👋");
      if (data.user) redirectToDashboard(data.user.id);
    } catch (error: any) {
      showErrorToast(error, { context: "login" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const email = signupEmail.trim().toLowerCase();
      const password = signupPassword;
      if (!email) throw new Error("Email is required");
      if (!password || password.length < 6) throw new Error("Password must be at least 6 characters");
      if (password !== signupConfirm) throw new Error("Passwords do not match");

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding-wizard`,
        },
      });
      if (authError) {
        const lower = (authError.message || "").toLowerCase();
        if (lower.includes("already registered") || lower.includes("already been registered")) {
          throw new Error("This email is already registered. Please sign in instead.");
        }
        throw authError;
      }
      if (!authData.user) throw new Error("Failed to create account");

      let session = authData.session;
      if (!session) {
        const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          showSuccessToast("Account created", "Check your inbox to verify your email, then sign in.");
          return;
        }
        session = signIn.session;
      }

      await supabase.from("profiles").upsert(
        [{ user_id: authData.user.id, email, name: email.split("@")[0], profile_completed: false, approval_status: "pending" }],
        { onConflict: "user_id" }
      );
      await supabase.from("user_roles").upsert(
        [{ user_id: authData.user.id, role: "student" }],
        { onConflict: "user_id,role" }
      );

      showSuccessToast("Account created — let's set up your profile");
      navigate("/onboarding-wizard", { replace: true });
    } catch (error: any) {
      showErrorToast(error, { context: "signup" });
    } finally {
      setLoading(false);
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
      <div className={cn(
        "hidden lg:flex lg:w-[45%] xl:w-[48%] bg-surface-1 border-r border-border-subtle flex-col justify-between p-12 relative overflow-hidden",
        isFestive && "border-r-amber-400/20"
      )}>
        {/* Subtle mesh background */}
        <div className={cn(
          "absolute inset-0",
          isFestive
            ? (isDahiHandi
                ? "bg-[radial-gradient(ellipse_80%_80%_at_20%_20%,hsl(42_95%_50%/0.16),transparent_60%)]"
                : "bg-[radial-gradient(ellipse_80%_80%_at_20%_20%,hsl(194_85%_45%/0.16),transparent_60%)]")
            : "bg-[radial-gradient(ellipse_80%_80%_at_20%_20%,hsl(var(--primary)/0.15),transparent_60%)]"
        )} />
        <div className={cn(
          "absolute bottom-0 right-0 h-80 w-80 rounded-full blur-[100px] pointer-events-none",
          isFestive ? "bg-amber-400/15" : "bg-accent/10"
        )} />

        {/* Brand Header */}
        <Link to="/" className="relative z-10 flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 shadow-sm transition-transform group-hover:scale-105">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.brand_name} className="h-6 w-6 object-contain" />
            ) : (
              <GraduationCap className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-black tracking-tight text-foreground leading-tight">{branding.brand_name}</p>
              {isFestive && <FestiveBadge />}
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">{branding.tagline}</p>
          </div>
        </Link>

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

        {/* Mobile Header */}
        <Link to="/" className="lg:hidden flex items-center justify-between w-full max-w-[400px] mb-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-black tracking-tight text-foreground">{branding.brand_name}</span>
          </div>
          {isFestive && <FestiveBadge />}
        </Link>

        {/* Focused Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-[400px] space-y-6"
        >
          {/* Header Title */}
          <div className="space-y-1 text-center sm:text-left">
            <h1 className="font-heading text-2xl font-black text-foreground tracking-tight">Access Your Portal</h1>
            <p className="text-[13px] text-muted-foreground">Sign in with your email or Student ID to continue.</p>
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
                />

                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl gap-2 shadow-md shadow-primary/25 text-[14px] font-bold mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>Sign In <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </form>
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
                  className="w-full h-11 rounded-xl gap-2 shadow-md shadow-primary/25 text-[14px] font-bold mt-1"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
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
