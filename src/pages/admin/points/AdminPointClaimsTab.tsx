import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Coins, Filter } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

type ClaimRow = {
  id: string;
  user_id: string;
  activity_type: string;
  points: number;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  review_note: string | null;
};

export default function AdminPointClaimsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [noteByClaim, setNoteByClaim] = useState<Record<string, string>>({});

  const claimsQuery = useQuery({
    queryKey: ["admin", "point-claims", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("point_claims")
        .select("id,user_id,activity_type,points,description,status,created_at,review_note")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ClaimRow[];
    },
  });

  const userIds = useMemo(
    () => Array.from(new Set((claimsQuery.data ?? []).map((c) => c.user_id))),
    [claimsQuery.data],
  );

  const profilesQuery = useQuery({
    queryKey: ["admin", "claim-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,name,student_id,email")
        .in("user_id", userIds);
      if (error) throw error;
      const map: Record<string, { name: string; student_id: string | null; email: string }> = {};
      for (const p of data ?? []) map[p.user_id] = { name: p.name, student_id: p.student_id, email: p.email };
      return map;
    },
  });

  const decide = useMutation({
    mutationFn: async (vars: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("point_claims")
        .update({ status: vars.status, review_note: noteByClaim[vars.id] || null })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "approved" ? "Approved & points awarded" : "Rejected");
      qc.invalidateQueries({ queryKey: ["admin", "point-claims"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Coins className="h-5 w-5 text-warning" /> Point Claims
          </h2>
          <p className="text-sm text-muted-foreground">Review and approve student point claims</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{statusFilter === "all" ? "All claims" : `${statusFilter} claims`}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {claimsQuery.isLoading ? (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          ) : (claimsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No claims to show.</p>
          ) : (
            (claimsQuery.data ?? []).map((c) => {
              const p = profilesQuery.data?.[c.user_id];
              return (
                <div key={c.id} className="rounded-lg border border-border-subtle p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {p?.name ?? "Loading…"}
                        {p?.student_id && <span className="text-muted-foreground"> · {p.student_id}</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {c.activity_type.replace(/_/g, " ")} • {format(new Date(c.created_at), "PP p")}
                      </p>
                      {c.description && <p className="text-[12px] mt-1">{c.description}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-base font-bold text-warning tabular-nums">+{c.points}</span>
                      <StatusBadge
                        status={
                          c.status === "approved" ? "active" : c.status === "pending" ? "upcoming" : "completed"
                        }
                      >
                        {c.status}
                      </StatusBadge>
                    </div>
                  </div>

                  {c.status === "pending" && (
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        placeholder="Optional note (shown on rejection)"
                        value={noteByClaim[c.id] ?? ""}
                        onChange={(e) => setNoteByClaim((m) => ({ ...m, [c.id]: e.target.value }))}
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => decide.mutate({ id: c.id, status: "approved" })}
                        disabled={decide.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        onClick={() => decide.mutate({ id: c.id, status: "rejected" })}
                        disabled={decide.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                  {c.status !== "pending" && c.review_note && (
                    <p className="text-[11px] text-muted-foreground italic">Note: {c.review_note}</p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
