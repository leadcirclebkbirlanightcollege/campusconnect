/**
 * programme-utils.ts
 *
 * Single source of truth for programme/department abbreviations and class
 * display codes in Campus Connect.
 *
 * Rules
 * ─────
 * - Department names in the DB carry a suffix code, e.g. "B.Com. (112101)".
 *   This utility strips those codes and maps to a short abbreviation.
 * - Class names stored in `classes.name` / `profiles.class_name` already
 *   carry the correct code (FYBAF, FYBMS, FYBFM, FYBCOM, FYCS, …) after the
 *   20260908060000 migration. No transformation is needed for them — they are
 *   returned as-is.
 * - `getDeptAbbr` is the only place that knows about the abbreviation mapping.
 *   All UI should call this instead of displaying the raw department name.
 */

/** Map canonical department name fragments → short abbreviation. */
const DEPT_ABBR_MAP: Array<{ pattern: RegExp; abbr: string }> = [
  // Specialised B.Com. — must come BEFORE generic B.Com.
  { pattern: /accounting\s*&?\s*finance/i,    abbr: "BAF"    },
  { pattern: /management\s*studies/i,          abbr: "BMS"    },
  { pattern: /financial\s*markets/i,           abbr: "BFM"    },
  // B.Sc. specialisation — must come BEFORE generic B.Sc.
  { pattern: /computer\s*science/i,            abbr: "BSc CS" },
  // Generic programmes
  { pattern: /\bb\.?sc\.?/i,                  abbr: "BSc"    },
  { pattern: /\bb\.?com\.?/i,                 abbr: "BCOM"   },
  { pattern: /\bb\.?a\.?/i,                   abbr: "BA"     },
  { pattern: /\bb\.?ed\.?/i,                  abbr: "BEd"    },
  { pattern: /\bm\.?sc\.?/i,                  abbr: "MSc"    },
  { pattern: /\bm\.?com\.?/i,                 abbr: "MCom"   },
  { pattern: /\bm\.?a\.?/i,                   abbr: "MA"     },
];

/**
 * Returns the short abbreviation for a department name.
 *
 * @example
 * getDeptAbbr("B.Com. (Accounting & Finance) (223002)") // → "BAF"
 * getDeptAbbr("B.Sc. (Computer Science) (1151061)")     // → "BSc CS"
 * getDeptAbbr("B.Com. (112101)")                         // → "BCOM"
 * getDeptAbbr("B.A. (110101)")                           // → "BA"
 * getDeptAbbr(null)                                      // → "—"
 */
export function getDeptAbbr(departmentName: string | null | undefined): string {
  if (!departmentName) return "—";

  for (const { pattern, abbr } of DEPT_ABBR_MAP) {
    if (pattern.test(departmentName)) return abbr;
  }

  // Fallback: strip trailing code like " (223002)" and return trimmed value
  return departmentName.replace(/\s*\(\d+\)\s*$/, "").trim() || departmentName;
}

/**
 * Year-prefix map: DB year number → abbreviation prefix.
 */
const YEAR_PREFIX: Record<number, string> = {
  1: "FY",
  2: "SY",
  3: "TY",
  4: "QY",
};

/**
 * Derives the canonical class code from a year number + programme abbreviation.
 * Useful for generating the expected class code when creating new classes.
 *
 * @example
 * buildClassCode(1, "BAF") // → "FYBAF"
 * buildClassCode(2, "BSc CS") // → "SYBSc CS"
 */
export function buildClassCode(year: number | null | undefined, deptAbbr: string): string {
  const prefix = (year != null && YEAR_PREFIX[year]) ? YEAR_PREFIX[year] : "";
  return `${prefix}${deptAbbr}`;
}

/**
 * Formats a class row (name + optional department name) for display.
 * Returns the class `name` as-is because after the migration it is already
 * the correct code (FYBAF, FYBMS, etc.).
 *
 * @example
 * formatClassDisplay({ name: "FYBAF", department_name: "B.Com. (Accounting & Finance) (223002)" })
 * // → "FYBAF"
 */
export function formatClassDisplay(cls: {
  name: string;
  department_name?: string | null;
}): string {
  return cls.name;
}

/**
 * Full label for a class suitable for dropdowns/headings.
 * e.g. "FYBAF — BAF" or "FYCS — BSc CS"
 */
export function classFullLabel(cls: {
  name: string;
  department_name?: string | null;
}): string {
  const abbr = getDeptAbbr(cls.department_name);
  if (abbr === "—") return cls.name;
  return `${cls.name} — ${abbr}`;
}
