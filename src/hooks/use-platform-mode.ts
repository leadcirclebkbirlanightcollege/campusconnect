import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlatformMode = "normal" | "semester_closed" | "maintenance" | "launch";

export interface PlatformModeSettings {
  mode: PlatformMode;
  custom_headline: string | null;
  custom_subtext: string | null;
  custom_suspense: string | null;
  estimated_return: string | null;
  event_theme: string | null;
  launch_date: string | null;
}

const DEFAULT_SETTINGS: PlatformModeSettings = {
  mode: "normal",
  custom_headline: null,
  custom_subtext: null,
  custom_suspense: null,
  estimated_return: null,
  event_theme: null,
  launch_date: null,
};

// Module-level cache so it's shared across components
let cachedSettings: PlatformModeSettings | null = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function usePlatformMode() {
  const [settings, setSettings] = useState<PlatformModeSettings>(
    cachedSettings ?? DEFAULT_SETTINGS
  );
  const [loading, setLoading] = useState(!cachedSettings);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const now = Date.now();
    if (cachedSettings && now - lastFetchedAt < CACHE_TTL_MS) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", "platform_mode")
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (!error && data) {
          const parsed = data.value as PlatformModeSettings;
          cachedSettings = parsed;
          lastFetchedAt = Date.now();
          setSettings(parsed);
        }
        setLoading(false);
      });
  }, []);

  return { settings, loading };
}

export function invalidatePlatformModeCache() {
  cachedSettings = null;
  lastFetchedAt = 0;
}
