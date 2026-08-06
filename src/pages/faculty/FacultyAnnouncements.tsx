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
import { WorkspacePage, WorkspaceHero, WorkspaceLoading, WorkspaceEmpty, WorkspaceSubmit } from "@/components/workspace/WorkspaceKit";

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
    <WorkspacePage className="max-w-3xl">
      <WorkspaceHero
        eyebrow="Broadcast"
        title="Announcements"
        icon={Megaphone}
        subtitle={`${announcements.length} posted`}
        action={
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5 rounded-2xl bg-background text-primary text-[13px] hover:bg-background/90"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> New
          </Button>
        }
      />

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-primary/20 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground">New Announcement</p>
            <button type="button" aria-label="Close form" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
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
            <WorkspaceSubmit
              size="sm"
              pending={createMutation.isPending}
              pendingLabel="Posting…"
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || !body.trim()}
              className="text-[12px]"
            >
              Post
            </WorkspaceSubmit>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
<WorkspaceLoading rows={3} />
      ) : announcements.length === 0 ? (
        <WorkspaceEmpty
          icon={Megaphone}
          title="No announcements yet"
          description="Post your first announcement to reach your students instantly."
          action={<Button size="sm" onClick={() => setShowForm(true)}>New announcement</Button>}
        />
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
    </WorkspacePage>
  );
}
