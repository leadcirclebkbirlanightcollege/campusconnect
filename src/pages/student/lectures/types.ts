export type LectureStatus = "scheduled" | "live" | "ended";

export type LectureRecord = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  status: LectureStatus;
};

export type HistoryLectureRecord = LectureRecord & {
  attendance_status: "attended" | "missed" | "late";
};
