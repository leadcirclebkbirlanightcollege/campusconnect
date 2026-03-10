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

function hexToHsl(hex: string): string | null {
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
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function TenantBrandingApplicator() {
  const { college } = useTenant();

  useEffect(() => {
    if (!college?.primary_color) return;
    const hsl = hexToHsl(college.primary_color);
    if (!hsl) return;
    document.documentElement.style.setProperty("--primary", hsl);
    document.documentElement.style.setProperty("--primary-glow", hsl);
  }, [college?.primary_color]);

  return null;
}
