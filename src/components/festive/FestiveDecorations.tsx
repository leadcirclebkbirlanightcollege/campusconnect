import React from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "@/components/icons";
import { useFestivalTheme } from "@/contexts/FestivalThemeContext";

/**
 * Peacock Feather Icon (Clean, modern SVG for Janmashtami)
 * Culturally respectful, minimal, sleek vector motif.
 */
export function PeacockFeatherIcon({
  className,
  size = 20,
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
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="featherGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="45%" stopColor="#0284C7" />
          <stop offset="70%" stopColor="#0369A1" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <radialGradient id="eyeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="40%" stopColor="#0284C7" />
          <stop offset="75%" stopColor="#059669" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
      {/* Central quill spine */}
      <path
        d="M21 3C16 7 8 15 3 21"
        stroke="url(#featherGrad)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Feather vanes */}
      <path
        d="M19.5 5C17.5 4 14.5 4.8 12.5 7.5C10.5 10.2 9.5 13 8 15"
        stroke="#38BDF8"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M17.5 8C19 9.5 19.5 12.5 17 14.5C14.5 16.5 12 17 9.5 18"
        stroke="#0D9488"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Peacock Eye */}
      <ellipse
        cx="14.5"
        cy="9.5"
        rx="4"
        ry="3.2"
        transform="rotate(-35 14.5 9.5)"
        fill="url(#eyeGrad)"
      />
      {/* Inner Pupil */}
      <circle
        cx="14.5"
        cy="9.5"
        r="1.3"
        fill="#0F172A"
      />
      <circle
        cx="15"
        cy="9.1"
        r="0.4"
        fill="#FDE047"
      />
    </svg>
  );
}

/**
 * Minimal geometric flute & sparkle accent (Janmashtami)
 */
export function FluteAccent({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fluteGold" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <line x1="3" y1="21" x2="21" y2="3" stroke="url(#fluteGold)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="8" cy="16" r="0.9" fill="#1E293B" />
      <circle cx="11" cy="13" r="0.9" fill="#1E293B" />
      <circle cx="14" cy="10" r="0.9" fill="#1E293B" />
      <circle cx="17" cy="7" r="0.9" fill="#1E293B" />
      <path
        d="M20 2L20.6 3.4L22 4L20.6 4.6L20 6L19.4 4.6L18 4L19.4 3.4L20 2Z"
        fill="#FDE047"
      />
    </svg>
  );
}

/**
 * Dahi Handi Icon (Clean, modern SVG for Dahi Handi)
 * Geometric hanging earthen handi with decorative ropes and golden garland.
 */
export function DahiHandiIcon({
  className,
  size = 20,
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
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="handiPotGrad" x1="4" y1="9" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="50%" stopColor="#0369A1" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="handiGold" x1="5" y1="10" x2="19" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Hanging ropes */}
      <line x1="12" y1="1" x2="12" y2="7" stroke="#F59E0B" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
      <line x1="6" y1="2" x2="8" y2="10" stroke="#0284C7" strokeWidth="1" opacity="0.75" />
      <line x1="18" y1="2" x2="16" y2="10" stroke="#0284C7" strokeWidth="1" opacity="0.75" />
      {/* Pot rim / neck */}
      <ellipse cx="12" cy="9.5" rx="4.5" ry="1.5" stroke="url(#handiGold)" strokeWidth="1.3" fill="#0C4A6E" />
      {/* Pot body */}
      <path
        d="M7.5 10.5C6 13 6 18 8.5 20C10.5 21.5 13.5 21.5 15.5 20C18 18 18 13 16.5 10.5"
        stroke="url(#handiGold)"
        strokeWidth="1.4"
        fill="url(#handiPotGrad)"
      />
      {/* Garland around waist */}
      <path
        d="M7.5 14.5C9.5 16 14.5 16 16.5 14.5"
        stroke="#38BDF8"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Celebratory golden droplet / sparkle on top */}
      <circle cx="12" cy="7.2" r="1" fill="#FDE047" />
      <path
        d="M12 4.5L12.4 5.5L13.5 6L12.4 6.5L12 7.5L11.6 6.5L10.5 6L11.6 5.5L12 4.5Z"
        fill="#F59E0B"
      />
    </svg>
  );
}

/**
 * Subtle festive celebration star / geometric ornament
 */
export function HandiCelebrationAccent({
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
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="celebrationGold" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z" fill="url(#celebrationGold)" opacity="0.9" />
      <circle cx="19" cy="5" r="1.5" fill="#FDE047" />
      <circle cx="5" cy="19" r="1.2" fill="#38BDF8" />
    </svg>
  );
}

/**
 * Dynamic Festive Icon: automatically renders PeacockFeatherIcon for Janmashtami
 * and DahiHandiIcon for Dahi Handi.
 */
export function FestiveIcon({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const { isDahiHandi } = useFestivalTheme();
  if (isDahiHandi) {
    return <DahiHandiIcon size={size} className={className} />;
  }
  return <PeacockFeatherIcon size={size} className={className} />;
}

/**
 * Festive chip / badge: dynamically displays the appropriate festival icon & label
 */
export function FestiveBadge({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { isDahiHandi, config } = useFestivalTheme();
  const displayLabel = label || config.badgeLabel || "Festive • Campus Connect";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "bg-gradient-to-r from-navy-deep/90 via-primary/80 to-navy-card/90",
        isDahiHandi ? "border border-amber-400/35 text-amber-200" : "border border-cyan-400/30 text-cyan-200",
        "text-[10.5px] font-bold tracking-wider uppercase shadow-sm select-none",
        className
      )}
    >
      {isDahiHandi ? (
        <DahiHandiIcon size={13} className="text-amber-300" />
      ) : (
        <PeacockFeatherIcon size={13} className="text-cyan-300" />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}

/**
 * Subtle festive sparkle background layer for hero cards
 */
export function FestiveSparklesBackground() {
  const { isDahiHandi } = useFestivalTheme();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl md:rounded-3xl">
      {/* Top right ambient glow: cyan for Janmashtami, warm golden-amber for Dahi Handi */}
      <div
        className={cn(
          "absolute -top-12 -right-12 h-44 w-44 rounded-full blur-xl",
          isDahiHandi
            ? "bg-[radial-gradient(circle,hsl(42_95%_50%/0.26)_0%,transparent_70%)]"
            : "bg-[radial-gradient(circle,hsl(188_85%_46%/0.25)_0%,transparent_70%)]"
        )}
      />
      {/* Bottom aura */}
      <div
        className={cn(
          "absolute -bottom-10 right-1/4 h-36 w-36 rounded-full blur-xl",
          isDahiHandi
            ? "bg-[radial-gradient(circle,hsl(200_85%_50%/0.22)_0%,transparent_75%)]"
            : "bg-[radial-gradient(circle,hsl(42_90%_52%/0.18)_0%,transparent_75%)]"
        )}
      />
      {/* Tiny decorative stars */}
      <div className="absolute top-3 right-6 text-amber-300/40 animate-pulse">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="absolute bottom-4 right-10 text-cyan-300/30">
        <Sparkles className="h-2.5 w-2.5" />
      </div>
    </div>
  );
}
