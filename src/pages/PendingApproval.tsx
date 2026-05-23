import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useOnboardingStatus } from "@/hooks/use-onboarding-status";
import { useAuth } from "@/providers/AuthProvider";
import { useLogout } from "@/hooks/useLogout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, RefreshCw, LogOut, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function PendingApproval() {
  const { user } = useAuth();
  const { data: status, refetch, isFetching } = useOnboardingStatus();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const logout = useLogout();

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
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["onboarding_status", user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  const isRejected = status?.approval_status === "rejected";

  const steps = [
    { key: "submitted", label: "Submitted", done: true },
    { key: "review", label: "Under Review", done: status?.approval_status !== "pending" || true },
    {
      key: "decision",
      label: isRejected ? "Rejected" : "Approved",
      done: status?.approval_status === "approved" || isRejected,
      danger: isRejected,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-primary/8 blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-[480px] rounded-2xl border border-border-subtle bg-surface-1/80 backdrop-blur-xl p-8 shadow-2xl text-center"
      >
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          {isRejected
            ? <AlertCircle className="h-7 w-7 text-destructive" />
            : <Sparkles className="h-7 w-7 text-primary" />}
        </div>

        <h1 className="text-[22px] font-semibold tracking-tight mb-2">
          {isRejected ? "Verification Failed" : "Profile Setup Complete 🎉"}
        </h1>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
          {isRejected
            ? (status?.rejection_reason || "Your submission could not be verified. You can update your details and resubmit.")
            : "Your profile has been successfully created and submitted for verification. Please wait while the administration verifies your enrollment details and assigns your college access."}
        </p>

        {/* Status stepper */}
        <div className="flex items-center justify-between mb-6 px-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex flex-col items-center flex-1 relative">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${
                s.danger ? "bg-destructive/10 border-destructive text-destructive" :
                s.done ? "bg-primary text-primary-foreground border-primary" :
                "bg-surface-2 border-border-subtle text-muted-foreground"
              }`}>
                {s.danger ? <AlertCircle className="h-4 w-4" /> :
                  s.done ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </div>
              <span className="mt-2 text-[11px] font-medium text-foreground">{s.label}</span>
              {i < steps.length - 1 && (
                <div className={`absolute top-4 left-[60%] right-[-40%] h-0.5 ${steps[i + 1].done ? "bg-primary" : "bg-border-subtle"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {isRejected ? (
            <Button onClick={() => navigate("/onboarding-wizard")} className="w-full h-11">
              Edit & Resubmit
            </Button>
          ) : (
            <Button
              onClick={() => { refetch(); toast.success("Status refreshed"); }}
              disabled={isFetching}
              className="w-full h-11 gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh Status
            </Button>
          )}
          <Button variant="outline" onClick={logout} className="w-full h-11 gap-2">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>

        <p className="mt-5 text-[11px] text-muted-foreground">
          Signed in as <span className="text-foreground">{user?.email}</span>
        </p>
      </motion.div>
    </div>
  );
}
