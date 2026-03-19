import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FadeIn, SlideUp } from "@/components/ui/motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Building2, Plus, Pencil, UserPlus, Trash2, Mail, ShieldCheck, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { useCollegeContext } from "@/contexts/CollegeContext";
import { ALL_FEATURES, FEATURE_LABELS, FEATURE_DESCRIPTIONS, type FeatureKey } from "@/hooks/use-feature-gate";

// ── Types ──────────────────────────────────────────────────────────────────
type College = {
  id: string;
  college_name: string;
  subdomain: string | null;
  logo_url: string | null;
  tagline: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  is_active: boolean;
  created_at: string;
  enabled_features: string[];
};

// ── Feature Selector ─────────────────────────────────────────────────────────
function FeatureSelector({ value, onChange }: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (f: FeatureKey) => {
    onChange(value.includes(f) ? value.filter(x => x !== f) : [...value, f]);
  };
  const allOn = ALL_FEATURES.every(f => value.includes(f));
  const toggleAll = () => onChange(allOn ? [] : [...ALL_FEATURES]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Enabled Features</Label>
        <button type="button" onClick={toggleAll} className="text-xs text-primary hover:underline">
          {allOn ? "Disable all" : "Enable all"}
        </button>
      </div>
      <div className="rounded-xl border border-border-subtle overflow-hidden">
        <ScrollArea className="h-52">
          <div className="p-1">
            {ALL_FEATURES.map(f => (
              <label key={f} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${value.includes(f) ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                <Checkbox
                  checked={value.includes(f)}
                  onCheckedChange={() => toggle(f)}
                  className="mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{FEATURE_LABELS[f]}</span>
                    {value.includes(f) && <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{FEATURE_DESCRIPTIONS[f]}</p>
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {value.length} of {ALL_FEATURES.length} features enabled
      </p>
    </div>
  );
}

// ── College Form Dialog ──────────────────────────────────────────────────────
const DEFAULT_FEATURES: string[] = [...ALL_FEATURES];

export function CollegeFormDialog({
  open, onClose, editing
}: { open: boolean; onClose: () => void; editing: College | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    college_name: "",
    subdomain: "",
    tagline: "",
    primary_color: "#6366f1",
    secondary_color: "#8b5cf6",
    enabled_features: DEFAULT_FEATURES as string[],
  });

  // Sync form when editing changes
  useEffect(() => {
    if (editing) {
      setForm({
        college_name: editing.college_name ?? "",
        subdomain: editing.subdomain ?? "",
        tagline: editing.tagline ?? "",
        primary_color: editing.primary_color ?? "#6366f1",
        secondary_color: editing.secondary_color ?? "#8b5cf6",
        enabled_features: editing.enabled_features?.length ? editing.enabled_features : DEFAULT_FEATURES,
      });
    } else {
      setForm({
        college_name: "",
        subdomain: "",
        tagline: "",
        primary_color: "#6366f1",
        secondary_color: "#8b5cf6",
        enabled_features: DEFAULT_FEATURES,
      });
    }
  }, [editing, open]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        college_name: form.college_name.trim(),
        subdomain: form.subdomain.trim() || null,
        tagline: form.tagline.trim() || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        enabled_features: form.enabled_features,
        updated_at: new Date().toISOString(),
      };
      if (editing) {
        const { error } = await supabase.from("colleges").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("colleges").insert({ ...payload, is_active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "College updated" : "College created");
      qc.invalidateQueries({ queryKey: ["super_admin"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-surface-1 border-border-subtle max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {editing ? "Edit College" : "Add College"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-1.5">
              <Label>College Name *</Label>
              <Input value={form.college_name} onChange={e => setForm(p => ({ ...p, college_name: e.target.value }))} placeholder="e.g. Mumbai University" />
            </div>
            <div className="space-y-1.5">
              <Label>Subdomain</Label>
              <Input value={form.subdomain} onChange={e => setForm(p => ({ ...p, subdomain: e.target.value }))} placeholder="e.g. mumbai" />
            </div>
            <div className="space-y-1.5">
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={e => setForm(p => ({ ...p, tagline: e.target.value }))} placeholder="e.g. Excellence in Education" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} className="h-9 w-12 rounded border border-border-subtle cursor-pointer bg-transparent" />
                  <Input value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} className="font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Accent Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))} className="h-9 w-12 rounded border border-border-subtle cursor-pointer bg-transparent" />
                  <Input value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))} className="font-mono text-xs" />
                </div>
              </div>
            </div>

            {/* Feature selector — the core white-label control */}
            <div className="pt-1">
              <FeatureSelector
                value={form.enabled_features}
                onChange={v => setForm(p => ({ ...p, enabled_features: v }))}
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="pt-2 border-t border-border-subtle">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.college_name.trim()}>
            {save.isPending ? "Saving…" : editing ? "Save Changes" : "Create College"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CollegeAdmin = {
  user_id: string;
  college_id: string | null;
  college_name: string | null;
  name: string | null;
  email: string | null;
  created_at: string;
};

// ── Create Admin Dialog ──────────────────────────────────────────────────────

function CreateAdminDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { colleges } = useCollegeContext();
  const [form, setForm] = useState({ name: "", email: "", college_id: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || !form.email.trim() || !form.college_id) {
        throw new Error("All fields are required");
      }
      const { data, error } = await supabase.functions.invoke("super-admin-create-admin", {
        body: { name: form.name.trim(), email: form.email.trim().toLowerCase(), college_id: form.college_id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("College admin created — default password: admin123");
      toast.message("Remind the admin to change their password after first login.");
      qc.invalidateQueries({ queryKey: ["super_admin", "admins"] });
      setForm({ name: "", email: "", college_id: "" });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-surface-1 border-border-subtle max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Create College Admin
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Priya Sharma" />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="admin@college.edu" />
          </div>
          <div className="space-y-1.5">
            <Label>Assign College *</Label>
            <Select value={form.college_id} onValueChange={v => setForm(p => ({ ...p, college_id: v }))}>
              <SelectTrigger className="bg-background border-border-subtle">
                <SelectValue placeholder="Select college…" />
              </SelectTrigger>
              <SelectContent className="bg-surface-1 border-border-subtle">
                {colleges.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.college_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">Default password will be <strong>admin123</strong>. Admin should change it immediately.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !form.name.trim() || !form.email.trim() || !form.college_id}>
            {create.isPending ? "Creating…" : "Create Admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Colleges Tab ─────────────────────────────────────────────────────────────
export function CollegesTab({ colleges, isLoading }: { colleges: College[]; isLoading: boolean }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<College | null>(null);

  const toggleCollege = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("colleges").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("College status updated");
      qc.invalidateQueries({ queryKey: ["super_admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Colleges</h2>
          <p className="text-xs text-muted-foreground">{colleges.length} registered</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditTarget(null); setAddOpen(true); }}>
          <Plus className="w-3.5 h-3.5" />
          Add College
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-surface-2 animate-pulse" />)}
        </div>
      ) : colleges.length === 0 ? (
        <Card className="bg-surface-1 border-border-subtle border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No colleges yet. Add your first college.</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => { setEditTarget(null); setAddOpen(true); }}>
              <Plus className="w-3.5 h-3.5" />Add College
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {colleges.map((college, i) => (
            <SlideUp key={college.id} delay={i * 0.04}>
              <Card className="bg-surface-1 border-border-subtle hover:border-border-strong transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: (college.primary_color ?? "#6366f1") + "22", border: `2px solid ${(college.primary_color ?? "#6366f1")}44` }}>
                      <Building2 className="w-5 h-5" style={{ color: college.primary_color ?? "#6366f1" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">{college.college_name}</span>
                        <Badge variant={college.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                          {college.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {college.tagline && <p className="text-xs text-muted-foreground mt-0.5 truncate">{college.tagline}</p>}
                      {college.subdomain && (
                        <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">{college.subdomain}.campusconnect.app</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditTarget(college); setAddOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Switch
                        checked={college.is_active}
                        onCheckedChange={() => toggleCollege.mutate({ id: college.id, is_active: college.is_active })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
          ))}
        </div>
      )}

      <CollegeFormDialog
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditTarget(null); }}
        editing={editTarget}
      />
    </>
  );
}

// ── Admin Manager Tab ─────────────────────────────────────────────────────────
export function AdminManagerTab() {
  const qc = useQueryClient();
  const { colleges } = useCollegeContext();
  const [createOpen, setCreateOpen] = useState(false);

  const adminsQuery = useQuery<CollegeAdmin[]>({
    queryKey: ["super_admin", "admins"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_college_admins" as any);
      if (error) throw error;
      return (data as CollegeAdmin[]) ?? [];
    },
    staleTime: 30_000,
  });

  const removeAdmin = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin" as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Admin role removed");
      qc.invalidateQueries({ queryKey: ["super_admin", "admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const admins = adminsQuery.data ?? [];

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">College Admins</h2>
          <p className="text-xs text-muted-foreground">{admins.length} assigned</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <UserPlus className="w-3.5 h-3.5" />
          Add Admin
        </Button>
      </div>

      {adminsQuery.isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-surface-2 animate-pulse" />)}
        </div>
      ) : admins.length === 0 ? (
        <Card className="bg-surface-1 border-border-subtle border-dashed">
          <CardContent className="py-12 text-center">
            <ShieldCheck className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No college admins yet.</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
              <UserPlus className="w-3.5 h-3.5" />Create Admin
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {admins.map((admin, i) => {
            const college = colleges.find(c => c.id === admin.college_id);
            return (
              <SlideUp key={admin.user_id} delay={i * 0.04}>
                <Card className="bg-surface-1 border-border-subtle hover:border-border-strong transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {admin.name ?? "Unknown"}
                          </span>
                          {college && (
                            <Badge variant="secondary" className="text-[10px] shrink-0"
                              style={{ backgroundColor: (college.primary_color ?? "#6366f1") + "22", color: college.primary_color ?? "#6366f1" }}>
                              {college.college_name}
                            </Badge>
                          )}
                          {!admin.college_id && (
                            <Badge variant="secondary" className="text-[10px] shrink-0 text-amber-400 bg-amber-400/10">
                              Unassigned
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">{admin.email ?? "—"}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`Remove admin role from ${admin.name ?? admin.email}?`)) {
                            removeAdmin.mutate(admin.user_id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </SlideUp>
            );
          })}
        </div>
      )}

      <CreateAdminDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
