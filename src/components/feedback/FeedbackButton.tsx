/**
 * FeedbackButton
 * Floating action button — renders for authenticated users on student + admin layouts.
 * Submits to the `feedback` table with RLS (user_id = auth.uid()).
 */
import { useState } from "react";
import { MessageSquarePlus, X, Send, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z.object({
  category: z.enum(["bug", "feature", "ui", "general"]),
  message: z.string().min(10, "Please add a bit more detail (min 10 chars)").max(1000),
});
type FormData = z.infer<typeof schema>;

const CATEGORY_LABELS: Record<FormData["category"], string> = {
  bug:     "🐛 Bug Report",
  feature: "💡 Feature Idea",
  ui:      "🎨 UI / Design",
  general: "💬 General",
};

export default function FeedbackButton() {
  const [open, setOpen]       = useState(false);
  const [done, setDone]       = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: "general", message: "" },
  });
  const category = watch("category");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Get college_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("college_id")
        .eq("user_id", session.user.id)
        .single();

      const { error } = await supabase.from("feedback").insert({
        user_id:   session.user.id,
        college_id: profile?.college_id ?? null,
        category:  data.category,
        message:   data.message,
      } as any);

      if (error) throw error;
      setDone(true);
      reset();
      setTimeout(() => { setDone(false); setOpen(false); }, 2000);
    } catch (err: any) {
      toast.error("Couldn't submit feedback", { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger */}
      <div className="fixed right-4 z-[9999]" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => { setOpen((v) => !v); setDone(false); }}
          className={cn(
            "flex items-center justify-center h-12 w-12 rounded-full shadow-lg",
            "bg-action-primary text-action-primary-foreground border border-action-primary",
            "hover:bg-action-primary-hover transition-colors"
          )}
          aria-label="Send feedback"
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="h-4.5 w-4.5" />
              </motion.span>
            ) : (
              <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <MessageSquarePlus className="h-4.5 w-4.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed right-4 z-[9998] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border-subtle bg-surface-1 text-foreground shadow-xl"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
          >
            {done ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <CheckCircle2 className="h-10 w-10 text-success" />
                <p className="text-sm font-semibold text-foreground">Thanks for your feedback!</p>
                <p className="text-xs text-muted-foreground">We'll review it soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] font-semibold text-foreground">Send Feedback</p>
                  <span className="text-[10px] text-muted-foreground">We read every submission</span>
                </div>

                {/* Category selector */}
                <Select
                  value={category}
                  onValueChange={(v) => setValue("category", v as FormData["category"])}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CATEGORY_LABELS) as [FormData["category"], string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div>
                  <Textarea
                    {...register("message")}
                    placeholder="Tell us what's on your mind…"
                    className="resize-none text-xs min-h-[80px]"
                    maxLength={1000}
                  />
                  {errors.message && (
                    <p className="text-[10px] text-destructive mt-1">{errors.message.message}</p>
                  )}
                </div>

                <Button type="submit" size="sm" className="w-full gap-2" disabled={loading}>
                  <Send className="h-3.5 w-3.5" />
                  {loading ? "Sending…" : "Submit Feedback"}
                </Button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
