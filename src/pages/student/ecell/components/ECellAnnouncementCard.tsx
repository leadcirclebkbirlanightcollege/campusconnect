import React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Megaphone, Pin, AlertCircle, Clock, Sparkles } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface ECellAnnouncementItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  is_pinned?: boolean | null;
  created_at: string;
  expires_at?: string | null;
}

interface ECellAnnouncementCardProps {
  announcement: ECellAnnouncementItem;
  className?: string;
}

export function ECellAnnouncementCard({
  announcement,
  className,
}: ECellAnnouncementCardProps) {
  const isUrgent = announcement.priority === "critical" || announcement.priority === "high";
  const isPinned = Boolean(announcement.is_pinned);
  const createdDate = new Date(announcement.created_at);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border border-[#E8D98A]/50 dark:border-[#3D3523] bg-card p-4 sm:p-4.5",
        "transition-all duration-200 hover:shadow-md hover:border-[#C08634]/60 group",
        isPinned && "border-l-4 border-l-[#C08634]",
        isUrgent && !isPinned && "border-l-4 border-l-[#FCE541]",
        className
      )}
      style={{
        boxShadow: "0 2px 10px -2px rgba(192, 134, 52, 0.06)",
      }}
    >
      {/* Top Header: Badge, Indicators, Time */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isPinned && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider bg-[#C08634] text-white">
              <Pin className="h-2.5 w-2.5" /> Pinned
            </span>
          )}

          {isUrgent && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider bg-[#FCE541] text-[#000000] border border-[#C08634]/40">
              <AlertCircle className="h-2.5 w-2.5 text-amber-700" /> Important
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-[10.5px] text-[#593018] dark:text-[#D8C7A5] font-medium">
            <Sparkles className="h-3 w-3 text-[#C08634]" /> E-Cell Notice
          </span>
        </div>

        <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
          {formatDistanceToNow(createdDate, { addSuffix: true })}
        </span>
      </div>

      {/* Main Title & Content */}
      <h4 className="text-[14.5px] sm:text-[15.5px] font-bold text-[#000000] dark:text-white tracking-tight leading-snug">
        {announcement.title}
      </h4>

      <p className="text-[12.5px] text-[#593018]/85 dark:text-muted-foreground leading-relaxed mt-1.5 line-clamp-3">
        {announcement.description}
      </p>

      {/* Date detail */}
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 mt-3 pt-2 border-t border-[#E8D98A]/30">
        <Clock className="h-3 w-3 text-[#C08634]" />
        <span>Published {format(createdDate, "dd MMMM yyyy")}</span>
      </div>
    </div>
  );
}
