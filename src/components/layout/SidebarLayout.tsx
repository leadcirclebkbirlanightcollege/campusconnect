import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/AppSidebar";

function MobileAutoCloseOnRouteChange() {
  const location = useLocation();
  const { isMobile, openMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (!isMobile) return;
    if (!openMobile) return;
    setOpenMobile(false);
  }, [isMobile, location.pathname, location.hash, openMobile, setOpenMobile]);

  return null;
}

export default function SidebarLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-svh flex w-full bg-gradient-to-br from-background via-background to-primary/5">
        {/* Ambient background effect */}
        <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none" />
        <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />

        <AppSidebar />

        <SidebarInset>
          <header className="sticky top-0 z-50 border-b border-border/40 bg-card/80 backdrop-blur-xl shadow-sm">
            <div className="flex h-14 items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="mr-1" />
              <Link to="/" className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-premium flex items-center justify-center shadow-premium">
                  <span className="text-primary-foreground font-bold">CC</span>
                </div>
                <span className="font-semibold">Campus Connect</span>
              </Link>
            </div>
          </header>

          <MobileAutoCloseOnRouteChange />

          <main className="flex-1 relative z-10">{children}</main>

          <footer className="relative z-10 border-t border-border/40 bg-card/60 backdrop-blur-sm mt-auto">
            <div className="px-4 py-6">
              <div className="text-center text-sm text-muted-foreground">
                <p>&copy; 2026 Campus Connect. All rights reserved.</p>
                <p className="mt-1">Empowering academic excellence through technology</p>
                <p className="mt-2">Developed by - Atharv Jadhav - Department Of Computer Science</p>
              </div>
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
