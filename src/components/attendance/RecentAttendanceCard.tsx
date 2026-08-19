import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type AttendanceWithLecture = {
  id: string;
  lecture_id: string;
  status: string;
  marked_at: string;
  points_earned: number;
  lecture: {
    topic: string;
    lecture_date: string;
  } | null;
};

export default function RecentAttendanceCard() {
  const query = useQuery({
    queryKey: ["student", "recent-attendance"],
    queryFn: async (): Promise<AttendanceWithLecture[]> => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("attendance")
        .select(`
          id,
          lecture_id,
          status,
          marked_at,
          points_earned,
          lecture:lectures(topic, lecture_date)
        `)
        .eq("student_user_id", user.user.id)
        .order("marked_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return (data ?? []) as unknown as AttendanceWithLecture[];
    },
  });

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Recent Attendance
        </CardTitle>
        <CardDescription>Your last 3 attendance records</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : query.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No attendance records yet. Mark your first attendance!
          </p>
        ) : (
          <div className="space-y-3">
            {query.data?.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 p-3"
              >
                <div className="flex items-start gap-3">
                  {record.status === "present" ? (
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {record.lecture?.topic ?? "Unknown Lecture"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.lecture?.lecture_date} •{" "}
                      {new Date(record.marked_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {record.points_earned > 0 && (
                    <Badge variant="secondary" className="font-mono">
                      +{record.points_earned}
                    </Badge>
                  )}
                  <Badge
                    className={
                      record.status === "present"
                        ? "bg-success text-success-foreground"
                        : "bg-destructive text-destructive-foreground"
                    }
                  >
                    {record.status === "present" ? "Present" : "Absent"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
