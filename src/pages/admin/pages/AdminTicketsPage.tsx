import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MessageCircle, Send, CheckCircle2, Search, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  open:          { label: "Open",         cls: "bg-primary/10 text-primary border-primary/20" },
  pending_user:  { label: "Awaiting User",cls: "bg-warning/10 text-warning border-warning/20" },
  resolved:      { label: "Resolved",     cls: "bg-success/10 text-success border-success/20" },
  closed:        { label: "Closed",       cls: "bg-muted text-muted-foreground border-border" },
};

export default function AdminTicketsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const ticketsQ = useQuery<any[]>({
    queryKey: ["admin", "support-tickets", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("support_tickets" as any)
        .select("*, profiles:created_by(name, student_id, email)")
        .order("last_message_at", { ascending: false })
        .limit(200);
      if (statusFilter === "active") q = q.in("status", ["open", "pending_user"]);
      else if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtered = (ticketsQ.data ?? []).filter((t: any) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return t.subject?.toLowerCase().includes(s)
      || t.profiles?.name?.toLowerCase().includes(s)
      || t.profiles?.student_id?.toLowerCase().includes(s);
  });

  const messagesQ = useQuery<any[]>({
    queryKey: ["admin", "ticket-messages", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_messages" as any)
        .select("*")
        .eq("ticket_id", activeId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!activeId || !user || !reply.trim()) return;
      const { error } = await supabase.from("ticket_messages" as any).insert({
        ticket_id: activeId,
        author_id: user.id,
        author_role: "admin",
        body: reply.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["admin", "ticket-messages", activeId] });
      qc.invalidateQueries({ queryKey: ["admin", "support-tickets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      if (!activeId) return;
      const { error } = await supabase.from("support_tickets" as any)
        .update({ status }).eq("id", activeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin", "support-tickets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const active = filtered.find((t: any) => t.id === activeId);

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">Triage and resolve student requests</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by subject, student name or ID"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending_user">Awaiting User</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {ticketsQ.isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-1 py-16 text-center">
          <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">No tickets match these filters</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Subject</th>
                <th className="text-left px-4 py-2 font-medium">Student</th>
                <th className="text-left px-4 py-2 font-medium">Category</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any) => {
                const cfg = STATUS_CFG[t.status] ?? STATUS_CFG.open;
                return (
                  <tr key={t.id} onClick={() => setActiveId(t.id)}
                      className="border-t border-border-subtle hover:bg-surface-2 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-foreground truncate max-w-xs">{t.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.profiles?.name ?? "—"}
                      {t.profiles?.student_id && <span className="text-xs ml-1">({t.profiles.student_id})</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{t.category}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", cfg.cls)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!activeId} onOpenChange={v => { if (!v) setActiveId(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="truncate">{active.subject}</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0",
                      (STATUS_CFG[active.status] ?? STATUS_CFG.open).cls)}>
                      {(STATUS_CFG[active.status] ?? STATUS_CFG.open).label}
                    </span>
                  </div>
                  <p className="text-xs font-normal text-muted-foreground mt-1">
                    {active.profiles?.name ?? "Unknown"} · {active.category}
                  </p>
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-3 py-2">
                {messagesQ.isLoading ? (
                  <Skeleton className="h-20 rounded-xl" />
                ) : (
                  (messagesQ.data ?? []).map((m: any) => {
                    const mine = m.author_id === user?.id;
                    const isStaff = m.author_role !== "student";
                    return (
                      <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                          mine ? "bg-primary text-primary-foreground" : "bg-surface-2 text-foreground border border-border-subtle",
                        )}>
                          <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                          <p className="text-[10px] mt-1 opacity-70">
                            {isStaff ? "Support" : "Student"} · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-border-subtle">
                <div className="flex gap-2">
                  <Textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Type your reply…"
                    rows={2}
                    className="flex-1 resize-none"
                    disabled={active.status === "closed"}
                  />
                  <Button size="icon" onClick={() => sendReply.mutate()} disabled={sendReply.isPending || !reply.trim() || active.status === "closed"}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Select value={active.status} onValueChange={(v) => updateStatus.mutate(v)}>
                    <SelectTrigger className="flex-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="pending_user">Awaiting User</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  {active.status !== "closed" && (
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => updateStatus.mutate("resolved")}>
                      <CheckCircle2 className="h-4 w-4" /> Resolve
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
