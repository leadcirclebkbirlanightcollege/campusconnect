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
          <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-1/90 backdrop-blur-md shadow-xs">
            <div className="flex h-[52px] items-center gap-3 px-4 md:px-5">
              <SidebarTrigger className="-ml-1 md:hidden h-8 w-8" />
              <div className="h-4 w-px bg-border-subtle hidden md:block" />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[14px] font-semibold text-foreground leading-none">{title}</h1>
                <p className="truncate text-[11px] text-muted-foreground mt-0.5 leading-none hidden sm:block">{description}</p>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
            <div className="mx-auto max-w-[1280px]">
              <Outlet />
            </div>
          </main>

          <footer className="border-t border-border-subtle bg-surface-1/60">
            <div className="px-4 py-2.5 md:px-6">
              <p className="text-center text-[11px] text-muted-foreground/60">{FOOTER_LINE}</p>
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
