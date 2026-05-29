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

export default function TenantBrandingApplicator() {
  const { college } = useTenant();

  useEffect(() => {
    if (!college?.primary_color) return;
    const hsl = hexToHslParts(college.primary_color);
    if (!hsl) return;
    const root = document.documentElement.style;
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
