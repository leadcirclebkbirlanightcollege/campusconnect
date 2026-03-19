/**
 * useFeatureGate — White-label feature control
 *
 * Returns whether a feature is enabled for the current user's college.
 * Super admins always have access to everything.
 *
 * Usage:
 *   const canSeeLeaderboard = useFeatureGate("leaderboard");
 *   if (!canSeeLeaderboard) return null;
 */

import { useTenant } from "@/providers/TenantProvider";

export const ALL_FEATURES = [
  "attendance",
  "lectures",
  "messages",
  "analytics",
  "leaderboard",
  "events",
  "announcements",
  "polls",
  "achievements",
  "daily_content",
  "challenges",
  "programmes",
] as const;

export type FeatureKey = typeof ALL_FEATURES[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  attendance:    "Attendance System",
  lectures:      "Lecture Management",
  messages:      "Collaboration Hub",
  analytics:     "Analytics & Reports",
  leaderboard:   "Leaderboard",
  events:        "Campus Events",
  announcements: "Announcements",
  polls:         "Polls & Surveys",
  achievements:  "Achievements",
  daily_content: "Daily Content",
  challenges:    "Engagement Challenges",
  programmes:    "Programmes",
};

export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  attendance:    "QR/OTP based attendance marking and reporting",
  lectures:      "Schedule, manage and track lectures",
  messages:      "Microsoft Teams-style class channels & DMs",
  analytics:     "Intelligence scores, charts, risk monitoring",
  leaderboard:   "Points-based student leaderboard",
  events:        "Campus event creation and discovery",
  announcements: "Broadcast messages to students & faculty",
  polls:         "Create and vote on institutional polls",
  achievements:  "Badge and achievement unlocking system",
  daily_content: "Daily motivational content feed",
  challenges:    "Gamification challenges for students",
  programmes:    "Learning programme management",
};

/**
 * Check if a single feature is enabled for the current tenant.
 */
export function useFeatureGate(feature: FeatureKey): boolean {
  const { college, isSuperAdmin, isLoading } = useTenant();

  // Super admins always see everything
  if (isSuperAdmin) return true;

  // While loading, optimistically allow (prevents flicker)
  if (isLoading) return true;

  // If no college data yet, allow
  if (!college) return true;

  const enabledFeatures = (college as any).enabled_features as string[] | null;

  // If the field doesn't exist yet (old data), allow all
  if (!enabledFeatures || !Array.isArray(enabledFeatures)) return true;

  return enabledFeatures.includes(feature);
}

/**
 * Returns all enabled features for the current college.
 */
export function useEnabledFeatures(): FeatureKey[] {
  const { college, isSuperAdmin, isLoading } = useTenant();

  if (isSuperAdmin || isLoading || !college) return [...ALL_FEATURES];

  const enabledFeatures = (college as any).enabled_features as string[] | null;
  if (!enabledFeatures || !Array.isArray(enabledFeatures)) return [...ALL_FEATURES];

  return ALL_FEATURES.filter(f => enabledFeatures.includes(f));
}
