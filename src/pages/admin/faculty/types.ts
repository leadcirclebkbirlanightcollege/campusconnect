export interface FacultyMember {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  student_id: string | null; // Used for Employee / Faculty ID
  college_id: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
  roleId?: string;
  total_lectures?: number;
  total_timetable_slots?: number;
}

export interface DepartmentOption {
  id: string;
  name: string;
  is_active?: boolean;
}

export interface FacultyFilters {
  search: string;
  department: string;
  status: "all" | "active" | "inactive";
  verification: "all" | "verified" | "unverified";
}

export interface LectureItem {
  id: string;
  topic: string;
  venue: string | null;
  lecture_date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}

export interface TimetableItem {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  venue: string | null;
  faculty_name: string | null;
  class_id: string | null;
}
