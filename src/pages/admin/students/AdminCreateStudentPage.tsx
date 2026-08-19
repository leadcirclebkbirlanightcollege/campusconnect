import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { UserPlus, ArrowLeft } from "@/components/icons";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  student_id: "",
  department: "",
  class_name: "",
};

export default function AdminCreateStudentPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);

  const payload = useMemo(() => ({
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone?.trim() || null,
    student_id: form.student_id?.trim() || null,
    department: form.department?.trim() || null,
    class_name: form.class_name?.trim() || null,
  }), [form]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid form");

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Session expired. Please log in again.");

      const { data, error } = await supabase.functions.invoke("admin-create-student", {
        body: payload,
      });
      if (error) throw error;
      return data as { email: string; defaultPassword: string };
    },
    onSuccess: async () => {
      toast.success("Student created", { description: "Default password: student" });
      toast.message("Ask the student to login and change their password immediately.");
      setForm(EMPTY);
      await qc.invalidateQueries({ queryKey: ["admin", "students"] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to create student");
    },
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2"
        onClick={() => navigate("/platform/admin/students")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Students
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Create Student Account
          </CardTitle>
          <CardDescription>
            Provision a new student. The default password is <span className="font-medium">student</span> — they should change it on first login.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="cs-name">Full name *</Label>
            <Input
              id="cs-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Jane Doe"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cs-email">Email *</Label>
            <Input
              id="cs-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="student@college.edu"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setForm(EMPTY)}
              disabled={createMutation.isPending}
            >
              Reset
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {createMutation.isPending ? "Creating…" : "Create Student"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
