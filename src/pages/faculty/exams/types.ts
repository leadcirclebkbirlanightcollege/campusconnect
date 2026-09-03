export type ExamStatus = "DRAFT" | "MARKS_ENTRY" | "LOCKED" | "PUBLISHED";

export type ResultStatus = "PASSED" | "FAILED" | "ABSENT" | "PENDING";

export interface Exam {
  id: string;
  title: string;
  subject: string;
  exam_type: string | null;
  topic: string | null;
  class_id: string | null;
  college_id: string | null;
  exam_date: string;
  max_marks: number;
  min_marks: number;
  status: ExamStatus;
  description: string | null;
  created_at: string;
  created_by: string;
  locked_at: string | null;
  locked_by: string | null;
  unlocked_at: string | null;
  unlocked_by: string | null;
  published_at: string | null;
  published_by: string | null;
  classes?: {
    id: string;
    name: string;
    section: string | null;
    year: number | null;
  } | null;
  profiles?: {
    name: string;
  } | null;
}

export interface StudentRecord {
  user_id: string;
  name: string;
  student_id: string | null;
  roll_number?: string | null;
  avatar_url: string | null;
  class_id: string | null;
  class_name: string | null;
}

export interface ExamResultItem {
  id?: string;
  exam_id: string;
  student_user_id: string;
  marks_obtained: number | null;
  is_absent: boolean;
  status: ResultStatus;
  grade: string | null;
  remarks: string | null;
}

export interface StudentRowItem {
  student_user_id: string;
  name: string;
  student_id: string | null;
  avatar_url: string | null;
  marks_obtained: number | null | "";
  is_absent: boolean;
  status: ResultStatus;
  grade: string | null;
  remarks: string;
  isDirty?: boolean;
}

export const COMMON_EXAM_TYPES = [
  "Internal Assessment 1",
  "Internal Assessment 2",
  "Semester Examination",
  "Unit Test",
  "Class Test",
  "Mid-Term Exam",
  "Practical Examination",
  "Assignment Evaluation",
  "Viva Voce",
  "Project Evaluation",
];
