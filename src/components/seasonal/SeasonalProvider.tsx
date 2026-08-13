/**
 * SeasonalProvider — toggles the global seasonal CSS layer.
 *
 * Sets `data-season="independence"` on <html> while the campaign window in
 * `src/config/seasonal.ts` is active, and removes it automatically afterwards.
 * All global seasonal styling in index.css hangs off that single attribute.
 */

import { useEffect } from "react";
import { SEASON_ATTRIBUTE, SEASON_ID, isIndependenceDayActive } from "@/config/seasonal";

const RECHECK_MS = 30 * 60 * 1000; // 30 min — catches midnight rollover

export default function SeasonalProvider() {
  useEffect(() => {
    const apply = () => {
      const root = document.documentElement;
      if (isIndependenceDayActive()) root.setAttribute(SEASON_ATTRIBUTE, SEASON_ID);
      else root.removeAttribute(SEASON_ATTRIBUTE);
    };

    apply();
    const id = window.setInterval(apply, RECHECK_MS);
    const onFocus = () => apply();
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.documentElement.removeAttribute(SEASON_ATTRIBUTE);
    };
  }, []);

  return null;
}
