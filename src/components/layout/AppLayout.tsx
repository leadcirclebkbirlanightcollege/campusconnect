import { Outlet, useLocation, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import {
  Bell,
  ChevronDown,
  UserRound,
  LogOut,
  CreditCard,
  BadgeCheck,
  CheckCircle,
  LayoutDashboard,
  BookOpen,
  Trophy,
  Flame,
  UserCircle,
} from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import SessionGuard from "@/components/auth/SessionGuard";
import FeedbackButton from "@/components/feedback/FeedbackButton";
import ForceUpdateBanner from "@/components/layout/ForceUpdateBanner";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BRANDING } from "@/config/branding";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const PAGE_META: Record<string, { title: string; description: string }> = {
  "/app/dashboard":    { title: "Dashboard",        description: "Your academic overview at a glance" },
  "/app/admin":        { title: "Command Center",    description: "System administration and management" },
  "/app/attendance":   { title: "Attendance",        description: "View your attendance history and records" },
  "/app/programmes":   { title: "Learning Circles",  description: "Browse and track your enrolled programmes" },
  "/app/lectures":     { title: "Lectures",          description: "Upcoming and past lecture sessions" },
  "/app/inbox":        { title: "Inbox",             description: "Your notifications and messages" },
  "/app/id-card":      { title: "Digital ID",        description: "Your institutional identity card" },
  "/app/profile":      { title: "Profile",           description: "Manage your personal information" },
  "/app/leaderboard":  { title: "Leaderboard",       description: "Student rankings by points earned" },
  "/app/announcements":{ title: "Announcements",     description: "Important notices and updates" },
  "/app/events":       { title: "Events",            description: "Upcoming campus events" },
  "/app/polls":        { title: "Polls",             description: "Active polls and surveys" },
  "/app/daily":        { title: "Daily",             description: "Daily content and inspiration" },
};

function getPageMeta(pathname: string) {
  for (const [prefix, meta] of Object.entries(PAGE_META)) {
    if (pathname.startsWith(prefix)) return meta;
  }
  return { title: "Dashboard", description: "Your academic overview at a glance" };
}

