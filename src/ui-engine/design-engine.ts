/**
 * DESIGN ENGINE — Centralized design token access
 * All values reference CSS custom properties from index.css
 * Never hardcode colors — always use semantic tokens
 */

export const spacing = {
  /** 16px — standard side padding for mobile screens */
  pagePadding: "px-4",
  /** 24px — gap between sections */
  sectionGap: "gap-6",
  /** 16px — internal card padding */
  cardPadding: "p-4",
  /** Minimum tap target for mobile touch */
  tapTarget: "min-h-[48px]",
} as const;

export const layout = {
  /** Max content width for mobile-first design */
  mobileMax: "max-w-[420px]",
  /** Max width for full-page admin/desktop views */
  desktopMax: "max-w-[1280px]",
  /** Centered container */
  center: "mx-auto",
} as const;

export const surface = {
  base:    "bg-background",
  card:    "bg-card border border-border-subtle",
  glass:   "glass-surface",
  elevated: "bg-surface-1 shadow-sm border border-border-subtle",
  raised:  "bg-surface-2 border border-border-subtle",
} as const;

export const radius = {
  sm:   "rounded-sm",
  md:   "rounded-md",
  lg:   "rounded-lg",
  xl:   "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
} as const;

export const text = {
  display:  "text-[28px] font-semibold leading-tight tracking-tight",
  heading:  "text-[22px] font-semibold leading-snug",
  subhead:  "text-[18px] font-medium leading-snug",
  body:     "text-[14px] leading-relaxed",
  caption:  "text-[12px] text-muted-foreground",
  label:    "text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
} as const;

export const motion = {
  fast:   "transition-all duration-[120ms] ease-[cubic-bezier(0,0,0.2,1)]",
  base:   "transition-all duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
  slow:   "transition-all duration-[200ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
  fadeIn: "animate-fade-in",
  slideUp:"animate-slide-up",
  scaleIn:"animate-scale-in",
} as const;

export const semantic = {
  success: { bg: "bg-success/10", text: "text-success", border: "border-success/20" },
  warning: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20" },
  danger:  { bg: "bg-danger/10",  text: "text-danger",  border: "border-danger/20" },
  primary: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
} as const;
