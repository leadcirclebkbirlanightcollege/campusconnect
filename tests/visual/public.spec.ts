import { test, snap } from "./helpers";
import { seedTheme } from "./helpers";

const ROUTES = [
  { name: "landing", path: "/" },
  { name: "auth", path: "/auth" },
  { name: "not-found", path: "/__definitely_not_a_real_route__" },
];

for (const { name, path: route } of ROUTES) {
  test(`public · ${name}`, async ({ page }, testInfo) => {
    const theme = testInfo.project.metadata?.theme === "dark" ? "dark" : "light";
    await seedTheme(page, theme);
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await snap(page, `${name}.png`);
  });
}
