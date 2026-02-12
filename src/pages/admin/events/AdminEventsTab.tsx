import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CalendarDays, MapPin, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminEventsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");

  const eventsQuery = useQuery({
    queryKey: ["admin", "events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("events").insert({
        title: title.trim(),
        description: description.trim() || null,
        venue: venue.trim() || null,
        event_date: eventDate,
        event_time: eventTime,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event created");
      setOpen(false);
      setTitle(""); setDescription(""); setVenue(""); setEventDate(""); setEventTime("");
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Events
          </h2>
          <p className="text-sm text-muted-foreground">Manage campus events</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Event
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {eventsQuery.data?.length === 0 && (
          <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">No events yet.</CardContent></Card>
        )}
        {eventsQuery.data?.map((e: any) => (
          <Card key={e.id} className="border-border/50">
            <CardContent className="py-4 space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-foreground">{e.title}</h3>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(e.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{format(new Date(e.event_date), "PP")}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{e.event_time}</span>
                {e.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.venue}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
            <div className="space-y-2"><Label>Venue</Label><Input value={venue} onChange={(e) => setVenue(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Time</Label><Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || !eventDate || !eventTime || createMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
