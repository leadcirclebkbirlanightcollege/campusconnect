/**
 * useAppEvents — cross-module event bus.
 *
 * A single place that maps *user-facing events* to *React Query invalidations*.
 * Any screen can emit an event; every screen listening on the affected keys
 * will refetch on its own — no direct coupling.
 *
 * This is what gives the app its "alive" feeling: mark attendance in one
 * screen, and dashboard / points / streak / leaderboard / achievements all
 * update, without those screens knowing about the caller.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

/** All app-level events that can ripple across modules. */
export type AppEvent =
  | "attendance:marked"
  | "attendance:updated"
  | "lecture:status_changed"
  | "points:changed"
  | "point_claim:submitted"
  | "point_claim:approved"
  | "achievement:unlocked"
  | "streak:updated"
  | "event:registered"
  | "notification:received"
  | "profile:updated";

/** Query-key roots invalidated for each event. Loose matching via startsWith. */
const EVENT_INVALIDATIONS: Record<AppEvent, string[][]> = {
  "attendance:marked": [
    ["dashboard"],
    ["student", "attendance"],
    ["student", "points-total"],
    ["student", "intelligence"],
    ["student", "growth-insights"],
    ["leaderboard"],
    ["achievements"],
  ],
  "attendance:updated": [
    ["dashboard"],
    ["student", "attendance"],
    ["student", "intelligence"],
    ["leaderboard"],
  ],
  "lecture:status_changed": [
    ["dashboard"],
    ["live-lecture"],
    ["student", "lectures"],
  ],
  "points:changed": [
    ["dashboard"],
    ["student", "points-total"],
    ["student", "claims"],
    ["leaderboard"],
  ],
  "point_claim:submitted": [
    ["student", "claims"],
    ["dashboard"],
  ],
  "point_claim:approved": [
    ["student", "points-total"],
    ["student", "claims"],
    ["dashboard"],
    ["leaderboard"],
    ["achievements"],
  ],
  "achievement:unlocked": [
    ["achievements"],
    ["dashboard"],
    ["leaderboard"],
  ],
  "streak:updated": [
    ["dashboard"],
    ["student", "intelligence"],
  ],
  "event:registered": [
    ["student", "events"],
    ["dashboard"],
  ],
  "notification:received": [
    ["notifications"],
    ["inbox"],
  ],
  "profile:updated": [
    ["topbar", "profile"],
    ["dashboard"],
  ],
};

const TARGET = typeof window !== "undefined" ? window : (null as any);

/** Emit an app event from anywhere. */
export function emitAppEvent(event: AppEvent, detail?: unknown): void {
  if (!TARGET) return;
  TARGET.dispatchEvent(new CustomEvent(`app:${event}`, { detail }));
}

/**
 * Install listeners once (at shell level) that translate app events into
 * React Query invalidations. Also exposes a stable `emit` helper.
 */
export function useAppEventsBridge(): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!TARGET) return;

    const handlers: Array<[string, EventListener]> = [];

    (Object.keys(EVENT_INVALIDATIONS) as AppEvent[]).forEach((evt) => {
      const roots = EVENT_INVALIDATIONS[evt];
      const handler: EventListener = () => {
        roots.forEach((key) => {
          qc.invalidateQueries({ queryKey: key });
        });
      };
      const evtName = `app:${evt}`;
      TARGET.addEventListener(evtName, handler);
      handlers.push([evtName, handler]);
    });

    return () => {
      handlers.forEach(([name, h]) => TARGET.removeEventListener(name, h));
    };
  }, [qc]);
}

/** Hook variant returning a stable emitter. */
export function useAppEvents() {
  const emit = useCallback((event: AppEvent, detail?: unknown) => {
    emitAppEvent(event, detail);
  }, []);
  return { emit };
}
