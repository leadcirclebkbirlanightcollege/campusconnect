/**
 * LAYOUT ENGINE — Mobile-first layout constraint system
 *
 * Primary design target: 390px–420px viewport (mobile)
 * Desktop: centered column, sidebar + main content
 *
 * Rules:
 *   side padding     = 16px  (px-4)
 *   section gap      = 24px  (gap-6)
 *   card padding     = 16px  (p-4)
 *   tap targets      = min 48px height
 *   max-width mobile = 420px (pure mobile pages)
 *   max-width full   = 1280px (admin/desktop)
 */

import { cn } from "@/lib/utils";

export const LAYOUT = {
  /** Mobile side padding */
  paddingX: "px-4",
  /** Section vertical gap */
  sectionGap: "space-y-6",
  /** Inner content gap */
  contentGap: "space-y-4",
  /** Card internal padding */
  cardPadding: "p-4",
  /** Minimum tap target */
  tapTarget: "min-h-[48px]",
  /** Mobile-first content max-width */
  mobileMax: "max-w-[420px]",
  /** Full layout max-width */
  pageMax: "max-w-[1280px]",
  /** Safe area bottom padding (for fixed bottom nav) */
  safeBottom: "pb-[calc(72px+env(safe-area-inset-bottom,0px))]",
  /** Safe area padding (all sides) */
  safeArea: "pl-[env(safe-area-inset-left,0)] pr-[env(safe-area-inset-right,0)]",
} as const;

/** Generate page container classes */
export function pageContainer(
  opts: { mobileCentered?: boolean; noPadding?: boolean } = {}
): string {
  return cn(
    "w-full",
    !opts.noPadding && LAYOUT.paddingX,
    opts.mobileCentered && `${LAYOUT.mobileMax} mx-auto`,
  );
}

/** Generate section wrapper classes */
export function sectionWrapper(tight = false): string {
  return cn("w-full", tight ? "space-y-3" : LAYOUT.sectionGap);
}

/** Generate card classes */
export function cardBase(interactive = false): string {
  return cn(
    "rounded-xl border border-border-subtle bg-card p-4",
    interactive && "cursor-pointer hover-lift press-scale",
  );
}
