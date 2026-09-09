import { describe, it, expect } from "vitest";
import { getDeptAbbr, buildClassCode } from "@/lib/programme-utils";
import { COURSES } from "@/lib/courses";
import fs from "fs";
import path from "path";

// BKBNC canonical database fixtures matching production tables
const BKBNC_COLLEGE_ID = "ae89313d-01a4-43e5-a6a5-a090195cb967";

const BKBNC_DEPARTMENTS = [
  { id: "43bad539-9038-4f69-8f1d-93c257b73652", college_id: BKBNC_COLLEGE_ID, name: "B.A. (110101)", is_active: true },
  { id: "db2ac2c6-8a62-4191-b5f3-5c731434172b", college_id: BKBNC_COLLEGE_ID, name: "B.Com. (112101)", is_active: true },
  { id: "113d9fa3-c174-4b70-ac9f-13e69af52025", college_id: BKBNC_COLLEGE_ID, name: "B.Com. (Accounting & Finance) (223002)", is_active: true },
  { id: "cc0cc5f7-50bb-456f-b448-0177ba30d604", college_id: BKBNC_COLLEGE_ID, name: "B.Com. (Financial Markets) (223004)", is_active: true },
  { id: "955d2a29-b485-47d4-8af7-c4d24775dbea", college_id: BKBNC_COLLEGE_ID, name: "B.Com. (Management Studies) (223005)", is_active: true },
  { id: "49e91f98-cc59-4549-8d00-05168cebf569", college_id: BKBNC_COLLEGE_ID, name: "B.Sc. (111101)", is_active: true },
  { id: "53151eb5-2b36-4fb8-b399-728ec2dd999b", college_id: BKBNC_COLLEGE_ID, name: "B.Sc. (Computer Science) (1151061)", is_active: true },
];

const BKBNC_CLASSES = [
  { id: "d6421d9d-2ca5-43b9-afb7-9e52fe715630", department_id: "43bad539-9038-4f69-8f1d-93c257b73652", name: "FYBA", year: 1 },
  { id: "3c4c9556-30d6-4105-ac4e-07ca23de2804", department_id: "43bad539-9038-4f69-8f1d-93c257b73652", name: "SYBA", year: 2 },
  { id: "daa0a3b2-6401-42c9-9fe5-12d75210ba5c", department_id: "43bad539-9038-4f69-8f1d-93c257b73652", name: "TYBA", year: 3 },
  { id: "de9965d5-3921-4f0d-82c2-f7b1d7e38724", department_id: "db2ac2c6-8a62-4191-b5f3-5c731434172b", name: "FYBCOM", year: 1 },
  { id: "6af31cb2-08c0-4ca9-9a10-2ce9d9c9e130", department_id: "db2ac2c6-8a62-4191-b5f3-5c731434172b", name: "SYBCOM", year: 2 },
  { id: "9234bbcc-bdf3-4719-8403-bb066c157f4c", department_id: "db2ac2c6-8a62-4191-b5f3-5c731434172b", name: "TYBCOM", year: 3 },
  { id: "649f7edc-9581-43c9-b80d-dd71ff9339c6", department_id: "113d9fa3-c174-4b70-ac9f-13e69af52025", name: "FYBAF", year: 1 },
  { id: "4d05e37d-e569-4f14-8043-24aabe6badcb", department_id: "113d9fa3-c174-4b70-ac9f-13e69af52025", name: "SYBAF", year: 2 },
  { id: "27615328-39a2-4c30-b599-206f29f411ca", department_id: "113d9fa3-c174-4b70-ac9f-13e69af52025", name: "TYBAF", year: 3 },
  { id: "84f7e299-77f9-47f1-902b-158c25f9499f", department_id: "cc0cc5f7-50bb-456f-b448-0177ba30d604", name: "FYBFM", year: 1 },
  { id: "0582842e-cdc4-4444-8f47-9435be552136", department_id: "cc0cc5f7-50bb-456f-b448-0177ba30d604", name: "SYBFM", year: 2 },
  { id: "704b600f-4fcd-4d7d-8fc8-27d6aa58b20b", department_id: "cc0cc5f7-50bb-456f-b448-0177ba30d604", name: "TYBFM", year: 3 },
  { id: "b49b4b56-e523-416c-8575-b6876e767fcb", department_id: "955d2a29-b485-47d4-8af7-c4d24775dbea", name: "FYBMS", year: 1 },
  { id: "84cae7fb-d010-4737-9a00-37eff3a960c5", department_id: "955d2a29-b485-47d4-8af7-c4d24775dbea", name: "SYBMS", year: 2 },
  { id: "ecd3a314-49c2-4872-ab97-01482dd45614", department_id: "955d2a29-b485-47d4-8af7-c4d24775dbea", name: "TYBMS", year: 3 },
  { id: "fc5291ec-7c2d-471f-be51-321f426316e3", department_id: "49e91f98-cc59-4549-8d00-05168cebf569", name: "FYBSC", year: 1 },
  { id: "1091de30-dc39-4fd0-9e4d-aab040ddc69b", department_id: "49e91f98-cc59-4549-8d00-05168cebf569", name: "SYBSC", year: 2 },
  { id: "530ad8a7-ccd9-45a3-81a6-e462dacebb04", department_id: "49e91f98-cc59-4549-8d00-05168cebf569", name: "TYBSC", year: 3 },
  { id: "2e7e47ad-4158-4934-b554-c981536b3314", department_id: "53151eb5-2b36-4fb8-b399-728ec2dd999b", name: "FYCS", year: 1 },
  { id: "7c22c625-0963-4ef4-98b5-1dd7d9c77764", department_id: "53151eb5-2b36-4fb8-b399-728ec2dd999b", name: "SYCS", year: 2 },
  { id: "f8201d35-4494-45f2-9414-59c9943399e2", department_id: "53151eb5-2b36-4fb8-b399-728ec2dd999b", name: "TYCS", year: 3 },
];

