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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  CalendarDays,
  MapPin,
  Clock,
  Trash2,
  Star,
  Store,
  Rocket,
  Edit2,
  ExternalLink,
} from "@/components/icons";
import { format } from "date-fns";
import EventFlyerUploader from "./EventFlyerUploader";
import ShareButton from "@/components/share/ShareButton";
import { Link } from "react-router-dom";

type EventFilter = "all" | "general" | "ecell";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string;
  venue: string | null;
  poster_url: string | null;
  flyer_url: string | null;
  is_featured: boolean | null;
  is_ecell_event: boolean | null;
  max_stalls: number | null;
  created_at: string;
};

const initialForm = {
  title: "",
  description: "",
  venue: "",
  event_date: "",
  event_time: "",
  flyer_url: null as string | null,
  is_featured: false,
  is_ecell_event: false,
  max_stalls: "" as string,
};

export default function AdminEventsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<EventRow | null>(null);
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState<EventFilter>("all");

  const eventsQuery = useQuery({
    queryKey: ["admin", "events", "v3"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id,title,description,event_date,event_time,venue,poster_url,flyer_url,is_featured,is_ecell_event,max_stalls,created_at"
        )
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const openCreateDialog = () => {
    setEditEvent(null);
    setForm(initialForm);
    setOpen(true);
  };

  const openEditDialog = (e: EventRow) => {
    setEditEvent(e);
    setForm({
      title: e.title,
      description: e.description || "",
      venue: e.venue || "",
      event_date: e.event_date,
      event_time: e.event_time,
      flyer_url: e.flyer_url || e.poster_url || null,
      is_featured: Boolean(e.is_featured),
      is_ecell_event: Boolean(e.is_ecell_event),
      max_stalls: e.max_stalls != null ? String(e.max_stalls) : "",
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const max =
        form.max_stalls.trim() === ""
          ? null
          : Math.max(0, Number(form.max_stalls));

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        venue: form.venue.trim() || null,
        event_date: form.event_date,
        event_time: form.event_time,
        flyer_url: form.flyer_url || null,
        is_featured: form.is_featured,
        is_ecell_event: form.is_ecell_event,
        max_stalls: max,
      };

      if (editEvent) {
        const { error } = await supabase
          .from("events")
          .update(payload)
          .eq("id", editEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert({
          ...payload,
          created_by: user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editEvent ? "Event updated successfully" : "Event created successfully");
      setOpen(false);
      setEditEvent(null);
      setForm(initialForm);
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["student", "events"] });
      qc.invalidateQueries({ queryKey: ["event", "detail"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save event"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event deleted");
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["student", "events"] });
      qc.invalidateQueries({ queryKey: ["event", "detail"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete event"),
  });

  const toggleFeatured = useMutation({
    mutationFn: async (vars: { id: string; is_featured: boolean }) => {
      const { error } = await supabase
        .from("events")
        .update({ is_featured: vars.is_featured })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["student", "events"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Events Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Create campus events, crop flyer banners, configure stalls & copy canonical share links
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 rounded-xl font-bold">
          <Plus className="h-4 w-4" /> New Event
        </Button>
      </div>

      {/* Stats + Filter */}
      {(() => {
        const all = eventsQuery.data ?? [];
        const today = new Date().toISOString().slice(0, 10);
        const active = all.filter((e) => e.event_date >= today);
        const ecell = all.filter((e) => e.is_ecell_event);
        return (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="rounded-lg">Total: {all.length}</Badge>
              <Badge variant="outline" className="rounded-lg">Upcoming: {active.length}</Badge>
              <Badge variant="outline" className="gap-1 rounded-lg">
                <Rocket className="h-3 w-3 text-amber-500" /> E-Cell: {ecell.length}
              </Badge>
            </div>
            <div className="flex gap-1 rounded-xl border border-input p-0.5 bg-background">
              {(["all", "general", "ecell"] as EventFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 h-7 rounded-lg text-xs font-medium capitalize transition ${
                    filter === f
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
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
        {(eventsQuery.data ?? []).filter((e) =>
          filter === "all" ? true : filter === "ecell" ? e.is_ecell_event : !e.is_ecell_event
        ).length === 0 && (
          <Card className="col-span-full border-border/50 rounded-2xl">
            <CardContent className="py-12 text-center text-muted-foreground">
              No campus events found. Click &quot;New Event&quot; to publish your first one.
            </CardContent>
          </Card>
        )}

        {(eventsQuery.data ?? [])
          .filter((e) =>
            filter === "all" ? true : filter === "ecell" ? e.is_ecell_event : !e.is_ecell_event
          )
          .map((e) => {
            const flyer = e.flyer_url || e.poster_url;
            return (
              <Card
                key={e.id}
                className="border-border/60 overflow-hidden rounded-2xl shadow-card flex flex-col justify-between"
              >
                <div>
                  {flyer ? (
                    <div className="w-full h-36 bg-neutral-950 overflow-hidden relative">
                      <img
                        src={flyer}
                        alt={e.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {e.is_featured && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-amber-500 text-white font-bold gap-1 shadow-md text-[10px]">
                            <Star className="h-3 w-3 fill-current" /> Featured
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-20 bg-gradient-to-r from-primary/10 to-surface-2 flex items-center justify-center text-primary/40 border-b border-border-subtle">
                      <CalendarDays className="h-8 w-8" />
                    </div>
                  )}

                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2 flex-wrap">
                          {e.title}
                          {e.is_ecell_event && (
                            <Badge className="text-[9px] gap-1 bg-[#FCE541] text-[#000000] border border-[#C08634]/40 font-bold hover:bg-[#FAD943]">
                              <Rocket className="h-2.5 w-2.5 text-[#000000]" /> E-Cell
                            </Badge>
                          )}
                        </h3>
                        {e.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {e.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {format(new Date(e.event_date + "T00:00:00"), "PP")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {e.event_time}
                      </span>
                      {e.venue && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3.5 w-3.5" />
                          {e.venue}
                        </span>
                      )}
                      {e.max_stalls != null && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Store className="h-3 w-3" /> Stalls: {e.max_stalls}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="px-4 py-3 border-t border-border-subtle bg-surface-2/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!e.is_featured}
                      onCheckedChange={(v) => toggleFeatured.mutate({ id: e.id, is_featured: v })}
                    />
                    <span className="text-[11px] text-muted-foreground font-medium">Featured</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View Event Detail Page */}
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 px-2 text-xs rounded-xl text-primary gap-1"
                    >
                      <Link to={`/events/${e.id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </Button>

                    {/* Universal Share Button */}
                    <ShareButton
                      title={e.title}
                      description={e.description}
                      url={`/events/${e.id}`}
                      entityType="event"
                      imageUrl={flyer}
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs rounded-xl gap-1"
                      text="Share"
                    />

                    {/* Edit Event */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl"
                      onClick={() => openEditDialog(e)}
                      aria-label="Edit event"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-foreground" />
                    </Button>

                    {/* Delete Event */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-destructive hover:text-destructive"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete "${e.title}"?\n\nThis will remove the event detail page and any linked registrations.`
                          )
                        ) {
                          deleteMutation.mutate(e.id);
                        }
                      }}
                      aria-label="Delete event"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>

      {/* Create / Edit Dialog with Flyer Cropping */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] sm:max-w-xl overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editEvent ? "Edit Event" : "Create New Event"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editEvent
                ? "Update event flyers, timing, stall capacity and visibility"
                : "Fill in the event details, crop flyer banner, and publish to campus"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Flyer Uploader & Cropper */}
            <EventFlyerUploader
              value={form.flyer_url}
              onChange={(url) => setForm((p) => ({ ...p, flyer_url: url }))}
            />

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Title</Label>
              <Input
                placeholder="e.g. Annual Cultural Fest 2026"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="rounded-xl h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                placeholder="Full event schedule, eligibility, guidelines..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Venue / Location</Label>
              <Input
                placeholder="e.g. Main Auditorium / Campus Quad"
                value={form.venue}
                onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
                className="rounded-xl h-10 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date</Label>
                <Input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))}
                  className="rounded-xl h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Time</Label>
                <Input
                  type="time"
                  value={form.event_time}
                  onChange={(e) => setForm((p) => ({ ...p, event_time: e.target.value }))}
                  className="rounded-xl h-10 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Max Stalls (Optional)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="No limit"
                  value={form.max_stalls}
                  onChange={(e) => setForm((p) => ({ ...p, max_stalls: e.target.value }))}
                  className="rounded-xl h-10 text-sm"
                />
              </div>
              <div className="flex items-end gap-3 pb-2">
                <Switch
                  checked={form.is_featured}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, is_featured: v }))}
                />
                <Label className="text-xs font-semibold mb-0 cursor-pointer">Featured Event</Label>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8D98A] bg-[#FCE541]/10 p-3.5 flex items-center justify-between gap-3">
              <div>
                <Label className="mb-0 flex items-center gap-1.5 font-bold text-foreground text-xs">
                  <Rocket className="h-3.5 w-3.5 text-[#C08634]" />
                  E-Cell Event
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Highlight under the Entrepreneurship Cell with official gold branding.
                </p>
              </div>
              <Switch
                checked={form.is_ecell_event}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_ecell_event: v }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                !form.title.trim() ||
                !form.event_date ||
                !form.event_time ||
                saveMutation.isPending
              }
              className="rounded-xl font-bold px-5"
            >
              {saveMutation.isPending ? "Saving..." : editEvent ? "Update Event" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
