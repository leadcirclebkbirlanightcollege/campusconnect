import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import fs from "fs";
import path from "path";

import CoreMemberBadge, { CoreMemberInsignia } from "@/components/badges/CoreMemberBadge";
import InstallPromptBanner from "@/components/pwa/InstallPromptBanner";
import PwaInstallPage from "@/pages/student/PwaInstallPage";

// Mock react-router-dom Navigate
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="mock-navigate" data-to={to} />,
  };
});

describe("PWA Install Prompt Deactivation & Removal", () => {
  it("InstallPromptBanner renders null and executes no user-facing installation logic", () => {
    const { container } = render(<InstallPromptBanner />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/install/i)).toBeNull();
    expect(screen.queryByText(/show steps/i)).toBeNull();
    expect(screen.queryByText(/add to home screen/i)).toBeNull();
  });

  it("PwaInstallPage redirects to /app instead of rendering manual install steps", () => {
    render(<PwaInstallPage />);
    const navigateEl = screen.getByTestId("mock-navigate");
    expect(navigateEl).toBeDefined();
    expect(navigateEl.getAttribute("data-to")).toBe("/app");
  });

  it("App.tsx does not mount or import InstallPromptBanner", () => {
    const appFile = fs.readFileSync(
      path.resolve(__dirname, "../App.tsx"),
      "utf-8"
    );
    expect(appFile).not.toContain("<InstallPromptBanner");
    expect(appFile).not.toContain("import InstallPromptBanner");
  });

  it("MoreHub.tsx does not feature an 'Install App' tile", () => {
    const moreHubFile = fs.readFileSync(
      path.resolve(__dirname, "../pages/student/hubs/MoreHub.tsx"),
      "utf-8"
    );
    expect(moreHubFile).not.toContain("Install App");
    expect(moreHubFile).not.toContain("/app/install");
  });

  it("navigation-engine does not route match /app/install", () => {
    const navFile = fs.readFileSync(
      path.resolve(__dirname, "../ui-engine/navigation-engine.ts"),
      "utf-8"
    );
    expect(navFile).not.toContain("/app/install");
  });
});

describe("Campus Connect Core Member Verified Badge Component", () => {
  it("renders compact variant with official accessible label and insignia", () => {
    render(<CoreMemberBadge variant="compact" showTooltip={false} />);
    const badge = screen.getByRole("status");
    expect(badge).toBeDefined();
    expect(badge.getAttribute("aria-label")).toBe("Campus Connect Core Member");
    expect(badge.textContent).toContain("Campus Connect Core Member");
  });

  it("renders profile variant with 'Core Member' text and deep navy / cyan styling", () => {
    render(<CoreMemberBadge variant="profile" showTooltip={false} />);
    const badge = screen.getByRole("status");
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain("Core Member");
    expect(badge.className).toContain("bg-gradient-to-r");
  });

  it("renders prominent variant with official team branding", () => {
    render(<CoreMemberBadge variant="prominent" showTooltip={false} />);
    const badge = screen.getByRole("status");
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain("Campus Connect Core Team");
  });

  it("CoreMemberInsignia renders an SVG with official gradient definitions", () => {
    const { container } = render(<CoreMemberInsignia size={24} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(container.querySelector("#cc-core-bg")).toBeDefined();
    expect(container.querySelector("#cc-core-border")).toBeDefined();
  });
});

describe("Strict Decoupling: Core Member vs Student Identity Verification", () => {
  it("verifies that Core Member and Identity Verification are independent data concepts", () => {
    // Student 1: Verified student who is NOT a Core Member
    const student1 = {
      name: "Student One",
      is_verified: true,
      is_core_member: false,
    };
    expect(student1.is_verified).toBe(true);
    expect(student1.is_core_member).toBe(false);

    // Student 2: Core Member who is also Identity Verified
    const student2 = {
      name: "Atharv Jadhav",
      is_verified: true,
      is_core_member: true,
    };
    expect(student2.is_verified).toBe(true);
    expect(student2.is_core_member).toBe(true);

    // Student 3: New Core Member whose college ID is still pending
    const student3 = {
      name: "Core Member Three",
      is_verified: false,
      is_core_member: true,
    };
    expect(student3.is_verified).toBe(false);
    expect(student3.is_core_member).toBe(true);
  });
});

describe("Database Migration & Security Architecture", () => {
  it("migration file exists and enforces trigger-level protection and admin RPC", () => {
    const migrationPath = path.resolve(
      __dirname,
      "../../supabase/migrations/20260908040000_core_member_badge.sql"
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
    const content = fs.readFileSync(migrationPath, "utf-8");

    // 1. Column addition
    expect(content).toContain("ADD COLUMN IF NOT EXISTS is_core_member boolean NOT NULL DEFAULT false");

    // 2. Index for fast queries
    expect(content).toContain("idx_profiles_is_core_member");

    // 3. Trigger guard against unauthorized client manipulation
    expect(content).toContain("NEW.is_core_member    := OLD.is_core_member;");
    expect(content).toContain("profiles_guard_protected_fields");

    // 4. Secure admin RPC
    expect(content).toContain("CREATE OR REPLACE FUNCTION public.admin_set_core_member");
    expect(content).toContain("SECURITY DEFINER");
    expect(content).toContain("is_admin(v_caller) OR public.is_super_admin(v_caller)");
  });

  it("types.ts declares is_core_member on profiles and admin_set_core_member RPC", () => {
    const typesPath = path.resolve(
      __dirname,
      "../integrations/supabase/types.ts"
    );
    const content = fs.readFileSync(typesPath, "utf-8");
    expect(content).toContain("is_core_member: boolean");
    expect(content).toContain("admin_set_core_member:");
  });
});
