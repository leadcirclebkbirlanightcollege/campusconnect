import fs from "node:fs";
import path from "node:path";
import { test, snap, seedTheme } from "./helpers";

const STATE = path.join(process.cwd(), "tests/visual/.auth/sa.json");
const hasAuth = fs.existsSync(STATE) && fs.statSync(STATE).size > 50;

test.use({ storageState: hasAuth ? STATE : undefined });
test.skip(!hasAuth, "Super Admin credentials not configured (set VR_SA_EMAIL / VR_SA_PASSWORD)");

const ROUTES = [
  { name: "sa-dashboard", path: "/platform/super-admin" },
  { name: "sa-colleges", path: "/platform/super-admin/colleges" },
  { name: "sa-security", path: "/platform/super-admin/security" },
];

for (const { name, path: route } of ROUTES) {
  test(`super-admin · ${name}`, async ({ page }, testInfo) => {
    const theme = testInfo.project.metadata?.theme === "dark" ? "dark" : "light";
    await seedTheme(page, theme);
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await snap(page, `${name}.png`);
  });
}
