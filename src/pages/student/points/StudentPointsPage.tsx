import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Coins, Plus, Trophy, History, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateCard } from "@/components/ui/empty-state";

const ACTIVITY_OPTIONS = [
  { value: "event_attendance", label: "Event Attendance" },
  { value: "participation", label: "Participation" },
  { value: "winning", label: "Winning" },
  { value: "idea_submission", label: "Idea Submission" },
  { value: "other", label: "Other" },
] as const;

const claimSchema = z.object({
  activity_type: z.enum(["event_attendance", "participation", "winning", "idea_submission", "other"]),
  points: z.coerce.number().int().min(1, "Min 1 point").max(1000, "Max 1000"),
  description: z.string().trim().min(4, "Add a short description").max(400),
  evidence_url: z.string().trim().url("Invalid URL").optional().or(z.literal("")),
});

export default function StudentPointsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    activity_type: "event_attendance" as (typeof ACTIVITY_OPTIONS)[number]["value"],
    points: 10,
    description: "",
    evidence_url: "",
  });

  const totalQuery = useQuery({
    queryKey: ["student", "points-total", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_points_total");
      if (error) throw error;
      return Number(data ?? 0);
    },
  });

  const claimsQuery = useQuery({
    queryKey: ["student", "claims", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_claims")
        .select("id,activity_type,points,description,status,created_at,reviewed_at,review_note")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = claimSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid form");
      const { error } = await supabase.from("point_claims").insert({
        user_id: user!.id,
        activity_type: parsed.data.activity_type,
        points: parsed.data.points,
        description: parsed.data.description,
        evidence_url: parsed.data.evidence_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Claim submitted — awaiting admin review");
      setOpen(false);
      setForm({ activity_type: "event_attendance", points: 10, description: "", evidence_url: "" });
      qc.invalidateQueries({ queryKey: ["student", "claims"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit"),
  });

  const total = totalQuery.data ?? 0;
  const pending = (claimsQuery.data ?? []).filter((c) => c.status === "pending").length;
  const approved = (claimsQuery.data ?? []).filter((c) => c.status === "approved").length;

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-warning" />
          <h1 className="text-heading text-foreground">Points & Rewards</h1>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Claim
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-warning tabular-nums">{pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-success tabular-nums">{approved}</p>
          </CardContent>
        </Card>
      </div>

      <Link to="/app/leaderboard" className="block">
        <Card className="hover:border-primary/40 transition-fast">
          <CardContent className="p-3 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="text-sm font-medium">View Leaderboard</p>
              <p className="text-[11px] text-muted-foreground">See your campus ranking</p>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4 text-muted-foreground" /> Claim History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {claimsQuery.isLoading ? (
            <>
              <Skeleton className="h-14 rounded-md" />
              <Skeleton className="h-14 rounded-md" />
            </>
          ) : (claimsQuery.data ?? []).length === 0 ? (
            <EmptyStateCard emoji="🪙" title="No claims yet" description="Submit your first activity claim to earn points." />
          ) : (
            (claimsQuery.data ?? []).map((c) => (
              <div key={c.id} className="rounded-lg border border-border-subtle p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground capitalize">
                      {c.activity_type.replace(/_/g, " ")}
                    </p>
                    {c.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-bold text-warning tabular-nums">+{c.points}</span>
                    <StatusBadge
                      status={
                        c.status === "approved" ? "active" : c.status === "pending" ? "upcoming" : "completed"
                      }
                    >
                      {c.status === "approved" ? (
                        <CheckCircle2 className="h-2.5 w-2.5" />
                      ) : c.status === "rejected" ? (
                        <XCircle className="h-2.5 w-2.5" />
                      ) : (
                        <Clock className="h-2.5 w-2.5" />
                      )}
                      {c.status}
                    </StatusBadge>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(c.created_at), "PP p")}
                  {c.review_note && c.status === "rejected" && (
                    <span className="ml-2 text-destructive">• {c.review_note}</span>
                  )}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Claim dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim Points</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Activity Type</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.activity_type}
                onChange={(e) => setForm((p) => ({ ...p, activity_type: e.target.value as any }))}
              >
                {ACTIVITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Points</Label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={form.points}
                onChange={(e) => setForm((p) => ({ ...p, points: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="Briefly describe the activity"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Evidence URL (optional)</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={form.evidence_url}
                onChange={(e) => setForm((p) => ({ ...p, evidence_url: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Submitting…" : "Submit Claim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
