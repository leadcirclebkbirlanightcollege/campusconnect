import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useMemo, useState } from "react";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-[20px] font-bold text-foreground">Students</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">{students.length} unique students in your lectures</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by name, ID or class..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-[13px] bg-card border-border/50"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">No students found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(filtered as any[]).map((s, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {s.avatar_url
                  ? <img src={s.avatar_url} className="h-9 w-9 rounded-full object-cover" alt={s.name} />
                  : <span className="text-[13px] font-bold text-primary">{s.name?.[0]?.toUpperCase() ?? "?"}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{s.name}</p>
                <p className="text-[11px] text-muted-foreground">{s.student_id ?? "—"} · {s.class_name ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
