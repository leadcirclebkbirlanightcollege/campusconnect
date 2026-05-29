/**
 * TenantBrandingApplicator
 *
 * Reads the current tenant's branding and applies it as CSS custom
 * properties on <html> so every component inherits the college's primary
 * colour automatically.
 *
 * Must be rendered inside TenantProvider + BrowserRouter.
 */

import { useEffect } from "react";
import { useTenant } from "@/providers/TenantProvider";

function hexToHslParts(hex: string): { h: number; s: number; l: number; value: string } | null {
  // Accepts "#rrggbb" or "#rgb"
  const cleaned = hex.replace("#", "");
  const full = cleaned.length === 3
    ? cleaned.split("").map((c) => c + c).join("")
    : cleaned;
  if (full.length !== 6) return null;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  const parts = { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  return { ...parts, value: `${parts.h} ${parts.s}% ${parts.l}%` };
}

function hslValue(h: number, s: number, l: number) {
  return `${h} ${Math.max(0, Math.min(100, s))}% ${Math.max(0, Math.min(100, l))}%`;
}

/**
 * Properties we override per-tenant. Tracked so we can RESET them when the
 * tenant has no (or an unsafe) brand color — otherwise a previous tenant's
 * overrides would persist and clash with the next screen.
 */
const BRAND_PROPS = [
  "--primary",
  "--primary-hover",
  "--primary-glow",
  "--accent",
  "--ring",
  "--gradient-from",
  "--action-primary-bg",
  "--action-primary-hover",
  "--action-primary-text",
] as const;

function resetBrand(root: CSSStyleDeclaration) {
  BRAND_PROPS.forEach((p) => root.removeProperty(p));
}

export default function TenantBrandingApplicator() {
  const { college } = useTenant();

  useEffect(() => {
    const root = document.documentElement.style;

    if (!college?.primary_color) {
      resetBrand(root);
      return;
    }

    const hsl = hexToHslParts(college.primary_color);
    if (!hsl) {
      resetBrand(root);
      return;
    }

    // Guardrail: reject brand colors that would fail contrast against white
    // text (too light) or look like a paint glitch (too dark / pure black).
    // White text on white bg = invisible button. Clamp + fall back to system
    // default rather than render a broken UI.
    if (hsl.l > 60 || hsl.l < 12) {
      // eslint-disable-next-line no-console
      console.warn(
        `[TenantBranding] Rejecting unsafe primary_color ${college.primary_color} (L=${hsl.l}). ` +
        `Falling back to system default.`
      );
      resetBrand(root);
      return;
    }

    const primary = hsl.value;
    const hover = hslValue(hsl.h, Math.min(100, hsl.s + 4), Math.max(26, hsl.l - 8));
    const glow = hslValue(hsl.h, Math.min(100, hsl.s + 6), Math.min(74, hsl.l + 10));

    root.setProperty("--primary", primary);
    root.setProperty("--primary-hover", hover);
    root.setProperty("--primary-glow", glow);
    root.setProperty("--accent", primary);
    root.setProperty("--ring", primary);
    root.setProperty("--gradient-from", primary);
    root.setProperty("--action-primary-bg", primary);
    root.setProperty("--action-primary-hover", hover);
    root.setProperty("--action-primary-text", "0 0% 100%");
  }, [college?.primary_color]);

  return null;
}
