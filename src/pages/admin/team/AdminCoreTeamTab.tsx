import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Loader2, UserRound, GripVertical, Eye, EyeOff } from "lucide-react";

interface Member {
  id: string;
  name: string;
  class: string | null;
  designation: string | null;
  photo_url: string | null;
  order_index: number;
  is_active: boolean;
}

const EMPTY: Omit<Member, "id" | "created_at"> = {
  name: "", class: "", designation: "", photo_url: null, order_index: 0, is_active: true,
};

export default function AdminCoreTeamTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("core_team_members")
      .select("*")
      .order("order_index", { ascending: true });
    if (data) setMembers(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY, order_index: members.length }); setOpen(true); };
  const openEdit = (m: Member) => { setEditing(m); setForm({ name: m.name, class: m.class ?? "", designation: m.designation ?? "", photo_url: m.photo_url, order_index: m.order_index, is_active: m.is_active }); setOpen(true); };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Photo must be under 3MB"); return; }
    setPhotoUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `members/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("team-photos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("team-photos").getPublicUrl(path);
      setForm(f => ({ ...f, photo_url: data.publicUrl }));
      toast.success("Photo uploaded.");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        class: form.class?.trim() || null,
        designation: form.designation?.trim() || null,
        photo_url: form.photo_url,
        order_index: form.order_index,
        is_active: form.is_active,
      };
      let err;
      if (editing) {
        ({ error: err } = await (supabase as any).from("core_team_members").update(payload).eq("id", editing.id));
      } else {
        ({ error: err } = await (supabase as any).from("core_team_members").insert(payload));
      }
      if (err) throw err;
      toast.success(editing ? "Member updated." : "Member added.");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this member?")) return;
    await (supabase as any).from("core_team_members").delete().eq("id", id);
    toast.success("Member removed.");
    load();
  };

  const handleToggleActive = async (m: Member) => {
    await (supabase as any).from("core_team_members").update({ is_active: !m.is_active }).eq("id", m.id);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Core Team Manager</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Members shown on the landing page under "Meet Our Core Team".</p>
        </div>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Member
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No team members yet. Add the first one.
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <Card key={m.id} className={`transition-opacity ${m.is_active ? "" : "opacity-50"}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                <div className="w-10 h-10 rounded-full border border-border/40 bg-surface-2 overflow-hidden shrink-0">
                  {m.photo_url
                    ? <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center"><UserRound className="w-5 h-5 text-muted-foreground" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{[m.class, m.designation].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!m.is_active && <Badge variant="outline" className="text-[10px] h-5">Inactive</Badge>}
                  <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => handleToggleActive(m)} title={m.is_active ? "Hide" : "Show"}>
                    {m.is_active ? <Eye className="w-3.5 h-3.5 text-muted-foreground" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEdit(m)}>
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => handleDelete(m.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-danger" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{editing ? "Edit Member" : "Add Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* photo */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full border border-border/40 bg-surface-2 overflow-hidden shrink-0">
                {form.photo_url
                  ? <img src={form.photo_url} alt="preview" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><UserRound className="w-7 h-7 text-muted-foreground" /></div>
                }
              </div>
              <div>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                  onClick={() => photoRef.current?.click()} disabled={photoUploading}>
                  {photoUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {photoUploading ? "Uploading…" : "Upload Photo"}
                </Button>
                <p className="text-[10px] text-muted-foreground mt-1">JPG/PNG, max 3MB</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Full Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-sm" placeholder="Atharv Jadhav" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Class</Label>
                <Input value={form.class ?? ""} onChange={e => setForm(f => ({ ...f, class: e.target.value }))} className="h-9 text-sm" placeholder="FYCS" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Designation</Label>
                <Input value={form.designation ?? ""} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} className="h-9 text-sm" placeholder="Project Lead" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Order Index</Label>
              <Input type="number" value={form.order_index} onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) || 0 }))} className="h-9 text-sm" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                {saving ? "Saving…" : editing ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
