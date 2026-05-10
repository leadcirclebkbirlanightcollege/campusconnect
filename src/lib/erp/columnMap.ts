// Fixed ERP → internal field mapping. Header matching is case/space insensitive.

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "");

export const ERP_COLUMNS = {
  full_name: ["name", "studentname", "fullname"],
  enrollment_no: ["enrolmentnumber", "enrollmentnumber", "enrolmentno", "enrollmentno"],
  programme_raw: ["programme", "program"],
  college_name: ["organizationalunit", "organisationalunit", "college"],
  gender: ["gender"],
  guardian_name: ["guardianname", "fathername", "parentname"],
  mobile: ["mobilenumber", "mobile", "phone"],
  email: ["personalemail", "email", "emailaddress"],
  roll_no: ["rollnumber", "rollno"],
  admission_no: ["admissionnumber", "admissionno"],
  category: ["category"],
  enrollment_status: ["enrollmentstatus", "enrolmentstatus", "status"],
  erp_student_id: ["studentid", "erpstudentid"],
  validity_start: ["validitystart", "startdate"],
  validity_end: ["validityend", "enddate"],
  discipline_raw: ["discipline", "department", "branch"],
} as const;

export type InternalField = keyof typeof ERP_COLUMNS;

export function buildHeaderIndex(headers: string[]): Partial<Record<InternalField, number>> {
  const normalized = headers.map((h) => norm(String(h ?? "")));
  const out: Partial<Record<InternalField, number>> = {};
  (Object.keys(ERP_COLUMNS) as InternalField[]).forEach((field) => {
    const aliases = ERP_COLUMNS[field];
    const idx = normalized.findIndex((h) => aliases.includes(h as never));
    if (idx >= 0) out[field] = idx;
  });
  return out;
}
