import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  student_id: z.string().optional(),
  department: z.string().optional(),
  class_name: z.string().optional(),
});

type FormState = z.infer<typeof schema>;

export default function CreateStudentDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    student_id: "",
    department: "",
    class_name: "",
  });

  const payload = useMemo(() => {
    const phone = form.phone?.trim();
    const student_id = form.student_id?.trim();
    const department = form.department?.trim();
    const class_name = form.class_name?.trim();

    return {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: phone ? phone : null,
      student_id: student_id ? student_id : null,
      department: department ? department : null,
      class_name: class_name ? class_name : null,
    };
  }, [form]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid form");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Session expired. Please log in again.");
      }

      const { data, error } = await supabase.functions.invoke("admin-create-student", {
        body: payload,
      });

      if (error) throw error;
      return data as { email: string; defaultPassword: string };
    },
    onSuccess: async (data) => {
      toast.success("Student created. Default password is: student");
      // Helpful hint without leaking anything beyond what's requested.
      toast.message("Ask the student to login and change their password immediately.");
      setOpen(false);
      setForm({ name: "", email: "", phone: "", student_id: "", department: "", class_name: "" });
      await qc.invalidateQueries({ queryKey: ["admin", "students"] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to create student";
      toast.error(msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Create student</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create student account</DialogTitle>
          <DialogDescription>
            Default password will be <span className="font-medium">student</span> (student should change it after first login).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cs-name">Full name</Label>
            <Input
              id="cs-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Jane Doe"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cs-email">Email</Label>
            <Input
              id="cs-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="student@college.edu"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cs-studentid">Student ID</Label>
              <Input
                id="cs-studentid"
                value={form.student_id}
                onChange={(e) => setForm((p) => ({ ...p, student_id: e.target.value }))}
                placeholder="CS-2026-001"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cs-phone">Phone</Label>
              <Input
                id="cs-phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="0801..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cs-dept">Department</Label>
              <Input
                id="cs-dept"
                value={form.department}
                onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                placeholder="Computer Science"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cs-class">Class</Label>
              <Input
                id="cs-class"
                value={form.class_name}
                onChange={(e) => setForm((p) => ({ ...p, class_name: e.target.value }))}
                placeholder="2026-A"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
