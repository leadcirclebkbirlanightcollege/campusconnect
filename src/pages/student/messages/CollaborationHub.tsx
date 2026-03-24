import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Send, Plus, Hash, MessageSquare, X, Paperclip, Smile, Reply,
  ArrowLeft, Users, Search, Phone, Video, MoreVertical,
} from "lucide-react";
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
const EMOJI_LIST = ["👍", "❤️", "😂", "🎉", "🔥", "👏", "😮", "😢"];
function colorFromName(name: string) {
  const colors = ["bg-violet-500", "bg-blue-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/* ── Avatar ─────────────────────────────────────────────────────── */
function UserAvatar({ name, avatarUrl, size = "sm" }: { name: string; avatarUrl?: string | null; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-[13px]";
  if (avatarUrl) return <img src={avatarUrl} className={cn(sz, "rounded-full object-cover shrink-0")} alt="" />;
  return (
    <div className={cn(sz, "rounded-full flex items-center justify-center font-bold text-white shrink-0", colorFromName(name))}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

/* ── Message Bubble ─────────────────────────────────────────────── */
function MessageBubble({ msg, isOwn, onReact, onReply, showAvatar }: {
  msg: MessageRow; isOwn: boolean; showAvatar: boolean;
  onReact: (id: string, emoji: string) => void;
  onReply: (msg: MessageRow) => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const reactions = useMemo(() => {
    const r: Record<string, number> = {};
    if (msg.reactions && typeof msg.reactions === "object") {
      Object.entries(msg.reactions as Record<string, string[]>).forEach(([e, users]) => {
        r[e] = (users as string[]).length;
      });
    }
    return r;
  }, [msg.reactions]);

  const senderName = msg.profiles?.name ?? "Unknown";

  return (
    <div className={cn("flex gap-2.5 group px-4", isOwn ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className="shrink-0 w-8 mt-1">
        {!isOwn && showAvatar && (
          <UserAvatar name={senderName} avatarUrl={msg.profiles?.avatar_url} />
        )}
      </div>

      <div className={cn("max-w-[72%] space-y-0.5", isOwn ? "items-end" : "items-start", "flex flex-col")}>
        {/* Sender + time */}
        {!isOwn && showAvatar && (
          <p className="text-[10px] text-muted-foreground font-medium pl-1">{senderName}</p>
        )}

        <div className="flex items-end gap-1.5">
          {/* Action buttons on hover */}
          {isOwn && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity self-center">
              <div className="relative">
                <button onClick={() => setShowEmoji(!showEmoji)}
                  className="h-6 w-6 rounded-full bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-muted-foreground transition-colors">
                  <Smile className="h-3 w-3" />
                </button>
                {showEmoji && (
                  <div className="absolute bottom-full right-0 mb-1 flex gap-1 bg-card border border-border/50 rounded-xl p-1.5 shadow-lg z-20">
                    {EMOJI_LIST.map((e) => (
                      <button key={e} onClick={() => { onReact(msg.id, e); setShowEmoji(false); }}
                        className="text-[16px] hover:scale-125 transition-transform">{e}</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => onReply(msg)}
                className="h-6 w-6 rounded-full bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-muted-foreground transition-colors">
                <Reply className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className={cn(
            "relative rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed break-words",
            isOwn
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-surface-2 border border-border-subtle text-foreground rounded-tl-md",
          )}>
            {msg.message_text}
            {/* Attachments */}
            {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {msg.attachments.map((a: any, i: number) => (
                  a.type?.startsWith("image/") ? (
                    <img key={i} src={a.url} alt="attachment" className="rounded-xl max-w-[200px] max-h-[200px] object-cover" />
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

          {/* Action buttons on hover — left side for others */}
          {!isOwn && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity self-center">
              <div className="relative">
                <button onClick={() => setShowEmoji(!showEmoji)}
                  className="h-6 w-6 rounded-full bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-muted-foreground transition-colors">
                  <Smile className="h-3 w-3" />
                </button>
                {showEmoji && (
                  <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-card border border-border/50 rounded-xl p-1.5 shadow-lg z-20">
                    {EMOJI_LIST.map((e) => (
                      <button key={e} onClick={() => { onReact(msg.id, e); setShowEmoji(false); }}
                        className="text-[16px] hover:scale-125 transition-transform">{e}</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => onReply(msg)}
                className="h-6 w-6 rounded-full bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-muted-foreground transition-colors">
                <Reply className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Reactions */}
        {Object.keys(reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5 px-1">
            {Object.entries(reactions).map(([emoji, count]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                className="flex items-center gap-0.5 rounded-full bg-surface-2 border border-border/50 px-1.5 py-0.5 text-[11px] hover:bg-surface-3 transition-colors">
                {emoji} <span className="text-muted-foreground font-medium">{count}</span>
              </button>
            ))}
          </div>
        )}

        <p className={cn("text-[10px] text-muted-foreground px-1", isOwn && "text-right")}>
          {format(new Date(msg.created_at), "HH:mm")}
        </p>
      </div>
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
  const [channelSearch, setChannelSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const filteredChannels = useMemo(() =>
    channels.filter(c => c.name.toLowerCase().includes(channelSearch.toLowerCase())),
    [channels, channelSearch]
  );

  /* ── Load messages ──────────────────────────────────────────── */
  const { data: messages = [], isLoading: msgsLoading } = useQuery<MessageRow[]>({
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

  /* ── Realtime ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedChannel) return;
    const channel = supabase.channel(`msgs:${selectedChannel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${selectedChannel.id}` },
        () => qc.invalidateQueries({ queryKey: ["collab", "messages", selectedChannel.id] }))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${selectedChannel.id}` },
        () => qc.invalidateQueries({ queryKey: ["collab", "messages", selectedChannel.id] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedChannel?.id, qc]);

  /* ── Auto-scroll ─────────────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send message ────────────────────────────────────────────── */
  const sendMutation = useMutation({
    mutationFn: async ({ msgText, attachments }: { msgText: string; attachments?: any[] }) => {
      if (!selectedChannel || !user) return;
      const { error } = await supabase.from("messages").insert({
        channel_id: selectedChannel.id,
        sender_id: user.id,
        message_text: msgText.trim() || null,
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

  const handleSend = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ msgText: text });
  };

  /* ── React to message ────────────────────────────────────────── */
  const reactMutation = useCallback(async (msgId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(typeof msg.reactions === "object" ? msg.reactions as Record<string, string[]> : {}) };
    const users: string[] = reactions[emoji] ?? [];
    reactions[emoji] = users.includes(user.id)
      ? users.filter((u) => u !== user.id)
      : [...users, user.id];
    if (reactions[emoji].length === 0) delete reactions[emoji];
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
      const { error: uploadError } = await supabase.storage.from("message-attachments").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("message-attachments").getPublicUrl(path);
      await sendMutation.mutateAsync({
        msgText: text,
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
        name: newChannelName.trim().toLowerCase().replace(/\s+/g, "-"),
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

  /* ── Sidebar ─────────────────────────────────────────────────── */
  const ChannelSidebar = () => (
    <div className="flex flex-col h-full bg-surface-1">
      {/* Header */}
      <div className="p-4 border-b border-border-subtle shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <p className="text-[14px] font-bold text-foreground">Channels</p>
          </div>
          <button onClick={() => setShowNewChannel(true)}
            className="h-7 w-7 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
            <Plus className="h-3.5 w-3.5 text-primary" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={channelSearch}
            onChange={(e) => setChannelSearch(e.target.value)}
            className="h-8 pl-8 text-[12px] bg-surface-2 border-border-subtle"
          />
        </div>

        {/* New channel form */}
        {showNewChannel && (
          <div className="mt-3 space-y-2 p-3 rounded-xl bg-surface-2 border border-border-subtle">
            <Input
              placeholder="channel-name"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              className="h-8 text-[12px]"
              onKeyDown={(e) => e.key === "Enter" && createChannelMutation.mutate()}
              autoFocus
            />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => createChannelMutation.mutate()}
                disabled={!newChannelName.trim() || createChannelMutation.isPending}
                className="h-7 text-[11px] flex-1">
                Create
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowNewChannel(false)} className="h-7 text-[11px]">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filteredChannels.length === 0 && (
          <div className="text-center py-8">
            <Hash className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[12px] text-muted-foreground">No channels yet</p>
            <button onClick={() => setShowNewChannel(true)}
              className="mt-2 text-[11px] text-primary hover:underline">
              Create one
            </button>
          </div>
        )}
        {filteredChannels.map((ch) => {
          const active = selectedChannel?.id === ch.id;
          return (
            <button key={ch.id}
              onClick={() => setSelectedChannel(ch)}
              className={cn(
                "w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <Hash className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground/50")} />
              <span className="text-[13px] font-medium truncate">{ch.name}</span>
              {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border-subtle shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-muted-foreground">{channels.length} channel{channels.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-70px)] bg-background overflow-hidden -mx-4 -mt-5 md:-mx-6 md:-mt-5 rounded-none">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border-subtle shrink-0">
        <ChannelSidebar />
      </aside>

      {/* Mobile: show channel list OR chat */}
      {!selectedChannel ? (
        <div className="flex-1 md:hidden">
          <ChannelSidebar />
        </div>
      ) : null}

      {/* Main Chat Area */}
      <div className={cn("flex-1 flex flex-col min-w-0", !selectedChannel && "hidden md:flex")}>
        {/* Chat Header */}
        <div className="h-[52px] border-b border-border-subtle bg-card/50 flex items-center gap-3 px-4 shrink-0">
          {/* Mobile back button */}
          <button onClick={() => setSelectedChannel(null)} className="md:hidden text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          {selectedChannel ? (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Hash className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-foreground leading-none truncate">{selectedChannel.name}</p>
                {selectedChannel.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-none truncate hidden md:block">
                    {selectedChannel.description}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground flex-1">Select a channel</p>
          )}
          {selectedChannel && (
            <div className="flex items-center gap-1 shrink-0">
              <button className="h-8 w-8 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted-foreground transition-colors">
                <Search className="h-3.5 w-3.5" />
              </button>
              <button className="h-8 w-8 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted-foreground transition-colors">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-1.5">
          {!selectedChannel ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground mb-1">Welcome to Collaboration Hub</h3>
              <p className="text-[13px] text-muted-foreground max-w-xs">
                Select a channel from the sidebar to start collaborating with your classmates.
              </p>
            </div>
          ) : msgsLoading ? (
            <div className="space-y-4 px-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={cn("flex gap-2.5", i % 2 === 0 && "flex-row-reverse")}>
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="space-y-1.5">
                    <div className={cn("h-4 w-20 rounded bg-muted animate-pulse", i % 2 === 0 && "ml-auto")} />
                    <div className="h-10 w-48 rounded-2xl bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
                <Hash className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-[14px] font-semibold text-foreground mb-1">Start the conversation</p>
              <p className="text-[12px] text-muted-foreground">Be the first to message in #{selectedChannel.name}</p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.date} className="space-y-1.5">
                {/* Date divider */}
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="flex-1 h-px bg-border-subtle" />
                  <span className="text-[11px] text-muted-foreground font-medium bg-background px-2">
                    {msgDateLabel(group.messages[0].created_at)}
                  </span>
                  <div className="flex-1 h-px bg-border-subtle" />
                </div>
                {group.messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === user?.id;
                  const prev = group.messages[idx - 1];
                  const showAvatar = !prev || prev.sender_id !== msg.sender_id;
                  return (
                    <MessageBubble
                      key={msg.id} msg={msg} isOwn={isOwn}
                      showAvatar={showAvatar}
                      onReact={reactMutation} onReply={setReplyTo}
                    />
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply preview */}
        {replyTo && (
          <div className="mx-4 mb-2 flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/15">
            <Reply className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-primary">{replyTo.profiles?.name ?? "User"}</p>
              <p className="text-[12px] text-muted-foreground truncate">{replyTo.message_text}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="h-5 w-5 rounded-full bg-surface-2 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Input area */}
        {selectedChannel && (
          <div className="px-4 pb-4 shrink-0">
            <div className="flex items-center gap-2 p-2 rounded-2xl border border-border-subtle bg-surface-1 shadow-sm">
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="h-8 w-8 shrink-0 rounded-xl hover:bg-surface-2 flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-50">
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={`Message #${selectedChannel.name}`}
                className="flex-1 bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground outline-none border-none"
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sendMutation.isPending}
                className={cn(
                  "h-8 w-8 shrink-0 rounded-xl flex items-center justify-center transition-all",
                  text.trim()
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-surface-2 text-muted-foreground cursor-not-allowed"
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx" />
          </div>
        )}
      </div>
    </div>
  );
}
