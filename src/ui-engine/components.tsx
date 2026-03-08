/**
 * CORE UI COMPONENTS — Reusable primitives for Campus Connect
 *
 * GlassSurface     — frosted glass panel
 * ElevatedCard     — depth card with optional interaction
 * ActionButton     — touch-optimized CTA
 * MetricDisplay    — stat number + label
 * CircularProgress — ring progress indicator
 * SectionContainer — re-exported from page-engine for convenience
 *
 * All colors via semantic tokens — NO hardcoded values.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════════
   GlassSurface — frosted glass panel
══════════════════════════════════════════════════════════════════ */
interface GlassSurfaceProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

export function GlassSurface({ children, className, as: Tag = "div" }: GlassSurfaceProps) {
  return (
    // @ts-ignore — dynamic tag
    <Tag
      className={cn(
        "glass-surface rounded-xl",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ElevatedCard — depth card with optional interaction
══════════════════════════════════════════════════════════════════ */
interface ElevatedCardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  padding?: "sm" | "md" | "lg" | "none";
  elevation?: 1 | 2 | 3;
}

const CARD_PADDING = {
  none: "",
  sm:   "p-3",
  md:   "p-4",
  lg:   "p-5",
} as const;

const CARD_ELEVATION = {
  1: "bg-card border border-border-subtle shadow-xs",
  2: "bg-surface-1 border border-border-subtle shadow-sm",
  3: "bg-surface-2 border border-border-strong shadow-md",
} as const;

export function ElevatedCard({
  children,
  className,
  interactive = false,
  onClick,
  padding = "md",
  elevation = 1,
}: ElevatedCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl",
        CARD_ELEVATION[elevation],
        CARD_PADDING[padding],
        interactive && [
          "cursor-pointer select-none",
          "transition-all duration-[150ms] ease-[cubic-bezier(0,0,0.2,1)]",
          "hover:-translate-y-[1px] hover:shadow-md",
          "active:scale-[0.98] active:shadow-xs",
        ],
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ActionButton — touch-optimized CTA (min 48px tap target)
══════════════════════════════════════════════════════════════════ */
type ActionVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ActionSize    = "sm" | "md" | "lg";

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant;
  size?: ActionSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const ACTION_VARIANTS: Record<ActionVariant, string> = {
  primary:   "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 shadow-sm",
  secondary: "bg-surface-2 text-foreground border border-border-subtle hover:bg-surface-3",
  ghost:     "text-foreground hover:bg-surface-2",
  danger:    "bg-danger text-danger-foreground hover:bg-danger/90",
  success:   "bg-success text-success-foreground hover:bg-success/90",
};

const ACTION_SIZES: Record<ActionSize, string> = {
  sm: "h-9 px-3 text-[12px] rounded-lg gap-1.5",
  md: "h-11 px-4 text-[13px] rounded-xl gap-2 min-h-[48px]",
  lg: "h-14 px-6 text-[15px] rounded-2xl gap-2.5 font-semibold",
};

export function ActionButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  className,
  disabled,
  ...props
}: ActionButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium",
        "transition-all duration-[120ms] ease-[cubic-bezier(0,0,0.2,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "active:scale-[0.97]",
        "disabled:opacity-50 disabled:pointer-events-none",
        ACTION_VARIANTS[variant],
        ACTION_SIZES[size],
        fullWidth && "w-full",
        className,
      )}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
      ) : (
        <>
          {icon && iconPosition === "left"  && <span className="shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === "right" && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MetricDisplay — stat number with label
══════════════════════════════════════════════════════════════════ */
interface MetricDisplayProps {
  value: string | number;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const METRIC_SIZES = {
  sm: { value: "text-[20px] font-bold", label: "text-[11px]" },
  md: { value: "text-[28px] font-bold", label: "text-[12px]" },
  lg: { value: "text-[36px] font-bold", label: "text-[13px]" },
} as const;

const TREND_CLASSES = {
  up:      "text-success",
  down:    "text-danger",
  neutral: "text-muted-foreground",
} as const;

export function MetricDisplay({
  value,
  label,
  sublabel,
  icon,
  trend,
  trendValue,
  size = "md",
  className,
}: MetricDisplayProps) {
  const sizes = METRIC_SIZES[size];
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex items-center gap-2">
        {icon && <span className="shrink-0 text-primary">{icon}</span>}
        <span className={cn(sizes.value, "tabular-nums leading-none text-foreground tracking-tight")}>
          {value}
        </span>
        {trend && trendValue && (
          <span className={cn("text-[11px] font-semibold", TREND_CLASSES[trend])}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
          </span>
        )}
      </div>
      <span className={cn(sizes.label, "text-muted-foreground font-medium leading-none")}>
        {label}
      </span>
      {sublabel && (
        <span className="text-[11px] text-muted-foreground/60 leading-none mt-0.5">
          {sublabel}
        </span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CircularProgress — SVG ring progress indicator
══════════════════════════════════════════════════════════════════ */
interface CircularProgressProps {
  value: number;       // 0–100
  size?: number;       // px diameter
  stroke?: number;     // stroke width
  label?: string;
  sublabel?: string;
  color?: "primary" | "success" | "warning" | "danger" | "gold";
  className?: string;
  showValue?: boolean;
}

const RING_COLORS: Record<string, string> = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  danger:  "hsl(var(--danger))",
  gold:    "hsl(var(--gold))",
} as const;

export function CircularProgress({
  value,
  size = 80,
  stroke = 7,
  label,
  sublabel,
  color = "primary",
  className,
  showValue = true,
}: CircularProgressProps) {
  const r       = (size - stroke) / 2;
  const circ    = 2 * Math.PI * r;
  const offset  = circ - (Math.min(Math.max(value, 0), 100) / 100) * circ;
  const cx      = size / 2;

  return (
    <div className={cn("relative inline-flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke="hsl(var(--border-subtle))"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={RING_COLORS[color]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0,0,0.2,1)" }}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[12px] font-bold tabular-nums text-foreground leading-none">
              {Math.round(value)}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">
          {label}
        </span>
      )}
      {sublabel && (
        <span className="text-[10px] text-muted-foreground/60 text-center leading-tight">
          {sublabel}
        </span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   StatusBadge — semantic status indicator
══════════════════════════════════════════════════════════════════ */
type StatusType = "success" | "warning" | "danger" | "info" | "neutral" | "live";

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  dot?: boolean;
  className?: string;
}

const STATUS_CLASSES: Record<StatusType, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger:  "bg-danger/10  text-danger  border-danger/20",
  info:    "bg-primary/10 text-primary  border-primary/20",
  neutral: "bg-muted      text-muted-foreground border-border-subtle",
  live:    "bg-success/10 text-success border-success/20",
};

export function StatusBadge({ status, label, dot = true, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
      STATUS_CLASSES[status],
      className,
    )}>
      {dot && (
        <span className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "live" ? "animate-pulse bg-success" : "bg-current",
        )} />
      )}
      {label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Divider — semantic section divider
══════════════════════════════════════════════════════════════════ */
interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (!label) {
    return <div className={cn("h-px bg-border-subtle", className)} />;
  }
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1 h-px bg-border-subtle" />
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/50 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LoadingDots — inline loading indicator
══════════════════════════════════════════════════════════════════ */
export function LoadingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current"
          style={{
            animation: "live-pulse 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EmptySlate — empty state with icon
══════════════════════════════════════════════════════════════════ */
interface EmptySlateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptySlate({ icon, title, description, action, className }: EmptySlateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3 py-12 px-6 text-center",
      className,
    )}>
      {icon && (
        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-[14px] font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-[12px] text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
