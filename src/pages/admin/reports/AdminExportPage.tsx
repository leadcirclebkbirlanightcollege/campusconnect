import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Download, Filter, FileSpreadsheet, Loader2,
  Calendar, Users, BookOpen, CheckSquare, FileText, GraduationCap,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type ReportType = "attendance" | "students" | "faculty" | "lectures" | "assignments";

interface ExportConfig {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const REPORT_CONFIGS: Record<ReportType, ExportConfig> = {
  attendance:  { label: "Attendance Report",  description: "Student attendance records with status", icon: CheckSquare, color: "text-green-400" },
  students:    { label: "Student Report",      description: "Full student list with profiles",        icon: Users,       color: "text-blue-400" },
  faculty:     { label: "Faculty Report",      description: "Faculty members and lecture counts",     icon: GraduationCap, color: "text-purple-400" },
  lectures:    { label: "Lecture Report",      description: "Lecture schedule and attendance data",   icon: BookOpen,    color: "text-warning" },
  assignments: { label: "Assignment Report",   description: "Assignments and submission stats",       icon: FileText,    color: "text-pink-400" },
};

function escapeCSV(val: unknown): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCSV(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCSV).join(",")];
  for (const row of rows) lines.push(row.map(escapeCSV).join(","));
  return lines.join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminExportPage() {
  const [reportType, setReportType] = useState<ReportType>("attendance");
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 86400000), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const fname = `${reportType}_report_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;

      if (reportType === "attendance") {
        const { data, error } = await supabase
          .from("attendance")
          .select("student_user_id,lecture_id,status,marked_at,points_earned,profiles:student_user_id(name,student_id,class_name),lectures:lecture_id(topic,lecture_date,venue)")
          .gte("marked_at", startDate)
          .lte("marked_at", endDate + "T23:59:59Z")
          .order("marked_at", { ascending: false });
        if (error) throw error;
        const headers = ["Student Name", "Student ID", "Class", "Lecture Topic", "Lecture Date", "Venue", "Status", "Points Earned", "Marked At"];
        const rows = (data ?? []).map((r: any) => [
          r.profiles?.name ?? "",
          r.profiles?.student_id ?? "",
          r.profiles?.class_name ?? "",
          r.lectures?.topic ?? "",
          r.lectures?.lecture_date ?? "",
          r.lectures?.venue ?? "",
          r.status ?? "",
          r.points_earned ?? 0,
          r.marked_at ? format(new Date(r.marked_at), "yyyy-MM-dd HH:mm") : "",
        ]);
        downloadCSV(buildCSV(headers, rows), fname);

      } else if (reportType === "students") {
        const { data, error } = await supabase
          .from("profiles")
          .select("name,email,student_id,class_name,department,status,is_verified,created_at")
          .eq("is_deleted", false)
          .order("name");
        if (error) throw error;
        const headers = ["Name", "Email", "Student ID", "Class", "Department", "Status", "Verified", "Joined"];
        const rows = (data ?? []).map((r: any) => [
          r.name, r.email, r.student_id ?? "", r.class_name ?? "", r.department ?? "",
          r.status ?? "active", r.is_verified ? "Yes" : "No",
          r.created_at ? format(new Date(r.created_at), "yyyy-MM-dd") : "",
        ]);
        downloadCSV(buildCSV(headers, rows), fname);

      } else if (reportType === "faculty") {
        const { data, error } = await supabase
          .from("user_roles")
          .select("user_id,created_at")
          .eq("role", "faculty");
        if (error) throw error;
        // Fetch profiles separately to avoid join issues
        const userIds = (data ?? []).map((r: any) => r.user_id);
        let profileMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id,name,email,department")
            .in("user_id", userIds);
          (profs ?? []).forEach((p: any) => { profileMap[p.user_id] = p; });
        }
        let lectureCounts: Record<string, number> = {};
        if (userIds.length > 0) {
          const { data: lecs } = await supabase
            .from("lectures")
            .select("created_by")
            .in("created_by", userIds);
          (lecs ?? []).forEach((l: any) => { lectureCounts[l.created_by] = (lectureCounts[l.created_by] ?? 0) + 1; });
        }
        const headers = ["Name", "Email", "Department", "Total Lectures", "Joined"];
        const rows = (data ?? []).map((r: any) => {
          const prof = profileMap[r.user_id];
          return [
            prof?.name ?? "",
            prof?.email ?? "",
            prof?.department ?? "",
            lectureCounts[r.user_id] ?? 0,
            r.created_at ? format(new Date(r.created_at), "yyyy-MM-dd") : "",
          ];
        });
        downloadCSV(buildCSV(headers, rows), fname);

      } else if (reportType === "lectures") {
        const { data, error } = await supabase
          .from("lectures")
          .select("topic,lecture_date,start_time,end_time,venue,status,created_by")
          .gte("lecture_date", startDate)
          .lte("lecture_date", endDate)
          .order("lecture_date", { ascending: false });
        if (error) throw error;
        // Fetch creator profiles separately
        const creatorIds = [...new Set((data ?? []).map((r: any) => r.created_by).filter(Boolean))];
        let creatorMap: Record<string, string> = {};
        if (creatorIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("user_id,name").in("user_id", creatorIds);
          (profs ?? []).forEach((p: any) => { creatorMap[p.user_id] = p.name; });
        }
        const headers = ["Topic", "Date", "Start Time", "End Time", "Venue", "Status", "Created By"];
        const rows = (data ?? []).map((r: any) => [
          r.topic, r.lecture_date, r.start_time, r.end_time, r.venue, r.status,
          creatorMap[r.created_by] ?? "",
        ]);
        downloadCSV(buildCSV(headers, rows), fname);

      } else if (reportType === "assignments") {
        const { data, error } = await supabase
          .from("assignments")
          .select("id,title,description,due_date,max_marks,is_active,created_at,created_by")
          .gte("created_at", startDate)
          .lte("created_at", endDate + "T23:59:59Z")
          .order("created_at", { ascending: false });
        if (error) throw error;
        // Fetch creator profiles separately
        const asnCreatorIds = [...new Set((data ?? []).map((r: any) => r.created_by).filter(Boolean))];
        let asnCreatorMap: Record<string, string> = {};
        if (asnCreatorIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("user_id,name").in("user_id", asnCreatorIds);
          (profs ?? []).forEach((p: any) => { asnCreatorMap[p.user_id] = p.name; });
        }
        const headers = ["Title", "Description", "Due Date", "Max Marks", "Active", "Created By", "Created At"];
        const rows = (data ?? []).map((r: any) => [
          r.title, r.description ?? "", r.due_date, r.max_marks ?? 100,
          r.is_active ? "Yes" : "No",
          asnCreatorMap[r.created_by] ?? "",
          r.created_at ? format(new Date(r.created_at), "yyyy-MM-dd") : "",
        ]);
        downloadCSV(buildCSV(headers, rows), fname);
      }

      toast.success(`${REPORT_CONFIGS[reportType].label} exported successfully!`);
    } catch (e: any) {
      console.error(e);
      toast.error(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const cfg = REPORT_CONFIGS[reportType];
  const CfgIcon = cfg.icon;
  const needsDate = reportType === "attendance" || reportType === "lectures" || reportType === "assignments";

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Export Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Download college data as CSV files</p>
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {(Object.entries(REPORT_CONFIGS) as [ReportType, ExportConfig][]).map(([key, c]) => {
          const Icon = c.icon;
          const active = reportType === key;
          return (
            <button
              key={key}
              onClick={() => setReportType(key)}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-4 text-left transition-all duration-150",
                active
                  ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
                  : "border-border/50 bg-card hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", active ? "bg-primary/20" : "bg-muted")}>
                <Icon className={cn("h-4 w-4", active ? "text-primary" : c.color)} />
              </div>
              <div>
                <p className={cn("text-sm font-semibold", active ? "text-primary" : "text-foreground")}>{c.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Panel */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Filter className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Export Filters</p>
        </div>

        {/* Selected report info */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
          <CfgIcon className={cn("h-5 w-5", cfg.color)} />
          <div>
            <p className="text-sm font-medium text-foreground">{cfg.label}</p>
            <p className="text-xs text-muted-foreground">{cfg.description}</p>
          </div>
        </div>

        {/* Date range (conditional) */}
        {needsDate && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Calendar className="h-3 w-3" />
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Calendar className="h-3 w-3" />
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {!needsDate && (
          <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-3">
            This report exports all records. No date filter required.
          </p>
        )}

        {/* Export button */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleExport} disabled={exporting} className="gap-2 min-w-[160px]">
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Download as .csv — opens in Excel / Sheets
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: "Secure", desc: "Only your college's data is exported" },
          { title: "Instant", desc: "No server wait — downloads immediately" },
          { title: "Compatible", desc: "Works with Excel, Google Sheets, LibreOffice" },
        ].map((c) => (
          <div key={c.title} className="rounded-xl border border-border/30 bg-card/50 p-4 text-center">
            <p className="text-sm font-semibold text-foreground">{c.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
