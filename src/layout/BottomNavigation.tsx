/**
 * BottomNavigation — premium native 5-tab bar with a centered Scan FAB.
 * Tabs: Home · Inbox · Scan (elevated FAB) · Leaderboard · Profile
 *
 * Each tab owns a family of routes so drilling into details keeps the
 * correct tab highlighted (Instagram/Google-Pay pattern).
 */

import { Link, useLocation } from "react-router-dom";
import { Home, Inbox, Trophy, UserRound, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NavTab {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  match: string[];
  center?: boolean;
}

const TABS: NavTab[] = [
  {
    label: "Home",
    href: "/app/dashboard",
    icon: Home,
    match: [
      "/app/dashboard",
      "/app/lectures",
      "/app/timetable",
      "/app/attendance",
      "/app/assignments",
      "/app/documents",
      "/app/results",
      "/app/events",
      "/app/announcements",
      "/app/programmes",
      "/app/ecell",
      "/app/points",
    ],
  },
  {
    label: "Inbox",
    href: "/app/inbox",
    icon: Inbox,
    match: ["/app/inbox", "/app/notifications"],
  },
  {
    label: "Scan",
    href: "/app/scan",
    icon: QrCode,
    match: ["/app/scan"],
    center: true,
  },
  {
    label: "Ranks",
    href: "/app/leaderboard",
    icon: Trophy,
    match: ["/app/leaderboard"],
  },
  {
    label: "Profile",
    href: "/app/settings",
    icon: UserRound,
    match: ["/app/settings", "/app/profile", "/app/id-card", "/app/support", "/app/install"],
  },
];

const MotionLink = motion(Link);

function isActive(pathname: string, tab: NavTab): boolean {
  return tab.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

function prefetchRoute(path: string): void {
  if (path.includes("dashboard"))     void import("@/pages/student/StudentDashboard");
  else if (path.includes("inbox"))    void import("@/pages/student/StudentInbox");
  else if (path.includes("scan"))     void import("@/pages/student/StudentScanAttendance");
  else if (path.includes("leader"))   void import("@/pages/Leaderboard");
  else if (path.includes("settings")) void import("@/pages/student/StudentProfile");
}

export function BottomNavigation() {
  const { pathname } = useLocation();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-white/95 dark:bg-surface-1/95 backdrop-blur-xl",
        "border-t border-border-subtle/60",
        "shadow-[0_-8px_28px_-8px_rgba(15,23,42,0.10)]",
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
      aria-label="Main navigation"
    >
      <div className="relative flex h-[68px] items-end justify-between px-3 pb-2">
        {TABS.map((tab) => {
          const { label, href, icon: Icon, center } = tab;
          const active = isActive(pathname, tab);

          if (center) {
            return (
              <MotionLink
                key={href}
                to={href}
                onMouseEnter={() => prefetchRoute(href)}
                onTouchStart={() => prefetchRoute(href)}
                whileTap={{ scale: 0.9 }}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={cn(
                  "relative -mt-10 flex flex-col items-center justify-end",
                  "flex-1 min-w-0 select-none outline-none",
                )}
              >
                <span
                  className={cn(
                    "flex h-[62px] w-[62px] items-center justify-center rounded-full",
                    "bg-gradient-to-tr from-primary to-primary-glow text-primary-foreground",
                    "border-[5px] border-background",
                    "shadow-[0_12px_28px_-6px_hsl(var(--primary)/0.55),0_4px_12px_-4px_hsl(var(--primary)/0.35)]",
                    "transition-transform duration-150",
                  )}
                >
                  <Icon className="h-7 w-7 stroke-[2.25px]" />
                </span>
                <span
                  className={cn(
                    "mt-1.5 text-[10px] leading-none tracking-tight",
                    active ? "font-bold text-primary" : "font-semibold text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </MotionLink>
            );
          }

          return (
            <MotionLink
              key={href}
              to={href}
              onMouseEnter={() => prefetchRoute(href)}
              onTouchStart={() => prefetchRoute(href)}
              whileTap={{ scale: 0.94 }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "flex-1 min-w-0 min-h-[48px] px-1 gap-1",
                "rounded-2xl select-none outline-none",
                "transition-colors duration-150",
                active ? "text-primary" : "text-muted-foreground active:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-[22px] w-[22px]",
                  active ? "stroke-[2.2px]" : "stroke-[1.75px]",
                )}
              />
              <span
                className={cn(
                  "text-[10px] leading-none tracking-tight",
                  active ? "font-bold" : "font-semibold",
                )}
              >
                {label}
              </span>
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute -top-0.5 h-1 w-6 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </MotionLink>
          );
        })}
      </div>
    </nav>
  );
}
