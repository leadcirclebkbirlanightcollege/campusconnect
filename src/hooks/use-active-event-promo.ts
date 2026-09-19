import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

export interface ActiveEventPromo {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  event_date: string;
  event_time: string;
  promotional_image_url: string | null;
  promotional_duration_seconds: number;
  promotional_start_at: string | null;
  promotional_end_at: string | null;
  is_featured: boolean | null;
  is_ecell_event: boolean | null;
  imageUrl: string;
}

const DISMISSED_PREFIX = "cc_promo_seen_";

/**
 * Checks whether an event promotion is eligible to show based on:
 * 1. Promotional popup is enabled
 * 2. Has valid title and image
 * 3. Within configured promotional window
 */
export function isEventPromoEligible(
  event: any,
  now: Date = new Date()
): { eligible: boolean; imageUrl: string | null } {
  if (!event || !event.promotional_popup_enabled) {
    return { eligible: false, imageUrl: null };
  }

  if (!event.title || !event.title.trim()) {
    return { eligible: false, imageUrl: null };
  }

  // Resolve best available promotional image
  const rawImage =
    event.promotional_image_url ||
    event.full_flyer_url ||
    event.flyer_url ||
    event.poster_url;

  if (!rawImage || typeof rawImage !== "string" || !rawImage.trim()) {
    return { eligible: false, imageUrl: null };
  }

  const nowMs = now.getTime();

  // Check start window (if configured)
  if (event.promotional_start_at) {
    const startMs = new Date(event.promotional_start_at).getTime();
    if (!isNaN(startMs) && nowMs < startMs) {
      return { eligible: false, imageUrl: null };
    }
  }

  // Check end window (if configured)
  if (event.promotional_end_at) {
    const endMs = new Date(event.promotional_end_at).getTime();
    if (!isNaN(endMs) && nowMs > endMs) {
      return { eligible: false, imageUrl: null };
    }
  } else if (event.event_date) {
    // If no explicit promo end date, default to the end of the event date (23:59:59)
    const eventEndMs = new Date(`${event.event_date}T23:59:59`).getTime();
    if (!isNaN(eventEndMs) && nowMs > eventEndMs) {
      return { eligible: false, imageUrl: null };
    }
  }

  return { eligible: true, imageUrl: rawImage.trim() };
}

/**
 * Deterministically picks the single best promotion when multiple events are active:
 * 1. Nearest upcoming event_date
 * 2. Earlier promotion start date
 * 3. Stable tie-breaker by ID
 */
export function selectPriorityPromo(
  eligibleList: ActiveEventPromo[]
): ActiveEventPromo | null {
  if (!eligibleList || eligibleList.length === 0) return null;
  if (eligibleList.length === 1) return eligibleList[0];

  const sorted = [...eligibleList].sort((a, b) => {
    // 1. Prioritize nearest upcoming event date
    const dateA = a.event_date || "";
    const dateB = b.event_date || "";
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    // 2. Active promo start
    const startA = a.promotional_start_at || "";
    const startB = b.promotional_start_at || "";
    if (startA !== startB) {
      return startB.localeCompare(startA); // More recently started promotion first
    }

    // 3. Fallback to ID
    return a.id.localeCompare(b.id);
  });

  return sorted[0];
}

/**
 * Critical routes where promotional popups must NEVER interrupt the user.
 */
const SUPPRESSED_ROUTE_PREFIXES = [
  "/auth",
  "/onboarding",
  "/verify",
  "/start",
  "/reset-password",
  "/forgot-password",
];

export function useActiveEventPromo() {
  const location = useLocation();
  const { isLoading: authLoading } = useAuth();
  const [sessionDismissedIds, setSessionDismissedIds] = useState<Set<string>>(
    () => new Set()
  );

  // Check if current route is a critical auth/onboarding flow
  const isSuppressedRoute = useMemo(() => {
    const currentPath = location.pathname.toLowerCase();
    return SUPPRESSED_ROUTE_PREFIXES.some(
      (prefix) => currentPath === prefix || currentPath.startsWith(prefix + "/")
    );
  }, [location.pathname]);

  // Fetch candidate events that have promotional_popup_enabled = true
  const { data: rawEvents, isLoading: queryLoading, isError } = useQuery({
    queryKey: ["event-promo", "active"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select(
            "id,title,description,venue,event_date,event_time,poster_url,flyer_url,full_flyer_url,promotional_popup_enabled,promotional_image_url,promotional_duration_seconds,promotional_start_at,promotional_end_at,is_featured,is_ecell_event"
          )
          .eq("promotional_popup_enabled", true);

        if (error) {
          console.warn("Failed to query promotional events:", error);
          return [];
        }
        return data ?? [];
      } catch (err) {
        console.warn("Promotional event lookup error:", err);
        return [];
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Evaluate candidate events
  const selectedPromo = useMemo(() => {
    if (authLoading || isSuppressedRoute || !rawEvents || rawEvents.length === 0) {
      return null;
    }

    const now = new Date();
    const eligible: ActiveEventPromo[] = [];

    for (const event of rawEvents) {
      // Annoyance control: Skip if dismissed in session storage
      try {
        if (sessionStorage.getItem(DISMISSED_PREFIX + event.id) === "true") {
          continue;
        }
      } catch {
        // Safe fallback if sessionStorage is restricted
      }

      // Skip if dismissed in React state during current run
      if (sessionDismissedIds.has(event.id)) {
        continue;
      }

      // Skip if currently viewing this exact event detail page (/events/:id or /event/:id)
      const currentPath = location.pathname.toLowerCase();
      if (
        currentPath === `/events/${event.id}` ||
        currentPath === `/event/${event.id}`
      ) {
        continue;
      }

      const { eligible: isEligible, imageUrl } = isEventPromoEligible(event, now);
      if (isEligible && imageUrl) {
        eligible.push({
          id: event.id,
          title: event.title,
          description: event.description,
          venue: event.venue,
          event_date: event.event_date,
          event_time: event.event_time,
          promotional_image_url: event.promotional_image_url,
          promotional_duration_seconds: Math.min(
            9,
            Math.max(5, Number(event.promotional_duration_seconds) || 7)
          ),
          promotional_start_at: event.promotional_start_at,
          promotional_end_at: event.promotional_end_at,
          is_featured: event.is_featured,
          is_ecell_event: event.is_ecell_event,
          imageUrl,
        });
      }
    }

    return selectPriorityPromo(eligible);
  }, [
    authLoading,
    isSuppressedRoute,
    rawEvents,
    sessionDismissedIds,
    location.pathname,
  ]);

  const dismissPromo = useCallback((eventId: string) => {
    try {
      sessionStorage.setItem(DISMISSED_PREFIX + eventId, "true");
    } catch {
      // Safe fallback if sessionStorage is restricted
    }
    setSessionDismissedIds((prev) => new Set([...prev, eventId]));
  }, []);

  return {
    activePromo: selectedPromo,
    isLoading: queryLoading,
    isError,
    dismissPromo,
  };
}
