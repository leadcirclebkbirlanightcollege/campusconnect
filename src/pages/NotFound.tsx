import { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  MapPin,
  Radar,
  ArrowLeft,
  Home,
  LogIn,
  HelpCircle,
  Mail,
  ShieldCheck,
  LayoutDashboard,
  ExternalLink,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { BRANDING } from "@/config/branding";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [dashboardPath, setDashboardPath] = useState<string>("/app/dashboard");

  // Determine the user's primary dashboard if logged in
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
        // Fallback safely to standard student/app dashboard
        if (isMounted) setDashboardPath("/app/dashboard");
      }
    }

    resolveRole();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Log in development for route debugging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn(`[CampusConnect 404] No route matched: ${location.pathname}`);
    }
  }, [location.pathname]);

  // Truncate path cleanly if exceedingly long
  const displayPath =
    location.pathname.length > 45
      ? `${location.pathname.slice(0, 42)}…`
      : location.pathname;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground relative overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* Background ambient lighting and blueprint grid */}
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(ellipse_60%_50%_at_50%_15%,hsl(var(--primary)/0.12),transparent_75%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.035] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:40px_40px]" />

      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-40 safe-area-top">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
            <img
              src={BRANDING.logo}
              alt={BRANDING.name}
              className="h-8 w-8 object-contain rounded-lg border border-border/50 bg-card p-0.5 shadow-2xs transition-transform group-hover:scale-105"
              onError={(e) => {
                // Graceful fallback to hide broken image icon
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-foreground leading-none">
                {BRANDING.name}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-tight mt-0.5">
                Campus OS
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            {user ? (
              <Link to={dashboardPath}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8.5 px-3.5 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs border-border hover:bg-muted cursor-pointer"
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
                  className="h-8.5 px-3.5 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs border-border hover:bg-muted cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5 text-primary" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Central Hero Experience */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-xl text-center space-y-7"
        >
          {/* Visual Campus Node & Route Element */}
          <div className="relative inline-flex items-center justify-center">
            {/* Glow ring */}
            <div className="absolute -inset-4 rounded-full bg-primary/10 blur-xl pointer-events-none" />

            {/* Geometric Navigation Node */}
            <motion.div
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      y: [0, -5, 0],
                    }
              }
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl border border-primary/25 bg-card/80 shadow-lg shadow-primary/5 backdrop-blur-md"
            >
              {/* Subtle orbital ring */}
              <div className="absolute inset-2 rounded-2xl border border-dashed border-primary/20 pointer-events-none" />
              <MapPin className="h-12 w-12 sm:h-14 sm:w-14 text-primary stroke-[1.5]" />
            </motion.div>
          </div>

          {/* Typography & Hierarchy */}
          <div className="space-y-3">
            {/* Distinctive 404 Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary shadow-2xs">
              <Radar className="h-3 w-3" />
              <span>404 · Route Not Found</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Page Not Found
            </h1>

            <p className="text-sm sm:text-[15px] text-muted-foreground max-w-md mx-auto leading-relaxed">
              Looks like you've taken a wrong turn across campus. The page you're looking for doesn't exist, has moved, or is no longer available.
            </p>

            {/* Requested Path pill */}
            {location.pathname !== "/" && (
              <div className="pt-1.5">
                <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground/85 bg-card/80 border border-border/70 px-3 py-1 rounded-lg break-all max-w-full shadow-2xs">
                  <span className="text-muted-foreground/50 font-sans">Destination:</span>
                  <span className="font-semibold text-foreground/90">{displayPath}</span>
                </div>
              </div>
            )}
          </div>

          {/* Smart Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            {user ? (
              <>
                <Link to={dashboardPath} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="h-10.5 w-full sm:w-auto rounded-xl px-6 text-xs font-bold gap-2 shadow-xs shadow-primary/20 cursor-pointer"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate(-1)}
                  className="h-10.5 w-full sm:w-auto rounded-xl px-5 text-xs font-semibold border-border bg-card hover:bg-muted gap-2 cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </Button>
                <Link to="/" className="w-full sm:w-auto">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="h-10.5 w-full sm:w-auto rounded-xl px-4 text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Home className="h-4 w-4" />
                    Homepage
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="h-10.5 w-full sm:w-auto rounded-xl px-6 text-xs font-bold gap-2 shadow-xs shadow-primary/20 cursor-pointer"
                  >
                    <Home className="h-4 w-4" />
                    Go to Homepage
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate(-1)}
                  className="h-10.5 w-full sm:w-auto rounded-xl px-5 text-xs font-semibold border-border bg-card hover:bg-muted gap-2 cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </Button>
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="h-10.5 w-full sm:w-auto rounded-xl px-5 text-xs font-semibold gap-2 cursor-pointer shadow-2xs"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Quick Helpful Directory Links */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-5 text-left space-y-3 mt-8 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Need help finding something?
              </p>
              <span className="text-[10px] text-muted-foreground/60 font-medium">
                Verified links
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Link
                to="/help"
                className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-accent/60 hover:border-primary/30 transition-all text-xs font-semibold text-foreground group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:scale-105 transition-transform">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <span className="truncate">Help & Support</span>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
              </Link>

              <Link
                to="/contact"
                className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-accent/60 hover:border-primary/30 transition-all text-xs font-semibold text-foreground group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:scale-105 transition-transform">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="truncate">Contact Team</span>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
              </Link>

              <Link
                to="/demo"
                className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-accent/60 hover:border-primary/30 transition-all text-xs font-semibold text-foreground group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <span className="truncate">Platform Demo</span>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-5 px-4 text-center text-xs text-muted-foreground safe-area-bottom">
        <p>© {new Date().getFullYear()} {BRANDING.name} — Campus Operating System. All rights reserved.</p>
      </footer>
    </div>
  );
}
