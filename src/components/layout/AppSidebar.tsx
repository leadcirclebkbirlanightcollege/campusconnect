import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  CalendarDays,
  Trophy,
  UserRound,
  Shield,
  LogOut,
  BookOpen,
  Bell,
  CreditCard,
  Megaphone,
  BarChart3,
  Sparkles,
  Calendar,
  Moon,
  Sun,
  Flame,
  Settings,
  MessageSquare,
  Rocket,
  Store,
  Coins,
  ChevronDown,
  LayoutGrid,
  LifeBuoy,
} from "@/components/icons";

import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";
import { useTheme } from "@/hooks/use-theme";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { BRANDING } from "@/config/branding";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Role = "admin" | "student" | null;

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  accent?: string;
}

interface NavSection {
  label: string;
  /** Visual variant: "ecell" gives a purple accent identity */
  accent?: "ecell";
  items: NavItem[];
}

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile, state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { branding } = usePlatformBranding();
  const collapsed = state === "collapsed";

  const authQuery = useQuery({
    queryKey: ["app_sidebar", "auth"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user ?? null;
    },
    staleTime: 120_000,
  });

  const roleQuery = useQuery({
    queryKey: ["app_sidebar", "role", authQuery.data?.id],
    enabled: Boolean(authQuery.data?.id),
    queryFn: async () => {
      const uid = authQuery.data!.id;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data?.role as Role) ?? null;
    },
  });

  const unreadQuery = useQuery({
    queryKey: ["app_sidebar", "unread", authQuery.data?.id],
    enabled: Boolean(authQuery.data?.id),
    queryFn: async () => {
      const uid = authQuery.data!.id;
      const { count, error } = await supabase
        .from("notification_recipients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .is("read_at", null);
      if (error) return 0;
      return count ?? 0;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const currentPath = location.pathname;
  const isAdmin = roleQuery.data === "admin";
  const unreadCount = unreadQuery.data ?? 0;

  const sections: NavSection[] = useMemo(
    () => [
      {
        label: "Main",
        items: [
          { title: "Dashboard",    url: "/app/dashboard", icon: LayoutDashboard },
          { title: "All Features", url: "/app/more",      icon: LayoutGrid },
          { title: "Inbox",        url: "/app/inbox",     icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
        ],
      },
      {
        label: "Personal",
        items: [
          { title: "Profile",       url: "/app/profile",                icon: UserRound },
          { title: "Notifications", url: "/app/settings/notifications", icon: Settings },
          { title: "Digital ID",    url: "/app/id-card",                icon: CreditCard },
          { title: "Help & Support", url: "/app/support",               icon: LifeBuoy },
        ],
      },
    ],
    [unreadCount],

  );

  const adminSection: NavSection = useMemo(
    () => ({
      label: "Admin",
      items: [
        { title: "Command Center", url: "/platform/admin/dashboard", icon: Shield, accent: "text-warning" },
      ],
    }),
    [],
  );

  const isActive = (url: string) =>
    currentPath === url || currentPath.startsWith(url + "/");

  const handleNav = () => setOpenMobile(false);

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const renderSection = (section: NavSection, idx: number) => {
    const isEcell = section.accent === "ecell";
    return (
      <SidebarGroup
        key={section.label}
        className={cn(
          "py-0.5",
          idx > 0 && "pt-0",
          isEcell && "mt-1.5 pt-2 border-t border-sidebar-border/60",
        )}
      >
        <SidebarGroupLabel className={cn(
          "text-[10px] font-bold uppercase tracking-[0.10em] px-3 py-2 h-auto",
          isEcell ? "text-[hsl(265_85%_70%)]" : "text-muted-foreground/50",
          collapsed && "opacity-0 pointer-events-none",
        )}>
          <span className="inline-flex items-center gap-1.5">
            {isEcell && <span className="h-1.5 w-1.5 rounded-full bg-[hsl(265_85%_65%)] shadow-[0_0_8px_hsl(265_85%_65%/0.7)]" />}
            {section.label}
          </span>
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-px">
            {section.items.map((item) => {
              const active = isActive(item.url);
              const Icon = item.icon;
              const badgeCount = item.badge ?? (item.url === "/app/inbox" ? unreadCount : 0);

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={item.title}
                    className={cn(
                      "h-8 gap-2.5 rounded-md px-2.5 text-[13px] font-normal group/item",
                      "transition-all duration-fast",
                      active
                        ? isEcell
                          ? "bg-[hsl(265_85%_65%/0.12)] text-[hsl(265_85%_75%)] font-medium shadow-[inset_0_0_0_1px_hsl(265_85%_65%/0.25)]"
                          : "bg-primary/10 text-primary font-medium shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)]"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2.5"
                      activeClassName=""
                      end={item.url === "/app/dashboard"}
                      onClick={handleNav}
                    >
                      <Icon className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-all duration-fast",
                        active
                          ? isEcell ? "text-[hsl(265_85%_72%)]" : "text-primary"
                          : isEcell
                            ? "text-[hsl(265_85%_70%)]/70 group-hover/item:text-[hsl(265_85%_75%)]"
                            : "text-muted-foreground/60 group-hover/item:text-foreground/80",
                      )} />
                      <span className="flex-1 leading-none">{item.title}</span>
                      {badgeCount > 0 && (
                        <span className={cn(
                          "ml-auto flex h-4 min-w-4 items-center justify-center rounded-full",
                          isEcell ? "bg-[hsl(265_85%_65%)]" : "bg-primary",
                          "text-primary-foreground px-1 text-[9px] font-bold leading-none animate-scale-in",
                        )}>
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-r border-sidebar-border bg-sidebar"
    >
      {/* ── Brand Lockup ─────────────────────────────────────────── */}
      <div className={cn(
        "relative flex h-[52px] items-center gap-2.5 border-b border-sidebar-border shrink-0",
        collapsed ? "justify-center px-2" : "px-3.5",
      )}>
        <img
          src={branding.logo_url ?? BRANDING.logo}
          alt={branding.brand_name}
          className={cn("object-contain rounded shrink-0", collapsed ? "h-7 w-7" : "h-7 w-7")}
        />

        {!collapsed && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <span className="text-[13px] font-bold text-sidebar-foreground block leading-tight tracking-tight truncate">
              {branding.brand_name}
            </span>
            <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50 leading-none">
              {branding.tagline}
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <SidebarContent className="overflow-y-auto px-1.5 py-2 gap-0">
        {sections.map((s, i) => renderSection(s, i))}

        {isAdmin && (
          <>
            <div className="mx-3 my-1.5 h-px bg-sidebar-border" />
            {renderSection(adminSection, sections.length)}
          </>
        )}
      </SidebarContent>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <SidebarFooter className="border-t border-sidebar-border px-1.5 py-2">
        <SidebarMenu className="gap-px">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              tooltip={theme === "dark" ? "Light Mode" : "Dark Mode"}
              className={cn(
                "h-8 gap-2.5 rounded-md px-2.5 text-[13px] font-normal",
                "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                "transition-all duration-fast",
              )}
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5 shrink-0 opacity-60" />
              ) : (
                <Moon className="h-3.5 w-3.5 shrink-0 opacity-60" />
              )}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              tooltip="Sign Out"
              className={cn(
                "h-8 gap-2.5 rounded-md px-2.5 text-[13px] font-normal",
                "text-muted-foreground hover:text-danger hover:bg-danger/8",
                "transition-all duration-fast",
              )}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
