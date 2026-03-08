import { BookOpen, Users, ShieldCheck, BarChart3, Bell, Megaphone, ScanLine, FileEdit } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const actions = [
  { icon: BookOpen,    title: "Create Lecture",  description: "Schedule new session", tab: "lectures",      color: "text-primary",  bg: "bg-primary/10" },
  { icon: Users,       title: "Students",        description: "View & edit profiles",  tab: "students",      color: "text-success",  bg: "bg-success/10" },
  { icon: ShieldCheck, title: "Override",        description: "Fix attendance issues", tab: "attendance",    color: "text-warning",  bg: "bg-warning/10" },
  { icon: BarChart3,   title: "Monthly Report",  description: "Attendance records",    tab: "monthly",       color: "text-accent",   bg: "bg-accent/10" },
  { icon: Megaphone,   title: "Announcements",   description: "Post to students",      tab: "announcements", color: "text-premium",  bg: "bg-premium/10" },
  { icon: Bell,        title: "Notifications",   description: "Send push alerts",      tab: "notifications", color: "text-primary",  bg: "bg-primary/10" },
  { icon: FileEdit,    title: "Corrections",     description: "Edit attendance logs",  tab: "corrections",   color: "text-danger",   bg: "bg-danger/10" },
  { icon: ScanLine,    title: "ID Scanner",      description: "Scan student ID cards", tab: "scanner",       color: "text-success",  bg: "bg-success/10" },
] as const;

export default function QuickActionsGrid({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden shadow-xs">
      <div className="px-4 py-3 border-b border-border-subtle">
        <p className="text-sm font-semibold text-foreground">Quick Actions</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Jump to any module instantly</p>
      </div>
      <div className="p-3 grid grid-cols-4 gap-2">
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.button
              key={a.tab + a.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15, delay: i * 0.03 }}
              onClick={() => onNavigateTab(a.tab)}
              className={cn(
                "flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border border-transparent",
                "hover:border-border-subtle hover:bg-surface-2 active:scale-95 transition-all duration-120 cursor-pointer"
              )}
            >
              <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", a.bg)}>
                <Icon className={cn("h-4 w-4", a.color)} />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">
                {a.title}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
