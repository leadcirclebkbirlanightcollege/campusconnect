/**
 * AdminSidebar — left nav for /platform/admin/* routes.
 */
import { useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, UserCheck,
  CheckSquare, BarChart3, FileEdit, Megaphone, CalendarDays, Sparkles,
  Bell, Trophy, Coins, ScanLine, FileText, Palette, UserCog, Settings,
  SlidersHorizontal, LogOut, Moon, Sun, Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  LayoutDashboard, Users, BookOpen, GraduationCap, UserCheck,
  CheckSquare, BarChart3, FileEdit, Megaphone, CalendarDays, Sparkles,
  Bell, Trophy, Coins, ScanLine, FileText, Palette, UserCog, Settings,
  SlidersHorizontal, Shield,
};

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile, state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { branding } = usePlatformBranding();
  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  const isActive = (url: string) =>
    currentPath === url || currentPath.startsWith(url + "/");

  const handleNav = () => setOpenMobile(false);
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className={cn(
        "flex h-[52px] items-center gap-2.5 border-b border-sidebar-border shrink-0",
        collapsed ? "justify-center px-2" : "px-3.5",
      )}>
        <img
          src={branding.logo_url ?? BRANDING.logo}
          alt={branding.brand_name}
          className="h-7 w-7 object-contain rounded shrink-0"
        />
        {!collapsed && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <span className="text-[13px] font-bold text-sidebar-foreground block leading-tight tracking-tight truncate">
              {branding.brand_name}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-warning/70 leading-none">
              Admin Panel
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <SidebarContent className="overflow-y-auto px-1.5 py-2 gap-0">
        {ADMIN_NAV_SECTIONS.map((section, idx) => (
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
                  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild isActive={active} tooltip={item.title}
                        className={cn(
                          "h-8 gap-2.5 rounded-md px-2.5 text-[13px] font-normal group/item transition-all duration-fast",
                          active
                            ? "bg-primary/10 text-primary font-medium shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)]"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <Link to={item.url} onClick={handleNav} className="flex items-center gap-2.5">
                          <Icon className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-all duration-fast",
                            active ? "text-primary" : "text-muted-foreground/60 group-hover/item:text-foreground/80",
                          )} />
                          <span className="flex-1 leading-none">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
            <SidebarMenuButton onClick={onLogout} tooltip="Sign Out"
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
