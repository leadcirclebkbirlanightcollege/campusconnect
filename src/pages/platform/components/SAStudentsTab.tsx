/**
 * SAStudentsTab — Server-side paginated global student directory for Super Admin.
 * Provides exclusive Super Admin authority over Campus Connect Core Team memberships.
 */
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollegeContext } from "@/contexts/CollegeContext";
import {
  Search, Users, AlertTriangle, CheckCircle2,
  ChevronLeft, ChevronRight as ChevronRightIcon, RefreshCw, Shield, Sparkles,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { CoreMemberBadge } from "@/components/badges/CoreMemberBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 50;

const TIER_STYLE: Record<string, string> = {
  elite:  "text-purple-400 bg-purple-400/10 border-purple-400/20",
  gold:   "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  silver: "text-slate-300 bg-slate-300/10 border-slate-300/20",
  bronze: "text-amber-600 bg-amber-600/10 border-amber-600/20",
};

type StudentRow = {
  user_id: string;
  name: string;
  email: string;
  college_id: string | null;
  is_verified: boolean;
  is_core_member: boolean;
  student_id: string | null;
  class_name: string | null;
  tier: string | null;
  risk_flags: string[] | null;
  attendance_consistency: number | null;
};

export default function SAStudentsTab() {
  const qc = useQueryClient();
  const { colleges } = useCollegeContext();
  const [search, setSearch]               = useState("");
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterRisk, setFilterRisk]       = useState("all");
  const [filterCore, setFilterCore]       = useState("all");
  const [page, setPage]                   = useState(0);

  // Super Admin Core Team action confirmation
  const [confirmDialog, setConfirmDialog] = useState<{
    student: StudentRow;
    action: "grant" | "remove";
  } | null>(null);

  const debouncedSearch = useDebounce(search, 350);

  // Reset to page 0 on filter change
  const handleCollegeChange = useCallback((v: string) => { setFilterCollege(v); setPage(0); }, []);
  const handleRiskChange    = useCallback((v: string) => { setFilterRisk(v); setPage(0); }, []);
  const handleCoreChange    = useCallback((v: string) => { setFilterCore(v); setPage(0); }, []);
  const handleSearchChange  = useCallback((v: string) => { setSearch(v); setPage(0); }, []);

  const studentsQuery = useQuery<{ rows: StudentRow[]; total: number }>({
    queryKey: ["sa_students_global", debouncedSearch, filterCollege, filterRisk, filterCore, page],
    queryFn: async () => {
      // Build base query with server-side filters
      let q = supabase
        .from("profiles")
        .select("user_id, name, email, college_id, is_verified, is_core_member, student_id, class_name", { count: "exact" })
        .eq("is_deleted", false)
        .order("name", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filterCollege !== "all") q = q.eq("college_id", filterCollege);
      if (filterCore === "core") q = q.eq("is_core_member", true);
      if (filterCore === "standard") q = q.eq("is_core_member", false);

      if (debouncedSearch.trim()) {
        q = q.or(
          `name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,student_id.ilike.%${debouncedSearch}%`
        );
      }

      const { data, count, error } = await q;
      if (error) throw error;

      const userIds = (data ?? []).map((p) => p.user_id);
      const { data: intel } = userIds.length > 0
        ? await supabase
            .from("student_intelligence")
            .select("user_id, tier, risk_flags, attendance_consistency")
            .in("user_id", userIds)
        : { data: [] };

      const intelMap = new Map((intel ?? []).map((i) => [i.user_id, i]));
      let rows = (data ?? []).map((p) => ({
        ...p,
        is_core_member:         Boolean(p.is_core_member),
        tier:                   intelMap.get(p.user_id)?.tier ?? null,
        risk_flags:             intelMap.get(p.user_id)?.risk_flags ?? null,
        attendance_consistency: intelMap.get(p.user_id)?.attendance_consistency ?? null,
      }));

      // Client-side risk filter
      if (filterRisk === "risk")  rows = rows.filter((s) => (s.risk_flags?.length ?? 0) > 0);
      if (filterRisk === "safe")  rows = rows.filter((s) => (s.risk_flags?.length ?? 0) === 0);

      return { rows, total: count ?? 0 } as { rows: StudentRow[]; total: number };
    },
    staleTime: 45_000,
    placeholderData: (prev) => prev,
  });

  // Super Admin RPC call to grant or revoke Core Member status
  const coreMemberMutation = useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      const { error } = await supabase.rpc("admin_set_core_member", {
        p_user_id: userId,
        p_is_core_member: grant,
      });
      if (error) throw error;
    },
    onSuccess: (_, { grant }) => {
      toast.success(grant ? "Granted Campus Connect Core Team badge" : "Removed Core Team membership");
      setConfirmDialog(null);
      qc.invalidateQueries({ queryKey: ["sa_students_global"] });
      qc.invalidateQueries({ queryKey: ["admin", "students"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to update Core Team status");
    },
  });

  const rows  = (studentsQuery.data as any)?.rows  as StudentRow[] ?? [];
  const total = (studentsQuery.data as any)?.total as number      ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Global Students</h2>
          <p className="text-xs text-muted-foreground">
            {total.toLocaleString()} students · page {page + 1} of {totalPages}
            {" · "}<span className="text-primary/80 font-medium">server-side pagination</span>
          </p>
        </div>
        <Button
          size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
          onClick={() => studentsQuery.refetch()}
          disabled={studentsQuery.isFetching}
        >
          <RefreshCw className={cn("h-3 w-3", studentsQuery.isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, email, student ID…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm bg-surface-2 border-border-subtle"
          />
        </div>
        <Select value={filterCollege} onValueChange={handleCollegeChange}>
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
        <Select value={filterCore} onValueChange={handleCoreChange}>
          <SelectTrigger className="w-40 h-9 text-xs bg-surface-2 border-border-subtle">
            <SelectValue placeholder="All Members" />
          </SelectTrigger>
          <SelectContent className="bg-surface-1 border-border-subtle">
            <SelectItem value="all">All Members</SelectItem>
            <SelectItem value="core">Core Team Only</SelectItem>
            <SelectItem value="standard">Standard Students</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRisk} onValueChange={handleRiskChange}>
          <SelectTrigger className="w-36 h-9 text-xs bg-surface-2 border-border-subtle">
            <SelectValue placeholder="All Risk" />
          </SelectTrigger>
          <SelectContent className="bg-surface-1 border-border-subtle">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="risk">⚠ At Risk</SelectItem>
            <SelectItem value="safe">✓ Safe</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ERP Table */}
      {studentsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border-subtle border-dashed bg-surface-1 py-12 text-center space-y-2">
          <Users className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
          <p className="text-[13px] text-muted-foreground">No students found</p>
        </div>
      ) : (
        <div className={cn("rounded-xl border border-border-subtle overflow-hidden shadow-xs transition-opacity", studentsQuery.isFetching && "opacity-70")}>
          {/* Header */}
          <div className="grid grid-cols-[1.4fr_1fr_0.9fr_70px_70px_50px_120px_110px] text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-surface-2 px-5 py-3 border-b border-border-subtle">
            <span>Student</span>
            <span>College</span>
            <span>Class</span>
            <span className="text-center">Tier</span>
            <span className="text-center">Attend.</span>
            <span className="text-center">Risk</span>
            <span className="text-center">Core Team</span>
            <span className="text-right">Action</span>
          </div>
          {/* Rows */}
          <div className="divide-y divide-border-subtle/40 bg-surface-1">
            {rows.map((s) => {
              const college  = colleges.find((c) => c.id === s.college_id);
              const hasRisk  = (s.risk_flags?.length ?? 0) > 0;
              return (
                <div
                  key={s.user_id}
                  className="grid grid-cols-[1.4fr_1fr_0.9fr_70px_70px_50px_120px_110px] items-center px-5 py-2.5 hover:bg-surface-2/50 transition-colors duration-100"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[12px] font-medium text-foreground truncate">{s.name}</p>
                      {s.is_core_member ? (
                        <CoreMemberBadge variant="compact" size="sm" showTooltip={false} />
                      ) : null}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{s.student_id ?? s.email}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate">{college?.college_name ?? "—"}</span>
                  <span className="text-[11px] text-muted-foreground truncate">{s.class_name ?? "—"}</span>
                  <div className="flex justify-center">
                    {s.tier
                      ? <span className={cn("text-[9px] font-semibold capitalize px-1.5 py-0.5 rounded-full border", TIER_STYLE[s.tier] ?? "text-muted-foreground")}>{s.tier}</span>
                      : <span className="text-[10px] text-muted-foreground">—</span>}
                  </div>
                  <div className="flex justify-center">
                    {s.attendance_consistency != null
                      ? <span className={cn("text-[11px] font-medium tabular-nums",
                          s.attendance_consistency >= 75 ? "text-success" :
                          s.attendance_consistency >= 50 ? "text-warning" : "text-danger"
                        )}>{s.attendance_consistency}%</span>
                      : <span className="text-[10px] text-muted-foreground">—</span>}
                  </div>
                  <div className="flex justify-center">
                    {hasRisk
                      ? <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                  </div>
                  {/* Campus Connect Core Team Status */}
                  <div className="flex justify-center">
                    {s.is_core_member ? (
                      <span className="inline-flex items-center text-[10px] font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md">
                        Core Member
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Standard</span>
                    )}
                  </div>
                  {/* Super Admin Control Actions */}
                  <div className="flex justify-end">
                    {s.is_core_member ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmDialog({ student: s, action: "remove" })}
                        disabled={coreMemberMutation.isPending}
                      >
                        Remove Core
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] border-sky-500/40 text-sky-400 hover:bg-sky-500/10"
                        onClick={() => setConfirmDialog({ student: s, action: "grant" })}
                        disabled={coreMemberMutation.isPending}
                      >
                        Grant Core
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm" variant="outline" className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || studentsQuery.isFetching}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
              return (
                <Button
                  key={pageNum}
                  size="sm"
                  variant={pageNum === page ? "default" : "outline"}
                  className="h-7 w-7 p-0 text-xs"
                  onClick={() => setPage(pageNum)}
                  disabled={studentsQuery.isFetching}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button
              size="sm" variant="outline" className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || studentsQuery.isFetching}
            >
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Super Admin Confirmation Dialog */}
      <AlertDialog
        open={Boolean(confirmDialog)}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.action === "grant"
                ? "Grant Core Team badge?"
                : "Remove Core Team badge?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === "grant"
                ? `This will mark ${confirmDialog.student.name} as a Campus Connect Core Team member and display the Core Team badge across the platform.`
                : `This will remove ${confirmDialog?.student.name}'s Campus Connect Core Team membership.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={coreMemberMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog) {
                  coreMemberMutation.mutate({
                    userId: confirmDialog.student.user_id,
                    grant: confirmDialog.action === "grant",
                  });
                }
              }}
              className={
                confirmDialog?.action === "remove"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }
              disabled={coreMemberMutation.isPending}
            >
              {coreMemberMutation.isPending
                ? "Updating…"
                : confirmDialog?.action === "grant"
                ? "Grant Core Team Badge"
                : "Remove Core Team Badge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
