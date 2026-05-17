import { expect, Page, test as base } from "@playwright/test";

/**
 * Set theme via localStorage BEFORE first paint to avoid FOUC and theme flicker.
 * Mirrors src/hooks/use-theme.ts (STORAGE_KEY = "theme").
 */
export async function seedTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((mode) => {
    try {
      localStorage.setItem("theme", mode);
    } catch {}
  }, theme);
}

/**
 * Stabilize the page for deterministic screenshots:
 *  - Wait for fonts + network idle
 *  - Disable CSS animations / transitions
 *  - Hide caret + scrollbars
 *  - Mask known dynamic regions (clocks, live dots, network ping indicators)
 */
export async function stabilize(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
      html { scrollbar-width: none; }
      ::-webkit-scrollbar { display: none; }
    `,
  });
  // Small settle for layout shifts after style injection.
  await page.waitForTimeout(150);
}

/**
 * Default mask list — selectors whose visual content is non-deterministic.
 * Tests can extend per-spec.
 */
export const DEFAULT_MASKS = [
  "[data-testid='network-health-dot']",
  "[data-vr-mask]",
  "time",
  "[data-clock]",
];

/**
 * Snapshot the full page with stabilization + masks applied.
 */
export async function snap(page: Page, name: string, extraMasks: string[] = []) {
  await stabilize(page);
  const masks = [...DEFAULT_MASKS, ...extraMasks].map((s) => page.locator(s));
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    mask: masks,
  });
}

export const test = base;
export { expect };
