import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Archive, Plus, RefreshCw, Download, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/layout/PageHeader";
import { parseErpFile, type ErpParsedRow } from "@/lib/erp";

type Phase = "idle" | "parsing" | "preview" | "committing" | "done";

const STEPS = [
  { key: "parsing", label: "Parsing file" },
  { key: "validating", label: "Validating rows" },
  { key: "structures", label: "Creating structures" },
  { key: "comparing", label: "Comparing existing data" },
  { key: "accounts", label: "Creating accounts" },
  { key: "archiving", label: "Archiving old students" },
  { key: "done", label: "Sync complete" },
];

interface BatchSummary {
  total_records: number;
  valid_count: number;
  invalid_count: number;
  duplicate_count: number;
  created_count: number;
  updated_count: number;
  archived_count: number;
  failed_count: number;
}

export default function ErpSyncPage() {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [filename, setFilename] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ErpParsedRow[]>([]);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [fullReplacement, setFullReplacement] = useState(true);
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [progress, setProgress] = useState(0);

  const counts = useMemo(() => {
    const valid = parsed.filter((r) => r.errors.length === 0);
    const seen = new Set<string>();
    const dups: ErpParsedRow[] = [];
    valid.forEach((r) => {
      const k = r.enrollment_no.trim().toLowerCase();
      if (seen.has(k)) dups.push(r);
      else seen.add(k);
    });
    return {
      total: parsed.length,
      valid: valid.length - dups.length,
      invalid: parsed.length - valid.length,
      duplicate: dups.length,
    };
  }, [parsed]);

  const handleFile = useCallback(async (file: File) => {
    setPhase("parsing");
    setActiveStep(0);
    setFilename(file.name);
    try {
      const result = await parseErpFile(file);
      setParsed(result.parsed);
      setUnmapped(result.unmappedColumns);
      setActiveStep(1);
      setPhase("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file");
      setPhase("idle");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (!f) return;
      const ok = f.name.endsWith(".xlsx") || f.name.endsWith(".csv");
      if (!ok) return toast.error("Upload an .xlsx or .csv ERP export");
      handleFile(f);
    },
    [handleFile]
  );

  const commit = useMutation({
    mutationFn: async () => {
      setPhase("committing");
      setActiveStep(2);
      setProgress(10);

      const { data: startData, error: startErr } = await supabase.functions.invoke("erp-sync", {
        body: { step: "start", filename },
      });
      if (startErr || !startData?.batch) {
        const msg = (startData as { error?: string } | null)?.error ?? startErr?.message ?? "Failed to start batch";
        throw new Error(`[start] ${msg}`);
      }
      const batchId = startData.batch.id as string;

      setActiveStep(3);
      setProgress(20);

      const cleaned = parsed.map(({ ...r }) => r);
      const CHUNK_SIZE = 50;
      const chunks: typeof cleaned[] = [];
      for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) chunks.push(cleaned.slice(i, i + CHUNK_SIZE));

      setActiveStep(4);

      let totalCreated = 0, totalUpdated = 0, totalFailed = 0;

      for (let i = 0; i < chunks.length; i++) {
        const { data: cd, error: cErr } = await supabase.functions.invoke("erp-sync", {
          body: {
            step: "commit_chunk",
            batch_id: batchId,
            rows: chunks[i],
            full_replacement: fullReplacement,
            is_first_chunk: i === 0,
          },
        });
        if (cErr || !cd?.success) {
          const msg = (cd as { error?: string; step?: string } | null)?.error ?? cErr?.message ?? "Chunk failed";
          const step = (cd as { step?: string } | null)?.step ?? "commit_chunk";
          throw new Error(`[${step}] chunk ${i + 1}/${chunks.length}: ${msg}`);
        }
        totalCreated += cd.summary?.created_count ?? 0;
        totalUpdated += cd.summary?.updated_count ?? 0;
        totalFailed += cd.summary?.failed_count ?? 0;
        const pct = 20 + Math.round(((i + 1) / chunks.length) * 60);
        setProgress(pct);
      }

      setActiveStep(5);
      setProgress(85);

      const { data: finData, error: finErr } = await supabase.functions.invoke("erp-sync", {
        body: { step: "finalize", batch_id: batchId, full_replacement: fullReplacement },
      });
      if (finErr || !finData?.summary) {
        const msg = (finData as { error?: string } | null)?.error ?? finErr?.message ?? "Finalize failed";
        throw new Error(`[finalize] ${msg}`);
      }

      setActiveStep(6);
      setProgress(100);
      return finData.summary as BatchSummary;
    },
    onSuccess: (s) => {
      setSummary(s);
      setPhase("done");
      qc.invalidateQueries({ queryKey: ["erp", "batches"] });
      toast.success(`Sync complete: ${s.created_count} created, ${s.updated_count} updated, ${s.archived_count} archived`);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Sync failed");
      setPhase("preview");
    },
  });

  const reset = () => {
    setPhase("idle");
    setActiveStep(0);
    setFilename(null);
    setParsed([]);
    setUnmapped([]);
    setSummary(null);
    setProgress(0);
  };

  const downloadFailedRows = () => {
    const failed = parsed.filter((r) => r.errors.length > 0);
    if (failed.length === 0) return toast.info("No failed rows");
    const headers = ["row_number", "full_name", "enrollment_no", "email", "errors"];
    const csv = [
      headers.join(","),
      ...failed.map((r) =>
        [r.row_number, r.full_name, r.enrollment_no, r.email, r.errors.join("; ")]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `erp_failed_rows_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="ERP Sync Engine"
        subtitle="Onboard or refresh your entire college from a single ERP export"
        sticky={false}
        action={
          phase !== "idle" && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RefreshCw className="h-4 w-4" /> New sync
            </Button>
          )
        }
      />

      {phase === "idle" && <UploadStage onFile={handleFile} onDrop={onDrop} />}

      {phase !== "idle" && (
        <Stepper steps={STEPS} active={activeStep} progress={progress} />
      )}

      {(phase === "preview" || phase === "committing" || phase === "done") && (
        <>
          <PreviewSummary
            counts={counts}
            unmapped={unmapped}
            committedSummary={summary}
            fullReplacement={fullReplacement}
          />
          {unmapped.length > 0 && (
            <Card className="p-4 border-warning/40 bg-warning/5">
              <p className="text-sm font-medium text-warning">Unmapped columns ignored:</p>
              <p className="text-xs text-muted-foreground mt-1">{unmapped.join(", ")}</p>
            </Card>
          )}
        </>
      )}

      {phase === "preview" && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium">Full replacement sync</p>
              <p className="text-xs text-muted-foreground">
                Students missing from this ERP file will be archived (history preserved).
              </p>
            </div>
            <Switch checked={fullReplacement} onCheckedChange={setFullReplacement} />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => commit.mutate()} disabled={counts.valid === 0 || commit.isPending}>
              {commit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Commit sync · {counts.valid} students
            </Button>
            <Button variant="outline" onClick={downloadFailedRows} disabled={counts.invalid === 0}>
              <Download className="h-4 w-4" /> Download failed rows
            </Button>
            <Button variant="ghost" onClick={reset}>Cancel</Button>
          </div>

          <ParsedPreviewTable rows={parsed.slice(0, 50)} />
        </Card>
      )}

      {phase === "done" && summary && (
        <Card className="p-6 text-center space-y-3 border-success/40 bg-success/5">
          <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
          <p className="text-lg font-semibold">College synchronized successfully</p>
          <Button onClick={reset}>Run another sync</Button>
        </Card>
      )}

      <BatchHistory />
    </div>
  );
}

function UploadStage({
  onFile,
  onDrop,
}: {
  onFile: (f: File) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <Card
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="p-10 text-center border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => {
        const i = document.createElement("input");
        i.type = "file";
        i.accept = ".xlsx,.csv";
        i.onchange = (e) => {
          const f = (e.target as HTMLInputElement).files?.[0];
          if (f) onFile(f);
        };
        i.click();
      }}
    >
      <FileSpreadsheet className="h-14 w-14 mx-auto text-primary mb-3" />
      <h3 className="text-xl font-semibold">Upload full ERP export</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Drag & drop your .xlsx or .csv ERP file, or click to browse
      </p>
      <p className="text-xs text-muted-foreground mt-3">
        Supports thousands of students · Auto-creates departments & programmes · Yearly replacement
      </p>
      <Button className="mt-5">
        <Upload className="h-4 w-4" /> Choose ERP file
      </Button>
    </Card>
  );
}

function Stepper({ steps, active, progress }: { steps: typeof STEPS; active: number; progress: number }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <Badge
            key={s.key}
            variant={i < active ? "secondary" : i === active ? "default" : "outline"}
            className="gap-1"
          >
            {i < active ? <CheckCircle2 className="h-3 w-3 text-success" /> : i === active ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {s.label}
          </Badge>
        ))}
      </div>
      {progress > 0 && progress < 100 && <Progress value={progress} className="h-2" />}
    </Card>
  );
}

function PreviewSummary({
  counts,
  committedSummary,
  fullReplacement,
}: {
  counts: { total: number; valid: number; invalid: number; duplicate: number };
  unmapped: string[];
  committedSummary: BatchSummary | null;
  fullReplacement: boolean;
}) {
  const cards = committedSummary
    ? [
        { label: "Created", value: committedSummary.created_count, icon: Plus, tone: "success" },
        { label: "Updated", value: committedSummary.updated_count, icon: RefreshCw, tone: "primary" },
        { label: "Archived", value: committedSummary.archived_count, icon: Archive, tone: "muted" },
        { label: "Failed", value: committedSummary.failed_count, icon: AlertCircle, tone: "danger" },
      ]
    : [
        { label: "Valid", value: counts.valid, icon: CheckCircle2, tone: "success" },
        { label: "Invalid", value: counts.invalid, icon: AlertCircle, tone: "danger" },
        { label: "Duplicates", value: counts.duplicate, icon: AlertCircle, tone: "warning" },
        { label: fullReplacement ? "Will archive" : "Skipping archive", value: fullReplacement ? "auto" : "—", icon: Archive, tone: "muted" },
      ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <c.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{c.value}</p>
        </Card>
      ))}
    </div>
  );
}

function ParsedPreviewTable({ rows }: { rows: ErpParsedRow[] }) {
  return (
    <ScrollArea className="h-[320px] border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Enrollment</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Programme</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.row_number} className={r.errors.length > 0 ? "bg-destructive/5" : ""}>
              <TableCell className="text-xs text-muted-foreground">{r.row_number}</TableCell>
              <TableCell className="text-sm">{r.full_name || "—"}</TableCell>
              <TableCell className="text-sm font-mono text-xs">{r.enrollment_no || "—"}</TableCell>
              <TableCell className="text-sm">{r.email || "—"}</TableCell>
              <TableCell className="text-sm">{r.programme_name || "—"}</TableCell>
              <TableCell className="text-sm">{r.department_name || "—"}</TableCell>
              <TableCell>
                {r.errors.length > 0 ? (
                  <span className="text-xs text-destructive">{r.errors[0]}</span>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function BatchHistory() {
  const { data: batches } = useQuery({
    queryKey: ["erp", "batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("erp_import_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (!batches || batches.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Recent syncs</h3>
      <ScrollArea className="max-h-[320px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Created</TableHead>
              <TableHead className="text-right">Updated</TableHead>
              <TableHead className="text-right">Archived</TableHead>
              <TableHead className="text-right">Failed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="text-xs">{new Date(b.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-sm truncate max-w-[200px]">{b.filename || "—"}</TableCell>
                <TableCell>
                  <Badge variant={b.status === "completed" ? "secondary" : "outline"}>{b.status}</Badge>
                </TableCell>
                <TableCell className="text-right">{b.created_count}</TableCell>
                <TableCell className="text-right">{b.updated_count}</TableCell>
                <TableCell className="text-right">{b.archived_count}</TableCell>
                <TableCell className="text-right">{b.failed_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}
