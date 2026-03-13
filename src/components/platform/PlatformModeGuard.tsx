import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [userRole, setUserRole] = useState<"admin" | "student" | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const fetchedRef = useRef(false);

  // 1. Resolve user role once from session cache
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setAuthReady(true);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setUserRole((data?.role as "admin" | "student") ?? "student");
      setAuthReady(true);
    });
  }, []);

  // 2. Fetch platform mode once with 5-min cache
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

  // Apply event theme to body (non-blocking, runs for everyone including admins)
  useEffect(() => {
    const theme = settings.event_theme ?? "";
    document.body.dataset.theme = theme;
    return () => { document.body.dataset.theme = ""; };
  }, [settings.event_theme]);

  // Wait for auth to resolve — show children immediately so landing page is never blank
  if (!authReady) return <>{children}</>;

  // Admins always bypass — role-based only, no route exceptions
  if (userRole === "admin") return <>{children}</>;

  // Block students based on mode — no exceptions
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
