import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type ProfileRow = {
  user_id: string;
  name: string;
  student_id: string | null;
  class_name: string | null;
  is_deleted: boolean;
};

type LectureRow = {
  id: string;
  lecture_date: string; // YYYY-MM-DD
  topic: string;
  status: string;
};

type AttendanceRow = {
  lecture_id: string;
  student_user_id: string;
  status: string;
};

type SheetRow = {
  userId: string;
  name: string;
  studentId: string;
  marksByLectureId: Record<string, "P" | "A" | "-">;
  totalLectures: number;
  presentLectures: number;
  percentage: number;
};

function monthRange(monthValue: string) {
  // monthValue: YYYY-MM
  const [y, m] = monthValue.split("-").map((x) => Number(x));
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const startIsoDate = start.toISOString().slice(0, 10);
  const endIsoDate = end.toISOString().slice(0, 10);
  return { startIsoDate, endIsoDate, start, end };
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const esc = (v: string) => {
    const needsQuotes = /[\n\r,\"]/g.test(v);
    const vv = v.replace(/\"/g, '""');
    return needsQuotes ? `"${vv}"` : vv;
  };

  const csv = [headers, ...rows]
    .map((r) => r.map((c) => esc(String(c ?? ""))).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildPrintableHtml(title: string, headers: string[], rows: string[][]) {
  const th = headers.map((h) => `<th>${h}</th>`).join("");
  const trs = rows
    .map((r) => `<tr>${r.map((c) => `<td>${String(c ?? "")}</td>`).join("")}</tr>`)
    .join("");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <style>
        :root { color-scheme: light; }
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; }
        h1 { font-size: 18px; margin: 0 0 12px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; text-align: center; }
        th { background: #f5f5f5; font-weight: 600; }
        td:first-child, th:first-child { text-align: left; }
        td:nth-child(2), th:nth-child(2) { text-align: left; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <table>
        <thead><tr>${th}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </body>
  </html>`;
}

export default function AdminMonthlyAttendance() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [className, setClassName] = useState<string>("");
  const [month, setMonth] = useState<string>(defaultMonth);

  const classesQuery = useQuery({
    queryKey: ["admin", "classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("class_name")
        .eq("is_deleted", false)
        .not("class_name", "is", null)
        .limit(1000);
      if (error) throw error;
      const classes = Array.from(new Set((data ?? []).map((r: any) => String(r.class_name)).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      );
      return classes;
    },
  });

  const sheetQuery = useQuery({
    queryKey: ["admin", "attendance", "monthly", { className, month }],
    enabled: Boolean(className && month),
    queryFn: async () => {
      const { startIsoDate, endIsoDate } = monthRange(month);

      // 1) Students in class
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id,name,student_id,class_name,is_deleted")
        .eq("is_deleted", false)
        .eq("class_name", className)
        .limit(1000);
      if (profilesError) throw profilesError;

      const students = (profiles ?? []) as unknown as ProfileRow[];
      const studentIds = students.map((s) => s.user_id);

      // 2) Lectures in month (assume these are “conducted/trackable”)
      const { data: lectures, error: lecturesError } = await supabase
        .from("lectures")
        .select("id,lecture_date,topic,status")
        .gte("lecture_date", startIsoDate)
        .lt("lecture_date", endIsoDate)
        .order("lecture_date", { ascending: true })
        .limit(1000);
      if (lecturesError) throw lecturesError;
      const lectureRows = (lectures ?? []) as unknown as LectureRow[];

      const lectureIds = lectureRows.map((l) => l.id);

      // 3) Attendance rows for these students + lectures
      let attendanceRows: AttendanceRow[] = [];
      if (studentIds.length && lectureIds.length) {
        const { data: attendance, error: attendanceError } = await supabase
          .from("attendance")
          .select("lecture_id,student_user_id,status")
          .in("lecture_id", lectureIds)
          .in("student_user_id", studentIds)
          .limit(1000);
        if (attendanceError) throw attendanceError;
        attendanceRows = (attendance ?? []) as unknown as AttendanceRow[];
      }

      const attendanceMap = new Map<string, "P" | "A">();
      for (const a of attendanceRows) {
        const key = `${a.student_user_id}::${a.lecture_id}`;
        const mark = a.status === "present" ? "P" : a.status === "absent" ? "A" : "A";
        attendanceMap.set(key, mark);
      }

      const totalLectures = lectureIds.length;

      const rows: SheetRow[] = students
        .slice()
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
        .map((s) => {
          const marksByLectureId: Record<string, "P" | "A" | "-"> = {};
          let presentLectures = 0;
          for (const lId of lectureIds) {
            const mark = attendanceMap.get(`${s.user_id}::${lId}`) ?? "-";
            marksByLectureId[lId] = mark;
            if (mark === "P") presentLectures += 1;
          }
          const percentage = totalLectures ? Math.round((presentLectures / totalLectures) * 1000) / 10 : 0;
          return {
            userId: s.user_id,
            name: s.name,
            studentId: s.student_id ?? "",
            marksByLectureId,
            totalLectures,
            presentLectures,
            percentage,
          };
        });

      return { students, lectures: lectureRows, rows };
    },
  });

  const columnHeaders = useMemo(() => {
    const lectures = sheetQuery.data?.lectures ?? [];
    return lectures.map((l) => {
      const label = l.lecture_date ? format(new Date(`${l.lecture_date}T00:00:00Z`), "dd-MMM") : l.id;
      return { id: l.id, label };
    });
  }, [sheetQuery.data?.lectures]);

  const exportCsv = () => {
    const data = sheetQuery.data;
    if (!data) return;
    const headers = ["Student Name", "Student ID", ...columnHeaders.map((c) => c.label), "TL", "PL", "%"];
    const rows = data.rows.map((r) => [
      r.name,
      r.studentId,
      ...columnHeaders.map((c) => r.marksByLectureId[c.id] ?? "-"),
      String(r.totalLectures),
      String(r.presentLectures),
      String(r.percentage),
    ]);
    const filename = `monthly_attendance_${className}_${month}.csv`;
    downloadCsv(filename, headers, rows);
  };

  const printPdf = () => {
    const data = sheetQuery.data;
    if (!data) return;
    const headers = ["Student Name", "Student ID", ...columnHeaders.map((c) => c.label), "TL", "PL", "%"];
    const rows = data.rows.map((r) => [
      r.name,
      r.studentId,
      ...columnHeaders.map((c) => r.marksByLectureId[c.id] ?? "-"),
      String(r.totalLectures),
      String(r.presentLectures),
      String(r.percentage),
    ]);

    const title = `Monthly Attendance — ${className} — ${month}`;
    const html = buildPrintableHtml(title, headers, rows);
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      toast.error("Popup blocked — allow popups to print/save as PDF.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle>Monthly Attendance Sheet</CardTitle>
          <CardDescription>Excel-style P/A/- sheet with TL/PL/% for a selected class and month.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={className} onValueChange={setClassName}>
              <SelectTrigger>
                <SelectValue placeholder={classesQuery.isLoading ? "Loading…" : "Select class"} />
              </SelectTrigger>
              <SelectContent>
                {(classesQuery.data ?? []).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Button type="button" variant="outline" onClick={exportCsv} disabled={!sheetQuery.data}>
              Export CSV
            </Button>
            <Button type="button" onClick={printPdf} disabled={!sheetQuery.data}>
              Print / PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>Sheet</span>
            <span className="text-sm text-muted-foreground">
              {sheetQuery.isFetching ? "Refreshing…" : sheetQuery.data ? `${sheetQuery.data.rows.length} students` : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!className ? (
            <div className="text-sm text-muted-foreground">Select a class to view the monthly sheet.</div>
          ) : sheetQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : sheetQuery.isError ? (
            <div className="text-sm text-destructive">Failed to load monthly attendance.</div>
          ) : !sheetQuery.data?.lectures?.length ? (
            <div className="text-sm text-muted-foreground">No lectures found for this month.</div>
          ) : (
            <ScrollArea className="w-full">
              <div className="w-full overflow-x-auto">
                <div className="min-w-max">
                  <Table className="text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">Student</TableHead>
                      <TableHead className="min-w-[140px]">Student ID</TableHead>
                      {columnHeaders.map((c) => (
                        <TableHead key={c.id} className="text-center min-w-[72px]">
                          {c.label}
                        </TableHead>
                      ))}
                      <TableHead className="text-center min-w-[64px]">TL</TableHead>
                      <TableHead className="text-center min-w-[64px]">PL</TableHead>
                      <TableHead className="text-center min-w-[64px]">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheetQuery.data.rows.map((r) => (
                      <TableRow key={r.userId}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.studentId}</TableCell>
                        {columnHeaders.map((c) => (
                          <TableCell key={c.id} className="text-center">
                            {r.marksByLectureId[c.id] ?? "-"}
                          </TableCell>
                        ))}
                        <TableCell className="text-center">{r.totalLectures}</TableCell>
                        <TableCell className="text-center">{r.presentLectures}</TableCell>
                        <TableCell className="text-center">{r.percentage}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
