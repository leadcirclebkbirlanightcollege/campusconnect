import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  Plus, Hash, Users, Trash2, Settings2, Search,
  MessageSquare, Building2, School, X, UserPlus, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Channel {
  id: string; name: string; type: string; description?: string | null;
  is_active: boolean; created_at: string;
}
interface Member { id: string; channel_id: string; user_id: string; role: string; profiles?: { name: string; email: string } | null; }
interface Profile { user_id: string; name: string; email: string; }

const TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  class_channel:        { label: "Class",        icon: School,       color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  department_channel:   { label: "Department",   icon: Building2,    color: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  announcement_channel: { label: "Announcement", icon: MessageSquare,color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  custom_group:         { label: "Group",         icon: Users,        color: "bg-green-500/15 text-green-400 border-green-500/20" },
  group:                { label: "Group",         icon: Users,        color: "bg-green-500/15 text-green-400 border-green-500/20" },
};

export default function AdminChannelsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", type: "class_channel", description: "" });
  const [memberSearch, setMemberSearch] = useState("");

  // Load channels
  const { data: channels = [], isLoading } = useQuery<Channel[]>({
    queryKey: ["admin-channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels").select("id,name,type,description,is_active,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Load members of selected channel
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["admin-channel-members", selectedChannel?.id],
    enabled: !!selectedChannel && showMembers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_members")
        .select("id,channel_id,user_id,role,profiles(name,email)")
        .eq("channel_id", selectedChannel!.id);
      if (error) throw error;
      return (data ?? []) as unknown as Member[];
    },
  });

  // Search students/faculty to add
  const { data: allProfiles = [] } = useQuery<Profile[]>({
    queryKey: ["admin-channel-add-profiles", memberSearch],
    enabled: memberSearch.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,name,email")
        .ilike("name", `%${memberSearch}%`)
        .eq("is_deleted", false)
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Create channel
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("channels").insert({
        name: newForm.name.trim().toLowerCase().replace(/\s+/g, "-"),
        type: newForm.type,
        description: newForm.description.trim() || null,
        created_by: user.id,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Channel created successfully");
      setShowCreate(false);
      setNewForm({ name: "", type: "class_channel", description: "" });
      qc.invalidateQueries({ queryKey: ["admin-channels"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete channel
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Channel deleted");
      setSelectedChannel(null);
      qc.invalidateQueries({ queryKey: ["admin-channels"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle channel active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("channels").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-channels"] });
      toast.success("Channel updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Add member
  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!selectedChannel) return;
      const { error } = await supabase.from("channel_members").insert({
        channel_id: selectedChannel.id,
        user_id: userId,
        role: "member",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member added");
      setMemberSearch("");
      qc.invalidateQueries({ queryKey: ["admin-channel-members", selectedChannel?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Remove member
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("channel_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["admin-channel-members", selectedChannel?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = channels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.type.toLowerCase().includes(search.toLowerCase())
  );

  const existingUserIds = new Set(members.map((m) => m.user_id));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Channel Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage messaging channels</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Channel
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search channels…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Channels", value: channels.length, color: "text-primary" },
          { label: "Active", value: channels.filter((c) => c.is_active).length, color: "text-green-400" },
          { label: "Class Channels", value: channels.filter((c) => c.type === "class_channel").length, color: "text-blue-400" },
          { label: "Groups", value: channels.filter((c) => c.type === "custom_group" || c.type === "group").length, color: "text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("text-2xl font-bold mt-1", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Channels Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Channel</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={4} className="text-center py-12 text-muted-foreground text-sm">Loading channels…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <Hash className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No channels found</p>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowCreate(true)}>
                      Create your first channel
                    </Button>
                  </td>
                </tr>
              )}
              {filtered.map((ch) => {
                const typeInfo = TYPE_LABELS[ch.type] ?? TYPE_LABELS.custom_group;
                const TypeIcon = typeInfo.icon;
                return (
                  <tr key={ch.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Hash className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{ch.name}</p>
                          {ch.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{ch.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", typeInfo.color)}>
                        <TypeIcon className="h-3 w-3" />
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                        ch.is_active
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-muted text-muted-foreground border border-border/50"
                      )}>
                        {ch.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => { setSelectedChannel(ch); setShowMembers(true); }}
                        >
                          <Users className="h-3.5 w-3.5" />
                          Members
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => toggleActiveMutation.mutate({ id: ch.id, is_active: !ch.is_active })}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          {ch.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 gap-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => {
                            if (confirm(`Delete channel "${ch.name}"? This cannot be undone.`))
                              deleteMutation.mutate(ch.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Channel Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Create Channel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Channel Name *</label>
              <Input
                placeholder="e.g. fycs-2024"
                value={newForm.name}
                onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens only</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Channel Type *</label>
              <Select value={newForm.type} onValueChange={(v) => setNewForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class_channel">Class Channel</SelectItem>
                  <SelectItem value="department_channel">Department Channel</SelectItem>
                  <SelectItem value="announcement_channel">Announcement Channel</SelectItem>
                  <SelectItem value="custom_group">Custom Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Input
                placeholder="Optional description…"
                value={newForm.description}
                onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newForm.name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create Channel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={(v) => { setShowMembers(v); if (!v) setMemberSearch(""); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {selectedChannel?.name} — Members
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Add member search */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-primary" />
                Add Member
              </label>
              <Input
                placeholder="Search by name (min 2 chars)…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              {allProfiles.length > 0 && (
                <div className="rounded-lg border border-border/50 bg-card overflow-hidden max-h-40 overflow-y-auto">
                  {allProfiles
                    .filter((p) => !existingUserIds.has(p.user_id))
                    .map((p) => (
                      <button
                        key={p.user_id}
                        onClick={() => addMemberMutation.mutate(p.user_id)}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                      >
                        <div className="text-left">
                          <p className="font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </div>
                        <Check className="h-3.5 w-3.5 text-muted-foreground/50" />
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Current members */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Current Members ({members.length})</p>
              <div className="rounded-lg border border-border/50 bg-card overflow-hidden max-h-48 overflow-y-auto">
                {members.length === 0 && (
                  <p className="text-center py-6 text-sm text-muted-foreground">No members yet</p>
                )}
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2.5 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.profiles?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{m.profiles?.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] capitalize">{m.role}</Badge>
                      <button
                        onClick={() => removeMemberMutation.mutate(m.id)}
                        className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowMembers(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
