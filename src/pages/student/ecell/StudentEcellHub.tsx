/**
 * Student E-Cell Hub — Phase 5 redesign
 *
 * "A mini startup ecosystem inside Campus Connect."
 * Limited to: Events · Stall Registration · Points
 *
 * Visual identity:
 *  • Purple/Indigo accents
 *  • Subtle particle glow
 *  • Startup-tech aesthetic
 *  • Mobile-first, energetic but premium
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Rocket,
  CalendarDays,
  Store,
  Coins,
  ArrowRight,
  Sparkles,
  Flame,
  Timer,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";

const ECELL = "265 85% 65%";
const ECELL_DEEP = "262 80% 50%";
const ECELL_ACCENT = "280 80% 60%";

/* ─── Featured event hero with live countdown ─────────────── */
function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = Math.max(0, target.getTime() - now.getTime());
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { d, h, m, s, done: diff === 0 };
}

interface NextEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  venue: string | null;
}

function FeaturedCountdown({ event }: { event: NextEvent | undefined }) {
  const target = event
    ? new Date(`${event.event_date}T${event.event_time ?? "09:00:00"}`)
    : null;
  const cd = useCountdown(target);

  if (!event || !cd) return null;

  return (
    <Link
      to={`/app/events`}
      className="relative block overflow-hidden rounded-2xl border p-4 group"
      style={{
        background: `linear-gradient(135deg, hsl(${ECELL_DEEP} / 0.18), hsl(${ECELL} / 0.10))`,
        borderColor: `hsl(${ECELL} / 0.30)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full blur-2xl opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ background: `hsl(${ECELL_ACCENT} / 0.35)` }}
      />
      <div className="relative flex items-center gap-2 mb-2">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em]"
          style={{
            color: `hsl(${ECELL} / 0.95)`,
            background: `hsl(${ECELL} / 0.15)`,
            boxShadow: `inset 0 0 0 1px hsl(${ECELL} / 0.30)`,
          }}
        >
          <Flame className="h-2.5 w-2.5" /> Featured
        </span>
        <p className="text-[11px] text-muted-foreground truncate">
          {event.venue ?? "On-campus"}
        </p>
      </div>

      <h3 className="relative text-[16px] font-bold text-foreground tracking-tight leading-snug line-clamp-2">
        {event.title}
      </h3>

      <div className="relative mt-3 grid grid-cols-4 gap-1.5">
        {[
          { v: cd.d, l: "Days" },
          { v: cd.h, l: "Hrs" },
          { v: cd.m, l: "Min" },
          { v: cd.s, l: "Sec" },
        ].map((u) => (
          <div
            key={u.l}
            className="rounded-lg border bg-surface-1/60 backdrop-blur-sm py-1.5 text-center"
            style={{ borderColor: `hsl(${ECELL} / 0.20)` }}
          >
            <p
              className="text-[15px] font-black tabular-nums leading-none"
              style={{ color: `hsl(${ECELL})` }}
            >
              {String(u.v).padStart(2, "0")}
            </p>
            <p className="text-[8.5px] uppercase tracking-wider text-muted-foreground mt-0.5">
              {u.l}
            </p>
          </div>
        ))}
      </div>

      <div className="relative mt-3 flex items-center gap-1 text-[11px] font-semibold"
        style={{ color: `hsl(${ECELL})` }}>
        <Timer className="h-3 w-3" /> Starts soon · tap to view
        <ArrowRight className="h-3 w-3 ml-auto group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

/* ─── Quick action tile ───────────────────────────────────── */
interface TileProps {
  to: string;
  icon: typeof Rocket;
  title: string;
  desc: string;
  badge?: string;
  delay?: number;
}

function EcellTile({ to, icon: Icon, title, desc, badge, delay = 0 }: TileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
    >
      <Link
        to={to}
        className={cn(
          "group relative flex h-full overflow-hidden rounded-xl border border-border bg-card p-3.5",
          "transition-all duration-200 active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-lg",
        )}
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div
          className="absolute inset-0 opacity-100 transition-opacity pointer-events-none"
          style={{
            background: `radial-gradient(120% 80% at 0% 0%, hsl(${ECELL} / 0.10), transparent 55%)`,
          }}
        />
        <div className="flex items-start gap-3 w-full">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
            style={{
              background: `linear-gradient(135deg, hsl(${ECELL} / 0.18), hsl(${ECELL_DEEP} / 0.12))`,
              boxShadow: `inset 0 0 0 1px hsl(${ECELL} / 0.28)`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color: `hsl(${ECELL})` }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[14px] font-semibold text-foreground truncate">
                {title}
              </h3>
              {badge ? (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                  style={{
                    color: `hsl(${ECELL})`,
                    background: `hsl(${ECELL} / 0.14)`,
                  }}
                >
                  {badge}
                </span>
              ) : (
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground/50 group-hover:translate-x-0.5 transition-transform"
                  style={{ color: undefined }}
                />
              )}
            </div>
            <p className="text-[12px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
              {desc}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function StudentEcellHub() {
  const ecellQuery = useQuery({
    queryKey: ["ecell", "hub", "v3"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("events")
        .select("id,title,event_date,event_time,venue,is_featured,is_ecell_event,max_stalls")
        .or("is_ecell_event.eq.true,max_stalls.not.is.null")
        .gte("event_date", today)
        .order("event_date", { ascending: true });
      // Fail loudly — a broken read must never masquerade as "no events".
      if (error) throw new Error(error.message);
      const list = (data ?? []) as (NextEvent & {
        is_featured?: boolean;
        is_ecell_event?: boolean;
        max_stalls?: number | null;
      })[];
      const featured =
        list.find((e) => e.is_ecell_event) ??
        list.find((e) => e.is_featured) ??
        list.find((e) => e.max_stalls != null) ??
        list[0];
      return {
        featured,
        openEvents: list.length,
        stallEvents: list.filter((e) => e.max_stalls != null).length,
      };
    },
    staleTime: 60_000,
    retry: 1,
  });

  const nextEvent = ecellQuery.data?.featured;
  const openEvents = ecellQuery.data?.openEvents ?? 0;
  const stallCount = ecellQuery.data?.stallEvents ?? 0;


  return (
    <div className="min-h-full px-3.5 sm:px-5 py-3 sm:py-5 space-y-4 max-w-3xl mx-auto pb-8">
      {/* ── Hero Banner ─────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{
          background: `
            radial-gradient(80% 120% at 100% 0%, hsl(${ECELL_ACCENT} / 0.25), transparent 60%),
            linear-gradient(135deg, hsl(265 65% 16%), hsl(245 70% 12%))
          `,
          borderColor: `hsl(${ECELL} / 0.32)`,
          boxShadow: `0 4px 20px -8px hsl(${ECELL} / 0.40)`,
        }}
      >
        {/* Glow particles */}
        <motion.div
          aria-hidden
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -right-16 h-52 w-52 rounded-full blur-3xl pointer-events-none"
          style={{ background: `hsl(${ECELL} / 0.40)` }}
        />
        <motion.div
          aria-hidden
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full blur-3xl pointer-events-none"
          style={{ background: `hsl(${ECELL_ACCENT} / 0.35)` }}
        />
        {/* Tiny sparkles */}
        {[
          { top: "20%", left: "75%", d: 0 },
          { top: "60%", left: "12%", d: 0.7 },
          { top: "35%", left: "55%", d: 1.3 },
        ].map((p, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute h-1 w-1 rounded-full pointer-events-none"
            style={{ top: p.top, left: p.left, background: `hsl(${ECELL_ACCENT})`, boxShadow: `0 0 8px hsl(${ECELL_ACCENT})` }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.4, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, delay: p.d }}
          />
        ))}

        <div className="relative flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: -8, scale: 1.05 }}
            className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
            style={{
              background: `linear-gradient(135deg, hsl(${ECELL}), hsl(${ECELL_ACCENT}))`,
              boxShadow: `0 8px 28px -6px hsl(${ECELL} / 0.7)`,
            }}
          >
            <Rocket className="h-6 w-6 text-action-primary-foreground" />
          </motion.div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-action-primary-foreground/80">
              Entrepreneurship Cell
            </p>
            <h1 className="text-[22px] font-bold text-action-primary-foreground leading-tight tracking-tight mt-0.5">
              Build. Compete. Grow.
            </h1>
          </div>
        </div>

        <p className="relative mt-3 text-[13px] text-action-primary-foreground/85 leading-relaxed max-w-xl">
          Your launchpad on campus — discover events, register a stall, and
          earn points for the work you ship.
        </p>

        {/* Quick stats */}
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          {[
            { l: "Open Events", v: ecellQuery.isError ? "!" : openEvents },
            { l: "Stalls Open", v: ecellQuery.isError ? "!" : stallCount },
            { l: "Vibe", v: "🚀" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-lg border border-action-primary-foreground/20 bg-action-primary-foreground/10 px-2 py-2 text-center"
            >
              <p className="text-[14px] font-black text-action-primary-foreground leading-none tabular-nums">
                {s.v}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-action-primary-foreground/75 mt-1">
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Load failure (never silently shown as "empty") ──── */}
      {ecellQuery.isError && (
        <QueryErrorState
          title="Couldn't load E-Cell events"
          error={ecellQuery.error}
          onRetry={() => ecellQuery.refetch()}
          isRetrying={ecellQuery.isFetching}
        />
      )}

      {/* ── Featured countdown ─────────────────────────────── */}
      {nextEvent && <FeaturedCountdown event={nextEvent} />}

      {/* ── Genuine empty state ────────────────────────────── */}
      {!ecellQuery.isLoading && !ecellQuery.isError && openEvents === 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-[13px] font-semibold text-foreground">No E-Cell events yet</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            When your college publishes an E-Cell event, it will appear here.
          </p>
        </div>
      )}


      {/* ── Quick Tiles (3) ────────────────────────────────── */}
      <section className="grid gap-2.5 sm:grid-cols-3">
        <EcellTile
          to="/app/events"
          icon={CalendarDays}
          title="Events"
          desc="Pitches, demos & meetups"
          delay={0.05}
        />
        <EcellTile
          to="/app/ecell/stalls"
          icon={Store}
          title="Stall Registration"
          desc="Apply to host a stall"
          badge={stallCount ? "Open" : undefined}
          delay={0.1}
        />
        <EcellTile
          to="/app/points"
          icon={Coins}
          title="Points & Rewards"
          desc="Submit work, earn recognition"
          delay={0.15}
        />
      </section>

      {/* ── Footer micro-note ─────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70 pt-2">
        <Sparkles className="h-3 w-3" style={{ color: `hsl(${ECELL})` }} />
        Focused. No noise. Just what you need to ship.
      </div>
    </div>
  );
}
