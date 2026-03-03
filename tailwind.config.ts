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
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      /* ── Design Token Colors ── */
      colors: {
        /* Surface depth stack */
        "bg-base":   "hsl(var(--bg-base))",
        "surface-1": "hsl(var(--surface-1))",
        "surface-2": "hsl(var(--surface-2))",
        "surface-3": "hsl(var(--surface-3))",
        "surface-4": "hsl(var(--surface-4))",

        /* Borders */
        "border-subtle": "hsl(var(--border-subtle))",
        "border-strong": "hsl(var(--border-strong))",

        /* Text */
        "text-primary-label":   "hsl(var(--text-primary))",
        "text-secondary-label": "hsl(var(--text-secondary))",
        "text-muted-label":     "hsl(var(--text-muted))",

        /* Gold */
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
        "display":  ["28px", { lineHeight: "1.2", fontWeight: "600", letterSpacing: "-0.02em" }],
        "heading":  ["22px", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "-0.015em" }],
        "subhead":  ["18px", { lineHeight: "1.4", fontWeight: "500", letterSpacing: "-0.01em" }],
        "body-lg":  ["16px", { lineHeight: "1.65" }],
        "body":     ["14px", { lineHeight: "1.65" }],
        "caption":  ["12px", { lineHeight: "1.5" }],
        "label":    ["11px", { lineHeight: "1.4", fontWeight: "500", letterSpacing: "0.06em" }],
      },

      /* ── 4px Spacing Grid ── */
      spacing: {
        "page":    "24px",
        "card":    "20px",
        "section": "24px",
        "gap-sm":  "12px",
        "gap-md":  "16px",
        "gap-lg":  "20px",
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
      },

      /* ── Border Radius ── */
      borderRadius: {
        sm:    "calc(var(--radius) - 4px)",
        md:    "calc(var(--radius) - 2px)",
        lg:    "var(--radius)",
        xl:    "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 12px)",
      },

      /* ── Motion ── */
      transitionDuration: {
        fast:  "120ms",
        base:  "150ms",
        slow:  "200ms",
      },
      transitionTimingFunction: {
        "out":     "cubic-bezier(0.0, 0, 0.2, 1)",
        "in-out":  "cubic-bezier(0.4, 0, 0.2, 1)",
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
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(10px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
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
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in":         "fade-in 150ms cubic-bezier(0.0,0,0.2,1) forwards",
        "slide-up":        "slide-up 180ms cubic-bezier(0.0,0,0.2,1) forwards",
        "slide-in-right":  "slide-in-right 150ms cubic-bezier(0.0,0,0.2,1) forwards",
        "scale-in":        "scale-in 120ms cubic-bezier(0.0,0,0.2,1) forwards",
        "count-up":        "count-up 200ms cubic-bezier(0.0,0,0.2,1) forwards",
        "shimmer":         "shimmer 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
