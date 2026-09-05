/**
 * InstitutionalAssignmentDialog — Admin Console workflow to assign/reassign
 * institutional affiliation for faculty members.
 * Single source of truth for faculty college affiliation.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, GraduationCap, IdCard, Loader2, Save,
  Search, ShieldCheck, Check, AlertCircle, X,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatFacultyName } from "@/lib/faculty";
import type { FacultyMember, CollegeOption } from "./types";

interface InstitutionalAssignmentDialogProps {
  faculty: FacultyMember | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (collegeId: string | null, collegeName: string | null) => void;
  colleges: CollegeOption[];
  isLoadingColleges?: boolean;
}

export function InstitutionalAssignmentDialog({
  faculty,
  open,
  onClose,
  onSuccess,
  colleges,
  isLoadingColleges = false,
}: InstitutionalAssignmentDialogProps) {
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>("none");
  const [searchFilter, setSearchFilter] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync initial college_id when dialog opens with faculty member
  useEffect(() => {
    if (faculty) {
      setSelectedCollegeId(faculty.college_id || "none");
      setSearchFilter("");
    }
  }, [faculty, open]);

  // Filtered colleges based on search inside dialog
  const filteredColleges = useMemo(() => {
    if (!searchFilter.trim()) return colleges;
    const q = searchFilter.toLowerCase().trim();
    return colleges.filter((c) => c.college_name.toLowerCase().includes(q));
  }, [colleges, searchFilter]);

  const selectedCollegeName = useMemo(() => {
    if (!selectedCollegeId || selectedCollegeId === "none") return null;
    return colleges.find((c) => c.id === selectedCollegeId)?.college_name ?? null;
  }, [selectedCollegeId, colleges]);

  const hasChanges = useMemo(() => {
    const currentId = faculty?.college_id || "none";
    return selectedCollegeId !== currentId;
  }, [faculty, selectedCollegeId]);

  const handleSave = useCallback(async () => {
    if (!faculty || isSaving) return;

    const targetCollegeId = selectedCollegeId === "none" ? null : selectedCollegeId;
    setIsSaving(true);

    try {
      // 1. Try atomic admin RPC function
      const { error: rpcError } = await supabase.rpc("admin_assign_faculty_institution", {
        p_faculty_user_id: faculty.user_id,
        p_college_id: targetCollegeId,
      });

      // 2. If RPC fails (e.g. during schema migration window), use direct database update
      if (rpcError) {
        // Update profiles table
        const { error: profErr } = await supabase
          .from("profiles")
          .update({
            college_id: targetCollegeId,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", faculty.user_id);

        if (profErr) throw profErr;

        // Update user_roles table for faculty role
        const { error: roleErr } = await supabase
          .from("user_roles")
          .update({ college_id: targetCollegeId })
          .eq("user_id", faculty.user_id)
          .eq("role", "faculty");

        if (roleErr) throw roleErr;
      }

      const facultyDisplayName = formatFacultyName(faculty.name, faculty.title);
      if (targetCollegeId && selectedCollegeName) {
        toast.success(`Assigned "${facultyDisplayName}" to ${selectedCollegeName}`);
      } else {
        toast.success(`Institutional affiliation removed for "${facultyDisplayName}"`);
      }

      onSuccess(targetCollegeId, selectedCollegeName);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save institutional assignment";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [faculty, isSaving, selectedCollegeId, selectedCollegeName, onSuccess, onClose]);

  if (!faculty) return null;

  const facultyDisplayName = formatFacultyName(faculty.name, faculty.title);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isSaving && onClose()}>
      <DialogContent className="max-w-md bg-card border-border shadow-2xl p-6">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground tracking-tight">
                Institutional Assignment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Assign or reassign the affiliated institution for this faculty member.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Read-only Context Summary Card */}
          <div className="rounded-xl bg-muted/40 border border-border/60 p-3.5 space-y-2.5 text-xs">
            {/* Faculty Name */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground/70" />
                Faculty Name
              </span>
              <span className="font-semibold text-foreground truncate max-w-[200px]">
                {facultyDisplayName}
              </span>
            </div>

            {/* Faculty ID */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <IdCard className="h-3.5 w-3.5 text-muted-foreground/70" />
                Faculty ID
              </span>
              <span className="font-mono text-foreground font-medium">
                {faculty.student_id || "Not assigned"}
              </span>
            </div>

            {/* Department */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Department</span>
              <span className="font-medium text-foreground">
                {faculty.department || "Not specified"}
              </span>
            </div>

            {/* Role */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Role
              </span>
              <Badge variant="outline" className="text-[10.5px] py-0 h-5 bg-primary/5 text-primary border-primary/20">
                Faculty (System Managed)
              </Badge>
            </div>
          </div>

          {/* Institution / College Select Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="institution-select" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Institution / College
              </Label>
              {isLoadingColleges && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading institutions…
                </span>
              )}
            </div>

            {/* Search filter if many colleges */}
            {colleges.length > 5 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
                <Input
                  type="text"
                  placeholder="Filter colleges by name…"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background rounded-lg border-border/60"
                  disabled={isSaving}
                />
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            <Select
              value={selectedCollegeId}
              onValueChange={setSelectedCollegeId}
              disabled={isSaving || isLoadingColleges}
            >
              <SelectTrigger id="institution-select" className="h-10 text-xs bg-background rounded-xl border-border/70">
                <SelectValue placeholder="Select institution / college" />
              </SelectTrigger>
              <SelectContent className="max-h-64 bg-card border-border shadow-xl">
                <SelectItem value="none" className="text-xs text-muted-foreground italic">
                  — Unassigned / None —
                </SelectItem>
                {filteredColleges.map((col) => (
                  <SelectItem key={col.id} value={col.id} className="text-xs py-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                      <span className="font-medium text-foreground">{col.college_name}</span>
                    </div>
                  </SelectItem>
                ))}
                {filteredColleges.length === 0 && searchFilter && (
                  <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                    No matching colleges found
                  </div>
                )}
              </SelectContent>
            </Select>

            <p className="text-[11px] text-muted-foreground/80 flex items-start gap-1 mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 mt-0.5" />
              <span>
                Faculty members cannot change this affiliation. Updates reflect across the Faculty Portal immediately.
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t border-border/50 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl text-xs h-9"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || (!hasChanges && selectedCollegeId === (faculty.college_id || "none"))}
            className="rounded-xl text-xs h-9 gap-1.5 px-4"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving Assignment…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Assignment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
