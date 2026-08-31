import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  BookOpen, Plus, Search, Filter, Calendar, Clock,
  MapPin, Play, StopCircle, CheckCircle2, ChevronRight,
  Eye, Radio, Sparkles, Loader2, AlertCircle
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

import ScheduleLectureDialog from "./components/ScheduleLectureDialog";
import LectureDetailDrawer from "./components/LectureDetailDrawer";

type StatusTab = "all" | "live" | "scheduled" | "ended";

export default function FacultyMyLectures() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);

  // Fetch all lectures for this faculty
  const { data: lectures = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["faculty", "lectures", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("*")
        .eq("created_by", user!.id)
        .order("lecture_date", { ascending: false })
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Start Class Mutation
  const startClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lectures")
        .update({
          status: "live",
          actual_start_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Class started! You are now LIVE.");
      qc.invalidateQueries({ queryKey: ["faculty"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to start class"),
  });

  // End Class Mutation
  const endClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lectures")
        .update({
          status: "ended",
          actual_end_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Live class ended.");
      qc.invalidateQueries({ queryKey: ["faculty"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to end class"),
  });

  // Derived counts
  const totalCount = lectures.length;
  const liveCount = useMemo(() => lectures.filter((l) => l.status === "live").length, [lectures]);
  const scheduledCount = useMemo(() => lectures.filter((l) => l.status === "scheduled").length, [lectures]);
  const endedCount = useMemo(() => lectures.filter((l) => l.status === "ended" || l.status === "completed").length, [lectures]);

  // Filtered lectures
  const filteredLectures = useMemo(() => {
    const q = search.toLowerCase().trim();
    return lectures.filter((l) => {
      const matchesSearch =
        !q ||
        l.topic?.toLowerCase().includes(q) ||
        l.venue?.toLowerCase().includes(q);

      let matchesTab = true;
      if (activeTab === "live") matchesTab = l.status === "live";
      else if (activeTab === "scheduled") matchesTab = l.status === "scheduled";
      else if (activeTab === "ended") matchesTab = l.status === "ended" || l.status === "completed";

      return matchesSearch && matchesTab;
    });
  }, [lectures, search, activeTab]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">My Lectures</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Manage your teaching sessions, track schedules, and launch live classrooms.
          </p>
        </div>
        <Button
          onClick={() => setShowScheduleDialog(true)}
          className="rounded-xl text-[12.5px] h-9 gap-1.5 bg-primary text-primary-foreground font-medium shadow-xs"
        >
          <Plus className="h-4 w-4" /> Schedule Lecture
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Total Sessions</p>
          <p className="text-[22px] font-bold text-foreground mt-1 tabular-nums">{totalCount}</p>
        </div>

        <div className={cn(
          "rounded-2xl border p-4 shadow-2xs transition-colors",
          liveCount > 0 ? "border-success/30 bg-success/5" : "border-border/50 bg-card"
        )}>
          <p className="text-[11.5px] font-medium text-muted-foreground flex items-center gap-1.5">
            {liveCount > 0 && <span className="h-2 w-2 rounded-full bg-success animate-pulse" />}
            Live Now
          </p>
          <p className={cn("text-[22px] font-bold mt-1 tabular-nums", liveCount > 0 ? "text-success" : "text-foreground")}>
            {liveCount}
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Upcoming</p>
          <p className="text-[22px] font-bold text-foreground mt-1 tabular-nums">{scheduledCount}</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Completed</p>
          <p className="text-[22px] font-bold text-foreground mt-1 tabular-nums">{endedCount}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/40 shrink-0 overflow-x-auto">
          {[
            { id: "all", label: "All Lectures", count: totalCount },
            { id: "live", label: "Live", count: liveCount },
            { id: "scheduled", label: "Upcoming", count: scheduledCount },
            { id: "ended", label: "Completed", count: endedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as StatusTab)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all shrink-0",
                activeTab === tab.id
                  ? "bg-card text-foreground font-semibold shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic or venue…"
            className="pl-9 text-[12.5px] h-9.5 rounded-xl bg-card border-border/50"
          />
        </div>
      </div>

      {/* Lectures List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-[13.5px] font-semibold text-foreground">Failed to load lectures</p>
          <p className="text-[12px] text-muted-foreground mt-1">Please try again.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3 rounded-xl">
            Retry
          </Button>
        </div>
      ) : filteredLectures.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card p-12 text-center shadow-2xs">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="text-[15px] font-bold text-foreground">
            {lectures.length === 0 ? "No lectures scheduled yet" : "No matching lectures found"}
          </h3>
          <p className="text-[12.5px] text-muted-foreground max-w-sm mx-auto mt-1">
            {lectures.length === 0
              ? "Schedule your first teaching session to start tracking attendance and coursework."
              : "Try adjusting your search query or switching the active tab filter."}
          </p>
          {lectures.length === 0 && (
            <Button
              onClick={() => setShowScheduleDialog(true)}
              size="sm"
              className="mt-4 rounded-xl text-[12.5px] gap-1.5"
            >
              <Plus className="h-4 w-4" /> Schedule First Lecture
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLectures.map((lec) => {
            const isLecLive = lec.status === "live";
            const isLecScheduled = lec.status === "scheduled";
            const isLecEnded = lec.status === "ended" || lec.status === "completed";
            const dateStr = format(new Date(lec.lecture_date), "MMM d, yyyy");
            const isLecToday = isToday(parseISO(lec.lecture_date));

            return (
              <div
                key={lec.id}
                onClick={() => setSelectedLectureId(lec.id)}
                className={cn(
                  "rounded-2xl border bg-card p-4 sm:p-5 transition-all shadow-2xs hover:border-primary/30 hover:shadow-xs cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group",
                  isLecLive ? "border-success/30 bg-success/5" : "border-border/50"
                )}
              >
                {/* Left: Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isLecLive ? "bg-success/15 text-success" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    )}
                  >
                    {isLecLive ? <Radio className="h-5 w-5 animate-pulse" /> : <BookOpen className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          isLecLive && "bg-success/15 text-success border border-success/30",
                          isLecScheduled && "bg-warning/15 text-warning border border-warning/30",
                          isLecEnded && "bg-muted text-muted-foreground border border-border/40"
                        )}
                      >
                        {isLecLive ? "● LIVE" : lec.status}
                      </span>
                      {isLecToday && (
                        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Today
                        </span>
                      )}
                    </div>

                    <h3 className="text-[14px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {lec.topic}
                    </h3>

                    <div className="flex items-center gap-3 text-[12px] text-muted-foreground mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                        {dateStr}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                        {lec.start_time?.slice(0, 5)} – {lec.end_time?.slice(0, 5)}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
                        {lec.venue}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div
                  className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isLecScheduled && (
                    <Button
                      size="sm"
                      onClick={() => startClassMutation.mutate(lec.id)}
                      disabled={startClassMutation.isPending}
                      className="rounded-xl text-[12px] h-8.5 gap-1 bg-primary text-primary-foreground font-medium"
                    >
                      <Play className="h-3.5 w-3.5" /> Start
                    </Button>
                  )}

                  {isLecLive && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => endClassMutation.mutate(lec.id)}
                      disabled={endClassMutation.isPending}
                      className="rounded-xl text-[12px] h-8.5 gap-1 font-medium"
                    >
                      <StopCircle className="h-3.5 w-3.5" /> End Class
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedLectureId(lec.id)}
                    className="rounded-xl text-[12px] h-8.5 gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Lecture Dialog */}
      <ScheduleLectureDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
      />

      {/* Lecture Details Drawer */}
      <LectureDetailDrawer
        lectureId={selectedLectureId}
        open={!!selectedLectureId}
        onOpenChange={(op) => !op && setSelectedLectureId(null)}
      />
    </div>
  );
}
