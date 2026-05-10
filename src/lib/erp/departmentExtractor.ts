// Derive a clean department name from discipline OR programme name parenthetical.

export function normalizeDeptName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

export function extractDepartment(opts: {
  discipline?: string | null;
  programme_name?: string | null;
}): string | null {
  const { discipline, programme_name } = opts;

  if (discipline && discipline.trim()) {
    return cleanLabel(discipline);
  }

  if (programme_name) {
    const m = programme_name.match(/\(([^)]+)\)\s*$/);
    if (m) return cleanLabel(m[1]);
    // fallback: drop common prefixes
    const stripped = programme_name
      .replace(/^bachelor of\s+/i, "")
      .replace(/^master of\s+/i, "")
      .replace(/^diploma in\s+/i, "")
      .trim();
    if (stripped) return cleanLabel(stripped);
  }
  return null;
}

function cleanLabel(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