/* ── Notification Bell ─────────────────────────────────────────── */
function NotificationBell({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: unread = 0 } = useQuery({
    queryKey: ["topbar", "unread", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("notification_recipients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      return count ?? 0;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel(`topbar_unread_${userId}`)
      .on("postgres_changes", {
        event: "*", schema: "public",
        table: "notification_recipients",
        filter: `user_id=eq.${userId}`,
      }, () => qc.invalidateQueries({ queryKey: ["topbar", "unread", userId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc]);

  return (
    <Link
      to="/app/inbox"
      className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-lg",
        "border border-border-subtle bg-surface-2",
        "text-muted-foreground hover:text-foreground hover:bg-surface-3",
        "transition-all duration-fast",
      )}
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-1 leading-none">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

/* ── System Status Dot ─────────────────────────────────────────── */
function SystemStatus() {
  return (
    <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success/8 border border-success/20">
      <span className="h-1.5 w-1.5 rounded-full bg-success live-dot" />
      <span className="text-[11px] font-medium text-success leading-none">Operational</span>
    </div>
  );
}

/* ── Profile Menu ──────────────────────────────────────────────── */
function ProfileMenu({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ["topbar", "profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url, is_verified, student_id")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  const initial = useMemo(() => {
    return (profile?.name ?? "U")[0].toUpperCase();
  }, [profile?.name]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-lg pl-1 pr-2 py-1",
            "border border-border-subtle bg-surface-2",
            "hover:bg-surface-3 hover:border-border-strong",
            "transition-all duration-fast focus:outline-none",
          )}
          aria-label="Profile menu"
        >
          <div className="relative">
            <Avatar className="h-6 w-6">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.name} />
              <AvatarFallback className="text-[11px] bg-primary/15 text-primary font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
            {profile?.is_verified && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary flex items-center justify-center">
                <BadgeCheck className="h-2 w-2 text-primary-foreground" />
              </span>
            )}
          </div>
          <span className="hidden sm:block text-[13px] font-medium text-foreground leading-none max-w-[80px] truncate">
            {profile?.name?.split(" ")[0] ?? "Student"}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52 bg-surface-1 border-border-subtle shadow-lg">
        <DropdownMenuLabel className="pb-2">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-[11px] bg-primary/15 text-primary font-bold">{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate">{profile?.name ?? "Student"}</p>
              {profile?.student_id && (
                <p className="text-[11px] text-muted-foreground">{profile.student_id}</p>
              )}
            </div>
          </div>
          {profile?.is_verified && (
            <div className="mt-2 flex items-center gap-1.5 rounded-md bg-success/8 border border-success/20 px-2 py-1">
              <CheckCircle className="h-3 w-3 text-success" />
              <span className="text-[11px] font-medium text-success">Verified Student</span>
            </div>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-border-subtle" />

        <DropdownMenuItem asChild className="gap-2.5 text-[13px] cursor-pointer">
          <Link to="/app/profile">
            <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
            My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2.5 text-[13px] cursor-pointer">
          <Link to="/app/id-card">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            Digital ID
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border-subtle" />

        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); handleLogout(); }}
          className="gap-2.5 text-[13px] text-danger focus:text-danger focus:bg-danger/8 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Main Layout ───────────────────────────────────────────────── */

/* ── Mobile Bottom Nav ─────────────────────────────────────────── */
type BottomNavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
};

function MobileBottomNav({ path, unread }: { path: string; unread: number }) {
  const BOTTOM_NAV: BottomNavItem[] = [
    { label: "Home",        icon: LayoutDashboard, href: "/app/dashboard" },
    { label: "Lectures",    icon: BookOpen,         href: "/app/lectures" },
    { label: "Inbox",       icon: Bell,             href: "/app/inbox",         badge: unread },
    { label: "Leaderboard", icon: Trophy,           href: "/app/leaderboard" },
    { label: "Profile",     icon: UserCircle,       href: "/app/profile" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border-subtle bg-surface-1/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch justify-around px-1 pt-1 pb-1">
        {BOTTOM_NAV.map(({ label, icon: Icon, href, badge }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl min-w-[52px] min-h-[52px] justify-center transition-all duration-150",
                active
                  ? "text-primary bg-primary/8"
                  : "text-muted-foreground active:bg-surface-3",
              )}
            >
              {/* Active indicator dot */}
              {active && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
              )}
              <div className="relative">
                <Icon className={cn("h-5 w-5 transition-transform duration-150", active && "scale-110")} />
                {typeof badge === "number" && badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-danger text-white text-[9px] font-black flex items-center justify-center leading-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className={cn("text-[9px] font-semibold leading-none", active ? "text-primary" : "text-muted-foreground/60")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const { title, description } = getPageMeta(location.pathname);

  const { data: user } = useQuery({
    queryKey: ["topbar", "user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
    staleTime: 120_000,
  });

  // Unread count for mobile bottom nav bell badge
  const { data: bottomNavUnread = 0 } = useQuery({
    queryKey: ["topbar", "unread", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { count } = await supabase
        .from("notification_recipients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .is("read_at", null);
      return count ?? 0;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return (
    <>
    <SessionGuard />
    <SidebarProvider defaultOpen>
      <div className="min-h-svh flex w-full bg-background">
        <AppSidebar />

        <SidebarInset className="flex flex-col">
          {/* ── Premium Topbar ──────────────────────────────────── */}
          <header className={cn(
            "sticky top-0 z-40 border-b border-border-subtle",
            "bg-surface-1/85 backdrop-blur-xl",
            "shadow-[0_1px_0_hsl(var(--border-subtle))]",
          )}>
            <div className="flex h-[52px] items-center gap-3 px-3 md:px-5">
              {/* Mobile sidebar trigger */}
              <SidebarTrigger className="md:hidden h-8 w-8 shrink-0" />

              {/* Divider */}
              <div className="hidden md:block h-4 w-px bg-border-subtle shrink-0" />

              {/* Page title */}
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[14px] font-semibold text-foreground leading-none">
                  {title}
                </h1>
                <p className="hidden sm:block truncate text-[11px] text-muted-foreground mt-0.5 leading-none">
                  {description}
                </p>
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-2 shrink-0">
                <SystemStatus />

                {user && (
                  <>
                    <NotificationBell userId={user.id} />
                    <ProfileMenu userId={user.id} />
                  </>
                )}
              </div>
            </div>
          </header>

          {/* ── Workspace ───────────────────────────────────────── */}
          <main className="flex-1 px-4 py-5 md:px-6 md:py-6 pb-[calc(72px+env(safe-area-inset-bottom,0px))] md:pb-6">
            <div className="mx-auto max-w-[1280px]">
              <PageTransition>
                <Outlet />
              </PageTransition>
            </div>
          </main>

          {/* ── Footer ──────────────────────────────────────────── */}
          <footer className="border-t border-border-subtle bg-surface-1/60 shrink-0 hidden md:block">
            <div className="px-4 py-2.5 md:px-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <img src={BRANDING.logo} alt={BRANDING.name} className="h-4 w-4 object-contain opacity-60" />
                <span className="text-[11px] text-muted-foreground/60 font-medium">
                  {BRANDING.name}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/40 text-right">
                Developed by Atharv Jadhav · CS Dept.
              </p>
            </div>
          </footer>
        </SidebarInset>
      </div>
      {/* Mobile bottom nav — outside SidebarInset so it's always full-width */}
      <MobileBottomNav path={location.pathname} unread={bottomNavUnread} />
      {/* Floating feedback button — visible for all authenticated users */}
      <FeedbackButton />
      {/* Force update overlay — listens to platform_settings realtime */}
      <ForceUpdateBanner />
    </SidebarProvider>
    </>
  );
}
