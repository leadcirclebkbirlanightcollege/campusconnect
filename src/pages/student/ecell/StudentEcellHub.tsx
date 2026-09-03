/**
 * StudentEcellHub — Official E-Cell Ecosystem Workspace
 * B. K. Birla Night College, Kalyan
 *
 * Visual hierarchy:
 * 1. AppLayout header handles global sticky title (E-Cell / Entrepreneurship Cell • BKBNC)
 * 2. E-Cell Top Toolbar (non-sticky, eliminating ghost-text overlaps)
 * 3. E-Cell Hero & Philosophy Stepper (Ideas → Innovation → Entrepreneurship → Impact)
 * 4. Key Performance Stats
 * 5. The Vision to Venture Journey (4 progressive connected stages)
 * 6. Leadership & Core Team (Dynamic from core_team_members)
 * 7. Upcoming Activities & Competitions (with live countdown & stall actions)
 * 8. Announcements & Official Bulletins
 * 9. Campus Stall Marketplace Banner
 * 10. Official Brand Footer (Version 1.0.0)
 */

import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Rocket,
  Store,
  CalendarDays,
  Coins,
  Sparkles,
  Megaphone,
  ArrowRight,
  RefreshCw,
  Clock,
  AlertCircle,
  Users,
} from "@/components/icons";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { ECELL_ASSETS } from "./ecell-tokens";
import { ECellHero } from "./components/ECellHero";
import { ECellStatCard } from "./components/ECellStatCard";
import { ECellEventCard } from "./components/ECellEventCard";
import { ECellAnnouncementCard } from "./components/ECellAnnouncementCard";
import { ECellTeamSection } from "./components/ECellTeamSection";
import { ECellJourneySection } from "./components/ECellJourneySection";
import { ECellCommitteeDialog } from "./components/ECellCommitteeDialog";
import { ECellSectionHeader } from "./components/ECellSectionHeader";
import { ECellEmptyState } from "./components/ECellEmptyState";
import { cn } from "@/lib/utils";

interface EcellEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  venue: string | null;
  poster_url: string | null;
  flyer_url: string | null;
  is_featured: boolean | null;
  is_ecell_event: boolean | null;
  max_stalls: number | null;
}

interface EcellAnnouncement {
  id: string;
  title: string;
  description: string;
  priority: string | null;
  created_at: string;
}

