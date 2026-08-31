import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, BookOpen, Users, CheckSquare,
  Megaphone, Calendar, UserCircle, LogOut, Menu,
  GraduationCap, ChevronRight, BarChart2, FileText,
  Building2, Sparkles,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const NAV = [
  { to: "/faculty/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { to: "/faculty/my-lectures",   icon: BookOpen,        label: "My Lectures" },
  { to: "/faculty/attendance",    icon: CheckSquare,     label: "Attendance" },
  { to: "/faculty/students",      icon: Users,           label: "Students" },
  { to: "/faculty/assignments",   icon: FileText,        label: "Assignments" },
  { to: "/faculty/announcements", icon: Megaphone,       label: "Announcements" },
  { to: "/faculty/schedule",      icon: Calendar,        label: "Schedule" },
  { to: "/faculty/analytics",     icon: BarChart2,       label: "Analytics" },
  { to: "/faculty/profile",       icon: UserCircle,      label: "Profile" },
];

export default function FacultyLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Live query for faculty profile
  const { data: profile } = useQuery({
    queryKey: ["faculty", "profile", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name,email,phone,department,college_id,avatar_url,colleges(college_name)")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Close mobile drawer on Escape for keyboard users.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth", { replace: true });
  };

  const displayName = profile?.name || "Faculty Member";
  const displayDept = profile?.department ? `${profile.department}` : (profile as any)?.colleges?.college_name || "Academic Workspace";

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card">
      {/* Brand & Portal Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground leading-tight tracking-tight">Campus Connect</p>
            <p className="text-[11px] text-muted-foreground font-medium">Faculty Portal</p>
          </div>
        </div>
      </div>

      {/* Faculty Identity Mini Card */}
      <div className="p-3 border-b border-border/40 bg-muted/20">
        <Link
          to="/faculty/profile"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2.5 p-2 rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:bg-muted/50 transition-all group"
          title="View & Edit Faculty Profile"
        >
          <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden text-primary font-bold text-xs">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {displayName}
            </p>
            <p className="text-[10.5px] text-muted-foreground truncate flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success inline-block shrink-0" />
              {displayDept}
            </p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Faculty sections" className="flex-1 p-2.5 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            aria-label={label}
            className={({ isActive }) => cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 group relative",
              isActive
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="flex-1 truncate">{label}</span>
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-border/50 bg-card space-y-1">
        <Link
          to="/faculty/profile"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <UserCircle className="h-4 w-4 shrink-0" />
          <span>Account Settings</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-left"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border/50 shrink-0 shadow-2xs">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Faculty navigation"
            className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-10 shadow-xl"
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden app-header-safe flex items-center justify-between h-14 px-4 border-b border-border/50 bg-card shrink-0">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            className="h-10 w-10 rounded-xl"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="text-[13.5px] font-bold text-foreground tracking-tight">Faculty Portal</span>
          </div>
          <Link
            to="/faculty/profile"
            className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold overflow-hidden"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </Link>
        </header>

        <main id="faculty-main" className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 bg-background">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
