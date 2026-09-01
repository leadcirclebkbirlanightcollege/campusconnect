import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, Search, User, Loader2, Plus } from "@/components/icons";
import { showErrorToast, showSuccessToast } from "@/lib/error-handling";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLectureId?: string;
  onSuccess?: () => void;
}

export default function ManualAttendanceDialog({
  open,
  onOpenChange,
  defaultLectureId,
  onSuccess,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedLectureId, setSelectedLectureId] = useState<string>(defaultLectureId || "");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Fetch faculty's recent lectures
  const { data: lectures = [] } = useQuery({
    queryKey: ["faculty", "lectures-select", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date,status")
        .eq("created_by", user!.id)
        .order("lecture_date", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  // Search students from profiles table
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["faculty", "student-search", studentSearch],
    enabled: studentSearch.trim().length >= 2 && open,
    queryFn: async () => {
      const q = studentSearch.trim();
      const { data } = await supabase
        .from("profiles")
        .select("user_id,name,student_id,department,avatar_url")
        .or(`name.ilike.%${q}%,student_id.ilike.%${q}%`)
        .limit(10);
      return data ?? [];
    },
  });

  // Mark Attendance Mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLectureId) throw new Error("Please select a lecture");
      if (!selectedStudentId) throw new Error("Please select a student");

      const { error } = await supabase.from("attendance").insert({
        lecture_id: selectedLectureId,
        student_user_id: selectedStudentId,
        status: "present",
        marked_at: new Date().toISOString(),
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccessToast("Attendance marked successfully!");
      onOpenChange(false);
      setSelectedStudentId(null);
      setStudentSearch("");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      onSuccess?.();
    },
    onError: (err: any) => {
      showErrorToast(err, { context: "mark-attendance" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[16px] font-bold">
            <CheckSquare className="h-4.5 w-4.5 text-primary" />
            Manual Attendance Entry
          </DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Record attendance for a student who was present in your lecture.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Lecture Selection */}
          <div>
            <label className="text-[12px] font-medium text-foreground">Select Lecture</label>
            <Select
              value={selectedLectureId || defaultLectureId || ""}
              onValueChange={setSelectedLectureId}
            >
              <SelectTrigger className="w-full mt-1.5 h-10 text-[13px] rounded-xl bg-background border-border/50">
                <SelectValue placeholder="Choose a lecture..." />
              </SelectTrigger>
              <SelectContent>
                {lectures.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-[12.5px]">
                    {l.topic} · {format(new Date(l.lecture_date), "MMM d")} ({l.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student Search */}
          <div>
            <label className="text-[12px] font-medium text-foreground">Search Student</label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setSelectedStudentId(null);
                }}
                placeholder="Search by student name or ID..."
                className="pl-9 h-10 text-[13px] rounded-xl bg-background border-border/50"
              />
            </div>

            {/* Results dropdown list */}
            {studentSearch.trim().length >= 2 && (
              <div className="mt-2 rounded-xl border border-border/50 bg-muted/20 p-1.5 max-h-48 overflow-y-auto space-y-1">
                {isSearching ? (
                  <div className="p-3 text-center text-[12px] text-muted-foreground flex items-center justify-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching students…
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-center text-[12px] text-muted-foreground">
                    No students found matching "{studentSearch}"
                  </div>
                ) : (
                  searchResults.map((s) => (
                    <button
                      key={s.user_id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentId(s.user_id);
                        setStudentSearch(`${s.name} (${s.student_id || "No ID"})`);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-[12.5px] transition-colors ${
                        selectedStudentId === s.user_id
                          ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                          : "hover:bg-card text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                          {s.name?.charAt(0) || "S"}
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="font-medium truncate">{s.name}</p>
                          <p className="text-[10.5px] text-muted-foreground truncate">
                            ID: {s.student_id || "—"} · {s.department || "General"}
                          </p>
                        </div>
                      </div>
                      {selectedStudentId === s.user_id && (
                        <span className="text-[11px] text-primary font-bold">Selected</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-[12.5px] h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!selectedLectureId || !selectedStudentId || markAttendanceMutation.isPending}
              onClick={() => markAttendanceMutation.mutate()}
              className="rounded-xl text-[12.5px] h-9 gap-1.5"
            >
              {markAttendanceMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Record Attendance
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
