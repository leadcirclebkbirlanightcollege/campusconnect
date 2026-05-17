import fs from "node:fs";
import path from "node:path";
import { test, snap, seedTheme } from "./helpers";

const STATE = path.join(process.cwd(), "tests/visual/.auth/admin.json");
const hasAuth = fs.existsSync(STATE) && fs.statSync(STATE).size > 50;

test.use({ storageState: hasAuth ? STATE : undefined });
test.skip(!hasAuth, "Admin credentials not configured (set VR_ADMIN_EMAIL / VR_ADMIN_PASSWORD)");

const ROUTES = [
  { name: "admin-overview", path: "/platform/admin" },
  { name: "admin-students", path: "/platform/admin/students" },
  { name: "admin-settings", path: "/platform/admin/settings" },
];

for (const { name, path: route } of ROUTES) {
  test(`admin · ${name}`, async ({ page }, testInfo) => {
    const theme = testInfo.project.metadata?.theme === "dark" ? "dark" : "light";
    await seedTheme(page, theme);
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await snap(page, `${name}.png`);
  });
}
