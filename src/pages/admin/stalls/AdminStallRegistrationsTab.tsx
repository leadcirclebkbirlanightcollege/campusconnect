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
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronDown,
} from "@/components/icons";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  team_lead_gender: string | null;
  member_2_name: string | null;
  member_2_class: string | null;
  member_2_gender: string | null;
  member_3_name: string | null;
  member_3_class: string | null;
  member_3_gender: string | null;
  member_4_name: string | null;
  member_4_class: string | null;
  member_4_gender: string | null;
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
          "id,event_id,user_id,stall_name,contact_name,contact_email,contact_phone,team_lead_name,team_lead_class,team_lead_gender,member_2_name,member_2_class,member_2_gender,member_3_name,member_3_class,member_3_gender,member_4_name,member_4_class,member_4_gender,gender,phone,selling_description,extra_requirements,suggestion,type,description,requirements,status,created_at"
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

  // 1. Export to Excel / CSV with individual member genders
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
      "Team Lead Gender",
      "Member 2 Name",
      "Member 2 Class",
      "Member 2 Gender",
      "Member 3 Name",
      "Member 3 Class",
      "Member 3 Gender",
      "Member 4 Name",
      "Member 4 Class",
      "Member 4 Gender",
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

        const leadGender = r.team_lead_gender || r.gender || "";
        const m2Gender = r.member_2_gender || "";
        const m3Gender = r.member_3_gender || "";
        const m4Gender = r.member_4_gender || "";

        return [
          clean(r.id),
          clean(r.user_id ? "Registered Student" : "Guest Registration"),
          clean(ev?.title ?? "Unknown Event"),
          clean(r.team_lead_name || r.contact_name),
          clean(r.team_lead_class),
          clean(leadGender),
          clean(r.member_2_name),
          clean(r.member_2_class),
          clean(m2Gender),
          clean(r.member_3_name),
          clean(r.member_3_class),
          clean(m3Gender),
          clean(r.member_4_name),
          clean(r.member_4_class),
          clean(m4Gender),
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
    toast.success("Excel / CSV export downloaded");
  };

  // 2. Export to Word (.doc) with complete formatted member columns
  const handleExportWord = () => {
    const rows = stallsQuery.data ?? [];
    if (rows.length === 0) {
      toast.info("No registrations to export");
      return;
    }

    const tableRows = rows
      .map((r, idx) => {
        const ev = r.event_id ? eventMap[r.event_id] : null;
        const extraReqs =
          (r.extra_requirements || []).join(", ") || r.requirements || "None";
        const regType = r.user_id ? "Registered Student" : "Guest Registration";
        const dateStr = r.created_at
          ? format(new Date(r.created_at), "dd MMM yyyy, hh:mm a")
          : "—";

        const leadName = r.team_lead_name || r.contact_name || "—";
        const leadClass = r.team_lead_class || "—";
        const leadGender = r.team_lead_gender || r.gender || "Not recorded";

        const m2Name = r.member_2_name || "—";
        const m2Class = r.member_2_class || "—";
        const m2Gender = r.member_2_gender || "Not recorded";

        const m3Name = r.member_3_name || "—";
        const m3Class = r.member_3_class || "—";
        const m3Gender = r.member_3_gender || "Not recorded";

        const m4Name = r.member_4_name || "—";
        const m4Class = r.member_4_class || "—";
        const m4Gender = r.member_4_gender || "Not recorded";

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${regType}</td>
            <td>${ev?.title ?? "—"}</td>
            <td><b>${leadName}</b><br/>Class: ${leadClass}<br/>Gender: ${leadGender}</td>
            <td><b>${m2Name}</b><br/>Class: ${m2Class}<br/>Gender: ${m2Gender}</td>
            <td><b>${m3Name}</b><br/>Class: ${m3Class}<br/>Gender: ${m3Gender}</td>
            <td><b>${m4Name}</b><br/>Class: ${m4Class}<br/>Gender: ${m4Gender}</td>
            <td>${r.phone || r.contact_phone || "—"}</td>
            <td>${r.selling_description || r.description || "—"}</td>
            <td>${extraReqs}</td>
            <td>${r.suggestion || "—"}</td>
            <td><b>${r.status.toUpperCase()}</b></td>
            <td>${dateStr}</td>
          </tr>
        `;
      })
      .join("");

    const wordHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Campus Connect — Stall Registrations Report</title>
        <style>
          body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 10pt; color: #111; margin: 20px; }
          h1 { font-size: 16pt; color: #0284c7; margin-bottom: 4px; }
          p { margin: 0 0 10px; font-size: 9pt; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #0f172a; color: #ffffff; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 9pt; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 8.5pt; vertical-align: top; }
          tr:nth-child(even) { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>Campus Connect — Stall Registrations Official Report</h1>
        <p>B. K. Birla Night College, Kalyan • Generated: ${format(new Date(), "PPP 'at' p")} | Total Registrations: ${rows.length}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Event</th>
              <th>Team Lead (Name / Class / Gender)</th>
              <th>Member 2 (Name / Class / Gender)</th>
              <th>Member 3 (Name / Class / Gender)</th>
              <th>Member 4 (Name / Class / Gender)</th>
              <th>Phone</th>
              <th>Selling Description</th>
              <th>Extra Requirements</th>
              <th>Suggestion</th>
              <th>Status</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([wordHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stall_registrations_${format(new Date(), "yyyyMMdd_HHmm")}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Word report (.doc) downloaded");
  };

  // 3. Export to PDF (Print-ready document with formatted printable table)
  const handleExportPDF = () => {
    const rows = stallsQuery.data ?? [];
    if (rows.length === 0) {
      toast.info("No registrations to export");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to generate PDF print view.");
      return;
    }

    const tableRows = rows
      .map((r, idx) => {
        const ev = r.event_id ? eventMap[r.event_id] : null;
        const extraReqs =
          (r.extra_requirements || []).join(", ") || r.requirements || "None";
        const regType = r.user_id ? "Student" : "Guest";
        const dateStr = r.created_at
          ? format(new Date(r.created_at), "dd MMM yyyy, hh:mm a")
          : "—";

        const leadName = r.team_lead_name || r.contact_name || "—";
        const leadClass = r.team_lead_class || "—";
        const leadGender = r.team_lead_gender || r.gender || "—";

        const m2Name = r.member_2_name || "—";
        const m2Class = r.member_2_class || "—";
        const m2Gender = r.member_2_gender || "—";

        const m3Name = r.member_3_name || "—";
        const m3Class = r.member_3_class || "—";
        const m3Gender = r.member_3_gender || "—";

        const m4Name = r.member_4_name || "—";
        const m4Class = r.member_4_class || "—";
        const m4Gender = r.member_4_gender || "—";

        return `
          <tr>
            <td>${idx + 1}</td>
            <td><span class="badge ${r.user_id ? "badge-student" : "badge-guest"}">${regType}</span></td>
            <td>${ev?.title ?? "—"}</td>
            <td><strong>${leadName}</strong><br/><span class="text-sub">Class: ${leadClass} | Gender: ${leadGender}</span></td>
            <td><strong>${m2Name}</strong><br/><span class="text-sub">Class: ${m2Class} | Gender: ${m2Gender}</span></td>
            <td><strong>${m3Name}</strong><br/><span class="text-sub">Class: ${m3Class} | Gender: ${m3Gender}</span></td>
            <td><strong>${m4Name}</strong><br/><span class="text-sub">Class: ${m4Class} | Gender: ${m4Gender}</span></td>
            <td>${r.phone || r.contact_phone || "—"}</td>
            <td>${r.selling_description || r.description || "—"}</td>
            <td>${extraReqs}</td>
            <td>${r.suggestion || "—"}</td>
            <td><span class="badge badge-${r.status}">${r.status}</span></td>
            <td><small>${dateStr}</small></td>
          </tr>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Campus Connect — Stall Registrations Official Report</title>
        <style>
          @page { size: landscape; margin: 8mm; }
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10px; color: #0f172a; margin: 0; padding: 10px; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
          h1 { margin: 0; font-size: 16px; color: #0f172a; }
          .meta { font-size: 10px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
          th { background: #0f172a; color: #ffffff; border: 1px solid #cbd5e1; padding: 6px 4px; text-align: left; font-weight: 600; font-size: 9px; }
          td { border: 1px solid #cbd5e1; padding: 5px 4px; vertical-align: top; }
          tr:nth-child(even) { background: #f8fafc; }
          .text-sub { color: #475569; font-size: 8.5px; }
          .badge { display: inline-block; padding: 2px 4px; border-radius: 3px; font-size: 8px; font-weight: bold; text-transform: uppercase; }
          .badge-student { background: #dbeafe; color: #1e40af; }
          .badge-guest { background: #f3e8ff; color: #6b21a8; }
          .badge-approved { background: #dcfce7; color: #166534; }
          .badge-pending { background: #fef9c3; color: #854d0e; }
          .badge-rejected { background: #fee2e2; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Campus Connect — Stall Registrations Official Report</h1>
            <div class="meta">B. K. Birla Night College, Kalyan • E-Cell & Campus Events</div>
          </div>
          <div class="meta" style="text-align: right;">
            <div>Generated: ${format(new Date(), "PPP 'at' p")}</div>
            <div>Total Registrations: ${rows.length}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 20px;">#</th>
              <th>Type</th>
              <th>Event</th>
              <th>Team Lead (Name, Class, Gender)</th>
              <th>Member 2 (Name, Class, Gender)</th>
              <th>Member 3 (Name, Class, Gender)</th>
              <th>Member 4 (Name, Class, Gender)</th>
              <th>Phone</th>
              <th>Selling Description</th>
              <th>Extra Reqs</th>
              <th>Suggestion</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
    toast.success("PDF print preview generated");
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
            Review 4-member teams, classes, individual genders & requirements
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

          {/* Multi-Format Export Dropdown (Excel, Word, PDF) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-xl gap-1.5 text-xs font-semibold shadow-xs"
              >
                <Download className="h-3.5 w-3.5 text-primary" /> Export
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5 shadow-lg">
              <DropdownMenuItem
                onClick={handleExportCSV}
                className="gap-2 text-xs font-medium cursor-pointer rounded-xl py-2"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Excel Report (.csv)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportWord}
                className="gap-2 text-xs font-medium cursor-pointer rounded-xl py-2"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Word Document (.doc)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportPDF}
                className="gap-2 text-xs font-medium cursor-pointer rounded-xl py-2"
              >
                <Printer className="h-4 w-4 text-amber-600" />
                <span>PDF Print / Save</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

                  {/* Team Structure Display with Individual Genders */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" /> Team Members, Classes & Genders
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                      {/* 1. Team Lead */}
                      <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-primary uppercase">
                            Team Lead
                          </span>
                          {(s.team_lead_gender || s.gender) && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary">
                              {s.team_lead_gender || s.gender}
                            </Badge>
                          )}
                        </div>
                        <p className="font-bold text-foreground truncate">
                          {leadName}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {leadClass ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-background border text-foreground font-mono text-[10px]">
                              {leadClass}
                            </span>
                          ) : (
                            "Class not recorded"
                          )}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground">
                          Gender: <strong className="text-foreground font-semibold">{s.team_lead_gender || s.gender || "—"}</strong>
                        </p>
                      </div>

                      {/* 2. Member 2 */}
                      <div className="p-2.5 rounded-xl border border-border-subtle bg-surface-2/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            Member 2
                          </span>
                          {s.member_2_gender && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border text-foreground">
                              {s.member_2_gender}
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-foreground truncate">
                          {s.member_2_name || "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {s.member_2_class ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-background border text-foreground font-mono text-[10px]">
                              {s.member_2_class}
                            </span>
                          ) : (
                            "—"
                          )}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground">
                          Gender: <strong className="text-foreground font-semibold">{s.member_2_gender || "—"}</strong>
                        </p>
                      </div>

                      {/* 3. Member 3 */}
                      <div className="p-2.5 rounded-xl border border-border-subtle bg-surface-2/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            Member 3
                          </span>
                          {s.member_3_gender && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border text-foreground">
                              {s.member_3_gender}
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-foreground truncate">
                          {s.member_3_name || "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {s.member_3_class ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-background border text-foreground font-mono text-[10px]">
                              {s.member_3_class}
                            </span>
                          ) : (
                            "—"
                          )}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground">
                          Gender: <strong className="text-foreground font-semibold">{s.member_3_gender || "—"}</strong>
                        </p>
                      </div>

                      {/* 4. Member 4 */}
                      <div className="p-2.5 rounded-xl border border-border-subtle bg-surface-2/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            Member 4
                          </span>
                          {s.member_4_gender && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border text-foreground">
                              {s.member_4_gender}
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-foreground truncate">
                          {s.member_4_name || "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {s.member_4_class ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-background border text-foreground font-mono text-[10px]">
                              {s.member_4_class}
                            </span>
                          ) : (
                            "—"
                          )}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground">
                          Gender: <strong className="text-foreground font-semibold">{s.member_4_gender || "—"}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metadata: Phone, Selling Description, Extra Requirements */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
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
