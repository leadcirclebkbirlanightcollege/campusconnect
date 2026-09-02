/**
 * AdminFacultyTab — Complete Faculty Management Module for College Admins.
 * Route: /platform/admin/faculty
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/providers/TenantProvider";
import { format } from "date-fns";
import {
  GraduationCap, Search, Plus, MoreHorizontal,
  UserCheck, UserX, RefreshCw, Mail, Phone, BookOpen,
  Shield, Loader2, AlertTriangle, UserPen, Building2,
  CalendarDays, IdCard, CheckCircle2, XCircle, RotateCcw,
  SlidersHorizontal, Users,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatFacultyName } from "@/lib/faculty";
import { cn } from "@/lib/utils";

import type { FacultyMember, DepartmentOption, FacultyFilters } from "./types";
import { AddFacultyDialog } from "./AddFacultyDialog";
import { EditFacultyDialog } from "./EditFacultyDialog";
import { FacultyDetailDrawer } from "./FacultyDetailDrawer";

const DEFAULT_FILTERS: FacultyFilters = {
  search: "",
  department: "all",
  status: "all",
  verification: "all",
};

export default function AdminFacultyTab() {
  const collegeId = useTenantId();
  const queryClient = useQueryClient();

  // State
  const [filters, setFilters] = useState<FacultyFilters>(DEFAULT_FILTERS);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FacultyMember | null>(null);
  const [viewTarget, setViewTarget] = useState<FacultyMember | null>(null);
  const [viewTab, setViewTab] = useState<"overview" | "lectures" | "timetable">("overview");
  const [removeTarget, setRemoveTarget] = useState<FacultyMember | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<FacultyMember | null>(null);

  // 1. Fetch academic departments for filter and forms
  const { data: departments = [] } = useQuery<DepartmentOption[]>({
    queryKey: ["admin_departments", collegeId],
    enabled: Boolean(collegeId),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, is_active")
        .eq("college_id", collegeId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as DepartmentOption[];
    },
  });

  // 2. Fetch all faculty members (user_roles + profiles)
  const { data: faculty = [], isLoading, refetch, isFetching } = useQuery<FacultyMember[]>({
    queryKey: ["admin_faculty", collegeId],
    enabled: Boolean(collegeId),
    staleTime: 30_000,
    queryFn: async () => {
      // Fetch user_roles with role = 'faculty'
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("id, user_id, college_id, created_at")
        .eq("role", "faculty")
        .eq("college_id", collegeId!);
      if (rolesErr) throw rolesErr;
      if (!roles || roles.length === 0) return [];

      const userIds = roles.map((r) => r.user_id);

      // Fetch profiles
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, name, title, email, phone, department, student_id, college_id, avatar_url, is_verified, is_deleted, created_at, updated_at")
        .in("user_id", userIds);
      if (profErr) throw profErr;

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      return roles.map((r) => {
        const p = profileMap.get(r.user_id);
        return {
          user_id: r.user_id,
          name: p?.name || "Unknown Faculty",
          title: (p as any)?.title || null,
          email: p?.email || "—",
          phone: p?.phone || null,
          department: p?.department || null,
          student_id: p?.student_id || null,
          college_id: p?.college_id || r.college_id,
          avatar_url: p?.avatar_url || null,
          is_verified: Boolean(p?.is_verified),
          is_deleted: Boolean(p?.is_deleted),
          created_at: p?.created_at || r.created_at,
          updated_at: p?.updated_at,
          roleId: r.id,
        } as FacultyMember;
      });
    },
  });

  // Invalidate queries helper
  const invalidateFaculty = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin_faculty", collegeId] });
  }, [queryClient, collegeId]);

  // 3. Mutations for Quick Actions
  // Toggle Verification
  const verifyMutation = useMutation({
    mutationFn: async ({ uid, verify }: { uid: string; verify: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_verified: verify, updated_at: new Date().toISOString() })
        .eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.verify ? "Faculty marked as Verified" : "Verification removed");
      invalidateFaculty();
      if (viewTarget?.user_id === vars.uid) {
        setViewTarget((prev) => prev ? { ...prev, is_verified: vars.verify } : null);
      }
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update verification"),
  });

  // Toggle Active/Inactive (Safe Deactivation)
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ uid, isDeleted }: { uid: string; isDeleted: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_deleted: isDeleted, updated_at: new Date().toISOString() })
        .eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.isDeleted ? "Faculty account deactivated" : "Faculty account reactivated");
      setDeactivateTarget(null);
      invalidateFaculty();
      if (viewTarget?.user_id === vars.uid) {
        setViewTarget((prev) => prev ? { ...prev, is_deleted: vars.isDeleted } : null);
      }
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update status"),
  });

  // Remove Faculty Role
  const removeRoleMutation = useMutation({
    mutationFn: async (uid: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", uid)
        .eq("role", "faculty");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Faculty role revoked successfully");
      setRemoveTarget(null);
      invalidateFaculty();
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to revoke faculty role"),
  });

  // 4. Filtering Logic
  const filteredFaculty = useMemo(() => {
    return faculty.filter((f) => {
      // Search
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const matchesSearch =
          f.name.toLowerCase().includes(q) ||
          f.email.toLowerCase().includes(q) ||
          (f.student_id ?? "").toLowerCase().includes(q) ||
          (f.phone ?? "").toLowerCase().includes(q) ||
          (f.department ?? "").toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Department
      if (filters.department !== "all") {
        if ((f.department ?? "").toLowerCase() !== filters.department.toLowerCase()) {
          return false;
        }
      }

      // Status
      if (filters.status === "active" && f.is_deleted) return false;
      if (filters.status === "inactive" && !f.is_deleted) return false;

      // Verification
      if (filters.verification === "verified" && !f.is_verified) return false;
      if (filters.verification === "unverified" && f.is_verified) return false;

      return true;
    });
  }, [faculty, filters]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = faculty.length;
    const active = faculty.filter((f) => !f.is_deleted).length;
    const verified = faculty.filter((f) => f.is_verified).length;
    const departmentsCount = new Set(faculty.map((f) => f.department).filter(Boolean)).size;
    return { total, active, verified, departmentsCount };
  }, [faculty]);

  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    filters.department !== "all" ||
    filters.status !== "all" ||
    filters.verification !== "all";

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-2">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            Faculty Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your institution's faculty roster, department affiliations, credentials, and teaching assignments.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="h-9 gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Faculty
          </Button>
        </div>
      </div>

      {/* ── KPI Summary Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Faculty</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{metrics.total}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Faculty</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{metrics.active}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Verified</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{metrics.verified}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Departments</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{metrics.departmentsCount}</p>
          </div>
        </div>
      </div>

      {/* ── Search & Filters Bar ────────────────────────────────────────────── */}
      <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Input */}
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search faculty by name, email, ID…"
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Department Filter */}
          <Select
            value={filters.department}
            onValueChange={(val) => setFilters((p) => ({ ...p, department: val }))}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.status}
            onValueChange={(val: "all" | "active" | "inactive") => setFilters((p) => ({ ...p, status: val }))}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Accounts</SelectItem>
              <SelectItem value="inactive">Deactivated</SelectItem>
            </SelectContent>
          </Select>

          {/* Verification Filter */}
          <Select
            value={filters.verification}
            onValueChange={(val: "all" | "verified" | "unverified") => setFilters((p) => ({ ...p, verification: val }))}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verification</SelectItem>
              <SelectItem value="verified">Verified Only</SelectItem>
              <SelectItem value="unverified">Pending Verification</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
            <span className="text-muted-foreground">
              Showing {filteredFaculty.length} of {faculty.length} faculty members
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* ── Main Data Table ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Faculty Member</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Contact Info</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Faculty ID</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Department</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Joined</TableHead>
              <TableHead className="w-16 text-right text-xs font-semibold uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Loading faculty directory…</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredFaculty.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto text-muted-foreground">
                    <GraduationCap className="h-10 w-10 opacity-30" />
                    <p className="text-sm font-semibold text-foreground">
                      {hasActiveFilters ? "No faculty members match these filters" : "No faculty members registered yet"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {hasActiveFilters
                        ? "Try adjusting your search keywords or reset active filters."
                        : "Add your institution's faculty members to get started."}
                    </p>
                    {hasActiveFilters ? (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 text-xs">
                        Clear All Filters
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setAddOpen(true)} className="mt-2 text-xs gap-1.5">
                        <Plus className="h-4 w-4" /> Add First Faculty
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredFaculty.map((member, idx) => {
                const initial = (member.name || "F")[0].toUpperCase();
                return (
                  <TableRow key={member.user_id} className="hover:bg-muted/30 transition-colors">
                    {/* Index */}
                    <TableCell className="text-xs text-muted-foreground text-center font-mono">
                      {idx + 1}
                    </TableCell>

                    {/* Faculty Member Name & Avatar */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={member.avatar_url ?? undefined} alt={member.name} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="font-semibold text-xs text-foreground hover:underline cursor-pointer truncate"
                              onClick={() => {
                                setViewTarget(member);
                                setViewTab("overview");
                              }}
                            >
                              {formatFacultyName(member.name, member.title)}
                            </span>
                            {member.is_verified && (
                              <span title="Verified Faculty Member" className="text-emerald-600 dark:text-emerald-400">
                                <UserCheck className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground block truncate">
                            {member.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact Info */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground/70" />
                          <span className="truncate max-w-[150px]">{member.email}</span>
                        </span>
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground/70" />
                            <span>{member.phone}</span>
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Faculty / Employee ID */}
                    <TableCell>
                      {member.student_id ? (
                        <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">
                          {member.student_id}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </TableCell>

                    {/* Department */}
                    <TableCell>
                      {member.department ? (
                        <span className="text-xs font-medium text-foreground">
                          {member.department}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">Unassigned</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {member.is_deleted ? (
                        <Badge variant="destructive" className="text-[10px] py-0 h-5">
                          Inactive
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0 h-5">
                          Active
                        </Badge>
                      )}
                    </TableCell>

                    {/* Joined Date */}
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(member.created_at), "MMM d, yyyy")}
                    </TableCell>

                    {/* Actions Dropdown */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-card border-border shadow-lg">
                          <DropdownMenuLabel className="text-xs">Faculty Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => {
                              setViewTarget(member);
                              setViewTab("overview");
                            }}
                            className="text-xs gap-2 cursor-pointer"
                          >
                            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                            View Profile
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setViewTarget(member);
                              setViewTab("lectures");
                            }}
                            className="text-xs gap-2 cursor-pointer"
                          >
                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            View Conducted Lectures
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setViewTarget(member);
                              setViewTab("timetable");
                            }}
                            className="text-xs gap-2 cursor-pointer"
                          >
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                            View Weekly Timetable
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => setEditTarget(member)}
                            className="text-xs gap-2 cursor-pointer"
                          >
                            <UserPen className="h-3.5 w-3.5 text-muted-foreground" />
                            Edit Details
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              verifyMutation.mutate({
                                uid: member.user_id,
                                verify: !member.is_verified,
                              })
                            }
                            className="text-xs gap-2 cursor-pointer"
                          >
                            <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                            {member.is_verified ? "Mark as Unverified" : "Verify Faculty Member"}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => setDeactivateTarget(member)}
                            className={cn(
                              "text-xs gap-2 cursor-pointer",
                              member.is_deleted ? "text-emerald-600" : "text-amber-600"
                            )}
                          >
                            {member.is_deleted ? (
                              <>
                                <UserCheck className="h-3.5 w-3.5" />
                                Reactivate Account
                              </>
                            ) : (
                              <>
                                <UserX className="h-3.5 w-3.5" />
                                Deactivate Account
                              </>
                            )}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => setRemoveTarget(member)}
                            className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Revoke Faculty Role
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Interactive Dialogs ─────────────────────────────────────────────── */}
      {/* 1. Add Faculty Dialog */}
      <AddFacultyDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={invalidateFaculty}
        departments={departments}
      />

      {/* 2. Edit Faculty Dialog */}
      <EditFacultyDialog
        faculty={editTarget}
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSuccess={invalidateFaculty}
        departments={departments}
      />

      {/* 3. View Full Detail Drawer */}
      <FacultyDetailDrawer
        faculty={viewTarget}
        open={Boolean(viewTarget)}
        initialTab={viewTab}
        onClose={() => setViewTarget(null)}
        onEdit={(m) => setEditTarget(m)}
        onToggleVerify={(m) =>
          verifyMutation.mutate({ uid: m.user_id, verify: !m.is_verified })
        }
        onToggleActive={(m) =>
          toggleActiveMutation.mutate({ uid: m.user_id, isDeleted: !m.is_deleted })
        }
      />

      {/* 4. Deactivate / Reactivate Confirmation Dialog */}
      <Dialog open={Boolean(deactivateTarget)} onOpenChange={(v) => !v && setDeactivateTarget(null)}>
        <DialogContent className="max-w-sm bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {deactivateTarget?.is_deleted ? "Reactivate Faculty Account" : "Deactivate Faculty Account"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {deactivateTarget?.is_deleted
                ? `Reactivating ${formatFacultyName(deactivateTarget.name, deactivateTarget.title)}'s account will restore their access to the faculty workspace.`
                : `Deactivating ${formatFacultyName(deactivateTarget?.name, deactivateTarget?.title)}'s account will suspend their faculty portal login. All past lectures, attendance logs, and student records remain preserved.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeactivateTarget(null)}
              disabled={toggleActiveMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant={deactivateTarget?.is_deleted ? "default" : "destructive"}
              size="sm"
              disabled={toggleActiveMutation.isPending}
              onClick={() => {
                if (deactivateTarget) {
                  toggleActiveMutation.mutate({
                    uid: deactivateTarget.user_id,
                    isDeleted: !deactivateTarget.is_deleted,
                  });
                }
              }}
              className="text-xs"
            >
              {toggleActiveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
              {deactivateTarget?.is_deleted ? "Confirm Reactivation" : "Confirm Deactivation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Revoke Role Confirmation Dialog */}
      <Dialog open={Boolean(removeTarget)} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <DialogContent className="max-w-sm bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Revoke Faculty Role
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This will remove the faculty role assignment from <strong className="text-foreground">{formatFacultyName(removeTarget?.name, removeTarget?.title)}</strong>. Their user profile will remain in the database, but they will no longer be listed as faculty.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRemoveTarget(null)}
              disabled={removeRoleMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={removeRoleMutation.isPending}
              onClick={() => {
                if (removeTarget) {
                  removeRoleMutation.mutate(removeTarget.user_id);
                }
              }}
              className="text-xs"
            >
              {removeRoleMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
              Revoke Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
