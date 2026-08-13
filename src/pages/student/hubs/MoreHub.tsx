/**
 * MoreHub — premium feature explorer.
 *
 * Designed as a natural continuation of the dashboard: a curved module hero,
 * quick access row, searchable index and grouped "settings-style" cards
 * (Apple Settings / Notion / Linear Mobile feel) instead of a flat page.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, X, Sparkles, ChevronRight, LayoutGrid } from "lucide-react";
import {
  CalendarDays, ClipboardCheck, BookOpenCheck, FileText, GraduationCap,
  QrCode, Award, Calendar, Megaphone, Bell, Rocket, Store, Coins,
  Trophy, CreditCard, UserRound, Settings, LifeBuoy, Download,
} from "lucide-react";
import { PageContainer } from "@/layout/PageContainer";
import { ModuleHero } from "@/layout/ModuleHero";
import { cn } from "@/lib/utils";
import { useSeasonal } from "@/components/seasonal/SeasonalKit";

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
  caption: string;
  accent?: boolean;
  items: Feature[];
}

const GROUPS: Group[] = [
  {
    title: "Academics",
    caption: "Classes, attendance and coursework",
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
    caption: "What's happening around you",
    items: [
      { label: "Events", description: "What's happening on campus", href: "/app/events", icon: Calendar, tone: "info", keywords: "fest workshop" },
      { label: "Announcements", description: "Official notices", href: "/app/announcements", icon: Megaphone, tone: "warning", keywords: "notice circular" },
      { label: "Inbox", description: "Your notifications", href: "/app/inbox", icon: Bell, tone: "primary", keywords: "alerts notification" },
      { label: "Leaderboard", description: "Class & college rankings", href: "/app/leaderboard", icon: Trophy, tone: "warning", keywords: "rank top points" },
    ],
  },
  {
    title: "E-Cell",
    caption: "Startup & entrepreneurship",
    accent: true,
    items: [
      { label: "E-Cell Hub", description: "Startup ecosystem on campus", href: "/app/ecell", icon: Rocket, tone: "ecell", keywords: "entrepreneurship startup" },
      { label: "Stall Registration", description: "Apply to host a stall", href: "/app/ecell/stalls", icon: Store, tone: "ecell", keywords: "stall booth apply" },
      { label: "Points & Rewards", description: "Submit work, earn points", href: "/app/points", icon: Coins, tone: "ecell", keywords: "claim reward credits" },
    ],
  },
  {
    title: "Personal",
    caption: "Your identity, settings and support",
    items: [
      { label: "Digital ID", description: "Your campus identity card", href: "/app/id-card", icon: CreditCard, tone: "primary", keywords: "id card badge" },
      { label: "Profile", description: "Your details & academics", href: "/app/profile", icon: UserRound, tone: "primary", keywords: "account me" },
      { label: "Notification Settings", description: "Control what reaches you", href: "/app/settings/notifications", icon: Settings, tone: "info", keywords: "push preferences" },
      { label: "Install App", description: "Add Campus Connect to home", href: "/app/install", icon: Download, tone: "success", keywords: "pwa install apk" },
      { label: "Help & Support", description: "Raise a ticket, get answers", href: "/app/support", icon: LifeBuoy, tone: "warning", keywords: "ticket contact faq" },
    ],
  },
];

const QUICK: Feature[] = [
  GROUPS[0].items[3], // Scan
  GROUPS[0].items[2], // Attendance
  GROUPS[1].items[0], // Events
  GROUPS[3].items[0], // Digital ID
];

/** Compact settings-style row inside a grouped card. */
function FeatureRow({ f, last }: { f: Feature; last: boolean }) {
  const Icon = f.icon;
  return (
    <Link
      to={f.href}
      className={cn(
        "tap-ripple group flex items-center gap-3 px-3.5 py-3",
        "transition-colors duration-150 active:bg-foreground/[0.04] hover:bg-foreground/[0.03]",
        !last && "border-b border-border-subtle/60",
      )}
    >
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]", TONE[f.tone])}>
        <Icon className="h-[17px] w-[17px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-[13.5px] font-bold leading-tight text-foreground truncate">
          {f.label}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground truncate">
          {f.description}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-150 group-hover:translate-x-0.5" />
    </Link>
  );
}

function GroupCard({ g, index }: { g: Group; index: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.2) }}
      className="space-y-2"
    >
      <div className="flex items-baseline gap-2 px-1">
        {g.accent && (
          <span className="h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-[hsl(265_85%_65%)] shadow-[0_0_8px_hsl(265_85%_65%/0.7)]" />
        )}
        <h2
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.12em]",
            g.accent ? "text-[hsl(265_85%_68%)]" : "text-muted-foreground/70",
          )}
        >
          {g.title}
        </h2>
        <span className="truncate text-[10.5px] text-muted-foreground/50">{g.caption}</span>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-[20px] border border-border-subtle bg-surface-1",
          "shadow-[0_14px_36px_-28px_hsl(var(--foreground)/0.55)]",
        )}
      >
        {g.items.map((f, i) => (
          <FeatureRow key={f.href + f.label} f={f} last={i === g.items.length - 1} />
        ))}
      </div>
    </motion.section>
  );
}

export default function MoreHub() {
  const [query, setQuery] = useState("");
  const { active: seasonal } = useSeasonal();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return GROUPS.flatMap((g) => g.items).filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        (f.keywords ?? "").includes(q),
    );
  }, [query]);

  return (
    <PageContainer noPadding className="pb-24">
      <ModuleHero
        tone="brand"
        eyebrow={seasonal ? "Independence Day Edition 🇮🇳" : "Explore"}
        title={seasonal ? "Campus Connect" : "All Features"}
        subtitle={
          seasonal
            ? "Everything you need. One connected campus."
            : "Everything Campus Connect can do, in one place"
        }
        icon={LayoutGrid}
      >
        {/* Quick access */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {QUICK.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={"quick-" + f.href}
                to={f.href}
                className="tap-ripple flex flex-col items-center gap-1.5 rounded-[16px] bg-background/10 px-1.5 py-2.5 backdrop-blur-sm transition-transform active:scale-[0.96]"
              >
                <Icon className="h-[18px] w-[18px] text-primary-foreground" />
                <span className="w-full truncate text-center text-[10px] font-semibold text-primary-foreground/90">
                  {f.label}
                </span>
              </Link>
            );
          })}
        </div>
      </ModuleHero>

      <div className="space-y-4 px-4 pt-4">
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
              <p className="text-[13px] text-muted-foreground">No feature matches “{query}”.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[20px] border border-border-subtle bg-surface-1 shadow-[0_14px_36px_-28px_hsl(var(--foreground)/0.55)]">
              {results.map((f, i) => (
                <FeatureRow key={f.href + f.label} f={f} last={i === results.length - 1} />
              ))}
            </div>
          )
        ) : (
          GROUPS.map((g, i) => <GroupCard key={g.title} g={g} index={i} />)
        )}

        <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground/70">
          <Sparkles className="h-3 w-3 text-primary" />
          Everything in one place — nothing hidden in menus.
        </div>
      </div>
    </PageContainer>
  );
}
