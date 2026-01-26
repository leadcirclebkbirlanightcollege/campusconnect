 import { Link, useLocation, useNavigate } from "react-router-dom";
 import { useQuery } from "@tanstack/react-query";
 import { Home, BookOpen, CalendarDays, Trophy, Bell, UserRound, LogOut, Menu } from "lucide-react";
 
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 
 import {
   Sidebar,
   SidebarContent,
   SidebarGroup,
   SidebarGroupContent,
   SidebarGroupLabel,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
   SidebarTrigger,
   useSidebar,
 } from "@/components/ui/sidebar";
 import { Badge } from "@/components/ui/badge";
 import { Separator } from "@/components/ui/separator";
 
 const navItems = [
   { title: "Dashboard", url: "/student", icon: Home },
   { title: "Lectures", url: "/lectures", icon: BookOpen },
   { title: "Attendance", url: "/attendance", icon: CalendarDays },
   { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
   { title: "Notifications", url: "/student/inbox", icon: Bell },
   { title: "Profile", url: "/student/profile", icon: UserRound },
 ];
 
 export function StudentSidebar() {
   const { state } = useSidebar();
   const location = useLocation();
   const navigate = useNavigate();
   const { user } = useAuth();
   const isCollapsed = state === "collapsed";
 
   const currentPath = location.pathname;
 
   const unreadQuery = useQuery({
     queryKey: ["sidebar", "unread", user?.id],
     enabled: Boolean(user?.id),
     queryFn: async () => {
       const uid = user!.id;
       const { count, error } = await supabase
         .from("notification_recipients")
         .select("id", { count: "exact", head: true })
         .eq("user_id", uid)
         .is("read_at", null);
       if (error) throw error;
       return count ?? 0;
     },
   });
 
   const handleLogout = async () => {
     await supabase.auth.signOut();
     navigate("/auth", { replace: true });
   };
 
   const isActive = (url: string) => {
     if (url === "/student") return currentPath === "/student";
     return currentPath.startsWith(url);
   };
 
   return (
     <Sidebar collapsible="icon">
       <SidebarContent className="flex flex-col h-full">
         {/* Logo */}
         <div className="p-4 group-data-[collapsible=icon]:px-2">
           <Link to="/student" className="flex items-center gap-2 group">
             <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center shadow-premium group-hover:shadow-xl transition-all flex-shrink-0">
               <span className="text-primary-foreground font-bold text-lg">CC</span>
             </div>
             <span className="text-lg font-bold bg-gradient-premium bg-clip-text text-transparent group-data-[collapsible=icon]:hidden">
                 Campus Connect
               </span>
           </Link>
         </div>
 
         <Separator />
 
         {/* Navigation */}
         <SidebarGroup className="flex-1">
           <SidebarGroupLabel className="group-data-[collapsible=icon]:sr-only">Navigation</SidebarGroupLabel>
           <SidebarGroupContent>
             <SidebarMenu>
               {navItems.map((item) => {
                 const active = isActive(item.url);
                 const isNotifications = item.url === "/student/inbox";
                 const unreadCount = isNotifications ? (unreadQuery.data ?? 0) : 0;
 
                 return (
                   <SidebarMenuItem key={item.title}>
                     <SidebarMenuButton asChild isActive={active}>
                       <Link to={item.url} className="flex items-center gap-3">
                         <item.icon className="h-5 w-5" />
                         <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                         {isNotifications && unreadCount > 0 && (
                           <Badge className="ml-auto bg-accent text-accent-foreground group-data-[collapsible=icon]:hidden" aria-label={`${unreadCount} unread`}>
                             {unreadCount}
                           </Badge>
                         )}
                       </Link>
                     </SidebarMenuButton>
                   </SidebarMenuItem>
                 );
               })}
             </SidebarMenu>
           </SidebarGroupContent>
         </SidebarGroup>
 
         <Separator />
 
         {/* Logout */}
         <div className="p-4">
           <SidebarMenuButton onClick={handleLogout} className="w-full gap-3">
             <LogOut className="h-5 w-5" />
             <span className="group-data-[collapsible=icon]:hidden">Logout</span>
           </SidebarMenuButton>
         </div>
       </SidebarContent>
     </Sidebar>
   );
 }