import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentDailyContent() {
  const today = new Date().toISOString().split("T")[0];

  const query = useQuery({
    queryKey: ["student", "daily_content", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_content")
        .select("id,title,body,content_type,publish_date,image_url")
        .eq("is_active", true)
        .order("publish_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {query.data?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nothing published today. Check back later.
          </CardContent>
        </Card>
      )}

      {query.data?.map((c: any) => (
        <Card key={c.id}>
          <CardContent className="py-6 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-[10px]">
                {c.content_type === "meme" ? "Meme of the Day" : "Daily Suvichar"}
              </Badge>
              {c.publish_date && (
                <span className="text-xs text-muted-foreground">{c.publish_date}</span>
              )}
            </div>
            {c.title && <h3 className="text-base font-medium text-foreground">{c.title}</h3>}
            {c.body && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                "{c.body}"
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
