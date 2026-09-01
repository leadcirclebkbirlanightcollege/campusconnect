import { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Home,
  LogIn,
  HelpCircle,
  Mail,
  ShieldCheck,
  LayoutDashboard,
  ArrowRight,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { BRANDING } from "@/config/branding";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import PublicFooter from "@/components/layout/PublicFooter";

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [dashboardPath, setDashboardPath] = useState<string>("/app/dashboard");

  // Determine user's role-specific dashboard if logged in
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    async function resolveRole() {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (!isMounted) return;
        const role = data?.role;
        if (role === "super_admin") {
          setDashboardPath("/platform/admin-control/dashboard");
        } else if (role === "admin") {
          setDashboardPath("/platform/admin/dashboard");
        } else if (role === "faculty") {
          setDashboardPath("/faculty/dashboard");
        } else {
          setDashboardPath("/app/dashboard");
        }
      } catch {
        if (isMounted) setDashboardPath("/app/dashboard");
      }
    }

    resolveRole();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Debug log in dev
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn(`[CampusConnect 404] No route matched: ${location.pathname}`);
    }
  }, [location.pathname]);

  // Clean path display with safe length truncation
  const displayPath =
    location.pathname.length > 40
      ? `${location.pathname.slice(0, 37)}…`
      : location.pathname;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground relative selection:bg-primary/20 selection:text-primary">
      {/* Refined ambient radial lighting and blueprint micro-grid */}
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(ellipse_75%_55%_at_50%_20%,hsl(var(--primary)/0.09),transparent_70%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.025] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:32px_32px]" />

      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40 safe-area-top">
        <div className="max-w-6xl mx-auto flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
            aria-label="Campus Connect Home"
          >
            <img
              src={BRANDING.logo}
              alt={BRANDING.name}
              className="h-7 w-7 sm:h-8 sm:w-8 object-contain rounded-lg border border-border/50 bg-card p-0.5 shadow-2xs transition-transform group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-foreground">
                {BRANDING.name}
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold tracking-wide">
                Campus OS
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <Link to={dashboardPath}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 border-border/70 hover:bg-muted cursor-pointer"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                  <span>Dashboard</span>
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 border-border/70 hover:bg-muted cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5 text-primary" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Centered Hero Composition */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-lg text-center space-y-6"
        >
          {/* 404 Typographic Anchor + Connected Campus Route Graphic */}
          <div className="relative select-none flex flex-col items-center">
            {/* Ambient subtle glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 bg-primary/12 blur-3xl rounded-full pointer-events-none" />

            <div className="relative inline-block">
              <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-foreground via-foreground/90 to-foreground/25 font-heading leading-none">
                404
              </h1>

              {/* Minimalist Connected Route Motif */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible opacity-70"
                viewBox="0 0 240 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M 20 50 L 70 50 L 110 75 L 160 25 L 200 25"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  className="opacity-40"
                />
                <circle cx="70" cy="50" r="3" fill="hsl(var(--primary))" />
                <circle cx="110" cy="75" r="2.5" fill="hsl(var(--primary))" className="opacity-75" />
                <circle cx="160" cy="25" r="2.5" fill="hsl(var(--primary))" className="opacity-75" />
                <circle cx="200" cy="25" r="4" fill="hsl(var(--destructive))" />
                {!shouldReduceMotion && (
                  <circle cx="200" cy="25" r="7" stroke="hsl(var(--destructive))" strokeWidth="1" className="animate-ping opacity-40" />
                )}
              </svg>
            </div>

            {/* Subtle Status Pill */}
            <div className="-mt-1 sm:-mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border/70 bg-card/70 text-[11px] font-medium text-muted-foreground shadow-2xs backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
              <span>Route Unresolved</span>
            </div>
          </div>

          {/* Heading & Supporting Copy */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Page not found
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm sm:max-w-md mx-auto leading-relaxed">
              Looks like you've taken a wrong turn across campus. The page you're looking for doesn't exist, has moved, or is no longer available.
            </p>

            {/* Smart Requested Path Metadata */}
            {location.pathname !== "/" && (
              <div className="pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2/80 border border-border/70 text-[11px] text-muted-foreground/90 shadow-2xs">
                  <span className="text-muted-foreground/60">You were looking for:</span>
                  <code className="font-mono font-medium text-foreground/90 truncate max-w-[240px] sm:max-w-xs">
                    {displayPath}
                  </code>
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Buttons (Clear Visual Hierarchy) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            {user ? (
              <>
                <Link to={dashboardPath} className="w-full sm:w-auto">
                  <Button
                    size="default"
                    className="h-10 w-full sm:w-auto rounded-xl px-5 text-xs font-bold gap-2 shadow-xs shadow-primary/25 cursor-pointer"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Back to Dashboard
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => navigate(-1)}
                  className="h-10 w-full sm:w-auto rounded-xl px-4 text-xs font-semibold border-border/80 bg-card hover:bg-muted gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Go Back
                </Button>
                <Link to="/" className="w-full sm:w-auto">
                  <Button
                    variant="ghost"
                    size="default"
                    className="h-10 w-full sm:w-auto rounded-xl px-3.5 text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Home className="h-3.5 w-3.5" />
                    Homepage
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/" className="w-full sm:w-auto">
                  <Button
                    size="default"
                    className="h-10 w-full sm:w-auto rounded-xl px-5 text-xs font-bold gap-2 shadow-xs shadow-primary/25 cursor-pointer"
                  >
                    <Home className="h-3.5 w-3.5" />
                    Go to Homepage
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => navigate(-1)}
                  className="h-10 w-full sm:w-auto rounded-xl px-4 text-xs font-semibold border-border/80 bg-card hover:bg-muted gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Go Back
                </Button>
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="default"
                    className="h-10 w-full sm:w-auto rounded-xl px-4 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Quick Help Minimalist Row (Compact, not a bulky card) */}
          <div className="pt-4 border-t border-border/40 max-w-md mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="font-medium text-muted-foreground/70">Need help?</span>
              <Link
                to="/help"
                className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors focus-visible:outline-hidden focus-visible:underline"
              >
                <HelpCircle className="h-3 w-3 text-primary" />
                Help & Support
              </Link>
              <span className="text-border">·</span>
              <Link
                to="/contact"
                className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors focus-visible:outline-hidden focus-visible:underline"
              >
                <Mail className="h-3 w-3 text-primary" />
                Contact Team
              </Link>
              <span className="text-border">·</span>
              <Link
                to="/demo"
                className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors focus-visible:outline-hidden focus-visible:underline"
              >
                <ShieldCheck className="h-3 w-3 text-primary" />
                Platform Demo
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      <PublicFooter />
    </div>
  );
}
