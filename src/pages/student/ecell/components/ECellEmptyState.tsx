import React from "react";
import { Sparkles, RefreshCw } from "@/components/icons";
import { cn } from "@/lib/utils";

interface ECellEmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function ECellEmptyState({
  title,
  description,
  actionText,
  onAction,
  icon: Icon = Sparkles,
  className,
}: ECellEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-[#E8D98A]/50 dark:border-[#3D3523] bg-card p-8 sm:p-10 space-y-3",
        className
      )}
      style={{
        boxShadow: "0 2px 12px -3px rgba(192, 134, 52, 0.05)",
      }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FCE541]/20 text-[#C08634] border border-[#E8D98A]">
        <Icon className="h-6 w-6" />
      </div>

      <div className="max-w-sm space-y-1">
        <h4 className="text-[15px] font-bold text-[#000000] dark:text-white">
          {title}
        </h4>
        <p className="text-[12.5px] text-[#593018]/85 dark:text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold bg-[#FCE541] text-[#000000] border border-[#C08634]/50 hover:bg-[#FAD943] transition-all shadow-sm active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {actionText}
        </button>
      )}
    </div>
  );
}
