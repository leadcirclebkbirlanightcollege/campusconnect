import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StudentRow = {
  user_id: string;
  name: string;
  email: string;
  student_id: string | null;
  is_verified: boolean;
};

type LectureRow = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
};

type Props = {
  defaultLectureId?: string;
  trigger?: React.ReactNode;
};

export default function AdminManualAttendanceDialog({ defaultLectureId, trigger }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [lectureId, setLectureId] = useState(defaultLectureId ?? "");
  const [reason, setReason] = useState("");

  // Fetch students
  const studentsQuery = useQuery({
    queryKey: ["admin", "students-for-manual-attendance"],
    enabled: open,
    queryFn: async (): Promise<StudentRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, email, student_id, is_verified")
        .eq("is_deleted", false)
        .order("name", { ascending: true })
        .limit(500);

      if (error) throw error;
      return (data ?? []) as StudentRow[];
    },
  });

  // Fetch lectures
  const lecturesQuery = useQuery({
    queryKey: ["admin", "lectures-for-manual-attendance"],
    enabled: open,
    queryFn: async (): Promise<LectureRow[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("lectures")
        .select("id, topic, lecture_date, start_time")
        .gte("lecture_date", today)
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(100);

      if (error) throw error;
      return (data ?? []) as LectureRow[];
    },
  });

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return (studentsQuery.data ?? [])
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.student_id ?? "").toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [studentsQuery.data, searchQuery]);

  // Check if attendance already exists
  const existingAttendanceQuery = useQuery({
    queryKey: ["admin", "check-attendance", selectedStudent?.user_id, lectureId],
    enabled: Boolean(selectedStudent?.user_id && lectureId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id")
        .eq("lecture_id", lectureId)
        .eq("student_user_id", selectedStudent!.user_id)
        .maybeSingle();

      if (error) throw error;
      return Boolean(data);
    },
  });

  const markMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent || !lectureId || !reason.trim()) {
        throw new Error("Please fill all required fields");
      }

      const { data: adminUser } = await supabase.auth.getUser();
      if (!adminUser.user) throw new Error("Not logged in");

      // Insert attendance with admin metadata
      const { error: attendanceError } = await supabase.from("attendance").insert({
        lecture_id: lectureId,
        student_user_id: selectedStudent.user_id,
        status: "present",
        points_earned: 10,
      });

      if (attendanceError) throw attendanceError;

      // Add points with admin metadata
      const { error: ledgerError } = await supabase.from("points_ledger").insert({
        user_id: selectedStudent.user_id,
        points: 10,
        source: "manual",
        source_id: lectureId,
        note: `Manual attendance by admin: ${reason}`,
        created_by: adminUser.user.id,
        metadata: {
          marked_by: "admin",
          admin_id: adminUser.user.id,
          reason: reason.trim(),
          timestamp: new Date().toISOString(),
        },
      });

      if (ledgerError) console.error("Ledger insert failed:", ledgerError);

      return { success: true };
    },
    onSuccess: () => {
      toast.success("Attendance marked successfully", {
        description: `${selectedStudent?.name} has been marked present.`,
      });
      setOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["admin", "attendance"] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to mark attendance";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("Already marked", {
          description: "This student already has attendance for this lecture.",
        });
      } else {
        toast.error(msg);
      }
    },
  });

  const resetForm = () => {
    setSearchQuery("");
    setSelectedStudent(null);
    setReason("");
    if (!defaultLectureId) setLectureId("");
  };

  const canSubmit =
    selectedStudent &&
    lectureId &&
    reason.trim().length >= 10 &&
    !existingAttendanceQuery.data &&
    !markMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Manual Override
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Manual Attendance Override
          </DialogTitle>
          <DialogDescription>
            Mark attendance manually for students facing technical issues. This action is logged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Student Search */}
          <div className="space-y-2">
            <Label>Search Student</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedStudent(null);
                }}
                placeholder="Search by name, email, or student ID..."
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            {searchQuery && !selectedStudent && (
              <div className="max-h-48 overflow-auto rounded-lg border border-border/60">
                {filteredStudents.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No students found</p>
                ) : (
                  filteredStudents.map((s) => (
                    <button
                      key={s.user_id}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(s);
                        setSearchQuery(s.name);
                      }}
                      className="w-full p-3 text-left hover:bg-muted/50 transition flex items-center justify-between border-b last:border-b-0"
                    >
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.email} {s.student_id && `• ${s.student_id}`}
                        </div>
                      </div>
                      {s.is_verified && (
                        <Badge variant="secondary" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Selected Student */}
            {selectedStudent && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedStudent.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedStudent.email}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedStudent(null);
                      setSearchQuery("");
                    }}
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Lecture Selection */}
          <div className="space-y-2">
            <Label>Lecture</Label>
            <Select value={lectureId} onValueChange={setLectureId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lecture" />
              </SelectTrigger>
              <SelectContent>
                {(lecturesQuery.data ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.lecture_date} • {l.start_time} • {l.topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warning if already marked */}
          {existingAttendanceQuery.data && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <strong>Already marked:</strong> This student already has attendance for this lecture.
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Manual Override *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Student faced camera issues on phone, verified in person..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters. This reason will be logged for audit purposes.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => markMutation.mutate()}
            disabled={!canSubmit}
            className="gap-2"
          >
            <UserCheck className="h-4 w-4" />
            {markMutation.isPending ? "Marking..." : "Mark Attendance"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
