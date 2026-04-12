/**
 * AiChatButton — Floating AI assistant button + chat drawer.
 * Uses the ai-chat edge function via Lovable AI Gateway.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AiChatButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Don't show for unauthenticated users
  if (!user) return null;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { message: text, history: messages.slice(-10) },
      });

      if (error) throw error;

      const reply = data?.reply ?? "Sorry, I couldn't process that.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(true)}
            className={cn(
              "fixed z-50 h-12 w-12 rounded-2xl",
              "bg-gradient-to-br from-primary to-[hsl(var(--gradient-to))]",
              "text-primary-foreground shadow-lg",
              "flex items-center justify-center",
              "bottom-[calc(80px+env(safe-area-inset-bottom,0px)+8px)] right-4",
              "md:bottom-6 md:right-6",
              "fab-pulse",
            )}
            aria-label="Open AI assistant"
          >
            <Sparkles className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            className={cn(
              "fixed z-50 flex flex-col",
              "bg-surface-1 border border-border-subtle rounded-2xl shadow-xl",
              "w-[calc(100%-32px)] max-w-[380px] h-[480px]",
              "bottom-[calc(80px+env(safe-area-inset-bottom,0px)+8px)] right-4",
              "md:bottom-6 md:right-6",
              "overflow-hidden",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface-2/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--gradient-to))] flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Campus AI</p>
                  <p className="text-[10px] text-muted-foreground">Always here to help</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-surface-3 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">Hi there! 👋</p>
                    <p className="text-[12px] text-muted-foreground mt-1 max-w-[200px]">
                      Ask me anything about Campus Connect, lectures, or your academic journey.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    msg.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
                      : "mr-auto bg-surface-2 text-foreground border border-border-subtle rounded-bl-md",
                  )}
                >
                  {msg.content}
                </div>
              ))}

              {loading && (
                <div className="mr-auto flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-surface-2 border border-border-subtle">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-[12px] text-muted-foreground">Thinking…</span>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-center gap-2 px-3 py-2.5 border-t border-border-subtle bg-surface-1"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything…"
                maxLength={2000}
                className="flex-1 bg-surface-2 border border-border-subtle rounded-xl px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all",
                  input.trim() && !loading
                    ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
                    : "bg-surface-3 text-muted-foreground/40",
                )}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
