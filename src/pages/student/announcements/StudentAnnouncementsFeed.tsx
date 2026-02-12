import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Pin } from "lucide-react";
import { format } from "date-fns";

export default function StudentAnnouncementsFeed() {
  const query = useQuery({
    queryKey: ["student", "announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" /> Announcements
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Latest updates from your college</p>
      </header>

      {query.data?.length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No announcements at the moment.</CardContent></Card>
      )}

      <div className="space-y-3">
        {query.data?.map((a: any) => (
          <Card key={a.id} className={`border-border/50 ${a.is_pinned ? "border-l-4 border-l-primary" : ""}`}>
            <CardContent className="py-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {a.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                <h3 className="font-medium text-foreground">{a.title}</h3>
                {a.priority === "urgent" && <Badge variant="destructive" className="text-[10px]">Urgent</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{a.description}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "PPp")}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
