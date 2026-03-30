import { useState, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rowSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  student_id: z.string().optional(),
  department: z.string().optional(),
  class_name: z.string().optional(),
});

type ParsedRow = z.infer<typeof rowSchema> & { _row: number; _errors: string[] };

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

  const nameIdx = headers.findIndex((h) => ["name", "full_name", "student_name"].includes(h));
  const emailIdx = headers.findIndex((h) => ["email", "email_address", "mail"].includes(h));
  const phoneIdx = headers.findIndex((h) => ["phone", "mobile", "phone_number"].includes(h));
  const sidIdx = headers.findIndex((h) => ["student_id", "roll_number", "roll_no", "enrollment", "id"].includes(h));
  const deptIdx = headers.findIndex((h) => ["department", "dept", "branch"].includes(h));
  const classIdx = headers.findIndex((h) => ["class", "class_name", "section", "division"].includes(h));

  if (nameIdx === -1 || emailIdx === -1) {
    return [{ name: "", email: "", _row: 1, _errors: ["CSV must have 'name' and 'email' columns"] }];
  }

  return lines.slice(1).map((line, i) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const raw = {
      name: cols[nameIdx] ?? "",
      email: cols[emailIdx] ?? "",
      phone: phoneIdx >= 0 ? cols[phoneIdx] : undefined,
      student_id: sidIdx >= 0 ? cols[sidIdx] : undefined,
      department: deptIdx >= 0 ? cols[deptIdx] : undefined,
      class_name: classIdx >= 0 ? cols[classIdx] : undefined,
    };

    const result = rowSchema.safeParse(raw);
    const errors = result.success ? [] : result.error.issues.map((e) => e.message);

    return { ...raw, _row: i + 2, _errors: errors };
  });
}

export default function BulkImportDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] });

  const validRows = useMemo(() => rows.filter((r) => r._errors.length === 0), [rows]);
  const errorRows = useMemo(() => rows.filter((r) => r._errors.length > 0), [rows]);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      handleFile(file);
    } else {
      toast.error("Please upload a CSV file");
    }
  }, [handleFile]);

  const importMutation = useMutation({
    mutationFn: async () => {
      setStep("importing");
      setProgress(0);
      const successes: string[] = [];
      const failures: string[] = [];

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        try {
          const { error } = await supabase.functions.invoke("admin-create-student", {
            body: {
              name: row.name,
              email: row.email.toLowerCase(),
              phone: row.phone || null,
              student_id: row.student_id || null,
              department: row.department || null,
              class_name: row.class_name || null,
            },
          });
          if (error) throw error;
          successes.push(row.email);
        } catch (err) {
          failures.push(`Row ${row._row} (${row.email}): ${err instanceof Error ? err.message : "Failed"}`);
        }
        setProgress(Math.round(((i + 1) / validRows.length) * 100));
      }

      setResults({ success: successes.length, failed: failures.length, errors: failures });
      setStep("done");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "students"] });
    },
  });

  const reset = () => {
    setStep("upload");
    setRows([]);
    setProgress(0);
    setResults({ success: 0, failed: 0, errors: [] });
  };

  const downloadTemplate = () => {
    const csv = "name,email,phone,student_id,department,class_name\nJane Doe,jane@college.edu,9876543210,CS-2026-001,Computer Science,FY-A";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk Import Students
          </DialogTitle>
          <DialogDescription>Upload a CSV file with student data to create accounts in bulk.</DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".csv";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFile(file);
                };
                input.click();
              }}
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Drop CSV file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Required columns: name, email</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-2" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Download template CSV
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 flex-1 min-h-0">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {validRows.length} valid
              </Badge>
              {errorRows.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errorRows.length} errors
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{rows.length} total rows</span>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={r._errors.length > 0 ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs text-muted-foreground">{r._row}</TableCell>
                      <TableCell className="text-sm">{r.name || "—"}</TableCell>
                      <TableCell className="text-sm">{r.email || "—"}</TableCell>
                      <TableCell className="text-sm">{r.student_id || "—"}</TableCell>
                      <TableCell className="text-sm">{r.department || "—"}</TableCell>
                      <TableCell className="text-sm">{r.class_name || "—"}</TableCell>
                      <TableCell>
                        {r._errors.length > 0 ? (
                          <span className="text-xs text-destructive">{r._errors[0]}</span>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {step === "importing" && (
          <div className="py-8 space-y-4 text-center">
            <div className="animate-pulse text-primary font-medium">Importing students…</div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{progress}% complete</p>
          </div>
        )}

        {step === "done" && (
          <div className="py-6 space-y-4">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="font-semibold">Import Complete</p>
              <div className="flex justify-center gap-4">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  {results.success} created
                </Badge>
                {results.failed > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <X className="h-3 w-3" />
                    {results.failed} failed
                  </Badge>
                )}
              </div>
            </div>
            {results.errors.length > 0 && (
              <ScrollArea className="h-[150px] border rounded-lg p-3">
                {results.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive mb-1">{e}</p>
                ))}
              </ScrollArea>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={validRows.length === 0}
              >
                Import {validRows.length} students
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => { setOpen(false); reset(); }}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
