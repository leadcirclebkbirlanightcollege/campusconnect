import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useOnboardingStatus } from "@/hooks/use-onboarding-status";
import { useAuth } from "@/providers/AuthProvider";
import { useLogout } from "@/hooks/useLogout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  LogOut,
  AlertCircle,
  ShieldCheck,
  Eye,
  FileCheck2,
  ChevronDown,
  ChevronUp,
} from "@/components/icons";
import { toast } from "sonner";

export default function PendingApproval() {
  const { user } = useAuth();
  const { data: status, refetch, isFetching } = useOnboardingStatus();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const logout = useLogout();

  const [signedIdUrl, setSignedIdUrl] = useState<string | null>(null);
  const [showIdCard, setShowIdCard] = useState(false);

  // Auto-redirect when approved
  useEffect(() => {
    if (status?.approval_status === "approved" && status?.college_assigned) {
      navigate("/app/dashboard", { replace: true });
    }
    if (status && !status.profile_completed) {
      navigate("/onboarding-wizard", { replace: true });
    }
  }, [status, navigate]);

  // Realtime subscribe to own profile row
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["onboarding_status", user.id] });
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc, refetch]);

  // Fetch signed URL for private ID card preview if path exists
  useEffect(() => {
    if (!status?.id_card_path) return;
    let isMounted = true;

    supabase.storage
      .from("student-id-cards")
      .createSignedUrl(status.id_card_path, 300)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error && data?.signedUrl) {
          setSignedIdUrl(data.signedUrl);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [status?.id_card_path]);

  const isRejected = status?.approval_status === "rejected";

  const steps = [
    { key: "account", label: "Account Created", done: true },
    { key: "id_uploaded", label: "ID Card Submitted", done: true },
    {
      key: "review",
      label: isRejected ? "Correction Needed" : "Admin Review",
      done: status?.approval_status === "approved",
      inProgress: status?.approval_status === "pending",
      danger: isRejected,
    },
    {
      key: "activated",
      label: "Campus Activated",
      done: status?.approval_status === "approved",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-[540px] rounded-2xl border border-border-subtle bg-surface-1/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-center"
      >
        {/* State Icon Badge */}
        <div
          className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-5 transition-transform ${
            isRejected
              ? "bg-destructive/10 border border-destructive/25 text-destructive"
              : "bg-primary/10 border border-primary/20 text-primary"
          }`}
        >
          {isRejected ? (
            <AlertCircle className="h-8 w-8" />
          ) : (
            <ShieldCheck className="h-8 w-8" />
          )}
        </div>

        {/* Title & Copy */}
        <h1 className="text-[22px] font-bold tracking-tight mb-2">
          {isRejected
            ? "Verification Needs Correction"
            : "College ID Submitted for Verification"}
        </h1>

        <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
          {isRejected
            ? "Your college ID card submission could not be verified by the college administration. Please review the note below and resubmit a clear photo."
            : "Your B. K. Birla Night Arts, Science & Commerce College ID card has been received. Our administration will review your document and verify your academic cohort."}
        </p>

        {/* Rejection Alert Card */}
        {isRejected && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-left mb-6 space-y-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-[13px] font-semibold text-destructive">
                Administrative Feedback:
              </p>
            </div>
            <p className="text-[13px] text-destructive/90 pl-6">
              {status?.rejection_reason ||
                "The submitted photo was either illegible, incomplete, or did not match registered college records. Please upload a clear photo of your valid ID card."}
            </p>
          </div>
        )}

        {/* Progress Timeline Stepper */}
        <div className="grid grid-cols-4 gap-2 mb-6 px-1">
          {steps.map((s, i) => (
            <div key={s.key} className="flex flex-col items-center relative">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center border text-[11px] font-bold transition-all ${
                  s.danger
                    ? "bg-destructive/15 border-destructive text-destructive"
                    : s.done
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : s.inProgress
                    ? "bg-primary/20 border-primary text-primary animate-pulse"
                    : "bg-surface-2 border-border-subtle text-muted-foreground"
                }`}
              >
                {s.danger ? (
                  <AlertCircle className="h-4 w-4" />
                ) : s.done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : s.inProgress ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  i + 1
                )}
              </div>
              <span className="mt-2 text-[10px] sm:text-[11px] font-semibold text-foreground leading-tight text-center">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Submitted ID Card Preview Expander */}
        {signedIdUrl && (
          <div className="rounded-xl border border-border-subtle bg-surface-2/60 overflow-hidden mb-6 text-left">
            <button
              type="button"
              onClick={() => setShowIdCard(!showIdCard)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-[12px] font-medium text-foreground hover:bg-surface-2 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                View Submitted College ID Card
              </span>
              {showIdCard ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showIdCard && (
              <div className="p-4 border-t border-border-subtle bg-background/50 flex flex-col items-center">
                <div className="rounded-lg overflow-hidden border border-border-subtle max-h-56 bg-black/5 flex items-center justify-center">
                  <img
                    src={signedIdUrl}
                    alt="Submitted College ID"
                    className="max-h-56 w-auto object-contain rounded"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  This document is stored securely in your private institutional vault.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {isRejected ? (
            <Button
              onClick={() => navigate("/onboarding-wizard")}
              className="w-full h-11 text-[14px] font-bold shadow-md shadow-primary/20"
            >
              Update ID Card &amp; Resubmit
            </Button>
          ) : (
            <Button
              onClick={() => {
                refetch();
                toast.success("Status refreshed");
              }}
              disabled={isFetching}
              className="w-full h-11 gap-2 font-bold"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh Status
            </Button>
          )}

          <Button
            variant="outline"
            onClick={logout}
            className="w-full h-11 gap-2 border-border-subtle"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-border-subtle/70 space-y-1 text-[11px] text-muted-foreground">
          <p>
            Signed in as <span className="font-semibold text-foreground">{user?.email}</span>
          </p>
          <p>
            Once approved, you will be redirected automatically to your dashboard.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
