import { Outlet, useLocation } from "react-router-dom";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import AppSidebar from "@/components/layout/AppSidebar";

const FOOTER_LINE = "Developed by - Atharv Jadhav - Department Of Computer Science";

const PAGE_META: Record<string, { title: string; description: string }> = {
  "/app/dashboard": { title: "Dashboard", description: "Your academic overview at a glance" },
  "/app/admin": { title: "Admin", description: "System administration and management" },
  "/app/attendance": { title: "Attendance", description: "View your attendance history and records" },
  "/app/programmes": { title: "Learning Circles", description: "Browse and track your enrolled programmes" },
  "/app/lectures": { title: "Lectures", description: "Upcoming and past lecture sessions" },
  "/app/inbox": { title: "Inbox", description: "Your notifications and messages" },
  "/app/id-card": { title: "Digital ID", description: "Your institutional identity card" },
  "/app/profile": { title: "Profile", description: "Manage your personal information" },
  "/app/leaderboard": { title: "Leaderboard", description: "Student rankings by points earned" },
  "/app/announcements": { title: "Announcements", description: "Important notices and updates" },
  "/app/events": { title: "Events", description: "Upcoming campus events" },
  "/app/polls": { title: "Polls", description: "Active polls and surveys" },
  "/app/daily": { title: "Daily", description: "Daily content and inspiration" },
};

function getPageMeta(pathname: string) {
  for (const [prefix, meta] of Object.entries(PAGE_META)) {
    if (pathname.startsWith(prefix)) return meta;
  }
  return { title: "Dashboard", description: "Your academic overview at a glance" };
}

export default function AppLayout() {
  const location = useLocation();
  const { title, description } = getPageMeta(location.pathname);

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-svh flex w-full bg-background">
        <AppSidebar />

        <SidebarInset>
          <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
            <div className="flex h-14 items-center gap-3 px-4 md:px-6">
              <SidebarTrigger className="-ml-1 md:hidden" />
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-foreground">{title}</h1>
                <p className="truncate text-xs text-muted-foreground hidden sm:block">{description}</p>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
            <div className="mx-auto max-w-[1280px]">
              <Outlet />
            </div>
          </main>

          <footer className="border-t border-border bg-card/60">
            <div className="px-4 py-3 md:px-6">
              <p className="text-center text-xs text-muted-foreground">{FOOTER_LINE}</p>
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
