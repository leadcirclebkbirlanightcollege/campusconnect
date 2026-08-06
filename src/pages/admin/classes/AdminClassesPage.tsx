/**
 * AdminClassesPage — Manage classes (sections/batches) for the college
 * Route: /platform/admin/classes
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { PageContainer, PageHeader } from "@/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Department = { id: string; name: string };
type Class = {
  id: string;
  college_id: string;
  department_id: string | null;
  name: string;
  year: number | null;
  section: string | null;
  is_active: boolean;
  created_at: string;
};

const emptyForm = { name: "", department_id: "", year: "", section: "" };

export default function AdminClassesPage() {
  const { collegeId } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["admin_departments", collegeId],
    enabled: Boolean(collegeId),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("college_id", collegeId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Department[];
    },
  });

  const { data: classes = [], isLoading } = useQuery<Class[]>({
    queryKey: ["admin_classes", collegeId],
    enabled: Boolean(collegeId),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("college_id", collegeId!)
        .order("year", { ascending: true })
        .order("name");
      if (error) throw error;
      return (data ?? []) as Class[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin_classes", collegeId] });

  const upsertMutation = useMutation({
    mutationFn: async (payload: typeof emptyForm) => {
      const body = {
        college_id: collegeId!,
        name: payload.name,
        department_id: payload.department_id || null,
        year: payload.year ? Number(payload.year) : null,
        section: payload.section || null,
      };
      if (editing) {
        const { error } = await supabase.from("classes").update(body).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: user } = await supabase.auth.getUser();
        const { error } = await supabase.from("classes").insert({ ...body, created_by: user.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Class updated" : "Class created");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Operation failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Class removed"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c: Class) => {
    setEditing(c);
    setForm({
      name: c.name,
      department_id: c.department_id ?? "",
      year: c.year?.toString() ?? "",
      section: c.section ?? "",
    });
    setOpen(true);
  };

  const getDeptName = (id: string | null) =>
    id ? (departments.find((d) => d.id === id)?.name ?? "—") : "—";

  return (
    <PageContainer size="tablet" withBottomNav={false} className="space-y-5 py-4">
      <PageHeader
        title="Classes"
        subtitle="Manage class sections and batches"
        action={
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />New Class
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <GraduationCap className="h-10 w-10 opacity-30" />
          <p className="text-sm">No classes yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle overflow-hidden bg-surface-1">
          <Table>
            <TableHeader>
              <TableRow className="border-border-subtle hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Department</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Year</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Section</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((cls) => (
                <TableRow key={cls.id} className="border-border-subtle">
                  <TableCell className="font-medium text-sm">{cls.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                    {getDeptName(cls.department_id)}
                  </TableCell>
                  <TableCell className="text-sm">{cls.year ?? "—"}</TableCell>
                  <TableCell className="text-sm hidden sm:table-cell">{cls.section ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={cls.is_active ? "default" : "secondary"} className="text-[11px]">
                      {cls.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button aria-label="Edit" size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(cls)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button aria-label="Delete"
                        size="icon" variant="ghost"
                        className="h-7 w-7 text-danger hover:bg-danger/10"
                        onClick={() => { if (confirm(`Delete "${cls.name}"?`)) deleteMutation.mutate(cls.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-surface-1 border-border-subtle max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Class" : "New Class"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Class Name</Label>
              <Input
                placeholder="e.g. FYCS, SYIT, TYBSc"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="bg-surface-2 border-border-subtle"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Department <span className="text-muted-foreground">(optional)</span></Label>
              <Select
                value={form.department_id || "__none__"}
                onValueChange={(v) => setForm(f => ({ ...f, department_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger className="bg-surface-2 border-border-subtle">
                  <SelectValue placeholder="Select department…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {departments.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No departments yet. Create departments first to link classes.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Year <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  type="number" min={1} max={6}
                  placeholder="e.g. 1, 2, 3"
                  value={form.year}
                  onChange={(e) => setForm(f => ({ ...f, year: e.target.value }))}
                  className="bg-surface-2 border-border-subtle"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Section <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  placeholder="e.g. A, B"
                  value={form.section}
                  onChange={(e) => setForm(f => ({ ...f, section: e.target.value }))}
                  className="bg-surface-2 border-border-subtle"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.name.trim() || upsertMutation.isPending}
              onClick={() => upsertMutation.mutate(form)}
            >
              {upsertMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
