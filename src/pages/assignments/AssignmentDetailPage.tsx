import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { PageContainer } from "@/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PremiumEmpty } from "@/components/ui/premium-empty";
import ShareButton from "@/components/share/ShareButton";
import { useShareMeta } from "@/hooks/use-share-meta";
import { format, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ClipboardList,
  CheckCircle2,
  Upload,
  Paperclip,
  Download,
  AlertTriangle,
  BookOpen,
  User,
} from "@/components/icons";

type AssignmentRecord = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  due_date: string;
  max_marks: number | null;
  attachment_url: string | null;
  attachment_name: string | null;
  faculty_id: string | null;
  college_id: string | null;
  is_active: boolean;
  created_at: string;
};

type MySubmissionRecord = {
  assignment_id: string;
  status: string;
  marks_obtained: number | null;
  feedback: string | null;
  submitted_at: string;
  attachment_url: string | null;
  attachment_name: string | null;
  content: string | null;
};

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();

  const [submitText, setSubmitText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch assignment public/academic details
  const { data: assignment, isLoading, isError } = useQuery<AssignmentRecord | null>({
    queryKey: ["assignment", "detail", id],
    enabled: Boolean(id) && !authLoading,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("assignments")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) return null;
      return (data as unknown) as AssignmentRecord | null;
    },
    staleTime: 60_000,
  });

  // Fetch only the CURRENT student's own submission (STRICT PRIVACY: never exposes other students' submissions)
  const { data: mySubmission, isLoading: submissionLoading } = useQuery<MySubmissionRecord | null>({
    queryKey: ["assignment", "my-submission", id, user?.id],
    enabled: Boolean(id) && Boolean(user?.id),
    queryFn: async () => {
      if (!id || !user?.id) return null;
      const { data, error } = await (supabase as any)
        .from("submissions")
        .select("assignment_id, status, marks_obtained, feedback, submitted_at, attachment_url, attachment_name, content")
        .eq("assignment_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) return null;
      return (data as unknown) as MySubmissionRecord | null;
    },
    staleTime: 30_000,
  });

  useShareMeta({
    title: assignment?.title || "Assignment",
    description: assignment?.subject
      ? `Assignment for ${assignment.subject}`
      : "Campus Connect Assignment",
    canonicalPath: id ? `/assignments/${id}` : "/assignments",
  });

  const dueDay = useMemo(() => {
    if (!assignment?.due_date) return null;
    return new Date(assignment.due_date);
  }, [assignment?.due_date]);

  const isOverdue = dueDay ? isPast(dueDay) && !isToday(dueDay) : false;
  const isDueToday = dueDay ? isToday(dueDay) : false;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app/assignments");
    }
  };

  // Submit student's own work
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !assignment) throw new Error("Not authenticated");
      const { data: role } = await supabase
        .from("user_roles")
        .select("college_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const { error } = await (supabase as any).from("submissions").upsert(
        {
          assignment_id: assignment.id,
          user_id: user.id,
          college_id: role?.college_id,
          content: submitText.trim() || null,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "assignment_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment submitted successfully!");
      qc.invalidateQueries({ queryKey: ["assignment", "my-submission", id] });
      qc.invalidateQueries({ queryKey: ["student", "my-submissions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit"),
  });

  if (authLoading || isLoading) {
    return (
      <PageContainer className="py-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </PageContainer>
    );
  }

  // Not authenticated → redirect to login preserving destination
  if (!user) {
    navigate(`/auth?redirect=${encodeURIComponent(`/assignments/${id}`)}`, { replace: true });
    return null;
  }

  if (isError || !assignment) {
    return (
      <PageContainer className="py-12 max-w-2xl mx-auto text-center space-y-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 mb-4 self-start">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <PremiumEmpty
          art="assignments"
          tone="warning"
          title="Assignment Not Found"
          description="This assignment may have been removed or is no longer active."
        />
        <div className="pt-2 flex justify-center gap-3">
          <Button onClick={() => navigate("/app/assignments")} className="rounded-xl">
            Browse All Assignments
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
            <span>Assignments</span>
          </Button>

          <ShareButton
            title={assignment.title}
            description={assignment.subject ? `Subject: ${assignment.subject}` : assignment.title}
            url={`/assignments/${assignment.id}`}
            entityType="assignment"
            variant="outline"
            size="sm"
            className="rounded-xl font-semibold"
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Header Card */}
        <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6 sm:p-8 shadow-card space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning border border-warning/20">
              <ClipboardList className="h-7 w-7" />
            </div>

            <div className="flex flex-wrap gap-2">
              {isOverdue && (
                <Badge variant="destructive" className="font-bold text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" /> Overdue
                </Badge>
              )}
              {isDueToday && (
                <Badge className="bg-warning text-warning-foreground font-bold text-xs">
                  Due Today
                </Badge>
              )}
              {!isOverdue && !isDueToday && (
                <Badge variant="outline" className="font-medium text-xs">
                  Upcoming
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {assignment.title}
            </h1>
            {assignment.subject && (
              <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" /> {assignment.subject}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl border border-border-subtle bg-surface-2/60">
              <p className="text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">Due Date</p>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {dueDay ? format(dueDay, "dd MMM yyyy, h:mm a") : assignment.due_date}
              </p>
            </div>

            {assignment.max_marks != null && (
              <div className="p-3 rounded-xl border border-border-subtle bg-surface-2/60">
                <p className="text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">Max Marks</p>
                <p className="text-xs font-bold text-foreground mt-0.5">
                  {assignment.max_marks} pts
                </p>
              </div>
            )}

            <div className="p-3 rounded-xl border border-border-subtle bg-surface-2/60">
              <p className="text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">Status</p>
              <p className="text-xs font-bold text-foreground mt-0.5 capitalize">
                {mySubmission?.status || "Pending"}
              </p>
            </div>
          </div>

          {/* Description / Instructions */}
          {assignment.description && (
            <div className="pt-2 border-t border-border-subtle/70 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Instructions
              </h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {assignment.description}
              </div>
            </div>
          )}

          {/* Attached Files from Faculty */}
          {assignment.attachment_url && (
            <div className="pt-2 border-t border-border-subtle/70 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Assignment Attachment
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(assignment.attachment_url!, "_blank", "noopener,noreferrer")}
                className="rounded-xl gap-2 text-xs"
              >
                <Download className="h-4 w-4 text-primary" />
                {assignment.attachment_name || "Download Attached Resource"}
              </Button>
            </div>
          )}
        </div>

        {/* Student Submission Card */}
        <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" /> Your Submission
            </h2>
            {mySubmission ? (
              <Badge className="bg-success text-success-foreground font-semibold gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" /> Submitted
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Not submitted yet
              </Badge>
            )}
          </div>

          {mySubmission ? (
            <div className="p-4 rounded-2xl border border-border-subtle bg-surface-2/60 space-y-3">
              <p className="text-xs text-muted-foreground">
                Submitted on {format(new Date(mySubmission.submitted_at), "dd MMM yyyy, h:mm a")}
              </p>

              {mySubmission.content && (
                <div className="text-sm bg-surface-1 p-3 rounded-xl border border-border-subtle text-foreground">
                  {mySubmission.content}
                </div>
              )}

              {mySubmission.marks_obtained != null && (
                <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Marks Awarded</span>
                  <Badge className="bg-premium text-white font-bold">
                    {mySubmission.marks_obtained} / {assignment.max_marks || "-"}
                  </Badge>
                </div>
              )}

              {mySubmission.feedback && (
                <div className="text-xs bg-surface-3 p-2.5 rounded-lg text-muted-foreground">
                  <span className="font-bold text-foreground">Faculty Feedback: </span>
                  {mySubmission.feedback}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                placeholder="Type your submission notes or paste external document link..."
                value={submitText}
                onChange={(e) => setSubmitText(e.target.value)}
                rows={4}
                className="rounded-2xl text-sm"
              />
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!submitText.trim() || submitMutation.isPending}
                className="rounded-xl font-bold px-6"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Assignment"}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
