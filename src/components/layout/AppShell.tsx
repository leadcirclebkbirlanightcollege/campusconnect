import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, CalendarDays, MailOpen, UserRound, LogOut,
  BadgeCheck, Bell, BellOff, Megaphone, AlertTriangle,
  Trophy, Settings, ChevronRight, CheckCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { BRANDING } from "@/config/branding";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface AppShellProps { children: ReactNode }

// ── Notification kind config ──────────────────────────────────────────────────
const KIND_ICON: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  announcement:      { icon: Megaphone,     color: "text-primary",  bg: "bg-primary/10" },
  emergency:         { icon: AlertTriangle, color: "text-danger",   bg: "bg-danger/10" },
  lecture_reminder:  { icon: BookOpen,      color: "text-accent",   bg: "bg-accent/10" },
  achievement:       { icon: Trophy,        color: "text-premium",  bg: "bg-premium/10" },
  system_update:     { icon: Settings,      color: "text-muted-foreground", bg: "bg-surface-3" },
  general:           { icon: Bell,          color: "text-primary",  bg: "bg-primary/10" },
};
function getKindCfg(kind: string) { return KIND_ICON[kind] ?? KIND_ICON.general; }

// ── Nav item ─────────────────────────────────────────────────────────────────
function NavItem({ to, label, icon: Icon, active, badge }: {
  to: string; label: string; icon: React.ComponentType<{ className?: string }>;
  active: boolean; badge?: number;
}) {
  return (
    <Button asChild variant={active ? "secondary" : "ghost"} size="sm" className="gap-2">
      <Link to={to} aria-current={active ? "page" : undefined}>
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
        {typeof badge === "number" && badge > 0 && (
          <Badge className="ml-1 bg-accent text-accent-foreground" aria-label={`${badge} unread`}>{badge}</Badge>
        )}
      </Link>
    </Button>
  );
}

