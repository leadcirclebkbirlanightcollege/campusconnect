import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {query.data?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No upcoming events.
          </CardContent>
        </Card>
      )}

      {(query.data?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead className="w-24">Time</TableHead>
                    <TableHead className="w-28">Venue</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data?.map((e: any) => {
                    const eventDay = new Date(e.event_date);
                    const past = isPast(eventDay) && !isToday(eventDay);
                    return (
                      <TableRow key={e.id} className={past ? "opacity-60" : ""}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{e.title}</p>
                            {e.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{e.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(eventDay, "PP")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.event_time}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.venue ?? "—"}</TableCell>
                        <TableCell>
                          {isToday(eventDay) && <Badge className="bg-success text-success-foreground text-[10px]">Today</Badge>}
                          {past && <Badge variant="secondary" className="text-[10px]">Past</Badge>}
                          {!past && !isToday(eventDay) && <Badge variant="outline" className="text-[10px]">Upcoming</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
