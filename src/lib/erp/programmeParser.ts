// Parses "1151061 : Bachelor of Science (Computer Science)" → { code, name }

export interface ProgrammeParts {
  programme_code: string | null;
  programme_name: string | null;
}

export function parseProgramme(input: string | null | undefined): ProgrammeParts {
  if (!input || typeof input !== "string") return { programme_code: null, programme_name: null };
  const trimmed = input.trim();
  if (!trimmed) return { programme_code: null, programme_name: null };

  const match = trimmed.match(/^\s*([A-Za-z0-9_-]+)\s*[:\-–]\s*(.+)$/);
  if (match) {
    return {
      programme_code: match[1].trim() || null,
      programme_name: match[2].trim() || null,
    };
  }
  return { programme_code: null, programme_name: trimmed };
}
