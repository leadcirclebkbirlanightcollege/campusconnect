import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useState, useMemo } from "react";
import { BookOpen } from "@/components/icons";
import { format } from "date-fns";
import {
  WorkspacePage,
  WorkspaceHero,
  WorkspaceToolbar,
  WorkspaceFilterGroup,
  WorkspaceLoading,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceList,
  WorkspaceRow,
  WorkspaceStatus,
  type WorkspaceStatusTone,
} from "@/components/workspace/WorkspaceKit";

const STATUS_TONE: Record<string, WorkspaceStatusTone> = {
  live: "success",
  scheduled: "warning",
  ended: "neutral",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "scheduled", label: "Scheduled" },
  { value: "ended", label: "Ended" },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

export default function FacultyMyLectures() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: lectures = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["faculty", "all-lectures", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,venue,lecture_date,start_time,end_time,status,created_at")
        .eq("created_by", user!.id)
        .order("lecture_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return lectures.filter((l) => {
      const matchesSearch =
        l.topic?.toLowerCase().includes(q) || l.venue?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [lectures, search, statusFilter]);

  const liveCount = useMemo(
    () => lectures.filter((l) => l.status === "live").length,
    [lectures],
  );

  return (
    <WorkspacePage>
      <WorkspaceHero
        eyebrow="Teaching Workspace"
        title="My Lectures"
        icon={BookOpen}
        subtitle="Every session you've created, newest first"
        stats={[
          { label: "Total lectures", value: lectures.length },
          { label: "Live now", value: liveCount },
          { label: "Showing", value: filtered.length },
        ]}
      />

      <WorkspaceToolbar
        search={search}
        onSearchChange={setSearch}
        searchLabel="Search lectures"
        placeholder="Search by topic or venue…"
      >
        <WorkspaceFilterGroup<StatusFilter>
          label="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[...STATUS_OPTIONS]}
        />
      </WorkspaceToolbar>

      {isError ? (
        <WorkspaceError
          description="We couldn't reach your lecture records."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <WorkspaceLoading rows={5} />
      ) : filtered.length === 0 ? (
        <WorkspaceEmpty
          icon={BookOpen}
          title={lectures.length === 0 ? "No lectures yet" : "No lectures match"}
          description={
            lectures.length === 0
              ? "Lectures you schedule will show up here."
              : "Try clearing the search or switching the status filter."
          }
        />
      ) : (
        <WorkspaceList label="Lectures">
          {filtered.map((l) => (
            <WorkspaceRow key={l.id}>
              <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{l.topic}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {format(new Date(l.lecture_date), "MMM d, yyyy")} · {l.start_time} – {l.end_time} · {l.venue}
                </p>
              </div>
              <WorkspaceStatus tone={STATUS_TONE[l.status] ?? "neutral"}>{l.status}</WorkspaceStatus>
            </WorkspaceRow>
          ))}
        </WorkspaceList>
      )}
    </WorkspacePage>
  );
}
