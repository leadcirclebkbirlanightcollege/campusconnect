/**
 * PlatformModeGuard — Shows maintenance/semester-closed/launch screens
 * when the platform is in a non-normal mode.
 *
 * Uses AuthProvider + TenantProvider to avoid duplicate role fetching.
 * NEVER blocks rendering — children render immediately while settings load.
 */

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";
import SemesterClosedScreen from "@/components/platform/SemesterClosedScreen";
import MaintenanceModeScreen from "@/components/platform/MaintenanceModeScreen";
import LaunchModeScreen from "@/components/platform/LaunchModeScreen";
import type { PlatformModeSettings } from "@/hooks/use-platform-mode";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedSettings: PlatformModeSettings | null = null;
let lastFetchedAt = 0;

const DEFAULT: PlatformModeSettings = {
  mode: "normal",
  custom_headline: null,
  custom_subtext: null,
  custom_suspense: null,
  estimated_return: null,
  event_theme: null,
  launch_date: null,
};

interface Props {
  children: React.ReactNode;
}

export default function PlatformModeGuard({ children }: Props) {
  const [settings, setSettings] = useState<PlatformModeSettings>(
    cachedSettings ?? DEFAULT
  );
  const { user } = useAuth();
  const { isSuperAdmin } = useTenant();
  const fetchedRef = useRef(false);

  // Fetch platform mode once with 5-min cache (non-blocking)
  useEffect(() => {
    const now = Date.now();
    if (cachedSettings && now - lastFetchedAt < CACHE_TTL_MS) {
      setSettings(cachedSettings);
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
          cachedSettings = data.value as PlatformModeSettings;
          lastFetchedAt = Date.now();
          setSettings(cachedSettings);
        }
      });
  }, []);

  // Apply event theme to body
  useEffect(() => {
    const theme = settings.event_theme ?? "";
    document.body.dataset.theme = theme;
    return () => { document.body.dataset.theme = ""; };
  }, [settings.event_theme]);

  // Admins & super_admins always bypass
  if (user && isSuperAdmin) return <>{children}</>;

  // Block students based on mode
  if (settings.mode === "semester_closed") {
    return <SemesterClosedScreen settings={settings} />;
  }

  if (settings.mode === "maintenance") {
    return <MaintenanceModeScreen settings={settings} />;
  }

  if (settings.mode === "launch") {
    return <LaunchModeScreen settings={settings} />;
  }

  return <>{children}</>;
}
