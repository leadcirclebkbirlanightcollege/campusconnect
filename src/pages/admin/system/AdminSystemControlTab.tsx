import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Settings, AlertTriangle, Save } from "lucide-react";
import { invalidatePlatformModeCache, PlatformModeSettings } from "@/hooks/use-platform-mode";

const DEFAULT: PlatformModeSettings = {
  mode: "normal",
  custom_headline: null,
  custom_subtext: null,
  custom_suspense: null,
  estimated_return: null,
};

export default function AdminSystemControlTab() {
  const [settings, setSettings] = useState<PlatformModeSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", "platform_mode")
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (!error && data) setSettings(data.value as PlatformModeSettings);
        setLoading(false);
      });
  }, []);

  const handleToggle = (toggledMode: "semester_closed" | "maintenance") => {
    setSettings((prev) => ({
      ...prev,
      mode: prev.mode === toggledMode ? "normal" : toggledMode,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("platform_settings")
      .upsert({ key: "platform_mode", value: settings, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      invalidatePlatformModeCache();
      toast.success("Platform mode updated successfully");
    }
  };

  const modeLabel =
    settings.mode === "normal"
      ? "Normal"
      : settings.mode === "semester_closed"
      ? "Semester Closed"
      : "Maintenance";

  const modeBadgeVariant =
    settings.mode === "normal"
      ? "secondary"
      : settings.mode === "maintenance"
      ? "destructive"
      : "default";

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Current status */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Platform Mode</h2>
        <Badge variant={modeBadgeVariant}>{modeLabel}</Badge>
      </div>

      {/* Warning when a mode is active */}
      {settings.mode !== "normal" && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>{modeLabel} mode is active.</strong> Normal users are blocked from accessing the app. Admins retain full access.
          </span>
        </div>
      )}

      {/* Toggle Cards */}
      <div className="grid gap-4">
        {/* Semester Closed */}
        <Card className={settings.mode === "semester_closed" ? "border-primary/50 bg-primary/5" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Semester Closed Mode</CardTitle>
              </div>
              <Switch
                checked={settings.mode === "semester_closed"}
                onCheckedChange={() => handleToggle("semester_closed")}
                id="semester-toggle"
              />
            </div>
            <CardDescription>
              Shows a graceful end-of-semester screen to all students. Admins retain full access.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Maintenance */}
        <Card className={settings.mode === "maintenance" ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-base">Maintenance Mode</CardTitle>
              </div>
              <Switch
                checked={settings.mode === "maintenance"}
                onCheckedChange={() => handleToggle("maintenance")}
                id="maintenance-toggle"
              />
            </div>
            <CardDescription>
              Blocks all student access with a maintenance notice. Admins retain full access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Custom messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Custom Messages (Optional)</CardTitle>
          <CardDescription className="text-xs">
            These override the default screen text when a mode is active. Leave blank for defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="headline" className="text-xs">Custom Headline</Label>
            <Input
              id="headline"
              placeholder="e.g. That's All For This Semester 🎓"
              value={settings.custom_headline ?? ""}
              onChange={(e) => setSettings((p) => ({ ...p, custom_headline: e.target.value || null }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subtext" className="text-xs">Custom Subtext</Label>
            <Textarea
              id="subtext"
              rows={2}
              placeholder="e.g. Thank you for being part of this journey..."
              value={settings.custom_subtext ?? ""}
              onChange={(e) => setSettings((p) => ({ ...p, custom_subtext: e.target.value || null }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="suspense" className="text-xs">Suspense Message (Semester Closed)</Label>
            <Input
              id="suspense"
              placeholder="e.g. Something new is coming after exams…"
              value={settings.custom_suspense ?? ""}
              onChange={(e) => setSettings((p) => ({ ...p, custom_suspense: e.target.value || null }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eta" className="text-xs">Estimated Return Time (Maintenance)</Label>
            <Input
              id="eta"
              placeholder="e.g. Monday, 9 June at 10:00 AM"
              value={settings.estimated_return ?? ""}
              onChange={(e) => setSettings((p) => ({ ...p, estimated_return: e.target.value || null }))}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" />
        {saving ? "Saving…" : "Save Platform Mode"}
      </Button>
    </div>
  );
}
