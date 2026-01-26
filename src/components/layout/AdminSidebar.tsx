 import { Link, useLocation, useNavigate } from "react-router-dom";
 import { LayoutDashboard, Users, BookOpen, ClipboardCheck, CalendarRange, Bell, TrendingUp, Trophy, UserRound, LogOut } from "lucide-react";
 
 import { supabase } from "@/integrations/supabase/client";
 
 import {
   Sidebar,
   SidebarContent,
   SidebarGroup,
   SidebarGroupContent,
   SidebarGroupLabel,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
   useSidebar,
 } from "@/components/ui/sidebar";
 import { Separator } from "@/components/ui/separator";
 
 const navItems = [
   { title: "Admin Dashboard", url: "/admin", icon: LayoutDashboard, hash: "" },
   { title: "Students", url: "/admin", icon: Users, hash: "students" },
   { title: "Lectures", url: "/admin", icon: BookOpen, hash: "lectures" },
   { title: "Attendance Control", url: "/admin", icon: ClipboardCheck, hash: "attendance_control" },
   { title: "Monthly Attendance", url: "/admin", icon: CalendarRange, hash: "monthly" },
   { title: "Notifications", url: "/admin", icon: Bell, hash: "notifications" },
   { title: "Points", url: "/admin", icon: TrendingUp, hash: "points" },
   { title: "Leaderboard", url: "/leaderboard", icon: Trophy, hash: "" },
   { title: "Profile", url: "/admin", icon: UserRound, hash: "admin_profile" },
 ];
 
 export function AdminSidebar() {
   const { state } = useSidebar();
   const location = useLocation();
   const navigate = useNavigate();
   const isCollapsed = state === "collapsed";
 
   const currentPath = location.pathname;
   const currentHash = location.hash.replace("#", "");
 
   const handleLogout = async () => {
     await supabase.auth.signOut();
     navigate("/auth", { replace: true });
   };
 
   const isActive = (url: string, hash: string) => {
     if (url === "/leaderboard") return currentPath === "/leaderboard";
     if (hash === "") return currentPath === "/admin" && currentHash === "";
     return currentPath === url && currentHash === hash;
   };
 
   return (
     <Sidebar collapsible="icon">
       <SidebarContent className="flex flex-col h-full">
         {/* Logo */}
         <div className="p-4 group-data-[collapsible=icon]:px-2">
           <Link to="/admin" className="flex items-center gap-2 group">
             <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center shadow-premium group-hover:shadow-xl transition-all flex-shrink-0">
               <LayoutDashboard className="w-6 h-6 text-primary-foreground" />
             </div>
             <div className="group-data-[collapsible=icon]:hidden">
                 <span className="text-lg font-bold bg-gradient-premium bg-clip-text text-transparent block">
                   Campus Connect
                 </span>
                 <span className="text-xs text-muted-foreground">Admin</span>
               </div>
           </Link>
         </div>
 
         <Separator />
 
         {/* Navigation */}
         <SidebarGroup className="flex-1">
           <SidebarGroupLabel className="group-data-[collapsible=icon]:sr-only">Management</SidebarGroupLabel>
           <SidebarGroupContent>
             <SidebarMenu>
               {navItems.map((item) => {
                 const active = isActive(item.url, item.hash);
                 const linkUrl = item.hash ? `${item.url}#${item.hash}` : item.url;
 
                 return (
                   <SidebarMenuItem key={item.title}>
                     <SidebarMenuButton asChild isActive={active}>
                       <Link to={linkUrl} className="flex items-center gap-3">
                         <item.icon className="h-5 w-5" />
                         <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
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