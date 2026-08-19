/**
 * CAMPUS CONNECT — POLISHED EMPTY STATE COMPONENT
 * Consistent, animated empty states with illustration, message, and CTA.
 */

import * as React from "react";
import { motion } from "framer-motion";
import { Inbox } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";


interface EmptyStateProps {
  /** Large emoji or icon component to show */
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-10 px-4" : "py-16 px-6",
        className,
      )}
    >
      {/* Illustration */}
      <div className={cn(
        "relative flex items-center justify-center rounded-2xl overflow-hidden",
        compact ? "h-12 w-12 mb-3" : "h-16 w-16 mb-4",
        "bg-gradient-to-br from-surface-3 via-surface-2 to-surface-1 border border-border-subtle shadow-card",
      )}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        {emoji ? (
          <span className={cn("relative select-none", compact ? "text-2xl" : "text-3xl")}>{emoji}</span>
        ) : icon ? (
          <div className="relative text-primary/80">{icon}</div>
        ) : (
          <Inbox className={cn("relative text-primary/70", compact ? "h-5 w-5" : "h-7 w-7")} strokeWidth={1.75} />
        )}
      </div>

      {/* Text */}
      <h3 className={cn(
        "font-heading font-bold text-foreground tracking-tight",
        compact ? "text-[14px]" : "text-[17px]",
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          "text-muted-foreground mt-1.5 max-w-xs leading-relaxed",
          compact ? "text-[11.5px]" : "text-[12.5px]",
        )}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className={cn("flex items-center gap-2", compact ? "mt-3" : "mt-5")}>
          {action && (
            <Button
              size={compact ? "sm" : "default"}
              onClick={action.onClick}
              asChild={!!action.href}
              className="press-scale"
            >
              {action.href ? <a href={action.href}>{action.label}</a> : action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              size={compact ? "sm" : "default"}
              onClick={secondaryAction.onClick}
              asChild={!!secondaryAction.href}
              className="press-scale"
            >
              {secondaryAction.href ? <a href={secondaryAction.href}>{secondaryAction.label}</a> : secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

/** Inline card wrapper — use for empty states inside bordered cards */
export function EmptyStateCard({
  className,
  children,
  ...props
}: EmptyStateProps & { children?: React.ReactNode }) {
  return (
    <div className={cn(
      "rounded-xl border border-border-subtle bg-surface-1 shadow-xs",
      className,
    )}>
      {children ?? <EmptyState {...props} />}
    </div>
  );
}