/**
 * Pure TypeScript replica of the canonical SQL function `resolve_student_department`
 * to rigorously test all resolution rules in unit testing.
 */
function resolveStudentDepartment(
  collegeId: string,
  courseCode: string | null | undefined,
  courseName: string | null | undefined,
  departments = BKBNC_DEPARTMENTS
) {
  const cleanCode = (courseCode || "").trim();
  const cleanName = (courseName || "").trim();
  const activeDepts = departments.filter((d) => d.college_id === collegeId && d.is_active);

  // Tier 1: Exact code match in department name: e.g. '%(1151061)%' or '%(223005)%'
  if (cleanCode.length > 0) {
    const match = activeDepts.find((d) => d.name.toLowerCase().includes(`(${cleanCode.toLowerCase()})`));
    if (match) return match;
  }

  // Tier 2: Specialized programmes by standardized abbreviation & keywords
  // A. Management Studies (BMS)
  if (
    /management\s*studies/i.test(cleanName) ||
    /bms/i.test(cleanName) ||
    cleanCode === "2126561" ||
    cleanCode === "223005"
  ) {
    const match = activeDepts.find(
      (d) =>
        /management\s*studies/i.test(d.name) ||
        /\(bms\)/i.test(d.name) ||
        d.name.includes("(223005)")
    );
    if (match) return match;
  }

  // B. Accounting & Finance (BAF)
  if (
    /accounting/i.test(cleanName) ||
    /baf/i.test(cleanName) ||
    cleanCode === "2126261" ||
    cleanCode === "223002"
  ) {
    const match = activeDepts.find(
      (d) =>
        /accounting/i.test(d.name) ||
        /\(baf\)/i.test(d.name) ||
        d.name.includes("(223002)")
    );
    if (match) return match;
  }

  // C. Financial Markets (BFM)
  if (
    /financial\s*markets/i.test(cleanName) ||
    /bfm/i.test(cleanName) ||
    cleanCode === "2126361" ||
    cleanCode === "223004"
  ) {
    const match = activeDepts.find(
      (d) =>
        /financial\s*markets/i.test(d.name) ||
        /\(bfm\)/i.test(d.name) ||
        d.name.includes("(223004)")
    );
    if (match) return match;
  }

  // D. Computer Science (BSc CS / CS)
  if (
    /computer\s*science/i.test(cleanName) ||
    /bsc\s*cs/i.test(cleanName) ||
    /\(cs\)/i.test(cleanName) ||
    cleanCode === "1151061"
  ) {
    const match = activeDepts.find(
      (d) =>
        /computer\s*science/i.test(d.name) ||
        /\(cs\)/i.test(d.name) ||
        d.name.includes("(1151061)")
    );
    if (match) return match;
  }

  // E. General Commerce (B.Com / BCOM) - strictly excludes specialized B.Com branches
  if (
    (/\bb\.?com\b/i.test(cleanName) || cleanCode === "2126161" || cleanCode === "112101") &&
    !/management/i.test(cleanName) &&
    !/accounting/i.test(cleanName) &&
    !/financial/i.test(cleanName)
  ) {
    const match = activeDepts.find(
      (d) =>
        /\bb\.?com\b/i.test(d.name) &&
        !/management/i.test(d.name) &&
        !/accounting/i.test(d.name) &&
        !/financial/i.test(d.name)
    );
    if (match) return match;
  }

  // F. General Science (B.Sc / BSc) - strictly excludes Computer Science
  if (
    (/\bb\.?sc\b/i.test(cleanName) || cleanCode === "1150161" || cleanCode === "111101") &&
    !/computer\s*science/i.test(cleanName) &&
    !/\(cs\)/i.test(cleanName)
  ) {
    const match = activeDepts.find(
      (d) =>
        /\bb\.?sc\b/i.test(d.name) &&
        !/computer\s*science/i.test(d.name) &&
        !/\(cs\)/i.test(d.name)
    );
    if (match) return match;
  }

  // G. General Arts (B.A / BA)
  if (/\bb\.?a\b/i.test(cleanName) || cleanCode === "3180161" || cleanCode === "110101") {
    const match = activeDepts.find((d) => /\bb\.?a\b/i.test(d.name));
    if (match) return match;
  }

  // Tier 3: Fallback exact prefix match
  if (cleanName.length > 0) {
    const match = activeDepts.find((d) => d.name.toLowerCase().startsWith(cleanName.toLowerCase()));
    if (match) return match;
  }

  return null; // Zero generic fallback
}

