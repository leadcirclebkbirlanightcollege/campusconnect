import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Users, Filter, CheckCircle2, UserCheck, Clock, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AttendanceRow = { id: string; student_user_id: string; status: string; marked_at: string; };
type ProfileRow = { user_id: string; name: string; student_id: string | null; department: string | null; class_name: string | null; is_verified: boolean; };
type Row = {
  attendanceId: string; studentUserId: string; name: string; studentId: string;
  department: string; className: string; status: string; timestamp: string; isVerified: boolean;
};

function downloadCsv(filename: string, rows: Row[]) {
  const header = ["Name", "Student ID", "Department", "Class", "Status", "Timestamp"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [header.join(","), ...rows.map((r) => [r.name, r.studentId, r.department, r.className, r.status, r.timestamp].map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminAttendanceLiveView({ lectureId }: { lectureId: string }) {
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const enabled = Boolean(lectureId);

  const summaryQuery = useQuery({
    queryKey: ["admin", "attendance", "summary", lectureId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lecture_attendance_summary", { p_lecture_id: lectureId });
      if (error) throw error;
      return data as { present_count: number; total_students: number; attendance_percentage: number };
    },
    refetchInterval: 5_000,
  });

  const presentQuery = useQuery({
    queryKey: ["admin", "attendance", "present", lectureId, { verifiedOnly }],
    enabled,
    queryFn: async (): Promise<Row[]> => {
      const { data: attendance, error: aErr } = await supabase
        .from("attendance").select("id,student_user_id,status,marked_at")
        .eq("lecture_id", lectureId).eq("status", "present")
        .order("marked_at", { ascending: false }).limit(1000);
      if (aErr) throw aErr;

      const userIds = [...new Set((attendance ?? []).map((a) => a.student_user_id))];
      if (userIds.length === 0) return [];

      let profilesQ = supabase.from("profiles").select("user_id,name,student_id,department,class_name,is_verified").in("user_id", userIds);
      if (verifiedOnly) profilesQ = profilesQ.eq("is_verified", true);
      const { data: profiles, error: pErr } = await profilesQ;
      if (pErr) throw pErr;

      const map: Record<string, ProfileRow> = {};
      for (const p of (profiles ?? []) as ProfileRow[]) map[p.user_id] = p;

      return ((attendance ?? []) as AttendanceRow[])
        .filter((a) => Boolean(map[a.student_user_id]))
        .map((a) => {
          const p = map[a.student_user_id];
          return {
            attendanceId: a.id, studentUserId: a.student_user_id,
            name: p?.name ?? a.student_user_id, studentId: p?.student_id ?? "—",
            department: p?.department ?? "—", className: p?.class_name ?? "—",
            status: a.status, timestamp: new Date(a.marked_at).toLocaleTimeString(),
            isVerified: Boolean(p?.is_verified),
          };
        });
    },
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase.channel(`admin_attendance_live_${lectureId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance", filter: `lecture_id=eq.${lectureId}` }, () => {
        presentQuery.refetch();
        summaryQuery.refetch();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, lectureId]);

  const rows = useMemo(() => presentQuery.data ?? [], [presentQuery.data]);
  const summary = summaryQuery.data;
  const pct = summary?.attendance_percentage ?? 0;

  if (!enabled) return null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden dashboard-panel shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">Live Check-ins</p>
            <p className="text-[11px] text-muted-foreground">Real-time list of students marked present</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant={verifiedOnly ? "secondary" : "outline"} size="sm"
            className="gap-1.5 text-xs" onClick={() => setVerifiedOnly((v) => !v)}>
            <Filter className="h-3.5 w-3.5" /> {verifiedOnly ? "Verified only" : "All"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs"
            onClick={() => { try { downloadCsv(`attendance-${lectureId}.csv`, rows); } catch { toast.error("Export failed"); } }}
            disabled={rows.length === 0}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-5 py-3 bg-surface-2 border-b border-border-subtle">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-[12px]">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="font-semibold text-foreground tabular-nums">{summary?.present_count ?? 0}</span>
            <span className="text-muted-foreground">present</span>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <UserCheck className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground tabular-nums">{summary?.total_students ?? 0}</span>
            <span className="text-muted-foreground">expected</span>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <BarChart3 className="h-3.5 w-3.5 text-warning" />
            <span className={cn("font-semibold tabular-nums", pct >= 75 ? "text-success" : pct >= 50 ? "text-warning" : "text-danger")}>{pct}%</span>
            <span className="text-muted-foreground">rate</span>
          </div>
          <div className="flex-1 min-w-32">
            <Progress value={pct} className="h-1.5" />
          </div>
        </div>
      </div>

      {/* Student rows */}
      <div className="divide-y divide-border-subtle/50 max-h-96 overflow-y-auto">
        {presentQuery.isLoading ? (
          <div className="p-5 space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Clock className="h-7 w-7 text-muted-foreground mx-auto opacity-40" />
            <p className="text-[13px] text-muted-foreground">No students checked in yet</p>
            <p className="text-[11px] text-muted-foreground">Students appear here instantly when they mark attendance</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {rows.map((r, idx) => (
              <motion.div
                key={r.attendanceId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.3) }}
                className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-foreground truncate">{r.name}</span>
                    {r.isVerified && (
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{r.studentId} · {r.className !== "—" ? r.className : r.department}</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge className="bg-success/10 text-success border-0 text-[10px] px-1.5">Present</Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{r.timestamp}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {rows.length > 0 && (
        <div className="px-5 py-2.5 bg-surface-2 border-t border-border-subtle text-center text-[11px] text-muted-foreground">
          {rows.length} students checked in · updates in real-time
        </div>
      )}
    </div>
  );
}
