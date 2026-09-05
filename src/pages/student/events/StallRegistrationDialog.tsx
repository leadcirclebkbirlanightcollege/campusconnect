/**
 * StallRegistrationDialog — Official E-Cell Stall Registration Flow
 * B. K. Birla Night College, Kalyan
 *
 * Requirements:
 * - Dynamic event & college context header
 * - 4 members total: Team Lead, Member 2, Member 3, Member 4 with mandatory individual class dropdowns
 * - Gender, Phone Number (WhatsApp preferably), What to sell, Any Extra Requirements (exactly 2), Optional Suggestion
 * - NO student-entered WhatsApp link
 * - Duplicate submission prevention (UI loading lock + DB unique constraints)
 * - Safe null handling (no null.id crashes)
 * - Automatic redirect to event's configured WhatsApp group on success
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Store,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  Phone,
  HelpCircle,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Calendar,
  Building2,
  Rocket,
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GUEST_STALL_REGISTRATION_ENABLED } from "@/config/features";

export const CLASS_OPTIONS = [
  "FYBA",
  "SYBA",
  "TYBA",
  "FYBCom (Management studies)",
  "SYBCom (Management studies)",
  "TYBCom (Management studies)",
  "FYBAF",
  "SYBAF",
  "TYBAF",
  "FYBFM",
  "SYBFM",
  "TYBFM",
  "FYBCOM",
  "SYBCOM",
  "TYBCOM",
  "FYCS",
  "SYCS",
  "TYCS",
] as const;

export const GENDER_OPTIONS = ["Male", "Female"] as const;

export const EXTRA_REQUIREMENT_OPTIONS = [
  "Table",
  "Chair",
  "Electric Board",
  "Bench",
] as const;

const phoneRegex = /^[6-9]\d{9}$/;

const stallFormSchema = z.object({
  team_lead_name: z.string().trim().min(2, "Team Lead name is required").max(100),
  team_lead_class: z.string().min(1, "Team Lead class is required"),
  member_2_name: z.string().trim().min(2, "Member 2 name is required").max(100),
  member_2_class: z.string().min(1, "Member 2 class is required"),
  member_3_name: z.string().trim().min(2, "Member 3 name is required").max(100),
  member_3_class: z.string().min(1, "Member 3 class is required"),
  member_4_name: z.string().trim().min(2, "Member 4 name is required").max(100),
  member_4_class: z.string().min(1, "Member 4 class is required"),
  gender: z.enum(["Male", "Female"], {
    errorMap: () => ({ message: "Please select Gender" }),
  }),
  phone: z
    .string()
    .trim()
    .refine((v) => phoneRegex.test(v.replace(/[\s-+]/g, "")), {
      message: "Please enter a valid 10-digit Indian mobile number",
    }),
  selling_description: z
    .string()
    .trim()
    .min(3, "Please describe what you want to sell")
    .max(500, "Description must be under 500 characters"),
  extra_requirements: z
    .array(z.string())
    .length(2, "Please select exactly 2 extra requirements"),
  suggestion: z.string().trim().max(500).optional().or(z.literal("")),
});

type StallFormData = z.infer<typeof stallFormSchema>;

interface Props {
  eventId: string;
  eventTitle?: string;
  eventDate?: string;
  collegeName?: string;
  whatsappGroupLink?: string | null;
  trigger?: React.ReactNode;
}

export default function StallRegistrationDialog({
  eventId,
  eventTitle: initialEventTitle,
  eventDate: initialEventDate,
  collegeName: initialCollegeName,
  whatsappGroupLink: initialWhatsappGroupLink,
  trigger,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<StallFormData>({
    team_lead_name: "",
    team_lead_class: "",
    member_2_name: "",
    member_2_class: "",
    member_3_name: "",
    member_3_class: "",
    member_4_name: "",
    member_4_class: "",
    gender: "Male",
    phone: "",
    selling_description: "",
    extra_requirements: [],
    suggestion: "",
  });

  // Fetch event details to guarantee we have event title, date, college, and whatsapp link
  const eventQuery = useQuery({
    queryKey: ["event", "stall-context", eventId],
    enabled: open && Boolean(eventId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id,title,event_date,college_id,whatsapp_group_link,is_ecell_event,max_stalls"
        )
        .eq("id", eventId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      let collegeNameResult = initialCollegeName || "B. K. Birla Night College, Kalyan";
      if (data.college_id) {
        const { data: col } = await supabase
          .from("colleges")
          .select("college_name")
          .eq("id", data.college_id)
          .maybeSingle();
        if (col?.college_name) collegeNameResult = col.college_name;
      }

      return {
        ...data,
        college_name: collegeNameResult,
      };
    },
    staleTime: 60_000,
  });

  const eventData = eventQuery.data;
  const resolvedEventTitle = eventData?.title || initialEventTitle || "Campus Event";
  const resolvedEventDate = eventData?.event_date || initialEventDate || "";
  const resolvedCollegeName =
    eventData?.college_name || initialCollegeName || "B. K. Birla Night College, Kalyan";
  const resolvedWhatsappLink =
    eventData?.whatsapp_group_link ?? initialWhatsappGroupLink ?? null;

  // Format date nicely: "10/09/2026 — Thursday"
  const formattedDate = (() => {
    if (!resolvedEventDate) return "";
    try {
      const d = new Date(resolvedEventDate + "T00:00:00");
      if (isNaN(d.getTime())) return resolvedEventDate;
      const dayName = format(d, "EEEE");
      const [year, month, day] = resolvedEventDate.split("-");
      return `${day}/${month}/${year} — ${dayName}`;
    } catch {
      return resolvedEventDate;
    }
  })();

  // Toggle extra requirements (exactly 2 max/rule)
  const toggleExtraRequirement = (item: string) => {
    setForm((prev) => {
      const exists = prev.extra_requirements.includes(item);
      if (exists) {
        return {
          ...prev,
          extra_requirements: prev.extra_requirements.filter((x) => x !== item),
        };
      }
      if (prev.extra_requirements.length >= 2) {
        toast.info("Please select 2 options. Unselect one to choose another.", {
          duration: 2500,
        });
        return prev;
      }
      return {
        ...prev,
        extra_requirements: [...prev.extra_requirements, item],
      };
    });

    if (errors.extra_requirements) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.extra_requirements;
        return next;
      });
    }
  };

  // Check if current user has already registered
  const existingQuery = useQuery({
    queryKey: ["stall-existing", eventId, user?.id],
    enabled: open && Boolean(eventId) && Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("stall_registrations")
        .select("id,status,team_lead_name,created_at")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  // Submit mutation
  const submit = useMutation({
    mutationFn: async () => {
      setErrors({});
      const sanitizedPhone = form.phone.replace(/[\s-+]/g, "");
      const validationPayload = {
        ...form,
        phone: sanitizedPhone,
      };

      const parsed = stallFormSchema.safeParse(validationPayload);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const path = issue.path[0] as string;
          if (!fieldErrors[path]) {
            fieldErrors[path] = issue.message;
          }
        }
        setErrors(fieldErrors);
        const firstErrorMessage =
          parsed.error.issues[0]?.message ?? "Please check form entries";
        throw new Error(firstErrorMessage);
      }

      const validData = parsed.data;

      // Prepare payload with backward-compatible legacy columns and modern team columns
      const insertPayload = {
        event_id: eventId,
        user_id: user?.id ?? null,
        team_lead_name: validData.team_lead_name,
        team_lead_class: validData.team_lead_class,
        member_2_name: validData.member_2_name,
        member_2_class: validData.member_2_class,
        member_3_name: validData.member_3_name,
        member_3_class: validData.member_3_class,
        member_4_name: validData.member_4_name,
        member_4_class: validData.member_4_class,
        gender: validData.gender,
        phone: validData.phone,
        selling_description: validData.selling_description,
        extra_requirements: validData.extra_requirements,
        suggestion: validData.suggestion || null,

        // Legacy compatibility columns so existing views/queries remain working
        contact_name: validData.team_lead_name,
        contact_phone: validData.phone,
        contact_email: user?.email ?? null,
        stall_name: `${validData.team_lead_name}'s Stall`,
        description: validData.selling_description,
        requirements: validData.extra_requirements.join(", "),
        type: "other" as const,
        status: "pending" as const,
      };

      const { error } = await supabase
        .from("stall_registrations")
        .insert(insertPayload);

      if (error) {
        if (error.code === "23505") {
          throw new Error("You or your team have already registered a stall for this event.");
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Stall registration submitted successfully!");
      setStep("success");
      qc.invalidateQueries({ queryKey: ["stall-existing", eventId] });
      qc.invalidateQueries({ queryKey: ["admin", "stalls"] });
      qc.invalidateQueries({ queryKey: ["ecell", "user_stalls"] });

      // If a valid WhatsApp link exists, initiate redirect
      if (isValidWhatsAppUrl(resolvedWhatsappLink)) {
        setRedirectCountdown(3);
      }
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to submit registration";
      toast.error(msg);
    },
  });

  // Handle countdown and auto-redirect
  useEffect(() => {
    if (step !== "success" || !isValidWhatsAppUrl(resolvedWhatsappLink)) return;

    if (redirectCountdown === null) return;

    if (redirectCountdown <= 0) {
      // Perform redirect
      window.location.href = resolvedWhatsappLink!;
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, redirectCountdown, resolvedWhatsappLink]);

  function isValidWhatsAppUrl(url?: string | null): url is string {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return (
        (parsed.hostname === "chat.whatsapp.com" ||
          parsed.hostname === "wa.me") &&
        parsed.protocol === "https:"
      );
    } catch {
      return false;
    }
  }

  function handleClose(o: boolean) {
    setOpen(o);
    if (!o) {
      setTimeout(() => {
        setStep("form");
        setRedirectCountdown(null);
        setErrors({});
      }, 250);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-md transition-all",
              "bg-gradient-to-r from-[#FCE541] to-[#FAD943] text-black hover:brightness-105 active:scale-98"
            )}
          >
            <Store className="h-4 w-4 text-black" />
            Register Stall
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border border-[#C08634]/30 bg-background shadow-2xl">
        {/* Modal Header with Event Context */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border-subtle p-5 sm:p-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FCE541]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#8A5B16] dark:text-[#FCE541] border border-[#C08634]/30">
                  <Rocket className="h-3 w-3" /> Entrepreneurship Cell
                </span>
              </div>
              <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight pt-1">
                Stall Registration
              </DialogTitle>
            </div>
          </div>

          {/* Event Context Card at Top */}
          <div className="mt-3 p-3 rounded-2xl bg-surface-2/60 border border-border-subtle space-y-1 text-xs">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{resolvedCollegeName}</span>
            </p>
            <p className="text-muted-foreground font-semibold">
              Entrepreneurship Cell
            </p>
            <p className="font-extrabold text-foreground text-sm text-primary">
              {resolvedEventTitle}
            </p>
            {formattedDate && (
              <p className="text-muted-foreground flex items-center gap-1.5 pt-0.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>{formattedDate}</span>
              </p>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 pt-2">
          <AnimatePresence mode="wait">
            {!GUEST_STALL_REGISTRATION_ENABLED && !user ? (
              <motion.div
                key="auth_required"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="py-8 px-4 text-center space-y-4"
              >
                <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <User className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-foreground">Sign In Required</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Please sign in with your student account to register a stall for this event.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const redirectPath = encodeURIComponent(window.location.pathname + window.location.search);
                    window.location.href = `/auth?redirect=${redirectPath}`;
                  }}
                  className="rounded-xl font-bold px-6 bg-gradient-to-r from-[#FCE541] to-[#FAD943] text-black hover:brightness-105"
                >
                  Sign In to Register
                </Button>
              </motion.div>
            ) : step === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="py-6 px-2 text-center space-y-5"
              >
                <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-8 ring-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-foreground">
                    Registration Successful ✓
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Your stall proposal for <span className="font-bold text-foreground">{resolvedEventTitle}</span> has been submitted to the Entrepreneurship Cell committee.
                  </p>
                </div>

                {/* WhatsApp Redirect Section */}
                {isValidWhatsAppUrl(resolvedWhatsappLink) ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3 max-w-md mx-auto">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5">
                        <Phone className="h-4 w-4" /> Official Event WhatsApp Group
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {redirectCountdown !== null && redirectCountdown > 0
                          ? `Redirecting you to the official event WhatsApp group in ${redirectCountdown}s...`
                          : "Redirecting you to the official event WhatsApp group..."}
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={() => {
                        window.location.href = resolvedWhatsappLink;
                      }}
                      className="w-full rounded-xl gap-2 font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md"
                    >
                      <ExternalLink className="h-4 w-4" /> Join WhatsApp Group Now
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-surface-2 border border-border-subtle text-center space-y-3 max-w-md mx-auto">
                    <p className="text-xs text-muted-foreground">
                      The event WhatsApp group link has not been configured yet.
                      <br />
                      Please contact the Entrepreneurship Cell for further updates.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => handleClose(false)}
                      className="rounded-xl px-6"
                    >
                      Done / Close
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!submit.isPending) {
                    submit.mutate();
                  }
                }}
                className="space-y-6"
              >
                {/* 1. Team Lead Name & Class */}
                <div className="space-y-3 rounded-2xl p-4 bg-surface-1 border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <Label className="text-sm font-bold text-foreground">
                      Name (Team Lead) <span className="text-destructive">*</span>
                    </Label>
                  </div>
                  <Input
                    placeholder="Enter your answer"
                    value={form.team_lead_name}
                    onChange={(e) =>
                      setForm({ ...form, team_lead_name: e.target.value })
                    }
                    className={cn(
                      "rounded-xl",
                      errors.team_lead_name && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Member name
                  </p>
                  {errors.team_lead_name && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.team_lead_name}
                    </p>
                  )}

                  <div className="pt-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Team Lead Class <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.team_lead_class}
                      onChange={(e) =>
                        setForm({ ...form, team_lead_class: e.target.value })
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "rounded-xl bg-background",
                          errors.team_lead_class && "border-destructive"
                        )}
                      >
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 rounded-xl">
                        {CLASS_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.team_lead_class && (
                      <p className="text-xs text-destructive font-medium">
                        {errors.team_lead_class}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Member 2 Name & Class */}
                <div className="space-y-3 rounded-2xl p-4 bg-surface-1 border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      2
                    </span>
                    <Label className="text-sm font-bold text-foreground">
                      Member 2 <span className="text-destructive">*</span>
                    </Label>
                  </div>
                  <Input
                    placeholder="Enter your answer"
                    value={form.member_2_name}
                    onChange={(e) =>
                      setForm({ ...form, member_2_name: e.target.value })
                    }
                    className={cn(
                      "rounded-xl",
                      errors.member_2_name && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {errors.member_2_name && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.member_2_name}
                    </p>
                  )}

                  <div className="pt-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Member 2 Class <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.member_2_class}
                      onChange={(e) =>
                        setForm({ ...form, member_2_class: e.target.value })
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "rounded-xl bg-background",
                          errors.member_2_class && "border-destructive"
                        )}
                      >
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 rounded-xl">
                        {CLASS_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.member_2_class && (
                      <p className="text-xs text-destructive font-medium">
                        {errors.member_2_class}
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Member 3 Name & Class */}
                <div className="space-y-3 rounded-2xl p-4 bg-surface-1 border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      3
                    </span>
                    <Label className="text-sm font-bold text-foreground">
                      Member 3 <span className="text-destructive">*</span>
                    </Label>
                  </div>
                  <Input
                    placeholder="Enter your answer"
                    value={form.member_3_name}
                    onChange={(e) =>
                      setForm({ ...form, member_3_name: e.target.value })
                    }
                    className={cn(
                      "rounded-xl",
                      errors.member_3_name && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {errors.member_3_name && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.member_3_name}
                    </p>
                  )}

                  <div className="pt-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Member 3 Class <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.member_3_class}
                      onChange={(e) =>
                        setForm({ ...form, member_3_class: e.target.value })
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "rounded-xl bg-background",
                          errors.member_3_class && "border-destructive"
                        )}
                      >
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 rounded-xl">
                        {CLASS_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.member_3_class && (
                      <p className="text-xs text-destructive font-medium">
                        {errors.member_3_class}
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Member 4 Name & Class */}
                <div className="space-y-3 rounded-2xl p-4 bg-surface-1 border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      4
                    </span>
                    <Label className="text-sm font-bold text-foreground">
                      Member 4 <span className="text-destructive">*</span>
                    </Label>
                  </div>
                  <Input
                    placeholder="Enter your answer"
                    value={form.member_4_name}
                    onChange={(e) =>
                      setForm({ ...form, member_4_name: e.target.value })
                    }
                    className={cn(
                      "rounded-xl",
                      errors.member_4_name && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {errors.member_4_name && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.member_4_name}
                    </p>
                  )}

                  <div className="pt-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Member 4 Class <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.member_4_class}
                      onChange={(e) =>
                        setForm({ ...form, member_4_class: e.target.value })
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "rounded-xl bg-background",
                          errors.member_4_class && "border-destructive"
                        )}
                      >
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 rounded-xl">
                        {CLASS_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.member_4_class && (
                      <p className="text-xs text-destructive font-medium">
                        {errors.member_4_class}
                      </p>
                    )}
                  </div>
                </div>

                {/* 5. Gender */}
                <div className="space-y-2 rounded-2xl p-4 bg-surface-1 border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      5
                    </span>
                    <Label className="text-sm font-bold text-foreground">
                      Gender <span className="text-destructive">*</span>
                    </Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {GENDER_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm({ ...form, gender: g })}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all",
                          form.gender === g
                            ? "border-primary bg-primary/10 text-primary shadow-xs"
                            : "border-border-subtle bg-background text-foreground hover:bg-surface-2"
                        )}
                      >
                        <span
                          className={cn(
                            "h-3 w-3 rounded-full border",
                            form.gender === g
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          )}
                        />
                        {g}
                      </button>
                    ))}
                  </div>
                  {errors.gender && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.gender}
                    </p>
                  )}
                </div>

                {/* 6. Phone Number (WhatsApp Preferably) */}
                <div className="space-y-2 rounded-2xl p-4 bg-surface-1 border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      6
                    </span>
                    <Label className="text-sm font-bold text-foreground">
                      Phone Number (WhatsApp Preferably) <span className="text-destructive">*</span>
                    </Label>
                  </div>
                  <Input
                    placeholder="Enter your answer"
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className={cn(
                      "rounded-xl",
                      errors.phone && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* 7. Mention What You want to sell */}
                <div className="space-y-2 rounded-2xl p-4 bg-surface-1 border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      7
                    </span>
                    <Label className="text-sm font-bold text-foreground">
                      Mention What You want to sell <span className="text-destructive">*</span>
                    </Label>
                  </div>
                  <Textarea
                    placeholder="Enter your answer"
                    rows={3}
                    value={form.selling_description}
                    onChange={(e) =>
                      setForm({ ...form, selling_description: e.target.value })
                    }
                    className={cn(
                      "rounded-xl resize-none",
                      errors.selling_description && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {errors.selling_description && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.selling_description}
                    </p>
                  )}
                </div>

                {/* 8. Any Extra Requirements (Please select 2 options) */}
                <div className="space-y-2 rounded-2xl p-4 bg-surface-1 border border-border-subtle">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                        8
                      </span>
                      <Label className="text-sm font-bold text-foreground">
                        Any Extra Requirements <span className="text-destructive">*</span>
                      </Label>
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-full",
                        form.extra_requirements.length === 2
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      )}
                    >
                      {form.extra_requirements.length}/2 selected
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Instruction: Please select 2 options.
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {EXTRA_REQUIREMENT_OPTIONS.map((opt) => {
                      const isSelected = form.extra_requirements.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleExtraRequirement(opt)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all text-left",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-xs"
                              : "border-border-subtle bg-background text-foreground hover:bg-surface-2"
                          )}
                        >
                          <span>{opt}</span>
                          <span
                            className={cn(
                              "h-4 w-4 rounded-md border flex items-center justify-center shrink-0 ml-2 transition-colors",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground"
                            )}
                          >
                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.extra_requirements && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.extra_requirements}
                    </p>
                  )}
                </div>

                {/* 9. Suggestion (Optional) */}
                <div className="space-y-2 rounded-2xl p-4 bg-surface-1 border border-border-subtle">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                        9
                      </span>
                      <Label className="text-sm font-bold text-foreground">
                        Suggestion
                      </Label>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Optional
                    </span>
                  </div>
                  <Textarea
                    placeholder="Enter your answer"
                    rows={2}
                    value={form.suggestion}
                    onChange={(e) =>
                      setForm({ ...form, suggestion: e.target.value })
                    }
                    className="rounded-xl resize-none"
                  />
                </div>

                {/* Duplicate Registration Notice if logged-in user already applied */}
                {existingQuery.data && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Already Submitted</p>
                      <p>
                        You have already submitted a stall registration ({existingQuery.data.team_lead_name}). Submitting again will update or be subject to committee approval.
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleClose(false)}
                    disabled={submit.isPending}
                    className="rounded-xl px-5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submit.isPending}
                    className={cn(
                      "rounded-xl gap-2 font-bold px-6 shadow-md transition-all",
                      "bg-gradient-to-r from-[#FCE541] to-[#FAD943] text-black hover:brightness-105"
                    )}
                  >
                    {submit.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-black" />
                        Submit Proposal
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
