import { useQueryClient } from "@tanstack/react-query";
import { PageContainer, PageHeader } from "@/layout";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import SASystemMapTab from "@/pages/platform/components/SASystemMapTab";

export default function SASystemMapPage() {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["sa_system_map"] });
  };

  return (
    <PageContainer size="tablet" withBottomNav={false} className="py-4">
      <PullToRefresh onRefresh={handleRefresh} className="space-y-5">
        <PageHeader
          title="System Ecosystem Map"
          subtitle="Live visual hierarchy — Platform → Colleges → Departments → Students → Lectures → Attendance"
        />
        <SASystemMapTab />
      </PullToRefresh>
    </PageContainer>
  );
}
