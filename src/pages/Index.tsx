import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { Button } from "@/components/ui/button";
import { GlowButton } from "@/components/ui/GlowButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { ActionTile } from "@/components/ui/ActionTile";
import { cn } from "@/lib/utils";

const ENTER = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: "easeOut" },
  },
};

const STAGGER = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const HIGHLIGHTS = [
  {
    icon: CalendarCheck,
    title: "Smart Attendance",
    description: "Live QR/OTP attendance with secure verification and instant status sync.",
  },
  {
    icon: Trophy,
    title: "Gamified Leaderboard",
    description: "Boost engagement with points, streaks, tiers, and healthy competition.",
  },
  {
    icon: Bell,
    title: "Campus Notifications",
    description: "Announcements, lecture alerts, and reminders delivered in one inbox.",
  },
] as const;

const FEATURES = [
  { icon: LayoutDashboard, label: "Lecture Management" },
  { icon: CalendarCheck, label: "Attendance Tracking" },
  { icon: Trophy, label: "Student Leaderboard" },
  { icon: Star, label: "Achievements System" },
  { icon: Shield, label: "Admin Dashboard" },
  { icon: Megaphone, label: "Announcements" },
] as const;

const WORKFLOW = [
  {
    icon: Users,
    title: "Students join",
    description: "Onboarding is fast with role-ready access and profile setup.",
  },
  {
    icon: CalendarCheck,
    title: "Lectures scheduled",
    description: "Admins publish structured lecture sessions in seconds.",
  },
  {
    icon: Zap,
    title: "Attendance tracked",
    description: "Real-time attendance updates keep students and teams aligned.",
  },
  {
    icon: Sparkles,
    title: "Rewards unlocked",
    description: "Points, achievements, and tiers keep campus momentum high.",
  },
] as const;

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/80">{eyebrow}</p>
      <h2 className="text-xl font-black tracking-tight text-foreground">{title}</h2>
    </div>
  );
}

function NeonFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border border-primary/30 bg-surface-1/80",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_15%_15%,hsl(var(--primary)/0.22),transparent_45%)]",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(120deg,transparent_18%,hsl(var(--primary)/0.14)_50%,transparent_82%)]",
        className,
      )}
    >
      <div className="relative">{children}</div>
    </div>
  );
}

