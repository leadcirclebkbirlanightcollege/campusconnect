import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { PageContainer } from "@/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumEmpty } from "@/components/ui/premium-empty";
import ShareButton from "@/components/share/ShareButton";
import StallRegistrationDialog from "@/pages/student/events/StallRegistrationDialog";
import { useShareMeta } from "@/hooks/use-share-meta";
import { format, isPast, isToday } from "date-fns";
import {
  CalendarDays,
  Clock,
  MapPin,
  ArrowLeft,
  Rocket,
  Sparkles,
  Store,
  Building2,
  CalendarPlus,
  LogIn,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { normalizeFlyerUrl } from "@/lib/crop-image";

type EventRecord = {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  event_date: string;
  event_time: string;
  poster_url: string | null;
  flyer_url: string | null;
  full_flyer_url: string | null;
  college_id: string | null;
  whatsapp_group_link: string | null;
  is_featured: boolean | null;
  is_ecell_event: boolean | null;
  max_stalls: number | null;
  created_at: string;
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: event, isLoading, isError } = useQuery<EventRecord | null>({
    queryKey: ["event", "detail", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("events")
        .select(
          "id,title,description,venue,event_date,event_time,poster_url,flyer_url,full_flyer_url,college_id,whatsapp_group_link,is_featured,is_ecell_event,max_stalls,created_at"
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        return null;
      }
      return data as EventRecord | null;
    },
    staleTime: 60_000,
  });

  // College name lookup
  const { data: college } = useQuery({
    queryKey: ["college", event?.college_id],
    enabled: Boolean(event?.college_id),
    queryFn: async () => {
      if (!event?.college_id) return null;
      const { data } = await supabase
        .from("colleges")
        .select("id,college_name,subdomain")
        .eq("id", event.college_id)
        .maybeSingle();
      return data;
    },
    staleTime: 300_000,
  });

  const rawFlyer =
    event?.full_flyer_url || event?.flyer_url || event?.poster_url || null;
  const flyerImage = normalizeFlyerUrl(rawFlyer);

  useShareMeta({
    title: event?.title || "Campus Event",
    description:
      event?.description || "Join us on Campus Connect for this upcoming event.",
    imageUrl: flyerImage,
    canonicalPath: id ? `/events/${id}` : "/events",
  });

  const eventDay = useMemo(() => {
    if (!event?.event_date) return null;
    return new Date(event.event_date + "T00:00:00");
  }, [event?.event_date]);

  const isTodayEvent = eventDay ? isToday(eventDay) : false;
  const isPastEvent = eventDay ? isPast(eventDay) && !isTodayEvent : false;

  // Add to Calendar helper
  const handleAddToCalendar = () => {
    if (!event || !eventDay) return;
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || "");
    const location = encodeURIComponent(event.venue || "");
    const dateFormatted = event.event_date.replace(/-/g, "");
    const timeParts = event.event_time.replace(/[^0-9:]/g, "").split(":");
    const hours = (timeParts[0] || "10").padStart(2, "0");
    const minutes = (timeParts[1] || "00").padStart(2, "0");
    const startIso = `${dateFormatted}T${hours}${minutes}00`;
    const endIso = `${dateFormatted}T${(parseInt(hours, 10) + 2).toString().padStart(2, "0")}${minutes}00`;

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
    window.open(gcalUrl, "_blank", "noopener,noreferrer");
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app/events");
    }
  };

  if (isLoading) {
    return (
      <PageContainer className="py-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-6 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-96 w-full rounded-3xl" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4 rounded-xl" />
          <Skeleton className="h-4 w-1/2 rounded-lg" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !event) {
    return (
      <PageContainer className="py-12 max-w-2xl mx-auto text-center space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-2 mb-4 self-start"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <PremiumEmpty
          art="events"
          tone="primary"
          title="Event Not Found"
          description="This event may have been removed or the link might be incorrect. Explore other ongoing campus events."
        />
        <div className="pt-2 flex justify-center gap-3">
          <Button onClick={() => navigate("/app/events")} className="rounded-xl">
            Browse Campus Events
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="rounded-xl"
          >
            Go to Home
          </Button>
        </div>
      </PageContainer>
    );
  }

  const collegeDisplayName =
    college?.college_name || "B. K. Birla Night College, Kalyan";

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Top sticky app bar with subtle scroll-based glassmorphism */}
      <header
        className={cn(
          "sticky top-0 z-30 transition-all duration-300",
          isScrolled
            ? "border-b border-border-subtle/80 bg-background/80 backdrop-blur-xl shadow-xs"
            : "border-b border-border-subtle/40 bg-background/60 backdrop-blur-sm"
        )}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1.5 rounded-xl font-medium text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Events</span>
          </Button>

          <div className="flex-1 min-w-0 px-2 text-center transition-opacity duration-300">
            {isScrolled && (
              <p className="text-xs font-bold text-foreground truncate animate-fade-in">
                {event.title}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ShareButton
              title={event.title}
              description={
                event.description || `Join ${event.title} on Campus Connect`
              }
              url={`/events/${event.id}`}
              entityType="event"
              imageUrl={flyerImage}
              variant="outline"
              size="sm"
              className="rounded-xl font-semibold shadow-xs"
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* Badges strip on top */}
        <div className="flex flex-wrap items-center gap-2">
          {event.is_featured && (
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1 shadow-xs text-xs">
              <Sparkles className="h-3 w-3" /> Featured
            </Badge>
          )}
          {event.is_ecell_event && (
            <Badge className="bg-[#FCE541] text-black hover:bg-[#FAD943] border border-[#C08634]/40 font-bold gap-1 shadow-xs text-xs">
              <Rocket className="h-3 w-3 text-black" /> E-Cell Initiative
            </Badge>
          )}
          {isTodayEvent && (
            <Badge className="bg-success text-success-foreground font-bold shadow-xs text-xs">
              Happening Today
            </Badge>
          )}
          {isPastEvent && (
            <Badge
              variant="secondary"
              className="font-semibold text-xs bg-surface-2"
            >
              Completed
            </Badge>
          )}
          {!isTodayEvent && !isPastEvent && (
            <Badge
              variant="outline"
              className="font-semibold text-xs border-primary/30 text-primary"
            >
              Upcoming Event
            </Badge>
          )}
        </div>

        {/* Complete Event Flyer Container (Original aspect ratio, completely visible, uncropped) */}
        {flyerImage ? (
          <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-surface-1/60 dark:bg-neutral-950 p-2 sm:p-4 shadow-sm flex items-center justify-center">
            <img
              src={flyerImage}
              alt={`${event.title} flyer`}
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
              loading="eager"
            />
          </div>
        ) : (
          <div className="w-full h-44 sm:h-56 rounded-3xl border border-border-subtle bg-gradient-to-br from-primary/20 via-surface-2 to-premium/20 flex flex-col items-center justify-center text-primary/70 p-6 text-center shadow-card">
            <CalendarDays className="h-16 w-16 mb-2 stroke-1" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Official Campus Event
            </p>
          </div>
        )}

        {/* Content & Metadata */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
              {event.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{collegeDisplayName}</span>
            </p>
          </div>

          {/* Quick Schedule Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border-subtle bg-surface-1 shadow-card">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </p>
                <p className="text-sm font-bold text-foreground">
                  {eventDay
                    ? format(eventDay, "EEEE, d MMMM yyyy")
                    : event.event_date}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border-subtle bg-surface-1 shadow-card">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Time
                </p>
                <p className="text-sm font-bold text-foreground">
                  {event.event_time}
                </p>
              </div>
            </div>

            {event.venue && (
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border-subtle bg-surface-1 shadow-card sm:col-span-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Venue
                  </p>
                  <p className="text-sm font-bold text-foreground truncate">
                    {event.venue}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {event.max_stalls != null && !isPastEvent && (
              <StallRegistrationDialog
                eventId={event.id}
                eventTitle={event.title}
                eventDate={event.event_date}
                collegeName={collegeDisplayName}
                whatsappGroupLink={event.whatsapp_group_link}
                trigger={
                  <Button className="rounded-xl gap-2 font-bold px-5 bg-gradient-to-r from-[#FCE541] to-[#FAD943] text-black hover:brightness-105 shadow-md">
                    <Store className="h-4 w-4 text-black" />
                    Register Stall ({event.max_stalls} available)
                  </Button>
                }
              />
            )}

            <Button
              variant="outline"
              onClick={handleAddToCalendar}
              className="rounded-xl gap-2 font-semibold"
            >
              <CalendarPlus className="h-4 w-4 text-primary" />
              Add to Google Calendar
            </Button>

            <ShareButton
              title={event.title}
              description={event.description}
              url={`/events/${event.id}`}
              entityType="event"
              imageUrl={flyerImage}
              variant="secondary"
              className="rounded-xl font-semibold gap-2"
              text="Share Event"
            />
          </div>

          {/* Description */}
          {event.description && (
            <div className="space-y-3 rounded-3xl border border-border-subtle bg-surface-1 p-5 sm:p-6 shadow-card">
              <h2 className="text-base font-bold text-foreground">
                About This Event
              </h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {event.description}
              </div>
            </div>
          )}

          {/* Unauthenticated CTA Banner if visitor is not logged in */}
          {!user && (
            <div className="rounded-3xl border border-primary/25 bg-gradient-to-r from-primary/10 via-surface-1 to-premium/10 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-card">
              <div className="space-y-1 text-center sm:text-left">
                <p className="font-bold text-foreground text-base">
                  Are you a student or faculty member?
                </p>
                <p className="text-xs text-muted-foreground">
                  Sign in to Campus Connect to participate, register stalls,
                  track attendance and earn points.
                </p>
              </div>
              <Button
                onClick={() =>
                  navigate(
                    `/auth?redirect=${encodeURIComponent(`/events/${event.id}`)}`
                  )
                }
                className="rounded-xl gap-2 font-bold shrink-0 px-6"
              >
                <LogIn className="h-4 w-4" />
                Sign In to Campus
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
