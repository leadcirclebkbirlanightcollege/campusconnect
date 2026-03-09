import { useNavigate } from "react-router-dom";
import AdminOverviewTab from "@/pages/admin/overview/AdminOverviewTab";

// Tab-to-route map for the overview quick actions
const TAB_ROUTE_MAP: Record<string, string> = {
  lectures:    "/platform/admin/lectures",
  attendance:  "/platform/admin/attendance",
  students:    "/platform/admin/students",
  points:      "/platform/admin/points",
  corrections: "/platform/admin/attendance/corrections",
  announcements: "/platform/admin/announcements",
};

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const handleNavigateTab = (tab: string) => {
    const route = TAB_ROUTE_MAP[tab];
    if (route) navigate(route);
  };
  return <AdminOverviewTab onNavigateTab={handleNavigateTab} />;
}
