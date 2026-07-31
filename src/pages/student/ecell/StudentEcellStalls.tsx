/**
 * Student E-Cell · Stall Registration list
 *
 * Lists upcoming events that have a `max_stalls` cap (E-Cell flagged)
 * and lets the student open the existing StallRegistrationDialog.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Store, ArrowLeft, CalendarDays } from "lucide-react";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { supabase } from "@/integrations/supabase/client";
import StallRegistrationDialog from "@/pages/student/events/StallRegistrationDialog";

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
    queryKey: ["ecell_stall_events", "v2"],
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

  return (
    <div className="min-h-full px-4 py-4 space-y-4 max-w-3xl mx-auto">
      <Link
        to="/app/ecell"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to E-Cell
      </Link>

      <header className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{
            background: "linear-gradient(135deg, hsl(265 85% 65% / 0.18), hsl(262 80% 50% / 0.10))",
            boxShadow: "inset 0 0 0 1px hsl(265 85% 65% / 0.30)",
          }}
        >
          <Store className="h-5 w-5" style={{ color: "hsl(265 85% 70%)" }} />
        </div>
        <div>
          <h1 className="text-[18px] font-bold tracking-tight">Stall Registration</h1>
          <p className="text-[12px] text-muted-foreground">
            Pick an event and submit your stall application.
          </p>
        </div>
      </header>

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-surface-2 animate-pulse" />
          ))}
        </div>
      )}

      {stallsQuery.isError && (
        <QueryErrorState
          title="Couldn't load stall events"
          error={stallsQuery.error}
          onRetry={() => stallsQuery.refetch()}
          isRetrying={stallsQuery.isFetching}
        />
      )}

      {!isLoading && !stallsQuery.isError && (data?.length ?? 0) === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-[13px] text-muted-foreground">
            No events accepting stall registrations right now.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {data?.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-[hsl(265_85%_65%/0.35)] transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 shrink-0">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-foreground truncate">{e.title}</p>
              <p className="text-[11.5px] text-muted-foreground truncate">
                {new Date(e.event_date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                {e.event_time ? ` · ${e.event_time.slice(0, 5)}` : ""}
                {e.venue ? ` · ${e.venue}` : ""}
                {e.max_stalls != null && ` · max ${e.max_stalls} stalls`}
              </p>
            </div>
            <StallRegistrationDialog eventId={e.id} eventTitle={e.title} />
          </div>
        ))}
      </div>
    </div>
  );
}
