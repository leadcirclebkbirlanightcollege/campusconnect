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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Settings, AlertTriangle, Save, Rocket, Palette, RefreshCw, Zap } from "lucide-react";
import { useState as useLocalState } from "react";
import { APP_VERSION } from "@/config/version";
import { invalidatePlatformModeCache, PlatformModeSettings } from "@/hooks/use-platform-mode";

const DEFAULT: PlatformModeSettings = {
  mode: "normal",
  custom_headline: null,
  custom_subtext: null,
  custom_suspense: null,
  estimated_return: null,
  event_theme: null,
  launch_date: null,
};

export default function AdminSystemControlTab() {
  const [settings, setSettings] = useState<PlatformModeSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fuMessage, setFuMessage] = useLocalState("");
  const [fuPushing, setFuPushing] = useLocalState(false);

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

  const handleToggle = (toggledMode: "semester_closed" | "maintenance" | "launch") => {
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
    settings.mode === "normal" ? "Normal" :
    settings.mode === "semester_closed" ? "Semester Closed" :
    settings.mode === "launch" ? "Launch" : "Maintenance";

  const modeBadgeVariant =
    settings.mode === "normal" ? "secondary" :
    settings.mode === "maintenance" ? "destructive" :
    settings.mode === "launch" ? "default" : "default";

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

        {/* Launch Mode */}
        <Card className={settings.mode === "launch" ? "border-primary/50 bg-primary/5" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Launch Mode</CardTitle>
              </div>
              <Switch
                checked={settings.mode === "launch"}
                onCheckedChange={() => handleToggle("launch")}
                id="launch-toggle"
              />
            </div>
            <CardDescription>
              Shows a teaser countdown screen to students. Use before a major release. Admins retain full access.
            </CardDescription>
          </CardHeader>
          {settings.mode === "launch" && (
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                <Label htmlFor="launch-date" className="text-xs">Launch Date &amp; Time (optional)</Label>
                <Input
                  id="launch-date"
                  type="datetime-local"
                  value={settings.launch_date ?? ""}
                  onChange={(e) => setSettings((p) => ({ ...p, launch_date: e.target.value || null }))}
                />
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Event Theme */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">Event Theme</CardTitle>
          </div>
          <CardDescription>
            Applies a live UI color theme for special events. Does not block any routes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.event_theme ?? "none"}
            onValueChange={(v) => setSettings((p) => ({ ...p, event_theme: v === "none" ? null : v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No event theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="fest">Fest 🎉</SelectItem>
              <SelectItem value="annual_day">Annual Day 🏆</SelectItem>
              <SelectItem value="tech_week">Tech Week 💻</SelectItem>
              <SelectItem value="exam">Exam 📚</SelectItem>
              <SelectItem value="diwali">Diwali 🪔</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

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

      {/* ── Force Update ─────────────────────────────────────── */}
      <Card className="border-danger/20 bg-danger/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-danger/15 flex items-center justify-center">
              <RefreshCw className="h-4 w-4 text-danger" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">Push Force Update</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Instantly refreshes all active student sessions to load the latest version.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/10 p-2.5">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-[11px] text-warning leading-relaxed">
              This will immediately interrupt active sessions and force all students to reload.
              Use only after deploying a critical update.
            </p>
          </div>
          <div>
            <Label htmlFor="fu-msg" className="text-xs text-muted-foreground mb-1.5 block">
              Optional message to students
            </Label>
            <Input
              id="fu-msg"
              value={fuMessage}
              onChange={(e) => setFuMessage(e.target.value)}
              placeholder="e.g. Critical security update applied. Please reload."
              className="text-xs"
              maxLength={120}
            />
          </div>
          <Button
            variant="destructive"
            className="w-full gap-2"
            disabled={fuPushing}
            onClick={async () => {
              setFuPushing(true);
              const payload = {
                triggered_at: new Date().toISOString(),
                version: APP_VERSION,
                message: fuMessage.trim() || undefined,
              };
              const { error } = await (supabase as any)
                .from("platform_settings")
                .upsert({
                  key: "force_update",
                  value: payload,
                  updated_at: new Date().toISOString(),
                });
              setFuPushing(false);
              if (error) {
                toast.error("Failed: " + error.message);
              } else {
                setFuMessage("");
                toast.success("Force update pushed — all student sessions will refresh within 30s.");
              }
            }}
          >
            <Zap className="h-4 w-4" />
            {fuPushing ? "Pushing…" : "Push Force Update Now"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
