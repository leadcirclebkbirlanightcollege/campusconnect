/**
 * AcademicsHub — tab root for everything academic.
 * Connects lectures, timetable, attendance, assignments, documents,
 * results and learning circles so no academic screen is a dead end.
 */
import { HubGrid, type HubTile } from "@/components/shell/HubGrid";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import {
  CalendarDays, ClipboardCheck, BookOpenCheck, FileText,
  GraduationCap, QrCode, Award,
} from "lucide-react";

const TILES: HubTile[] = [
  { label: "Lectures",    description: "Live & upcoming sessions", href: "/app/lectures",    icon: GraduationCap, tone: "primary" },
  { label: "Timetable",   description: "Your weekly schedule",     href: "/app/timetable",   icon: CalendarDays,  tone: "info" },
  { label: "Attendance",  description: "History & percentage",     href: "/app/attendance",  icon: ClipboardCheck, tone: "success" },
  { label: "Assignments", description: "Tasks & submissions",      href: "/app/assignments", icon: BookOpenCheck, tone: "warning" },
  { label: "Documents",   description: "Notes & study material",   href: "/app/documents",   icon: FileText,      tone: "info" },
  { label: "Results",     description: "Exam performance",         href: "/app/results",     icon: Award,         tone: "primary" },
  { label: "Learning Circles", description: "Enrolled programmes", href: "/app/programmes",  icon: GraduationCap, tone: "success" },
  { label: "Scan Attendance",  description: "Mark yourself present", href: "/app/scan",      icon: QrCode,        tone: "primary" },
];

export default function AcademicsHub() {
  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Academics" subtitle="Everything about your studies" gradient />
      <HubGrid tiles={TILES} />
    </PageContainer>
  );
}
