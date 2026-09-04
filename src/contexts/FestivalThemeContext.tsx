import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import {
  FestivalThemeId,
  FestivalId,
  FestivalConfig,
  getCampusTheme,
  getCampusThemeConfig,
  getMsUntilNextTransition,
} from "@/config/festivalTheme";

interface FestivalThemeContextType {
  theme: FestivalThemeId;
  isFestive: boolean;
  isJanmashtami: boolean;
  isDahiHandi: boolean;
  config: FestivalConfig;
  setOverrideTheme: (theme: FestivalThemeId | null) => void;
}

const FestivalThemeContext = createContext<FestivalThemeContextType>({
  theme: "normal",
  isFestive: false,
  isJanmashtami: false,
  isDahiHandi: false,
  config: getCampusThemeConfig("normal"),
  setOverrideTheme: () => {},
});

export function FestivalThemeProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<FestivalThemeId | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const forced = (params.get("theme") || params.get("festival"))?.toLowerCase();
        if (forced === "janmashtami" || forced === "normal") return forced;
        if (forced === "dahi_handi" || forced === "dahihandi" || forced === "dahi-handi") return "dahi_handi";

        const stored = window.localStorage?.getItem("campus_festival_theme")?.toLowerCase();
        if (stored === "janmashtami" || stored === "normal") return stored as FestivalThemeId;
        if (stored === "dahi_handi" || stored === "dahihandi" || stored === "dahi-handi") return "dahi_handi";
      } catch {
        // Storage access error handling
      }
    }
    return null;
  });

  const [currentTheme, setCurrentTheme] = useState<FestivalThemeId>(() => {
    return override || getCampusTheme(new Date());
  });

  // Keep theme synced dynamically and install automatic transition timer
  useEffect(() => {
    if (override) {
      setCurrentTheme(override);
      return;
    }

    const syncTheme = () => {
      const nextTheme = getCampusTheme(new Date());
      setCurrentTheme((prev) => (prev !== nextTheme ? nextTheme : prev));
    };

    // Evaluate theme immediately
    syncTheme();

    // Schedule automatic update at the exact transition point
    // (e.g. 2026-09-04 00:00:00, 2026-09-05 00:00:00, 2026-09-06 00:00:00 IST)
    let timerId: NodeJS.Timeout | null = null;
    const scheduleNext = () => {
      const delay = getMsUntilNextTransition(new Date());
      if (delay !== null && delay > 0) {
        timerId = setTimeout(() => {
          syncTheme();
          scheduleNext(); // Schedule the subsequent boundary
        }, delay + 60); // 60ms buffer ensures timestamp has crossed midnight IST
      }
    };

    scheduleNext();

    // Also run a 30s background check in case device was suspended/woken up
    const intervalId = setInterval(syncTheme, 30_000);

    return () => {
      if (timerId) clearTimeout(timerId);
      clearInterval(intervalId);
    };
  }, [override]);

  // Synchronize DOM attributes on documentElement for CSS styling
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.classList.remove("festival-janmashtami", "festival-dahi-handi");

    if (currentTheme === "janmashtami") {
      root.setAttribute("data-festival", "janmashtami");
      root.classList.add("festival-janmashtami");
    } else if (currentTheme === "dahi_handi") {
      root.setAttribute("data-festival", "dahi_handi");
      root.classList.add("festival-dahi-handi");
    } else {
      root.removeAttribute("data-festival");
    }
  }, [currentTheme]);

  const handleSetOverride = useCallback((newTheme: FestivalThemeId | null) => {
    setOverride(newTheme);
    if (typeof window !== "undefined") {
      try {
        if (newTheme) {
          window.localStorage?.setItem("campus_festival_theme", newTheme);
        } else {
          window.localStorage?.removeItem("campus_festival_theme");
        }
      } catch {
        // Storage error handling
      }
    }
  }, []);

  const value = useMemo<FestivalThemeContextType>(() => {
    const isJanmashtami = currentTheme === "janmashtami";
    const isDahiHandi = currentTheme === "dahi_handi";
    const isFestive = isJanmashtami || isDahiHandi;
    const config = getCampusThemeConfig(currentTheme);

    return {
      theme: currentTheme,
      isFestive,
      isJanmashtami,
      isDahiHandi,
      config,
      setOverrideTheme: handleSetOverride,
    };
  }, [currentTheme, handleSetOverride]);

  return (
    <FestivalThemeContext.Provider value={value}>
      {children}
    </FestivalThemeContext.Provider>
  );
}

export function useFestivalTheme(): FestivalThemeContextType {
  return useContext(FestivalThemeContext);
}
