import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import { Search, Users, BookOpen, Building2, ShieldCheck, X } from "@/components/icons";

type SearchResult = {
  id: string;
  type: "student" | "lecture" | "college" | "admin";
  primary: string;
  secondary?: string;
};

export default function SAGlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: results = [], isFetching } = useQuery<SearchResult[]>({
    queryKey: ["sa_search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.trim().length < 2) return [];
      const q = `%${debouncedQuery}%`;

      const [studentsRes, lecturesRes, collegesRes, adminsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, name, email").ilike("name", q).limit(4),
        supabase.from("lectures").select("id, topic, venue").ilike("topic", q).limit(3),
        supabase.from("colleges").select("id, college_name, subdomain").ilike("college_name", q).limit(3),
        supabase.from("profiles").select("user_id, name, email").ilike("email", q).limit(3),
      ]);

      const merged: SearchResult[] = [
        ...(studentsRes.data ?? []).map(s => ({
          id: s.user_id, type: "student" as const,
          primary: s.name ?? "Unknown", secondary: s.email ?? undefined,
        })),
        ...(lecturesRes.data ?? []).map(l => ({
          id: l.id, type: "lecture" as const,
          primary: l.topic, secondary: l.venue ?? undefined,
        })),
        ...(collegesRes.data ?? []).map(c => ({
          id: c.id, type: "college" as const,
          primary: c.college_name, secondary: c.subdomain ?? undefined,
        })),
        ...(adminsRes.data ?? []).map(a => ({
          id: a.user_id, type: "admin" as const,
          primary: a.name ?? "Unknown", secondary: a.email ?? undefined,
        })),
      ];
      return merged;
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 10_000,
  });

  const TYPE_META = {
    student: { icon: Users, color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Student" },
    lecture: { icon: BookOpen, color: "bg-purple-500/10 text-purple-400 border-purple-500/20", label: "Lecture" },
    college: { icon: Building2, color: "bg-success/10 text-success border-success/20", label: "College" },
    admin: { icon: ShieldCheck, color: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Admin" },
  };

  const showDropdown = open && query.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search students, lectures, colleges…"
          className="pl-9 pr-8 h-8 text-xs bg-background border-border-subtle"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-surface-1 border border-border-subtle rounded-lg shadow-xl overflow-hidden">
          {isFetching ? (
            <div className="p-3 space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-8 rounded bg-surface-2 animate-pulse" />)}
            </div>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No results for "{debouncedQuery}"
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto py-1">
              {results.map(r => {
                const meta = TYPE_META[r.type];
                const Icon = meta.icon;
                return (
                  <div
                    key={`${r.type}-${r.id}`}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-surface-2 cursor-pointer transition-colors"
                    onClick={() => { setOpen(false); }}
                  >
                    <div className={`w-6 h-6 rounded flex items-center justify-center border ${meta.color} shrink-0`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{r.primary}</p>
                      {r.secondary && <p className="text-[10px] text-muted-foreground truncate">{r.secondary}</p>}
                    </div>
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border shrink-0 ${meta.color}`}>
                      {meta.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
