import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";

const STALL_TYPES = [
  { value: "food", label: "Food" },
  { value: "game", label: "Game" },
  { value: "startup", label: "Startup" },
  { value: "other", label: "Other" },
] as const;

const schema = z.object({
  stall_name: z.string().trim().min(2).max(80),
  contact_name: z.string().trim().min(2).max(80),
  contact_email: z.string().trim().email().max(200),
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

export default function StallRegistrationDialog({ eventId, eventTitle, trigger }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
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
      if (error) throw error;
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
      toast.success("Stall registration submitted — awaiting approval");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["stall-existing", eventId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit"),
  });

  const existing = existingQuery.data;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="secondary">
            Register Stall
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register Stall — {eventTitle}</DialogTitle>
        </DialogHeader>

        {existing ? (
          <div className="rounded-md border border-border-subtle p-4 space-y-2">
            <p className="text-sm">You've already registered a stall for this event.</p>
            <StatusBadge
              status={
                existing.status === "approved" ? "active" : existing.status === "pending" ? "upcoming" : "completed"
              }
            >
              {existing.status}
            </StatusBadge>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Stall Name</Label>
              <Input value={form.stall_name} onChange={(e) => setForm((p) => ({ ...p, stall_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Contact Name</Label>
                <Input value={form.contact_name} onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as any }))}
                >
                  {STALL_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.contact_phone} onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Requirements</Label>
              <Textarea
                rows={2}
                placeholder="Tables, power outlets, space size, etc."
                value={form.requirements}
                onChange={(e) => setForm((p) => ({ ...p, requirements: e.target.value }))}
              />
            </div>
          </div>
        )}

        {!existing && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submit.isPending}>
              Cancel
            </Button>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
