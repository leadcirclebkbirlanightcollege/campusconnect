import fs from "node:fs";
import path from "node:path";
import { test, snap, seedTheme } from "./helpers";

const STATE = path.join(process.cwd(), "tests/visual/.auth/student.json");
const hasAuth = fs.existsSync(STATE) && fs.statSync(STATE).size > 50;

test.use({ storageState: hasAuth ? STATE : undefined });
test.skip(!hasAuth, "Student credentials not configured (set VR_STUDENT_EMAIL / VR_STUDENT_PASSWORD)");

const ROUTES = [
  { name: "student-dashboard", path: "/home" },
  { name: "student-lectures", path: "/lectures" },
  { name: "student-attendance", path: "/attendance" },
  { name: "student-profile", path: "/profile" },
];

for (const { name, path: route } of ROUTES) {
  test(`student · ${name}`, async ({ page }, testInfo) => {
    const theme = testInfo.project.metadata?.theme === "dark" ? "dark" : "light";
    await seedTheme(page, theme);
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await snap(page, `${name}.png`, [
      "[data-testid='live-attendance-widget']",
      "[data-testid='intelligence-score']",
    ]);
  });
}
