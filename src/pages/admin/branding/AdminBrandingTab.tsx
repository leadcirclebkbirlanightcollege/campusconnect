import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invalidateBrandingCache } from "@/hooks/use-platform-branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Upload, GraduationCap } from "lucide-react";

export default function AdminBrandingTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("Campus Connect");
  const [tagline, setTagline] = useState("By Students For Students");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (supabase as any)
      .from("platform_branding")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setRowId(data.id);
          setBrandName(data.brand_name ?? "Campus Connect");
          setTagline(data.tagline ?? "By Students For Students");
          setLogoUrl(data.logo_url ?? null);
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { brand_name: brandName, tagline, logo_url: logoUrl, updated_at: new Date().toISOString() };
      let err;
      if (rowId) {
        ({ error: err } = await (supabase as any).from("platform_branding").update(payload).eq("id", rowId));
      } else {
        ({ error: err } = await (supabase as any).from("platform_branding").insert(payload));
      }
      if (err) throw err;
      invalidateBrandingCache();
      toast.success("Branding saved — refresh to see live changes.");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save branding.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `logo/brand-logo.${ext}`;
      const { error } = await supabase.storage.from("team-photos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("team-photos").getPublicUrl(path);
      setLogoUrl(data.publicUrl + "?t=" + Date.now());
      toast.success("Logo uploaded — save to apply.");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed.");
    } finally {
      setLogoUploading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-base font-semibold text-foreground">Brand Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Customize the platform identity across the app, landing, and sidebar.</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm">Logo</CardTitle>
          <CardDescription className="text-xs">Displayed in sidebar, landing hero, and intro screen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-border/50 bg-surface-2 flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl
                ? <img src={logoUrl} alt="logo" className="w-12 h-12 object-contain" />
                : <GraduationCap className="w-8 h-8 text-primary" />
              }
            </div>
            <div className="space-y-2">
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                {logoUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {logoUploading ? "Uploading…" : "Upload Logo"}
              </Button>
              <p className="text-[10px] text-muted-foreground">PNG or SVG, max 2MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm">Brand Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Brand Name</Label>
            <Input value={brandName} onChange={e => setBrandName(e.target.value)} className="h-9 text-sm" placeholder="Campus Connect" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tagline</Label>
            <Input value={tagline} onChange={e => setTagline(e.target.value)} className="h-9 text-sm" placeholder="By Students For Students" />
            <p className="text-[10px] text-muted-foreground">Displayed in small uppercase below brand name.</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="h-9 gap-2 text-sm">
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {saving ? "Saving…" : "Save Branding"}
      </Button>
    </div>
  );
}
