import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Authenticated storage states for VR tests.
 *
 * Reads credentials from env (set in CI as repo secrets, or .env.local locally):
 *   VR_STUDENT_EMAIL / VR_STUDENT_PASSWORD
 *   VR_ADMIN_EMAIL   / VR_ADMIN_PASSWORD
 *   VR_SA_EMAIL      / VR_SA_PASSWORD
 *
 * If a role's creds are absent, the setup writes an empty state and the
 * corresponding specs skip themselves at runtime.
 */
const STATE_DIR = path.join(process.cwd(), "tests/visual/.auth");
fs.mkdirSync(STATE_DIR, { recursive: true });

async function login(role: "student" | "admin" | "sa", email: string, password: string, page: any) {
  await page.goto("/auth");
  await page.getByLabel(/email|identifier|student id/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole("button", { name: /sign in|log in|continue/i }).first().click();
  // Wait until we leave /auth (role resolution + redirect).
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 30_000 });
  await page.context().storageState({ path: path.join(STATE_DIR, `${role}.json`) });
}

async function maybeLogin(role: "student" | "admin" | "sa", page: any) {
  const e = process.env[`VR_${role.toUpperCase()}_EMAIL`];
  const p = process.env[`VR_${role.toUpperCase()}_PASSWORD`];
  const out = path.join(STATE_DIR, `${role}.json`);
  if (!e || !p) {
    fs.writeFileSync(out, JSON.stringify({ cookies: [], origins: [] }));
    setup.info().annotations.push({ type: "skip-auth", description: `${role}: no creds` });
    return;
  }
  await login(role, e, p, page);
}

setup("authenticate roles", async ({ page }) => {
  await maybeLogin("student", page);
  await maybeLogin("admin", page);
  await maybeLogin("sa", page);
  expect(fs.existsSync(path.join(STATE_DIR, "student.json"))).toBeTruthy();
});
