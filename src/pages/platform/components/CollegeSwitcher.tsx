import { Building2, ChevronDown } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollegeContext } from "@/contexts/CollegeContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CollegeSwitcher({ className }: { className?: string }) {
  const { colleges, activeCollege, setActiveCollegeId, isLoading } = useCollegeContext();

  if (isLoading) {
    return <div className="h-9 w-48 rounded-lg bg-surface-2 animate-pulse" />;
  }

  if (colleges.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 text-muted-foreground text-sm">
        <Building2 className="w-4 h-4" />
        <span>No colleges</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "gap-2 border-border-subtle bg-surface-2 hover:bg-surface-1 text-foreground h-9 min-w-0 max-w-[240px]",
            className
          )}
        >
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: activeCollege?.primary_color ?? "hsl(var(--primary))" }}
          />
          <span className="truncate text-sm font-medium">
            {activeCollege?.college_name ?? "Select College"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-surface-1 border-border-subtle min-w-[220px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
          College Context
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border-subtle" />
        {colleges.map((college) => (
          <DropdownMenuItem
            key={college.id}
            className={cn(
              "gap-2 cursor-pointer",
              activeCollege?.id === college.id && "bg-primary/10 text-primary"
            )}
            onClick={() => setActiveCollegeId(college.id)}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: college.primary_color ?? "hsl(var(--primary))" }}
            />
            <span className="flex-1 truncate text-sm">{college.college_name}</span>
            {!college.is_active && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactive</Badge>
            )}
            {activeCollege?.id === college.id && (
              <span className="text-[10px] text-primary font-medium">Active</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
