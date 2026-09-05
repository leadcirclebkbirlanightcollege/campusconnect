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
  Megaphone,
  Pin,
  Calendar,
  Clock,
  AlertCircle,
  Building2,
  Users,
} from "@/components/icons";

type AnnouncementRecord = {
  id: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "normal" | "low";
  is_pinned: boolean;
  target: string | null;
  college_id: string | null;
  created_at: string;
  expires_at: string | null;
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-danger/12 text-danger border-danger/30 font-bold",
  high: "bg-warning/12 text-warning border-warning/30 font-bold",
  normal: "bg-surface-3 text-muted-foreground border-border-subtle",
  low: "bg-surface-3 text-muted-foreground border-border-subtle",
};

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const { data: announcement, isLoading, isError } = useQuery<AnnouncementRecord | null>({
    queryKey: ["announcement", "detail", id],
    enabled: Boolean(id) && !authLoading,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, description, priority, is_pinned, target, college_id, created_at, expires_at")
        .eq("id", id)
        .maybeSingle();

      if (error) return null;
      return data as unknown as AnnouncementRecord | null;
    },
    staleTime: 60_000,
  });

  useShareMeta({
    title: announcement?.title || "Campus Announcement",
    description: announcement?.description || "Important campus announcement on Campus Connect.",
    canonicalPath: id ? `/announcements/${id}` : "/announcements",
  });

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app/announcements");
    }
  };

  if (authLoading || isLoading) {
    return (
      <PageContainer className="py-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </PageContainer>
    );
  }

  // Not authenticated → redirect to login preserving destination
  if (!user) {
    navigate(`/auth?redirect=${encodeURIComponent(`/announcements/${id}`)}`, { replace: true });
    return null;
  }

  if (isError || !announcement) {
    return (
      <PageContainer className="py-12 max-w-2xl mx-auto text-center space-y-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 mb-4 self-start">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <PremiumEmpty
          art="announcements"
          tone="primary"
          title="Announcement Not Found"
          description="This announcement may have expired or been removed."
        />
        <div className="pt-2 flex justify-center gap-3">
          <Button onClick={() => navigate("/app/announcements")} className="rounded-xl">
            View All Announcements
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
            <span>Announcements</span>
          </Button>

          <ShareButton
            title={announcement.title}
            description={announcement.description}
            url={`/announcements/${announcement.id}`}
            entityType="announcement"
            variant="outline"
            size="sm"
            className="rounded-xl font-semibold"
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6 sm:p-8 shadow-card space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Megaphone className="h-7 w-7" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {announcement.is_pinned && (
                <Badge className="bg-primary text-primary-foreground font-bold text-xs gap-1">
                  <Pin className="h-3 w-3 fill-current" /> Pinned
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-xs capitalize px-2.5 py-0.5 ${
                  PRIORITY_STYLES[announcement.priority] || ""
                }`}
              >
                {announcement.priority} Priority
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {announcement.title}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span>Published {format(new Date(announcement.created_at), "EEEE, d MMMM yyyy, h:mm a")}</span>
              {announcement.target && (
                <>
                  <span>·</span>
                  <span className="capitalize font-semibold text-foreground">Target: {announcement.target}</span>
                </>
              )}
            </p>
          </div>

          <div className="pt-2 border-t border-border-subtle/70 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Official Notice
            </h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
              {announcement.description}
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle/70 flex flex-wrap gap-3">
            <ShareButton
              title={announcement.title}
              description={announcement.description}
              url={`/announcements/${announcement.id}`}
              entityType="announcement"
              variant="secondary"
              className="rounded-xl font-semibold gap-2"
              text="Share Announcement"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
