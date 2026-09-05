import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Admin-Controlled Institution Assignment Specification", () => {
  const facultyProfilePath = path.resolve(__dirname, "../pages/faculty/FacultyProfile.tsx");
  const facultyProfileCode = fs.readFileSync(facultyProfilePath, "utf-8");

  const migrationPath = path.resolve(__dirname, "../../supabase/migrations/20260905130000_admin_faculty_institution_assignment.sql");
  const migrationCode = fs.readFileSync(migrationPath, "utf-8");

  const dialogPath = path.resolve(__dirname, "../pages/admin/faculty/InstitutionalAssignmentDialog.tsx");
  const dialogCode = fs.readFileSync(dialogPath, "utf-8");

  const adminTabPath = path.resolve(__dirname, "../pages/admin/faculty/AdminFacultyTab.tsx");
  const adminTabCode = fs.readFileSync(adminTabPath, "utf-8");

  const editDialogPath = path.resolve(__dirname, "../pages/admin/faculty/EditFacultyDialog.tsx");
  const editDialogCode = fs.readFileSync(editDialogPath, "utf-8");

  const drawerPath = path.resolve(__dirname, "../pages/admin/faculty/FacultyDetailDrawer.tsx");
  const drawerCode = fs.readFileSync(drawerPath, "utf-8");

  it("ensures FacultyProfile never falls back to hardcoded 'Campus Connect Institution'", () => {
    expect(facultyProfileCode).not.toContain('"Campus Connect Institution"');
    expect(facultyProfileCode).not.toContain("'Campus Connect Institution'");
  });

  it("displays 'Not assigned' informational state when college is null or absent in FacultyProfile", () => {
    expect(facultyProfileCode).toContain("Not assigned");
    expect(facultyProfileCode).toContain("System managed affiliation");
  });

  it("ensures Faculty cannot edit their affiliated college in FacultyProfile form", () => {
    // The profile edit form only has title, name, email, phone, department
    expect(facultyProfileCode).not.toContain('name="college_id"');
    expect(facultyProfileCode).not.toContain('name="college"');
    expect(facultyProfileCode).not.toContain('name="institution"');
  });

  it("verifies the database migration restricts college_id modification to administrators", () => {
    expect(migrationCode).toContain("profiles_guard_protected_fields");
    expect(migrationCode).toContain("NEW.college_id IS DISTINCT FROM OLD.college_id");
    expect(migrationCode).toContain("only administrators can assign or modify institutional affiliation");
    expect(migrationCode).toContain("admin_assign_faculty_institution");
  });

  it("verifies InstitutionalAssignmentDialog includes all required fields and actions", () => {
    expect(dialogCode).toContain("Institutional Assignment");
    expect(dialogCode).toContain("Faculty Name");
    expect(dialogCode).toContain("Faculty ID");
    expect(dialogCode).toContain("Institution / College");
    expect(dialogCode).toContain("Department");
    expect(dialogCode).toContain("Role");
    expect(dialogCode).toContain("Save Assignment");
    expect(dialogCode).toContain("Cancel");
    expect(dialogCode).toContain("admin_assign_faculty_institution");
  });

  it("verifies AdminFacultyTab integrates colleges, Institution column, and Institutional Assignment action", () => {
    expect(adminTabCode).toContain("Institutional Assignment");
    expect(adminTabCode).toContain("InstitutionalAssignmentDialog");
    expect(adminTabCode).toContain("Institution");
    expect(adminTabCode).toContain("colleges_list");
  });

  it("verifies EditFacultyDialog and FacultyDetailDrawer support institutional assignment", () => {
    expect(editDialogCode).toContain("Institution / College");
    expect(editDialogCode).toContain("Admin Managed");
    expect(drawerCode).toContain("Affiliated Institution");
    expect(drawerCode).toContain("onAssignInstitution");
  });
});
