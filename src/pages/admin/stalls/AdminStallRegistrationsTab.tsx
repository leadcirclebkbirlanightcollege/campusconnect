import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Store,
  Filter,
  Phone,
  Download,
  Users,
  Calendar,
  Sparkles,
  HelpCircle,
} from "@/components/icons";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StallRow = {
  id: string;
  event_id: string | null;
  user_id: string | null;
  stall_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  team_lead_name: string | null;
  team_lead_class: string | null;
  member_2_name: string | null;
  member_2_class: string | null;
  member_3_name: string | null;
  member_3_class: string | null;
  member_4_name: string | null;
  member_4_class: string | null;
  gender: string | null;
  phone: string | null;
  selling_description: string | null;
  extra_requirements: string[] | null;
  suggestion: string | null;
  type: string | null;
  description: string | null;
  requirements: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function AdminStallRegistrationsTab() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("all");

  const selectedEventId = searchParams.get("eventId") || "all";

  // Query events list for the event filter dropdown
  const allEventsQuery = useQuery({
    queryKey: ["admin", "all-events-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,event_date,max_stalls")
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const stallsQuery = useQuery({
    queryKey: ["admin", "stalls", statusFilter, selectedEventId],
    queryFn: async () => {
      let q = supabase
        .from("stall_registrations")
        .select(
          "id,event_id,user_id,stall_name,contact_name,contact_email,contact_phone,team_lead_name,team_lead_class,member_2_name,member_2_class,member_3_name,member_3_class,member_4_name,member_4_class,gender,phone,selling_description,extra_requirements,suggestion,type,description,requirements,status,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(300);

      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (selectedEventId !== "all") q = q.eq("event_id", selectedEventId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as StallRow[];
    },
  });

  const eventMap = useMemo(() => {
    const map: Record<string, { title: string; event_date: string; max_stalls: number | null }> = {};
    for (const e of allEventsQuery.data ?? []) {
      map[e.id] = { title: e.title, event_date: e.event_date, max_stalls: e.max_stalls };
    }
    return map;
  }, [allEventsQuery.data]);

  const decide = useMutation({
    mutationFn: async (vars: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("stall_registrations")
        .update({ status: vars.status })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(
        vars.status === "approved" ? "Stall approved" : "Stall rejected"
      );
      qc.invalidateQueries({ queryKey: ["admin", "stalls"] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed";
      if (msg.includes("max_stalls_reached")) {
        toast.error("Event stall limit reached");
      } else {
        toast.error(msg);
      }
    },
  });

  // Export to CSV functionality
  const handleExportCSV = () => {
    const rows = stallsQuery.data ?? [];
    if (rows.length === 0) {
      toast.info("No registrations to export");
      return;
    }

    const headers = [
      "Registration ID",
      "Registration Type",
      "Event Title",
      "Team Lead Name",
      "Team Lead Class",
      "Member 2 Name",
      "Member 2 Class",
      "Member 3 Name",
      "Member 3 Class",
      "Member 4 Name",
      "Member 4 Class",
      "Gender",
      "Phone",
      "Selling Description",
      "Extra Requirements",
      "Suggestion",
      "Status",
      "Submitted At",
    ];

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => {
        const ev = r.event_id ? eventMap[r.event_id] : null;
        const extraReqs = (r.extra_requirements || []).join(" + ") || r.requirements || "";
        const clean = (val?: string | null) =>
          `"${(val ?? "").toString().replace(/"/g, '""')}"`;

        return [
          clean(r.id),
          clean(r.user_id ? "Registered Student" : "Guest Registration"),
          clean(ev?.title ?? "Unknown Event"),
          clean(r.team_lead_name || r.contact_name),
          clean(r.team_lead_class),
          clean(r.member_2_name),
          clean(r.member_2_class),
          clean(r.member_3_name),
          clean(r.member_3_class),
          clean(r.member_4_name),
          clean(r.member_4_class),
          clean(r.gender),
          clean(r.phone || r.contact_phone),
          clean(r.selling_description || r.description),
          clean(extraReqs),
          clean(r.suggestion),
          clean(r.status),
          clean(r.created_at ? format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss") : ""),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `stall_registrations_${format(new Date(), "yyyyMMdd_HHmm")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV export downloaded");
  };

  return (
    <div className="space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" /> Stall Registrations
          </h2>
          <p className="text-sm text-muted-foreground">
            Review 4-member teams, classes, requirements & approve proposals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Event Filter */}
          <select
            className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium max-w-[200px] truncate"
            value={selectedEventId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "all") {
                searchParams.delete("eventId");
                setSearchParams(searchParams);
              } else {
                setSearchParams({ eventId: val });
              }
            }}
          >
            <option value="all">All Events</option>
            {(allEventsQuery.data ?? []).map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Export CSV Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="h-9 rounded-xl gap-1.5 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="border-border-subtle rounded-3xl overflow-hidden shadow-card">
        <CardHeader className="pb-3 border-b border-border-subtle bg-surface-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span>Registrations</span>
              <Badge variant="secondary" className="font-mono text-xs">
                {(stallsQuery.data ?? []).length}
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {stallsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          ) : stallsQuery.isError ? (
            <QueryErrorState
              title="Couldn't load stall registrations"
              error={stallsQuery.error}
              onRetry={() => stallsQuery.refetch()}
              isRetrying={stallsQuery.isFetching}
            />
          ) : (stallsQuery.data ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <Store className="h-10 w-10 mx-auto text-muted-foreground/40 stroke-1" />
              <p className="text-sm font-medium">No stall registrations found.</p>
              <p className="text-xs">
                When students submit proposals through the Event Detail page, they will appear here.
              </p>
            </div>
          ) : (
            (stallsQuery.data ?? []).map((s) => {
              const ev = s.event_id ? eventMap[s.event_id] : undefined;
              const leadName = s.team_lead_name || s.contact_name || "Team Lead";
              const leadClass = s.team_lead_class;
              const phone = s.phone || s.contact_phone;
              const selling = s.selling_description || s.description;
              const extraReqs = s.extra_requirements || (s.requirements ? [s.requirements] : []);

              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-border-subtle bg-surface-1 p-4 space-y-3 transition-all hover:border-border"
                >
                  {/* Top row: Event Title, Date, Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle/60 pb-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {ev?.title ?? (s.event_id ? "Loading event…" : "Event")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted on {format(new Date(s.created_at), "PPP 'at' p")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-semibold",
                          s.user_id
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                        )}
                      >
                        {s.user_id ? "Registered Student" : "Registration Type: Guest"}
                      </Badge>
                      <StatusBadge
                        status={
                          s.status === "approved"
                            ? "active"
                            : s.status === "pending"
                            ? "upcoming"
                            : "completed"
                        }
                      >
                        {s.status}
                      </StatusBadge>
                    </div>
                  </div>

                  {/* 4-Member Team Structure Display */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" /> Team Members & Classes (4 Total)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                      {/* 1. Team Lead */}
                      <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 space-y-0.5">
                        <span className="text-[10px] font-bold text-primary uppercase">
                          Team Lead
                        </span>
                        <p className="font-bold text-foreground truncate">
                          {leadName}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {leadClass ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-background border text-foreground font-mono">
                              {leadClass}
                            </span>
                          ) : (
                            "Class not recorded"
                          )}
                        </p>
                      </div>

                      {/* 2. Member 2 */}
                      <div className="p-2.5 rounded-xl border border-border-subtle bg-surface-2/60 space-y-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Member 2
                        </span>
                        <p className="font-semibold text-foreground truncate">
                          {s.member_2_name || "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {s.member_2_class ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-background border text-foreground font-mono">
                              {s.member_2_class}
                            </span>
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>

                      {/* 3. Member 3 */}
                      <div className="p-2.5 rounded-xl border border-border-subtle bg-surface-2/60 space-y-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Member 3
                        </span>
                        <p className="font-semibold text-foreground truncate">
                          {s.member_3_name || "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {s.member_3_class ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-background border text-foreground font-mono">
                              {s.member_3_class}
                            </span>
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>

                      {/* 4. Member 4 */}
                      <div className="p-2.5 rounded-xl border border-border-subtle bg-surface-2/60 space-y-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Member 4
                        </span>
                        <p className="font-semibold text-foreground truncate">
                          {s.member_4_name || "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {s.member_4_class ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-background border text-foreground font-mono">
                              {s.member_4_class}
                            </span>
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metadata: Gender, Phone, Selling, Requirements */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        {s.gender && (
                          <span className="text-muted-foreground">
                            Gender: <strong className="text-foreground">{s.gender}</strong>
                          </span>
                        )}
                        {phone && (
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Phone className="h-3.5 w-3.5 text-emerald-600" />
                            <a href={`tel:${phone}`} className="hover:underline">
                              {phone}
                            </a>
                          </span>
                        )}
                      </div>

                      {selling && (
                        <div>
                          <span className="font-bold text-muted-foreground block text-[11px] uppercase">
                            What they want to sell:
                          </span>
                          <p className="text-foreground bg-surface-2/50 p-2 rounded-xl text-xs mt-0.5 leading-relaxed">
                            {selling}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {extraReqs && extraReqs.length > 0 && (
                        <div>
                          <span className="font-bold text-muted-foreground block text-[11px] uppercase">
                            Extra Requirements ({extraReqs.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {extraReqs.map((req, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="bg-[#FCE541]/15 text-[#8A5B16] dark:text-[#FCE541] border-[#C08634]/30 font-semibold text-[11px]"
                              >
                                {req}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {s.suggestion && (
                        <div>
                          <span className="font-bold text-muted-foreground block text-[11px] uppercase">
                            Suggestion:
                          </span>
                          <p className="text-muted-foreground italic text-xs mt-0.5">
                            &quot;{s.suggestion}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Approve / Reject Actions */}
                  {s.status === "pending" && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle/60">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1 rounded-xl h-8 text-xs font-semibold px-3"
                        onClick={() => decide.mutate({ id: s.id, status: "rejected" })}
                        disabled={decide.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1 rounded-xl h-8 text-xs font-semibold px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        onClick={() => decide.mutate({ id: s.id, status: "approved" })}
                        disabled={decide.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve Proposal
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
