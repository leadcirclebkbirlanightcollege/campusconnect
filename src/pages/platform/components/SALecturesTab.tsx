import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollegeContext } from "@/contexts/CollegeContext";
import { BookOpen, Radio, Clock, CheckCircle2, Zap } from "@/components/icons";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

type Lecture = {
  id: string;
  topic: string;
  venue: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  status: string;
  college_id: string | null;
};

const STATUS_CONFIG = {
  live: { label: "Live", icon: Radio, color: "text-success bg-success/10 border-success/20" },
  scheduled: { label: "Scheduled", icon: Clock, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  ended: { label: "Ended", icon: CheckCircle2, color: "text-muted-foreground bg-muted/20 border-border-subtle" },
};

export default function SALecturesTab() {
  const { colleges } = useCollegeContext();
  const qc = useQueryClient();
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const lecturesQuery = useQuery<Lecture[]>({
    queryKey: ["sa_lectures_global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id, topic, venue, lecture_date, start_time, end_time, status, college_id")
        .order("lecture_date", { ascending: false })
        .order("start_time", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as Lecture[]) ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const forceEnd = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lectures")
        .update({ status: "ended" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lecture force-ended");
      qc.invalidateQueries({ queryKey: ["sa_lectures_global"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lectures = lecturesQuery.data ?? [];

  const filtered = lectures.filter((l) => {
    const matchCollege = filterCollege === "all" || l.college_id === filterCollege;
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchCollege && matchStatus;
  });

  const live = filtered.filter((l) => l.status === "live");
  const upcoming = filtered.filter((l) => l.status === "scheduled");
  const ended = filtered.filter((l) => l.status === "ended");

  const LiveBadge = ({ count }: { count: number }) =>
    count > 0 ? (
      <span className="inline-flex items-center gap-1 text-[10px] bg-success/15 text-success border border-success/20 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        {count} Live
      </span>
    ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">Lecture Monitor</h2>
          <LiveBadge count={live.length} />
        </div>
        <div className="flex gap-2">
          <Select value={filterCollege} onValueChange={setFilterCollege}>
            <SelectTrigger className="w-44 h-9 text-xs bg-surface-2 border-border-subtle">
              <SelectValue placeholder="All colleges" />
            </SelectTrigger>
            <SelectContent className="bg-surface-1 border-border-subtle">
              <SelectItem value="all">All Colleges</SelectItem>
              {colleges.map((c) => <SelectItem key={c.id} value={c.id}>{c.college_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9 text-xs bg-surface-2 border-border-subtle">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent className="bg-surface-1 border-border-subtle">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="live">🟢 Live</SelectItem>
              <SelectItem value="scheduled">🔵 Scheduled</SelectItem>
              <SelectItem value="ended">⚫ Ended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Live", value: live.length, icon: Radio, color: "text-success" },
          { label: "Scheduled", value: upcoming.length, icon: Clock, color: "text-blue-400" },
          { label: "Ended", value: ended.length, icon: CheckCircle2, color: "text-muted-foreground" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-surface-1 border-border-subtle">
            <CardContent className="p-3 flex items-center gap-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <div>
                <p className="text-lg font-semibold text-foreground">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      {lecturesQuery.isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-surface-2 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-surface-1 border-border-subtle border-dashed">
          <CardContent className="py-10 text-center">
            <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No lectures found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 80).map((lecture) => {
            const cfg = STATUS_CONFIG[lecture.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.ended;
            const college = colleges.find((c) => c.id === lecture.college_id);
            return (
              <Card key={lecture.id} className="bg-surface-1 border-border-subtle hover:border-border-strong transition-colors">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 rounded-lg border px-2 py-1 ${cfg.color}`}>
                      <cfg.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">{lecture.topic}</span>
                        {college && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">{college.college_name}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lecture.venue} · {format(new Date(lecture.lecture_date), "d MMM yyyy")} · {lecture.start_time}–{lecture.end_time}
                      </p>
                    </div>
                    {lecture.status === "live" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => {
                          if (confirm(`Force-end lecture: "${lecture.topic}"?`)) {
                            forceEnd.mutate(lecture.id);
                          }
                        }}
                        disabled={forceEnd.isPending}
                      >
                        <Zap className="w-3 h-3" />
                        Force End
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
