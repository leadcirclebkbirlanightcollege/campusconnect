import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Store, Filter, Mail, Phone } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

type StallRow = {
  id: string;
  event_id: string;
  user_id: string;
  stall_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  type: string;
  description: string | null;
  requirements: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function AdminStallRegistrationsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const stallsQuery = useQuery({
    queryKey: ["admin", "stalls", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("stall_registrations")
        .select("id,event_id,user_id,stall_name,contact_name,contact_email,contact_phone,type,description,requirements,status,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as StallRow[];
    },
  });

  const eventIds = useMemo(
    () => Array.from(new Set((stallsQuery.data ?? []).map((s) => s.event_id))),
    [stallsQuery.data],
  );

  const eventsQuery = useQuery({
    queryKey: ["admin", "stalls-events", eventIds],
    enabled: eventIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,event_date,max_stalls")
        .in("id", eventIds);
      if (error) throw error;
      const map: Record<string, { title: string; event_date: string; max_stalls: number | null }> = {};
      for (const e of data ?? []) map[e.id] = { title: e.title, event_date: e.event_date, max_stalls: e.max_stalls };
      return map;
    },
  });

  const decide = useMutation({
    mutationFn: async (vars: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase.from("stall_registrations").update({ status: vars.status }).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "approved" ? "Stall approved" : "Stall rejected");
      qc.invalidateQueries({ queryKey: ["admin", "stalls"] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed";
      if (msg.includes("max_stalls_reached")) toast.error("Event stall limit reached");
      else toast.error(msg);
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" /> Stall Registrations
          </h2>
          <p className="text-sm text-muted-foreground">Review and approve event stall requests</p>
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
          <CardTitle className="text-sm">Registrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stallsQuery.isLoading ? (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          ) : (stallsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No registrations to show.</p>
          ) : (
            (stallsQuery.data ?? []).map((s) => {
              const ev = eventsQuery.data?.[s.event_id];
              return (
                <div key={s.id} className="rounded-lg border border-border-subtle p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{s.stall_name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {s.type} • {ev?.title ?? "Event"}
                        {ev?.max_stalls != null && <span> • cap {ev.max_stalls}</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Submitted {format(new Date(s.created_at), "PP p")}
                      </p>
                    </div>
                    <StatusBadge
                      status={
                        s.status === "approved" ? "active" : s.status === "pending" ? "upcoming" : "completed"
                      }
                    >
                      {s.status}
                    </StatusBadge>
                  </div>

                  <div className="text-[12px] space-y-1">
                    <p>
                      <span className="font-medium">{s.contact_name}</span>
                    </p>
                    <p className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.contact_email}</span>
                      {s.contact_phone && (
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.contact_phone}</span>
                      )}
                    </p>
                    {s.description && <p className="text-muted-foreground">{s.description}</p>}
                    {s.requirements && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Needs:</span> {s.requirements}
                      </p>
                    )}
                  </div>

                  {s.status === "pending" && (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => decide.mutate({ id: s.id, status: "approved" })}
                        disabled={decide.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        onClick={() => decide.mutate({ id: s.id, status: "rejected" })}
                        disabled={decide.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
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
