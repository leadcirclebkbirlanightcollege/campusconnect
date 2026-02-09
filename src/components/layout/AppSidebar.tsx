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
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";

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

import ThemeToggle from "@/components/layout/ThemeToggle";

type Role = "admin" | "student" | null;

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();

  const authQuery = useQuery({
    queryKey: ["app_sidebar", "auth"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user ?? null;
    },
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

  const isCollapsed = state === "collapsed";
  const currentPath = location.pathname;
  const isAdmin = roleQuery.data === "admin";

  const items = useMemo(
    () =>
      [
        { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard, show: true },
        { title: "Attendance", url: "/app/attendance", icon: CalendarDays, show: true },
        { title: "Learning Circles", url: "/app/programmes", icon: BookOpen, show: true },
        { title: "Lectures", url: "/app/lectures", icon: CalendarDays, show: true },
        { title: "Leaderboard", url: "/app/leaderboard", icon: Trophy, show: true },
        { title: "Inbox", url: "/app/inbox", icon: Bell, show: true },
        { title: "Profile", url: "/app/profile", icon: UserRound, show: true },
        { title: "Admin", url: "/app/admin/dashboard", icon: Shield, show: isAdmin },
      ].filter((i) => i.show),
    [isAdmin],
  );

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Campus Connect</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = currentPath === item.url || currentPath.startsWith(item.url + "/");
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-2"
                        activeClassName=""
                        end={item.url === "/app/dashboard"}
                      >
                        <Icon className="h-4 w-4" />
                        {!isCollapsed ? <span>{item.title}</span> : null}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem>
                <SidebarMenuButton
                  type="button"
                  onClick={onLogout}
                  tooltip="Logout"
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  {!isCollapsed ? <span>Logout</span> : null}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <a
          href="https://campus-bookings.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className={
            "group flex items-center justify-between rounded-md px-2 py-2 text-sm font-medium tracking-wide !text-premium " +
            "underline-offset-4 transition-all hover:underline hover:[filter:drop-shadow(0_0_10px_hsl(var(--premium)/0.35))] " +
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          }
          aria-label="Open Campus Screening Portal (opens in new tab)"
          title={isCollapsed ? "Campus Screening Portal" : undefined}
        >
          {!isCollapsed ? (
            <span>Campus Screening Portal</span>
          ) : (
            <span className="text-[10px] tracking-[0.25em]">CSP</span>
          )}
          <span className="sr-only">(opens in a new tab)</span>
        </a>

        <ThemeToggle />
        {!isCollapsed ? (
          <p className="px-2 pb-2 text-[11px] leading-snug text-sidebar-foreground/70">
            Developed by - Atharv Jadhav - Department Of Computer Science
          </p>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
