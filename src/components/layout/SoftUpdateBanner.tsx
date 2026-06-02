/**
 * SoftUpdateBanner
 * Listens to `platform_settings` key "soft_update" via Supabase Realtime.
 * When triggered by an admin, shows a dismissible sticky banner at the top
 * with a "Refresh" CTA. Admins see a toast instead of the banner.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/config/version";
import { toast } from "sonner";
import { refreshToLatest } from "@/lib/refresh-to-latest";

type SoftUpdatePayload = {
  triggered_at: string;
  version: string;
  message?: string;
};

const SETTING_KEY = "soft_update";

function getAckedTimestamp(): string | null {
  try { return localStorage.getItem("cc_soft_update_acked"); } catch { return null; }
}
function ackTimestamp(ts: string) {
  try { localStorage.setItem("cc_soft_update_acked", ts); } catch { /* noop */ }
}

export default function SoftUpdateBanner() {
  const [payload, setPayload] = useState<SoftUpdatePayload | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  /* ── Determine if current user is admin ── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from("user_roles")
        .select("role").eq("user_id", data.user.id)
        .in("role", ["admin", "super_admin"])
        .limit(1)
        .then(({ data: roles }) => {
          if (roles && roles.length > 0) setIsAdmin(true);
        });
    });
  }, []);

  const applyPayload = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const p = value as SoftUpdatePayload;
    if (!p.triggered_at) return;
    if (getAckedTimestamp() === p.triggered_at) return;
    setPayload(p);
  };

  /* ── Initial fetch ── */
  useEffect(() => {
    (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", SETTING_KEY)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.value) applyPayload(data.value);
      });
  }, []);

  /* ── Realtime subscription ── */
  useEffect(() => {
    const channel = supabase
      .channel("soft_update_watch")
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "platform_settings", filter: `key=eq.${SETTING_KEY}` },
        (p: any) => applyPayload(p.new?.value)
      )
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "platform_settings", filter: `key=eq.${SETTING_KEY}` },
        (p: any) => applyPayload(p.new?.value)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ── Show toast to admins, banner to students ── */
  useEffect(() => {
    if (!payload) return;
    if (isAdmin) {
      toast.info(
        `Soft update banner pushed (v${payload.version || APP_VERSION}). Students will see a refresh prompt.`,
        { duration: 6000, id: "soft-update-admin" }
      );
      ackTimestamp(payload.triggered_at);
      setPayload(null);
    }
  }, [payload, isAdmin]);

  const handleRefresh = () => {
    if (payload) ackTimestamp(payload.triggered_at);
    void refreshToLatest();
  };

  const handleDismiss = () => {
    if (payload) ackTimestamp(payload.triggered_at);
    setPayload(null);
  };

  return (
    <AnimatePresence>
      {payload && !isAdmin && (
        <motion.div
          key="soft-update"
          initial={{ opacity: 0, y: -48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -48 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-between gap-3
                     px-4 py-2.5 bg-primary text-primary-foreground shadow-lg"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}

        >
          {/* Left: icon + message */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 h-6 w-6 rounded-full bg-primary-foreground/15 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <p className="text-[13px] font-medium leading-snug truncate">
              {payload.message ?? `New update available — refresh to use v${payload.version || APP_VERSION}`}
            </p>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-3 text-xs font-semibold gap-1.5 bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground border-0"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-primary-foreground/15 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

