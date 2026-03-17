import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { format, startOfWeek, addDays, isToday, isSameDay } from "date-fns";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function FacultySchedule() {
  const { user } = useAuth();

  const { data: lectures = [], isLoading } = useQuery({
    queryKey: ["faculty", "schedule", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const start = format(startOfWeek(new Date()), "yyyy-MM-dd");
      const end   = format(addDays(startOfWeek(new Date()), 13), "yyyy-MM-dd");
      const { data } = await supabase
        .from("lectures")
        .select("id,topic,venue,lecture_date,start_time,end_time,status")
        .eq("created_by", user!.id)
        .gte("lecture_date", start)
        .lte("lecture_date", end)
        .order("lecture_date")
        .order("start_time");
      return data ?? [];
    },
  });

  const weekStart = startOfWeek(new Date());
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const lecturesByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    lectures.forEach((l) => {
      const key = l.lecture_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });
    return map;
  }, [lectures]);

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-[20px] font-bold text-foreground">Schedule</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">Week of {format(weekStart, "MMM d, yyyy")}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => {
            const key   = format(day, "yyyy-MM-dd");
            const items = lecturesByDay.get(key) ?? [];
            const today = isToday(day);
            return (
              <div key={key} className={`rounded-xl border p-2 min-h-[120px] ${today ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card"}`}>
                <div className="text-center mb-2">
                  <p className="text-[10px] text-muted-foreground font-medium">{DAYS[day.getDay()]}</p>
                  <p className={`text-[14px] font-bold ${today ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</p>
                </div>
                <div className="space-y-1">
                  {items.map((l) => (
                    <div key={l.id} className={`rounded-md px-1.5 py-1 text-[9px] font-medium truncate ${
                      l.status === "live" ? "bg-green-500/15 text-green-700" :
                      l.status === "ended" ? "bg-muted/60 text-muted-foreground" :
                      "bg-primary/10 text-primary"
                    }`}>
                      {l.start_time.slice(0, 5)} {l.topic}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Next week preview */}
      <div className="pt-4">
        <p className="text-[13px] font-semibold text-foreground mb-2">Next Week</p>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i + 7)).map((day) => {
            const key   = format(day, "yyyy-MM-dd");
            const items = lecturesByDay.get(key) ?? [];
            return (
              <div key={key} className="rounded-xl border border-border/30 bg-card/50 p-2 min-h-[80px]">
                <div className="text-center mb-1.5">
                  <p className="text-[10px] text-muted-foreground">{DAYS[day.getDay()]}</p>
                  <p className="text-[12px] font-bold text-muted-foreground">{format(day, "d")}</p>
                </div>
                {items.map((l) => (
                  <div key={l.id} className="rounded px-1 py-0.5 text-[9px] bg-primary/10 text-primary truncate mb-0.5">
                    {l.start_time.slice(0, 5)} {l.topic}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
