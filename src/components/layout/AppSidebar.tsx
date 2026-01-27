import type { ComponentType } from "react";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  MailOpen,
  Trophy,
  UserRound,
  Users,
  GraduationCap,
} from "lucide-react";

import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator } from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type NavItem = {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
};

export default function AppSidebar() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = useMemo<NavItem[]>(() => {
    if (role === "admin") {
      return [
        { label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true },
        // Admin dashboard sub-areas are currently tabs/anchors; keep these stable.
        { label: "Students", to: "/admin#students", icon: Users },
        { label: "Lectures", to: "/admin#lectures", icon: BookOpen },
        { label: "Attendance", to: "/admin#attendance", icon: ClipboardCheck },
        { label: "Monthly", to: "/admin#monthly", icon: CalendarDays },
        { label: "Notifications", to: "/admin#notifications", icon: Bell },
        { label: "Points", to: "/admin#points", icon: GraduationCap },
        { label: "Leaderboard", to: "/leaderboard", icon: Trophy },
        { label: "Profile", to: "/admin#admin_profile", icon: UserRound },
      ];
    }

    return [
      { label: "Dashboard", to: "/student", icon: LayoutDashboard, end: true },
      { label: "Lectures", to: "/lectures", icon: BookOpen },
      { label: "Attendance", to: "/attendance", icon: CalendarDays },
      { label: "Leaderboard", to: "/leaderboard", icon: Trophy },
      { label: "Notifications", to: "/student/inbox", icon: MailOpen },
      { label: "Profile", to: "/student/profile", icon: UserRound },
    ];
  }, [role]);

  const currentPath = location.pathname + location.hash;
  const isActive = (to: string, end?: boolean) => {
    if (end) return currentPath === to;
    return currentPath === to || currentPath.startsWith(to);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Logout failed");
      return;
    }
    navigate("/auth", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Campus Connect</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to, item.end)} tooltip={item.label}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className="flex items-center gap-2"
                      activeClassName=""
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
