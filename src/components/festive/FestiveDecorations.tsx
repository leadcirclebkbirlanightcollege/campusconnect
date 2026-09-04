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
          "absolute -top-12 -right-12 h-48 w-48 rounded-full blur-2xl",
          isDahiHandi
            ? "bg-[radial-gradient(circle,hsl(42_95%_50%/0.30)_0%,transparent_70%)]"
            : "bg-[radial-gradient(circle,hsl(188_95%_48%/0.30)_0%,transparent_70%)]"
        )}
      />
      {/* Bottom aura */}
      <div
        className={cn(
          "absolute -bottom-10 right-1/4 h-36 w-36 rounded-full blur-xl",
          isDahiHandi
            ? "bg-[radial-gradient(circle,hsl(28_90%_52%/0.25)_0%,transparent_75%)]"
            : "bg-[radial-gradient(circle,hsl(224_90%_60%/0.25)_0%,transparent_75%)]"
        )}
      />
      {/* Tiny decorative stars */}
      <div className="absolute top-3 right-6 text-amber-300/60 animate-pulse">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="absolute bottom-4 right-10 text-cyan-300/40">
        <Sparkles className="h-2.5 w-2.5" />
      </div>
    </div>
  );
}

/**
 * High-fidelity Janmashtami Hero Peacock Feather Illustration
 * Inspired by the reference design: iridescent eye, cyan plume, gold spine, soft glow.
 */
export function JanmashtamiHeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="heroQuillGrad" x1="120" y1="10" x2="10" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="40%" stopColor="#0284C7" />
          <stop offset="75%" stopColor="#0369A1" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <radialGradient id="heroEyeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="35%" stopColor="#1E1B4B" />
          <stop offset="60%" stopColor="#0284C7" />
          <stop offset="82%" stopColor="#059669" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
        <filter id="heroEyeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Ambient background glow aura */}
      <ellipse cx="78" cy="62" rx="44" ry="48" fill="#0284C7" opacity="0.28" filter="url(#heroEyeGlow)" />
      <ellipse cx="82" cy="64" rx="26" ry="30" fill="#38BDF8" opacity="0.32" filter="url(#heroEyeGlow)" />

      {/* Main central spine / quill */}
      <path
        d="M125 15C102 45 68 105 18 168"
        stroke="url(#heroQuillGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Upper outer feather barbs */}
      <path d="M120 22C108 14 88 18 70 38C56 54 50 72 38 90" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      <path d="M112 32C98 25 80 32 64 52C50 70 42 88 32 108" stroke="#0D9488" strokeWidth="1.8" strokeLinecap="round" opacity="0.80" />
      <path d="M102 44C88 38 72 48 58 68C46 86 36 104 26 126" stroke="#0284C7" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />

      {/* Lower outer feather barbs */}
      <path d="M122 36C128 52 124 74 104 96C86 116 68 128 44 142" stroke="#0284C7" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      <path d="M108 58C114 74 108 96 90 116C74 134 54 146 32 156" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" opacity="0.80" />
      <path d="M94 80C98 96 90 114 74 130C58 146 40 156 22 164" stroke="#D97706" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />

      {/* Fine inner feather fringe */}
      <path d="M100 28C92 24 82 28 72 40" stroke="#7DD3FC" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
      <path d="M116 48C118 58 112 70 100 84" stroke="#7DD3FC" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />

      {/* Peacock Eye (Ocellus) */}
      <ellipse
        cx="82"
        cy="58"
        rx="26"
        ry="22"
        transform="rotate(-30 82 58)"
        fill="url(#heroEyeGrad)"
        stroke="#FDE047"
        strokeWidth="1.5"
      />

      {/* Peacock Eye Inner Turquoise Ring */}
      <ellipse
        cx="82"
        cy="58"
        rx="17"
        ry="14"
        transform="rotate(-30 82 58)"
        fill="#0284C7"
        opacity="0.95"
      />

      {/* Inner Pupil (Deep Midnight Blue) */}
      <ellipse
        cx="82"
        cy="58"
        rx="10"
        ry="8"
        transform="rotate(-30 82 58)"
        fill="#0A1128"
      />

      {/* Sacred Tilak / Eye Sparkle Highlight */}
      <circle cx="85" cy="55" r="2.8" fill="#FDE047" />
      <circle cx="80" cy="61" r="1.5" fill="#FFFFFF" opacity="0.9" />

      {/* Floating starlight sparkles */}
      <path d="M124 8L126 14L132 16L126 18L124 24L122 18L116 16L122 14L124 8Z" fill="#FDE047" opacity="0.9" />
      <circle cx="48" cy="24" r="2" fill="#7DD3FC" opacity="0.8" />
      <circle cx="120" cy="85" r="1.5" fill="#FDE047" opacity="0.7" />
    </svg>
  );
}

/**
 * High-fidelity Dahi Handi Hero Illustration
 * Inspired by the reference design: hanging earthen pot, marigold garlands, ropes, festive aura.
 */
