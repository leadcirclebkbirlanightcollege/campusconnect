/**
 * AdminDepartmentsPage — Manage departments for the college
 * Route: /platform/admin/departments
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { PageContainer, PageHeader } from "@/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Department = {
  id: string;
  college_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

const emptyForm = { name: "", description: "" };

export default function AdminDepartmentsPage() {
  const { collegeId } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ["admin_departments", collegeId],
    enabled: Boolean(collegeId),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("college_id", collegeId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Department[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin_departments", collegeId] });

  const upsertMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      if (editing) {
        const { error } = await supabase.from("departments")
          .update({ name: payload.name, description: payload.description || null })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: user } = await supabase.auth.getUser();
        const { error } = await supabase.from("departments").insert({
          college_id: collegeId!,
          name: payload.name,
          description: payload.description || null,
          created_by: user.user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Department updated" : "Department created");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Operation failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Department removed"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (d: Department) => { setEditing(d); setForm({ name: d.name, description: d.description ?? "" }); setOpen(true); };

  return (
    <PageContainer size="tablet" withBottomNav={false} className="space-y-5 py-4">
      <PageHeader
        title="Departments"
        subtitle="Manage academic departments for your college"
        action={
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />New Department
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Building2 className="h-10 w-10 opacity-30" />
          <p className="text-sm">No departments yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle overflow-hidden bg-surface-1">
          <Table>
            <TableHeader>
              <TableRow className="border-border-subtle hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Description</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id} className="border-border-subtle">
                  <TableCell className="font-medium text-sm">{dept.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                    {dept.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={dept.is_active ? "default" : "secondary"} className="text-[11px]">
                      {dept.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button aria-label="Edit" size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(dept)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button aria-label="Delete"
                        size="icon" variant="ghost"
                        className="h-7 w-7 text-danger hover:bg-danger/10"
                        onClick={() => {
                          if (confirm(`Delete "${dept.name}"?`)) deleteMutation.mutate(dept.id);
                        }}
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
            <DialogTitle>{editing ? "Edit Department" : "New Department"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="dept-name">Department Name</Label>
              <Input
                id="dept-name"
                placeholder="e.g. Computer Science"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="bg-surface-2 border-border-subtle"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                id="dept-desc"
                placeholder="Brief description of the department…"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                className="bg-surface-2 border-border-subtle resize-none h-20"
              />
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
