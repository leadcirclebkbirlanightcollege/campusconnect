import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FadeIn, SlideUp } from "@/components/ui/motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Building2, Users, BookOpen, CheckSquare, Coins, Plus, Pencil,
  Power, Globe, BarChart3, ShieldCheck, LogOut, Activity
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type College = {
  id: string;
  college_name: string;
  subdomain: string | null;
  logo_url: string | null;
  tagline: string | null;
  primary_color: string;
  is_active: boolean;
  created_at: string;
};

type PlatformAnalytics = {
  total_colleges: number;
  active_colleges: number;
  total_students: number;
  total_lectures: number;
  total_attendance: number;
  total_points_awarded: number;
};

// ── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string | number; accent?: string;
}) {
  return (
    <Card className="bg-surface-1 border-border-subtle">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${accent ?? "bg-primary/10"}`}>
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold text-foreground">{value?.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── College Form ────────────────────────────────────────────────────────────
function CollegeFormDialog({
  open, onClose, editing
}: {
  open: boolean;
  onClose: () => void;
  editing: College | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    college_name: editing?.college_name ?? "",
    subdomain: editing?.subdomain ?? "",
    tagline: editing?.tagline ?? "",
    primary_color: editing?.primary_color ?? "#6366f1",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("colleges" as any)
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("colleges" as any).insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "College updated" : "College created");
      qc.invalidateQueries({ queryKey: ["super_admin", "colleges"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-surface-1 border-border-subtle max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit College" : "Add College"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
          <div className="space-y-1.5">
            <Label>Brand Color</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} className="h-9 w-14 rounded border border-border-subtle cursor-pointer bg-transparent" />
              <Input value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} className="font-mono text-sm" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.college_name.trim()}>
            {save.isPending ? "Saving…" : editing ? "Save Changes" : "Create College"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<College | null>(null);
  const qc = useQueryClient();

  const analyticsQuery = useQuery<PlatformAnalytics>({
    queryKey: ["super_admin", "analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_analytics" as any);
      if (error) throw error;
      return data as PlatformAnalytics;
    },
    staleTime: 60_000,
  });

  const collegesQuery = useQuery<College[]>({
    queryKey: ["super_admin", "colleges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("colleges" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as College[]) ?? [];
    },
  });

  const toggleCollege = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("colleges" as any).update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("College status updated");
      qc.invalidateQueries({ queryKey: ["super_admin", "colleges"] });
      qc.invalidateQueries({ queryKey: ["super_admin", "analytics"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const analytics = analyticsQuery.data;
  const colleges = collegesQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-1/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">Platform Control</span>
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">SUPER ADMIN</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}>
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <FadeIn>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Platform Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">Multi-college management &amp; platform analytics</p>
          </div>
        </FadeIn>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-surface-2 border border-border-subtle">
            <TabsTrigger value="overview" className="gap-1.5 text-xs"><BarChart3 className="w-3.5 h-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="colleges" className="gap-1.5 text-xs"><Building2 className="w-3.5 h-3.5" />Colleges</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW TAB ── */}
          <TabsContent value="overview" className="mt-6">
            <SlideUp>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={Building2} label="Total Colleges" value={analytics?.total_colleges ?? "—"} />
                <StatCard icon={Activity} label="Active Colleges" value={analytics?.active_colleges ?? "—"} accent="bg-success/10" />
                <StatCard icon={Users} label="Total Students" value={analytics?.total_students ?? "—"} />
                <StatCard icon={BookOpen} label="Lectures Conducted" value={analytics?.total_lectures ?? "—"} />
                <StatCard icon={CheckSquare} label="Attendance Records" value={analytics?.total_attendance ?? "—"} />
                <StatCard icon={Coins} label="Points Awarded" value={analytics?.total_points_awarded ?? "—"} />
              </div>
            </SlideUp>

            <SlideUp delay={0.08}>
              <Card className="mt-6 bg-surface-1 border-border-subtle">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    Platform Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-sm text-foreground">All systems operational</span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">Live</Badge>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
          </TabsContent>

          {/* ── COLLEGES TAB ── */}
          <TabsContent value="colleges" className="mt-6">
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

            {collegesQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 rounded-xl bg-surface-2 animate-pulse" />
                ))}
              </div>
            ) : colleges.length === 0 ? (
              <Card className="bg-surface-1 border-border-subtle border-dashed">
                <CardContent className="py-12 text-center">
                  <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No colleges yet. Add your first college to get started.</p>
                  <Button size="sm" className="mt-4 gap-1.5" onClick={() => { setEditTarget(null); setAddOpen(true); }}>
                    <Plus className="w-3.5 h-3.5" />
                    Add College
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
                          {/* Color swatch */}
                          <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: college.primary_color + "22", border: `2px solid ${college.primary_color}44` }}>
                            <Building2 className="w-5 h-5" style={{ color: college.primary_color }} />
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
          </TabsContent>
        </Tabs>
      </div>

      <CollegeFormDialog
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditTarget(null); }}
        editing={editTarget}
      />
    </div>
  );
}
