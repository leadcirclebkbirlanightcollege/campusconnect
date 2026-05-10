// ERP sync engine types

export type ErpRawRow = Record<string, string | number | null | undefined>;

export interface ErpParsedRow {
  row_number: number;
  full_name: string;
  enrollment_no: string;
  programme_raw: string | null;
  programme_code: string | null;
  programme_name: string | null;
  college_name: string | null;
  gender: string | null;
  guardian_name: string | null;
  mobile: string | null;
  email: string;
  roll_no: string | null;
  admission_no: string | null;
  category: string | null;
  enrollment_status: string | null;
  erp_student_id: string | null;
  validity_start: string | null; // ISO date
  validity_end: string | null;
  discipline_raw: string | null;
  department_name: string | null;
  errors: string[];
}

export type DiffAction = "create" | "update" | "unchanged" | "duplicate" | "invalid";

export interface DiffSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
  create: number;
  update: number;
  unchanged: number;
  archive: number;
}

export interface ErpBatch {
  id: string;
  college_id: string;
  admin_id: string;
  filename: string | null;
  status: "pending" | "validated" | "previewed" | "committing" | "completed" | "failed";
  total_records: number;
  valid_count: number;
  invalid_count: number;
  duplicate_count: number;
  created_count: number;
  updated_count: number;
  archived_count: number;
  failed_count: number;
  full_replacement: boolean;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
