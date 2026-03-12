/**
 * SuperAdminLayout — shell for /platform/admin-control/* routes.
 */
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { msToSeconds, MOTION_MS } from "@/motion/motionTokens";
import { PAGE_TRANSITION, PAGE_TRANSITION_VARIANTS } from "@/motion/pageTransitions";
import { getSAPageMeta } from "@/pages/platform/superAdminNavConfig";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import SuperAdminSidebar from "@/pages/platform/SuperAdminSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@/hooks/useLogout";
import { useMemo } from "react";
import { BRANDING } from "@/config/branding";
import { CollegeProvider } from "@/contexts/CollegeContext";
import SessionGuard from "@/components/auth/SessionGuard";

function SAProfileMenu({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["sa_topbar", "profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("name, avatar_url").eq("user_id", userId).maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });
  const initial = useMemo(() => (profile?.name ?? "S")[0].toUpperCase(), [profile?.name]);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate("/auth", { replace: true });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn(
          "flex items-center gap-2 rounded-xl pl-1 pr-2.5 py-1 min-h-[36px]",
          "border border-border-subtle bg-surface-2 hover:bg-surface-3 hover:border-border-strong",
          "transition-all duration-fast focus:outline-none",
        )}>
          <Avatar className="h-6 w-6">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-bold">{initial}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-[12px] font-medium text-foreground leading-none max-w-[72px] truncate">
            {profile?.name?.split(" ")[0] ?? "Super Admin"}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-surface-1 border-border-subtle shadow-lg">
        <DropdownMenuLabel className="text-[13px]">{profile?.name ?? "Super Admin"}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border-subtle" />
        <DropdownMenuItem asChild className="gap-2 text-[13px] cursor-pointer">
          <Link to="/platform/admin-control/platform-settings"><UserRound className="h-3.5 w-3.5 text-muted-foreground" />Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border-subtle" />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleLogout(); }}
          className="gap-2 text-[13px] text-danger focus:text-danger focus:bg-danger/8 cursor-pointer">
          <LogOut className="h-3.5 w-3.5" />Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function SuperAdminLayout() {
  const location = useLocation();
  const { title, description } = getSAPageMeta(location.pathname);
  const { data: user } = useQuery({
    queryKey: ["sa_topbar", "user"],
    queryFn: async () => { const { data } = await supabase.auth.getUser(); return data.user ?? null; },
    staleTime: 120_000,
  });

  return (
    <CollegeProvider>
      <SessionGuard />
      <SidebarProvider defaultOpen>
        <div className="min-h-svh flex w-full bg-background">
          <SuperAdminSidebar />
          <SidebarInset className="flex flex-col min-w-0">
            <header className={cn(
              "sticky top-0 z-40 glass-surface border-b border-border-subtle/70",
              "shadow-[0_1px_0_hsl(var(--border-subtle)/0.8)]",
            )}>
              <div className="flex h-[52px] items-center gap-2.5 px-3 md:px-5">
                <SidebarTrigger className="h-8 w-8 shrink-0" />
                <div className="hidden md:block h-4 w-px bg-border-subtle shrink-0" />
                <div className="min-w-0 flex-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={location.pathname}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: msToSeconds(MOTION_MS.fast), ease: [0, 0, 0.2, 1] }}
                    >
                      <p className="text-[14px] font-semibold text-foreground leading-none truncate">{title}</p>
                      {description && <p className="hidden sm:block text-[11px] text-muted-foreground mt-0.5 leading-none truncate">{description}</p>}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {user && <SAProfileMenu userId={user.id} />}
                </div>
              </div>
            </header>

            <main className="flex-1 min-w-0 py-5 md:px-6 md:pb-6 pb-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  variants={PAGE_TRANSITION_VARIANTS} initial="initial" animate="animate" exit="exit"
                  transition={PAGE_TRANSITION} className="w-full h-full"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </main>

            <footer className="border-t border-border-subtle/60 bg-surface-1/50 shrink-0 hidden md:block">
              <div className="px-5 py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <img src={BRANDING.logo} alt={BRANDING.name} className="h-4 w-4 object-contain opacity-50" />
                  <span className="text-[11px] text-muted-foreground/50 font-medium">{BRANDING.name} Platform</span>
                </div>
                <p className="text-[11px] text-muted-foreground/35 text-right">Super Admin · Developed by Atharv Jadhav</p>
              </div>
            </footer>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </CollegeProvider>
  );
}
