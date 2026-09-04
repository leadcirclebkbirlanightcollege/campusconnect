import { HubGrid, type HubTile } from "@/components/shell/HubGrid";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import {
  CalendarHeart, Megaphone, Trophy, Users, LifeBuoy, Zap, Sparkles,
} from "@/components/icons";
import { useFestivalTheme } from "@/contexts/FestivalThemeContext";
import { FestiveBadge, FestiveIcon } from "@/components/festive/FestiveDecorations";

const TILES: HubTile[] = [
  { label: "Events",          description: "Campus events & registrations", href: "/app/events",        icon: CalendarHeart, tone: "primary" },
  { label: "Announcements",   description: "Important campus updates",      href: "/app/announcements", icon: Megaphone,     tone: "warning" },
  { label: "Leaderboard",     description: "Class & college rankings",      href: "/app/leaderboard",   icon: Trophy,        tone: "success" },
  { label: "Learning Circles",description: "Communities you've joined",     href: "/app/programmes",    icon: Users,         tone: "info" },
  { label: "Points",          description: "Rewards & activity balance",    href: "/app/points",        icon: Zap,           tone: "primary" },
  { label: "Help & Support",  description: "Reach the campus team",         href: "/app/support",       icon: LifeBuoy,      tone: "info" },
];

export default function CommunityHub() {
  const { isFestive, isDahiHandi, config } = useFestivalTheme();

  return (
    <PageContainer className="space-y-4">
      {isFestive && (
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-navy-deep via-navy-card to-navy-light text-white border border-amber-400/30 shadow-md">
          <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-400/15 blur-xl" />
          <div aria-hidden="true" className="pointer-events-none absolute right-1/3 -bottom-6 h-24 w-24 rounded-full bg-cyan-400/15 blur-lg" />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FestiveBadge label={`${config.name} on Campus`} />
                <span className="text-[11px] font-semibold text-amber-300">Special Edition</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-1">
                Celebrating {config.name} Together
              </h2>
              <p className="text-xs text-white/80 max-w-lg">
                {isDahiHandi
                  ? "Wishing the entire campus community high energy and joy this Dahi Handi! Explore club updates, student gatherings, and festive leaderboard standings."
                  : "Wishing the entire campus community a joyful Janmashtami! Explore club updates, student gatherings, and festive leaderboard standings."}
              </p>
            </div>
            <div className="hidden sm:flex shrink-0">
              <FestiveIcon size={36} />
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title="Community"
        subtitle={isFestive ? `${config.name} • Campus life, together` : "Campus life, together"}
        gradient
      />
      <HubGrid tiles={TILES} />
    </PageContainer>
  );
}
