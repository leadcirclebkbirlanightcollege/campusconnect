import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type BackfillResult = {
  dryRun: boolean;
  includeDeleted: boolean;
  totalProfiles: number;
  existingRoles: number;
  missingRoles: number;
  inserted: number;
};

export default function AdminRoleBackfillPanel() {
  const [dryRun, setDryRun] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [lastResult, setLastResult] = useState<BackfillResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<BackfillResult>("admin-backfill-user-roles", {
        body: { dryRun, includeDeleted },
      });
      if (error) throw error;
      if (!data) throw new Error("No response from backend");
      return data;
    },
    onSuccess: (data) => {
      setLastResult(data);
      if (data.dryRun) {
        toast.success(`Scan complete: ${data.missingRoles} missing role(s)`);
      } else {
        toast.success(`Backfill complete: inserted ${data.inserted} role(s)`);
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Role backfill failed"),
  });

  const summary = useMemo(() => {
    if (!lastResult) return null;
    return {
      title: lastResult.dryRun ? "Last scan" : "Last run",
      text: `Profiles: ${lastResult.totalProfiles} • With roles: ${lastResult.existingRoles} • Missing: ${lastResult.missingRoles} • Inserted: ${lastResult.inserted}`,
    };
  }, [lastResult]);

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Roles maintenance
        </CardTitle>
        <CardDescription>
          Creates missing <code className="px-1 py-0.5 rounded bg-muted">user_roles</code> rows for existing users to prevent role-null issues.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Dry run (scan only)</div>
              <div className="text-xs text-muted-foreground">Shows how many are missing without inserting.</div>
            </div>
            <Switch checked={dryRun} onCheckedChange={setDryRun} />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Include deleted users</div>
              <div className="text-xs text-muted-foreground">Normally excludes deleted profiles.</div>
            </div>
            <Switch checked={includeDeleted} onCheckedChange={setIncludeDeleted} />
          </div>
        </div>

        {summary ? (
          <div className="rounded-md border border-border/60 p-3">
            <div className="text-sm font-medium">{summary.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{summary.text}</div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" className="gap-2" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <Wand2 className="h-4 w-4" />
            {dryRun ? "Scan for missing roles" : "Backfill missing roles"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
