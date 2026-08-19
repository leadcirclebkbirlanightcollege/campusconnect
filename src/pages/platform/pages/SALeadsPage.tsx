import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Phone, Mail, Building2 } from "@/components/icons";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contacted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  converted: "bg-green-500/10 text-green-400 border-green-500/20",
  lost: "bg-red-500/10 text-red-400 border-red-500/20",
  contact: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function SALeadsPage() {
  const [search, setSearch] = useState("");

  const { data: leads = [], refetch } = useQuery({
    queryKey: ["sa-leads"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  async function updateStatus(id: string, status: string) {
    const { error } = await (supabase as any).from("leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Failed to update");
    else { toast.success("Status updated"); refetch(); }
  }

  const filtered = leads.filter((l: any) =>
    !search || [l.name, l.college, l.email, l.city].some((v: string) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: leads.length,
    new: leads.filter((l: any) => l.status === "new").length,
    contacted: leads.filter((l: any) => l.status === "contacted").length,
    converted: leads.filter((l: any) => l.status === "converted").length,
  };

  return (
    <PageContainer>
      <PageHeader title="Leads & CRM" subtitle="Track demo requests and conversions" />

      <div className="grid grid-cols-2 gap-3 mt-4 md:grid-cols-4">
        {[
          { label: "Total Leads", value: stats.total, icon: Users },
          { label: "New", value: stats.new, icon: Building2 },
          { label: "Contacted", value: stats.contacted, icon: Phone },
          { label: "Converted", value: stats.converted, icon: Mail },
        ].map(({ label, value, icon: Icon }) => (
          <GlassCard key={label} padding="md" className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
            </div>
            <p className="text-xl font-black">{value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="mt-4 space-y-3">
        {filtered.length === 0 && (
          <GlassCard padding="lg" className="text-center">
            <p className="text-sm text-muted-foreground">No leads yet. They'll appear here when visitors submit demo requests.</p>
          </GlassCard>
        )}
        {filtered.map((lead: any) => (
          <GlassCard key={lead.id} padding="md" className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{lead.name}</p>
                <p className="text-xs text-muted-foreground">{lead.college}</p>
              </div>
              <Badge variant="outline" className={STATUS_COLORS[lead.status] || ""}>{lead.status}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {lead.email && <span>✉ {lead.email}</span>}
              {lead.phone && <span>📞 {lead.phone}</span>}
              {lead.city && <span>📍 {lead.city}</span>}
              {lead.student_count && <span>👥 {lead.student_count} students</span>}
            </div>
            {lead.notes && <p className="text-xs text-muted-foreground italic">{lead.notes}</p>}
            <div className="flex items-center gap-2">
              <Select value={lead.status} onValueChange={(v) => updateStatus(lead.id, v)}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              {lead.phone && (
                <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="h-8 text-xs">WhatsApp</Button>
                </a>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </PageContainer>
  );
}
