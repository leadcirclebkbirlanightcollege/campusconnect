import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import AdminOverviewTab from "@/pages/admin/overview/AdminOverviewTab";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";

// Tab-to-route map for the overview quick actions
const TAB_ROUTE_MAP: Record<string, string> = {
  lectures:      "/platform/admin/lectures",
  attendance:    "/platform/admin/attendance",
  students:      "/platform/admin/students",
  points:        "/platform/admin/points",
  corrections:   "/platform/admin/attendance/corrections",
  announcements: "/platform/admin/announcements",
};

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleNavigateTab = (tab: string) => {
    const route = TAB_ROUTE_MAP[tab];
    if (route) navigate(route);
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin_overview"] });
    await queryClient.invalidateQueries({ queryKey: ["admin_kpis"] });
    await queryClient.invalidateQueries({ queryKey: ["admin_live_ops"] });
    await queryClient.invalidateQueries({ queryKey: ["admin_risk"] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <AdminOverviewTab onNavigateTab={handleNavigateTab} />
    </PullToRefresh>
  );
}
