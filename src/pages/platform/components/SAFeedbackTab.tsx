/**
 * SAFeedbackTab — Super Admin feedback review panel.
 * Lists all user-submitted feedback with status management.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Palette,
  CheckCircle2,
  Clock,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type FeedbackRow = {
  id: string;
  user_id: string;
  college_id: string | null;
  category: string;
  message: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  profile?: { name: string; email: string; student_id: string | null } | null;
  college?: { college_name: string } | null;
};

const CATEGORY_ICON: Record<string, React.ElementType> = {
  bug:     Bug,
  feature: Lightbulb,
  ui:      Palette,
  general: MessageSquare,
};
const CATEGORY_COLOR: Record<string, string> = {
  bug:     "text-danger",
  feature: "text-success",
  ui:      "text-accent",
  general: "text-primary",
};
const STATUS_COLORS: Record<string, string> = {
  open:     "bg-warning/15 text-warning border-warning/25",
  reviewed: "bg-primary/15 text-primary border-primary/25",
  resolved: "bg-success/15 text-success border-success/25",
};

export default function SAFeedbackTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: rows = [], isLoading } = useQuery<FeedbackRow[]>({
    queryKey: ["sa_feedback", filterStatus, filterCategory],
    queryFn: async () => {
      let q = (supabase as any)
        .from("feedback")
        .select("*, profile:profiles(name,email,student_id), college:colleges(college_name)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filterStatus !== "all")   q = q.eq("status", filterStatus);
      if (filterCategory !== "all") q = q.eq("category", filterCategory);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FeedbackRow[];
    },
    staleTime: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("feedback")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa_feedback"] });
      toast.success("Feedback status updated");
    },
    onError: () => toast.error("Update failed"),
  });

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.message.toLowerCase().includes(q) ||
      (r.profile?.name ?? "").toLowerCase().includes(q) ||
      (r.profile?.email ?? "").toLowerCase().includes(q)
    );
  });

  const openCount     = rows.filter((r) => r.status === "open").length;
  const resolvedCount = rows.filter((r) => r.status === "resolved").length;

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Open",     count: openCount,              color: "text-warning",  bg: "bg-warning/10" },
          { label: "Reviewed", count: rows.filter(r => r.status === "reviewed").length, color: "text-primary", bg: "bg-primary/10" },
          { label: "Resolved", count: resolvedCount,          color: "text-success",  bg: "bg-success/10" },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`rounded-xl border border-border-subtle ${bg} p-3 text-center`}>
            <p className={`text-xl font-black tabular-nums ${color}`}>{count}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search feedback…"
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-[110px]">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All status</SelectItem>
            <SelectItem value="open" className="text-xs">Open</SelectItem>
            <SelectItem value="reviewed" className="text-xs">Reviewed</SelectItem>
            <SelectItem value="resolved" className="text-xs">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-8 text-xs w-[120px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All types</SelectItem>
            <SelectItem value="bug" className="text-xs">🐛 Bug</SelectItem>
            <SelectItem value="feature" className="text-xs">💡 Feature</SelectItem>
            <SelectItem value="ui" className="text-xs">🎨 UI</SelectItem>
            <SelectItem value="general" className="text-xs">💬 General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-10 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No feedback found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            const Icon  = CATEGORY_ICON[row.category] ?? MessageSquare;
            const color = CATEGORY_COLOR[row.category] ?? "text-primary";
            return (
              <div
                key={row.id}
                className="rounded-xl border border-border-subtle bg-surface-1 p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate">
                        {row.profile?.name ?? "Unknown"} · {row.profile?.email ?? "—"}
                      </p>
                      {row.college?.college_name && (
                        <p className="text-[10px] text-muted-foreground">{row.college.college_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className={`text-[10px] border ${STATUS_COLORS[row.status] ?? ""} capitalize`}>
                      {row.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">{row.message}</p>

                {row.status !== "resolved" && (
                  <div className="flex items-center gap-2 pt-1">
                    {row.status === "open" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 gap-1"
                        onClick={() => updateStatus.mutate({ id: row.id, status: "reviewed" })}
                        disabled={updateStatus.isPending}
                      >
                        <Clock className="h-3 w-3" /> Mark Reviewed
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 gap-1 text-success border-success/25 hover:bg-success/10"
                      onClick={() => updateStatus.mutate({ id: row.id, status: "resolved" })}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle2 className="h-3 w-3" /> Resolve
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
