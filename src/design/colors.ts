/**
 * CAMPUS CONNECT — COLOR SYSTEM
 *
 * All values reference CSS custom properties defined in index.css.
 * Usage: import { COLORS } from "@/design/colors"
 *
 * Rule: Never hardcode hex values in components.
 *       Always use semantic CSS variable references.
 */

export const COLORS = {
  /* ── Background depth stack ── */
  bgBase:    "hsl(var(--bg-base))",
  surface1:  "hsl(var(--surface-1))",
  surface2:  "hsl(var(--surface-2))",
  surface3:  "hsl(var(--surface-3))",
  surface4:  "hsl(var(--surface-4))",

  /* ── Glass surface ── */
  glassBg:     "hsl(var(--surface-1) / 0.85)",
  glassBorder: "hsl(var(--border-subtle) / 0.80)",

  /* ── Primary brand (Royal Blue #3157C7) ── */
  primary:     "hsl(var(--primary))",
  primaryFg:   "hsl(var(--primary-foreground))",
  primaryDim:  "hsl(var(--primary-dim))",
  primaryGlow: "hsl(var(--primary-glow))",

  /* ── Deep Navy (Hero Cards & Key Emphasis) ── */
  navyDeep:  "hsl(var(--navy-deep))",
  navyCard:  "hsl(var(--navy-card))",
  navyLight: "hsl(var(--navy-light))",

  /* ── Accent glow ── */
  accentGlow: "hsl(var(--accent-glow))",

  /* ── Gold / premium tier ── */
  gold:   "hsl(var(--gold))",
  goldFg: "hsl(var(--gold-foreground))",

  /* ── Semantic ── */
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  danger:  "hsl(var(--danger))",
  info:    "hsl(var(--info, 210 60% 50%))",

  /* ── Text hierarchy ── */
  textPrimary:   "hsl(var(--text-primary))",
  textSecondary: "hsl(var(--text-secondary))",
  textMuted:     "hsl(var(--text-muted))",

  /* ── Borders ── */
  borderSubtle: "hsl(var(--border-subtle))",
  borderStrong: "hsl(var(--border-strong))",
} as const;

/** Tailwind class tokens (use in className) */
export const COLOR_CLASSES = {
  /* Backgrounds */
  bgBase:   "bg-background",
  surface1: "bg-surface-1",
  surface2: "bg-surface-2",
  surface3: "bg-surface-3",
  card:     "bg-card",
  navyDeep: "bg-navy-deep",
  navyCard: "bg-navy-card",

  /* Text */
  textPrimary:   "text-foreground",
  textSecondary: "text-secondary-label",
  textMuted:     "text-muted-foreground",
  textPrimaryBrand: "text-primary",
  textGold:      "text-gold",
  textSuccess:   "text-success",
  textWarning:   "text-warning",
  textDanger:    "text-danger",
  textNavy:      "text-navy-deep",

  /* Borders */
  borderSubtle: "border-border-subtle",
  borderStrong: "border-border-strong",
} as const;
