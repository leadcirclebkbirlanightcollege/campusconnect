import { CalendarDays } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";

import type { LectureRecord } from "../types";

type LectureCalendarPreviewProps = {
  lectures: LectureRecord[];
};

function buildWeekPreview(lectures: LectureRecord[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lectureCountByDay = new Map<string, LectureRecord[]>();
  lectures.forEach((lecture) => {
    const dayKey = lecture.lecture_date;
    const current = lectureCountByDay.get(dayKey) ?? [];
    current.push(lecture);
    lectureCountByDay.set(dayKey, current);
  });

  return Array.from({ length: 7 }).map((_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const key = date.toISOString().slice(0, 10);
    const dayLectures = lectureCountByDay.get(key) ?? [];

    return {
      key,
      day: date.toLocaleDateString("en-GB", { weekday: "short" }),
      date: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      count: dayLectures.length,
      highlight: dayLectures[0]?.topic ?? "No sessions",
    };
  });
}

export function LectureCalendarPreview({ lectures }: LectureCalendarPreviewProps) {
  const week = buildWeekPreview(lectures);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <div className="flex min-w-max gap-3 pr-1">
        {week.map((day) => (
          <GlassCard
            key={day.key}
            hover={false}
            className="w-[148px] shrink-0 space-y-2 border-border-subtle/70"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day.day}</p>
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-sm font-bold text-foreground">{day.date}</p>
            <p className="text-xs font-semibold text-primary">{day.count} {day.count === 1 ? "Lecture" : "Lectures"}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{day.highlight}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
