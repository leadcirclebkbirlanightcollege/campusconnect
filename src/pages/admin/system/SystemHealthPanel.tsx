import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Copy,
  ShieldAlert,
  Video,
  Wifi,
  FileText,
} from "@/components/icons";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <Badge className="bg-success text-success-foreground gap-1">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {label}
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <ShieldAlert className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}

export default function SystemHealthPanel() {
  const [lastDebugId, setLastDebugId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLastDebugId(localStorage.getItem("cc:lastDebugId"));
    } catch {
      setLastDebugId(null);
    }
  }, []);

  const cameraSupport = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const isSecure = typeof window !== "undefined" && (window.isSecureContext || window.location.protocol === "https:");

  const reachabilityQuery = useQuery({
    queryKey: ["admin", "system_health", "functions_reachability"],
    queryFn: async () => {
      const startedAt = Date.now();
      const { data, error } = await supabase.functions.invoke<{ ok: boolean; now: string }>("health-check");
      if (error) throw error;
      return {
        ok: Boolean(data?.ok),
        now: data?.now,
        latencyMs: Date.now() - startedAt,
      };
    },
    retry: 1,
  });

  // Audit metrics
  const auditMetrics = useQuery({
    queryKey: ["admin", "system_health", "audit_metrics"],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [totalRes, todayRes] = await Promise.all([
        supabase.from("attendance_audit_log").select("id", { count: "exact", head: true }),
        supabase.from("attendance_audit_log").select("id", { count: "exact", head: true }).gte("changed_at", todayStart.toISOString()),
      ]);

      return {
        totalEdits: totalRes.count ?? 0,
        todayEdits: todayRes.count ?? 0,
      };
    },
  });

  const functionOk = reachabilityQuery.data?.ok === true && !reachabilityQuery.isError;

  const debugSummary = useMemo(() => {
    return {
      lastDebugId: lastDebugId ?? "—",
      reachability: functionOk ? "ok" : reachabilityQuery.isLoading ? "checking" : "failed",
      secureContext: isSecure,
      cameraSupport,
      auditEditsToday: auditMetrics.data?.todayEdits ?? 0,
      auditEditsTotal: auditMetrics.data?.totalEdits ?? 0,
    };
  }, [cameraSupport, functionOk, isSecure, lastDebugId, reachabilityQuery.isLoading, auditMetrics.data]);

  const copyDebug = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(debugSummary, null, 2));
      toast.success("Copied system health");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          System Health
        </CardTitle>
        <CardDescription>
          Quick pre-deploy checks: HTTPS/camera compatibility, backend function reachability, and audit metrics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge ok={isSecure} label={isSecure ? "HTTPS / Secure" : "Not secure"} />
          <StatusBadge ok={cameraSupport} label={cameraSupport ? "Camera supported" : "No camera"} />
          <Badge variant="secondary" className="gap-1">
            <Wifi className="h-3.5 w-3.5" />
            Functions: {reachabilityQuery.isLoading ? "checking" : functionOk ? "reachable" : "unreachable"}
          </Badge>
          {reachabilityQuery.data?.latencyMs != null ? (
            <Badge variant="secondary">~{reachabilityQuery.data.latencyMs}ms</Badge>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">Latest debug ID</div>
            <div className="mt-1 font-mono text-sm truncate">{lastDebugId ?? "—"}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Tip: this updates when you generate OTP/QR (success or error).
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">Camera notes</div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <Video className="h-4 w-4 text-muted-foreground" />
              Admin preview is usually in an iframe; camera may be blocked there.
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Audit Metrics
            </div>
            <div className="mt-1 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Today</span>
                <span className="font-medium">{auditMetrics.data?.todayEdits ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">All time</span>
                <span className="font-medium">{auditMetrics.data?.totalEdits ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {reachabilityQuery.isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            Backend function check failed: {reachabilityQuery.error instanceof Error ? reachabilityQuery.error.message : "Unknown error"}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => { reachabilityQuery.refetch(); auditMetrics.refetch(); }}
            disabled={reachabilityQuery.isFetching}
          >
            Re-check
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={copyDebug}>
            <Copy className="h-4 w-4" />
            Copy debug
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
