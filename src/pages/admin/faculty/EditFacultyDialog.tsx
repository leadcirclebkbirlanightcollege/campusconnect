import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  UserPen, Mail, Phone, Building2,
  IdCard, Loader2, Save, CheckCircle2,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FACULTY_TITLES, type FacultyTitle } from "@/lib/faculty";
import type { FacultyMember, DepartmentOption, CollegeOption } from "./types";

interface EditFacultyDialogProps {
  faculty: FacultyMember | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: DepartmentOption[];
  colleges?: CollegeOption[];
}

export const EditFacultyDialog = memo(function EditFacultyDialog({
  faculty,
  open,
  onClose,
  onSuccess,
  departments,
  colleges = [],
}: EditFacultyDialogProps) {
  const [form, setForm] = useState<{
    title: FacultyTitle | "";
    name: string;
    phone: string;
    employeeId: string;
    department: string;
    collegeId: string;
    isVerified: boolean;
    isActive: boolean;
  }>({
    title: "",
    name: "",
    phone: "",
    employeeId: "",
    department: "",
    collegeId: "none",
    isVerified: false,
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (faculty) {
      setForm({
        title: (faculty.title as FacultyTitle) || "",
        name: faculty.name || "",
        phone: faculty.phone || "",
        employeeId: faculty.student_id || "",
        department: faculty.department || "",
        collegeId: faculty.college_id || "none",
        isVerified: Boolean(faculty.is_verified),
        isActive: !faculty.is_deleted,
      });
    }
  }, [faculty]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faculty) return;
    const trimmedName = form.name.trim();

    if (!trimmedName) {
      toast.error("Faculty name cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const targetCollegeId = form.collegeId === "none" ? null : form.collegeId;
      const collegeChanged = targetCollegeId !== (faculty.college_id || null);

      const { error } = await supabase
        .from("profiles")
        .update({
          title: form.title || null,
          name: trimmedName,
          phone: form.phone.trim() || null,
          student_id: form.employeeId.trim() || null,
          department: form.department.trim() || null,
          college_id: targetCollegeId,
          is_verified: form.isVerified,
          is_deleted: !form.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", faculty.user_id);

      if (error) throw error;

      if (collegeChanged) {
        await supabase
          .from("user_roles")
          .update({ college_id: targetCollegeId })
          .eq("user_id", faculty.user_id)
          .eq("role", "faculty");
      }

      toast.success(`Faculty profile for "${trimmedName}" updated`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update faculty profile";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [faculty, form, onClose, onSuccess]);

  if (!faculty) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent className="max-w-md bg-card border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-semibold text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <UserPen className="h-4 w-4" />
            </div>
            Edit Faculty Profile
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update faculty record, department affiliation, and access permissions.
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
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                disabled={loading}
                placeholder="e.g. Rahul Sharma"
                className="h-9"
              />
            </div>
          </div>

          {/* Email (Read Only) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email Address
            </Label>
            <Input
              value={faculty.email}
              disabled
              className="h-9 bg-muted/50 text-muted-foreground cursor-not-allowed"
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

          {/* Institutional Affiliation (Admin Controlled) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Institution / College
              </span>
              <span className="text-[10.5px] text-muted-foreground font-normal">
                Admin Managed
              </span>
            </Label>
            <Select
              value={form.collegeId}
              onValueChange={(val) => setForm((p) => ({ ...p, collegeId: val }))}
              disabled={loading}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select institution / college" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="none" className="text-xs text-muted-foreground italic">
                  — Unassigned / None —
                </SelectItem>
                {colleges.map((col) => (
                  <SelectItem key={col.id} value={col.id} className="text-xs">
                    {col.college_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status & Verification Toggles */}
          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium text-foreground">Verified Faculty Status</Label>
                <p className="text-[11px] text-muted-foreground">
                  Displays official institution verification check badge.
                </p>
              </div>
              <Switch
                checked={form.isVerified}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, isVerified: checked }))}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium text-foreground">Active Account</Label>
                <p className="text-[11px] text-muted-foreground">
                  Allow this faculty member to access the faculty workspace.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))}
                disabled={loading}
              />
            </div>
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
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
