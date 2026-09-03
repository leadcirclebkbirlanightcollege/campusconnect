/**
 * StallRegistrationDialog — Official E-Cell Brand Redesign
 * B. K. Birla Night College, Kalyan
 *
 * Palette: Sunflower Yellow (#FCE541), Warm Gold (#C08634), Black (#000000), Deep Brown (#593018)
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  Mail,
  Phone,
  FileText,
  Settings2,
  Tag,
} from "@/components/icons";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ECELL_ASSETS, ECELL_PALETTE } from "@/pages/student/ecell/ecell-tokens";
import { cn } from "@/lib/utils";

const STALL_TYPES = [
  { value: "food", label: "Food & Beverage", emoji: "🍔" },
  { value: "game", label: "Game & Fun", emoji: "🎮" },
  { value: "startup", label: "Startup / Tech", emoji: "🚀" },
  { value: "other", label: "Crafts & Merchandise", emoji: "✨" },
] as const;

const schema = z.object({
  stall_name: z.string().trim().min(2, "Stall name is required").max(80),
  contact_name: z.string().trim().min(2, "Contact name is required").max(80),
  contact_email: z.string().trim().email("Invalid email address").max(200),
  contact_phone: z.string().trim().max(20).optional().or(z.literal("")),
  type: z.enum(["food", "game", "startup", "other"]),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  requirements: z.string().trim().max(500).optional().or(z.literal("")),
});

interface Props {
  eventId: string;
  eventTitle: string;
  trigger?: React.ReactNode;
}

const STATUS_META = {
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    color: "#16a34a",
    bg: "rgba(22, 163, 74, 0.12)",
  },
  pending: {
    icon: Clock,
    label: "Under Committee Review",
    color: "#C08634",
    bg: "rgba(192, 134, 52, 0.14)",
  },
  rejected: {
    icon: XCircle,
    label: "Not Selected",
    color: "#dc2626",
    bg: "rgba(220, 38, 38, 0.12)",
  },
} as const;

export default function StallRegistrationDialog({ eventId, eventTitle, trigger }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [form, setForm] = useState({
    stall_name: "",
    contact_name: "",
    contact_email: user?.email ?? "",
    contact_phone: "",
    type: "other" as (typeof STALL_TYPES)[number]["value"],
    description: "",
    requirements: "",
  });

  const existingQuery = useQuery({
    queryKey: ["stall-existing", eventId, user?.id],
    enabled: open && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stall_registrations")
        .select("id,status,stall_name,product_category,created_at")
        .eq("event_id", eventId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please check form entries");
      const { error } = await supabase.from("stall_registrations").insert({
        event_id: eventId,
        user_id: user!.id,
        stall_name: parsed.data.stall_name,
        contact_name: parsed.data.contact_name,
        contact_email: parsed.data.contact_email,
        contact_phone: parsed.data.contact_phone || null,
        type: parsed.data.type,
        description: parsed.data.description || null,
        requirements: parsed.data.requirements || null,
      });
      if (error) {
        if (error.code === "23505") throw new Error("You have already registered a stall for this event");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Stall registration submitted to E-Cell committee");
      setStep("success");
      qc.invalidateQueries({ queryKey: ["stall-existing", eventId] });
      qc.invalidateQueries({ queryKey: ["ecell", "user_stalls"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit"),
  });

  const existing = existingQuery.data;
  const statusMeta = existing ? STATUS_META[existing.status as keyof typeof STATUS_META] || STATUS_META.pending : null;
  const StatusIcon = statusMeta?.icon || Clock;

  function handleClose(o: boolean) {
    setOpen(o);
    if (!o) {
      setTimeout(() => setStep("form"), 200);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#000000]",
              "bg-[#FCE541] hover:bg-[#FAD943] active:bg-[#C08634] active:text-white",
              "border border-[#C08634]/50 shadow-sm transition-all active:scale-95"
            )}
          >
            <Store className="h-3.5 w-3.5" />
            Apply for Stall
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-[500px] gap-0 border border-[#E8D98A] dark:border-[#3D3523] bg-background shadow-2xl rounded-2xl sm:rounded-3xl"
      >
        {/* ─── Header Banner ─── */}
        <div className="relative overflow-hidden px-5 pt-5 pb-4 border-b border-[#E8D98A]/50 bg-gradient-to-r from-white via-[#FAF9F7] to-[#FCE541]/15 dark:from-[#191713] dark:via-[#1D1B17] dark:to-[#2A2417]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-[#1D1B17] p-1 border-2 border-[#E8D98A] shadow-xs shrink-0">
              <img
                src={ECELL_ASSETS.logo}
                alt="E-Cell"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-[#C08634] dark:text-[#FAD943]">
                E-Cell • Stall Registration
              </p>
              <h2 className="text-[15.5px] font-bold text-foreground truncate">
                {eventTitle}
              </h2>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ─── Existing registration state ─── */}
          {existing && step === "form" && (
            <motion.div
              key="existing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 sm:p-6 space-y-4"
            >
              <div
                className="flex items-center gap-3.5 rounded-2xl border p-4 sm:p-5"
                style={{
                  background: statusMeta?.bg,
                  borderColor: statusMeta?.color,
                }}
              >
                <StatusIcon className="h-6 w-6 shrink-0" style={{ color: statusMeta?.color }} />
                <div className="space-y-0.5">
                  <p className="text-[14.5px] font-bold text-foreground">
                    {statusMeta?.label}
                  </p>
                  <p className="text-[12px] text-[#593018]/90 dark:text-muted-foreground">
                    Your stall proposal &ldquo;{existing.stall_name}&rdquo; is logged in the E-Cell portal.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl font-bold border-[#E8D98A] hover:bg-[#FAF9F7]"
                onClick={() => handleClose(false)}
              >
                Close Window
              </Button>
            </motion.div>
          )}

          {/* ─── Success state ─── */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 sm:p-8 text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 14 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FCE541] border-2 border-[#C08634] shadow-[0_8px_25px_-5px_rgba(192,134,52,0.45)]"
              >
                <CheckCircle2 className="h-8 w-8 text-[#000000]" />
              </motion.div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-[19px] font-black text-[#000000] dark:text-white">
                  Stall Proposal Received! 🚀
                </h3>
                <p className="text-[13px] text-[#593018]/90 dark:text-muted-foreground leading-relaxed">
                  The Entrepreneurship Cell committee will review space allocation, safety guidelines, and electricity requirements.
                </p>
              </div>
              <button
                type="button"
                className="w-full h-11 rounded-xl font-bold bg-[#FCE541] hover:bg-[#FAD943] text-[#000000] border border-[#C08634]/50 shadow-sm transition-all"
                onClick={() => handleClose(false)}
              >
                Done
              </button>
            </motion.div>
          )}

          {/* ─── Form state ─── */}
          {!existing && step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-5 py-4 sm:px-6 sm:py-5 space-y-5"
            >
              {/* Section 1: Stall basics */}
              <FormSection icon={Tag} title="Stall Identity">
                <Field label="Stall Brand / Business Name" icon={Store}>
                  <Input
                    placeholder="e.g. Chai & Code Cafe, Crafted Clay"
                    value={form.stall_name}
                    onChange={(e) => setForm((p) => ({ ...p, stall_name: e.target.value }))}
                    className="border-[#E8D98A]/70 focus-visible:ring-[#C08634]"
                  />
                </Field>
                <div>
                  <Label className="text-[11px] font-bold text-[#593018] dark:text-muted-foreground uppercase tracking-wider">
                    Category
                  </Label>
                  <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {STALL_TYPES.map((t) => {
                      const active = form.type === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, type: t.value }))}
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-bold transition-all active:scale-95 text-center gap-0.5",
                            active
                              ? "bg-[#FCE541] text-[#000000] border-[#C08634] shadow-sm font-extrabold"
                              : "border-[#E8D98A]/50 bg-[#FAF9F7] dark:bg-[#1D1B17] text-[#593018] dark:text-muted-foreground hover:border-[#C08634]"
                          )}
                        >
                          <span className="text-base leading-none">{t.emoji}</span>
                          <span className="truncate max-w-full">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </FormSection>

              {/* Section 2: Contact */}
              <FormSection icon={User} title="Lead Student Contact">
                <Field label="Contact Person Name" icon={User}>
                  <Input
                    placeholder="Full Name"
                    value={form.contact_name}
                    onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                    className="border-[#E8D98A]/70 focus-visible:ring-[#C08634]"
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Field label="College Email" icon={Mail}>
                    <Input
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                      className="border-[#E8D98A]/70 focus-visible:ring-[#C08634]"
                    />
                  </Field>
                  <Field label="Phone / WhatsApp" icon={Phone}>
                    <Input
                      placeholder="+91…"
                      value={form.contact_phone}
                      onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))}
                      className="border-[#E8D98A]/70 focus-visible:ring-[#C08634]"
                    />
                  </Field>
                </div>
              </FormSection>

              {/* Section 3: Stall Proposal Description */}
              <FormSection icon={FileText} title="Offerings & Setup">
                <Field label="What will you be offering/selling?">
                  <Textarea
                    rows={2}
                    placeholder="Describe items, price range, and student appeal..."
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="border-[#E8D98A]/70 focus-visible:ring-[#C08634]"
                  />
                </Field>
                <Field label="Logistics & Power Requirements" icon={Settings2}>
                  <Textarea
                    rows={2}
                    placeholder="Tables needed, electricity plug (5A/15A), waste bin, space needed..."
                    value={form.requirements}
                    onChange={(e) => setForm((p) => ({ ...p, requirements: e.target.value }))}
                    className="border-[#E8D98A]/70 focus-visible:ring-[#C08634]"
                  />
                </Field>
              </FormSection>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl font-bold border-[#E8D98A]"
                  onClick={() => handleClose(false)}
                  disabled={submit.isPending}
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={() => submit.mutate()}
                  disabled={submit.isPending}
                  className={cn(
                    "flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl text-[13px] font-black text-[#000000]",
                    "bg-[#FCE541] hover:bg-[#FAD943] active:bg-[#C08634] active:text-white",
                    "border border-[#C08634]/50 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  )}
                >
                  {submit.isPending ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Submit Proposal
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Helpers ─────────────────────────────────────────────── */
function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-[#C08634]" />
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#593018] dark:text-[#D8C7A5]">
          {title}
        </p>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-bold text-[#593018]/90 dark:text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3 text-[#C08634]" />}
        {label}
      </Label>
      {children}
    </div>
  );
}
