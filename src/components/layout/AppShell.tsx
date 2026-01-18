import { ReactNode, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CalendarDays, MailOpen, UserRound, LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppShellProps {
  children: ReactNode;
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
  badge,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  badge?: number;
}) {
  return (
    <Button
      asChild
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className="gap-2"
    >
      <Link to={to} aria-current={active ? "page" : undefined}>
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
        {typeof badge === "number" && badge > 0 ? (
          <Badge className="ml-1 bg-accent text-accent-foreground" aria-label={`${badge} unread`}>
            {badge}
          </Badge>
        ) : null}
      </Link>
    </Button>
  );
}

const AppShell = ({ children }: AppShellProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const authQuery = useQuery({
    queryKey: ["shell", "auth"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user ?? null;
    },
  });

  const roleQuery = useQuery({
    queryKey: ["shell", "role", authQuery.data?.id],
    enabled: Boolean(authQuery.data?.id),
    queryFn: async () => {
      const uid = authQuery.data!.id;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data?.role as "student" | "admin" | null) ?? null;
    },
  });

  const unreadQuery = useQuery({
    queryKey: ["shell", "unread", authQuery.data?.id],
    enabled: Boolean(authQuery.data?.id) && roleQuery.data === "student",
    queryFn: async () => {
      const uid = authQuery.data!.id;
      const { count, error } = await supabase
        .from("notification_recipients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const profileMiniQuery = useQuery({
    queryKey: ["shell", "profile_mini", authQuery.data?.id],
    enabled: Boolean(authQuery.data?.id) && roleQuery.data === "student",
    queryFn: async () => {
      const uid = authQuery.data!.id;
      const { data, error } = await supabase
        .from("profiles")
        .select("name,avatar_url")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as { name: string; avatar_url: string | null } | null;
    },
  });

  useEffect(() => {
    const uid = authQuery.data?.id;
    if (!uid || roleQuery.data !== "student") return;

    const channel = supabase
      .channel(`shell_unread_${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notification_recipients", filter: `user_id=eq.${uid}` },
        () => {
          qc.invalidateQueries({ queryKey: ["shell", "unread", uid] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authQuery.data?.id, qc, roleQuery.data]);

  const showStudentNav = roleQuery.data === "student";
  const path = location.pathname;

  const avatarInitial = useMemo(() => {
    const n = (profileMiniQuery.data?.name ?? "U").trim();
    return (n[0] || "U").toUpperCase();
  }, [profileMiniQuery.data?.name]);

  const handleStudentLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Ambient background effect */}
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-border/40 bg-card/80 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center shadow-premium group-hover:shadow-xl transition-all">
                <span className="text-primary-foreground font-bold text-lg">CC</span>
              </div>
              <span className="text-xl font-bold bg-gradient-premium bg-clip-text text-transparent">
                Campus Connect
              </span>
            </Link>

            {showStudentNav ? (
              <nav aria-label="Student navigation" className="flex items-center gap-2">
                <NavItem
                  to="/lectures"
                  label="Lectures"
                  icon={BookOpen}
                  active={path.startsWith("/lectures")}
                />
                <NavItem
                  to="/attendance"
                  label="Attendance"
                  icon={CalendarDays}
                  active={path.startsWith("/attendance")}
                />
                <NavItem
                  to="/student/inbox"
                  label="Inbox"
                  icon={MailOpen}
                  active={path.startsWith("/student/inbox")}
                  badge={unreadQuery.data ?? 0}
                />
                <NavItem
                  to="/student/profile"
                  label="Profile"
                  icon={UserRound}
                  active={path.startsWith("/student/profile")}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="ml-1 inline-flex"
                      aria-label="Open profile menu"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={profileMiniQuery.data?.avatar_url ?? undefined}
                          alt="Profile photo"
                        />
                        <AvatarFallback>{avatarInitial}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="z-50 w-48 bg-popover text-popover-foreground"
                  >
                    <DropdownMenuItem asChild>
                      <Link to="/student/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/student/inbox">Inbox</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(e) => {
                      e.preventDefault();
                      handleStudentLogout();
                    }} className="gap-2">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </nav>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">{children}</main>

      <footer className="relative z-10 border-t border-border/40 bg-card/60 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2026 Campus Connect. All rights reserved.</p>
            <p className="mt-1">Empowering academic excellence through technology</p>
            <p className="mt-2">Developed by - Atharv Jadhav - Department Of Computer Science</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;
