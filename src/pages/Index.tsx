import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import {
  ArrowRight, GraduationCap, CheckCircle, Trophy, Bell,
  Shield, Users, Zap, ChevronUp, BarChart3
} from "lucide-react";

/* ── Intro Splash ─────────────────────────────────────────── */
function useIntroSeen() {
  const key = "cc_intro_seen";
  const [seen, setSeen] = useState(() => {
    try { return sessionStorage.getItem(key) === "1"; } catch { return false; }
  });
  const markSeen = () => {
    try { sessionStorage.setItem(key, "1"); } catch {}
    setSeen(true);
  };
  return { seen, markSeen };
}

function IntroSplash({
  onDone, brandName, tagline, logoUrl,
}: { onDone: () => void; brandName: string; tagline: string; logoUrl: string | null }) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);   // logo
    const t2 = setTimeout(() => setPhase(2), 700);   // name
    const t3 = setTimeout(() => setPhase(3), 1100);  // tagline + sweep
    const t4 = setTimeout(() => setPhase(4), 1900);  // fade out
    const t5 = setTimeout(onDone, 2300);
    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "hsl(var(--background))",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 20,
        opacity: phase === 4 ? 0 : 1,
        transition: "opacity 350ms ease",
        pointerEvents: phase === 4 ? "none" : "all",
        overflow: "hidden",
      }}
    >
      {/* light sweep */}
      {phase >= 3 && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(105deg, transparent 30%, hsl(var(--primary)/0.06) 50%, transparent 70%)",
          animation: "cc-sweep 1.2s ease forwards",
          pointerEvents: "none",
        }} />
      )}

      {/* logo */}
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: "hsl(var(--primary))",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 8px 40px hsl(var(--primary)/0.3)",
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? "scale(1)" : "scale(0.85)",
        transition: "opacity 400ms ease, transform 400ms cubic-bezier(.22,.97,.44,1)",
      }}>
        {logoUrl ? (
          <img src={logoUrl} alt={brandName} style={{ width: 44, height: 44, objectFit: "contain" }} />
        ) : (
          <GraduationCap style={{ width: 36, height: 36, color: "hsl(var(--primary-foreground))" }} />
        )}
      </div>

      {/* brand name */}
      <div style={{
        textAlign: "center",
        opacity: phase >= 2 ? 1 : 0,
        transform: phase >= 2 ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 350ms ease 0.1s, transform 350ms ease 0.1s",
      }}>
        <div style={{
          fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em",
          color: "hsl(var(--foreground))", lineHeight: 1.2,
        }}>{brandName}</div>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "hsl(var(--muted-foreground))",
          marginTop: 6,
          opacity: phase >= 3 ? 1 : 0,
          transition: "opacity 300ms ease 0.15s",
        }}>{tagline}</div>
      </div>

      <style>{`
        @keyframes cc-sweep {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

/* ── Count-up on scroll ───────────────────────────────────── */
function StatCounter({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const dur = 1200;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setCount(Math.round(eased * value));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center space-y-1">
      <div className="text-4xl md:text-5xl font-bold text-foreground tabular-nums">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

/* ── Fade-in on scroll ────────────────────────────────────── */
function FadeOnScroll({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 500ms ease ${delay}ms, transform 500ms ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────── */
export default function Index() {
  const navigate = useNavigate();
  const { branding } = usePlatformBranding();
  const { seen, markSeen } = useIntroSeen();
  const [introPlaying, setIntroPlaying] = useState(!seen);
  const [scrollY, setScrollY] = useState(0);
  const [authChecking, setAuthChecking] = useState(true);

  /* redirect logged-in users */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !mounted) return;
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
        if (!mounted) return;
        navigate(data?.role === "admin" ? "/app/admin/dashboard" : "/app/dashboard", { replace: true });
      } finally {
        if (mounted) setAuthChecking(false);
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  /* scroll progress */
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleIntroDone = () => { markSeen(); setIntroPlaying(false); };

  const scrollProgress = Math.min(scrollY / (document.documentElement.scrollHeight - window.innerHeight || 1), 1);

  if (authChecking) return null;

  return (
    <>
      {/* Intro */}
      {introPlaying && (
        <IntroSplash
          onDone={handleIntroDone}
          brandName={branding.brand_name}
          tagline={branding.tagline}
          logoUrl={branding.logo_url}
        />
      )}

      {/* Scroll progress */}
      <div className="fixed top-0 left-0 h-[2px] bg-primary z-50 transition-all duration-100" style={{ width: `${scrollProgress * 100}%` }} />

      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 flex items-center border-b border-border/30 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              {branding.logo_url
                ? <img src={branding.logo_url} alt={branding.brand_name} className="w-5 h-5 object-contain" />
                : <GraduationCap className="w-4 h-4 text-primary-foreground" />
              }
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">{branding.brand_name}</span>
          </div>
          <Link to="/auth">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
              Sign in <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="min-h-screen bg-background text-foreground overflow-x-hidden pt-14">

        {/* subtle noise layer */}
        <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.025] pointer-events-none z-0" />

        {/* radial ambient */}
        <div className="fixed inset-0 pointer-events-none z-0"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, hsl(var(--primary)/0.07), transparent)" }} />

        {/* ── HERO ──────────────────────────────────────────── */}
        <section className="relative z-10 container mx-auto px-5 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">

            {/* Left */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-surface-1 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Live platform · {new Date().getFullYear()}
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight text-foreground">
                  Your Campus.<br />
                  <span className="text-primary">Intelligently</span><br />
                  Connected.
                </h1>
                <p className="text-base text-muted-foreground leading-relaxed max-w-md">
                  {branding.brand_name} is the institutional platform built for serious academic management — attendance, analytics, gamification, and command control.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/auth">
                  <Button size="lg" className="h-11 px-6 gap-2 font-medium shadow-lg shadow-primary/20">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="h-11 px-6 font-medium">
                    Student Login
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-6 pt-2">
                {[
                  { v: "99%", l: "Uptime" },
                  { v: "60fps", l: "Performance" },
                  { v: "Live", l: "Attendance" },
                ].map(({ v, l }) => (
                  <div key={l} className="text-center">
                    <div className="text-lg font-bold text-foreground">{v}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — glass dashboard mock */}
            <div className="relative hidden md:block">
              <div className="relative rounded-2xl border border-border/50 bg-surface-1/90 backdrop-blur-sm shadow-2xl overflow-hidden p-5 space-y-4"
                style={{ transform: "perspective(1000px) rotateY(-4deg) rotateX(2deg)" }}>

                {/* mock header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                      <GraduationCap className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Student Dashboard</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-success font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    LIVE
                  </div>
                </div>

                {/* mock attendance ring */}
                <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-2 border border-border/40">
                  <div className="w-14 h-14 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--primary)/0.15)" strokeWidth="4" />
                      <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
                        strokeDasharray="150.8" strokeDashoffset="37.7" strokeLinecap="round" />
                    </svg>
                    <span className="text-xs font-bold text-primary">75%</span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Attendance</div>
                    <div className="text-xl font-bold text-foreground">75%</div>
                    <div className="text-[10px] text-muted-foreground">9 of 12 lectures</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-[10px] text-muted-foreground">Points</div>
                    <div className="text-lg font-bold text-foreground">240</div>
                    <div className="text-[10px] text-success">Silver Tier</div>
                  </div>
                </div>

                {/* mock mini stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: "Streak", v: "7d", c: "text-warning" },
                    { l: "Rank", v: "#4", c: "text-primary" },
                    { l: "Risk", v: "Low", c: "text-success" },
                  ].map(({ l, v, c }) => (
                    <div key={l} className="p-2 rounded-lg bg-surface-2 border border-border/30 text-center">
                      <div className={`text-sm font-bold ${c}`}>{v}</div>
                      <div className="text-[10px] text-muted-foreground">{l}</div>
                    </div>
                  ))}
                </div>

                {/* mock live lecture */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/8 border border-primary/20">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[11px] text-primary font-medium">Lecture in progress — Mark attendance now</span>
                </div>
              </div>

              {/* depth shadow */}
              <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-3xl -z-10" />
            </div>
          </div>
        </section>

        {/* ── STATS ─────────────────────────────────────────── */}
        <section className="relative z-10 border-y border-border/40 bg-surface-1/60 backdrop-blur-sm">
          <div className="container mx-auto px-5 py-16">
            <FadeOnScroll>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <StatCounter value={500} suffix="+" label="Active Students" />
                <StatCounter value={120} suffix="+" label="Lectures Conducted" />
                <StatCounter value={8500} suffix="+" label="Attendance Marks" />
                <StatCounter value={24000} suffix="+" label="Points Awarded" />
              </div>
            </FadeOnScroll>
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────── */}
        <section className="relative z-10 container mx-auto px-5 py-24">
          <FadeOnScroll className="text-center mb-16 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">Platform Capabilities</div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Built for institutional scale</h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm">
              Every feature designed with clarity, structure, and performance at its core.
            </p>
          </FadeOnScroll>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: CheckCircle, title: "QR & OTP Attendance", desc: "Mark attendance in seconds with secure QR codes or 6-digit OTP. Live session monitoring.", color: "text-primary" },
              { icon: BarChart3, title: "Performance Analytics", desc: "Tier progression, risk detection, attendance consistency scores and smart projections.", color: "text-accent" },
              { icon: Trophy, title: "Competitive Leaderboard", desc: "Live ranked standings with podium, tier badges, weekly resets and point animations.", color: "text-warning" },
              { icon: Shield, title: "Admin Command Center", desc: "Full operational control — platform modes, student management, audit logs, analytics.", color: "text-success" },
              { icon: Bell, title: "Smart Notifications", desc: "Scheduled and live alerts for lectures, announcements, and critical updates.", color: "text-primary" },
              { icon: Zap, title: "Intelligence Engine", desc: "Automated risk flagging, behaviour reliability scoring, and engagement index per student.", color: "text-accent" },
              { icon: Users, title: "Programme Management", desc: "Allot students to learning circles, tag lectures to programmes, track cohort-level data.", color: "text-warning" },
              { icon: GraduationCap, title: "Digital Identity", desc: "Verified student digital ID cards with QR scan, profile management, and tier display.", color: "text-success" },
            ].map(({ icon: Icon, title, desc, color }, i) => (
              <FadeOnScroll key={title} delay={i * 40}>
                <div className="group p-5 rounded-xl border border-border/40 bg-surface-1 hover:border-border/80 hover:bg-surface-2 transition-all duration-150 h-full space-y-3">
                  <div className={`w-9 h-9 rounded-lg bg-current/8 flex items-center justify-center ${color}`}>
                    <Icon className={`w-4.5 h-4.5 ${color}`} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </FadeOnScroll>
            ))}
          </div>
        </section>

        {/* ── ADMIN COMMAND CENTER SPOTLIGHT ────────────────── */}
        <section className="relative z-10 border-y border-border/40 bg-surface-1/40 py-24">
          <div className="container mx-auto px-5">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
              <FadeOnScroll className="space-y-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-primary">Admin Command Center</div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  Total operational control.<br />Zero friction.
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The admin panel is an operations war room — real-time attendance monitoring, platform mode control, student intelligence, audit logs, and a full analytics suite.
                </p>
                <ul className="space-y-2">
                  {[
                    "Platform mode switchboard (Normal / Maintenance / Launch)",
                    "Live attendance session monitoring with student list",
                    "Student intelligence scoring — risk, tier, engagement",
                    "Audit log for every attendance correction",
                    "Scheduled notification delivery",
                  ].map(c => (
                    <li key={c} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </FadeOnScroll>

              {/* mock admin panel */}
              <FadeOnScroll delay={100}>
                <div className="rounded-2xl border border-border/50 bg-surface-1 p-5 space-y-3 shadow-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Command Center</span>
                    <span className="ml-auto text-[10px] text-success font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />Systems Operational
                    </span>
                  </div>
                  {[
                    { label: "Total Students", value: "500+", delta: "+12 this week" },
                    { label: "Active Lectures", value: "3", delta: "Live now" },
                    { label: "Attendance Today", value: "89%", delta: "+4% vs avg" },
                    { label: "At-Risk Students", value: "6", delta: "Flagged" },
                  ].map(({ label, value, delta }) => (
                    <div key={label} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2 border border-border/30">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">{value}</div>
                        <div className="text-[10px] text-muted-foreground">{delta}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </FadeOnScroll>
            </div>
          </div>
        </section>

        {/* ── CORE TEAM ─────────────────────────────────────── */}
        <CoreTeamSection brandName={branding.brand_name} />

        {/* ── CTA ───────────────────────────────────────────── */}
        <section className="relative z-10 container mx-auto px-5 py-24">
          <FadeOnScroll>
            <div className="max-w-2xl mx-auto text-center space-y-6 p-10 rounded-2xl border border-primary/20 bg-primary/5">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Ready to join {branding.brand_name}?
              </h2>
              <p className="text-muted-foreground text-sm">
                Your academic life — intelligently managed.
              </p>
              <Link to="/auth">
                <Button size="lg" className="h-11 px-8 gap-2 shadow-lg shadow-primary/20">
                  Create Account <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </FadeOnScroll>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t border-border/40 bg-surface-1/60 py-6">
          <div className="container mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{branding.brand_name} · {branding.tagline}</span>
            <span>Department of Computer Science · Built with precision.</span>
          </div>
        </footer>
      </main>

      {/* Back to top */}
      {scrollY > 400 && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-9 h-9 rounded-lg border border-border/60 bg-surface-1/90 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-md"
          aria-label="Back to top"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      )}
    </>
  );
}

/* ── Core Team Section ──────────────────────────────────────── */
function CoreTeamSection({ brandName }: { brandName: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (supabase as any)
      .from("core_team_members")
      .select("*")
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .then(({ data }: any) => {
        if (data) setMembers(data);
        setLoaded(true);
      });
  }, []);

  if (loaded && members.length === 0) return null;

  return (
    <section className="relative z-10 container mx-auto px-5 py-24">
      <FadeOnScroll className="text-center mb-14 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">The People Behind It</div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Meet Our Core Team</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          The students who built {brandName} from the ground up.
        </p>
      </FadeOnScroll>

      {!loaded ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-xl border border-border/40 bg-surface-1 p-5 animate-pulse space-y-3">
              <div className="w-16 h-16 rounded-full bg-surface-3 mx-auto" />
              <div className="h-3 bg-surface-3 rounded mx-auto w-3/4" />
              <div className="h-2.5 bg-surface-3 rounded mx-auto w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {members.map((m, i) => (
            <FadeOnScroll key={m.id} delay={i * 50}>
              <div className="group p-5 rounded-xl border border-border/40 bg-surface-1 hover:border-border/80 hover:bg-surface-2 hover:-translate-y-1 transition-all duration-150 text-center space-y-3">
                <div className="w-16 h-16 rounded-full border-2 border-border/40 bg-surface-2 mx-auto overflow-hidden">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{m.name}</div>
                  {m.class && <div className="text-xs text-muted-foreground mt-0.5">{m.class}</div>}
                  {m.designation && (
                    <div className="mt-1.5 inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                      {m.designation}
                    </div>
                  )}
                </div>
              </div>
            </FadeOnScroll>
          ))}
        </div>
      )}
    </section>
  );
}
