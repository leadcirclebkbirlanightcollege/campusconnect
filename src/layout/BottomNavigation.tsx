/**
 * BottomNavigation — futuristic fixed mobile bottom nav
 *
 * Tabs: Dashboard, Attendance, Lectures, Leaderboard, Profile
 * Active tab: gradient pill indicator + glow accent + icon scale
 *
 * Rules:
 *   height: 64px
 *   position: fixed bottom
 *   glass-surface background
 *   min tap target: 48px
 */

import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  BookOpen,
  Trophy,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NavTab {
  label:  string;
  href:   string;
  icon:   React.ComponentType<{ className?: string }>;
}

const TABS: NavTab[] = [
  { label: "Home",       href: "/app/dashboard",  icon: LayoutDashboard },
  { label: "Attendance", href: "/app/attendance",  icon: CalendarCheck   },
  { label: "Lectures",   href: "/app/lectures",    icon: BookOpen        },
  { label: "Ranks",      href: "/app/leaderboard", icon: Trophy          },
  { label: "Settings",   href: "/app/settings",    icon: Settings        },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
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
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-stretch justify-around px-1">
        {TABS.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);

          return (
            <Link
              key={href}
              to={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "gap-1 flex-1 min-h-[48px] px-1",
                "rounded-xl mx-0.5 my-1.5",
                "transition-all duration-[120ms] ease-[cubic-bezier(0,0,0.2,1)]",
                "select-none outline-none",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:bg-surface-3",
              )}
            >
              {/* Active background pill */}
              {active && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/15"
                  style={{
                    boxShadow: "0 0 16px -4px hsl(var(--primary)/0.25)",
                  }}
                  transition={{
                    type:      "spring",
                    stiffness: 380,
                    damping:   34,
                  }}
                />
              )}

              {/* Icon */}
              <motion.div
                animate={active ? { scale: 1.12 } : { scale: 1 }}
                transition={{ duration: 0.12, ease: [0, 0, 0.2, 1] }}
                className="relative z-10"
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-none",
                    active
                      ? "stroke-[2.2px]"
                      : "opacity-55 stroke-[1.8px]",
                  )}
                />
              </motion.div>

              {/* Label */}
              <span
                className={cn(
                  "relative z-10 text-[9.5px] font-semibold leading-none tracking-wide",
                  active
                    ? "text-primary"
                    : "text-muted-foreground/55",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
