import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, GraduationCap, Rocket, Sparkles, Target, Trophy, UserRoundCheck } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { Button } from "@/components/ui/button";
import { GlowButton } from "@/components/ui/GlowButton";
import { GlassCard } from "@/components/ui/GlassCard";
import LandingTestimonials from "@/pages/landing/LandingTestimonials";
import WhatsAppButton from "@/components/WhatsAppButton";
import studentHero from "@/assets/landing-student-hero.jpg";

const STUDENT_BENEFITS = [
  {
    icon: CalendarCheck,
    title: "Never miss attendance",
    description: "Live lecture alerts and one-tap attendance so you stay marked and stress-free.",
    stat: "98% on-time check-ins",
  },
  {
    icon: Trophy,
    title: "Stay ahead with streaks",
    description: "Earn points, unlock achievements, and climb your campus leaderboard every day.",
    stat: "+35% higher engagement",
  },
  {
    icon: UserRoundCheck,
    title: "Everything in one student app",
    description: "Lectures, updates, digital ID, and progress insights in one smooth experience.",
    stat: "All daily tasks, one place",
  },
] as const;

const STUDENT_FEATURES = [
  { icon: Sparkles, label: "Personalized dashboard" },
  { icon: CalendarCheck, label: "Live attendance status" },
  { icon: Target, label: "Goal and streak tracking" },
  { icon: Rocket, label: "Fast, mobile-first UX" },
  { icon: Trophy, label: "Leaderboard motivation" },
  { icon: UserRoundCheck, label: "Verified student profile" },
] as const;

const KPI_STRIP = [
  { label: "Active Students", value: "50K+" },
  { label: "Daily Attendance", value: "1M+" },
  { label: "Avg. Session", value: "11m" },
  { label: "App Satisfaction", value: "4.8/5" },
] as const;

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
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !user) return;

    import("@/providers/QueryProvider").then(({ queryClient }) => {
      const cachedRole = queryClient.getQueryData<{ role: string; college_id: string | null }>(
        ["tenant", "role", user.id]
      );
      if (cachedRole) {
        if (cachedRole.role === "super_admin") navigate("/platform/admin-control/dashboard", { replace: true });
        else if (cachedRole.role === "admin") navigate("/platform/admin/dashboard", { replace: true });
        else if (cachedRole.role === "faculty") navigate("/faculty/dashboard", { replace: true });
        else navigate("/app/dashboard", { replace: true });
      } else {
        const timeout = setTimeout(() => {
          const role = queryClient.getQueryData<{ role: string; college_id: string | null }>(
            ["tenant", "role", user.id]
          );
          if (role?.role === "super_admin") navigate("/platform/admin-control/dashboard", { replace: true });
          else if (role?.role === "admin") navigate("/platform/admin/dashboard", { replace: true });
          else if (role?.role === "faculty") navigate("/faculty/dashboard", { replace: true });
          else navigate("/app/dashboard", { replace: true });
        }, 1500);
        return () => clearTimeout(timeout);
      }
    });
  }, [user, authLoading, navigate]);

  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_10%_0%,hsl(var(--primary)/0.16),transparent_42%),radial-gradient(circle_at_95%_8%,hsl(var(--accent)/0.14),transparent_38%)]" />

      <header className="sticky top-0 z-40 border-b border-border-subtle/70 bg-background/90 backdrop-blur-xl safe-area-top">
        <div className="mx-auto flex h-16 w-full max-w-[420px] items-center justify-between px-4 md:max-w-7xl md:px-6">
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
              <p className="mt-1 text-[10px] leading-none text-muted-foreground">Student-first campus experience</p>
            </div>
          </div>

          <Link to="/auth" aria-label="Start as student">
            <Button size="sm" className="h-12 px-4 text-xs">
              Start as Student
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[420px] space-y-10 px-4 py-8 md:max-w-7xl md:px-6 md:py-12">
        <section className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden rounded-[28px] border border-border-subtle"
          >
            <img
              src={studentHero}
              alt="Students using Campus Connect together on campus"
              className="h-[520px] w-full object-cover md:h-[620px]"
              width={1920}
              height={1080}
              loading="eager"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,hsl(var(--background)/0.92)_8%,hsl(var(--background)/0.25)_58%,transparent)]" />

            <div className="absolute inset-x-0 bottom-0 p-4 md:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-1/90 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Built for student life, not admin complexity
              </div>

              <h1 className="mt-3 text-[34px] font-black leading-[0.95] tracking-[-0.04em] text-foreground md:max-w-4xl md:text-[72px]">
                Your campus day,
                <br />
                one smart app.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary-foreground md:text-base">
                Attendance, lecture updates, achievements, and student progress—designed to keep you on track every single day.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/auth" className="w-full sm:w-auto">
                  <GlowButton className="h-12 w-full sm:w-auto">
                    Start as Student
                    <ArrowRight className="h-4 w-4" />
                  </GlowButton>
                </Link>
                <a href="#student-features" className="w-full sm:w-auto">
                  <Button variant="outline" className="h-12 w-full border-border-strong bg-surface-1/80 sm:w-auto">
                    See student features
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {KPI_STRIP.map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-border-subtle bg-surface-1 p-3 md:p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-xl font-black leading-none text-foreground md:text-2xl">{kpi.value}</p>
            </div>
          ))}
        </section>

        <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.2 }} className="space-y-3">
          <SectionTitle eyebrow="Why Students Love It" title="Benefits That Actually Matter" />
          <div className="space-y-3">
            {STUDENT_BENEFITS.map(({ icon: Icon, title, description, stat }, i) => (
              <motion.div key={title} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.18, delay: i * 0.05 }}>
                <GlassCard className="flex items-start gap-3" padding="lg">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
                    <p className="mt-2 inline-flex rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {stat}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section id="student-features" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.2 }} className="space-y-3">
          <SectionTitle eyebrow="Student Features" title="Built Around Your Daily Campus Flow" />
          <div className="grid gap-3 md:grid-cols-3">
            {STUDENT_FEATURES.map(({ icon: Icon, label }) => (
              <GlassCard key={label} className="flex items-center gap-3" padding="lg" hover>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
              </GlassCard>
            ))}
          </div>
        </motion.section>

        <LandingTestimonials />

        <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.2 }} className="space-y-4 text-center">
          <SectionTitle eyebrow="Get Started" title="Join Campus Connect as a Student" />
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Sign in to track attendance, stay updated on lectures, and build your streak from day one.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/auth">
              <GlowButton className="h-12 w-full sm:w-auto">
                Start as Student
                <ArrowRight className="h-4 w-4" />
              </GlowButton>
            </Link>
            <Link to="/contact">
              <Button variant="outline" className="h-12 w-full sm:w-auto">
                Need help?
              </Button>
            </Link>
          </div>
        </motion.section>
      </main>

      <footer className="border-t border-border-subtle bg-surface-1 py-6 safe-area-bottom">
        <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-4 px-4 text-center md:max-w-7xl md:flex-row md:justify-between md:px-6 md:text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/8">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">{branding.brand_name}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-[11px] text-muted-foreground md:justify-end">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link to="/help" className="hover:text-foreground transition-colors">Support</Link>
          </div>
          <p className="text-[11px] text-muted-foreground">© {year} {branding.brand_name}. All rights reserved.</p>
        </div>
      </footer>

      <WhatsAppButton />
    </div>
  );
}
