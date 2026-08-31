import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, CalendarCheck, GraduationCap, Rocket, Sparkles, Target, Trophy,
  UserRoundCheck, Star, Zap, BookOpen, Award, Bell, Users, Megaphone, IdCard,
  MessageSquare, Lightbulb, BarChart3, ShieldCheck, Layers, Briefcase,
  CalendarDays, Network, Check, QrCode, Clock, Lock, CheckCircle2, type LucideIcon,
} from "@/components/icons";

import { useAuth } from "@/providers/AuthProvider";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { useLandingContent } from "@/hooks/use-landing-content";
import { Button } from "@/components/ui/button";
import WhatsAppButton from "@/components/WhatsAppButton";
import InstitutionPartnersMarquee from "@/components/landing/InstitutionPartnersMarquee";
import studentHero from "@/assets/landing-student-hero.jpg";
import type { LandingIconName } from "@/config/landing-content";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<LandingIconName, LucideIcon> = {
  CalendarCheck, Trophy, UserRoundCheck, Sparkles, Target, Rocket,
  GraduationCap, Star, Zap, BookOpen, Award, Bell,
  Users, Megaphone, IdCard, MessageSquare, Lightbulb,
  BarChart3, ShieldCheck, Layers, Briefcase, CalendarDays, Network,
};
const Icon = ({ name, className }: { name: LandingIconName; className?: string }) => {
  const C = ICON_MAP[name] ?? Sparkles;
  return <C className={className} />;
};

