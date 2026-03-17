import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Send, Plus, Hash, MessageSquare, X, Paperclip, Smile, Reply, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────── */
interface Channel { id: string; name: string; type: string; description?: string | null; }
interface MessageRow {
  id: string; channel_id: string | null; sender_id: string;
  message_text: string | null; attachments: any; reactions: any;
  reply_to_id: string | null; is_deleted: boolean; created_at: string;
  profiles?: { name: string; avatar_url: string | null } | null;
}

/* ── Helpers ────────────────────────────────────────────────────── */
function msgDateLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d))     return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

const EMOJI_LIST = ["👍","❤️","😂","🎉","🔥","👏","😮","😢"];

/* ── Message Bubble ─────────────────────────────────────────────── */
function MessageBubble({ msg, isOwn, onReact, onReply }: {
  msg: MessageRow; isOwn: boolean;
  onReact: (id: string, emoji: string) => void;
  onReply: (msg: MessageRow) => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const reactions = useMemo(() => {
    const r: Record<string, number> = {};
    if (msg.reactions && typeof msg.reactions === "object") {
      Object.entries(msg.reactions as Record<string, string[]>).forEach(([e, users]) => {
        r[e] = (users as string[]).length;
      });
    }
    return r;
  }, [msg.reactions]);

  return (
    <div
      className={cn("flex gap-2.5 group", isOwn ? "flex-row-reverse" : "flex-row")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmoji(false); }}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0 mt-1">
          {msg.profiles?.avatar_url
            ? <img src={msg.profiles.avatar_url} className="h-8 w-8 rounded-full object-cover" alt="" />
            : (msg.profiles?.name?.[0]?.toUpperCase() ?? "?")
          }
        </div>
      )}

      <div className={cn("max-w-[70%] space-y-0.5", isOwn ? "items-end" : "items-start")}>
        {/* Sender + time */}
        {!isOwn && (
          <p className="text-[10px] text-muted-foreground pl-0.5">{msg.profiles?.name ?? "Unknown"}</p>
        )}

        <div className={cn("relative rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
          isOwn
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        )}>
          {msg.message_text}
          {/* Attachments */}
          {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {msg.attachments.map((a: any, i: number) => (
                a.type?.startsWith("image/") ? (
                  <img key={i} src={a.url} alt="attachment" className="rounded-lg max-w-[200px] max-h-[200px] object-cover" />
                ) : (
                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] underline opacity-80">
                    <Paperclip className="h-3 w-3" />{a.name}
                  </a>
                )
              ))}
            </div>
          )}
        </div>

        {/* Reactions */}
        {Object.keys(reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5 px-0.5">
            {Object.entries(reactions).map(([emoji, count]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                className="flex items-center gap-0.5 rounded-full bg-muted border border-border/50 px-1.5 py-0.5 text-[11px] hover:bg-muted/80 transition-colors">
                {emoji} <span className="text-muted-foreground">{count}</span>
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground px-0.5">{format(new Date(msg.created_at), "HH:mm")}</p>
      </div>

      {/* Action buttons on hover */}
      {showActions && (
        <div className={cn(
          "flex items-center gap-0.5 self-center opacity-0 group-hover:opacity-100 transition-opacity",
          isOwn ? "mr-1" : "ml-1"
        )}>
          <div className="relative">
            <button onClick={() => setShowEmoji(!showEmoji)}
              className="h-6 w-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground">
              <Smile className="h-3 w-3" />
            </button>
            {showEmoji && (
              <div className={cn(
                "absolute bottom-full mb-1 flex gap-1 bg-card border border-border/50 rounded-xl p-1.5 shadow-lg z-10",
                isOwn ? "right-0" : "left-0"
              )}>
                {EMOJI_LIST.map((e) => (
                  <button key={e} onClick={() => { onReact(msg.id, e); setShowEmoji(false); }}
                    className="text-[16px] hover:scale-125 transition-transform">
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => onReply(msg)}
            className="h-6 w-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground">
            <Reply className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function CollaborationHub() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Load channels ─────────────────────────────────────────────── */
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["collab", "channels"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("channels")
        .select("id,name,type,description")
        .eq("is_active", true)
        .order("name");
      return (data ?? []) as Channel[];
    },
  });

  /* ── Load messages for selected channel ──────────────────────── */
  const { data: messages = [] } = useQuery<MessageRow[]>({
    queryKey: ["collab", "messages", selectedChannel?.id],
    enabled: !!selectedChannel,
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id,channel_id,sender_id,message_text,attachments,reactions,reply_to_id,is_deleted,created_at,profiles(name,avatar_url)")
        .eq("channel_id", selectedChannel!.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(100);
      return (data ?? []) as unknown as MessageRow[];
    },
  });

  /* ── Realtime subscription ──────────────────────────────────── */
  useEffect(() => {
    if (!selectedChannel) return;
    const channel = supabase.channel(`messages:${selectedChannel.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${selectedChannel.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["collab", "messages", selectedChannel.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedChannel?.id, qc]);

  /* ── Auto-scroll ─────────────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send message ────────────────────────────────────────────── */
  const sendMutation = useMutation({
    mutationFn: async ({ text, attachments }: { text: string; attachments?: any[] }) => {
      if (!selectedChannel || !user) return;
      const { error } = await supabase.from("messages").insert({
        channel_id: selectedChannel.id,
        sender_id: user.id,
        message_text: text || null,
        attachments: attachments ?? [],
        reply_to_id: replyTo?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText(""); setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["collab", "messages", selectedChannel?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── React to message ────────────────────────────────────────── */
  const reactMutation = useCallback(async (msgId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(typeof msg.reactions === "object" ? msg.reactions as Record<string, string[]> : {}) };
    const users: string[] = reactions[emoji] ?? [];
    if (users.includes(user.id)) {
      reactions[emoji] = users.filter((u) => u !== user.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, user.id];
    }
    await supabase.from("messages").update({ reactions }).eq("id", msgId);
    qc.invalidateQueries({ queryKey: ["collab", "messages", selectedChannel?.id] });
  }, [messages, user, selectedChannel, qc]);

  /* ── File upload ─────────────────────────────────────────────── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("message-attachments").getPublicUrl(path);
      await sendMutation.mutateAsync({
        text,
        attachments: [{ url: urlData.publicUrl, name: file.name, type: file.type }],
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ── Create channel ──────────────────────────────────────────── */
  const createChannelMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("channels").insert({
        name: newChannelName.trim(),
        type: "group",
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Channel created!");
      setNewChannelName(""); setShowNewChannel(false);
      qc.invalidateQueries({ queryKey: ["collab", "channels"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── Group messages by date ──────────────────────────────────── */
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: MessageRow[] }[] = [];
    let lastDate = "";
    messages.forEach((m) => {
      const d = format(new Date(m.created_at), "yyyy-MM-dd");
      if (d !== lastDate) { groups.push({ date: d, messages: [] }); lastDate = d; }
      groups[groups.length - 1].messages.push(m);
    });
    return groups;
  }, [messages]);

  /* ── Channel Sidebar ─────────────────────────────────────────── */
  const ChannelList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <p className="text-[13px] font-bold text-foreground">Channels</p>
          </div>
          <button onClick={() => setShowNewChannel(true)}
            className="h-6 w-6 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
        {showNewChannel && (
          <div className="mt-3 space-y-2">
            <Input
              placeholder="Channel name..."
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              className="h-8 text-[12px] bg-background border-border/50"
              onKeyDown={(e) => e.key === "Enter" && createChannelMutation.mutate()}
            />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => createChannelMutation.mutate()}
                disabled={!newChannelName.trim() || createChannelMutation.isPending}
                className="h-7 text-[11px] flex-1">Create</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowNewChannel(false)} className="h-7 text-[11px]">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {channels.map((ch) => (
          <button key={ch.id}
            onClick={() => { setSelectedChannel(ch); setSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all",
              selectedChannel?.id === ch.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Hash className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[13px] font-medium truncate">{ch.name}</span>
          </button>
        ))}
        {channels.length === 0 && (
          <p className="text-[12px] text-muted-foreground text-center py-4">No channels yet</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-background overflow-hidden -m-4 md:-m-6">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border/40 bg-card/50 shrink-0">
        <ChannelList />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-card border-r border-border z-10">
            <ChannelList />
          </aside>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="h-12 border-b border-border/40 bg-card/50 flex items-center gap-3 px-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground">
            <Hash className="h-4 w-4" />
          </button>
          {selectedChannel ? (
            <>
              <Hash className="h-4 w-4 text-primary hidden md:block" />
              <p className="text-[14px] font-semibold text-foreground">{selectedChannel.name}</p>
              {selectedChannel.description && (
                <p className="text-[12px] text-muted-foreground hidden md:block">· {selectedChannel.description}</p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground">Select a channel to start messaging</p>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedChannel ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-12 w-12 opacity-20 mb-3" />
              <p className="text-[14px] font-medium">Select a channel</p>
              <p className="text-[12px] mt-1">Choose from the sidebar to start collaborating</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Hash className="h-10 w-10 opacity-20 mb-3" />
              <p className="text-[14px] font-medium">#{selectedChannel.name}</p>
              <p className="text-[12px] mt-1">Be the first to send a message!</p>
            </div>
          ) : (
            groupedMessages.map(({ date, messages: msgs }) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[11px] text-muted-foreground font-medium">{msgDateLabel(msgs[0].created_at)}</span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
                {msgs.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isOwn={msg.sender_id === user?.id}
                    onReact={reactMutation}
                    onReply={setReplyTo}
                  />
                ))}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Preview */}
        {replyTo && (
          <div className="px-4 py-2 border-t border-border/40 bg-muted/30 flex items-center gap-2">
            <Reply className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-[12px] text-muted-foreground flex-1 truncate">
              Replying to <span className="font-medium text-foreground">{replyTo.profiles?.name}</span>: {replyTo.message_text}
            </p>
            <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Input */}
        {selectedChannel && (
          <div className="p-3 border-t border-border/40 bg-card/50">
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background px-3 py-2">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
                placeholder={`Message #${selectedChannel.name}`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && text.trim()) {
                    e.preventDefault();
                    sendMutation.mutate({ text: text.trim() });
                  }
                }}
              />
              <button
                disabled={!text.trim() || sendMutation.isPending || uploading}
                onClick={() => text.trim() && sendMutation.mutate({ text: text.trim() })}
                className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity hover:bg-primary/90 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
