import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollegeContext } from "@/contexts/CollegeContext";
import { Search, Users, AlertTriangle, TrendingUp } from "lucide-react";

type StudentRow = {
  user_id: string;
  name: string;
  email: string;
  college_id: string | null;
  is_verified: boolean;
  student_id: string | null;
  class_name: string | null;
  tier: string | null;
  risk_flags: string[] | null;
  attendance_consistency: number | null;
};

export default function SAStudentsTab() {
  const { colleges } = useCollegeContext();
  const [search, setSearch] = useState("");
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");

  const studentsQuery = useQuery<StudentRow[]>({
    queryKey: ["sa_students_global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, email, college_id, is_verified, student_id, class_name")
        .eq("is_deleted", false)
        .order("name", { ascending: true })
        .limit(500);
      if (error) throw error;

      const userIds = (data ?? []).map((p) => p.user_id);
      const { data: intel } = await supabase
        .from("student_intelligence")
        .select("user_id, tier, risk_flags, attendance_consistency")
        .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

      const intelMap = new Map((intel ?? []).map((i) => [i.user_id, i]));
      return (data ?? []).map((p) => ({
        ...p,
        tier: intelMap.get(p.user_id)?.tier ?? null,
        risk_flags: intelMap.get(p.user_id)?.risk_flags ?? null,
        attendance_consistency: intelMap.get(p.user_id)?.attendance_consistency ?? null,
      }));
    },
    staleTime: 60_000,
  });

  const students = studentsQuery.data ?? [];

  const filtered = students.filter((s) => {
    const matchSearch =
      !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(search.toLowerCase());
    const matchCollege = filterCollege === "all" || s.college_id === filterCollege;
    const hasRisk = (s.risk_flags?.length ?? 0) > 0;
    const matchRisk =
      filterRisk === "all" ||
      (filterRisk === "risk" && hasRisk) ||
      (filterRisk === "safe" && !hasRisk);
    return matchSearch && matchCollege && matchRisk;
  });

  const tierColor: Record<string, string> = {
    elite: "text-purple-400",
    gold: "text-yellow-400",
    silver: "text-slate-300",
    bronze: "text-amber-600",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Global Students</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} of {students.length} students</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, email, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm bg-surface-2 border-border-subtle"
          />
        </div>
        <Select value={filterCollege} onValueChange={setFilterCollege}>
          <SelectTrigger className="w-44 h-9 text-xs bg-surface-2 border-border-subtle">
            <SelectValue placeholder="All colleges" />
          </SelectTrigger>
          <SelectContent className="bg-surface-1 border-border-subtle">
            <SelectItem value="all">All Colleges</SelectItem>
            {colleges.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.college_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="w-36 h-9 text-xs bg-surface-2 border-border-subtle">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent className="bg-surface-1 border-border-subtle">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="risk">⚠ At Risk</SelectItem>
            <SelectItem value="safe">✓ Safe</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {studentsQuery.isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-surface-2 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-surface-1 border-border-subtle border-dashed">
          <CardContent className="py-10 text-center">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No students found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border-subtle overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_80px_80px_80px] gap-0 text-[11px] font-medium text-muted-foreground bg-surface-2 px-4 py-2.5 border-b border-border-subtle">
            <span>Name</span>
            <span>College</span>
            <span>Class</span>
            <span className="text-center">Tier</span>
            <span className="text-center">Attend.</span>
            <span className="text-center">Risk</span>
          </div>
          <div className="divide-y divide-border-subtle/50 bg-surface-1">
            {filtered.slice(0, 100).map((s) => {
              const college = colleges.find((c) => c.id === s.college_id);
              const hasRisk = (s.risk_flags?.length ?? 0) > 0;
              return (
                <div
                  key={s.user_id}
                  className="grid grid-cols-[1fr_1fr_1fr_80px_80px_80px] gap-0 items-center px-4 py-2.5 hover:bg-surface-2/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.student_id ?? s.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {college?.college_name ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {s.class_name ?? "—"}
                  </span>
                  <div className="flex justify-center">
                    <span className={`text-xs font-semibold capitalize ${tierColor[s.tier ?? "bronze"] ?? "text-muted-foreground"}`}>
                      {s.tier ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    <span className="text-xs text-muted-foreground">
                      {s.attendance_consistency != null ? `${s.attendance_consistency}%` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    {hasRisk ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 text-success" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length > 100 && (
            <div className="px-4 py-2.5 bg-surface-2 border-t border-border-subtle text-center text-xs text-muted-foreground">
              Showing 100 of {filtered.length} — refine filters to narrow results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
