import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Search, File, FileText } from "lucide-react";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

const TYPE_COLORS: Record<string, string> = {
  notes: "bg-blue-500/10 text-blue-600",
  syllabus: "bg-purple-500/10 text-purple-600",
  assignment: "bg-orange-500/10 text-orange-600",
  resource: "bg-green-500/10 text-green-600",
};

export default function StudentDocuments() {
  const [search, setSearch] = useState("");
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

  const grouped = docs.reduce<Record<string, Doc[]>>((acc, doc) => {
    const key = doc.doc_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Documents" subtitle="Study materials shared by your college" gradient />

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents…"
          className="h-10 pl-8 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : docs.length === 0 ? (
        <GlassCard hover={false} className="text-center py-12">
          <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
        </GlassCard>
      ) : (
        Object.entries(grouped).map(([type, typeDocs]) => (
          <div key={type}>
            <h3 className="text-sm font-semibold text-foreground capitalize mb-2 px-1">{type}</h3>
            <div className="space-y-2">
              {typeDocs.map((doc) => (
                <GlassCard key={doc.id} className="flex items-center gap-3 p-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLORS[doc.doc_type] ?? "bg-muted"}`}>
                    <File className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {doc.subject && <span className="text-[10px] text-muted-foreground">{doc.subject}</span>}
                      <span className="text-[10px] text-muted-foreground">{format(new Date(doc.created_at), "dd MMM")}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                    onClick={() => window.open(doc.file_url, "_blank")}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </GlassCard>
              ))}
            </div>
          </div>
        ))
      )}
    </PageContainer>
  );
}