function PreviewCard({
  title,
  subtitle,
  accentClass,
  statA,
  statB,
}: {
  title: string;
  subtitle: string;
  accentClass: string;
  statA: string;
  statB: string;
}) {
  return (
    <article className="min-w-[300px] snap-start">
      <NeonFrame className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>
            <span className={cn("h-2.5 w-2.5 rounded-full shadow-glow", accentClass)} />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-border-subtle bg-surface-2 p-3">
              <p className="text-[11px] text-muted-foreground">Metric</p>
              <p className="text-lg font-black text-foreground">{statA}</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-2 p-3">
              <p className="text-[11px] text-muted-foreground">Status</p>
              <p className="text-lg font-black text-foreground">{statB}</p>
            </div>
          </div>

          <div className="h-2 rounded-full bg-surface-3">
            <motion.div
              initial={{ width: "0%" }}
              whileInView={{ width: "72%" }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-2 rounded-full bg-primary"
            />
          </div>
        </div>
      </NeonFrame>
    </article>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const { branding } = usePlatformBranding();
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session || !mounted) return;

        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!mounted) return;
        navigate(data?.role === "admin" ? "/app/admin/dashboard" : "/app/dashboard", { replace: true });
      } finally {
        if (mounted) setAuthChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const year = useMemo(() => new Date().getFullYear(), []);

  if (authChecking) return null;

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.24),transparent_42%),radial-gradient(circle_at_100%_35%,hsl(var(--primary)/0.16),transparent_38%),radial-gradient(circle_at_0%_55%,hsl(var(--primary)/0.11),transparent_34%)]" />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-[-120px] -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-[size:30px_30px] opacity-35" />

      <header className="sticky top-0 z-40 border-b border-border-subtle/70 bg-background/72 backdrop-blur-xl safe-area-top">
        <div className="mx-auto flex h-16 w-full max-w-[420px] items-center justify-between px-4 md:max-w-6xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 shadow-glow">
              {branding.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt={`${branding.brand_name} logo`}
                  className="h-5 w-5 object-contain"
                  loading="eager"
                />
              ) : (
                <GraduationCap className="h-4.5 w-4.5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-foreground">{branding.brand_name}</p>
              <p className="mt-1 text-[10px] leading-none text-muted-foreground">Campus intelligence platform</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/auth" aria-label="Login">
              <Button variant="ghost" size="sm" className="h-12 px-3 text-xs">
                Login
              </Button>
            </Link>
            <Link to="/auth" aria-label="Get started">
              <Button size="sm" className="h-12 px-4 text-xs shadow-glow">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[420px] space-y-8 px-4 py-8 md:max-w-6xl">
        <motion.section
          initial="hidden"
          animate="show"
          variants={STAGGER}
          className="grid gap-4 md:grid-cols-[1.05fr_0.95fr] md:items-center"
        >
          <motion.div variants={ENTER} className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/12 px-3 py-1 text-[11px] text-primary-foreground/90">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
              Cyber-neon campus operations
            </div>

            <h1 className="text-[36px] font-black leading-[0.98] tracking-[-0.04em] text-foreground md:text-[56px]">
              Your Campus.
              <br />
              <span className="bg-[linear-gradient(92deg,hsl(var(--foreground)),hsl(var(--primary))_50%,hsl(var(--foreground)))] bg-clip-text text-transparent">
                Fully Synced.
              </span>
            </h1>

            <p className="max-w-[46ch] text-sm leading-relaxed text-muted-foreground md:text-base">
              Manage lectures, attendance, achievements, and campus life in one intelligent platform built for speed,
              clarity, and momentum.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/auth" className="w-full sm:w-auto">
                <GlowButton className="h-12 w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </GlowButton>
              </Link>
              <a href="#features" className="w-full sm:w-auto">
                <Button variant="outline" className="h-12 w-full sm:w-auto border-primary/35 bg-surface-1/70">
                  Explore Features
                </Button>
              </a>
            </div>
          </motion.div>

          <motion.div variants={ENTER} className="relative">
            <NeonFrame className="p-4 md:p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Live Operations Pulse</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Attendance", value: "78%" },
                    { label: "Streak", value: "9d" },
                    { label: "Rank", value: "#4" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-border-subtle bg-surface-2 p-3">
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      <p className="text-base font-black text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 rounded-xl border border-border-subtle bg-surface-2/80 p-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Engagement Throughput</span>
                    <span className="text-foreground">92%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-4">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "92%" }}
                      transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
                      className="h-2 rounded-full bg-primary"
                    />
                  </div>
                </div>
              </div>
            </NeonFrame>

            <motion.div
              aria-hidden
              className="pointer-events-none absolute -bottom-7 -right-4 hidden h-24 w-24 rounded-full border border-primary/35 bg-primary/15 blur-sm md:block"
              animate={{ rotate: [0, 8, -8, 0], y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={STAGGER}
          className="space-y-3"
        >
          <SectionTitle eyebrow="Highlights" title="Product Highlights" />
          <div className="space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
              <motion.div key={title} variants={ENTER}>
                <GlassCard className="flex items-start gap-3 border-primary/20" padding="lg">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary shadow-glow">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="features"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={STAGGER}
          className="space-y-3"
        >
          <SectionTitle eyebrow="Capabilities" title="Features" />
          <motion.div variants={ENTER} className="grid grid-cols-2 gap-3">
            {FEATURES.map((feature) => (
              <ActionTile key={feature.label} icon={feature.icon} label={feature.label} onClick={() => undefined} />
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={STAGGER}
          className="space-y-3"
        >
          <SectionTitle eyebrow="Flow" title="How It Works" />
          <div className="space-y-3">
            {WORKFLOW.map(({ icon: Icon, title, description }, index) => (
              <motion.div key={title} variants={ENTER}>
                <GlassCard key={title} className="flex items-start gap-3 border-border-subtle/90" padding="lg" hover>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Step {index + 1}</p>
                    <h3 className="mt-0.5 text-sm font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={ENTER}
          className="space-y-3"
        >
          <SectionTitle eyebrow="Preview" title="App Screens" />
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 no-scrollbar">
            <PreviewCard
              title="Student Dashboard"
              subtitle="Daily performance"
              accentClass="bg-primary"
              statA="240"
              statB="Active"
            />
            <PreviewCard
              title="Leaderboard"
              subtitle="Campus rankings"
              accentClass="bg-warning"
              statA="#4"
              statB="Rising"
            />
            <PreviewCard
              title="Admin Dashboard"
              subtitle="Operations control"
              accentClass="bg-success"
              statA="89%"
              statB="Stable"
            />
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={ENTER}
        >
          <GlassCard padding="lg" className="space-y-3 border-primary/20" hover={false}>
            <SectionTitle eyebrow="Community" title="Campus Community" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              From lectures to events, {branding.brand_name} keeps students, admins, and programmes connected with one
              shared campus rhythm.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Students", value: "500+" },
                { label: "Events", value: "120+" },
                { label: "Engagement", value: "92%" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border-subtle bg-surface-2 p-3 text-center">
                  <p className="text-sm font-black text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={ENTER}
        >
          <NeonFrame className="p-6 text-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-black tracking-tight text-foreground md:text-[30px]">
                Start Connecting Your Campus Today
              </h2>
              <p className="text-xs text-muted-foreground md:text-sm">Launch a smarter campus experience in minutes.</p>
              <Link to="/auth" className="inline-block">
                <GlowButton className="h-12 px-8">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </GlowButton>
              </Link>
            </div>
          </NeonFrame>
        </motion.section>
      </main>

      <footer className="border-t border-border-subtle/70 bg-surface-1/80">
        <div className="mx-auto w-full max-w-[420px] space-y-3 px-4 py-6 md:max-w-6xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/12">
              {branding.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt={`${branding.brand_name} logo`}
                  className="h-4.5 w-4.5 object-contain"
                  loading="lazy"
                />
              ) : (
                <GraduationCap className="h-4 w-4 text-primary" />
              )}
            </div>
            <p className="text-sm font-semibold text-foreground">{branding.brand_name}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <a href="#features" className="story-link">
              Features
            </a>
            <a href="#" className="story-link">
              Community
            </a>
            <Link to="/auth" className="story-link">
              Login
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">© {year} {branding.brand_name}. All rights reserved.</p>
        </div>
      </footer>

      <div className="safe-area-bottom" />
    </div>
  );
}
