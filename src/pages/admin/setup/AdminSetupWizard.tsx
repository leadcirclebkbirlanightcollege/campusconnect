import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, Users, GraduationCap, BookOpen, CheckCircle2, ChevronRight, Plus, X } from "@/components/icons";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "departments", label: "Departments", icon: Building2, description: "Add academic departments" },
  { key: "classes", label: "Classes", icon: BookOpen, description: "Create classes/sections" },
  { key: "faculty", label: "Faculty", icon: Users, description: "Add faculty members" },
  { key: "students", label: "Students", icon: GraduationCap, description: "Add students" },
] as const;

type StepKey = typeof STEPS[number]["key"];

export default function AdminSetupWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Record<StepKey, boolean>>({
    departments: false, classes: false, faculty: false, students: false,
  });

  // Department state
  const [deptName, setDeptName] = useState("");
  const [addedDepts, setAddedDepts] = useState<string[]>([]);

  // Class state
  const [className, setClassName] = useState("");
  const [addedClasses, setAddedClasses] = useState<string[]>([]);

  // Faculty state
  const [facultyName, setFacultyName] = useState("");
  const [facultyEmail, setFacultyEmail] = useState("");
  const [addedFaculty, setAddedFaculty] = useState<{ name: string; email: string }[]>([]);

  // Student state
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [addedStudents, setAddedStudents] = useState<{ name: string; email: string }[]>([]);

  const { data: user } = useQuery({
    queryKey: ["setup_wizard_user"],
    queryFn: async () => { const { data } = await supabase.auth.getUser(); return data.user; },
    staleTime: 120_000,
  });

  const { data: collegeId } = useQuery({
    queryKey: ["setup_wizard_college"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_college_id");
      return data as string | null;
    },
    staleTime: 120_000,
  });

  const saveDeptMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!collegeId || !user) throw new Error("No college assigned");
      const { error } = await supabase.from("departments").insert({
        name, college_id: collegeId, created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, name) => {
      setAddedDepts((p) => [...p, name]);
      setDeptName("");
      toast.success(`Department "${name}" added`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const saveClassMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!collegeId || !user) throw new Error("No college assigned");
      const { error } = await supabase.from("classes").insert({
        name, college_id: collegeId, created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, name) => {
      setAddedClasses((p) => [...p, name]);
      setClassName("");
      toast.success(`Class "${name}" added`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const saveFacultyMutation = useMutation({
    mutationFn: async ({ name, email }: { name: string; email: string }) => {
      const { error } = await supabase.functions.invoke("admin-create-student", {
        body: { name, email, role: "faculty" },
      });
      if (error) throw error;
    },
    onSuccess: (_, { name, email }) => {
      setAddedFaculty((p) => [...p, { name, email }]);
      setFacultyName("");
      setFacultyEmail("");
      toast.success(`Faculty "${name}" added`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const saveStudentMutation = useMutation({
    mutationFn: async ({ name, email }: { name: string; email: string }) => {
      const { error } = await supabase.functions.invoke("admin-create-student", {
        body: { name, email },
      });
      if (error) throw error;
    },
    onSuccess: (_, { name, email }) => {
      setAddedStudents((p) => [...p, { name, email }]);
      setStudentName("");
      setStudentEmail("");
      toast.success(`Student "${name}" added`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const markStepDone = (key: StepKey) => {
    setCompleted((p) => ({ ...p, [key]: true }));
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const completedCount = Object.values(completed).filter(Boolean).length;
  const progressPct = Math.round((completedCount / STEPS.length) * 100);

  const step = STEPS[currentStep];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Setup Your Institution</h1>
        <p className="text-muted-foreground text-sm mt-1">Complete these steps to get started with your college ERP.</p>
      </div>

      <Progress value={progressPct} className="h-2" />

      {/* Step indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = completed[s.key];
          return (
            <button
              key={s.key}
              onClick={() => setCurrentStep(i)}
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg border text-left transition-all text-sm",
                i === currentStep ? "border-primary bg-primary/5" : "border-border hover:border-border-strong",
                done && "border-emerald-500/30 bg-emerald-500/5",
              )}
            >
              {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
              <span className={cn("font-medium", done && "text-success")}>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Current step content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{step.label}</CardTitle>
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step.key === "departments" && (
            <>
              <div className="flex gap-2">
                <Input
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Computer Science"
                  onKeyDown={(e) => { if (e.key === "Enter" && deptName.trim()) saveDeptMutation.mutate(deptName.trim()); }}
                />
                <Button onClick={() => deptName.trim() && saveDeptMutation.mutate(deptName.trim())} disabled={!deptName.trim() || saveDeptMutation.isPending}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {addedDepts.map((d) => <Badge key={d} variant="secondary">{d}</Badge>)}
              </div>
            </>
          )}

          {step.key === "classes" && (
            <>
              <div className="flex gap-2">
                <Input
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. FY-A, SY-B"
                  onKeyDown={(e) => { if (e.key === "Enter" && className.trim()) saveClassMutation.mutate(className.trim()); }}
                />
                <Button onClick={() => className.trim() && saveClassMutation.mutate(className.trim())} disabled={!className.trim() || saveClassMutation.isPending}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {addedClasses.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
              </div>
            </>
          )}

          {step.key === "faculty" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input value={facultyName} onChange={(e) => setFacultyName(e.target.value)} placeholder="Full name" />
                <Input value={facultyEmail} onChange={(e) => setFacultyEmail(e.target.value)} placeholder="Email" type="email" />
              </div>
              <Button
                onClick={() => facultyName.trim() && facultyEmail.trim() && saveFacultyMutation.mutate({ name: facultyName.trim(), email: facultyEmail.trim() })}
                disabled={!facultyName.trim() || !facultyEmail.trim() || saveFacultyMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Faculty
              </Button>
              <div className="flex flex-wrap gap-2">
                {addedFaculty.map((f) => <Badge key={f.email} variant="secondary">{f.name}</Badge>)}
              </div>
            </>
          )}

          {step.key === "students" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Full name" />
                <Input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="Email" type="email" />
              </div>
              <Button
                onClick={() => studentName.trim() && studentEmail.trim() && saveStudentMutation.mutate({ name: studentName.trim(), email: studentEmail.trim() })}
                disabled={!studentName.trim() || !studentEmail.trim() || saveStudentMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Student
              </Button>
              <div className="flex flex-wrap gap-2">
                {addedStudents.map((s) => <Badge key={s.email} variant="secondary">{s.name}</Badge>)}
              </div>
            </>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => markStepDone(step.key)}
            >
              {completed[step.key] ? "Already done" : "Skip for now"}
            </Button>
            <Button onClick={() => markStepDone(step.key)} className="gap-1">
              {completed[step.key] ? "Done" : "Mark Complete"} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {completedCount === STEPS.length && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-semibold">Setup Complete!</h3>
            <p className="text-sm text-muted-foreground">Your institution is ready. Head to the dashboard to start managing.</p>
            <Button onClick={() => navigate("/platform/admin/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
