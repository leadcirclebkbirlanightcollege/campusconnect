import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Trash2, RotateCcw, UserRound, Building2, GraduationCap, ArrowUpCircle } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import StudentProfileDialog from "./StudentProfileDialog";
import CreateStudentDialog from "./CreateStudentDialog";
import BulkImportDialog from "./BulkImportDialog";
import DangerDeleteAllStudentsPanel from "@/components/admin/DangerDeleteAllStudentsPanel";

export type StudentRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  student_id: string | null;
  department: string | null;
  class_name: string | null;
  is_deleted: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

type StudentFilters = {
  q: string;
  department: string;
  className: string;
  status: "active" | "deleted" | "all";
  verified: "all" | "verified" | "unverified";
};

const DEFAULT_FILTERS: StudentFilters = {
  q: "",
  department: "all",
  className: "all",
  status: "active",
  verified: "all",
};

function normalize(s: string | null | undefined) {
  return (s ?? "").toLowerCase();
}

function matchesFilters(s: StudentRow, f: StudentFilters) {
  const q = normalize(f.q).trim();
  if (f.status !== "all") {
    const wantDeleted = f.status === "deleted";
    if (s.is_deleted !== wantDeleted) return false;
  }

  if (f.verified !== "all") {
    const wantVerified = f.verified === "verified";
    if (s.is_verified !== wantVerified) return false;
  }

  if (f.department !== "all" && (s.department ?? "") !== f.department) return false;
  if (f.className !== "all" && (s.class_name ?? "") !== f.className) return false;

  if (!q) return true;
  const hay = [s.name, s.email, s.student_id, s.phone, s.department, s.class_name]
    .map((x) => normalize(x))
    .join(" ");
  return hay.includes(q);
}

