import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Calendar, Award, GraduationCap, Plus } from "@/components/icons";
import { COMMON_EXAM_TYPES, type Exam } from "./types";

interface CreateExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collegeId: string | null;
  onExamCreated: (newExam: Exam) => void;
}

export function CreateExamDialog({
  open,
  onOpenChange,
  collegeId,
  onExamCreated,
}: CreateExamDialogProps) {
  const { user } = useAuth();

  const [examType, setExamType] = useState("");
  const [topic, setTopic] = useState("");
  const [classId, setClassId] = useState("");
  const [maxMarks, setMaxMarks] = useState<string>("50");
  const [minMarks, setMinMarks] = useState<string>("20");
  const [examDate, setExamDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch classes belonging to this college
  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["classes", collegeId],
    enabled: !!collegeId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id,name,section,year,is_active")
        .eq("college_id", collegeId!)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching classes:", error);
        return [];
      }
      return data ?? [];
    },
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!examType.trim()) {
      errs.examType = "Exam Type is required (e.g. Internal Assessment 1)";
    }
    if (!topic.trim()) {
      errs.topic = "Topic / Subject is required (e.g. Database Management System)";
    }
    if (!classId) {
      errs.classId = "Please select a target class";
    }

    const max = Number(maxMarks);
    if (isNaN(max) || max <= 0) {
      errs.maxMarks = "Maximum marks must be greater than 0";
    }

    const min = Number(minMarks);
    if (isNaN(min) || min < 0) {
      errs.minMarks = "Passing marks cannot be negative";
    } else if (min > max) {
      errs.minMarks = "Passing marks cannot exceed maximum marks";
    }

    if (!examDate) {
      errs.examDate = "Please choose an exam date";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSelectExamType = (type: string) => {
    setExamType(type);
    if (errors.examType) {
      setErrors((prev) => ({ ...prev, examType: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!user) {
      toast.error("You must be logged in to create an examination");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: examType.trim(),
        subject: topic.trim(),
        exam_type: examType.trim(),
        topic: topic.trim(),
        class_id: classId,
        college_id: collegeId,
        max_marks: Number(maxMarks),
        min_marks: Number(minMarks),
        exam_date: examDate,
        description: description.trim() || null,
        status: "MARKS_ENTRY",
        is_active: true,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from("exams")
        .insert(payload)
        .select("*, classes(id,name,section,year)")
        .single();

      if (error) throw error;

      toast.success("Examination created successfully!");
      onOpenChange(false);

      // Reset form
      setExamType("");
      setTopic("");
      setClassId("");
      setMaxMarks("50");
      setMinMarks("20");
      setDescription("");
      setErrors({});

      if (data) {
        onExamCreated(data as unknown as Exam);
      }
    } catch (err: unknown) {
      console.error("Failed to create exam:", err);
      const message = err instanceof Error ? err.message : "Failed to create examination";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-primary">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                Create Examination
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Set up an exam, associate it with a class, and immediately begin marks entry.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Exam Type */}
          <div className="space-y-1.5">
            <Label htmlFor="exam-type" className="text-xs font-semibold">
              Exam Type <span className="text-danger">*</span>
            </Label>
            <Input
              id="exam-type"
              placeholder="e.g. Internal Assessment 1, Semester Exam..."
              value={examType}
              onChange={(e) => {
                setExamType(e.target.value);
                if (errors.examType) setErrors((prev) => ({ ...prev, examType: "" }));
              }}
              className={errors.examType ? "border-danger focus-visible:ring-danger" : ""}
            />
            {errors.examType && (
              <p className="text-[11px] text-danger font-medium">{errors.examType}</p>
            )}

            {/* Quick Suggestions Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground py-0.5 self-center font-medium">
                Quick pick:
              </span>
              {COMMON_EXAM_TYPES.slice(0, 6).map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => handleSelectExamType(type)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                    examType === type
                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                      : "bg-surface-2 text-muted-foreground hover:text-foreground hover:bg-surface-3 border-border"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Topic / Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="exam-topic" className="text-xs font-semibold">
              Topic / Subject <span className="text-danger">*</span>
            </Label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="exam-topic"
                placeholder="e.g. Database Management System"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  if (errors.topic) setErrors((prev) => ({ ...prev, topic: "" }));
                }}
                className={`pl-9 ${errors.topic ? "border-danger focus-visible:ring-danger" : ""}`}
              />
            </div>
            {errors.topic && (
              <p className="text-[11px] text-danger font-medium">{errors.topic}</p>
            )}
          </div>

          {/* Class Selection & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Class Dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="exam-class" className="text-xs font-semibold">
                Class <span className="text-danger">*</span>
              </Label>
              <Select
                value={classId}
                onValueChange={(val) => {
                  setClassId(val);
                  if (errors.classId) setErrors((prev) => ({ ...prev, classId: "" }));
                }}
              >
                <SelectTrigger
                  id="exam-class"
                  className={errors.classId ? "border-danger focus-visible:ring-danger" : ""}
                >
                  <div className="flex items-center gap-2 truncate">
                    <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder={loadingClasses ? "Loading classes..." : "Select Class"} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {classes.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      No active classes found
                    </div>
                  ) : (
                    classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.section ? `(${cls.section})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.classId && (
                <p className="text-[11px] text-danger font-medium">{errors.classId}</p>
              )}
            </div>

            {/* Exam Date */}
            <div className="space-y-1.5">
              <Label htmlFor="exam-date" className="text-xs font-semibold">
                Exam Date <span className="text-danger">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="exam-date"
                  type="date"
                  value={examDate}
                  onChange={(e) => {
                    setExamDate(e.target.value);
                    if (errors.examDate) setErrors((prev) => ({ ...prev, examDate: "" }));
                  }}
                  className={`pl-9 ${errors.examDate ? "border-danger focus-visible:ring-danger" : ""}`}
                />
              </div>
              {errors.examDate && (
                <p className="text-[11px] text-danger font-medium">{errors.examDate}</p>
              )}
            </div>
          </div>

          {/* Max Marks & Min Marks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="max-marks" className="text-xs font-semibold">
                Maximum Marks <span className="text-danger">*</span>
              </Label>
              <Input
                id="max-marks"
                type="number"
                min="1"
                step="any"
                placeholder="100"
                value={maxMarks}
                onChange={(e) => {
                  setMaxMarks(e.target.value);
                  if (errors.maxMarks) setErrors((prev) => ({ ...prev, maxMarks: "" }));
                }}
                className={errors.maxMarks ? "border-danger focus-visible:ring-danger" : ""}
              />
              {errors.maxMarks && (
                <p className="text-[11px] text-danger font-medium">{errors.maxMarks}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="min-marks" className="text-xs font-semibold">
                Passing Marks (Min) <span className="text-danger">*</span>
              </Label>
              <Input
                id="min-marks"
                type="number"
                min="0"
                step="any"
                placeholder="40"
                value={minMarks}
                onChange={(e) => {
                  setMinMarks(e.target.value);
                  if (errors.minMarks) setErrors((prev) => ({ ...prev, minMarks: "" }));
                }}
                className={errors.minMarks ? "border-danger focus-visible:ring-danger" : ""}
              />
              {errors.minMarks && (
                <p className="text-[11px] text-danger font-medium">{errors.minMarks}</p>
              )}
            </div>
          </div>

          {/* Optional Instructions */}
          <div className="space-y-1.5">
            <Label htmlFor="exam-description" className="text-xs font-semibold text-muted-foreground">
              Optional Instructions / Notes
            </Label>
            <Textarea
              id="exam-description"
              placeholder="e.g. Unit 1 & 2 covering Relational Algebra and Normalization..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none text-xs"
            />
          </div>

          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? "Creating..." : "Create & Enter Marks"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
