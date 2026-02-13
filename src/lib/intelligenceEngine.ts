/**
 * Campus Connect Intelligence Engine
 * Calculates: Attendance Consistency, Behaviour Reliability, Engagement Index
 * All scores are 0–100.
 */

export type IntelligenceScores = {
  attendanceConsistency: number;
  behaviourReliability: number;
  engagementIndex: number;
  tier: "bronze" | "silver" | "gold" | "elite";
  riskFlags: string[];
};

/**
 * Attendance Consistency Score (0–100)
 * Based on last N lectures. Consecutive absences get extra penalty.
 */
export function calcAttendanceConsistency(
  attendedLectureIds: string[],
  allLectureIds: string[],
  recentLimit = 10,
): number {
  if (allLectureIds.length === 0) return 100;

  const recent = allLectureIds.slice(-recentLimit);
  const attendedSet = new Set(attendedLectureIds);

  let score = 0;
  let consecutiveAbsences = 0;
  let penalty = 0;

  for (const lid of recent) {
    if (attendedSet.has(lid)) {
      score += 1;
      consecutiveAbsences = 0;
    } else {
      consecutiveAbsences += 1;
      // Increasing penalty for consecutive absences
      penalty += consecutiveAbsences * 2;
    }
  }

  const basePct = recent.length > 0 ? (score / recent.length) * 100 : 100;
  return Math.max(0, Math.min(100, Math.round(basePct - penalty)));
}

/**
 * Behaviour Reliability Score (0–100)
 * Factors: manual overrides, penalty deductions, attendance regularity
 */
export function calcBehaviourReliability(params: {
  totalAttendance: number;
  totalLectures: number;
  manualOverrides: number;
  penaltyDeductions: number;
}): number {
  const { totalAttendance, totalLectures, manualOverrides, penaltyDeductions } = params;

  // Base from attendance ratio
  const attendanceRatio = totalLectures > 0 ? totalAttendance / totalLectures : 1;
  let score = attendanceRatio * 70; // 70% weight

  // Manual overrides reduce reliability (max -15)
  score -= Math.min(15, manualOverrides * 5);

  // Penalty deductions reduce reliability (max -15)
  score -= Math.min(15, penaltyDeductions * 3);

  // Baseline bonus for active participation
  score += 30 * attendanceRatio;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Engagement Index (0–100)
 * Combines: attendance %, points, poll votes, programme membership
 */
export function calcEngagementIndex(params: {
  attendancePct: number;
  totalPoints: number;
  pollVotes: number;
  programmesJoined: number;
}): number {
  const { attendancePct, totalPoints, pollVotes, programmesJoined } = params;

  // Weighted combination
  const attendanceScore = attendancePct * 0.4; // 40%
  const pointsScore = Math.min(30, (totalPoints / 100) * 30); // 30% (cap at 100 points)
  const pollScore = Math.min(15, pollVotes * 5); // 15% (cap at 3 votes)
  const programmeScore = Math.min(15, programmesJoined * 7.5); // 15% (cap at 2)

  return Math.max(0, Math.min(100, Math.round(attendanceScore + pointsScore + pollScore + programmeScore)));
}

/**
 * Determine tier from average of all three scores
 */
export function determineTier(scores: {
  attendanceConsistency: number;
  behaviourReliability: number;
  engagementIndex: number;
}): "bronze" | "silver" | "gold" | "elite" {
  const avg = (scores.attendanceConsistency + scores.behaviourReliability + scores.engagementIndex) / 3;
  if (avg >= 85) return "elite";
  if (avg >= 70) return "gold";
  if (avg >= 50) return "silver";
  return "bronze";
}

/**
 * Detect risk flags
 */
export function detectRiskFlags(params: {
  attendancePct: number;
  attendanceConsistency: number;
  behaviourReliability: number;
  consecutiveAbsences: number;
  attendanceThreshold?: number;
}): string[] {
  const flags: string[] = [];
  const threshold = params.attendanceThreshold ?? 50;

  if (params.attendancePct < threshold) {
    flags.push("Low attendance");
  }
  if (params.behaviourReliability < 50) {
    flags.push("Low reliability");
  }
  if (params.consecutiveAbsences >= 3) {
    flags.push(`${params.consecutiveAbsences} consecutive absences`);
  }
  if (params.attendanceConsistency < 40) {
    flags.push("Declining attendance trend");
  }

  return flags;
}

/**
 * Tier display config
 */
export const TIER_CONFIG = {
  bronze: { label: "Bronze", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  silver: { label: "Silver", color: "text-slate-300", bg: "bg-slate-400/10", border: "border-slate-400/30" },
  gold: { label: "Gold", color: "text-premium", bg: "bg-premium/10", border: "border-premium/30" },
  elite: { label: "Elite", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
} as const;
