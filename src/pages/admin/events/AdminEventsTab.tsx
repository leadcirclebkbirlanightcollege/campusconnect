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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Pencil,
  ExternalLink,
  Phone,
  AlertTriangle,
  Loader2,
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
  full_flyer_url: string | null;
  whatsapp_group_link: string | null;
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
  full_flyer_url: null as string | null,
  whatsapp_group_link: "",
  is_featured: false,
  is_ecell_event: false,
  max_stalls: "" as string,
};

export function extractEventStoragePath(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const marker = "/lecture-flyers/";
  const idx = trimmed.indexOf(marker);
  if (idx !== -1) {
    const rawPath = trimmed.substring(idx + marker.length);
    const cleanPath = rawPath.split("?")[0].split("#")[0];
    if (cleanPath.startsWith("events/") && !cleanPath.includes("..")) {
      return cleanPath;
    }
  }
  return null;
}

export default function AdminEventsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<EventRow | null>(null);
  const [deleteTargetEvent, setDeleteTargetEvent] = useState<EventRow | null>(null);
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState<EventFilter>("all");
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["admin", "events", "v4"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id,title,description,event_date,event_time,venue,poster_url,flyer_url,full_flyer_url,whatsapp_group_link,is_featured,is_ecell_event,max_stalls,created_at"
        )
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const openCreateDialog = () => {
    setEditEvent(null);
    setForm(initialForm);
    setWhatsappError(null);
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
      full_flyer_url: e.full_flyer_url || null,
      whatsapp_group_link: e.whatsapp_group_link || "",
      is_featured: Boolean(e.is_featured),
      is_ecell_event: Boolean(e.is_ecell_event),
      max_stalls: e.max_stalls != null ? String(e.max_stalls) : "",
    });
    setWhatsappError(null);
    setOpen(true);
  };

  const validateWhatsappLink = (url: string): boolean => {
    if (!url.trim()) return true;
    try {
      const parsed = new URL(url.trim());
      const isValid =
        (parsed.hostname === "chat.whatsapp.com" || parsed.hostname === "wa.me") &&
        parsed.protocol === "https:";
      if (!isValid) {
        setWhatsappError("WhatsApp link must start with https://chat.whatsapp.com/ (or https://wa.me/)");
        return false;
      }
      setWhatsappError(null);
      return true;
    } catch {
      setWhatsappError("Please enter a valid URL (e.g. https://chat.whatsapp.com/...)");
      return false;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate WhatsApp Group link if provided
      const waTrimmed = form.whatsapp_group_link.trim();
      if (waTrimmed && !validateWhatsappLink(waTrimmed)) {
        throw new Error("Invalid WhatsApp group link. Must be https://chat.whatsapp.com/...");
      }

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
        full_flyer_url: form.full_flyer_url || form.flyer_url || null,
        whatsapp_group_link: waTrimmed || null,
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
      setWhatsappError(null);
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["student", "events"] });
      qc.invalidateQueries({ queryKey: ["event", "detail"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save event"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (target: EventRow) => {
      // 1. Attempt transactional delete via delete_event_cascade RPC
      let rpcResult: any = null;
      const { data, error: rpcError } = await supabase.rpc("delete_event_cascade", {
        p_event_id: target.id,
      });

      if (rpcError) {
        console.warn("delete_event_cascade RPC failed, attempting direct delete:", rpcError);
        // Direct delete fallback — foreign key ON DELETE CASCADE still enforces stall deletion
        const { error: directError } = await supabase
          .from("events")
          .delete()
          .eq("id", target.id);
        if (directError) throw directError;
      } else {
        rpcResult = data;
      }

      // 2. Safe event-owned storage asset cleanup
      const candidateUrls: (string | null | undefined)[] = [
        target.flyer_url,
        target.poster_url,
        target.full_flyer_url,
      ];
      if (rpcResult && Array.isArray(rpcResult.flyer_urls)) {
        candidateUrls.push(...rpcResult.flyer_urls);
      }

      const pathsToDelete = Array.from(
        new Set(
          candidateUrls
            .map(extractEventStoragePath)
            .filter((p): p is string => Boolean(p))
        )
      );

      if (pathsToDelete.length > 0) {
        try {
          await supabase.storage.from("lecture-flyers").remove(pathsToDelete);
        } catch (storageErr) {
          console.warn("Post-deletion storage asset cleanup warning:", storageErr);
        }
      }

      return { target, rpcResult };
    },
    onSuccess: ({ target, rpcResult }) => {
      const stallsCount = rpcResult?.deleted_stalls_count;
      const detailMsg =
        typeof stallsCount === "number" && stallsCount > 0
          ? `Event "${target.title}" and ${stallsCount} stall registration${stallsCount === 1 ? "" : "s"} permanently deleted.`
          : `Event "${target.title}" and all linked event-specific data permanently deleted.`;

      toast.success(detailMsg);
      setDeleteTargetEvent(null);

      // Invalidate all related query caches
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["admin", "all-events-filter"] });
      qc.invalidateQueries({ queryKey: ["admin", "stalls"] });
      qc.invalidateQueries({ queryKey: ["student", "events"] });
      qc.invalidateQueries({ queryKey: ["event", "detail"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["ecell", "user_stalls"] });
      qc.invalidateQueries({ queryKey: ["stall-existing"] });
      qc.invalidateQueries({ queryKey: ["upcoming-events"] });

      // Expire cached entries for this deleted event
      qc.removeQueries({ queryKey: ["event", "detail", target.id] });
      qc.removeQueries({ queryKey: ["stall-existing", target.id] });
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
            Create campus events, configure WhatsApp groups, manage stall registrations & share canonical links
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
            const flyer = e.full_flyer_url || e.flyer_url || e.poster_url;
            return (
              <Card
                key={e.id}
                className="border-border/60 overflow-hidden rounded-2xl shadow-card flex flex-col justify-between"
              >
                <div>
                  {flyer ? (
                    <div className="relative aspect-[16/9] w-full max-h-[220px] bg-neutral-950 flex items-center justify-center overflow-hidden">
                      <img
                        src={flyer}
                        alt={e.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {e.is_featured && (
                          <Badge className="bg-amber-500 text-white font-bold gap-1 shadow-md text-[10px]">
                            <Star className="h-3 w-3" /> Featured
                          </Badge>
                        )}
                        {e.is_ecell_event && (
                          <Badge className="bg-[#FCE541] text-black font-bold gap-1 shadow-md text-[10px] border border-[#C08634]/40">
                            <Rocket className="h-3 w-3 text-black" /> E-Cell
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-28 bg-gradient-to-br from-primary/15 via-surface-2 to-premium/15 flex items-center justify-center text-primary/60">
                      <CalendarDays className="h-10 w-10" />
                    </div>
                  )}

                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base text-foreground leading-snug line-clamp-1">
                        {e.title}
                      </h3>
                    </div>

                    {e.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {e.description}
                      </p>
                    )}

                    <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" />
                        {e.event_date ? format(new Date(e.event_date + "T00:00:00"), "PP") : "No date"}
                      </span>
                      {e.event_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {e.event_time}
                        </span>
                      )}
                      {e.venue && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3.5 w-3.5" />
                          {e.venue}
                        </span>
                      )}
                    </div>

                    {/* Stalls & WhatsApp Indicators */}
                    <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                      {e.max_stalls != null && (
                        <Badge variant="outline" className="text-[10px] gap-1 bg-[#FCE541]/10 border-[#C08634]/30 text-[#8A5B16] dark:text-[#FCE541]">
                          <Store className="h-3 w-3" /> Stalls: {e.max_stalls} cap
                        </Badge>
                      )}
                      {e.whatsapp_group_link && (
                        <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                          <Phone className="h-3 w-3" /> WhatsApp Group Linked
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

                    {/* View Stalls shortcut if event has stalls */}
                    {e.max_stalls != null && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 px-2 text-xs rounded-xl text-amber-600 dark:text-amber-400 gap-1"
                      >
                        <Link to={`/platform/admin/stalls?eventId=${e.id}`}>
                          <Store className="h-3.5 w-3.5" />
                          Stalls
                        </Link>
                      </Button>
                    )}

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
                      <Pencil className="h-3.5 w-3.5 text-foreground" />
                    </Button>

                    {/* Delete Event */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTargetEvent(e)}
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

      {/* Admin Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(deleteTargetEvent)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !deleteMutation.isPending) {
            setDeleteTargetEvent(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-bold text-foreground">
                  Delete Event?
                </AlertDialogTitle>
                <p className="text-xs text-muted-foreground">
                  Permanent data deletion
                </p>
              </div>
            </div>
            <AlertDialogDescription className="space-y-3 pt-3 text-foreground/90 text-sm">
              <p>
                Deleting <strong className="text-foreground font-semibold">"{deleteTargetEvent?.title}"</strong> will permanently remove:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
                <li>Event details & public page (<code className="text-[11px] font-mono">/events/{deleteTargetEvent?.id}</code>)</li>
                <li>All stall registrations & student team submissions</li>
                <li>Event-specific configurations & WhatsApp references</li>
                <li>Event flyer and banner files where applicable</li>
              </ul>
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive font-medium leading-relaxed">
                ⚠️ This action cannot be undone. All child records will be cascade-deleted at the database level.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2 gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteTargetEvent(null)}
              className="rounded-xl font-medium"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTargetEvent) {
                  deleteMutation.mutate(deleteTargetEvent);
                }
              }}
              className="gap-2 rounded-xl font-bold"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Event
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create / Edit Dialog with WhatsApp Group Link and Flyer */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] sm:max-w-xl overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editEvent ? "Edit Event" : "Create Campus Event"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editEvent
                ? "Update event flyers, timing, WhatsApp group link, stall capacity and visibility"
                : "Add a new campus event with banner, WhatsApp group redirect, and optional stall bookings"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <EventFlyerUploader
              value={form.flyer_url}
              onChange={(url) => setForm((p) => ({ ...p, flyer_url: url, full_flyer_url: url }))}
            />

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Event Title *</Label>
              <Input
                placeholder="e.g. STARTUP MELA WITH BAPPA"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="rounded-xl h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                placeholder="What is this event about? Rules, timings, criteria..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="rounded-xl text-sm resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Venue</Label>
              <Input
                placeholder="e.g. NR Lawn, New Building Passage"
                value={form.venue}
                onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
                className="rounded-xl h-10 text-sm"
              />
            </div>

            {/* WhatsApp Group Link Input */}
            <div className="space-y-1.5 p-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  WhatsApp Group Link
                </Label>
                <span className="text-[11px] text-muted-foreground">Optional</span>
              </div>
              <Input
                placeholder="https://chat.whatsapp.com/..."
                value={form.whatsapp_group_link}
                onChange={(e) => {
                  setForm((p) => ({ ...p, whatsapp_group_link: e.target.value }));
                  if (whatsappError) validateWhatsappLink(e.target.value);
                }}
                onBlur={(e) => validateWhatsappLink(e.target.value)}
                className="rounded-xl h-10 text-sm bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                Example: <code className="text-emerald-700 dark:text-emerald-400 font-mono text-[10px]">https://chat.whatsapp.com/DF04JFwzfLnDkxpFwhqplc...</code>
                <br />
                Registered students are automatically redirected to this group upon stall submission.
              </p>
              {whatsappError && (
                <p className="text-xs text-destructive font-medium">{whatsappError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date *</Label>
                <Input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))}
                  className="rounded-xl h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Time *</Label>
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
                Boolean(whatsappError) ||
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
