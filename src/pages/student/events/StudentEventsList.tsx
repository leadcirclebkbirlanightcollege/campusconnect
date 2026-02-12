import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import { format, isPast, isToday } from "date-fns";

export default function StudentEventsList() {
  const query = useQuery({
    queryKey: ["student", "events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" /> Events
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Campus events and activities</p>
      </header>

      {query.data?.length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No upcoming events.</CardContent></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {query.data?.map((e: any) => {
          const eventDay = new Date(e.event_date);
          const past = isPast(eventDay) && !isToday(eventDay);
          return (
            <Card key={e.id} className={`border-border/50 ${past ? "opacity-60" : ""}`}>
              <CardContent className="py-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-foreground">{e.title}</h3>
                  {isToday(eventDay) && <Badge className="bg-success text-success-foreground text-[10px]">Today</Badge>}
                  {past && <Badge variant="secondary" className="text-[10px]">Past</Badge>}
                </div>
                {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{format(eventDay, "PP")}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{e.event_time}</span>
                  {e.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.venue}</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
