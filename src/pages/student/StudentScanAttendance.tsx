import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, QrCode } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AttendanceMarkingCard from "./attendance/AttendanceMarkingCard";

type LectureRow = {
  id: string;
  topic: string;
  venue: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
};

function formatLectureTime(start: string, end: string) {
  return `${start} – ${end}`;
}

export default function StudentScanAttendance() {
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const lecturesQuery = useQuery({
    queryKey: ["student", "scan_attendance", "lectures", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id, topic, venue, lecture_date, start_time, end_time")
        .gte("lecture_date", today)
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return (data ?? []) as LectureRow[];
    },
  });

  const selectedLecture = useMemo(
    () => lecturesQuery.data?.find((l) => l.id === selectedLectureId) ?? null,
    [lecturesQuery.data, selectedLectureId],
  );

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Scan Attendance</h1>
        <p className="mt-2 text-muted-foreground">
          Select a lecture, then scan the QR or paste the token/OTP. This page avoids admin routes and is easier to test
          on phones.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Choose lecture
            </CardTitle>
            <CardDescription>We show lectures from today onwards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lecturesQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading lectures…</div>
            ) : lecturesQuery.isError ? (
              <div className="text-sm text-muted-foreground">Couldn’t load lectures.</div>
            ) : lecturesQuery.data?.length ? (
              <div className="space-y-2">
                {lecturesQuery.data.map((l) => {
                  const selected = l.id === selectedLectureId;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setSelectedLectureId(l.id)}
                      className={
                        "w-full rounded-lg border p-3 text-left transition " +
                        (selected ? "border-primary/30 bg-primary/5" : "border-border/60 hover:bg-muted/20")
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{l.topic}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {l.lecture_date} • {formatLectureTime(l.start_time, l.end_time)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground truncate">{l.venue}</div>
                        </div>
                        {selected ? <Badge>Selected</Badge> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No upcoming lectures found.</div>
            )}

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => setSelectedLectureId(null)}
                disabled={!selectedLectureId}
              >
                <QrCode className="h-4 w-4" />
                Clear selection
              </Button>
            </div>
          </CardContent>
        </Card>

        <section aria-label="Attendance marking">
          {selectedLecture ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="text-sm font-medium">Selected lecture</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {selectedLecture.topic} • {selectedLecture.lecture_date} • {formatLectureTime(
                    selectedLecture.start_time,
                    selectedLecture.end_time,
                  )}
                </div>
              </div>

              <AttendanceMarkingCard lectureId={selectedLecture.id} />
            </div>
          ) : (
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle>Ready when you are</CardTitle>
                <CardDescription>Select a lecture on the left to begin.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Tip: open this page on your phone in a regular browser tab (not inside the preview/iframe) so camera
                  permissions work reliably.
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </section>
    </main>
  );
}
