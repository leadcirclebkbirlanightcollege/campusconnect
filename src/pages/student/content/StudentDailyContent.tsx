import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Smile } from "lucide-react";

export default function StudentDailyContent() {
  const today = new Date().toISOString().split("T")[0];

  const query = useQuery({
    queryKey: ["student", "daily_content", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_content")
        .select("*")
        .eq("is_active", true)
        .order("publish_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-premium" /> Daily Inspiration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Meme of the Day & Daily Suvichar</p>
      </header>

      {query.data?.length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nothing published today. Check back later!</CardContent></Card>
      )}

      <div className="space-y-4">
        {query.data?.map((c: any) => (
          <Card key={c.id} className="border-border/50">
            <CardContent className="py-6 text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                {c.content_type === "meme" ? <Smile className="h-5 w-5 text-accent" /> : <Sparkles className="h-5 w-5 text-premium" />}
                <Badge variant="secondary" className="text-[10px]">{c.content_type === "meme" ? "Meme of the Day" : "Daily Suvichar"}</Badge>
              </div>
              {c.title && <h3 className="text-lg font-semibold text-foreground">{c.title}</h3>}
              {c.body && <p className="text-base text-muted-foreground italic leading-relaxed max-w-md mx-auto">"{c.body}"</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
