import React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface CoreMemberBadgeProps {
  variant?: "compact" | "profile" | "prominent";
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
}

/**
 * Official Campus Connect Core Member insignia icon.
 * Features deep navy, vibrant cyan, and electric blue geometry.
 * Distinct from a generic social media tick or student ID verification shield.
 */
export function CoreMemberInsignia({
  className,
  size = 18,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cc-core-bg" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B192C" />
          <stop offset="0.5" stopColor="#1E3A8A" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="cc-core-border" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="0.5" stopColor="#60A5FA" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="cc-core-sparkle" x1="7" y1="6" x2="17" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.7" stopColor="#BAE6FD" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>

      {/* 8-pointed scalloped official seal outer ring */}
      <path
        d="M12 2.5L14.4 4.8L17.7 4.5L19.2 7.4L22.2 8.9L21.8 12.2L23.3 15.2L20.8 17.5L20.3 20.8L17 21.2L15 23.7L12 22.2L9 23.7L7 21.2L3.7 20.8L3.2 17.5L0.7 15.2L2.2 12.2L1.8 8.9L4.8 7.4L6.3 4.5L9.6 4.8L12 2.5Z"
        fill="url(#cc-core-bg)"
        stroke="url(#cc-core-border)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Inner official team diamond & star sparkle */}
      <path
        d="M12 6.8L13.2 10.3C13.4 10.9 13.9 11.4 14.5 11.6L18 12.8L14.5 14C13.9 14.2 13.4 14.7 13.2 15.3L12 18.8L10.8 15.3C10.6 14.7 10.1 14.2 9.5 14L6 12.8L9.5 11.6C10.1 11.4 10.6 10.9 10.8 10.3L12 6.8Z"
        fill="url(#cc-core-sparkle)"
      />

      {/* Center radiant core dot */}
      <circle cx="12" cy="12.8" r="1.3" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * CoreMemberBadge
 *
 * Dedicated component representing officially recognized Campus Connect Core Team members.
 * Strictly decoupled from Student Identity Verification (is_verified).
 */
export function CoreMemberBadge({
  variant = "compact",
  size = "md",
  className,
  showTooltip = true,
}: CoreMemberBadgeProps) {
  const iconPixel = size === "sm" ? 14 : size === "lg" ? 22 : 18;

  const content = (() => {
    switch (variant) {
      case "profile":
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full",
              "bg-gradient-to-r from-[#0B192C]/95 via-[#0F284E]/90 to-[#0B192C]/95",
              "border border-[#38BDF8]/50 shadow-[0_2px_10px_-2px_rgba(56,189,248,0.25)]",
              "px-2.5 py-0.5 text-white backdrop-blur-xs transition-all",
              className
            )}
            role="status"
            aria-label="Campus Connect Core Member"
            title="Official Campus Connect Core Member"
          >
            <CoreMemberInsignia size={iconPixel} />
            <span className="text-[11px] font-bold tracking-wide text-[#E0F2FE]">
              Core Member
            </span>
            <span className="sr-only">Campus Connect Core Member</span>
          </span>
        );

      case "prominent":
        return (
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-xl",
              "bg-gradient-to-r from-[#0B192C] via-[#132A4A] to-[#0B192C]",
              "border border-[#38BDF8]/40 shadow-[0_4px_16px_-4px_rgba(56,189,248,0.3)]",
              "px-3 py-1.5 text-white backdrop-blur-sm",
              className
            )}
            role="status"
            aria-label="Official Campus Connect Core Member"
            title="Official Campus Connect Core Member"
          >
            <CoreMemberInsignia size={iconPixel + 2} />
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[9.5px] font-bold uppercase tracking-widest text-[#38BDF8]">
                Official
              </span>
              <span className="text-[12.5px] font-extrabold tracking-tight text-[#F0F9FF]">
                Campus Connect Core Team
              </span>
            </div>
            <span className="sr-only">Campus Connect Core Member</span>
          </span>
        );

      case "compact":
      default:
        return (
          <span
            className={cn(
              "inline-flex items-center justify-center align-middle transition-transform hover:scale-110",
              className
            )}
            role="status"
            aria-label="Campus Connect Core Member"
            title="Official Campus Connect Core Member"
          >
            <CoreMemberInsignia size={iconPixel} />
            <span className="sr-only">Campus Connect Core Member</span>
          </span>
        );
    }
  })();

  if (!showTooltip) {
    return content;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-default">{content}</span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="z-[9999] border border-[#38BDF8]/30 bg-[#0B192C] px-2.5 py-1 text-[11px] font-semibold text-[#F0F9FF] shadow-lg"
        >
          Official Campus Connect Core Member
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default CoreMemberBadge;
