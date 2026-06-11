/**
 * Landing-page editable content schema + defaults.
 * Super-admin overrides live in platform_settings.key='landing_content' (JSONB).
 * The hook merges defaults so partial overrides are safe.
 */

export type LandingIconName =
  | "CalendarCheck" | "Trophy" | "UserRoundCheck" | "Sparkles" | "Target"
  | "Rocket" | "GraduationCap" | "Star" | "Zap" | "BookOpen" | "Award" | "Bell";

export const LANDING_ICONS: LandingIconName[] = [
  "CalendarCheck", "Trophy", "UserRoundCheck", "Sparkles", "Target",
  "Rocket", "GraduationCap", "Star", "Zap", "BookOpen", "Award", "Bell",
];

export interface LandingContent {
  header: { ctaLabel: string; tagline: string };
  hero: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
    imageUrl: string | null;
  };
  kpis: Array<{ label: string; value: string }>;
  benefitsHeading: { eyebrow: string; title: string };
  benefits: Array<{ icon: LandingIconName; title: string; description: string; stat: string }>;
  featuresHeading: { eyebrow: string; title: string };
  features: Array<{ icon: LandingIconName; label: string }>;
  testimonialsHeading: { eyebrow: string; title: string };
  testimonials: Array<{ name: string; role: string; quote: string; rating: number }>;
  finalCta: { eyebrow: string; title: string; description: string; primaryLabel: string; secondaryLabel: string };
  footerLinks: Array<{ label: string; href: string }>;
}

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  header: {
    ctaLabel: "Start as Student",
    tagline: "Student-first campus experience",
  },
  hero: {
    badge: "Built for student life, not admin complexity",
    titleLine1: "Your campus day,",
    titleLine2: "one smart app.",
    subtitle: "Attendance, lecture updates, achievements, and student progress—designed to keep you on track every single day.",
    primaryCtaLabel: "Start as Student",
    secondaryCtaLabel: "See student features",
    imageUrl: null,
  },
  kpis: [
    { label: "Active Students", value: "50K+" },
    { label: "Daily Attendance", value: "1M+" },
    { label: "Avg. Session", value: "11m" },
    { label: "App Satisfaction", value: "4.8/5" },
  ],
  benefitsHeading: { eyebrow: "Why Students Love It", title: "Benefits That Actually Matter" },
  benefits: [
    { icon: "CalendarCheck", title: "Never miss attendance", description: "Live lecture alerts and one-tap attendance so you stay marked and stress-free.", stat: "98% on-time check-ins" },
    { icon: "Trophy", title: "Stay ahead with streaks", description: "Earn points, unlock achievements, and climb your campus leaderboard every day.", stat: "+35% higher engagement" },
    { icon: "UserRoundCheck", title: "Everything in one student app", description: "Lectures, updates, digital ID, and progress insights in one smooth experience.", stat: "All daily tasks, one place" },
  ],
  featuresHeading: { eyebrow: "Student Features", title: "Built Around Your Daily Campus Flow" },
  features: [
    { icon: "Sparkles", label: "Personalized dashboard" },
    { icon: "CalendarCheck", label: "Live attendance status" },
    { icon: "Target", label: "Goal and streak tracking" },
    { icon: "Rocket", label: "Fast, mobile-first UX" },
    { icon: "Trophy", label: "Leaderboard motivation" },
    { icon: "UserRoundCheck", label: "Verified student profile" },
  ],
  testimonialsHeading: { eyebrow: "Testimonials", title: "What People Say" },
  testimonials: [
    { name: "Dr. Priya Sharma", role: "Principal, ABC Institute", quote: "Campus Connect transformed how we manage attendance and student engagement. Our efficiency improved by 40%.", rating: 5 },
    { name: "Prof. Rajesh Kumar", role: "HOD, XYZ College", quote: "The gamification features keep students motivated. We've seen a significant improvement in lecture attendance.", rating: 5 },
    { name: "Ananya Deshmukh", role: "Student, DEF University", quote: "I love the leaderboard and achievement system. It makes college life so much more engaging and competitive.", rating: 5 },
  ],
  finalCta: {
    eyebrow: "Get Started",
    title: "Join Campus Connect as a Student",
    description: "Sign in to track attendance, stay updated on lectures, and build your streak from day one.",
    primaryLabel: "Start as Student",
    secondaryLabel: "Need help?",
  },
  footerLinks: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Contact", href: "/contact" },
    { label: "Support", href: "/help" },
  ],
};

/** Deep-merge user overrides onto defaults (shallow per-section + array replace). */
export function mergeLandingContent(override: Partial<LandingContent> | null | undefined): LandingContent {
  if (!override || typeof override !== "object") return DEFAULT_LANDING_CONTENT;
  const d = DEFAULT_LANDING_CONTENT;
  return {
    header: { ...d.header, ...(override.header ?? {}) },
    hero: { ...d.hero, ...(override.hero ?? {}) },
    kpis: override.kpis?.length ? override.kpis : d.kpis,
    benefitsHeading: { ...d.benefitsHeading, ...(override.benefitsHeading ?? {}) },
    benefits: override.benefits?.length ? override.benefits : d.benefits,
    featuresHeading: { ...d.featuresHeading, ...(override.featuresHeading ?? {}) },
    features: override.features?.length ? override.features : d.features,
    testimonialsHeading: { ...d.testimonialsHeading, ...(override.testimonialsHeading ?? {}) },
    testimonials: override.testimonials?.length ? override.testimonials : d.testimonials,
    finalCta: { ...d.finalCta, ...(override.finalCta ?? {}) },
    footerLinks: override.footerLinks?.length ? override.footerLinks : d.footerLinks,
  };
}
