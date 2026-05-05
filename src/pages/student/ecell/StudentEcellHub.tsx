/**
 * Student E-Cell Hub
 *
 * Focused, premium landing for the Entrepreneurship Cell module.
 * Visual identity: deep purple/indigo accents to differentiate from
 * the rest of the campus app (which uses blue primary).
 *
 * Sections:
 *   1. Banner — "Entrepreneurship Cell · Build. Compete. Grow."
 *   2. Quick tiles → Events / Stalls / Points
 *   3. Inline previews (events list + points action)
 */
import { Link } from "react-router-dom";
import { Rocket, CalendarDays, Store, Coins, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ECELL_PURPLE = "265 85% 65%";

interface TileProps {
  to: string;
  icon: typeof Rocket;
  title: string;
  desc: string;
}

function EcellTile({ to, icon: Icon, title, desc }: TileProps) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-4",
        "transition-all duration-base hover:-translate-y-0.5 hover:shadow-lg",
        "hover:border-[hsl(265_85%_65%/0.4)]",
      )}
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-base pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at 0% 0%, hsl(${ECELL_PURPLE} / 0.08), transparent 40%)`,
        }}
      />
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
          style={{
            background: `linear-gradient(135deg, hsl(${ECELL_PURPLE} / 0.15), hsl(262 80% 50% / 0.10))`,
            boxShadow: `inset 0 0 0 1px hsl(${ECELL_PURPLE} / 0.25)`,
          }}
        >
          <Icon className="h-5 w-5" style={{ color: `hsl(${ECELL_PURPLE})` }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-foreground truncate">{title}</h3>
            <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-[hsl(265_85%_70%)] group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[12.5px] text-muted-foreground leading-snug mt-0.5">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

export default function StudentEcellHub() {
  return (
    <div className="min-h-full px-4 py-4 space-y-5 max-w-3xl mx-auto">
      {/* ── Banner ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6 border"
        style={{
          background: `linear-gradient(135deg, hsl(265 65% 18%), hsl(245 70% 14%))`,
          borderColor: `hsl(${ECELL_PURPLE} / 0.30)`,
          boxShadow: `0 12px 40px -12px hsl(${ECELL_PURPLE} / 0.45)`,
        }}
      >
        {/* Glow */}
        <div
          aria-hidden
          className="absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl pointer-events-none"
          style={{ background: `hsl(${ECELL_PURPLE} / 0.35)` }}
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full blur-3xl pointer-events-none"
          style={{ background: `hsl(280 80% 55% / 0.25)` }}
        />

        <div className="relative flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
            style={{
              background: `linear-gradient(135deg, hsl(${ECELL_PURPLE}), hsl(280 80% 55%))`,
              boxShadow: `0 8px 24px -6px hsl(${ECELL_PURPLE} / 0.7)`,
            }}
          >
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
              Entrepreneurship Cell
            </p>
            <h1 className="text-[20px] sm:text-[22px] font-bold text-white leading-tight tracking-tight mt-0.5">
              Build. Compete. Grow.
            </h1>
          </div>
        </div>

        <p className="relative mt-3 text-[13px] text-white/70 leading-relaxed max-w-xl">
          Your launchpad on campus — discover E-Cell events, register a stall,
          and claim points for the work you ship.
        </p>
      </section>

      {/* ── Quick Tiles ───────────────────────────────────────── */}
      <section className="grid gap-2.5 sm:grid-cols-3">
        <EcellTile
          to="/app/events"
          icon={CalendarDays}
          title="Events"
          desc="Upcoming pitches, demos & meetups"
        />
        <EcellTile
          to="/app/ecell/stalls"
          icon={Store}
          title="Stall Registration"
          desc="Apply to host a stall at events"
        />
        <EcellTile
          to="/app/points"
          icon={Coins}
          title="Points & Claims"
          desc="Submit work, earn recognition"
        />
      </section>

      {/* ── Footer note ───────────────────────────────────────── */}
      <p className="text-[11px] text-muted-foreground/70 text-center pt-2">
        E-Cell is a focused module — no extra noise, just what you need to ship.
      </p>
    </div>
  );
}
