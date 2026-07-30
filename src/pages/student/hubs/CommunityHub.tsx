/**
 * CommunityHub — tab root for campus life: events, announcements,
 * leaderboard, learning circles and support.
 */
import { HubGrid, type HubTile } from "@/components/shell/HubGrid";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import {
  CalendarHeart, Megaphone, Trophy, Users, LifeBuoy, Zap,
} from "lucide-react";

const TILES: HubTile[] = [
  { label: "Events",          description: "Campus events & registrations", href: "/app/events",        icon: CalendarHeart, tone: "primary" },
  { label: "Announcements",   description: "Important campus updates",      href: "/app/announcements", icon: Megaphone,     tone: "warning" },
  { label: "Leaderboard",     description: "Class & college rankings",      href: "/app/leaderboard",   icon: Trophy,        tone: "success" },
  { label: "Learning Circles",description: "Communities you've joined",     href: "/app/programmes",    icon: Users,         tone: "info" },
  { label: "Points",          description: "Rewards & activity balance",    href: "/app/points",        icon: Zap,           tone: "primary" },
  { label: "Help & Support",  description: "Reach the campus team",         href: "/app/support",       icon: LifeBuoy,      tone: "info" },
];

export default function CommunityHub() {
  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Community" subtitle="Campus life, together" gradient />
      <HubGrid tiles={TILES} />
    </PageContainer>
  );
}