export default function StudentManagementTab() {
  const qc = useQueryClient();

  const [filters, setFilters] = useState<StudentFilters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [openStudentUserId, setOpenStudentUserId] = useState<string | null>(null);
  const [assignCollegeOpen, setAssignCollegeOpen] = useState(false);
  const [assignCollegeId, setAssignCollegeId] = useState("");
  const debouncedQ = useDebounce(filters.q, 300);

  // Load colleges for bulk-assign dropdown
  const collegesQuery = useQuery({
    queryKey: ["admin", "colleges_list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colleges")
        .select("id,college_name")
        .eq("is_active", true)
        .order("college_name");
      return (data ?? []) as { id: string; college_name: string }[];
    },
    staleTime: 300_000,
  });

  const studentsQuery = useQuery({
    queryKey: ["admin", "students"],
    queryFn: async (): Promise<StudentRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,user_id,name,email,phone,student_id,department,class_name,is_deleted,is_verified,created_at,updated_at",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as StudentRow[];
    },
  });

  const distinct = useMemo(() => {
    const rows = studentsQuery.data ?? [];
    const departments = Array.from(new Set(rows.map((r) => r.department).filter(Boolean))) as string[];
    const classNames = Array.from(new Set(rows.map((r) => r.class_name).filter(Boolean))) as string[];
    departments.sort((a, b) => a.localeCompare(b));
    classNames.sort((a, b) => a.localeCompare(b));
    return { departments, classNames };
  }, [studentsQuery.data]);

  const filtered = useMemo(() => {
    const rows = studentsQuery.data ?? [];
    return rows.filter((r) => matchesFilters(r, { ...filters, q: debouncedQ }));
  }, [studentsQuery.data, filters, debouncedQ]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected[r.user_id]);
  const someVisibleSelected = filtered.some((r) => selected[r.user_id]) && !allVisibleSelected;

  const toggleSelectAllVisible = (next: boolean) => {
    setSelected((prev) => {
      const out = { ...prev };
      for (const r of filtered) out[r.user_id] = next;
      return out;
    });
  };

  const clearSelection = () => setSelected({});

  const softDeleteMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .in("user_id", userIds);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Students soft-deleted");
      clearSelection();
      await qc.invalidateQueries({ queryKey: ["admin", "students"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete students"),
  });

  const restoreMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_deleted: false, deleted_at: null })
        .in("user_id", userIds);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Students restored");
      clearSelection();
      await qc.invalidateQueries({ queryKey: ["admin", "students"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to restore students"),
  });

  const toggleVerifyMutation = useMutation({
    mutationFn: async ({ userId, next }: { userId: string; next: boolean }) => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("Not logged in");

      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_verified: next,
          verified_at: next ? now : null,
          verified_by: next ? data.user.id : null,
          updated_at: now,
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;
    },
    onSuccess: async () => {
      toast.success("Verification updated");
      await qc.invalidateQueries({ queryKey: ["admin", "students"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update verification"),
  });

  // Bulk assign college
  const bulkAssignCollegeMutation = useMutation({
    mutationFn: async ({ userIds, collegeId }: { userIds: string[]; collegeId: string }) => {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ college_id: collegeId })
        .in("user_id", userIds);
      if (profileErr) throw profileErr;

      const { error: roleErr } = await supabase
        .from("user_roles")
        .update({ college_id: collegeId })
        .in("user_id", userIds)
        .eq("role", "student");
      if (roleErr) throw roleErr;
    },
    onSuccess: async () => {
      toast.success(`College assigned to ${selectedIds.length} student(s)`);
      setAssignCollegeOpen(false);
      setAssignCollegeId("");
      clearSelection();
      await qc.invalidateQueries({ queryKey: ["admin", "students"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to assign college"),
  });

  // Batch graduate students
  const graduateMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "graduated", graduation_year: new Date().getFullYear(), updated_at: new Date().toISOString() })
        .in("user_id", userIds);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(`${selectedIds.length} student(s) graduated`);
      clearSelection();
      await qc.invalidateQueries({ queryKey: ["admin", "students"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to graduate students"),
  });

  // Batch promote (just updates class_name — admin picks next class)
  const promoteMutation = useMutation({
    mutationFn: async ({ userIds, nextClass }: { userIds: string[]; nextClass: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ class_name: nextClass, updated_at: new Date().toISOString() })
        .in("user_id", userIds);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(`${selectedIds.length} student(s) promoted`);
      clearSelection();
      await qc.invalidateQueries({ queryKey: ["admin", "students"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to promote students"),
  });

  const busy =
    studentsQuery.isLoading ||
    softDeleteMutation.isPending ||
    restoreMutation.isPending ||
    toggleVerifyMutation.isPending ||
    bulkAssignCollegeMutation.isPending ||
    graduateMutation.isPending ||
    promoteMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                Student Management
              </CardTitle>
              <CardDescription>
                Search, filter, bulk soft delete/restore, and drill into a student's attendance history.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CreateStudentDialog />
              <BulkImportDialog />
              <Button
                variant="outline"
                disabled={selectedIds.length === 0 || busy}
                onClick={() => setAssignCollegeOpen(true)}
                className="gap-2"
              >
                <Building2 className="h-4 w-4" />
                Assign College
              </Button>
              <Button
                variant="outline"
                disabled={selectedIds.length === 0 || busy}
                onClick={() => graduateMutation.mutate(selectedIds)}
                className="gap-2"
              >
                <GraduationCap className="h-4 w-4" />
                Graduate
              </Button>
              <Button
                variant="outline"
                disabled={selectedIds.length === 0 || busy}
                onClick={() => restoreMutation.mutate(selectedIds)}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Restore
              </Button>
              <Button
                variant="destructive"
                disabled={selectedIds.length === 0 || busy}
                onClick={() => softDeleteMutation.mutate(selectedIds)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Soft delete
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr,190px,190px,190px,190px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.q}
                onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
                placeholder="Search name, email, student ID…"
                className="pl-10"
              />
            </div>

            <Select
              value={filters.department}
              onValueChange={(v) => setFilters((p) => ({ ...p, department: v }))}
            >
              <SelectTrigger className="gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {distinct.departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.className}
              onValueChange={(v) => setFilters((p) => ({ ...p, className: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {distinct.classNames.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(v) =>
                setFilters((p) => ({ ...p, status: v as StudentFilters["status"] }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.verified}
              onValueChange={(v) =>
                setFilters((p) => ({ ...p, verified: v as StudentFilters["verified"] }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Verified" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{filtered.length} shown</Badge>
              <span className="hidden sm:inline">•</span>
              <span>{selectedIds.length} selected</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                disabled={selectedIds.length === 0}
                onClick={clearSelection}
              >
                Clear selection
              </Button>
            </div>
          </div>

          <Separator />

          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[46px]">
                    <Checkbox
                      checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => toggleSelectAllVisible(Boolean(v))}
                      aria-label="Select all visible students"
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="hidden md:table-cell">Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {studentsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Loading students…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No students match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow
                      key={s.user_id}
                      data-state={selected[s.user_id] ? "selected" : undefined}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setOpenStudentUserId(s.user_id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={Boolean(selected[s.user_id])}
                          onCheckedChange={(v) =>
                            setSelected((p) => ({ ...p, [s.user_id]: Boolean(v) }))
                          }
                          aria-label={`Select ${s.name}`}
                        />
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium leading-tight inline-flex items-center gap-2">
                            {s.name}
                            {s.is_verified ? (
                              <span
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                                aria-label="Verified"
                                title="Verified"
                              >
                                <span className="sr-only">Verified</span>
                                <svg
                                  viewBox="0 0 24 24"
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              </span>
                            ) : null}
                          </span>
                          <span className="text-xs text-muted-foreground">{s.email}</span>
                          {s.student_id ? (
                            <span className="text-xs text-muted-foreground">ID: {s.student_id}</span>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        {s.department ? <span>{s.department}</span> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {s.class_name ? <span>{s.class_name}</span> : <span className="text-muted-foreground">—</span>}
                      </TableCell>

                      <TableCell>
                        {s.is_deleted ? (
                          <Badge variant="secondary">Deleted</Badge>
                        ) : (
                          <Badge className="bg-success text-success-foreground">Active</Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenStudentUserId(s.user_id)}
                          >
                            View
                          </Button>
                          <Button
                            variant={s.is_verified ? "outline" : "secondary"}
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              toggleVerifyMutation.mutate({ userId: s.user_id, next: !s.is_verified })
                            }
                          >
                            {s.is_verified ? "Unverify" : "Verify"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <StudentProfileDialog
        userId={openStudentUserId}
        onOpenChange={(open) => setOpenStudentUserId(open ? openStudentUserId : null)}
      />

      {/* ── Bulk Assign College Dialog ── */}
      <Dialog open={assignCollegeOpen} onOpenChange={setAssignCollegeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Assign College
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Assign a college to <span className="font-semibold text-foreground">{selectedIds.length} selected student(s)</span>.
              This updates both their profile and role record.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">College</Label>
              <Select value={assignCollegeId} onValueChange={setAssignCollegeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select college…" />
                </SelectTrigger>
                <SelectContent>
                  {(collegesQuery.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.college_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignCollegeOpen(false)}>Cancel</Button>
            <Button
              disabled={!assignCollegeId || bulkAssignCollegeMutation.isPending}
              onClick={() => bulkAssignCollegeMutation.mutate({ userIds: selectedIds, collegeId: assignCollegeId })}
              className="gap-2"
            >
              <Building2 className="h-4 w-4" />
              Assign to {selectedIds.length} student{selectedIds.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Operations — Danger Zone */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Advanced Operations
          </h2>
          <div className="flex-1 h-px bg-border-subtle" />
        </div>
        <DangerDeleteAllStudentsPanel scope="college" />
      </div>
    </div>
  );
}
