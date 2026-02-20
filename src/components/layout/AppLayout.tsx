import { Outlet, useLocation } from "react-router-dom";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import AppSidebar from "@/components/layout/AppSidebar";

const FOOTER_LINE = "Developed by - Atharv Jadhav - Department Of Computer Science";

function usePageTitle(pathname: string) {
  if (pathname.startsWith("/app/admin")) return "Admin";
  if (pathname.startsWith("/app/attendance")) return "Attendance";
  if (pathname.startsWith("/app/programmes")) return "Learning Circles";
  if (pathname.startsWith("/app/lectures")) return "Lectures";
  if (pathname.startsWith("/app/inbox")) return "Inbox";
  if (pathname.startsWith("/app/id-card")) return "Digital ID";
  if (pathname.startsWith("/app/profile")) return "Profile";
  if (pathname.startsWith("/app/leaderboard")) return "Leaderboard";
  if (pathname.startsWith("/app/announcements")) return "Announcements";
  if (pathname.startsWith("/app/events")) return "Events";
  if (pathname.startsWith("/app/polls")) return "Polls";
  if (pathname.startsWith("/app/daily")) return "Daily";
  return "Dashboard";
}

export default function AppLayout() {
  const location = useLocation();
  const title = usePageTitle(location.pathname);

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-svh flex w-full bg-gradient-to-br from-background via-background to-primary/5">
        {/* ambient */}
        <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none" />
        <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />

        <AppSidebar />

        <SidebarInset>
          <header className="sticky top-0 z-40 border-b border-border/40 bg-card/80 backdrop-blur-xl">
            <div className="flex h-12 items-center gap-3 px-4 md:px-6">
              <SidebarTrigger className="-ml-1 md:hidden" />
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-foreground">{title}</h1>
              </div>
            </div>
          </header>

          <main className="relative z-10 flex-1 px-4 py-6 md:px-6 md:py-8">
            <Outlet />
          </main>

          <footer className="relative z-10 border-t border-border/40 bg-card/60 backdrop-blur-sm">
            <div className="px-4 py-4 md:px-6">
              <p className="text-center text-xs text-muted-foreground">{FOOTER_LINE}</p>
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
