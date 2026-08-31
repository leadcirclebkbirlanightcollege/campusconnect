import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  Megaphone, Plus, Search, Trash2, Calendar, Users,
  Clock, AlertTriangle, Eye, Sparkles, CheckCircle2,
  Bell, Pin
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

import CreateAnnouncementDialog from "./components/CreateAnnouncementDialog";

export default function FacultyAnnouncements() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Fetch announcements created by this faculty
  const { data: announcements = [], isLoading, refetch } = useQuery({
    queryKey: ["faculty", "announcements", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Delete Announcement Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement deleted");
      setDeleteTargetId(null);
      if (selectedAnnouncement?.id === deleteTargetId) {
        setSelectedAnnouncement(null);
      }
      qc.invalidateQueries({ queryKey: ["faculty", "announcements"] });
      qc.invalidateQueries({ queryKey: ["faculty", "recent-announcements"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete announcement");
    },
  });

  // Summary counts
  const totalCount = announcements.length;
  const recentCount = useMemo(() => {
    const cutoff = subDays(new Date(), 7);
    return announcements.filter((a: any) => isAfter(new Date(a.created_at), cutoff)).length;
  }, [announcements]);
  const urgentCount = useMemo(() => {
    return announcements.filter((a: any) => a.priority === "urgent" || a.priority === "high").length;
  }, [announcements]);

  // Filter announcements
  const filteredAnnouncements = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return announcements;
    return announcements.filter((a: any) =>
      a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
    );
  }, [announcements, search]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Announcements & Broadcasts</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Broadcast updates, exam alerts, and lecture notifications directly to your students.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="rounded-xl text-[12.5px] h-9 gap-1.5 bg-primary text-primary-foreground font-medium shadow-xs"
        >
          <Plus className="h-4 w-4" /> New Announcement
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Total Broadcasts</p>
          <p className="text-[22px] font-bold text-foreground mt-1 tabular-nums">{totalCount}</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Recent (7 Days)</p>
          <p className="text-[22px] font-bold text-success mt-1 tabular-nums">{recentCount}</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">High Priority</p>
          <p className="text-[22px] font-bold text-foreground mt-1 tabular-nums">{urgentCount}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search announcements…"
          className="pl-9 text-[12.5px] h-9.5 rounded-xl bg-card border-border/50"
        />
      </div>

      {/* Announcements Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card p-12 text-center shadow-2xs">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <Megaphone className="h-6 w-6" />
          </div>
          <h3 className="text-[15px] font-bold text-foreground">
            {announcements.length === 0 ? "No announcements posted yet" : "No matching announcements"}
          </h3>
          <p className="text-[12.5px] text-muted-foreground max-w-sm mx-auto mt-1">
            {announcements.length === 0
              ? "Post your first update to reach all students enrolled in your courses instantly."
              : "Try searching with different keywords."}
          </p>
          {announcements.length === 0 && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              size="sm"
              className="mt-4 rounded-xl text-[12.5px] gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create First Broadcast
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAnnouncements.map((a: any) => {
            const isUrgent = a.priority === "urgent" || a.priority === "high";

            return (
              <div
                key={a.id}
                onClick={() => setSelectedAnnouncement(a)}
                className="rounded-2xl border border-border/50 bg-card p-5 hover:border-primary/30 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {isUrgent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20">
                          Urgent Broadcast
                        </span>
                      )}
                      {a.is_pinned && (
                        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                          <Pin className="h-3 w-3" /> Pinned
                        </span>
                      )}
                      <span className="text-[11.5px] text-muted-foreground">
                        {format(new Date(a.created_at), "MMM d, yyyy · HH:mm")}
                      </span>
                    </div>

                    <h3 className="text-[14.5px] font-bold text-foreground group-hover:text-primary transition-colors">
                      {a.title}
                    </h3>

                    <p className="text-[13px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                      {a.description}
                    </p>
                  </div>

                  <div
                    className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTargetId(a.id)}
                      className="rounded-xl text-[12px] h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Delete Announcement"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedAnnouncement(a)}
                      className="rounded-xl text-[12px] h-8"
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Announcement Dialog */}
      <CreateAnnouncementDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Announcement Detail Modal */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={(op) => !op && setSelectedAnnouncement(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {selectedAnnouncement?.created_at ? format(new Date(selectedAnnouncement.created_at), "EEEE, MMMM d, yyyy · HH:mm") : ""}
              </span>
            </div>
            <DialogTitle className="text-[17px] font-bold text-foreground text-left">
              {selectedAnnouncement?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="py-3">
            <div className="rounded-xl bg-muted/20 p-4 border border-border/40 text-[13.5px] text-foreground leading-relaxed whitespace-pre-wrap">
              {selectedAnnouncement?.description}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDeleteTargetId(selectedAnnouncement?.id);
              }}
              className="rounded-xl text-[12px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAnnouncement(null)}
              className="rounded-xl text-[12px]"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTargetId} onOpenChange={(op) => !op && setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Delete Announcement
            </DialogTitle>
            <DialogDescription className="text-[13px] pt-1">
              Are you sure you want to delete this broadcast? Students will no longer be able to see it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTargetId(null)}
              className="rounded-xl text-[12px]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
              disabled={deleteMutation.isPending}
              className="rounded-xl text-[12px]"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Broadcast"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
