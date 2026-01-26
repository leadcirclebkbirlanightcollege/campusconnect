 import { ReactNode } from "react";
 import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
 import { AdminSidebar } from "./AdminSidebar";

interface AdminShellProps {
  children: ReactNode;
}

const AdminShell = ({ children }: AdminShellProps) => {
  return (
     <SidebarProvider>
       <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5">
         {/* Ambient background effect */}
         <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none" />
         <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />
 
         <AdminSidebar />
 
         <div className="flex flex-col flex-1 min-w-0">
           {/* Mobile trigger */}
           <header className="sticky top-0 z-40 border-b border-border/40 bg-card/80 backdrop-blur-xl lg:hidden">
             <div className="flex items-center gap-2 px-4 py-3">
               <SidebarTrigger />
               <span className="text-lg font-bold bg-gradient-premium bg-clip-text text-transparent">
                 Campus Connect
               </span>
               <span className="text-xs text-muted-foreground ml-auto">Admin</span>
             </div>
           </header>
 
           <main className="flex-1 relative z-10">
             {children}
           </main>
 
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

export default AdminShell;