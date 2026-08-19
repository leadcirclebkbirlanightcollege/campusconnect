/**
 * HubGrid — standardized navigation tile grid used by tab hub screens.
 * Every tile is a real route link (deep-linkable, refresh-safe) with
 * native press feedback.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface HubTile {
  label: string;
  description?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "info" | "danger";
  badge?: string | number;
}

const TONE: Record<NonNullable<HubTile["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info:    "bg-info/10 text-info",
  danger:  "bg-danger/10 text-danger",
};

const MotionLink = motion(Link);

export function HubGrid({ tiles, columns = 2 }: { tiles: HubTile[]; columns?: 1 | 2 }) {
  return (
    <div className={cn("grid gap-3", columns === 2 ? "grid-cols-2" : "grid-cols-1")}>
      {tiles.map(({ label, description, href, icon: Icon, tone = "primary", badge }) => (
        <MotionLink
          key={href + label}
          to={href}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "tap-ripple group relative flex flex-col gap-2.5 overflow-hidden",
            "rounded-[20px] border border-border-subtle bg-surface-1 p-4",
            "shadow-[0_10px_30px_-22px_hsl(var(--foreground)/0.45)]",
            "transition-colors duration-150 hover:border-primary/35",
          )}
        >
          <div className="flex items-start justify-between">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", TONE[tone])}>
              <Icon className="h-5 w-5" />
            </span>
            {badge !== undefined ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                {badge}
              </span>
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-heading text-[14px] font-bold leading-tight text-foreground truncate">{label}</p>
            {description && (
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
        </MotionLink>
      ))}
    </div>
  );
}
