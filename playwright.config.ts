import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

/**
 * Visual regression configuration for Campus Connect.
 *
 * Matrix: { mobile-light, mobile-dark, desktop-light, desktop-dark }
 * Baselines live in tests/visual/__screenshots__/ and are committed to git.
 *
 * Run locally:
 *   bun run test:visual            # run tests
 *   bun run test:visual:update     # refresh baselines
 *   bun run test:visual:report     # open HTML report
 */
const PORT = Number(process.env.VR_PORT ?? 4173);
const BASE_URL = process.env.VR_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],
  timeout: 60_000,
  expect: {
    // Allow tiny anti-alias / sub-pixel differences. Tighten over time.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "off",
    screenshot: "only-on-failure",
    colorScheme: "light",
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "mobile-light",
      use: { ...devices["iPhone 13"], colorScheme: "light" },
      metadata: { theme: "light", form: "mobile" },
      dependencies: ["setup"],
    },
    {
      name: "mobile-dark",
      use: { ...devices["iPhone 13"], colorScheme: "dark" },
      metadata: { theme: "dark", form: "mobile" },
      dependencies: ["setup"],
    },
    {
      name: "desktop-light",
      use: { viewport: { width: 1440, height: 900 }, colorScheme: "light" },
      metadata: { theme: "light", form: "desktop" },
      dependencies: ["setup"],
    },
    {
      name: "desktop-dark",
      use: { viewport: { width: 1440, height: 900 }, colorScheme: "dark" },
      metadata: { theme: "dark", form: "desktop" },
      dependencies: ["setup"],
    },
  ],
  webServer: process.env.VR_BASE_URL
    ? undefined
    : {
        command: `bun run build && bun run preview --port ${PORT} --strictPort`,
        url: BASE_URL,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
        stdout: "ignore",
        stderr: "pipe",
      },
});
