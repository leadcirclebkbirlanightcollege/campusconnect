import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Search, FileText, FileType2 } from "@/components/icons";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedFilter } from "@/components/ui/SegmentedFilter";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";

type Doc = {
  id: string;
  title: string;
  file_url: string;
  file_name: string | null;
  doc_type: string;
  subject: string | null;
  created_at: string;
};

const TYPE_STYLES: Record<string, string> = {
  notes: "bg-info/12 text-info",
  syllabus: "bg-primary/12 text-primary",
  assignment: "bg-warning/12 text-warning",
  resource: "bg-success/12 text-success",
};

type FilterKey = "all" | string;

export default function StudentDocuments() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const debouncedSearch = useDebounce(search, 300);

  const { data: collegeId } = useQuery({
    queryKey: ["my_college_id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_college_id");
      return data as string | null;
    },
    staleTime: 120_000,
  });

  const { data: docs = [], isLoading } = useQuery<Doc[]>({
    queryKey: ["student", "documents", collegeId, debouncedSearch],
    enabled: !!collegeId,
    queryFn: async () => {
      let q = supabase
        .from("documents")
        .select("id,title,file_url,file_name,doc_type,subject,created_at")
        .eq("college_id", collegeId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (debouncedSearch) q = q.ilike("title", `%${debouncedSearch}%`);
      const { data } = await q.limit(100);
      return (data ?? []) as Doc[];
    },
    staleTime: 60_000,
  });

  const types = useMemo(() => Array.from(new Set(docs.map((d) => d.doc_type))), [docs]);
  const filtered = filter === "all" ? docs : docs.filter((d) => d.doc_type === filter);

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Documents" subtitle="Notes, syllabi & study material" gradient />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents…"
          className="h-11 rounded-2xl pl-10 text-sm"
        />
      </div>

      {types.length > 0 && (
        <SegmentedFilter<FilterKey>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: docs.length },
            ...types.map((t) => ({
              value: t,
              label: t.charAt(0).toUpperCase() + t.slice(1),
              count: docs.filter((d) => d.doc_type === t).length,
            })),
          ]}
        />
      )}

      {isLoading ? (
        <div className="space-y-2.5">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard hover={false} className="text-center py-12">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {docs.length === 0 ? "No documents uploaded yet" : "No documents in this category"}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <article
              key={doc.id}
              className="group flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-1 p-3.5 shadow-card transition-[transform,box-shadow] duration-180 hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TYPE_STYLES[doc.doc_type] ?? "bg-surface-3 text-muted-foreground"}`}
              >
                <FileType2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">{doc.title}</p>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="capitalize rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium">
                    {doc.doc_type}
                  </span>
                  {doc.subject && <span className="truncate">{doc.subject}</span>}
                  <span>·</span>
                  <span>{format(new Date(doc.created_at), "dd MMM")}</span>
                </div>
              </div>
              <Button
                variant="secondary"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl"
                onClick={() => window.open(doc.file_url, "_blank")}
                aria-label="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            </article>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
