import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CalendarDays, MapPin, Clock, Trash2, Star, Store, Rocket } from "@/components/icons";
import { format, isPast, isToday } from "date-fns";

type EventFilter = "all" | "general" | "ecell";

const initialForm = {
  title: "",
  description: "",
  venue: "",
  event_date: "",
  event_time: "",
  flyer_url: "",
  is_featured: false,
  is_ecell_event: false,
  max_stalls: "" as string,
};

export default function AdminEventsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState<EventFilter>("all");

  const eventsQuery = useQuery({
    queryKey: ["admin", "events", "v3"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,event_date,event_time,venue,poster_url,flyer_url,is_featured,is_ecell_event,max_stalls,created_at")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const max = form.max_stalls.trim() === "" ? null : Math.max(0, Number(form.max_stalls));
      const { error } = await supabase.from("events").insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        venue: form.venue.trim() || null,
        event_date: form.event_date,
        event_time: form.event_time,
        flyer_url: form.flyer_url.trim() || null,
        is_featured: form.is_featured,
        is_ecell_event: form.is_ecell_event,
        max_stalls: max,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event created");
      setOpen(false);
      setForm(initialForm);
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

  const toggleFeatured = useMutation({
    mutationFn: async (vars: { id: string; is_featured: boolean }) => {
      const { error } = await supabase.from("events").update({ is_featured: vars.is_featured }).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "events"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Events
          </h2>
          <p className="text-sm text-muted-foreground">Manage campus events, flyers, featured visibility & stall caps</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Event
        </Button>
      </div>

      {/* Stats + Filter */}
      {(() => {
        const all = eventsQuery.data ?? [];
        const today = new Date().toISOString().slice(0, 10);
        const active = all.filter((e: any) => e.event_date >= today);
        const ecell = all.filter((e: any) => e.is_ecell_event);
        return (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Total: {all.length}</Badge>
              <Badge variant="outline">Upcoming: {active.length}</Badge>
              <Badge variant="outline" className="gap-1"><Rocket className="h-3 w-3" /> E-Cell: {ecell.length}</Badge>
            </div>
            <div className="flex gap-1 rounded-md border border-input p-0.5 bg-background">
              {(["all", "general", "ecell"] as EventFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 h-7 rounded text-xs font-medium capitalize transition ${
                    filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "ecell" ? "E-Cell" : f}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="grid gap-4 sm:grid-cols-2">
        {(eventsQuery.data ?? []).filter((e: any) =>
          filter === "all" ? true : filter === "ecell" ? e.is_ecell_event : !e.is_ecell_event,
        ).length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">No events to show.</CardContent>
          </Card>
        )}
        {(eventsQuery.data ?? [])
          .filter((e: any) => (filter === "all" ? true : filter === "ecell" ? e.is_ecell_event : !e.is_ecell_event))
          .map((e: any) => {
          const flyer = e.flyer_url || e.poster_url;
          return (
            <Card key={e.id} className="border-border/50 overflow-hidden">
              {flyer && <img src={flyer} alt={e.title} className="w-full h-28 object-cover" loading="lazy" />}
              <CardContent className="py-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground flex items-center gap-2 flex-wrap">
                      {e.title}
                      {e.is_featured && <Star className="h-3.5 w-3.5 text-warning fill-warning" />}
                      {e.is_ecell_event && (
                        <Badge className="text-[9px] gap-1 bg-[#FCE541] text-[#000000] border border-[#C08634]/40 font-bold hover:bg-[#FAD943]">
                          <Rocket className="h-2.5 w-2.5 text-[#000000]" /> E-Cell
                        </Badge>
                      )}
                    </h3>
                    {e.description && <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>}
                  </div>
                  <Button aria-label="Delete"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete "${e.title}"?\n\nStall registrations for this event will be kept but will no longer be linked to any event.`,
                        )
                      ) {
                        deleteMutation.mutate(e.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{format(new Date(e.event_date), "PP")}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{e.event_time}</span>
                  {e.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.venue}</span>}
                  {e.max_stalls != null && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Store className="h-3 w-3" /> Stalls: {e.max_stalls}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!e.is_featured}
                      onCheckedChange={(v) => toggleFeatured.mutate({ id: e.id, is_featured: v })}
                    />
                    <span className="text-xs text-muted-foreground">Featured</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="space-y-2"><Label>Venue</Label><Input value={form.venue} onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.event_date} onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Time</Label><Input type="time" value={form.event_time} onChange={(e) => setForm((p) => ({ ...p, event_time: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Flyer URL</Label>
              <Input
                type="url"
                placeholder="https://…/flyer.jpg"
                value={form.flyer_url}
                onChange={(e) => setForm((p) => ({ ...p, flyer_url: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Stalls (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="No limit"
                  value={form.max_stalls}
                  onChange={(e) => setForm((p) => ({ ...p, max_stalls: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-3 pb-2">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm((p) => ({ ...p, is_featured: v }))} />
                <Label className="mb-0">Featured</Label>
              </div>
            </div>
            <div className="rounded-lg border border-[#E8D98A] bg-[#FCE541]/10 p-3 flex items-center justify-between gap-3">
              <div>
                <Label className="mb-0 flex items-center gap-1.5 font-semibold text-foreground">
                  <Rocket className="h-3.5 w-3.5 text-[#C08634]" />
                  E-Cell Event
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">Show in the E-Cell hub with official brand styling.</p>
              </div>
              <Switch
                checked={form.is_ecell_event}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_ecell_event: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!form.title.trim() || !form.event_date || !form.event_time || createMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
