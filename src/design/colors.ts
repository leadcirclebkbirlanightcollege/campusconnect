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
  glassBg:     "hsl(var(--surface-1) / 0.72)",
  glassBorder: "hsl(var(--border-subtle) / 0.60)",

  /* ── Primary brand ── */
  primary:     "hsl(var(--primary))",
  primaryFg:   "hsl(var(--primary-foreground))",
  primaryDim:  "hsl(var(--primary-dim))",
  primaryGlow: "hsl(var(--primary-glow))",

  /* ── Accent glow (electric highlight) ── */
  accentGlow: "hsl(var(--accent-glow))",

  /* ── Gold / premium tier ── */
  gold:   "hsl(var(--gold))",
  goldFg: "hsl(var(--gold-foreground))",

  /* ── Semantic ── */
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  danger:  "hsl(var(--danger))",

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

  /* Text */
  textPrimary:   "text-foreground",
  textSecondary: "text-secondary-label",
  textMuted:     "text-muted-foreground",
  textPrimaryBrand: "text-primary",
  textGold:      "text-gold",
  textSuccess:   "text-success",
  textWarning:   "text-warning",
  textDanger:    "text-danger",

  /* Borders */
  borderSubtle: "border-border-subtle",
  borderStrong: "border-border-strong",
} as const;
