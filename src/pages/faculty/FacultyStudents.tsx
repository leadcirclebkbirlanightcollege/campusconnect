import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useMemo, useState } from "react";
import { Users } from "@/components/icons";
import {
  WorkspacePage,
  WorkspaceHero,
  WorkspaceToolbar,
  WorkspaceLoading,
  WorkspaceEmpty,
} from "@/components/workspace/WorkspaceKit";

export default function FacultyStudents() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  /* Get all students who attended any of this faculty's lectures */
  const { data: lectures = [] } = useQuery({
    queryKey: ["faculty", "lecture-ids", user?.id],
    enabled: !!user,
    staleTime: 120_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("lectures")
        .select("id")
        .eq("created_by", user!.id);
      return (data ?? []).map((l) => l.id);
    },
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["faculty", "students", lectures],
    enabled: lectures.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("student_user_id, profiles:student_user_id(name,email,student_id,class_name,department,avatar_url)")
        .in("lecture_id", lectures)
        .limit(500);

      // deduplicate
      const map = new Map<string, any>();
      (data ?? []).forEach((a: any) => {
        if (!map.has(a.student_user_id)) map.set(a.student_user_id, a.profiles);
      });
      return Array.from(map.values()).filter(Boolean);
    },
  });

  const filtered = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter((s: any) =>
      s.name?.toLowerCase().includes(q) ||
      s.student_id?.toLowerCase().includes(q) ||
      s.class_name?.toLowerCase().includes(q)
    );
  }, [students, search]);

  return (
    <WorkspacePage>
      <WorkspaceHero
        eyebrow="Roster Overview"
        title="Students"
        icon={Users}
        subtitle="Everyone who has attended one of your lectures"
        stats={[
          { label: "Unique students", value: students.length },
          { label: "Matching search", value: filtered.length },
        ]}
      />

      <WorkspaceToolbar
        search={search}
        onSearchChange={setSearch}
        searchLabel="Search students"
        placeholder="Search by name, ID or class…"
      />

      {isLoading ? (
        <WorkspaceLoading rows={6} />
      ) : filtered.length === 0 ? (
        <WorkspaceEmpty
          icon={Users}
          title={search ? "No matching students" : "No students yet"}
          description={
            search
              ? "Try a different name, student ID or class."
              : "Students appear here once they mark attendance in your lectures."
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Student roster">
          {(filtered as any[]).map((s, i) => (
            <li
              key={s.student_id ?? i}
              className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-card px-4 py-3 shadow-xs"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                {s.avatar_url ? (
                  <img src={s.avatar_url} className="h-9 w-9 object-cover" alt="" loading="lazy" />
                ) : (
                  <span className="text-[13px] font-bold text-primary">
                    {s.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{s.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {s.student_id ?? "—"} · {s.class_name ?? "—"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WorkspacePage>
  );
}
