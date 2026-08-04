import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, Eye, EyeOff,
  ArrowRight, CheckCircle2, BookOpen, Trophy, Zap,
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { BRANDING } from "@/config/branding";


/* ── Feature chip ─────────────────────────────────────────────── */
const FEATURES = [
  { icon: BookOpen, label: "Track Lectures" },
  { icon: CheckCircle2, label: "Mark Attendance" },
  { icon: Trophy, label: "Leaderboard" },
  { icon: Zap, label: "Earn Points" },
];

/* ── Input wrapper with show/hide ─────────────────────────────── */
function PasswordInput({
  id, placeholder, value, onChange, label,
}: {
  id: string; placeholder: string;
  value: string; onChange: (v: string) => void; label: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium text-foreground">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10 h-11 bg-surface-2 border-border-subtle focus:border-primary/60 text-[14px]"
          required
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* ── Auth page ─────────────────────────────────────────────────── */
const Auth = () => {
  const navigate = useNavigate();
  const { branding } = usePlatformBranding();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Login form
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form (simplified — rest collected in onboarding wizard)
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

      // Emails are stored lowercase in Supabase Auth — always normalise.
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
      toast.success("Welcome back! 👋");
      if (data.user) redirectToDashboard(data.user.id);
    } catch (error: any) {
      const msg: string = error?.message || "";
      const lower = msg.toLowerCase();
      if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
        toast.error("Network error. Please check your connection.");
      } else if (lower.includes("email not confirmed")) {
        toast.error("Email not verified", {
          description: "We've sent a fresh verification link to your inbox.",
        });
        void supabase.auth.resend({ type: "signup", email: loginIdentifier.trim().toLowerCase() });
      } else if (lower.includes("invalid login credentials")) {
        toast.error("Invalid credentials", { description: "Check your email/Student ID and password." });
      } else {
        toast.error(msg || "Login failed");
      }
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

      // If email confirmation is required, no session is returned — never pretend
      // the user is signed in. Otherwise ensure the session is active before writing
      // profile rows (RLS requires an authenticated user).
      let session = authData.session;
      if (!session) {
        const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          toast.success("Account created", {
            description: "Check your inbox to verify your email, then sign in.",
          });
          return;
        }
        session = signIn.session;
      }

      // Minimal profile row — the rest is collected in /onboarding-wizard
      await supabase.from("profiles").upsert(
        [{ user_id: authData.user.id, email, name: email.split("@")[0], profile_completed: false, approval_status: "pending" }],
        { onConflict: "user_id" }
      );
      await supabase.from("user_roles").upsert(
        [{ user_id: authData.user.id, role: "student" }],
        { onConflict: "user_id,role" }
      );


      toast.success("Account created — let's set up your profile");
      navigate("/onboarding-wizard", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
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
          <p className="text-[13px] text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left Panel (hero — desktop only) ───────────────────── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] bg-surface-1 border-r border-border-subtle flex-col justify-between p-10 relative overflow-hidden">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow orb */}
        <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-primary/8 blur-[80px] pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <img
            src={branding.logo_url ?? BRANDING.logo}
            alt={branding.brand_name}
            className="h-9 w-9 object-contain"
          />
          <div>
            <p className="text-[15px] font-bold text-foreground leading-tight">{branding.brand_name}</p>
            <p className="text-[11px] text-muted-foreground">{branding.tagline}</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-5">
          <div className="space-y-3">
            <p className="font-heading text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80">
              Neo-Industrial Campus OS
            </p>
            <h2 className="font-heading text-[34px] font-black text-foreground leading-[1.05] tracking-tight">
              Your academic<br />intelligence hub
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-[320px]">
              Track attendance, earn points, climb leaderboards, and monitor your academic performance — all in one place.
            </p>
          </div>

          {/* Feature chips */}
          <div className="grid grid-cols-2 gap-2.5">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-xl border border-border-subtle bg-surface-2/80 px-3.5 py-2.5 transition-colors hover:border-primary/40"
              >
                <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-heading text-[11px] font-bold uppercase tracking-[0.1em] text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer quote */}
        <p className="relative z-10 text-[11px] text-muted-foreground/50">
          Developed by Atharv Jadhav · Department of Computer Science
        </p>
      </div>

      {/* ── Right Panel (form) ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10">
        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <img src={branding.logo_url ?? BRANDING.logo} alt={branding.brand_name} className="h-8 w-8 object-contain" />
          <span className="text-[16px] font-bold text-foreground">{branding.brand_name}</span>
        </div>

        <div className="w-full max-w-[380px] space-y-6 animate-fade-in">
          {/* Heading */}
          <div className="space-y-1.5">
            <p className="font-heading text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Welcome back
            </p>
            <h1 className="font-heading text-[26px] font-black text-foreground tracking-tight">Sign in to continue</h1>
            <p className="text-[14px] text-muted-foreground">Enter your credentials to access your dashboard</p>
          </div>



          {/* Tabs */}
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 p-1 rounded-lg bg-surface-2 border border-border-subtle">
              <TabsTrigger
                value="signup"
                className="h-full rounded-md text-[13px] font-medium text-muted-foreground border-transparent
                           data-[state=active]:bg-surface-1 data-[state=active]:text-foreground
                           data-[state=active]:border-border-subtle data-[state=active]:shadow-sm
                           hover:text-foreground transition-colors"
              >
                Create Account
              </TabsTrigger>
              <TabsTrigger
                value="login"
                className="h-full rounded-md text-[13px] font-medium text-muted-foreground border-transparent
                           data-[state=active]:bg-surface-1 data-[state=active]:text-foreground
                           data-[state=active]:border-border-subtle data-[state=active]:shadow-sm
                           hover:text-foreground transition-colors"
              >
                Sign In
              </TabsTrigger>
            </TabsList>




            {/* ── Login ── */}
            <TabsContent value="login" className="mt-5">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-identifier" className="text-[13px] font-medium text-foreground">
                    Email or Student ID
                  </Label>
                  <Input
                    id="login-identifier"
                    placeholder="your@email.com or CS-2024-001"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="bg-surface-2 border-border-subtle focus:border-primary/60 text-[14px] h-11"
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
                  className="w-full h-11 gap-2 shadow-primary text-[14px] font-semibold"
                  disabled={loading}
                >
                  {loading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <>Sign In <ArrowRight className="h-4 w-4" /></>
                  }
                </Button>
              </form>
            </TabsContent>

            {/* ── Signup ── */}
            <TabsContent value="signup" className="mt-5">
              <form onSubmit={handleSignup} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-[13px] font-medium text-foreground">
                    Email <span className="text-danger">*</span>
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="bg-surface-2 border-border-subtle focus:border-primary/60 text-[14px] h-11"
                    required
                  />
                </div>

                <PasswordInput
                  id="signup-password"
                  label="Password *"
                  placeholder="Create a password"
                  value={signupPassword}
                  onChange={setSignupPassword}
                />

                <PasswordInput
                  id="signup-confirm"
                  label="Confirm Password *"
                  placeholder="Re-enter your password"
                  value={signupConfirm}
                  onChange={setSignupConfirm}
                />

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  You'll complete your profile (name, course, year, enrollment) in the next step.
                </p>

                <Button
                  type="submit"
                  className="w-full h-11 gap-2 shadow-primary text-[14px] font-semibold mt-1"
                  disabled={loading}
                >
                  {loading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <>Create Account <ArrowRight className="h-4 w-4" /></>
                  }
                </Button>
              </form>
            </TabsContent>
          </Tabs>


          {/* Footer note */}
          <p className="text-center text-[12px] text-muted-foreground/70">
            By continuing you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
