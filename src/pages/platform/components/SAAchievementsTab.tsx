import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trophy, Plus, Pencil, Trash2 } from "lucide-react";

type Achievement = {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  points_reward: number;
  is_active: boolean;
  created_at: string;
};

function AchievementDialog({
  open, onClose, editing,
}: { open: boolean; onClose: () => void; editing: Achievement | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    code: editing?.code ?? "",
    title: editing?.title ?? "",
    description: editing?.description ?? "",
    icon: editing?.icon ?? "🏆",
    points_reward: editing?.points_reward ?? 10,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.code.trim()) throw new Error("Title and code are required");
      if (editing) {
        const { error } = await supabase
          .from("achievements" as any)
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("achievements" as any).insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Achievement updated" : "Achievement created");
      qc.invalidateQueries({ queryKey: ["sa_achievements"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-surface-1 border-border-subtle max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Achievement" : "Create Achievement"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Icon (emoji)</Label>
              <Input value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} className="text-2xl text-center" maxLength={4} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Points Reward</Label>
              <Input type="number" value={form.points_reward} onChange={(e) => setForm((p) => ({ ...p, points_reward: parseInt(e.target.value) || 0 }))} min={0} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Code (unique identifier)</Label>
            <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} placeholder="e.g. streak_7" disabled={!!editing} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. 7-Day Warrior" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description *</Label>
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Logged in 7 days in a row" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title.trim()}>
            {save.isPending ? "Saving…" : editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SAAchievementsTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Achievement | null>(null);

  const achievementsQuery = useQuery<Achievement[]>({
    queryKey: ["sa_achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as Achievement[]) ?? [];
    },
    staleTime: 60_000,
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("achievements" as any).update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Achievement updated"); qc.invalidateQueries({ queryKey: ["sa_achievements"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("achievements" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Achievement deleted"); qc.invalidateQueries({ queryKey: ["sa_achievements"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const achievements = achievementsQuery.data ?? [];
  const active = achievements.filter((a) => a.is_active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Achievement Manager</h2>
          <p className="text-xs text-muted-foreground">{active} active · {achievements.length} total</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-3.5 h-3.5" />
          Add Achievement
        </Button>
      </div>

      {achievementsQuery.isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-surface-2 animate-pulse" />)}
        </div>
      ) : achievements.length === 0 ? (
        <Card className="bg-surface-1 border-border-subtle border-dashed">
          <CardContent className="py-10 text-center">
            <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No achievements yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {achievements.map((a) => (
            <Card key={a.id} className={`border-border-subtle transition-colors ${a.is_active ? "bg-surface-1" : "bg-surface-2/50 opacity-60"}`}>
              <CardContent className="p-3.5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-10 text-center flex-shrink-0">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{a.title}</span>
                      <Badge variant="secondary" className="text-[10px]">+{a.points_reward} pts</Badge>
                      {!a.is_active && <Badge variant="secondary" className="text-[10px] text-muted-foreground">Disabled</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">{a.code}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setEditing(a); setDialogOpen(true); }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Switch
                      checked={a.is_active}
                      onCheckedChange={() => toggle.mutate({ id: a.id, is_active: a.is_active })}
                    />
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => { if (confirm(`Delete "${a.title}"?`)) remove.mutate(a.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AchievementDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        editing={editing}
      />
    </div>
  );
}
