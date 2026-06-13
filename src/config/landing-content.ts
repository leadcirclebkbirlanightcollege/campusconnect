/**
 * Landing-page editable content schema + defaults.
 * Super-admin overrides live in platform_settings.key='landing_content' (JSONB).
 * The hook merges defaults so partial overrides are safe.
 */

export type LandingIconName =
  | "CalendarCheck" | "Trophy" | "UserRoundCheck" | "Sparkles" | "Target"
  | "Rocket" | "GraduationCap" | "Star" | "Zap" | "BookOpen" | "Award" | "Bell"
  | "Users" | "Megaphone" | "IdCard" | "MessageSquare" | "Lightbulb"
  | "BarChart3" | "ShieldCheck" | "Layers" | "Briefcase" | "CalendarDays" | "Network";

export const LANDING_ICONS: LandingIconName[] = [
  "CalendarCheck", "Trophy", "UserRoundCheck", "Sparkles", "Target",
  "Rocket", "GraduationCap", "Star", "Zap", "BookOpen", "Award", "Bell",
  "Users", "Megaphone", "IdCard", "MessageSquare", "Lightbulb",
  "BarChart3", "ShieldCheck", "Layers", "Briefcase", "CalendarDays", "Network",
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
  socialProof: { eyebrow: string; title: string; description: string; bullets: string[] };
  featuresHeading: { eyebrow: string; title: string };
  features: Array<{ icon: LandingIconName; label: string; description?: string }>;
  entrepreneurship: { eyebrow: string; title: string; description: string };
  adminSection: { eyebrow: string; title: string; features: string[] };
  testimonialsHeading: { eyebrow: string; title: string };
  testimonials: Array<{ name: string; role: string; quote: string; rating: number }>;
  feedbackSection: { eyebrow: string; title: string; description: string };
  finalCta: { eyebrow: string; title: string; description: string; primaryLabel: string; secondaryLabel: string };
  footerLinks: Array<{ label: string; href: string }>;
}

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  header: {
    ctaLabel: "Get Started",
    tagline: "Your entire college life, one app",
  },
  hero: {
    badge: "Built by Students. Designed for Every Campus.",
    titleLine1: "Your Entire College Life.",
    titleLine2: "One App.",
    subtitle: "Campus Connect brings attendance, lectures, events, notes, announcements, rewards, communities, digital ID, entrepreneurship activities and student opportunities together in one seamless platform.",
    primaryCtaLabel: "Get Started",
    secondaryCtaLabel: "Explore Features",
    imageUrl: null,
  },
  kpis: [
    { label: "Active Students", value: "1500+" },
    { label: "Daily Attendance Marked", value: "1000+" },
    { label: "Events & Activities", value: "100+" },
    { label: "Student Satisfaction", value: "4.9/5" },
  ],
  benefitsHeading: { eyebrow: "Why Students Love It", title: "Benefits That Actually Matter" },
  benefits: [
    { icon: "CalendarCheck", title: "Never Miss Attendance", description: "Get lecture reminders, attendance updates and academic alerts in real time.", stat: "Attendance Simplified" },
    { icon: "Trophy", title: "Earn Rewards For Participation", description: "Collect points through events, learning circles, challenges and campus activities.", stat: "Gamified Experience" },
    { icon: "Users", title: "Stay Connected", description: "Discover communities, clubs, announcements, discussions and opportunities across campus.", stat: "Student Network" },
  ],
  socialProof: {
    eyebrow: "Student Feedback",
    title: "Built Using Real Student Feedback",
    description: "Campus Connect has evolved through continuous feedback from students, faculty members, department heads, and institutional leaders. Every feature is designed to solve real challenges faced across campus life — from attendance tracking and communication to events, engagement, and opportunities.",
    bullets: [
      "Faster attendance access",
      "Better visibility for events and opportunities",
      "Unified announcements and updates",
      "Easier faculty–student communication",
      "Digital student identity",
      "Rewards and recognition systems",
      "Community-based learning experiences",
    ],
  },
  featuresHeading: { eyebrow: "Everything You Need", title: "One Platform. Every Campus Experience." },
  features: [
    { icon: "CalendarCheck", label: "Attendance Management", description: "Track attendance instantly." },
    { icon: "BookOpen", label: "Lecture Management", description: "Stay updated with schedules and live lectures." },
    { icon: "CalendarDays", label: "Timetable", description: "Access your academic schedule anytime." },
    { icon: "IdCard", label: "Digital Student ID", description: "Carry your college identity digitally." },
    { icon: "Megaphone", label: "Announcements", description: "Receive important updates instantly." },
    { icon: "Sparkles", label: "Events & Activities", description: "Participate in workshops, seminars and competitions." },
    { icon: "Network", label: "Learning Circles", description: "Join communities based on interests and academics." },
    { icon: "Trophy", label: "Points & Leaderboards", description: "Get rewarded for engagement." },
    { icon: "Lightbulb", label: "E-Cell Integration", description: "Participate in entrepreneurship activities and stall events." },
    { icon: "MessageSquare", label: "Messages & Notifications", description: "Never miss important communication." },
  ],
  entrepreneurship: {
    eyebrow: "Entrepreneurship Ecosystem",
    title: "Build. Compete. Grow.",
    description: "Campus Connect powers E-Cell activities through stall registrations, innovation challenges, rewards, entrepreneurship events and student-led initiatives.",
  },
  adminSection: {
    eyebrow: "For Institutions",
    title: "Powerful Controls For Colleges",
    features: [
      "Student Management",
      "Faculty Management",
      "Attendance Monitoring",
      "Department Management",
      "Timetable Control",
      "Reports & Analytics",
      "Security Controls",
      "Multi-College Architecture",
    ],
  },
  testimonialsHeading: { eyebrow: "Voices From Campus", title: "What People Say" },
  testimonials: [
    {
      name: "Dr. Bipinchandra Wadekar",
      role: "Principal, B. K. Birla Night Arts, Science & Commerce College",
      quote: "Campus Connect is a forward-looking initiative that bridges communication, engagement, and academic collaboration within our institution. It empowers students and faculty through a unified digital ecosystem, fostering a more connected and progressive campus culture.",
      rating: 5,
    },
    {
      name: "Dr. Rupesh Patil",
      role: "Head of Department, Computer Science",
      quote: "Campus Connect reflects the innovation-driven mindset we encourage in our students. By integrating technology with campus life, it enhances participation, streamlines information sharing, and creates meaningful opportunities for learning and collaboration.",
      rating: 5,
    },
    {
      name: "Avadhut G. Kashid",
      role: "Student, Department of Computer Science",
      quote: "Campus Connect has completely transformed the student experience on our campus. From staying informed about events and opportunities to connecting with peers and faculty, everything is now just a tap away. It's more than an app — it's a digital community that brings our entire campus together.",
      rating: 5,
    },
  ],
  feedbackSection: {
    eyebrow: "Community Driven",
    title: "Your Feedback Shapes Campus Connect",
    description: "Every major feature inside Campus Connect has evolved through suggestions from students, faculty members and administrators. We actively collect feedback and continuously improve the platform to match real campus needs.",
  },
  finalCta: {
    eyebrow: "Get Started",
    title: "Ready To Transform Your College Experience?",
    description: "Join the next generation of connected campuses with attendance, academics, engagement, communities and opportunities — all inside a single platform.",
    primaryLabel: "Explore Campus Connect",
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
    socialProof: {
      ...d.socialProof,
      ...(override.socialProof ?? {}),
      bullets: override.socialProof?.bullets?.length ? override.socialProof.bullets : d.socialProof.bullets,
    },
    featuresHeading: { ...d.featuresHeading, ...(override.featuresHeading ?? {}) },
    features: override.features?.length ? override.features : d.features,
    entrepreneurship: { ...d.entrepreneurship, ...(override.entrepreneurship ?? {}) },
    adminSection: {
      ...d.adminSection,
      ...(override.adminSection ?? {}),
      features: override.adminSection?.features?.length ? override.adminSection.features : d.adminSection.features,
    },
    testimonialsHeading: { ...d.testimonialsHeading, ...(override.testimonialsHeading ?? {}) },
    testimonials: override.testimonials?.length ? override.testimonials : d.testimonials,
    feedbackSection: { ...d.feedbackSection, ...(override.feedbackSection ?? {}) },
    finalCta: { ...d.finalCta, ...(override.finalCta ?? {}) },
    footerLinks: override.footerLinks?.length ? override.footerLinks : d.footerLinks,
  };
}
