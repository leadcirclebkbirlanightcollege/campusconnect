import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle, ArrowRight, CheckCircle2, GraduationCap, Loader2, Plus,
  RotateCcw, Sparkles, Trash2, Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Rule = {
  id: string;
  from_class: string;
  to_class: string | null;
  graduates: boolean;
  next_year: number | null;
};
type Preview = {
  total_eligible: number;
  total_promoted: number;
  total_graduated: number;
  summary: Array<{ from: string; to: string | null; graduates: boolean; count: number }>;
  rules_count: number;
  students_in_college: number;
};
type Run = {
  id: string;
  to_session: string;
  total_promoted: number;
  total_graduated: number;
  reversed_at: string | null;
  created_at: string;
};

const EMPTY_RULE = { from_class: "", to_class: "", graduates: false, next_year: "" };

export default function AdminPromotionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rule, setRule] = useState(EMPTY_RULE);
  const [toSession, setToSession] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const { data: collegeId } = useQuery({
    queryKey: ["my_college_id"],
    queryFn: async () => (await supabase.rpc("get_my_college_id")).data as string | null,
    staleTime: 120_000,
  });

  const rulesQ = useQuery<Rule[]>({
    queryKey: ["promotion_rules", collegeId],
    enabled: !!collegeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("class_promotion_rules" as any)
        .select("id, from_class, to_class, graduates, next_year")
        .eq("college_id", collegeId!)
        .order("from_class");
      return ((data ?? []) as unknown) as Rule[];
    },
  });

  const runsQ = useQuery<Run[]>({
    queryKey: ["promotion_runs", collegeId],
    enabled: !!collegeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("academic_promotion_runs" as any)
        .select("id, to_session, total_promoted, total_graduated, reversed_at, created_at")
        .eq("college_id", collegeId!)
        .order("created_at", { ascending: false })
        .limit(10);
      return ((data ?? []) as unknown) as Run[];
    },
  });

  const addRule = useMutation({
    mutationFn: async () => {
      if (!collegeId) throw new Error("No college");
      if (!rule.from_class.trim()) throw new Error("From class is required");
      if (!rule.graduates && !rule.to_class.trim()) throw new Error("To class is required (or mark graduates)");
      const { error } = await supabase.from("class_promotion_rules" as any).insert({
        college_id: collegeId,
        from_class: rule.from_class.trim(),
        to_class: rule.graduates ? null : rule.to_class.trim(),
        graduates: rule.graduates,
        next_year: rule.next_year ? parseInt(rule.next_year) : null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule added");
      setRule(EMPTY_RULE);
      qc.invalidateQueries({ queryKey: ["promotion_rules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("class_promotion_rules" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule removed");
      qc.invalidateQueries({ queryKey: ["promotion_rules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewM = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("academic-promote-students", {
        body: { action: "preview" },
      });
      if (error) throw new Error((data as any)?.error ?? error.message);
      return data as Preview;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const executeM = useMutation({
    mutationFn: async () => {
      if (!toSession.trim()) throw new Error("Enter the new academic session (e.g. 2026-27)");
      const { data, error } = await supabase.functions.invoke("academic-promote-students", {
        body: { action: "execute", to_session: toSession.trim() },
      });
      if (error) throw new Error((data as any)?.error ?? error.message);
      return data as { updated: number; total_promoted: number; total_graduated: number };
    },
    onSuccess: (r) => {
      toast.success(`Promoted ${r.total_promoted} · Graduated ${r.total_graduated}`);
      setConfirmOpen(false);
      setConfirmText("");
      qc.invalidateQueries({ queryKey: ["promotion_runs"] });
      previewM.reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rollbackM = useMutation({
    mutationFn: async (run_id: string) => {
      const { data, error } = await supabase.functions.invoke("academic-promote-students", {
        body: { action: "rollback", run_id },
      });
      if (error) throw new Error((data as any)?.error ?? error.message);
      return data;
    },
    onSuccess: () => {
      toast.success("Promotion reversed");
      qc.invalidateQueries({ queryKey: ["promotion_runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const preview = previewM.data;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" /> Academic Promotion
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Promote every active student to the next academic year, or graduate final-year cohorts. Historical records are preserved.
        </p>
      </div>

      {/* Rules */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Promotion Rules
            <Badge variant="secondary" className="text-[10px] ml-auto">{rulesQ.data?.length ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-12 items-end">
            <div className="sm:col-span-3">
              <Label className="text-[11px]">From class</Label>
              <Input className="h-9 mt-1" placeholder="FYCS" value={rule.from_class}
                onChange={(e) => setRule({ ...rule, from_class: e.target.value })} />
            </div>
            <div className="sm:col-span-3">
              <Label className="text-[11px]">To class</Label>
              <Input className="h-9 mt-1" placeholder="SYCS" value={rule.to_class}
                disabled={rule.graduates}
                onChange={(e) => setRule({ ...rule, to_class: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px]">Next year</Label>
              <Input className="h-9 mt-1" type="number" placeholder="2" value={rule.next_year}
                onChange={(e) => setRule({ ...rule, next_year: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2 pt-5">
              <Checkbox id="grad" checked={rule.graduates}
                onCheckedChange={(v) => setRule({ ...rule, graduates: !!v, to_class: v ? "" : rule.to_class })} />
              <Label htmlFor="grad" className="text-[12px] cursor-pointer">Graduates</Label>
            </div>
            <div className="sm:col-span-2">
              <Button className="h-9 w-full" onClick={() => addRule.mutate()} disabled={addRule.isPending}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/40 divide-y divide-border/30">
            {rulesQ.isLoading ? (
              <div className="p-3 space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
              </div>
            ) : (rulesQ.data ?? []).length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground italic">No rules yet. Add mappings like FYCS → SYCS, SYCS → TYCS, TYCS → graduates.</p>
            ) : (rulesQ.data ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="flex items-center gap-2 text-[12px] font-mono">
                  <span className="font-semibold text-foreground">{r.from_class}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  {r.graduates ? (
                    <Badge variant="secondary" className="text-[10px]"><GraduationCap className="h-3 w-3 mr-1" /> Graduates</Badge>
                  ) : (
                    <span className="font-semibold text-primary">{r.to_class}</span>
                  )}
                  {r.next_year != null && <Badge variant="outline" className="text-[10px]">Year {r.next_year}</Badge>}
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteRule.mutate(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview & Execute */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Run Promotion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Label className="text-[11px]">New academic session</Label>
              <Input className="h-9 mt-1" placeholder="2026-27" value={toSession} onChange={(e) => setToSession(e.target.value)} />
            </div>
            <div className="sm:col-span-2 flex items-end gap-2">
              <Button variant="outline" className="h-9" onClick={() => previewM.mutate()} disabled={previewM.isPending}>
                {previewM.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                Preview changes
              </Button>
              <Button
                className="h-9"
                disabled={!preview || preview.total_eligible === 0 || !toSession.trim()}
                onClick={() => setConfirmOpen(true)}
              >
                <GraduationCap className="h-3.5 w-3.5 mr-1" /> Execute promotion
              </Button>
            </div>
          </div>

          {preview && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-3 text-[12px]">
                <span className="font-semibold text-foreground">{preview.total_eligible.toLocaleString()}</span>
                <span className="text-muted-foreground">eligible</span>
                <span className="ml-auto text-success font-semibold">↑ {preview.total_promoted}</span>
                <span className="text-warning font-semibold">🎓 {preview.total_graduated}</span>
              </div>
              <div className="divide-y divide-border/30">
                {preview.summary.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No students match the configured rules.</p>
                ) : preview.summary.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 text-[12px] font-mono">
                    {s.graduates ? <GraduationCap className="h-3.5 w-3.5 text-warning" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                    <span className="font-semibold">{s.from}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-semibold text-primary">{s.graduates ? "Graduated" : s.to}</span>
                    <span className="ml-auto tabular-nums">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Run history */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" /> Recent Promotion Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runsQ.isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
          ) : (runsQ.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No promotion runs yet.</p>
          ) : (
            <div className="divide-y divide-border/30">
              {runsQ.data!.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">Session {r.to_session}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Promoted {r.total_promoted} · Graduated {r.total_graduated} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {r.reversed_at ? (
                    <Badge variant="secondary" className="text-[10px]">Reversed</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => rollbackM.mutate(r.id)} disabled={rollbackM.isPending}>
                      <Undo2 className="h-3.5 w-3.5 mr-1" /> Rollback
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execute confirmation */}
      <Dialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setConfirmText(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" /> Confirm promotion
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              This will move <span className="font-semibold text-foreground">{preview?.total_promoted ?? 0}</span> students
              to their next class and graduate <span className="font-semibold text-foreground">{preview?.total_graduated ?? 0}</span>{" "}
              into session <span className="font-mono font-semibold text-foreground">{toSession}</span>. Attendance, points and
              activity history are preserved. The change can be rolled back from the runs list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-[11.5px] text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">PROMOTE</span> to confirm.
            </p>
            <Input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="PROMOTE"
              className="font-mono text-[13px]"
              disabled={executeM.isPending}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)} disabled={executeM.isPending}>Cancel</Button>
            <Button size="sm" onClick={() => executeM.mutate()} disabled={confirmText !== "PROMOTE" || executeM.isPending}>
              {executeM.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <GraduationCap className="h-3.5 w-3.5 mr-1" />}
              Promote students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
