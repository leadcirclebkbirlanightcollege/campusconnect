import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { DailyCheckinCard } from "@/components/student/DailyCheckinCard";
import { StreakHeatmap } from "@/components/student/StreakHeatmap";

export default function StudentCheckin() {
  return (
    <PageContainer>
      <PageHeader title="Daily Check-In" subtitle="Keep your streak alive" />
      <div className="space-y-6 mt-4">
        <DailyCheckinCard />
        <StreakHeatmap />
      </div>
    </PageContainer>
  );
}
