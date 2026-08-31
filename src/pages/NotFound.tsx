import { useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap,
  ArrowLeft,
  Home,
  LogIn,
  HelpCircle,
  ShieldCheck,
  FileText,
  Search,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { BRANDING } from "@/config/branding";

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Debug log only in development — stripped from production builds
    if (import.meta.env.DEV) {
      console.warn(`[Campus Connect 404] No route matched path: ${location.pathname}`);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground selection:bg-primary/20 selection:text-primary relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(ellipse_70%_50%_at_50%_10%,hsl(var(--primary)/0.2),transparent_70%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.03] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:48px_48px]" />

      {/* Header */}
      <header className="border-b border-border-subtle/70 bg-background/80 backdrop-blur-xl sticky top-0 z-40 safe-area-top">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 transition-transform group-hover:scale-105">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-foreground">
              {BRANDING.name}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs font-semibold">
                <LogIn className="mr-1.5 h-3.5 w-3.5" />
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xl text-center space-y-8"
        >
          {/* 404 Hero Illustration / Badge */}
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute -inset-4 rounded-3xl bg-primary/15 blur-xl pointer-events-none" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-primary/30 bg-surface-1 shadow-xl">
              <FileText className="h-12 w-12 text-primary" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-danger">
              <span>Error 404 · Page Not Found</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight">
              Lost in Campus Space?
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              We couldn't find the page you're looking for. The link may be broken, expired, or the page may have been moved.
            </p>
            {location.pathname !== "/" && (
              <div className="pt-1">
                <span className="inline-block font-mono text-[11px] text-muted-foreground/80 bg-surface-2 border border-border-subtle px-3 py-1 rounded-lg break-all max-w-full">
                  {location.pathname}
                </span>
              </div>
            )}
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/" className="w-full sm:w-auto">
              <Button size="lg" className="h-11 w-full sm:w-auto rounded-xl px-6 text-sm font-bold shadow-md shadow-primary/25 gap-2">
                <Home className="h-4 w-4" />
                Back to Homepage
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate(-1)}
              className="h-11 w-full sm:w-auto rounded-xl px-5 text-sm font-semibold border-border-subtle bg-surface-1 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Link to="/auth" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="h-11 w-full sm:w-auto rounded-xl px-5 text-sm font-semibold gap-2"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
          </div>

          {/* Quick Helpful Directory Links */}
          <GlassCard padding="md" className="text-left space-y-3 mt-8">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Looking for something specific?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Link
                to="/help"
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border-subtle/70 bg-surface-2/60 hover:bg-surface-3 transition-colors text-xs font-semibold text-foreground"
              >
                <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                <span>Help & Support</span>
              </Link>
              <Link
                to="/contact"
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border-subtle/70 bg-surface-2/60 hover:bg-surface-3 transition-colors text-xs font-semibold text-foreground"
              >
                <Search className="h-4 w-4 text-primary shrink-0" />
                <span>Contact Team</span>
              </Link>
              <Link
                to="/demo"
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border-subtle/70 bg-surface-2/60 hover:bg-surface-3 transition-colors text-xs font-semibold text-foreground"
              >
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Platform Demo</span>
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle/60 py-6 px-4 text-center text-xs text-muted-foreground safe-area-bottom">
        <p>© {new Date().getFullYear()} {BRANDING.name}. All rights reserved.</p>
      </footer>
    </div>
  );
}
