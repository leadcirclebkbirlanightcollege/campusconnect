import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Users, BookOpen, Trash2 } from "lucide-react";

type Programme = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
};

export default function ProgrammeManagementTab() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProgramme, setEditProgramme] = useState<Programme | null>(null);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formColor, setFormColor] = useState("#3B82F6");
  const [formActive, setFormActive] = useState(true);

  const programmesQuery = useQuery({
    queryKey: ["admin", "programmes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programmes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Programme[];
    },
  });

  const allotmentsCountQuery = useQuery({
    queryKey: ["admin", "programmes", "allotments-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_programme_allotments")
        .select("programme_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((a: { programme_id: string }) => {
        counts[a.programme_id] = (counts[a.programme_id] || 0) + 1;
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("programmes").insert({
        name: formName.trim(),
        description: formDesc.trim() || null,
        color: formColor,
        is_active: formActive,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Programme created");
      queryClient.invalidateQueries({ queryKey: ["admin", "programmes"] });
      resetForm();
      setCreateOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editProgramme) return;
      const { error } = await supabase
        .from("programmes")
        .update({
          name: formName.trim(),
          description: formDesc.trim() || null,
          color: formColor,
          is_active: formActive,
        })
        .eq("id", editProgramme.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Programme updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "programmes"] });
      resetForm();
      setEditProgramme(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programmes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Programme deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "programmes"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormColor("#3B82F6");
    setFormActive(true);
  };

  const openEdit = (p: Programme) => {
    setFormName(p.name);
    setFormDesc(p.description || "");
    setFormColor(p.color);
    setFormActive(p.is_active);
    setEditProgramme(p);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      toast.error("Programme name is required");
      return;
    }
    if (editProgramme) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Learning Circles</h2>
          <p className="text-muted-foreground">Create and manage programmes for students</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={resetForm}>
              <Plus className="h-4 w-4" />
              New Programme
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Programme</DialogTitle>
              <DialogDescription>Add a new learning circle / programme</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  placeholder="e.g. Gita for Life"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="h-10 w-16 p-1"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={formActive} onCheckedChange={setFormActive} />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editProgramme} onOpenChange={(o) => !o && setEditProgramme(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Programme</DialogTitle>
            <DialogDescription>Update programme details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} />
            </div>
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <Input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="h-10 w-16 p-1" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={formActive} onCheckedChange={setFormActive} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProgramme(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Programmes List */}
      {programmesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : programmesQuery.data?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No programmes yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programmesQuery.data?.map((p) => {
            const studentCount = allotmentsCountQuery.data?.[p.id] || 0;
            return (
              <Card key={p.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: p.color }} />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <Badge variant={p.is_active ? "default" : "secondary"}>
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {p.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {studentCount} students
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this programme? Students will be unassigned.")) {
                            deleteMutation.mutate(p.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
