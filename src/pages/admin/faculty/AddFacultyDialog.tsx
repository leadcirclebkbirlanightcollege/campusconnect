import { useState, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/providers/TenantProvider";
import {
  GraduationCap, Mail, Phone, Lock, Building2,
  IdCard, Loader2, UserPlus,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { showErrorToast, showSuccessToast } from "@/lib/error-handling";
import { toast } from "sonner";
import { FACULTY_TITLES, type FacultyTitle, formatFacultyName } from "@/lib/faculty";
import type { DepartmentOption } from "./types";

interface AddFacultyDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: DepartmentOption[];
}

export const AddFacultyDialog = memo(function AddFacultyDialog({
  open,
  onClose,
  onSuccess,
  departments,
}: AddFacultyDialogProps) {
  const collegeId = useTenantId();
  const [form, setForm] = useState<{
    title: FacultyTitle | "";
    name: string;
    email: string;
    password: string;
    phone: string;
    employeeId: string;
    department: string;
  }>({
    title: "",
    name: "",
    email: "",
    password: "faculty123",
    phone: "",
    employeeId: "",
    department: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    const trimmedPassword = form.password.trim();

    if (!trimmedName) {
      toast.error("Faculty name is required");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      toast.error("A valid email address is required");
      return;
    }
    if (trimmedPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    if (!collegeId) {
      toast.error("No college tenant context found");
      return;
    }

    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-create-student", {
        body: {
          name: trimmedName,
          title: form.title || null,
          email: trimmedEmail,
          password: trimmedPassword,
          phone: form.phone.trim() || null,
          student_id: form.employeeId.trim() || null, // stores Faculty/Employee ID
          department: form.department.trim() || null,
          college_id: collegeId,
          role: "faculty",
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      // Persist title to profiles if specified
      if (form.title) {
        const createdUserId = data?.user_id || data?.user?.id;
        if (createdUserId) {
          await supabase.from("profiles").update({ title: form.title }).eq("user_id", createdUserId);
        } else {
          await supabase.from("profiles").update({ title: form.title }).eq("email", trimmedEmail);
        }
      }

      const formattedName = formatFacultyName(trimmedName, form.title);
      showSuccessToast(`Faculty member "${formattedName}" added successfully!`);
      setForm({
        title: "",
        name: "",
        email: "",
        password: "faculty123",
        phone: "",
        employeeId: "",
        department: "",
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      showErrorToast(err, { context: "add-faculty" });
    } finally {
      setLoading(false);
    }
  }, [form, collegeId, onClose, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent className="max-w-md bg-card border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-semibold text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <GraduationCap className="h-4 w-4" />
            </div>
            Add Faculty Member
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create an authenticated faculty account and directory profile for this institution.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-1">
          {/* Title & Full Name */}
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-4 space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Title / Prefix
              </Label>
              <Select
                value={form.title || "none"}
                onValueChange={(val) =>
                  setForm((p) => ({
                    ...p,
                    title: (val === "none" ? "" : val) as FacultyTitle | "",
                  }))
                }
                disabled={loading}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border shadow-md">
                  <SelectItem value="none" className="text-xs text-muted-foreground">
                    (None)
                  </SelectItem>
                  {FACULTY_TITLES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-8 space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Rajesh Sharma"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                disabled={loading}
                className="h-9"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              placeholder="faculty@institution.edu"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
              disabled={loading}
              className="h-9"
            />
          </div>

          {/* Grid: Employee ID & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
                Employee / Faculty ID
              </Label>
              <Input
                placeholder="e.g. FAC-2026-04"
                value={form.employeeId}
                onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
                disabled={loading}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                disabled={loading}
                className="h-9"
              />
            </div>
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              Department
            </Label>
            {departments.length > 0 ? (
              <Select
                value={form.department}
                onValueChange={(val) => setForm((p) => ({ ...p, department: val }))}
                disabled={loading}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="e.g. Computer Science & Engineering"
                value={form.department}
                onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                disabled={loading}
                className="h-9"
              />
            )}
          </div>

          {/* Initial Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              Initial Password <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              minLength={8}
              required
              disabled={loading}
              className="h-9 font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Default is <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">faculty123</code>. The faculty member can update it anytime from their profile settings.
            </p>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating Account…
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Create Faculty
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
