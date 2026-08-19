import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, RotateCcw, Upload, Image as ImageIcon, ExternalLink } from "@/components/icons";
import { DEFAULT_LANDING_CONTENT, LANDING_ICONS, LandingContent, LandingIconName, mergeLandingContent } from "@/config/landing-content";

type Json = LandingContent | Record<string, unknown>;

function TextField({ label, value, onChange, multiline, placeholder }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-h-[70px] text-sm" />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="text-sm" />
      )}
    </div>
  );
}

function IconSelect({ value, onChange }: { value: LandingIconName; onChange: (v: LandingIconName) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Icon</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LandingIconName)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {LANDING_ICONS.map((i) => (<option key={i} value={i}>{i}</option>))}
      </select>
    </div>
  );
}

export default function LandingContentEditor() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: serverContent, isLoading } = useQuery({
    queryKey: ["sa_landing_content"],
    queryFn: async (): Promise<LandingContent> => {
      const { data, error } = await supabase.from("platform_settings").select("value").eq("key", "landing_content").maybeSingle();
      if (error) throw error;
      return mergeLandingContent(data?.value as Partial<LandingContent> | null);
    },
  });

  const [draft, setDraft] = useState<LandingContent>(DEFAULT_LANDING_CONTENT);
  useEffect(() => { if (serverContent) setDraft(serverContent); }, [serverContent]);

  const save = useMutation({
    mutationFn: async (val: LandingContent) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("platform_settings").upsert(
        [{ key: "landing_content", value: val as unknown as Json, updated_by: user?.id, updated_at: new Date().toISOString() } as any],
        { onConflict: "key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Landing page saved");
      qc.invalidateQueries({ queryKey: ["sa_landing_content"] });
      qc.invalidateQueries({ queryKey: ["landing_content"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `landing/hero-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("lecture-flyers").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("lecture-flyers").getPublicUrl(path);
      setDraft((d) => ({ ...d, hero: { ...d.hero, imageUrl: data.publicUrl } }));
      toast.success("Image uploaded — remember to Save");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const updateHero = (patch: Partial<LandingContent["hero"]>) => setDraft((d) => ({ ...d, hero: { ...d.hero, ...patch } }));
  const updateHeader = (patch: Partial<LandingContent["header"]>) => setDraft((d) => ({ ...d, header: { ...d.header, ...patch } }));
  const updateFinalCta = (patch: Partial<LandingContent["finalCta"]>) => setDraft((d) => ({ ...d, finalCta: { ...d.finalCta, ...patch } }));

  return (
    <div className="space-y-5 pb-12">
      <div className="sticky top-0 z-20 -mx-4 flex items-center justify-between gap-3 border-b border-border-subtle bg-background/90 px-4 py-3 backdrop-blur">
        <div>
          <h2 className="text-base font-semibold">Landing Page Editor</h2>
          <p className="text-xs text-muted-foreground">Every section of the public homepage. Saves go live immediately.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => window.open("/", "_blank")}><ExternalLink className="mr-1 h-3.5 w-3.5" /> Preview</Button>
          <Button variant="outline" size="sm" onClick={() => setDraft(DEFAULT_LANDING_CONTENT)}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset</Button>
          <Button size="sm" onClick={() => save.mutate(draft)} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />} Save
          </Button>
        </div>
      </div>

      {/* HEADER */}
      <Card><CardHeader><CardTitle className="text-sm">Header</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <TextField label="Tagline (under brand name)" value={draft.header.tagline} onChange={(v) => updateHeader({ tagline: v })} />
          <TextField label="Header CTA Button" value={draft.header.ctaLabel} onChange={(v) => updateHeader({ ctaLabel: v })} />
        </CardContent>
      </Card>

      {/* HERO */}
      <Card><CardHeader><CardTitle className="text-sm">Hero</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Badge text" value={draft.hero.badge} onChange={(v) => updateHero({ badge: v })} />
            <TextField label="Title — line 1" value={draft.hero.titleLine1} onChange={(v) => updateHero({ titleLine1: v })} />
            <TextField label="Title — line 2" value={draft.hero.titleLine2} onChange={(v) => updateHero({ titleLine2: v })} />
            <TextField label="Subtitle" value={draft.hero.subtitle} onChange={(v) => updateHero({ subtitle: v })} multiline />
            <TextField label="Primary CTA label" value={draft.hero.primaryCtaLabel} onChange={(v) => updateHero({ primaryCtaLabel: v })} />
            <TextField label="Secondary CTA label" value={draft.hero.secondaryCtaLabel} onChange={(v) => updateHero({ secondaryCtaLabel: v })} />
          </div>
          <div className="space-y-2 rounded-lg border border-dashed border-border-subtle p-3">
            <Label className="text-xs flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Hero image</Label>
            {draft.hero.imageUrl ? (
              <img src={draft.hero.imageUrl} alt="hero preview" className="h-40 w-full rounded-md object-cover" />
            ) : (
              <p className="text-xs text-muted-foreground">Using bundled default image.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
              <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />} Upload
              </Button>
              {draft.hero.imageUrl && (
                <Button size="sm" variant="ghost" onClick={() => updateHero({ imageUrl: null })}>Use default</Button>
              )}
              <Input placeholder="…or paste image URL" value={draft.hero.imageUrl ?? ""} onChange={(e) => updateHero({ imageUrl: e.target.value || null })} className="flex-1 min-w-[200px] text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <ListSection
        title="KPI Strip (4 stats recommended)"
        items={draft.kpis}
        onChange={(items) => setDraft((d) => ({ ...d, kpis: items }))}
        empty={{ label: "", value: "" }}
        render={(item, set) => (
          <>
            <TextField label="Label" value={item.label} onChange={(v) => set({ ...item, label: v })} />
            <TextField label="Value" value={item.value} onChange={(v) => set({ ...item, value: v })} />
          </>
        )}
      />

      {/* BENEFITS */}
      <HeadingFields title="Benefits — section heading" eyebrow={draft.benefitsHeading.eyebrow} headline={draft.benefitsHeading.title}
        onEyebrow={(v) => setDraft((d) => ({ ...d, benefitsHeading: { ...d.benefitsHeading, eyebrow: v } }))}
        onHeadline={(v) => setDraft((d) => ({ ...d, benefitsHeading: { ...d.benefitsHeading, title: v } }))} />
      <ListSection
        title="Benefits cards"
        items={draft.benefits}
        onChange={(items) => setDraft((d) => ({ ...d, benefits: items }))}
        empty={{ icon: "Sparkles" as LandingIconName, title: "", description: "", stat: "" }}
        render={(item, set) => (
          <>
            <IconSelect value={item.icon} onChange={(v) => set({ ...item, icon: v })} />
            <TextField label="Title" value={item.title} onChange={(v) => set({ ...item, title: v })} />
            <div className="md:col-span-2"><TextField label="Description" value={item.description} onChange={(v) => set({ ...item, description: v })} multiline /></div>
            <TextField label="Stat badge (optional)" value={item.stat} onChange={(v) => set({ ...item, stat: v })} />
          </>
        )}
      />

      {/* SOCIAL PROOF */}
      <Card><CardHeader><CardTitle className="text-sm">Social Proof — "Built Using Real Student Feedback"</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <TextField label="Eyebrow" value={draft.socialProof.eyebrow} onChange={(v) => setDraft((d) => ({ ...d, socialProof: { ...d.socialProof, eyebrow: v } }))} />
          <TextField label="Headline" value={draft.socialProof.title} onChange={(v) => setDraft((d) => ({ ...d, socialProof: { ...d.socialProof, title: v } }))} />
          <div className="md:col-span-2"><TextField label="Description" value={draft.socialProof.description} onChange={(v) => setDraft((d) => ({ ...d, socialProof: { ...d.socialProof, description: v } }))} multiline /></div>
          <div className="md:col-span-2"><TextField label="Bullets (one per line)" value={draft.socialProof.bullets.join("\n")} onChange={(v) => setDraft((d) => ({ ...d, socialProof: { ...d.socialProof, bullets: v.split("\n").map(s => s.trim()).filter(Boolean) } }))} multiline /></div>
        </CardContent>
      </Card>

      {/* FEATURES */}
      <HeadingFields title="Features — section heading" eyebrow={draft.featuresHeading.eyebrow} headline={draft.featuresHeading.title}
        onEyebrow={(v) => setDraft((d) => ({ ...d, featuresHeading: { ...d.featuresHeading, eyebrow: v } }))}
        onHeadline={(v) => setDraft((d) => ({ ...d, featuresHeading: { ...d.featuresHeading, title: v } }))} />
      <ListSection
        title="Feature cards"
        items={draft.features}
        onChange={(items) => setDraft((d) => ({ ...d, features: items }))}
        empty={{ icon: "Sparkles" as LandingIconName, label: "", description: "" }}
        render={(item, set) => (
          <>
            <IconSelect value={item.icon} onChange={(v) => set({ ...item, icon: v })} />
            <TextField label="Label" value={item.label} onChange={(v) => set({ ...item, label: v })} />
            <div className="md:col-span-2"><TextField label="Short description" value={item.description ?? ""} onChange={(v) => set({ ...item, description: v })} /></div>
          </>
        )}
      />

      {/* ENTREPRENEURSHIP */}
      <Card><CardHeader><CardTitle className="text-sm">Entrepreneurship (E-Cell) Section</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <TextField label="Eyebrow" value={draft.entrepreneurship.eyebrow} onChange={(v) => setDraft((d) => ({ ...d, entrepreneurship: { ...d.entrepreneurship, eyebrow: v } }))} />
          <TextField label="Headline" value={draft.entrepreneurship.title} onChange={(v) => setDraft((d) => ({ ...d, entrepreneurship: { ...d.entrepreneurship, title: v } }))} />
          <div className="md:col-span-2"><TextField label="Description" value={draft.entrepreneurship.description} onChange={(v) => setDraft((d) => ({ ...d, entrepreneurship: { ...d.entrepreneurship, description: v } }))} multiline /></div>
        </CardContent>
      </Card>

      {/* ADMIN / INSTITUTIONS */}
      <Card><CardHeader><CardTitle className="text-sm">Institutions Section — "Powerful Controls For Colleges"</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <TextField label="Eyebrow" value={draft.adminSection.eyebrow} onChange={(v) => setDraft((d) => ({ ...d, adminSection: { ...d.adminSection, eyebrow: v } }))} />
          <TextField label="Headline" value={draft.adminSection.title} onChange={(v) => setDraft((d) => ({ ...d, adminSection: { ...d.adminSection, title: v } }))} />
          <div className="md:col-span-2"><TextField label="Features (one per line)" value={draft.adminSection.features.join("\n")} onChange={(v) => setDraft((d) => ({ ...d, adminSection: { ...d.adminSection, features: v.split("\n").map(s => s.trim()).filter(Boolean) } }))} multiline /></div>
        </CardContent>
      </Card>

      {/* FEEDBACK */}
      <Card><CardHeader><CardTitle className="text-sm">Community Feedback Section</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <TextField label="Eyebrow" value={draft.feedbackSection.eyebrow} onChange={(v) => setDraft((d) => ({ ...d, feedbackSection: { ...d.feedbackSection, eyebrow: v } }))} />
          <TextField label="Headline" value={draft.feedbackSection.title} onChange={(v) => setDraft((d) => ({ ...d, feedbackSection: { ...d.feedbackSection, title: v } }))} />
          <div className="md:col-span-2"><TextField label="Description" value={draft.feedbackSection.description} onChange={(v) => setDraft((d) => ({ ...d, feedbackSection: { ...d.feedbackSection, description: v } }))} multiline /></div>
        </CardContent>
      </Card>

      {/* TESTIMONIALS */}
      <HeadingFields title="Testimonials — section heading" eyebrow={draft.testimonialsHeading.eyebrow} headline={draft.testimonialsHeading.title}
        onEyebrow={(v) => setDraft((d) => ({ ...d, testimonialsHeading: { ...d.testimonialsHeading, eyebrow: v } }))}
        onHeadline={(v) => setDraft((d) => ({ ...d, testimonialsHeading: { ...d.testimonialsHeading, title: v } }))} />
      <ListSection
        title="Testimonials"
        items={draft.testimonials}
        onChange={(items) => setDraft((d) => ({ ...d, testimonials: items }))}
        empty={{ name: "", role: "", quote: "", rating: 5 }}
        render={(item, set) => (
          <>
            <TextField label="Name" value={item.name} onChange={(v) => set({ ...item, name: v })} />
            <TextField label="Role / institution" value={item.role} onChange={(v) => set({ ...item, role: v })} />
            <div className="md:col-span-2"><TextField label="Quote" value={item.quote} onChange={(v) => set({ ...item, quote: v })} multiline /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Star rating (1–5)</Label>
              <Input type="number" min={1} max={5} value={item.rating} onChange={(e) => set({ ...item, rating: Math.max(1, Math.min(5, Number(e.target.value) || 5)) })} />
            </div>
          </>
        )}
      />

      {/* FINAL CTA */}
      <Card><CardHeader><CardTitle className="text-sm">Final Call-to-Action</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <TextField label="Eyebrow" value={draft.finalCta.eyebrow} onChange={(v) => updateFinalCta({ eyebrow: v })} />
          <TextField label="Title" value={draft.finalCta.title} onChange={(v) => updateFinalCta({ title: v })} />
          <div className="md:col-span-2"><TextField label="Description" value={draft.finalCta.description} onChange={(v) => updateFinalCta({ description: v })} multiline /></div>
          <TextField label="Primary button label" value={draft.finalCta.primaryLabel} onChange={(v) => updateFinalCta({ primaryLabel: v })} />
          <TextField label="Secondary button label" value={draft.finalCta.secondaryLabel} onChange={(v) => updateFinalCta({ secondaryLabel: v })} />
        </CardContent>
      </Card>

      {/* FOOTER */}
      <ListSection
        title="Footer links"
        items={draft.footerLinks}
        onChange={(items) => setDraft((d) => ({ ...d, footerLinks: items }))}
        empty={{ label: "", href: "/" }}
        render={(item, set) => (
          <>
            <TextField label="Label" value={item.label} onChange={(v) => set({ ...item, label: v })} />
            <TextField label="Link (e.g. /privacy or https://…)" value={item.href} onChange={(v) => set({ ...item, href: v })} />
          </>
        )}
      />

      <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
        <Button variant="outline" onClick={() => serverContent && setDraft(serverContent)}>Discard changes</Button>
        <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />} Save all changes
        </Button>
      </div>
    </div>
  );
}

function HeadingFields({ title, eyebrow, headline, onEyebrow, onHeadline }: { title: string; eyebrow: string; headline: string; onEyebrow: (v: string) => void; onHeadline: (v: string) => void }) {
  return (
    <Card><CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <TextField label="Eyebrow (small uppercase text)" value={eyebrow} onChange={onEyebrow} />
        <TextField label="Headline" value={headline} onChange={onHeadline} />
      </CardContent>
    </Card>
  );
}

function ListSection<T>({
  title, items, onChange, empty, render,
}: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  empty: T;
  render: (item: T, set: (v: T) => void) => React.ReactNode;
}) {
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="relative grid gap-3 rounded-lg border border-border-subtle bg-surface-1/40 p-3 md:grid-cols-2">
            {render(item, (v) => onChange(items.map((it, i) => (i === idx ? v : it))))}
            <div className="md:col-span-2 flex justify-end">
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onChange(items.filter((_, i) => i !== idx))}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
              </Button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...items, structuredClone(empty)])}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </CardContent>
    </Card>
  );
}
