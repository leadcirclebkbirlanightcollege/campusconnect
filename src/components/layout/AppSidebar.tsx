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
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";
import { useTheme } from "@/hooks/use-theme";

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

interface NavSection {
  label: string;
  items: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[];
}

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();

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

  const currentPath = location.pathname;
  const isAdmin = roleQuery.data === "admin";

  const sections: NavSection[] = useMemo(
    () => [
      {
        label: "MAIN",
        items: [
          { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard },
        ],
      },
      {
        label: "ACADEMICS",
        items: [
          { title: "Attendance", url: "/app/attendance", icon: CalendarDays },
          { title: "Lectures", url: "/app/lectures", icon: BookOpen },
          { title: "Learning Circles", url: "/app/programmes", icon: Calendar },
        ],
      },
      {
        label: "ENGAGEMENT",
        items: [
          { title: "Leaderboard", url: "/app/leaderboard", icon: Trophy },
          { title: "Polls", url: "/app/polls", icon: BarChart3 },
          { title: "Daily", url: "/app/daily", icon: Sparkles },
        ],
      },
      {
        label: "COMMUNICATION",
        items: [
          { title: "Announcements", url: "/app/announcements", icon: Megaphone },
          { title: "Events", url: "/app/events", icon: CalendarDays },
          { title: "Inbox", url: "/app/inbox", icon: Bell },
        ],
      },
      {
        label: "IDENTITY",
        items: [
          { title: "Digital ID", url: "/app/id-card", icon: CreditCard },
          { title: "Profile", url: "/app/profile", icon: UserRound },
        ],
      },
    ],
    [],
  );

  const adminSection: NavSection = useMemo(
    () => ({
      label: "ADMIN",
      items: [
        { title: "Admin Dashboard", url: "/app/admin/dashboard", icon: Shield },
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
    <SidebarGroup key={section.label} className={idx > 0 ? "pt-1" : ""}>
      <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-3 pb-0.5">
        {section.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {section.items.map((item) => {
            const active = isActive(item.url);
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.title}
                  className="h-8 gap-2.5 rounded-md px-3 text-[13px] font-normal"
                >
                  <NavLink
                    to={item.url}
                    className="flex items-center"
                    activeClassName=""
                    end={item.url === "/app/dashboard"}
                    onClick={handleNav}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-70" />
                    <span>{item.title}</span>
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
    <Sidebar variant="sidebar" className="border-r border-sidebar-border">
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-sidebar-border shrink-0">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">CC</span>
        </div>
        <div className="min-w-0">
          <span className="text-sm font-semibold text-sidebar-foreground block leading-tight">Campus Connect</span>
          <span className="text-[10px] text-muted-foreground leading-none">Institutional Platform</span>
        </div>
      </div>

      <SidebarContent className="overflow-y-auto px-1 py-2">
        {sections.map((s, i) => renderSection(s, i))}

        {isAdmin && (
          <>
            <div className="mx-3 my-2 border-t border-sidebar-border" />
            {renderSection(adminSection, sections.length)}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-2 py-2 space-y-0.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              tooltip={theme === "dark" ? "Light mode" : "Dark mode"}
              className="h-8 gap-2.5 rounded-md px-3 text-[13px] font-normal"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 shrink-0 opacity-70" />
              ) : (
                <Moon className="h-4 w-4 shrink-0 opacity-70" />
              )}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              tooltip="Logout"
              className="h-8 gap-2.5 rounded-md px-3 text-[13px] font-normal text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
