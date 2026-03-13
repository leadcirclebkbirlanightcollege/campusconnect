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
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">{eyebrow}</p>
      <h2 className="text-xl font-black tracking-tight text-foreground">{title}</h2>
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black leading-none text-foreground">{value}</p>
    </div>
  );
}

function PreviewCard({ title, subtitle, statA, statB }: { title: string; subtitle: string; statA: string; statB: string }) {
  return (
    <article className="min-w-[300px] snap-start">
      <GlassCard padding="lg" className="space-y-4" hover>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/12 px-2 py-0.5 text-[10px] text-primary">Live</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border-subtle bg-surface-2 p-3">
            <p className="text-[10px] text-muted-foreground">Metric</p>
            <p className="text-lg font-black text-foreground">{statA}</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-2 p-3">
            <p className="text-[10px] text-muted-foreground">Status</p>
            <p className="text-lg font-black text-foreground">{statB}</p>
          </div>
        </div>

        <div className="h-2 rounded-full bg-surface-3">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "76%" }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="h-2 rounded-full bg-primary"
          />
        </div>
      </GlassCard>
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
        if (data?.role === "super_admin") navigate("/platform/admin-control/dashboard", { replace: true });
        else if (data?.role === "admin") navigate("/platform/admin/dashboard", { replace: true });
        else navigate("/app/dashboard", { replace: true });
      } finally {
        if (mounted) setAuthChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const year = useMemo(() => new Date().getFullYear(), []);

  if (authChecking) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.2),transparent_38%),radial-gradient(circle_at_100%_15%,hsl(var(--primary)/0.12),transparent_40%)]" />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[180px] bg-[linear-gradient(to_bottom,hsl(var(--primary)/0.08),transparent)]"
        animate={{ opacity: [0.45, 0.75, 0.45] }}
        transition={{ duration: 2.8, repeat: Infinity }}
      />

      <header className="sticky top-0 z-40 border-b border-border-subtle/70 bg-background/85 backdrop-blur-xl safe-area-top">
        <div className="mx-auto flex h-16 w-full max-w-[420px] items-center justify-between px-4 md:max-w-6xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={`${branding.brand_name} logo`} className="h-5 w-5 object-contain" loading="eager" />
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
              <Button size="sm" className="h-12 px-4 text-xs">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[420px] space-y-8 px-4 py-8 md:max-w-6xl">
        <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-1 px-3 py-1 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Editorial launch edition
            </div>

            <h1 className="text-[38px] font-black leading-[0.97] tracking-[-0.05em] text-foreground md:text-[64px]">
              Campus Ops.
              <br />
              Designed for Speed.
            </h1>

            <p className="max-w-[44ch] text-sm leading-relaxed text-muted-foreground md:text-base">
              Manage lectures, attendance, achievements, and community signals in one fast, focused platform.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/auth" className="w-full sm:w-auto">
                <GlowButton className="h-12 w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </GlowButton>
              </Link>
              <a href="#features" className="w-full sm:w-auto">
                <Button variant="outline" className="h-12 w-full sm:w-auto">
                  Explore Features
                </Button>
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.06 }}
          >
            <GlassCard padding="lg" className="space-y-4 border-primary/25" hover>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Live Platform Metrics</h2>
                <span className="rounded-full border border-primary/30 bg-primary/12 px-2 py-0.5 text-[10px] text-primary">Realtime</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MetricMini label="Attendance" value="78%" />
                <MetricMini label="Streak" value="9d" />
                <MetricMini label="Active Students" value="512" />
                <MetricMini label="Live Lectures" value="14" />
              </div>

              <div className="space-y-2 rounded-xl border border-border-subtle bg-surface-2 p-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Engagement Index</span>
                  <span className="text-foreground">92%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "92%" }}
                    transition={{ duration: 0.45, delay: 0.15 }}
                    className="h-2 rounded-full bg-primary"
                  />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </section>

        <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.2 }} className="space-y-3">
          <SectionTitle eyebrow="Highlights" title="Product Highlights" />
          <div className="space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }, i) => (
              <motion.div key={title} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.18, delay: i * 0.05 }}>
                <GlassCard className="flex items-start gap-3" padding="lg">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
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

        <motion.section id="features" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.2 }} className="space-y-3">
          <SectionTitle eyebrow="Capabilities" title="Features" />
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((feature) => (
              <ActionTile key={feature.label} icon={feature.icon} label={feature.label} onClick={() => undefined} />
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.2 }} className="space-y-3">
          <SectionTitle eyebrow="Workflow" title="How It Works" />
          <div className="space-y-3">
            {WORKFLOW.map(({ icon: Icon, title, description }, index) => (
              <GlassCard key={title} className="flex items-start gap-3" padding="lg" hover>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Step {index + 1}</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.2 }} className="space-y-3">
          <SectionTitle eyebrow="Preview" title="Screens" />
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 no-scrollbar">
            <PreviewCard title="Student Dashboard" subtitle="Daily performance" statA="240" statB="Active" />
            <PreviewCard title="Leaderboard" subtitle="Campus rankings" statA="#4" statB="Rising" />
            <PreviewCard title="Admin Dashboard" subtitle="Operations control" statA="89%" statB="Stable" />
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.2 }}>
          <GlassCard padding="lg" className="space-y-3" hover={false}>
            <SectionTitle eyebrow="Community" title="Campus Community" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              From lectures to events, {branding.brand_name} keeps students, admins, and programmes connected with one shared campus rhythm.
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

        <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.2 }}>
          <GlassCard className="space-y-4 text-center border-primary/25" padding="lg" hover={false}>
            <h2 className="text-2xl font-black tracking-tight text-foreground">Start Connecting Your Campus Today</h2>
            <p className="text-xs text-muted-foreground">Launch a smarter campus experience in minutes.</p>
            <Link to="/auth" className="inline-block">
              <GlowButton className="h-12 px-8">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </GlowButton>
            </Link>
          </GlassCard>
        </motion.section>
      </main>

      <footer className="border-t border-border-subtle/70 bg-surface-1/80">
        <div className="mx-auto w-full max-w-[420px] space-y-3 px-4 py-6 md:max-w-6xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/12">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={`${branding.brand_name} logo`} className="h-4.5 w-4.5 object-contain" loading="lazy" />
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
          <p className="text-xs text-muted-foreground">Developed by - Atharv Jadhav - Department Of Computer Science</p>
        </div>
      </footer>

      <div className="safe-area-bottom" />
    </div>
  );
}
