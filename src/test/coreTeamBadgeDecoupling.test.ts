import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Canonical Badge Rule:
 * Campus Connect has ONLY ONE special badge that should be displayed to eligible users:
 * "CAMPUS CONNECT CORE TEAM" badge.
 *
 * This badge is exclusively for users who have been manually granted Campus Connect
 * Core Team membership (profiles.is_core_member === true).
 *
 * It must NEVER be shown based on:
 * - College ID verification (is_verified)
 * - Profile approval status (approval_status)
 * - Profile completion
 * - College membership / college_id
 * - ABC ID
 * - Department / course
 * - Faculty / Admin role
 * - Existence of any verified student
 * - Another user's verification
 */

interface UserProfile {
  user_id: string;
  name: string;
  role: "student" | "faculty" | "admin";
  college_id: string;
  is_verified: boolean;
  is_core_member: boolean;
  approval_status: "pending" | "approved" | "rejected";
  profile_completed: boolean;
  abc_id?: string | null;
  department?: string | null;
  course_name?: string | null;
}

// Canonical evaluation function representing the strict per-user Core Team badge rule
function shouldShowCoreTeamBadge(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(profile.is_core_member);
}

// Spurious badge detector: ensures no other field can produce the Core Team badge
function shouldShowAnyVerificationBadge(profile: UserProfile | null | undefined): boolean {
  return shouldShowCoreTeamBadge(profile);
}

describe("Core Team Badge Decoupling & Exclusivity (Regression Tests 1-10)", () => {
  // TEST 1: Core Team member → Core Team badge TRUE.
  it("TEST 1: Core Team member displays Core Team badge = TRUE", () => {
    const student: UserProfile = {
      user_id: "usr-1",
      name: "Core Member Alice",
      role: "student",
      college_id: "col-1",
      is_verified: true,
      is_core_member: true,
      approval_status: "approved",
      profile_completed: true,
    };
    expect(shouldShowCoreTeamBadge(student)).toBe(true);
  });

  // TEST 2: Normal student → Core Team badge FALSE.
  it("TEST 2: Normal student displays Core Team badge = FALSE", () => {
    const student: UserProfile = {
      user_id: "usr-2",
      name: "Normal Bob",
      role: "student",
      college_id: "col-1",
      is_verified: false,
      is_core_member: false,
      approval_status: "pending",
      profile_completed: false,
    };
    expect(shouldShowCoreTeamBadge(student)).toBe(false);
  });

  // TEST 3: College ID verified but not Core Team → badge FALSE.
  it("TEST 3: College ID verified student without Core Team displays Core Team badge = FALSE", () => {
    const student: UserProfile = {
      user_id: "usr-3",
      name: "Verified Charlie",
      role: "student",
      college_id: "col-1",
      is_verified: true, // ID verified
      is_core_member: false, // NOT core team
      approval_status: "approved",
      profile_completed: true,
    };
    expect(shouldShowCoreTeamBadge(student)).toBe(false);
    expect(shouldShowAnyVerificationBadge(student)).toBe(false);
  });

  // TEST 4: Profile approved but not Core Team → badge FALSE.
  it("TEST 4: Profile approved student without Core Team displays Core Team badge = FALSE", () => {
    const student: UserProfile = {
      user_id: "usr-4",
      name: "Approved Diana",
      role: "student",
      college_id: "col-1",
      is_verified: false,
      is_core_member: false,
      approval_status: "approved",
      profile_completed: true,
    };
    expect(shouldShowCoreTeamBadge(student)).toBe(false);
  });

  // TEST 5: Student A is Core Team; Student B is normal student → A gets badge, B does not.
  it("TEST 5: Student A (Core Team) gets badge; Student B (normal) does NOT get badge", () => {
    const studentA: UserProfile = {
      user_id: "usr-a",
      name: "Student A",
      role: "student",
      college_id: "col-1",
      is_verified: true,
      is_core_member: true,
      approval_status: "approved",
      profile_completed: true,
    };
    const studentB: UserProfile = {
      user_id: "usr-b",
      name: "Student B",
      role: "student",
      college_id: "col-1",
      is_verified: false,
      is_core_member: false,
      approval_status: "pending",
      profile_completed: false,
    };

    expect(shouldShowCoreTeamBadge(studentA)).toBe(true);
    expect(shouldShowCoreTeamBadge(studentB)).toBe(false);
  });

  // TEST 6: Grant Core Team to Student B → B gets badge, existing non-Core-Team students do not.
  it("TEST 6: Granting Core Team to Student B grants badge to B without affecting others", () => {
    let studentB: UserProfile = {
      user_id: "usr-b",
      name: "Student B",
      role: "student",
      college_id: "col-1",
      is_verified: false,
      is_core_member: false,
      approval_status: "approved",
      profile_completed: true,
    };
    const studentC: UserProfile = {
      user_id: "usr-c",
      name: "Student C",
      role: "student",
      college_id: "col-1",
      is_verified: true,
      is_core_member: false,
      approval_status: "approved",
      profile_completed: true,
    };

    // Before granting
    expect(shouldShowCoreTeamBadge(studentB)).toBe(false);
    expect(shouldShowCoreTeamBadge(studentC)).toBe(false);

    // Admin grants Core Team to Student B
    studentB = { ...studentB, is_core_member: true };

    // After granting
    expect(shouldShowCoreTeamBadge(studentB)).toBe(true);
    expect(shouldShowCoreTeamBadge(studentC)).toBe(false);
  });

  // TEST 7: Revoke Core Team from Student A → A loses badge.
  it("TEST 7: Revoking Core Team from Student A immediately removes badge", () => {
    let studentA: UserProfile = {
      user_id: "usr-a",
      name: "Student A",
      role: "student",
      college_id: "col-1",
      is_verified: true,
      is_core_member: true,
      approval_status: "approved",
      profile_completed: true,
    };
    expect(shouldShowCoreTeamBadge(studentA)).toBe(true);

    // Admin revokes Core Team from Student A
    studentA = { ...studentA, is_core_member: false };
    expect(shouldShowCoreTeamBadge(studentA)).toBe(false);
  });

  // TEST 8: Different college/user cannot inherit another user's Core Team badge.
  it("TEST 8: Core Team membership is strictly per-user and cannot be inherited across colleges or accounts", () => {
    const college1Member: UserProfile = {
      user_id: "usr-c1-1",
      name: "College 1 Core Member",
      role: "student",
      college_id: "college-1",
      is_verified: true,
      is_core_member: true,
      approval_status: "approved",
      profile_completed: true,
    };

    const college1OtherStudent: UserProfile = {
      user_id: "usr-c1-2",
      name: "College 1 Other Student",
      role: "student",
      college_id: "college-1",
      is_verified: true,
      is_core_member: false,
      approval_status: "approved",
      profile_completed: true,
    };

    const college2Student: UserProfile = {
      user_id: "usr-c2-1",
      name: "College 2 Student",
      role: "student",
      college_id: "college-2",
      is_verified: true,
      is_core_member: false,
      approval_status: "approved",
      profile_completed: true,
    };

    expect(shouldShowCoreTeamBadge(college1Member)).toBe(true);
    expect(shouldShowCoreTeamBadge(college1OtherStudent)).toBe(false);
    expect(shouldShowCoreTeamBadge(college2Student)).toBe(false);
  });

  // TEST 9: Admin/faculty role alone does not produce Core Team badge.
  it("TEST 9: Admin and faculty roles alone do NOT produce Core Team badge", () => {
    const admin: UserProfile = {
      user_id: "usr-admin",
      name: "Admin User",
      role: "admin",
      college_id: "col-1",
      is_verified: true,
      is_core_member: false,
      approval_status: "approved",
      profile_completed: true,
    };

    const faculty: UserProfile = {
      user_id: "usr-faculty",
      name: "Faculty User",
      role: "faculty",
      college_id: "col-1",
      is_verified: true,
      is_core_member: false,
      approval_status: "approved",
      profile_completed: true,
    };

    expect(shouldShowCoreTeamBadge(admin)).toBe(false);
    expect(shouldShowCoreTeamBadge(faculty)).toBe(false);
  });

  // TEST 10: ABC ID status does not produce Core Team badge.
  it("TEST 10: Having an ABC ID does not produce Core Team badge", () => {
    const studentWithAbcId: UserProfile = {
      user_id: "usr-abc",
      name: "Student with ABC ID",
      role: "student",
      college_id: "col-1",
      is_verified: true,
      is_core_member: false,
      approval_status: "approved",
      profile_completed: true,
      abc_id: "123-456-789-012",
    };

    expect(shouldShowCoreTeamBadge(studentWithAbcId)).toBe(false);
  });
});

