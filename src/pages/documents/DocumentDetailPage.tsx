import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { PageContainer } from "@/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumEmpty } from "@/components/ui/premium-empty";
import ShareButton from "@/components/share/ShareButton";
import { useShareMeta } from "@/hooks/use-share-meta";
import { format } from "date-fns";
import {
  ArrowLeft,
  Download,
  FileText,
  FileType2,
  Calendar,
  BookOpen,
  Building2,
  ExternalLink,
  Lock,
} from "@/components/icons";

type DocRecord = {
  id: string;
  title: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  doc_type: string;
  subject: string | null;
  college_id: string | null;
  access_level: string;
  created_at: string;
};

const TYPE_STYLES: Record<string, string> = {
  notes: "bg-info/10 text-info border-info/20",
  syllabus: "bg-primary/10 text-primary border-primary/20",
  assignment: "bg-warning/10 text-warning border-warning/20",
  resource: "bg-success/10 text-success border-success/20",
};

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const { data: doc, isLoading, isError } = useQuery<DocRecord | null>({
    queryKey: ["document", "detail", id],
    enabled: Boolean(id) && !authLoading,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("documents")
        .select("id,title,file_url,file_name,file_size,doc_type,subject,college_id,access_level,created_at")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) return null;
      return data as DocRecord | null;
    },
    staleTime: 60_000,
  });

  useShareMeta({
    title: doc?.title || "Study Material",
    description: doc?.subject ? `Study material for ${doc.subject}` : "Campus Connect Document",
    canonicalPath: id ? `/notes/${id}` : "/notes",
  });

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app/documents");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (authLoading || isLoading) {
    return (
      <PageContainer className="py-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </PageContainer>
    );
  }

  // Not authenticated → redirect to login preserving destination
  if (!user) {
    navigate(`/auth?redirect=${encodeURIComponent(`/notes/${id}`)}`, { replace: true });
    return null;
  }

  if (isError || !doc) {
    return (
      <PageContainer className="py-12 max-w-2xl mx-auto text-center space-y-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 mb-4 self-start">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <PremiumEmpty
          art="documents"
          tone="primary"
          title="Document Not Found"
          description="This study material or document may have been removed or you do not have permission to view it."
        />
        <div className="pt-2 flex justify-center gap-3">
          <Button onClick={() => navigate("/app/documents")} className="rounded-xl">
            Browse All Documents
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-background/85 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1.5 rounded-xl font-medium text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Documents</span>
          </Button>

          <ShareButton
            title={doc.title}
            description={doc.subject ? `Subject: ${doc.subject}` : `Type: ${doc.doc_type}`}
            url={`/notes/${doc.id}`}
            entityType="note"
            variant="outline"
            size="sm"
            className="rounded-xl font-semibold"
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Document Header Card */}
        <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6 sm:p-8 shadow-card space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info border border-info/20">
              <FileType2 className="h-7 w-7" />
            </div>
            <Badge
              variant="outline"
              className={`text-xs uppercase tracking-wider font-bold capitalize px-3 py-1 ${
                TYPE_STYLES[doc.doc_type] ?? "bg-surface-3 text-muted-foreground"
              }`}
            >
              {doc.doc_type}
            </Badge>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {doc.title}
            </h1>
            {doc.subject && (
              <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" /> {doc.subject}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl border border-border-subtle bg-surface-2/60">
              <p className="text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">Uploaded</p>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {format(new Date(doc.created_at), "dd MMM yyyy")}
              </p>
            </div>

            {doc.file_size && (
              <div className="p-3 rounded-xl border border-border-subtle bg-surface-2/60">
                <p className="text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">Size</p>
                <p className="text-xs font-bold text-foreground mt-0.5">
                  {formatFileSize(doc.file_size)}
                </p>
              </div>
            )}

            <div className="p-3 rounded-xl border border-border-subtle bg-surface-2/60">
              <p className="text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">Access</p>
              <p className="text-xs font-bold text-foreground mt-0.5 capitalize">
                {doc.access_level || "Students"}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap gap-3">
            <Button
              onClick={() => window.open(doc.file_url, "_blank", "noopener,noreferrer")}
              className="rounded-xl gap-2 font-bold px-5"
            >
              <Download className="h-4 w-4" />
              Download / Open File
            </Button>

            <ShareButton
              title={doc.title}
              description={doc.subject ? `${doc.title} (${doc.subject})` : doc.title}
              url={`/notes/${doc.id}`}
              entityType="note"
              variant="secondary"
              className="rounded-xl font-semibold gap-2"
              text="Share Material"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
