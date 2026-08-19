/**
 * Admin Permissions Management — assign dynamic permissions to sub-roles.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Plus, Save } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const SUB_ROLES = ["hod", "class_coordinator", "event_manager"] as const;
const MODULES = [
  "students", "faculty", "lectures", "attendance", "departments",
  "classes", "announcements", "events", "polls", "challenges",
  "documents", "exams", "reports", "channels", "notifications",
] as const;

type PermRow = {
  id: string;
  role: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export default function AdminPermissionsPage() {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("hod");
  const [addOpen, setAddOpen] = useState(false);
  const [newModule, setNewModule] = useState("");

  const permsQuery = useQuery({
    queryKey: ["admin_permissions", selectedRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .eq("role", selectedRole)
        .order("module");
      if (error) throw error;
      return (data ?? []) as PermRow[];
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase
        .from("permissions")
        .update({ [field]: value, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_permissions"] });
      toast.success("Permission updated");
    },
    onError: () => toast.error("Failed to update permission"),
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("permissions").insert({
        role: selectedRole,
        module: newModule,
        can_view: true,
        can_create: false,
        can_edit: false,
        can_delete: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_permissions"] });
      setAddOpen(false);
      setNewModule("");
      toast.success("Module permission added");
    },
    onError: () => toast.error("Failed to add module"),
  });

  const existingModules = new Set(permsQuery.data?.map((p) => p.module) ?? []);
  const availableModules = MODULES.filter((m) => !existingModules.has(m));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Role Permissions
              </CardTitle>
              <CardDescription>
                Manage module-level permissions for sub-roles (HOD, Class Coordinator, Event Manager)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUB_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => setAddOpen(true)} disabled={availableModules.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> Add Module
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {permsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Module</TableHead>
                    <TableHead className="text-center">View</TableHead>
                    <TableHead className="text-center">Create</TableHead>
                    <TableHead className="text-center">Edit</TableHead>
                    <TableHead className="text-center">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permsQuery.data?.map((perm) => (
                    <TableRow key={perm.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {perm.module.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      {(["can_view", "can_create", "can_edit", "can_delete"] as const).map((field) => (
                        <TableCell key={field} className="text-center">
                          <Checkbox
                            checked={perm[field]}
                            onCheckedChange={(checked) =>
                              updateMut.mutate({ id: perm.id, field, value: !!checked })
                            }
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {permsQuery.data?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No permissions configured for this role yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Module Permission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Module</Label>
              <Select value={newModule} onValueChange={setNewModule}>
                <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent>
                  {availableModules.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMut.mutate()} disabled={!newModule || addMut.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