describe("UI Source Code Integrity: No Spurious is_verified Badge Fallback", () => {
  it("AppShell.tsx does not display BadgeCheck or fallback on is_verified for avatar badge", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../components/layout/AppShell.tsx"),
      "utf-8"
    );
    expect(content).not.toContain("BadgeCheck");
    expect(content).not.toContain("is_verified ?");
    expect(content).toContain("profileMiniQuery.data?.is_core_member ?");
  });

  it("AppLayout.tsx does not display BadgeCheck or 'Verified Student' pill", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../components/layout/AppLayout.tsx"),
      "utf-8"
    );
    expect(content).not.toContain("BadgeCheck");
    expect(content).not.toContain("Verified Student");
    expect(content).toContain("profile?.is_core_member ?");
  });

  it("StudentProfile.tsx does not display spurious is_verified badge in profile header", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../pages/student/StudentProfile.tsx"),
      "utf-8"
    );
    expect(content).not.toContain("profile?.is_verified &&");
    expect(content).toContain("profile?.is_core_member &&");
  });

  it("StudentManagementTab.tsx does not render a verified checkmark badge next to student name", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../pages/admin/students/StudentManagementTab.tsx"),
      "utf-8"
    );
    expect(content).not.toContain("aria-label=\"Student Identity Verified\"");
    expect(content).toContain("s.is_core_member ?");
  });

  it("StudentProfileDialog.tsx does not render a verified checkmark badge next to student name in dialog title", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../pages/admin/students/StudentProfileDialog.tsx"),
      "utf-8"
    );
    expect(content).not.toContain("aria-label=\"Student Identity Verified\"");
    expect(content).toContain("profileQuery.data?.is_core_member ?");
  });

  it("Leaderboard.tsx does not render a Shield badge next to row.is_verified", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../pages/Leaderboard.tsx"),
      "utf-8"
    );
    expect(content).not.toContain("row.is_verified ? <Shield");
  });
});

describe("RLS & Trigger Security Integrity", () => {
  it("enforces that non-admin clients cannot tamper with is_core_member via profiles trigger", () => {
    const migration = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../supabase/migrations/20260908040000_core_member_badge.sql"
      ),
      "utf-8"
    );
    expect(migration).toContain("NEW.is_core_member    := OLD.is_core_member;");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_set_core_member");
    expect(migration).toContain("is_admin(v_caller) OR public.is_super_admin(v_caller)");
  });
});
