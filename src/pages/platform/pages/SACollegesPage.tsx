/**
 * SACollegesPage — ERP-style college management table.
 * Shows student counts per college via batched queries (no N+1).
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { CollegeFormDialog } from "@/pages/platform/components/CollegeManagement";
import { toast } from "sonner";
import {
  Building2, Plus, Pencil, Search, Users,
  GraduationCap, RefreshCw, CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CollegeRow = {
  id: string;
  college_name: string;
  subdomain: string | null;
  logo_url: string | null;
  tagline: string | null;
  primary_color: string | null;
  is_active: boolean;
  created_at: string;
  students: number;
  lectures: number;
};

function useCollegesERP() {
  return useQuery<CollegeRow[]>({
    queryKey: ["sa_colleges_erp"],
    queryFn: async () => {
      const [{ data: colleges }, { data: students }, { data: lectures }] = await Promise.all([
        supabase.from("colleges").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("college_id").eq("is_deleted", false).not("college_id", "is", null),
        supabase.from("lectures").select("college_id").not("college_id", "is", null),
      ]);

      const studentMap: Record<string, number> = {};
      for (const s of students ?? []) {
        if (s.college_id) studentMap[s.college_id] = (studentMap[s.college_id] ?? 0) + 1;
      }
      const lectureMap: Record<string, number> = {};
      for (const l of lectures ?? []) {
        if (l.college_id) lectureMap[l.college_id] = (lectureMap[l.college_id] ?? 0) + 1;
      }

      return (colleges ?? []).map((c) => ({
        ...c,
        students: studentMap[c.id] ?? 0,
        lectures: lectureMap[c.id] ?? 0,
      }));
    },
    staleTime: 45_000,
  });
}

export default function SACollegesPage() {
  const qc = useQueryClient();
  const { data: colleges = [], isLoading, isFetching, refetch } = useCollegesERP();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen]       = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const filtered = useMemo(() =>
    colleges.filter((c) =>
      !search.trim() ||
      c.college_name.toLowerCase().includes(search.toLowerCase()) ||
      c.subdomain?.toLowerCase().includes(search.toLowerCase())
    ),
    [colleges, search]
  );

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("colleges").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("College status updated"); qc.invalidateQueries({ queryKey: ["sa_colleges_erp"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalStudents = colleges.reduce((s, c) => s + c.students, 0);
  const activeCount   = colleges.filter((c) => c.is_active).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[18px] font-black text-foreground tracking-tight">College Management</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {colleges.length} institutions · {totalStudents.toLocaleString()} total students · {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setEditTarget(null); setAddOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Add College
          </Button>
        </div>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Colleges",  value: colleges.length,  icon: Building2,     color: "text-primary",  bg: "bg-primary/10"  },
          { label: "Active",          value: activeCount,       icon: CheckCircle2,  color: "text-success",  bg: "bg-success/10"  },
          { label: "Inactive",        value: colleges.length - activeCount, icon: XCircle, color: "text-warning", bg: "bg-warning/10" },
          { label: "Total Students",  value: totalStudents,     icon: Users,         color: "text-accent",   bg: "bg-accent/10"   },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-border-subtle bg-surface-1 p-4 flex items-center gap-3">
            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", bg)}>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            <div>
              <p className="text-[20px] font-black text-foreground tabular-nums leading-none">{value.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search colleges…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm bg-surface-2 border-border-subtle"
        />
      </div>

      {/* ERP Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface-1 py-12 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-[13px] text-muted-foreground">
            {search ? "No colleges match your search" : "No colleges yet"}
          </p>
          {!search && (
            <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add first college
            </Button>
          )}
        </div>
      ) : (
        <div className={cn("rounded-xl border border-border-subtle overflow-hidden shadow-xs", isFetching && "opacity-70")}>
          {/* Table header */}
          <div className="grid grid-cols-[1.8fr_1fr_80px_80px_90px_100px] text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-surface-2 px-5 py-3 border-b border-border-subtle">
            <span>College</span>
            <span>Subdomain</span>
            <span className="text-center">Students</span>
            <span className="text-center">Lectures</span>
            <span className="text-center">Status</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-border-subtle/40 bg-surface-1">
            {filtered.map((college) => (
              <div
                key={college.id}
                className="grid grid-cols-[1.8fr_1fr_80px_80px_90px_100px] items-center px-5 py-3 hover:bg-surface-2/50 transition-colors duration-100"
              >
                {/* College info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border"
                    style={{
                      backgroundColor: (college.primary_color ?? "#6366f1") + "22",
                      borderColor:     (college.primary_color ?? "#6366f1") + "44",
                    }}
                  >
                    {college.logo_url
                      ? <img src={college.logo_url} className="h-5 w-5 object-contain rounded" alt="" />
                      : <Building2 className="h-4 w-4" style={{ color: college.primary_color ?? "#6366f1" }} />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{college.college_name}</p>
                    {college.tagline && (
                      <p className="text-[10px] text-muted-foreground truncate">{college.tagline}</p>
                    )}
                  </div>
                </div>

                {/* Subdomain */}
                <span className="text-[11px] text-muted-foreground font-mono truncate">
                  {college.subdomain ? `${college.subdomain}.cc` : "—"}
                </span>

                {/* Students */}
                <div className="flex items-center justify-center gap-1">
                  <Users className="h-3 w-3 text-success shrink-0" />
                  <span className="text-[12px] font-semibold text-foreground tabular-nums">{college.students.toLocaleString()}</span>
                </div>

                {/* Lectures */}
                <div className="flex items-center justify-center gap-1">
                  <GraduationCap className="h-3 w-3 text-accent shrink-0" />
                  <span className="text-[12px] font-semibold text-foreground tabular-nums">{college.lectures.toLocaleString()}</span>
                </div>

                {/* Status toggle */}
                <div className="flex items-center justify-center gap-1.5">
                  <Switch
                    checked={college.is_active}
                    onCheckedChange={() => toggleActive.mutate({ id: college.id, is_active: college.is_active })}
                    disabled={toggleActive.isPending}
                    className="scale-75"
                  />
                  <Badge
                    variant={college.is_active ? "outline" : "secondary"}
                    className={cn("text-[9px] h-4 px-1", college.is_active ? "text-success border-success/30" : "text-muted-foreground")}
                  >
                    {college.is_active ? "Active" : "Off"}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost" size="sm" className="h-7 w-7 p-0"
                    onClick={() => { setEditTarget(college); setAddOpen(true); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {filtered.length > 0 && (
            <div className="px-5 py-2.5 bg-surface-2 border-t border-border-subtle">
              <p className="text-[10px] text-muted-foreground">{filtered.length} college{filtered.length !== 1 ? "s" : ""} shown</p>
            </div>
          )}
        </div>
      )}

      <CollegeFormDialog
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditTarget(null); qc.invalidateQueries({ queryKey: ["sa_colleges_erp"] }); }}
        editing={editTarget}
      />
    </div>
  );
}
