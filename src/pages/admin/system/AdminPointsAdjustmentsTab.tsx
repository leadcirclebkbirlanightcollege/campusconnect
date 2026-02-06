import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { MinusCircle, PlusCircle, Save } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type StudentOption = {
  user_id: string;
  name: string;
  email: string;
  student_id: string | null;
};

const baseSchema = z.object({
  userId: z.string().uuid("Select a student"),
  points: z.coerce.number().int().positive("Points must be greater than 0"),
  reason: z.string().trim().min(2, "Reason is required").max(200, "Reason must be 200 characters or less"),
});

type FormState = z.infer<typeof baseSchema>;

export default function AdminPointsAdjustmentsTab() {
  const [addForm, setAddForm] = useState<FormState>({ userId: "", points: 1, reason: "" });
  const [deductForm, setDeductForm] = useState<FormState>({ userId: "", points: 1, reason: "" });

  const studentsQuery = useQuery({
    queryKey: ["admin", "students", "options"],
    queryFn: async (): Promise<StudentOption[]> => {
      const { data: roleRows, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      if (rolesError) throw rolesError;

      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id,name,email,student_id")
        .eq("is_deleted", false)
        .in("user_id", ids)
        .order("name", { ascending: true });
      if (profilesError) throw profilesError;

      return (profiles ?? []) as StudentOption[];
    },
  });

  const options = useMemo(() => {
    return (studentsQuery.data ?? []).map((s) => ({
      value: s.user_id,
      label: `${s.name}${s.student_id ? ` (${s.student_id})` : ""} — ${s.email}`,
    }));
  }, [studentsQuery.data]);

  const adjustMutation = useMutation({
    mutationFn: async (payload: { userId: string; pointsDelta: number; reason: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-adjust-points", {
        body: {
          userId: payload.userId,
          pointsDelta: payload.pointsDelta,
          reason: payload.reason,
        },
      });

      if (error) {
        // `error` can be a FunctionsHttpError or similar; normalize message.
        throw new Error(error.message || "Failed to update points");
      }

      if ((data as any)?.error) {
        throw new Error(String((data as any).error));
      }
    },
    onSuccess: () => toast.success("Points updated"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update points"),
  });

  const submitAdd = () => {
    const parsed = baseSchema.safeParse(addForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    adjustMutation.mutate({
      userId: parsed.data.userId,
      pointsDelta: parsed.data.points,
      reason: parsed.data.reason,
    });
  };

  const submitDeduct = () => {
    const parsed = baseSchema.safeParse(deductForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    adjustMutation.mutate({
      userId: parsed.data.userId,
      pointsDelta: -Math.abs(parsed.data.points),
      reason: parsed.data.reason,
    });
  };

  const busy = studentsQuery.isLoading || adjustMutation.isPending;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Add Points
          </CardTitle>
          <CardDescription>Select a student, enter points to add, and provide a reason.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Student</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={addForm.userId}
              onChange={(e) => setAddForm((p) => ({ ...p, userId: e.target.value }))}
              disabled={busy}
            >
              <option value="">Select student…</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Points to add</label>
            <Input
              type="number"
              min={1}
              step={1}
              value={addForm.points}
              onChange={(e) => setAddForm((p) => ({ ...p, points: Number(e.target.value) }))}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Textarea
              rows={3}
              value={addForm.reason}
              onChange={(e) => setAddForm((p) => ({ ...p, reason: e.target.value }))}
              placeholder="e.g., Bonus for helping in event"
              disabled={busy}
            />
          </div>

          <div className="flex items-center justify-end">
            <Button type="button" className="gap-2" onClick={submitAdd} disabled={busy}>
              <Save className="h-4 w-4" />
              Add points
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MinusCircle className="h-5 w-5 text-accent" />
            Deduct Points
          </CardTitle>
          <CardDescription>Select a student, enter points to deduct, and provide a reason.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Student</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={deductForm.userId}
              onChange={(e) => setDeductForm((p) => ({ ...p, userId: e.target.value }))}
              disabled={busy}
            >
              <option value="">Select student…</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Points to deduct</label>
            <Input
              type="number"
              min={1}
              step={1}
              value={deductForm.points}
              onChange={(e) => setDeductForm((p) => ({ ...p, points: Number(e.target.value) }))}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Textarea
              rows={3}
              value={deductForm.reason}
              onChange={(e) => setDeductForm((p) => ({ ...p, reason: e.target.value }))}
              placeholder="e.g., Misconduct / rule violation"
              disabled={busy}
            />
          </div>

          <div className="flex items-center justify-end">
            <Button type="button" variant="outline" className="gap-2" onClick={submitDeduct} disabled={busy}>
              <Save className="h-4 w-4" />
              Deduct points
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
