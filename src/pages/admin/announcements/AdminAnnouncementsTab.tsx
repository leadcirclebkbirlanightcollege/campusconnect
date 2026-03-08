import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Megaphone, Pin, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminAnnouncementsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [target, setTarget] = useState<"all" | "class">("all");
  const [targetClass, setTargetClass] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const announcementsQuery = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,description,priority,is_pinned,target,target_class,created_at,expires_at,created_by")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const trimmedTitle = title.trim();
      const trimmedDescription = description.trim();
      const trimmedClass = targetClass.trim();

      const { error } = await supabase.from("announcements").insert({
        title: trimmedTitle,
        description: trimmedDescription,
        priority,
        target,
        target_class: target === "class" ? trimmedClass : null,
        is_pinned: isPinned,
        created_by: user.id,
      });
      if (error) throw error;

      const { error: pushError } = await supabase.functions.invoke("send-notification", {
        body: {
          title: trimmedTitle,
          message: trimmedDescription,
          kind: "announcement",
          target_type: target === "class" ? "class" : "college_students",
          target_value: target === "class" ? trimmedClass : null,
        },
      });
      if (pushError) throw pushError;
    },
    onSuccess: () => {
      toast.success("Announcement created");
      setOpen(false);
      setTitle("");
      setDescription("");
      setPriority("normal");
      setTarget("all");
      setTargetClass("");
      setIsPinned(false);
      qc.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Announcements
          </h2>
          <p className="text-sm text-muted-foreground">Manage college-wide announcements</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Announcement
        </Button>
      </div>

      <div className="space-y-3">
        {announcementsQuery.data?.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No announcements yet.</CardContent></Card>
        )}
        {announcementsQuery.data?.map((a: any) => (
          <Card key={a.id} className={`border-border/50 ${a.is_pinned ? "border-l-4 border-l-primary" : ""}`}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                    <h3 className="font-medium text-foreground">{a.title}</h3>
                    <Badge variant={a.priority === "urgent" ? "destructive" : "secondary"} className="text-[10px]">
                      {a.priority}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{a.target}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "PPp")}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(a.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target</Label>
                <Select value={target} onValueChange={(v: any) => setTarget(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="class">Specific Class</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {target === "class" && (
              <div className="space-y-2">
                <Label>Class Name</Label>
                <Input value={targetClass} onChange={(e) => setTargetClass(e.target.value)} placeholder="e.g. CSE-A" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={isPinned} onCheckedChange={setIsPinned} />
              <Label>Pin to top</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || !description.trim() || (target === "class" && !targetClass.trim()) || createMutation.isPending}>
              Publish + Push
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
