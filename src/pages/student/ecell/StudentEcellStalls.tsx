/**
 * Student E-Cell · Stall Registration Marketplace
 * B. K. Birla Night College, Kalyan — Entrepreneurship Cell
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Store, ArrowLeft, CalendarDays, MapPin, Clock, RefreshCw, AlertCircle, Sparkles } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import StallRegistrationDialog from "@/pages/student/events/StallRegistrationDialog";
import { ECELL_ASSETS } from "./ecell-tokens";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EcellEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  venue: string | null;
  max_stalls: number | null;
}

export default function StudentEcellStalls() {
  const stallsQuery = useQuery({
    queryKey: ["ecell_stall_events", "v3"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,event_date,event_time,venue,max_stalls,is_ecell_event")
        .or("is_ecell_event.eq.true,max_stalls.not.is.null")
        .gte("event_date", new Date().toISOString().slice(0, 10))
        .order("event_date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as EcellEvent[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const { data, isLoading } = stallsQuery;
  const events = data ?? [];

  return (
    <div className="min-h-screen bg-[#FAF9F7]/70 dark:bg-background pb-16">
      {/* ── Top Header Navigation ─────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-[#E8D98A]/60 dark:border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            to="/app/ecell"
            className="inline-flex items-center gap-2 text-[12.5px] font-bold text-[#593018] dark:text-[#D8C7A5] hover:text-[#000000] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-[#C08634]" />
            <span>Back to E-Cell Workspace</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full overflow-hidden border border-[#E8D98A] bg-white p-0.5">
              <img
                src={ECELL_ASSETS.logo}
                alt="E-Cell"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#C08634] dark:text-[#FAD943]">
              BKBNC
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* ── Hero Banner ────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-[#E8D98A] dark:border-[#3D3523] bg-gradient-to-br from-white via-[#FAF9F7] to-[#FCE541]/20 dark:from-[#191713] dark:via-[#1D1B17] dark:to-[#2A2417] p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FCE541] text-[#000000] border border-[#C08634]/40">
                <Store className="h-3 w-3" /> Campus Stall Program
              </div>
              <h1 className="text-[22px] sm:text-[26px] font-black text-[#000000] dark:text-white tracking-tight">
                Student Vendor Applications
              </h1>
              <p className="text-[13px] text-[#593018]/90 dark:text-muted-foreground leading-relaxed">
                Showcase your products, food items, handcrafted goods, or venture prototypes.
                Select an upcoming campus event below and submit your stall proposal.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-white dark:bg-[#1D1B17] p-2 border-2 border-[#E8D98A] shadow-sm">
                <img
                  src={ECELL_ASSETS.logo}
                  alt="E-Cell Logo"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Loading Skeleton ───────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-card border border-[#E8D98A]/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* ── Error State ────────────────────────────────────────── */}
        {stallsQuery.isError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-[14px] font-bold text-foreground">
                Unable to load stall events
              </h3>
              <p className="text-[12px] text-muted-foreground">
                {stallsQuery.error instanceof Error ? stallsQuery.error.message : "Connection failed"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => stallsQuery.refetch()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold bg-[#FCE541] text-[#000000] border border-[#C08634]/50 shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try Again
            </button>
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────── */}
        {!isLoading && !stallsQuery.isError && events.length === 0 && (
          <div className="rounded-2xl border border-[#E8D98A]/60 dark:border-[#3D3523] bg-card p-8 sm:p-10 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FCE541]/20 text-[#C08634] border border-[#E8D98A]">
              <Store className="h-6 w-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-[15px] font-bold text-foreground">
                No active stall openings right now
              </h3>
              <p className="text-[12.5px] text-[#593018]/85 dark:text-muted-foreground leading-relaxed">
                Stall registration windows open 1–2 weeks before major college festivals and E-Cell exhibitions.
                Check back soon or explore general campus events.
              </p>
            </div>
            <Link
              to="/app/events"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold bg-white dark:bg-[#1D1B17] text-[#000000] dark:text-white border border-[#E8D98A] shadow-sm hover:border-[#C08634] transition-all"
            >
              <CalendarDays className="h-3.5 w-3.5 text-[#C08634]" />
              Browse Campus Events
            </Link>
          </div>
        )}

        {/* ── Event List ─────────────────────────────────────────── */}
        <div className="space-y-3">
          {events.map((e) => {
            const evDate = new Date(e.event_date);
            return (
              <div
                key={e.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl border border-[#E8D98A]/60 dark:border-[#3D3523] bg-card p-4 sm:p-5",
                  "transition-all duration-200 hover:border-[#C08634] hover:shadow-md group"
                )}
                style={{
                  boxShadow: "0 2px 10px -2px rgba(192, 134, 52, 0.06)",
                }}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FCE541]/20 dark:bg-[#FCE541]/10 text-[#593018] dark:text-[#FCE541] border border-[#E8D98A]/60 shrink-0">
                    <Store className="h-6 w-6 text-[#C08634]" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] sm:text-[16px] font-bold text-foreground truncate group-hover:text-[#C08634] transition-colors">
                        {e.title}
                      </h3>
                      {e.max_stalls != null && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FCE541] text-[#000000] border border-[#C08634]/30">
                          Max {e.max_stalls} Stalls
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#593018]/85 dark:text-muted-foreground">
                      <span className="flex items-center gap-1 font-semibold text-[#000000] dark:text-white">
                        <CalendarDays className="h-3.5 w-3.5 text-[#C08634]" />
                        {format(evDate, "EEE, dd MMM yyyy")}
                      </span>
                      {e.event_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-[#C08634]" />
                          {e.event_time.slice(0, 5)}
                        </span>
                      )}
                      {e.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-[#C08634]" />
                          {e.venue}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8D98A]/30">
                  <StallRegistrationDialog
                    eventId={e.id}
                    eventTitle={e.title}
                    trigger={
                      <button
                        type="button"
                        className={cn(
                          "w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-bold text-[#000000]",
                          "bg-[#FCE541] hover:bg-[#FAD943] active:bg-[#C08634] active:text-white",
                          "border border-[#C08634]/50 shadow-sm transition-all active:scale-95"
                        )}
                      >
                        <Store className="h-3.5 w-3.5" />
                        Apply for Stall
                      </button>
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Version Footer ─────────────────────────────────────── */}
        <div className="pt-6 border-t border-[#E8D98A]/50 dark:border-[#3D3523] flex items-center justify-between text-[11.5px] text-[#593018] dark:text-muted-foreground">
          <span>Entrepreneurship Cell • BKBNC</span>
          <span className="px-2 py-0.5 rounded-full bg-[#FCE541] text-[#000000] text-[10px] font-bold border border-[#E8D98A]">
            Version {ECELL_ASSETS.version}
          </span>
        </div>
      </div>
    </div>
  );
}
