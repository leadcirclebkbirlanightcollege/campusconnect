import PointsRulesSettings from "@/pages/admin/system/PointsRulesSettings";
import AdminProfileSettings from "@/pages/admin/system/AdminProfileSettings";
import SystemHealthPanel from "@/pages/admin/system/SystemHealthPanel";
import AdminRoleBackfillPanel from "@/pages/admin/system/AdminRoleBackfillPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_VERSION, BUILD_NUMBER, RELEASE_DATE, ENVIRONMENT } from "@/config/version";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-5">
      <AdminProfileSettings />
      <PointsRulesSettings />
      <SystemHealthPanel />
      <AdminRoleBackfillPanel />
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">System Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Version</p><p className="font-medium">{APP_VERSION}</p></div>
            <div><p className="text-xs text-muted-foreground">Build</p><p className="font-medium">{BUILD_NUMBER}</p></div>
            <div><p className="text-xs text-muted-foreground">Release</p><p className="font-medium">{RELEASE_DATE}</p></div>
            <div><p className="text-xs text-muted-foreground">Env</p><Badge variant="secondary" className="text-[10px]">{ENVIRONMENT}</Badge></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
