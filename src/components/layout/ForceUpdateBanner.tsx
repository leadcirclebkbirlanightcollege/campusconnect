/**
 * ForceUpdateBanner
 * Listens to `platform_settings` key "force_update" via Supabase Realtime.
 * When triggered by an admin, shows a full-screen non-dismissible overlay
 * that auto-reloads the page after a 5-second countdown.
 *
 * Admins are exempt — they see a dismissible toast instead.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRANDING } from "@/config/branding";
import { APP_VERSION } from "@/config/version";
import { toast } from "sonner";
import { refreshToLatest } from "@/lib/refresh-to-latest";

type ForceUpdatePayload = {
  triggered_at: string;   // ISO timestamp
  version: string;        // new version string
  message?: string;       // optional admin message
};

const SETTING_KEY = "force_update";

function isVersionAtLeast(currentVersion: string, targetVersion: string) {
  const current = currentVersion.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const target = targetVersion.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const maxLen = Math.max(current.length, target.length);

  for (let i = 0; i < maxLen; i += 1) {
    const currentPart = current[i] ?? 0;
    const targetPart = target[i] ?? 0;
    if (currentPart > targetPart) return true;
    if (currentPart < targetPart) return false;
  }

  return true;
}

/** Reads the stored timestamp from sessionStorage so we don't re-show on refresh */
function getAckedTimestamp(): string | null {
  try { return sessionStorage.getItem("cc_force_update_acked"); } catch { return null; }
}
function ackTimestamp(ts: string) {
  try { sessionStorage.setItem("cc_force_update_acked", ts); } catch { /* noop */ }
}

export default function ForceUpdateBanner() {
  const [payload, setPayload] = useState<ForceUpdatePayload | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [isAdmin, setIsAdmin] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Determine if current user is admin (skip overlay for admins) ── */
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

  /* ── Check + apply force-update setting ── */
  const applyPayload = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const p = value as ForceUpdatePayload;
    if (!p.triggered_at) return;
    if (getAckedTimestamp() === p.triggered_at) return;

    // If this client already runs the pushed version, no need to show/update-block again.
    if (p.version && isVersionAtLeast(APP_VERSION, p.version)) {
      ackTimestamp(p.triggered_at);
      return;
    }

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
      .channel("force_update_watch")
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "platform_settings",
          filter: `key=eq.${SETTING_KEY}`,
        },
        (payload: any) => {
          applyPayload(payload.new?.value);
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "platform_settings",
          filter: `key=eq.${SETTING_KEY}`,
        },
        (payload: any) => {
          applyPayload(payload.new?.value);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ── Countdown + auto-reload ── */
  useEffect(() => {
    if (!payload) return;

    if (isAdmin) {
      // Admins see a dismissible toast, not the blocking overlay
      toast.info(
        `Force update pushed (v${payload.version || APP_VERSION}). Students will be auto-refreshed.`,
        { duration: 8000, id: "force-update-admin" }
      );
      ackTimestamp(payload.triggered_at);
      setPayload(null);
      return;
    }

    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          ackTimestamp(payload.triggered_at);
          void refreshToLatest();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [payload, isAdmin]);

  const handleReloadNow = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (payload) ackTimestamp(payload.triggered_at);
    void refreshToLatest();
  };

  return (
    <AnimatePresence>
      {payload && !isAdmin && (
        <motion.div
          key="force-update"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center
                     bg-background/95 backdrop-blur-xl"
        >
          {/* Pulsing ring */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/30
                       flex items-center justify-center mb-6"
          >
            <RefreshCw className="h-8 w-8 text-primary" />
          </motion.div>

          <h2 className="text-xl font-black text-foreground mb-1 text-center px-6">
            Update Available
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-1 px-6">
            {payload.message ?? `${BRANDING.name} has been updated to a new version.`}
          </p>
          <p className="text-xs text-muted-foreground/60 mb-6">
            v{payload.version || APP_VERSION}
          </p>

          {/* Countdown ring */}
          <div className="relative h-16 w-16 mb-4">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted)/0.3)" strokeWidth="4" />
              <motion.circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 28}
                animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - countdown / 5) }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-foreground">
              {countdown}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mb-4">Refreshing in {countdown}s…</p>

          <Button onClick={handleReloadNow} className="gap-2">
            <Zap className="h-4 w-4" /> Refresh Now
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

