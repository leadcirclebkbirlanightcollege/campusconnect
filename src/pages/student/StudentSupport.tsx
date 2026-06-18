import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { PageContainer, PageHeader } from "@/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, MessageCircle, Clock, CheckCircle2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  open:          { label: "Open",          cls: "bg-primary/10 text-primary border-primary/20" },
  pending_user:  { label: "Awaiting You",  cls: "bg-warning/10 text-warning border-warning/20" },
  resolved:      { label: "Resolved",      cls: "bg-success/10 text-success border-success/20" },
  closed:        { label: "Closed",        cls: "bg-muted text-muted-foreground border-border" },
};

export default function StudentSupport() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");

  const ticketsQ = useQuery<any[]>({
    queryKey: ["student", "support-tickets"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets" as any)
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const messagesQ = useQuery<any[]>({
    queryKey: ["student", "ticket-messages", activeId],
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

  const createTicket = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (subject.trim().length < 3) throw new Error("Subject too short");
      if (body.trim().length < 10) throw new Error("Please describe in at least 10 characters");

      const { data: ticket, error } = await supabase
        .from("support_tickets" as any)
        .insert({ subject: subject.trim(), category, created_by: user.id, status: "open" })
        .select("id")
        .single();
      if (error) throw error;

      const { error: msgErr } = await supabase.from("ticket_messages" as any).insert({
        ticket_id: (ticket as any).id,
        author_id: user.id,
        author_role: "student",
        body: body.trim(),
      });
      if (msgErr) throw msgErr;
      return (ticket as any).id;
    },
    onSuccess: (id) => {
      toast.success("Ticket created");
      setOpenNew(false);
      setSubject(""); setBody(""); setCategory("general");
      qc.invalidateQueries({ queryKey: ["student", "support-tickets"] });
      setActiveId(id as string);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!activeId || !user || reply.trim().length < 1) return;
      const { error } = await supabase.from("ticket_messages" as any).insert({
        ticket_id: activeId,
        author_id: user.id,
        author_role: "student",
        body: reply.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["student", "ticket-messages", activeId] });
      qc.invalidateQueries({ queryKey: ["student", "support-tickets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const activeTicket = (ticketsQ.data ?? []).find((t: any) => t.id === activeId);

  return (
    <PageContainer>
      <PageHeader title="Support" subtitle="Open a ticket, track your requests" />

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">
          {ticketsQ.data?.length ?? 0} ticket{(ticketsQ.data?.length ?? 0) === 1 ? "" : "s"}
        </p>
        <Button size="sm" className="gap-2" onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      {ticketsQ.isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (ticketsQ.data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-1 py-16 text-center">
          <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">No tickets yet. Need help? Open one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(ticketsQ.data ?? []).map((t: any) => {
            const cfg = STATUS_CFG[t.status] ?? STATUS_CFG.open;
            return (
              <button key={t.id} onClick={() => setActiveId(t.id)}
                className="w-full text-left rounded-xl border border-border-subtle bg-surface-1 p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{t.category}</p>
                  </div>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0", cfg.cls)}>
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Updated {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Subject</label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Short summary" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Describe the issue</label>
              <Textarea rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="Provide as much detail as possible…" />
            </div>
            <Button className="w-full gap-2" onClick={() => createTicket.mutate()} disabled={createTicket.isPending}>
              <Send className="h-4 w-4" />
              {createTicket.isPending ? "Creating…" : "Submit Ticket"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activeId} onOpenChange={v => { if (!v) setActiveId(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          {activeTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2 flex-wrap">
                  {activeTicket.subject}
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium",
                    (STATUS_CFG[activeTicket.status] ?? STATUS_CFG.open).cls)}>
                    {(STATUS_CFG[activeTicket.status] ?? STATUS_CFG.open).label}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-3 py-2">
                {messagesQ.isLoading ? (
                  <Skeleton className="h-20 rounded-xl" />
                ) : (
                  (messagesQ.data ?? []).map((m: any) => {
                    const mine = m.author_id === user?.id;
                    return (
                      <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                          mine ? "bg-primary text-primary-foreground" : "bg-surface-2 text-foreground border border-border-subtle",
                        )}>
                          <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                          <p className={cn("text-[10px] mt-1 opacity-70")}>
                            {m.author_role === "student" ? "You" : "Support"} · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {activeTicket.status !== "closed" ? (
                <div className="flex gap-2 pt-2 border-t border-border-subtle">
                  <Textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Reply…"
                    rows={2}
                    className="flex-1 resize-none"
                  />
                  <Button size="icon" onClick={() => sendReply.mutate()} disabled={sendReply.isPending || !reply.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-2 border-t border-border-subtle text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  This ticket is closed.
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
