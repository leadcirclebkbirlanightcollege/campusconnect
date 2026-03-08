import { BookOpen, Users, ShieldCheck, BarChart3, Bell, Megaphone, ScanLine, FileEdit } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const actions = [
  { icon: BookOpen,    title: "Create Lecture",  tab: "lectures",      color: "text-primary",  bg: "bg-primary/10" },
  { icon: Users,       title: "Students",        tab: "students",      color: "text-success",  bg: "bg-success/10" },
  { icon: ShieldCheck, title: "Override",        tab: "attendance",    color: "text-warning",  bg: "bg-warning/10" },
  { icon: BarChart3,   title: "Monthly Report",  tab: "monthly",       color: "text-accent",   bg: "bg-accent/10" },
  { icon: Megaphone,   title: "Announcements",   tab: "announcements", color: "text-premium",  bg: "bg-premium/10" },
  { icon: Bell,        title: "Notifications",   tab: "notifications", color: "text-primary",  bg: "bg-primary/10" },
  { icon: FileEdit,    title: "Corrections",     tab: "corrections",   color: "text-danger",   bg: "bg-danger/10" },
  { icon: ScanLine,    title: "ID Scanner",      tab: "scanner",       color: "text-success",  bg: "bg-success/10" },
] as const;

export default function QuickActionsGrid({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden shadow-xs">
      <div className="px-4 py-3.5 border-b border-border-subtle">
        <p className="text-base font-semibold text-foreground">Quick Actions</p>
        <p className="text-xs text-muted-foreground mt-0.5">Jump to any module instantly</p>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                "flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl border border-transparent min-h-[80px] justify-center",
                "hover:border-border-subtle hover:bg-surface-2 active:scale-95 transition-all duration-120 cursor-pointer"
              )}
            >
              <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", a.bg)}>
                <Icon className={cn("h-5 w-5", a.color)} />
              </div>
              <span className="text-xs text-muted-foreground font-medium text-center leading-tight">
                {a.title}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
