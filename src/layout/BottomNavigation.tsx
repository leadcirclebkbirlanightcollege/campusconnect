/**
 * BottomNavigation — production 5-tab app shell bar.
 * Tabs: Home · Academics · Community · E-Cell · Profile
 *
 * Each tab owns a family of routes so drilling into details keeps the
 * correct tab highlighted (Instagram / Google-Pay pattern). Tapping an
 * already-active tab returns to that tab's root screen.
 */

import { useLocation, useNavigate } from "react-router-dom";
import { Home, GraduationCap, Users, Rocket, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { STUDENT_TABS, resolveActiveTab, type StudentTab } from "@/ui-engine/navigation-engine";
import { SeasonalAccent, seasonalGradient, useSeasonal } from "@/components/seasonal/SeasonalKit";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  academics: GraduationCap,
  community: Users,
  ecell: Rocket,
  profile: UserRound,
};

export function BottomNavigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeId = resolveActiveTab(pathname)?.id;
  const { active: seasonal } = useSeasonal();

  const go = (tab: StudentTab) => {
    // Re-tapping the active tab pops back to the tab root (native behaviour)
    if (tab.id === activeId && pathname !== tab.href) navigate(tab.href);
    else if (pathname !== tab.href) navigate(tab.href);
  };

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
      <SeasonalAccent className="h-[2px]" />
      <div className="relative flex h-[62px] items-center justify-between px-2">
        {STUDENT_TABS.map((tab) => {
          const Icon = ICONS[tab.id] ?? Home;
          const active = tab.id === activeId;

          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => go(tab)}
              onMouseEnter={tab.prefetch}
              onTouchStart={tab.prefetch}
              whileTap={{ scale: 0.94 }}
              aria-current={active ? "page" : undefined}
              aria-label={tab.label}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "flex-1 min-w-0 min-h-[48px] px-1 gap-1",
                "rounded-2xl select-none outline-none",
                "transition-colors duration-150",
                active ? "text-primary" : "text-muted-foreground active:text-foreground",
              )}
            >
              <Icon
                className={cn("h-[22px] w-[22px]", active ? "stroke-[2.2px]" : "stroke-[1.75px]")}
              />
              <span
                className={cn(
                  "text-[10px] leading-none tracking-tight truncate max-w-full",
                  active ? "font-bold" : "font-semibold",
                )}
              >
                {tab.label}
              </span>
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className={cn("absolute top-0 h-1 w-6 rounded-full", !seasonal && "bg-primary")}
                  style={seasonal ? { background: seasonalGradient } : undefined}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
