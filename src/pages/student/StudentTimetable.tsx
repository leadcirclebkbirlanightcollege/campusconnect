import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Clock, Calendar, BookOpen, MapPin } from "lucide-react";
import { isToday, getDay } from "date-fns";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const WORK_DAYS = [1, 2, 3, 4, 5, 6];

type Slot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  venue: string | null;
  faculty_name: string | null;
};

export default function StudentTimetable() {
  const { user } = useAuth();
  const todayDay = getDay(new Date());

  const { data: collegeId } = useQuery({
    queryKey: ["my_college_id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_college_id");
      return data as string | null;
    },
    staleTime: 120_000,
  });

  const { data: slots = [], isLoading } = useQuery<Slot[]>({
    queryKey: ["student", "timetable", collegeId],
    enabled: !!collegeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("timetable_slots")
        .select("id,day_of_week,start_time,end_time,subject,venue,faculty_name")
        .eq("college_id", collegeId!)
        .eq("is_active", true)
        .order("day_of_week")
        .order("start_time");
      return (data ?? []) as Slot[];
    },
    staleTime: 60_000,
  });

  const slotsByDay = useMemo(() => {
    return WORK_DAYS.reduce<Record<number, Slot[]>>((acc, d) => {
      acc[d] = slots.filter((s) => s.day_of_week === d);
      return acc;
    }, {});
  }, [slots]);

  const todaySlots = slotsByDay[todayDay] ?? [];

  return (
    <PageContainer className="space-y-5" noPadding>
      {/* Curved gradient hero */}
      <div className="relative overflow-hidden rounded-b-[32px] bg-gradient-to-br from-primary via-primary to-primary/80 px-5 pt-8 pb-14 text-primary-foreground">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_20%_10%,white,transparent_50%)]" aria-hidden />
        <div className="relative space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">Weekly schedule</p>
          <h1 className="font-heading text-[26px] font-black tracking-tight">Timetable</h1>
          <p className="text-[13px] opacity-85">Today — {DAYS[todayDay]} · {todaySlots.length} classes</p>
        </div>
      </div>

      <div className="px-4 -mt-8 space-y-5">
      {/* Today highlight */}
      <GlassCard hover={false} className="space-y-3 shadow-elevated">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Today — {DAYS[todayDay]}</span>
          <Badge variant="outline" className="text-[10px]">{todaySlots.length} classes</Badge>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : todaySlots.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No classes today 🎉</p>
        ) : (
          <div className="space-y-2">
            {todaySlots.map((slot) => (
              <div key={slot.id} className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{slot.subject}</p>
                  {slot.faculty_name && (
                    <p className="text-[11px] text-muted-foreground">{slot.faculty_name}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-medium text-primary">{slot.start_time.slice(0,5)}</p>
                  {slot.venue && <p className="text-[10px] text-muted-foreground">{slot.venue}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Full weekly view */}
      <div className="space-y-3">
        {WORK_DAYS.map((day) => {
          const daySlots = slotsByDay[day] ?? [];
          const isCurrentDay = day === todayDay;
          return (
            <GlassCard key={day} hover={false} className={isCurrentDay ? "border-primary/30" : ""}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                  isCurrentDay ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {DAYS[day].slice(0,3)}
                </div>
                <span className="text-sm font-semibold text-foreground">{DAYS[day]}</span>
                <Badge variant="secondary" className="text-[10px] ml-auto">{daySlots.length}</Badge>
              </div>
              {isLoading ? (
                <Skeleton className="h-10 rounded-lg" />
              ) : daySlots.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Free day</p>
              ) : (
                <div className="space-y-1.5">
                  {daySlots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-3 rounded-lg border border-border/30 bg-card/50 px-3 py-2">
                      <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{slot.subject}</p>
                        {slot.faculty_name && (
                          <p className="text-[10px] text-muted-foreground">{slot.faculty_name}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <p className="text-[11px] font-medium text-foreground">
                          <Clock className="h-3 w-3 inline mr-0.5" />
                          {slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}
                        </p>
                        {slot.venue && (
                          <p className="text-[10px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5 inline mr-0.5" />{slot.venue}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </PageContainer>
  );
}
