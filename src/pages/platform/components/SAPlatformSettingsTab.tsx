import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SlideUp, FadeIn } from "@/components/ui/motion";
import { toast } from "sonner";
import { Settings2, Save, RotateCcw, Clock, Key, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Setting = { key: string; value: unknown; updated_at: string };

const SETTING_DESCRIPTIONS: Record<string, { label: string; description: string; type: string }> = {
  max_students_per_college: { label: "Max Students / College", description: "Maximum students allowed per college", type: "number" },
  attendance_grace_minutes: { label: "Attendance Grace (mins)", description: "Extra minutes after lecture start to allow marking", type: "number" },
  default_points_per_lecture: { label: "Points per Lecture", description: "Default attendance points per lecture", type: "number" },
  platform_mode: { label: "Platform Mode", description: "Current operational mode of the platform", type: "text" },
  event_theme: { label: "Event Theme", description: "Active visual theme override", type: "text" },
  attendance_window_minutes: { label: "Attendance Window (mins)", description: "Total window to mark attendance after go-live", type: "number" },
  max_otp_attempts: { label: "Max OTP Attempts", description: "Max failed OTP attempts before lockout", type: "number" },
  leaderboard_enabled: { label: "Leaderboard Enabled", description: "Show/hide leaderboard from students", type: "text" },
};

function SettingRow({ setting, onSave }: { setting: Setting; onSave: (key: string, val: string) => void }) {
  const meta = SETTING_DESCRIPTIONS[setting.key] ?? { label: setting.key, description: "Custom setting", type: "text" };
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(setting.value ?? ""));

  useEffect(() => { setVal(String(setting.value ?? "")); }, [setting.value]);

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border-subtle last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground">{meta.label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
        <span className="text-[10px] font-mono text-muted-foreground/60">{setting.key}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <Input
              value={val}
              onChange={e => setVal(e.target.value)}
              type={meta.type}
              className="w-36 h-8 text-xs bg-background border-border-subtle"
              onKeyDown={e => {
                if (e.key === "Enter") { onSave(setting.key, val); setEditing(false); }
                if (e.key === "Escape") { setVal(String(setting.value ?? "")); setEditing(false); }
              }}
              autoFocus
            />
            <Button size="sm" className="h-8 px-2 text-xs gap-1" onClick={() => { onSave(setting.key, val); setEditing(false); }}>
              <Save className="w-3 h-3" /> Save
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => { setVal(String(setting.value ?? "")); setEditing(false); }}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <>
            <Badge variant="secondary" className="font-mono text-xs">{String(setting.value ?? "—")}</Badge>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SAPlatformSettingsTab() {
  const qc = useQueryClient();
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const { data: settings = [], isLoading } = useQuery<Setting[]>({
    queryKey: ["sa_platform_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("key, value, updated_at").order("key");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const upsertSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("platform_settings").upsert(
        [{ key, value: value as import("@/integrations/supabase/types").Json, updated_by: user?.id, updated_at: new Date().toISOString() }],
        { onConflict: "key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Setting updated");
      qc.invalidateQueries({ queryKey: ["sa_platform_settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = (key: string, rawVal: string) => {
    const num = Number(rawVal);
    const parsed = !isNaN(num) && rawVal.trim() !== "" ? num : rawVal;
    upsertSetting.mutate({ key, value: parsed });
  };

  const handleAddNew = () => {
    if (!newKey.trim() || !newVal.trim()) return toast.error("Key and value are required");
    handleSave(newKey.trim(), newVal.trim());
    setNewKey("");
    setNewVal("");
  };

  const latestUpdate = settings.length > 0
    ? settings.reduce((a, b) => new Date(a.updated_at) > new Date(b.updated_at) ? a : b)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Platform Settings</h2>
            <p className="text-xs text-muted-foreground">
              {settings.length} configuration keys
              {latestUpdate && (
                <span className="ml-2 flex-inline items-center gap-1">
                  · last updated {formatDistanceToNow(new Date(latestUpdate.updated_at), { addSuffix: true })}
                </span>
              )}
            </p>
          </div>
          <Badge variant="secondary" className="gap-1 text-xs">
            <Settings2 className="w-3 h-3" />
            {settings.length} keys
          </Badge>
        </div>
      </FadeIn>

      {/* Settings table */}
      <SlideUp>
        <Card className="bg-surface-1 border-border-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded bg-surface-2 animate-pulse" />)}
              </div>
            ) : settings.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No settings configured yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Add your first setting below.</p>
              </div>
            ) : (
              <div>
                {settings.map((s, i) => (
                  <SlideUp key={s.key} delay={i * 0.03}>
                    <SettingRow setting={s} onSave={handleSave} />
                  </SlideUp>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </SlideUp>

      {/* Add new setting */}
      <SlideUp delay={0.08}>
        <Card className="bg-surface-1 border-border-subtle border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Add New Setting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px] space-y-1.5">
                <Label className="text-xs">Key</Label>
                <Input
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="e.g. max_students_per_college"
                  className="bg-background border-border-subtle font-mono text-xs"
                />
              </div>
              <div className="flex-1 min-w-[120px] space-y-1.5">
                <Label className="text-xs">Value</Label>
                <Input
                  value={newVal}
                  onChange={e => setNewVal(e.target.value)}
                  placeholder="e.g. 5000"
                  className="bg-background border-border-subtle text-xs"
                />
              </div>
              <div className="flex items-end">
                <Button
                  size="sm"
                  className="gap-1.5 h-9"
                  onClick={handleAddNew}
                  disabled={!newKey.trim() || !newVal.trim() || upsertSetting.isPending}
                >
                  <Save className="w-3.5 h-3.5" />
                  Add Setting
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              <Clock className="w-3 h-3 inline mr-1" />
              Numeric values are stored as numbers; text values as strings.
            </p>
          </CardContent>
        </Card>
      </SlideUp>
    </div>
  );
}
