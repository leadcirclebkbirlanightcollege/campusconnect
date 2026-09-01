import { describe, it, expect } from "vitest";
import { z } from "zod";

const lectureFormSchema = z
  .object({
    topic: z.string().trim().min(3, "Subject / topic must be at least 3 characters").max(200),
    lecture_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    start_time: z.string().regex(/^\d{2}:\d{2}/, "Use HH:MM format"),
    end_time: z.string().regex(/^\d{2}:\d{2}/, "Use HH:MM format"),
    venue: z.string().trim().min(2, "Venue must be at least 2 characters").max(200),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return data.end_time > data.start_time;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["end_time"],
    }
  );

describe("Faculty Lecture Scheduling Validation", () => {
  it("validates valid lecture payloads successfully", () => {
    const valid = {
      topic: "Advanced Algorithms & Data Structures",
      lecture_date: "2026-09-02",
      start_time: "10:00",
      end_time: "11:30",
      venue: "Room 304, Tech Block",
    };

    const result = lectureFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects when topic is too short or empty", () => {
    const invalid = {
      topic: "  a  ",
      lecture_date: "2026-09-02",
      start_time: "10:00",
      end_time: "11:30",
      venue: "Room 304",
    };

    const result = lectureFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects when end_time is before or equal to start_time", () => {
    const invalidBefore = {
      topic: "Database Systems",
      lecture_date: "2026-09-02",
      start_time: "11:00",
      end_time: "10:00",
      venue: "Room 201",
    };
    const resBefore = lectureFormSchema.safeParse(invalidBefore);
    expect(resBefore.success).toBe(false);

    const invalidEqual = {
      topic: "Database Systems",
      lecture_date: "2026-09-02",
      start_time: "11:00",
      end_time: "11:00",
      venue: "Room 201",
    };
    const resEqual = lectureFormSchema.safeParse(invalidEqual);
    expect(resEqual.success).toBe(false);
  });

  it("rejects invalid date formats", () => {
    const invalidDate = {
      topic: "Computer Networks",
      lecture_date: "02-09-2026",
      start_time: "09:00",
      end_time: "10:00",
      venue: "Lab 1",
    };
    const result = lectureFormSchema.safeParse(invalidDate);
    expect(result.success).toBe(false);
  });
});
