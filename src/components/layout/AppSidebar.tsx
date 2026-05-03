import { useMemo } from "react";
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
} from "lucide-react";

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
          { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard },
        ],
      },
      {
        label: "Academics",
        items: [
          { title: "Attendance",       url: "/app/attendance",  icon: CalendarDays },
          { title: "Lectures",         url: "/app/lectures",    icon: BookOpen },
          { title: "Learning Circles", url: "/app/programmes",  icon: Calendar },
        ],
      },
      {
        label: "Engagement",
        items: [
          { title: "Leaderboard",   url: "/app/leaderboard",   icon: Trophy },
          { title: "Points",        url: "/app/points",        icon: Flame },
          { title: "Achievements",  url: "/app/achievements",  icon: Flame },
          { title: "Polls",         url: "/app/polls",         icon: BarChart3 },
          { title: "Daily",         url: "/app/daily",         icon: Sparkles },
        ],
      },
      {
        label: "Communication",
        items: [
          { title: "Messages",      url: "/app/messages",      icon: MessageSquare },
          { title: "Announcements", url: "/app/announcements", icon: Megaphone },
          { title: "Events",        url: "/app/events",        icon: CalendarDays },
          { title: "Inbox",         url: "/app/inbox",         icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
        ],
      },
      {
        label: "Identity",
        items: [
          { title: "Digital ID",         url: "/app/id-card",                   icon: CreditCard },
          { title: "Settings",           url: "/app/settings",                  icon: UserRound },
          { title: "Notif. Settings",    url: "/app/settings/notifications",    icon: Settings },
        ],
      },
    ],
    [],
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

  const renderSection = (section: NavSection, idx: number) => (
    <SidebarGroup key={section.label} className={cn("py-0.5", idx > 0 && "pt-0")}>
      <SidebarGroupLabel className={cn(
        "text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground/50 px-3 py-2 h-auto",
        collapsed && "opacity-0 pointer-events-none",
      )}>
        {section.label}
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
                      ? "bg-primary/10 text-primary font-medium shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)]"
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
                      active ? "text-primary" : "text-muted-foreground/60 group-hover/item:text-foreground/80",
                      item.accent && !active && item.accent,
                    )} />
                    <span className="flex-1 leading-none">{item.title}</span>
                    {badgeCount > 0 && (
                      <span className={cn(
                        "ml-auto flex h-4 min-w-4 items-center justify-center rounded-full",
                        "bg-primary text-primary-foreground px-1 text-[9px] font-bold leading-none",
                        "animate-scale-in",
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

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-r border-sidebar-border bg-sidebar"
    >
      {/* ── Brand Lockup ─────────────────────────────────────────── */}
      <div className={cn(
        "flex h-[52px] items-center gap-2.5 border-b border-sidebar-border shrink-0",
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
