import { BookOpen, Users, ShieldCheck, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const actions = [
  {
    icon: BookOpen,
    title: "Create Lecture",
    description: "Schedule a new lecture session",
    tab: "lectures",
  },
  {
    icon: Users,
    title: "Allot Programme",
    description: "Assign students to learning circles",
    tab: "allotments",
  },
  {
    icon: ShieldCheck,
    title: "Manual Override",
    description: "Resolve student attendance issues",
    tab: "attendance",
  },
  {
    icon: BarChart3,
    title: "View Reports",
    description: "Monthly attendance records",
    tab: "monthly",
  },
] as const;

export default function QuickActionsGrid({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Card
              key={a.tab + a.title}
              className="group cursor-pointer border-border/60 hover:border-primary/30 hover:shadow-md transition-all"
              onClick={() => onNavigateTab(a.tab)}
            >
              <CardContent className="flex flex-col items-center p-5 text-center">
                <div className="rounded-xl bg-primary/10 p-3 mb-3 group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">{a.title}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{a.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
