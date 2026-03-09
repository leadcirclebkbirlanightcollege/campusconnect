// SA Colleges page — uses CollegesTab from CollegeManagement
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CollegesTab } from "@/pages/platform/components/CollegeManagement";
import { PageContainer, PageHeader } from "@/layout";

export default function SACollegesPage() {
  const { data: colleges = [], isLoading } = useQuery({
    queryKey: ["sa_colleges_page"],
    queryFn: async () => {
      const { data, error } = await supabase.from("colleges").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 45_000,
  });

  return (
    <PageContainer size="tablet" withBottomNav={false} className="space-y-4 py-4">
      <PageHeader title="College Management" subtitle="Create, configure, and manage college accounts" />
      <CollegesTab colleges={colleges} isLoading={isLoading} />
    </PageContainer>
  );
}
