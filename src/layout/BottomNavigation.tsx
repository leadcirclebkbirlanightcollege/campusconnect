/**
 * BottomNavigation — premium mobile bottom nav
 * 5 tabs: Home · Lectures · Timetable · Attendance · Profile
 */

import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  CheckSquare,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NavTab {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: string[];
}

const TABS: NavTab[] = [
  { label: "Home",       href: "/app/dashboard",   icon: LayoutDashboard, match: ["/app/dashboard"] },
  { label: "Lectures",   href: "/app/lectures",    icon: BookOpen,         match: ["/app/lectures", "/app/assignments"] },
  { label: "Timetable",  href: "/app/timetable",   icon: CalendarDays,     match: ["/app/timetable"] },
  { label: "Attendance", href: "/app/attendance",  icon: CheckSquare,      match: ["/app/attendance"] },
  { label: "Profile",    href: "/app/settings",    icon: UserRound,        match: ["/app/settings", "/app/profile", "/app/id-card"] },
];

const MotionLink = motion(Link);

function isActive(pathname: string, tab: NavTab): boolean {
  if (tab.match) return tab.match.some(m => pathname === m || pathname.startsWith(m + "/"));
  return pathname === tab.href || pathname.startsWith(tab.href + "/");
}

function prefetchRoute(path: string): void {
  if (path.includes("dashboard"))       void import("@/pages/student/StudentDashboard");
  else if (path.includes("lecture"))    void import("@/pages/student/lectures/LecturesList");
  else if (path.includes("timetable"))  void import("@/pages/student/StudentTimetable");
  else if (path.includes("attendance")) void import("@/pages/student/StudentAttendanceHistory");
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
      <div className="flex h-16 items-stretch justify-around px-1">
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
                "gap-1 flex-1 min-h-[48px] px-1",
                "rounded-xl mx-0.5 my-1.5",
                "transition-all duration-[120ms] ease-[cubic-bezier(0,0,0.2,1)]",
                "select-none outline-none",
                active ? "text-action-primary-foreground" : "text-control-muted active:bg-control-hover",
              )}
            >
              {/* Active background pill */}
              {active && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-xl bg-action-primary border border-action-primary"
                  style={{ boxShadow: "0 0 16px -4px hsl(var(--primary)/0.25)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                />
              )}

              {/* Icon */}
              <motion.div
                animate={active ? { scale: 1.12 } : { scale: 1 }}
                transition={{ duration: 0.12, ease: [0, 0, 0.2, 1] }}
                className="relative z-10"
              >
                <Icon className={cn(
                  "h-[22px] w-[22px] transition-none",
                  active ? "stroke-[2.2px]" : "text-control-muted stroke-[1.8px]",
                )} />
              </motion.div>

              {/* Label */}
              <span className={cn(
                "relative z-10 text-[9.5px] font-semibold leading-none tracking-wide",
                active ? "text-action-primary-foreground" : "text-control-muted",
              )}>
                {label}
              </span>
            </MotionLink>
          );
        })}
      </div>
    </nav>
  );
}
