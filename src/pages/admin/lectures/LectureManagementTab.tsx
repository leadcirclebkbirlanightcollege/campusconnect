import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, CalendarDays, List, Trash2, Radio, Square } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import LectureFormDialog from "./LectureFormDialog";
import LectureFlyerUploader from "./LectureFlyerUploader";

export type LectureRow = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  flyer_object_path: string | null;
  status: "scheduled" | "live" | "ended";
  created_at: string;
  updated_at: string;
};

function toDateOnlyIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function LectureManagementTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editLecture, setEditLecture] = useState<LectureRow | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());

  const lecturesQuery = useQuery({
    queryKey: ["admin", "lectures"],
    queryFn: async (): Promise<LectureRow[]> => {
      const { data, error } = await supabase
        .from("lectures")
        .select(
          "id,topic,lecture_date,start_time,end_time,venue,flyer_object_path,status,created_at,updated_at",
        )
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as LectureRow[];
    },
  });

  const deleteLecture = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lectures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Lecture deleted");
      await qc.invalidateQueries({ queryKey: ["admin", "lectures"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete lecture"),
  });

  const setLectureLive = useMutation({
    mutationFn: async ({ lectureId }: { lectureId: string }) => {
      const { error } = await supabase.functions.invoke("lecture-lifecycle", {
        body: { action: "go_live", lectureId },
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Lecture is LIVE");
      await qc.invalidateQueries({ queryKey: ["admin", "lectures"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to start lecture"),
  });

  const endLecture = useMutation({
    mutationFn: async ({ lectureId }: { lectureId: string }) => {
      const { error } = await supabase.functions.invoke("lecture-lifecycle", {
        body: { action: "end", lectureId },
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Lecture ended");
      await qc.invalidateQueries({ queryKey: ["admin", "lectures"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to end lecture"),
  });

  const calendarIndex = useMemo(() => {
    const rows = lecturesQuery.data ?? [];
    const byDay: Record<string, LectureRow[]> = {};
    for (const r of rows) {
      (byDay[r.lecture_date] ??= []).push(r);
    }
    return byDay;
  }, [lecturesQuery.data]);

  const selectedDayLectures = useMemo(() => {
    if (!selectedDay) return [];
    return calendarIndex[toDateOnlyIso(selectedDay)] ?? [];
  }, [calendarIndex, selectedDay]);

  const lectureDates = useMemo(() => {
    return Object.keys(calendarIndex).map((d) => new Date(`${d}T00:00:00`));
  }, [calendarIndex]);

  return (
    <div className="space-y-6">
      <Card className="border-primary/10">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Lecture Management</CardTitle>
              <CardDescription>
                Create lectures, upload flyers, and view the schedule in a calendar.
              </CardDescription>
            </div>

            <Button
              onClick={() => {
                setEditLecture(null);
                setOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New lecture
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{(lecturesQuery.data ?? []).length} total</Badge>
            <span className="text-sm text-muted-foreground">
              • Flyers stored in lecture-flyers
            </span>
          </div>

          <Tabs defaultValue="table" className="space-y-4">
            <TabsList>
              <TabsTrigger value="table" className="gap-2">
                <List className="h-4 w-4" />
                Table
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="space-y-4">
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lecture</TableHead>
                      <TableHead className="hidden md:table-cell">Time</TableHead>
                      <TableHead className="hidden md:table-cell">Venue</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead>Flyer</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lecturesQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          Loading lectures…
                        </TableCell>
                      </TableRow>
                    ) : (lecturesQuery.data ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          No lectures yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (lecturesQuery.data ?? []).map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium leading-tight">{l.topic}</span>
                              <span className="text-xs text-muted-foreground">{l.lecture_date}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {l.start_time}–{l.end_time}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm">{l.venue}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {l.status === "live" ? (
                              <Badge variant="destructive" className="gap-1 animate-pulse">
                                <Radio className="h-3.5 w-3.5" /> LIVE
                              </Badge>
                            ) : l.status === "ended" ? (
                              <Badge variant="secondary" className="gap-1">
                                <Square className="h-3.5 w-3.5" /> Ended
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Scheduled</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <LectureFlyerUploader lecture={l} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {l.status !== "live" ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="gap-2"
                                  onClick={() => setLectureLive.mutate({ lectureId: l.id })}
                                  disabled={setLectureLive.isPending}
                                >
                                  <Radio className="h-4 w-4" />
                                  Live
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-2"
                                  onClick={() => endLecture.mutate({ lectureId: l.id })}
                                  disabled={endLecture.isPending}
                                >
                                  <Square className="h-4 w-4" />
                                  End
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditLecture(l);
                                  setOpen(true);
                                }}
                                disabled={l.status === "live"}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-2"
                                onClick={() => deleteLecture.mutate(l.id)}
                                disabled={deleteLecture.isPending || l.status === "live"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[360px,1fr]">
                <Card className="border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-base">Schedule</CardTitle>
                    <CardDescription>Select a date to view lectures.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDay}
                      onSelect={setSelectedDay}
                      modifiers={{ hasLecture: lectureDates }}
                      modifiersClassNames={{
                        hasLecture: "bg-primary/10 text-primary font-medium",
                      }}
                    />
                  </CardContent>
                </Card>

                <Card className="border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-base">Lectures on {selectedDay ? toDateOnlyIso(selectedDay) : "—"}</CardTitle>
                    <CardDescription>
                      {(selectedDayLectures.length || 0) === 0
                        ? "No lectures scheduled."
                        : `${selectedDayLectures.length} scheduled`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Separator />
                    {selectedDayLectures.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Create a lecture to populate the calendar.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedDayLectures.map((l) => (
                          <div key={l.id} className="rounded-lg border border-border/60 p-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="font-medium">{l.topic}</div>
                                <div className="text-sm text-muted-foreground">
                                  {l.start_time}–{l.end_time} • {l.venue}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditLecture(l);
                                    setOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3">
                              <LectureFlyerUploader lecture={l} compact />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <LectureFormDialog
        open={open}
        onOpenChange={setOpen}
        lecture={editLecture}
        onSaved={async () => {
          await qc.invalidateQueries({ queryKey: ["admin", "lectures"] });
        }}
      />
    </div>
  );
}
