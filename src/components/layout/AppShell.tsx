 import { ReactNode, useEffect } from "react";
 import { useQueryClient } from "@tanstack/react-query";
 
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
 import { StudentSidebar } from "./StudentSidebar";

interface AppShellProps {
  children: ReactNode;
}

const AppShell = ({ children }: AppShellProps) => {
  const qc = useQueryClient();
  const { user, role } = useAuth();

  useEffect(() => {
    const uid = user?.id;
    if (!uid || role !== "student") return;

    const channel = supabase
       .channel(`appshell_notifications_${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notification_recipients", filter: `user_id=eq.${uid}` },
        () => {
           qc.invalidateQueries({ queryKey: ["sidebar", "unread", uid] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc, role]);

  return (
     <SidebarProvider>
       <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5">
         {/* Ambient background effect */}
         <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none" />
         <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />
 
         <StudentSidebar />
 
         <div className="flex flex-col flex-1 min-w-0">
           {/* Mobile trigger */}
           <header className="sticky top-0 z-40 border-b border-border/40 bg-card/80 backdrop-blur-xl lg:hidden">
             <div className="flex items-center gap-2 px-4 py-3">
               <SidebarTrigger />
               <span className="text-lg font-bold bg-gradient-premium bg-clip-text text-transparent">
                 Campus Connect
               </span>
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
       </div>
     </SidebarProvider>
  );
};

export default AppShell;
