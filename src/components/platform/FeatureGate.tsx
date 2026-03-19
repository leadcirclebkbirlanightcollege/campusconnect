/**
 * FeatureGate — Wrapper component that conditionally renders children
 * based on whether a feature is enabled for the current college.
 *
 * Usage:
 *   <FeatureGate feature="leaderboard">
 *     <LeaderboardPage />
 *   </FeatureGate>
 *
 *   With fallback:
 *   <FeatureGate feature="messages" fallback={<FeatureDisabledPage />}>
 *     <CollaborationHub />
 *   </FeatureGate>
 */

import type { ReactNode } from "react";
import { useFeatureGate, type FeatureKey, FEATURE_LABELS } from "@/hooks/use-feature-gate";
import { Lock } from "lucide-react";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  /** Custom fallback. Defaults to a clean "feature not available" screen. */
  fallback?: ReactNode;
  /** If true, renders nothing (instead of fallback UI) when feature is off */
  silent?: boolean;
}

function FeatureDisabledScreen({ feature }: { feature: FeatureKey }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        {FEATURE_LABELS[feature]} Unavailable
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        This feature hasn't been enabled for your institution. Contact your administrator for access.
      </p>
    </div>
  );
}

export default function FeatureGate({ feature, children, fallback, silent = false }: FeatureGateProps) {
  const isEnabled = useFeatureGate(feature);

  if (!isEnabled) {
    if (silent) return null;
    return fallback ? <>{fallback}</> : <FeatureDisabledScreen feature={feature} />;
  }

  return <>{children}</>;
}
