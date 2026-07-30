/**
 * useSmartBack — intelligent back navigation.
 *
 * Pops in-app history when it exists (preserves scroll + query cache state),
 * otherwise navigates to the logical parent route so deep links, hard
 * refreshes and PWA cold starts never dead-end.
 */
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getBackFallback, TAB_ROOTS } from "@/ui-engine/navigation-engine";

export function useSmartBack() {
  const navigate = useNavigate();
  const location = useLocation();

  const canGoBack = !TAB_ROOTS.has(location.pathname);

  const goBack = useCallback(() => {
    const idx = (location.state as { idx?: number } | null)?.idx;
    const hasInAppHistory = typeof idx === "number" ? idx > 0 : window.history.length > 2;

    if (hasInAppHistory) navigate(-1);
    else navigate(getBackFallback(location.pathname), { replace: true });
  }, [navigate, location.pathname, location.state]);

  return { canGoBack, goBack };
}
