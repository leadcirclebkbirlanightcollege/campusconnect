import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCircle2,
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
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0, 0, 0.2, 1] } },
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
    <article className="min-w-[280px] snap-start">
      <GlassCard className="space-y-3" padding="md" hover>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <span className={cn("h-2.5 w-2.5 rounded-full", accentClass)} />
        </div>

        <div className="grid grid-cols-2 gap-2">
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
          <div className="h-2 w-2/3 rounded-full bg-primary" />
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.14),transparent_58%)]" />

      <header className="sticky top-0 z-40 border-b border-border-subtle/70 bg-background/80 backdrop-blur-md safe-area-top">
        <div className="mx-auto flex h-16 w-full max-w-[420px] items-center justify-between px-4 md:max-w-5xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 border border-primary/20">
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
              <p className="text-[10px] text-muted-foreground leading-none mt-1">Campus platform</p>
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

      <main className="mx-auto w-full max-w-[420px] space-y-8 px-4 py-8 md:max-w-5xl">
        <motion.section
          initial="hidden"
          animate="show"
          variants={ENTER}
          className="space-y-5"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-1 px-3 py-1 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Ultra-fast campus operations
          </div>

          <h1 className="text-[34px] font-black leading-[1.02] tracking-[-0.03em] text-foreground">
            Your Campus. Connected.
          </h1>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Manage lectures, attendance, achievements, and campus life in one intelligent platform.
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

          <GlassCard className="overflow-hidden" padding="none" hover={false}>
            <div className="relative p-5">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),transparent_45%,hsl(var(--primary)/0.08))]" />
              <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Live Student Dashboard</p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Real-time
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border-subtle bg-surface-1/90 p-3">
                    <p className="text-[10px] text-muted-foreground">Attendance</p>
                    <p className="text-base font-black text-foreground">78%</p>
                  </div>
                  <div className="rounded-xl border border-border-subtle bg-surface-1/90 p-3">
                    <p className="text-[10px] text-muted-foreground">Streak</p>
                    <p className="text-base font-black text-foreground">9d</p>
                  </div>
                  <div className="rounded-xl border border-border-subtle bg-surface-1/90 p-3">
                    <p className="text-[10px] text-muted-foreground">Rank</p>
                    <p className="text-base font-black text-foreground">#4</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.section>

        <motion.section initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={ENTER} className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Product Highlights</h2>
          <div className="space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
              <GlassCard key={title} className="flex items-start gap-3" padding="lg">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.section>

        <motion.section id="features" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={ENTER} className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Features</h2>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((feature) => (
              <ActionTile key={feature.label} icon={feature.icon} label={feature.label} onClick={() => {}} />
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={ENTER} className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">How It Works</h2>
          <div className="space-y-3">
            {WORKFLOW.map(({ icon: Icon, title, description }, index) => (
              <GlassCard key={title} className="flex items-start gap-3" padding="lg" hover>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Step {index + 1}</p>
                  <h3 className="text-sm font-semibold text-foreground mt-0.5">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={ENTER} className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">App Preview</h2>
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

        <motion.section initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={ENTER}>
          <GlassCard padding="lg" className="space-y-3" hover={false}>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Campus Community</h2>
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

        <motion.section initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={ENTER}>
          <GlassCard className="space-y-4 text-center" padding="lg" hover={false}>
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
        <div className="mx-auto w-full max-w-[420px] space-y-3 px-4 py-6 md:max-w-5xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/12 border border-primary/20">
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
            <a href="#features" className="story-link">Features</a>
            <a href="#" className="story-link">Community</a>
            <Link to="/auth" className="story-link">Login</Link>
          </div>

          <p className="text-xs text-muted-foreground">© {year} {branding.brand_name}. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Developed by - Atharv Jadhav - Department Of Computer Science</p>
        </div>
      </footer>

      <div className="safe-area-bottom" />
    </div>
  );
}
