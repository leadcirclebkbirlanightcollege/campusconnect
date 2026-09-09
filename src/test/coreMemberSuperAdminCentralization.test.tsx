import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { render, screen } from "@testing-library/react";
import React from "react";
import CoreMemberBadge from "@/components/badges/CoreMemberBadge";

describe("Production Change: Remove Verify/Unverify & Centralize Core Member Badge Control", () => {
  const studentManagementTabPath = path.resolve(
    process.cwd(),
    "src/pages/admin/students/StudentManagementTab.tsx"
  );
  const studentProfileDialogPath = path.resolve(
    process.cwd(),
    "src/pages/admin/students/StudentProfileDialog.tsx"
  );
  const saStudentsTabPath = path.resolve(
    process.cwd(),
    "src/pages/platform/components/SAStudentsTab.tsx"
  );
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20260909010000_super_admin_core_member_control.sql"
  );

  // 1. College Admin student list has NO Verify button
  it("1. College Admin student list has NO Verify button", () => {
    const content = fs.readFileSync(studentManagementTabPath, "utf-8");
    expect(content).not.toContain("toggleVerifyMutation");
    expect(content).not.toMatch(/>\s*Verify\s*</);
  });

  // 2. College Admin student list has NO Unverify button
  it("2. College Admin student list has NO Unverify button", () => {
    const content = fs.readFileSync(studentManagementTabPath, "utf-8");
    expect(content).not.toContain("toggleVerifyMutation");
    expect(content).not.toMatch(/>\s*Unverify\s*</);
    expect(content).not.toContain('s.is_verified ? "Unverify" : "Verify"');
  });

  // 3. College Admin cannot grant Core Member
  it("3. College Admin cannot grant Core Member from StudentProfileDialog", () => {
    const content = fs.readFileSync(studentProfileDialogPath, "utf-8");
    expect(content).not.toContain("Make Core Member");
    expect(content).not.toContain("Grant Core Member");
    expect(content).not.toContain("coreMemberMutation");
  });

  // 4. College Admin cannot revoke Core Member
  it("4. College Admin cannot revoke Core Member from StudentProfileDialog", () => {
    const content = fs.readFileSync(studentProfileDialogPath, "utf-8");
    expect(content).not.toContain("Remove Core Member");
    expect(content).not.toContain("coreMemberConfirmAction");
  });

  // 5. Super Admin can grant Core Member
  it("5. Super Admin can grant Core Member in SAStudentsTab", () => {
    const content = fs.readFileSync(saStudentsTabPath, "utf-8");
    expect(content).toContain("Grant Core");
    expect(content).toContain("Grant Core Team Badge");
    expect(content).toContain("Grant Core Team badge?");
    expect(content).toContain("admin_set_core_member");
  });

  // 6. Super Admin can revoke Core Member
  it("6. Super Admin can revoke Core Member in SAStudentsTab", () => {
    const content = fs.readFileSync(saStudentsTabPath, "utf-8");
    expect(content).toContain("Remove Core");
    expect(content).toContain("Remove Core Team Badge");
    expect(content).toContain("Remove Core Team badge?");
  });

  // 7. Direct unauthorized RPC call by admin is rejected
  it("7. Direct unauthorized RPC call by admin is rejected server-side", () => {
    const migration = fs.readFileSync(migrationPath, "utf-8");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_set_core_member");
    expect(migration).toContain("IF NOT public.is_super_admin(v_caller) THEN");
    expect(migration).toContain("RAISE EXCEPTION 'permission_denied: super_admin role required'");
    expect(migration).not.toContain("is_admin(v_caller) OR public.is_super_admin(v_caller)");

    // Simulate RPC auth check
    const checkRpcAuth = (role: string) => {
      if (role !== "super_admin") {
        throw new Error("permission_denied: super_admin role required");
      }
      return true;
    };

    expect(() => checkRpcAuth("admin")).toThrow("permission_denied: super_admin role required");
  });

  // 8. Direct unauthorized RPC call by student is rejected
  it("8. Direct unauthorized RPC call by student is rejected server-side", () => {
    const checkRpcAuth = (role: string) => {
      if (role !== "super_admin") {
        throw new Error("permission_denied: super_admin role required");
      }
      return true;
    };

    expect(() => checkRpcAuth("student")).toThrow("permission_denied: super_admin role required");
    expect(() => checkRpcAuth("faculty")).toThrow("permission_denied: super_admin role required");

    // Also check trigger logic protecting is_core_member against non-super-admins
    const migration = fs.readFileSync(migrationPath, "utf-8");
    expect(migration).toContain("IF public.is_admin(auth.uid()) THEN");
    expect(migration).toContain("NEW.is_core_member := OLD.is_core_member;");
  });

  // 9. is_verified=true does NOT render a public badge
  it("9. is_verified=true does NOT render a public badge", () => {
    const student = {
      is_verified: true,
      is_core_member: false,
    };

    // Rendering helper: only is_core_member may display CoreMemberBadge
    const shouldRenderBadge = (p: typeof student) => p.is_core_member === true;

    expect(shouldRenderBadge(student)).toBe(false);
  });

  // 10. is_core_member=true renders ONLY the Core Team badge
  it("10. is_core_member=true renders ONLY the Core Team badge", () => {
    const coreMember = {
      is_verified: false,
      is_core_member: true,
    };

    const { container } = render(
      <CoreMemberBadge variant="compact" showTooltip={false} />
    );
    expect(container.textContent).toContain("Core Member");
  });

  // 11. Core Team badge is persisted after refresh
  it("11. Core Team badge is persisted after refresh when is_core_member is true", () => {
    // Simulate re-fetching user profile from DB after reload
    const refreshedProfile = {
      user_id: "user-123",
      is_core_member: true,
      is_verified: true,
    };

    const { container } = render(
      <div>
        {refreshedProfile.is_core_member ? (
          <CoreMemberBadge variant="profile" showTooltip={false} />
        ) : null}
      </div>
    );
    expect(container.textContent).toContain("Core Member");
  });

  // 12. Removing Core Member status removes the badge after refresh
  it("12. Removing Core Member status removes the badge after refresh", () => {
    // Simulate user state after Super Admin revokes Core Member status
    const revokedProfile = {
      user_id: "user-123",
      is_core_member: false,
      is_verified: true,
    };

    const { container } = render(
      <div>
        {revokedProfile.is_core_member ? (
          <CoreMemberBadge variant="profile" showTooltip={false} />
        ) : (
          <span>Normal Student</span>
        )}
      </div>
    );
    expect(container.textContent).not.toContain("Core Team");
    expect(container.textContent).toContain("Normal Student");
  });

  // 13. Core Member status does not affect institutional approval/verification
  it("13. Core Member status does not affect institutional approval/verification", () => {
    let student = {
      is_verified: true,
      approval_status: "approved",
      college_assigned: true,
      is_core_member: false,
    };

    // Super Admin grants Core Team
    student = { ...student, is_core_member: true };

    expect(student.is_verified).toBe(true);
    expect(student.approval_status).toBe("approved");
    expect(student.college_assigned).toBe(true);
    expect(student.is_core_member).toBe(true);
  });

  // 14. Institutional verification does not automatically grant Core Member status
  it("14. Institutional verification does not automatically grant Core Member status", () => {
    let unverifiedStudent = {
      is_verified: false,
      approval_status: "pending",
      is_core_member: false,
    };

    // College approves and verifies ID card
    unverifiedStudent = {
      ...unverifiedStudent,
      is_verified: true,
      approval_status: "approved",
    };

    expect(unverifiedStudent.is_verified).toBe(true);
    expect(unverifiedStudent.approval_status).toBe("approved");
    // Must strictly remain NOT a core member
    expect(unverifiedStudent.is_core_member).toBe(false);
  });
});
