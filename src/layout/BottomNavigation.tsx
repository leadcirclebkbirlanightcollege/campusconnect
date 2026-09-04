/**
 * BottomNavigation — production 5-tab app shell bar.
 * Tabs: Home · Academics · Community · E-Cell · Profile
 *
 * Each tab owns a family of routes so drilling into details keeps the
 * correct tab highlighted (Instagram / Google-Pay pattern). Tapping an
 * already-active tab returns to that tab's root screen.
 */

import { useLocation, useNavigate } from "react-router-dom";
import { AppIcon, type SemanticIconName } from "@/components/icons";
import { Rocket01Icon, Rocket02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { STUDENT_TABS, resolveActiveTab, type StudentTab } from "@/ui-engine/navigation-engine";
import { useFestivalTheme } from "@/contexts/FestivalThemeContext";

const TAB_ICON_MAP: Record<string, { semantic?: SemanticIconName; iconInactive?: any; iconActive?: any }> = {
  home: { semantic: "home" },
  academics: { semantic: "lectures" },
  community: { semantic: "participants" },
  ecell: { iconInactive: Rocket01Icon, iconActive: Rocket02Icon },
  profile: { semantic: "profile" },
};

export function BottomNavigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeId = resolveActiveTab(pathname)?.id;
  const { isFestive, isDahiHandi } = useFestivalTheme();

  const go = (tab: StudentTab) => {
    // Re-tapping the active tab pops back to the tab root (native behaviour)
    if (tab.id === activeId && pathname !== tab.href) navigate(tab.href);
    else if (pathname !== tab.href) navigate(tab.href);
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-surface-1/95 backdrop-blur-lg",
        "border-t border-border-subtle",
        "shadow-[0_-2px_10px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.35)]",
        isFestive && "border-t-amber-400/20"
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
      aria-label="Main navigation"
    >
      <div className="relative flex h-[60px] items-center justify-between px-2.5">
        {STUDENT_TABS.map((tab) => {
          const cfg = TAB_ICON_MAP[tab.id];
          const active = tab.id === activeId;

          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => go(tab)}
              onMouseEnter={tab.prefetch}
              onTouchStart={tab.prefetch}
              whileTap={{ scale: 0.92 }}
              aria-current={active ? "page" : undefined}
              aria-label={tab.label}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "flex-1 min-w-0 min-h-[50px] px-1 py-1.5 gap-1",
                "rounded-xl select-none outline-none",
                "transition-all duration-150",
                active
                  ? (isFestive ? (isDahiHandi ? "text-amber-500 dark:text-amber-400" : "text-sky-600 dark:text-sky-400") : "text-primary")
                  : "text-muted-foreground hover:text-foreground active:text-foreground",
              )}
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-indicator-pill"
                  className={cn(
                    "absolute inset-x-1.5 inset-y-1 rounded-xl -z-10",
                    isFestive
                      ? (isDahiHandi
                          ? "festival-active-tab border border-amber-400/35 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                          : "festival-active-tab border border-sky-400/30 shadow-[0_0_12px_rgba(14,165,233,0.12)]")
                      : "bg-primary/10 dark:bg-primary/15 border border-primary/20"
                  )}
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}

              {cfg?.semantic ? (
                <AppIcon
                  name={cfg.semantic}
                  active={active}
                  size={20}
                  strokeWidth={active ? 2.2 : 1.6}
                  className={cn(
                    "transition-transform duration-150",
                    active && "scale-105"
                  )}
                />
              ) : (
                <AppIcon
                  icon={active ? cfg?.iconActive : cfg?.iconInactive}
                  active={active}
                  size={20}
                  strokeWidth={active ? 2.2 : 1.6}
                  className={cn(
                    "transition-transform duration-150",
                    active && "scale-105"
                  )}
                />
              )}
              <span
                className={cn(
                  "text-[10.5px] leading-none tracking-tight truncate max-w-full font-medium",
                  active
                    ? (isFestive
                        ? (isDahiHandi ? "font-bold text-amber-600 dark:text-amber-400" : "font-bold text-sky-600 dark:text-sky-400")
                        : "font-bold text-primary")
                    : "text-muted-foreground",
                )}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
