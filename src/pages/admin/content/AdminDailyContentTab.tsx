import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Smile, Sparkles, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminDailyContentTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [contentType, setContentType] = useState<"meme" | "suvichar">("suvichar");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [publishDate, setPublishDate] = useState("");

  const contentQuery = useQuery({
    queryKey: ["admin", "daily_content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_content")
        .select("*")
        .order("publish_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("daily_content").insert({
        content_type: contentType,
        title: title.trim() || null,
        body: body.trim() || null,
        publish_date: publishDate || null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Content added");
      setOpen(false);
      setTitle(""); setBody(""); setPublishDate("");
      qc.invalidateQueries({ queryKey: ["admin", "daily_content"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_content").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "daily_content"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-premium" /> Daily Content
          </h2>
          <p className="text-sm text-muted-foreground">Manage Meme of the Day & Daily Suvichar</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Content</Button>
      </div>

      <div className="space-y-3">
        {contentQuery.data?.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No content yet.</CardContent></Card>
        )}
        {contentQuery.data?.map((c: any) => (
          <Card key={c.id} className="border-border/50">
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {c.content_type === "meme" ? <Smile className="h-4 w-4 text-accent" /> : <Sparkles className="h-4 w-4 text-premium" />}
                    <Badge variant="secondary" className="text-[10px]">{c.content_type}</Badge>
                    {c.publish_date && <span className="text-xs text-muted-foreground">{format(new Date(c.publish_date), "PP")}</span>}
                  </div>
                  {c.title && <h3 className="font-medium text-foreground">{c.title}</h3>}
                  {c.body && <p className="text-sm text-muted-foreground">{c.body}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Daily Content</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={contentType} onValueChange={(v: any) => setContentType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="suvichar">Suvichar</SelectItem>
                  <SelectItem value="meme">Meme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Title (optional)</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Content</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={contentType === "suvichar" ? "Today's thought..." : "Caption or description"} /></div>
            <div className="space-y-2"><Label>Publish Date (optional)</Label><Input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
