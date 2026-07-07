import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      fontFamily: {
        syne: ['Syne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      /* ── Design Token Colors ── */
      colors: {
        /* Surface depth stack */
        "bg-base":    "hsl(var(--bg-base))",
        "surface-1":  "hsl(var(--surface-1))",
        "surface-2":  "hsl(var(--surface-2))",
        "surface-3":  "hsl(var(--surface-3))",
        "surface-4":  "hsl(var(--surface-4))",

        /* Borders */
        "border-subtle": "hsl(var(--border-subtle))",
        "border-strong": "hsl(var(--border-strong))",

        /* Text semantic */
        "text-primary-label":   "hsl(var(--text-primary))",
        "text-secondary-label": "hsl(var(--text-secondary))",
        "text-muted-label":     "hsl(var(--text-muted))",

        /* Brand accent */
        "primary-glow":  "hsl(var(--primary-glow))",
        "primary-hover": "hsl(var(--primary-hover))",
        "accent-glow":   "hsl(var(--accent-glow))",

        /* Enterprise interaction tokens */
        "action-primary": {
          DEFAULT: "hsl(var(--action-primary-bg))",
          hover: "hsl(var(--action-primary-hover))",
          foreground: "hsl(var(--action-primary-text))",
        },
        "action-secondary": {
          DEFAULT: "hsl(var(--action-secondary-bg))",
          hover: "hsl(var(--action-secondary-hover))",
          foreground: "hsl(var(--action-secondary-text))",
        },
        "action-danger": {
          DEFAULT: "hsl(var(--action-danger-bg))",
          hover: "hsl(var(--action-danger-hover))",
          foreground: "hsl(var(--action-danger-text))",
        },
        "action-disabled": {
          DEFAULT: "hsl(var(--action-disabled-bg))",
          foreground: "hsl(var(--action-disabled-text))",
        },
        "control-bg": "hsl(var(--control-bg))",
        "control-hover": "hsl(var(--control-hover))",
        "control-text": "hsl(var(--control-text))",
        "control-muted": "hsl(var(--control-muted))",
        "input-bg": "hsl(var(--input-bg))",
        "input-text": "hsl(var(--input-text))",
        "input-placeholder": "hsl(var(--input-placeholder))",

        /* Gold / premium */
        gold: {
          DEFAULT:    "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },

        /* Semantic */
        danger: {
          DEFAULT:    "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
          soft:       "hsl(var(--danger-soft))",
        },
        success: {
          DEFAULT:    "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          soft:       "hsl(var(--success-soft))",
        },
        warning: {
          DEFAULT:    "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          soft:       "hsl(var(--warning-soft))",
        },

        /* shadcn/ui compat */
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        premium: "hsl(var(--premium))",
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:              "hsl(var(--sidebar-background))",
          foreground:           "hsl(var(--sidebar-foreground))",
          primary:              "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:               "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:               "hsl(var(--sidebar-border))",
          ring:                 "hsl(var(--sidebar-ring))",
        },
      },

      /* ── Locked Typography Scale ── */
      fontSize: {
        "display-lg":  ["32px", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.03em" }],
        "display-md":  ["26px", { lineHeight: "1.2",  fontWeight: "700", letterSpacing: "-0.025em" }],
        "display":     ["22px", { lineHeight: "1.25", fontWeight: "600", letterSpacing: "-0.02em" }],
        "heading":     ["18px", { lineHeight: "1.3",  fontWeight: "600", letterSpacing: "-0.015em" }],
        "subhead":     ["15px", { lineHeight: "1.4",  fontWeight: "600" }],
        "body-lg":     ["16px", { lineHeight: "1.6" }],
        "body":        ["14px", { lineHeight: "1.6" }],
        "body-sm":     ["13px", { lineHeight: "1.55" }],
        "caption":     ["12px", { lineHeight: "1.5" }],
        "label":       ["11px", { lineHeight: "1.4",  fontWeight: "600", letterSpacing: "0.08em" }],
        "metric-lg":   ["38px", { lineHeight: "1.0",  fontWeight: "800", letterSpacing: "-0.03em" }],
        "metric":      ["28px", { lineHeight: "1.1",  fontWeight: "700", letterSpacing: "-0.02em" }],
        "metric-sm":   ["20px", { lineHeight: "1.15", fontWeight: "700" }],
      },

      /* ── 4px Spacing Grid ── */
      spacing: {
        "page":      "16px",   /* Standard side padding */
        "card":      "16px",   /* Card internal padding */
        "section":   "24px",   /* Section gap */
        "component": "12px",   /* Component gap */
        "tap":       "48px",   /* Minimum tap target */
        "gap-xs":    "4px",
        "gap-sm":    "8px",
        "gap-md":    "12px",
        "gap-base":  "16px",
        "gap-lg":    "20px",
        "gap-xl":    "24px",
        "gap-2xl":   "32px",
        "gap-3xl":   "40px",
      },

      /* ── Shadows ── */
      boxShadow: {
        "xs":          "var(--shadow-xs)",
        "sm":          "var(--shadow-sm)",
        "md":          "var(--shadow-md)",
        "lg":          "var(--shadow-lg)",
        "card":        "var(--shadow-sm)",
        "card-hover":  "var(--shadow-md)",
        "primary":     "var(--shadow-primary)",
        "glow":        "var(--shadow-glow)",
        "inner-subtle":"inset 0 1px 0 hsl(var(--border-subtle) / 0.5)",
      },

      /* ── Border Radius ── */
      borderRadius: {
        sm:    "calc(var(--radius) - 4px)",   /* 8px */
        md:    "calc(var(--radius) - 2px)",   /* 10px */
        lg:    "var(--radius)",               /* 12px */
        xl:    "calc(var(--radius) + 4px)",   /* 16px */
        "2xl": "calc(var(--radius) + 12px)",  /* 24px */
      },

      /* ── Motion ── */
      transitionDuration: {
        fast:   "120ms",
        base:   "150ms",
        slow:   "200ms",
        slower: "300ms",
      },
      transitionTimingFunction: {
        "out":    "cubic-bezier(0.0, 0, 0.2, 1)",
        "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      /* ── Max widths for mobile-first layouts ── */
      maxWidth: {
        "mobile":  "420px",
        "tablet":  "768px",
        "content": "960px",
        "page":    "1280px",
      },

      /* ── Keyframes ── */
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to:   { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to:   { height: "0", opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "var(--shadow-primary)" },
          "50%":      { boxShadow: "var(--shadow-glow)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-4px)" },
        },
        "live-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.35" },
        },
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in":         "fade-in 150ms cubic-bezier(0.0,0,0.2,1) both",
        "slide-up":        "slide-up 180ms cubic-bezier(0.0,0,0.2,1) both",
        "slide-in-right":  "slide-in-right 150ms cubic-bezier(0.0,0,0.2,1) both",
        "scale-in":        "scale-in 120ms cubic-bezier(0.0,0,0.2,1) both",
        "count-up":        "count-up 200ms cubic-bezier(0.0,0,0.2,1) both",
        "shimmer":         "shimmer 1.4s ease-in-out infinite",
        "glow-pulse":      "glow-pulse 2.5s ease-in-out infinite",
        "float":           "float 3s ease-in-out infinite",
        "live-pulse":      "live-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