export default function StudentEcellHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventTab, setEventTab] = useState<"upcoming" | "all" | "past">("upcoming");
  const [committeeOpen, setCommitteeOpen] = useState(false);

  /* ── 1. Fetch E-Cell Events ───────────────────────────────────── */
  const eventsQuery = useQuery({
    queryKey: ["ecell", "events", "v4"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id,title,description,event_date,event_time,venue,poster_url,flyer_url,is_featured,is_ecell_event,max_stalls"
        )
        .or("is_ecell_event.eq.true,max_stalls.not.is.null")
        .order("event_date", { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as EcellEvent[];
    },
    staleTime: 60_000,
    retry: 2,
  });

  /* ── 2. Fetch User's Stall Applications ───────────────────────── */
  const userStallsQuery = useQuery({
    queryKey: ["ecell", "user_stalls", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("stall_registrations")
        .select("id,event_id,status,stall_name,type,created_at")
        .eq("user_id", user.id);

      if (error) {
        return [];
      }
      return data ?? [];
    },
    staleTime: 60_000,
  });

  /* ── 3. Fetch Announcements ───────────────────────────────────── */
  const announcementsQuery = useQuery({
    queryKey: ["ecell", "announcements", "v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,description,priority,created_at")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) return [] as EcellAnnouncement[];
      return (data ?? []) as EcellAnnouncement[];
    },
    staleTime: 60_000,
  });

  const events = eventsQuery.data ?? [];
  const announcements = announcementsQuery.data ?? [];
  const userStalls = userStallsQuery.data ?? [];

  // Metrics computation
  const { upcomingEvents, pastEvents, stallOpportunities, nextUpcoming } =
    useMemo(() => {
      const now = new Date().toISOString().slice(0, 10);
      const upcoming: EcellEvent[] = [];
      const past: EcellEvent[] = [];
      let stalls = 0;

      for (const ev of events) {
        if (ev.event_date >= now) {
          upcoming.push(ev);
        } else {
          past.push(ev);
        }
        if (ev.max_stalls && ev.max_stalls > 0) {
          stalls += ev.max_stalls;
        }
      }

      return {
        upcomingEvents: upcoming,
        pastEvents: past,
        stallOpportunities: stalls,
        nextUpcoming: upcoming[0] || null,
      };
    }, [events]);

  const displayedEvents = useMemo(() => {
    if (eventTab === "upcoming") return upcomingEvents;
    if (eventTab === "past") return pastEvents;
    return events;
  }, [eventTab, upcomingEvents, pastEvents, events]);

  const isLoading = eventsQuery.isLoading;
  const isError = eventsQuery.isError;

  return (
    <div className="min-h-screen bg-[#FAF9F7]/70 dark:bg-background pb-16">
      {/* ── Top Non-Sticky Action Bar (Eliminating Ghost Text Overlap) ── */}
      <div className="border-b border-[#E8D98A]/50 dark:border-border/60 bg-white/80 dark:bg-[#181613]/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-full overflow-hidden border border-[#E8D98A] bg-white p-0.5 shrink-0 shadow-xs">
              <img
                src={ECELL_ASSETS.logo}
                alt="E-Cell Official Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[12px] font-black uppercase tracking-wider text-[#000000] dark:text-white truncate">
                Entrepreneurship Cell
              </span>
              <span className="hidden sm:inline text-[11px] text-[#C08634] dark:text-[#FAD943] ml-2 font-semibold">
                • BKBNC Vision to Venture
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCommitteeOpen(true)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-bold text-[#000000]",
                "bg-[#FAF9F7] dark:bg-[#1D1B17] hover:bg-[#FCE541] active:bg-[#C08634] active:text-white",
                "border border-[#E8D98A] hover:border-[#C08634] shadow-xs transition-all active:scale-95"
              )}
            >
              <Users className="h-3.5 w-3.5 text-[#593018]" />
              <span className="hidden sm:inline">Contact Volunteer</span>
              <span className="sm:hidden">Volunteer</span>
            </button>

            <Link
              to="/app/ecell/stalls"
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-bold text-[#000000]",
                "bg-[#FCE541] hover:bg-[#FAD943] active:bg-[#C08634] active:text-white",
                "border border-[#C08634]/40 shadow-xs transition-all active:scale-95"
              )}
            >
              <Store className="h-3.5 w-3.5" />
              <span>Stalls</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                eventsQuery.refetch();
                announcementsQuery.refetch();
                userStallsQuery.refetch();
              }}
              title="Refresh E-Cell data"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E8D98A] dark:border-border bg-card text-[#593018] dark:text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5",
                  (eventsQuery.isFetching || announcementsQuery.isFetching) &&
                    "animate-spin text-[#C08634]"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-7 sm:space-y-9">
        {/* ── 1. Official Hero Section ────────────────────────────── */}
        <ECellHero stallCount={stallOpportunities} />

        {/* ── 2. Key Performance Statistics ───────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <ECellStatCard
            label="Total Initiatives"
            value={events.length}
            subtext={`${upcomingEvents.length} upcoming or live`}
            icon={Rocket}
          />
          <ECellStatCard
            label="Stall Programs"
            value={stallOpportunities}
            subtext="Vendor slots available"
            icon={Store}
          />
          <ECellStatCard
            label="My Stall Bookings"
            value={userStalls.length}
            subtext="Applications recorded"
            icon={Store}
          />
          <ECellStatCard
            label="Innovation Ideas"
            value="Points"
            subtext="Submit work & redeem"
            icon={Coins}
          />
        </div>

        {/* ── 3. The Vision to Venture Journey ───────────────────── */}
        <ECellJourneySection />

        {/* ── 4. Leadership & Core Team (Dynamic from core_team_members) */}
        <ECellTeamSection onOpenCommittee={() => setCommitteeOpen(true)} />

        {/* ── 5. Next Event Countdown Pill (If upcoming) ─────────── */}
        {nextUpcoming && (
          <div className="rounded-2xl border border-[#E8D98A] dark:border-[#3D3523] bg-gradient-to-r from-white via-[#FAF9F7] to-[#FCE541]/20 dark:from-[#191713] dark:via-[#1D1B17] dark:to-[#2A2417] p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCE541] text-[#000000] border border-[#C08634]/40 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C08634] dark:text-[#FAD943]">
                    Next E-Cell Milestone
                  </span>
                  <h4 className="text-[14.5px] sm:text-[15.5px] font-bold text-foreground truncate">
                    {nextUpcoming.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-[12px] font-bold text-[#593018] dark:text-[#FAD943]">
                  {new Date(nextUpcoming.event_date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <Link
                  to="/app/ecell/stalls"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold bg-[#FCE541] hover:bg-[#FAD943] text-[#000000] border border-[#C08634]/50 shadow-xs transition-all"
                >
                  <Store className="h-3.5 w-3.5" /> Book Stall
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── 6. Events Workspace ─────────────────────────────────── */}
        <section className="space-y-4">
          <ECellSectionHeader
            title="E-Cell Events & Competitions"
            subtitle="Workshops, pitch days, hackathons, and campus expos"
            icon={CalendarDays}
            action={
              <div className="inline-flex items-center rounded-xl bg-[#FAF9F7] dark:bg-[#1D1B17] border border-[#E8D98A]/60 dark:border-[#3D3523] p-1">
                {(
                  [
                    { key: "upcoming", label: "Upcoming" },
                    { key: "all", label: "All Events" },
                    { key: "past", label: "Concluded" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setEventTab(tab.key)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[11.5px] font-bold transition-all",
                      eventTab === tab.key
                        ? "bg-[#FCE541] text-[#000000] shadow-xs"
                        : "text-[#593018] dark:text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            }
          />

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-72 rounded-2xl bg-card border border-[#E8D98A]/40 animate-pulse"
                />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-[14px] font-bold text-foreground">
                  Unable to load events
                </h4>
                <p className="text-[12px] text-muted-foreground">
                  An error occurred while connecting to the events registry.
                </p>
              </div>
              <button
                type="button"
                onClick={() => eventsQuery.refetch()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold bg-[#FCE541] text-[#000000] border border-[#C08634]/50 shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Try Again
              </button>
            </div>
          ) : displayedEvents.length === 0 ? (
            <ECellEmptyState
              title={
                eventTab === "upcoming"
                  ? "No upcoming E-Cell events scheduled yet"
                  : eventTab === "past"
                  ? "No past event records found"
                  : "No E-Cell events recorded"
              }
              description="Stay tuned for upcoming hackathons, speaker sessions, and entrepreneurship summits announced by the cell."
              actionText="Browse General Events"
              onAction={() => navigate("/app/events")}
              icon={CalendarDays}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedEvents.map((ev) => (
                <ECellEventCard key={ev.id} event={ev} />
              ))}
            </div>
          )}
        </section>

        {/* ── 7. Announcements & Official Bulletins ──────────────── */}
        <section className="space-y-4">
          <ECellSectionHeader
            title="Official Announcements & Notices"
            subtitle="Updates on competition registrations, results, and grant programs"
            icon={Megaphone}
            badge={announcements.length > 0 ? `${announcements.length} Notices` : undefined}
            action={
              <Link
                to="/app/inbox"
                className="inline-flex items-center gap-1 text-[12px] font-bold text-[#C08634] hover:text-[#593018] dark:hover:text-[#FCE541]"
              >
                Inbox <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />

          {announcementsQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl bg-card border border-[#E8D98A]/40 animate-pulse"
                />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="rounded-xl border border-[#E8D98A]/40 bg-card p-5 text-center">
              <p className="text-[12.5px] text-[#593018]/80 dark:text-muted-foreground">
                No active announcements at this time. All new bulletins will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {announcements.slice(0, 4).map((ann) => (
                <ECellAnnouncementCard key={ann.id} announcement={ann} />
              ))}
            </div>
          )}
        </section>

        {/* ── 8. Dedicated Stall Marketplace Banner ──────────────── */}
        <div className="rounded-2xl sm:rounded-3xl border-2 border-[#E8D98A] dark:border-[#3D3523] bg-gradient-to-r from-white via-[#FAF9F7] to-[#FCE541]/25 dark:from-[#191713] dark:via-[#1D1B17] dark:to-[#2A2417] p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FCE541] text-[#000000] border border-[#C08634]/40">
                <Store className="h-3 w-3" /> Student Vendor Program
              </div>
              <h3 className="text-[18px] sm:text-[20px] font-black text-[#000000] dark:text-white">
                Launch Your Campus Stall at College Events
              </h3>
              <p className="text-[12.5px] text-[#593018]/85 dark:text-muted-foreground leading-relaxed">
                Book a dedicated vendor table for food, handmade crafts, tech prototypes,
                or merchandise. Connect directly with the student body.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to="/app/ecell/stalls"
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-[#000000]",
                  "bg-[#FCE541] hover:bg-[#FAD943] active:bg-[#C08634] active:text-white",
                  "border border-[#C08634]/50 shadow-sm transition-all active:scale-95"
                )}
              >
                <Store className="h-4 w-4" />
                View Stall Openings
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── 9. Official Brand Footer & Version ─────────────────── */}
        <div className="pt-6 border-t border-[#E8D98A]/60 dark:border-[#3D3523] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full overflow-hidden border border-[#E8D98A] bg-white p-0.5">
              <img
                src={ECELL_ASSETS.logo}
                alt="E-Cell"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-[12px] font-bold text-[#000000] dark:text-white">
              Entrepreneurship Cell • B. K. Birla Night College, Kalyan
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11.5px] text-[#593018] dark:text-muted-foreground font-semibold">
            <span>&ldquo;Vision to Venture&rdquo;</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded-full bg-[#FCE541] text-[#000000] text-[10px] font-bold border border-[#E8D98A]">
              Version {ECELL_ASSETS.version}
            </span>
          </div>
        </div>
      </div>

      {/* ── Committee Directory Modal / Sheet ──────────────────────── */}
      <ECellCommitteeDialog
        open={committeeOpen}
        onOpenChange={setCommitteeOpen}
      />
    </div>
  );
}
