import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfWeek,
  addDays,
  isToday,
  isSameDay,
  addWeeks,
  subWeeks,
  parseISO,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  Calendar, Clock, MapPin, Plus, ChevronLeft, ChevronRight,
  List, LayoutGrid, BookOpen, Radio, CheckCircle2, Play, Eye
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

import ScheduleLectureDialog from "./components/ScheduleLectureDialog";
import LectureDetailDrawer from "./components/LectureDetailDrawer";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function FacultySchedule() {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);

  // Calculate week range
  const startDateStr = format(currentWeekStart, "yyyy-MM-dd");
  const endDateStr = format(addDays(currentWeekStart, 6), "yyyy-MM-dd");

  // Fetch lectures within the current displayed week
  const { data: lectures = [], isLoading } = useQuery({
    queryKey: ["faculty", "schedule-lectures", user?.id, startDateStr, endDateStr],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("*")
        .eq("created_by", user!.id)
        .gte("lecture_date", startDateStr)
        .lte("lecture_date", endDateStr)
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Week days array (Monday to Sunday)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Group lectures by date
  const lecturesByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    weekDays.forEach((d) => {
      map.set(format(d, "yyyy-MM-dd"), []);
    });
    lectures.forEach((l) => {
      const dateKey = l.lecture_date;
      if (map.has(dateKey)) {
        map.get(dateKey)!.push(l);
      }
    });
    return map;
  }, [weekDays, lectures]);

  const handlePrevWeek = () => setCurrentWeekStart((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart((prev) => addWeeks(prev, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Teaching Timetable</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Weekly schedule of your courses, lecture sessions, and classroom venues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowScheduleDialog(true)}
            className="rounded-xl text-[12.5px] h-9 gap-1.5 bg-primary text-primary-foreground font-medium shadow-xs"
          >
            <Plus className="h-4 w-4" /> Schedule Lecture
          </Button>
        </div>
      </div>

      {/* Week Navigation Toolbar & View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-border/50 bg-card shadow-2xs">
        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevWeek}
            className="h-8.5 w-8.5 p-0 rounded-xl"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8.5 rounded-xl text-[12px] font-medium px-3"
          >
            Current Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
            className="h-8.5 w-8.5 p-0 rounded-xl"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <span className="text-[13px] font-bold text-foreground ml-2">
            {format(currentWeekStart, "MMM d")} – {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
          </span>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/40 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-medium transition-all",
              viewMode === "grid"
                ? "bg-card text-foreground font-semibold shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Week Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-medium transition-all",
              viewMode === "list"
                ? "bg-card text-foreground font-semibold shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-3.5 w-3.5" /> List View
          </button>
        </div>
      </div>

      {/* Main Schedule Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : viewMode === "grid" ? (
        /* 7-Column Week Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayLectures = lecturesByDate.get(dateStr) ?? [];
            const isDayToday = isToday(day);

            return (
              <div
                key={dateStr}
                className={cn(
                  "rounded-2xl border p-3 flex flex-col min-h-[220px] transition-all shadow-2xs",
                  isDayToday ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-border/50 bg-card"
                )}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {format(day, "EEE")}
                    </p>
                    <p className={cn("text-[16px] font-bold", isDayToday ? "text-primary" : "text-foreground")}>
                      {format(day, "d")}
                    </p>
                  </div>
                  {isDayToday && (
                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground">
                      TODAY
                    </span>
                  )}
                </div>

                {/* Day Lectures Stack */}
                <div className="space-y-2 flex-1">
                  {dayLectures.length === 0 ? (
                    <div className="h-full flex items-center justify-center py-8 text-center text-[11px] text-muted-foreground/60">
                      No classes
                    </div>
                  ) : (
                    dayLectures.map((l: any) => {
                      const isLive = l.status === "live";
                      const isScheduled = l.status === "scheduled";

                      return (
                        <div
                          key={l.id}
                          onClick={() => setSelectedLectureId(l.id)}
                          className={cn(
                            "p-2.5 rounded-xl border text-left cursor-pointer transition-all hover:scale-[1.02] shadow-2xs",
                            isLive
                              ? "bg-success/15 text-success border-success/30"
                              : isScheduled
                              ? "bg-card text-foreground border-border/60 hover:border-primary/40"
                              : "bg-muted/40 text-muted-foreground border-border/30"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-semibold flex items-center gap-1 truncate font-mono">
                              <Clock className="h-3 w-3 shrink-0" />
                              {l.start_time?.slice(0, 5)}
                            </span>
                            {isLive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse shrink-0" />
                            )}
                          </div>
                          <p className="text-[12px] font-bold leading-tight truncate">{l.topic}</p>
                          <p className="text-[10.5px] opacity-80 truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            {l.venue}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Chronological List View */
        <div className="space-y-4">
          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayLectures = lecturesByDate.get(dateStr) ?? [];
            const isDayToday = isToday(day);

            if (dayLectures.length === 0) return null;

            return (
              <div key={dateStr} className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-foreground">
                      {format(day, "EEEE, MMMM d")}
                    </span>
                    {isDayToday && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="text-[11.5px] text-muted-foreground font-medium">
                    {dayLectures.length} {dayLectures.length === 1 ? "session" : "sessions"}
                  </span>
                </div>

                <div className="space-y-2">
                  {dayLectures.map((l: any) => {
                    const isLive = l.status === "live";
                    return (
                      <div
                        key={l.id}
                        onClick={() => setSelectedLectureId(l.id)}
                        className={cn(
                          "p-3 rounded-xl border flex items-center justify-between gap-4 cursor-pointer hover:border-primary/30 transition-all",
                          isLive ? "border-success/30 bg-success/5" : "border-border/40 bg-muted/15"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-center font-mono shrink-0">
                            <p className="text-[12.5px] font-bold text-foreground leading-tight">
                              {l.start_time?.slice(0, 5)}
                            </p>
                            <p className="text-[10.5px] text-muted-foreground">{l.end_time?.slice(0, 5)}</p>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[13.5px] font-bold text-foreground truncate">{l.topic}</p>
                            <p className="text-[11.5px] text-muted-foreground flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 shrink-0" /> {l.venue}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              "text-[10.5px] font-semibold px-2 py-0.5 rounded-full uppercase",
                              isLive ? "bg-success/15 text-success font-bold" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {isLive ? "LIVE" : l.status}
                          </span>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {lectures.length === 0 && (
            <div className="rounded-2xl border border-border/50 bg-card p-12 text-center shadow-2xs">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-[15px] font-bold text-foreground">No lectures scheduled this week</h3>
              <p className="text-[12.5px] text-muted-foreground mt-1 max-w-sm mx-auto">
                Use the button below to add your teaching sessions to this timetable.
              </p>
              <Button
                onClick={() => setShowScheduleDialog(true)}
                size="sm"
                className="mt-4 rounded-xl text-[12.5px] gap-1.5"
              >
                <Plus className="h-4 w-4" /> Schedule Lecture
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Schedule Lecture Dialog */}
      <ScheduleLectureDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
      />

      {/* Lecture Detail Drawer */}
      <LectureDetailDrawer
        lectureId={selectedLectureId}
        open={!!selectedLectureId}
        onOpenChange={(op) => !op && setSelectedLectureId(null)}
      />
    </div>
  );
}
