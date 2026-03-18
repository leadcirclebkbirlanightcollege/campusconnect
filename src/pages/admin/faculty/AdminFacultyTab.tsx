/**
 * AdminFacultyTab — Faculty management for College Admins.
 * Lists faculty users, allows creation (via edge-fn), role removal, and profile view.
 */
import { useState, useMemo, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useTenantId } from "@/providers/TenantProvider";
import {
  GraduationCap, Search, Plus, MoreHorizontal,
  UserCheck, UserX, RefreshCw, Mail, Phone, BookOpen,
  Shield, Loader2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FacultyRow {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  college_id: string | null;
  is_verified: boolean;
  created_at: string;
  roleId?: string;
}

// ─── Add Faculty Dialog ───────────────────────────────────────────────────────
const AddFacultyDialog = memo(function AddFacultyDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const collegeId = useTenantId();
  const [form, setForm] = useState({ name: "", email: "", password: "", department: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Name, email and password are required");
      return;
    }
    if (!collegeId) { toast.error("No college context"); return; }

    setLoading(true);
    try {
      // 1. Create auth user via admin-create-student function (repurposed with role=faculty)
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-create-student`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            department: form.department.trim() || null,
            college_id: collegeId,
            role: "faculty",
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create faculty");

      toast.success(`Faculty "${form.name}" created successfully`);
      setForm({ name: "", email: "", password: "", department: "" });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Failed to create faculty");
    } finally {
      setLoading(false);
    }
  }, [form, collegeId, onClose, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" /> Add Faculty Member
          </DialogTitle>
          <DialogDescription>
            Create a new faculty account for this college.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Full Name *</label>
            <Input
              placeholder="e.g. Dr. Priya Sharma"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Email *</label>
            <Input
              type="email"
              placeholder="faculty@college.edu"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Password *</label>
            <Input
              type="password"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Department</label>
            <Input
              placeholder="e.g. Computer Science"
              value={form.department}
              onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Faculty
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

// ─── Faculty Row Card ─────────────────────────────────────────────────────────
const FacultyCard = memo(function FacultyCard({
  faculty,
  onRemove,
}: {
  faculty: FacultyRow;
  onRemove: (uid: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
      {/* Avatar */}
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-[13px] font-bold text-primary">
          {faculty.name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-foreground truncate">{faculty.name}</p>
          {faculty.is_verified && (
            <UserCheck className="h-3 w-3 text-green-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Mail className="h-3 w-3" />{faculty.email}
          </span>
          {faculty.department && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <BookOpen className="h-3 w-3" />{faculty.department}
            </span>
          )}
        </div>
      </div>

      {/* Badge + Menu */}
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
          <Shield className="h-2.5 w-2.5 mr-1" />Faculty
        </Badge>
        <p className="text-[10px] text-muted-foreground hidden md:block">
          {format(new Date(faculty.created_at), "MMM d, yyyy")}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onRemove(faculty.user_id)}
            >
              <UserX className="h-4 w-4 mr-2" />
              Remove Faculty Role
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminFacultyTab() {
  const collegeId = useTenantId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  // Fetch faculty: join user_roles + profiles
  const { data: faculty = [], isLoading, refetch } = useQuery<FacultyRow[]>({
    queryKey: ["admin_faculty", collegeId],
    enabled: !!collegeId,
    staleTime: 30_000,
    queryFn: async () => {
      // Get user_roles where role = 'faculty' and college_id matches
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("id, user_id, college_id, created_at")
        .eq("role", "faculty")
        .eq("college_id", collegeId!);
      if (rolesErr) throw rolesErr;
      if (!roles || roles.length === 0) return [];

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, name, email, phone, department, college_id, is_verified, created_at")
        .in("user_id", userIds)
        .eq("is_deleted", false);
      if (profErr) throw profErr;

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      return roles.map((r) => {
        const p = profileMap.get(r.user_id);
        return {
          user_id: r.user_id,
          name: p?.name ?? "Unknown",
          email: p?.email ?? "—",
          phone: p?.phone ?? null,
          department: p?.department ?? null,
          college_id: p?.college_id ?? null,
          is_verified: p?.is_verified ?? false,
          created_at: p?.created_at ?? r.created_at,
          roleId: r.id,
        } as FacultyRow;
      });
    },
  });

  // Remove faculty role mutation
  const removeMutation = useMutation({
    mutationFn: async (uid: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", uid)
        .eq("role", "faculty");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Faculty role removed");
      setRemoveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin_faculty", collegeId] });
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to remove role"),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return faculty;
    const q = search.toLowerCase();
    return faculty.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q) ||
        (f.department ?? "").toLowerCase().includes(q)
    );
  }, [faculty, search]);

  const handleRefresh = useCallback(() => refetch(), [refetch]);
  const handleRemove = useCallback((uid: string) => setRemoveTarget(uid), []);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Faculty Management
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {faculty.length} faculty member{faculty.length !== 1 ? "s" : ""} in this college
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />Add Faculty
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email or department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 border-b border-border/30">
          <div className="w-9 shrink-0" />
          <p className="flex-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Faculty</p>
          <p className="w-24 hidden md:block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Joined</p>
          <div className="w-28 shrink-0" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <GraduationCap className="h-10 w-10 opacity-30" />
            <p className="text-[14px] font-medium">
              {search ? "No faculty match your search" : "No faculty members yet"}
            </p>
            {!search && (
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5 mt-1">
                <Plus className="h-4 w-4" />Add First Faculty Member
              </Button>
            )}
          </div>
        ) : (
          <div>
            {filtered.map((f) => (
              <FacultyCard key={f.user_id} faculty={f} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </div>

      {/* Stats footer */}
      {faculty.length > 0 && (
        <div className="flex items-center gap-4 px-1">
          <div className="text-[12px] text-muted-foreground">
            <span className="font-semibold text-foreground">{faculty.filter((f) => f.is_verified).length}</span> verified
          </div>
          <div className="text-[12px] text-muted-foreground">
            <span className="font-semibold text-foreground">
              {new Set(faculty.map((f) => f.department).filter(Boolean)).size}
            </span> departments
          </div>
        </div>
      )}

      {/* Add Faculty Dialog */}
      <AddFacultyDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin_faculty", collegeId] })}
      />

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />Remove Faculty Role
            </DialogTitle>
            <DialogDescription>
              This will remove the faculty role from this user. They will lose access to the faculty portal. Their profile and data will be retained.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => removeTarget && removeMutation.mutate(removeTarget)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
