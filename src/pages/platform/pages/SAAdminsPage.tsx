// SA Admins page — reuses the admin manager portion from SuperAdminDashboard
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCollegeContext } from "@/contexts/CollegeContext";

type CollegeAdmin = { user_id: string; college_id: string | null; college_name: string | null; name: string | null; email: string | null; created_at: string };

export default function SAAdminsPage() {
  const { colleges } = useCollegeContext();
  const qc = useQueryClient();
  const [adminPage, setAdminPage] = useState(0);
  const PAGE_SIZE = 20;

  const adminQ = useQuery<CollegeAdmin[]>({
    queryKey: ["sa_admins_page"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_college_admins" as any);
      if (error) throw error;
      return (data as CollegeAdmin[]) ?? [];
    },
    staleTime: 45_000,
  });

  const admins = adminQ.data ?? [];
  const visible = useMemo(() => admins.slice(adminPage * PAGE_SIZE, (adminPage + 1) * PAGE_SIZE), [admins, adminPage]);

  const reassign = useMutation({
    mutationFn: async ({ userId, collegeId }: { userId: string; collegeId: string }) => {
      const { error } = await supabase.from("user_roles").update({ college_id: collegeId }).eq("user_id", userId).eq("role", "admin" as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Admin reassigned"); qc.invalidateQueries({ queryKey: ["sa_admins_page"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin" as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role removed"); qc.invalidateQueries({ queryKey: ["sa_admins_page"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivate = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Admin deactivated"); qc.invalidateQueries({ queryKey: ["sa_admins_page"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageContainer size="tablet" withBottomNav={false} className="space-y-4 py-4">
      <PageHeader title="Admin Manager" subtitle="Reassign, deactivate, or remove admin privileges" />
      <div className="space-y-3">
        {adminQ.isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)
          : visible.map((admin) => (
            <GlassCard key={admin.user_id} padding="md" radius="xl" className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{admin.name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground truncate">{admin.email ?? "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{admin.college_name ?? "Unassigned"}</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">Admin</Badge>
              </div>
              <Select value={admin.college_id ?? "unassigned"}
                onValueChange={(v) => { if (v !== "unassigned") reassign.mutate({ userId: admin.user_id, collegeId: v }); }}>
                <SelectTrigger className="h-12 bg-surface-2 border-border-subtle text-xs"><SelectValue placeholder="Reassign college" /></SelectTrigger>
                <SelectContent className="bg-surface-1 border-border-subtle">
                  {colleges.map((c) => <SelectItem key={c.id} value={c.id}>{c.college_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-12 text-xs" onClick={() => deactivate.mutate(admin.user_id)}>Deactivate</Button>
                <Button variant="outline" className="h-12 text-xs" onClick={() => removeRole.mutate(admin.user_id)}>Remove Role</Button>
              </div>
            </GlassCard>
          ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {admins.length > 0 ? `${adminPage * PAGE_SIZE + 1}–${Math.min((adminPage + 1) * PAGE_SIZE, admins.length)} of ${admins.length}` : "No admins"}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10 text-xs" disabled={adminPage === 0} onClick={() => setAdminPage(p => p - 1)}>Previous</Button>
          <Button variant="outline" className="h-10 text-xs" disabled={(adminPage + 1) * PAGE_SIZE >= admins.length} onClick={() => setAdminPage(p => p + 1)}>Next</Button>
        </div>
      </div>
    </PageContainer>
  );
}
