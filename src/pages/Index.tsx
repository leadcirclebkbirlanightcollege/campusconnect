import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, CalendarCheck, GraduationCap, Rocket, Sparkles, Target, Trophy,
  UserRoundCheck, Star, Zap, BookOpen, Award, Bell, Users, Megaphone, IdCard,
  MessageSquare, Lightbulb, BarChart3, ShieldCheck, Layers, Briefcase,
  CalendarDays, Network, Check, type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { useLandingContent } from "@/hooks/use-landing-content";
import { Button } from "@/components/ui/button";
import { GlowButton } from "@/components/ui/GlowButton";
import { GlassCard } from "@/components/ui/GlassCard";
import WhatsAppButton from "@/components/WhatsAppButton";
import InstitutionPartnersMarquee from "@/components/landing/InstitutionPartnersMarquee";
import studentHero from "@/assets/landing-student-hero.jpg";
import type { LandingIconName } from "@/config/landing-content";

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

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">{eyebrow}</p>
      <h2 className="text-xl font-black tracking-tight text-foreground">{title}</h2>
    </div>
  );
}

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
        // iOS Safari
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
  const heroImage = content.hero.imageUrl || studentHero;

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_18%_-10%,hsl(var(--primary)/0.22),transparent_45%),radial-gradient(circle_at_82%_0%,hsl(var(--primary)/0.12),transparent_40%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.035] [background-image:radial-gradient(hsl(var(--foreground))_1px,transparent_1px)] [background-size:36px_36px]" />

      {/* ————— NAV ————— */}
      <header className="sticky top-0 z-40 border-b border-border-subtle/60 bg-background/80 backdrop-blur-xl safe-area-top">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={`${branding.brand_name} logo`} className="h-5 w-5 object-contain" loading="eager" />
              ) : (
                <GraduationCap className="h-4.5 w-4.5 text-primary" />
              )}
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">{branding.brand_name}</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Platform</a>
            <a href="#benefits" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Solutions</a>
            <a href="#partners" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Partners</a>
            <Link to="/help" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Resources</Link>
          </nav>
          <div className="flex items-center gap-2 md:gap-3">
            <Link to="/auth" className="hidden text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground md:inline">Log in</Link>
            <Link to="/auth" aria-label={content.header.ctaLabel}>
              <Button size="sm" className="h-9 rounded-full px-4 text-xs font-semibold">{content.header.ctaLabel}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 md:px-8">
        {/* ————— HERO ————— */}
        <section className="relative pt-10 pb-12 md:pt-16 md:pb-20">
          <div className="grid items-center gap-10 md:grid-cols-12 md:gap-12">

            {/* Left: copy */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
              className="md:col-span-7"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                {content.hero.badge}
              </div>
              <h1 className="font-syne text-[44px] font-bold leading-[1.02] tracking-[-0.035em] text-foreground md:text-[76px]">
                {content.hero.titleLine1}{" "}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {content.hero.titleLine2}
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {content.hero.subtitle}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button size="lg" className="h-12 w-full rounded-xl px-6 text-sm font-semibold shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] sm:w-auto">
                    {content.hero.primaryCtaLabel}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="h-12 w-full rounded-xl border-border-strong bg-surface-1/60 px-6 text-sm font-semibold sm:w-auto">
                    {content.hero.secondaryCtaLabel}
                  </Button>
                </a>
              </div>
            </motion.div>

            {/* Right: product mock */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="md:col-span-5"
            >
              <div className="relative">
                <div className="absolute -inset-6 rounded-[32px] bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.35),transparent_70%)] blur-2xl" />
                <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-2xl shadow-primary/10">
                  {/* window chrome */}
                  <div className="flex items-center gap-1.5 border-b border-border-subtle bg-surface-2/60 px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="ml-3 text-[10px] font-medium text-muted-foreground">campus-connect.app / dashboard</span>
                  </div>
                  {/* mock content */}
                  <div className="space-y-3 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Today</p>
                        <p className="text-sm font-bold text-foreground">Good morning, Aarav</p>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                        <Bell className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Attendance", value: "94%", icon: CalendarCheck },
                        { label: "Rank", value: "#12", icon: Trophy },
                        { label: "Streak", value: "27d", icon: Zap },
                      ].map((s, i) => (
                        <div key={i} className="rounded-lg border border-border-subtle bg-surface-2/60 p-2.5">
                          <s.icon className="h-3.5 w-3.5 text-primary" />
                          <p className="mt-2 text-[9px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                          <p className="text-sm font-bold text-foreground">{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { t: "Data Structures — Live", s: "Prof. Sharma · Room 204", a: true },
                        { t: "Assignment: OS Lab 4", s: "Due Fri · 2 days left" },
                        { t: "Tech Fest 2026 — RSVP", s: "March 12 · 340 going" },
                      ].map((r, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-2/40 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold text-foreground">{r.t}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{r.s}</p>
                          </div>
                          {r.a && (
                            <span className="ml-2 flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                              <span className="h-1 w-1 rounded-full bg-primary" />
                              LIVE
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* KPI BAR */}
          <div className="mt-20 grid grid-cols-2 gap-6 border-y border-border-subtle py-8 md:grid-cols-4 md:gap-8 md:py-10">
            {content.kpis.map((kpi, i) => (
              <div key={i}>
                <p className="text-2xl font-bold leading-none text-foreground md:text-3xl">{kpi.value}</p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{kpi.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ————— INSTITUTION PARTNERS ————— */}
        <section id="partners" className="py-16 md:py-20">
          <InstitutionPartnersMarquee />
        </section>

        {/* ————— BENEFITS ————— */}
        <motion.section
          id="benefits"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}
          className="py-16 md:py-24"
        >
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">{content.benefitsHeading.eyebrow}</p>
            <h2 className="font-syne text-3xl font-bold tracking-tight text-foreground md:text-4xl">{content.benefitsHeading.title}</h2>
            <p className="mt-4 text-sm text-muted-foreground md:text-base">Powerful primitives built to integrate with the way your campus already runs.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {content.benefits.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="group rounded-2xl border border-border-subtle bg-surface-1/60 p-8 transition-colors hover:border-primary/30"
              >
                <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon name={b.icon} className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.description}</p>
                {b.stat && (
                  <p className="mt-4 inline-flex rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">{b.stat}</p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ————— SOCIAL PROOF ————— */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}
          className="py-16 md:py-20"
        >
          <div className="grid gap-10 rounded-3xl border border-border-subtle bg-surface-1/50 p-8 md:grid-cols-12 md:p-14">
            <div className="md:col-span-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">{content.socialProof.eyebrow}</p>
              <h2 className="font-syne text-2xl font-bold tracking-tight text-foreground md:text-3xl">{content.socialProof.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{content.socialProof.description}</p>
            </div>
            <ul className="grid gap-3 md:col-span-7 md:grid-cols-2">
              {content.socialProof.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-2/40 p-4 text-sm text-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* ————— FEATURES ————— */}
        <motion.section
          id="features"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}
          className="py-16 md:py-24"
        >
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">{content.featuresHeading.eyebrow}</p>
            <h2 className="font-syne text-3xl font-bold tracking-tight text-foreground md:text-4xl">{content.featuresHeading.title}</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {content.features.map((f, i) => (
              <div
                key={i}
                className="group flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-1/60 p-5 transition-colors hover:border-primary/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <Icon name={f.icon} className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{f.label}</p>
                  {f.description && <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{f.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ————— ADMIN / INSTITUTIONS ————— */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}
          className="py-16 md:py-20"
        >
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">{content.adminSection.eyebrow}</p>
            <h2 className="font-syne text-2xl font-bold tracking-tight text-foreground md:text-3xl">{content.adminSection.title}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {content.adminSection.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl border border-border-subtle bg-surface-1/60 px-4 py-3.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-[13px] font-medium text-foreground">{f}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ————— TESTIMONIALS ————— */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}
          className="py-16 md:py-24"
        >
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">{content.testimonialsHeading.eyebrow}</p>
            <h2 className="font-syne text-3xl font-bold tracking-tight text-foreground md:text-4xl">{content.testimonialsHeading.title}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {content.testimonials.map((t, i) => (
              <div key={i} className="flex h-full flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-1/60 p-6">
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.max(0, Math.min(5, t.rating || 0)) }).map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-foreground/90">"{t.quote}"</p>
                <div className="border-t border-border-subtle pt-4">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ————— FINAL CTA ————— */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}
          className="py-20 md:py-28"
        >
          <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-surface-1/60 px-6 py-16 text-center md:px-12 md:py-24">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.28),transparent_60%)]" />
            <div className="relative">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">{content.finalCta.eyebrow}</p>
              <h2 className="mx-auto max-w-2xl font-syne text-4xl font-bold tracking-tight text-foreground md:text-5xl">{content.finalCta.title}</h2>
              <p className="mx-auto mt-5 max-w-lg text-sm text-muted-foreground md:text-base">{content.finalCta.description}</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button size="lg" className="h-12 w-full rounded-xl px-6 text-sm font-semibold shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] sm:w-auto">
                    {content.finalCta.primaryLabel}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/contact" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="h-12 w-full rounded-xl border-border-strong bg-surface-1/60 px-6 text-sm font-semibold sm:w-auto">
                    {content.finalCta.secondaryLabel}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      </main>



      <footer className="border-t border-border-subtle bg-surface-1 safe-area-bottom">
        <div className="mx-auto w-full max-w-[420px] px-4 py-10 md:max-w-7xl md:px-8 md:py-14">
          {/* Top: brand + link columns */}
          <div className="grid gap-10 md:grid-cols-12">
            {/* Brand block */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                  <GraduationCap className="h-4.5 w-4.5 text-primary" />
                </div>
                <span className="text-base font-bold tracking-tight text-foreground">
                  {branding.brand_name}
                </span>
              </div>
              <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                A unified campus operating system — attendance, academics, engagement, and
                communication built for modern institutions.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  Enterprise-grade security
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Made in India
                </span>
              </div>
            </div>

            {/* Link columns */}
            <div className="md:col-span-7 grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
                  Product
                </p>
                <ul className="space-y-2 text-[13px] text-muted-foreground">
                  <li><Link to="/auth" className="hover:text-foreground transition-colors">Get Started</Link></li>
                  <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                  <li><a href="#benefits" className="hover:text-foreground transition-colors">Why Campus Connect</a></li>
                </ul>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
                  Company
                </p>
                <ul className="space-y-2 text-[13px] text-muted-foreground">
                  <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                  <li><Link to="/help" className="hover:text-foreground transition-colors">Support</Link></li>
                  <li><a href="#partners" className="hover:text-foreground transition-colors">Partners</a></li>
                </ul>
              </div>
              <div className="col-span-2 space-y-3 sm:col-span-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
                  Legal
                </p>
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

          {/* Divider + bottom bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border-subtle pt-6 md:flex-row">
            <p className="text-[11px] text-muted-foreground">
              © {year} {branding.brand_name}. All rights reserved.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Crafted with care for students, faculty & administrators.
            </p>
          </div>
        </div>
      </footer>


      <WhatsAppButton />
    </div>
  );
}
