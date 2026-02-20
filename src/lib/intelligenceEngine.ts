/**
 * Campus Connect Intelligence Engine
 * Types and display config only — all scoring is server-side.
 * No client-side metric math allowed.
 */

export type IntelligenceScores = {
  attendanceConsistency: number;
  behaviourReliability: number;
  engagementIndex: number;
  tier: "bronze" | "silver" | "gold" | "elite";
  riskFlags: string[];
};

/**
 * Tier display config
 */
export const TIER_CONFIG = {
  bronze: { label: "Bronze", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  silver: { label: "Silver", color: "text-slate-300", bg: "bg-slate-400/10", border: "border-slate-400/30" },
  gold: { label: "Gold", color: "text-premium", bg: "bg-premium/10", border: "border-premium/30" },
  elite: { label: "Elite", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
} as const;
