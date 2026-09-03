import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  CalendarDays,
  Sparkles,
  Rocket,
  Coins,
  ArrowRight,
  Clock,
  MapPin,
  RefreshCw,
  AlertCircle,
  Megaphone,
  CheckCircle2,
  Users,
  Lightbulb,
  Award,
  ChevronRight,
} from "@/components/icons";
import { format, isPast, isToday, differenceInSeconds } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { ECELL_ASSETS } from "./ecell-tokens";
import { ECellHero } from "./components/ECellHero";
import { ECellStatCard } from "./components/ECellStatCard";
import { ECellEventCard, ECellEventItem } from "./components/ECellEventCard";
import { ECellSectionHeader } from "./components/ECellSectionHeader";
import { ECellAnnouncementCard, ECellAnnouncementItem } from "./components/ECellAnnouncementCard";
import { ECellTeamSection } from "./components/ECellTeamSection";
import { ECellEmptyState } from "./components/ECellEmptyState";
import StallRegistrationDialog from "@/pages/student/events/StallRegistrationDialog";
import { cn } from "@/lib/utils";

type EventTab = "upcoming" | "all" | "past";

/* ── Live Countdown Component for Next Event ───────────────────── */
function NextEventCountdown({ event }: { event: ECellEventItem }) {
  const targetDate = useMemo(() => {
    const d = new Date(event.event_date);
    if (event.event_time) {
      const [hours, minutes] = event.event_time.split(":");
      d.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
    }
    return d;
  }, [event]);

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    function calculate() {
      const now = new Date();
      const diff = differenceInSeconds(targetDate, now);
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setTimeLeft({ days, hours, minutes, seconds });
    }

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#E8D98A] dark:border-[#3D3523] bg-gradient-to-r from-white via-[#FAF9F7] to-[#FCE541]/15 dark:from-[#191713] dark:via-[#1D1B17] dark:to-[#2A2417] p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-lg">
          <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FCE541] text-[#000000] border border-[#C08634]/40">
            <Clock className="h-3 w-3" /> Next Official E-Cell Gathering
          </div>
          <h3 className="text-[16px] sm:text-[18px] font-bold text-foreground">
            {event.title}
          </h3>
          <p className="text-[12px] text-[#593018] dark:text-[#D8C7A5] flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-[#C08634]" />
            {format(targetDate, "EEEE, dd MMMM yyyy")}
            {event.venue && (
              <>
                <span>•</span>
                <MapPin className="h-3.5 w-3.5 text-[#C08634]" />
                {event.venue}
              </>
            )}
          </p>
        </div>

        {/* Countdown Digits */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-stretch md:self-auto justify-center">
          {[
            { label: "Days", val: timeLeft.days },
            { label: "Hours", val: timeLeft.hours },
            { label: "Mins", val: timeLeft.minutes },
            { label: "Secs", val: timeLeft.seconds },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center justify-center min-w-[54px] sm:min-w-[62px] px-2 py-1.5 rounded-xl bg-white dark:bg-[#151410] border border-[#E8D98A]/70 dark:border-[#3D3523] shadow-sm"
            >
              <span className="text-[18px] sm:text-[22px] font-black text-[#000000] dark:text-[#FCE541] tabular-nums leading-none">
                {String(item.val).padStart(2, "0")}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#593018]/80 dark:text-muted-foreground mt-1">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────── */
export default function StudentEcellHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [eventTab, setEventTab] = useState<EventTab>("upcoming");

  /* ── 1. Fetch E-Cell Events from Supabase ─────────────────────── */
  const eventsQuery = useQuery({
    queryKey: ["ecell", "events", "v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id,title,description,event_date,event_time,venue,poster_url,flyer_url,is_featured,is_ecell_event,max_stalls"
        )
        .or("is_ecell_event.eq.true,max_stalls.not.is.null")
        .order("event_date", { ascending: true });

      if (error) throw error;
      return (data ?? []) as ECellEventItem[];
    },
    staleTime: 60_000,
  });

  /* ── 2. Fetch User Stall Registrations ───────────────────────── */
  const userStallsQuery = useQuery({
    queryKey: ["ecell", "user_stalls", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("stall_registrations")
        .select("id,event_id,status,stall_name,product_category,created_at")
        .eq("user_id", user.id);

      if (error) {
        // Table might not exist or error; return empty array safely
        return [];
      }
      return data ?? [];
    },
    staleTime: 60_000,
  });

  /* ── 3. Fetch E-Cell Announcements ───────────────────────────── */
  const announcementsQuery = useQuery({
    queryKey: ["ecell", "announcements", "v1"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,description,priority,is_pinned,created_at,expires_at")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data ?? []) as ECellAnnouncementItem[];
    },
    staleTime: 60_000,
  });

  const events = eventsQuery.data ?? [];
  const announcements = announcementsQuery.data ?? [];
  const userStalls = userStallsQuery.data ?? [];

  /* ── Computed Metrics & Buckets ──────────────────────────────── */
  const { upcomingEvents, pastEvents, stallOpportunities, nextUpcoming } =
    useMemo(() => {
      const now = new Date();
      const upcoming: ECellEventItem[] = [];
      const past: ECellEventItem[] = [];
      let stalls = 0;

      events.forEach((ev) => {
        const evDate = new Date(ev.event_date);
        const isEvPast = isPast(evDate) && !isToday(evDate);

        if (isEvPast) {
          past.push(ev);
        } else {
          upcoming.push(ev);
          if (ev.max_stalls && ev.max_stalls > 0) {
            stalls += 1;
          }
        }
      });

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
      {/* ── Top Header Bar with Official E-Cell Brand ─────────────── */}
      <div className="sticky top-0 z-20 border-b border-[#E8D98A]/60 dark:border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full overflow-hidden border border-[#E8D98A] bg-white p-0.5 shrink-0 shadow-sm">
              <img
                src={ECELL_ASSETS.logo}
                alt="E-Cell Official Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-[14px] sm:text-[15px] font-black uppercase tracking-wider text-foreground truncate">
                Entrepreneurship Cell
              </h1>
              <p className="text-[10.5px] font-medium text-[#C08634] dark:text-[#FAD943] truncate leading-none">
                BKBNC • Vision to Venture
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/app/ecell/stalls"
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-[#000000]",
                "bg-[#FCE541] hover:bg-[#FAD943] border border-[#C08634]/40 shadow-xs transition-all active:scale-95"
              )}
            >
              <Store className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Stalls Portal</span>
              <span className="sm:hidden">Stalls</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                eventsQuery.refetch();
                announcementsQuery.refetch();
                userStallsQuery.refetch();
              }}
              title="Refresh E-Cell data"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8D98A] dark:border-border bg-card text-[#593018] dark:text-muted-foreground hover:text-foreground transition-colors"
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7 sm:space-y-9">
        {/* ── 1. Official Hero Section ────────────────────────────── */}
        <ECellHero stallCount={stallOpportunities} />

        {/* ── 2. Key Statistics Row ───────────────────────────────── */}
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
            subtext={
              userStalls.length > 0 ? "Registered applications" : "No active stalls"
            }
            icon={CheckCircle2}
          />
          <ECellStatCard
            label="Innovation Ideas"
            value="Active"
            subtext="Earn points on proposal"
            icon={Coins}
          />
        </div>

        {/* ── 3. Next Upcoming Event Countdown (if exists) ───────── */}
        {nextUpcoming && <NextEventCountdown event={nextUpcoming} />}

        {/* ── 4. Dedicated Stall Gateway Banner ───────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-[#E8D98A] dark:border-[#3D3523] bg-white dark:bg-[#191713] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FCE541]/20 text-[#593018] dark:text-[#FCE541] border border-[#FCE541]/40">
                <Store className="h-3 w-3 text-[#C08634]" /> Student Entrepreneur Marketplace
              </div>
              <h3 className="text-[17px] sm:text-[19px] font-extrabold text-[#000000] dark:text-white">
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
                  "bg-[#FCE541] hover:bg-[#FAD943] border border-[#C08634]/50 shadow-sm transition-all active:scale-95"
                )}
              >
                <Store className="h-4 w-4" />
                View Stall Openings
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── 5. Events Workspace ─────────────────────────────────── */}
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

        {/* ── 6. Announcements & Official Bulletins ──────────────── */}
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

        {/* ── 7. Core E-Cell Pathways (Vision to Venture) ─────────── */}
        <section className="space-y-4">
          <ECellSectionHeader
            title="The Vision to Venture Journey"
            subtitle="From initial concept to full-scale entrepreneurial impact"
            icon={Lightbulb}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              {
                step: "01",
                name: "Ideas & Ideation",
                desc: "Pitch concepts, get early validation from faculty mentors, and claim activity points.",
                actionText: "Submit Idea",
                link: "/app/points",
                icon: Lightbulb,
              },
              {
                step: "02",
                name: "Hands-on Workshops",
                desc: "Learn finance, business model canvasing, pitching, and IP creation from startup founders.",
                actionText: "View Schedule",
                link: "/app/events",
                icon: Users,
              },
              {
                step: "03",
                name: "Campus Stalls",
                desc: "Test products in real-world retail settings with peer validation and footfall.",
                actionText: "Register Stall",
                link: "/app/ecell/stalls",
                icon: Store,
              },
              {
                step: "04",
                name: "Impact & Awards",
                desc: "Gain recognition, certificate points, and incubation opportunities for your venture.",
                actionText: "Leaderboard",
                link: "/app/points",
                icon: Award,
              },
            ].map((pathway) => {
              const Icon = pathway.icon;
              return (
                <div
                  key={pathway.step}
                  className="flex flex-col justify-between rounded-2xl border border-[#E8D98A]/60 dark:border-[#3D3523] bg-card p-4.5 sm:p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[#C08634] group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-black tracking-wider text-[#C08634] dark:text-[#FAD943]">
                        STEP {pathway.step}
                      </span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FCE541]/20 text-[#593018] dark:text-[#FCE541]">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <h4 className="text-[15px] font-bold text-[#000000] dark:text-white">
                      {pathway.name}
                    </h4>
                    <p className="text-[12px] text-[#593018]/85 dark:text-muted-foreground leading-relaxed">
                      {pathway.desc}
                    </p>
                  </div>

                  <Link
                    to={pathway.link}
                    className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#C08634] hover:text-[#593018] dark:hover:text-[#FCE541] mt-4 pt-2 border-t border-[#E8D98A]/30 group-hover:translate-x-0.5 transition-transform"
                  >
                    {pathway.actionText} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 8. Team & Leadership (Dynamic from core_team_members) ── */}
        <ECellTeamSection />

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
    </div>
  );
}
