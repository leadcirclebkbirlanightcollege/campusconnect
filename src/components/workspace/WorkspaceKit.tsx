/**
 * WorkspaceKit — shared premium UI primitives for the Faculty & Admin panels.
 *
 * Purely presentational: no data fetching, no business logic. These mirror the
 * student side's "Native Classic" language (curved hero, 20px radii, tokenised
 * surfaces) but tuned for dense desktop workspaces.
 */

import * as React from "react";
import { motion } from "framer-motion";
import { Loader2, Search, Inbox, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Hero ─────────────────────────────────────────────────────────────────── */

export interface WorkspaceStat {
  label: string;
  value: React.ReactNode;
}

interface WorkspaceHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  stats?: WorkspaceStat[];
  action?: React.ReactNode;
  className?: string;
}

export function WorkspaceHero({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  stats,
  action,
  className,
}: WorkspaceHeroProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
      className={cn(
        "relative overflow-hidden rounded-3xl px-5 py-5",
        "bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground",
        "shadow-lg",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(120%_90%_at_12%_0%,hsl(var(--primary-foreground)/0.22),transparent_58%)]"
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] opacity-80">
              {eyebrow}
            </p>
          )}
          <div className="flex items-center gap-2">
            {Icon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary-foreground/20 bg-primary-foreground/10">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <h1 className="font-heading text-[22px] font-black tracking-tight">{title}</h1>
          </div>
          {subtitle && <p className="mt-1 text-[12px] opacity-85">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {!!stats?.length && (
        <div className="relative mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 backdrop-blur-sm"
            >
              <p className="font-heading text-[18px] font-bold leading-none tabular-nums">{s.value}</p>
              <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide opacity-75">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.header>
  );
}

/* ── Page shell ───────────────────────────────────────────────────────────── */

export function WorkspacePage({
  children,
  className,
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0 space-y-5",
        wide ? "max-w-none" : "max-w-5xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── Toolbar (search + filters) ───────────────────────────────────────────── */

export function WorkspaceToolbar({
  search,
  onSearchChange,
  placeholder = "Search…",
  searchLabel = "Search",
  children,
  className,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  searchLabel?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {onSearchChange && (
        <div className="relative min-w-[200px] flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label={searchLabel}
            placeholder={placeholder}
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 rounded-2xl border-border-subtle bg-card pl-10 text-[13px]"
          />
        </div>
      )}
      {children}
    </div>
  );
}

/** Accessible segmented filter (radio semantics, arrow-key friendly). */
export function WorkspaceFilterGroup<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex gap-1.5 rounded-2xl bg-surface-2 p-1", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-9 rounded-xl px-3 text-[12px] font-semibold capitalize transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              active
                ? "bg-surface-1 text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── State views ──────────────────────────────────────────────────────────── */

export function WorkspaceLoading({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} role="status" aria-live="polite" aria-busy>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}

export function WorkspaceEmpty({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-surface-1/60 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle bg-surface-2">
        <Icon className="h-6 w-6 text-primary/70" />
      </span>
      <h3 className="font-heading text-[15px] font-bold tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function WorkspaceError({
  title = "Couldn't load this data",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <AlertTriangle className="mb-3 h-7 w-7 text-destructive" />
      <h3 className="font-heading text-[15px] font-bold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[12.5px] text-muted-foreground">{description}</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ── List / table surface ─────────────────────────────────────────────────── */

export function WorkspaceList({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "divide-y divide-border-subtle/60 overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-xs",
        className,
      )}
    >
      {children}
    </ul>
  );
}

export function WorkspaceRow({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const interactive = !!onClick;
  return (
    <li className={cn("bg-card", interactive && "transition-colors hover:bg-surface-2")}>
      {interactive ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "flex w-full min-h-[56px] items-center gap-3 px-4 py-3.5 text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            className,
          )}
        >
          {children}
        </button>
      ) : (
        <div className={cn("flex min-h-[56px] items-center gap-3 px-4 py-3.5", className)}>
          {children}
        </div>
      )}
    </li>
  );
}

/* ── Pagination ───────────────────────────────────────────────────────────── */

export function WorkspacePagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-3", className)}
    >
      <p className="text-[12px] text-muted-foreground tabular-nums">
        {total === 0 ? "No results" : `${from}–${to} of ${total}`}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" aria-hidden />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}

/* ── Status pill ──────────────────────────────────────────────────────────── */

export type WorkspaceStatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASS: Record<WorkspaceStatusTone, string> = {
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  info: "bg-primary/10 text-primary border-primary/25",
  neutral: "bg-muted text-muted-foreground border-border-subtle",
};

export function WorkspaceStatus({
  tone = "neutral",
  children,
  className,
}: {
  tone?: WorkspaceStatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Submit button with built-in pending state ────────────────────────────── */

export function WorkspaceSubmit({
  pending,
  children,
  pendingLabel = "Saving…",
  className,
  ...props
}: React.ComponentProps<typeof Button> & { pending?: boolean; pendingLabel?: string }) {
  return (
    <Button {...props} disabled={pending || props.disabled} className={className}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