// ── Bell popover ──────────────────────────────────────────────────────────────
function BellPopover({ userId, unreadCount }: { userId: string; unreadCount: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const recipientsQuery = useQuery({
    queryKey: ["bell", "recipients", userId],
    enabled: open && Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("notification_recipients")
        .select("id,notification_id,user_id,read_at,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(15);
      return data ?? [];
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ["bell", "notifs", userId, (recipientsQuery.data ?? []).map((r: any) => r.notification_id).join(",")],
    enabled: open && (recipientsQuery.data ?? []).length > 0,
    queryFn: async () => {
      const ids = [...new Set((recipientsQuery.data ?? []).map((r: any) => r.notification_id))];
      if (!ids.length) return {};
      const { data } = await supabase.from("notifications").select("id,title,body,kind,sent_at,status").in("id", ids as string[]);
      const map: Record<string, any> = {};
      for (const n of (data ?? [])) map[n.id] = n;
      return map;
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from("notification_recipients").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bell", "recipients", userId] });
      qc.invalidateQueries({ queryKey: ["shell", "unread", userId] });
      qc.invalidateQueries({ queryKey: ["student", "inbox"] });
      toast.success("All marked as read");
    },
  });

  const markOneRead = useMutation({
    mutationFn: async (recipientId: string) => {
      await supabase.from("notification_recipients").update({ read_at: new Date().toISOString() }).eq("id", recipientId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bell", "recipients", userId] });
      qc.invalidateQueries({ queryKey: ["shell", "unread", userId] });
    },
  });

  const items = useMemo(() => {
    const recs = (recipientsQuery.data ?? []) as any[];
    const map = notificationsQuery.data ?? {};
    return recs
      .map((r) => ({ rec: r, notif: map[r.notification_id] ?? null }))
      .filter((i) => i.notif?.status !== "cancelled");
  }, [recipientsQuery.data, notificationsQuery.data]);

  const localUnread = items.filter((i) => !i.rec.read_at).length;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-120",
          open ? "bg-primary/10 text-primary" : "hover:bg-surface-2 text-muted-foreground hover:text-foreground",
        )}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-danger text-white text-[9px] font-black flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="absolute right-0 top-12 z-50 w-[340px] rounded-2xl border border-border-subtle bg-surface-1 shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                <div>
                  <p className="text-[13px] font-bold text-foreground">Notifications</p>
                  {localUnread > 0 && (
                    <p className="text-[10px] text-primary font-semibold">{localUnread} unread</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {localUnread > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="h-7 px-2 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <CheckCheck className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="max-h-[360px] overflow-y-auto">
                {(recipientsQuery.isLoading || notificationsQuery.isLoading) ? (
                  <div className="p-3 space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-surface-2 animate-pulse" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-10 text-center">
                    <BellOff className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-[12px] text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  items.map((item) => {
                    const n = item.notif;
                    if (!n) return null;
                    const cfg = getKindCfg(n.kind ?? "general");
                    const Icon = cfg.icon;
                    const isUnread = !item.rec.read_at;
                    return (
                      <button
                        key={item.rec.id}
                        className={cn(
                          "w-full text-left px-4 py-3 flex items-start gap-3 border-b border-border-subtle last:border-0 transition-colors duration-100",
                          isUnread ? "bg-primary/3 hover:bg-primary/5" : "hover:bg-surface-2",
                        )}
                        onClick={() => {
                          if (isUnread) markOneRead.mutate(item.rec.id);
                          setOpen(false);
                          navigate("/app/inbox");
                        }}
                      >
                        <div className={cn("h-7 w-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                          <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <span className={cn("text-[12px] leading-tight", isUnread ? "font-bold text-foreground" : "text-foreground/80 font-medium")}>
                              {n.title}
                            </span>
                            {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{n.body}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {formatDistanceToNow(new Date(n.sent_at ?? item.rec.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-border-subtle">
                <button
                  onClick={() => { setOpen(false); navigate("/app/inbox"); }}
                  className="w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  View all notifications <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────
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
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle();
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
      const { data, error } = await supabase.from("profiles").select("name,avatar_url,is_verified").eq("user_id", uid).maybeSingle();
      if (error) throw error;
      return data as { name: string; avatar_url: string | null; is_verified: boolean } | null;
    },
  });

  useEffect(() => {
    const uid = authQuery.data?.id;
    if (!uid || roleQuery.data !== "student") return;
    const channel = supabase
      .channel(`shell_unread_${uid}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "notification_recipients", filter: `user_id=eq.${uid}`,
      }, () => { qc.invalidateQueries({ queryKey: ["shell", "unread", uid] }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  const unread = unreadQuery.data ?? 0;
  const uid = authQuery.data?.id ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-border/40 bg-card/80 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center space-x-2 group">
              <img src={BRANDING.logo} alt={BRANDING.name} className="w-9 h-9 object-contain" />
              <span className="text-xl font-bold bg-gradient-premium bg-clip-text text-transparent">{BRANDING.name}</span>
            </Link>

            {showStudentNav && (
              <nav aria-label="Student navigation" className="flex items-center gap-1.5">
                <NavItem to="/lectures" label="Lectures" icon={BookOpen} active={path.startsWith("/lectures")} />
                <NavItem to="/attendance" label="Attendance" icon={CalendarDays} active={path.startsWith("/attendance")} />

                {/* Bell popover — replaces old Inbox nav item on desktop */}
                <div className="hidden sm:block">
                  {uid && <BellPopover userId={uid} unreadCount={unread} />}
                </div>

                {/* Inbox nav item (mobile) */}
                <div className="sm:hidden">
                  <NavItem to="/student/inbox" label="Inbox" icon={MailOpen} active={path.startsWith("/student/inbox")} badge={unread} />
                </div>

                <NavItem to="/student/profile" label="Profile" icon={UserRound} active={path.startsWith("/student/profile")} />

                {/* Avatar dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="ml-1 inline-flex" aria-label="Open profile menu">
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={profileMiniQuery.data?.avatar_url ?? undefined} alt="Profile photo" />
                          <AvatarFallback>{avatarInitial}</AvatarFallback>
                        </Avatar>
                        {profileMiniQuery.data?.is_verified && (
                          <span className="absolute -bottom-1 -right-1">
                            <span className="pulse absolute inset-0 rounded-full bg-primary/30" />
                            <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                              <BadgeCheck className="h-3.5 w-3.5" aria-label="Verified" />
                            </span>
                          </span>
                        )}
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-50 w-48 bg-popover text-popover-foreground">
                    <DropdownMenuItem asChild><Link to="/student/profile">Profile</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/student/inbox">Inbox {unread > 0 && `(${unread})`}</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/leaderboard">Leaderboard</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleStudentLogout(); }} className="gap-2">
                      <LogOut className="h-4 w-4" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </nav>
            )}
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
