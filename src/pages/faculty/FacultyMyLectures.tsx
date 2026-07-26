import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useState, useMemo } from "react";
import { BookOpen, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  live:       "bg-green-500/10 text-green-600 border-green-500/20",
  scheduled:  "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  ended:      "bg-muted text-muted-foreground border-border",
};

export default function FacultyMyLectures() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: lectures = [], isLoading } = useQuery({
    queryKey: ["faculty", "all-lectures", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("lectures")
        .select("id,topic,venue,lecture_date,start_time,end_time,status,created_at")
        .eq("created_by", user!.id)
        .order("lecture_date", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return lectures.filter((l) => {
      const matchesSearch = l.topic.toLowerCase().includes(search.toLowerCase()) ||
                            l.venue.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [lectures, search, statusFilter]);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-5 text-primary-foreground shadow-elevated">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] opacity-80">Teaching Workspace</p>
        <h1 className="font-heading text-[22px] font-black tracking-tight">My Lectures</h1>
        <p className="text-[12px] opacity-85 mt-0.5">{lectures.length} total lectures</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by topic or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 text-[13px] rounded-2xl bg-card border-border/50"
          />
        </div>
        <div className="flex gap-1.5 rounded-2xl bg-surface-2 p-1">
          {["all", "live", "scheduled", "ended"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 h-9 rounded-xl text-[12px] font-semibold capitalize transition-all",
                statusFilter === s
                  ? "bg-surface-1 text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">No lectures found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/30">
          {filtered.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-4 py-3.5">
              <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{l.topic}</p>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(l.lecture_date), "MMM d, yyyy")} · {l.start_time} – {l.end_time} · {l.venue}
                </p>
              </div>
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize",
                STATUS_COLORS[l.status] ?? STATUS_COLORS.ended
              )}>
                {l.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