export function DahiHandiHeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="potGradHero" x1="25" y1="65" x2="115" y2="155" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="45%" stopColor="#92400E" />
          <stop offset="85%" stopColor="#78350F" />
          <stop offset="100%" stopColor="#451A03" />
        </linearGradient>
        <linearGradient id="potGoldRims" x1="30" y1="65" x2="110" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <radialGradient id="handiAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* Warm Golden Aura behind pot */}
      <circle cx="70" cy="98" r="54" fill="url(#handiAura)" opacity="0.25" />

      {/* Hanging ropes from top scaffold */}
      <line x1="70" y1="0" x2="70" y2="52" stroke="#F59E0B" strokeWidth="2.2" strokeDasharray="3 2" />
      <line x1="30" y1="0" x2="48" y2="68" stroke="#D97706" strokeWidth="1.8" />
      <line x1="110" y1="0" x2="92" y2="68" stroke="#D97706" strokeWidth="1.8" />

      {/* Marigold Toran / Garland at top */}
      <path d="M20 18C45 32 95 32 120 18" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      <circle cx="35" cy="24" r="4.5" fill="#EA580C" />
      <circle cx="52" cy="28" r="4.5" fill="#FACC15" />
      <circle cx="70" cy="30" r="5.5" fill="#EA580C" />
      <circle cx="88" cy="28" r="4.5" fill="#FACC15" />
      <circle cx="105" cy="24" r="4.5" fill="#EA580C" />

      {/* Handi Neck & Mouth */}
      <ellipse cx="70" cy="62" rx="28" ry="8" fill="#451A03" stroke="url(#potGoldRims)" strokeWidth="2.2" />

      {/* Pure White Curd / Makkhan Froth flowing over mouth */}
      <ellipse cx="70" cy="59" rx="22" ry="6" fill="#FFFBEB" />
      <path d="M56 61C58 68 64 70 66 63C68 72 74 74 76 64C78 71 83 69 85 62" fill="#FFFBEB" />

      {/* Handi Pot Body (Classic earthen matka shape) */}
      <path
        d="M44 68C30 84 28 118 46 138C58 150 82 150 94 138C112 118 110 84 96 68"
        fill="url(#potGradHero)"
        stroke="url(#potGoldRims)"
        strokeWidth="2.5"
      />

      {/* Decorative Golden Ethnic Patterns on Pot Waist */}
      <path d="M38 100C54 112 86 112 102 100" stroke="url(#potGoldRims)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M42 112C58 124 82 124 98 112" stroke="#FDE047" strokeWidth="1.6" strokeDasharray="3 3" />

      {/* Hanging tassel / coconut motif under pot */}
      <line x1="70" y1="145" x2="70" y2="162" stroke="#F59E0B" strokeWidth="2" />
      <circle cx="70" cy="165" r="4" fill="#EA580C" />

      {/* Celebratory golden bursts & sparkles */}
      <path d="M18 72L21 78L27 80L21 82L18 88L15 82L9 80L15 78L18 72Z" fill="#FDE047" />
      <path d="M120 82L122 87L128 89L122 91L120 96L118 91L112 89L118 87L120 82Z" fill="#FDE047" />
      <circle cx="112" cy="130" r="2" fill="#FDE047" opacity="0.8" />
    </svg>
  );
}

/**
 * Janmashtami Quote Card Vector Feather Accent
 */
export function JanmashtamiQuoteDecoration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="qFeatherSpine" x1="70" y1="10" x2="10" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="60%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <radialGradient id="qEyeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="40%" stopColor="#0284C7" />
          <stop offset="75%" stopColor="#059669" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
      <path d="M72 8C55 24 35 52 10 72" stroke="url(#qFeatherSpine)" strokeWidth="2" strokeLinecap="round" />
      <path d="M66 14C56 10 44 14 34 26C26 36 22 46 16 56" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
      <path d="M68 22C72 32 68 44 56 56C44 68 32 72 20 74" stroke="#0D9488" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      <ellipse cx="48" cy="28" rx="14" ry="11" transform="rotate(-30 48 28)" fill="url(#qEyeGrad)" stroke="#FDE047" strokeWidth="1" />
      <ellipse cx="48" cy="28" rx="8" ry="6" transform="rotate(-30 48 28)" fill="#0284C7" />
      <circle cx="48" cy="28" r="3.5" fill="#0B1120" />
      <circle cx="50" cy="26" r="1.2" fill="#FDE047" />
    </svg>
  );
}

/**
 * Dahi Handi Quote Card Vector Pot Accent
 */
export function DahiHandiQuoteDecoration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="qPotGrad" x1="15" y1="30" x2="65" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="60%" stopColor="#92400E" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="30" rx="16" ry="5" fill="#451A03" stroke="#F59E0B" strokeWidth="1.5" />
      <ellipse cx="40" cy="28" rx="12" ry="3.5" fill="#FFFBEB" />
      <path d="M26 33C18 44 18 64 28 72C34 78 46 78 52 72C62 64 62 44 54 33" fill="url(#qPotGrad)" stroke="#F59E0B" strokeWidth="1.5" />
      <path d="M24 50C34 56 46 56 56 50" stroke="#FDE047" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="40" cy="20" r="2" fill="#F59E0B" />
      <line x1="40" y1="4" x2="40" y2="25" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}
