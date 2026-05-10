import * as XLSX from "xlsx";
import { buildHeaderIndex, type InternalField } from "./columnMap";
import { parseProgramme } from "./programmeParser";
import { extractDepartment } from "./departmentExtractor";
import { validateRow } from "./rowValidator";
import type { ErpParsedRow, ErpRawRow } from "./types";

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function toIsoDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return null;
  // Handle Excel serial dates
  if (/^\d+(\.\d+)?$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(Number(s));
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

export interface ParseResult {
  headers: string[];
  raw: ErpRawRow[];
  parsed: ErpParsedRow[];
  unmappedColumns: string[];
}

export async function parseErpFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("Workbook contains no sheets");

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
  if (json.length === 0) return { headers: [], raw: [], parsed: [], unmappedColumns: [] };

  const headers = Object.keys(json[0]);
  const idx = buildHeaderIndex(headers);

  const raw: ErpRawRow[] = json.map((r) => {
    const out: ErpRawRow = {};
    headers.forEach((h) => (out[h] = toStr(r[h])));
    return out;
  });

  const get = (row: Record<string, unknown>, field: InternalField): string => {
    const i = idx[field];
    if (i === undefined) return "";
    return toStr(row[headers[i]]);
  };

  const parsed: ErpParsedRow[] = json.map((row, i) => {
    const programme_raw = get(row, "programme_raw");
    const { programme_code, programme_name } = parseProgramme(programme_raw);
    const discipline_raw = get(row, "discipline_raw");
    const department_name = extractDepartment({ discipline: discipline_raw, programme_name });

    const p: ErpParsedRow = {
      row_number: i + 2, // +2: header row + 1-indexed
      full_name: get(row, "full_name"),
      enrollment_no: get(row, "enrollment_no"),
      programme_raw: programme_raw || null,
      programme_code,
      programme_name,
      college_name: get(row, "college_name") || null,
      gender: get(row, "gender") || null,
      guardian_name: get(row, "guardian_name") || null,
      mobile: get(row, "mobile") || null,
      email: get(row, "email").toLowerCase(),
      roll_no: get(row, "roll_no") || null,
      admission_no: get(row, "admission_no") || null,
      category: get(row, "category") || null,
      enrollment_status: get(row, "enrollment_status") || null,
      erp_student_id: get(row, "erp_student_id") || null,
      validity_start: toIsoDate(idx.validity_start !== undefined ? row[headers[idx.validity_start]] : null),
      validity_end: toIsoDate(idx.validity_end !== undefined ? row[headers[idx.validity_end]] : null),
      discipline_raw: discipline_raw || null,
      department_name,
      errors: [],
    };
    p.errors = validateRow(p);
    return p;
  });

  const mappedHeaders = new Set(Object.values(idx).map((i) => headers[i!]));
  const unmappedColumns = headers.filter((h) => !mappedHeaders.has(h));

  return { headers, raw, parsed, unmappedColumns };
}
