import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useState, useMemo } from "react";
import { CheckSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

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
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-[20px] font-bold text-foreground">Attendance Records</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">{attendance.length} records</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-[13px] bg-card border-border/50"
          />
        </div>
        <Select value={selectedLecture} onValueChange={setSelectedLecture}>
          <SelectTrigger className="h-9 text-[13px] w-[220px] bg-card border-border/50">
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
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">No attendance records</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/30">
          {(filtered as any[]).map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`h-2 w-2 rounded-full shrink-0 ${a.status === "present" ? "bg-green-500" : "bg-red-500"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">{a.profiles?.name ?? "Unknown"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {a.profiles?.student_id ?? "—"} · {a.profiles?.class_name ?? "—"}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                  a.status === "present" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                }`}>{a.status}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(a.marked_at), "MMM d, HH:mm")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
