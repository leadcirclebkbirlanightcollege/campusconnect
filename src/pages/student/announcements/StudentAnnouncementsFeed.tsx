import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function StudentAnnouncementsFeed() {
  const query = useQuery({
    queryKey: ["student", "announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,description,priority,is_pinned,target,created_at,expires_at")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {query.data?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No announcements at the moment.
          </CardContent>
        </Card>
      )}

      <div className="divide-y divide-border rounded-xl border bg-card">
        {query.data?.map((a: any) => (
          <div
            key={a.id}
            className={`px-5 py-4 space-y-1.5 ${a.is_pinned ? "border-l-[3px] border-l-primary" : ""}`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium text-foreground">{a.title}</h3>
              {a.priority === "urgent" && (
                <Badge variant="destructive" className="text-[10px] h-4">Urgent</Badge>
              )}
              {a.is_pinned && (
                <Badge variant="secondary" className="text-[10px] h-4">Pinned</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{a.description}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "PPp")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