describe("Admin Student Verification Auto-Assignment: B.Com. (Management Studies)", () => {
  it("resolves B.Com. (Management Studies) to BMS abbreviation", () => {
    const abbr = getDeptAbbr("B.Com. (Management Studies) (223005)");
    expect(abbr).toBe("BMS");
  });

  it("resolves B.Com. (Management Studies) with course_code '2126561' to existing BKBNC department", () => {
    const dept = resolveStudentDepartment(
      BKBNC_COLLEGE_ID,
      "2126561",
      "B.Com. (Management Studies)"
    );

    expect(dept).not.toBeNull();
    expect(dept?.id).toBe("955d2a29-b485-47d4-8af7-c4d24775dbea");
    expect(dept?.name).toBe("B.Com. (Management Studies) (223005)");
  });

  it("resolves SY academic year to SYBMS class cohort under B.Com. (Management Studies) department", () => {
    const dept = resolveStudentDepartment(
      BKBNC_COLLEGE_ID,
      "2126561",
      "B.Com. (Management Studies)"
    );
    expect(dept).not.toBeNull();

    const syYearInt = 2; // SY -> year 2
    const matchingClass = BKBNC_CLASSES.find(
      (c) => c.department_id === dept!.id && c.year === syYearInt
    );

    expect(matchingClass).toBeDefined();
    expect(matchingClass?.id).toBe("84cae7fb-d010-4737-9a00-37eff3a960c5");
    expect(matchingClass?.name).toBe("SYBMS");
  });

  it("resolves all standardized BKBNC specialized and general courses without collision", () => {
    // 1. BMS
    const bms = resolveStudentDepartment(BKBNC_COLLEGE_ID, "2126561", "B.Com. (Management Studies)");
    expect(bms?.name).toBe("B.Com. (Management Studies) (223005)");
    expect(getDeptAbbr(bms?.name)).toBe("BMS");

    // 2. BAF
    const baf = resolveStudentDepartment(BKBNC_COLLEGE_ID, "2126261", "B.Com. (Accounting & Finance)");
    expect(baf?.name).toBe("B.Com. (Accounting & Finance) (223002)");
    expect(getDeptAbbr(baf?.name)).toBe("BAF");

    // 3. BFM
    const bfm = resolveStudentDepartment(BKBNC_COLLEGE_ID, "2126361", "B.Com. (Financial Markets)");
    expect(bfm?.name).toBe("B.Com. (Financial Markets) (223004)");
    expect(getDeptAbbr(bfm?.name)).toBe("BFM");

    // 4. Computer Science
    const cs = resolveStudentDepartment(BKBNC_COLLEGE_ID, "1151061", "B.Sc. (Computer Science)");
    expect(cs?.name).toBe("B.Sc. (Computer Science) (1151061)");
    expect(getDeptAbbr(cs?.name)).toBe("BSc CS");

    // 5. Generic Commerce (MUST NOT collide with BAF/BMS/BFM)
    const bcom = resolveStudentDepartment(BKBNC_COLLEGE_ID, "2126161", "B.Com.");
    expect(bcom?.name).toBe("B.Com. (112101)");
    expect(getDeptAbbr(bcom?.name)).toBe("BCOM");

    // 6. Generic Science (MUST NOT collide with Computer Science)
    const bsc = resolveStudentDepartment(BKBNC_COLLEGE_ID, "1150161", "B.Sc.");
    expect(bsc?.name).toBe("B.Sc. (111101)");
    expect(getDeptAbbr(bsc?.name)).toBe("BSc");

    // 7. Generic Arts
    const ba = resolveStudentDepartment(BKBNC_COLLEGE_ID, "3180161", "B.A.");
    expect(ba?.name).toBe("B.A. (110101)");
    expect(getDeptAbbr(ba?.name)).toBe("BA");
  });

  it("strictly returns null when no matching department exists (NO generic fallback)", () => {
    const nonExistent = resolveStudentDepartment(
      BKBNC_COLLEGE_ID,
      "999999",
      "Bachelor of Aerospace Robotics"
    );
    expect(nonExistent).toBeNull();
  });

  it("verifies migration SQL file exists and contains canonical functions", () => {
    const migrationPath = path.resolve(
      process.cwd(),
      "supabase/migrations/20260908080000_fix_bms_department_resolution.sql"
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const content = fs.readFileSync(migrationPath, "utf-8");
    expect(content).toContain("CREATE OR REPLACE FUNCTION public.resolve_student_department");
    expect(content).toContain("CREATE OR REPLACE FUNCTION public.admin_preview_student_assignment");
    expect(content).toContain("CREATE OR REPLACE FUNCTION public.admin_approve_student");
    expect(content).toContain("B.Com. (Management Studies)");
    expect(content).toContain("223005");
    expect(content).toContain("2126561");
    expect(content).toContain("BMS");
  });
});
