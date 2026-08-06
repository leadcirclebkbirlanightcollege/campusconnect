import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { UserPlus, X, Search, Users } from "lucide-react";

type Programme = {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
};

type Student = {
  user_id: string;
  name: string;
  student_id: string | null;
  email: string;
};

type Allotment = {
  id: string;
  student_user_id: string;
  programme_id: string;
};

export default function StudentAllotmentTab() {
  const queryClient = useQueryClient();
  const [selectedProgramme, setSelectedProgramme] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const programmesQuery = useQuery({
    queryKey: ["admin", "programmes", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programmes")
        .select("id, name, color, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Programme[];
    },
  });

  const studentsQuery = useQuery({
    queryKey: ["admin", "students", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, student_id, email")
        .eq("is_deleted", false)
        .order("name");
      if (error) throw error;
      return data as Student[];
    },
  });

  const allotmentsQuery = useQuery({
    queryKey: ["admin", "allotments", selectedProgramme],
    enabled: !!selectedProgramme,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_programme_allotments")
        .select("id, student_user_id, programme_id")
        .eq("programme_id", selectedProgramme);
      if (error) throw error;
      return data as Allotment[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (studentUserId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("student_programme_allotments").insert({
        student_user_id: studentUserId,
        programme_id: selectedProgramme,
        allotted_by: user.id,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Student already in this programme");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Student added to programme");
      queryClient.invalidateQueries({ queryKey: ["admin", "allotments", selectedProgramme] });
      queryClient.invalidateQueries({ queryKey: ["admin", "programmes", "allotments-count"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (allotmentId: string) => {
      const { error } = await supabase.from("student_programme_allotments").delete().eq("id", allotmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student removed from programme");
      queryClient.invalidateQueries({ queryKey: ["admin", "allotments", selectedProgramme] });
      queryClient.invalidateQueries({ queryKey: ["admin", "programmes", "allotments-count"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const allottedUserIds = new Set(allotmentsQuery.data?.map((a) => a.student_user_id) || []);

  const filteredStudents = studentsQuery.data?.filter((s) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.student_id && s.student_id.toLowerCase().includes(q))
    );
  });

  const allottedStudents = studentsQuery.data?.filter((s) => allottedUserIds.has(s.user_id)) || [];
  const availableStudents = filteredStudents?.filter((s) => !allottedUserIds.has(s.user_id)) || [];

  const selectedProg = programmesQuery.data?.find((p) => p.id === selectedProgramme);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Student Allotments</h2>
        <p className="text-muted-foreground">Assign students to learning circles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Programme</CardTitle>
          <CardDescription>Choose a programme to manage its students</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProgramme} onValueChange={setSelectedProgramme}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select a programme..." />
            </SelectTrigger>
            <SelectContent>
              {programmesQuery.data?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProgramme && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Current Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Current Students
                <Badge variant="secondary">{allottedStudents.length}</Badge>
              </CardTitle>
              <CardDescription>Students enrolled in {selectedProg?.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {allotmentsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : allottedStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No students allotted yet</p>
              ) : (
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                  {allottedStudents.map((s) => {
                    const allotment = allotmentsQuery.data?.find((a) => a.student_user_id === s.user_id);
                    return (
                      <li
                        key={s.user_id}
                        className="flex items-center justify-between rounded-lg border border-border/40 bg-card/50 px-3 py-2"
                      >
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.student_id || s.email}</p>
                        </div>
                        <Button aria-label="Close"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => allotment && removeMutation.mutate(allotment.id)}
                          disabled={removeMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Add Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5" />
                Add Students
              </CardTitle>
              <CardDescription>Search and add students to this programme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {studentsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : availableStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {searchQuery ? "No matching students found" : "All students are already allotted"}
                </p>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                  {availableStudents.slice(0, 20).map((s) => (
                    <li
                      key={s.user_id}
                      className="flex items-center justify-between rounded-lg border border-border/40 bg-card/50 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.student_id || s.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => addMutation.mutate(s.user_id)}
                        disabled={addMutation.isPending}
                      >
                        <UserPlus className="h-3 w-3" />
                        Add
                      </Button>
                    </li>
                  ))}
                  {availableStudents.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing 20 of {availableStudents.length}. Use search to find more.
                    </p>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
