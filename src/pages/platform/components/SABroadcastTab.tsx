import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlideUp } from "@/components/ui/motion";
import { toast } from "sonner";
import { Radio, Send, Megaphone, Clock, AlertTriangle, Info } from "lucide-react";
import { useCollegeContext } from "@/contexts/CollegeContext";
import { formatDistanceToNow } from "date-fns";

const PRIORITY_CONFIG = {
  normal: { label: "Normal", icon: Info, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  important: { label: "Important", icon: AlertTriangle, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  critical: { label: "Critical", icon: AlertTriangle, color: "bg-destructive/10 text-destructive border-destructive/20" },
} as const;

type Announcement = {
  id: string;
  title: string;
  description: string;
  priority: string;
  target: string;
  created_at: string;
  is_pinned: boolean;
};

export default function SABroadcastTab() {
  const qc = useQueryClient();
  const { colleges } = useCollegeContext();
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "normal",
    target: "all",
    college_id: "all",
  });

  // Recent broadcasts
  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["sa_announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, description, priority, target, created_at, is_pinned")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.description.trim()) throw new Error("Title and message are required");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("announcements").insert({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        target: form.target,
        created_by: user.id,
        is_pinned: form.priority === "critical",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Broadcast sent successfully");
      setForm({ title: "", description: "", priority: "normal", target: "all", college_id: "all" });
      qc.invalidateQueries({ queryKey: ["sa_announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBroadcast = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Broadcast removed");
      qc.invalidateQueries({ queryKey: ["sa_announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Compose ── */}
      <SlideUp>
        <Card className="bg-surface-1 border-border-subtle">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              Compose Broadcast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Broadcast title…"
                className="bg-background border-border-subtle"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Message *</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Write your message here…"
                rows={4}
                className="bg-background border-border-subtle resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger className="bg-background border-border-subtle text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-1 border-border-subtle">
                    <SelectItem value="normal">🔵 Normal</SelectItem>
                    <SelectItem value="important">🟡 Important</SelectItem>
                    <SelectItem value="critical">🔴 Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target</Label>
                <Select value={form.target} onValueChange={v => setForm(p => ({ ...p, target: v }))}>
                  <SelectTrigger className="bg-background border-border-subtle text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-1 border-border-subtle">
                    <SelectItem value="all">All Colleges</SelectItem>
                    <SelectItem value="students">Students Only</SelectItem>
                    <SelectItem value="admin">Admins Only</SelectItem>
                    <SelectItem value="college">Specific College</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.priority === "critical" && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">Critical broadcasts are auto-pinned and shown prominently to all users.</p>
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={() => send.mutate()}
              disabled={send.isPending || !form.title.trim() || !form.description.trim()}
            >
              <Send className="w-3.5 h-3.5" />
              {send.isPending ? "Sending…" : "Send Broadcast"}
            </Button>
          </CardContent>
        </Card>
      </SlideUp>

      {/* ── Recent Broadcasts ── */}
      <SlideUp delay={0.06}>
        <Card className="bg-surface-1 border-border-subtle">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary" />
              Recent Broadcasts
              <Badge variant="secondary" className="ml-auto text-[10px]">{announcements.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-surface-2 animate-pulse" />)}
              </div>
            ) : announcements.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No broadcasts yet.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {announcements.map((a, i) => {
                  const cfg = PRIORITY_CONFIG[a.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.normal;
                  return (
                    <SlideUp key={a.id} delay={i * 0.03}>
                      <div className="rounded-lg bg-surface-2 border border-border-subtle p-3 group">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium text-foreground truncate">{a.title}</span>
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${cfg.color} shrink-0`}>
                                {cfg.label}
                              </Badge>
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">{a.target}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{a.description}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground/50" />
                              <span className="text-[10px] text-muted-foreground/60">
                                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm("Remove this broadcast?")) deleteBroadcast.mutate(a.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </SlideUp>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </SlideUp>
    </div>
  );
}
