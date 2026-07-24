/**
 * ListItem — premium native list row used across student/faculty/admin lists
 * (notifications, messages, announcements, students, faculty, departments…).
 *
 * Renders as a plain <div> or as a router <Link> when `to` is supplied.
 * Provides consistent tap targets, leading avatar/icon, meta trail, and
 * chevron affordance for drill-in rows.
 */

import * as React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListItemProps {
  /** Leading slot — avatar, icon tile, image. */
  leading?: React.ReactNode;
  /** Primary line. */
  title: React.ReactNode;
  /** Secondary line — description or preview. */
  subtitle?: React.ReactNode;
  /** Meta trailing text (timestamp, count). */
  meta?: React.ReactNode;
  /** Trailing slot (badge, action button). Overrides chevron when supplied. */
  trailing?: React.ReactNode;
  /** Show chevron affordance. Auto-enabled when `to` or `onClick` is supplied. */
  chevron?: boolean;
  /** Router destination — makes the row a Link. */
  to?: string;
  onClick?: () => void;
  className?: string;
  /** Compact height for dense lists. */
  compact?: boolean;
  /** Highlight for unread/new state. */
  unread?: boolean;
}

export function ListItem({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  chevron,
  to,
  onClick,
  className,
  compact,
  unread,
}: ListItemProps) {
  const isInteractive = Boolean(to || onClick);
  const showChevron = chevron ?? (isInteractive && !trailing);

  const body = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn(
            "truncate font-semibold text-foreground tracking-tight",
            compact ? "text-[13.5px]" : "text-[14.5px]",
          )}>
            {title}
          </p>
          {unread && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
        </div>
        {subtitle && (
          <p className={cn(
            "truncate text-muted-foreground mt-0.5",
            compact ? "text-[11.5px]" : "text-[12.5px]",
          )}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2 text-muted-foreground">
        {meta && <span className="text-[11.5px] font-medium">{meta}</span>}
        {trailing}
        {showChevron && <ChevronRight className="h-4 w-4 text-muted-foreground/60" />}
      </div>
    </>
  );

  const classes = cn(
    "flex items-center gap-3 w-full text-left",
    compact ? "px-3.5 py-2.5" : "px-4 py-3",
    isInteractive && "transition-colors duration-fast hover:bg-surface-2 active:bg-surface-3",
    className,
  );

  if (to) {
    return <Link to={to} className={classes}>{body}</Link>;
  }
  if (onClick) {
    return <button type="button" onClick={onClick} className={classes}>{body}</button>;
  }
  return <div className={classes}>{body}</div>;
}

/**
 * ListCard — wraps ListItems in a rounded card with dividers between rows.
 * Use for grouped native-style lists (Settings, Profile, etc.).
 */
export function ListCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] bg-surface-1 border border-border-subtle overflow-hidden",
        "shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_8px_24px_-16px_hsl(var(--foreground)/0.10)]",
        "[&>*+*]:border-t [&>*+*]:border-border-subtle/70",
        className,
      )}
    >
      {children}
    </div>
  );
}
