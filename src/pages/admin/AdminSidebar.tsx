/**
 * AdminSidebar — left nav for /platform/admin/* routes.
 * Supports collapsible sections to reduce scroll fatigue.
 */
import { useState, useMemo, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useLogout } from "@/hooks/useLogout";
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, UserCheck, UserPlus,
  CheckSquare, BarChart3, FileEdit, Megaphone, CalendarDays, Sparkles,
  Bell, Trophy, Coins, ScanLine, SlidersHorizontal, LogOut, Moon, Sun,
  Building2, School, Hash, BarChart2, FileText, Download, ClipboardList, Store,
  ChevronDown, ShieldCheck, LifeBuoy, ArrowUpCircle,
} from "@/components/icons";
import { useTheme } from "@/hooks/use-theme";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { BRANDING } from "@/config/branding";
import { cn } from "@/lib/utils";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { ADMIN_NAV_SECTIONS } from "@/pages/admin/adminNavConfig";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, BookOpen, GraduationCap, UserCheck, UserPlus,
  CheckSquare, BarChart3, FileEdit, Megaphone, CalendarDays, Sparkles,
  Bell, Trophy, Coins, ScanLine, SlidersHorizontal, Building2, School,
  Hash, BarChart2, FileText, Download, ClipboardList, Store, ShieldCheck, LifeBuoy,
  ArrowUpCircle,
};

export default function AdminSidebar() {
  const location = useLocation();
  const logout = useLogout();
  const { setOpenMobile, state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { branding } = usePlatformBranding();
  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  const isActive = (url: string) =>
    currentPath === url || currentPath.startsWith(url + "/");

  // Per-section open/closed state. Default from config; auto-open if active.
  const initialOpen = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const s of ADMIN_NAV_SECTIONS) {
      const hasActive = s.items.some((i) => isActive(i.url.split("?")[0].split("#")[0]));
      map[s.label] = hasActive || s.defaultOpen !== false;
    }
    return map;
  }, []);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(initialOpen);

  // Auto-expand parent section whenever active route changes
  useEffect(() => {
    for (const s of ADMIN_NAV_SECTIONS) {
      const hasActive = s.items.some((i) => isActive(i.url.split("?")[0].split("#")[0]));
      if (hasActive) {
        setOpenMap((m) => ({ ...m, [s.label]: true }));
      }
    }
  }, [currentPath]);

  const toggleSection = (label: string) =>
    setOpenMap((m) => ({ ...m, [label]: !m[label] }));

  const handleNav = () => setOpenMobile(false);
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className={cn(
        "flex h-[56px] items-center border-b border-sidebar-border shrink-0 transition-colors",
        collapsed ? "justify-center px-2" : "px-3.5",
      )}>
        <Link
          to="/platform/admin/dashboard"
          onClick={handleNav}
          className={cn(
            "flex items-center gap-2.5 min-w-0 group/brand focus:outline-none",
            collapsed && "justify-center",
          )}
          title="Campus Connect — Admin Panel"
        >
          <img
            src={branding.logo_url || BRANDING.logo}
            alt="Campus Connect"
            onError={(e) => {
              e.currentTarget.src = BRANDING.logo;
            }}
            className="h-7 w-7 object-contain rounded-md shrink-0 shadow-xs group-hover/brand:scale-105 transition-transform duration-fast"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="text-[13px] font-bold text-sidebar-foreground block leading-tight tracking-tight truncate group-hover/brand:text-primary transition-colors">
                {branding.brand_name || "Campus Connect"}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-primary/85 leading-none block mt-0.5">
                Admin Panel
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <SidebarContent className="overflow-y-auto px-1.5 py-2 gap-0">
        {ADMIN_NAV_SECTIONS.map((section, idx) => {
          const isEcell = section.accent === "ecell";
          const isOpen = openMap[section.label] ?? true;
          const hasActiveChild = section.items.some((i) => isActive(i.url.split("?")[0].split("#")[0]));
          // When collapsed (icon mode), always render items
          const showItems = collapsed || isOpen;
          return (
            <SidebarGroup
              key={section.label}
              className={cn(
                "py-0.5",
                idx > 0 && "pt-0",
                isEcell && "mt-1.5 pt-2 border-t border-sidebar-border/60",
              )}
            >
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  className={cn(
                    "w-full flex items-center justify-between gap-1.5 px-3 py-1.5 group/sec",
                    "text-[10px] font-bold uppercase tracking-[0.12em]",
                    "transition-colors duration-fast rounded-md",
                    isEcell
                      ? "text-[hsl(265_85%_72%)] hover:text-[hsl(265_85%_82%)]"
                      : "text-muted-foreground/70 hover:text-foreground",
                  )}
                  aria-expanded={isOpen}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {isEcell && <span className="h-1.5 w-1.5 rounded-full bg-[hsl(265_85%_65%)] shadow-[0_0_8px_hsl(265_85%_65%/0.7)]" />}
                    {section.label}
                  </span>
                  <ChevronDown className={cn(
                    "h-3 w-3 opacity-50 transition-transform duration-fast",
                    !isOpen && "-rotate-90",
                  )} />
                </button>
              )}
              <SidebarGroupContent
                className={cn(
                  "overflow-hidden transition-all duration-200 ease-out",
                  showItems ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0",
                )}
              >
                <SidebarMenu className="gap-px">
                  {section.items.map((item) => {
                    const active = isActive(item.url.split("?")[0].split("#")[0]);
                    const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild isActive={active} tooltip={item.title}
                          className={cn(
                            "relative h-8 gap-2.5 rounded-md px-2.5 text-[13px] font-normal group/item transition-all duration-fast",
                            active
                              ? isEcell
                                ? "bg-[hsl(265_85%_65%/0.10)] text-[hsl(265_85%_78%)] font-medium"
                                : "bg-primary/8 text-primary font-medium"
                              : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          )}
                        >
                          <Link to={item.url} onClick={handleNav} className="flex items-center gap-2.5">
                            {active && !collapsed && (
                              <span className={cn(
                                "absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r-full",
                                isEcell ? "bg-[hsl(265_85%_65%)]" : "bg-primary",
                              )} />
                            )}
                            <Icon className={cn(
                              "h-3.5 w-3.5 shrink-0 transition-all duration-fast",
                              active
                                ? isEcell ? "text-[hsl(265_85%_75%)]" : "text-primary"
                                : isEcell
                                  ? "text-[hsl(265_85%_70%)]/70 group-hover/item:text-[hsl(265_85%_78%)]"
                                  : "text-muted-foreground/70 group-hover/item:text-foreground",
                            )} />
                            <span className="flex-1 leading-none">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
              {/* Active dot indicator when collapsed group + has active child */}
              {!collapsed && !isOpen && hasActiveChild && (
                <div className="mx-3 -mt-1 mb-1 h-0.5 rounded-full bg-primary/40" />
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border px-1.5 py-2">
        <SidebarMenu className="gap-px">
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} tooltip={theme === "dark" ? "Light Mode" : "Dark Mode"}
              className="h-8 gap-2.5 rounded-md px-2.5 text-[13px] font-normal text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all duration-fast">
              {theme === "dark" ? <Sun className="h-3.5 w-3.5 shrink-0 opacity-60" /> : <Moon className="h-3.5 w-3.5 shrink-0 opacity-60" />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} tooltip="Sign Out"
              className="h-8 gap-2.5 rounded-md px-2.5 text-[13px] font-normal text-muted-foreground hover:text-danger hover:bg-danger/8 transition-all duration-fast">
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
