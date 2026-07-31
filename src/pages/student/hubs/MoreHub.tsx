/**
 * MoreHub — the complete feature directory for students.
 *
 * PhonePe / Google Pay style: a searchable, categorised grid of every
 * screen in the app. This is the single place a student can reach
 * anything, so the sidebar stays minimal (profile + settings only).
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, X, Sparkles } from "lucide-react";
import {
  CalendarDays, ClipboardCheck, BookOpenCheck, FileText, GraduationCap,
  QrCode, Award, Calendar, Megaphone, Bell, Rocket, Store, Coins,
  Trophy, CreditCard, UserRound, Settings, LifeBuoy, Download,
} from "lucide-react";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "info" | "danger" | "ecell";

const TONE: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  danger: "bg-danger/10 text-danger",
  ecell: "bg-[hsl(265_85%_65%/0.14)] text-[hsl(265_85%_68%)]",
};

interface Feature {
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  keywords?: string;
}

interface Group {
  title: string;
  accent?: boolean;
  items: Feature[];
}

const GROUPS: Group[] = [
  {
    title: "Academics",
    items: [
      { label: "Lectures", description: "Live & upcoming sessions", href: "/app/lectures", icon: GraduationCap, tone: "primary", keywords: "class session" },
      { label: "Timetable", description: "Your weekly schedule", href: "/app/timetable", icon: CalendarDays, tone: "info", keywords: "schedule routine" },
      { label: "Attendance", description: "History & percentage", href: "/app/attendance", icon: ClipboardCheck, tone: "success", keywords: "present absent" },
      { label: "Scan Attendance", description: "Mark yourself present", href: "/app/scan", icon: QrCode, tone: "primary", keywords: "qr code otp" },
      { label: "Assignments", description: "Tasks & submissions", href: "/app/assignments", icon: BookOpenCheck, tone: "warning", keywords: "homework submit" },
      { label: "Documents", description: "Notes & study material", href: "/app/documents", icon: FileText, tone: "info", keywords: "notes files pdf" },
      { label: "Results", description: "Exam performance", href: "/app/results", icon: Award, tone: "primary", keywords: "marks grades exam" },
      { label: "Learning Circles", description: "Enrolled programmes", href: "/app/programmes", icon: GraduationCap, tone: "success", keywords: "programme batch" },
    ],
  },
  {
    title: "Campus",
    items: [
      { label: "Events", description: "What's happening on campus", href: "/app/events", icon: Calendar, tone: "info", keywords: "fest workshop" },
      { label: "Announcements", description: "Official notices", href: "/app/announcements", icon: Megaphone, tone: "warning", keywords: "notice circular" },
      { label: "Inbox", description: "Your notifications", href: "/app/inbox", icon: Bell, tone: "primary", keywords: "alerts notification" },
    ],
  },
  {
    title: "E-Cell",
    accent: true,
    items: [
      { label: "E-Cell Hub", description: "Startup ecosystem on campus", href: "/app/ecell", icon: Rocket, tone: "ecell", keywords: "entrepreneurship startup" },
      { label: "Stall Registration", description: "Apply to host a stall", href: "/app/ecell/stalls", icon: Store, tone: "ecell", keywords: "stall booth apply" },
      { label: "Points & Rewards", description: "Submit work, earn points", href: "/app/points", icon: Coins, tone: "ecell", keywords: "claim reward credits" },
    ],
  },
  {
    title: "Engagement",
    items: [
      { label: "Leaderboard", description: "Class & college rankings", href: "/app/leaderboard", icon: Trophy, tone: "warning", keywords: "rank top points" },
      { label: "Digital ID", description: "Your campus identity card", href: "/app/id-card", icon: CreditCard, tone: "primary", keywords: "id card badge" },
    ],
  },
  {
    title: "Personal",
    items: [
      { label: "Profile", description: "Your details & academics", href: "/app/profile", icon: UserRound, tone: "primary", keywords: "account me" },
      { label: "Notification Settings", description: "Control what reaches you", href: "/app/settings/notifications", icon: Settings, tone: "info", keywords: "push preferences" },
      { label: "Install App", description: "Add Campus Connect to home", href: "/app/install", icon: Download, tone: "success", keywords: "pwa install apk" },
      { label: "Help & Support", description: "Raise a ticket, get answers", href: "/app/support", icon: LifeBuoy, tone: "warning", keywords: "ticket contact faq" },
    ],
  },
];

function FeatureTile({ f, index }: { f: Feature; index: number }) {
  const Icon = f.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.015, 0.18) }}
    >
      <Link
        to={f.href}
        className={cn(
          "tap-ripple group flex h-full flex-col gap-2 overflow-hidden rounded-[20px]",
          "border border-border-subtle bg-surface-1 p-3.5",
          "shadow-[0_10px_30px_-24px_hsl(var(--foreground)/0.5)]",
          "transition-all duration-150 hover:border-primary/35 active:scale-[0.97]",
        )}
      >
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", TONE[f.tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-[13.5px] font-bold leading-tight text-foreground truncate">
            {f.label}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
            {f.description}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

export default function MoreHub() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const all = GROUPS.flatMap((g) => g.items);
    return all.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        (f.keywords ?? "").includes(q),
    );
  }, [query]);

  return (
    <PageContainer className="space-y-4 pb-24">
      <PageHeader title="All Features" subtitle="Everything Campus Connect can do" gradient />

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search features…"
          className={cn(
            "h-11 w-full rounded-[16px] border border-border-subtle bg-surface-1 pl-10 pr-10",
            "text-[13.5px] text-foreground placeholder:text-muted-foreground/70",
            "outline-none transition-colors focus:border-primary/40",
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {results ? (
        results.length === 0 ? (
          <div className="rounded-[20px] border border-border-subtle bg-surface-1 p-8 text-center">
            <p className="text-[13px] text-muted-foreground">
              No feature matches “{query}”.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {results.map((f, i) => (
              <FeatureTile key={f.href + f.label} f={f} index={i} />
            ))}
          </div>
        )
      ) : (
        GROUPS.map((g) => (
          <section key={g.title} className="space-y-2.5">
            <div className="flex items-center gap-1.5 px-0.5">
              {g.accent && (
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(265_85%_65%)] shadow-[0_0_8px_hsl(265_85%_65%/0.7)]" />
              )}
              <h2
                className={cn(
                  "text-[11px] font-bold uppercase tracking-[0.12em]",
                  g.accent ? "text-[hsl(265_85%_68%)]" : "text-muted-foreground/70",
                )}
              >
                {g.title}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {g.items.map((f, i) => (
                <FeatureTile key={f.href + f.label} f={f} index={i} />
              ))}
            </div>
          </section>
        ))
      )}

      <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-muted-foreground/70">
        <Sparkles className="h-3 w-3 text-primary" />
        Everything in one place — nothing hidden in menus.
      </div>
    </PageContainer>
  );
}
