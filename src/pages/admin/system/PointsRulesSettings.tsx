import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Save, Sparkles } from "@/components/icons";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const schema = z.object({
  pointsPerAttendance: z.coerce.number().int().min(0).max(1000),
});

type PointsRuleRow = {
  id: string;
  points_per_attendance: number;
};

export default function PointsRulesSettings() {
  const [pointsPerAttendance, setPointsPerAttendance] = useState<number>(1);

  const ruleQuery = useQuery({
    queryKey: ["admin", "settings", "points_rules"],
    queryFn: async (): Promise<PointsRuleRow> => {
      const { data, error } = await supabase
        .from("points_rules")
        .select("id,points_per_attendance")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Shouldn't happen (we seed), but keep it resilient.
        const { data: inserted, error: insertError } = await supabase
          .from("points_rules")
          .insert({ points_per_attendance: 1 })
          .select("id,points_per_attendance")
          .maybeSingle();
        if (insertError) throw insertError;
        if (!inserted) throw new Error("Failed to create points rules row");
        return inserted as PointsRuleRow;
      }
      return data as PointsRuleRow;
    },
  });

  useEffect(() => {
    if (!ruleQuery.data) return;
    setPointsPerAttendance(ruleQuery.data.points_per_attendance ?? 1);
  }, [ruleQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({ pointsPerAttendance });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid value");
      }

      const row = ruleQuery.data;
      if (!row?.id) throw new Error("Rules row not loaded");

      const { error } = await supabase
        .from("points_rules")
        .update({ points_per_attendance: parsed.data.pointsPerAttendance })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Points rules updated");
      await ruleQuery.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Points Rules
        </CardTitle>
        <CardDescription>Control how many points students earn per attendance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ruleQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : ruleQuery.isError ? (
          <div className="text-sm text-muted-foreground">Couldn’t load points rules.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Points per attendance</label>
              <Input
                type="number"
                min={0}
                max={1000}
                value={String(pointsPerAttendance)}
                onChange={(e) => setPointsPerAttendance(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Applied when attendance is marked as present.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            className="gap-2"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || ruleQuery.isLoading}
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
