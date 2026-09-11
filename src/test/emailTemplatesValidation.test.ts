import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Production Email Template System Validation", () => {
  const templatesDir = path.resolve(process.cwd(), "docs", "email-templates");

  const authTemplates = [
    "confirm-signup.html",
    "invite-user.html",
    "magic-link.html",
    "change-email.html",
    "reset-password.html",
    "reauthentication.html",
  ];

  const securityNotificationTemplates = [
    "password-changed.html",
    "email-changed.html",
    "phone-changed.html",
    "mfa-enrolled.html",
    "mfa-unenrolled.html",
    "identity-linked.html",
    "identity-unlinked.html",
  ];

  const allTemplates = [...authTemplates, ...securityNotificationTemplates];

  it("should have all 13 HTML templates and README.md present in docs/email-templates", () => {
    expect(fs.existsSync(templatesDir)).toBe(true);
    for (const filename of allTemplates) {
      const fullPath = path.join(templatesDir, filename);
      expect(fs.existsSync(fullPath), `Template ${filename} must exist`).toBe(true);
      const stats = fs.statSync(fullPath);
      expect(stats.size, `Template ${filename} must not be empty`).toBeGreaterThan(1000);
    }
    const readmePath = path.join(templatesDir, "README.md");
    expect(fs.existsSync(readmePath), "README.md must exist").toBe(true);
  });

  it("should have valid HTML structure and no scripts or external trackers in all 13 templates", () => {
    for (const filename of allTemplates) {
      const content = fs.readFileSync(path.join(templatesDir, filename), "utf-8");

      // HTML Structure
      expect(content).toContain("<!DOCTYPE html>");
      expect(content).toContain("<html");
      expect(content).toContain("</html>");
      expect(content).toContain("<body");
      expect(content).toContain("</body>");

      // Security Checks
      expect(content).not.toContain("<script");
      expect(content).not.toContain("google-analytics");
      expect(content).not.toContain("doubleclick");
      expect(content).not.toContain("facebook.com");
      expect(content).not.toContain("track.png");
      expect(content).not.toContain("onerror=");
      expect(content).not.toContain("onload=");
      expect(content).not.toContain("onclick=");
      expect(content).not.toMatch(/\son[a-z]+=/i);

      // Brand checks
      expect(content).toContain("Campus Connect");
      expect(content).toContain("B. K. Birla Night Arts, Science &amp; Commerce College, Kalyan");
      expect(content).toContain("https://campusconnect.indevs.in/icons/icon-192.png");
    }
  });

  // --- Authentication Template Verifications ---

  it("should contain correct variables and CTA/OTP for confirm-signup.html", () => {
    const content = fs.readFileSync(path.join(templatesDir, "confirm-signup.html"), "utf-8");
    expect(content).toContain("{{ .ConfirmationURL }}");
    expect(content).toContain("{{ .Email }}");
    expect(content).toContain("{{ .Token }}");
    expect(content).toContain('class="btn"');
  });

  it("should contain correct variables and CTA for invite-user.html", () => {
    const content = fs.readFileSync(path.join(templatesDir, "invite-user.html"), "utf-8");
    expect(content).toContain("{{ .ConfirmationURL }}");
    expect(content).toContain("{{ .Email }}");
    expect(content).toContain('class="btn"');
  });

  it("should contain correct variables and CTA/OTP for magic-link.html", () => {
    const content = fs.readFileSync(path.join(templatesDir, "magic-link.html"), "utf-8");
    expect(content).toContain("{{ .ConfirmationURL }}");
    expect(content).toContain("{{ .Email }}");
    expect(content).toContain("{{ .Token }}");
    expect(content).toContain('class="btn"');
  });

  it("should contain correct variables, NewEmail, and CTA/OTP for change-email.html", () => {
    const content = fs.readFileSync(path.join(templatesDir, "change-email.html"), "utf-8");
    expect(content).toContain("{{ .ConfirmationURL }}");
    expect(content).toContain("{{ .Email }}");
    expect(content).toContain("{{ .NewEmail }}");
    expect(content).toContain("{{ .Token }}");
    expect(content).toContain('class="btn"');
  });

  it("should contain correct variables and CTA/OTP for reset-password.html", () => {
    const content = fs.readFileSync(path.join(templatesDir, "reset-password.html"), "utf-8");
    expect(content).toContain("{{ .ConfirmationURL }}");
    expect(content).toContain("{{ .Email }}");
    expect(content).toContain("{{ .Token }}");
    expect(content).toContain('class="btn"');
  });

  it("should contain Token and Email for reauthentication.html and NOT ConfirmationURL or CTA button", () => {
    const content = fs.readFileSync(path.join(templatesDir, "reauthentication.html"), "utf-8");
    expect(content).toContain("{{ .Token }}");
    expect(content).toContain("{{ .Email }}");
    // In GoTrue, Reauthentication is OTP only — ConfirmationURL is not supplied by GoTrue
    expect(content).not.toContain("{{ .ConfirmationURL }}");
    expect(content).not.toContain('class="btn"');
  });

  // --- Security Notification Template Verifications ---

  it("all 7 security notification templates must be notification-only with security warning and NO CTA buttons", () => {
    for (const filename of securityNotificationTemplates) {
      const content = fs.readFileSync(path.join(templatesDir, filename), "utf-8");

      // No confirmation URL or CTA button
      expect(content).not.toContain("{{ .ConfirmationURL }}");
      expect(content).not.toContain('class="btn"');
      expect(content).not.toContain("{{ .Token }}");

      // Must have security warning
      expect(content).toContain("security-warning");
      expect(content).toContain("If you did not make this change");
    }
  });

  it("should contain correct variables for password-changed.html", () => {
    const content = fs.readFileSync(path.join(templatesDir, "password-changed.html"), "utf-8");
    expect(content).toContain("{{ .Email }}");
    expect(content).toContain("password");
  });

  it("should contain correct variables for email-changed.html", () => {
    const content = fs.readFileSync(path.join(templatesDir, "email-changed.html"), "utf-8");
    expect(content).toContain("{{ .OldEmail }}");
    expect(content).toContain("{{ .Email }}");
  });

  it("should contain correct variables for phone-changed.html", () => {
    const content = fs.readFileSync(path.join(templatesDir, "phone-changed.html"), "utf-8");
    expect(content).toContain("{{ .OldPhone }}");
    expect(content).toContain("{{ .Phone }}");
    expect(content).toContain("{{ .Email }}");
  });

  it("should contain correct variables for mfa-enrolled.html", () => {
    const content = fs.readFileSync(path.join(templatesDir, "mfa-enrolled.html"), "utf-8");
    expect(content).toContain("{{ .FactorType }}");
    expect(content).toContain("{{ .Email }}");
  });

  it("should contain correct variables for mfa-unenrolled.html", () => {
    const content = fs.readFileSync(path.join(templatesDir, "mfa-unenrolled.html"), "utf-8");
    expect(content).toContain("{{ .FactorType }}");
    expect(content).toContain("{{ .Email }}");
  });

  it("should contain correct variables for identity-linked.html", () => {
    const content = fs.readFileSync(path.join(templatesDir, "identity-linked.html"), "utf-8");
    expect(content).toContain("{{ .Provider }}");
    expect(content).toContain("{{ .Email }}");
  });

  it("should contain correct variables for identity-unlinked.html", () => {
    const content = fs.readFileSync(path.join(templatesDir, "identity-unlinked.html"), "utf-8");
    expect(content).toContain("{{ .Provider }}");
    expect(content).toContain("{{ .Email }}");
  });

  // --- Strict Variable Isolation Checks ---

  it("should restrict specialized variables only to their supported template types", () => {
    for (const filename of allTemplates) {
      const content = fs.readFileSync(path.join(templatesDir, filename), "utf-8");

      // .NewEmail only allowed in change-email.html
      if (filename !== "change-email.html") {
        expect(content, `${filename} must not contain {{ .NewEmail }}`).not.toContain("{{ .NewEmail }}");
      }

      // .OldEmail only allowed in email-changed.html
      if (filename !== "email-changed.html") {
        expect(content, `${filename} must not contain {{ .OldEmail }}`).not.toContain("{{ .OldEmail }}");
      }

      // .OldPhone and .Phone only allowed in phone-changed.html
      if (filename !== "phone-changed.html") {
        expect(content, `${filename} must not contain {{ .OldPhone }}`).not.toContain("{{ .OldPhone }}");
        expect(content, `${filename} must not contain {{ .Phone }}`).not.toContain("{{ .Phone }}");
      }

      // .FactorType only allowed in mfa-enrolled.html and mfa-unenrolled.html
      if (filename !== "mfa-enrolled.html" && filename !== "mfa-unenrolled.html") {
        expect(content, `${filename} must not contain {{ .FactorType }}`).not.toContain("{{ .FactorType }}");
      }

      // .Provider only allowed in identity-linked.html and identity-unlinked.html
      if (filename !== "identity-linked.html" && filename !== "identity-unlinked.html") {
        expect(content, `${filename} must not contain {{ .Provider }}`).not.toContain("{{ .Provider }}");
      }
    }
  });

  it("README.md should document all 13 templates, redirect URLs and dashboard instructions", () => {
    const readme = fs.readFileSync(path.join(templatesDir, "README.md"), "utf-8");
    for (const filename of allTemplates) {
      expect(readme).toContain(filename);
    }
    expect(readme).toContain("smtp.zoho.in");
    expect(readme).toContain("noreply@campusconnect.indevs.in");
    expect(readme).toContain("Authentication Emails");
    expect(readme).toContain("Security Notification Emails");
  });
});
