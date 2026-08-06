import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useState, useMemo } from "react";
import { CheckSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { WorkspacePage, WorkspaceHero, WorkspaceLoading, WorkspaceEmpty, WorkspaceList, WorkspaceRow } from "@/components/workspace/WorkspaceKit";

export default function FacultyAttendance() {
  const { user } = useAuth();
  const [selectedLecture, setSelectedLecture] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: lectures = [] } = useQuery({
    queryKey: ["faculty", "lectures-list", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date,status")
        .eq("created_by", user!.id)
        .order("lecture_date", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ["faculty", "attendance", user?.id, selectedLecture],
    enabled: !!user && lectures.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      let ids = lectures.map((l) => l.id);
      if (selectedLecture !== "all") ids = [selectedLecture];
      const { data } = await supabase
        .from("attendance")
        .select("id,student_user_id,status,marked_at,lecture_id,profiles:student_user_id(name,student_id,class_name)")
        .in("lecture_id", ids)
        .order("marked_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return attendance;
    const q = search.toLowerCase();
    return attendance.filter((a: any) =>
      a.profiles?.name?.toLowerCase().includes(q) ||
      a.profiles?.student_id?.toLowerCase().includes(q)
    );
  }, [attendance, search]);

  return (
    <WorkspacePage>
      <WorkspaceHero
        eyebrow="Live Roster"
        title="Attendance Records"
        icon={CheckSquare}
        subtitle="Marked attendance across your lectures"
        stats={[
          { label: "Records", value: attendance.length },
          { label: "Showing", value: filtered.length },
        ]}
      />

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 text-[13px] rounded-2xl bg-card border-border/50"
          />
        </div>
        <Select value={selectedLecture} onValueChange={setSelectedLecture}>
          <SelectTrigger className="h-11 text-[13px] w-[240px] rounded-2xl bg-card border-border/50">
            <SelectValue placeholder="Filter by lecture" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lectures</SelectItem>
            {lectures.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.topic} — {format(new Date(l.lecture_date), "MMM d")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
<WorkspaceLoading rows={5} />
      ) : filtered.length === 0 ? (
        <WorkspaceEmpty
          icon={CheckSquare}
          title="No attendance records"
          description="Records appear here as students mark attendance in your lectures."
        />
      ) : (
        <WorkspaceList label="Attendance records">
          {(filtered as any[]).map((a) => (
            <WorkspaceRow key={a.id}>
              <div className={`h-2 w-2 rounded-full shrink-0 ${a.status === "present" ? "bg-success" : "bg-destructive"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">{a.profiles?.name ?? "Unknown"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {a.profiles?.student_id ?? "—"} · {a.profiles?.class_name ?? "—"}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                  a.status === "present" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>{a.status}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(a.marked_at), "MMM d, HH:mm")}</p>
              </div>
            </WorkspaceRow>
          ))}
        </WorkspaceList>
      )}
    </WorkspacePage>
  );
}
