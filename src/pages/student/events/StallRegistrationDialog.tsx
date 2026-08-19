/**
 * StallRegistrationDialog — Phase 5 redesign
 *
 * Modern multi-section form with E-Cell purple identity, smooth animations,
 * and a clear success state. Mobile-first, thumb-friendly buttons.
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
import { cn } from "@/lib/utils";

const ECELL = "265 85% 65%";

const STALL_TYPES = [
  { value: "food", label: "Food", emoji: "🍔" },
  { value: "game", label: "Game", emoji: "🎮" },
  { value: "startup", label: "Startup", emoji: "🚀" },
  { value: "other", label: "Other", emoji: "✨" },
] as const;

const schema = z.object({
  stall_name: z.string().trim().min(2, "Name too short").max(80),
  contact_name: z.string().trim().min(2, "Name too short").max(80),
  contact_email: z.string().trim().email("Invalid email").max(200),
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
  approved: { icon: CheckCircle2, label: "Approved", color: "hsl(var(--success))", bg: "hsl(var(--success) / 0.12)" },
  pending: { icon: Clock, label: "Pending review", color: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.12)" },
  rejected: { icon: XCircle, label: "Not selected", color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.12)" },
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
        .select("id,status")
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
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid form");
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
        if (error.code === "23505") throw new Error("You already registered a stall for this event");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Stall registration submitted");
      setStep("success");
      qc.invalidateQueries({ queryKey: ["stall-existing", eventId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit"),
  });

  const existing = existingQuery.data;
  const StatusIcon = existing ? STATUS_META[existing.status as keyof typeof STATUS_META]?.icon ?? Clock : Clock;
  const statusMeta = existing ? STATUS_META[existing.status as keyof typeof STATUS_META] : null;

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
          <Button
            size="sm"
            className="h-9 gap-1.5 text-action-primary-foreground border border-action-primary"
            style={{
              background: `linear-gradient(135deg, hsl(${ECELL}), hsl(280 80% 60%))`,
              boxShadow: `0 4px 14px -4px hsl(${ECELL} / 0.6)`,
            }}
          >
            <Store className="h-3.5 w-3.5" /> Register Stall
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-[480px] gap-0 border-0"
        style={{
          background: `
            radial-gradient(80% 60% at 100% 0%, hsl(${ECELL} / 0.10), transparent 60%),
            hsl(var(--background))
          `,
          boxShadow: `0 20px 60px -20px hsl(${ECELL} / 0.4)`,
        }}
      >
        {/* ─── Header banner ─── */}
        <div
          className="relative overflow-hidden px-5 pt-5 pb-4 border-b border-border-subtle"
          style={{
            background: `linear-gradient(135deg, hsl(${ECELL} / 0.12), transparent 70%)`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
              style={{
                background: `linear-gradient(135deg, hsl(${ECELL}), hsl(280 80% 60%))`,
                boxShadow: `0 6px 20px -6px hsl(${ECELL} / 0.6)`,
              }}
            >
              <Store className="h-5 w-5 text-action-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: `hsl(${ECELL})` }}>
                E-Cell · Stall Registration
              </p>
              <h2 className="text-[15px] font-bold text-foreground truncate">{eventTitle}</h2>
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
              className="p-5 space-y-3"
            >
              <div
                className="flex items-center gap-3 rounded-xl border p-4"
                style={{
                  background: statusMeta?.bg,
                  borderColor: `${statusMeta?.color} 33`,
                }}
              >
                <StatusIcon className="h-6 w-6 shrink-0" style={{ color: statusMeta?.color }} />
                <div>
                  <p className="text-[14px] font-semibold text-foreground">
                    {statusMeta?.label ?? "Submitted"}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    Your stall registration has been recorded.
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full h-11" onClick={() => handleClose(false)}>
                Close
              </Button>
            </motion.div>
          )}

          {/* ─── Success state ─── */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 14 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: `linear-gradient(135deg, hsl(${ECELL}), hsl(280 80% 60%))`,
                  boxShadow: `0 10px 30px -8px hsl(${ECELL} / 0.6)`,
                }}
              >
                <CheckCircle2 className="h-8 w-8 text-action-primary-foreground" />
              </motion.div>
              <div>
                <h3 className="text-[18px] font-bold text-foreground">You're in! 🚀</h3>
                <p className="text-[13px] text-muted-foreground mt-1">
                  Your stall application has been submitted. We'll review and notify you soon.
                </p>
              </div>
              <Button
                className="w-full h-11 text-action-primary-foreground border border-action-primary"
                style={{
                  background: `linear-gradient(135deg, hsl(${ECELL}), hsl(280 80% 60%))`,
                }}
                onClick={() => handleClose(false)}
              >
                Done
              </Button>
            </motion.div>
          )}

          {/* ─── Form state ─── */}
          {!existing && step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-5 py-4 space-y-5"
            >
              {/* Section: Stall basics */}
              <FormSection icon={Tag} title="Stall basics">
                <Field label="Stall Name" icon={Store}>
                  <Input
                    placeholder="e.g. Pixel Pizza"
                    value={form.stall_name}
                    onChange={(e) => setForm((p) => ({ ...p, stall_name: e.target.value }))}
                  />
                </Field>
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Type
                  </Label>
                  <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                    {STALL_TYPES.map((t) => {
                      const active = form.type === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, type: t.value }))}
                          className={cn(
                            "flex flex-col items-center gap-0.5 rounded-lg border py-2 text-[11px] font-semibold transition-all active:scale-95",
                            active
                              ? "text-foreground border-transparent"
                              : "border-border-subtle bg-surface-2 text-muted-foreground hover:border-border-strong",
                          )}
                          style={
                            active
                              ? {
                                  background: `linear-gradient(135deg, hsl(${ECELL} / 0.18), hsl(280 80% 60% / 0.10))`,
                                  boxShadow: `inset 0 0 0 1px hsl(${ECELL} / 0.45)`,
                                  color: `hsl(${ECELL})`,
                                }
                              : undefined
                          }
                        >
                          <span className="text-base leading-none">{t.emoji}</span>
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </FormSection>

              {/* Section: Contact */}
              <FormSection icon={User} title="Contact details">
                <Field label="Contact Name" icon={User}>
                  <Input
                    value={form.contact_name}
                    onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Email" icon={Mail}>
                    <Input
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                    />
                  </Field>
                  <Field label="Phone" icon={Phone}>
                    <Input
                      placeholder="+91…"
                      value={form.contact_phone}
                      onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))}
                    />
                  </Field>
                </div>
              </FormSection>

              {/* Section: About */}
              <FormSection icon={FileText} title="About your stall">
                <Field label="Description">
                  <Textarea
                    rows={2}
                    placeholder="What are you offering?"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </Field>
                <Field label="Requirements" icon={Settings2}>
                  <Textarea
                    rows={2}
                    placeholder="Tables, power outlets, space, etc."
                    value={form.requirements}
                    onChange={(e) => setForm((p) => ({ ...p, requirements: e.target.value }))}
                  />
                </Field>
              </FormSection>

              {/* Footer actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={() => handleClose(false)}
                  disabled={submit.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-11 gap-1.5 text-action-primary-foreground border border-action-primary"
                  style={{
                    background: `linear-gradient(135deg, hsl(${ECELL}), hsl(280 80% 60%))`,
                    boxShadow: `0 6px 18px -6px hsl(${ECELL} / 0.6)`,
                  }}
                  onClick={() => submit.mutate()}
                  disabled={submit.isPending}
                >
                  {submit.isPending ? (
                    "Submitting…"
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> Submit
                    </>
                  )}
                </Button>
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
  icon: typeof Store;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" style={{ color: `hsl(${ECELL})` }} />
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
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
  icon?: typeof Store;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </Label>
      {children}
    </div>
  );
}
