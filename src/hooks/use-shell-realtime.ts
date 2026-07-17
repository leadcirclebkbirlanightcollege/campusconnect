/**
 * useShellRealtime — shell-level Supabase realtime subscriptions.
 *
 * Subscribes once, at the app shell, to the tables that most commonly
 * mutate the user's ecosystem, and emits app-events so every open screen
 * refreshes automatically. Uses per-user filters where possible to keep
 * traffic minimal.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitAppEvent } from "@/hooks/use-app-events";

export function useShellRealtime(userId: string | null | undefined): void {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`shell-${userId}`)
      // Attendance changes for this user
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "attendance", filter: `user_id=eq.${userId}` },
        () => emitAppEvent("attendance:updated"),
      )
      // Points ledger for this user
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "points_ledger", filter: `user_id=eq.${userId}` },
        () => emitAppEvent("points:changed"),
      )
      // Point claims for this user
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "point_claims", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const status = payload?.new?.status;
          if (status === "approved") emitAppEvent("point_claim:approved");
          else emitAppEvent("point_claim:submitted");
        },
      )
      // Achievements unlocked for this user
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "user_achievements", filter: `user_id=eq.${userId}` },
        () => emitAppEvent("achievement:unlocked"),
      )
      // Lecture status changes are broadcast (no per-user filter)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "lectures" },
        () => emitAppEvent("lecture:status_changed"),
      )
      // Notifications for this user
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => emitAppEvent("notification:received"),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
