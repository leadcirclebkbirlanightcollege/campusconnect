import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useState } from "react";
import { Megaphone, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

export default function FacultyAnnouncements() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["faculty", "announcements", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id,title,description,priority,created_at,is_pinned")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({
        title: title.trim(),
        description: body.trim(),
        created_by: user!.id,
        target: "all",
        priority: "normal",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement posted!");
      setTitle(""); setBody(""); setShowForm(false);
      qc.invalidateQueries({ queryKey: ["faculty", "announcements"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-5 text-primary-foreground shadow-elevated flex items-center justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] opacity-80">Broadcast</p>
          <h1 className="font-heading text-[22px] font-black tracking-tight">Announcements</h1>
          <p className="text-[12px] opacity-85 mt-0.5">{announcements.length} posted</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 text-[13px] rounded-2xl bg-white text-primary hover:bg-white/90">
          <Plus className="h-3.5 w-3.5" /> New
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-primary/20 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground">New Announcement</p>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-[13px] bg-background border-border/50"
          />
          <Textarea
            placeholder="Write your announcement..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="text-[13px] bg-background border-border/50 resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="text-[12px]">Cancel</Button>
            <Button
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || !body.trim() || createMutation.isPending}
              className="text-[12px]"
            >
              Post
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(announcements as any[]).map((a) => (
            <div key={a.id} className="rounded-xl border border-border/50 bg-card px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold text-foreground">{a.title}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">{format(new Date(a.created_at), "MMM d, HH:mm")}</span>
              </div>
              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{a.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
