import { Outlet, useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Search,
  UserRound,
  LogOut,
  CreditCard,
  BadgeCheck,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SessionGuard from "@/components/auth/SessionGuard";
import FeedbackButton from "@/components/feedback/FeedbackButton";
import ForceUpdateBanner from "@/components/layout/ForceUpdateBanner";
import OnboardingGuard from "@/components/auth/OnboardingGuard";

import SoftUpdateBanner from "@/components/layout/SoftUpdateBanner";
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
import TopbarNotificationCenter from "@/components/notifications/TopbarNotificationCenter";
import CommandPalette from "@/components/search/CommandPalette";
import { BottomNavigation } from "@/layout/BottomNavigation";
import ContextualFAB from "@/components/shell/ContextualFAB";
import {
  PAGE_TRANSITION,
  PAGE_TRANSITION_VARIANTS,
} from "@/motion/pageTransitions";
import { msToSeconds, MOTION_MS } from "@/motion/motionTokens";
import { getPageMeta } from "@/ui-engine/navigation-engine";
import { useAppEventsBridge } from "@/hooks/use-app-events";
import { useShellRealtime } from "@/hooks/use-shell-realtime";
import { useSmartBack } from "@/hooks/use-smart-back";
import ScrollMemory from "@/components/layout/ScrollMemory";


/* ── System Status Dot ─────────────────────────────────────────── */
function SystemStatus() {
  return (
    <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/8 border border-success/20">
      <span className="h-1.5 w-1.5 rounded-full bg-success live-dot" />
      <span className="text-[11px] font-semibold text-success leading-none">Live</span>
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

  const initial = useMemo(() => (profile?.name ?? "U")[0].toUpperCase(), [profile?.name]);

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
            "flex items-center gap-2 rounded-xl pl-1 pr-2.5 py-1",
            "border border-border-subtle bg-surface-2",
            "hover:bg-surface-3 hover:border-border-strong",
            "transition-all duration-fast focus:outline-none",
            "min-h-[36px]",
          )}
          aria-label="Profile menu"
        >
          <div className="relative">
            <Avatar className="h-6 w-6">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.name} />
              <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
            {profile?.is_verified && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary flex items-center justify-center">
                <BadgeCheck className="h-2 w-2 text-primary-foreground" />
              </span>
            )}
          </div>
          <span className="hidden sm:block text-[12px] font-medium text-foreground leading-none max-w-[72px] truncate">
            {profile?.name?.split(" ")[0] ?? "Student"}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block shrink-0" />
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
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-success/8 border border-success/20 px-2 py-1">
              <CheckCircle className="h-3 w-3 text-success" />
              <span className="text-[11px] font-semibold text-success">Verified Student</span>
            </div>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-border-subtle" />

        <DropdownMenuItem asChild className="gap-2.5 text-[13px] cursor-pointer">
          <Link to="/app/settings">
            <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
            Settings
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
export default function AppLayout() {
  const location = useLocation();
  const { title, description } = getPageMeta(location.pathname);
  const { canGoBack, goBack } = useSmartBack();


  const { data: user } = useQuery({
    queryKey: ["topbar", "user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
    staleTime: 120_000,
  });

  // Cross-module reactivity: translate app-events → query invalidations,
  // and subscribe to realtime tables that ripple across the ecosystem.
  useAppEventsBridge();
  useShellRealtime(user?.id ?? null);

  return (
    <>
      <SessionGuard />
      <SidebarProvider defaultOpen>
        <div className="min-h-svh flex w-full bg-background">
          {/* Desktop sidebar */}
          <AppSidebar />

          <SidebarInset className="flex flex-col min-w-0">

            {/* ── Command Header ─────────────────────────────────── */}
            <header
              className={cn(
                "sticky top-0 z-40 app-header-safe",
                "glass-surface border-b border-border-subtle/70",
                "shadow-[0_1px_0_hsl(var(--border-subtle)/0.8)]",
              )}
            >
              <div className="flex h-[52px] items-center gap-2.5 px-3 md:px-5">
                {/* Smart back (detail screens) — falls back to sidebar trigger on tab roots */}
                {canGoBack ? (
                  <button
                    type="button"
                    onClick={goBack}
                    aria-label="Go back"
                    className="tap-ripple shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border border-border-subtle bg-surface-2 text-muted-foreground transition-all duration-fast hover:bg-surface-3 hover:text-foreground active:scale-95"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                ) : (
                  <SidebarTrigger className="md:hidden h-8 w-8 shrink-0" />
                )}

                {/* Desktop: vertical divider */}
                <div className="hidden md:block h-4 w-px bg-border-subtle shrink-0" />


                {/* Page title area */}
                <div className="min-w-0 flex-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={location.pathname}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: msToSeconds(MOTION_MS.fast), ease: [0, 0, 0.2, 1] }}
                    >
                      <p className="text-[14px] font-semibold text-foreground leading-none truncate">
                        {title}
                      </p>
                      {description && (
                        <p className="hidden sm:block text-[11px] text-muted-foreground mt-0.5 leading-none truncate">
                          {description}
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <SystemStatus />
                  {user && (
                    <>
                      <TopbarNotificationCenter userId={user.id} />
                      <ProfileMenu userId={user.id} />
                    </>
                  )}
                </div>
              </div>
            </header>

            {/* ── Workspace ──────────────────────────────────────── */}
            <main className="flex-1 min-w-0 py-5 md:px-6 md:pb-6 pb-[calc(80px+env(safe-area-inset-bottom,0px))]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  variants={PAGE_TRANSITION_VARIANTS}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={PAGE_TRANSITION}
                  className="w-full h-full"
                >
                  <OnboardingGuard><Outlet /></OnboardingGuard>
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Desktop footer */}
            <footer className="border-t border-border-subtle/60 bg-surface-1/50 shrink-0 hidden md:block">
              <div className="px-5 py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <img src={BRANDING.logo} alt={BRANDING.name} className="h-4 w-4 object-contain opacity-50" />
                  <span className="text-[11px] text-muted-foreground/50 font-medium">{BRANDING.name}</span>
                </div>
                <p className="text-[11px] text-muted-foreground/35 text-right">
                  Developed by Atharv Jadhav · CS Dept.
                </p>
              </div>
            </footer>
          </SidebarInset>
        </div>

        {/* Mobile bottom navigation — new layout engine component */}
        <BottomNavigation />

        {/* Contextual primary-action FAB — adapts to current route */}
        <ContextualFAB />


        {/* Command Palette (Ctrl+K) */}
        <CommandPalette />

        {/* Floating utilities */}
        <FeedbackButton />
        <ForceUpdateBanner />
        <SoftUpdateBanner />
      </SidebarProvider>
    </>
  );
}