export default function Index() {
  const navigate = useNavigate();
  const { branding } = usePlatformBranding();
  const { content } = useLandingContent();
  const { user, isLoading: authLoading } = useAuth();

  // If launched as installed PWA, jump straight into the app shell.
  useEffect(() => {
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        new URLSearchParams(window.location.search).get("source") === "pwa");
    if (isStandalone) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (authLoading || !user) return;
    import("@/providers/QueryProvider").then(({ queryClient }) => {
      const go = () => {
        const role = queryClient.getQueryData<{ role: string; college_id: string | null }>(["tenant", "role", user.id]);
        if (role?.role === "super_admin") navigate("/platform/admin-control/dashboard", { replace: true });
        else if (role?.role === "admin") navigate("/platform/admin/dashboard", { replace: true });
        else if (role?.role === "faculty") navigate("/faculty/dashboard", { replace: true });
        else if (role) navigate("/app/dashboard", { replace: true });
      };
      const cached = queryClient.getQueryData(["tenant", "role", user.id]);
      if (cached) go();
      else { const t = setTimeout(go, 1500); return () => clearTimeout(t); }
    });
  }, [user, authLoading, navigate]);

  const year = useMemo(() => new Date().getFullYear(), []);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 380);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Dynamic ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsl(var(--primary)/0.25),transparent_70%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.03] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:48px_48px]" />

      {/* ————— NAVIGATION BAR ————— */}
      <header className="sticky top-0 z-40 border-b border-border-subtle/70 bg-background/85 backdrop-blur-2xl safe-area-top">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 shadow-sm">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={`${branding.brand_name} logo`} className="h-5 w-5 object-contain" loading="eager" />
              ) : (
                <GraduationCap className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-extrabold tracking-tight text-foreground leading-none">{branding.brand_name}</span>
              <span className="text-[10px] font-medium text-muted-foreground tracking-wide mt-0.5">Campus Operating System</span>
            </div>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Platform</a>
            <a href="#bento" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Features</a>
            <a href="#benefits" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Architecture</a>
            <a href="#partners" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Partners</a>
            <Link to="/help" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Support</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline">
              Sign In
            </Link>
            <Link to="/auth" aria-label={content.header.ctaLabel}>
              <Button size="sm" className="h-9 rounded-xl px-4 text-xs font-bold shadow-md shadow-primary/20">
                {content.header.ctaLabel}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ————— HERO SECTION ————— */}
        <section className="relative pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">

            {/* Left: Headline & CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1 text-[11px] font-semibold text-primary backdrop-blur-md shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                <span>{content.hero.badge || "Production-Ready Campus OS"}</span>
              </div>

              <h1 className="font-heading text-[38px] sm:text-[54px] lg:text-[62px] font-black leading-[1.04] tracking-[-0.035em] text-foreground">
                {content.hero.titleLine1}{" "}
                <span className="bg-gradient-to-r from-primary via-indigo-500 to-accent bg-clip-text text-transparent">
                  {content.hero.titleLine2}
                </span>
              </h1>

              <p className="max-w-xl text-[16px] leading-relaxed text-muted-foreground md:text-[17px]">
                {content.hero.subtitle}
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button size="lg" className="h-12 w-full rounded-xl px-7 text-[14px] font-bold shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                    {content.hero.primaryCtaLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#bento" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="h-12 w-full rounded-xl border-border-strong bg-surface-1/70 px-6 text-[14px] font-semibold hover:bg-surface-2 transition-all">
                    {content.hero.secondaryCtaLabel}
                  </Button>
                </a>
              </div>

              {/* Trust markers */}
              <div className="pt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-[12px] text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>Real-time GPS QR Attendance</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>Zero-Trust Verification</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>PWA & Mobile Ready</span>
                </div>
              </div>
            </motion.div>

            {/* Right: Live Interactive Product Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5"
            >
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Glow backlight */}
                <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-tr from-primary/30 to-indigo-500/20 blur-2xl opacity-75" />

                {/* Main Card Mockup */}
                <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-2xl">
                  {/* Browser Chrome Header */}
                  <div className="flex items-center justify-between border-b border-border-subtle bg-surface-2/80 px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-danger/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
                      <span className="ml-2 font-mono text-[10px] text-muted-foreground">app.campusconnect.in</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live Session
                    </span>
                  </div>

                  {/* Dashboard Preview Body */}
                  <div className="space-y-4 p-5">
                    {/* User Profile Bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-primary text-sm">
                          AJ
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Welcome back</p>
                          <p className="text-sm font-bold text-foreground">Atharv Jadhav</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full">
                          ★ Elite Tier
                        </span>
                      </div>
                    </div>

                    {/* Metric Cards Row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-3 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Attendance</p>
                        <p className="text-lg font-black text-foreground mt-0.5">96.4%</p>
                        <span className="text-[9px] text-success font-semibold">↑ On Track</span>
                      </div>
                      <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-3 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Points</p>
                        <p className="text-lg font-black text-foreground mt-0.5">1,420</p>
                        <span className="text-[9px] text-warning font-semibold">Rank #3</span>
                      </div>
                      <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-3 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Streak</p>
                        <p className="text-lg font-black text-foreground mt-0.5">18d 🔥</p>
                        <span className="text-[9px] text-primary font-semibold">Active</span>
                      </div>
                    </div>

                    {/* Active Live Class Card */}
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-2 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-danger animate-ping" />
                          Live Right Now
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">10:00 – 11:30 AM</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Advanced Computer Networks (CS-601)</p>
                        <p className="text-[11px] text-muted-foreground">Room 402 · Prof. R. K. Verma</p>
                      </div>
                      <div className="pt-1 flex items-center gap-2">
                        <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                          <QrCode className="h-3.5 w-3.5" />
                          Scan QR Attendance
                        </button>
                      </div>
                    </div>

                    {/* Upcoming Tasks Preview */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Upcoming Deadlines</p>
                      <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-2/40 px-3 py-2 text-xs">
                        <span className="font-semibold text-foreground truncate">Operating Systems Lab 5</span>
                        <span className="text-[10px] font-semibold text-warning">Due in 2 days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* KPI STATS BAR */}
          <div className="mt-16 grid grid-cols-2 gap-6 border-y border-border-subtle py-8 md:grid-cols-4 md:gap-8 md:py-10">
            {content.kpis.map((kpi, i) => (
              <div key={i} className="text-center sm:text-left">
                <p className="font-heading text-3xl font-black text-foreground md:text-4xl">{kpi.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{kpi.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ————— INSTITUTION PARTNERS SHOWCASE ————— */}
        <section id="partners" className="border-b border-border-subtle">
          <InstitutionPartnersMarquee />
        </section>

        {/* ————— BENTO GRID FEATURE SHOWCASE ————— */}
        <section id="bento" className="py-16 md:py-24">
          <div className="mb-14 text-center max-w-2xl mx-auto space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">{content.featuresHeading.eyebrow || "Engineered for Excellence"}</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-foreground">{content.featuresHeading.title || "The complete campus operating system."}</h2>
            <p className="text-muted-foreground text-sm sm:text-base">Everything students, faculty, and administration need in one unified, cohesive platform.</p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

            {/* Bento Card 1: Attendance Engine (Large, 8 Cols) */}
            <div className="md:col-span-8 bento-card p-8 relative overflow-hidden flex flex-col justify-between min-h-[320px]">
              <div className="space-y-3 relative z-10 max-w-md">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <QrCode className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-xl font-black text-foreground">Intelligent Real-Time Attendance</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cryptographically rotating QR codes paired with GPS geolocation fencing ensure tamper-proof, zero-proxy lecture attendance in under 2 seconds.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border-subtle flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Dynamic Token Rotation</span>
                <span className="flex items-center gap-1.5 text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Geolocation Boundary Check</span>
                <span className="flex items-center gap-1.5 text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Instant Ledger Logging</span>
              </div>
            </div>

            {/* Bento Card 2: Student Gamification (4 Cols) */}
            <div className="md:col-span-4 bento-card p-8 relative overflow-hidden flex flex-col justify-between min-h-[320px]">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
                  <Trophy className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-xl font-black text-foreground">Gamified Progression</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Earn points for punctual attendance, maintain daily check-in streaks, and unlock departmental prestige tiers.
                </p>
              </div>
              <div className="mt-6 rounded-xl bg-surface-2 p-3 border border-border-subtle">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>Current Tier</span>
                  <span className="text-warning">Gold Level</span>
                </div>
                <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-warning to-amber-500 rounded-full w-[78%]" />
                </div>
              </div>
            </div>

            {/* Bento Card 3: Smart Academics & Schedule (4 Cols) */}
            <div className="md:col-span-4 bento-card p-8 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-xl font-black text-foreground">Live Timetable Matrix</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Real-time synchronization with faculty schedules, room reassignments, and instant cancellation alerts.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-primary">
                <span>View Weekly Matrix →</span>
              </div>
            </div>

            {/* Bento Card 4: Enterprise ERP & Verification (8 Cols) */}
            <div className="md:col-span-8 bento-card p-8 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
              <div className="space-y-3 max-w-lg">
                <div className="h-10 w-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-xl font-black text-foreground">Enterprise Administration & Public Verification</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Multi-tenant college governance, student document management, audit logs, and tamper-proof public document verification links for employers and universities.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border-subtle flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Multi-Tenant Role Isolation</span>
                <span className="flex items-center gap-1.5 text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Tamper-Proof QR Seals</span>
              </div>
            </div>

          </div>
        </section>

        {/* ————— BENEFITS / ARCHITECTURE SECTION ————— */}
        <section id="benefits" className="py-14 md:py-20 border-t border-border-subtle">
          <div className="mb-12 max-w-2xl space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">{content.benefitsHeading.eyebrow || "Modern Engineering"}</p>
            <h2 className="font-heading text-3xl font-black text-foreground md:text-4xl">{content.benefitsHeading.title}</h2>
            <p className="text-sm text-muted-foreground md:text-base">Built to enterprise performance standards to handle tens of thousands of concurrent students.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {content.benefits.map((b, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-border-subtle bg-surface-1 p-7 transition-all duration-200 hover:border-primary/40 hover:shadow-md"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon name={b.icon} className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.description}</p>
                {b.stat && (
                  <p className="mt-4 inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-0.5 text-[11px] font-bold text-primary">{b.stat}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ————— FINAL CTA BANNER ————— */}
        <section className="py-16 md:py-24">
          <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-b from-surface-1 to-surface-2 px-6 py-16 text-center md:px-12 md:py-20 shadow-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.25),transparent_60%)]" />
            <div className="relative max-w-2xl mx-auto space-y-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">{content.finalCta.eyebrow || "Get Started Today"}</p>
              <h2 className="font-heading text-3xl sm:text-5xl font-black tracking-tight text-foreground">{content.finalCta.title}</h2>
              <p className="text-sm sm:text-base text-muted-foreground">{content.finalCta.description}</p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button size="lg" className="h-12 w-full rounded-xl px-8 text-sm font-bold shadow-lg shadow-primary/30">
                    {content.finalCta.primaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/contact" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="h-12 w-full rounded-xl border-border-strong bg-surface-1 px-6 text-sm font-semibold">
                    {content.finalCta.secondaryLabel}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ————— FOOTER ————— */}
      <footer className="border-t border-border-subtle bg-surface-1 safe-area-bottom">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 md:px-8 md:py-16">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <span className="text-base font-extrabold tracking-tight text-foreground">
                  {branding.brand_name}
                </span>
              </div>
              <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                Next-generation unified campus operating system — intelligent attendance, academics, student engagement, and administration.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-primary" /> Enterprise Grade
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> Made in India
                </span>
              </div>
            </div>

            <div className="md:col-span-7 grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">Platform</p>
                <ul className="space-y-2 text-[13px] text-muted-foreground">
                  <li><Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link></li>
                  <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                  <li><a href="#benefits" className="hover:text-foreground transition-colors">Architecture</a></li>
                </ul>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">Institution</p>
                <ul className="space-y-2 text-[13px] text-muted-foreground">
                  <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                  <li><Link to="/help" className="hover:text-foreground transition-colors">Help & FAQ</Link></li>
                  <li><a href="#partners" className="hover:text-foreground transition-colors">Partners</a></li>
                </ul>
              </div>
              <div className="col-span-2 space-y-3 sm:col-span-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">Legal</p>
                <ul className="space-y-2 text-[13px] text-muted-foreground">
                  {content.footerLinks.map((l, i) =>
                    l.href.startsWith("/") ? (
                      <li key={i}><Link to={l.href} className="hover:text-foreground transition-colors">{l.label}</Link></li>
                    ) : (
                      <li key={i}><a href={l.href} className="hover:text-foreground transition-colors">{l.label}</a></li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border-subtle pt-6 text-[11px] text-muted-foreground">
            <p>© {year} {branding.brand_name}. All rights reserved.</p>
            <p>Developed by Atharv Jadhav · Department of Computer Science</p>
          </div>
        </div>
      </footer>

      <WhatsAppButton />

      {/* Mobile Sticky CTA */}
      <AnimatePresence>
        {scrolled && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border-subtle bg-surface-1/95 backdrop-blur-xl px-4 py-3 safe-area-bottom shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{branding.brand_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">Campus Operating System</p>
                </div>
              </div>
              <Link to="/auth" className="shrink-0">
                <Button size="sm" className="h-9 rounded-xl px-4 text-xs font-bold shadow-md shadow-primary/20">
                  {content.header.ctaLabel}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
