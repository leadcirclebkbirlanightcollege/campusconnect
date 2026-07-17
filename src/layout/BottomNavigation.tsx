/**
 * BottomNavigation — native-app 5-tab bar
 * Tabs: Home · Academics · Campus · E-Cell · Profile
 *
 * Each tab owns a *family* of routes so the user never feels like they
 * leave the tab when drilling into details.
 */

import { Link, useLocation } from "react-router-dom";
import {
  Home,
  GraduationCap,
  Sparkles,
  Rocket,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NavTab {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Route prefixes that keep this tab highlighted */
  match: string[];
}

/**
 * Tab families:
 *  - Home      → Dashboard + Inbox
 *  - Academics → Lectures, Timetable, Attendance, Assignments, Documents, Results
 *  - Campus    → Events, Announcements, Programmes (learning circles)
 *  - E-Cell    → E-Cell hub, Points, Leaderboard, Stalls
 *  - Profile   → Settings, Digital ID, Support, Notifications
 */
const TABS: NavTab[] = [
  {
    label: "Home",
    href: "/app/dashboard",
    icon: Home,
    match: ["/app/dashboard", "/app/inbox"],
  },
  {
    label: "Academics",
    href: "/app/lectures",
    icon: GraduationCap,
    match: [
      "/app/lectures",
      "/app/timetable",
      "/app/attendance",
      "/app/assignments",
      "/app/documents",
      "/app/results",
      "/app/scan",
    ],
  },
  {
    label: "Campus",
    href: "/app/events",
    icon: Sparkles,
    match: ["/app/events", "/app/announcements", "/app/programmes"],
  },
  {
    label: "E-Cell",
    href: "/app/ecell",
    icon: Rocket,
    match: ["/app/ecell", "/app/points", "/app/leaderboard"],
  },
  {
    label: "Profile",
    href: "/app/settings",
    icon: UserRound,
    match: [
      "/app/settings",
      "/app/profile",
      "/app/id-card",
      "/app/notifications",
      "/app/support",
      "/app/install",
    ],
  },
];

const MotionLink = motion(Link);

function isActive(pathname: string, tab: NavTab): boolean {
  return tab.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

function prefetchRoute(path: string): void {
  if (path.includes("dashboard"))       void import("@/pages/student/StudentDashboard");
  else if (path.includes("lectures"))   void import("@/pages/student/lectures/LecturesList");
  else if (path.includes("events"))     void import("@/pages/student/events/StudentEventsList");
  else if (path.includes("ecell"))      void import("@/pages/student/ecell/StudentEcellHub");
  else if (path.includes("settings"))   void import("@/pages/student/StudentProfile");
}

export function BottomNavigation() {
  const { pathname } = useLocation();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "glass-surface",
        "border-t border-border-subtle/60",
        "shadow-[0_-8px_32px_-8px_hsl(var(--bg-base)/0.60)]",
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft:   "env(safe-area-inset-left, 0px)",
        paddingRight:  "env(safe-area-inset-right, 0px)",
      }}
      aria-label="Main navigation"
    >
      <div className="flex h-[60px] items-stretch justify-around px-1.5">
        {TABS.map((tab) => {
          const { label, href, icon: Icon } = tab;
          const active = isActive(pathname, tab);

          return (
            <MotionLink
              key={href}
              to={href}
              onMouseEnter={() => prefetchRoute(href)}
              onTouchStart={() => prefetchRoute(href)}
              whileTap={{ scale: 0.94 }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "tap-ripple relative flex flex-col items-center justify-center",
                "gap-[3px] flex-1 min-h-[48px] px-1 pt-2",
                "rounded-xl mx-0.5",
                "transition-colors duration-[160ms] ease-[cubic-bezier(0,0,0.2,1)]",
                "select-none outline-none",
                active ? "text-primary" : "text-control-muted active:text-foreground",
              )}
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute top-0 h-[3px] w-8 rounded-full bg-primary"
                  style={{ boxShadow: "0 0 12px hsl(var(--primary)/0.55)" }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}

              <Icon
                className={cn(
                  "h-[22px] w-[22px]",
                  active ? "stroke-[2.15px]" : "stroke-[1.75px]",
                )}
              />

              <span
                className={cn(
                  "text-[10.5px] leading-none tracking-tight",
                  active ? "font-semibold" : "font-medium",
                )}
              >
                {label}
              </span>
            </MotionLink>
          );
        })}
      </div>
    </nav>
  );
}
