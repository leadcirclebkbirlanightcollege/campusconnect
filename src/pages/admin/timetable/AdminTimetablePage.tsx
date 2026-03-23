import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  Plus, Trash2, Clock, Calendar, BookOpen, School,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WORK_DAYS = [1, 2, 3, 4, 5, 6]; // Mon–Sat

type Slot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  venue: string | null;
  faculty_name: string | null;
  class_id: string | null;
};

type ClassRow = { id: string; name: string; section: string | null };

type SlotForm = {
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject: string;
  venue: string;
  faculty_name: string;
  class_id: string;
};

const EMPTY_FORM: SlotForm = {
  day_of_week: "1",
  start_time: "09:00",
  end_time: "10:00",
  subject: "",
  venue: "",
  faculty_name: "",
  class_id: "all",
};

export default function AdminTimetablePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SlotForm>(EMPTY_FORM);
  const [filterClass, setFilterClass] = useState("all");

  const { data: collegeId } = useQuery({
    queryKey: ["my_college_id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_college_id");
      return data as string | null;
    },
    staleTime: 120_000,
  });

  const { data: classes = [] } = useQuery<ClassRow[]>({
    queryKey: ["admin", "classes_list"],
    enabled: !!collegeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("id,name,section")
        .eq("college_id", collegeId!)
        .eq("is_active", true)
        .order("name");
      return (data ?? []) as ClassRow[];
    },
    staleTime: 60_000,
  });

  const { data: slots = [], isLoading } = useQuery<Slot[]>({
    queryKey: ["admin", "timetable", filterClass],
    enabled: !!collegeId,
    queryFn: async () => {
      let q = supabase
        .from("timetable_slots")
        .select("id,day_of_week,start_time,end_time,subject,venue,faculty_name,class_id")
        .eq("college_id", collegeId!)
        .eq("is_active", true)
        .order("day_of_week")
        .order("start_time");
      if (filterClass !== "all") q = q.eq("class_id", filterClass);
      const { data } = await q;
      return (data ?? []) as Slot[];
    },
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user || !collegeId) throw new Error("Not authenticated");
      if (!form.subject.trim()) throw new Error("Subject is required");
      const { error } = await supabase.from("timetable_slots").insert({
        college_id: collegeId,
        created_by: user.id,
        day_of_week: parseInt(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        subject: form.subject.trim(),
        venue: form.venue.trim() || null,
        faculty_name: form.faculty_name.trim() || null,
        class_id: form.class_id !== "all" ? form.class_id : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Timetable slot added");
      qc.invalidateQueries({ queryKey: ["admin", "timetable"] });
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetable_slots").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Slot removed");
      qc.invalidateQueries({ queryKey: ["admin", "timetable"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Group slots by day
  const slotsByDay = WORK_DAYS.reduce<Record<number, Slot[]>>((acc, d) => {
    acc[d] = slots.filter((s) => s.day_of_week === d);
    return acc;
  }, {});

  const getClassLabel = (classId: string | null) => {
    if (!classId) return null;
    const c = classes.find((cl) => cl.id === classId);
    return c ? `${c.name}${c.section ? ` ${c.section}` : ""}` : null;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Timetable</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Weekly lecture schedule for all classes</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Slot
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="h-9 w-48 text-xs">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.section ? ` ${c.section}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {WORK_DAYS.map((day) => (
            <Card key={day} className="border-border/40">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {DAYS[day]}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {slotsByDay[day].length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No slots scheduled</p>
                ) : (
                  slotsByDay[day].map((slot) => (
                    <div key={slot.id} className="flex items-start justify-between rounded-lg border border-border/30 bg-card p-2.5 gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{slot.subject}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}
                          </span>
                          {slot.venue && (
                            <span className="text-[10px] text-muted-foreground">{slot.venue}</span>
                          )}
                          {slot.faculty_name && (
                            <span className="text-[10px] text-muted-foreground">{slot.faculty_name}</span>
                          )}
                        </div>
                        {getClassLabel(slot.class_id) && (
                          <Badge variant="secondary" className="text-[9px] h-4 mt-1">
                            <School className="h-2.5 w-2.5 mr-0.5" />
                            {getClassLabel(slot.class_id)}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(slot.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{slots.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Slots</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {new Set(slots.map(s => s.subject)).size}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Subjects</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {new Set(slots.map(s => s.class_id).filter(Boolean)).size}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Add Timetable Slot
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Day</Label>
                <Select value={form.day_of_week} onValueChange={(v) => setForm(p => ({ ...p, day_of_week: v }))}>
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_DAYS.map((d) => (
                      <SelectItem key={d} value={String(d)}>{DAYS[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Class</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm(p => ({ ...p, class_id: v }))}>
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.section ? ` ${c.section}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Subject *</Label>
              <Input className="h-9 mt-1 text-sm" value={form.subject} onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Data Structures" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Time</Label>
                <Input type="time" className="h-9 mt-1 text-sm" value={form.start_time} onChange={(e) => setForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">End Time</Label>
                <Input type="time" className="h-9 mt-1 text-sm" value={form.end_time} onChange={(e) => setForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Venue</Label>
                <Input className="h-9 mt-1 text-sm" value={form.venue} onChange={(e) => setForm(p => ({ ...p, venue: e.target.value }))} placeholder="Room / Lab" />
              </div>
              <div>
                <Label className="text-xs">Faculty</Label>
                <Input className="h-9 mt-1 text-sm" value={form.faculty_name} onChange={(e) => setForm(p => ({ ...p, faculty_name: e.target.value }))} placeholder="Prof. Name" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding…" : "Add Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
