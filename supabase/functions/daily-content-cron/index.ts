import { createClient } from "npm:@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  try {
    const today = new Date().toISOString().slice(0, 10);

    // Deactivate yesterday's content
    await db
      .from("daily_content")
      .update({ is_active: false })
      .eq("is_active", true)
      .lt("publish_date", today);

    // Check if today already has active content
    const { data: existing } = await db
      .from("daily_content")
      .select("id")
      .eq("publish_date", today)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      console.log("daily-content-cron: today already has active content");
      return json(200, { success: true, message: "Already published today" });
    }

    // Get content not published in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

    const { data: candidates } = await db
      .from("daily_content")
      .select("id")
      .eq("is_active", false)
      .or(`publish_date.is.null,publish_date.lt.${cutoff}`);

    if (!candidates || candidates.length === 0) {
      // Fallback: pick the oldest inactive content
      const { data: fallback } = await db
        .from("daily_content")
        .select("id")
        .eq("is_active", false)
        .order("publish_date", { ascending: true, nullsFirst: true })
        .limit(1);

      if (!fallback || fallback.length === 0) {
        console.log("daily-content-cron: no content available");
        return json(200, { success: true, message: "No content available" });
      }

      await db
        .from("daily_content")
        .update({ is_active: true, publish_date: today })
        .eq("id", fallback[0].id);

      console.log("daily-content-cron: published fallback", fallback[0].id);
      return json(200, { success: true, published: fallback[0].id, fallback: true });
    }

    // Random selection
    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    await db
      .from("daily_content")
      .update({ is_active: true, publish_date: today })
      .eq("id", pick.id);

    console.log("daily-content-cron: published", pick.id);
    return json(200, { success: true, published: pick.id });
  } catch (error) {
    console.error("daily-content-cron: error", error);
    return json(500, { success: false, error: "Internal error" });
  }
});
